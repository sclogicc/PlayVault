import { BrowserWindow, desktopCapturer, globalShortcut, Notification, screen } from 'electron'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Database } from '../db/sqljs-wrapper'
import * as screenshotRepo from '../db/repositories/screenshotRepository'
import * as sessionRepo from '../db/repositories/sessionRepository'
import * as settingRepository from '../db/repositories/settingRepository'
import { IPC_CHANNELS } from '../../shared/ipc'
import { createGameCaptureStatus, type GameCaptureStatus } from '../../shared/capture'
import { getUniqueActiveSessionMatch } from './screenshotSessionMatcher'
import { getCaptureMediaRoot, toVaultMediaReference } from './vaultManager'

const GAME_CAPTURE_ENABLED_SETTING = 'game_capture_enabled'
const GAME_CAPTURE_ACCELERATOR = 'F12'

let latestStatus = createGameCaptureStatus('disabled', '主动截图尚未初始化。')
let captureInFlight = false

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

function formatTimestamp(now: Date): string {
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

async function capturePrimaryDisplay(db: Database): Promise<GameCaptureStatus> {
  if (captureInFlight) {
    return setStatus(createGameCaptureStatus('blocked', '正在保存上一张截图，请稍候。'))
  }

  const match = getUniqueActiveSessionMatch(sessionRepo.getVerifiedActiveSessions(db))
  if (!match) {
    const activeCount = sessionRepo.getVerifiedActiveSessions(db).length
    const message = activeCount === 0
      ? '未检测到正在运行的游戏，会话外截图不会被保存。'
      : '检测到多个游戏会话，无法安全判断截图归属。'
    const status = setStatus(createGameCaptureStatus('blocked', message))
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

    const status = setStatus(createGameCaptureStatus(
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
    const status = setStatus(createGameCaptureStatus('error', message))
    notify('PlayVault 截图失败', message)
    return status
  } finally {
    captureInFlight = false
  }
}

export function startGameCapture(db: Database): GameCaptureStatus {
  globalShortcut.unregister(GAME_CAPTURE_ACCELERATOR)
  if (!getCaptureEnabled(db)) {
    return setStatus(createGameCaptureStatus('disabled', '主动截图已关闭。'))
  }

  const registered = globalShortcut.register(GAME_CAPTURE_ACCELERATOR, () => {
    void capturePrimaryDisplay(db)
  })
  if (!registered) {
    return setStatus(createGameCaptureStatus(
      'error',
      'F12 已被其他程序占用，主动截图未启用。请关闭冲突程序后重启 PlayVault。',
    ))
  }

  return setStatus(createGameCaptureStatus(
    'ready',
    'F12 已就绪：将无损截取主显示器，并只保存到唯一活动游戏会话。',
  ))
}

export function stopGameCapture(): void {
  globalShortcut.unregister(GAME_CAPTURE_ACCELERATOR)
}

export function setGameCaptureEnabled(db: Database, enabled: boolean): GameCaptureStatus {
  settingRepository.set(db, GAME_CAPTURE_ENABLED_SETTING, enabled ? '1' : '0')
  return enabled ? startGameCapture(db) : (() => {
    stopGameCapture()
    return setStatus(createGameCaptureStatus('disabled', '主动截图已关闭。'))
  })()
}

export function getGameCaptureStatus(): GameCaptureStatus {
  return latestStatus
}
