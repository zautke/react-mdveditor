# INSTRUCTIONAL INSIGHTS

_Append-only reusable patterns and lessons. Dated entries._

## 2026-07-26 — Whole-array state sync needs a revision, not a size check

- Any "client owns a list, PUTs the whole list" design has exactly one failure
  mode: **two clients, one stale, last writer deletes the difference.** Guards
  based on the *shape* of the payload (empty? too small?) cannot see it, because
  a stale array is structurally indistinguishable from a deliberate edit.
- The cheap correct fix is optimistic concurrency: a monotonic revision returned
  on read, echoed on write, `409` on mismatch. It costs one integer and one
  column, and it converts a silent data-loss bug into a retryable conflict.
- Wire the 409 into a **re-read-and-merge** path, not a retry. A retry re-sends
  the same stale payload; a merge is the only thing that preserves both writers.

## 2026-07-26 — Never key "adopt new data" off a status transition

- A pattern worth recognising: `setStatus(next)` early-returns when the status is
  unchanged, and the UI subscribed to that to know when to re-read merged state.
  The one case that mattered — a conflict-driven merge while already `online` —
  never changed status, so the UI kept its superseded list and pushed it back.
- **Data freshness and connection state are different signals.** Publish a
  revision counter on every wholesale replacement of the cache and subscribe to
  that. Status is for humans; revision is for correctness.

## 2026-07-26 — "Baked-in tested" starts by running the thing

- Four of the defects found this session — a 404-ing nginx prefix strip, a
  crash-looping dev container, inverted env precedence, host TLS paths in a
  container — were **invisible to typecheck, lint, build, and every unit test**.
  They appeared within ninety seconds of actually starting both stacks.
- Corollary: an integration surface that has never been run once is not
  "probably fine", it is untested. Prod's persistence proxy had been broken for
  as long as it had existed, and nothing reported it because the client's
  degraded mode is silent by design.
- Prove shared infrastructure with an **identity assertion, not a behaviour
  assertion**. "Both stacks can read a document" is weak; "both stacks report
  the same process UUID and the same host inode" cannot be faked by coincidence.

## 2026-07-26 — Test doubles must match the real object's *interface shape*

- The client tests initially failed on one case because the `localStorage`
  double was Map-backed, while the code under test enumerates the store with
  `Object.keys(localStorage)` — valid against real Web Storage, silently empty
  against the double. The failure was in the harness, but it was pointing at a
  real coupling.
- Rule: when doubling a host object, replicate how callers *traverse* it, not
  just its named methods.

## 2026-07-26 — Rescue before you repair

- The first action after discovering that backups lived in a disposable
  container layer was `docker cp` of all ten snapshots to the host — before any
  edit, rebuild, or `compose up`. The very next command would have destroyed
  them.
- Generalise: when an audit finds that the recovery material is fragile, moving
  it to safety outranks fixing the cause. The fix can wait a minute; the
  evidence cannot.

## 2026-07-26 — Archive tags make an irreversible branch delete reversible

- Before deleting absorbed branches local **and** remote, tag each tip as
  `archive/<branch>` with an annotated message recording why, and push the tags.
  The commits stay reachable and out of the branch list — full cleanup, zero
  loss, no reflog archaeology later.
- Scope such a request literally: "persistence-related branches" never includes
  `main` or `development`, even when an ancestry audit technically labels them
  "fully absorbed".

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
