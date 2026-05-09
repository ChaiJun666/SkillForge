# SkillForge MVP Completion Design

Date: 2026-05-09
Status: Approved design

## Goal

Complete the SkillForge MVP as a real local-first desktop IDE for AI Agent Skill development.

The MVP must support the core local workflow:

1. Create or open a Skill workspace.
2. Explore the Skill's standard files.
3. Edit `SKILL.md`, metadata, Markdown content, and supported scripts.
4. Validate the Skill deterministically.
5. Run supported scripts safely.
6. Export the Skill as a zip package.

## Scope

The MVP scope is:

- Skill Explorer
- Skill Editor
- YAML metadata form
- Markdown editor
- Skill Validator
- Script Runtime
- Import and export

The implementation should follow the broader PRD direction by reshaping the current prototype into a cleaner IDE framework, but it should stay inside local MVP boundaries.

## Non-Goals

The MVP will not include:

- Marketplace
- AI Generator
- Workflow Graph
- Cloud Sync
- SQLite persistence
- Full-text search
- Arbitrary script execution
- Custom runtime environment variable editing
- Multiple active Skill workspaces at the same time

shadcn/ui, TailwindCSS, Zustand, react-arborist, xterm.js, SQLite, Tantivy, and MiniSearch remain target technologies from the product direction, but this MVP completion does not require introducing them if the current stack can deliver the workflow safely.

## Current State

Completed or scaffolded capabilities:

- Tauri v2, React, TypeScript, and Vite project scaffold.
- IDE-like UI with activity rail, topbar, explorer, Monaco editor, metadata inspector, terminal panel, theme switching, and language switching.
- Frontend Skill parsing, frontmatter updating, validation, unit tests, and browser demo workspace.
- Rust Tauri commands for listing, creating, opening, reading, saving, validating, running, and exporting Skills.
- Basic backend path safety, standard Skill file filtering, and zip export.
- README and README_ZH documentation split.

Key gaps:

- Frontend still uses a browser/localStorage demo workflow instead of the real Tauri workspace commands.
- `App.tsx` holds too many responsibilities and needs component boundaries.
- Runtime lacks the final MVP safety contract: only `scripts/*.js` and `scripts/*.py`, timeout handling, and clear status output.
- Import/open folder UX is incomplete.
- Frontend and backend validation rules are not fully aligned.
- Tests need to cover workspace state, adapter behavior, validation, and runtime boundaries.

## Architecture

### Frontend Boundaries

Refactor the current single-file app into focused modules:

- `src/App.tsx`
  - Compose the workspace shell.
  - Initialize app state.
  - Bind high-level commands.
- `src/components/layout/WorkspaceShell.tsx`
  - Own the IDE shell layout: activity rail, topbar, and main grid.
- `src/components/explorer/SkillExplorer.tsx`
  - Show local Skill list and the active Skill file tree.
  - Provide New Skill, Open Folder, and Refresh actions.
- `src/components/editor/SkillEditor.tsx`
  - Wrap Monaco.
  - Edit the active file content.
- `src/components/metadata/MetadataPanel.tsx`
  - Edit `name`, `description`, `version`, `compatibility`, and `tags`.
  - Rewrite only the `SKILL.md` frontmatter and preserve the Markdown body.
- `src/components/validator/ValidationPanel.tsx`
  - Display validation results from document, workspace, and runtime sources.
  - Summarize error, warning, and info counts.
- `src/components/runtime/RuntimePanel.tsx`
  - List runnable scripts.
  - Run selected scripts.
  - Display stdout, stderr, status, duration, and timeout information.
- `src/components/importExport/ImportExportPanel.tsx` or topbar actions
  - Provide import/open and export actions.
- `src/lib/workspaceStore.ts`
  - Centralize workspace state transitions.
  - Track active Skill, active file, dirty files, validation issues, and runtime results.
- `src/lib/workspaceAdapter.ts`
  - Prefer Tauri commands in desktop runtime.
  - Preserve browser demo fallback for `pnpm dev`.
- `src/lib/validation.ts`
  - Consolidate frontend validation behavior.
- `src/lib/runtime.ts`
  - Consolidate runnable script detection and runtime result formatting.

Use React state or reducer for the MVP. Do not introduce Zustand unless implementation complexity proves it necessary.

### Backend Boundaries

Keep the existing Tauri command surface, but organize the Rust implementation by responsibility:

- Workspace filesystem operations.
- Validation.
- Runtime execution.
- Export and import/open.
- Path safety helpers.

The command surface can remain:

- `list_skills`
- `create_skill`
- `open_skill`
- `read_skill_file`
- `save_skill_file`
- `validate_skill`
- `run_skill_script`
- `export_skill`

Additional commands may be added only when needed for dialog/open-folder/export destination flow.

## Data Flow

1. App startup:
   - In Tauri runtime, call `list_skills`.
   - If no Skill exists, show an empty state with New Skill and Open Folder actions.
   - In browser runtime, load the demo workspace.
2. Create or open Skill:
   - Load standard Skill files into workspace state.
   - Set `SKILL.md` as the default active file.
3. Edit file:
   - Update in-memory state.
   - Mark the file dirty.
4. Edit metadata:
   - Parse and rewrite `SKILL.md` frontmatter.
   - Preserve Markdown body.
   - Mark `SKILL.md` dirty.
5. Save:
   - Save the current file through Tauri.
   - Browser fallback writes to localStorage.
   - Clear the dirty flag for saved files.
6. Validate:
   - Run immediate document validation in the frontend.
   - Run workspace validation through Tauri where available.
   - Merge issues in one UI model with source labels.
7. Run:
   - List only supported scripts in `scripts/`.
   - Execute selected script through Tauri.
   - Display structured output.
