# stash@{0} — WIP on development

**Archive tag:** `archive/2026-08-16/stash-0-tab-variants` → `6a8ee83be475db62cc5e5d40f1409374f1803e30`

**Parent:** `543ed0a` (`docs: branch audit and cleanup plan (2026-02-24)`)

```
5 files changed, 204 insertions(+), 173 deletions(-)

design-system/ui/src/components/tab-system/tab-system.variants.ts
src/components/markdown/EditorWithProview.tsx
src/components/ui/tabs/index.ts
src/components/ui/tabs/tab-system.variants.ts
src/main.tsx
```

## This patch no longer applies — by design

It edits **both** copies of `tab-system.variants.ts`, from the period when the tab system
existed twice in the tree. The 2026-08-16 merge of `main` deleted
`src/components/ui/tabs/` as part of consolidating on `design-system/ui`.

Exported *before* that merge so the content survives the deletion. Treat as a reference
for the mid-refactor variant shape, not as an applyable change.

The surviving equivalent is `design-system/ui/src/components/tab-system/tab-system.variants.ts`.
