import type { Database } from '../sqljs-wrapper'
import type { Game, GameWithStats } from '../../../shared/types'
import type { GameStatus, InstallStatus } from '../../../shared/constants'

export function getAllGames(
  db: Database,
  filters?: { search?: string; status?: string },
): GameWithStats[] {
  let sql = `
    SELECT
      g.*,
      (SELECT COUNT(*) FROM game_executables WHERE game_id = g.id) as exe_count,
      (SELECT COALESCE(SUM(duration_seconds), 0) FROM sessions WHERE game_id = g.id) as total_duration,
      (SELECT COUNT(*) FROM screenshots WHERE game_id = g.id AND status = 'classified') as screenshot_count,
      (SELECT MAX(ended_at) FROM sessions WHERE game_id = g.id) as last_played_at
    FROM games g
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filters?.search) {
    sql +=
      ' AND (g.name LIKE ? OR g.display_name LIKE ? OR g.aliases LIKE ?)'
    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
    )
  }

  if (filters?.status && filters.status !== '全部') {
    sql += ' AND g.status = ?'
    params.push(filters.status)
  }

  sql += ' ORDER BY g.is_enabled DESC, g.updated_at DESC'

  return db.prepare(sql).all(...params) as unknown as GameWithStats[]
}

export function getGameById(
  db: Database,
  id: number,
): Game | undefined {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id) as unknown as
    | Game
    | undefined
}

export function createGame(
  db: Database,
  data: {
    name: string
    display_name?: string
    aliases?: string
    status?: string
    platform?: string
    tags?: string
    screenshot_folder_name?: string
    notes?: string
    cover_path?: string
    cover_crop?: string
    banner_crop?: string
    is_enabled?: number
  },
): { lastInsertRowid: number } {
  const result = db
    .prepare(
      `INSERT INTO games (name, display_name, aliases, status, platform, tags,
        cover_path, cover_crop, banner_crop, screenshot_folder_name, notes, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.name,
      data.display_name ?? data.name,
      data.aliases ?? '[]',
      data.status ?? 'not_started',
      data.platform ?? 'PC',
      data.tags ?? '[]',
      data.cover_path ?? '',
      data.cover_crop ?? '',
      data.banner_crop ?? '',
      data.screenshot_folder_name ?? '',
      data.notes ?? '',
      data.is_enabled ?? 1,
    )

  return { lastInsertRowid: result.lastInsertRowid }
}

export function updateGame(
  db: Database,
  id: number,
  data: {
    name?: string
    display_name?: string
    aliases?: string
    status?: string
    platform?: string
    tags?: string
    screenshot_folder_name?: string
    notes?: string
    cover_path?: string
    cover_crop?: string
    banner_crop?: string
    is_enabled?: number
  },
): void {
  const fields: string[] = ["updated_at = datetime('now','localtime')"]
  const params: unknown[] = []

  const allowed = [
    'name',
    'display_name',
    'aliases',
    'status',
    'platform',
    'tags',
    'screenshot_folder_name',
    'notes',
    'cover_path',
    'cover_crop',
    'banner_crop',
    'is_enabled',
  ]
  for (const key of allowed) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${key} = ?`)
      params.push(data[key as keyof typeof data])
    }
  }

  params.push(id)
  db.prepare(`UPDATE games SET ${fields.join(', ')} WHERE id = ?`).run(...params)
}

export function deleteGame(db: Database, id: number): void {
  db.transaction(() => {
    // Keep the original screenshot files and return their records to the inbox.
    db.prepare(
      `UPDATE screenshots
       SET game_id = NULL,
           session_id = NULL,
           status = CASE WHEN status = 'classified' THEN 'pending' ELSE status END,
           updated_at = datetime('now','localtime')
       WHERE game_id = ? AND status != 'deleted'`,
    ).run(id)
    db.prepare('DELETE FROM games WHERE id = ?').run(id)
  })
}

export function toggleEnabled(db: Database, id: number): void {
  db.prepare(
    "UPDATE games SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END, updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(id)
}

// ========== New methods for v3 ==========

/**
 * Update game status with optional completed_at timestamp.
 * Used for auto-transition (not_started → in_progress) and manual completion.
 */
export function updateGameStatus(
  db: Database,
  id: number,
  status: GameStatus,
): void {
  if (status === 'completed') {
    db.prepare(
      "UPDATE games SET status = ?, completed_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?",
    ).run(status, id)
  } else {
    db.prepare(
      "UPDATE games SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    ).run(status, id)
  }
}

/**
 * Update install status (installed / missing).
 */
export function updateInstallStatus(
  db: Database,
  id: number,
  installStatus: InstallStatus,
): void {
  db.prepare(
    "UPDATE games SET install_status = ?, updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(installStatus, id)
}

/**
 * Get single-game statistics for the detail page.
 */
export function getGameStats(
  db: Database,
  id: number,
): { total_duration: number; session_count: number; screenshot_count: number; last_played_at: string | null } {
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(duration_seconds), 0) as total_duration,
        COUNT(*) as session_count,
        (SELECT COUNT(*) FROM screenshots WHERE game_id = ? AND status = 'classified') as screenshot_count,
        MAX(ended_at) as last_played_at
      FROM sessions WHERE game_id = ?`,
    )
    .get(id, id) as unknown as {
      total_duration: number
      session_count: number
      screenshot_count: number
      last_played_at: string | null
    }
  return row
}
