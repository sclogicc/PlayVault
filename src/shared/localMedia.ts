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
    return encodedPath ? decodeURIComponent(encodedPath) : null
  } catch {
    return null
  }
}
