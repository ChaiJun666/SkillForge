# SkillForge MVP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete SkillForge as a real local-first desktop MVP for creating, editing, validating, running, and exporting Agent Skills.

**Architecture:** Refactor the current single-file React prototype into focused IDE modules, then connect the UI to the existing Tauri command surface. Keep browser demo mode working through a fallback adapter, and enforce runtime safety in Rust for `.js` and `.py` scripts under `scripts/`.

**Tech Stack:** Tauri v2, Rust, React 19, TypeScript, Vite, Monaco Editor, Vitest, existing CSS, existing package scripts.

---

## File Structure

Create:

- `src/components/layout/WorkspaceShell.tsx`
  - IDE shell layout, toolbar wiring, language/theme controls, empty state.
- `src/components/explorer/SkillExplorer.tsx`
  - Skill list and active Skill file tree.
- `src/components/editor/SkillEditor.tsx`
  - Monaco editor wrapper.
- `src/components/metadata/MetadataPanel.tsx`
  - Metadata form for `SKILL.md` frontmatter.
- `src/components/validator/ValidationPanel.tsx`
  - Source-aware validation issue display.
- `src/components/runtime/RuntimePanel.tsx`
  - Runnable script picker and structured runtime output.
- `src/components/importExport/ImportExportPanel.tsx`
  - Open folder, export, refresh, and save controls if they do not remain in topbar.
- `src/lib/workspaceStore.ts`
  - Workspace state, reducer, selectors, and dirty-file transitions.
- `src/lib/workspaceStore.test.ts`
  - Unit tests for reducer and selectors.
- `src/lib/validation.ts`
  - Frontend validation wrapper and issue normalization.
- `src/lib/validation.test.ts`
  - Unit tests for normalized validation behavior.
- `src/lib/runtime.ts`
  - Runnable script filtering and runtime result helpers.
- `src/lib/runtime.test.ts`
  - Unit tests for script filtering and result helpers.
- `src/lib/workspaceAdapter.test.ts`
  - Unit tests for browser fallback behavior and error mapping.

Modify:

- `src/App.tsx`
  - Reduce to app initialization, state reducer wiring, and command handlers.
- `src/types.ts`
  - Add workspace, validation source, runtime timeout, and script types.
- `src/lib/workspaceAdapter.ts`
  - Use Tauri commands in desktop runtime and keep browser fallback.
- `src/lib/tauriCommands.ts`
  - Add or adjust typed command wrappers only as needed.
- `src/lib/skill.ts`
  - Keep parser/update functions, tighten validation only where needed.
- `src/lib/i18n.ts`
  - Add strings for new controls, dirty state, runtime status, and validation sources.
- `src/styles.css`
  - Add classes for new components without changing the dense IDE direction.
- `src-tauri/src/lib.rs`
  - Add runtime timeout, allowed script checks, workspace validation, and export safety.
- `README.md`
  - Update current MVP capability descriptions after implementation.
- `README_ZH.md`
  - Mirror README updates in Chinese.

Verification commands:

- `pnpm test`
- `pnpm build`
- `pnpm tauri:build`

## Task 1: State Model and Behavior-Preserving Component Split

**Files:**
- Create: `src/lib/workspaceStore.ts`
- Create: `src/lib/workspaceStore.test.ts`
- Create: `src/components/layout/WorkspaceShell.tsx`
- Create: `src/components/explorer/SkillExplorer.tsx`
- Create: `src/components/editor/SkillEditor.tsx`
- Create: `src/components/metadata/MetadataPanel.tsx`
- Create: `src/components/validator/ValidationPanel.tsx`
- Create: `src/components/runtime/RuntimePanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/types.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Extend shared types**

Add these types to `src/types.ts` while preserving the existing `Skill`, `SkillExecution`, `ValidationIssue`, `ParsedSkill`, and `SkillFile` exports:

```ts
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
```

- [ ] **Step 2: Create workspace reducer**

Create `src/lib/workspaceStore.ts` with these exports:

```ts
import type { SkillExecution, SkillFile, SkillSummary, SourcedValidationIssue, WorkspaceState } from '../types'

