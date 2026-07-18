import fs from 'fs'
import type { Database } from '../db/sqljs-wrapper'
import type { InstallStatus } from '../../shared/constants'
import * as gameRepo from '../db/repositories/gameRepository'
import * as exeRepo from '../db/repositories/executableRepository'

/**
 * Check install status for a single game.
 * Returns 'installed' if the primary exe file_path exists, otherwise 'missing'.
 */
export function checkInstallStatus(
  db: Database,
  gameId: number,
): InstallStatus {
  const primaryExe = exeRepo.getPrimaryExe(db, gameId)

  if (!primaryExe || !primaryExe.file_path) {
    return 'missing'
  }

  try {
    if (fs.existsSync(primaryExe.file_path)) {
      return 'installed'
    }
  } catch {
    // Permission error or other file access issue
  }

  return 'missing'
}

/**
 * Refresh install status for all games.
 * Called on app startup to sync with filesystem reality.
 */
export function refreshAllInstallStatus(db: Database): void {
  const games = gameRepo.getAllGames(db)
  for (const game of games) {
    const actual = checkInstallStatus(db, game.id)
    if ((game as unknown as { install_status?: string }).install_status !== actual) {
      gameRepo.updateInstallStatus(db, game.id, actual)
    }
  }
  console.log(
    `[InstallChecker] Checked install status for ${games.length} game(s)`,
  )
}
