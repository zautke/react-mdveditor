# Excalidraw Document Type Research

Date: 2026-05-08

## Current upstream state

- Official package: `@excalidraw/excalidraw@0.18.1`
- Latest stable release checked during planning: `v0.18.1`, published on 2026-04-21
- Official embedding surface in the installed package:
  - `Excalidraw`
  - `restore`
  - `serializeAsJSON`
  - `MIME_TYPES.excalidraw`
- Required integration details:
  - Import `@excalidraw/excalidraw/index.css`
  - Render inside a parent with non-zero height
  - Use `initialData` for first load
  - Use `excalidrawAPI` and `onChange` for imperative sync

## Native file format

The native `.excalidraw` format is JSON with these top-level fields:

- `type`: expected to be `"excalidraw"`
- `version`
- `source`
- `elements`
- `appState`
- `files`

The official MIME type is `application/vnd.excalidraw+json`.

## Local fixture findings

The user-provided fixture at `~/.vim/docs/neovim-shortcuts-infographic.excalidraw` is a plain native `.excalidraw` JSON file, not the Obsidian markdown wrapper format. It includes:

- `type: "excalidraw"`
- `version: 2`
- `source: "codex"`
- `elements`
- `appState`

That file shape is the basis for v1 support in this repo.

For repeatable local verification, the same fixture is copied into:

- `public/test_samples/neovim-shortcuts-infographic.excalidraw`

## Integration decisions for mdeditor

- v1 supports native `.excalidraw` only.
- Obsidian `.excalidraw.md` wrapper files are out of scope.
- Excalidraw is a canvas-owned editing surface, not a JSON-preview doctype.
- Invalid Excalidraw JSON falls back to the existing split shell so the user can repair the raw source.
- Detection must stay fast:
  - extension match first
  - then a short string heuristic to pre-empt the generic JSON plugin
  - full `JSON.parse()` and `restore()` only when the Excalidraw renderer or shell validation needs them

## Non-goals

- Live collaboration
- `excalidraw-room`
- `excalidraw-mcp`
- library import/export workflows
- PNG/SVG export flows
- runtime search/indexing of scene contents
- Obsidian wrapper compatibility

## Verification notes

- The worktree dev server serves the updated Excalidraw implementation on `http://localhost:5250`.
- `http://adagio.local:5250` was reachable during implementation, but in this environment it resolved to older main-checkout content instead of the worktree bundle.
- Existing baseline console error before this work: missing `favicon.ico`.
- Browser verification on 2026-05-08:
  - uploading `neovim-shortcuts-infographic.excalidraw` opened a selected Excalidraw tab
  - the split textarea shell disappeared for the active Excalidraw document
  - the Excalidraw canvas mounted successfully
- Current worktree verification status:
  - `pnpm lint` passes
  - `pnpm typecheck` passes
  - `pnpm build` passes

## References

- https://github.com/excalidraw/excalidraw
- https://github.com/excalidraw/excalidraw/releases/tag/v0.18.1
- https://docs.excalidraw.com/
- https://excalidraw-excalidraw.mintlify.app/api/types/data
