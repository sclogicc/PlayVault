import { app, BrowserWindow } from 'electron'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { IPC_CHANNELS } from '../../shared/ipc'
import { createUpdateStatus, type UpdateStatus } from '../../shared/update'

const REMOTE_NAME = 'origin'
const REMOTE_BRANCH = 'main'
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const COMMAND_OUTPUT_LIMIT = 12_000
const DEPENDENCY_MANIFEST_FILES = ['package.json', 'package-lock.json'] as const

let latestStatus = createUpdateStatus('idle', '尚未检查更新')
let activeUpdate: Promise<UpdateStatus> | null = null

interface CommandResult {
  stdout: string
  stderr: string
}

class CommandError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly output: string,
  ) {
    super(message)
  }
}

function setStatus(status: UpdateStatus): UpdateStatus {
  latestStatus = status
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.UPDATE_STATUS_CHANGED, status)
  }
  return status
}

function trimCommandOutput(output: string): string {
  const normalized = output.trim()
  return normalized.length > COMMAND_OUTPUT_LIMIT
    ? `${normalized.slice(-COMMAND_OUTPUT_LIMIT)}\n…（输出已截断）`
    : normalized
}

function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      // Windows 的 npm.cmd 需要经命令解释器启动；参数均为内部固定值，不接受渲染层输入。
      shell: process.platform === 'win32' && command.toLowerCase().endsWith('.cmd'),
    })

    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout = trimCommandOutput(`${stdout}${chunk.toString()}`)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = trimCommandOutput(`${stderr}${chunk.toString()}`)
    })
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        reject(new CommandError(`未找到命令：${command}`, command, '请确认 Git 与 Node.js 已安装并已加入系统 PATH。'))
        return
      }
      reject(new CommandError(`无法启动命令：${command}`, command, error.message))
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: trimCommandOutput(stdout), stderr: trimCommandOutput(stderr) })
        return
      }
      const output = trimCommandOutput([stderr, stdout].filter(Boolean).join('\n'))
      reject(new CommandError(`命令执行失败：${command} ${args.join(' ')}`, command, output))
    })
  })
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function getRepositoryPath(): Promise<string | null> {
  if (app.isPackaged) return null

  const appPath = app.getAppPath()
  if (await pathExists(join(appPath, '.git'))) return appPath

  const workingDirectory = process.cwd()
  return (await pathExists(join(workingDirectory, '.git'))) ? workingDirectory : null
}

async function getRevision(repositoryPath: string, ref: string): Promise<string> {
  const { stdout } = await runCommand('git', ['rev-parse', '--short', ref], repositoryPath)
  return stdout.trim()
}

async function getUpdateBlockingWorktreeChanges(repositoryPath: string): Promise<string[]> {
  const { stdout } = await runCommand('git', ['status', '--porcelain=v1'], repositoryPath)
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    // Untracked files such as personal notes or recovery backups never participate
    // in `git pull --ff-only`, so they must not block normal application updates.
    .filter((line) => !line.startsWith('?? '))
    .map((line) => line.slice(3).trim())
}

async function isAncestor(repositoryPath: string, ancestor: string, descendant: string): Promise<boolean> {
  try {
    await runCommand('git', ['merge-base', '--is-ancestor', ancestor, descendant], repositoryPath)
    return true
  } catch (error) {
    if (error instanceof CommandError && error.command === 'git') return false
    throw error
  }
}

async function hasDependencyManifestChanges(repositoryPath: string, baseRevision: string): Promise<boolean> {
  const { stdout } = await runCommand(
    'git',
    ['diff', '--name-only', baseRevision, 'HEAD', '--', ...DEPENDENCY_MANIFEST_FILES],
    repositoryPath,
  )
  return stdout.split(/\r?\n/).some(Boolean)
}

function formatCommandReason(error: unknown): string {
  if (error instanceof CommandError) {
    return error.output || error.message
  }
  return error instanceof Error ? error.message : String(error)
}

