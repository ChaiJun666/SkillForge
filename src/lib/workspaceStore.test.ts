import { describe, expect, it } from 'vitest'
import { getActiveFile, initialWorkspaceState, workspaceReducer } from './workspaceStore'

describe('workspace reducer', () => {
  it('loads a workspace and selects SKILL.md by default', () => {
    const state = workspaceReducer(initialWorkspaceState, {
      type: 'setWorkspace',
      root: 'demo-root',
      files: [
        { path: 'scripts/demo.js', content: "console.log('demo')" },
        { path: 'SKILL.md', content: '# Skill' }
      ]
    })

    expect(state.activeRoot).toBe('demo-root')
    expect(state.activePath).toBe('SKILL.md')
    expect(getActiveFile(state)?.path).toBe('SKILL.md')
    expect(state.dirtyPaths).toEqual([])
  })

  it('tracks dirty files and clears them after save', () => {
    const loaded = workspaceReducer(initialWorkspaceState, {
      type: 'setWorkspace',
      root: null,
      files: [{ path: 'SKILL.md', content: '# Skill' }]
    })

    const edited = workspaceReducer(loaded, {
      type: 'updateFile',
      path: 'SKILL.md',
      content: '# Updated Skill'
    })
    const editedAgain = workspaceReducer(edited, {
      type: 'updateFile',
      path: 'SKILL.md',
      content: '# Updated Skill Again'
    })
    const saved = workspaceReducer(editedAgain, { type: 'markSaved', path: 'SKILL.md' })

    expect(edited.files[0].content).toBe('# Updated Skill')
    expect(editedAgain.dirtyPaths).toEqual(['SKILL.md'])
    expect(saved.dirtyPaths).toEqual([])
  })
})
