import path from 'node:path'
import type { Database } from '../db/sqljs-wrapper'
import { fromVaultReference, isVaultReference } from '../../shared/vault'

const VAULT_ROOT_SETTING = 'vault_root_path'

function isPathInside(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootPath, candidatePath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function resolveVaultMediaReference(db: Database, reference: string): string | null {
  const relativePath = fromVaultReference(reference)
  if (!relativePath) return null

  const setting = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(VAULT_ROOT_SETTING) as
    | { value: string }
    | undefined
  if (!setting?.value) return null

  const rootPath = path.resolve(setting.value)
  const resolvedPath = path.resolve(rootPath, ...relativePath.split('/'))
  return isPathInside(rootPath, resolvedPath) ? resolvedPath : null
}

function isRegisteredMediaReference(db: Database, reference: string): boolean {
  const activeMatch = db
    .prepare(
      `SELECT 1 FROM games WHERE cover_path = ? OR background_path = ?
       UNION ALL
       SELECT 1 FROM screenshots WHERE file_path = ? AND status != 'deleted'
       LIMIT 1`,
    )
    .get(reference, reference, reference)

  if (activeMatch) return true

  const archivedMatch = db
    .prepare(
      `SELECT 1 FROM games WHERE archive_cover_path = ? OR archive_background_path = ?
       UNION ALL
       SELECT 1 FROM screenshots WHERE preserved_path = ? AND is_archived_highlight = 1
       LIMIT 1`,
    )
    .get(reference, reference, reference)

  return Boolean(archivedMatch)
}

/**
 * Returns a disk path only when the provided reference is stored in the database.
 * `vault://` references are resolved under the configured vault root; legacy absolute
 * paths remain supported until every existing archive has been migrated.
 */
export function resolveRegisteredMediaPath(db: Database, reference: string): string | null {
  if (!isRegisteredMediaReference(db, reference)) return null
  return isVaultReference(reference) ? resolveVaultMediaReference(db, reference) : reference
}

/** Returns whether a legacy disk path or a vault reference belongs to a registered record. */
export function isRegisteredMediaPath(db: Database, reference: string): boolean {
  return Boolean(resolveRegisteredMediaPath(db, reference))
}
