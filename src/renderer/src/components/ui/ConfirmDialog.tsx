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

  return <Modal
    open={open}
    onClose={onClose}
    title={title}
    width="max-w-md"
    contentClassName="py-5"
    footer={<div className="flex items-center justify-end gap-2.5"><Button variant="secondary" onClick={onClose}>取消</Button><Button variant={variant} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button></div>}
  >
    <p className="text-sm leading-6 text-archive-300">{message}</p>
  </Modal>
}
import Modal from './Modal'
import Button from './Button'
