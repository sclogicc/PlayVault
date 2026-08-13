import { useState, useEffect } from 'react'
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

export default function Settings(): React.ReactElement {
  const { roots, isLoading } = useScanRoots()
  const { create, remove, toggle } = useScanRootMutations()
  const triggerScan = useTriggerScan()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [screenshotDir, setScreenshotDir] = useState<string>('')
  const [screenshotDirLoading, setScreenshotDirLoading] = useState(true)
  const [vaultLocation, setVaultLocation] = useState<VaultLocation | null>(null)
  const [vaultHealth, setVaultHealth] = useState<VaultHealthReport | null>(null)
  const [vaultLoading, setVaultLoading] = useState(true)
  const [vaultError, setVaultError] = useState<string>('')
  const [gameCaptureStatus, setGameCaptureStatus] = useState<GameCaptureStatus | null>(null)
  const [gameCaptureLoading, setGameCaptureLoading] = useState(true)

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
    <div className="min-h-full space-y-8 bg-[#090a0c] px-8 py-9 sm:px-12 lg:px-16">
      {/* Header */}
      <div className="border-b border-white/[0.075] pb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d8ba77]">本地配置</p>
        <h2 className="mt-2 font-serif text-4xl tracking-[-0.025em] text-archive-50">设置</h2>
        <p className="mt-2 text-sm text-archive-400">管理本地扫描路径与截图监听目录，所有数据仍将保留在你的设备中。</p>
      </div>

      {/* Scan Directories Section */}
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

      {/* Screenshot Directory */}
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

      {/* PlayVault Capture */}
      <section className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-archive-200">
              <Camera size={16} />
              PlayVault 主动截图
            </h3>
            <p className="mt-0.5 text-sm text-archive-500">
              按 F12 直接无损保存主显示器画面，并在保存时绑定唯一正在运行的游戏会话。
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
                ? 'border-[#c9a35a]/50 bg-[#c9a35a]'
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
                ? 'border-[#c9a35a]/25 bg-[#c9a35a]/[0.06]'
                : 'border-white/[0.065] bg-black/[0.13]'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`text-sm ${gameCaptureStatus.state === 'error' ? 'text-[#e9b6a8]' : 'text-archive-200'}`}>
                {gameCaptureStatus.message}
              </p>
              <kbd className="shrink-0 border border-white/15 bg-black/30 px-2 py-1 font-mono text-xs text-[#d8ba77]">
                {gameCaptureStatus.accelerator}
              </kbd>
            </div>
            <p className="mt-2 text-xs leading-5 text-archive-500">
              不会扫描或导入其他软件的截图。没有游戏会话、同时运行多个游戏，或游戏不在主显示器时，PlayVault 会拒绝保存而不是猜测归属。NVIDIA 截图监听仍可单独保留作兼容兜底。
            </p>
          </div>
        ) : null}
      </section>

      {/* Vault Safety */}
      <section className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-medium text-archive-200">
              <HardDrive size={16} />
              档案安全
            </h3>
            <p className="mt-0.5 text-sm text-archive-500">
              已封存的封面、背景与精选截图会保存在独立档案库中，可迁移到其他磁盘。
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
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d8ba77]">当前档案库</p>
              <p className="mt-2 truncate font-mono text-sm text-archive-200" title={vaultLocation.rootPath}>
                {vaultLocation.rootPath}
              </p>
              <p className="mt-1 text-xs text-archive-500">
                {vaultLocation.isDefaultLocation
                  ? '使用默认文档目录。建议在完成一次封存后复制到其他磁盘保存。'
                  : '已使用自定义位置。迁移时会复制档案，旧目录不会被自动删除。'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-archive border border-white/[0.065] bg-white/[0.065] sm:grid-cols-4">
              <div className="bg-[#111214] px-4 py-3">
                <p className="text-[11px] text-archive-500">已封存游戏</p>
                <p className="mt-1 font-serif text-2xl text-archive-100">{vaultHealth.archivedGames}</p>
              </div>
              <div className="bg-[#111214] px-4 py-3">
                <p className="text-[11px] text-archive-500">已托管媒体</p>
                <p className="mt-1 font-serif text-2xl text-[#d8ba77]">{vaultHealth.managedMediaFiles}</p>
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
              <div className="flex items-center gap-2 text-sm text-[#d8ba77]">
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
                className="inline-flex min-h-8 items-center gap-1.5 border border-[#c9a35a]/45 bg-[#c9a35a] px-3 text-xs font-medium text-[#17130d] transition-colors hover:bg-[#e1c17b] disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Placeholder for future settings */}
      <section className="grid grid-cols-1 gap-4 border-t border-white/[0.07] pt-6 sm:grid-cols-2">
        <div>
          <h3 className="text-base font-medium text-archive-400">监听设置</h3>
          <p className="text-xs text-archive-600 mt-1">
            进程轮询间隔 2 秒，启动/结束判定需连续命中 3 次（约 6 秒）
          </p>
        </div>
        <div>
          <h3 className="text-base font-medium text-archive-400">系统行为</h3>
          <p className="text-xs text-archive-600 mt-1">
            应用启动时自动恢复未结束的游玩记录
          </p>
        </div>
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
