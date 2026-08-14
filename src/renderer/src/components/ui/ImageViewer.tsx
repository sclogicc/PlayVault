import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toFileUrl } from '../../lib/fileUrl'
import { getNextImageIndex } from '../../lib/imageViewerNavigation'

export interface ImageViewerItem {
  filePath: string
  fileName: string
}

interface ImageViewerProps {
  open: boolean
  items: ImageViewerItem[]
  activeIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export default function ImageViewer({
  open,
  items,
  activeIndex,
  onIndexChange,
  onClose,
}: ImageViewerProps): React.ReactElement | null {
  const item = items[activeIndex]
  const [imageError, setImageError] = useState(false)

  const move = (direction: -1 | 1): void => {
    onIndexChange(getNextImageIndex(activeIndex, direction, items.length))
  }

  useEffect(() => {
    if (!open) return

    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        move(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        move(1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, items.length, onClose, open])

  useEffect(() => {
    setImageError(false)
  }, [item?.filePath])

  if (!open || !item) return null

  const hasMultipleItems = items.length > 1

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] h-[100dvh] w-[100dvw] overflow-hidden bg-[#050607] text-archive-100"
      onWheel={(event) => event.preventDefault()}
    >
      <button
        aria-label="关闭图片预览"
        className="absolute inset-0 cursor-default bg-black/88"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        className="relative z-10 grid h-full w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-white/[0.08] bg-[#090b0e] shadow-2xl"
      >
        <header className="flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#0d0f12]/96 px-4 py-3 backdrop-blur-sm sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm text-archive-200" title={item.fileName}>
              {item.fileName}
            </p>
            <p className="mt-0.5 text-xs text-archive-500">
              {activeIndex + 1} / {items.length}{hasMultipleItems ? ' · 使用左右方向键切换' : ''}
            </p>
          </div>
          <button
            aria-label="关闭图片预览"
            onClick={onClose}
            className="shrink-0 rounded p-2 text-archive-400 transition-colors hover:bg-white/[0.06] hover:text-archive-100"
          >
            <X size={20} />
          </button>
        </header>

        <div className="relative flex min-h-0 items-center justify-center overflow-hidden p-3 sm:p-6">
          {imageError ? (
            <div className="flex flex-col items-center gap-2 text-archive-500">
              <AlertTriangle size={32} />
              <p className="text-sm">无法加载原始图片</p>
              <p className="text-xs text-archive-600">图片可能已被移动、删除或损坏。</p>
            </div>
          ) : (
            <img
              key={item.filePath}
              src={toFileUrl(item.filePath)}
              alt={item.fileName}
              className="block h-auto w-auto max-h-[calc(100dvh-5.5rem)] max-w-[calc(100dvw-3rem)] select-none object-contain sm:max-w-[calc(100dvw-5rem)]"
              draggable={false}
              onError={() => setImageError(true)}
            />
          )}

          {hasMultipleItems && (
            <>
              <button
                aria-label="上一张图片"
                onClick={() => move(-1)}
                className="absolute left-3 rounded-full border border-white/[0.1] bg-black/60 p-3 text-archive-200 transition-colors hover:bg-black/85 sm:left-5"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                aria-label="下一张图片"
                onClick={() => move(1)}
                className="absolute right-3 rounded-full border border-white/[0.1] bg-black/60 p-3 text-archive-200 transition-colors hover:bg-black/85 sm:right-5"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
