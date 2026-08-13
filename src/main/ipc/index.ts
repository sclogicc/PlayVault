import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import { registerGameHandlers } from './gameHandlers'
import { registerExecutableHandlers } from './executableHandlers'
import { registerScanHandlers } from './scanHandlers'
import { registerSessionHandlers } from './sessionHandlers'
import { registerScreenshotHandlers } from './screenshotHandlers'
import { registerSettingHandlers } from './settingHandlers'
import { registerFileHandlers } from './fileHandlers'
import { registerUpdateHandlers } from './updateHandlers'

export function registerAllIpcHandlers(
  ipcMain: IpcMain,
  db: Database,
): void {
  registerGameHandlers(ipcMain, db)
  registerExecutableHandlers(ipcMain, db)
  registerScanHandlers(ipcMain, db)
  registerSessionHandlers(ipcMain, db)
  registerScreenshotHandlers(ipcMain, db)
  registerSettingHandlers(ipcMain, db)
  registerFileHandlers(ipcMain)
  registerUpdateHandlers(ipcMain)
}
