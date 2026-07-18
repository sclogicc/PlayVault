/**
 * Convert a Windows path into a safe file URL for Electron image previews.
 * Each path segment is encoded so spaces, Chinese characters, #, ?, and % do not
 * turn into URL syntax or cause blank thumbnail images.
 */
export function toFileUrl(filePath: string): string {
  if (!filePath) return ''
  if (filePath.startsWith('file://')) return filePath

  const normalized = filePath.replace(/\\/g, '/')
  const encode = (segment: string): string => encodeURIComponent(segment)

  if (normalized.startsWith('//')) {
    const parts = normalized.slice(2).split('/')
    const host = parts.shift()
    return host ? 'file://' + host + '/' + parts.map(encode).join('/') : ''
  }

  if (/^[a-zA-Z]:\//.test(normalized)) {
    const drive = normalized.slice(0, 2)
    const path = normalized.slice(3).split('/').map(encode).join('/')
    return 'file:///' + drive + '/' + path
  }

  return 'file:///' + normalized.split('/').map(encode).join('/')
}
