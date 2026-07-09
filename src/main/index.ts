import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import * as sessionRepo from './db/repositories/sessionRepository'
import { startMonitor, stopMonitor } from './services/processMonitor'
import { startScreenshotWatcher, stopScreenshotWatcher } from './services/screenshotWatcher'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'PlayVault',
    backgroundColor: '#111b24',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.playvault.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database and register IPC handlers
  const db = await initDatabase()
  registerAllIpcHandlers(ipcMain, db)

  // Recover orphaned sessions from previous abnormal exit
  const recovered = sessionRepo.recoverOrphanedSessions(db)
  if (recovered > 0) {
    console.log(`[Main] Recovered ${recovered} orphaned session(s)`)
  }

  // Start process monitor for auto session tracking
  startMonitor(db, 2000)

  // Start screenshot watcher if a source directory is configured
  const screenshotDirRow = db
    .prepare("SELECT value FROM app_settings WHERE key = 'screenshot_dir'")
    .get() as unknown as { value: string } | undefined
  if (screenshotDirRow?.value) {
    startScreenshotWatcher(db, screenshotDirRow.value)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopMonitor()
  stopScreenshotWatcher()
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
