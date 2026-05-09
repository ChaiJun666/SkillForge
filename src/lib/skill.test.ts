import { describe, expect, it } from 'vitest'
import { parseSkillDocument, updateFrontmatter, validateSkillDocument } from './skill'
import { sampleSkill } from './sampleSkill'

describe('skill document parsing', () => {
  it('extracts frontmatter fields and markdown body', () => {
    const parsed = parseSkillDocument(sampleSkill)

    expect(parsed.metadata.name).toBe('seo-blog-writer')
    expect(parsed.metadata.compatibility).toEqual(['codex', 'openai'])
    expect(parsed.metadata.tags).toEqual(['seo', 'writing'])
    expect(parsed.body).toContain('# SEO Blog Writer')
  })

  it('updates editable metadata without dropping the body', () => {
    const parsed = parseSkillDocument(sampleSkill)
    const updated = updateFrontmatter(sampleSkill, {
      ...parsed.metadata,
      name: 'research-synthesizer',
      tags: ['research', 'analysis']
    })

    expect(updated).toContain('name: research-synthesizer')
    expect(updated).toContain('  - research')
    expect(updated).toContain('# SEO Blog Writer')
  })
})

describe('skill validation', () => {
  it('passes the sample document without blocking errors', () => {
    const issues = validateSkillDocument(sampleSkill)

    expect(issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })

  it('blocks missing frontmatter and empty prompt bodies', () => {
    const issues = validateSkillDocument('# Empty')

    expect(issues.some((issue) => issue.field === 'frontmatter')).toBe(true)
    expect(issues.some((issue) => issue.message.includes('Prompt body'))).toBe(true)
  })
})
