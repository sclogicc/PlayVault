import { useState, useEffect, type KeyboardEvent } from 'react'
import {
  FolderPlus,
  Trash2,
  Scan,
  Power,
  PowerOff,
  Loader2,
  Clock,
  Image,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Camera,
  Download,
  Grid2X2,
  List,
  SlidersHorizontal,
  ArrowDownAZ,
  ArrowUpDown,
  Palette,
} from 'lucide-react'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import {
  useScanRoots,
  useScanRootMutations,
  useTriggerScan,
} from '../hooks/useSettings'
import type { VaultHealthReport, VaultLocation } from '@shared/vault'
import type { GameCaptureStatus } from '@shared/capture'
import type { UpdateStatus } from '@shared/update'
import { useLibraryViewPreferences } from '../hooks/useLibraryViewPreferences'
import type { LibraryDensity, LibraryLayout, LibrarySort } from '../lib/libraryView'
import { useAppearanceTheme, type AppearanceTheme } from '../hooks/useAppearanceTheme'

export default function Settings(): React.ReactElement {
  const { roots, isLoading } = useScanRoots()
  const { create, remove, toggle } = useScanRootMutations()
  const triggerScan = useTriggerScan()
  const { preferences: libraryPreferences, isReady: libraryPreferencesReady, updatePreferences: updateLibraryPreferences } = useLibraryViewPreferences()
  const { theme, isReady: themeReady, updateTheme } = useAppearanceTheme()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [screenshotDir, setScreenshotDir] = useState<string>('')
  const [screenshotDirLoading, setScreenshotDirLoading] = useState(true)
  const [vaultLocation, setVaultLocation] = useState<VaultLocation | null>(null)
  const [vaultHealth, setVaultHealth] = useState<VaultHealthReport | null>(null)
  const [vaultLoading, setVaultLoading] = useState(true)
  const [vaultError, setVaultError] = useState<string>('')
  const [gameCaptureStatus, setGameCaptureStatus] = useState<GameCaptureStatus | null>(null)
  const [gameCaptureLoading, setGameCaptureLoading] = useState(true)
  const [recordingCaptureShortcut, setRecordingCaptureShortcut] = useState(false)
  const [captureShortcutHint, setCaptureShortcutHint] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)

  useEffect(() => {
    window.api.setting.get('screenshot_dir').then((val) => {
      if (val) setScreenshotDir(val)
      setScreenshotDirLoading(false)
    })
  }, [])

  const refreshVaultInfo = async (): Promise<void> => {
    setVaultLoading(true)
    setVaultError('')
    try {
      const [location, health] = await Promise.all([
        window.api.vault.getLocation(),
        window.api.vault.getHealth(),
      ])
      setVaultLocation(location)
      setVaultHealth(health)
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : '无法读取档案库状态')
    } finally {
      setVaultLoading(false)
    }
  }

  useEffect(() => {
    void refreshVaultInfo()
  }, [])

  useEffect(() => {
    let alive = true
    void window.api.gameCapture.getStatus().then((status) => {
      if (alive) {
        setGameCaptureStatus(status)
        setGameCaptureLoading(false)
      }
    })
    const unsubscribe = window.api.gameCapture.onStatusChange((status) => {
      if (alive) {
        setGameCaptureStatus(status)
        setGameCaptureLoading(false)
      }
    })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const handleAdd = async (): Promise<void> => {
    const dir = await window.api.dialog.openDirectory()
    if (dir) {
      create.mutate({ path: dir })
    }
  }

  const handleScreenshotDir = async (): Promise<void> => {
    const dir = await window.api.dialog.openDirectory()
    if (dir) {
      await window.api.setting.set('screenshot_dir', dir)
      setScreenshotDir(dir)
    }
  }

  const handleClearScreenshotDir = async (): Promise<void> => {
    await window.api.setting.set('screenshot_dir', '')
    setScreenshotDir('')
  }

  const handleGameCaptureEnabled = async (enabled: boolean): Promise<void> => {
    setGameCaptureLoading(true)
    try {
      const status = await window.api.gameCapture.setEnabled(enabled)
      setGameCaptureStatus(status)
    } finally {
      setGameCaptureLoading(false)
    }
  }

  const handleCaptureShortcutKeyDown = async (event: KeyboardEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault()
    const modifierKey = ['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)
    if (modifierKey) return

    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key.toUpperCase()
    const isLetterOrNumber = /^[A-Z0-9]$/.test(key)
    const isFunctionKey = /^F([1-9]|1[0-2])$/.test(key)
    if (!isLetterOrNumber && !isFunctionKey) {
      setCaptureShortcutHint('请按字母、数字或 F1–F12，并同时按住 Ctrl、Alt 或 Shift。')
      return
    }

    const modifiers = [
      event.ctrlKey ? 'Ctrl' : '',
      event.altKey ? 'Alt' : '',
      event.shiftKey ? 'Shift' : '',
    ].filter(Boolean)
    if (modifiers.length === 0) {
      setCaptureShortcutHint('为避免与游戏按键冲突，请同时按住 Ctrl、Alt 或 Shift。')
      return
    }

    const accelerator = [...modifiers, key].join('+')
    setRecordingCaptureShortcut(false)
    setCaptureShortcutHint('正在检测快捷键冲突…')
    setGameCaptureLoading(true)
    try {
      const status = await window.api.gameCapture.setAccelerator(accelerator)
      setGameCaptureStatus(status)
      setCaptureShortcutHint(status.state === 'error' ? '该组合键未生效，原快捷键已保留。' : '')
    } finally {
      setGameCaptureLoading(false)
    }
  }

  const handleCheckForUpdate = async (): Promise<void> => {
    setUpdateLoading(true)
    try {
      setUpdateStatus(await window.api.update.check())
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleApplyUpdate = async (): Promise<void> => {
    setUpdateLoading(true)
    try {
      setUpdateStatus(await window.api.update.trigger())
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleRelocateVault = async (): Promise<void> => {
    setVaultError('')
    setVaultLoading(true)
    try {
      const location = await window.api.vault.relocate()
      if (location) {
        setVaultLocation(location)
        const health = await window.api.vault.getHealth()
        setVaultHealth(health)
      }
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : '档案库迁移失败')
    } finally {
      setVaultLoading(false)
    }
  }

  const handleScan = (): void => {
    triggerScan.mutate()
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '从未扫描'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="pv-page space-y-5 transition-colors duration-300">
      <header className="pv-page-header"><div><p className="eyebrow">私人资料设置</p><h1 className="pv-page-title">设置</h1><p className="pv-page-copy">调整资料库的浏览方式，并管理本地扫描、截图和留档位置。所有记录与偏好都只保留在这台设备上。</p></div></header>

      <section className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.07] pb-5">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-archive-200"><Grid2X2 size={16} />外观与资料库</h3>
            <p className="mt-1 text-sm text-archive-500">控制游戏库默认显示方式。更改会立即生效，并保存在本地。</p>
          </div>
          {!libraryPreferencesReady && <span className="text-xs text-archive-600">正在读取偏好…</span>}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-medium text-archive-400">界面主题</p>{!themeReady && <span className="text-[11px] text-archive-600">正在读取主题…</span>}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ThemeChoice active={theme === 'warm-charcoal'} onClick={() => void updateTheme('warm-charcoal')} theme="warm-charcoal" title="石墨" description="偏中性的石墨深色，适合降低媒体内容的视觉侵入。" />
              <ThemeChoice active={theme === 'night-ink'} onClick={() => void updateTheme('night-ink')} theme="night-ink" title="夜墨" description="冷静的蓝墨深色，让信息和媒体保持清晰边界。" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-archive-400">浏览方式</p>
            <div className="flex gap-2"><PreferenceChoice active={libraryPreferences.layout === 'grid'} onClick={() => updateLibraryPreferences({ layout: 'grid' as LibraryLayout })} icon={<Grid2X2 size={15} />} label="封面网格" /><PreferenceChoice active={libraryPreferences.layout === 'list'} onClick={() => updateLibraryPreferences({ layout: 'list' as LibraryLayout })} icon={<List size={15} />} label="紧凑列表" /></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-archive-400">卡片密度</p>
            <div className="flex gap-2"><PreferenceChoice active={libraryPreferences.density === 'comfortable'} onClick={() => updateLibraryPreferences({ density: 'comfortable' as LibraryDensity })} icon={<Grid2X2 size={15} />} label="舒展" /><PreferenceChoice active={libraryPreferences.density === 'compact'} onClick={() => updateLibraryPreferences({ density: 'compact' as LibraryDensity })} icon={<List size={15} />} label="紧凑" /></div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-archive-400"><SlidersHorizontal size={13} />默认排序</p>
            <select value={libraryPreferences.sortBy} onChange={(event) => updateLibraryPreferences({ sortBy: event.target.value as LibrarySort })} className="w-full rounded-lg border border-white/[0.09] bg-black/[0.16] px-3 py-2 text-sm text-archive-200 outline-none transition-colors focus:border-[#c8e5f1]/60"><option value="recent">最近游玩</option><option value="duration">总游玩时长</option><option value="name">游戏名称</option><option value="added">添加时间</option><option value="archived">留档时间</option></select>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-archive-400">排序方向</p>
            <PreferenceChoice active={libraryPreferences.sortDescending} onClick={() => updateLibraryPreferences({ sortDescending: !libraryPreferences.sortDescending })} icon={libraryPreferences.sortDescending ? <ArrowDownAZ size={15} /> : <ArrowUpDown size={15} />} label={libraryPreferences.sortDescending ? '当前：倒序' : '当前：正序'} />
          </div>
        </div>
      </section>

      <SectionMarker label="资料库来源" />
      <section className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-medium text-archive-200">
              游戏扫描目录
            </h3>
            <p className="text-sm text-archive-500 mt-0.5">
              配置游戏库的扫描目录，系统将自动发现其中的游戏可执行文件
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleScan}
              disabled={triggerScan.isPending || roots.length === 0}
            >
              {triggerScan.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Scan size={14} />
              )}
              扫描
            </Button>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <FolderPlus size={14} />
              添加目录
            </Button>
          </div>
        </div>

        {/* Scan result feedback */}
        {triggerScan.isSuccess && (
          <div className="rounded-archive border border-teal-300/15 bg-teal-400/10 px-4 py-3 text-sm text-teal-200">
            扫描完成，发现 {triggerScan.data?.totalFound ?? 0} 个可执行文件。前往「发现候选」查看。
          </div>
        )}

        {/* Directory list */}
        {isLoading ? (
          <div className="card text-center py-8">
            <p className="text-archive-500">加载中...</p>
          </div>
        ) : roots.length === 0 ? (
          <div className="card text-center py-10">
            <FolderPlus size={36} className="text-archive-700 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-archive-400 mb-2">
              尚未配置扫描目录
            </h4>
            <p className="text-xs text-archive-600 mb-4">
              添加一个游戏根目录，系统将自动扫描其中的游戏
            </p>
            <Button variant="primary" size="sm" onClick={handleAdd}>
              <FolderPlus size={14} />
              添加目录
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {roots.map((root) => (
              <div
                key={root.id}
                className="flex items-center justify-between rounded-archive border border-white/[0.065] bg-black/[0.13] px-4 py-3.5 transition-colors hover:bg-white/[0.045]"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm text-archive-200 truncate font-mono">
                    {root.path}
                  </p>
                  <p className="text-xs text-archive-500 mt-0.5 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(root.last_scanned_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Enable/Disable toggle */}
                  <button
                    onClick={() => toggle.mutate(root.id)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      root.is_enabled
                        ? 'text-accent-teal hover:bg-accent-teal/10'
                        : 'text-archive-600 hover:text-archive-400'
                    }`}
                    title={root.is_enabled ? '已启用' : '已停用'}
                  >
                    {root.is_enabled ? (
                      <Power size={15} />
                    ) : (
                      <PowerOff size={15} />
                    )}
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => setDeletingId(root.id)}
                    className="rounded-lg p-1.5 text-archive-500 transition-colors hover:bg-accent-red/10 hover:text-accent-red"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SectionMarker label="截图与留档" />
      <section className="card space-y-5">
        <div>
          <h3 className="text-base font-medium text-archive-200 flex items-center gap-2">
            <Image size={16} />
            截图监听目录
          </h3>
          <p className="text-sm text-archive-500 mt-0.5">
            配置 NVIDIA 或其他截图工具的保存目录，系统将自动发现并归类新截图
          </p>
        </div>
        {screenshotDirLoading ? (
          <p className="text-xs text-archive-500">加载中...</p>
        ) : screenshotDir ? (
          <div className="flex items-center justify-between rounded-archive border border-white/[0.065] bg-black/[0.13] px-4 py-3.5">
            <div className="flex-1 min-w-0 mr-4">
              <p className="text-sm text-archive-200 truncate font-mono">
                {screenshotDir}
              </p>
              <p className="text-xs text-archive-500 mt-0.5">
                新截图将自动入库并尝试匹配对应的游戏 Session
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={handleScreenshotDir}>
                <FolderPlus size={14} />
                更改
              </Button>
              <Button variant="secondary" size="sm" onClick={handleClearScreenshotDir}>
                <Trash2 size={14} />
                清除
              </Button>
            </div>
          </div>
        ) : (
          <div className="card text-center py-6">
            <Image size={28} className="text-archive-700 mx-auto mb-2" />
            <p className="text-xs text-archive-500 mb-3">
              尚未配置截图监听目录
            </p>
            <Button variant="primary" size="sm" onClick={handleScreenshotDir}>
              <FolderPlus size={14} />
              选择目录
            </Button>
          </div>
        )}
      </section>

      <section className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-archive-200">
              <Camera size={16} />
              PlayVault 主动截图
            </h3>
            <p className="mt-0.5 text-sm text-archive-500">
              用自定义组合键无损保存主显示器画面，并在保存时绑定唯一正在运行的游戏会话。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={gameCaptureStatus?.enabled ?? false}
            disabled={gameCaptureLoading}
            onClick={() => void handleGameCaptureEnabled(!(gameCaptureStatus?.enabled ?? false))}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              gameCaptureStatus?.enabled
                ? 'border-[#c7e3ee]/45 bg-[#b9dbe8]/70'
                : 'border-white/10 bg-white/[0.08]'
            }`}
            title={gameCaptureStatus?.enabled ? '关闭主动截图' : '开启主动截图'}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-[#090a0c] shadow transition-transform ${
              gameCaptureStatus?.enabled ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {gameCaptureLoading && !gameCaptureStatus ? (
          <p className="text-xs text-archive-500">正在注册截图快捷键...</p>
        ) : gameCaptureStatus ? (
          <div className={`rounded-archive border px-4 py-3 ${
            gameCaptureStatus.state === 'error'
              ? 'border-[#bb705d]/30 bg-[#bb705d]/10'
              : gameCaptureStatus.enabled
                ? 'border-[#c7e3ee]/22 bg-[#c7e3ee]/[0.07]'
                : 'border-white/[0.065] bg-black/[0.13]'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`text-sm ${gameCaptureStatus.state === 'error' ? 'text-[#e9b6a8]' : 'text-archive-200'}`}>
                {gameCaptureStatus.message}
              </p>
              <button
                type="button"
                onClick={() => {
                  setRecordingCaptureShortcut(true)
                  setCaptureShortcutHint('请直接按下新的组合键。')
                }}
                onKeyDown={(event) => {
                  if (recordingCaptureShortcut) void handleCaptureShortcutKeyDown(event)
                }}
                disabled={gameCaptureLoading}
                className={`shrink-0 border px-2 py-1 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  recordingCaptureShortcut
                    ? 'border-[#c7e3ee]/55 bg-[#c7e3ee]/15 text-[#e5f6fb]'
                    : 'border-white/15 bg-black/30 text-[#c4dce6] hover:border-[#c7e3ee]/60 hover:text-[#edf9fc]'
                }`}
                title="点击后按下新的截图组合键"
              >
                {recordingCaptureShortcut ? '请按组合键…' : gameCaptureStatus.accelerator}
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-archive-500">
              点击右侧快捷键即可修改。请使用 Ctrl、Alt 或 Shift 搭配字母、数字或 F1–F12；若系统提示冲突，原快捷键会继续保留。不会扫描或导入其他软件的截图。
            </p>
            {captureShortcutHint && (
              <p className="mt-2 text-xs text-[#c7e3ee]">{captureShortcutHint}</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-archive-200">
              <HardDrive size={16} />
              档案安全
            </h3>
            <p className="mt-0.5 text-sm text-archive-500">
              已生成游玩留档的封面、背景与精选截图会保存在独立档案库中，可迁移到其他磁盘。
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refreshVaultInfo()} disabled={vaultLoading}>
            {vaultLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            检查健康度
          </Button>
        </div>

        {vaultLoading && !vaultLocation ? (
          <p className="text-xs text-archive-500">正在准备本地档案库...</p>
        ) : vaultError ? (
          <div className="rounded-archive border border-[#bb705d]/30 bg-[#bb705d]/10 px-4 py-3 text-sm text-[#e9b6a8]">
            {vaultError}
          </div>
        ) : vaultLocation && vaultHealth ? (
          <>
            <div className="rounded-archive border border-white/[0.065] bg-black/[0.13] px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c6dee8]">当前档案库</p>
              <p className="mt-2 truncate font-mono text-sm text-archive-200" title={vaultLocation.rootPath}>
                {vaultLocation.rootPath}
              </p>
              <p className="mt-1 text-xs text-archive-500">
                {vaultLocation.isDefaultLocation
                  ? '使用默认文档目录。建议在生成首份游玩留档后复制到其他磁盘保存。'
                  : '已使用自定义位置。迁移时会复制档案，旧目录不会被自动删除。'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-archive border border-white/[0.065] bg-white/[0.065] sm:grid-cols-4">
              <div className="bg-[#111214] px-4 py-3">
                <p className="text-[11px] text-archive-500">已留档游戏</p>
                <p className="mt-1 font-serif text-2xl text-archive-100">{vaultHealth.archivedGames}</p>
              </div>
              <div className="bg-[#111214] px-4 py-3">
                <p className="text-[11px] text-archive-500">已托管媒体</p>
                <p className="mt-1 font-serif text-2xl text-[#c6e4ee]">{vaultHealth.managedMediaFiles}</p>
              </div>
              <div className="bg-[#111214] px-4 py-3">
                <p className="text-[11px] text-archive-500">外部引用</p>
                <p className="mt-1 font-serif text-2xl text-archive-300">{vaultHealth.externalMediaFiles}</p>
              </div>
              <div className="bg-[#111214] px-4 py-3">
                <p className="text-[11px] text-archive-500">缺失媒体</p>
                <p className={`mt-1 font-serif text-2xl ${vaultHealth.missingMediaFiles > 0 ? 'text-[#d28b76]' : 'text-archive-100'}`}>
                  {vaultHealth.missingMediaFiles}
                </p>
              </div>
            </div>

            {vaultHealth.issues.length > 0 ? (
              <div className="rounded-archive border border-[#bb705d]/25 bg-[#17100f] px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-[#e9b6a8]">
                  <AlertTriangle size={15} />
                  发现 {vaultHealth.issues.length} 项档案媒体需要注意
                </div>
                <div className="mt-2 space-y-1 text-xs text-archive-400">
                  {vaultHealth.issues.slice(0, 3).map((issue, index) => (
                    <p key={`${issue.gameId}-${issue.mediaType}-${index}`} className="truncate">
                      {issue.gameName || '未命名游戏'} · {issue.mediaType} · {issue.reason === 'missing' ? '文件缺失' : '尚在外部位置'}
                    </p>
                  ))}
                  {vaultHealth.issues.length > 3 && <p>其余 {vaultHealth.issues.length - 3} 项将在后续档案修复工具中处理。</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-[#c6e4ee]">
                <ShieldCheck size={16} />
                当前已封存档案的媒体引用均可读取。
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
              <p className="max-w-xl text-xs leading-5 text-archive-500">
                迁移会完整复制当前档案库到你选择的位置，并自动切换到新位置。为避免误删，原档案库会继续保留，待你确认新位置可用后再自行处理。
              </p>
              <button
                type="button"
                className="btn-primary inline-flex min-h-8 items-center gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleRelocateVault()}
                disabled={vaultLoading}
              >
                <HardDrive size={14} />
                迁移档案库
              </button>
            </div>
          </>
        ) : null}
      </section>

      <SectionMarker label="系统" />
      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-archive-200">
              <Download size={16} />
              版本更新
            </h3>
            <p className="mt-0.5 max-w-2xl text-sm text-archive-500">
              PlayVault 不会在启动时自动联网检查或弹出更新提示。需要更新时，请在这里手动检查。
            </p>
          </div>
          {updateStatus?.stage === 'available' ? (
            <Button variant="primary" size="sm" onClick={() => void handleApplyUpdate()} disabled={updateLoading}>
              {updateLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              更新并重启
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => void handleCheckForUpdate()} disabled={updateLoading}>
              {updateLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              检查更新
            </Button>
          )}
        </div>
        {updateStatus && updateStatus.stage !== 'idle' && (
          <div className={`border px-4 py-3 text-sm ${
            ['error', 'blocked', 'unsupported'].includes(updateStatus.stage)
              ? 'border-[#bb705d]/30 bg-[#bb705d]/10 text-[#e9b6a8]'
              : updateStatus.stage === 'available'
                ? 'border-[#c7e3ee]/25 bg-[#c7e3ee]/[0.06] text-archive-200'
                : 'border-white/[0.065] bg-black/[0.13] text-archive-300'
          }`}>
            <p>{updateStatus.message}</p>
            {updateStatus.currentRevision && updateStatus.remoteRevision && (
              <p className="mt-1 font-mono text-[11px] text-archive-500">
                {updateStatus.currentRevision} → {updateStatus.remoteRevision}
              </p>
            )}
          </div>
        )}
      </section>


      {/* Delete confirmation */}
      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId !== null) {
            remove.mutate(deletingId)
            setDeletingId(null)
          }
        }}
        title="确认删除扫描目录"
        message="删除后，该目录的扫描候选也会被清除。此操作不可恢复。"
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  )
}

function ThemeChoice({
  active,
  onClick,
  theme,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  theme: AppearanceTheme
  title: string
  description: string
}): React.ReactElement {
  const isGraphite = theme === 'warm-charcoal'
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 ${active ? 'border-[var(--pv-accent)]/70 bg-white/[0.045] shadow-[0_10px_24px_rgba(0,0,0,0.16)]' : 'border-white/[0.075] bg-black/[0.12] hover:-translate-y-px hover:border-white/[0.17] hover:bg-white/[0.025]'}`}
    >
      <div className={`mb-3 flex h-11 items-end gap-1.5 border p-2 ${isGraphite ? 'border-[#d5e4eb]/10 bg-[#0b0e13]' : 'border-[#c1d4df]/10 bg-[#0a0d12]'}`}>
        <span className={`h-full flex-1 ${isGraphite ? 'bg-[#171c24]' : 'bg-[#18212b]'}`} />
        <span className={`h-3/5 flex-1 ${isGraphite ? 'bg-[#bccbd4]' : 'bg-[#a9c9da]'}`} />
        <span className={`h-4/5 flex-1 ${isGraphite ? 'bg-[#303b47]' : 'bg-[#263542]'}`} />
      </div>
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-medium text-archive-200"><Palette size={14} className={active ? 'text-[var(--pv-accent-strong)]' : 'text-archive-500'} />{title}</span>{active && <span className="text-[10px] font-medium tracking-[0.12em] text-[var(--pv-accent-strong)]">当前使用</span>}</div>
      <p className="mt-1.5 text-xs leading-5 text-archive-500">{description}</p>
    </button>
  )
}

function PreferenceChoice({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-[border-color,background-color,color] duration-200 ${active ? 'border-[var(--pv-accent)]/60 bg-[color:color-mix(in_srgb,var(--pv-accent)_10%,transparent)] text-[var(--pv-accent-strong)]' : 'border-white/[0.09] bg-black/[0.12] text-archive-400 hover:border-white/[0.18] hover:text-archive-200'}`}
    >
      {icon}{label}
    </button>
  )
}

function SectionMarker({ label }: { label: string }): React.ReactElement {
  return <div className="flex items-center gap-3 pt-1"><span className="h-px w-8 bg-[#b9dbe8]/55" /><p className="text-[11px] font-medium tracking-[0.16em] text-[#c5dce6]">{label}</p></div>
}
