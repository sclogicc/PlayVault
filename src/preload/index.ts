import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { DiscoveredStatus, SessionEndReason, ScreenshotStatus } from '../shared/constants'
import type { UpdateStatus } from '../shared/update'
import type { VaultHealthReport, VaultLocation } from '../shared/vault'
import type { GameCaptureStatus } from '../shared/capture'

const api = {
  game: {
    getAll: (filters?: { search?: string; status?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_GET_ALL, filters),
    getById: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_GET_BY_ID, id),
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
    }) => ipcRenderer.invoke(IPC_CHANNELS.GAME_CREATE, data),
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
    ) => ipcRenderer.invoke(IPC_CHANNELS.GAME_UPDATE, id, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_DELETE, id),
    toggleEnabled: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_TOGGLE, id),
    getArchived: (filters?: { search?: string; sortOrder?: 'asc' | 'desc' }) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_GET_ARCHIVED, filters),
    archive: (data: { gameId: number; screenshotIds?: number[] }) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_ARCHIVE, data),
    launch: (gameId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_LAUNCH, gameId),
    checkInstall: (gameId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_CHECK_INSTALL, gameId),
    complete: (gameId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_COMPLETE, gameId),
  },
  executable: {
    getByGameId: (gameId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXE_GET_BY_GAME, gameId),
    add: (data: {
      game_id: number
      exe_name: string
      install_path_hint?: string
      file_path?: string
      is_primary?: number
    }) => ipcRenderer.invoke(IPC_CHANNELS.EXE_ADD, data),
    remove: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXE_REMOVE, id),
    update: (id: number, data: {
      exe_name?: string
      file_path?: string
      install_path_hint?: string
      is_primary?: number
      is_ignored?: number
    }) => ipcRenderer.invoke(IPC_CHANNELS.EXE_UPDATE, id, data),
  },
  scanRoot: {
    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCAN_ROOT_GET_ALL),
    create: (data: { path: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCAN_ROOT_CREATE, data),
    update: (id: number, data: { path?: string; is_enabled?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCAN_ROOT_UPDATE, id, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCAN_ROOT_DELETE, id),
    toggleEnabled: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCAN_ROOT_TOGGLE, id),
  },
  discovered: {
    getAll: (status?: DiscoveredStatus) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERED_GET_ALL, status),
    updateStatus: (id: number, status: DiscoveredStatus, linkedGameId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.DISCOVERED_UPDATE_STATUS, id, status, linkedGameId),
    batchUpdate: (
      updates: Array<{ id: number; status: DiscoveredStatus; linkedGameId?: number }>,
    ) => ipcRenderer.invoke(IPC_CHANNELS.DISCOVERED_BATCH_UPDATE, updates),
  },
  scanner: {
    trigger: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCANNER_TRIGGER),
  },
  session: {
    getByGameId: (gameId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_BY_GAME, gameId),
    getById: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_BY_ID, id),
    getByDateRange: (startDate: string, endDate: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_BY_DATE, startDate, endDate),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_DELETE, id),
    endManually: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_END_MANUALLY, id),
    updateTime: (
      id: number,
      data: {
        started_at?: string
        ended_at?: string
        duration_seconds?: number
        end_reason?: SessionEndReason
        notes?: string
      },
    ) => ipcRenderer.invoke(IPC_CHANNELS.SESSION_UPDATE_TIME, id, data),
    getAllActive: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET_ALL_ACTIVE),
    recover: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_RECOVER),
  },
  dialog: {
    openDirectory: () =>
      ipcRenderer.invoke('dialog:openDirectory'),
    openExecutable: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_EXECUTABLE),
    openImage: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_IMAGE),
  },
  discover: {
    accept: (data: { candidateId: number; displayName?: string }) =>
      ipcRenderer.invoke('discover:accept', data),
  },
  setting: {
    get: (key: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTING_GET, key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTING_SET, key, value),
    getAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTING_GET_ALL),
  },
  screenshot: {
    getAll: (filters?: { status?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_GET_ALL, filters),
    getByStatus: (status: ScreenshotStatus) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_GET_BY_STATUS, status),
    getByGameId: (gameId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_GET_BY_GAME, gameId),
    updateStatus: (
      id: number,
      status: ScreenshotStatus,
      gameId?: number | null,
      sessionId?: number | null,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.SCREENSHOT_UPDATE_STATUS,
        id,
        status,
        gameId,
        sessionId,
      ),
    batchUpdate: (
      ids: number[],
      status: ScreenshotStatus,
      gameId?: number | null,
      sessionId?: number | null,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.SCREENSHOT_BATCH_UPDATE,
        ids,
        status,
        gameId,
        sessionId,
      ),
    getPendingCount: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_GET_PENDING_COUNT),
    rematch: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_REMATCH),
    trash: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_TRASH, id),
    restore: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_RESTORE, id),
    permanentDelete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_PERMANENT_DELETE, id),
    permanentDeleteMany: (ids: number[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_BATCH_PERMANENT_DELETE, ids),
  },
  gameCapture: {
    getStatus: (): Promise<GameCaptureStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_CAPTURE_GET_STATUS),
    setEnabled: (enabled: boolean): Promise<GameCaptureStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_CAPTURE_SET_ENABLED, enabled),
    setAccelerator: (accelerator: string): Promise<GameCaptureStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_CAPTURE_SET_ACCELERATOR, accelerator),
    onStatusChange: (callback: (status: GameCaptureStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: GameCaptureStatus): void => callback(status)
      ipcRenderer.on(IPC_CHANNELS.GAME_CAPTURE_STATUS_CHANGED, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.GAME_CAPTURE_STATUS_CHANGED, listener)
    },
  },
  vault: {
    getLocation: (): Promise<VaultLocation> =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_LOCATION),
    relocate: (): Promise<VaultLocation | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_RELOCATE),
    getHealth: (): Promise<VaultHealthReport> =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_HEALTH),
  },
  update: {
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_STATUS),
    check: () =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
    trigger: () =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TRIGGER),
    onStatusChange: (callback: (status: UpdateStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus): void => callback(status)
      ipcRenderer.on(IPC_CHANNELS.UPDATE_STATUS_CHANGED, listener)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATE_STATUS_CHANGED, listener)
    },
  },
  file: {
    openLocation: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_LOCATION, filePath),
  },
}

contextBridge.exposeInMainWorld('api', api)
