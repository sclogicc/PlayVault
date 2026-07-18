import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
import type { Database } from '../db/sqljs-wrapper'
import * as screenshotRepo from '../db/repositories/screenshotRepository'

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
 * Auto-match a screenshot to a game session based on capture time.
 * Returns { game_id, session_id } if a single session matches, or null otherwise.
 */
function matchScreenshot(
  db: Database,
  capturedAt: string,
): { game_id: number; session_id: number } | null {
  // Find all sessions that overlap with the captured_at time
  const sessions = db
    .prepare(
      `SELECT s.*, g.display_name as game_display_name
       FROM sessions s
       LEFT JOIN games g ON g.id = s.game_id
       WHERE s.started_at <= ?
         AND (s.ended_at >= ? OR s.ended_at IS NULL)
       ORDER BY s.started_at DESC`,
    )
    .all(capturedAt, capturedAt) as unknown as Array<{
      id: number
      game_id: number
      session_id?: number
    }>

  if (sessions.length === 0) return null
  if (sessions.length === 1) {
    return { game_id: sessions[0].game_id, session_id: sessions[0].id }
  }

  // Multiple sessions — check if they all belong to the same game
  const gameIds = new Set(sessions.map((s) => s.game_id))
  if (gameIds.size === 1) {
    // All same game — pick the most recent session
    return {
      game_id: sessions[0].game_id,
      session_id: sessions[0].id,
    }
  }

  // Multiple games — can't auto-classify
  return null
}

/**
 * Process a single new screenshot file: ingest into DB and attempt auto-matching.
 */
function processScreenshot(
  db: Database,
  filePath: string,
  sourceDir: string,
): void {
  const fileName = path.basename(filePath)
  const capturedAt = extractCapturedAt(filePath)
  const hash = computeHash(filePath)

  // Check for duplicate (including deleted — don't re-import)
  const existing = db
    .prepare('SELECT id, status FROM screenshots WHERE hash = ?')
    .get(hash) as unknown as { id: number; status: string } | undefined
  if (existing) return

  // Insert as pending
  const result = screenshotRepo.create(db, {
    file_path: filePath,
    file_name: fileName,
    captured_at: capturedAt,
    status: 'pending',
    source_directory: sourceDir,
    hash,
  })

  // Attempt auto-match
  const match = matchScreenshot(db, capturedAt)
  if (match) {
    screenshotRepo.updateStatus(
      db,
      result.lastInsertRowid,
      'classified',
      match.game_id,
      match.session_id,
    )
  }
}

/**
 * Start watching a screenshot source directory with chokidar.
 * Recursively scans subdirectories for image files.
 * New files are ingested and auto-matched.
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

  // Initial scan — recursively walk subdirectories for existing images
  try {
    const walkDir = (dir: string): void => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walkDir(fullPath)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (IMAGE_EXTS.includes(ext)) {
              processScreenshot(db, fullPath, sourceDir)
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }
    walkDir(sourceDir)
  } catch {
    // Skip if we can't read the root directory
  }

  // Watch for new files (recursively, no depth limit)
  watcher = chokidar.watch(sourceDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // already handled above
    awaitWriteFinish: {
      stabilityThreshold: 2000, // wait 2s after last write before processing
      pollInterval: 500,
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
 * Re-process all pending screenshots for matching.
 * Useful when new sessions are created or settings change.
 */
export function rematchPending(db: Database): number {
  const pending = screenshotRepo.getByStatus(db, 'pending')
  let matched = 0

  for (const shot of pending) {
    const match = matchScreenshot(db, shot.captured_at)
    if (match) {
      screenshotRepo.updateStatus(
        db,
        shot.id,
        'classified',
        match.game_id,
        match.session_id,
      )
      matched++
    }
  }

  return matched
}
