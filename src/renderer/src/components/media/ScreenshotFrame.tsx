import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toFileUrl } from '../../lib/fileUrl'

interface ScreenshotFrameProps {
  filePath?: string | null
  alt: string
  className?: string
  imageClassName?: string
  fallback?: ReactNode
  loading?: 'eager' | 'lazy'
  children?: ReactNode
}

/** 固定 3:2 的截图框；原图查看由外部按钮或查看器负责，缩略图永不撑开布局。 */
export default function ScreenshotFrame({
  filePath,
  alt,
  className = '',
  imageClassName = '',
  fallback,
  loading = 'lazy',
  children,
}: ScreenshotFrameProps): React.ReactElement {
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [filePath])

  return (
    <div className={`media-frame media-screenshot-frame ${className}`}>
      {filePath && !imageError ? (
        <img
          src={toFileUrl(filePath)}
          alt={alt}
          className={`media-image ${imageClassName}`}
          loading={loading}
          onError={() => setImageError(true)}
        />
      ) : (
        fallback ?? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-archive-600">
            <AlertTriangle size={22} />
            <span className="text-[10px]">无法预览</span>
          </div>
        )
      )}
      {children}
    </div>
  )
}
