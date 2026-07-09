import type { Database } from '../sqljs-wrapper'
import type { ScanRoot } from '../../../shared/types'

export function getAll(db: Database): ScanRoot[] {
  return db
    .prepare('SELECT * FROM scan_roots ORDER BY created_at DESC')
    .all() as unknown as ScanRoot[]
}

export function getById(db: Database, id: number): ScanRoot | undefined {
  return db
    .prepare('SELECT * FROM scan_roots WHERE id = ?')
    .get(id) as unknown as ScanRoot | undefined
}

export function getEnabled(db: Database): ScanRoot[] {
  return db
    .prepare('SELECT * FROM scan_roots WHERE is_enabled = 1')
    .all() as unknown as ScanRoot[]
}

export function create(
  db: Database,
  data: { path: string },
): { lastInsertRowid: number } {
  const result = db
    .prepare('INSERT INTO scan_roots (path) VALUES (?)')
    .run(data.path)
  return { lastInsertRowid: result.lastInsertRowid }
}

export function update(
  db: Database,
  id: number,
  data: { path?: string; is_enabled?: number },
): void {
  const fields: string[] = ["updated_at = datetime('now','localtime')"]
  const params: unknown[] = []

  if (data.path !== undefined) {
    fields.push('path = ?')
    params.push(data.path)
  }
  if (data.is_enabled !== undefined) {
    fields.push('is_enabled = ?')
    params.push(data.is_enabled)
  }

  params.push(id)
  db.prepare(`UPDATE scan_roots SET ${fields.join(', ')} WHERE id = ?`).run(...params)
}

export function remove(db: Database, id: number): void {
  db.prepare('DELETE FROM scan_roots WHERE id = ?').run(id)
}

export function toggleEnabled(db: Database, id: number): void {
  db.prepare(
    "UPDATE scan_roots SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END, updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(id)
}

export function updateLastScanned(db: Database, id: number): void {
  db.prepare(
    "UPDATE scan_roots SET last_scanned_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?",
  ).run(id)
}
