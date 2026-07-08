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
  },
): { lastInsertRowid: number } {
  const result = db
    .prepare(
      `INSERT INTO game_executables (game_id, exe_name, install_path_hint)
       VALUES (?, ?, ?)`,
    )
    .run(data.game_id, data.exe_name, data.install_path_hint ?? '')

  return { lastInsertRowid: result.lastInsertRowid }
}

export function remove(db: Database, id: number): void {
  db.prepare('DELETE FROM game_executables WHERE id = ?').run(id)
}
