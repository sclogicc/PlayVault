import type { Database } from '../sqljs-wrapper'
import type { Session, SessionWithGame } from '../../../shared/types'
import type { SessionEndReason } from '../../../shared/constants'

export function getByGameId(
  db: Database,
  gameId: number,
  limit?: number,
): Session[] {
  const sql = limit
    ? 'SELECT * FROM sessions WHERE game_id = ? ORDER BY started_at DESC LIMIT ?'
    : 'SELECT * FROM sessions WHERE game_id = ? ORDER BY started_at DESC'
  const params: unknown[] = [gameId]
  if (limit) params.push(limit)
  return db.prepare(sql).all(...params) as unknown as Session[]
}

export function getById(db: Database, id: number): Session | undefined {
  return db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .get(id) as unknown as Session | undefined
}

export function getByDateRange(
  db: Database,
  startDate: string,
  endDate: string,
): SessionWithGame[] {
  return db
    .prepare(
      `SELECT s.*, g.display_name as game_display_name
       FROM sessions s
       LEFT JOIN games g ON g.id = s.game_id
       WHERE s.started_at >= ? AND s.started_at < ?
       ORDER BY s.started_at DESC`,
    )
    .all(startDate, endDate) as unknown as SessionWithGame[]
}

export function create(
  db: Database,
  data: {
    game_id: number
    exe_name: string
    started_at: string
    source?: string
    process_path?: string
    root_process_pid?: number | null
    tracked_process_pids?: number[]
    process_started_at?: string | null
    last_seen_at?: string | null
    tracking_mode?: 'launch_tree' | 'external_path' | 'legacy'
  },
): { lastInsertRowid: number } {
  return db
    .prepare(
      `INSERT INTO sessions (
         game_id, exe_name, started_at, source, process_path,
         root_process_pid, tracked_process_pids, process_started_at,
         last_seen_at, tracking_mode
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.game_id,
      data.exe_name,
      data.started_at,
      data.source ?? 'auto',
      data.process_path ?? '',
      data.root_process_pid ?? null,
      JSON.stringify(data.tracked_process_pids ?? []),
      data.process_started_at ?? null,
      data.last_seen_at ?? data.started_at,
      data.tracking_mode ?? 'external_path',
    )
}

export function heartbeatSession(
  db: Database,
  id: number,
  trackedProcessPids: number[],
  lastSeenAt: string,
): void {
  db.prepare(
    `UPDATE sessions
     SET tracked_process_pids = ?, last_seen_at = ?,
         updated_at = datetime('now','localtime')
     WHERE id = ? AND ended_at IS NULL`,
  ).run(JSON.stringify(trackedProcessPids), lastSeenAt, id)
}

export function endSessionAtLastSeen(
  db: Database,
  id: number,
  reason: Extract<SessionEndReason, 'normal' | 'recovered'>,
): void {
  db.prepare(
    `UPDATE sessions
     SET ended_at = COALESCE(last_seen_at, started_at),
         duration_seconds = MAX(0, CAST(
           (julianday(COALESCE(last_seen_at, started_at)) - julianday(started_at)) * 86400
           AS INTEGER
         )),
         end_reason = ?,
         updated_at = datetime('now','localtime')
     WHERE id = ? AND ended_at IS NULL`,
  ).run(reason, id)
}

/** End a Session at a known process-exit timestamp. */
export function endSessionAt(
  db: Database,
  id: number,
  endedAt: string,
  reason: Extract<SessionEndReason, 'normal' | 'recovered'> = 'normal',
): void {
  db.prepare(
    `UPDATE sessions
     SET ended_at = ?,
         duration_seconds = MAX(0, CAST(
           (julianday(?) - julianday(started_at)) * 86400
           AS INTEGER
         )),
         end_reason = ?,
         updated_at = datetime('now','localtime')
     WHERE id = ? AND ended_at IS NULL`,
  ).run(endedAt, endedAt, reason, id)
}

export function endSession(
  db: Database,
  id: number,
  ended_at: string,
  duration_seconds: number,
  end_reason: SessionEndReason = 'normal',
): void {
  db.prepare(
    `UPDATE sessions
     SET ended_at = ?, duration_seconds = ?, end_reason = ?,
         updated_at = datetime('now','localtime')
     WHERE id = ?`,
  ).run(ended_at, duration_seconds, end_reason, id)
}

export function updateSession(
  db: Database,
  id: number,
  data: {
    started_at?: string
    ended_at?: string
    duration_seconds?: number
    end_reason?: SessionEndReason
    notes?: string
  },
): void {
  const fields: string[] = ["updated_at = datetime('now','localtime')"]
  const params: unknown[] = []

  const allowed = ['started_at', 'ended_at', 'duration_seconds', 'end_reason', 'notes']
  for (const key of allowed) {
    const val = data[key as keyof typeof data]
    if (val !== undefined) {
      fields.push(`${key} = ?`)
      params.push(val)
    }
  }

  params.push(id)
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...params)
}

export function deleteSession(db: Database, id: number): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function getActiveSessionByGameId(
  db: Database,
  gameId: number,
): Session | undefined {
  return db
    .prepare('SELECT * FROM sessions WHERE game_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1')
    .get(gameId) as unknown as Session | undefined
}

export function getActiveSessionByExeName(
  db: Database,
  gameId: number,
  exeName: string,
): Session | undefined {
  return db
    .prepare(
      'SELECT * FROM sessions WHERE game_id = ? AND exe_name = ? AND ended_at IS NULL',
    )
    .get(gameId, exeName) as unknown as Session | undefined
}

export function getAllActiveSessions(db: Database): Session[] {
  return db
    .prepare('SELECT * FROM sessions WHERE ended_at IS NULL')
    .all() as unknown as Session[]
}

/** Active Sessions whose backing process was confirmed by the current monitor. */
export function getVerifiedActiveSessions(db: Database): Session[] {
  return db
    .prepare(
      `SELECT * FROM sessions
       WHERE ended_at IS NULL
         AND last_seen_at IS NOT NULL
         AND tracking_mode IN ('launch_tree', 'external_path')`,
    )
    .all() as unknown as Session[]
}

/**
 * Recover all orphaned sessions (ended_at IS NULL) by closing them
 * with end_reason = 'recovered'. Called on app startup.
 */
export function recoverOrphanedSessions(db: Database): number {
  const result = db.prepare(
    `UPDATE sessions
     SET ended_at = COALESCE(last_seen_at, started_at),
         duration_seconds = MAX(0, CAST(
           (julianday(COALESCE(last_seen_at, started_at)) - julianday(started_at)) * 86400
           AS INTEGER
         )),
         end_reason = 'recovered',
         updated_at = datetime('now','localtime')
     WHERE ended_at IS NULL`,
  ).run()
  return result.changes
}

/**
 * Get total play duration for a game.
 */
export function getTotalDurationForGame(
  db: Database,
  gameId: number,
): number {
  const row = db
    .prepare(
      'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM sessions WHERE game_id = ?',
    )
    .get(gameId) as unknown as { total: number }
  return row.total
}

/**
 * Get the most recent sessions for a game.
 */
export function getRecentSessionsForGame(
  db: Database,
  gameId: number,
  limit: number = 20,
): Session[] {
  return db
    .prepare(
      'SELECT * FROM sessions WHERE game_id = ? ORDER BY started_at DESC LIMIT ?',
    )
    .all(gameId, limit) as unknown as Session[]
}

/**
 * Manually end an active session.
 */
export function manuallyEndSession(db: Database, id: number): void {
  db.prepare(
    `UPDATE sessions
     SET ended_at = datetime('now','localtime'),
         duration_seconds = MAX(0, CAST(
           (julianday(datetime('now','localtime')) - julianday(started_at)) * 86400
           AS INTEGER
         )),
         end_reason = 'manual',
         updated_at = datetime('now','localtime')
     WHERE id = ? AND ended_at IS NULL`,
  ).run(id)
}
