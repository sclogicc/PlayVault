export interface BackdropCrop {
  zoom: number
  focalX: number
  focalY: number
}

export const DEFAULT_BACKDROP_CROP: BackdropCrop = {
  zoom: 1.1,
  focalX: 0,
  focalY: 0,
}

export const BACKDROP_CROP_LIMITS = {
  zoom: { min: 1, max: 1.5, step: 0.05 },
  focal: { min: -1, max: 1, step: 0.01 },
} as const

const BACKDROP_CROP_VERSION = 1
const LEGACY_BACKGROUND_CROP_VERSION = 2

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function normalizeBackdropCrop(crop: Partial<BackdropCrop>): BackdropCrop {
  return {
    zoom: clamp(Number(crop.zoom) || DEFAULT_BACKDROP_CROP.zoom, BACKDROP_CROP_LIMITS.zoom.min, BACKDROP_CROP_LIMITS.zoom.max),
    focalX: clamp(Number(crop.focalX) || 0, BACKDROP_CROP_LIMITS.focal.min, BACKDROP_CROP_LIMITS.focal.max),
    focalY: clamp(Number(crop.focalY) || 0, BACKDROP_CROP_LIMITS.focal.min, BACKDROP_CROP_LIMITS.focal.max),
  }
}

/**
 * 读取独立背景构图。backgroundCropVersion=2 是此前短横幅版本写入的旧结构，
 * 仅在此处一次性转换为新的归一化焦点坐标，页面不再依赖 CoverCrop。
 */
export function parseBackdropCrop(value: string | null | undefined): BackdropCrop {
  if (!value) return { ...DEFAULT_BACKDROP_CROP }

  try {
    const parsed = JSON.parse(value) as Partial<BackdropCrop> & {
      backgroundCropVersion?: number
      backdropCropVersion?: number
      x?: number
      y?: number
    }

    if (parsed.backdropCropVersion === BACKDROP_CROP_VERSION) {
      return normalizeBackdropCrop(parsed)
    }

    if (parsed.backgroundCropVersion === LEGACY_BACKGROUND_CROP_VERSION) {
      return normalizeBackdropCrop({
        zoom: parsed.zoom,
        focalX: Number(parsed.x) / 100,
        focalY: Number(parsed.y) / 100,
      })
    }
  } catch {
    // 损坏的历史值不影响详情页展示，直接使用安全默认构图。
  }

  return { ...DEFAULT_BACKDROP_CROP }
}

export function serializeBackdropCrop(crop: BackdropCrop): string {
  return JSON.stringify({
    ...normalizeBackdropCrop(crop),
    backdropCropVersion: BACKDROP_CROP_VERSION,
  })
}

export function getBackdropCropResetKey(filePath: string, crop: BackdropCrop): string {
  const normalized = normalizeBackdropCrop(crop)
  return [filePath, normalized.zoom, normalized.focalX, normalized.focalY].join('|')
}

/**
 * 背景焦点被转换为缩放后多出的安全边缘范围中的真实平移。
 * 不使用 object-position 作为位移本体，避免图片恰好覆盖容器时滑块数值变化却没有视觉反馈。
 */
export function getBackdropImageStyle(crop: BackdropCrop): Record<string, string> {
  const normalized = normalizeBackdropCrop(crop)
  const safeTranslation = (normalized.zoom - 1) * 50
  const translateX = normalized.focalX * safeTranslation
  const translateY = normalized.focalY * safeTranslation

  return {
    objectPosition: '50% 50%',
    transform: `translate3d(${translateX}%, ${translateY}%, 0) scale(${normalized.zoom})`,
    transformOrigin: 'center center',
  }
}
