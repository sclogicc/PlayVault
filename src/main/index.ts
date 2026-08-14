import { app, BrowserWindow, shell, ipcMain, protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import { resumeOrCloseTrackedSessions, startMonitor, stopMonitor } from './services/processMonitor'
import { startScreenshotWatcher, stopScreenshotWatcher } from './services/screenshotWatcher'
import { refreshAllInstallStatus } from './services/installChecker'
import { getImageMimeType } from './services/localImage'
import { resolveRegisteredMediaPath } from './services/mediaRegistry'
import { initializeVault } from './services/vaultManager'
import { startGameCapture, stopGameCapture } from './services/gameCapture'
import { LOCAL_MEDIA_PROTOCOL, parseLocalMediaUrl } from '../shared/localMedia'
import type { Database } from './db/sqljs-wrapper'

protocol.registerSchemesAsPrivileged([
  {
    scheme: LOCAL_MEDIA_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
])

function registerLocalMediaProtocol(db: Database): void {
  protocol.handle(LOCAL_MEDIA_PROTOCOL, async (request) => {
    const mediaReference = parseLocalMediaUrl(request.url)
    const filePath = mediaReference ? resolveRegisteredMediaPath(db, mediaReference) : null
    const mimeType = filePath ? getImageMimeType(filePath) : null
    if (!filePath || !mimeType) {
      return new Response(null, { status: 400 })
    }

    try {
      const file = await readFile(filePath)
      return new Response(file, {
        headers: { 'Content-Type': mimeType },
      })
    } catch {
      return new Response(null, { status: 404 })
    }
  })
}

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
  await initializeVault(db)
  registerLocalMediaProtocol(db)
  registerAllIpcHandlers(ipcMain, db)

  // Resume games that are still alive, otherwise close at their last verified heartbeat.
  const resumed = await resumeOrCloseTrackedSessions(db)
  if (resumed > 0) {
    console.log(`[Main] Resumed ${resumed} active session(s)`)
  }

  // Refresh install status for all games
  refreshAllInstallStatus(db)

  // Start process monitor for auto session tracking
  startMonitor(db, 2000)

  // Start PlayVault's own F12 game capture after all session services are ready.
  startGameCapture(db)

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
}).catch((err) => {
  console.error('[Main] Fatal error during startup:', err)
  // Show error dialog to user since there's no window yet
  const { dialog } = require('electron')
  dialog.showErrorBox('启动失败', `PlayVault 启动时发生致命错误:\n${err?.message ?? String(err)}`)
  app.quit()
})

app.on('window-all-closed', () => {
  stopMonitor()
  stopScreenshotWatcher()
  stopGameCapture()
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
