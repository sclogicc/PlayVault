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
import { IPC_CHANNELS } from '../shared/ipc'
import type { Database } from './db/sqljs-wrapper'

const WINDOW_STATE_KEY = 'window_presentation_v1'
const DEFAULT_WINDOW_BOUNDS = { width: 1280, height: 820 }
const MIN_WINDOW_BOUNDS = { width: 960, height: 640 }

interface WindowPresentationState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

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

function readWindowPresentation(db: Database): WindowPresentationState | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(WINDOW_STATE_KEY) as { value?: string } | undefined
  if (!row?.value) return null
  try {
    const parsed = JSON.parse(row.value) as WindowPresentationState
    if (!Number.isFinite(parsed.width) || !Number.isFinite(parsed.height)) return null
    if (parsed.width < MIN_WINDOW_BOUNDS.width || parsed.height < MIN_WINDOW_BOUNDS.height) return null
    return parsed
  } catch {
    return null
  }
}

function persistWindowPresentation(db: Database, mainWindow: BrowserWindow): void {
  if (is.dev || mainWindow.isDestroyed()) return
  const bounds = mainWindow.getNormalBounds()
  const state: WindowPresentationState = {
    ...bounds,
    isMaximized: mainWindow.isMaximized(),
  }
  db.prepare(`INSERT INTO app_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(WINDOW_STATE_KEY, JSON.stringify(state))
}

function createWindow(db: Database): void {
  const savedState = readWindowPresentation(db)
  const mainWindow = new BrowserWindow({
    width: savedState?.width ?? DEFAULT_WINDOW_BOUNDS.width,
    height: savedState?.height ?? DEFAULT_WINDOW_BOUNDS.height,
    x: savedState?.x,
    y: savedState?.y,
    minWidth: MIN_WINDOW_BOUNDS.width,
    minHeight: MIN_WINDOW_BOUNDS.height,
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
    if (!savedState || savedState.isMaximized) mainWindow.maximize()
    mainWindow.show()
  })

  // The user controls the persisted size in stable mode; dev windows stay isolated from that preference.
  mainWindow.on('close', () => persistWindowPresentation(db, mainWindow))

  const publishImmersiveState = (immersive: boolean): void => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(IPC_CHANNELS.WINDOW_IMMERSIVE_CHANGED, immersive)
  }
  mainWindow.on('enter-full-screen', () => publishImmersiveState(true))
  mainWindow.on('leave-full-screen', () => publishImmersiveState(false))
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isF11 = input.type === 'keyDown' && input.key === 'F11'
    const exitsImmersive = input.type === 'keyDown' && input.key === 'Escape' && mainWindow.isFullScreen()
    if (isF11 || exitsImmersive) {
      event.preventDefault()
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  })

  ipcMain.removeHandler(IPC_CHANNELS.WINDOW_GET_IMMERSIVE)
  ipcMain.removeHandler(IPC_CHANNELS.WINDOW_TOGGLE_IMMERSIVE)
  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_IMMERSIVE, () => mainWindow.isFullScreen())
  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_IMMERSIVE, () => {
    const next = !mainWindow.isFullScreen()
    mainWindow.setFullScreen(next)
    return next
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

  createWindow(db)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(db)
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
