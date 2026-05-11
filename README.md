# SkillForge

> SkillForge is a local-first desktop IDE for AI Agent Skill development.

[简体中文](README_ZH.md)

**Status:** MVP local desktop workflow implemented

SkillForge focuses on creating, editing, validating, running, and packaging Agent Skills across ecosystems such as Claude Skills, OpenAI Agent Skills, Codex Skills, Cursor Rules, MCP Tool Skills, and custom agent frameworks.

## Positioning

SkillForge is a desktop IDE for AI Agent Skill development. It is designed to make Skill creation, editing, validation, script execution, and packaging feel like a local developer workflow instead of a collection of fragile hand-written YAML and Markdown files.

The project is local-first. MVP editing flows should work without cloud services. Filesystem access, process execution, import/export, and future persistence are expected to stay behind Tauri/Rust boundaries, while React owns the editor, explorer, preview, validation UI, and runtime feedback.

## Current Capabilities

This repository currently includes the MVP local desktop workflow:

- Tauri v2 desktop application scaffold
- React + TypeScript frontend
- Componentized IDE-like workspace UI with explorer, editor, metadata, validation, runtime, and import/export panels
- Local Skill folder workflow through Tauri commands
- Browser demo fallback for `pnpm dev`
- Skill creation, listing, opening by folder path, reading, and active-file saving
- Dirty-file markers and guards before replacing workspaces, running scripts, or exporting stale disk contents
- `SKILL.md` frontmatter parsing and updating
- Deterministic document and workspace validation for frontmatter, metadata, body length, managed paths, and script extensions
- Standard Skill file filtering
- Safe script execution for `.js` and `.py` files under `scripts/`, with stdout, stderr, exit status, duration, timeout, and process-tree cleanup on Windows
- Skill zip export after blocking validation errors are cleared
- Theme and internationalization code
- Vitest tests and focused Rust unit tests for safety helpers

## Planned Capabilities

These are roadmap items and should not be treated as fully implemented yet:

- Skill Simulator
- AI Generator
- Skill Search
- Marketplace
- Workflow Graph
- Cloud Sync
- SQLite persistence and migrations
- Tantivy or MiniSearch search implementation
- Desktop distribution, signing, and release packaging

## Technology Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri v2 |
| Frontend | React + TypeScript |
| Build tool | Vite |
| Editor | Monaco Editor |
| Icons | lucide-react |
| Export packaging | jszip / Rust zip |
| Backend capabilities | Rust + Tauri commands |
| Testing | Vitest |

The PRD also targets shadcn/ui, TailwindCSS, Zustand, react-arborist, react-markdown, xterm.js, SQLite, and Tantivy or MiniSearch. These should be introduced incrementally when the MVP needs them.

## Quick Start

Expected local environment:

- Node.js
- pnpm
- Rust toolchain
- Tauri v2 system prerequisites

Install dependencies:

```bash
pnpm install
```

Start the frontend development server:

```bash
pnpm dev
```

Start the Tauri desktop development app:

```bash
pnpm tauri:dev
```

Build the frontend:

```bash
pnpm build
```

Build the desktop app:

```bash
pnpm tauri:build
```

Run tests:

```bash
pnpm test
```

## Common Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Run TypeScript checks and build the frontend |
| `pnpm preview` | Preview the Vite build output |
| `pnpm test` | Run Vitest tests |
| `pnpm tauri` | Call the Tauri CLI |
| `pnpm tauri:dev` | Start the Tauri desktop app in development mode |
| `pnpm tauri:build` | Build the Tauri desktop app |

## Project Structure

```text
SkillForge/
|-- src/                         # React application
|   |-- App.tsx                   # Main IDE workspace UI
|   |-- main.tsx                  # React entry
|   |-- styles.css                # Application styles
|   |-- types.ts                  # Shared frontend types
|   `-- lib/                      # Skill parsing, validation, i18n, theme, Tauri adapters
|-- src-tauri/                    # Rust/Tauri backend
|   |-- src/lib.rs                # Tauri commands and backend Skill operations
|   |-- src/main.rs               # Tauri entry
|   |-- Cargo.toml
|   `-- tauri.conf.json
|-- docs/superpowers/             # Design specs and implementation plans
|-- PRD.md                        # Product requirements
|-- AGENTS.md                     # Repository instructions for agents
|-- package.json
|-- pnpm-lock.yaml
`-- vite.config.ts
```

## Skill Data Model

The initial Skill contract comes from the PRD and should stay synchronized with React types, Tauri command payloads, and the future SQLite schema:

```ts
interface Skill {
  id: string
  name: string
  description: string
  version: string
  compatibility: string[]
  tags: string[]
  path: string
  createdAt: string
  updatedAt: string
}

interface SkillExecution {
  id: string
  skillId: string
  input: string
  stdout: string
  stderr: string
  output: string
  logs: string[]
  duration: number
  status: 'success' | 'failed'
  timedOut?: boolean
}
```

## Validation Scope

Skill validation should stay deterministic first, then gain assisted workflows over time. Target validation scope includes:

- Required `SKILL.md`
- Supported optional directories: `scripts/`, `references/`, `assets/`, and `tests/`
- YAML frontmatter syntax and required metadata fields
- Markdown prompt structure
- Compatibility and tag constraints
- Script path and runtime safety checks

The current implementation covers document-level validation, backend workspace validation, managed-path filtering, unsupported script extension checks, and export blocking on validation errors.

## Development Principles

- Build the actual IDE workspace, not a marketing landing page.
- Keep the MVP local-first; do not couple local editing paths to cloud sync or marketplace features.
- Keep filesystem access, process execution, SQLite, and OS integration behind Tauri/Rust boundaries.
- Keep editor, explorer, preview, validation UI, and terminal UI in React.
- Keep Skill parsing and validation deterministic before adding AI-assisted flows.
- Avoid silent fallbacks; validation and runtime errors should be surfaced clearly in the UI.
- Add focused tests for parser, validator, runtime, and persistence behavior as those modules evolve.

## Roadmap

| Phase | Focus |
| --- | --- |
| MVP | Skill Explorer, Skill Editor, YAML metadata form, Markdown editor, Skill Validator, Script Runtime, Import/Export |
| Next | Skill Simulator, search, SQLite persistence, broader Skill specification compatibility |
| Later | AI Generator, Marketplace, Workflow Graph, Cloud Sync, release signing |

## Contributing

Before contributing, read:

- `PRD.md`
- `AGENTS.md`
- `src/lib/skill.ts`
- `src-tauri/src/lib.rs`

Keep changes scoped. Do not introduce cloud sync, marketplace, or AI generation dependencies into MVP-local editor flows unless the task explicitly requires it.

## License

This project is licensed under the license declared in the repository `LICENSE` file.
