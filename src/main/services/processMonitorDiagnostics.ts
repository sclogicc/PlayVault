import fs from 'node:fs'
import path from 'node:path'

export interface ProcessMonitorDiagnostic {
  event: 'monitor_started' | 'poll' | 'poll_error'
  at: string
  gameId?: number
  sessionId?: number | null
  rootPid?: number | null
  livePids?: number[]
  phase?: string
  action?: string
  hitStreak?: number
  missStreak?: number
  error?: string
}

export function formatProcessMonitorDiagnostic(entry: ProcessMonitorDiagnostic): string {
  return JSON.stringify(entry)
}

export function writeProcessMonitorDiagnostic(entry: ProcessMonitorDiagnostic): void {
  try {
    const directory = path.join(process.env.APPDATA ?? process.cwd(), 'playvault')
    fs.mkdirSync(directory, { recursive: true })
    fs.appendFileSync(
      path.join(directory, 'process-monitor.log'),
      `${formatProcessMonitorDiagnostic(entry)}\n`,
      'utf8',
    )
  } catch {
    // Diagnostics must never interrupt game tracking.
  }
}
