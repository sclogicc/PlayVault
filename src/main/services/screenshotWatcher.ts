import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
import type { Database } from '../db/sqljs-wrapper'
import * as screenshotRepo from '../db/repositories/screenshotRepository'
import * as sessionRepo from '../db/repositories/sessionRepository'
import { getPlayVaultLaunchSessionMatch } from './screenshotSessionMatcher'

let watcher: chokidar.FSWatcher | null = null

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp']

/**
 * Extract capture timestamp from a screenshot file.
 * For NVIDIA screenshots, the file modification time is typically the capture time.
 * For other sources, falls back to file creation or modification time.
 */
function extractCapturedAt(filePath: string): string {
  try {
    const stat = fs.statSync(filePath)
    // Use modification time as capture time
    // Store full ISO 8601 so browser can parse as UTC and display in local time
    return stat.mtime.toISOString()
  } catch {
    return new Date().toISOString().replace('T', ' ').slice(0, 19)
  }
}

/**
 * Compute a simple hash for deduplication (file size + mtime).
 */
function computeHash(filePath: string): string {
  try {
    const stat = fs.statSync(filePath)
    return `${stat.size}-${stat.mtimeMs}`
  } catch {
    return ''
  }
}

/**
 * Process one external screenshot file. The file enters PlayVault only when it
 * was observed while one PlayVault-launched game session is still verified.
 * This intentionally prefers a missed image over polluting another game's archive.
 */
function processScreenshot(
  db: Database,
  filePath: string,
  sourceDir: string,
): void {
  const match = getPlayVaultLaunchSessionMatch(sessionRepo.getVerifiedActiveSessions(db))
  if (!match) {
    console.log('[ScreenshotWatcher] Ignored: no unique PlayVault-launched game session')
    return
  }

  const fileName = path.basename(filePath)
  const capturedAt = extractCapturedAt(filePath)
  const hash = computeHash(filePath)

  // Check for duplicate (including deleted — don't re-import)
  const existing = db
    .prepare('SELECT id, status FROM screenshots WHERE hash = ?')
    .get(hash) as unknown as { id: number; status: string } | undefined
  
  // If it exists, even if it's 'deleted', we don't re-import it.
  if (existing) return

  // Only trusted launch-session captures are persisted; unrelated desktop or manually launched-game images never enter the inbox.
  const result = screenshotRepo.create(db, {
    file_path: filePath,
    file_name: fileName,
    captured_at: capturedAt,
    status: 'classified',
    source_directory: sourceDir,
    hash,
  })

  screenshotRepo.updateStatus(
    db,
    result.lastInsertRowid,
    'classified',
    match.game_id,
    match.session_id,
  )
}

/**
 * Start watching a screenshot source directory with chokidar.
 * Watches new image files only. Historical screenshots are intentionally ignored:
 * their original game lifecycle can no longer be proven safely.
 */
export function startScreenshotWatcher(
  db: Database,
  sourceDir: string,
): void {
  if (watcher) {
    stopScreenshotWatcher()
  }

  if (!fs.existsSync(sourceDir)) {
    console.log(`[ScreenshotWatcher] Directory not found: ${sourceDir}`)
    return
  }

  // Watch for future files only (recursively, no depth limit).
  watcher = chokidar.watch(sourceDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  })

  watcher.on('add', (filePath: string) => {
    const ext = path.extname(filePath).toLowerCase()
    if (IMAGE_EXTS.includes(ext)) {
      console.log(`[ScreenshotWatcher] New file: ${filePath}`)
      processScreenshot(db, filePath, sourceDir)
    }
  })

  watcher.on('error', (error: Error) => {
    console.error('[ScreenshotWatcher] Error:', error)
  })

  console.log(`[ScreenshotWatcher] Watching (recursive): ${sourceDir}`)
}

/**
 * Stop the screenshot watcher.
 */
export function stopScreenshotWatcher(): void {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log('[ScreenshotWatcher] Stopped')
  }
}

/**
 * Check if the watcher is currently running.
 */
export function isWatcherRunning(): boolean {
  return watcher !== null
}

/**
 * Historical screenshots are intentionally never guessed from elapsed time.
 * They remain available for explicit user classification.
 */
export function rematchPending(db: Database): number {
  void db
  return 0
}
