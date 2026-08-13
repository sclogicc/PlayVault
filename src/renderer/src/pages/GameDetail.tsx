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
  Archive,
  Check,
  LockKeyhole,
} from 'lucide-react'
import type { GameStatus } from '@shared/constants'
import {
  INSTALL_STATUS_LABELS,
  SESSION_END_REASON_LABELS,
} from '@shared/constants'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
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
  const [archivingGame, setArchivingGame] = useState(false)
  const [archiveHighlightIds, setArchiveHighlightIds] = useState<number[]>([])
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

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

  const toggleArchiveHighlight = (screenshotId: number): void => {
    setArchiveHighlightIds((current) => {
      if (current.includes(screenshotId)) return current.filter((id) => id !== screenshotId)
      if (current.length >= 3) return current
      return [...current, screenshotId]
    })
  }

  const handleArchiveGame = async (): Promise<void> => {
    if (activeSession) {
      setArchiveError('请先结束正在进行的自动计时，再封存这段游戏经历。')
      return
    }

    setArchiveError(null)
    setIsArchiving(true)
    try {
      await window.api.game.archive({
        gameId: game.id,
        screenshotIds: archiveHighlightIds,
      })
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['games'] }),
        qc.invalidateQueries({ queryKey: ['screenshots', 'game', game.id] }),
      ])
      setArchivingGame(false)
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : '封存失败，请稍后重试。')
    } finally {
      setIsArchiving(false)
    }
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

    // Explicitly update primary flag for others just in case
    for (const e of exes) {
      if (e.is_primary === 1 && (!executable || e.id !== executable.id)) {
        await window.api.executable.update(e.id, { is_primary: 0 })
      }
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
  const isArchived = game.archive_status === 'archived'
  const archiveCoverPath = game.archive_cover_path || game.cover_path
  const archiveBackgroundPath = game.archive_background_path || game.background_path
  const archiveHighlights = gameScreenshots.filter((shot) => shot.is_archived_highlight === 1)
  const firstPlayedAt = sessions.length > 0
    ? sessions.reduce((earliest, session) => session.started_at < earliest ? session.started_at : earliest, sessions[0].started_at)
    : null
  const latestSessionAt = sessions.length > 0
    ? sessions.reduce((latest, session) => {
      const candidate = session.ended_at ?? session.started_at
      return candidate > latest ? candidate : latest
    }, sessions[0].ended_at ?? sessions[0].started_at)
    : null

  return (
    <div className="min-h-full space-y-8 bg-[#090a0c] px-8 py-8 pb-12 sm:px-12 lg:px-16">
      {/* Back link */}
      <Link
        to={isArchived ? '/archives' : '/games'}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-sm text-archive-400 transition-all hover:border-white/[0.14] hover:bg-white/[0.055] hover:text-archive-100"
      >
        <ChevronLeft size={14} />
        {isArchived ? '返回历史档案' : '返回游戏库'}
      </Link>

      {/* ========== Hero Section ========== */}
      <div className="group relative overflow-hidden border-y border-white/[0.09] bg-archive-850 shadow-[0_20px_46px_rgba(0,0,0,0.3)]">
        {/* 背景图独立于游戏封面，用于营造详情页的沉浸式氛围。 */}
        <div className="media-frame relative flex h-[360px] items-center justify-center bg-gradient-to-br from-archive-800 via-archive-850 to-archive-900 sm:h-[430px] lg:h-[500px]">
          {archiveBackgroundPath ? (
            <CoverImage
              coverPath={archiveBackgroundPath}
              coverCrop={parseCoverCrop(game.background_crop)}
              displayName={`${game.display_name} 背景图`}
            />
          ) : (
            <Gamepad2 size={64} className="text-archive-700" />
          )}
          <div className={isArchived ? 'hidden' : 'absolute right-4 top-4 flex flex-wrap justify-end gap-2 opacity-75 transition-opacity group-hover:opacity-100'}>
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
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,14,22,0.42),transparent_48%,rgba(8,14,22,0.26))]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-archive-950 via-archive-900/88 to-transparent" />
        </div>

        {/* Steam-like transition: the game controls emerge from the background fade. */}
        <div className="relative -mt-32 bg-gradient-to-b from-archive-950/0 via-archive-950/94 to-archive-950 px-6 pb-7 pt-20 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-5 sm:gap-6">
              <div className="media-frame flex w-28 shrink-0 aspect-[2/3] items-center justify-center rounded-[18px] border border-white/[0.18] bg-archive-900 shadow-[0_20px_42px_rgba(0,0,0,0.5)] sm:w-36">
                {archiveCoverPath ? (
                  <CoverImage
                    coverPath={archiveCoverPath}
                    coverCrop={parseCoverCrop(game.cover_crop)}
                    displayName={`${game.display_name} 封面`}
                  />
                ) : (
                  <Gamepad2 size={30} className="text-archive-700" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3.5 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100">{isArchived ? '历史游戏档案' : '个人游戏档案'}</p>
              {/* 名称与状态 */}
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-bold tracking-tight text-archive-50 sm:text-4xl">
                  {game.display_name}
                </h2>
                <StatusBadge status={game.status as GameStatus} />
                {isArchived && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-100">
                    <Archive size={12} />
                    已封存
                  </span>
                )}
              </div>

              <div className={isArchived ? 'hidden' : 'flex flex-wrap gap-2'}>
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
              <div className={isArchived ? 'hidden' : 'flex items-center gap-3 text-sm'}>
                <span className="flex items-center gap-1.5">
                  <HardDrive size={13} className="text-archive-500" />
                  <span className={isInstalled ? 'text-accent-teal font-medium' : 'text-accent-red font-medium'}>
                    {INSTALL_STATUS_LABELS[installStatus as keyof typeof INSTALL_STATUS_LABELS] ?? installStatus}
                  </span>
                </span>
                {primaryExe?.file_path && (
                  <span
                    className="text-archive-500 truncate max-w-[300px] cursor-pointer hover:text-archive-300 underline decoration-archive-700 underline-offset-4"
                    title={primaryExe.file_path}
                    onClick={() => handleOpenFileLocation(primaryExe.file_path)}
                  >
                    {primaryExe.file_path}
                  </span>
                )}
                {!isInstalled && (
                  <span className="flex items-center gap-1 text-accent-red text-xs bg-accent-red/10 px-2 py-0.5 rounded border border-accent-red/20">
                    <AlertTriangle size={12} />
                    路径失效
                  </span>
                )}
              </div>
            </div>
            </div>

            {/* Action buttons */}
            {isArchived ? (
              <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 lg:max-w-[470px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/15 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100">
                  <LockKeyhole size={12} />
                  封存于 {formatDate(game.archived_at)}
                </span>
                <Link to="/timeline" className="btn-secondary rounded-full px-4 py-2 text-sm">
                  <Clock size={15} />
                  查看时间线
                </Link>
                <Link to="/screenshots" className="btn-primary rounded-full px-4 py-2 text-sm">
                  <Image size={15} />
                  打开截图箱
                </Link>
              </div>
            ) : (
            <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 lg:max-w-[470px]">
              {launchStatus && (
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    launchStatus === '游戏已启动'
                      ? 'border-teal-300/15 bg-teal-400/10 text-teal-200'
                      : 'border-red-300/15 bg-red-400/10 text-red-200'
                  }`}
                >
                  {launchStatus}
                </span>
              )}
              {activeSession && (
                <span className="rounded-full border border-teal-300/15 bg-teal-400/10 px-3 py-1.5 text-xs text-teal-200">
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
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200">
                  <CheckCircle size={14} />
                  已通关
                  {game.completed_at && (
                    <span className="text-emerald-500 text-xs ml-1">
                      {formatDate(game.completed_at)}
                    </span>
                  )}
                </span>
              )}
              {!activeSession && (
                <Button variant="secondary" onClick={() => {
                  setArchiveError(null)
                  setArchiveHighlightIds([])
                  setArchivingGame(true)
                }}>
                  <Archive size={16} />
                  封存游戏
                </Button>
              )}
              <Button variant="danger" onClick={() => setDeletingGame(true)}>
                <Trash2 size={16} />
                删除游戏
              </Button>
            </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-5 text-sm sm:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.045] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <span className="text-[11px] font-medium text-archive-500">总时长</span>
              <p className="mt-1 font-mono text-archive-100">
                {formatDuration(totalDuration)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.045] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <span className="text-[11px] font-medium text-archive-500">{isArchived ? '最后游玩' : '最近游玩'}</span>
              <p className="mt-1 text-archive-100">
                {formatRelativeDate(lastPlayedAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.045] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <span className="text-[11px] font-medium text-archive-500">游玩记录</span>
              <p className="mt-1 font-mono text-archive-100">
                {sessions.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.045] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <span className="text-[11px] font-medium text-archive-500">{isArchived ? '封存画面' : '截图收藏'}</span>
              <p className="mt-1 font-mono text-archive-100">
                {isArchived ? archiveHighlights.length : gameScreenshots.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isArchived && (
        <section className="relative overflow-hidden rounded-[24px] border border-amber-300/[0.14] bg-[linear-gradient(135deg,rgba(109,40,217,0.13),rgba(255,255,255,0.025)_42%,rgba(8,14,22,0.16))] p-6 shadow-panel sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">自动生成的回顾</p>
              <h3 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-archive-50"><Archive size={20} className="text-amber-100" /> 这段游戏经历</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-archive-400">无需填写总结。PlayVault 将这段经历中的时间、游玩记录和你选择保留的画面编排为可长期回顾的个人档案。</p>
            </div>
            <aside className="rounded-2xl border border-amber-300/[0.14] bg-archive-950/42 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">封存凭据</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-archive-100"><LockKeyhole size={13} className="text-amber-100" /> 已安全保存</p>
              <p className="mt-1 text-xs leading-5 text-archive-500">封存于 {formatDate(game.archived_at)}<br />保留 {archiveHighlights.length} 张关键画面</p>
            </aside>
          </div>

          <div className="relative mt-6 rounded-2xl border border-white/[0.08] bg-black/[0.18] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-archive-500">经历时间轴</p><span className="text-[11px] text-archive-600">系统根据已有记录自动生成</span></div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
              {[
                { label: '首次启动', value: formatDate(firstPlayedAt), icon: Play },
                { label: '最后一次游玩', value: formatDate(latestSessionAt), icon: Clock },
                { label: '完成封存', value: formatDate(game.archived_at), icon: LockKeyhole },
              ].map(({ label, value, icon: Icon }, index) => (
                <div key={label} className="relative flex items-center gap-3 rounded-xl bg-white/[0.018] px-3 py-2.5 sm:block sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 sm:pr-5">
                  {index < 2 && <span className="absolute left-[13px] top-7 hidden h-px w-[calc(100%-24px)] bg-gradient-to-r from-amber-300/45 to-white/[0.08] sm:block" />}
                  <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-archive-900 text-amber-100"><Icon size={13} /></span>
                  <div className="sm:mt-3.5">
                    <p className="text-xs font-medium text-archive-200">{label}</p>
                    <p className="mt-1 text-xs text-archive-500">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-6 border-t border-white/[0.07] pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-archive-100">封存画面</p>
                <p className="mt-1 text-xs text-archive-500">已复制到 PlayVault 档案目录的精选截图，即使原文件被清理也能回看。</p>
              </div>
              <span className="rounded-full bg-white/[0.055] px-2.5 py-1 text-[11px] text-archive-400">{archiveHighlights.length} / 3 张</span>
            </div>
            {archiveHighlights.length === 0 ? (
              <div className="mt-3 flex min-h-24 items-center justify-center rounded-archive border border-dashed border-white/[0.09] bg-black/[0.12] px-4 text-center text-xs text-archive-500">封存时未选择需要长期保留的截图；原截图仍可在截图箱中查看。</div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
                {archiveHighlights.map((shot) => (
                  <button key={shot.id} type="button" onClick={() => setPreviewIndex(gameScreenshots.findIndex((candidate) => candidate.id === shot.id))} className={`media-frame group relative aspect-video rounded-2xl border border-amber-300/15 bg-archive-900 text-left shadow-[0_10px_24px_rgba(0,0,0,0.18)] ${archiveHighlights.length === 1 ? 'sm:col-span-6' : archiveHighlights.length === 2 ? 'sm:col-span-3' : 'sm:col-span-2'}`}>
                    <img src={toFileUrl(shot.preserved_path || shot.file_path)} alt={shot.file_name} className="media-image transition-transform duration-300 group-hover:scale-[1.04]" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-archive-950/75 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-archive-950/75 p-1.5 text-violet-100 shadow-lg"><Star size={12} fill="currentColor" /></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========== Content Sections ========== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
        {/* Recent Sessions */}
        <div className="card xl:col-span-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-archive-100"><Clock size={15} className="text-amber-100" />{isArchived ? '完整游玩记录' : '最近游玩记录'}</h3><span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[11px] text-archive-400">{sessions.length} 次</span></div>
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
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-3 text-xs transition-colors hover:border-white/[0.11] hover:bg-white/[0.045]"
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
                    <div className={isArchived ? 'hidden' : 'flex items-center gap-1 shrink-0'}>
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
        <div className="card overflow-hidden xl:col-span-7 xl:row-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-archive-100"><Image size={15} className="text-amber-100" />{isArchived ? '全部截图索引' : '最近截图'}</h3><span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[11px] text-archive-400">{gameScreenshots.length} 张</span></div>
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
        <div className="card xl:col-span-5">
          <h3 className="mb-4 text-sm font-semibold text-archive-100">
            {isArchived ? '档案信息' : '游戏信息'}
          </h3>
          <div className="space-y-3 text-sm">
            {game.platform && (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-2.5">
                <span className="w-16 shrink-0 text-xs text-archive-500">平台</span>
                <span className="text-sm font-medium text-archive-200">{game.platform}</span>
              </div>
            )}
            {game.tags && (() => {
              try {
                const tags = JSON.parse(game.tags)
                if (Array.isArray(tags) && tags.length > 0) {
                  return (
                    <div className="flex gap-3 rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-2.5">
                      <span className="w-16 shrink-0 pt-0.5 text-xs text-archive-500">标签</span>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-full border border-white/[0.07] bg-archive-700/45 px-2 py-0.5 text-xs text-archive-300"
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
              <div className="rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-3">
                <span className="text-xs text-archive-500">备注</span>
                <p className="mt-1.5 text-sm leading-6 text-archive-300">{game.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bound Executables */}
        <div className={isArchived ? 'hidden' : 'card xl:col-span-5'}>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-archive-100">
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
                  className="flex items-center justify-between rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-3 transition-colors hover:border-white/[0.11] hover:bg-white/[0.045]"
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

      <Modal
        open={archivingGame}
        onClose={() => {
          if (!isArchiving) setArchivingGame(false)
        }}
        title="封存这段游戏经历"
        width="max-w-3xl"
      >
        <div className="space-y-5">
          <div className="rounded-archive border border-amber-300/15 bg-amber-400/[0.08] px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-amber-400/10 p-2 text-amber-100"><Archive size={17} /></span>
              <div>
                <p className="text-sm font-medium text-archive-100">游戏文件可以清理，PlayVault 档案不会删除。</p>
                <p className="mt-1 text-xs leading-5 text-archive-400">封存后会自动固定累计时长、游玩记录、首次/最后游玩日期与背景封面；游戏将从默认游戏库移入历史档案。</p>
              </div>
            </div>
          </div>

          {gameScreenshots.length > 0 && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-archive-100">可选：保留关键画面</p>
                  <p className="mt-1 text-xs text-archive-500">选择至多 3 张截图，PlayVault 会复制到自己的档案目录。可完全跳过。</p>
                </div>
                <span className="rounded-full bg-white/[0.055] px-2.5 py-1 text-[11px] text-archive-400">已选择 {archiveHighlightIds.length} / 3</span>
              </div>
              <div className="mt-3 grid max-h-[290px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {gameScreenshots.map((shot) => {
                  const selected = archiveHighlightIds.includes(shot.id)
                  const maxed = archiveHighlightIds.length >= 3 && !selected
                  return (
                    <button
                      key={shot.id}
                      type="button"
                      onClick={() => toggleArchiveHighlight(shot.id)}
                      disabled={maxed || isArchiving}
                      className={`media-frame group relative aspect-video rounded-archive border text-left transition-all ${selected ? 'border-amber-300/70 ring-2 ring-amber-300/35' : 'border-white/[0.08] hover:border-white/[0.22]'} ${maxed ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      <img src={toFileUrl(shot.file_path)} alt={shot.file_name} className="media-image transition-transform duration-200 group-hover:scale-[1.03]" />
                      <span className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-violet-200/60 bg-accent-violet text-white' : 'border-white/25 bg-archive-950/70 text-transparent'}`}><Check size={14} strokeWidth={3} /></span>
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-[10px] text-archive-200 opacity-0 transition-opacity group-hover:opacity-100">{formatDate(shot.captured_at)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {archiveError && <p className="rounded-archive border border-red-300/15 bg-red-400/10 px-3 py-2 text-xs text-red-200">{archiveError}</p>}

          <div className="flex flex-wrap justify-end gap-3 border-t border-white/[0.07] pt-4">
            <Button variant="secondary" onClick={() => setArchivingGame(false)} disabled={isArchiving}>暂不封存</Button>
            <Button variant="primary" onClick={handleArchiveGame} disabled={isArchiving}>
              {isArchiving ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}
              确认封存
            </Button>
          </div>
        </div>
      </Modal>

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
          filePath: isArchived && shot.is_archived_highlight === 1 ? (shot.preserved_path || shot.file_path) : shot.file_path,
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
      className="media-image"
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
      className="media-frame group relative aspect-video cursor-pointer rounded-xl border border-white/[0.06] bg-archive-850 shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300/25 hover:shadow-[0_12px_24px_rgba(0,0,0,0.25)]"
      title={shot.file_name}
      onClick={onPreview}
    >
      {!imgError ? (
        <img
          src={toFileUrl(shot.preserved_path || shot.file_path)}
          alt={shot.file_name}
          className="media-image"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <AlertTriangle size={16} className="text-archive-600" />
        </div>
      )}
      {shot.is_archived_highlight === 1 && (
        <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-archive-950/75 p-1.5 text-violet-100 shadow-lg"><Star size={11} fill="currentColor" /></span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-archive-950/90 to-transparent px-2 pb-1.5 pt-7 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="truncate text-[10px] text-archive-200">{shot.file_name}</p>
      </div>
    </div>
  )
}
