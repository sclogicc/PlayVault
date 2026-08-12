import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Database } from '../db/sqljs-wrapper'
import type { Game } from '../../shared/types'
import * as gameRepo from '../db/repositories/gameRepository'
import * as screenshotRepo from '../db/repositories/screenshotRepository'

const MAX_ARCHIVE_HIGHLIGHTS = 3

function safeSegment(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 72) || 'game'
}

function extensionOf(filePath: string, fallback: string): string {
  const extension = path.extname(filePath).toLowerCase()
  return extension || fallback
}

async function copyIfAvailable(sourcePath: string, targetPath: string): Promise<string> {
  if (!sourcePath) return ''

  try {
    await fs.access(sourcePath)
    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.copyFile(sourcePath, targetPath)
    return targetPath
  } catch {
    // A missing artwork file must never prevent the game history itself from being archived.
    return ''
  }
}

export interface ArchiveGameResult {
  game: Game
  preservedScreenshotIds: number[]
  skippedScreenshotIds: number[]
}

/**
 * Creates a stable local archive for a game experience. It copies only the
 * display artwork and user-selected highlights; the complete screenshot library
 * remains path-based so that archive storage never grows without user intent.
 */
export async function archiveGameExperience(
  db: Database,
  gameId: number,
  requestedScreenshotIds: number[] = [],
): Promise<ArchiveGameResult> {
  const game = gameRepo.getGameById(db, gameId)
  if (!game) throw new Error('未找到需要封存的游戏')
  if (game.archive_status === 'archived') throw new Error('该游戏已经处于封存状态')

  const selectedIds = Array.from(new Set(requestedScreenshotIds)).slice(0, MAX_ARCHIVE_HIGHLIGHTS)
  const screenshots = screenshotRepo.getByGameId(db, gameId)
  const selectable = new Map(
    screenshots
      .filter((shot) => shot.status === 'classified' && selectedIds.includes(shot.id))
      .map((shot) => [shot.id, shot]),
  )

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const archiveRoot = path.join(
    app.getPath('userData'),
    'archives',
    `${String(game.id).padStart(6, '0')}-${safeSegment(game.display_name)}-${timestamp}`,
  )

  const archiveCoverPath = await copyIfAvailable(
    game.cover_path,
    path.join(archiveRoot, 'media', `cover${extensionOf(game.cover_path, '.jpg')}`),
  )
  const archiveBackgroundPath = await copyIfAvailable(
    game.background_path,
    path.join(archiveRoot, 'media', `background${extensionOf(game.background_path, '.jpg')}`),
  )

  const highlights: Array<{ screenshotId: number; preservedPath: string }> = []
  const skippedScreenshotIds: number[] = []

  for (const screenshotId of selectedIds) {
    const screenshot = selectable.get(screenshotId)
    if (!screenshot) {
      skippedScreenshotIds.push(screenshotId)
      continue
    }

    const preservedPath = await copyIfAvailable(
      screenshot.file_path,
      path.join(
        archiveRoot,
        'highlights',
        `${String(screenshot.id).padStart(4, '0')}${extensionOf(screenshot.file_path, '.png')}`,
      ),
    )

    if (preservedPath) {
      highlights.push({ screenshotId, preservedPath })
    } else {
      skippedScreenshotIds.push(screenshotId)
    }
  }

  gameRepo.archiveGame(db, {
    gameId,
    archiveCoverPath: archiveCoverPath || game.cover_path,
    archiveBackgroundPath: archiveBackgroundPath || game.background_path,
    highlights,
  })

  const archivedGame = gameRepo.getGameById(db, gameId)
  if (!archivedGame) throw new Error('游戏封存后无法读取档案')

  return {
    game: archivedGame,
    preservedScreenshotIds: highlights.map((highlight) => highlight.screenshotId),
    skippedScreenshotIds,
  }
}
