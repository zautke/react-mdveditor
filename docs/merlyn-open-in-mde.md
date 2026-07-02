# Merlyn → "Open in MDE" button (integration snippet)

Drop-in code for the Merlyn agent harness (`wxt-prompt`, a WXT/React MV3
extension). **This repo does not modify wxt-prompt** — copy the snippet in.

## How it works

MDE has no `mde://` scheme and no `?file=` URL; a file is injected only via the
CLI (`open_in_mde` → `POST /api/mde-open`). Merlyn is MV3, so it cannot spawn a
process directly — but it already ships the `com.merlyn.shell` native host
(`shell.run`) used by the agent's `bash_run` tool. So the button:

1. Builds the conversation markdown with the existing `buildChatMarkdown(...)`.
2. Asks the native host to write it to a temp `.md` and run `open_in_mde` on it.

Requires: `open_in_mde` installed on PATH (`scripts/install-open-in-mde.sh`),
Chrome (native messaging), and the bash toggle enabled — the same conditions the
existing `bash_run` tool needs.

## 1. Handler — add to `entrypoints/sidepanel/App.tsx` (`AppInner`)

Reuses `buildChatMarkdown` from `src/shared/exporters.ts` and `sendNativeMessage`
from `src/core/tools/bashTools.ts` (same helper `bash_run` uses).

```tsx
import { buildChatMarkdown, buildChatExportBaseName } from '@/shared/exporters'
import {
  sendNativeMessage,
  isNativeMessagingAvailable,
  isBashEnabled,
} from '@/core/tools/bashTools'

const [openInMdeFeedback, setOpenInMdeFeedback] = useState<string | null>(null)

// UTF-8-safe base64 so arbitrary markdown survives the shell round-trip.
function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function openChatInMde() {
  if (!isNativeMessagingAvailable() || !isBashEnabled()) {
    setOpenInMdeFeedback('Needs Chrome + bash')
    return
  }
  logger.action('App: open in MDE clicked')

  const md = buildChatMarkdown(history, activeTitle, dateStr)
  const base = buildChatExportBaseName(activeTitle, dateStr) // e.g. chat-slug-2026-07-02
  const b64 = toBase64Utf8(md)

  // Write markdown to a temp file, then hand the path to open_in_mde.
  // base64 avoids any quoting/escaping issues with the markdown body.
  const command = [
    `tmp="$(mktemp -t ${base}).md"`,
    `printf %s '${b64}' | base64 -d > "$tmp"`,
    `open_in_mde "$tmp"`,
  ].join(' && ')

  try {
    const res = await sendNativeMessage({ type: 'shell.run', command })
    // open_in_mde exit codes: 0 ok, 3 none supported, 4 server unreachable.
    const code = (res && (res.exitCode ?? res.code)) ?? 0
    setOpenInMdeFeedback(code === 0 ? 'Opened!' : `MDE error (${code})`)
  } catch (err) {
    logger.error('open in MDE failed', err)
    setOpenInMdeFeedback('Failed')
  }
  setTimeout(() => setOpenInMdeFeedback(null), 2000)
}
```

> Adjust the `sendNativeMessage({ type: 'shell.run', command })` call and the
> response field (`exitCode`) to match the exact shape in your `bashTools.ts`
> (the host is `com.merlyn.shell`). If `open_in_mde` is not on the host's PATH,
> use its absolute install path: `"$HOME/.local/bin/open_in_mde"`.

## 2. Button — in the action row (`~App.tsx:420-465`, beside Copy Chat / Export)

Matches the existing action-row button style verbatim.

```tsx
<button
  className="text-xs text-slate-400 hover:text-teal-600 transition"
  onClick={openChatInMde}
  type="button"
  disabled={history.length === 0}
>
  {openInMdeFeedback ?? 'Open in MDE'}
</button>
```

## Notes

- First open starts the MDE dev server if it is down (`open_in_mde` handles it);
  the very first launch can take a few seconds.
- The conversation is written to a temp `.md`; MDE opens a real file (not a blob),
  so edits/saves behave normally.
- Only Chrome is wired for native messaging today (Firefox MV3 host not yet
  supported) — the feature auto-hides via `isNativeMessagingAvailable()`.
