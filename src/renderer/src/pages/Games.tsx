import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowUpDown,
  Gamepad2,
  Grid2X2,
  List,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Heart,
  EyeOff,
} from 'lucide-react'
import type { GameLaunchResult, GameWithStats, GameFormData } from '@shared/types'
import type { GameStatus, InstallStatus } from '@shared/constants'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import GameForm from '../components/games/GameForm'
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

const OPEN_DELAY_MS = 220

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
    <div className="content-canvas min-h-full bg-[#090a0c] px-6 py-7 sm:px-9 lg:px-11">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.075] pb-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-[#d8ba77]">个人游戏日志</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-serif text-3xl tracking-[-0.02em] text-archive-50 sm:text-4xl">{scopeLabel}</h1>
            <span className="text-sm text-archive-500">{scopedGames.length} 条记录</span>
          </div>
          <p className="mt-2 text-sm text-archive-500">从这里继续游玩、补充资料，或回看留下的游戏经历。</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={16} /> 添加游戏
        </Button>
      </header>

      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/[0.075] py-4" aria-label="游戏库工具条">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-archive-500" />
          <input
            type="text"
            className="w-full border-0 border-b border-white/[0.11] bg-transparent py-2 pl-7 pr-2 text-sm text-archive-100 outline-none transition-colors placeholder:text-archive-600 focus:border-[#c9a35a]/75"
            placeholder="搜索游戏名称或别名"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 border border-white/[0.08] bg-white/[0.025] p-1" aria-label="显示方式">
          <ViewButton label="封面网格" selected={preferences.layout === 'grid'} onClick={() => updatePreferences({ layout: 'grid' })}><Grid2X2 size={15} /></ViewButton>
          <ViewButton label="紧凑列表" selected={preferences.layout === 'list'} onClick={() => updatePreferences({ layout: 'list' })}><List size={16} /></ViewButton>
        </div>

        <div className="flex items-center gap-2 text-sm text-archive-500">
          <SlidersHorizontal size={15} />
          <select
            className="cursor-pointer border-0 bg-transparent py-2 text-sm text-archive-300 outline-none"
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
          <button type="button" onClick={() => updatePreferences({ sortDescending: !preferences.sortDescending })} className="flex h-8 w-8 items-center justify-center border border-transparent text-archive-500 transition-colors hover:border-white/[0.12] hover:text-archive-100" title={preferences.sortDescending ? '切换为正序' : '切换为倒序'} aria-label={preferences.sortDescending ? '切换为正序' : '切换为倒序'}>
            {preferences.sortDescending ? <ArrowDownAZ size={16} /> : <ArrowUpDown size={16} />}
          </button>
        </div>

        {preferences.layout === 'grid' && (
          <button type="button" onClick={() => updatePreferences({ density: preferences.density === 'comfortable' ? 'compact' : 'comfortable' })} className="text-xs text-archive-500 transition-colors hover:text-[#ead7aa]">
            {preferences.density === 'comfortable' ? '切换紧凑密度' : '切换舒展密度'}
          </button>
        )}
      </section>

      {!preferencesReady && <div className="h-0" aria-hidden="true" />}

      {launchStatus && (
        <div className="mt-5 flex items-center gap-2 border-l-2 border-[#c9a35a] bg-white/[0.03] px-4 py-3 text-sm text-archive-200 animate-soft-enter">
          <Play size={15} className="text-[#d8ba77]" /> {launchStatus}
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-archive-500">正在载入游戏库…</div>
      ) : games.length === 0 ? (
        <EmptyLibrary onCreate={handleCreate} />
      ) : sortedGames.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm text-archive-400">这个资料视角中还没有游戏。</p>
          <p className="mt-2 text-xs text-archive-600">可在左侧切换其他资料视角，或使用搜索继续查找。</p>
        </div>
      ) : preferences.layout === 'grid' ? (
        <GameGrid
          games={sortedGames}
          density={preferences.density}
          formatDuration={formatDuration}
          formatLastPlayed={formatLastPlayed}
          onOpen={handleOpenDetail}
          onLaunch={handleLaunch}
          onEdit={(game) => { setEditingGame(game); setFormOpen(true) }}
          onToggleFavorite={handleToggleFavorite}
          onToggleHidden={handleToggleHidden}
        />
      ) : (
        <GameList
          games={sortedGames}
          formatDuration={formatDuration}
          formatLastPlayed={formatLastPlayed}
          onOpen={handleOpenDetail}
          onLaunch={handleLaunch}
          onEdit={(game) => { setEditingGame(game); setFormOpen(true) }}
          onToggleFavorite={handleToggleFavorite}
          onToggleHidden={handleToggleHidden}
        />
      )}

      <GameForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} game={editingGame} isSaving={createGame.isPending || updateGame.isPending} />
    </div>
  )
}