export type WorkspaceAction =
  | { type: 'setLoading'; isLoading: boolean }
  | { type: 'setSkills'; skills: SkillSummary[] }
  | { type: 'setWorkspace'; root: string | null; files: SkillFile[]; activePath?: string }
  | { type: 'selectFile'; path: string }
  | { type: 'updateFile'; path: string; content: string }
  | { type: 'markSaved'; path: string }
  | { type: 'setIssues'; issues: SourcedValidationIssue[] }
  | { type: 'setExecution'; execution: SkillExecution | null }
  | { type: 'setStatus'; message: string }

export const initialWorkspaceState: WorkspaceState = {
  skills: [],
  activeRoot: null,
  files: [],
  activePath: 'SKILL.md',
  dirtyPaths: [],
  issues: [],
  lastExecution: null,
  isLoading: false,
  statusMessage: 'SkillForge workspace ready.'
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'setLoading':
      return { ...state, isLoading: action.isLoading }
    case 'setSkills':
      return { ...state, skills: action.skills }
    case 'setWorkspace':
      return {
        ...state,
        activeRoot: action.root,
        files: action.files,
        activePath: action.activePath ?? 'SKILL.md',
        dirtyPaths: [],
        issues: [],
        lastExecution: null
      }
    case 'selectFile':
      return { ...state, activePath: action.path }
    case 'updateFile':
      return {
        ...state,
        files: state.files.map((file) => (file.path === action.path ? { ...file, content: action.content } : file)),
        dirtyPaths: state.dirtyPaths.includes(action.path) ? state.dirtyPaths : [...state.dirtyPaths, action.path]
      }
    case 'markSaved':
      return { ...state, dirtyPaths: state.dirtyPaths.filter((path) => path !== action.path) }
    case 'setIssues':
      return { ...state, issues: action.issues }
    case 'setExecution':
      return { ...state, lastExecution: action.execution }
    case 'setStatus':
      return { ...state, statusMessage: action.message }
  }
}

export function getActiveFile(state: WorkspaceState): SkillFile | undefined {
  return state.files.find((file) => file.path === state.activePath) ?? state.files[0]
}

export function getSkillFile(state: WorkspaceState): SkillFile | undefined {
  return state.files.find((file) => file.path === 'SKILL.md')
}

export function hasDirtyFiles(state: WorkspaceState): boolean {
  return state.dirtyPaths.length > 0
}
```

- [ ] **Step 3: Add reducer tests**

Create `src/lib/workspaceStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getActiveFile, hasDirtyFiles, initialWorkspaceState, workspaceReducer } from './workspaceStore'

describe('workspaceStore', () => {
  it('loads a workspace and selects SKILL.md by default', () => {
    const state = workspaceReducer(initialWorkspaceState, {
      type: 'setWorkspace',
      root: 'C:/skills/demo',
      files: [{ path: 'SKILL.md', content: '# Demo' }]
    })

    expect(state.activeRoot).toBe('C:/skills/demo')
    expect(getActiveFile(state)?.path).toBe('SKILL.md')
    expect(hasDirtyFiles(state)).toBe(false)
  })

  it('tracks dirty files and clears them after save', () => {
    const loaded = workspaceReducer(initialWorkspaceState, {
      type: 'setWorkspace',
      root: 'C:/skills/demo',
      files: [{ path: 'SKILL.md', content: '# Demo' }]
    })
    const edited = workspaceReducer(loaded, { type: 'updateFile', path: 'SKILL.md', content: '# Changed' })
    const saved = workspaceReducer(edited, { type: 'markSaved', path: 'SKILL.md' })

    expect(edited.dirtyPaths).toEqual(['SKILL.md'])
    expect(saved.dirtyPaths).toEqual([])
  })
})
```

- [ ] **Step 4: Extract presentational components**

Move the existing JSX from `src/App.tsx` into the new component files without changing behavior. Use prop-driven components:

```ts
// SkillEditor props
export interface SkillEditorProps {
  activePath: string
  content: string
  theme: 'dark' | 'light'
  onChange: (content: string) => void
}

