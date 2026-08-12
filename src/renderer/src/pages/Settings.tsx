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
} from 'lucide-react'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import {
  useScanRoots,
  useScanRootMutations,
  useTriggerScan,
} from '../hooks/useSettings'

export default function Settings(): React.ReactElement {
  const { roots, isLoading } = useScanRoots()
  const { create, remove, toggle } = useScanRootMutations()
  const triggerScan = useTriggerScan()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [screenshotDir, setScreenshotDir] = useState<string>('')
  const [screenshotDirLoading, setScreenshotDirLoading] = useState(true)

  useEffect(() => {
    window.api.setting.get('screenshot_dir').then((val) => {
      if (val) setScreenshotDir(val)
      setScreenshotDirLoading(false)
    })
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-violet">本地配置</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-archive-50">设置</h2>
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
