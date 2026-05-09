export type ThemeMode = 'dark' | 'light'

export const defaultTheme: ThemeMode = 'dark'
export const themeStorageKey = 'skillforge.theme.v1'

export function loadTheme(storage: Pick<Storage, 'getItem'> = localStorage): ThemeMode {
  const stored = storage.getItem(themeStorageKey)
  return isThemeMode(stored) ? stored : defaultTheme
}

export function saveTheme(theme: ThemeMode, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(themeStorageKey, theme)
}

export function nextTheme(theme: ThemeMode): ThemeMode {
  return theme === 'dark' ? 'light' : 'dark'
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light'
}