// SkillExplorer props
export interface SkillExplorerProps {
  files: SkillFile[]
  activePath: string
  dirtyPaths: string[]
  onSelectFile: (path: string) => void
}
```

Keep existing CSS class names where possible: `app-shell`, `activity-rail`, `workspace`, `topbar`, `ide-grid`, `explorer`, `editor-pane`, `inspector`, and `terminal`.

- [ ] **Step 5: Reduce App.tsx to orchestration**

Update `src/App.tsx` so it:

- initializes `locale` and `theme`
- uses `useReducer(workspaceReducer, initialWorkspaceState)`
- loads the current browser demo workspace for now
- passes props to extracted components
- keeps existing New, Save, Validate, Run, Export behavior until later tasks replace adapters

The app should still look and behave like the current UI after this task.

- [ ] **Step 6: Run focused tests**

Run:

```bash
pnpm test -- src/lib/workspaceStore.test.ts src/lib/skill.test.ts src/lib/i18n.test.ts src/lib/theme.test.ts
```

Expected: all listed tests pass.

- [ ] **Step 7: Run build**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

## Task 2: Tauri-First Workspace Adapter

**Files:**
- Modify: `src/lib/workspaceAdapter.ts`
- Modify: `src/lib/tauriCommands.ts`
- Modify: `src/App.tsx`
- Modify: `src/lib/workspaceStore.ts`
- Create: `src/lib/workspaceAdapter.test.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Define adapter result contracts**

Update `src/lib/workspaceAdapter.ts` to export this public surface:

```ts
import type { SkillExecution, SkillFile, SkillSummary, WorkspaceState } from '../types'

export interface LoadedWorkspace {
  root: string | null
  files: SkillFile[]
  activePath: string
}

export interface WorkspaceAdapter {
  listSkills(): Promise<SkillSummary[]>
  createSkill(name: string): Promise<LoadedWorkspace>
  openSkill(root: string): Promise<LoadedWorkspace>
  saveFile(root: string | null, path: string, content: string): Promise<void>
  validateWorkspace(root: string | null, files: SkillFile[]): Promise<unknown[]>
  runScript(root: string | null, scriptPath: string, skillId: string, scriptContent?: string): Promise<SkillExecution>
  exportWorkspace(root: string | null, files: SkillFile[]): Promise<string>
}
```

Keep the existing `loadWorkspace`, `saveWorkspace`, `createSkillWorkspace`, `exportWorkspace`, and `runDemoScript` behavior internally as the browser fallback implementation.

- [ ] **Step 2: Add Tauri implementation**

Inside `workspaceAdapter.ts`, create:

```ts
import {
  createSkill,
  exportSkill,
  isTauriRuntime,
  listSkills,
  openSkill,
  runSkillScript,
  saveSkillFile,
  validateSkill
} from './tauriCommands'

export function createWorkspaceAdapter(): WorkspaceAdapter {
  return isTauriRuntime() ? tauriWorkspaceAdapter : browserWorkspaceAdapter
}
```

For Tauri:

- `listSkills` maps backend `Skill` values to `SkillSummary` and uses `path` as `root`.
- `createSkill(name)` calls `createSkill({ name })` and returns the loaded files.
- `openSkill(root)` calls `openSkill(root)`.
- `saveFile(root, path, content)` throws a clear error when `root` is missing, otherwise calls `saveSkillFile`.
- `validateWorkspace(root)` calls `validateSkill(root)` when root exists.
- `runScript(root, scriptPath, skillId)` calls `runSkillScript`.
- `exportWorkspace(root)` writes to a default path beside the Skill root unless a later dialog command supplies a path.

