import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import { checkForUpdates, getUpdateStatus, triggerUpdate } from '../services/autoUpdater'

export function registerUpdateHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.UPDATE_GET_STATUS, () => getUpdateStatus())
  ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, () => checkForUpdates())
  ipcMain.handle(IPC_CHANNELS.UPDATE_TRIGGER, () => triggerUpdate())
}
