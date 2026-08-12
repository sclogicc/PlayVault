import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, Pencil, Plus, Search } from 'lucide-react'
import type { GameLaunchResult, GameWithStats, GameFormData } from '@shared/types'
import type { InstallStatus } from '@shared/constants'
import { getCoverImageStyle, parseCoverCrop } from '@shared/coverCrop'
import Button from '../components/ui/Button'
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

  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return '尚未游玩'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours === 0) return `${minutes} 分钟`
    return `${hours} 小时 ${minutes} 分钟`
  }

  const formatLastPlayed = (value: string | null): string => {
    if (!value) return '从未游玩'
    return new Date(value.replace(' ', 'T')).toLocaleDateString('zh-CN')
  }

  const handleCreate = (): void => {
    setEditingGame(null)
    setFormOpen(true)
  }

  const handleSave = (data: GameFormData): void => {
    if (editingGame) {
      updateGame.mutate(
        { id: editingGame.id, data },
        { onSuccess: () => setFormOpen(false) },
      )
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
      setLaunchStatus(`「${game.display_name}」未安装或路径失效，无法启动。`)
      return
    }

    const result: GameLaunchResult = await window.api.game.launch(game.id)
    setLaunchStatus(
      result.success
        ? `已启动「${game.display_name}」`
        : result.error ?? `无法启动「${game.display_name}」`,
    )
    window.setTimeout(() => setLaunchStatus(null), 4000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-archive-100">全部游戏</h2>
          <p className="text-sm text-archive-500 mt-0.5">{games.length} 个游戏</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={16} />
          添加游戏
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-archive-500"
          />
          <input
            type="text"
            className="input-field w-full pl-9"
            placeholder="搜索游戏名称、别名..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="input-field w-auto text-sm"
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

      {launchStatus && (
        <p className="rounded-archive border border-archive-700/50 bg-archive-850 px-3 py-2 text-sm text-archive-200">
          {launchStatus}
        </p>
      )}

      {isLoading ? (
        <p className="py-16 text-center text-sm text-archive-500">加载游戏库...</p>
      ) : games.length === 0 ? (
        <div className="card py-16 text-center">
          <Gamepad2 size={34} className="mx-auto mb-3 text-archive-600" />
          <p className="text-archive-300">这里还没有游戏</p>
          <p className="mt-1 text-sm text-archive-500">添加游戏或从“发现候选”中导入。</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
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
    <div
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
      <div className="aspect-[2/3] overflow-hidden rounded-archive border border-archive-700/50 bg-archive-850 shadow-card transition duration-200 group-hover:-translate-y-1 group-hover:border-accent-teal/60 group-hover:shadow-lg">
        {game.cover_path ? (
          <img
            src={toFileUrl(game.cover_path)}
            alt={`${game.display_name} 封面`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            style={getCoverImageStyle(parseCoverCrop(game.cover_crop))}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-archive-800 to-archive-950">
            <Gamepad2 size={42} className="text-archive-600" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-archive-950 via-archive-950/90 to-transparent px-3 pb-3 pt-12 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <p className="truncate text-sm font-semibold text-archive-100">{game.display_name}</p>
          <p className="mt-1 text-xs text-archive-300">总时长：{formatDuration(game.total_duration)}</p>
          <p className="text-xs text-archive-400">最近游玩：{formatLastPlayed(game.last_played_at)}</p>
        </div>

        {!isInstalled && (
          <span className="absolute left-2 top-2 rounded bg-archive-950/85 px-1.5 py-0.5 text-[10px] text-archive-300">
            未安装
          </span>
        )}

        <button
          type="button"
          className="absolute right-2 top-2 rounded bg-archive-950/85 p-1.5 text-archive-300 opacity-0 transition hover:text-accent-teal group-hover:opacity-100 focus:opacity-100"
          title="编辑游戏"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Pencil size={13} />
        </button>
      </div>
      <p className="mt-2 truncate text-sm text-archive-300 group-hover:text-archive-100">{game.display_name}</p>
    </div>
  )
}
