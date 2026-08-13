export interface CoverCrop {
  zoom: number
  x: number
  y: number
}

export const DEFAULT_COVER_CROP: CoverCrop = {
  zoom: 1,
  x: 0,
  y: 0,
}

export const COVER_CROP_LIMITS = {
  zoom: { min: 1, max: 3, step: 0.05 },
  offset: { min: -100, max: 100, step: 1 },
} as const

/** 编辑器的可选范围更克制；旧档案仍可完整读取，媒体框架始终负责边界裁切。 */
export const COVER_CROP_EDITOR_LIMITS = {
  zoom: { min: 1, max: 2.6, step: 0.05 },
  offset: { min: -80, max: 80, step: 1 },
} as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function normalizeCoverCrop(crop: Partial<CoverCrop>): CoverCrop {
  return {
    zoom: clamp(Number(crop.zoom) || DEFAULT_COVER_CROP.zoom, COVER_CROP_LIMITS.zoom.min, COVER_CROP_LIMITS.zoom.max),
    x: clamp(Number(crop.x) || 0, COVER_CROP_LIMITS.offset.min, COVER_CROP_LIMITS.offset.max),
    y: clamp(Number(crop.y) || 0, COVER_CROP_LIMITS.offset.min, COVER_CROP_LIMITS.offset.max),
  }
}

export function parseCoverCrop(value: string | null | undefined): CoverCrop {
  if (!value) return { ...DEFAULT_COVER_CROP }
  try {
    return normalizeCoverCrop(JSON.parse(value) as Partial<CoverCrop>)
  } catch {
    return { ...DEFAULT_COVER_CROP }
  }
}

export function serializeCoverCrop(crop: CoverCrop): string {
  return JSON.stringify(normalizeCoverCrop(crop))
}

export function getCoverCropResetKey(
  filePath: string,
  aspectRatio: string,
  crop: CoverCrop,
): string {
  const normalized = normalizeCoverCrop(crop)
  return [filePath, aspectRatio, normalized.zoom, normalized.x, normalized.y].join('|')
}

/**
 * Shared inline style for all cover/background consumers. Position remains in
 * the safe 10%–90% range and transformed images are clipped by `.media-frame`.
 */
export function getCoverImageStyle(crop: CoverCrop): Record<string, string> {
  const normalized = normalizeCoverCrop(crop)
  return {
    objectPosition: `${50 + normalized.x / 2}% ${50 + normalized.y / 2}%`,
    transform: `scale(${normalized.zoom})`,
    transformOrigin: 'center center',
  }
}
