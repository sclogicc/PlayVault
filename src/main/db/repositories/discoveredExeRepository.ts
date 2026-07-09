import type { Database } from '../sqljs-wrapper'
import type { DiscoveredExecutable } from '../../../shared/types'
import type { DiscoveredStatus } from '../../../shared/constants'

export function getAll(db: Database): DiscoveredExecutable[] {
  return db
    .prepare('SELECT * FROM discovered_executables ORDER BY score DESC, file_name ASC')
    .all() as unknown as DiscoveredExecutable[]
}

export function getByStatus(
  db: Database,
  status: DiscoveredStatus,
): DiscoveredExecutable[] {
  return db
    .prepare(
      'SELECT * FROM discovered_executables WHERE status = ? ORDER BY score DESC, file_name ASC',
    )
    .all(status) as unknown as DiscoveredExecutable[]
}

export function getById(
  db: Database,
  id: number,
): DiscoveredExecutable | undefined {
  return db
    .prepare('SELECT * FROM discovered_executables WHERE id = ?')
    .get(id) as unknown as DiscoveredExecutable | undefined
}

export function getByScanRootId(
  db: Database,
  scanRootId: number,
): DiscoveredExecutable[] {
  return db
    .prepare(
      'SELECT * FROM discovered_executables WHERE scan_root_id = ? ORDER BY score DESC',
    )
    .all(scanRootId) as unknown as DiscoveredExecutable[]
}

export function create(
  db: Database,
  data: {
    scan_root_id: number
    file_path: string
    file_name: string
    folder_name: string
    file_size: number
    modified_at: string | null
    score: number
    match_reasons: string
  },
): { lastInsertRowid: number } {
  const result = db
    .prepare(
      `INSERT INTO discovered_executables
        (scan_root_id, file_path, file_name, folder_name, file_size, modified_at, score, match_reasons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.scan_root_id,
      data.file_path,
      data.file_name,
      data.folder_name,
      data.file_size,
      data.modified_at,
      data.score,
      data.match_reasons,
    )
  return { lastInsertRowid: result.lastInsertRowid }
}

/**
 * Insert or replace a discovered executable (based on file_path uniqueness).
 * Returns the lastInsertRowid of the inserted/replaced row.
 */
export function upsert(
  db: Database,
  data: {
    scan_root_id: number
    file_path: string
    file_name: string
    folder_name: string
    file_size: number
    modified_at: string | null
    score: number
    match_reasons: string
    status: DiscoveredStatus
  },
): { lastInsertRowid: number } {
  const result = db
    .prepare(
      `INSERT INTO discovered_executables
        (scan_root_id, file_path, file_name, folder_name, file_size, modified_at, score, match_reasons, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
       ON CONFLICT(file_path) DO UPDATE SET
        scan_root_id = excluded.scan_root_id,
        file_size = excluded.file_size,
        modified_at = excluded.modified_at,
        score = excluded.score,
        match_reasons = excluded.match_reasons,
        updated_at = datetime('now','localtime')`,
    )
    .run(
      data.scan_root_id,
      data.file_path,
      data.file_name,
      data.folder_name,
      data.file_size,
      data.modified_at,
      data.score,
      data.match_reasons,
      data.status,
    )
  return { lastInsertRowid: result.lastInsertRowid }
}

/**
 * Batch upsert — used after a scan to refresh the candidates list.
 * New files are inserted; existing files are updated with fresh scores.
 * Only affects rows with status = 'pending' or 'ignored' (keeps accepted/rejected untouched).
 */
export function batchUpsert(
  db: Database,
  candidates: Array<{
    scan_root_id: number
    file_path: string
    file_name: string
    folder_name: string
    file_size: number
    modified_at: string | null
    score: number
    match_reasons: string
  }>,
): void {
  db.transaction(() => {
    for (const c of candidates) {
      db.prepare(
        `INSERT INTO discovered_executables
          (scan_root_id, file_path, file_name, folder_name, file_size, modified_at, score, match_reasons, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now','localtime'))
         ON CONFLICT(file_path) DO UPDATE SET
          scan_root_id = excluded.scan_root_id,
          file_size = excluded.file_size,
          modified_at = excluded.modified_at,
          score = excluded.score,
          match_reasons = excluded.match_reasons,
          updated_at = datetime('now','localtime')
          WHERE status IN ('pending', 'ignored')`,
      ).run(
        c.scan_root_id,
        c.file_path,
        c.file_name,
        c.folder_name,
        c.file_size,
        c.modified_at,
        c.score,
        c.match_reasons,
      )
    }
  })
}

export function updateStatus(
  db: Database,
  id: number,
  status: DiscoveredStatus,
  linkedGameId?: number,
): void {
  if (linkedGameId !== undefined) {
    db.prepare(
      `UPDATE discovered_executables
       SET status = ?, linked_game_id = ?, updated_at = datetime('now','localtime')
       WHERE id = ?`,
    ).run(status, linkedGameId, id)
  } else {
    db.prepare(
      `UPDATE discovered_executables
       SET status = ?, updated_at = datetime('now','localtime')
       WHERE id = ?`,
    ).run(status, id)
  }
}

/**
 * Clear all discovered executables for a given scan root and status.
 * Used when a scan root is removed or rescanned.
 */
export function deleteByScanRootId(
  db: Database,
  scanRootId: number,
  status?: DiscoveredStatus,
): void {
  if (status) {
    db.prepare(
      'DELETE FROM discovered_executables WHERE scan_root_id = ? AND status = ?',
    ).run(scanRootId, status)
  } else {
    db.prepare(
      'DELETE FROM discovered_executables WHERE scan_root_id = ?',
    ).run(scanRootId)
  }
}
