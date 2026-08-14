import { BrowserWindow, desktopCapturer, globalShortcut, Notification, screen } from 'electron'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Database } from '../db/sqljs-wrapper'
import * as screenshotRepo from '../db/repositories/screenshotRepository'
import * as sessionRepo from '../db/repositories/sessionRepository'
import * as settingRepository from '../db/repositories/settingRepository'
import { IPC_CHANNELS } from '../../shared/ipc'
import {
  createGameCaptureStatus,
  DEFAULT_GAME_CAPTURE_ACCELERATOR,
  type GameCaptureStatus,
} from '../../shared/capture'
import { getUniqueActiveSessionMatch } from './screenshotSessionMatcher'
import { getCaptureMediaRoot, toVaultMediaReference } from './vaultManager'

const GAME_CAPTURE_ENABLED_SETTING = 'game_capture_enabled'
const GAME_CAPTURE_ACCELERATOR_SETTING = 'game_capture_accelerator'
const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift'] as const

let activeAccelerator = DEFAULT_GAME_CAPTURE_ACCELERATOR
let registeredAccelerator: string | null = null
let latestStatus = createGameCaptureStatus('disabled', '主动截图尚未初始化。')
let captureInFlight = false

type CaptureStatusDetails = Omit<
  GameCaptureStatus,
  'state' | 'message' | 'accelerator' | 'enabled' | 'updatedAt'
>

function createCaptureStatus(
  state: GameCaptureStatus['state'],
  message: string,
  details: CaptureStatusDetails = {},
): GameCaptureStatus {
  return createGameCaptureStatus(state, message, {
    ...details,
    accelerator: activeAccelerator,
  })
}

function setStatus(status: GameCaptureStatus): GameCaptureStatus {
  latestStatus = status
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.GAME_CAPTURE_STATUS_CHANGED, status)
  }
  return status
}

function notify(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}

function getCaptureEnabled(db: Database): boolean {
  const setting = settingRepository.get(db, GAME_CAPTURE_ENABLED_SETTING)?.value
  return setting !== '0'
}

function normalizeAccelerator(value: string): string | null {
  const rawParts = value
    .trim()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)

  if (rawParts.length < 2) return null

  const modifiers = new Set<string>()
  let key: string | null = null
  for (const part of rawParts) {
    const lower = part.toLowerCase()
    if (lower === 'ctrl' || lower === 'control' || lower === 'cmdorctrl') {
      modifiers.add('Ctrl')
      continue
    }
    if (lower === 'alt' || lower === 'option') {
      modifiers.add('Alt')
      continue
    }
    if (lower === 'shift') {
      modifiers.add('Shift')
      continue
    }
    if (key !== null) return null
    key = part.length === 1 ? part.toUpperCase() : part.toUpperCase()
  }

  if (modifiers.size === 0 || !key) return null
  const isLetterOrNumber = /^[A-Z0-9]$/.test(key)
  const isFunctionKey = /^F([1-9]|1[0-2])$/.test(key)
  if (!isLetterOrNumber && !isFunctionKey) return null

  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join('+')
}

function getConfiguredAccelerator(db: Database): string {
  const stored = settingRepository.get(db, GAME_CAPTURE_ACCELERATOR_SETTING)?.value
  return normalizeAccelerator(stored ?? '') ?? DEFAULT_GAME_CAPTURE_ACCELERATOR
}

function unregisterCaptureShortcut(): void {
  if (registeredAccelerator) {
    globalShortcut.unregister(registeredAccelerator)
    registeredAccelerator = null
  }
}

function registerCaptureShortcut(db: Database, accelerator: string): boolean {
  unregisterCaptureShortcut()
  if (!getCaptureEnabled(db)) return false

  try {
    const registered = globalShortcut.register(accelerator, () => {
      void capturePrimaryDisplay(db)
    })
    if (registered) {
      activeAccelerator = accelerator
      registeredAccelerator = accelerator
    }
    return registered
  } catch {
    return false
  }
}

