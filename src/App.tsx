import Editor from '@monaco-editor/react'
import {
  Boxes,
  CheckCircle2,
  Download,
  FileCode2,
  FolderOpen,
  Hammer,
  Languages,
  Moon,
  Play,
  Plus,
  Save,
  Sun,
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
import {
  createTranslator,
  loadLocale,
  locales,
  localizeIssue,
  nextLocale,
  saveLocale,
  type TranslationKey
} from './lib/i18n'
import { parseCsv, parseSkillDocument, updateFrontmatter, validateSkillDocument } from './lib/skill'
import { loadTheme, nextTheme, saveTheme } from './lib/theme'
import type { Skill, SkillExecution, SkillFile, ValidationIssue } from './types'

type TerminalEntry =
  | { kind: 'message'; key: TranslationKey; values?: Record<string, string | number> }
  | { kind: 'raw'; text: string }

export default function App() {
  const [locale, setLocale] = useState(() => loadLocale())
  const [theme, setTheme] = useState(() => loadTheme())
  const t = useMemo(() => createTranslator(locale), [locale])
  const [files, setFiles] = useState<SkillFile[]>(() => loadWorkspace().files)
  const [activePath, setActivePath] = useState(() => loadWorkspace().activePath)
  const [terminal, setTerminal] = useState<TerminalEntry[]>(() => [{ kind: 'message', key: 'terminalReady' }])
  const [lastExecution, setLastExecution] = useState<SkillExecution | null>(null)

  const activeFile = files.find((file) => file.path === activePath) ?? files[0]
  const skillFile = files.find((file) => file.path === 'SKILL.md')
  const parsed = useMemo(() => parseSkillDocument(skillFile?.content ?? ''), [skillFile?.content])
  const issues = useMemo(() => validateSkillDocument(skillFile?.content ?? ''), [skillFile?.content])

  useEffect(() => {
    saveWorkspace({ files, activePath })
  }, [files, activePath])

  useEffect(() => {
    saveLocale(locale)
  }, [locale])

  useEffect(() => {
    saveTheme(theme)
  }, [theme])

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
    setTerminal((current) => [{ kind: 'message', key: 'terminalCreated' }, ...current])
  }

  function handleSave() {
    saveWorkspace({ files, activePath })
    setTerminal((current) => [{ kind: 'message', key: 'terminalSaved', values: { path: activePath } }, ...current])
  }

  function handleValidate() {
    const counts = countIssues(issues)
    setTerminal((current) => [
      {
        kind: 'message',
        key: 'terminalValidation',
        values: { errors: counts.error, warnings: counts.warning, info: counts.info }
      },
      ...current
    ])
  }

  async function handleRun() {
    const script = files.find((file) => file.path === 'scripts/demo.js')
    const execution = await runDemoScript(parsed.metadata.id, script?.content ?? '')
    setLastExecution(execution)
    setTerminal((current) => [...execution.logs.map((text) => ({ kind: 'raw' as const, text })), ...current])
  }

  async function handleExport() {
    try {
      await exportWorkspace(files)
      setTerminal((current) => [{ kind: 'message', key: 'terminalExported' }, ...current])
    } catch (error) {
      setTerminal((current) => [
        { kind: 'message', key: 'terminalExportBlocked', values: { message: (error as Error).message } },
        ...current
      ])
    }
  }

  return (
    <main className="app-shell" data-theme={theme} aria-label={t('appAria')}>
      <aside className="activity-rail" aria-label={t('activityNav')}>
        <Boxes className="brand-mark" size={28} />
        <button title={t('navExplorer')} className="rail-button active">
          <FolderOpen size={19} />
        </button>
        <button title={t('navRuntime')} className="rail-button">
          <TerminalSquare size={19} />
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t('appEyebrow')}</p>
            <h1>{parsed.metadata.name || t('untitledSkill')}</h1>
          </div>
          <div className="toolbar">
            <button onClick={handleCreateSkill}>
              <Plus size={16} /> {t('toolbarNew')}
            </button>
            <button onClick={handleSave}>
              <Save size={16} /> {t('toolbarSave')}
            </button>
            <button onClick={handleValidate}>
              <CheckCircle2 size={16} /> {t('toolbarValidate')}
            </button>
            <button onClick={handleRun}>
              <Play size={16} /> {t('toolbarRun')}
            </button>
            <button
              title={theme === 'dark' ? t('toolbarThemeLight') : t('toolbarThemeDark')}
              onClick={() => setTheme(nextTheme)}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? t('themeLight') : t('themeDark')}
            </button>
            <button title={t('toolbarLanguage')} onClick={() => setLocale(nextLocale)}>
              <Languages size={16} /> {locales[locale]}
            </button>
            <button className="primary" onClick={handleExport}>
              <Download size={16} /> {t('toolbarExport')}
            </button>
          </div>
        </header>

        <div className="ide-grid">
          <Explorer files={files} activePath={activePath} onSelect={setActivePath} title={t('explorerTitle')} />

          <section className="editor-pane">
            <div className="pane-header">
              <FileCode2 size={16} />
              <span>{activePath}</span>
            </div>
            <Editor
              height="100%"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
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

          <Inspector metadata={parsed.metadata} issues={issues} onChange={updateMetadata} t={t} />

          <TerminalPanel terminal={terminal} lastExecution={lastExecution} title={t('terminalTitle')} t={t} />
        </div>
      </section>
    </main>
  )
}

function Explorer({
  files,
  activePath,
  onSelect,
  title
}: {
  files: SkillFile[]
  activePath: string
  onSelect: (path: string) => void
  title: string
}) {
  return (
    <aside className="explorer">
      <div className="pane-header">{title}</div>
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
  onChange,
  t
}: {
  metadata: Skill
  issues: ValidationIssue[]
  onChange: (metadata: Skill) => void
  t: ReturnType<typeof createTranslator>
}) {
  const counts = countIssues(issues)

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
        {issues.map((issue, index) => (
          <div className={`issue ${issue.severity}`} key={`${issue.message}-${index}`}>
            <TriangleAlert size={15} />
            <span>{localizeIssue(issue, t)}</span>
          </div>
        ))}
        {issues.length === 0 && <div className="issue success">{t('noValidationIssues')}</div>}
      </div>
    </aside>
  )
}

function TerminalPanel({
  terminal,
  lastExecution,
  title,
  t
}: {
  terminal: TerminalEntry[]
  lastExecution: SkillExecution | null
  title: string
  t: ReturnType<typeof createTranslator>
}) {
  const terminalText = terminal
    .map((entry) => (entry.kind === 'message' ? t(entry.key, entry.values) : entry.text))
    .join('\n')

  return (
    <section className="terminal">
      <div className="pane-header">
        <TerminalSquare size={16} />
        <span>{title}</span>
        {lastExecution && <span className="execution-pill">{lastExecution.duration}ms</span>}
      </div>
      <pre>{terminalText}</pre>
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
