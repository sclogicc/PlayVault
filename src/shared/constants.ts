// ========== Game Status ==========

export type GameStatus =
  | '未开始'
  | '游玩中'
  | '已通关'
  | '搁置'
  | '弃坑'
  | '已全成就'

export const GAME_STATUSES: GameStatus[] = [
  '未开始',
  '游玩中',
  '已通关',
  '搁置',
  '弃坑',
  '已全成就',
]

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  '未开始': '未开始',
  '游玩中': '游玩中',
  '已通关': '已通关',
  '搁置': '搁置',
  '弃坑': '弃坑',
  '已全成就': '已全成就',
}

// ========== Screenshot Status ==========

export type ScreenshotStatus = 'pending' | 'classified' | 'ignored'

export const SCREENSHOT_STATUSES: ScreenshotStatus[] = [
  'pending',
  'classified',
  'ignored',
]

// ========== Session Source ==========

export type SessionSource = 'auto' | 'manual'
