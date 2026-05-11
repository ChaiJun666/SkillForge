import { describe, expect, it } from 'vitest'
import {
  createTranslator,
  defaultLocale,
  dictionaries,
  loadLocale,
  localeStorageKey,
  localizeIssue,
  nextLocale
} from './i18n'

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

  it('localizes missing SKILL.md issues', () => {
    const t = createTranslator('en')

    expect(
      localizeIssue({ severity: 'error', message: 'SKILL.md is required.', path: 'SKILL.md', field: 'file' }, t)
    ).toBe('SKILL.md is required.')
  })

  it('keeps unmanaged file issues as backend messages', () => {
    const t = createTranslator('en')
    const message = 'File is outside managed Skill paths and will not be loaded for editing.'

    expect(localizeIssue({ severity: 'info', message, path: 'notes.txt', field: 'file' }, t)).toBe(message)
  })
})

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  }
}
