export interface ProcessSnapshot {
  pid: number
  parentPid: number | null
  name: string
  executablePath: string | null
  startedAt: string | null
}

function normalizeWindowsPath(filePath: string): string {
  return filePath.replace(/\//g, '\\').trim().toLowerCase()
}

/** Match only a resolved, full executable path to avoid same-name process collisions. */
export function matchProcessByPath(
  process: ProcessSnapshot,
  executablePath: string,
): boolean {
  return Boolean(
    process.executablePath &&
      normalizeWindowsPath(process.executablePath) === normalizeWindowsPath(executablePath),
  )
}

/**
 * Retain running processes already associated with a Session and discover
 * descendants of the launch root or any known process in its tree.
 */
export function collectLiveProcessTree(
  rootPid: number,
  previouslyTrackedPids: number[],
  processes: ProcessSnapshot[],
): number[] {
  const livePids = new Set(processes.map((process) => process.pid))
  // Keep the root in the lineage even when a launcher has already exited.
  // Its child processes still report that PID as their parent on Windows.
  const tracked = new Set<number>([rootPid])

  for (const pid of previouslyTrackedPids) {
    if (livePids.has(pid)) tracked.add(pid)
  }

  let changed = true
  while (changed) {
    changed = false
    for (const process of processes) {
      if (
        process.parentPid !== null &&
        tracked.has(process.parentPid) &&
        !tracked.has(process.pid)
      ) {
        tracked.add(process.pid)
        changed = true
      }
    }
  }

  return processes
    .filter((process) => tracked.has(process.pid))
    .map((process) => process.pid)
}
