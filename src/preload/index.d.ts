import type {
  Game,
  GameWithStats,
  GameExecutable,
  Session,
  Screenshot,
  ScanRoot,
  DiscoveredExecutable,
  GameLaunchResult,
  SessionWithGame,
  ArchiveGameResult,
} from '../shared/types'
import type { DiscoveredStatus, SessionEndReason, ScreenshotStatus } from '../shared/constants'

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
          cover_path?: string
          cover_crop?: string
          banner_crop?: string
          background_path?: string
          background_crop?: string
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
            cover_path?: string
            cover_crop?: string
            banner_crop?: string
            background_path?: string
            background_crop?: string
          },
        ) => Promise<void>
        delete: (id: number) => Promise<void>
        toggleEnabled: (id: number) => Promise<void>
        getArchived: (filters?: { search?: string }) => Promise<GameWithStats[]>
        archive: (data: { gameId: number; screenshotIds?: number[] }) => Promise<ArchiveGameResult>
        launch: (gameId: number) => Promise<GameLaunchResult>
        checkInstall: (gameId: number) => Promise<string>
        complete: (gameId: number) => Promise<void>
      }
      executable: {
        getByGameId: (gameId: number) => Promise<GameExecutable[]>
        add: (data: {
          game_id: number
          exe_name: string
          install_path_hint?: string
          file_path?: string
          is_primary?: number
        }) => Promise<{ lastInsertRowid: number }>
        remove: (id: number) => Promise<void>
        update: (
          id: number,
          data: {
            exe_name?: string
            file_path?: string
            install_path_hint?: string
            is_primary?: number
            is_ignored?: number
          },
        ) => Promise<void>
      }
      scanRoot: {
        getAll: () => Promise<ScanRoot[]>
        create: (data: { path: string }) => Promise<{ lastInsertRowid: number }>
        update: (
          id: number,
          data: { path?: string; is_enabled?: number },
        ) => Promise<void>
        delete: (id: number) => Promise<void>
        toggleEnabled: (id: number) => Promise<void>
      }
      discovered: {
        getAll: (status?: DiscoveredStatus) => Promise<DiscoveredExecutable[]>
        updateStatus: (
          id: number,
          status: DiscoveredStatus,
          linkedGameId?: number,
        ) => Promise<void>
        batchUpdate: (
          updates: Array<{
            id: number
            status: DiscoveredStatus
            linkedGameId?: number
          }>,
        ) => Promise<void>
      }
      scanner: {
        trigger: () => Promise<{ totalFound: number }>
      }
      session: {
        getByGameId: (gameId: number) => Promise<Session[]>
        getById: (id: number) => Promise<Session | undefined>
        getByDateRange: (
          startDate: string,
          endDate: string,
        ) => Promise<SessionWithGame[]>
        delete: (id: number) => Promise<void>
        endManually: (id: number) => Promise<void>
        updateTime: (
          id: number,
          data: {
            started_at?: string
            ended_at?: string
            duration_seconds?: number
            end_reason?: SessionEndReason
            notes?: string
          },
        ) => Promise<void>
        getAllActive: () => Promise<Session[]>
        recover: () => Promise<number>
      }
      dialog: {
        openDirectory: () => Promise<string | null>
        openExecutable: () => Promise<string | null>
        openImage: () => Promise<string | null>
      }
      discover: {
        accept: (data: {
          candidateId: number
          displayName?: string
        }) => Promise<{ gameId: number }>
      }
      setting: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<void>
        getAll: () => Promise<Record<string, string>>
      }
      screenshot: {
        getAll: (filters?: { status?: string }) => Promise<Screenshot[]>
        getByStatus: (status: ScreenshotStatus) => Promise<Screenshot[]>
        getByGameId: (gameId: number) => Promise<Screenshot[]>
        updateStatus: (
          id: number,
          status: ScreenshotStatus,
          gameId?: number | null,
          sessionId?: number | null,
        ) => Promise<void>
        batchUpdate: (
          ids: number[],
          status: ScreenshotStatus,
          gameId?: number | null,
          sessionId?: number | null,
        ) => Promise<void>
        getPendingCount: () => Promise<number>
        rematch: () => Promise<number>
        trash: (id: number) => Promise<void>
        restore: (id: number) => Promise<void>
        permanentDelete: (id: number) => Promise<void>
        permanentDeleteMany: (ids: number[]) => Promise<void>
      }
      file: {
        openLocation: (filePath: string) => Promise<void>
      }
    }
  }
}
