export type GameCaptureState = 'ready' | 'captured' | 'blocked' | 'error' | 'disabled'

export interface GameCaptureStatus {
  state: GameCaptureState
  message: string
  accelerator: string
  enabled: boolean
  screenshotId?: number
  gameId?: number
  sessionId?: number
  updatedAt: number
}

export function createGameCaptureStatus(
  state: GameCaptureState,
  message: string,
  details: Omit<GameCaptureStatus, 'state' | 'message' | 'accelerator' | 'enabled' | 'updatedAt'> = {},
): GameCaptureStatus {
  return {
    state,
    message,
    accelerator: 'F12',
    enabled: state !== 'disabled',
    updatedAt: Date.now(),
    ...details,
  }
}
