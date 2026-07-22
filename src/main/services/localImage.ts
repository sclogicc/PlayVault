import { extname } from 'node:path'

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export function getImageMimeType(filePath: string): string | null {
  return IMAGE_MIME_TYPES[extname(filePath).toLowerCase()] ?? null
}
