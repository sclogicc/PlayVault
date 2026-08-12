export const LOCAL_MEDIA_PROTOCOL = 'playvault-media'

export function toLocalMediaUrl(filePath: string): string {
  if (!filePath) return ''
  return `${LOCAL_MEDIA_PROTOCOL}://file/${encodeURIComponent(filePath)}`
}

export function parseLocalMediaUrl(requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl)
    if (
      url.protocol !== `${LOCAL_MEDIA_PROTOCOL}:` ||
      url.hostname !== 'file' ||
      !url.pathname.startsWith('/')
    ) {
      return null
    }

    const encodedPath = url.pathname.slice(1)
    const decoded = decodeURIComponent(encodedPath)
    // If it starts with / (Linux) or C: (Windows), return as is.
    // In Chromium URL, hostname 'file' means protocol://file/path.
    // url.pathname starts with /, so slice(1) might remove the leading / of a Linux path.
    if (encodedPath.startsWith('%2F') || encodedPath.startsWith('/')) {
      return decoded.startsWith('/') ? decoded : '/' + decoded
    }
    return decoded || null
  } catch {
    return null
  }
}
