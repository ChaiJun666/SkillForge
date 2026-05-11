import Editor from '@monaco-editor/react'
import { FileCode2 } from 'lucide-react'

export interface SkillEditorProps {
  activePath: string
  content: string
  isDirty?: boolean
  theme: 'dark' | 'light'
  onChange: (content: string) => void
}

export function SkillEditor({ activePath, content, isDirty = false, theme, onChange }: SkillEditorProps) {
  return (
    <section className="editor-pane">
      <div className="pane-header">
        <FileCode2 size={16} />
        <span>{activePath}</span>
        {isDirty && <span className="dirty-marker" aria-label="Unsaved changes">*</span>}
      </div>
      <Editor
        height="100%"
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        language={activePath.endsWith('.md') ? 'markdown' : 'javascript'}
        value={content}
        onChange={(value) => onChange(value ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 22,
          wordWrap: 'on',
          scrollBeyondLastLine: false
        }}
      />
    </section>
  )
}
