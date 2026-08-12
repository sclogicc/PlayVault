import path from 'node:path'

export function createGameSpawnOptions(executablePath: string) {
  return {
    cwd: path.dirname(executablePath),
    detached: true as const,
    stdio: 'ignore' as const,
    windowsHide: false,
  }
}
