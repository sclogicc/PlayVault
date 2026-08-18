import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
  footer?: ReactNode
  contentClassName?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
  footer,
  contentClassName = '',
}: ModalProps): React.ReactElement | null {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    const overlayLockCount = Number(document.body.dataset.pvOverlayLocks ?? '0')
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.dataset.pvOverlayLocks = String(overlayLockCount + 1)
    document.body.classList.add('pv-overlay-open')

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const frame = window.requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = 0
    })

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      const remainingLocks = Math.max(0, Number(document.body.dataset.pvOverlayLocks ?? '1') - 1)
      if (remainingLocks === 0) {
        delete document.body.dataset.pvOverlayLocks
        document.body.classList.remove('pv-overlay-open')
      } else {
        document.body.dataset.pvOverlayLocks = String(remainingLocks)
      }
      document.removeEventListener('keydown', handleKey)
      window.cancelAnimationFrame(frame)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-archive-950/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
        tabIndex={-1}
      />
      <section
        className={`pv-modal-shell relative grid w-full ${width} max-h-[calc(100dvh-1.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] animate-soft-enter overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="pv-modal-header flex min-w-0 items-center justify-between gap-5">
          <div>
            <p className="pv-modal-kicker">PlayVault</p>
            <h3 id="modal-title" className="pv-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pv-modal-dismiss"
            aria-label="关闭弹窗"
          >
            <X size={18} />
          </button>
        </header>
        <div ref={contentRef} className={`min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6 ${contentClassName}`}>
          {children}
        </div>
        {footer && <footer className="pv-modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
