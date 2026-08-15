/* 视觉基线：冷墨透明材质、真实游戏背景、低轮廓操作；避免暖金表格与信息密集仪表盘。 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowUpDown,
  EyeOff,
  Gamepad2,
  Grid2X2,
  Heart,
  List,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import type { GameFormData, GameLaunchResult, GameWithStats } from '@shared/types'
import type { GameStatus, InstallStatus } from '@shared/constants'
import StatusBadge from '../components/ui/StatusBadge'
import GameForm from '../components/games/GameForm'
import BackdropStage from '../components/media/BackdropStage'
import CoverFrame from '../components/media/CoverFrame'
import { useGames, useGameMutations } from '../hooks/useGames'
import { useLibraryViewPreferences } from '../hooks/useLibraryViewPreferences'
import {
  filterGamesByScope,
  LIBRARY_SCOPE_LABELS,
  parseLibraryScope,
  sortLibraryGames,
  type LibrarySort,
} from '../lib/libraryView'

const OPEN_DELAY_MS = 180

interface GamePresentationProps {
  games: GameWithStats[]
  formatDuration: (seconds: number) => string
  formatLastPlayed: (value: string | null) => string
  onOpen: (gameId: number) => void
  onLaunch: (game: GameWithStats) => void
  onEdit: (game: GameWithStats) => void
  onToggleFavorite: (game: GameWithStats) => void
  onToggleHidden: (game: GameWithStats) => void
}

function getGameType(game: GameWithStats): string {
  try {
    const tags = JSON.parse(game.tags || '[]')
    if (Array.isArray(tags) && typeof tags[0] === 'string' && tags[0].trim()) return tags[0]
  } catch {
    // 旧记录可能没有有效 JSON 标签，退回到平台信息即可。
  }
  return game.platform || '本地单机'
}

export default function Games(): React.ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const openTimer = useRef<number | null>(null)
  const [launchStatus, setLaunchStatus] = useState<string | null>(null)
  const { games, isLoading, search, setSearch } = useGames()
  const { createGame, updateGame } = useGameMutations()
  const { preferences, isReady: preferencesReady, updatePreferences } = useLibraryViewPreferences()
  const [formOpen, setFormOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<GameWithStats | null>(null)
  const scope = parseLibraryScope(searchParams.get('scope'))

  useEffect(() => () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current)
  }, [])

  const scopedGames = filterGamesByScope(games, scope)
  const sortedGames = sortLibraryGames(scopedGames, preferences.sortBy, preferences.sortDescending)
  const scopeLabel = LIBRARY_SCOPE_LABELS[scope]
  const featuredGame = sortedGames.find((game) => Boolean(game.background_path)) ?? sortedGames[0]
  const inProgressCount = scopedGames.filter((game) => game.status === 'in_progress').length
  const totalDuration = scopedGames.reduce((sum, game) => sum + game.total_duration, 0)

  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return '尚未游玩'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours === 0) return `${minutes} 分钟`
    return `${hours} 小时 ${minutes} 分钟`
  }

  const formatLastPlayed = (value: string | null): string => {
    if (!value) return '从未游玩'
    const date = new Date(value.replace(' ', 'T'))
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
    if (days <= 0) return '今天游玩'
    if (days === 1) return '昨天游玩'
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  const handleCreate = (): void => {
    setEditingGame(null)
    setFormOpen(true)
  }

  const handleSave = (data: GameFormData): void => {
    if (editingGame) {
      updateGame.mutate({ id: editingGame.id, data }, { onSuccess: () => setFormOpen(false) })
      return
    }
    createGame.mutate(data, { onSuccess: () => setFormOpen(false) })
  }

  const handleOpenDetail = (gameId: number): void => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current)
    openTimer.current = window.setTimeout(() => {
      navigate(`/games/${gameId}`)
      openTimer.current = null
    }, OPEN_DELAY_MS)
  }

  const handleToggleFavorite = (game: GameWithStats): void => {
    updateGame.mutate({ id: game.id, data: { is_favorite: game.is_favorite === 1 ? 0 : 1 } })
  }

  const handleToggleHidden = (game: GameWithStats): void => {
    updateGame.mutate({ id: game.id, data: { is_hidden: game.is_hidden === 1 ? 0 : 1 } })
  }

  const handleLaunch = async (game: GameWithStats): Promise<void> => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current)
      openTimer.current = null
    }
    if ((game.install_status as InstallStatus) !== 'installed') {
      setLaunchStatus(`「${game.display_name}」未安装或路径失效，暂时无法启动。`)
      return
    }
    const result: GameLaunchResult = await window.api.game.launch(game.id)
    setLaunchStatus(result.success ? `已启动「${game.display_name}」` : result.error ?? `无法启动「${game.display_name}」`)
    window.setTimeout(() => setLaunchStatus(null), 4000)
  }

  return (
    <div className="library-shell">
      <BackdropStage
        filePath={featuredGame?.background_path}
        crop={featuredGame?.background_crop}
        alt={featuredGame ? `${featuredGame.display_name} 游戏库背景` : '游戏库背景'}
        className="library-hero-stage"
      >
        <div className="library-hero-wash" />
        <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-7 lg:p-9">
          <div className="flex items-start justify-between gap-4">
            <div className="library-hero-panel inline-flex items-center gap-2 px-3 py-2 text-[10px] font-semibold tracking-[0.16em] text-[#dbeef6]">
              <Gamepad2 size={14} strokeWidth={1.8} /> PLAYVAULT · 私人游戏日志
            </div>
            <button type="button" className="library-glass-button inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium" onClick={handleCreate}>
              <Plus size={16} /> 添加游戏
            </button>
          </div>

          <div className="max-w-2xl">
            <div className="library-hero-panel inline-flex max-w-full items-center gap-4 p-3.5 sm:p-4">
              <CoverFrame
                filePath={featuredGame?.cover_path}
                crop={featuredGame?.cover_crop}
                alt={featuredGame ? `${featuredGame.display_name} 封面` : '游戏库封面'}
                className="w-12 shrink-0 overflow-hidden rounded-md border border-white/[0.18] bg-[#0a1019] shadow-[0_8px_18px_rgba(0,0,0,0.22)] sm:w-14"
                fallback={<div className="flex h-full items-center justify-center"><Gamepad2 size={17} className="text-[#bcd9e6]" /></div>}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-[0.16em] text-[#b7d3df]">你的本地收藏</p>
                <h1 className="mt-1 truncate text-3xl font-semibold tracking-[-0.04em] text-[#f5fbff] sm:text-[2.75rem]">{scopeLabel}</h1>
                <p className="mt-1.5 max-w-lg text-sm leading-6 text-[#d2e0e8]/72">背景、游玩时间与截图都只属于你的本地记录。</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 text-xs text-[#d6e4eb]/75">
            <HeroStat label="游戏记录" value={`${scopedGames.length} 款`} />
            <HeroStat label="进行中" value={`${inProgressCount} 款`} />
            <HeroStat label="累计时长" value={formatDuration(totalDuration)} />
          </div>
        </div>
      </BackdropStage>

      <section className="library-control-deck flex flex-wrap items-center gap-3 p-3 sm:p-3.5" aria-label="游戏库工具条">
        <label className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a9c6d3]/56" />
          <input
            type="text"
            className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#09101a]/55 py-2 pl-9 pr-3 text-sm text-[#e9f4f9] outline-none transition-colors placeholder:text-[#a9c6d3]/43 focus:border-[#cce8f6]/35 focus:bg-[#0b131f]/82"
            placeholder="搜索游戏名称或别名"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="flex items-center gap-1 rounded-lg border border-white/[0.09] bg-white/[0.035] p-1" aria-label="显示方式">
          <ViewButton label="封面陈列" selected={preferences.layout === 'grid'} onClick={() => updatePreferences({ layout: 'grid' })}><Grid2X2 size={15} /></ViewButton>
          <ViewButton label="横向浏览" selected={preferences.layout === 'list'} onClick={() => updatePreferences({ layout: 'list' })}><List size={16} /></ViewButton>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg px-1 text-sm text-[#c4d7e0]/70">
          <SlidersHorizontal size={15} />
          <select
            className="h-9 cursor-pointer border-0 bg-transparent pr-1 text-sm text-[#dceaf0] outline-none"
            value={preferences.sortBy}
            onChange={(event) => updatePreferences({ sortBy: event.target.value as LibrarySort })}
            aria-label="游戏排序方式"
          >
            <option value="recent">最近游玩</option>
            <option value="duration">总游玩时长</option>
            <option value="name">游戏名称</option>
            <option value="added">添加时间</option>
            <option value="archived">留档时间</option>
          </select>
          <button type="button" onClick={() => updatePreferences({ sortDescending: !preferences.sortDescending })} className="library-quiet-action flex h-8 w-8 items-center justify-center rounded-md" title={preferences.sortDescending ? '切换为正序' : '切换为倒序'} aria-label={preferences.sortDescending ? '切换为正序' : '切换为倒序'}>
            {preferences.sortDescending ? <ArrowDownAZ size={15} /> : <ArrowUpDown size={15} />}
          </button>
        </div>
      </section>

      {!preferencesReady && <div className="h-0" aria-hidden="true" />}

      {launchStatus && (
        <div className="library-hero-panel mt-4 flex items-center gap-2 px-4 py-3 text-sm text-[#d8edf6] animate-soft-enter">
          <Play size={15} className="text-[#b9dbe8]" fill="currentColor" /> {launchStatus}
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-[#afc5cf]/55">正在整理你的游戏记录…</div>
      ) : games.length === 0 ? (
        <EmptyLibrary onCreate={handleCreate} />
      ) : sortedGames.length === 0 ? (
        <div className="library-hero-panel mt-4 px-6 py-16 text-center">
          <p className="text-sm text-[#d4e5ec]">这个资料视角中还没有游戏。</p>
          <p className="mt-2 text-xs text-[#a7c1cc]/60">可在左侧切换记录视角，或使用搜索继续查找。</p>
        </div>
      ) : preferences.layout === 'grid' ? (
        <GameGrid games={sortedGames} density={preferences.density} formatDuration={formatDuration} formatLastPlayed={formatLastPlayed} onOpen={handleOpenDetail} onLaunch={handleLaunch} onEdit={(game) => { setEditingGame(game); setFormOpen(true) }} onToggleFavorite={handleToggleFavorite} onToggleHidden={handleToggleHidden} />
      ) : (
        <GameList games={sortedGames} formatDuration={formatDuration} formatLastPlayed={formatLastPlayed} onOpen={handleOpenDetail} onLaunch={handleLaunch} onEdit={(game) => { setEditingGame(game); setFormOpen(true) }} onToggleFavorite={handleToggleFavorite} onToggleHidden={handleToggleHidden} />
      )}

      <GameForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} game={editingGame} isSaving={createGame.isPending || updateGame.isPending} />
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="library-hero-panel px-3 py-2">
      <span className="block text-[10px] tracking-[0.13em] text-[#bad3de]/64">{label}</span>
      <strong className="mt-0.5 block text-sm font-medium text-[#f1f8fb]">{value}</strong>
    </div>
  )
}

function EmptyLibrary({ onCreate }: { onCreate: () => void }): React.ReactElement {
  return (
    <div className="library-hero-panel mt-4 py-20 text-center">
      <Gamepad2 size={30} className="mx-auto text-[#abcbd8]/58" />
      <h2 className="mt-5 text-2xl font-medium tracking-tight text-[#eaf4f8]">从第一段记录开始</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#adc5cf]/64">添加本地游戏，为将来的游玩时长、截图和留档留下归处。</p>
      <button type="button" className="library-glass-button mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium" onClick={onCreate}><Plus size={16} /> 添加第一款游戏</button>
    </div>
  )
}

function ViewButton({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${selected ? 'bg-[#d8eef8]/[0.16] text-[#effaff] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : 'text-[#aac4cf]/60 hover:bg-white/[0.07] hover:text-[#e9f5fa]'}`}>{children}</button>
}

function GameGrid({ games, density, ...props }: GamePresentationProps & { density: 'comfortable' | 'compact' }): React.ReactElement {
  const gridClass = density === 'comfortable'
    ? 'grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(248px,1fr))] lg:gap-5'
    : 'grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(208px,1fr))]'

  return <section aria-label="游戏记录" className={`grid py-5 ${gridClass}`}>{games.map((game) => <GameCard key={game.id} game={game} {...props} />)}</section>
}

function GameList(props: GamePresentationProps): React.ReactElement {
  return <section aria-label="游戏记录横向浏览" className="grid gap-3 py-5">{props.games.map((game) => <GameListRow key={game.id} game={game} {...props} />)}</section>
}

function CardActions({ game, onLaunch, onEdit, onToggleFavorite, onToggleHidden }: Omit<GamePresentationProps, 'games' | 'formatDuration' | 'formatLastPlayed' | 'onOpen'> & { game: GameWithStats }): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={`library-action ${game.is_favorite === 1 ? 'border-[#d5eef8]/35 text-[#e5f7fe]' : ''}`} title={game.is_favorite === 1 ? '取消收藏' : '收藏游戏'} aria-label={`${game.is_favorite === 1 ? '取消收藏' : '收藏'}${game.display_name}`} onClick={(event) => { event.stopPropagation(); onToggleFavorite(game) }}><Heart size={14} fill={game.is_favorite === 1 ? 'currentColor' : 'none'} /></button>
      <button type="button" className="library-action" title={game.is_hidden === 1 ? '取消隐藏' : '隐藏游戏'} aria-label={`${game.is_hidden === 1 ? '取消隐藏' : '隐藏'}${game.display_name}`} onClick={(event) => { event.stopPropagation(); onToggleHidden(game) }}><EyeOff size={14} /></button>
      <button type="button" className="library-action" title="启动游戏" aria-label={`启动${game.display_name}`} onClick={(event) => { event.stopPropagation(); void onLaunch(game) }}><Play size={14} fill="currentColor" /></button>
      <button type="button" className="library-action" title="编辑游戏" aria-label={`编辑${game.display_name}`} onClick={(event) => { event.stopPropagation(); onEdit(game) }}><Pencil size={14} /></button>
    </div>
  )
}

function GameCard({ game, formatDuration, formatLastPlayed, onOpen, onLaunch, onEdit, onToggleFavorite, onToggleHidden }: Omit<GamePresentationProps, 'games'> & { game: GameWithStats }): React.ReactElement {
  const isInstalled = (game.install_status as InstallStatus) === 'installed'

  return (
    <article className="library-game-card group relative cursor-pointer select-none" role="button" tabIndex={0} title="打开游戏档案" onClick={() => onOpen(game.id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(game.id) }}>
      <BackdropStage filePath={game.background_path} crop={game.background_crop} alt={`${game.display_name} 背景图`} className="library-card-stage">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,17,0.12)_10%,rgba(7,11,17,0.22)_42%,rgba(7,11,17,0.88)_100%)]" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5"><StatusBadge status={game.status as GameStatus} />{!isInstalled && <span className="rounded-md border border-white/[0.16] bg-[#0b121c]/55 px-1.5 py-1 text-[10px] text-[#d2e5ed]/72 backdrop-blur">路径失效</span>}</div>
        <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"><CardActions game={game} onLaunch={onLaunch} onEdit={onEdit} onToggleFavorite={onToggleFavorite} onToggleHidden={onToggleHidden} /></div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
          <CoverFrame filePath={game.cover_path} crop={game.cover_crop} alt={`${game.display_name} 封面`} className="w-10 shrink-0 overflow-hidden rounded-md border border-white/[0.2] bg-[#0a111a] shadow-[0_8px_18px_rgba(0,0,0,0.3)]" fallback={<div className="flex h-full items-center justify-center"><Gamepad2 size={14} className="text-[#c1dce7]" /></div>} />
          <div className="min-w-0 pb-0.5"><p className="truncate text-base font-semibold tracking-[-0.02em] text-[#f2f9fc]">{game.display_name}</p><p className="mt-1 truncate text-xs text-[#cae0e9]/70">{getGameType(game)}</p></div>
        </div>
      </BackdropStage>
      <div className="library-card-meta flex items-center justify-between gap-3 px-3.5 py-3"><span className="truncate text-xs text-[#c0d4dd]/68">{formatLastPlayed(game.last_played_at)}</span><span className="shrink-0 text-xs font-medium text-[#e2f0f5]/82">{formatDuration(game.total_duration)}</span></div>
    </article>
  )
}

function GameListRow({ game, formatDuration, formatLastPlayed, onOpen, onLaunch, onEdit, onToggleFavorite, onToggleHidden }: Omit<GamePresentationProps, 'games'> & { game: GameWithStats }): React.ReactElement {
  return (
    <article className="library-game-card group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center" role="button" tabIndex={0} onClick={() => onOpen(game.id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(game.id) }}>
      <BackdropStage filePath={game.background_path} crop={game.background_crop} alt={`${game.display_name} 背景图`} className="library-list-stage">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,13,20,0.9),rgba(8,13,20,0.52)_54%,rgba(8,13,20,0.28))]" />
        <div className="relative flex h-full items-center gap-4 px-4 sm:px-5">
          <CoverFrame filePath={game.cover_path} crop={game.cover_crop} alt={`${game.display_name} 封面`} className="w-12 shrink-0 overflow-hidden rounded-md border border-white/[0.18] bg-[#0a111a]" fallback={<div className="flex h-full items-center justify-center"><Gamepad2 size={16} className="text-[#c1dce7]" /></div>} />
          <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-base font-semibold text-[#f0f8fb]">{game.display_name}</p><StatusBadge status={game.status as GameStatus} /></div><p className="mt-1 truncate text-xs text-[#c3d8e1]/66">{getGameType(game)} · {formatLastPlayed(game.last_played_at)}</p></div>
        </div>
      </BackdropStage>
      <div className="flex items-center gap-4 px-4 sm:px-5"><span className="hidden text-xs text-[#c2d6df]/68 sm:block">{formatDuration(game.total_duration)}</span><CardActions game={game} onLaunch={onLaunch} onEdit={onEdit} onToggleFavorite={onToggleFavorite} onToggleHidden={onToggleHidden} /></div>
    </article>
  )
}
