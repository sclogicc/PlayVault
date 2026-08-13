import { app } from 'electron'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Database } from '../db/sqljs-wrapper'
import * as settingRepository from '../db/repositories/settingRepository'
import {
  fromVaultReference,
  isVaultReference,
  toVaultReference,
  type VaultHealthIssue,
  type VaultHealthReport,
  type VaultLocation,
} from '../../shared/vault'

const VAULT_ROOT_SETTING = 'vault_root_path'
const VAULT_FORMAT_VERSION = 1
const VAULT_MANIFEST_NAME = 'vault-manifest.json'
const ARCHIVE_MEDIA_DIRECTORY = path.join('media', 'archives')
const CAPTURE_MEDIA_DIRECTORY = path.join('media', 'captures')

interface VaultManifest {
  format: 'playvault-vault'
  formatVersion: number
  vaultId: string
  createdAt: string
}

interface ManagedMediaRow {
  game_id: number
  display_name: string
  archive_cover_path: string
  archive_background_path: string
  cover_path: string
  background_path: string
}

interface HighlightRow {
  game_id: number
  display_name: string
  preserved_path: string
  file_path: string
}

function defaultVaultRoot(): string {
  return path.join(app.getPath('documents'), 'PlayVault Vault')
}

function getConfiguredVaultRoot(db: Database): string {
  const configured = settingRepository.get(db, VAULT_ROOT_SETTING)?.value.trim()
  return configured || defaultVaultRoot()
}

