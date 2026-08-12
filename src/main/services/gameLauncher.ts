import { shell } from 'electron'
import { spawn } from 'node:child_process'
import fs from 'fs'
import type { Database } from '../db/sqljs-wrapper'
import * as exeRepo from '../db/repositories/executableRepository'
import * as gameRepo from '../db/repositories/gameRepository'
import type { GameLaunchResult } from '../../shared/types'
import { trackLaunchedProcess } from './processMonitor'
import { toLocalDateTime } from '../../shared/localDateTime'
import { createGameSpawnOptions } from './gameLaunchOptions'

/**
 * Launch a game by its primary executable.
 * Returns success/error result — does not throw.
 */
export function launchGame(
  db: Database,
  gameId: number,
): GameLaunchResult {
  // 1. Archived experiences are intentionally read-only after local files are cleaned.
  const game = gameRepo.getGameById(db, gameId)
  if (!game) return { success: false, error: '游戏档案不存在' }
  if (game.archive_status === 'archived') {
    return { success: false, error: '该游戏已封存，仅保留历史档案，无法启动' }
  }

  // 2. Get the primary exe
  const primaryExe = exeRepo.getPrimaryExe(db, gameId)

  if (!primaryExe || !primaryExe.file_path) {
    // No primary exe or no file_path configured
    gameRepo.updateInstallStatus(db, gameId, 'missing')
    return { success: false, error: '未配置主可执行文件路径' }
  }

  // 3. Check file exists
  if (!fs.existsSync(primaryExe.file_path)) {
    gameRepo.updateInstallStatus(db, gameId, 'missing')
    return {
      success: false,
      error: '游戏未安装或路径失效',
    }
  }

  // 4. Check it's an .exe file
  try {
    const stat = fs.statSync(primaryExe.file_path)
    if (!stat.isFile()) {
      return { success: false, error: '路径不是有效的可执行文件' }
    }
  } catch {
    gameRepo.updateInstallStatus(db, gameId, 'missing')
    return { success: false, error: '无法访问可执行文件' }
  }

  // Start directly so PlayVault receives the root PID for process-tree tracking.
  try {
    const child = spawn(primaryExe.file_path, [], createGameSpawnOptions(primaryExe.file_path))
    child.unref()
    gameRepo.updateInstallStatus(db, gameId, 'installed')
    trackLaunchedProcess(
      db,
      gameId,
      child.pid,
      primaryExe.file_path,
      toLocalDateTime(),
      child,
    )
    return { success: true, pid: child.pid, filePath: primaryExe.file_path }
  } catch (error) {
    // Preserve a compatibility fallback for uncommon executables that require ShellExecute.
    void shell.openPath(primaryExe.file_path).then((shellError) => {
      if (shellError) console.error(`[GameLauncher] Failed to launch: ${shellError}`)
    })
    console.warn(`[GameLauncher] Direct launch fell back to shell: ${String(error)}`)
    gameRepo.updateInstallStatus(db, gameId, 'installed')
    return { success: true, filePath: primaryExe.file_path }
  }
}
