/* 视觉基线：详情页以 16:9 背景舞台为核心，留档和编辑层沿用冷墨玻璃材质，不回退暖金提示。 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Screenshot, GameLaunchResult } from '@shared/types'
import type { CoverCrop } from '@shared/coverCrop'
import { parseCoverCrop, serializeCoverCrop } from '@shared/coverCrop'
import type { BackdropCrop } from '@shared/backdropCrop'
import { parseBackdropCrop, serializeBackdropCrop } from '@shared/backdropCrop'
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
  ExternalLink,
  FolderSearch,
  Archive,
  Check,
  Heart,
  EyeOff,
} from 'lucide-react'
import {
  SESSION_END_REASON_LABELS,
} from '@shared/constants'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import ImageViewer from '../components/ui/ImageViewer'
import CoverCropEditor from '../components/games/CoverCropEditor'
import BackdropEditor from '../components/media/BackdropEditor'
import BackdropStage from '../components/media/BackdropStage'
import CoverFrame from '../components/media/CoverFrame'
import ScreenshotFrame from '../components/media/ScreenshotFrame'
import { useGame, useGameExecutables } from '../hooks/useGames'
import { useSessions, useSessionMutations } from '../hooks/useSessions'
import {
  SCREENSHOT_GRID_CLASS,
  SCREENSHOT_PANEL_SCROLL_CLASS,
  SESSION_PANEL_SCROLL_CLASS,
} from '../lib/gameDetailPanelLayout'
import { getGameRecordCompleteness, RECORD_FIELD_LABELS } from '../lib/gameRecordCompleteness'

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
  const [archiveNote, setArchiveNote] = useState('')
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

  const handleToggleFavorite = async (): Promise<void> => {
    await window.api.game.update(game.id, { is_favorite: game.is_favorite === 1 ? 0 : 1 })
    await qc.invalidateQueries({ queryKey: ['games'] })
  }

  const handleToggleHidden = async (): Promise<void> => {
    await window.api.game.update(game.id, { is_hidden: game.is_hidden === 1 ? 0 : 1 })
    await qc.invalidateQueries({ queryKey: ['games'] })
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

  const handleSaveCoverCrop = async (crop: CoverCrop): Promise<void> => {
    await window.api.game.update(game.id, { cover_crop: serializeCoverCrop(crop) })
    await qc.invalidateQueries({ queryKey: ['games'] })
    setMediaEditorMode(null)
  }

  const handleSaveBackdropCrop = async (crop: BackdropCrop): Promise<void> => {
    await window.api.game.update(game.id, { background_crop: serializeBackdropCrop(crop) })
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
        archiveNote,
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
  const lastPlayedAt = sessions.length > 0 ? sessions[0].ended_at : null
  const isArchived = game.archive_status === 'archived'
  const archiveCoverPath = game.archive_cover_path || game.cover_path
  const archiveBackgroundPath = game.archive_background_path || game.background_path
  const archiveHighlights = gameScreenshots.filter((shot) => shot.is_archived_highlight === 1)
  const archivePrimaryHighlight = archiveHighlights.find((shot) => shot.id === game.archive_primary_screenshot_id) ?? archiveHighlights[0]
  const archiveSecondaryHighlights = archiveHighlights.filter((shot) => shot.id !== archivePrimaryHighlight?.id)
  const firstPlayedAt = sessions.length > 0
    ? sessions.reduce((earliest, session) => session.started_at < earliest ? session.started_at : earliest, sessions[0].started_at)
    : null
  const latestSessionAt = sessions.length > 0
    ? sessions.reduce((latest, session) => {
      const candidate = session.ended_at ?? session.started_at
      return candidate > latest ? candidate : latest
    }, sessions[0].ended_at ?? sessions[0].started_at)
    : null
  const recordCompleteness = getGameRecordCompleteness({
    cover_path: game.cover_path,
    background_path: game.background_path,
    notes: game.notes,
    screenshot_count: gameScreenshots.length,
    exe_count: exes.length,
  })
  const missingRecordLabels = recordCompleteness.missing.map((field) => RECORD_FIELD_LABELS[field])
  const gameType = (() => {
    try {
      const tags = JSON.parse(game.tags || '[]')
      if (Array.isArray(tags) && typeof tags[0] === 'string' && tags[0].trim()) return tags[0]
    } catch { /* ignore invalid tag data */ }
    return game.platform || '本地单机'
  })()

  return (
    <div className="content-canvas scene-archive-detail min-h-full space-y-8 bg-[var(--pv-void)] px-7 py-8 pb-14 transition-colors duration-300 sm:px-10 sm:py-9 lg:px-12">
      {/* Back link */}
      <Link
        to="/games"
        className="inline-flex items-center gap-1.5 border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[13px] text-archive-400 transition-[border-color,background-color,color,transform] duration-200 hover:-translate-x-px hover:border-white/[0.14] hover:bg-white/[0.055] hover:text-archive-100"
      >
        <ChevronLeft size={14} />
返回游戏库
      </Link>

      {/* 已确认的详情舞台：以 NVIDIA 1920×1080 对应的 16:9 为背景基线，信息叠在同一场景中。 */}
      <div className="scene-archive-detail-stage group relative overflow-hidden border border-white/[0.09] bg-[var(--pv-surface)] transition-colors duration-300">
        {/* 背景图独立于封面；组件内部会在更换图片时淡入，原图尺寸不再影响舞台比例。 */}
        <BackdropStage
          filePath={archiveBackgroundPath}
          crop={game.background_crop}
          alt={`${game.display_name} 背景图`}
          className="detail-stage-backdrop"
        />

        <div className="relative -mt-[28%] bg-gradient-to-b from-transparent via-[var(--pv-surface)]/90 to-[var(--pv-surface)] px-5 pb-7 pt-11 sm:px-7 sm:pb-8">
          <div className="scene-archive-detail-top flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-5 sm:gap-7">
              <CoverFrame
                filePath={archiveCoverPath}
                crop={game.cover_crop}
                alt={`${game.display_name} 封面`}
                className="flex w-[92px] shrink-0 items-center justify-center border border-white/[0.15] bg-archive-900 shadow-[0_16px_34px_rgba(0,0,0,0.34)] sm:w-[112px]"
                fallback={<Gamepad2 size={30} className="text-archive-700" />}
              />
              <div className="min-w-0 flex-1 pt-2">
                <h2 className="font-serif text-[2rem] font-medium leading-none tracking-[-0.04em] text-archive-50 sm:text-[2.65rem]">
                  {game.display_name}
                </h2>
                <p className="mt-2 text-[13px] text-archive-300">{gameType}</p>
                <div className="detail-stage-duration">
                  <Clock size={12} />
                  <span>游玩时长</span>
                  <strong>{formatDuration(totalDuration)}</strong>
                </div>
              </div>
            </div>

            {/* 仅保留日常记录动作；媒体和删除维护收进次级管理区，避免头部变成按钮墙。 */}
            <div className="scene-archive-detail-actions flex max-w-full shrink-0 flex-col items-stretch gap-3.5 lg:w-[360px]">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isArchived && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[#c7e4ee]/18 bg-[#c7e4ee]/[0.07] px-3 py-1.5 text-xs text-[#dceff6]">
                    <Archive size={12} />
                    留档于 {formatDate(game.archived_at)}
                  </span>
                )}
                {activeSession && <span className="border border-teal-300/15 bg-teal-400/10 px-3 py-1.5 text-xs text-teal-200">正在自动记录</span>}
              </div>
              {launchStatus && (
                <p className={`border px-3 py-2 text-xs ${launchStatus === '游戏已启动' ? 'border-teal-300/15 bg-teal-400/10 text-teal-200' : 'border-red-300/15 bg-red-400/10 text-red-200'}`}>{launchStatus}</p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button className="detail-stage-action-primary" variant="primary" onClick={handleLaunch} disabled={!isInstalled} title={!isInstalled ? '游戏未安装或路径失效' : '启动游戏'}>
                  <Play size={16} />启动游戏
                </Button>
                {activeSession && (
                  <Button variant="secondary" size="sm" onClick={() => endManually.mutate({ id: activeSession.id, gameId: game.id })} disabled={endManually.isPending} title="异常兜底：正常退出游戏后，PlayVault 会自动结束计时">
                    <Square size={16} />停止计时
                  </Button>
                )}
                {!isInstalled && <Button variant="secondary" onClick={handleRelink}><FolderSearch size={16} />重新绑定</Button>}
                {!isCompleted ? (
                  <Button className="detail-stage-action-secondary" variant="secondary" onClick={() => setCompletingGame(true)}><CheckCircle size={16} />确认已通关</Button>
                ) : (
                  <span className="flex items-center gap-1.5 border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200"><CheckCircle size={14} />已通关</span>
                )}
                {!activeSession && !isArchived && (
                  <Button variant="secondary" onClick={() => { setArchiveError(null); setArchiveHighlightIds([]); setArchiveNote(''); setArchivingGame(true) }}><Archive size={16} />生成留档</Button>
                )}
              </div>
              <details className="border-t border-white/[0.07] pt-3 text-right">
                <summary className="cursor-pointer select-none text-xs text-archive-500 transition-colors hover:text-[#dceff6]">整理、媒体与档案</summary>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => void handleToggleFavorite()}><Heart size={14} fill={game.is_favorite === 1 ? 'currentColor' : 'none'} />{game.is_favorite === 1 ? '取消收藏' : '收藏游戏'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => void handleToggleHidden()}><EyeOff size={14} />{game.is_hidden === 1 ? '取消隐藏' : '隐藏游戏'}</Button>
                  <Button variant="ghost" size="sm" onClick={handleSetCover}><Image size={14} />{game.cover_path ? '更换封面' : '设置封面'}</Button>
                  {game.cover_path && <Button variant="ghost" size="sm" onClick={() => handleAdjustMedia('cover')}>调整封面</Button>}
                  {game.cover_path && <Button variant="ghost" size="sm" onClick={handleRemoveCover}>移除封面</Button>}
                  <Button variant="ghost" size="sm" onClick={handleSetBackground}><Image size={14} />{game.background_path ? '更换背景' : '设置背景'}</Button>
                  {game.background_path && <Button variant="ghost" size="sm" onClick={() => handleAdjustMedia('background')}>调整背景</Button>}
                  {game.background_path && <Button variant="ghost" size="sm" onClick={handleRemoveBackground}>移除背景</Button>}
                  <Button variant="danger" size="sm" onClick={() => setDeletingGame(true)}><Trash2 size={14} />删除游戏</Button>
                </div>
              </details>
            </div>
          </div>

          {/* 时间已归属于标题下方；底部只保留回看维度。 */}
          <div className="scene-archive-detail-evidence mt-7 grid grid-cols-3 gap-px border-t border-white/[0.07] bg-white/[0.07] pt-5 text-sm">
            <div className="bg-[var(--pv-raised)] px-4 py-3.5 transition-colors duration-300">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-archive-500">最近游玩</span>
              <p className="mt-1 text-archive-100">
                {formatRelativeDate(lastPlayedAt)}
              </p>
            </div>
            <div className="bg-[var(--pv-raised)] px-4 py-3.5 transition-colors duration-300">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-archive-500">游玩记录</span>
              <p className="mt-1 font-mono text-archive-100">
                {sessions.length}
              </p>
            </div>
            <div className="bg-[var(--pv-raised)] px-4 py-3.5 transition-colors duration-300">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-archive-500">{isArchived ? '留档精选' : '截图收藏'}</span>
              <p className="mt-1 font-mono text-archive-100">
                {isArchived ? archiveHighlights.length : gameScreenshots.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {recordCompleteness.missing.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-4 border border-white/[0.075] bg-white/[0.02] px-5 py-4.5">
          <div><p className="text-[15px] font-medium tracking-[-0.01em] text-archive-200">这份记录还可以补充 {recordCompleteness.missing.length} 项资料</p><p className="mt-1.5 text-xs leading-5 text-archive-500">缺少：{missingRecordLabels.join('、')}。这只是回看提示，不影响继续游玩、留档或删除。</p></div>
          {!isArchived && <Button variant="secondary" size="sm" onClick={() => { setArchiveError(null); setArchiveHighlightIds([]); setArchiveNote(''); setArchivingGame(true) }}><Archive size={14} />生成留档</Button>}
        </section>
      )}

      {isArchived && (
        <section className="pv-panel px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">游玩留档</p>
              <h3 className="mt-2 flex items-center gap-2 font-serif text-[1.45rem] font-medium leading-none tracking-[-0.025em] text-archive-100"><Archive size={17} className="text-[#c7e4ee]" />这段游戏经历已保留</h3>
              <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-archive-500">留档不会改变游戏的启动、编辑或继续记录权限。它只保留此刻的游玩资料与精选画面。</p>
            </div>
            <span className="rounded-md border border-[#c7e4ee]/24 bg-[#c7e4ee]/[0.06] px-2.5 py-1 text-xs text-[#dceff6]">留档于 {formatDate(game.archived_at)}</span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-px border-y border-white/[0.07] bg-white/[0.07] sm:grid-cols-3">
            <div className="bg-[var(--pv-raised)]/72 px-4 py-3"><p className="text-[11px] text-archive-500">首次游玩</p><p className="mt-1 text-sm text-archive-200">{formatDate(firstPlayedAt)}</p></div>
            <div className="bg-[var(--pv-raised)]/72 px-4 py-3"><p className="text-[11px] text-archive-500">最后游玩</p><p className="mt-1 text-sm text-archive-200">{formatDate(latestSessionAt)}</p></div>
            <div className="bg-[var(--pv-raised)]/72 px-4 py-3"><p className="text-[11px] text-archive-500">保留画面</p><p className="mt-1 text-sm text-archive-200">{archiveHighlights.length} 张</p></div>
          </div>

          {archivePrimaryHighlight && (
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(220px,0.75fr)]">
              <button type="button" onClick={() => setPreviewIndex(gameScreenshots.findIndex((candidate) => candidate.id === archivePrimaryHighlight.id))} className="group relative block overflow-hidden rounded-lg border border-[#c7e4ee]/22 bg-black text-left transition-colors hover:border-[#c7e4ee]/58">
                <ScreenshotFrame filePath={archivePrimaryHighlight.preserved_path || archivePrimaryHighlight.file_path} alt={archivePrimaryHighlight.file_name} className="aspect-[16/9]" imageClassName="transition-transform duration-500 group-hover:scale-[1.025]" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent px-4 pb-4 pt-16"><span className="rounded-md border border-[#c7e4ee]/38 bg-[#0a121b]/55 px-2 py-1 text-[10px] text-[#dceff6] backdrop-blur">回忆主画面</span>{game.archive_note && <p className="mt-2 max-w-xl text-sm leading-6 text-archive-100">“{game.archive_note}”</p>}</div>
              </button>
              <div className="flex min-h-0 flex-col gap-3 border border-white/[0.07] bg-black/[0.12] p-3"><div className="flex items-center justify-between"><p className="text-xs font-medium text-archive-300">补充画面</p><span className="text-[10px] text-archive-600">点击查看原图</span></div>{archiveSecondaryHighlights.length > 0 ? <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-1">{archiveSecondaryHighlights.map((shot) => <button key={shot.id} type="button" onClick={() => setPreviewIndex(gameScreenshots.findIndex((candidate) => candidate.id === shot.id))} className="group relative block overflow-hidden border border-white/[0.08] bg-archive-900 text-left transition-colors hover:border-white/[0.24]"><ScreenshotFrame filePath={shot.preserved_path || shot.file_path} alt={shot.file_name} className="aspect-[16/9]" imageClassName="transition-transform duration-300 group-hover:scale-[1.04]" /></button>)}</div> : <p className="py-6 text-xs leading-5 text-archive-600">没有补充画面。主画面会独立保留这段经历。</p>}</div>
            </div>
          )}
          {!archivePrimaryHighlight && game.archive_note && <blockquote className="mt-5 border-l-2 border-[#c7e4ee]/55 bg-black/[0.12] px-4 py-3 text-sm leading-6 text-archive-300">“{game.archive_note}”</blockquote>}
        </section>
      )}

      {/* ========== Journal Sections ========== */}
      <div className="grid grid-cols-1 gap-7 xl:grid-cols-12 xl:items-start">
        {/* Play log */}
        <div className="card p-6 xl:col-span-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="section-title flex items-center gap-2"><Clock size={15} className="text-[var(--pv-accent-strong)]" />游玩轨迹</h3><p className="section-description">每次启动和结束都会安静留在这里。</p></div><span className="border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[11px] text-archive-400">{sessions.length} 次</span></div>
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
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-3.5 text-xs transition-[border-color,background-color,transform] duration-200 hover:translate-x-px hover:border-white/[0.11] hover:bg-white/[0.045]"
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

        {/* Screenshot archive */}
        <div className="card overflow-hidden p-6 xl:col-span-7">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="section-title flex items-center gap-2"><Image size={15} className="text-[var(--pv-accent-strong)]" />截图留存</h3><p className="section-description">点击任意画面以原图方式回看。</p></div><span className="border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[11px] text-archive-400">{gameScreenshots.length} 张</span></div>
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

        {/* Game notes */}
        <div className="card p-6 xl:col-span-6">
          <div className="mb-5"><h3 className="section-title">游戏资料</h3><p className="section-description">为以后回看留下的私人补充信息。</p></div>
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

        {/* Bound executables */}
        <div className="card p-6 xl:col-span-6">
          <div className="mb-5"><h3 className="section-title flex items-center gap-2"><Monitor size={14} className="text-[var(--pv-accent-strong)]" />可执行文件</h3><p className="section-description">本地启动路径与备用程序都保存在设备上。</p></div>
          {exesLoading ? (
            <p className="text-xs text-archive-500">加载中...</p>
          ) : exes.length === 0 ? (
            <p className="text-xs text-archive-500">暂未绑定可执行文件</p>
          ) : (
            <div className="space-y-1.5">
              {exes.map((exe) => (
                <div
                  key={exe.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.055] bg-white/[0.025] px-3 py-3.5 transition-[border-color,background-color,transform] duration-200 hover:translate-x-px hover:border-white/[0.11] hover:bg-white/[0.045]"
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
        title="生成游玩留档"
        width="max-w-3xl"
        footer={<div className="flex flex-wrap justify-end gap-2.5"><Button variant="secondary" onClick={() => setArchivingGame(false)} disabled={isArchiving}>暂不留档</Button><Button variant="primary" onClick={handleArchiveGame} disabled={isArchiving}>{isArchiving ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}生成留档</Button></div>}
      >
        <div className="space-y-5">
          <div className="rounded-archive border border-[#c7e4ee]/18 bg-[#c7e4ee]/[0.07] px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-[#c7e4ee]/12 p-2 text-[#dceff6]"><Archive size={17} /></span>
              <div>
                <p className="text-sm font-medium text-archive-100">为这段经历生成可长期回顾的留档。</p>
                <p className="mt-1 text-xs leading-5 text-archive-400">留档会保存当前的累计时长、游玩记录、首次/最后游玩日期与精选画面，但不会改变游戏在游戏库中的位置，也不会限制启动或编辑。</p>
              </div>
            </div>
          </div>

          <div><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-medium text-archive-100">可选：留下一句话</p><p className="mt-1 text-xs text-archive-500">它会作为这次留档的私人短感想保存，不会替代游戏备注。</p></div><span className="text-[11px] text-archive-600">{archiveNote.length} / 600</span></div><textarea value={archiveNote} maxLength={600} onChange={(event) => setArchiveNote(event.target.value)} placeholder="例如：这段旅程最想记住的是什么？" className="mt-3 min-h-20 w-full resize-y rounded-lg border border-white/[0.09] bg-black/[0.16] px-3 py-2.5 text-sm leading-6 text-archive-200 outline-none placeholder:text-archive-600 focus:border-[#c7e4ee]/60" /></div>

          {gameScreenshots.length > 0 && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-archive-100">可选：保留关键画面</p>
                  <p className="mt-1 text-xs text-archive-500">选择至多 3 张截图。第一张会成为回忆卡主画面，其余作为补充画面；可完全跳过。</p>
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
                      className={`group relative block w-full text-left ${maxed ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      <ScreenshotFrame
                        filePath={shot.file_path}
                        alt={shot.file_name}
                        className={`rounded-archive border transition-all ${selected ? 'border-[#c7e4ee]/70 ring-2 ring-[#c7e4ee]/30' : 'border-white/[0.08] group-hover:border-white/[0.22]'}`}
                        imageClassName="transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                      <span className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-violet-200/60 bg-accent-violet text-white' : 'border-white/25 bg-archive-950/70 text-transparent'}`}><Check size={14} strokeWidth={3} /></span>
                      {selected && archiveHighlightIds[0] === shot.id && <span className="absolute left-2 top-2 rounded-md border border-[#c7e4ee]/48 bg-[#0a121b]/72 px-1.5 py-1 text-[10px] text-[#dceff6]">主画面</span>}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-[10px] text-archive-200 opacity-0 transition-opacity group-hover:opacity-100">{formatDate(shot.captured_at)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {archiveError && <p className="rounded-archive border border-red-300/15 bg-red-400/10 px-3 py-2 text-xs text-red-200">{archiveError}</p>}

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
        message={`确定要删除「${game.display_name}」的 PlayVault 档案吗？可执行文件绑定和游玩记录会一并删除；截图会保留在截图箱中，但会取消归类。不会删除硬盘中的游戏文件。${!isArchived && (gameScreenshots.length > 0 || sessions.length > 0) ? `\n\n这段经历尚未生成游玩留档${missingRecordLabels.length > 0 ? `，且还缺少：${missingRecordLabels.join('、')}` : ''}。如果希望保留回看资料，可先取消并生成留档。` : ''}`}
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
        open={mediaEditorMode === 'cover'}
        filePath={mediaEditorPath}
        initialCrop={parseCoverCrop(game.cover_crop)}
        aspectRatio="2 / 3"
        title="调整游戏封面"
        onClose={() => setMediaEditorMode(null)}
        onSave={handleSaveCoverCrop}
      />
      <BackdropEditor
        open={mediaEditorMode === 'background'}
        filePath={mediaEditorPath}
        initialCrop={parseBackdropCrop(game.background_crop)}
        onClose={() => setMediaEditorMode(null)}
        onSave={handleSaveBackdropCrop}
      />
    </div>
  )
}

// ========== Helper Components ==========

function ScreenshotThumb({
  shot,
  onPreview,
}: {
  shot: Screenshot
  onPreview: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      className="group block w-full text-left"
      title={shot.file_name}
      onClick={onPreview}
    >
      <ScreenshotFrame
        filePath={shot.preserved_path || shot.file_path}
        alt={shot.file_name}
        className="relative cursor-pointer rounded-xl border border-white/[0.06] bg-archive-850 shadow-[0_8px_18px_rgba(0,0,0,0.14)] transition-[transform,border-color,box-shadow] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-[var(--pv-accent)]/35 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.25)]"
      >
        {shot.is_archived_highlight === 1 && (
          <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-archive-950/75 p-1.5 text-violet-100 shadow-lg"><Star size={11} fill="currentColor" /></span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-archive-950/90 to-transparent px-2 pb-1.5 pt-7 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="truncate text-[10px] text-archive-200">{shot.file_name}</p>
        </div>
      </ScreenshotFrame>
    </button>
  )
}