function EmptyLibrary({ onCreate }: { onCreate: () => void }): React.ReactElement {
  return (
    <div className="py-28 text-center">
      <Gamepad2 size={30} className="mx-auto text-archive-600" />
      <h2 className="mt-5 font-serif text-2xl text-archive-200">这里还没有游戏档案</h2>
      <p className="mt-2 text-sm text-archive-500">添加游戏，或从“发现候选”中将本地可执行文件加入档案馆。</p>
      <Button className="mt-6 rounded-none" variant="primary" onClick={onCreate}><Plus size={16} /> 添加第一款游戏</Button>
    </div>
  )
}

function ViewButton({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`flex h-7 w-7 items-center justify-center transition-colors ${selected ? 'bg-[#c9a35a] text-[#16120a]' : 'text-archive-500 hover:bg-white/[0.06] hover:text-archive-200'}`}>{children}</button>
}

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

function GameGrid({ games, density, ...props }: GamePresentationProps & { density: 'comfortable' | 'compact' }): React.ReactElement {
  const gridClass = density === 'comfortable'
    ? 'grid-cols-[repeat(auto-fill,minmax(158px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(174px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(204px,1fr))]'
    : 'grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-x-3 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(142px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(154px,1fr))]'

  return <section aria-label="游戏记录" className={`grid py-7 ${gridClass}`}>{games.map((game) => <GameCard key={game.id} game={game} {...props} />)}</section>
}

function GameList(props: GamePresentationProps): React.ReactElement {
  return <section aria-label="游戏记录列表" className="divide-y divide-white/[0.065] border-b border-white/[0.065] py-4">{props.games.map((game) => <GameListRow key={game.id} game={game} {...props} />)}</section>
}

