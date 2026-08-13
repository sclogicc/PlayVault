import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Gamepad2, Pencil, Play, Plus, Search, SlidersHorizontal } from 'lucide-react'
import type { GameLaunchResult, GameWithStats, GameFormData } from '@shared/types'
import type { GameStatus, InstallStatus } from '@shared/constants'
import { getCoverImageStyle, parseCoverCrop } from '@shared/coverCrop'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import GameForm from '../components/games/GameForm'
import { toFileUrl } from '../lib/fileUrl'
import { useGames, useGameMutations } from '../hooks/useGames'

const OPEN_DELAY_MS = 220

export default function Games(): React.ReactElement {
  const navigate = useNavigate()
  const openTimer = useRef<number | null>(null)
  const [launchStatus, setLaunchStatus] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'duration' | 'name' | 'added'>('recent')
  const { games, isLoading, search, setSearch } = useGames()
  const { createGame, updateGame } = useGameMutations()
  const [formOpen, setFormOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<GameWithStats | null>(null)

  useEffect(() => () => {
    if (openTimer.current !== null) window.clearTimeout(openTimer.current)
  }, [])

  const sortedGames = [...games].sort((a, b) => {
    if (sortBy === 'name') return a.display_name.localeCompare(b.display_name, 'zh-CN')
    if (sortBy === 'duration') return b.total_duration - a.total_duration
    if (sortBy === 'added') return b.created_at.localeCompare(a.created_at)
    return (b.last_played_at ?? '').localeCompare(a.last_played_at ?? '')
  })

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
    <div className="min-h-full bg-[#090a0c] px-8 py-9 sm:px-12 lg:px-16">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.075] pb-7">
        <div>
          <p className="text-[11px] font-medium tracking-[0.17em] text-[#d8ba77]">个人收藏</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="font-serif text-4xl tracking-[-0.025em] text-archive-50 sm:text-5xl">游戏库</h1>
            <span className="text-sm text-archive-500">{games.length} 个本地游戏</span>
          </div>
          <p className="mt-3 text-sm text-archive-400">封面、游玩时间与截图，共同构成一段游戏经历。</p>
        </div>
        <Button variant="primary" onClick={handleCreate} className="rounded-none border border-[#c9a35a]/75 bg-[#c9a35a] text-[#15110a] hover:bg-[#dec280]">
          <Plus size={16} /> 添加游戏
        </Button>
      </header>

      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/[0.075] py-4">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-archive-500" />
          <input
            type="text"
            className="w-full border-0 border-b border-white/[0.11] bg-transparent py-2 pl-7 pr-2 text-sm text-archive-100 outline-none transition-colors placeholder:text-archive-600 focus:border-[#c9a35a]/75"
            placeholder="搜索游戏名称或别名"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-archive-500">
          <SlidersHorizontal size={15} />
          <select
            className="cursor-pointer border-0 bg-transparent py-2 text-sm text-archive-300 outline-none"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            aria-label="游戏排序方式"
          >
            <option value="recent">最近游玩</option>
            <option value="duration">总游玩时长</option>
            <option value="name">游戏名称</option>
            <option value="added">添加时间</option>
          </select>
        </div>
      </section>

      {launchStatus && (
        <div className="mt-5 flex items-center gap-2 border-l-2 border-[#c9a35a] bg-white/[0.03] px-4 py-3 text-sm text-archive-200 animate-soft-enter">
          <Play size={15} className="text-[#d8ba77]" /> {launchStatus}
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center text-sm text-archive-500">正在载入游戏库…</div>
      ) : games.length === 0 ? (
        <div className="py-28 text-center">
          <Gamepad2 size={30} className="mx-auto text-archive-600" />
          <h2 className="mt-5 font-serif text-2xl text-archive-200">这里还没有游戏档案</h2>
          <p className="mt-2 text-sm text-archive-500">添加游戏，或从“发现候选”中将本地可执行文件加入档案馆。</p>
          <Button className="mt-6 rounded-none" variant="primary" onClick={handleCreate}><Plus size={16} /> 添加第一款游戏</Button>
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="py-24 text-center text-sm text-archive-500">没有找到匹配的游戏。</div>
      ) : (
        <section aria-label="游戏封面陈列" className="grid grid-cols-[repeat(auto-fill,minmax(154px,1fr))] gap-x-5 gap-y-9 py-8 sm:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(196px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(212px,1fr))]">
          {sortedGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              formatDuration={formatDuration}
              formatLastPlayed={formatLastPlayed}
              onOpen={() => handleOpenDetail(game.id)}
              onLaunch={() => handleLaunch(game)}
              onEdit={() => {
                setEditingGame(game)
                setFormOpen(true)
              }}
            />
          ))}
        </section>
      )}

      <GameForm open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} game={editingGame} isSaving={createGame.isPending || updateGame.isPending} />
    </div>
  )
}

function GameCard({
  game,
  formatDuration,
  formatLastPlayed,
  onOpen,
  onLaunch,
  onEdit,
}: {
  game: GameWithStats
  formatDuration: (seconds: number) => string
  formatLastPlayed: (value: string | null) => string
  onOpen: () => void
  onLaunch: () => void
  onEdit: () => void
}): React.ReactElement {
  const isInstalled = (game.install_status as InstallStatus) === 'installed'

  return (
    <article className="group relative cursor-pointer select-none" role="button" tabIndex={0} title="单击查看详情，双击启动游戏" onClick={onOpen} onDoubleClick={onLaunch} onKeyDown={(event) => { if (event.key === 'Enter') onOpen() }}>
      <div className="media-frame relative aspect-[2/3] border border-white/[0.085] bg-[#16181b] shadow-[0_16px_34px_rgba(0,0,0,0.34)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-[#c9a35a]/70 group-hover:shadow-[0_24px_44px_rgba(0,0,0,0.48)]">
        {game.cover_path ? (
          <img src={toFileUrl(game.cover_path)} alt={`${game.display_name} 封面`} className="media-image transition-transform duration-500 group-hover:scale-[1.055]" style={getCoverImageStyle(parseCoverCrop(game.cover_crop))} />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#1a1c1f]"><Gamepad2 size={38} className="text-archive-600" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070809] via-[#070809]/12 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <StatusBadge status={game.status as GameStatus} />
          {!isInstalled && <span className="border border-white/[0.15] bg-black/55 px-1.5 py-1 text-[10px] text-archive-200">未安装</span>}
        </div>
        <button type="button" className="absolute right-2.5 top-2.5 border border-white/[0.12] bg-black/55 p-1.5 text-archive-200 opacity-0 transition-all hover:border-[#c9a35a]/70 hover:text-[#ead7aa] group-hover:opacity-100 focus:opacity-100" title="编辑游戏" aria-label={`编辑${game.display_name}`} onClick={(event) => { event.stopPropagation(); onEdit() }} onDoubleClick={(event) => event.stopPropagation()}>
          <Pencil size={13} />
        </button>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="truncate text-[15px] font-medium text-white">{game.display_name}</p>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.11] pt-2 text-[11px] text-archive-300">
            <span className="truncate">{formatDuration(game.total_duration)}</span>
            <span className="shrink-0">{formatLastPlayed(game.last_played_at)}</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-[#c9a35a] px-4 py-2.5 text-xs font-medium text-[#17120a] transition-transform duration-200 group-hover:translate-y-0">
          <span>查看档案</span><ArrowUpRight size={14} />
        </div>
      </div>
    </article>
  )
}