- [ ] **Step 3: Keep browser fallback**

For browser mode:

- `listSkills()` returns a single demo `SkillSummary`.
- `createSkill(name)` returns `createSkillWorkspace(name)`.
- `openSkill(root)` ignores the root and returns `loadWorkspace()`.
- `saveFile` updates localStorage.
- `validateWorkspace` returns document validation from `SKILL.md`.
- `runScript` calls `runDemoScript`.
- `exportWorkspace` calls the existing JSZip browser download and returns the downloaded filename.

- [ ] **Step 4: Wire adapter into App**

In `src/App.tsx`:

- create the adapter with `useMemo(() => createWorkspaceAdapter(), [])`
- on mount, call `adapter.listSkills()`
- if browser mode or no Tauri skills exist, load browser demo workspace
- New Skill uses `adapter.createSkill('new-agent-skill')`
- Save uses `adapter.saveFile(state.activeRoot, activePath, content)`
- Validate uses `adapter.validateWorkspace(state.activeRoot, state.files)`
- Run uses `adapter.runScript(state.activeRoot, script.path, parsed.metadata.id, script.content)`
- Export uses `adapter.exportWorkspace(state.activeRoot, state.files)`

- [ ] **Step 5: Add adapter tests**

Create `src/lib/workspaceAdapter.test.ts` focused on browser fallback:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWorkspaceAdapter } from './workspaceAdapter'

describe('workspaceAdapter browser fallback', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('__TAURI_INTERNALS__', undefined)
  })

  it('creates and saves a browser workspace without Tauri', async () => {
    const adapter = createWorkspaceAdapter()
    const workspace = await adapter.createSkill('demo-skill')

    expect(workspace.files.some((file) => file.path === 'SKILL.md')).toBe(true)
    await adapter.saveFile(workspace.root, 'SKILL.md', workspace.files[0].content)
  })

  it('runs the browser demo runtime', async () => {
    const adapter = createWorkspaceAdapter()
    const result = await adapter.runScript(null, 'scripts/demo.js', 'demo', "console.log('demo')")

    expect(result.status).toBe('success')
    expect(result.logs.join('\n')).toContain('browser demo mode')
  })
})
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
pnpm test -- src/lib/workspaceAdapter.test.ts src/lib/workspaceStore.test.ts
```

Expected: tests pass.

- [ ] **Step 7: Run build**

Run:

```bash
pnpm build
```

Expected: build passes.

## Task 3: Source-Aware Validation

**Files:**
- Create: `src/lib/validation.ts`
- Create: `src/lib/validation.test.ts`
- Modify: `src/lib/skill.ts`
- Modify: `src/components/validator/ValidationPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/types.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create frontend validation normalizer**

Create `src/lib/validation.ts`:

```ts
import { validateSkillDocument } from './skill'
import type { SkillFile, SourcedValidationIssue, ValidationIssue, ValidationSource } from '../types'

export function validateDocumentIssues(files: SkillFile[]): SourcedValidationIssue[] {
  const skillFile = files.find((file) => file.path === 'SKILL.md')
  if (!skillFile) {
    return [{ severity: 'error', message: 'SKILL.md is required.', path: 'SKILL.md', field: 'file', source: 'document' }]
  }

  return withSource(validateSkillDocument(skillFile.content), 'document')
}

export function withSource(issues: ValidationIssue[], source: ValidationSource): SourcedValidationIssue[] {
  return issues.map((issue) => ({ ...issue, source }))
}

export function hasBlockingErrors(issues: SourcedValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}
```

- [ ] **Step 2: Add validation tests**

