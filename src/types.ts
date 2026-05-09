export type IssueSeverity = 'error' | 'warning' | 'info'

export interface Skill {
  id: string
  name: string
  description: string
  version: string
  compatibility: string[]
  tags: string[]
  path: string
  createdAt: string
  updatedAt: string
}

export interface SkillExecution {
  id: string
  skillId: string
  input: string
  output: string
  logs: string[]
  duration: number
  status: 'success' | 'failed'
}

export interface ValidationIssue {
  severity: IssueSeverity
  message: string
  path: string
  field?: string
}

export interface ParsedSkill {
  metadata: Skill
  body: string
  rawFrontmatter: string
}

export interface SkillFile {
  path: string
  content: string
}
