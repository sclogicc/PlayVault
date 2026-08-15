import { useEffect, useState, type ReactNode } from 'react'
import { ImageOff } from 'lucide-react'
import type { BackdropCrop } from '@shared/backdropCrop'
import { getBackdropImageStyle, parseBackdropCrop } from '@shared/backdropCrop'
import { toFileUrl } from '../../lib/fileUrl'

interface BackdropStageProps {
  filePath?: string | null
  crop?: BackdropCrop | string | null
  alt: string
  className?: string
  imageClassName?: string
  children?: ReactNode
}

/**
 * 受控的详情背景舞台。图片只提供氛围；渐变和内容层始终独立，
 * 因而不同尺寸的背景不会改变页面主体的高度或可读性。
 */
export default function BackdropStage({
  filePath,
  crop,
  alt,
  className = '',
  imageClassName = '',
  children,
}: BackdropStageProps): React.ReactElement {
  const [imageError, setImageError] = useState(false)
  const backdropCrop = typeof crop === 'string' || crop === null || crop === undefined
    ? parseBackdropCrop(crop)
    : crop

  useEffect(() => {
    setImageError(false)
  }, [filePath])

  return (
    <div className={`media-frame media-backdrop-stage ${className}`}>
      {filePath && !imageError ? (
        <img
          src={toFileUrl(filePath)}
          alt={alt}
          className={`media-image media-backdrop-image ${imageClassName}`}
          style={getBackdropImageStyle(backdropCrop)}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#15191e,#0e1115_62%,#12100c)] text-archive-700">
          <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em]"><ImageOff size={14} />PLAYVAULT · 游戏记录</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(9,10,12,0.66),rgba(9,10,12,0.18)_48%,rgba(9,10,12,0.54)),linear-gradient(0deg,rgba(9,10,12,0.58),transparent_58%)]" />
      {children}
    </div>
  )
}