Create `src/lib/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hasBlockingErrors, validateDocumentIssues, withSource } from './validation'

describe('validation helpers', () => {
  it('returns a document error when SKILL.md is missing', () => {
    const issues = validateDocumentIssues([])

    expect(issues[0]).toMatchObject({ severity: 'error', source: 'document', path: 'SKILL.md' })
  })

  it('adds a validation source', () => {
    const issues = withSource([{ severity: 'warning', message: 'Version is missing.', path: 'SKILL.md' }], 'workspace')

    expect(issues[0].source).toBe('workspace')
  })

  it('detects blocking errors', () => {
    expect(hasBlockingErrors([{ severity: 'error', message: 'Broken', path: 'SKILL.md', source: 'document' }])).toBe(true)
  })
})
```

- [ ] **Step 3: Improve frontend Skill validation**

In `src/lib/skill.ts`, keep current behavior and ensure:

- missing frontmatter produces `field: 'frontmatter'`
- empty `name` produces error
- missing `description` produces warning
- missing `version` produces warning
- empty `compatibility` produces info
- short body produces error
- path defaults to `SKILL.md`

Do not replace the parser with a new dependency in this task.

- [ ] **Step 4: Update ValidationPanel**

`ValidationPanel` should:

- group issues by severity
- display `issue.source`
- show counts for errors, warnings, and info
- show a success row when no issues exist

Use existing `localizeIssue` for known messages and show raw text for backend-only messages.

- [ ] **Step 5: Align backend validation**

In `src-tauri/src/lib.rs`, update `validate_skill` so it checks:

- `SKILL.md` exists
- document starts with frontmatter
- `name:` exists and has a non-empty value
- `description:` exists and has a non-empty value
- prompt body after frontmatter has at least 30 characters
- files under `scripts/` have `.js` or `.py` extension if they are intended to run
- files outside managed paths are returned as info or warning, not loaded for editing

Keep return type as `Vec<ValidationIssue>`.

- [ ] **Step 6: Merge validation in App**

In `App.tsx`:

- on document changes, compute `validateDocumentIssues(state.files)`
- when user clicks Validate, merge document issues with `withSource(await adapter.validateWorkspace(...), 'workspace')`
- dispatch `setIssues`
- block Export using `hasBlockingErrors`

- [ ] **Step 7: Run validation tests**

Run:

```bash
pnpm test -- src/lib/validation.test.ts src/lib/skill.test.ts
```

Expected: tests pass.

- [ ] **Step 8: Run build**

Run:

```bash
pnpm build
```

Expected: build passes.

## Task 4: Runtime Script Safety and Structured Output

**Files:**
- Create: `src/lib/runtime.ts`
- Create: `src/lib/runtime.test.ts`
- Modify: `src/components/runtime/RuntimePanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/types.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add runtime helpers**

Create `src/lib/runtime.ts`:

```ts
import type { RunnableScript, SkillExecution, SkillFile } from '../types'

export function getRunnableScripts(files: SkillFile[]): RunnableScript[] {
  return files
    .filter((file) => file.path.startsWith('scripts/'))
    .filter((file) => file.path.endsWith('.js') || file.path.endsWith('.py'))
    .map((file) => ({
      path: file.path,
      language: file.path.endsWith('.py') ? 'python' : 'javascript'
    }))
}

export function formatExecutionStatus(execution: SkillExecution | null): string {
  if (!execution) return 'No script has run yet.'
  return `${execution.status} in ${execution.duration}ms`
}
```

- [ ] **Step 2: Add runtime helper tests**

Create `src/lib/runtime.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatExecutionStatus, getRunnableScripts } from './runtime'

