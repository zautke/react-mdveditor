# Agent Learning Protocol (ALP) — Mermaid Renderer Verification

## Purpose

Codified prompt-engineering protocol for an agent to verify that the Markdown renderer correctly displays Mermaid diagram samples. The agent must: run the dev server, load each sample into the input pane, capture a screenshot, compare to the SSOT (Single Source of Truth) image, and if the render fails, run a **fix → restart → test** loop until the expected rendering is observed.

---

## Prerequisites

- **Workspace**: `/Volumes/FLOUNDER/dev/mdeditor`
- **Port**: Dev server MUST run on **5200** (see `vite.config.ts`). Do not start a second instance on another port.
- **Kill stale server first**: `lsof -ti:5200 | xargs kill -9 2>/dev/null; true` before `pnpm dev`.

---

## Test Sample Layout

| # | Sample file | SSOT image | Description |
|---|-------------|------------|-------------|
| 01 | `01-agent-learning-protocol-flowchart.md` | `01-agent-learning-protocol-ssot.png` | Agent Learning Protocol system-architecture flowchart (Orchestration, Library, Wisdom, Bridge) |

---

## Protocol Steps (Execute Per Sample)

### 1. Ensure dev server is running

```bash
# Kill any process on 5200, then start
cd /Volumes/FLOUNDER/dev/mdeditor
lsof -ti:5200 | xargs kill -9 2>/dev/null; true
pnpm dev
```

- Wait **~8 seconds** after start.
- Verify `http://localhost:5200` returns 200 (e.g. `curl -s -o /dev/null -w "%{http_code}" http://localhost:5200`).

### 2. Load sample into input pane

1. **Navigate** to `http://localhost:5200`.
2. **Take a fresh snapshot** (e.g. `take_snapshot` / `browser_snapshot`) and locate the **textarea** (Markdown Input).
3. **Clear** the textarea: set `value = ''` and `dispatchEvent(new Event('input', { bubbles: true }))` so React `onChange` runs.
4. **Load the sample** into the textarea using **one** of:
   - **Fetch (recommended for large samples):** Copy the sample into `public/test_samples/` (e.g. `public/test_samples/01-agent-learning-protocol-flowchart.md`). Then run:
     ```js
     evaluate_script: async () => { const r = await fetch('/test_samples/01-agent-learning-protocol-flowchart.md'); const t = await r.text(); const el = document.querySelector('textarea'); if (!el) return 'No textarea'; el.value = t; el.dispatchEvent(new Event('input', { bubbles: true })); return 'Loaded ' + t.length + ' chars'; }
     ```
     This ensures the full content reaches React state. `fill` can truncate or time out on large input and may not fire `onChange` with the full string.
   - **Paste/fill:** Only if the sample is small: paste or `fill` the raw markdown, then run `el.dispatchEvent(new Event('input', { bubbles: true }))` so React receives the change.
5. **Wait** 2–4 seconds for Mermaid to render (async).
6. **Take a new snapshot** to confirm the Mermaid block is present in the preview (e.g. subgraph/node labels like "CENTRAL ORCHESTRATION", "SYSTEM A", or an SVG).

### 3. Screenshot the render

- **Option A — full page**: `take_screenshot` / `browser_take_screenshot` with `fullPage: true` (or equivalent).
- **Option B — diagram only**: If the DOM snapshot includes a ref for the Mermaid container/SVG, capture a screenshot of that element.
- **Save** to: `test_samples/01-agent-learning-protocol-actual.png` (or `test-results/` with a name that includes the sample id).
- Prefer **Option A** for the first run so the whole preview (and any error UI) is visible.

### 4. Compare actual vs SSOT

- **SSOT path**: `test_samples/01-agent-learning-protocol-ssot.png`.
- **Actual path**: e.g. `test_samples/01-agent-learning-protocol-actual.png`.

**Determination criteria (semantic, not pixel-perfect):**

