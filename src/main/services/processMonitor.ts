import type { Database } from '../db/sqljs-wrapper'
import type { ChildProcess } from 'node:child_process'
import * as gameRepo from '../db/repositories/gameRepository'
import * as exeRepo from '../db/repositories/executableRepository'
import * as sessionRepo from '../db/repositories/sessionRepository'
import { collectLiveProcessTree, matchProcessByPath, type ProcessSnapshot } from './processTracking'
import {
  advanceTracker,
  createIdleTrackerState,
  markTrackerManuallyStopped,
  type TrackerState,
} from './sessionTrackingState'
import { inspectProcesses } from './windowsProcessInspector'
import { toLocalDateTime } from '../../shared/localDateTime'
import { writeProcessMonitorDiagnostic } from './processMonitorDiagnostics'

interface TrackedGame {
  gameId: number
  exeName: string
  filePath: string
  state: TrackerState
  trackingMode: 'launch_tree' | 'external_path'
  processStartedAt: string | null
}

interface LaunchRoot {
  pid: number
  filePath: string
  startedAt: string
}

const POLL_INTERVAL_MS = 1000

let monitorTimer: ReturnType<typeof setInterval> | null = null
let pollInFlight = false
let trackedGames = new Map<number, TrackedGame>()
let launchRoots = new Map<number, LaunchRoot>()

function now(): string {
  return toLocalDateTime()
}

function parseTrackedPids(value: string): number[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((pid): pid is number => Number.isInteger(pid) && pid > 0)
      : []
  } catch {
    return []
  }
}

/** Refresh only primary executable bindings. Secondary executables never start Sessions. */
function refreshTrackedGames(db: Database): void {
  const next = new Map<number, TrackedGame>()
  for (const game of gameRepo.getAllGames(db)) {
    if (!game.is_enabled) continue
    const primary = exeRepo.getPrimaryExe(db, game.id)
    if (!primary || primary.is_ignored || !primary.file_path) continue
    const existing = trackedGames.get(game.id)
    next.set(game.id, existing ?? {
      gameId: game.id,
      exeName: primary.exe_name,
      filePath: primary.file_path,
      state: createIdleTrackerState(),
      trackingMode: 'external_path',
      processStartedAt: null,
    })
  }
  trackedGames = next
}

function processTreeFor(tracked: TrackedGame, processes: ProcessSnapshot[]): number[] {
  if (tracked.state.rootPid === null) return []
  return collectLiveProcessTree(
    tracked.state.rootPid,
    tracked.state.trackedPids,
    processes,
  )
}

function findObservedProcess(
  tracked: TrackedGame,
  processes: ProcessSnapshot[],
): { rootPid: number; livePids: number[]; mode: 'launch_tree' | 'external_path'; startedAt: string | null } | null {
  if (tracked.state.rootPid !== null) {
    const livePids = processTreeFor(tracked, processes)
    if (livePids.length > 0) {
      return {
        rootPid: tracked.state.rootPid,
        livePids,
        mode: tracked.trackingMode,
        startedAt: tracked.processStartedAt,
      }
    }
    return null
  }

  const launchRoot = launchRoots.get(tracked.gameId)
  if (launchRoot) {
    const livePids = collectLiveProcessTree(launchRoot.pid, [], processes)
    if (livePids.length > 0) {
      return {
        rootPid: launchRoot.pid,
        livePids,
        mode: 'launch_tree',
        startedAt: processes.find((process) => process.pid === launchRoot.pid)?.startedAt ?? null,
      }
    }
  }

  const process = processes.find((candidate) => matchProcessByPath(candidate, tracked.filePath))
  if (!process) return null
  return {
    rootPid: process.pid,
    livePids: collectLiveProcessTree(process.pid, [], processes),
    mode: 'external_path',
    startedAt: process.startedAt,
  }
}