8. Export:
   - Block export if validation has errors.
   - Export current Skill standard files as zip.

## Feature Behavior

### Skill Explorer

- Show local Skill list.
- Show file tree for the active Skill.
- Supported managed paths:
  - `SKILL.md`
  - `scripts/`
  - `references/`
  - `assets/`
  - `tests/`
- Ignore unsupported files for editing.
- Report unsupported files as validation info or warning, without deleting them.

### Skill Editor

- Monaco remains the editor.
- Use Markdown mode for `.md` files.
- Use JavaScript mode for `.js` files.
- Use Python mode for `.py` files when supported by Monaco defaults; otherwise use plaintext.
- Switching files must not lose unsaved edits.
- Save writes the active file.
- Switching active Skill with dirty files must prompt or block until saved.

### Metadata Form

- Fields:
  - `name`
  - `description`
  - `version`
  - `compatibility`
  - `tags`
- `compatibility` and `tags` can remain comma-separated inputs for MVP.
- If frontmatter cannot be safely parsed, disable the form and show the validation error.

### Validator

Frontend document validation covers:

- YAML frontmatter presence.
- Required `name`.
- Useful `description`.
- `version`.
- Non-empty compatibility guidance.
- Prompt body length.
- Tag and compatibility normalization.

Backend workspace validation covers:

- Required `SKILL.md`.
- Standard folder checks.
- Unsupported managed files.
- Script path safety.
- Allowed runtime extensions.

Validation results use one `ValidationIssue` model and add source labels when useful:

- `document`
- `workspace`
- `runtime`

Errors block export. Warnings and info do not block export.

### Script Runtime

Runtime supports only:

- `scripts/*.js`
- `scripts/*.py`

Runtime rules:

- Paths must stay inside the active Skill root.
- Scripts must be direct or nested children of `scripts/`.
- JavaScript runs with `node`.
- Python runs with `python`.
- Working directory is the Skill root.
- Default timeout is 10 seconds.
- No custom environment variable editing in MVP.

Runtime result must include:

- `stdout`
- `stderr`
- exit status
- duration
- timeout flag or timeout message
- `success` or `failed` status

Missing `node` or `python` must produce a clear actionable error.

### Import and Export

MVP import/open behavior:

- Open Folder loads a directory containing `SKILL.md`.
- Zip import is optional for the first implementation plan and lower priority than Open Folder.

Export behavior:

- Validate before export.
- Block export on errors.
- Export managed Skill files into a zip package.
- Show the export path or a clear error message.

## Testing Strategy

Frontend tests:

- `skill.ts`
  - frontmatter parsing
  - metadata updating
  - validation rules
- `workspaceAdapter.ts`
  - Tauri/runtime detection
  - browser fallback behavior
  - error mapping
- `runtime.ts`
  - runnable script filtering
  - result formatting
- `workspaceStore.ts`
  - dirty state
  - file switching
  - metadata update
  - save state transitions

Backend Rust tests:

- path traversal prevention
- standard file filtering
- validation for missing `SKILL.md`
- validation for invalid or missing frontmatter
- rejection of unsupported script extensions
- runtime timeout behavior

UI-level tests are optional for this MVP unless the implementation introduces React Testing Library. Logic tests and build verification are required.

## Acceptance Criteria

The MVP completion is accepted when:

- `pnpm test` passes.
- `pnpm build` passes.
- `pnpm tauri:build` is attempted and either passes or reports a concrete environment-related blocker.
- Browser `pnpm dev` mode still loads a demo workspace without Tauri.
- Desktop mode can complete:
  1. Create Skill.
  2. Open or select Skill.
  3. Edit metadata and Markdown body.
  4. Save file.
  5. Validate Skill.
  6. Run a supported script.
  7. Export zip.
- Runtime only runs `.js` and `.py` scripts under `scripts/`.
- Runtime output includes stdout, stderr, status, duration, and timeout handling.
- README and README_ZH reflect the final MVP state.

## Implementation Phases

1. Component and state boundaries:
   - Split `App.tsx` into focused components and state helpers.
   - Preserve current behavior.
2. Workspace adapter integration:
   - Use Tauri commands for desktop create/open/save/list.
   - Preserve browser fallback.
3. Validator completion:
   - Align frontend and backend validation models.
   - Add source-aware validation display.
4. Runtime safety:
   - Restrict scripts to `scripts/*.js` and `scripts/*.py`.
   - Add timeout and structured output.
5. Import/export completion:
   - Open local folder.
   - Export zip after validation.
   - Treat zip import as optional secondary work.
6. Tests and documentation:
   - Add focused tests.
   - Update README and README_ZH.

## Risks and Handling

- Dirty worktree risk:
  - The current workspace contains unrelated documentation changes and deleted tracked files. Implementation must not revert user changes.
- Missing PRD risk:
  - `PRD.md` is not currently present in the workspace. Use `AGENTS.md`, README files, and source code as the active source of truth until PRD is restored.
- Validation duplication risk:
  - Keep a shared result shape and allow multiple issue sources instead of forcing identical frontend/backend implementations immediately.
- Tauri permission risk:
  - Prefer existing commands and minimal permissions. Add plugins or permissions only when required for folder selection or export destination selection.
- Runtime process risk:
  - Timeout and process termination behavior must be verified on Windows.
- Refactor risk:
  - First split components without changing behavior, then connect real backend flows.

## Self-Review

- No placeholder requirements remain.
- Current capabilities and planned capabilities are separated.
- The MVP is large but still one coherent local-first desktop workflow.
- Runtime safety is explicit and limited.
- Implementation phases are ordered to reduce regression risk.
