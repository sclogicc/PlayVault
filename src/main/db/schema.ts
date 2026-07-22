import type { Database } from './sqljs-wrapper'

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      aliases TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT '游玩中',
      platform TEXT NOT NULL DEFAULT 'PC',
      tags TEXT NOT NULL DEFAULT '[]',
      cover_path TEXT NOT NULL DEFAULT '',
      cover_crop TEXT NOT NULL DEFAULT '',
      screenshot_folder_name TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )`,

    `CREATE TABLE IF NOT EXISTS game_executables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      exe_name TEXT NOT NULL,
      install_path_hint TEXT NOT NULL DEFAULT '',
      is_ignored INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_exe_game_id ON game_executables(game_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_exe_unique ON game_executables(game_id, exe_name)`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      exe_name TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'auto',
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_session_game_id ON sessions(game_id)`,
    `CREATE INDEX IF NOT EXISTS idx_session_started ON sessions(started_at)`,

    `CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER,
      session_id INTEGER,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      source_directory TEXT NOT NULL DEFAULT '',
      archive_path TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shot_game_id ON screenshots(game_id)`,
    `CREATE INDEX IF NOT EXISTS idx_shot_status ON screenshots(status)`,

    `CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT ''
    )`,
  ],

  // v2: scan roots, discovered executables, session/enhanced fields
  2: [
    `CREATE TABLE IF NOT EXISTS scan_roots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_scanned_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )`,

    `CREATE TABLE IF NOT EXISTS discovered_executables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_root_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      folder_name TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      modified_at TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      match_reasons TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      linked_game_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (scan_root_id) REFERENCES scan_roots(id) ON DELETE CASCADE,
      FOREIGN KEY (linked_game_id) REFERENCES games(id) ON DELETE SET NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_dex_status ON discovered_executables(status)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_dex_path ON discovered_executables(file_path)`,

    `ALTER TABLE game_executables ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0`,

    `ALTER TABLE sessions ADD COLUMN end_reason TEXT NOT NULL DEFAULT 'normal'`,
    `ALTER TABLE sessions ADD COLUMN process_path TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE sessions ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE sessions ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  ],

  // v3: status consolidation (6→3), install status, file_path, completed_at
  3: [
    // games: new columns
    "ALTER TABLE games ADD COLUMN install_status TEXT NOT NULL DEFAULT 'installed'",
    'ALTER TABLE games ADD COLUMN completed_at TEXT',

    // Migrate Chinese status values to English machine values
    "UPDATE games SET status = 'not_started' WHERE status = '未开始'",
    "UPDATE games SET status = 'in_progress' WHERE status IN ('游玩中', '搁置', '弃坑')",
    "UPDATE games SET status = 'completed' WHERE status IN ('已通关', '已全成就')",

    // game_executables: file_path for full exe path
    "ALTER TABLE game_executables ADD COLUMN file_path TEXT NOT NULL DEFAULT ''",

    // Migrate install_path_hint to file_path where it looks like a full .exe path (contains backslash)
    "UPDATE game_executables SET file_path = install_path_hint WHERE install_path_hint LIKE '%.exe' AND install_path_hint LIKE '%\\%'",

    // Auto-set first exe per game as primary where none is set
    'UPDATE game_executables SET is_primary = 1 WHERE id IN (SELECT MIN(id) FROM game_executables GROUP BY game_id) AND is_primary = 0',
  ],

  // v4: screenshot status overhaul — ignored→trashed, deleted state, timestamps
  4: [
    // New columns for screenshot lifecycle tracking
    "ALTER TABLE screenshots ADD COLUMN deleted_at TEXT",
    "ALTER TABLE screenshots ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",

    // Migrate 'ignored' status to 'trashed'
    "UPDATE screenshots SET status = 'trashed' WHERE status = 'ignored'",
  ],

  // v5: repair legacy status values that predate the machine-readable state model
  5: [
    "UPDATE games SET status = 'not_started' WHERE status = '\u672a\u5f00\u59cb'",
    "UPDATE games SET status = 'in_progress' WHERE status IN ('\u6e38\u73a9\u4e2d', '\u6401\u7f6e', '\u5f03\u5751')",
    "UPDATE games SET status = 'completed' WHERE status IN ('\u5df2\u901a\u5173', '\u5df2\u5168\u6210\u5c31')",
    "UPDATE games SET status = 'not_started' WHERE status NOT IN ('not_started', 'in_progress', 'completed')",
  ],

  // v6: repair sessions ended manually before duration calculation was implemented
  6: [
    `UPDATE sessions
     SET duration_seconds = MAX(0, CAST(
       (julianday(ended_at) - julianday(started_at)) * 86400 AS INTEGER
     ))
     WHERE ended_at IS NOT NULL AND duration_seconds = 0`,
  ],

  // v7: optimize media protocol lookups by screenshot file path
  7: [
    'CREATE INDEX IF NOT EXISTS idx_shot_file_path ON screenshots(file_path)',
  ],

  // v8: persist per-game display crop without modifying the original cover image
  8: [
    "ALTER TABLE games ADD COLUMN cover_crop TEXT NOT NULL DEFAULT ''",
  ],

  // v9: keep the detail-page banner crop independent from the library cover crop
  9: [
    "ALTER TABLE games ADD COLUMN banner_crop TEXT NOT NULL DEFAULT ''",
  ],
}

/**
 * Check if a column exists in a table.
 */
function columnExists(db: Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>
  return rows.some((r) => r.name === column)
}

export function runMigrations(db: Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)`,
  )

  const row = db.prepare('SELECT MAX(version) as v FROM _migrations').get() as
    | { v: number | null }
    | undefined
  const currentVersion = row?.v ?? 0

  const versions = Object.keys(MIGRATIONS)
    .map(Number)
    .sort((a, b) => a - b)

  for (const version of versions) {
    if (version <= currentVersion) continue
    const statements = MIGRATIONS[version]

    // Execute each statement individually (no transaction).
    // DDL (CREATE TABLE / ALTER TABLE) auto-commits in SQLite,
    // making explicit transactions unreliable for migrations.
    // All statements are idempotent — safe to re-run.
    for (const sql of statements) {
      const alterMatch = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i)
      if (alterMatch) {
        if (columnExists(db, alterMatch[1], alterMatch[2])) {
          continue
        }
      }
      db.exec(sql)
    }
    db.exec(
      `INSERT INTO _migrations (version) VALUES (${version})`,
    )
  }
}