describe('runtime helpers', () => {
  it('lists only JavaScript and Python scripts under scripts/', () => {
    const scripts = getRunnableScripts([
      { path: 'scripts/demo.js', content: '' },
      { path: 'scripts/build.py', content: '' },
      { path: 'scripts/run.sh', content: '' },
      { path: 'README.md', content: '' }
    ])

    expect(scripts).toEqual([
      { path: 'scripts/demo.js', language: 'javascript' },
      { path: 'scripts/build.py', language: 'python' }
    ])
  })

  it('formats execution status', () => {
    expect(formatExecutionStatus({ id: '1', skillId: 's', input: 'scripts/demo.js', output: '', logs: [], duration: 12, status: 'success' })).toBe('success in 12ms')
  })
})
```

- [ ] **Step 3: Update RuntimePanel**

`RuntimePanel` should:

- receive `runnableScripts`
- allow selecting one script
- disable Run when no script is available
- show stdout/stderr/logs from `lastExecution`
- show status and duration
- show a clear message for failed or timed out runs

- [ ] **Step 4: Restrict backend runtime paths**

In `src-tauri/src/lib.rs`, add helper functions:

```rust
fn is_allowed_script(path: &Path, root: &Path) -> bool {
    let relative = match path.strip_prefix(root) {
        Ok(value) => value,
        Err(_) => return false,
    };
    let normalized = relative.to_string_lossy().replace('\\', "/");
    let allowed_extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|extension| extension == "js" || extension == "py")
        .unwrap_or(false);

    normalized.starts_with("scripts/") && allowed_extension
}
```

Use it in `run_skill_script` after `safe_join`.

- [ ] **Step 5: Add backend timeout**

Update `run_skill_script` to use a timeout loop with a 10 second limit:

- spawn the command
- poll `try_wait`
- kill the child after 10 seconds
- return `status: "failed"`
- include a log entry such as `Process timed out after 10000ms.`
- keep stdout and stderr captured

Use Rust standard library only unless an existing dependency already provides process timeouts.

- [ ] **Step 6: Set working directory**

In `command_for_script` or `run_skill_script`, set:

```rust
command.current_dir(&root);
```

where `root` is the canonical Skill root.

- [ ] **Step 7: Wire selected script in App**

In `App.tsx`:

- derive `runnableScripts` with `getRunnableScripts(state.files)`
- default to the first runnable script
- pass selected script to `adapter.runScript`
- dispatch `setExecution`
- dispatch a status message on success or failure

- [ ] **Step 8: Run runtime tests**

Run:

```bash
pnpm test -- src/lib/runtime.test.ts
```

Expected: tests pass.

- [ ] **Step 9: Run build**

Run:

```bash
pnpm build
```

Expected: build passes.

## Task 5: Import, Export, Save, and Dirty-State UX

**Files:**
- Modify: `src/components/explorer/SkillExplorer.tsx`
- Modify: `src/components/importExport/ImportExportPanel.tsx`
- Modify: `src/components/layout/WorkspaceShell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/workspaceAdapter.ts`
- Modify: `src/lib/tauriCommands.ts`
- Modify: `src/lib/i18n.ts`
- Modify: `src/styles.css`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add user-facing controls**

Expose these commands in the topbar or import/export panel:

- New Skill
- Open Folder
- Refresh
- Save
- Validate
- Run
- Export

Controls should use existing lucide icons where already imported or available.

- [ ] **Step 2: Implement dirty file labels**

In `SkillExplorer`, append `*` or a small dirty marker to files whose path is in `dirtyPaths`.

In the pane header, display the active path and dirty marker.

- [ ] **Step 3: Block unsafe active Skill switching**

Before opening a different Skill or replacing workspace files, check `hasDirtyFiles(state)`.

MVP behavior:

- show `window.confirm('You have unsaved changes. Continue without saving?')`
- continue only when confirmed

Add Chinese and English i18n entries for the prompt text.

- [ ] **Step 4: Implement Open Folder path input**

Because the current dependency set does not include a Tauri dialog plugin, use a simple MVP path input:

- button opens a small inline text input
- user pastes a local folder path
- `adapter.openSkill(path)` loads it
- validation handles missing `SKILL.md`

If a Tauri dialog plugin is later approved, it can replace this input without changing adapter contracts.

- [ ] **Step 5: Improve export path behavior**

In Tauri mode, `adapter.exportWorkspace` should export to:

```text
<skill-root>/<skill-id>.skill.zip
```

In browser mode, keep the JSZip download.

After export, show the returned path or filename in the runtime/status panel.

- [ ] **Step 6: Save active file only**

Save should:

- require an active root in Tauri mode
- save only the active file
- clear that file's dirty marker
- show a status message with the saved path

Browser mode should update localStorage.

- [ ] **Step 7: Run full frontend tests**

Run:

```bash
pnpm test
```

Expected: all Vitest tests pass.

- [ ] **Step 8: Run build**

Run:

```bash
pnpm build
```

Expected: build passes.

## Task 6: Backend Validation, Runtime Tests, Documentation, and Final Verification

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `README.md`
- Modify: `README_ZH.md`
- Modify: `docs/superpowers/plans/2026-05-09-mvp-completion.md`

- [ ] **Step 1: Add Rust unit tests**

Add tests inside `src-tauri/src/lib.rs` under `#[cfg(test)] mod tests`.

