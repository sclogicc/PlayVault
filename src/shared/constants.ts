// ========== Game Status ==========

export type GameStatus = 'not_started' | 'in_progress' | 'completed'

export const GAME_STATUSES: GameStatus[] = [
  'not_started',
  'in_progress',
  'completed',
]

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  not_started: '未开始',
  in_progress: '游玩中',
  completed: '已通关',
}

// ========== Install Status ==========

export type InstallStatus = 'installed' | 'missing'

export const INSTALL_STATUS_LABELS: Record<InstallStatus, string> = {
  installed: '已安装',
  missing: '未安装',
}

// ========== Screenshot Status ==========

export type ScreenshotStatus = 'pending' | 'classified' | 'trashed' | 'deleted'

export const SCREENSHOT_STATUSES: ScreenshotStatus[] = [
  'pending',
  'classified',
  'trashed',
  'deleted',
]

export const SCREENSHOT_STATUS_LABELS: Record<ScreenshotStatus, string> = {
  pending: '待整理',
  classified: '已归类',
  trashed: '回收站',
  deleted: '已删除',
}

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
