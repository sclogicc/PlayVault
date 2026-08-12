import type { Database } from '../db/sqljs-wrapper'

/** Returns whether a local image path belongs to a game or a non-deleted screenshot. */
export function isRegisteredMediaPath(db: Database, filePath: string): boolean {
  return Boolean(
    db
      .prepare(
        `SELECT 1 FROM games WHERE cover_path = ? OR background_path = ?
         UNION ALL
         SELECT 1 FROM screenshots WHERE file_path = ? AND status != 'deleted'
         LIMIT 1`,
      )
      .get(filePath, filePath, filePath),
  )
}