- **PASS**: The actual render shows, in line with the SSOT:
  - **Structure**: CENTRAL ORCHESTRATION (User, Orchestrator Agent), SYSTEM A: THE LIBRARY (Codebase, Ingestion Pipeline, Left-Brain Storage: SQLite, Qdrant, Neo4j), SYSTEM B: THE WISDOM (Chat Logs, Sidecar Pipeline, Right-Brain Storage: Basic-Memory DAG), and THE BRIDGE (ConceptNode, FileRef, “Points To” to SQLite).
  - **Styling**: `leftBrain` (light blue), `rightBrain` (light purple), `orchestrator` (dark), `bridge` (light orange, dashed) applied where specified.
  - **Edges**: Retrieval paths (e.g. `query_rag(path)`, `search_code(vec)`, `trace_deps(graph)`, `query_memory(concept)`), “Async Event”, “Mutate”, “Points To”, and cross-graph links (e.g. JSONGraph → ConceptNode, FileRef → SQLite) are present and sensibly routed.
- **FAIL**: Any of: Mermaid error UI, empty/s missing diagram, completely wrong layout, or missing major subgraphs/nodes/edges described above.

**If you have image-comparison tools:** compute SSIM or pixel diff and treat large deviations as FAIL. If not, use the semantic checklist above.

### 5. If FAIL: fix → restart → test

1. **Inspect**:
   - Browser console: `list_console_messages` with `types: ["error"]`.
   - Mermaid error UI in the preview (syntax, security, or runtime).
   - Whether the correct `MermaidDiagram` (or `MermaidDiagram1` / `react-x-mermaid` if switched) and `MarkdownRenderer` are in use.
2. **Hypothesize**:
   - Mermaid syntax/version mismatch (e.g. `o--o`, `classDef`, subgraph IDs).
   - Wrong renderer component or pipeline (e.g. `language-mermaid` not passed, or `rehype`/`remark` stripping the block).
   - Mermaid init (theme, `securityLevel`, `startOnLoad`) or missing dependency.
3. **Apply a fix** (code or config).
4. **Restart** dev server: kill 5200, `pnpm dev`, wait ~8s.
5. **Re-run** from Step 2 for this sample.
6. **Repeat** until the determination is **PASS** or the agent reports a blocking issue (e.g. Mermaid upstream bug, unsupported syntax).

---

## Outputs

- **Screenshot**: `test_samples/01-agent-learning-protocol-actual.png` (or analogous for future samples).
- **Result**: One of `PASS` or `FAIL` (and if FAIL after fixes: short reason and suggested next steps).
- **Log**: Which sample, timestamp, and whether a fix–restart–test cycle was used.

---

## Integration with AGENT_TEST_EXECUTION_PROTOCOL

- Reuse the same **snapshot lifecycle** (fresh snapshot before each interaction; `fill` may return an updated snapshot).
- Reuse **textarea clear** pattern: `el.value = ''` plus `dispatchEvent(new Event('input', { bubbles: true }))`.
- Reuse **timeout handling**: if `fill` times out, take a snapshot to confirm content and rendering.
- **Port 5200 only**; never start a duplicate server on another port.

---

## Adding More Samples

1. Add `NN-descriptive-name.md` in `test_samples/` with a single Mermaid (or other) block in a fenced code block with the right info string (e.g. ` ```mermaid `).
2. Add `NN-descriptive-name-ssot.png` (the known-good render).
3. For fetch-based load: copy the `.md` to `public/test_samples/` so `fetch('/test_samples/NN-descriptive-name.md')` works.
4. Append a row to the **Test Sample Layout** table and add a corresponding step 4/5 for that sample (or generalise the “actual” and “SSOT” paths by `NN`).

---

## Changelog

- **v1.0**: Initial ALP; sample 01 (Agent Learning Protocol flowchart); SSOT from working render.
- **v1.1**: Step 2: fetch-based load for large samples (avoids `fill` truncation/timeout). Fix for sample 01: `class Bridge,FileRef bridge` → `class FileRef bridge` (Bridge is a subgraph id, not a node; invalid node ref caused parse/blank render).
