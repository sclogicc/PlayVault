import { useEffect, useState } from 'react'
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
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, items.length, onClose, open])

  useEffect(() => {
    setImageError(false)
  }, [item?.filePath])

  if (!open || !item) return null

  const hasMultipleItems = items.length > 1

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        aria-label="关闭图片预览"
        className="absolute inset-0 bg-black/85 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        className="relative z-10 flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-archive-700 bg-archive-900 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-archive-700/60 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-archive-200" title={item.fileName}>
              {item.fileName}
            </p>
            <p className="mt-0.5 text-xs text-archive-500">
              {activeIndex + 1} / {items.length}，可使用左右方向键切换
            </p>
          </div>
          <button
            aria-label="关闭图片预览"
            onClick={onClose}
            className="rounded p-2 text-archive-400 transition-colors hover:bg-archive-800 hover:text-archive-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/30 p-4">
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
              className="max-h-full max-w-full object-contain"
              onError={() => setImageError(true)}
            />
          )}

          {hasMultipleItems && (
            <>
              <button
                aria-label="上一张图片"
                onClick={() => move(-1)}
                className="absolute left-4 rounded-full bg-black/60 p-3 text-archive-200 transition-colors hover:bg-black/85"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                aria-label="下一张图片"
                onClick={() => move(1)}
                className="absolute right-4 rounded-full bg-black/60 p-3 text-archive-200 transition-colors hover:bg-black/85"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
