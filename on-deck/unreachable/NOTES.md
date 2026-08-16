# Unreachable objects

Recovered via `git fsck --full --no-reflogs --unreachable` on 2026-08-16 — 110 objects,
11 of them commits. All commits are tagged under `archive/2026-08-16/unreachable/`.

## Exported here

| Patch | Commit | Date | Content |
|---|---|---|---|
| `7228c2e-shadcn-docker-server-work.patch` | `7228c2e4fc18b067cbc614bbc9c9e16a5d81bc6c` | 2026-01-01 | Stash WIP on `spike/shadcn-migration`. `EditorWithProview.tsx` +237/−291, `src/main.tsx`. Predates the document-type plugin registry — applying it would regress that architecture. Historical. |
| `a8e19b7-wip-html-doc-type.patch` | `a8e19b781a646c3c4b734bd25a83403d81e49057` | 2026-02-14 | Stash WIP on `feat/html-doc-type`. `CLAUDE_NOTES.md` +37 only. |
| `codex-snapshot-1-2025-12-13-1f619c4-source-only.patch` | `1f619c49ea2ccc33525f74a0caf12add185c987c` | 2025-12-13 | Codex auto-snapshot |
| `codex-snapshot-2-2026-01-02-a703137-source-only.patch` | `a703137aa7d42ffdb0f28ed7c2af6a182938b375` | 2026-01-02 | Codex auto-snapshot |
| `codex-snapshot-3-2026-01-02-8f5af46-source-only.patch` | `8f5af46248bc7f406137c0fa33fb4aebfd9c60c9` | 2026-01-02 | Codex auto-snapshot |
| `codex-snapshot-4-2026-01-02-abded2a-source-only.patch` | `abded2a70188011cf8ded87e24b55d72d2a7ad81` | 2026-01-02 | Codex auto-snapshot |
| `codex-snapshot-5-2026-01-03-f59e6ca-source-only.patch` | `f59e6caaf16b2fc5f2acf5fe3141987f01149263` | 2026-01-03 | Codex auto-snapshot |
| `codex-snapshot-6-2026-01-02-27bfc0a-source-only.patch` | `27bfc0a55e42f7c48e64ed48824f3987398f9076` | 2026-01-02 | Codex auto-snapshot |

The six Codex snapshots are automated checkpoints from the theme/design-system work.
They precede and are superseded by `feat/use-design-system` (`d3ffe0b`), which is itself
parked under `on-deck/2026-02-24-consolidation/`. Kept for provenance only.

## Tagged but not exported

No authored content — stash bookkeeping and a scratch merge:

```
c11363e2ede4bbb074eaaa7fe27eb50925a3cd56  index on spike/shadcn-migration
a9660b4d7509246f88a5c9ebcc73db407ddd527b  index on feat/html-doc-type
2c6e79c3e46c88908ad984c9452be8c9fe25ea63  Merge branch 'feat/persistence-migration' into merge-test
```
