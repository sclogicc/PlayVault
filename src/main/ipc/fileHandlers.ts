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
      title: "选择游戏可执行文件",
      properties: ['openFile'],
      filters: [{ name: "可执行文件", extensions: ["exe"] }],
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_IMAGE, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择游戏封面图片',
      properties: ['openFile'],
      filters: [
        {
          name: '图片文件',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'],
        },
      ],
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
}
