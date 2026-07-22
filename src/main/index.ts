import { app, BrowserWindow, shell, ipcMain, protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import * as sessionRepo from './db/repositories/sessionRepository'
import { startMonitor, stopMonitor } from './services/processMonitor'
import { startScreenshotWatcher, stopScreenshotWatcher } from './services/screenshotWatcher'
import { refreshAllInstallStatus } from './services/installChecker'
import { getImageMimeType } from './services/localImage'
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

function isRegisteredMediaPath(db: Database, filePath: string): boolean {
  return Boolean(
    db
      .prepare(
        `SELECT 1 FROM games WHERE cover_path = ?
         UNION ALL
         SELECT 1 FROM screenshots WHERE file_path = ? AND status != 'deleted'
         LIMIT 1`,
      )
      .get(filePath, filePath),
  )
}

function registerLocalMediaProtocol(db: Database): void {
  protocol.handle(LOCAL_MEDIA_PROTOCOL, async (request) => {
    const filePath = parseLocalMediaUrl(request.url)
    const mimeType = filePath ? getImageMimeType(filePath) : null
    if (!filePath || !mimeType || !isRegisteredMediaPath(db, filePath)) {
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
  registerLocalMediaProtocol(db)
  registerAllIpcHandlers(ipcMain, db)

  // Recover orphaned sessions from previous abnormal exit
  const recovered = sessionRepo.recoverOrphanedSessions(db)
  if (recovered > 0) {
    console.log(`[Main] Recovered ${recovered} orphaned session(s)`)
  }

  // Refresh install status for all games
  refreshAllInstallStatus(db)

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
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
