import type { Database } from '../db/sqljs-wrapper'
import * as gameRepo from '../db/repositories/gameRepository'
import * as exeRepo from '../db/repositories/executableRepository'
import * as sessionRepo from '../db/repositories/sessionRepository'

// Dynamic import for ps-list (ESM package)
let psList: ((options?: { all?: boolean }) => Promise<Array<{ name: string; pid: number; ppid: number }>>) | null = null

async function getPsList(): Promise<
  (options?: { all?: boolean }) => Promise<Array<{ name: string; pid: number; ppid: number }>>
> {
  if (!psList) {
    const mod = await import('ps-list')
    psList = mod.default
  }
  return psList
}

interface TrackedExe {
  gameId: number
  exeName: string
  processPath: string
  state: 'idle' | 'warming' | 'running' | 'cooling'
  hitStreak: number
  missStreak: number
  firstSeenAt: string | null
  lastSeenAt: string | null
  sessionId: number | null
}

const STABILITY_THRESHOLD = 3 // consecutive polls before state change
const POLL_INTERVAL_MS = 2000

let monitorTimer: ReturnType<typeof setInterval> | null = null
let trackedExes: Map<string, TrackedExe> = new Map()

function trackingKey(gameId: number, exeName: string): string {
  return `${gameId}:${exeName.toLowerCase()}`
}

/**
 * Build/refresh the tracking set from the database.
 * Only tracks games that are enabled and have non-ignored executables.
 */
function refreshTrackedExes(db: Database): void {
  const games = gameRepo.getAllGames(db)
  const newMap = new Map<string, TrackedExe>()

  for (const game of games) {
    if (!game.is_enabled) continue
    const exes = exeRepo.getByGameId(db, game.id)
    for (const exe of exes) {
      if (exe.is_ignored) continue
      const key = trackingKey(game.id, exe.exe_name)
      // Preserve existing tracking state if available
      const existing = trackedExes.get(key)
      if (existing) {
        newMap.set(key, existing)
      } else {
        newMap.set(key, {
          gameId: game.id,
          exeName: exe.exe_name,
          processPath: '',
          state: 'idle',
          hitStreak: 0,
          missStreak: 0,
          firstSeenAt: null,
          lastSeenAt: null,
          sessionId: null,
        })
      }
    }
  }

  trackedExes = newMap
}

/**
 * Main polling function — called every POLL_INTERVAL_MS.
 */
async function poll(db: Database): Promise<void> {
  const list = await getPsList()
  const processes = await list({ all: true })
  const runningExeNames = new Set(
    processes.map((p) => p.name.toLowerCase()),
  )

  // Refresh tracking set each poll to pick up new games/exes
  refreshTrackedExes(db)

  // Build a map of running process names to their paths
  const processPathMap = new Map<string, string>()
  for (const p of processes) {
    const nameLower = p.name.toLowerCase()
    if (!processPathMap.has(nameLower)) {
      // ps-list doesn't provide path directly; we store the name as is
      processPathMap.set(nameLower, p.name)
    }
  }

  for (const [, tracked] of trackedExes.entries()) {
    const isRunning = runningExeNames.has(tracked.exeName.toLowerCase())

    switch (tracked.state) {
      case 'idle':
        if (isRunning) {
          tracked.state = 'warming'
          tracked.hitStreak = 1
          tracked.missStreak = 0
          tracked.firstSeenAt = now()
          tracked.lastSeenAt = now()
          tracked.processPath = processPathMap.get(tracked.exeName.toLowerCase()) ?? tracked.exeName
        }
        break

      case 'warming':
        if (isRunning) {
          tracked.hitStreak++
          tracked.lastSeenAt = now()
          if (tracked.hitStreak >= STABILITY_THRESHOLD) {
            // Create session!
            tracked.state = 'running'
            const result = sessionRepo.create(db, {
              game_id: tracked.gameId,
              exe_name: tracked.exeName,
              started_at: tracked.firstSeenAt!,
              source: 'auto',
              process_path: tracked.processPath,
            })
            tracked.sessionId = result.lastInsertRowid
            console.log(
              `[ProcessMonitor] Session started: game=${tracked.gameId} exe=${tracked.exeName} session=${tracked.sessionId}`,
            )
          }
        } else {
          // Process disappeared during warmup — discard
          tracked.state = 'idle'
          tracked.hitStreak = 0
          tracked.firstSeenAt = null
        }
        break

      case 'running':
        if (isRunning) {
          tracked.missStreak = 0
          tracked.lastSeenAt = now()
        } else {
          tracked.missStreak++
          if (tracked.missStreak >= STABILITY_THRESHOLD) {
            // End session
            if (tracked.sessionId) {
              const endedAt = now()
              const durationSeconds = tracked.lastSeenAt && tracked.firstSeenAt
                ? Math.round(
                    (new Date(tracked.lastSeenAt).getTime() -
                      new Date(tracked.firstSeenAt).getTime()) /
                      1000,
                  )
                : 0
              sessionRepo.endSession(db, tracked.sessionId, endedAt, durationSeconds, 'normal')
              console.log(
                `[ProcessMonitor] Session ended: session=${tracked.sessionId} duration=${durationSeconds}s`,
              )
              tracked.sessionId = null
            }
            tracked.state = 'idle'
            tracked.hitStreak = 0
            tracked.missStreak = 0
            tracked.firstSeenAt = null
            tracked.lastSeenAt = null
          }
        }
        break

      case 'cooling':
        // Not used in current logic; handle gracefully
        if (isRunning) {
          tracked.state = 'running'
          tracked.missStreak = 0
        } else {
          tracked.missStreak++
          if (tracked.missStreak >= STABILITY_THRESHOLD) {
            tracked.state = 'idle'
            tracked.missStreak = 0
          }
        }
        break
    }
  }
}

function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

/**
 * Start the process monitor. Runs a polling loop that checks for tracked
 * executable processes and manages session lifecycles.
 */
export function startMonitor(db: Database, intervalMs: number = POLL_INTERVAL_MS): void {
  if (monitorTimer) return

  // Initial refresh
  refreshTrackedExes(db)

  monitorTimer = setInterval(() => {
    poll(db).catch((err) => {
      console.error('[ProcessMonitor] Poll error:', err)
    })
  }, intervalMs)

  console.log(`[ProcessMonitor] Started (interval=${intervalMs}ms, tracking ${trackedExes.size} exes)`)
}

/**
 * Stop the process monitor.
 */
export function stopMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer)
    monitorTimer = null
    trackedExes.clear()
    console.log('[ProcessMonitor] Stopped')
  }
}

/**
 * Check if the monitor is currently running.
 */
export function isMonitorRunning(): boolean {
  return monitorTimer !== null
}
