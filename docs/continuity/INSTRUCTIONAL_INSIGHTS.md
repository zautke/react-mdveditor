# INSTRUCTIONAL INSIGHTS

_Append-only reusable patterns and lessons. Dated entries._

## 2026-07-24 — Decoupled, refactorable UI utility shape

- Split any "capture + side-effect + feedback" feature into three layers so it
  ports to other apps unchanged:
  1. **Pure engine** with a single swap seam — here
     `CaptureAdapter = (el) => Promise<{blob, dataUrl}>` (native ↔ snapDOM ↔
     modern-screenshot in one function). No React, no app imports.
  2. **Headless hook** — a status machine (`idle→working→done/error→idle`) that
     drives feedback and exposes a generic `onResult(kind, ok)` callback.
  3. **Presentational component** — icon + behavior arrive as props.
- Keep the reusable primitives **notification-agnostic**: the hook takes
  `onResult`; the app-level UI (not the primitive) wires the toast. This kept
  `media-capture`/`use-media-clipboard` toast-free while `MediaAssetFrame` owns
  `sonner`.

## 2026-07-24 — Testing UI in Claude-in-Chrome (computer-use)

- **`browser_batch` `wait` does NOT yield to the page's rAF loop.** Multiple
  clicks in one batch all read pre-batch state → animated/compounding actions
  collapse to a single step. Fixes: one click per batch (state settles between
  tool calls), or **interleave a screenshot/zoom** between clicks (a capture
  forces a paint → the frame loop advances → clicks compound).
- **The extension `scroll` gesture emits no DOM `wheel` events**, and there is
  no middle-click primitive. You cannot drive wheel-zoom or middle-click via
  computer-use. Verify them by exercising the **shared code path** through
  buttons, or dispatch a synthetic `WheelEvent` in JS (note: that's not
  "as-user").
- **Don't read the clipboard via JS to verify a copy** — `navigator.clipboard.
  readText()/read()` triggers a permission prompt that **blocks/freezes the
  renderer**. Verify via the success morph (resolve ⇒ ✓) instead of reading back.
- A heavy DOM operation (e.g. snapDOM on a huge SVG) can freeze the renderer and
  make screenshots time out for tens of seconds. Expect it; don't hammer — wait
  and retry once.

## 2026-07-24 — Guard against sweeping secrets into commits

- `git add -A` / `git commit -a` will pull in any untracked sensitive file the
  ignore rules miss (env backups, dumps, keys). Prefer **explicit path adds**,
  and gitignore backup patterns (`.env.backup*`) proactively — not just the
  canonical `.env*.local`. If caught while still **unpushed**, it's a local-only
  fix (`git rm --cached` + amend/recommit); once pushed, treat as exposed.

## 2026-07-24 — Multi-modal research fan-out

- For "find the SOTA solution" questions, dispatch one agent per research
  modality (web-search / Context7 docs / GitHub code-search) in parallel; each
  returns N solutions. Three-way convergence is strong signal; divergence flags
  where to hedge (here: pick snapDOM but keep the adapter seam so
  modern-screenshot is a one-line swap).
