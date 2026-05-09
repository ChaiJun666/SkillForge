import { describe, expect, it } from 'vitest'
import { createTranslator, defaultLocale, dictionaries, loadLocale, localeStorageKey, nextLocale } from './i18n'

describe('i18n preferences', () => {
  it('defaults to English', () => {
    expect(defaultLocale).toBe('en')
    expect(loadLocale(memoryStorage())).toBe('en')
  })

  it('loads a persisted locale', () => {
    const storage = memoryStorage({ [localeStorageKey]: 'zh-CN' })
    expect(loadLocale(storage)).toBe('zh-CN')
  })

  it('toggles between English and Chinese', () => {
    expect(nextLocale('en')).toBe('zh-CN')
    expect(nextLocale('zh-CN')).toBe('en')
  })

  it('keeps English and Chinese dictionaries in sync', () => {
    expect(Object.keys(dictionaries['zh-CN']).sort()).toEqual(Object.keys(dictionaries.en).sort())
  })

  it('interpolates translated values', () => {
    const t = createTranslator('en')
    expect(t('terminalSaved', { path: 'SKILL.md' })).toBe('Saved SKILL.md.')
  })
})

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  }
}
