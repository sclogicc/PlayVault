import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import * as gameRepo from '../db/repositories/gameRepository'
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
}
