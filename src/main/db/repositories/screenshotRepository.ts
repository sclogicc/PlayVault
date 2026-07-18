import type { Database } from '../sqljs-wrapper'
import type { Screenshot } from '../../../shared/types'
import type { ScreenshotStatus } from '../../../shared/constants'

/**
 * Get screenshots with optional status filters.
 * - "全部" (main list): shows pending + classified, excludes trashed and deleted
 * - Specific status: shows only that status
 * - deleted status is NEVER returned by getAll (only by explicit getByStatus)
 */
export function getAll(
  db: Database,
  filters?: { status?: string },
): Screenshot[] {
  let sql = 'SELECT * FROM screenshots WHERE 1=1'
  const params: unknown[] = []

  if (filters?.status) {
    if (filters.status === 'all') {
      // "全部" tab: pending + classified only (not trashed, not deleted)
      sql += " AND status IN ('pending', 'classified')"
    } else {
      sql += ' AND status = ?'
      params.push(filters.status)
    }
  } else {
    // Default: exclude deleted (never show in main lists)
    sql += " AND status != 'deleted'"
  }

  sql += ' ORDER BY captured_at DESC'
  return db.prepare(sql).all(...params) as unknown as Screenshot[]
}

export function getByStatus(
  db: Database,
  status: ScreenshotStatus,
): Screenshot[] {
  return db
    .prepare(
      'SELECT * FROM screenshots WHERE status = ? ORDER BY captured_at DESC',
    )
    .all(status) as unknown as Screenshot[]
}

export function getByGameId(db: Database, gameId: number): Screenshot[] {
  return db
    .prepare(
      "SELECT * FROM screenshots WHERE game_id = ? AND status = 'classified' ORDER BY captured_at DESC",
    )
    .all(gameId) as unknown as Screenshot[]
}

export function create(
  db: Database,
  data: {
    file_path: string
    file_name: string
    captured_at: string
    status?: string
    source_directory?: string
    hash?: string
  },
): { lastInsertRowid: number } {
  return db
    .prepare(
      `INSERT INTO screenshots (file_path, file_name, captured_at, status, source_directory, hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.file_path,
      data.file_name,
      data.captured_at,
      data.status ?? 'pending',
      data.source_directory ?? '',
      data.hash ?? '',
    )
}

export function updateStatus(
  db: Database,
  id: number,
  status: ScreenshotStatus,
  game_id?: number | null,
  session_id?: number | null,
): void {
  if (status === 'classified' && !game_id) {
    throw new Error('Classified screenshots must be linked to a game')
  }
  db.prepare(
    `UPDATE screenshots SET status = ?, game_id = ?, session_id = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
  ).run(status, game_id ?? null, session_id ?? null, id)
}

export function batchUpdateStatus(
  db: Database,
  ids: number[],
  status: ScreenshotStatus,
  game_id?: number | null,
  session_id?: number | null,
): void {
  if (status === 'classified' && !game_id) {
    throw new Error('Classified screenshots must be linked to a game')
  }
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(
    `UPDATE screenshots SET status = ?, game_id = ?, session_id = ?, updated_at = datetime('now','localtime') WHERE id IN (${placeholders})`,
  ).run(status, game_id ?? null, session_id ?? null, ...ids)
}

export function getPendingCount(db: Database): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM screenshots WHERE status = 'pending'")
    .get() as unknown as { count: number }
  return row.count
}

// ========== Trash / Restore / Permanent Delete ==========

/**
 * Move a screenshot to trash (soft delete).
 */
export function trashScreenshot(db: Database, id: number): void {
  db.prepare(
    "UPDATE screenshots SET status = 'trashed', updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(id)
}

/**
 * Restore a screenshot from trash back to pending.
 */
export function restoreScreenshot(db: Database, id: number): void {
  db.prepare(
    "UPDATE screenshots SET status = 'pending', game_id = NULL, session_id = NULL, updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(id)
}

/**
 * Permanently delete a screenshot (logical delete — sets status='deleted' + deleted_at).
 * Does NOT physically remove the file from disk.
 */
export function permanentDelete(db: Database, id: number): void {
  db.prepare(
    "UPDATE screenshots SET status = 'deleted', deleted_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(id)
}

/**
 * Check if a hash already exists with status 'deleted' (to skip re-import).
 */
export function existsDeletedByHash(db: Database, hash: string): boolean {
  if (!hash) return false
  const row = db
    .prepare(
      "SELECT id FROM screenshots WHERE hash = ? AND status = 'deleted'",
    )
    .get(hash) as unknown as { id: number } | undefined
  return !!row
}

/**
 * Check if a hash already exists with any status.
 */
export function existsByHash(db: Database, hash: string): boolean {
  if (!hash) return false
  const row = db
    .prepare('SELECT id FROM screenshots WHERE hash = ?')
    .get(hash) as unknown as { id: number } | undefined
  return !!row
}
