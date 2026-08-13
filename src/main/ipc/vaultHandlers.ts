import { dialog } from 'electron'
import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import { IPC_CHANNELS } from '../../shared/ipc'
import { getVaultHealthReport, getVaultLocation, relocateVault } from '../services/vaultManager'

export function registerVaultHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_LOCATION, () => getVaultLocation(db))

  ipcMain.handle(IPC_CHANNELS.VAULT_GET_HEALTH, async () => getVaultHealthReport(db))

  ipcMain.handle(IPC_CHANNELS.VAULT_RELOCATE, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择新的 PlayVault 档案库位置',
      properties: ['openDirectory', 'createDirectory'],
      message: '将在所选目录中创建“PlayVault Vault”文件夹，并复制当前封存档案。',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return relocateVault(db, result.filePaths[0])
  })
}
