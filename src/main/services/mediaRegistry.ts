import type { Database } from '../db/sqljs-wrapper'

/** Returns whether a local image path belongs to an active or archived game record. */
export function isRegisteredMediaPath(db: Database, filePath: string): boolean {
  // Keep the original hot path and its simple three-parameter contract for active media.
  const activeMatch = db
    .prepare(
      `SELECT 1 FROM games WHERE cover_path = ? OR background_path = ?
       UNION ALL
       SELECT 1 FROM screenshots WHERE file_path = ? AND status != 'deleted'
       LIMIT 1`,
    )
    .get(filePath, filePath, filePath)

  if (activeMatch) return true

  // Archived artwork and copied highlight screenshots remain readable even when
  // their original game files or inbox screenshots have already been removed.
  const archivedMatch = db
    .prepare(
      `SELECT 1 FROM games WHERE archive_cover_path = ? OR archive_background_path = ?
       UNION ALL
       SELECT 1 FROM screenshots WHERE preserved_path = ? AND is_archived_highlight = 1
       LIMIT 1`,
    )
    .get(filePath, filePath, filePath)

  return Boolean(archivedMatch)
}
