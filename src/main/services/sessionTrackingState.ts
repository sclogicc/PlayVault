export type TrackerPhase = 'idle' | 'warming' | 'running' | 'manually_stopped'

export interface TrackerState {
  phase: TrackerPhase
  hitStreak: number
  missStreak: number
  firstSeenAt: string | null
  lastSeenAt: string | null
  rootPid: number | null
  trackedPids: number[]
  sessionId: number | null
}

export type TrackerAction =
  | { type: 'none' }
  | { type: 'start'; startedAt: string; rootPid: number; trackedPids: number[] }
  | { type: 'end'; endedAt: string }

const STABILITY_THRESHOLD = 3

export function createIdleTrackerState(): TrackerState {
  return {
    phase: 'idle',
    hitStreak: 0,
    missStreak: 0,
    firstSeenAt: null,
    lastSeenAt: null,
    rootPid: null,
    trackedPids: [],
    sessionId: null,
  }
}

/** Advance one executable's lifecycle using the currently live process tree. */
export function advanceTracker(
  state: TrackerState,
  livePids: number[],
  now: string,
  observedRootPid?: number | null,
  startThreshold: number = STABILITY_THRESHOLD,
): { state: TrackerState; action: TrackerAction } {
  const hasLiveProcesses = livePids.length > 0
  const rootPid = observedRootPid ?? state.rootPid ?? livePids[0] ?? null
  const requiredHitCount = Math.max(1, startThreshold)

  if (state.phase === 'idle') {
    if (!hasLiveProcesses || rootPid === null) return { state, action: { type: 'none' } }
    const nextState: TrackerState = {
      ...state,
      phase: 'warming',
      hitStreak: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      rootPid,
      trackedPids: livePids,
    }
    if (requiredHitCount === 1) {
      return {
        state: { ...nextState, phase: 'running', missStreak: 0 },
        action: { type: 'start', startedAt: now, rootPid, trackedPids: livePids },
      }
    }
    return {
      state: nextState,
      action: { type: 'none' },
    }
  }

  if (state.phase === 'warming') {
    if (!hasLiveProcesses) return { state: createIdleTrackerState(), action: { type: 'none' } }
    const nextHitStreak = state.hitStreak + 1
    const nextState: TrackerState = {
      ...state,
      hitStreak: nextHitStreak,
      lastSeenAt: now,
      trackedPids: livePids,
      rootPid,
    }
    if (nextHitStreak < requiredHitCount || !nextState.firstSeenAt || rootPid === null) {
      return { state: nextState, action: { type: 'none' } }
    }
    return {
      state: { ...nextState, phase: 'running', missStreak: 0 },
      action: {
        type: 'start',
        startedAt: nextState.firstSeenAt,
        rootPid,
        trackedPids: livePids,
      },
    }
  }

  if (state.phase === 'running') {
    if (hasLiveProcesses) {
      return {
        state: {
          ...state,
          missStreak: 0,
          lastSeenAt: now,
          trackedPids: livePids,
          rootPid,
        },
        action: { type: 'none' },
      }
    }
    const nextMissStreak = state.missStreak + 1
    if (nextMissStreak < STABILITY_THRESHOLD || !state.lastSeenAt) {
      return {
        state: { ...state, missStreak: nextMissStreak },
        action: { type: 'none' },
      }
    }
    return {
      state: createIdleTrackerState(),
      action: { type: 'end', endedAt: state.lastSeenAt },
    }
  }

  if (hasLiveProcesses) return { state, action: { type: 'none' } }
  return { state: createIdleTrackerState(), action: { type: 'none' } }
}

export function markTrackerManuallyStopped(state: TrackerState): TrackerState {
  return { ...state, phase: 'manually_stopped', sessionId: null, hitStreak: 0, missStreak: 0 }
}
