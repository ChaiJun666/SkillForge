# Task: i18n-theme

Status: completed
Created: 2026-05-09
Updated: 2026-05-09

## Requirements Summary
- Add English and Simplified Chinese UI localization.
- Default locale is English.
- Add light and dark themes.
- Default theme is dark.
- Put language and theme toggles in the top-right toolbar.
- Persist choices with localStorage.

## Key Decisions

- Use a lightweight in-repo i18n dictionary instead of adding an i18n dependency.
- Use `data-theme` on the app root and CSS variables for theme switching.
- Do not translate user-authored Skill content, file names, scripts, or script output.

## Implementation Plan

- [x] 1. Add locale/theme modules and tests.
- [x] 2. Wire locale/theme state into the app UI and generated messages.
- [x] 3. Convert CSS colors to theme variables and add light theme.
- [x] 4. Run test/build/Rust verification and quick review.

## Changed Files
- `.codex/tasks/i18n-theme.md`
- `src/App.tsx`
- `src/styles.css`
- `src/lib/i18n.ts`
- `src/lib/i18n.test.ts`
- `src/lib/theme.ts`
- `src/lib/theme.test.ts`

## Verification

- `pnpm test` passed: 3 files, 12 tests.
- `pnpm build` passed.
- `cargo check` passed in `src-tauri`.
- Quick review checked UI text migration, theme variable usage, and changed-file scope.
