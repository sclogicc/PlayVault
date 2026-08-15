import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_LIBRARY_VIEW_PREFERENCES,
  normalizeLibraryViewPreferences,
  type LibraryViewPreferences,
} from '../lib/libraryView'

const SETTING_KEY = 'library_view_preferences_v2'

export function useLibraryViewPreferences(): {
  preferences: LibraryViewPreferences
  isReady: boolean
  updatePreferences: (patch: Partial<LibraryViewPreferences>) => void
} {
  const [preferences, setPreferences] = useState<LibraryViewPreferences>(DEFAULT_LIBRARY_VIEW_PREFERENCES)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.api.setting.get(SETTING_KEY)
      .then((value) => {
        if (!cancelled && value) {
          try {
            setPreferences(normalizeLibraryViewPreferences(JSON.parse(value)))
          } catch {
            setPreferences(DEFAULT_LIBRARY_VIEW_PREFERENCES)
          }
        }
      })
      .catch(() => {
        // 偏好读取失败不阻塞资料库，继续使用稳定默认值。
      })
      .finally(() => {
        if (!cancelled) setIsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const updatePreferences = useCallback((patch: Partial<LibraryViewPreferences>) => {
    setPreferences((current) => {
      const next = normalizeLibraryViewPreferences({ ...current, ...patch })
      window.api.setting.set(SETTING_KEY, JSON.stringify(next)).catch(() => {
        // 设置保存失败时保留当前会话中的选择，避免干扰浏览。
      })
      return next
    })
  }, [])

  return { preferences, isReady, updatePreferences }
}
