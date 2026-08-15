import { useCallback, useEffect, useState } from 'react'

export type AppearanceTheme = 'warm-charcoal' | 'night-ink'

const SETTING_KEY = 'appearance_theme_v1'
const DEFAULT_THEME: AppearanceTheme = 'warm-charcoal'

function normalizeTheme(value: string | null): AppearanceTheme {
  return value === 'night-ink' ? 'night-ink' : DEFAULT_THEME
}

export function applyAppearanceTheme(theme: AppearanceTheme): void {
  document.documentElement.dataset.pvTheme = theme
}

export function useAppearanceTheme(): {
  theme: AppearanceTheme
  isReady: boolean
  updateTheme: (theme: AppearanceTheme) => Promise<void>
} {
  const [theme, setTheme] = useState<AppearanceTheme>(DEFAULT_THEME)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let mounted = true
    void window.api.setting.get(SETTING_KEY).then((value) => {
      if (!mounted) return
      const nextTheme = normalizeTheme(value)
      setTheme(nextTheme)
      applyAppearanceTheme(nextTheme)
      setIsReady(true)
    })

    return () => {
      mounted = false
    }
  }, [])

  const updateTheme = useCallback(async (nextTheme: AppearanceTheme): Promise<void> => {
    setTheme(nextTheme)
    applyAppearanceTheme(nextTheme)
    await window.api.setting.set(SETTING_KEY, nextTheme)
  }, [])

  return { theme, isReady, updateTheme }
}
