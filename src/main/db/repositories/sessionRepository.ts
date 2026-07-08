import type { Database } from '../sqljs-wrapper'
import type { Session } from '../../../shared/types'

export function getByGameId(db: Database, gameId: number): Session[] {
  return db
    .prepare('SELECT * FROM sessions WHERE game_id = ? ORDER BY started_at DESC')
    .all(gameId) as unknown as Session[]
}

export function getByDateRange(
  db: Database,
  startDate: string,
  endDate: string,
): Session[] {
  return db
    .prepare(
      `SELECT s.*, g.display_name as game_display_name
       FROM sessions s
       LEFT JOIN games g ON g.id = s.game_id
       WHERE s.started_at >= ? AND s.started_at < ?
       ORDER BY s.started_at DESC`,
    )
    .all(startDate, endDate) as unknown as Session[]
}

export function create(
  db: Database,
  data: {
    game_id: number
    exe_name: string
    started_at: string
    source?: string
  },
): { lastInsertRowid: number } {
  return db
    .prepare(
      `INSERT INTO sessions (game_id, exe_name, started_at, source)
       VALUES (?, ?, ?, ?)`,
    )
    .run(data.game_id, data.exe_name, data.started_at, data.source ?? 'auto')
}

export function endSession(
  db: Database,
  id: number,
  ended_at: string,
  duration_seconds: number,
): void {
  db.prepare(
    `UPDATE sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?`,
  ).run(ended_at, duration_seconds, id)
}

export function deleteSession(db: Database, id: number): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function getActiveSessionByGameId(
  db: Database,
  gameId: number,
): Session | undefined {
  return db
    .prepare('SELECT * FROM sessions WHERE game_id = ? AND ended_at IS NULL')
    .get(gameId) as unknown as Session | undefined
}

export function getAllActiveSessions(db: Database): Session[] {
  return db
    .prepare('SELECT * FROM sessions WHERE ended_at IS NULL')
    .all() as unknown as Session[]
}
