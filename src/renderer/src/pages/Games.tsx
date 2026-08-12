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

  const {
    games,
    isLoading,
    search,
    setSearch,
  } = useGames()
  const { createGame, updateGame } = useGameMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<GameWithStats | null>(null)

  useEffect(() => {
    return () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current)
    }
  }, [])

  const sortedGames = [...games].sort((a, b) => {
    if (sortBy === 'name') return a.display_name.localeCompare(b.display_name, 'zh-CN')
    if (sortBy === 'duration') return b.total_duration - a.total_duration
    if (sortBy === 'added') return b.created_at.localeCompare(a.created_at)
    return (b.last_played_at ?? '').localeCompare(a.last_played_at ?? '')
  })

  const summary = {
    inProgress: games.filter((game) => game.status === 'in_progress').length,
    completed: games.filter((game) => game.status === 'completed').length,
  }

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

    const installStatus = game.install_status as InstallStatus
    if (installStatus !== 'installed') {
      setLaunchStatus(`「${game.display_name}」未安装或路径失效，暂时无法启动。`)
      return
    }

    const result: GameLaunchResult = await window.api.game.launch(game.id)
    setLaunchStatus(result.success ? `已启动「${game.display_name}」` : result.error ?? `无法启动「${game.display_name}」`)
    window.setTimeout(() => setLaunchStatus(null), 4000)
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-violet">游戏收藏</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-archive-50">我的游戏库</h2>
          <p className="mt-2 text-sm text-archive-400">用封面、游玩记录和截图保存每一段游戏经历。</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={16} />
          添加游戏
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <LibraryInsight label="已建立档案" value={`${games.length}`} description="个本地游戏" />
        <LibraryInsight label="正在游玩" value={`${summary.inProgress}`} description="个游戏进行中" />
        <LibraryInsight label="已完成" value={`${summary.completed}`} description="段故事已通关" />
      </section>

      <section className="surface-toolbar flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-archive-500" />
          <input
            type="text"
            className="input-field w-full pl-10"
            placeholder="搜索游戏名称或别名…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-archive-500" />
          <select
            className="input-field w-auto min-w-[132px] cursor-pointer py-2.5 text-sm"
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
        <div className="flex items-center gap-2 rounded-archive border border-violet-300/15 bg-violet-400/10 px-4 py-3 text-sm text-violet-100 animate-soft-enter">
          <Play size={15} className="text-violet-300" />
          {launchStatus}
        </div>
      )}

      {isLoading ? (
        <div className="empty-state">
          <p className="text-sm text-archive-500">正在载入游戏库…</p>
        </div>
      ) : games.length === 0 ? (
        <div className="empty-state">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200">
            <Gamepad2 size={28} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-archive-200">这里还没有游戏档案</h3>
          <p className="mt-2 text-sm text-archive-500">添加游戏，或从“发现候选”中将本地可执行文件加入档案馆。</p>
          <Button className="mt-5" variant="primary" onClick={handleCreate}>
            <Plus size={16} /> 添加第一款游戏
          </Button>
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="empty-state">
          <Search size={26} className="mx-auto text-archive-600" />
          <p className="mt-3 text-sm text-archive-400">没有找到匹配的游戏</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(166px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(188px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(202px,1fr))]">
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
        </div>
      )}

      <GameForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        game={editingGame}
        isSaving={createGame.isPending || updateGame.isPending}
      />
    </div>
  )
}

function LibraryInsight({ label, value, description }: { label: string; value: string; description: string }): React.ReactElement {
  return (
    <div className="rounded-panel border border-white/[0.065] bg-white/[0.035] px-5 py-4">
      <p className="text-xs font-medium text-archive-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight text-archive-50">{value}</p>
        <p className="text-xs text-archive-400">{description}</p>
      </div>
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
  const installStatus = game.install_status as InstallStatus
  const isInstalled = installStatus === 'installed'

  return (
    <article
      className="group relative cursor-pointer select-none"
      role="button"
      tabIndex={0}
      title="单击查看详情，双击启动游戏"
      onClick={onOpen}
      onDoubleClick={onLaunch}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen()
      }}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[15px] border border-white/[0.085] bg-archive-850 shadow-[0_14px_30px_rgba(0,0,0,0.26)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-violet-300/50 group-hover:shadow-glow">
        {game.cover_path ? (
          <img
            src={toFileUrl(game.cover_path)}
            alt={`${game.display_name} 封面`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            style={getCoverImageStyle(parseCoverCrop(game.cover_crop))}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_32%_8%,rgba(139,92,246,0.3),transparent_45%),linear-gradient(155deg,#26364d,#101824)]">
            <Gamepad2 size={42} className="text-archive-500" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-archive-950 via-archive-950/14 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <StatusBadge status={game.status as GameStatus} />
          {!isInstalled && <span className="rounded-full border border-white/[0.12] bg-black/45 px-2 py-1 text-[10px] font-medium text-archive-200 backdrop-blur-sm">未安装</span>}
        </div>
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full border border-white/[0.12] bg-black/35 p-2 text-archive-200 opacity-0 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white group-hover:opacity-100 focus:opacity-100"
          title="编辑游戏"
          aria-label={`编辑${game.display_name}`}
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Pencil size={13} />
        </button>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="truncate text-[15px] font-semibold text-white">{game.display_name}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-archive-300">
            <span className="truncate">{formatDuration(game.total_duration)}</span>
            <span className="shrink-0">{formatLastPlayed(game.last_played_at)}</span>
          </div>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-between opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="rounded-full bg-accent-violet px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(109,40,217,0.35)]">查看档案</span>
          <span className="rounded-full border border-white/[0.12] bg-black/35 p-1.5 text-white backdrop-blur-sm"><ArrowUpRight size={14} /></span>
        </div>
      </div>
    </article>
  )
}
