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

/** 短横幅背景只能轻微调整，避免旧版大横幅的放大值在新框架中失控。 */
export const BACKGROUND_CROP_EDITOR_LIMITS = {
  zoom: { min: 1, max: 1.25, step: 0.05 },
  offset: { min: -45, max: 45, step: 1 },
} as const

const BACKGROUND_CROP_VERSION = 2

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

export function normalizeBackgroundCrop(crop: Partial<CoverCrop>): CoverCrop {
  return {
    zoom: clamp(Number(crop.zoom) || 1, BACKGROUND_CROP_EDITOR_LIMITS.zoom.min, BACKGROUND_CROP_EDITOR_LIMITS.zoom.max),
    x: clamp(Number(crop.x) || 0, BACKGROUND_CROP_EDITOR_LIMITS.offset.min, BACKGROUND_CROP_EDITOR_LIMITS.offset.max),
    y: clamp(Number(crop.y) || 0, BACKGROUND_CROP_EDITOR_LIMITS.offset.min, BACKGROUND_CROP_EDITOR_LIMITS.offset.max),
  }
}

/**
 * 旧版本的 background_crop 曾用于较高的横幅，直接套进短横幅会造成极端放大。
 * 只有新版明确标记过的背景裁切才会被读取；历史记录一律安全回退到居中构图。
 */
export function parseBackgroundCrop(value: string | null | undefined): CoverCrop {
  if (!value) return { ...DEFAULT_COVER_CROP }
  try {
    const parsed = JSON.parse(value) as Partial<CoverCrop> & { backgroundCropVersion?: number }
    return parsed.backgroundCropVersion === BACKGROUND_CROP_VERSION
      ? normalizeBackgroundCrop(parsed)
      : { ...DEFAULT_COVER_CROP }
  } catch {
    return { ...DEFAULT_COVER_CROP }
  }
}

export function serializeBackgroundCrop(crop: CoverCrop): string {
  return JSON.stringify({ ...normalizeBackgroundCrop(crop), backgroundCropVersion: BACKGROUND_CROP_VERSION })
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
export function getBackgroundImageStyle(crop: CoverCrop): Record<string, string> {
  const normalized = normalizeBackgroundCrop(crop)
  return {
    objectPosition: `${50 + normalized.x / 2}% ${50 + normalized.y / 2}%`,
    transform: `scale(${normalized.zoom})`,
    transformOrigin: 'center center',
  }
}

export function getCoverImageStyle(crop: CoverCrop): Record<string, string> {
  const normalized = normalizeCoverCrop(crop)
  return {
    objectPosition: `${50 + normalized.x / 2}% ${50 + normalized.y / 2}%`,
    transform: `scale(${normalized.zoom})`,
    transformOrigin: 'center center',
  }
}
