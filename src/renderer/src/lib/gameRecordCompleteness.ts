import type { GameWithStats } from '@shared/types'

export type RecordMissingField = 'cover' | 'background' | 'notes' | 'screenshots' | 'executable'

export interface GameRecordCompleteness {
  missing: RecordMissingField[]
  completeCount: number
  totalCount: number
}

export const RECORD_FIELD_LABELS: Record<RecordMissingField, string> = {
  cover: '封面',
  background: '背景',
  notes: '短感想',
  screenshots: '截图',
  executable: '启动路径',
}

export function getGameRecordCompleteness(game: Pick<GameWithStats, 'cover_path' | 'background_path' | 'notes' | 'screenshot_count' | 'exe_count'>): GameRecordCompleteness {
  const missing: RecordMissingField[] = []
  if (!game.cover_path) missing.push('cover')
  if (!game.background_path) missing.push('background')
  if (!game.notes.trim()) missing.push('notes')
  if (game.screenshot_count <= 0) missing.push('screenshots')
  if (game.exe_count <= 0) missing.push('executable')

  return { missing, completeCount: 5 - missing.length, totalCount: 5 }
}