function normalizeForComparison(value: string): string {
  const resolved = path.resolve(value)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

function isPathInside(rootPath: string, candidatePath: string): boolean {
  const relative = path.relative(rootPath, candidatePath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function writeManifest(rootPath: string): Promise<void> {
  const manifestPath = path.join(rootPath, VAULT_MANIFEST_NAME)
  if (await pathExists(manifestPath)) return

  const manifest: VaultManifest = {
    format: 'playvault-vault',
    formatVersion: VAULT_FORMAT_VERSION,
    vaultId: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function ensureVaultDirectories(rootPath: string): Promise<string> {
  await fs.mkdir(path.join(rootPath, ARCHIVE_MEDIA_DIRECTORY), { recursive: true })
  await fs.mkdir(path.join(rootPath, CAPTURE_MEDIA_DIRECTORY), { recursive: true })
  await fs.mkdir(path.join(rootPath, 'snapshots'), { recursive: true })
  await fs.mkdir(path.join(rootPath, 'exports'), { recursive: true })
  await writeManifest(rootPath)
  return rootPath
}

function legacyArchiveRoot(): string {
  return path.join(app.getPath('userData'), 'archives')
}

async function copyLegacyFile(sourcePath: string, sourceRoot: string, vaultRoot: string): Promise<string | null> {
  const relativePath = path.relative(sourceRoot, sourcePath)
  if (!relativePath || !isPathInside(sourceRoot, sourcePath) || relativePath.startsWith('..')) return null

  const destinationRelativePath = path.join(ARCHIVE_MEDIA_DIRECTORY, relativePath)
  const destinationPath = path.join(vaultRoot, destinationRelativePath)
  try {
    await fs.access(sourcePath)
    if (!(await pathExists(destinationPath))) {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true })
      await fs.copyFile(sourcePath, destinationPath)
    }
    return toVaultReference(destinationRelativePath)
  } catch {
    return null
  }
}

async function migrateLegacyArchiveReferences(db: Database, vaultRoot: string): Promise<void> {
  const legacyRoot = legacyArchiveRoot()
  if (!(await pathExists(legacyRoot))) return

  const games = db.prepare(
    `SELECT id, archive_cover_path, archive_background_path
     FROM games
     WHERE archive_status = 'archived'`,
  ).all() as unknown as Array<{
    id: number
    archive_cover_path: string
    archive_background_path: string
  }>

  const screenshotRows = db.prepare(
    `SELECT id, preserved_path
     FROM screenshots
     WHERE is_archived_highlight = 1 AND preserved_path != ''`,
  ).all() as unknown as Array<{ id: number; preserved_path: string }>

  const gameUpdates: Array<{ id: number; cover: string; background: string }> = []
  for (const game of games) {
    const cover = isVaultReference(game.archive_cover_path)
      ? game.archive_cover_path
      : await copyLegacyFile(game.archive_cover_path, legacyRoot, vaultRoot)
    const background = isVaultReference(game.archive_background_path)
      ? game.archive_background_path
      : await copyLegacyFile(game.archive_background_path, legacyRoot, vaultRoot)

    if ((cover && cover !== game.archive_cover_path) || (background && background !== game.archive_background_path)) {
      gameUpdates.push({
        id: game.id,
        cover: cover || game.archive_cover_path,
        background: background || game.archive_background_path,
      })
    }
  }

  const screenshotUpdates: Array<{ id: number; preservedPath: string }> = []
  for (const screenshot of screenshotRows) {
    if (isVaultReference(screenshot.preserved_path)) continue
    const preservedPath = await copyLegacyFile(screenshot.preserved_path, legacyRoot, vaultRoot)
    if (preservedPath && preservedPath !== screenshot.preserved_path) {
      screenshotUpdates.push({ id: screenshot.id, preservedPath })
    }
  }

  if (gameUpdates.length === 0 && screenshotUpdates.length === 0) return

  db.transaction(() => {
    for (const game of gameUpdates) {
      db.prepare(
        `UPDATE games
         SET archive_cover_path = ?, archive_background_path = ?, updated_at = datetime('now','localtime')
         WHERE id = ?`,
      ).run(game.cover, game.background, game.id)
    }
    for (const screenshot of screenshotUpdates) {
      db.prepare(
        `UPDATE screenshots SET preserved_path = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      ).run(screenshot.preservedPath, screenshot.id)
    }
  })
}

export async function initializeVault(db: Database): Promise<void> {
  const configured = settingRepository.get(db, VAULT_ROOT_SETTING)?.value.trim()
  const rootPath = await ensureVaultDirectories(configured || defaultVaultRoot())
  if (!configured) {
    settingRepository.set(db, VAULT_ROOT_SETTING, rootPath)
  }
  await migrateLegacyArchiveReferences(db, rootPath)
}

export function getVaultLocation(db: Database): VaultLocation {
  const rootPath = getConfiguredVaultRoot(db)
  return {
    rootPath,
    isDefaultLocation: normalizeForComparison(rootPath) === normalizeForComparison(defaultVaultRoot()),
  }
}

export async function getArchiveMediaRoot(db: Database): Promise<string> {
  const rootPath = await ensureVaultDirectories(getConfiguredVaultRoot(db))
  return path.join(rootPath, ARCHIVE_MEDIA_DIRECTORY)
}

export async function getCaptureMediaRoot(db: Database): Promise<string> {
  const rootPath = await ensureVaultDirectories(getConfiguredVaultRoot(db))
  return path.join(rootPath, CAPTURE_MEDIA_DIRECTORY)
}

export function resolveVaultReference(db: Database, reference: string): string | null {
  const relativePath = fromVaultReference(reference)
  if (!relativePath) return null

  const rootPath = path.resolve(getConfiguredVaultRoot(db))
  const resolvedPath = path.resolve(rootPath, ...relativePath.split('/'))
  return isPathInside(rootPath, resolvedPath) ? resolvedPath : null
}

export function toVaultMediaReference(db: Database, filePath: string): string {
  const rootPath = path.resolve(getConfiguredVaultRoot(db))
  const resolvedPath = path.resolve(filePath)
  if (!isPathInside(rootPath, resolvedPath)) {
    throw new Error('媒体文件不在当前档案库中，无法创建档案引用')
  }
  return toVaultReference(path.relative(rootPath, resolvedPath))
}

async function copyDirectory(sourcePath: string, destinationPath: string): Promise<void> {
  await fs.cp(sourcePath, destinationPath, { recursive: true, errorOnExist: true, force: false })
}

export async function relocateVault(db: Database, selectedDirectory: string): Promise<VaultLocation> {
  const currentRoot = await ensureVaultDirectories(getConfiguredVaultRoot(db))
  const targetRoot = path.join(selectedDirectory, 'PlayVault Vault')

  const normalizedCurrentRoot = normalizeForComparison(currentRoot)
  const normalizedSelectedDirectory = normalizeForComparison(selectedDirectory)
  const normalizedTargetRoot = normalizeForComparison(targetRoot)
  if (normalizedCurrentRoot === normalizedTargetRoot || normalizedCurrentRoot === normalizedSelectedDirectory) {
    return { rootPath: currentRoot, isDefaultLocation: normalizedCurrentRoot === normalizeForComparison(defaultVaultRoot()) }
  }
  if (isPathInside(currentRoot, targetRoot)) {
    throw new Error('不能在当前档案库内部创建新的档案库，请选择其他磁盘或上级目录。')
  }

  if (await pathExists(targetRoot)) {
    throw new Error('所选位置中已存在“PlayVault Vault”目录。为避免覆盖已有档案，本次操作已取消。')
  }

  const stagingRoot = `${targetRoot}.staging-${randomUUID()}`
  try {
    await copyDirectory(currentRoot, stagingRoot)
    await fs.rename(stagingRoot, targetRoot)
    settingRepository.set(db, VAULT_ROOT_SETTING, targetRoot)
    return { rootPath: targetRoot, isDefaultLocation: false }
  } catch (error) {
    await fs.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
}

async function inspectStoredMedia(
  db: Database,
  issue: Omit<VaultHealthIssue, 'reason'>,
): Promise<'managed' | 'missing' | 'external'> {
  if (!issue.reference) return 'missing'

  const targetPath = isVaultReference(issue.reference)
    ? resolveVaultReference(db, issue.reference)
    : issue.reference
  if (!targetPath || !(await pathExists(targetPath))) return 'missing'
  return isVaultReference(issue.reference) ? 'managed' : 'external'
}

export async function getVaultHealthReport(db: Database): Promise<VaultHealthReport> {
  await initializeVault(db)
  const location = getVaultLocation(db)
  const games = db.prepare(
    `SELECT id AS game_id, display_name, archive_cover_path, archive_background_path, cover_path, background_path
     FROM games
     WHERE archive_status = 'archived'
     ORDER BY archived_at DESC`,
  ).all() as unknown as ManagedMediaRow[]
  const highlights = db.prepare(
    `SELECT s.game_id, g.display_name, s.preserved_path, s.file_path
     FROM screenshots s
     INNER JOIN games g ON g.id = s.game_id
     WHERE s.is_archived_highlight = 1 AND g.archive_status = 'archived'`,
  ).all() as unknown as HighlightRow[]

  let managedMediaFiles = 0
  let missingMediaFiles = 0
  let externalMediaFiles = 0
  const issues: VaultHealthIssue[] = []

  const registerResult = async (
    gameId: number,
    gameName: string,
    mediaType: VaultHealthIssue['mediaType'],
    reference: string,
  ): Promise<void> => {
    const result = await inspectStoredMedia(db, { gameId, gameName, mediaType, reference })
    if (result === 'managed') {
      managedMediaFiles++
      return
    }
    if (result === 'missing') {
      missingMediaFiles++
      issues.push({ gameId, gameName, mediaType, reference, reason: 'missing' })
      return
    }
    externalMediaFiles++
    issues.push({ gameId, gameName, mediaType, reference, reason: 'external' })
  }

  for (const game of games) {
    await registerResult(game.game_id, game.display_name, '封面', game.archive_cover_path || game.cover_path)
    await registerResult(game.game_id, game.display_name, '背景', game.archive_background_path || game.background_path)
  }
  for (const screenshot of highlights) {
    await registerResult(screenshot.game_id, screenshot.display_name, '精选截图', screenshot.preserved_path || screenshot.file_path)
  }

  return {
    rootPath: location.rootPath,
    archivedGames: games.length,
    managedMediaFiles,
    missingMediaFiles,
    externalMediaFiles,
    issues,
    checkedAt: Date.now(),
  }
}
