import { shell } from 'electron'
import fs from 'fs'
import type { Database } from '../db/sqljs-wrapper'
import * as exeRepo from '../db/repositories/executableRepository'
import * as gameRepo from '../db/repositories/gameRepository'
import type { GameLaunchResult } from '../../shared/types'

/**
 * Launch a game by its primary executable.
 * Returns success/error result — does not throw.
 */
export function launchGame(
  db: Database,
  gameId: number,
): GameLaunchResult {
  // 1. Get the primary exe
  const primaryExe = exeRepo.getPrimaryExe(db, gameId)

  if (!primaryExe || !primaryExe.file_path) {
    // No primary exe or no file_path configured
    gameRepo.updateInstallStatus(db, gameId, 'missing')
    return { success: false, error: '未配置主可执行文件路径' }
  }

  // 2. Check file exists
  if (!fs.existsSync(primaryExe.file_path)) {
    gameRepo.updateInstallStatus(db, gameId, 'missing')
    return {
      success: false,
      error: '游戏未安装或路径失效',
    }
  }

  // 3. Check it's an .exe file
  try {
    const stat = fs.statSync(primaryExe.file_path)
    if (!stat.isFile()) {
      return { success: false, error: '路径不是有效的可执行文件' }
    }
  } catch {
    gameRepo.updateInstallStatus(db, gameId, 'missing')
    return { success: false, error: '无法访问可执行文件' }
  }

  // 4. Launch via shell.openPath
  shell.openPath(primaryExe.file_path).then((error) => {
    if (error) {
      console.error(`[GameLauncher] Failed to launch: ${error}`)
    }
  })

  // Ensure install status is correct
  gameRepo.updateInstallStatus(db, gameId, 'installed')

  return { success: true }
}
