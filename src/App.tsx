import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { SkillEditor } from './components/editor/SkillEditor'
import { SkillExplorer } from './components/explorer/SkillExplorer'
import { WorkspaceShell } from './components/layout/WorkspaceShell'
import { MetadataPanel } from './components/metadata/MetadataPanel'
import { RuntimePanel, type TerminalEntry } from './components/runtime/RuntimePanel'
import { countIssues } from './components/validator/ValidationPanel'
import {
  createTranslator,
  loadLocale,
  nextLocale,
  saveLocale
} from './lib/i18n'
import { getRunnableScripts } from './lib/runtime'
import { parseSkillDocument, updateFrontmatter } from './lib/skill'
import { isTauriRuntime } from './lib/tauriCommands'
import { loadTheme, nextTheme, saveTheme } from './lib/theme'
import {
  getActiveFile,
  getSkillFile,
  hasDirtyFiles,
  initialWorkspaceState,
  workspaceReducer
} from './lib/workspaceStore'
import {
  createWorkspaceAdapter,
  loadWorkspace,
  saveWorkspace
} from './lib/workspaceAdapter'
import { hasBlockingErrors, mergeValidationIssues, validateDocumentIssues, withSource } from './lib/validation'
import type { Skill, ValidationIssue } from './types'

function loadInitialWorkspaceState() {
  const snapshot = loadWorkspace()

  return {
    ...initialWorkspaceState,
    files: snapshot.files,
    activePath: snapshot.activePath
  }
}

