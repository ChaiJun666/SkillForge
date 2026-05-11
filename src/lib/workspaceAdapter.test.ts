import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWorkspaceAdapter } from './workspaceAdapter'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    }
  }
}

describe('workspaceAdapter browser fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
    localStorage.clear()
    vi.stubGlobal('__TAURI_INTERNALS__', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lists a demo browser skill without Tauri', async () => {
    const adapter = createWorkspaceAdapter()
    const skills = await adapter.listSkills()

    expect(skills).toHaveLength(1)
    expect(skills[0].root).toBe('browser-demo')
    expect(skills[0].name).toBeTruthy()
  })

  it('creates and saves a browser workspace without Tauri', async () => {
    const adapter = createWorkspaceAdapter()
    const workspace = await adapter.createSkill('demo-skill')

    expect(workspace.files.some((file) => file.path === 'SKILL.md')).toBe(true)
    await adapter.saveFile(workspace.root, 'SKILL.md', workspace.files[0].content)
  })

  it('opens the saved browser workspace regardless of root', async () => {
    const adapter = createWorkspaceAdapter()
    await adapter.createSkill('opened-skill')

    const workspace = await adapter.openSkill('ignored-root')

    expect(workspace.root).toBeNull()
    expect(workspace.activePath).toBe('SKILL.md')
    expect(workspace.files[0].content).toContain('opened-skill')
  })

  it('validates SKILL.md content in browser mode', async () => {
    const adapter = createWorkspaceAdapter()
    const issues = await adapter.validateWorkspace(null, [{ path: 'SKILL.md', content: '# Missing metadata' }])

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          field: 'frontmatter'
        })
      ])
    )
  })

  it('runs the browser demo runtime', async () => {
    const adapter = createWorkspaceAdapter()
    const result = await adapter.runScript(null, 'scripts/demo.js', 'demo', "console.log('demo')")

    expect(result.status).toBe('success')
    expect(result.stdout).toBe("console.log('demo')")
    expect(result.stderr).toBe('')
    expect(result.timedOut).toBe(false)
    expect(result.logs.join('\n')).toContain('browser demo mode')
  })

  it('preserves the selected browser script path in runtime results', async () => {
    const adapter = createWorkspaceAdapter()
    const result = await adapter.runScript(null, 'scripts/check.py', 'demo', "print('demo')")

    expect(result.input).toBe('scripts/check.py')
    expect(result.logs[0]).toBe('$ python scripts/check.py')
  })

  it('exports a browser workspace and returns the downloaded filename', async () => {
    const click = vi.fn()
    const anchor = {
      click,
      download: '',
      href: ''
    } as unknown as HTMLAnchorElement
    const createElement = vi.fn(() => anchor)
    const createObjectUrl = vi.fn(() => 'blob:skillforge-export')
    const revokeObjectUrl = vi.fn()
    vi.stubGlobal('document', { createElement })
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl
    })

    const adapter = createWorkspaceAdapter()
    const workspace = await adapter.createSkill('exported-skill')
    const filename = await adapter.exportWorkspace(workspace.root, workspace.files)

    expect(filename).toBe('exported-skill.skill.zip')
    expect(createElement).toHaveBeenCalledWith('a')
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
    expect(click).toHaveBeenCalled()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:skillforge-export')
  })
})
