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

// ========== Discovered Status ==========

export type DiscoveredStatus = 'pending' | 'accepted' | 'rejected' | 'ignored'

export const DISCOVERED_STATUSES: DiscoveredStatus[] = [
  'pending',
  'accepted',
  'rejected',
  'ignored',
]

export const DISCOVERED_STATUS_LABELS: Record<DiscoveredStatus, string> = {
  pending: '待确认',
  accepted: '已加入',
  rejected: '已拒绝',
  ignored: '已忽略',
}

// ========== Session End Reason ==========

export type SessionEndReason = 'normal' | 'recovered' | 'manual' | 'unknown'

export const SESSION_END_REASONS: SessionEndReason[] = [
  'normal',
  'recovered',
  'manual',
  'unknown',
]

export const SESSION_END_REASON_LABELS: Record<SessionEndReason, string> = {
  normal: '正常结束',
  recovered: '异常恢复',
  manual: '手动结束',
  unknown: '未知',
}
