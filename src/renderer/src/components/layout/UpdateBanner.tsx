import { useEffect, useState } from 'react'
import { AlertTriangle, Download, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react'
import type { UpdateStatus } from '@shared/update'

type BannerTone = 'gold' | 'muted' | 'danger'

interface BannerPresentation {
  title: string
  actionLabel?: string
  tone: BannerTone
  isBusy?: boolean
  canStartUpdate?: boolean
}

function getPresentation(status: UpdateStatus): BannerPresentation {
  switch (status.stage) {
    case 'checking':
      return { title: '正在检查新版本', tone: 'muted', isBusy: true }
    case 'available':
      return { title: '发现可用更新', actionLabel: '更新并重启', tone: 'gold', canStartUpdate: true }
    case 'pulling':
      return { title: '正在下载并合并更新', tone: 'gold', isBusy: true }
    case 'installing':
      return { title: '正在同步项目依赖', tone: 'gold', isBusy: true }
    case 'building':
      return { title: '正在构建新版本', tone: 'gold', isBusy: true }
    case 'restarting':
      return { title: '更新已完成，正在重启', tone: 'gold', isBusy: true }
    case 'blocked':
      return { title: '更新已暂停', actionLabel: '重新检查', tone: 'danger' }
    case 'error':
      return { title: '暂时无法完成更新', actionLabel: '重新检查', tone: 'danger' }
    case 'unsupported':
      return { title: '此启动方式无法在线更新', tone: 'danger' }
    default:
      return { title: '更新状态', tone: 'muted' }
  }
}

function isVisible(status: UpdateStatus | null): status is UpdateStatus {
  return Boolean(status && !['idle', 'up_to_date'].includes(status.stage))
}

export default function UpdateBanner(): React.ReactElement | null {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissedAt, setDismissedAt] = useState<number | null>(null)

  useEffect(() => {
    let alive = true

    void window.api.update.getStatus().then((nextStatus) => {
      if (alive) setStatus(nextStatus)
    })

    const unsubscribe = window.api.update.onStatusChange((nextStatus) => {
      if (alive) {
        setDismissedAt(null)
        setStatus(nextStatus)
      }
    })

    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const handleAction = async (): Promise<void> => {
    if (!status) return

    const nextStatus = status.stage === 'available'
      ? await window.api.update.trigger()
      : await window.api.update.check()
    setStatus(nextStatus)
  }

  if (!isVisible(status) || dismissedAt === status.updatedAt) return null

  const presentation = getPresentation(status)
  const isWorking = Boolean(presentation.isBusy)
  const versionLabel = status.currentRevision && status.remoteRevision
    ? `${status.currentRevision} → ${status.remoteRevision}`
    : null
  const toneClasses: Record<BannerTone, string> = {
    gold: 'border-[#c9a35a]/45 bg-[#11100d]/95 text-[#f2e5c5] shadow-[0_18px_45px_rgba(0,0,0,0.42)]',
    muted: 'border-white/12 bg-[#111214]/95 text-[#ded8ca] shadow-[0_18px_45px_rgba(0,0,0,0.42)]',
    danger: 'border-[#bb705d]/45 bg-[#17100f]/95 text-[#f1d0c5] shadow-[0_18px_45px_rgba(0,0,0,0.42)]',
  }

  return (
    <aside
      className={`fixed right-6 top-16 z-50 w-[min(30rem,calc(100vw-3rem))] border px-4 py-3 backdrop-blur-sm ${toneClasses[presentation.tone]}`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${presentation.tone === 'danger' ? 'text-[#d28b76]' : 'text-[#d8ba77]'}`}>
          {isWorking ? <Loader2 size={18} className="animate-spin" /> : presentation.tone === 'danger' ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm tracking-[0.12em] text-archive-100">{presentation.title}</p>
            {versionLabel && <span className="font-mono text-[10px] text-archive-500">{versionLabel}</span>}
          </div>
          <p className="mt-1 max-h-16 overflow-y-auto whitespace-pre-wrap pr-1 text-xs leading-5 text-archive-400">{status.message}</p>
        </div>
        {!isWorking && (
          <button
            type="button"
            className="-mr-1 -mt-1 rounded p-1 text-archive-500 transition-colors hover:bg-white/5 hover:text-archive-200"
            onClick={() => setDismissedAt(status.updatedAt)}
            aria-label="关闭更新提示"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!isWorking && presentation.actionLabel && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            className="inline-flex min-h-8 items-center gap-1.5 border border-[#c9a35a]/45 bg-[#c9a35a] px-3 text-xs font-medium text-[#17130d] transition-colors hover:bg-[#e1c17b] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void handleAction()}
          >
            {presentation.canStartUpdate ? <Download size={14} /> : <RefreshCw size={14} />}
            {presentation.actionLabel}
          </button>
        </div>
      )}
    </aside>
  )
}
