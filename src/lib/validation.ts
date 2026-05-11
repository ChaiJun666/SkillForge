import { validateSkillDocument } from './skill'
import type { SkillFile, SourcedValidationIssue, ValidationIssue, ValidationSource } from '../types'

export function validateDocumentIssues(files: SkillFile[]): SourcedValidationIssue[] {
  const skillFile = files.find((file) => file.path === 'SKILL.md')
  if (!skillFile) {
    return [
      {
        severity: 'error',
        message: 'SKILL.md is required.',
        path: 'SKILL.md',
        field: 'file',
        source: 'document'
      }
    ]
  }

  return withSource(validateSkillDocument(skillFile.content), 'document')
}

export function withSource(issues: ValidationIssue[], source: ValidationSource): SourcedValidationIssue[] {
  return issues.map((issue) => ({ ...issue, source }))
}

export function mergeValidationIssues(
  documentIssues: SourcedValidationIssue[],
  workspaceIssues: SourcedValidationIssue[]
): SourcedValidationIssue[] {
  const seen = new Set<string>()
  const merged: SourcedValidationIssue[] = []

  for (const issue of [...documentIssues, ...workspaceIssues]) {
    const key = `${issue.path}|${issue.field ?? ''}|${issue.message}`
    if (seen.has(key)) continue

    seen.add(key)
    merged.push(issue)
  }

  return merged
}

export function hasBlockingErrors(issues: SourcedValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}
