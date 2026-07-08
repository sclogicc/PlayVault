import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import { registerGameHandlers } from './gameHandlers'
import { registerExecutableHandlers } from './executableHandlers'

export function registerAllIpcHandlers(
  ipcMain: IpcMain,
  db: Database,
): void {
  registerGameHandlers(ipcMain, db)
  registerExecutableHandlers(ipcMain, db)
}
