import type { GameWithStats } from '@shared/types'

export type LibraryScope = 'all' | 'in_progress' | 'recent' | 'archived' | 'missing'
export type LibraryLayout = 'grid' | 'list'
export type LibraryDensity = 'comfortable' | 'compact'
export type LibrarySort = 'recent' | 'duration' | 'name' | 'added' | 'archived'

export interface LibraryViewPreferences {
  layout: LibraryLayout
  density: LibraryDensity
  sortBy: LibrarySort
  sortDescending: boolean
}

export const DEFAULT_LIBRARY_VIEW_PREFERENCES: LibraryViewPreferences = {
  layout: 'grid',
  density: 'comfortable',
  sortBy: 'recent',
  sortDescending: true,
}

export const LIBRARY_SCOPE_LABELS: Record<LibraryScope, string> = {
  all: '全部游戏',
  in_progress: '进行中',
  recent: '最近游玩',
  archived: '已留档',
  missing: '路径失效',
}

export function parseLibraryScope(value: string | null): LibraryScope {
  if (value === 'in_progress' || value === 'recent' || value === 'archived' || value === 'missing') return value
  return 'all'
}

export function filterGamesByScope(games: GameWithStats[], scope: LibraryScope): GameWithStats[] {
  switch (scope) {
    case 'in_progress':
      return games.filter((game) => game.status === 'in_progress')
    case 'recent':
      return games.filter((game) => Boolean(game.last_played_at))
    case 'archived':
      return games.filter((game) => game.archive_status === 'archived')
    case 'missing':
      return games.filter((game) => game.install_status === 'missing')
    default:
      return games
  }
}

export function sortLibraryGames(
  games: GameWithStats[],
  sortBy: LibrarySort,
  descending: boolean,
): GameWithStats[] {
  const direction = descending ? -1 : 1
  const sorted = [...games]

  sorted.sort((left, right) => {
    if (sortBy === 'name') return direction * left.display_name.localeCompare(right.display_name, 'zh-CN')
    if (sortBy === 'duration') return direction * (left.total_duration - right.total_duration)
    if (sortBy === 'added') return direction * left.created_at.localeCompare(right.created_at)
    if (sortBy === 'archived') return direction * (left.archived_at ?? '').localeCompare(right.archived_at ?? '')
    return direction * (left.last_played_at ?? '').localeCompare(right.last_played_at ?? '')
  })

  return sorted
}

export function normalizeLibraryViewPreferences(value: unknown): LibraryViewPreferences {
  const candidate = (value ?? {}) as Partial<LibraryViewPreferences>
  return {
    layout: candidate.layout === 'list' ? 'list' : 'grid',
    density: candidate.density === 'compact' ? 'compact' : 'comfortable',
    sortBy: ['recent', 'duration', 'name', 'added', 'archived'].includes(candidate.sortBy ?? '')
      ? candidate.sortBy as LibrarySort
      : DEFAULT_LIBRARY_VIEW_PREFERENCES.sortBy,
    sortDescending: typeof candidate.sortDescending === 'boolean'
      ? candidate.sortDescending
      : DEFAULT_LIBRARY_VIEW_PREFERENCES.sortDescending,
  }
}
