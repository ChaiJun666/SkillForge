import { describe, expect, it } from 'vitest'
import { defaultTheme, loadTheme, nextTheme, themeStorageKey } from './theme'

describe('theme preferences', () => {
  it('defaults to dark mode', () => {
    expect(defaultTheme).toBe('dark')
    expect(loadTheme(memoryStorage())).toBe('dark')
  })

  it('loads a persisted theme', () => {
    const storage = memoryStorage({ [themeStorageKey]: 'light' })
    expect(loadTheme(storage)).toBe('light')
  })

  it('toggles between dark and light', () => {
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
  })
})

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  }
}
