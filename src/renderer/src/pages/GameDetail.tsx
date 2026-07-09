import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Screenshot } from '@shared/types'
import {
  Monitor,
  Clock,
  Play,
  Square,
  Trash2,
  Star,
  Loader2,
  ChevronLeft,
  Image,
} from 'lucide-react'
import type { GameStatus } from '@shared/constants'
import { SESSION_END_REASON_LABELS } from '@shared/constants'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useGame, useGameExecutables } from '../hooks/useGames'
import { useSessions, useSessionMutations } from '../hooks/useSessions'
import { useState } from 'react'

export default function GameDetail(): React.ReactElement {
  const { gameId } = useParams<{ gameId: string }>()
  const id = gameId ? parseInt(gameId) : null

  const { data: game, isLoading: gameLoading } = useGame(id)
  const { data: exes = [], isLoading: exesLoading } = useGameExecutables(id)
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(id)
  const { deleteSession, endManually } = useSessionMutations()
  const { data: gameScreenshots = [] } = useQuery<Screenshot[]>({
    queryKey: ['screenshots', 'game', id],
    queryFn: () => window.api.screenshot.getByGameId(id!),
    enabled: id !== null && id > 0,
  })

  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)

  if (gameLoading) {
    return (
      <div className="card text-center py-12">
        <Loader2 size={24} className="animate-spin text-archive-500 mx-auto mb-3" />
        <p className="text-archive-500">加载中...</p>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="card text-center py-12">
        <p className="text-archive-500">游戏不存在</p>
        <Link
          to="/games"
          className="text-accent-teal text-sm mt-2 inline-block hover:underline"
        >
          返回游戏库
        </Link>
      </div>
    )
  }

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/games"
        className="inline-flex items-center gap-1 text-sm text-archive-400 hover:text-archive-200 transition-colors"
      >
        <ChevronLeft size={14} />
        返回游戏库
      </Link>

      {/* Game Info Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-archive-100">
                {game.display_name}
              </h2>
              <StatusBadge status={game.status as GameStatus} />
              {!game.is_enabled && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-archive-600/30 text-archive-500">
                  已停用监控
                </span>
              )}
            </div>
            {game.display_name !== game.name && (
              <p className="text-sm text-archive-500 font-mono">
                系统名: {game.name}
              </p>
            )}
          </div>
        </div>

        {/* Game metadata */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {game.platform && (
            <span className="text-archive-400">
              平台: <span className="text-archive-200">{game.platform}</span>
            </span>
          )}
          {game.tags && JSON.parse(game.tags).length > 0 && (
            <span className="text-archive-400">
              标签:{' '}
              {JSON.parse(game.tags).map((t: string, i: number) => (
                <span
                  key={i}
                  className="text-archive-200 bg-archive-700/50 px-1.5 py-0.5 rounded mr-1"
                >
                  {t}
                </span>
              ))}
            </span>
          )}
        </div>
        {game.notes && (
          <p className="text-sm text-archive-500 mt-3 border-t border-archive-700/30 pt-3">
            {game.notes}
          </p>
        )}
      </div>

      {/* Bound Executables */}
      <div className="card">
        <h3 className="text-sm font-medium text-archive-200 mb-3 flex items-center gap-2">
          <Monitor size={14} />
          绑定的可执行文件
        </h3>
        {exesLoading ? (
          <p className="text-xs text-archive-500">加载中...</p>
        ) : exes.length === 0 ? (
          <p className="text-xs text-archive-500">暂未绑定可执行文件</p>
        ) : (
          <div className="space-y-1.5">
            {exes.map((exe) => (
              <div
                key={exe.id}
                className="flex items-center justify-between py-2 px-3 bg-archive-850 rounded"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-archive-200 font-mono">
                      {exe.exe_name}
                    </span>
                    {exe.is_primary === 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-teal/15 text-accent-teal flex items-center gap-0.5">
                        <Star size={8} />
                        主程序
                      </span>
                    )}
                  </div>
                  {exe.install_path_hint && (
                    <p className="text-xs text-archive-500 mt-0.5 truncate">
                      {exe.install_path_hint}
                    </p>
                  )}
                </div>
                <span className="text-xs text-archive-500">
                  {exe.is_ignored ? '已忽略' : '监控中'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <h3 className="text-sm font-medium text-archive-200 mb-3 flex items-center gap-2">
          <Clock size={14} />
          最近游玩记录
        </h3>
        {sessionsLoading ? (
          <p className="text-xs text-archive-500">加载中...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-archive-500">暂无游玩记录</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.slice(0, 10).map((s) => {
              const endReason =
                (s as unknown as Record<string, unknown>).end_reason as string | undefined
              let endLabel = ''
              if (s.ended_at && endReason) {
                endLabel =
                  SESSION_END_REASON_LABELS[
                    endReason as keyof typeof SESSION_END_REASON_LABELS
                  ] ?? endReason
              }
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2 px-3 bg-archive-850 rounded text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-archive-200 font-mono">
                      {s.exe_name}
                    </span>
                    <span className="text-archive-500 text-xs">
                      {formatDate(s.started_at)}
                    </span>
                    {s.ended_at ? (
                      <span className="text-archive-500 text-xs">
                        → {formatDate(s.ended_at)}
                      </span>
                    ) : (
                      <span className="text-accent-teal text-xs flex items-center gap-1">
                        <Play size={10} className="animate-pulse" />
                        进行中
                      </span>
                    )}
                    <span className="text-archive-300 font-mono">
                      {formatDuration(s.duration_seconds)}
                    </span>
                    {endLabel && (
                      <span className="text-archive-600 text-[10px]">
                        · {endLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!s.ended_at && (
                      <button
                        onClick={() =>
                          endManually.mutate({ id: s.id, gameId: game.id })
                        }
                        className="p-1 text-archive-400 hover:text-accent-teal transition-colors rounded"
                        title="手动结束"
                      >
                        <Square size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingSessionId(s.id)}
                      className="p-1 text-archive-500 hover:text-accent-red transition-colors rounded"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Screenshot Wall */}
      <div className="card">
        <h3 className="text-sm font-medium text-archive-200 mb-3 flex items-center gap-2">
          <Image size={14} />
          截图 ({gameScreenshots.length})
        </h3>
        {gameScreenshots.length === 0 ? (
          <p className="text-xs text-archive-500">暂无截图</p>
        ) : (
          <div className="grid grid-cols-6 gap-2">
            {gameScreenshots.slice(0, 24).map((shot) => (
              <div
                key={shot.id}
                className="aspect-video bg-archive-850 rounded overflow-hidden flex items-center justify-center relative group"
                title={shot.file_name}
              >
                <Image size={20} className="text-archive-700" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] text-archive-300 truncate">
                    {shot.file_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Session Confirmation */}
      <ConfirmDialog
        open={deletingSessionId !== null}
        onClose={() => setDeletingSessionId(null)}
        onConfirm={() => {
          if (deletingSessionId !== null) {
            deleteSession.mutate({
              id: deletingSessionId,
              gameId: game.id,
            })
            setDeletingSessionId(null)
          }
        }}
        title="确认删除游玩记录"
        message="删除后将不可恢复。"
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  )
}
