export type GameCaptureState = 'ready' | 'captured' | 'blocked' | 'error' | 'disabled'

export const DEFAULT_GAME_CAPTURE_ACCELERATOR = 'Ctrl+Shift+S'

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
  details: Omit<GameCaptureStatus, 'state' | 'message' | 'enabled' | 'updatedAt' | 'accelerator'> & {
    accelerator?: string
  } = {},
): GameCaptureStatus {
  const { accelerator = DEFAULT_GAME_CAPTURE_ACCELERATOR, ...rest } = details
  return {
    state,
    message,
    accelerator,
    enabled: state !== 'disabled',
    updatedAt: Date.now(),
    ...rest,
  }
}
