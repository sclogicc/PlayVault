import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  Image,
  Gamepad2,
} from 'lucide-react'
import type { GameWithStats, GameFormData } from '@shared/types'
import { GAME_STATUSES, type GameStatus } from '@shared/constants'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import GameForm from '../components/games/GameForm'
import {
  useGames,
  useGameMutations,
} from '../hooks/useGames'

export default function Games(): React.ReactElement {
  const {
    games,
    isLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
  } = useGames()
  const { createGame, updateGame, deleteGame, toggleGame } = useGameMutations()

  const [formOpen, setFormOpen] = useState(false)
  const [editingGame, setEditingGame] = useState<GameWithStats | null>(null)
  const [deletingGame, setDeletingGame] = useState<GameWithStats | null>(null)

  const statusFilterOptions = [
    { value: '全部', label: '全部' },
    ...GAME_STATUSES.map((s) => ({ value: s, label: s })),
  ]

  const handleCreate = (): void => {
    setEditingGame(null)
    setFormOpen(true)
  }

  const handleEdit = (game: GameWithStats): void => {
    setEditingGame(game)
    setFormOpen(true)
  }

  const handleSave = (data: GameFormData): void => {
    if (editingGame) {
      updateGame.mutate(
        { id: editingGame.id, data },
        { onSuccess: () => setFormOpen(false) },
      )
    } else {
      createGame.mutate(data, { onSuccess: () => setFormOpen(false) })
    }
  }

  const handleDelete = (): void => {
    if (deletingGame) {
      deleteGame.mutate(deletingGame.id)
      setDeletingGame(null)
    }
  }

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '从未游玩'
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
    return d.toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-archive-100">游戏库</h2>
          <p className="text-sm text-archive-500 mt-0.5">
            {games.length} 个游戏
          </p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={16} />
          添加游戏
        </Button>
      </div>

      {/* Search & Filter Bar */}
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-archive border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/30'
                  : 'bg-archive-800 text-archive-400 border-archive-700/50 hover:text-archive-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Table */}
      {isLoading ? (
        <div className="card text-center py-12">
          <p className="text-archive-500">加载中...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="card text-center py-16">
          <Gamepad2
            size={48}
            className="text-archive-700 mx-auto mb-4"
          />
          <h3 className="text-lg font-medium text-archive-400 mb-2">
            还没有游戏
          </h3>
          <p className="text-archive-600 text-sm mb-4">
            添加你的第一个游戏，开始记录游玩时长和整理截图
          </p>
          <Button variant="primary" onClick={handleCreate}>
            <Plus size={16} />
            添加游戏
          </Button>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-archive-700/50">
                <th className="table-header">游戏</th>
                <th className="table-header">状态</th>
                <th className="table-header">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    时长
                  </div>
                </th>
                <th className="table-header">最后游玩</th>
                <th className="table-header">
                  <div className="flex items-center gap-1">
                    <Image size={12} />
                    截图
                  </div>
                </th>
                <th className="table-header w-[80px]">监控</th>
                <th className="table-header w-[100px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr
                  key={game.id}
                  className={`hover:bg-archive-800/50 transition-colors ${
                    !game.is_enabled ? 'opacity-50' : ''
                  }`}
                >
                  {/* Game name */}
                  <td className="table-cell">
                    <Link
                      to={`/games/${game.id}`}
                      className="text-archive-100 hover:text-accent-teal transition-colors font-medium"
                    >
                      {game.display_name}
                    </Link>
                    {game.display_name !== game.name && (
                      <p className="text-xs text-archive-500 mt-0.5 font-mono">
                        {game.name}
                      </p>
                    )}
                  </td>

                  {/* Status */}
                  <td className="table-cell">
                    <StatusBadge status={game.status as GameStatus} />
                  </td>

                  {/* Duration */}
                  <td className="table-cell font-mono text-archive-200">
                    {formatDuration(game.total_duration)}
                  </td>

                  {/* Last played */}
                  <td className="table-cell text-archive-400">
                    {formatDate(game.last_played_at)}
                  </td>

                  {/* Screenshot count */}
                  <td className="table-cell font-mono text-archive-300">
                    {game.screenshot_count}
                  </td>

                  {/* Toggle */}
                  <td className="table-cell">
                    <button
                      onClick={() => toggleGame.mutate(game.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        game.is_enabled ? 'bg-accent-teal/60' : 'bg-archive-600'
                      }`}
                      title={game.is_enabled ? '已启用监控' : '已停用监控'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          game.is_enabled
                            ? 'translate-x-4'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(game)}
                        className="p-1.5 text-archive-500 hover:text-archive-200 transition-colors rounded"
                        title="编辑"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingGame(game)}
                        className="p-1.5 text-archive-500 hover:text-accent-red transition-colors rounded"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Game Form Modal */}
      <GameForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        game={editingGame}
        isSaving={createGame.isPending || updateGame.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingGame}
        onClose={() => setDeletingGame(null)}
        onConfirm={handleDelete}
        title="确认删除游戏"
        message={
          deletingGame
            ? `确定要删除「${deletingGame.display_name}」吗？该游戏的所有可执行文件绑定和游玩记录也将被删除。此操作不可恢复。`
            : ''
        }
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  )
}
