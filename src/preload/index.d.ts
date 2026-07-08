import type { Game, GameWithStats, GameExecutable } from '../shared/types'

declare global {
  interface Window {
    api: {
      game: {
        getAll: (
          filters?: { search?: string; status?: string },
        ) => Promise<GameWithStats[]>
        getById: (id: number) => Promise<Game | undefined>
        create: (data: {
          name: string
          display_name?: string
          aliases?: string
          status?: string
          platform?: string
          tags?: string
          screenshot_folder_name?: string
          notes?: string
        }) => Promise<{ lastInsertRowid: number }>
        update: (
          id: number,
          data: {
            name?: string
            display_name?: string
            aliases?: string
            status?: string
            platform?: string
            tags?: string
            screenshot_folder_name?: string
            notes?: string
          },
        ) => Promise<void>
        delete: (id: number) => Promise<void>
        toggleEnabled: (id: number) => Promise<void>
      }
      executable: {
        getByGameId: (gameId: number) => Promise<GameExecutable[]>
        add: (data: {
          game_id: number
          exe_name: string
          install_path_hint?: string
        }) => Promise<{ lastInsertRowid: number }>
        remove: (id: number) => Promise<void>
      }
    }
  }
}
