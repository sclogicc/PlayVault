import fs from 'fs'
import path from 'path'

export interface ScannedExe {
  file_path: string
  file_name: string
  folder_name: string
  file_size: number
  modified_at: string | null
}

/**
 * Recursively scan a root directory for .exe files up to maxDepth levels.
 * Excludes .lnk and .bat files.
 */
export function scanDirectory(
  rootPath: string,
  maxDepth: number = 3,
): ScannedExe[] {
  const results: ScannedExe[] = []

  if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    return results
  }

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      // Skip directories we can't read (permissions, etc.)
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // Skip common non-game directories
        const skipDirs = [
          'windows', 'Windows', 'Program Files', 'Program Files (x86)',
          'ProgramData', '$Recycle.Bin', 'System Volume Information',
        ]
        if (skipDirs.includes(entry.name)) continue
        walk(fullPath, depth + 1)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        // Only process .exe files, skip .lnk and .bat
        if (ext !== '.exe') continue

        const nameLower = entry.name.toLowerCase()
        // Skip known non-game executables
        if (nameLower === 'unins000.exe' || nameLower === 'uninst.exe') continue

        let stat: fs.Stats
        try {
          stat = fs.statSync(fullPath)
        } catch {
          continue
        }

        results.push({
          file_path: fullPath,
          file_name: entry.name,
          folder_name: path.basename(dir),
          file_size: stat.size,
          modified_at: stat.mtime.toISOString().replace('T', ' ').slice(0, 19),
        })
      }
    }
  }

  walk(rootPath, 1)
  return results
}
