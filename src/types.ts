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
  stdout?: string
  stderr?: string
  output: string
  logs: string[]
  duration: number
  status: 'success' | 'failed'
  timedOut?: boolean
}

export interface ValidationIssue {
  severity: IssueSeverity
  message: string
  path: string
  field?: string
}

export type ValidationSource = 'document' | 'workspace' | 'runtime'

export interface SourcedValidationIssue extends ValidationIssue {
  source: ValidationSource
}

export interface SkillSummary extends Skill {
  root: string
}

export interface WorkspaceState {
  skills: SkillSummary[]
  activeRoot: string | null
  files: SkillFile[]
  activePath: string
  dirtyPaths: string[]
  issues: SourcedValidationIssue[]
  lastExecution: SkillExecution | null
  isLoading: boolean
  statusMessage: string
}

export interface RunnableScript {
  path: string
  language: 'javascript' | 'python'
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
