import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import * as gameRepo from '../db/repositories/gameRepository'
import { launchGame } from '../services/gameLauncher'
import { checkInstallStatus } from '../services/installChecker'
import { archiveGameExperience } from '../services/gameArchive'
import { IPC_CHANNELS } from '../../shared/ipc'

export function registerGameHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle(
    IPC_CHANNELS.GAME_GET_ALL,
    (_event, filters?: { search?: string; status?: string }) => {
      return gameRepo.getAllGames(db, filters)
    },
  )

  ipcMain.handle(IPC_CHANNELS.GAME_GET_BY_ID, (_event, id: number) => {
    return gameRepo.getGameById(db, id)
  })

  ipcMain.handle(
    IPC_CHANNELS.GAME_GET_ARCHIVED,
    (_event, filters?: { search?: string; sortOrder?: 'asc' | 'desc' }) => gameRepo.getArchivedGames(db, filters),
  )

  ipcMain.handle(
    IPC_CHANNELS.GAME_CREATE,
    (
      _event,
      data: {
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
      },
    ) => {
      return gameRepo.createGame(db, data)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.GAME_UPDATE,
    (
      _event,
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
    ) => {
      gameRepo.updateGame(db, id, data)
    },
  )

  ipcMain.handle(IPC_CHANNELS.GAME_DELETE, (_event, id: number) => {
    gameRepo.deleteGame(db, id)
  })

  ipcMain.handle(IPC_CHANNELS.GAME_TOGGLE, (_event, id: number) => {
    gameRepo.toggleEnabled(db, id)
  })

  // ========== New handlers for v3 ==========

  ipcMain.handle(IPC_CHANNELS.GAME_LAUNCH, (_event, gameId: number) => {
    return launchGame(db, gameId)
  })

  ipcMain.handle(IPC_CHANNELS.GAME_CHECK_INSTALL, (_event, gameId: number) => {
    const installStatus = checkInstallStatus(db, gameId)
    gameRepo.updateInstallStatus(db, gameId, installStatus)
    return installStatus
  })

  ipcMain.handle(IPC_CHANNELS.GAME_COMPLETE, (_event, gameId: number) => {
    gameRepo.updateGameStatus(db, gameId, 'completed')
  })

  ipcMain.handle(
    IPC_CHANNELS.GAME_ARCHIVE,
    async (_event, data: { gameId: number; screenshotIds?: number[] }) =>
      archiveGameExperience(db, data.gameId, data.screenshotIds ?? []),
  )
}
