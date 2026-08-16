# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-08-16

### Changed
- **Repository consolidation.** `main` and `development` had diverged into two
  non-overlapping lanes and neither contained the other. Both are now converged;
  every other branch and worktree has been removed. Full audit in
  `BRANCH_WORKTREE_ARCHAEOLOGY_2026-08-16.md`.
- Tab system de-duplicated. `src/components/ui/tabs/` is gone; the single
  implementation is the `@braisenly/ui` workspace package at
  `design-system/ui/src/components/tab-system/`.
- `pnpm typecheck` now runs `tsc -b`. It previously ran `tsc --noEmit` against a
  solution config with `"files": []`, which checks nothing and always exits 0.

### Added (consolidation)
- `apps/tabbar-harness` — Next.js + Playwright isolation harness for the tab system.
- Adagio sqlite sidecar supervision, Windows dev launcher, schema migration and
  health-probe scripts.
- `open_in_mde` CLI, macOS Finder Quick Action, and a FinderSync extension.
- Excalidraw document type.
- Media zoom viewport with drag/pan, and copy image / base64 / source controls.
- `pnpm test` — persistence and sidecar suites (49 tests).
- `on-deck/` — patch bundles for branch work that could not be merged, indexed
  in `on-deck/INDEX.md`.
- `archive/2026-08-16/*` tags on origin covering every deleted ref.

### Added
- React preview documents can import published npm packages. Bare specifiers are
  resolved from esm.sh in both shared and isolated mode; previously any import
  outside `react` was refused with a blocking diagnostic.

### Fixed
- A `documents` PUT whose value was not an array returned 200 and wrote nothing,
  so a client with a malformed body believed its work had been saved. It is now
  a 400 `invalid_payload`, with a regression test.
- `vite.config.ts` env precedence — real process env now wins over the `.env`
  file baked into the dev image, which had been pointing the `/api/db` proxy at
  the container's own loopback.
- `createDocFromText` omitted the required `persistedToFileSystem` field.
- Type errors in `vite.config.ts`, `JsonPreview.tsx`, and `MdxCodeblock.tsx`
  that the no-op typecheck script had been hiding.

## [1.0.0] - 2025-11-11

### Added
- Initial release of standalone markdown editor
- EditorWithProview component with split-pane editor/preview
- MarkdownRenderer with Tailwind styling (Mexican theme)
- MDRendererTW alternative Tailwind renderer
- MarkdownRenderer_orig with inline styles
- GitHub Flavored Markdown support
- Syntax highlighting for code blocks
- Real-time live preview
- Support for tables, task lists, and more
- Complete TypeScript support
- Vite build configuration
- ESLint configuration
- Comprehensive documentation

### Features
- **Live Preview**: Real-time rendering as you type
- **Multiple Themes**: Choose from different styling options
- **Syntax Highlighting**: Prism-based code highlighting
- **GFM Support**: Tables, task lists, strikethrough, auto-linking
- **Customizable**: Easy to customize styles and plugins
- **TypeScript**: Full type safety throughout

### Technical
- React 18.3.1
- Vite 6.0.1
- Tailwind CSS 4.1.11
- react-markdown 10.1.0
- react-syntax-highlighter 15.6.1
- TypeScript 5.6.2

[1.0.0]: https://github.com/yourusername/mdeditor/releases/tag/v1.0.0
