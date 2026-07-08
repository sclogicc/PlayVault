import type { GameStatus, ScreenshotStatus, SessionSource } from './constants'

// ========== Game ==========

export interface Game {
  id: number
  name: string
  display_name: string
  aliases: string
  status: GameStatus
  platform: string
  tags: string
  cover_path: string
  screenshot_folder_name: string
  notes: string
  is_enabled: 0 | 1
  created_at: string
  updated_at: string
}

// Game with computed fields for display
export interface GameWithStats extends Game {
  exe_count: number
  total_duration: number
  screenshot_count: number
  last_played_at: string | null
}

// ========== GameExecutable ==========

export interface GameExecutable {
  id: number
  game_id: number
  exe_name: string
  install_path_hint: string
  is_ignored: 0 | 1
}

// ========== Session ==========

export interface Session {
  id: number
  game_id: number
  exe_name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
  source: SessionSource
  notes: string
}

// ========== Screenshot ==========

export interface Screenshot {
  id: number
  game_id: number | null
  session_id: number | null
  file_path: string
  file_name: string
  captured_at: string
  status: ScreenshotStatus
  source_directory: string
  archive_path: string
  hash: string
  created_at: string
}

// ========== AppSetting ==========

export interface AppSetting {
  id: number
  key: string
  value: string
}

// ========== Form Data for creating/updating games ==========

export interface GameFormData {
  name: string
  display_name: string
  aliases: string
  status: GameStatus
  platform: string
  tags: string
  screenshot_folder_name: string
  notes: string
  is_enabled: 0 | 1
}
