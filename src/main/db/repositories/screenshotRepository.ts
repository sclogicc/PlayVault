import type { Database } from '../sqljs-wrapper'
import type { Screenshot } from '../../../shared/types'
import type { ScreenshotStatus } from '../../../shared/constants'

export function getAll(
  db: Database,
  filters?: { status?: string },
): Screenshot[] {
  let sql = 'SELECT * FROM screenshots WHERE 1=1'
  const params: unknown[] = []

  if (filters?.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
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
      'SELECT * FROM screenshots WHERE game_id = ? ORDER BY captured_at DESC',
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
  db.prepare(
    `UPDATE screenshots SET status = ?, game_id = ?, session_id = ? WHERE id = ?`,
  ).run(status, game_id ?? null, session_id ?? null, id)
}

export function batchUpdateStatus(
  db: Database,
  ids: number[],
  status: ScreenshotStatus,
  game_id?: number | null,
  session_id?: number | null,
): void {
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(
    `UPDATE screenshots SET status = ?, game_id = ?, session_id = ? WHERE id IN (${placeholders})`,
  ).run(status, game_id ?? null, session_id ?? null, ...ids)
}

export function getPendingCount(db: Database): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM screenshots WHERE status = 'pending'")
    .get() as unknown as { count: number }
  return row.count
}
