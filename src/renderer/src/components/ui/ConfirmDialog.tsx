interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '确认',
  variant = 'danger',
}: ConfirmDialogProps): React.ReactElement | null {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm mx-4 bg-archive-800 border border-archive-700 rounded-lg shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-archive-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-archive-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-sm"
          >
            取消
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={
              variant === 'danger'
                ? 'btn-danger px-4 py-2 text-sm'
                : 'btn-primary px-4 py-2 text-sm'
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
