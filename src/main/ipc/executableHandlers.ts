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
      data: {
        game_id: number
        exe_name: string
        install_path_hint?: string
        file_path?: string
        is_primary?: number
      },
    ) => {
      return exeRepo.add(db, data)
    },
  )

  ipcMain.handle(IPC_CHANNELS.EXE_REMOVE, (_event, id: number) => {
    exeRepo.remove(db, id)
  })

  // New: update executable
  ipcMain.handle(
    IPC_CHANNELS.EXE_UPDATE,
    (
      _event,
      id: number,
      data: {
        exe_name?: string
        file_path?: string
        install_path_hint?: string
        is_primary?: number
        is_ignored?: number
      },
    ) => {
      exeRepo.update(db, id, data)
    },
  )
}
