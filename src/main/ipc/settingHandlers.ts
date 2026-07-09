import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import { IPC_CHANNELS } from '../../shared/ipc'
import { startScreenshotWatcher, stopScreenshotWatcher } from '../services/screenshotWatcher'

export function registerSettingHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle(IPC_CHANNELS.SETTING_GET, (_event, key: string) => {
    const row = db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(key) as unknown as { value: string } | undefined
    return row?.value ?? null
  })

  ipcMain.handle(IPC_CHANNELS.SETTING_SET, (_event, key: string, value: string) => {
    const existing = db
      .prepare('SELECT id FROM app_settings WHERE key = ?')
      .get(key) as unknown as { id: number } | undefined
    if (existing) {
      db.prepare('UPDATE app_settings SET value = ? WHERE key = ?').run(value, key)
    } else {
      db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(key, value)
    }

    // If screenshot_dir is updated, restart the watcher
    if (key === 'screenshot_dir') {
      stopScreenshotWatcher()
      if (value) {
        startScreenshotWatcher(db, value)
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTING_GET_ALL, () => {
    const rows = db.prepare('SELECT * FROM app_settings').all() as unknown as Array<{
      id: number
      key: string
      value: string
    }>
    const map: Record<string, string> = {}
    for (const row of rows) {
      map[row.key] = row.value
    }
    return map
  })
}
