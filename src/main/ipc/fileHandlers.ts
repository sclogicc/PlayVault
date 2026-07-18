import { dialog, shell } from 'electron'
import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'

export function registerFileHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(
    IPC_CHANNELS.FILE_OPEN_LOCATION,
    (_event, filePath: string) => {
      shell.showItemInFolder(filePath)
    },
  )

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_EXECUTABLE, async () => {
    const result = await dialog.showOpenDialog({
      title: "Select game executable",
      properties: ['openFile'],
      filters: [{ name: "Executable files", extensions: ["exe"] }],
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
