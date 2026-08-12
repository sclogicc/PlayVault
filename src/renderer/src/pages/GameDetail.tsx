import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Screenshot, GameLaunchResult } from '@shared/types'
import type { CoverCrop } from '@shared/coverCrop'
import { getCoverImageStyle, parseCoverCrop, serializeCoverCrop } from '@shared/coverCrop'
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
  Gamepad2,
  CheckCircle,
  HardDrive,
  AlertTriangle,
  ExternalLink,
  FolderSearch,
} from 'lucide-react'
import type { GameStatus } from '@shared/constants'
import {
  INSTALL_STATUS_LABELS,
  SESSION_END_REASON_LABELS,
} from '@shared/constants'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Button from '../components/ui/Button'
import ImageViewer from '../components/ui/ImageViewer'
import CoverCropEditor from '../components/games/CoverCropEditor'
import { useGame, useGameExecutables } from '../hooks/useGames'
import { useSessions, useSessionMutations } from '../hooks/useSessions'
import { toFileUrl } from '../lib/fileUrl'
import {
  SCREENSHOT_GRID_CLASS,
  SCREENSHOT_PANEL_SCROLL_CLASS,
  SESSION_PANEL_SCROLL_CLASS,
} from '../lib/gameDetailPanelLayout'

export default function GameDetail(): React.ReactElement {
  const { gameId } = useParams<{ gameId: string }>()
  const id = gameId ? parseInt(gameId) : null
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: game, isLoading: gameLoading } = useGame(id)
  const { data: exes = [], isLoading: exesLoading } = useGameExecutables(id)
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(id)
  const { deleteSession, endManually } = useSessionMutations()
  const { data: gameScreenshots = [] } = useQuery<Screenshot[]>({
    queryKey: ['screenshots', 'game', id],
    queryFn: () => window.api.screenshot.getByGameId(id!),
    enabled: id !== null && id > 0,
  })

  const activeSession = sessions.find((session) => !session.ended_at)
  const [clockNow, setClockNow] = useState(() => Date.now())
  useEffect(() => {
    if (!activeSession) return

    setClockNow(Date.now())
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeSession?.id])

  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const [deletingGame, setDeletingGame] = useState(false)
  const [completingGame, setCompletingGame] = useState(false)
  const [launchStatus, setLaunchStatus] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [mediaEditorMode, setMediaEditorMode] = useState<'cover' | 'background' | null>(null)
  const [mediaEditorPath, setMediaEditorPath] = useState('')

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
    if (h === 0) return `${m} 分钟`
    return `${h} 小时 ${m} 分钟`
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

  const formatRelativeDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '从未游玩'
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`
    return d.toLocaleDateString('zh-CN')
  }

  const handleLaunch = async (): Promise<void> => {
    setLaunchStatus(null)
    const result: GameLaunchResult = await window.api.game.launch(game.id)
    if (result.success) {
      setLaunchStatus('游戏已启动')
      // Refresh install status
      qc.invalidateQueries({ queryKey: ['games'] })
    } else {
      setLaunchStatus(result.error ?? '启动失败')
    }
    setTimeout(() => setLaunchStatus(null), 4000)
  }

  const handleComplete = async (): Promise<void> => {
    await window.api.game.complete(game.id)
    qc.invalidateQueries({ queryKey: ['games'] })
    setCompletingGame(false)
  }

  const handleOpenFileLocation = (filePath: string): void => {
    window.api.file.openLocation(filePath)
  }

  const handleSetCover = async (): Promise<void> => {
    const coverPath = await window.api.dialog.openImage()
    if (!coverPath) return

    await window.api.game.update(game.id, {
      cover_path: coverPath,
      cover_crop: '',
    })
    await qc.invalidateQueries({ queryKey: ['games'] })
    setMediaEditorPath(coverPath)
    setMediaEditorMode('cover')
  }

  const handleRemoveCover = async (): Promise<void> => {
    await window.api.game.update(game.id, {
      cover_path: '',
      cover_crop: '',
    })
    await qc.invalidateQueries({ queryKey: ['games'] })
  }

  const handleSetBackground = async (): Promise<void> => {
    const backgroundPath = await window.api.dialog.openImage()
    if (!backgroundPath) return

    await window.api.game.update(game.id, {
      background_path: backgroundPath,
      background_crop: '',
    })
    await qc.invalidateQueries({ queryKey: ['games'] })
    setMediaEditorPath(backgroundPath)
    setMediaEditorMode('background')
  }

  const handleRemoveBackground = async (): Promise<void> => {
    await window.api.game.update(game.id, {
      background_path: '',
      background_crop: '',
    })
    await qc.invalidateQueries({ queryKey: ['games'] })
  }

  const handleAdjustMedia = (mode: 'cover' | 'background'): void => {
    setMediaEditorPath(mode === 'cover' ? game.cover_path : game.background_path)
    setMediaEditorMode(mode)
  }

  const handleSaveMediaCrop = async (crop: CoverCrop): Promise<void> => {
    if (!mediaEditorMode) return

    await window.api.game.update(game.id, {
      [mediaEditorMode === 'cover' ? 'cover_crop' : 'background_crop']:
        serializeCoverCrop(crop),
    })
    await qc.invalidateQueries({ queryKey: ['games'] })
    setMediaEditorMode(null)
  }

  const handleDeleteGame = async (): Promise<void> => {
    await window.api.game.delete(game.id)
    await qc.invalidateQueries({ queryKey: ['games'] })
    navigate('/games')
  }

  const handleRelink = async (): Promise<void> => {
    const filePath = await window.api.dialog.openExecutable()
    if (!filePath) return

    const exeName = filePath.split(/[\\/]/).pop() ?? filePath
    const installPathHint = filePath.replace(/[\\/][^\\/]+$/, "")
    const executable = exes.find((exe) => exe.is_primary === 1)
    if (executable) {
      await window.api.executable.update(executable.id, {
        exe_name: exeName,
        file_path: filePath,
        install_path_hint: installPathHint,
        is_primary: 1,
      })
    } else {
      await window.api.executable.add({
        game_id: game.id,
        exe_name: exeName,
        file_path: filePath,
        install_path_hint: installPathHint,
        is_primary: 1,
      })
    }

    await window.api.game.checkInstall(game.id)
    await qc.invalidateQueries({ queryKey: ["executables", game.id] })
    await qc.invalidateQueries({ queryKey: ["games"] })
    setLaunchStatus("可执行文件路径已更新")
    setTimeout(() => setLaunchStatus(null), 4000)
  }

  const getSessionDuration = (startedAt: string, endedAt: string | null, storedSeconds: number): number => {
    if (storedSeconds > 0) return storedSeconds

    const startedMs = new Date(startedAt.replace(' ', 'T')).getTime()
    const endedMs = endedAt
      ? new Date(endedAt.replace(' ', 'T')).getTime()
      : clockNow
    if (Number.isNaN(startedMs) || Number.isNaN(endedMs)) return 0
    return Math.max(0, Math.floor((endedMs - startedMs) / 1000))
  }

  const totalDuration = sessions.reduce(
    (sum, session) => sum + getSessionDuration(
      session.started_at,
      session.ended_at,
      session.duration_seconds,
    ),
    0,
  )
  const installStatus = (game as unknown as Record<string, unknown>).install_status as string ?? 'installed'
  const isInstalled = installStatus === 'installed'
  const isCompleted = game.status === 'completed'
  const primaryExe = exes.find((e) => e.is_primary === 1)
  const lastPlayedAt = sessions.length > 0 ? sessions[0].ended_at : null

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

      {/* ========== Hero Section ========== */}
      <div className="card overflow-hidden !p-0">
        {/* Background artwork is intentionally separate from the game cover. */}
        <div className="h-[250px] sm:h-[300px] lg:h-[340px] bg-gradient-to-br from-archive-800 via-archive-850 to-archive-900 flex items-center justify-center relative overflow-hidden">
          {game.background_path ? (
            <CoverImage
              coverPath={game.background_path}
              coverCrop={parseCoverCrop(game.background_crop)}
              displayName={`${game.display_name} 背景图`}
            />
          ) : (
            <Gamepad2 size={64} className="text-archive-700" />
          )}
          <div className="absolute right-3 top-3 flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleSetBackground}>
              <Image size={14} />
              {game.background_path ? '更换背景图' : '设置背景图'}
            </Button>
            {game.background_path && (
              <Button variant="secondary" size="sm" onClick={() => handleAdjustMedia('background')}>
                调整背景图
              </Button>
            )}
            {game.background_path && (
              <Button variant="ghost" size="sm" onClick={handleRemoveBackground}>
                移除背景图
              </Button>
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-archive-900 via-archive-900/75 to-transparent" />
        </div>

        {/* Steam-like transition: the game controls emerge from the background fade. */}
        <div className="relative -mt-24 bg-gradient-to-b from-archive-900/0 via-archive-900 to-archive-900 px-6 pb-6 pt-12">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-5 flex-1 min-w-0">
              <div className="w-24 shrink-0 aspect-[2/3] overflow-hidden rounded border border-archive-700/60 bg-archive-900 flex items-center justify-center">
                {game.cover_path ? (
                  <CoverImage
                    coverPath={game.cover_path}
                    coverCrop={parseCoverCrop(game.cover_crop)}
                    displayName={`${game.display_name} 封面`}
                  />
                ) : (
                  <Gamepad2 size={30} className="text-archive-700" />
                )}
              </div>
              <div className="space-y-2 flex-1 min-w-0">
              {/* Name + Status */}
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-archive-100">
                  {game.display_name}
                </h2>
                <StatusBadge status={game.status as GameStatus} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleSetCover}>
                  <Image size={14} />
                  {game.cover_path ? '更换封面' : '设置封面'}
                </Button>
                {game.cover_path && (
                  <Button variant="secondary" size="sm" onClick={() => handleAdjustMedia('cover')}>
                    调整封面
                  </Button>
                )}
                {game.cover_path && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveCover}>
                    移除封面
                  </Button>
                )}
              </div>

              {game.display_name !== game.name && (
                <p className="text-sm text-archive-500 font-mono">
                  系统名: {game.name}
                </p>
              )}

              {/* Install + Path */}
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <HardDrive size={13} className="text-archive-500" />
                  <span className={isInstalled ? 'text-accent-teal' : 'text-accent-red'}>
                    {INSTALL_STATUS_LABELS[installStatus as keyof typeof INSTALL_STATUS_LABELS] ?? installStatus}
                  </span>
                </span>
                {primaryExe?.file_path && (
                  <span
                    className="text-archive-500 truncate max-w-[300px] cursor-pointer hover:text-archive-300"
                    title={primaryExe.file_path}
                    onClick={() => handleOpenFileLocation(primaryExe.file_path)}
                  >
                    {primaryExe.file_path}
                  </span>
                )}
                {!isInstalled && (
                  <span className="flex items-center gap-1 text-accent-red text-xs">
                    <AlertTriangle size={12} />
                    游戏未安装或路径失效
                  </span>
                )}
              </div>
            </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {launchStatus && (
                <span
                  className={`text-xs px-3 py-1.5 rounded-archive ${
                    launchStatus === '游戏已启动'
                      ? 'bg-accent-teal/15 text-accent-teal'
                      : 'bg-accent-red/10 text-accent-red'
                  }`}
                >
                  {launchStatus}
                </span>
              )}
              {activeSession && (
                <span className="text-xs px-3 py-1.5 rounded-archive bg-accent-teal/15 text-accent-teal">
                  正在自动记录
                </span>
              )}
              <Button
                variant="primary"
                onClick={handleLaunch}
                disabled={!isInstalled}
                title={!isInstalled ? '游戏未安装或路径失效' : '启动游戏'}
              >
                <Play size={16} />
                启动游戏
              </Button>
              {activeSession && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    endManually.mutate({ id: activeSession.id, gameId: game.id })
                  }
                  disabled={endManually.isPending}
                  title="异常兜底：正常退出游戏后，PlayVault 会自动结束计时"
                >
                  <Square size={16} />
                  停止计时
                </Button>
              )}
              {!isInstalled && (
                <Button variant="secondary" onClick={handleRelink}>
                  <FolderSearch size={16} />
                  重新绑定可执行文件
                </Button>
              )}
              {!isCompleted ? (
                <Button
                  variant="secondary"
                  onClick={() => setCompletingGame(true)}
                >
                  <CheckCircle size={16} />
                  确认已通关
                </Button>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-archive bg-emerald-900/30 text-emerald-300 border border-emerald-700/30">
                  <CheckCircle size={14} />
                  已通关
                  {game.completed_at && (
                    <span className="text-emerald-500 text-xs ml-1">
                      {formatDate(game.completed_at)}
                    </span>
                  )}
                </span>
              )}
              <Button variant="danger" onClick={() => setDeletingGame(true)}>
                <Trash2 size={16} />
                删除游戏
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-archive-700/30 text-sm">
            <div>
              <span className="text-archive-500">总时长</span>
              <p className="text-archive-200 font-mono mt-0.5">
                {formatDuration(totalDuration)}
              </p>
            </div>
            <div>
              <span className="text-archive-500">最近游玩</span>
              <p className="text-archive-200 mt-0.5">
                {formatRelativeDate(lastPlayedAt)}
              </p>
            </div>
            <div>
              <span className="text-archive-500">Session 数</span>
              <p className="text-archive-200 font-mono mt-0.5">
                {sessions.length}
              </p>
            </div>
            <div>
              <span className="text-archive-500">截图</span>
              <p className="text-archive-200 font-mono mt-0.5">
                {gameScreenshots.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Content Sections ========== */}
      <div className="grid grid-cols-1 gap-6">
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
            <div className={`${SESSION_PANEL_SCROLL_CLASS} space-y-1`}>
              {sessions.map((s) => {
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
                    className="flex items-center justify-between gap-2 py-1.5 px-2.5 bg-archive-850 rounded text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                      <span className="text-archive-200 font-mono shrink-0">
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
                        {formatDuration(getSessionDuration(s.started_at, s.ended_at, s.duration_seconds))}
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
                          title="停止计时（正常退出游戏会自动结束）"
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
            最近截图 ({gameScreenshots.length})
          </h3>
          {gameScreenshots.length === 0 ? (
            <p className="text-xs text-archive-500">暂无截图</p>
          ) : (
            <div className={SCREENSHOT_PANEL_SCROLL_CLASS}>
              <div className={SCREENSHOT_GRID_CLASS}>
                {gameScreenshots.map((shot, index) => (
                  <ScreenshotThumb
                    key={shot.id}
                    shot={shot}
                    onPreview={() => setPreviewIndex(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Game Info + Notes */}
        <div className="card">
          <h3 className="text-sm font-medium text-archive-200 mb-3">
            游戏信息
          </h3>
          <div className="space-y-2 text-sm">
            {game.platform && (
              <div className="flex gap-2">
                <span className="text-archive-500 w-16 shrink-0">平台</span>
                <span className="text-archive-200">{game.platform}</span>
              </div>
            )}
            {game.tags && (() => {
              try {
                const tags = JSON.parse(game.tags)
                if (Array.isArray(tags) && tags.length > 0) {
                  return (
                    <div className="flex gap-2">
                      <span className="text-archive-500 w-16 shrink-0">标签</span>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs bg-archive-700/50 text-archive-300 px-1.5 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                }
              } catch { /* invalid JSON */ }
              return null
            })()}
            {game.notes && (
              <div className="flex gap-2">
                <span className="text-archive-500 w-16 shrink-0">备注</span>
                <span className="text-archive-300">{game.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bound Executables */}
        <div className="card">
          <h3 className="text-sm font-medium text-archive-200 mb-3 flex items-center gap-2">
            <Monitor size={14} />
            可执行文件
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
                  <div className="flex-1 min-w-0">
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
                    {exe.file_path && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-xs text-archive-500 truncate">
                          {exe.file_path}
                        </p>
                        <button
                          onClick={() => handleOpenFileLocation(exe.file_path)}
                          className="text-archive-600 hover:text-archive-300 shrink-0"
                          title="打开位置"
                        >
                          <ExternalLink size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-archive-500 shrink-0 ml-3">
                    {exe.is_ignored ? '已忽略' : '监控中'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* Complete Game Confirmation */}
      <ConfirmDialog
        open={completingGame}
        onClose={() => setCompletingGame(false)}
        onConfirm={handleComplete}
        title="确认已通关"
        message={`确定要将「${game.display_name}」标记为已通关吗？\n通关后状态不会因继续游玩而自动回退。`}
        confirmLabel="确认已通关"
        variant="primary"
      />

      <ConfirmDialog
        open={deletingGame}
        onClose={() => setDeletingGame(false)}
        onConfirm={handleDeleteGame}
        title="确认删除游戏"
        message={`确定要删除「${game.display_name}」的 PlayVault 档案吗？可执行文件绑定和游玩记录会一并删除；截图会保留在截图箱中，但会取消归类。不会删除硬盘中的游戏文件。`}
        confirmLabel="删除游戏"
        variant="danger"
      />

      <ImageViewer
        open={previewIndex !== null}
        items={gameScreenshots.map((shot) => ({
          filePath: shot.file_path,
          fileName: shot.file_name,
        }))}
        activeIndex={previewIndex ?? 0}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
      />
      <CoverCropEditor
        open={mediaEditorMode !== null}
        filePath={mediaEditorPath}
        initialCrop={parseCoverCrop(
          mediaEditorMode === 'cover' ? game.cover_crop : game.background_crop,
        )}
        aspectRatio={mediaEditorMode === 'cover' ? '2 / 3' : '16 / 9'}
        title={mediaEditorMode === 'cover' ? '调整游戏封面' : '调整游戏背景图'}
        onClose={() => setMediaEditorMode(null)}
        onSave={handleSaveMediaCrop}
      />
    </div>
  )
}

// ========== Helper Components ==========

function CoverImage({
  coverPath,
  coverCrop,
  displayName,
}: {
  coverPath: string
  coverCrop: CoverCrop
  displayName: string
}): React.ReactElement {
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
  }, [coverPath])

  if (error) {
    return <Gamepad2 size={64} className="text-archive-700" />
  }

  return (
    <img
      src={toFileUrl(coverPath)}
      alt={displayName}
      className="w-full h-full object-cover"
      style={getCoverImageStyle(coverCrop)}
      onError={() => setError(true)}
    />
  )
}

function ScreenshotThumb({
  shot,
  onPreview,
}: {
  shot: Screenshot
  onPreview: () => void
}): React.ReactElement {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className="aspect-video bg-archive-850 rounded overflow-hidden relative group cursor-pointer"
      title={shot.file_name}
      onClick={onPreview}
    >
      {!imgError ? (
        <img
          src={toFileUrl(shot.file_path)}
          alt={shot.file_name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <AlertTriangle size={16} className="text-archive-600" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[9px] text-archive-300 truncate">
          {shot.file_name}
        </p>
      </div>
    </div>
  )
}
