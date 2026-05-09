import Editor from '@monaco-editor/react'
import {
  Boxes,
  CheckCircle2,
  Download,
  FileCode2,
  FolderOpen,
  Hammer,
  Play,
  Plus,
  Save,
  TerminalSquare,
  TriangleAlert
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  createSkillWorkspace,
  exportWorkspace,
  loadWorkspace,
  runDemoScript,
  saveWorkspace
} from './lib/workspaceAdapter'
import { parseCsv, parseSkillDocument, updateFrontmatter, validateSkillDocument } from './lib/skill'
import type { Skill, SkillExecution, SkillFile, ValidationIssue } from './types'

export default function App() {
  const [files, setFiles] = useState<SkillFile[]>(() => loadWorkspace().files)
  const [activePath, setActivePath] = useState(() => loadWorkspace().activePath)
  const [terminal, setTerminal] = useState<string[]>(['SkillForge workspace ready.'])
  const [lastExecution, setLastExecution] = useState<SkillExecution | null>(null)

  const activeFile = files.find((file) => file.path === activePath) ?? files[0]
  const skillFile = files.find((file) => file.path === 'SKILL.md')
  const parsed = useMemo(() => parseSkillDocument(skillFile?.content ?? ''), [skillFile?.content])
  const issues = useMemo(() => validateSkillDocument(skillFile?.content ?? ''), [skillFile?.content])

  useEffect(() => {
    saveWorkspace({ files, activePath })
  }, [files, activePath])

  function updateActiveFile(content: string) {
    setFiles((current) => current.map((file) => (file.path === activePath ? { ...file, content } : file)))
  }

  function updateMetadata(next: Skill) {
    if (!skillFile) return
    setFiles((current) =>
      current.map((file) =>
        file.path === 'SKILL.md' ? { ...file, content: updateFrontmatter(file.content, next) } : file
      )
    )
  }

  function handleCreateSkill() {
    const next = createSkillWorkspace('new-agent-skill')
    setFiles(next.files)
    setActivePath(next.activePath)
    setTerminal((current) => ['Created new Skill workspace.', ...current])
  }

  function handleSave() {
    saveWorkspace({ files, activePath })
    setTerminal((current) => [`Saved ${activePath}.`, ...current])
  }

  function handleValidate() {
    const counts = countIssues(issues)
    setTerminal((current) => [
      `Validation complete: ${counts.error} errors, ${counts.warning} warnings, ${counts.info} info.`,
      ...current
    ])
  }

  async function handleRun() {
    const script = files.find((file) => file.path === 'scripts/demo.js')
    const execution = await runDemoScript(parsed.metadata.id, script?.content ?? '')
    setLastExecution(execution)
    setTerminal((current) => [...execution.logs, ...current])
  }

  async function handleExport() {
    try {
      await exportWorkspace(files)
      setTerminal((current) => ['Exported .skill.zip package.', ...current])
    } catch (error) {
      setTerminal((current) => [`Export blocked: ${(error as Error).message}`, ...current])
    }
  }

  return (
    <main className="app-shell">
      <aside className="activity-rail" aria-label="Primary navigation">
        <Boxes className="brand-mark" size={28} />
        <button title="Explorer" className="rail-button active">
          <FolderOpen size={19} />
        </button>
        <button title="Runtime" className="rail-button">
          <TerminalSquare size={19} />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">SkillForge MVP</p>
            <h1>{parsed.metadata.name || 'Untitled Skill'}</h1>
          </div>
          <div className="toolbar">
            <button onClick={handleCreateSkill}>
              <Plus size={16} /> New
            </button>
            <button onClick={handleSave}>
              <Save size={16} /> Save
            </button>
            <button onClick={handleValidate}>
              <CheckCircle2 size={16} /> Validate
            </button>
            <button onClick={handleRun}>
              <Play size={16} /> Run
            </button>
            <button className="primary" onClick={handleExport}>
              <Download size={16} /> Export
            </button>
          </div>
        </header>

        <div className="ide-grid">
          <Explorer files={files} activePath={activePath} onSelect={setActivePath} />

          <section className="editor-pane">
            <div className="pane-header">
              <FileCode2 size={16} />
              <span>{activePath}</span>
            </div>
            <Editor
              height="100%"
              theme="vs-dark"
              language={activePath.endsWith('.md') ? 'markdown' : 'javascript'}
              value={activeFile?.content ?? ''}
              onChange={(value) => updateActiveFile(value ?? '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineHeight: 22,
                wordWrap: 'on',
                scrollBeyondLastLine: false
              }}
            />
          </section>

          <Inspector metadata={parsed.metadata} issues={issues} onChange={updateMetadata} />

          <TerminalPanel terminal={terminal} lastExecution={lastExecution} />
        </div>
      </section>
    </main>
  )
}

function Explorer({
  files,
  activePath,
  onSelect
}: {
  files: SkillFile[]
  activePath: string
  onSelect: (path: string) => void
}) {
  return (
    <aside className="explorer">
      <div className="pane-header">Explorer</div>
      <div className="tree">
        {files.map((file) => (
          <button
            key={file.path}
            className={file.path === activePath ? 'tree-item active' : 'tree-item'}
            onClick={() => onSelect(file.path)}
          >
            <FileCode2 size={15} />
            <span>{file.path}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

function Inspector({
  metadata,
  issues,
  onChange
}: {
  metadata: Skill
  issues: ValidationIssue[]
  onChange: (metadata: Skill) => void
}) {
  const counts = countIssues(issues)

  return (
    <aside className="inspector">
      <div className="pane-header">
        <Hammer size={16} />
        <span>Metadata</span>
      </div>
      <label>
        Name
        <input value={metadata.name} onChange={(event) => onChange({ ...metadata, name: event.target.value })} />
      </label>
      <label>
        Description
        <textarea
          value={metadata.description}
          onChange={(event) => onChange({ ...metadata, description: event.target.value })}
        />
      </label>
      <label>
        Version
        <input value={metadata.version} onChange={(event) => onChange({ ...metadata, version: event.target.value })} />
      </label>
      <label>
        Compatibility
        <input
          value={metadata.compatibility.join(', ')}
          onChange={(event) => onChange({ ...metadata, compatibility: parseCsv(event.target.value) })}
        />
      </label>
      <label>
        Tags
        <input
          value={metadata.tags.join(', ')}
          onChange={(event) => onChange({ ...metadata, tags: parseCsv(event.target.value) })}
        />
      </label>

      <div className="validation-summary">
        <span>{counts.error} errors</span>
        <span>{counts.warning} warnings</span>
        <span>{counts.info} info</span>
      </div>

      <div className="issues">
        {issues.map((issue, index) => (
          <div className={`issue ${issue.severity}`} key={`${issue.message}-${index}`}>
            <TriangleAlert size={15} />
            <span>{issue.message}</span>
          </div>
        ))}
        {issues.length === 0 && <div className="issue success">No validation issues.</div>}
      </div>
    </aside>
  )
}

function TerminalPanel({
  terminal,
  lastExecution
}: {
  terminal: string[]
  lastExecution: SkillExecution | null
}) {
  return (
    <section className="terminal">
      <div className="pane-header">
        <TerminalSquare size={16} />
        <span>Runtime Terminal</span>
        {lastExecution && <span className="execution-pill">{lastExecution.duration}ms</span>}
      </div>
      <pre>{terminal.join('\n')}</pre>
    </section>
  )
}

function countIssues(issues: ValidationIssue[]) {
  return {
    error: issues.filter((issue) => issue.severity === 'error').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length
  }
}
