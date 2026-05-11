import { describe, expect, it } from 'vitest'
import { hasBlockingErrors, mergeValidationIssues, validateDocumentIssues, withSource } from './validation'

describe('validation helpers', () => {
  it('returns a document error when SKILL.md is missing', () => {
    const issues = validateDocumentIssues([{ path: 'references/brief.md', content: '# Brief' }])

    expect(issues).toEqual([
      {
        severity: 'error',
        message: 'SKILL.md is required.',
        path: 'SKILL.md',
        field: 'file',
        source: 'document'
      }
    ])
  })

  it('adds a validation source to issues', () => {
    const issues = withSource(
      [{ severity: 'warning', message: 'Check metadata.', path: 'SKILL.md', field: 'description' }],
      'workspace'
    )

    expect(issues).toEqual([
      {
        severity: 'warning',
        message: 'Check metadata.',
        path: 'SKILL.md',
        field: 'description',
        source: 'workspace'
      }
    ])
  })

  it('detects blocking errors', () => {
    expect(
      hasBlockingErrors([{ severity: 'error', message: 'No body.', path: 'SKILL.md', source: 'document' }])
    ).toBe(true)
    expect(
      hasBlockingErrors([{ severity: 'warning', message: 'No version.', path: 'SKILL.md', source: 'document' }])
    ).toBe(false)
  })

  it('suppresses equivalent document and workspace validation issues', () => {
    const merged = mergeValidationIssues(
      [{ severity: 'error', message: 'Skill name is required.', path: 'SKILL.md', field: 'name', source: 'document' }],
      [
        { severity: 'error', message: 'Skill name is required.', path: 'SKILL.md', field: 'name', source: 'workspace' },
        {
          severity: 'info',
          message: 'File is outside managed Skill paths and will not be loaded for editing.',
          path: 'notes.txt',
          field: 'file',
          source: 'workspace'
        }
      ]
    )

    expect(merged).toEqual([
      { severity: 'error', message: 'Skill name is required.', path: 'SKILL.md', field: 'name', source: 'document' },
      {
        severity: 'info',
        message: 'File is outside managed Skill paths and will not be loaded for editing.',
        path: 'notes.txt',
        field: 'file',
        source: 'workspace'
      }
    ])
  })
})
