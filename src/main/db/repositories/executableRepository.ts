import type { Database } from '../sqljs-wrapper'
import type { GameExecutable } from '../../../shared/types'

export function getByGameId(
  db: Database,
  gameId: number,
): GameExecutable[] {
  return db
    .prepare('SELECT * FROM game_executables WHERE game_id = ?')
    .all(gameId) as unknown as GameExecutable[]
}

export function add(
  db: Database,
  data: {
    game_id: number
    exe_name: string
    install_path_hint?: string
    file_path?: string
    is_primary?: number
  },
): { lastInsertRowid: number } {
  const result = db
    .prepare(
      `INSERT INTO game_executables (game_id, exe_name, install_path_hint, file_path, is_primary)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      data.game_id,
      data.exe_name,
      data.install_path_hint ?? '',
      data.file_path ?? '',
      data.is_primary ?? 0,
    )

  return { lastInsertRowid: result.lastInsertRowid }
}

export function remove(db: Database, id: number): void {
  db.prepare('DELETE FROM game_executables WHERE id = ?').run(id)
}

// ========== New methods for v3 ==========

/**
 * Update executable fields (file_path, is_primary, install_path_hint).
 */
export function update(
  db: Database,
  id: number,
  data: {
    exe_name?: string
    file_path?: string
    install_path_hint?: string
    is_primary?: number
    is_ignored?: number
  },
): void {
  const fields: string[] = []
  const params: unknown[] = []

  const allowed = ['exe_name', 'file_path', 'install_path_hint', 'is_primary', 'is_ignored']
  for (const key of allowed) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${key} = ?`)
      params.push(data[key as keyof typeof data])
    }
  }

  if (fields.length === 0) return

  params.push(id)
  db.prepare(`UPDATE game_executables SET ${fields.join(', ')} WHERE id = ?`).run(
    ...params,
  )
}

/**
 * Get the primary executable for a game (is_primary = 1).
 */
export function getPrimaryExe(
  db: Database,
  gameId: number,
): GameExecutable | undefined {
  return db
    .prepare(
      'SELECT * FROM game_executables WHERE game_id = ? AND is_primary = 1 LIMIT 1',
    )
    .get(gameId) as unknown as GameExecutable | undefined
}

/**
 * Set a specific exe as primary for a game (clears others first).
 */
export function setPrimary(
  db: Database,
  gameId: number,
  exeId: number,
): void {
  db.transaction(() => {
    db.prepare(
      'UPDATE game_executables SET is_primary = 0 WHERE game_id = ?',
    ).run(gameId)
    db.prepare(
      'UPDATE game_executables SET is_primary = 1 WHERE id = ?',
    ).run(exeId)
  })
}
