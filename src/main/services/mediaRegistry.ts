import type { Database } from '../db/sqljs-wrapper'

/** Returns whether a local image path belongs to a game or a non-deleted screenshot. */
/**
 * Normalizes path separators for cross-platform comparison.
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/')
}

/** Returns whether a local image path belongs to a game or a non-deleted screenshot. */
export function isRegisteredMediaPath(db: Database, filePath: string): boolean {
  const normalized = normalizePath(filePath)
  return Boolean(
    db
      .prepare(
        `SELECT 1 FROM games WHERE REPLACE(cover_path, '\\', '/') = ? OR REPLACE(background_path, '\\', '/') = ?
         UNION ALL
         SELECT 1 FROM screenshots WHERE REPLACE(file_path, '\\', '/') = ? AND status != 'deleted'
         LIMIT 1`,
      )
      .get(normalized, normalized, normalized),
  )
}
