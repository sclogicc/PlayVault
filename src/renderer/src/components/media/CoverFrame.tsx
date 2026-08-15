import { useEffect, useState, type ReactNode } from 'react'
import { Gamepad2 } from 'lucide-react'
import type { CoverCrop } from '@shared/coverCrop'
import { getCoverImageStyle, parseCoverCrop } from '@shared/coverCrop'
import { toFileUrl } from '../../lib/fileUrl'

interface CoverFrameProps {
  filePath?: string | null
  crop?: CoverCrop | string | null
  alt: string
  className?: string
  imageClassName?: string
  fallback?: ReactNode
  loading?: 'eager' | 'lazy'
  children?: ReactNode
}

/** 固定 2:3 的游戏封面容器；封面媒体不得影响卡片和详情页的布局尺寸。 */
export default function CoverFrame({
  filePath,
  crop,
  alt,
  className = '',
  imageClassName = '',
  fallback,
  loading = 'lazy',
  children,
}: CoverFrameProps): React.ReactElement {
  const [imageError, setImageError] = useState(false)
  const coverCrop = typeof crop === 'string' || crop === null || crop === undefined
    ? parseCoverCrop(crop)
    : crop

  useEffect(() => {
    setImageError(false)
  }, [filePath])

  return (
    <div className={`media-frame media-cover-frame ${className}`}>
      {filePath && !imageError ? (
        <img
          src={toFileUrl(filePath)}
          alt={alt}
          className={`media-image ${imageClassName}`}
          style={getCoverImageStyle(coverCrop)}
          loading={loading}
          onError={() => setImageError(true)}
        />
      ) : (
        fallback ?? (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[linear-gradient(145deg,#1a1d20,#101215)] text-center text-archive-600">
            <Gamepad2 size={28} />
            <span className="px-4 text-xs">没有封面</span>
          </div>
        )
      )}
      {children}
    </div>
  )
}
