import { Hammer } from 'lucide-react'
import { createTranslator } from '../../lib/i18n'
import { parseCsv } from '../../lib/skill'
import type { Skill, ValidationIssue } from '../../types'
import { ValidationPanel } from '../validator/ValidationPanel'

export interface MetadataPanelProps {
  metadata: Skill
  issues: ValidationIssue[]
  onChange: (metadata: Skill) => void
  t: ReturnType<typeof createTranslator>
}

export function MetadataPanel({ metadata, issues, onChange, t }: MetadataPanelProps) {
  return (
    <aside className="inspector">
      <div className="pane-header">
        <Hammer size={16} />
        <span>{t('metadataTitle')}</span>
      </div>
      <label>
        {t('fieldName')}
        <input value={metadata.name} onChange={(event) => onChange({ ...metadata, name: event.target.value })} />
      </label>
      <label>
        {t('fieldDescription')}
        <textarea
          value={metadata.description}
          onChange={(event) => onChange({ ...metadata, description: event.target.value })}
        />
      </label>
      <label>
        {t('fieldVersion')}
        <input value={metadata.version} onChange={(event) => onChange({ ...metadata, version: event.target.value })} />
      </label>
      <label>
        {t('fieldCompatibility')}
        <input
          value={metadata.compatibility.join(', ')}
          onChange={(event) => onChange({ ...metadata, compatibility: parseCsv(event.target.value) })}
        />
      </label>
      <label>
        {t('fieldTags')}
        <input
          value={metadata.tags.join(', ')}
          onChange={(event) => onChange({ ...metadata, tags: parseCsv(event.target.value) })}
        />
      </label>

      <ValidationPanel issues={issues} t={t} />
    </aside>
  )
}
