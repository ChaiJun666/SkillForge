import { TriangleAlert } from 'lucide-react'
import { createTranslator, localizeIssue } from '../../lib/i18n'
import type { IssueSeverity, ValidationIssue, ValidationSource } from '../../types'

export interface ValidationPanelProps {
  issues: Array<ValidationIssue & { source?: ValidationSource }>
  t: ReturnType<typeof createTranslator>
}

export function ValidationPanel({ issues, t }: ValidationPanelProps) {
  const counts = countIssues(issues)
  const groups = groupIssuesBySeverity(issues)

  return (
    <>
      <div className="validation-summary">
        <span>
          {counts.error} {t('validationErrors')}
        </span>
        <span>
          {counts.warning} {t('validationWarnings')}
        </span>
        <span>
          {counts.info} {t('validationInfo')}
        </span>
      </div>

      <div className="issues">
        {severityOrder.map((severity) =>
          groups[severity].map((issue, index) => (
            <div className={`issue ${issue.severity}`} key={`${issue.source ?? 'unknown'}-${issue.message}-${index}`}>
              <TriangleAlert size={15} />
              <span>
                <strong>{issue.source ?? 'document'}</strong>
                {': '}
                {localizeIssue(issue, t)}
              </span>
            </div>
          ))
        )}
        {issues.length === 0 && <div className="issue success">{t('noValidationIssues')}</div>}
      </div>
    </>
  )
}

export function countIssues(issues: Array<Pick<ValidationIssue, 'severity'>>) {
  return {
    error: issues.filter((issue) => issue.severity === 'error').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length
  }
}

const severityOrder: IssueSeverity[] = ['error', 'warning', 'info']

function groupIssuesBySeverity(issues: Array<ValidationIssue & { source?: ValidationSource }>) {
  return {
    error: issues.filter((issue) => issue.severity === 'error'),
    warning: issues.filter((issue) => issue.severity === 'warning'),
    info: issues.filter((issue) => issue.severity === 'info')
  }
}