function startSessionIfNeeded(
  db: Database,
  tracked: TrackedGame,
  startedAt: string,
  rootPid: number,
  livePids: number[],
): number {
  const existing = sessionRepo.getActiveSessionByGameId(db, tracked.gameId)
  if (existing?.root_process_pid === rootPid) return existing.id
  if (existing) sessionRepo.endSessionAtLastSeen(db, existing.id, 'recovered')

  const result = sessionRepo.create(db, {
    game_id: tracked.gameId,
    exe_name: tracked.exeName,
    started_at: startedAt,
    source: 'auto',
    process_path: tracked.filePath,
    root_process_pid: rootPid,
    tracked_process_pids: livePids,
    process_started_at: tracked.processStartedAt,
    last_seen_at: now(),
    tracking_mode: tracked.trackingMode,
  })

  const game = gameRepo.getGameById(db, tracked.gameId)
  if (game?.status === 'not_started') {
    gameRepo.updateGameStatus(db, tracked.gameId, 'in_progress')
  }
  return result.lastInsertRowid
}

async function poll(db: Database): Promise<void> {
  if (pollInFlight) return
  pollInFlight = true
  try {
    refreshTrackedGames(db)
    const candidateNames = new Set([...trackedGames.values()].map((game) => game.exeName.toLowerCase()))
    const trackedPids = [...trackedGames.values()].flatMap((game) => game.state.trackedPids)
      .concat([...launchRoots.values()].map((root) => root.pid))
    const processes = await inspectProcesses(candidateNames, trackedPids)
    const timestamp = now()

    for (const tracked of trackedGames.values()) {
      const observed = findObservedProcess(tracked, processes)
      if (observed) {
        tracked.trackingMode = observed.mode
        tracked.processStartedAt = observed.startedAt
      }
      const before = tracked.state
      const advanced = advanceTracker(
        before,
        observed?.livePids ?? [],
        timestamp,
        observed?.rootPid ?? before.rootPid,
        1,
      )
      tracked.state = advanced.state
      writeProcessMonitorDiagnostic({
        event: 'poll',
        at: timestamp,
        gameId: tracked.gameId,
        sessionId: tracked.state.sessionId,
        rootPid: observed?.rootPid ?? before.rootPid,
        livePids: observed?.livePids ?? [],
        phase: tracked.state.phase,
        action: advanced.action.type,
        hitStreak: tracked.state.hitStreak,
        missStreak: tracked.state.missStreak,
      })

      if (advanced.action.type === 'start') {
        tracked.state = {
          ...advanced.state,
          sessionId: startSessionIfNeeded(
            db,
            tracked,
            advanced.action.startedAt,
            advanced.action.rootPid,
            advanced.action.trackedPids,
          ),
        }
      } else if (advanced.action.type === 'end' && before.sessionId !== null) {
        sessionRepo.endSessionAtLastSeen(db, before.sessionId, 'normal')
        launchRoots.delete(tracked.gameId)
      } else if (
        tracked.state.phase === 'running' &&
        tracked.state.sessionId !== null &&
        tracked.state.lastSeenAt
      ) {
        sessionRepo.heartbeatSession(
          db,
          tracked.state.sessionId,
          tracked.state.trackedPids,
          tracked.state.lastSeenAt,
        )
      }
    }
  } finally {
    pollInFlight = false
  }
}

/** Register a process started from PlayVault so launchers can be tracked as a tree. */
export function registerLaunchedRoot(gameId: number, pid: number, filePath: string, startedAt: string): void {
  launchRoots.set(gameId, { pid, filePath, startedAt })
}

/**
 * Primary path for PlayVault launches: create the Session immediately and
 * finish it from the child-process exit signal instead of waiting for scans.
 */
export function trackLaunchedProcess(
  db: Database,
  gameId: number,
  pid: number | undefined,
  filePath: string,
  startedAt: string,
  child: Pick<ChildProcess, 'once'>,
): number {
  if (!pid) return 0

  refreshTrackedGames(db)
  const tracked = trackedGames.get(gameId)
  if (!tracked) return 0

  tracked.trackingMode = 'launch_tree'
  tracked.processStartedAt = startedAt
  const sessionId = startSessionIfNeeded(db, tracked, startedAt, pid, [pid])
  tracked.state = {
    phase: 'running',
    hitStreak: 1,
    missStreak: 0,
    firstSeenAt: startedAt,
    lastSeenAt: startedAt,
    rootPid: pid,
    trackedPids: [pid],
    sessionId,
  }
  registerLaunchedRoot(gameId, pid, filePath, startedAt)

  child.once('exit', () => {
    const active = sessionRepo.getActiveSessionByGameId(db, gameId)
    if (active?.id !== sessionId) return

    sessionRepo.endSessionAt(db, sessionId, now(), 'normal')
    const current = trackedGames.get(gameId)
    if (current?.state.sessionId === sessionId) {
      current.state = createIdleTrackerState()
    }
    launchRoots.delete(gameId)
  })

  return sessionId
}