async function inspectRepository(fetchRemote: boolean): Promise<UpdateStatus> {
  const repositoryPath = await getRepositoryPath()
  if (!repositoryPath) {
    return setStatus(createUpdateStatus(
      'unsupported',
      '当前运行方式不支持源代码更新，请使用项目源码目录启动 PlayVault。',
    ))
  }

  try {
    const currentRevision = await getRevision(repositoryPath, 'HEAD')
    const blockingChanges = await getUpdateBlockingWorktreeChanges(repositoryPath)
    if (blockingChanges.length > 0) {
      return setStatus(createUpdateStatus(
        'blocked',
        `检测到 ${blockingChanges.length} 项本地源码修改。为防止覆盖代码，更新已暂停；游戏记录、游玩留档、截图和未跟踪备份文件不会影响更新。`,
        { currentRevision, repositoryPath },
      ))
    }

    if (fetchRemote) {
      await runCommand('git', ['fetch', '--quiet', REMOTE_NAME, REMOTE_BRANCH], repositoryPath)
    }

    const remoteRef = `${REMOTE_NAME}/${REMOTE_BRANCH}`
    const remoteRevision = await getRevision(repositoryPath, remoteRef)
    if (currentRevision === remoteRevision) {
      return setStatus(createUpdateStatus(
        'up_to_date',
        '当前已是最新版本。',
        { currentRevision, remoteRevision, repositoryPath },
      ))
    }

    if (await isAncestor(repositoryPath, 'HEAD', remoteRef)) {
      return setStatus(createUpdateStatus(
        'available',
        '发现新版本，可在重启前完成安全更新。',
        { currentRevision, remoteRevision, repositoryPath },
      ))
    }

    return setStatus(createUpdateStatus(
      'blocked',
      '本地分支包含未同步的提交。为保护本地历史，更新已暂停。',
      { currentRevision, remoteRevision, repositoryPath },
    ))
  } catch (error) {
    return setStatus(createUpdateStatus(
      'error',
      `无法检查更新：${formatCommandReason(error)}`,
      { repositoryPath },
    ))
  }
}

export function getUpdateStatus(): UpdateStatus {
  return latestStatus
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (activeUpdate) return latestStatus
  setStatus(createUpdateStatus('checking', '正在检查 GitHub 上的新版本…'))
  return inspectRepository(true)
}

async function performUpdate(): Promise<UpdateStatus> {
  const checkStatus = await checkForUpdates()
  if (checkStatus.stage !== 'available' || !checkStatus.repositoryPath || !checkStatus.currentRevision) {
    return checkStatus
  }

  const repositoryPath = checkStatus.repositoryPath
  try {
    setStatus(createUpdateStatus('pulling', '正在下载并合并最新代码…', {
      currentRevision: checkStatus.currentRevision,
      remoteRevision: checkStatus.remoteRevision,
      repositoryPath,
    }))
    await runCommand('git', ['pull', '--ff-only', REMOTE_NAME, REMOTE_BRANCH], repositoryPath)

    const dependencyManifestsChanged = await hasDependencyManifestChanges(
      repositoryPath,
      checkStatus.currentRevision,
    )
    if (dependencyManifestsChanged) {
      return setStatus(createUpdateStatus(
        'blocked',
        '新版代码已下载，但包含依赖更新。为避免 Windows 锁定正在运行的 Electron 文件，请退出 PlayVault 后，在项目目录执行 npm ci 和 npm run build，再重新启动。',
        {
          currentRevision: checkStatus.currentRevision,
          remoteRevision: checkStatus.remoteRevision,
          repositoryPath,
        },
      ))
    }

    setStatus(createUpdateStatus('building', '正在构建新版 PlayVault…', { repositoryPath }))
    await runCommand(NPM_COMMAND, ['run', 'build'], repositoryPath)

    const restartingStatus = setStatus(createUpdateStatus('restarting', '更新完成，正在重新启动 PlayVault…', { repositoryPath }))
    setTimeout(() => {
      app.relaunch({ args: process.argv.slice(1) })
      app.quit()
    }, 450)
    return restartingStatus
  } catch (error) {
    return setStatus(createUpdateStatus(
      'error',
      `更新未完成：${formatCommandReason(error)}`,
      { repositoryPath },
    ))
  }
}

export function triggerUpdate(): Promise<UpdateStatus> {
  if (!activeUpdate) {
    activeUpdate = performUpdate().finally(() => {
      activeUpdate = null
    })
  }
  return activeUpdate
}