Cover:

```rust
#[test]
fn slugify_makes_safe_skill_ids() {
    assert_eq!(slugify("Demo Skill!"), "demo-skill");
}

#[test]
fn standard_skill_files_are_limited_to_managed_paths() {
    assert!(is_standard_skill_file("SKILL.md"));
    assert!(is_standard_skill_file("scripts/demo.js"));
    assert!(is_standard_skill_file("references/brief.md"));
    assert!(!is_standard_skill_file("node_modules/package.json"));
}
```

For runtime path safety, test the path-string predicate if implementation extracts one. If the implementation keeps `is_allowed_script` as a `Path` helper, add tests using a temporary directory under `std::env::temp_dir()`.

- [ ] **Step 2: Verify Rust build or tests**

Run one of these depending on available toolchain behavior:

```bash
pnpm tauri:build
```

Expected: build succeeds, or the failure is a concrete local environment issue that should be captured in the final report.

If a faster Rust-only command is needed during iteration, run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: Rust unit tests pass.

- [ ] **Step 3: Update README.md**

Update English README current capabilities to state the completed MVP supports:

- local Skill folder workflow through Tauri
- standard file explorer
- Monaco editing
- metadata editing
- deterministic validation
- safe `.js` and `.py` script runtime under `scripts/`
- zip export
- browser demo fallback

Keep Marketplace, AI Generator, Workflow Graph, Cloud Sync, SQLite, and full-text search under planned capabilities.

- [ ] **Step 4: Update README_ZH.md**

Mirror the README changes in Chinese with the same factual boundaries.

- [ ] **Step 5: Run final Vitest suite**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Run final frontend build**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 7: Attempt final Tauri build**

Run:

```bash
pnpm tauri:build
```

Expected: build succeeds, or the final answer records the exact blocker.

- [ ] **Step 8: Review changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: changed files are limited to MVP implementation, tests, README updates, and this plan. Existing unrelated user changes are not reverted.

## Self-Review Checklist

- Spec coverage:
  - Skill Explorer is covered by Tasks 1 and 5.
  - Skill Editor is covered by Task 1.
  - YAML metadata form is covered by Task 1.
  - Markdown editor is covered by Task 1.
  - Skill Validator is covered by Task 3.
  - Script Runtime is covered by Task 4 and backend checks in Task 6.
  - Import and export are covered by Task 5.
  - Documentation is covered by Task 6.
- Runtime safety:
  - Only `.js` and `.py` scripts under `scripts/` are runnable.
  - Timeout handling is included.
  - Working directory is the Skill root.
- Verification:
  - `pnpm test`, `pnpm build`, and `pnpm tauri:build` are required.
- Dirty worktree:
  - The plan explicitly avoids reverting unrelated existing changes.