function formatTimestamp(now: Date): string {
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

async function capturePrimaryDisplay(db: Database): Promise<GameCaptureStatus> {
  if (captureInFlight) {
    return setStatus(createCaptureStatus('blocked', '正在保存上一张截图，请稍候。'))
  }

  const verifiedSessions = sessionRepo.getVerifiedActiveSessions(db)
  const match = getUniqueActiveSessionMatch(verifiedSessions)
  if (!match) {
    const message = verifiedSessions.length === 0
      ? '未检测到正在运行的游戏，会话外截图不会被保存。'
      : '检测到多个游戏会话，无法安全判断截图归属。'
    const status = setStatus(createCaptureStatus('blocked', message))
    notify('PlayVault 截图未保存', message)
    return status
  }

  captureInFlight = true
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const thumbnailSize = {
      width: Math.max(1, Math.round(primaryDisplay.size.width * primaryDisplay.scaleFactor)),
      height: Math.max(1, Math.round(primaryDisplay.size.height * primaryDisplay.scaleFactor)),
    }
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize,
    })
    const source = sources.find((candidate) => candidate.display_id === String(primaryDisplay.id)) ?? sources[0]
    if (!source || source.thumbnail.isEmpty()) {
      throw new Error('无法读取主显示器画面。请检查游戏是否使用独占全屏或受保护内容。')
    }

    const imageBuffer = source.thumbnail.toPNG()
    if (imageBuffer.length === 0) {
      throw new Error('截图图像为空，未保存任何文件。')
    }

    const timestamp = new Date()
    const captureRoot = await getCaptureMediaRoot(db)
    const captureDirectory = path.join(captureRoot, `game-${String(match.game_id).padStart(6, '0')}`)
    const fileName = `capture-${formatTimestamp(timestamp)}.png`
    const outputPath = path.join(captureDirectory, fileName)
    await fs.mkdir(captureDirectory, { recursive: true })
    await fs.writeFile(outputPath, imageBuffer)

    const reference = toVaultMediaReference(db, outputPath)
    const hash = createHash('sha256').update(imageBuffer).digest('hex')
    const result = screenshotRepo.create(db, {
      file_path: reference,
      file_name: fileName,
      captured_at: timestamp.toISOString(),
      status: 'classified',
      source_directory: 'playvault-capture',
      hash,
    })
    screenshotRepo.updateStatus(db, result.lastInsertRowid, 'classified', match.game_id, match.session_id)

    const status = setStatus(createCaptureStatus(
      'captured',
      '截图已无损保存，并直接归入当前游戏会话。',
      {
        screenshotId: result.lastInsertRowid,
        gameId: match.game_id,
        sessionId: match.session_id,
      },
    ))
    notify('PlayVault 已保存截图', '已直接归入当前游戏会话。')
    return status
  } catch (error) {
    const message = error instanceof Error ? error.message : '主动截图时发生未知错误。'
    const status = setStatus(createCaptureStatus('error', message))
    notify('PlayVault 截图失败', message)
    return status
  } finally {
    captureInFlight = false
  }
}

export function startGameCapture(db: Database): GameCaptureStatus {
  const accelerator = getConfiguredAccelerator(db)
  activeAccelerator = accelerator
  unregisterCaptureShortcut()

  if (!getCaptureEnabled(db)) {
    return setStatus(createCaptureStatus('disabled', '主动截图已关闭。'))
  }

  if (!registerCaptureShortcut(db, accelerator)) {
    return setStatus(createCaptureStatus(
      'error',
      `${accelerator} 已被其他程序占用，主动截图未启用。请在设置中更换组合键。`,
    ))
  }

  return setStatus(createCaptureStatus(
    'ready',
    `${accelerator} 已就绪：将无损截取主显示器，并只保存到唯一活动游戏会话。`,
  ))
}

export function stopGameCapture(): void {
  unregisterCaptureShortcut()
}

export function setGameCaptureEnabled(db: Database, enabled: boolean): GameCaptureStatus {
  settingRepository.set(db, GAME_CAPTURE_ENABLED_SETTING, enabled ? '1' : '0')
  return enabled ? startGameCapture(db) : (() => {
    stopGameCapture()
    activeAccelerator = getConfiguredAccelerator(db)
    return setStatus(createCaptureStatus('disabled', '主动截图已关闭。'))
  })()
}

export function setGameCaptureAccelerator(db: Database, requestedAccelerator: string): GameCaptureStatus {
  const nextAccelerator = normalizeAccelerator(requestedAccelerator)
  const previousAccelerator = getConfiguredAccelerator(db)
  activeAccelerator = previousAccelerator

  if (!nextAccelerator) {
    return setStatus(createCaptureStatus(
      'error',
      '快捷键需至少包含 Ctrl、Alt 或 Shift，并搭配一个字母、数字或 F1–F12。',
    ))
  }

  if (nextAccelerator === previousAccelerator) {
    return getCaptureEnabled(db) ? startGameCapture(db) : setStatus(createCaptureStatus('disabled', '主动截图已关闭。'))
  }

  if (!getCaptureEnabled(db)) {
    settingRepository.set(db, GAME_CAPTURE_ACCELERATOR_SETTING, nextAccelerator)
    activeAccelerator = nextAccelerator
    return setStatus(createCaptureStatus('disabled', `已保存快捷键 ${nextAccelerator}；主动截图当前处于关闭状态。`))
  }

  activeAccelerator = nextAccelerator
  if (registerCaptureShortcut(db, nextAccelerator)) {
    settingRepository.set(db, GAME_CAPTURE_ACCELERATOR_SETTING, nextAccelerator)
    return setStatus(createCaptureStatus('ready', `${nextAccelerator} 已就绪：将无损截取主显示器，并只保存到唯一活动游戏会话。`))
  }

  activeAccelerator = previousAccelerator
  registerCaptureShortcut(db, previousAccelerator)
  return setStatus(createCaptureStatus(
    'error',
    `${nextAccelerator} 已被其他程序占用，原快捷键 ${previousAccelerator} 仍可使用。`,
  ))
}

export function getGameCaptureStatus(): GameCaptureStatus {
  return latestStatus
}
