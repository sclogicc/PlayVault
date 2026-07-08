import { app } from 'electron'
import path from 'path'
import { Database } from './sqljs-wrapper'
import { runMigrations } from './schema'

let db: Database | null = null

export async function initDatabase(): Promise<Database> {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'playvault.db')
  db = await Database.open(dbPath)
  runMigrations(db)
  return db
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
