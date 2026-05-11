import { FileCode2 } from 'lucide-react'
import type { SkillFile } from '../../types'

export interface SkillExplorerProps {
  files: SkillFile[]
  activePath: string
  dirtyPaths: string[]
  onSelectFile: (path: string) => void
  title: string
}

export function SkillExplorer({ files, activePath, dirtyPaths, onSelectFile, title }: SkillExplorerProps) {
  return (
    <aside className="explorer">
      <div className="pane-header">{title}</div>
      <div className="tree">
        {files.map((file) => {
          const isDirty = dirtyPaths.includes(file.path)

          return (
            <button
              key={file.path}
              className={file.path === activePath ? 'tree-item active' : 'tree-item'}
              data-dirty={isDirty ? 'true' : undefined}
              onClick={() => onSelectFile(file.path)}
            >
              <FileCode2 size={15} />
              <span>{file.path}</span>
              {isDirty && <span className="dirty-marker" aria-label="Unsaved changes">*</span>}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
