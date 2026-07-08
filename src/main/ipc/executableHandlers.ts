import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import * as exeRepo from '../db/repositories/executableRepository'
import { IPC_CHANNELS } from '../../shared/ipc'

export function registerExecutableHandlers(
  ipcMain: IpcMain,
  db: Database,
): void {
  ipcMain.handle(IPC_CHANNELS.EXE_GET_BY_GAME, (_event, gameId: number) => {
    return exeRepo.getByGameId(db, gameId)
  })

  ipcMain.handle(
    IPC_CHANNELS.EXE_ADD,
    (
      _event,
      data: { game_id: number; exe_name: string; install_path_hint?: string },
    ) => {
      return exeRepo.add(db, data)
    },
  )

  ipcMain.handle(IPC_CHANNELS.EXE_REMOVE, (_event, id: number) => {
    exeRepo.remove(db, id)
  })
}
