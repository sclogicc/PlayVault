import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: ModalProps): React.ReactElement | null {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-archive-950/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        className={`relative w-full ${width} animate-soft-enter overflow-hidden rounded-panel border border-white/[0.12] bg-gradient-to-br from-archive-800/95 to-archive-900/95 shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-violet">PlayVault</p>
            <h3 id="modal-title" className="mt-1 text-lg font-semibold text-archive-50">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-archive-400 transition-colors hover:bg-white/[0.08] hover:text-archive-100"
            aria-label="关闭弹窗"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </section>
    </div>
  )
}
