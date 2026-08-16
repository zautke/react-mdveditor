# fix/react-doc-imports-adagio

**Archive tag:** `archive/2026-08-16/fix-react-doc-imports-adagio` → `769f5ed399354cf04fd38aa48eedeff0c8006aaf`

**Status at consolidation:** remote-only (`origin/fix/react-doc-imports-adagio`), never had a local branch.

## Commits (chronological)

```
ef32ad9f0e32962d01aee72d36c9d8f578b414da  2026-03-12  adagio  (interim)
769f5ed399354cf04fd38aa48eedeff0c8006aaf  2026-03-28  adagio  life by design
```

Merge-base with `development`: `b42622433530d2673c021649cd0e4fabab243be0`

## Why this was salvaged and not merged

It is a **working feature that `development` does not have** — not a stale interim.

`development` ships `src/lib/react-preview/{compile,scope,session-state}.ts`.
This branch adds the two missing pieces:

- `src/lib/react-preview/cdn.ts` — CDN module resolution
- `src/lib/react-preview/import-parser.ts` — parses `import` statements out of preview source

Without them, a React-doctype document cannot import anything external.

It was not merged because `ReactPreview.tsx` has diverged substantially on `development`
since 2026-03 and the merge conflicts.

## Conflicts against `development` @ d1dcd18

```
.gitignore                                    ← noise, take development's side
.serena/.gitignore                            ← noise, take development's side
.serena/project.yml                           ← noise, take development's side
src/components/markdown/ReactPreview.tsx      ← real, hunk-pick required
```

## Behavior-replacement risk

`ReactPreview.tsx` here (16645 bytes) predates `development`'s version (15313 bytes) and
carries a different session/scope wiring. Applying it wholesale would revert
`development`'s preview session handling.

**`cdn.ts` and `import-parser.ts` are additive** — no file of that name exists on
`development`, so those two can be taken as-is. Start there.

## Files

- `*-full-textonly.patch` — both commits as a format-patch mailbox, binaries excluded
- `*-source-only.patch`   — squashed diff, binaries/screenshots excluded
