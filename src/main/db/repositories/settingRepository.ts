import type { Database } from '../sqljs-wrapper'
import type { AppSetting } from '../../../shared/types'

export function get(
  db: Database,
  key: string,
): AppSetting | undefined {
  return db
    .prepare('SELECT * FROM app_settings WHERE key = ?')
    .get(key) as unknown as AppSetting | undefined
}

export function set(db: Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value)
}

export function getAll(db: Database): AppSetting[] {
  return db.prepare('SELECT * FROM app_settings').all() as unknown as AppSetting[]
}
