import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import { IPC_CHANNELS } from '../../shared/ipc'
import {
  getGameCaptureStatus,
  setGameCaptureAccelerator,
  setGameCaptureEnabled,
} from '../services/gameCapture'

export function registerGameCaptureHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle(IPC_CHANNELS.GAME_CAPTURE_GET_STATUS, () => getGameCaptureStatus())
  ipcMain.handle(IPC_CHANNELS.GAME_CAPTURE_SET_ENABLED, (_event, enabled: boolean) => {
    return setGameCaptureEnabled(db, Boolean(enabled))
  })
  ipcMain.handle(IPC_CHANNELS.GAME_CAPTURE_SET_ACCELERATOR, (_event, accelerator: string) => {
    return setGameCaptureAccelerator(db, accelerator)
  })
}
