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
    `ALTER TABLE sessions ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))`,
    `ALTER TABLE sessions ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))`,
  ],
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
    db.transaction(() => {
      for (const sql of statements) {
        db.exec(sql)
      }
      db.prepare('INSERT INTO _migrations (version) VALUES (?)').run(version)
    })
  }
}