function GameCard({ game, formatDuration, formatLastPlayed, onOpen, onLaunch, onEdit, onToggleFavorite, onToggleHidden }: Omit<GamePresentationProps, 'games'> & { game: GameWithStats }): React.ReactElement {
  const isInstalled = (game.install_status as InstallStatus) === 'installed'

  return (
    <article className="group relative cursor-pointer select-none" role="button" tabIndex={0} title="单击查看详情" onClick={() => onOpen(game.id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(game.id) }}>
      <CoverFrame
        filePath={game.cover_path}
        crop={game.cover_crop}
        alt={`${game.display_name} 封面`}
        className="relative border border-white/[0.085] bg-[#15171a] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#c9a35a]/65"
        imageClassName="transition-transform duration-500"
        fallback={<div className="flex h-full flex-col items-center justify-center bg-[linear-gradient(145deg,#1a1d20,#101215)] text-center"><Gamepad2 size={30} className="text-archive-600" /><p className="mt-3 max-w-[78%] break-words text-xs text-archive-500">{game.display_name}</p></div>}
      >
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5"><StatusBadge status={game.status as GameStatus} />{!isInstalled && <span className="border border-white/[0.15] bg-black/65 px-1.5 py-1 text-[10px] text-archive-300">路径失效</span>}</div>
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">{game.archive_status === 'archived' && <span className="border border-[#c9a35a]/35 bg-black/65 px-1.5 py-1 text-[10px] text-[#ead7aa]">已留档</span>}{game.is_hidden === 1 && <span className="border border-white/[0.14] bg-black/65 px-1.5 py-1 text-[10px] text-archive-300">已隐藏</span>}</div>
        <div className="absolute right-2.5 top-2.5 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" className={`border bg-black/60 p-1.5 transition-colors ${game.is_favorite === 1 ? 'border-[#c9a35a]/70 text-[#ead7aa]' : 'border-white/[0.12] text-archive-200 hover:border-[#c9a35a]/70 hover:text-[#ead7aa]'}`} title={game.is_favorite === 1 ? '取消收藏' : '收藏游戏'} aria-label={`${game.is_favorite === 1 ? '取消收藏' : '收藏'}${game.display_name}`} onClick={(event) => { event.stopPropagation(); onToggleFavorite(game) }}><Heart size={13} fill={game.is_favorite === 1 ? 'currentColor' : 'none'} /></button>
          <button type="button" className="border border-white/[0.12] bg-black/60 p-1.5 text-archive-200 transition-colors hover:border-white/[0.28] hover:text-archive-50" title={game.is_hidden === 1 ? '取消隐藏' : '隐藏游戏'} aria-label={`${game.is_hidden === 1 ? '取消隐藏' : '隐藏'}${game.display_name}`} onClick={(event) => { event.stopPropagation(); onToggleHidden(game) }}><EyeOff size={13} /></button>
          <button type="button" className="border border-white/[0.12] bg-black/60 p-1.5 text-archive-200 transition-colors hover:border-[#c9a35a]/70 hover:text-[#ead7aa]" title="启动游戏" aria-label={`启动${game.display_name}`} onClick={(event) => { event.stopPropagation(); void onLaunch(game) }}><Play size={13} fill="currentColor" /></button>
          <button type="button" className="border border-white/[0.12] bg-black/60 p-1.5 text-archive-200 transition-colors hover:border-[#c9a35a]/70 hover:text-[#ead7aa]" title="编辑游戏" aria-label={`编辑${game.display_name}`} onClick={(event) => { event.stopPropagation(); onEdit(game) }}><Pencil size={13} /></button>
        </div>
      </CoverFrame>
      <div className="min-w-0 border-b border-white/[0.065] px-1 pb-3 pt-3"><p className="truncate text-sm font-medium text-archive-100">{game.display_name}</p><div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-archive-500"><span className="truncate">{formatDuration(game.total_duration)}</span><span className="shrink-0">{formatLastPlayed(game.last_played_at)}</span></div></div>
    </article>
  )
}

function GameListRow({ game, formatDuration, formatLastPlayed, onOpen, onLaunch, onEdit, onToggleFavorite, onToggleHidden }: Omit<GamePresentationProps, 'games'> & { game: GameWithStats }): React.ReactElement {
  return (
    <article className="group grid cursor-pointer grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 px-2 py-3 transition-colors hover:bg-white/[0.025] sm:grid-cols-[52px_minmax(0,1.5fr)_minmax(120px,0.7fr)_minmax(110px,0.6fr)_auto]" role="button" tabIndex={0} onClick={() => onOpen(game.id)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(game.id) }}>
      <CoverFrame filePath={game.cover_path} crop={game.cover_crop} alt={`${game.display_name} 封面`} className="w-11 border border-white/[0.09] bg-[#15171a] sm:w-[52px]" fallback={<div className="flex h-full items-center justify-center"><Gamepad2 size={14} className="text-archive-600" /></div>} />
      <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium text-archive-100">{game.display_name}</p><StatusBadge status={game.status as GameStatus} />{game.is_favorite === 1 && <Heart size={12} className="shrink-0 text-[#d8ba77]" fill="currentColor" />}{game.is_hidden === 1 && <span className="text-[10px] text-archive-500">已隐藏</span>}</div><p className="mt-1 truncate text-[11px] text-archive-500 sm:hidden">{formatDuration(game.total_duration)} · {formatLastPlayed(game.last_played_at)}</p></div>
      <p className="hidden text-xs text-archive-500 sm:block">{formatLastPlayed(game.last_played_at)}</p>
      <p className="hidden text-xs text-archive-500 sm:block">{formatDuration(game.total_duration)}</p>
      <div className="flex items-center gap-1"><button type="button" className={`flex h-8 w-8 items-center justify-center border border-transparent transition-colors hover:border-[#c9a35a]/45 hover:text-[#ead7aa] ${game.is_favorite === 1 ? 'text-[#d8ba77]' : 'text-archive-500'}`} title={game.is_favorite === 1 ? '取消收藏' : '收藏游戏'} aria-label={`${game.is_favorite === 1 ? '取消收藏' : '收藏'}${game.display_name}`} onClick={(event) => { event.stopPropagation(); onToggleFavorite(game) }}><Heart size={14} fill={game.is_favorite === 1 ? 'currentColor' : 'none'} /></button><button type="button" className="flex h-8 w-8 items-center justify-center border border-transparent text-archive-500 transition-colors hover:border-white/[0.14] hover:text-archive-100" title={game.is_hidden === 1 ? '取消隐藏' : '隐藏游戏'} aria-label={`${game.is_hidden === 1 ? '取消隐藏' : '隐藏'}${game.display_name}`} onClick={(event) => { event.stopPropagation(); onToggleHidden(game) }}><EyeOff size={14} /></button><button type="button" className="flex h-8 w-8 items-center justify-center border border-transparent text-archive-500 transition-colors hover:border-[#c9a35a]/45 hover:text-[#ead7aa]" title="启动游戏" aria-label={`启动${game.display_name}`} onClick={(event) => { event.stopPropagation(); void onLaunch(game) }}><Play size={14} fill="currentColor" /></button><button type="button" className="flex h-8 w-8 items-center justify-center border border-transparent text-archive-500 transition-colors hover:border-white/[0.14] hover:text-archive-100" title="编辑游戏" aria-label={`编辑${game.display_name}`} onClick={(event) => { event.stopPropagation(); onEdit(game) }}><Pencil size={14} /></button></div>
    </article>
  )
}
