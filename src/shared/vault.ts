export const VAULT_REFERENCE_PREFIX = 'vault://'

export function isVaultReference(value: string): boolean {
  return value.startsWith(VAULT_REFERENCE_PREFIX)
}

export function toVaultReference(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some((segment) => segment === '..')) {
    throw new Error('档案媒体相对路径无效')
  }
  return `${VAULT_REFERENCE_PREFIX}${normalized}`
}

export function fromVaultReference(reference: string): string | null {
  if (!isVaultReference(reference)) return null

  const normalized = reference.slice(VAULT_REFERENCE_PREFIX.length).replace(/\\/g, '/')
  if (!normalized || normalized.startsWith('/') || normalized.split('/').some((segment) => !segment || segment === '..')) {
    return null
  }
  return normalized
}

export interface VaultLocation {
  rootPath: string
  isDefaultLocation: boolean
}

export interface VaultHealthIssue {
  gameId: number
  gameName: string
  mediaType: '封面' | '背景' | '精选截图'
  reference: string
  reason: 'missing' | 'external'
}

export interface VaultHealthReport {
  rootPath: string
  archivedGames: number
  managedMediaFiles: number
  missingMediaFiles: number
  externalMediaFiles: number
  issues: VaultHealthIssue[]
  checkedAt: number
}
