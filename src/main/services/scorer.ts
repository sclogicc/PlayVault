import path from 'path'
import type { ScannedExe } from './scanner'

export interface ScoredExe extends ScannedExe {
  score: number
  match_reasons: string[]
}

// Keywords that heavily suggest this is NOT a game executable
const DOWNGRADE_PATTERNS: Array<{ pattern: RegExp; penalty: number; reason: string }> = [
  { pattern: /uninstall/i, penalty: -40, reason: '安装/卸载程序' },
  { pattern: /unins/i, penalty: -40, reason: '卸载程序' },
  { pattern: /setup/i, penalty: -35, reason: '安装程序' },
  { pattern: /config/i, penalty: -25, reason: '配置工具' },
  { pattern: /updater?/i, penalty: -30, reason: '更新程序' },
  { pattern: /patch/i, penalty: -30, reason: '补丁程序' },
  { pattern: /crash/i, penalty: -30, reason: '崩溃报告' },
  { pattern: /launcher/i, penalty: -20, reason: '启动器' },
  { pattern: /redist/i, penalty: -35, reason: '运行库安装' },
  { pattern: /vcredist/i, penalty: -40, reason: 'VC运行库' },
  { pattern: /dxsetup/i, penalty: -40, reason: 'DirectX安装' },
  { pattern: /dotnet/i, penalty: -40, reason: '.NET安装' },
  { pattern: /cefprocess/i, penalty: -35, reason: 'CEF浏览器进程' },
  { pattern: /debug/i, penalty: -20, reason: '调试工具' },
]

// Positive signals
const UPGRADE_PATTERNS: Array<{ pattern: RegExp | ((exe: ScannedExe) => boolean); bonus: number; reason: string }> = [
  {
    pattern: (exe) => {
      const nameNoExt = path.basename(exe.file_name, '.exe').toLowerCase()
      const folder = exe.folder_name.toLowerCase()
      return nameNoExt === folder || folder.includes(nameNoExt) || nameNoExt.includes(folder)
    },
    bonus: 25,
    reason: '文件名与目录名匹配',
  },
  {
    pattern: (exe) => exe.file_size > 100 * 1024 * 1024,
    bonus: 20,
    reason: '大文件 (>100MB)',
  },
  {
    pattern: (exe) => exe.file_size > 10 * 1024 * 1024,
    bonus: 10,
    reason: '中型文件 (>10MB)',
  },
  {
    pattern: (exe) => /\\bin\\/i.test(exe.file_path) || /\/bin\//i.test(exe.file_path),
    bonus: 10,
    reason: '位于 bin 目录',
  },
]

/**
 * Score a list of scanned executables and sort by score descending.
 * Base score is 50; downgrades subtract, upgrades add.
 * Score is clamped to [0, 100].
 */
export function scoreCandidates(exes: ScannedExe[]): ScoredExe[] {
  return exes
    .map((exe) => {
      let score = 50
      const match_reasons: string[] = []

      // Apply downgrades
      const exeName = exe.file_name
      for (const { pattern, penalty, reason } of DOWNGRADE_PATTERNS) {
        if (pattern instanceof RegExp && pattern.test(exeName)) {
          score += penalty
          if (penalty <= -30) {
            match_reasons.push(`⚠ ${reason}`)
          }
        }
      }

      // Apply upgrades
      for (const { pattern, bonus, reason } of UPGRADE_PATTERNS) {
        let matches = false
        if (pattern instanceof RegExp) {
          matches = pattern.test(exe.file_path)
        } else if (typeof pattern === 'function') {
          matches = pattern(exe)
        }
        if (matches) {
          score += bonus
          match_reasons.push(`✓ ${reason}`)
        }
      }

      // If nothing matched (no reasons), note it
      if (match_reasons.length === 0) {
        match_reasons.push('常规可执行文件')
      }

      score = Math.max(0, Math.min(100, score))

      return {
        ...exe,
        score,
        match_reasons,
      }
    })
    .sort((a, b) => b.score - a.score)
}
