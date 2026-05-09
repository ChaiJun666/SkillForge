import type { ParsedSkill, Skill, ValidationIssue } from '../types'

const listFields = new Set(['compatibility', 'tags'])

export function parseSkillDocument(content: string, path = 'SKILL.md'): ParsedSkill {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const rawFrontmatter = frontmatterMatch?.[1] ?? ''
  const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content
  const fields = parseYamlLike(rawFrontmatter)
  const now = new Date().toISOString()

  const metadata: Skill = {
    id: slugify(String(fields.name ?? 'untitled-skill')),
    name: String(fields.name ?? ''),
    description: String(fields.description ?? ''),
    version: String(fields.version ?? ''),
    compatibility: toStringList(fields.compatibility),
    tags: toStringList(fields.tags),
    path,
    createdAt: now,
    updatedAt: now
  }

  return { metadata, body, rawFrontmatter }
}

export function updateFrontmatter(content: string, metadata: Skill): string {
  const body = parseSkillDocument(content).body.trimStart()
  const frontmatter = [
    '---',
    `name: ${metadata.name}`,
    `description: ${metadata.description}`,
    `version: ${metadata.version}`,
    'compatibility:',
    ...metadata.compatibility.map((item) => `  - ${item}`),
    'tags:',
    ...metadata.tags.map((item) => `  - ${item}`),
    '---'
  ].join('\n')

  return `${frontmatter}\n\n${body}`
}

export function validateSkillDocument(content: string, path = 'SKILL.md'): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const hasFrontmatter = content.trimStart().startsWith('---')
  const parsed = parseSkillDocument(content, path)

  if (!hasFrontmatter) {
    issues.push({
      severity: 'error',
      message: 'SKILL.md must start with YAML frontmatter.',
      path,
      field: 'frontmatter'
    })
  }

  if (!parsed.metadata.name.trim()) {
    issues.push({ severity: 'error', message: 'Skill name is required.', path, field: 'name' })
  }

  if (!parsed.metadata.description.trim()) {
    issues.push({
      severity: 'warning',
      message: 'Description helps users understand when to activate the skill.',
      path,
      field: 'description'
    })
  }

  if (!parsed.metadata.version.trim()) {
    issues.push({ severity: 'warning', message: 'Version is missing.', path, field: 'version' })
  }

  if (parsed.metadata.compatibility.length === 0) {
    issues.push({
      severity: 'info',
      message: 'Compatibility is empty; add target agent ecosystems when known.',
      path,
      field: 'compatibility'
    })
  }

  if (parsed.body.trim().length < 30) {
    issues.push({
      severity: 'error',
      message: 'Prompt body is too short to guide an agent reliably.',
      path
    })
  }

  return issues
}

export function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseYamlLike(raw: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  let activeList: string | null = null

  for (const line of raw.split(/\r?\n/)) {
    const listItem = line.match(/^\s+-\s+(.+)$/)
    if (listItem && activeList) {
      const current = result[activeList]
      result[activeList] = Array.isArray(current) ? [...current, listItem[1].trim()] : [listItem[1].trim()]
      continue
    }

    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!field) continue

    const [, key, value] = field
    activeList = listFields.has(key) && !value ? key : null
    result[key] = activeList ? [] : value.trim().replace(/^['"]|['"]$/g, '')
  }

  return result
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return parseCsv(value)
  return []
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