/** Resume verified Sessions after PlayVault restarts without counting offline time. */
export async function resumeOrCloseTrackedSessions(db: Database): Promise<number> {
  refreshTrackedGames(db)
  const active = sessionRepo.getAllActiveSessions(db)
  const names = new Set(active.map((session) => session.exe_name.toLowerCase()))
  const pids = active.flatMap((session) => [session.root_process_pid ?? 0, ...parseTrackedPids(session.tracked_process_pids)])
  const processes = await inspectProcesses(names, pids)
  let resumed = 0

  for (const session of active) {
    const tracked = trackedGames.get(session.game_id)
    const rootPid = session.root_process_pid ?? parseTrackedPids(session.tracked_process_pids)[0] ?? null
    const livePids = rootPid === null
      ? []
      : collectLiveProcessTree(rootPid, parseTrackedPids(session.tracked_process_pids), processes)
    const root = processes.find((process) => process.pid === rootPid)
    const rootIdentityMatches = !session.process_started_at || root?.startedAt === session.process_started_at
    const canResume = Boolean(
      tracked &&
        session.tracking_mode !== 'legacy' &&
        livePids.length > 0 &&
        (rootIdentityMatches || session.tracking_mode === 'launch_tree'),
    )

    if (!canResume || !tracked || rootPid === null) {
      sessionRepo.endSessionAtLastSeen(db, session.id, 'recovered')
      continue
    }

    const resumedAt = now()
    tracked.state = {
      phase: 'running',
      hitStreak: 3,
      missStreak: 0,
      firstSeenAt: session.started_at,
      lastSeenAt: resumedAt,
      rootPid,
      trackedPids: livePids,
      sessionId: session.id,
    }
    tracked.trackingMode = session.tracking_mode === 'launch_tree'
      ? 'launch_tree'
      : 'external_path'
    tracked.processStartedAt = session.process_started_at
    sessionRepo.heartbeatSession(db, session.id, livePids, resumedAt)
    resumed++
  }
  return resumed
}

export function startMonitor(db: Database, intervalMs: number = POLL_INTERVAL_MS): void {
  if (monitorTimer) return
  refreshTrackedGames(db)
  writeProcessMonitorDiagnostic({
    event: 'monitor_started',
    at: now(),
  })
  void poll(db).catch((error) => {
    writeProcessMonitorDiagnostic({
      event: 'poll_error',
      at: now(),
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    })
    console.error('[ProcessMonitor] Initial poll error:', error)
  })
  monitorTimer = setInterval(() => {
    void poll(db).catch((error) => {
      writeProcessMonitorDiagnostic({
        event: 'poll_error',
        at: now(),
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      })
      console.error('[ProcessMonitor] Poll error:', error)
    })
  }, intervalMs)
  console.log(`[ProcessMonitor] Started (interval=${intervalMs}ms, tracking ${trackedGames.size} games)`)
}

export function stopMonitor(): void {
  if (!monitorTimer) return
  clearInterval(monitorTimer)
  monitorTimer = null
  trackedGames.clear()
  launchRoots.clear()
  console.log('[ProcessMonitor] Stopped')
}

/** Manual stop remains an exceptional escape hatch and suppresses re-tracking until exit. */
export function manuallyEndTrackedSession(db: Database, sessionId: number): void {
  sessionRepo.manuallyEndSession(db, sessionId)
  for (const tracked of trackedGames.values()) {
    if (tracked.state.sessionId !== sessionId) continue
    tracked.state = markTrackerManuallyStopped(tracked.state)
    launchRoots.delete(tracked.gameId)
    return
  }
}

export function isMonitorRunning(): boolean {
  return monitorTimer !== null
}
