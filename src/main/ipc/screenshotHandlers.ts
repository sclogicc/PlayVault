import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import * as screenshotRepo from '../db/repositories/screenshotRepository'
import { rematchPending } from '../services/screenshotWatcher'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { ScreenshotStatus } from '../../shared/constants'

export function registerScreenshotHandlers(
  ipcMain: IpcMain,
  db: Database,
): void {
  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_GET_ALL,
    (_event, filters?: { status?: string }) => {
      return screenshotRepo.getAll(db, filters)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_GET_BY_STATUS,
    (_event, status: ScreenshotStatus) => {
      return screenshotRepo.getByStatus(db, status)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_GET_BY_GAME,
    (_event, gameId: number) => {
      return screenshotRepo.getByGameId(db, gameId)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_UPDATE_STATUS,
    (
      _event,
      id: number,
      status: ScreenshotStatus,
      gameId?: number | null,
      sessionId?: number | null,
    ) => {
      screenshotRepo.updateStatus(db, id, status, gameId, sessionId)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_BATCH_UPDATE,
    (
      _event,
      ids: number[],
      status: ScreenshotStatus,
      gameId?: number | null,
      sessionId?: number | null,
    ) => {
      screenshotRepo.batchUpdateStatus(db, ids, status, gameId, sessionId)
    },
  )

  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_GET_PENDING_COUNT, () => {
    return screenshotRepo.getPendingCount(db)
  })

  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_REMATCH, () => {
    return rematchPending(db)
  })

  // Trash / Restore / Permanent Delete
  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_TRASH, (_event, id: number) => {
    screenshotRepo.trashScreenshot(db, id)
  })

  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_RESTORE, (_event, id: number) => {
    screenshotRepo.restoreScreenshot(db, id)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_PERMANENT_DELETE,
    (_event, id: number) => {
      screenshotRepo.permanentDelete(db, id)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.SCREENSHOT_BATCH_PERMANENT_DELETE,
    (_event, ids: number[]) => {
      screenshotRepo.permanentDeleteMany(db, ids)
    },
  )
}
