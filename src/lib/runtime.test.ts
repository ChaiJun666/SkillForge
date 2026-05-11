import { describe, expect, it } from 'vitest'
import { canRunScript, formatExecutionStatus, getRunnableScripts } from './runtime'
import type { SkillExecution } from '../types'

describe('runtime helpers', () => {
  it('lists only JS and Python scripts under scripts/', () => {
    const scripts = getRunnableScripts([
      { path: 'SKILL.md', content: '' },
      { path: 'scripts/demo.js', content: '' },
      { path: 'scripts/check.py', content: '' },
      { path: 'scripts/readme.md', content: '' },
      { path: 'references/tool.py', content: '' },
      { path: 'tests/runtime.js', content: '' }
    ])

    expect(scripts).toEqual([
      { path: 'scripts/demo.js', language: 'javascript' },
      { path: 'scripts/check.py', language: 'python' }
    ])
  })

  it('formats execution status with status and duration', () => {
    const execution: SkillExecution = {
      id: 'run-1',
      skillId: 'demo',
      input: 'scripts/demo.js',
      stdout: '',
      stderr: '',
      output: '',
      logs: [],
      duration: 12,
      status: 'success'
    }

    expect(formatExecutionStatus(execution)).toBe('success in 12ms')
  })

  it('formats timed out executions explicitly', () => {
    const execution: SkillExecution = {
      id: 'run-2',
      skillId: 'demo',
      input: 'scripts/slow.py',
      stdout: '',
      stderr: '',
      output: '',
      logs: ['Process timed out after 10000ms.'],
      duration: 10000,
      status: 'failed',
      timedOut: true
    }

    expect(formatExecutionStatus(execution)).toBe('timed out in 10000ms')
  })

  it('only allows running when scripts exist and no run is active', () => {
    const scripts = [{ path: 'scripts/demo.js', language: 'javascript' as const }]

    expect(canRunScript(scripts, false)).toBe(true)
    expect(canRunScript(scripts, true)).toBe(false)
    expect(canRunScript([], false)).toBe(false)
  })
})
