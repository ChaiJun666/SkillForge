# README Design Spec

Date: 2026-05-09
Topic: Complete bilingual README for SkillForge

## Goal

Create a complete `README.md` for SkillForge that helps open-source users quickly understand, run, evaluate, and contribute to the project.

The README will be bilingual:

- Chinese full version first
- English full version second

## Audience

Primary audience:

- Open-source users discovering the project
- AI Agent Skill developers evaluating the tool
- Contributors who want to run or extend the MVP

Secondary audience:

- Product and technical stakeholders who need a concise view of the roadmap

## Positioning

SkillForge should be described as a local-first desktop IDE for AI Agent Skill development.

The README must communicate that the project is in an early MVP or prototype stage. It must not describe future roadmap items as already completed.

## Content Structure

The README will use this structure:

1. Project title and short bilingual summary
2. Current project status
3. Chinese documentation
   - Product positioning
   - Current capabilities
   - Planned capabilities
   - Technology stack
   - Quick start
   - Common commands
   - Project structure
   - Skill model
   - Validation scope
   - Development principles
   - Roadmap
   - Contributing
   - License
4. English documentation
   - Product positioning
   - Current capabilities
   - Planned capabilities
   - Technology stack
   - Quick start
   - Common commands
   - Project structure
   - Skill model
   - Validation scope
   - Development principles
   - Roadmap
   - Contributing
   - License

## Fact Boundaries

The README may describe these as current or scaffolded capabilities:

- Tauri v2 desktop shell
- React and TypeScript frontend
- IDE-like workspace direction
- Basic Skill parsing and validation modules
- Import/export related dependency support
- Theme and internationalization code
- Existing package scripts from `package.json`

The README must describe these as planned or future capabilities unless implemented later:

- Marketplace
- AI Generator
- Workflow Graph
- Cloud Sync
- Full Skill Simulator
- Full SQLite persistence layer
- Full search implementation
- Distribution signing

## Commands

Use the commands currently defined in `package.json`:

```bash
pnpm dev
pnpm build
pnpm test
pnpm tauri:dev
pnpm tauri:build
```

The quick-start section should mention the expected local environment:

- Node.js
- pnpm
- Rust toolchain
- Tauri system prerequisites

It should avoid overly specific version claims unless the repository already enforces them.

## Tone

The README should be practical and open-source oriented.

Avoid:

- Marketing-heavy language
- Claims that exceed the current implementation
- Cloud, marketplace, or AI generation dependencies in the MVP path

Prefer:

- Clear setup instructions
- Honest project status
- Dense but readable developer-facing explanations
- Explicit roadmap boundaries

## Acceptance Criteria

The finished README is acceptable when:

- It contains complete Chinese and English sections.
- It accurately reflects the current repository state.
- It uses commands from `package.json`.
- It clearly separates implemented MVP work from roadmap items.
- It includes enough information for a new contributor to install, run, test, and understand the project structure.
- It does not introduce new product commitments outside `PRD.md` and `AGENTS.md`.

## Self-Review

- Placeholder scan: no TBD or TODO placeholders should remain in the final README.
- Consistency check: Chinese and English sections should describe the same product scope.
- Scope check: README work is a single documentation task and does not require code changes.
- Ambiguity check: future capabilities must be explicitly marked as planned.
