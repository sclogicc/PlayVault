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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeCoverCrop(crop: Partial<CoverCrop>): CoverCrop {
  return {
    zoom: clamp(Number(crop.zoom) || DEFAULT_COVER_CROP.zoom, 1, 3),
    x: clamp(Number(crop.x) || 0, -100, 100),
    y: clamp(Number(crop.y) || 0, -100, 100),
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

export function getCoverImageStyle(crop: CoverCrop): Record<string, string> {
  return {
    objectPosition: `${50 + crop.x / 2}% ${50 + crop.y / 2}%`,
    transform: `scale(${crop.zoom})`,
  }
}
