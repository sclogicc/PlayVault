import initSqlJs, { type Database as SqlJsDatabase, type Statement, type BindParams, type SqlJsStatic } from 'sql.js'
import fs from 'fs'
import path from 'path'

/**
 * A wrapper around sql.js that provides a better-sqlite3-like API
 * for synchronous database operations in Electron's main process.
 */
export class Database {
  private db: SqlJsDatabase
  private filePath: string
  private transactionDepth = 0

  private constructor(_sql: SqlJsStatic, db: SqlJsDatabase, filePath: string) {
    this.db = db
    this.filePath = filePath
  }

  static async open(filePath: string): Promise<Database> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const sql = await initSqlJs()

    let db: SqlJsDatabase
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath)
      db = new sql.Database(buffer)
    } else {
      db = new sql.Database()
    }

    const instance = new Database(sql, db, filePath)
    instance.exec('PRAGMA journal_mode = WAL')
    instance.exec('PRAGMA foreign_keys = ON')

    return instance
  }

  exec(sql: string): void {
    this.db.run(sql)
    this.saveIfNotInTransaction()
  }

  prepare(sql: string): WrappedStatement {
    return new WrappedStatement(this.db, sql, () => this.saveIfNotInTransaction())
  }

  save(): void {
    const data = this.db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(this.filePath, buffer)
  }

  close(): void {
    this.save()
    this.db.close()
  }

  transaction(fn: () => void): void {
    this.db.run('BEGIN')
    this.transactionDepth++
    try {
      fn()
      this.db.run('COMMIT')
      this.transactionDepth--
      this.save()
    } catch (e) {
      try {
        this.db.run('ROLLBACK')
      } catch {
        // Rollback may fail if transaction already invalid — ignore
      }
      this.transactionDepth = Math.max(0, this.transactionDepth - 1)
      throw e
    }
  }

  private saveIfNotInTransaction(): void {
    if (this.transactionDepth === 0) {
      this.save()
    }
  }
}

class WrappedStatement {
  private db: SqlJsDatabase
  private sql: string
  private onSave: () => void

  constructor(db: SqlJsDatabase, sql: string, onSave: () => void) {
    this.db = db
    this.sql = sql
    this.onSave = onSave
  }

  run(...params: unknown[]): { lastInsertRowid: number; changes: number } {
    try {
      this.db.run(this.sql, params as BindParams)
      const lastId = this.db.exec('SELECT last_insert_rowid()')[0]
      const changes = this.db.getRowsModified()
      // sql.js export() resets the connection-local last_insert_rowid value.
      // Capture it before the wrapper persists the in-memory database to disk.
      this.onSave()
      return {
        lastInsertRowid: lastId ? (lastId.values[0][0] as number) : 0,
        changes,
      }
    } catch (e) {
      console.error('SQL run error:', this.sql, params, e)
      throw e
    }
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    try {
      const stmt = this.db.prepare(this.sql)
      stmt.bind(params as BindParams)
      if (stmt.step()) {
        return this.rowToObject(stmt)
      }
      return undefined
    } catch (e) {
      console.error('SQL get error:', this.sql, params, e)
      throw e
    }
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    try {
      const results: Record<string, unknown>[] = []
      const stmt = this.db.prepare(this.sql)
      stmt.bind(params as BindParams)
      while (stmt.step()) {
        results.push(this.rowToObject(stmt))
      }
      return results
    } catch (e) {
      console.error('SQL all error:', this.sql, params, e)
      throw e
    }
  }

  private rowToObject(stmt: Statement): Record<string, unknown> {
    const row: Record<string, unknown> = {}
    const colNames = stmt.getColumnNames()
    const values = stmt.getAsObject()
    for (const col of colNames) {
      row[col] = values[col]
    }
    // SQLite stores booleans as 0/1, keep as numbers for consistency
    return row
  }
}
