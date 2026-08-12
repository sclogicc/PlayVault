import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ProcessSnapshot } from './processTracking'

const execFileAsync = promisify(execFile)

type ListedProcess = { name: string; pid: number; ppid: number }
type ProcessList = (options?: { all?: boolean }) => Promise<ListedProcess[]>

let psList: ProcessList | null = null

async function getPsList(): Promise<ProcessList> {
  if (!psList) {
    const module = await import('ps-list')
    psList = module.default
  }
  return psList
}

type CimProcess = {
  ProcessId?: number
  ParentProcessId?: number
  ExecutablePath?: string
  CreationDate?: string
}

/** Build a UTF-8 PowerShell query so non-ASCII Windows paths survive the Node boundary. */
export function buildCimDetailsScript(pids: number[]): string {
  const filter = pids.map((pid) => `ProcessId = ${pid}`).join(' OR ')
  return [
    '$utf8 = [System.Text.UTF8Encoding]::new($false);',
    '[Console]::OutputEncoding = $utf8;',
    '$OutputEncoding = $utf8;',
    `Get-CimInstance -ClassName Win32_Process -Filter '${filter}' |`,
    'Select-Object ProcessId, ParentProcessId, ExecutablePath, CreationDate |',
    'ConvertTo-Json -Compress',
  ].join(' ')
}

async function getCimDetails(pids: number[]): Promise<Map<number, CimProcess>> {
  if (pids.length === 0 || process.platform !== 'win32') return new Map()

  const uniquePids = [...new Set(pids)].filter((pid) => Number.isInteger(pid) && pid > 0)
  if (uniquePids.length === 0) return new Map()

  const script = buildCimDetailsScript(uniquePids)

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
    )
    if (!stdout.trim()) return new Map()
    const parsed = JSON.parse(stdout) as CimProcess | CimProcess[]
    const rows = Array.isArray(parsed) ? parsed : [parsed]
    return new Map(
      rows
        .filter((row): row is CimProcess & { ProcessId: number } => Number.isInteger(row.ProcessId))
        .map((row) => [row.ProcessId, row]),
    )
  } catch {
    return new Map()
  }
}

/**
 * Lists all processes while resolving full paths only for candidate names and
 * already tracked PIDs. This avoids a costly full WMI process scan every poll.
 */
export async function inspectProcesses(
  candidateExeNames: Set<string>,
  trackedPids: number[] = [],
): Promise<ProcessSnapshot[]> {
  const list = await getPsList()
  const processes = await list({ all: true })
  const pathLookupPids = processes
    .filter((process) => candidateExeNames.has(process.name.toLowerCase()))
    .map((process) => process.pid)
    .concat(trackedPids)
  const details = await getCimDetails(pathLookupPids)

  return processes.map((process) => {
    const detail = details.get(process.pid)
    return {
      pid: process.pid,
      parentPid: detail?.ParentProcessId ?? process.ppid ?? null,
      name: process.name,
      executablePath: detail?.ExecutablePath ?? null,
      startedAt: detail?.CreationDate ?? null,
    }
  })
}