export default function App() {
  const [locale, setLocale] = useState(() => loadLocale())
  const [theme, setTheme] = useState(() => loadTheme())
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, loadInitialWorkspaceState)
  const [terminal, setTerminal] = useState<TerminalEntry[]>(() => [{ kind: 'message', key: 'terminalReady' }])
  const [selectedScriptPath, setSelectedScriptPath] = useState('')
  const [openFolderPath, setOpenFolderPath] = useState('')
  const [isRuntimeRunning, setIsRuntimeRunning] = useState(false)
  const runtimeRunId = useRef(0)
  const runtimeInFlight = useRef(false)
  const adapter = useMemo(() => createWorkspaceAdapter(), [])
  const t = useMemo(() => createTranslator(locale), [locale])

  const activeFile = getActiveFile(workspace)
  const skillFile = getSkillFile(workspace)
  const parsed = useMemo(() => parseSkillDocument(skillFile?.content ?? ''), [skillFile?.content])
  const documentIssues = useMemo(() => validateDocumentIssues(workspace.files), [workspace.files])
  const runnableScripts = useMemo(() => getRunnableScripts(workspace.files), [workspace.files])

  useEffect(() => {
    dispatch({ type: 'setIssues', issues: documentIssues })
  }, [documentIssues])

  useEffect(() => {
    let cancelled = false

    async function loadSkills() {
      dispatch({ type: 'setLoading', isLoading: true })
      try {
        const skills = await adapter.listSkills()
        if (cancelled) return

        dispatch({ type: 'setSkills', skills })
        if (!isTauriRuntime() || skills.length === 0) {
          const snapshot = loadWorkspace()
          dispatch({ type: 'setWorkspace', root: null, files: snapshot.files, activePath: snapshot.activePath })
          return
        }

        const loaded = await adapter.openSkill(skills[0].root)
        if (!cancelled) {
          dispatch({ type: 'setWorkspace', root: loaded.root, files: loaded.files, activePath: loaded.activePath })
        }
      } catch (error) {
        if (!cancelled) {
          const message = errorMessage(error)
          dispatch({ type: 'setStatus', message })
          setTerminal((current) => [{ kind: 'raw', text: `Workspace load failed: ${message}` }, ...current])
        }
      } finally {
        if (!cancelled) dispatch({ type: 'setLoading', isLoading: false })
      }
    }

    void loadSkills()

    return () => {
      cancelled = true
    }
  }, [adapter])

  useEffect(() => {
    if (workspace.activeRoot === null) {
      saveWorkspace({ files: workspace.files, activePath: workspace.activePath })
    }
  }, [workspace.activeRoot, workspace.files, workspace.activePath])

  useEffect(() => {
    saveLocale(locale)
  }, [locale])

  useEffect(() => {
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    if (runnableScripts.length === 0) {
      setSelectedScriptPath('')
      return
    }

    if (!runnableScripts.some((script) => script.path === selectedScriptPath)) {
      setSelectedScriptPath(runnableScripts[0].path)
    }
  }, [runnableScripts, selectedScriptPath])

  function updateActiveFile(content: string) {
    dispatch({ type: 'updateFile', path: workspace.activePath, content })
  }

  function updateMetadata(next: Skill) {
    if (!skillFile) return

    dispatch({
      type: 'updateFile',
      path: 'SKILL.md',
      content: updateFrontmatter(skillFile.content, next)
    })
  }

  function confirmDiscardDirty() {
    return !hasDirtyFiles(workspace) || window.confirm(t('confirmDiscardDirty'))
  }

  function hasUnsavedTauriWorkspaceChanges() {
    return isTauriRuntime() && workspace.activeRoot !== null && hasDirtyFiles(workspace)
  }

  function blockUntilSaved(key: 'terminalSaveBeforeRun' | 'terminalSaveBeforeExport') {
    const message = t(key)
    dispatch({ type: 'setStatus', message })
    setTerminal((current) => [{ kind: 'message', key }, ...current])
  }

  async function handleCreateSkill() {
    if (!confirmDiscardDirty()) return

    try {
      const next = await adapter.createSkill('new-agent-skill')
      dispatch({ type: 'setWorkspace', root: next.root, files: next.files, activePath: next.activePath })
      setTerminal((current) => [{ kind: 'message', key: 'terminalCreated' }, ...current])
    } catch (error) {
      const message = errorMessage(error)
      dispatch({ type: 'setStatus', message })
      setTerminal((current) => [{ kind: 'raw', text: `Create skill failed: ${message}` }, ...current])
    }
  }

  async function handleOpenFolder() {
    const root = openFolderPath.trim()
    if (!root) {
      dispatch({ type: 'setStatus', message: t('openFolderPathRequired') })
      setTerminal((current) => [{ kind: 'message', key: 'terminalOpenFolderRequired' }, ...current])
      return
    }

    if (!confirmDiscardDirty()) return

    dispatch({ type: 'setLoading', isLoading: true })
    try {
      const loaded = await adapter.openSkill(root)
      dispatch({ type: 'setWorkspace', root: loaded.root, files: loaded.files, activePath: loaded.activePath })
      setTerminal((current) => [
        { kind: 'message', key: 'terminalOpenedFolder', values: { path: root } },
        ...current
      ])
    } catch (error) {
      const message = errorMessage(error)
      dispatch({ type: 'setStatus', message })
      setTerminal((current) => [{ kind: 'raw', text: `Open folder failed: ${message}` }, ...current])
    } finally {
      dispatch({ type: 'setLoading', isLoading: false })
    }
  }

  async function handleRefresh() {
    if (!confirmDiscardDirty()) return

    dispatch({ type: 'setLoading', isLoading: true })
    try {
      const skills = await adapter.listSkills()
      dispatch({ type: 'setSkills', skills })

      if (workspace.activeRoot) {
        const loaded = await adapter.openSkill(workspace.activeRoot)
        dispatch({ type: 'setWorkspace', root: loaded.root, files: loaded.files, activePath: loaded.activePath })
      } else {
        const snapshot = loadWorkspace()
        dispatch({ type: 'setWorkspace', root: null, files: snapshot.files, activePath: snapshot.activePath })
      }

      setTerminal((current) => [{ kind: 'message', key: 'terminalRefreshed' }, ...current])
    } catch (error) {
      const message = errorMessage(error)
      dispatch({ type: 'setStatus', message })
      setTerminal((current) => [{ kind: 'raw', text: `Refresh failed: ${message}` }, ...current])
    } finally {
      dispatch({ type: 'setLoading', isLoading: false })
    }
  }

  async function handleSave() {
    if (!activeFile) return

    try {
      await adapter.saveFile(workspace.activeRoot, workspace.activePath, activeFile.content)
      dispatch({ type: 'markSaved', path: workspace.activePath })
      setTerminal((current) => [
        { kind: 'message', key: 'terminalSaved', values: { path: workspace.activePath } },
        ...current
      ])
    } catch (error) {
      setTerminal((current) => [
        { kind: 'message', key: 'terminalSaveBlocked', values: { message: (error as Error).message } },
        ...current
      ])
    }
  }

  async function handleValidate() {
    try {
      const workspaceIssues = withSource(
        (await adapter.validateWorkspace(workspace.activeRoot, workspace.files)) as ValidationIssue[],
        'workspace'
      )
      const validationIssues = mergeValidationIssues(documentIssues, workspaceIssues)
      const counts = countIssues(validationIssues)
      dispatch({ type: 'setIssues', issues: validationIssues })
      setTerminal((current) => [
        {
          kind: 'message',
          key: 'terminalValidation',
          values: { errors: counts.error, warnings: counts.warning, info: counts.info }
        },
        ...current
      ])
    } catch (error) {
      const message = errorMessage(error)
      dispatch({ type: 'setStatus', message })
      setTerminal((current) => [{ kind: 'raw', text: `Validation failed: ${message}` }, ...current])
    }
  }

  async function handleRun() {
    if (hasUnsavedTauriWorkspaceChanges()) {
      blockUntilSaved('terminalSaveBeforeRun')
      return
    }

    if (runtimeInFlight.current) {
      dispatch({ type: 'setStatus', message: 'Runtime is already running.' })
      return
    }

    const scriptPath = selectedScriptPath || runnableScripts[0]?.path
    const script = workspace.files.find((file) => file.path === scriptPath)
    if (!script) {
      dispatch({ type: 'setStatus', message: 'No runnable script is available.' })
      setTerminal((current) => [{ kind: 'raw', text: 'No runnable script is available.' }, ...current])
      return
    }

    const runId = runtimeRunId.current + 1
    runtimeRunId.current = runId
    runtimeInFlight.current = true
    setIsRuntimeRunning(true)

    try {
      const execution = await adapter.runScript(workspace.activeRoot, script.path, parsed.metadata.id, script.content)
      if (runtimeRunId.current !== runId) return
      dispatch({ type: 'setExecution', execution })
      dispatch({ type: 'setStatus', message: `${execution.status} in ${execution.duration}ms` })
      setTerminal((current) => [...execution.logs.map((text) => ({ kind: 'raw' as const, text })), ...current])
    } catch (error) {
      if (runtimeRunId.current !== runId) return
      const message = errorMessage(error)
      dispatch({ type: 'setExecution', execution: null })
      dispatch({ type: 'setStatus', message })
      setTerminal((current) => [{ kind: 'raw', text: message }, ...current])
    } finally {
      if (runtimeRunId.current === runId) {
        runtimeInFlight.current = false
        setIsRuntimeRunning(false)
      }
    }
  }

  async function handleExport() {
    if (hasUnsavedTauriWorkspaceChanges()) {
      blockUntilSaved('terminalSaveBeforeExport')
      return
    }

    try {
      const workspaceIssues = withSource(
        (await adapter.validateWorkspace(workspace.activeRoot, workspace.files)) as ValidationIssue[],
        'workspace'
      )
      const validationIssues = mergeValidationIssues(validateDocumentIssues(workspace.files), workspaceIssues)
      if (hasBlockingErrors(validationIssues)) {
        setTerminal((current) => [
          {
            kind: 'message',
            key: 'terminalExportBlocked',
            values: {
              message: validationIssues.find((issue) => issue.severity === 'error')?.message ?? 'Validation failed.'
            }
          },
          ...current
        ])
        dispatch({ type: 'setIssues', issues: validationIssues })
        return
      }

      const exportPath = await adapter.exportWorkspace(workspace.activeRoot, workspace.files)
      setTerminal((current) => [
        { kind: 'message', key: 'terminalExported', values: { path: exportPath } },
        ...current
      ])
    } catch (error) {
      setTerminal((current) => [
        { kind: 'message', key: 'terminalExportBlocked', values: { message: (error as Error).message } },
        ...current
      ])
    }
  }

  return (
    <WorkspaceShell
      title={parsed.metadata.name}
      theme={theme}
      locale={locale}
      t={t}
      openFolderPath={openFolderPath}
      onCreateSkill={handleCreateSkill}
      onOpenFolderPathChange={setOpenFolderPath}
      onOpenFolder={handleOpenFolder}
      onRefresh={handleRefresh}
      onSave={handleSave}
      onValidate={handleValidate}
      onRun={handleRun}
      onToggleTheme={() => setTheme(nextTheme)}
      onToggleLocale={() => setLocale(nextLocale)}
      onExport={handleExport}
    >
      <SkillExplorer
        files={workspace.files}
        activePath={workspace.activePath}
        dirtyPaths={workspace.dirtyPaths}
        onSelectFile={(path) => dispatch({ type: 'selectFile', path })}
        title={t('explorerTitle')}
      />

      <SkillEditor
        activePath={workspace.activePath}
        content={activeFile?.content ?? ''}
        isDirty={workspace.dirtyPaths.includes(workspace.activePath)}
        theme={theme}
        onChange={updateActiveFile}
      />

      <MetadataPanel metadata={parsed.metadata} issues={workspace.issues} onChange={updateMetadata} t={t} />

      <RuntimePanel
        terminal={terminal}
        lastExecution={workspace.lastExecution}
        runnableScripts={runnableScripts}
        selectedScriptPath={selectedScriptPath}
        isRunning={isRuntimeRunning}
        title={t('terminalTitle')}
        t={t}
        onSelectScript={setSelectedScriptPath}
        onRun={handleRun}
      />
    </WorkspaceShell>
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
