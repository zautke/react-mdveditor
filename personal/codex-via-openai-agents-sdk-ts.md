# Codex via OpenAI Agents SDK (TypeScript): zero → expert

This document teaches you how to build a *Codex-grade* coding setup in TypeScript by combining:

- **Codex (product)**: a cloud + local coding agent (CLI / IDE / web) that edits repos, runs commands/tests, and can work asynchronously.
- **Codex SDK (`@openai/codex-sdk`)**: programmatic access to the same Codex agent loop (threads, resume, structured outputs).
- **OpenAI Agents SDK (`@openai/agents`)**: a general-purpose framework for building agent workflows (tools, sessions/memory, MCP, handoffs, tracing, guardrails).

You’ll end with:
1) a **Context Manager** that assembles repo + project context under strict token budgets  
2) your **frontend-developer** agent wired to *always* ask the Context Manager first (as your prompt requires)  
3) a **persistent memory layer** backed by your Obsidian vault (basic-memory style)  
4) optional **Codex SDK** integration for “delegate this task” / async work

---

## 0. Terminology and what problems each thing solves

### Codex (CLI / IDE / Cloud)
Codex is an agentic software engineering teammate. It can:
- navigate your repo
- modify files
- run commands/tests
- produce logs/citations and commits
- run tasks in cloud sandboxes (async “delegate”), or locally (interactive pairing)

Use Codex when you want the “full agent loop” (plan → edit → run → iterate) without building it all yourself.

### Codex SDK (`@openai/codex-sdk`)
Codex SDK lets you drive Codex from code:
- start/resume a **thread**
- call `thread.run("do task")` repeatedly
- optionally require structured output (JSON schema)
- plug into CI/CD, internal tools, GitHub Actions, etc.

Use Codex SDK when:
- you want the *same behavior as Codex CLI/cloud* inside your own service
- you want to automate tasks like PR review, CI autofix, migrations, etc.

### OpenAI Agents SDK (`@openai/agents`)
Agents SDK gives you primitives:
- **Agent**: instructions + model + tools
- **Tools**: hosted tools, function tools, agents-as-tools, MCP servers
- **Sessions**: persistent memory layer behind a `Session` interface
- **Handoffs**: route to specialist agents
- **Tracing**: built-in observability
- **Guardrails** and **HITL approvals**

Use Agents SDK when:
- you need multi-agent workflows (triage → specialist)
- you want deterministic context assembly (token budgeting, filtering, de-duplication)
- you want your own “context manager” that controls what the model sees each turn
- you want to attach local tools (filesystem/git/repomap/obsidian) via MCP or function tools

### How they fit together (recommended)
- Build **Context Manager** + **frontend-developer** workflow in **Agents SDK**
- Optionally expose **Codex SDK** as a tool so your workflow can “delegate” heavy coding jobs to Codex
- Use **Sessions** (Agents SDK) for *chat + memory*, and use **Codex threads** for *delegated tasks*

---

## 1. Project setup (pnpm + TS strict)

### 1.1 Create workspace

```bash
mkdir codex-agents && cd codex-agents
pnpm init
pnpm add @openai/agents @openai/agents-core zod
pnpm add @openai/codex-sdk
pnpm add -D typescript tsx @types/node vitest
```

> Notes:
> - Codex SDK requires Node >= 18 (server-side).
> - `tsx` is convenient for running TS directly during development.

### 1.2 `tsconfig.json` (strict, no `any`)

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

### 1.3 `package.json` scripts

`package.json`
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx src/main.ts",
    "test": "vitest run"
  }
}
```

### 1.4 Environment variables

`.env`
```bash
OPENAI_API_KEY=...
# Optional: disable tracing (not recommended in dev)
# OPENAI_AGENTS_DISABLE_TRACING=1
```

---

## 2. The Agents SDK mental model (with minimal runnable code)

### 2.1 Minimal agent run

`src/minimal.ts`
```ts
import { Agent, run } from "@openai/agents";

const agent = new Agent({
  name: "HelloAgent",
  instructions: "Be concise. Answer like a senior engineer.",
  model: "gpt-5-nano"
});

const result = await run(agent, "Explain what a context manager does for coding agents.");
console.log(result.finalOutput);
```

Run:
```bash
pnpm dev -- src/minimal.ts
```

### 2.2 Why Agents SDK is worth it
If you tried to do “agentic coding” with just raw model calls, you’d quickly hit these problems:
- tool calling boilerplate + schema validation
- maintaining conversation memory safely (don’t just dump entire chat)
- replay/resume after tool approvals
- multi-agent routing and *handoff context filtering*
- observability (what did the agent do and why?)

Agents SDK handles those, and gives you hooks to control the **exact** inputs the model sees.

---

## 3. Tools: function tools + MCP servers (filesystem/git)

Agents SDK supports:
- hosted tools (web search, file search, shell, computer)
- function tools (local functions with JSON schema)
- agents-as-tools
- local MCP servers (stdio / streamable HTTP / hosted MCP)

### 3.1 A function tool (typed input, safe output)

`src/tools/projectContext.ts`
```ts
import { tool } from "@openai/agents";
import { z } from "zod";

export const getProjectContextTool = tool({
  name: "get_project_context",
  description:
    "Returns project context (architecture, patterns, tooling, conventions) for the current repo. Always call this before making frontend code changes.",
  parameters: z.object({
    query: z.string().min(1)
  }),
  execute: async ({ query }) => {
    // In real usage, this will call your context-manager logic.
    // For now, return a placeholder shape.
    return {
      query,
      summary: "TODO: context-manager will populate this."
    };
  }
});
```

### 3.2 Attach a filesystem MCP server (stdio)

You can spawn the reference filesystem MCP server via `npx` and attach it to an agent.

`src/mcp/filesystem.ts`
```ts
import { MCPServerStdio } from "@openai/agents";

export async function startFilesystemMcp(sampleDir: string) {
  const server = new MCPServerStdio({
    name: "Filesystem MCP",
    fullCommand: `npx -y @modelcontextprotocol/server-filesystem ${sampleDir}`,
    cacheToolsList: true
  });
  await server.connect();
  return server;
}
```

### 3.3 Create an agent that can use MCP tools

`src/mcp/fsAgent.ts`
```ts
import { Agent, run } from "@openai/agents";
import { startFilesystemMcp } from "./filesystem.js";
import path from "node:path";

const repoDir = process.cwd();
const server = await startFilesystemMcp(repoDir);

try {
  const agent = new Agent({
    name: "RepoReader",
    instructions:
      "Use filesystem tools to inspect the repo and answer questions. If a file doesn't exist, say so.",
    mcpServers: [server]
  });

  const result = await run(agent, "List the top-level directories and tell me where the frontend likely lives.");
  console.log(result.finalOutput);
} finally {
  await server.close();
}
```

---

## 4. Sessions (persistent memory) and `sessionInputCallback` (deterministic prompt assembly)

### 4.1 Why sessions matter
Sessions let the SDK:
- load prior history automatically
- append new user + assistant items after each run
- resume from interrupted `RunState`

…but the real power is `sessionInputCallback`: you can **merge + trim + de-dup** history and new context items *before every model call*.

### 4.2 The Session interface you implement
At minimum you implement:
- `getSessionId()`
- `getItems(limit?)`
- `addItems(items)`
- optionally `popItem()`, `clearSession()`

### 4.3 File-backed session (simple + robust)
Start with a simple file-backed session so you can prove the architecture:

`src/sessions/fileSession.ts`
```ts
import type { AgentInputItem } from "@openai/agents-core";
import type { Session } from "@openai/agents";
import { promises as fs } from "node:fs";
import path from "node:path";

type SessionFile = {
  sessionId: string;
  items: AgentInputItem[];
};

export class FileSession implements Session {
  private readonly filePath: string;
  private readonly sessionId: string;

  constructor(opts: { dir: string; sessionId: string }) {
    this.sessionId = opts.sessionId;
    this.filePath = path.join(opts.dir, `${opts.sessionId}.json`);
  }

  async getSessionId(): Promise<string> {
    return this.sessionId;
  }

  private async read(): Promise<SessionFile> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as SessionFile;
      return parsed;
    } catch {
      return { sessionId: this.sessionId, items: [] };
    }
  }

  private async write(data: SessionFile): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  async getItems(limit?: number): Promise<AgentInputItem[]> {
    const { items } = await this.read();
    if (typeof limit === "number") {
      const slice = items.slice(Math.max(0, items.length - limit));
      return slice;
    }
    return items;
  }

  async addItems(items: AgentInputItem[]): Promise<void> {
    const data = await this.read();
    data.items.push(...items);
    await this.write(data);
  }

  async popItem(): Promise<AgentInputItem | undefined> {
    const data = await this.read();
    const last = data.items.pop();
    await this.write(data);
    return last;
  }

  async clearSession(): Promise<void> {
    await this.write({ sessionId: this.sessionId, items: [] });
  }
}
```

### 4.4 Deterministic merge + truncation with `sessionInputCallback`

A practical merge strategy for coding agents:

- keep a rolling summary (very small)
- keep the last `N` turns verbatim (small)
- keep “context package” items (repomap + selected snippets) (medium)
- drop old tool outputs first
- never exceed your token budget

`src/sessions/sessionInputCallback.ts`
```ts
import type { AgentInputItem } from "@openai/agents-core";
import type { SessionInputCallback } from "@openai/agents";

/**
 * VERY rough token estimate: ~4 chars/token in English-ish text.
 * For code, ~3-4 chars/token is still a usable heuristic.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function itemTokens(item: AgentInputItem): number {
  // AgentInputItem shape varies by type; handle the common ones.
  if ("content" in item && typeof item.content === "string") {
    return estimateTokens(item.content);
  }
  return estimateTokens(JSON.stringify(item));
}

export function buildSessionInputCallback(opts: {
  maxInputTokens: number;
  reserveForOutputTokens: number;
}): SessionInputCallback {
  const allowed = Math.max(1, opts.maxInputTokens - opts.reserveForOutputTokens);

  return async (historyItems, newItems) => {
    const combined = [...historyItems, ...newItems];

    // Prefer keeping recent items (reverse scan), drop until under budget.
    const kept: AgentInputItem[] = [];
    let total = 0;

    for (let i = combined.length - 1; i >= 0; i--) {
      const it = combined[i]!;
      const t = itemTokens(it);

      if (total + t > allowed) continue;

      kept.push(it);
      total += t;
    }

    kept.reverse();
    return kept;
  };
}
```

This is intentionally “dumb but deterministic”. You’ll later replace it with a smarter strategy
that prefers *repomap + relevant snippets* over chat history, but the hook stays the same.

---

## 5. Your Context Manager (the thing your frontend-developer prompt asks for)

Your frontend-developer prompt mandates it sends:

```json
{
  "requesting_agent": "frontend-developer",
  "request_type": "get_project_context",
  "payload": {
    "query": "Frontend development context needed: current UI architecture, component ecosystem, design language, established patterns, and frontend infrastructure."
  }
}
```

You want the Context Manager to respond with:
- architectural map (folders, key packages, entry points)
- styling system + tokens
- state mgmt (Redux/Zustand/etc.)
- testing stack + conventions
- build tooling + deploy notes
- TypeScript strictness + lint rules
- accessibility patterns / components
- performance budgets & patterns
- “where to make changes” guidance

### 5.1 Define a strict response schema
If your context output is unstructured prose, agents will misread it and you’ll lose determinism.
Return structured JSON plus *high-signal snippets*.

`src/context/schema.ts`
```ts
import { z } from "zod";

export const ProjectContextSchema = z.object({
  repo: z.object({
    name: z.string().optional(),
    root: z.string()
  }),
  frontend: z.object({
    framework: z.enum(["react", "vue", "angular", "unknown"]),
    entrypoints: z.array(z.string()),
    componentDirs: z.array(z.string()),
    styling: z.object({
      system: z.enum(["tailwind", "css-modules", "styled-components", "emotion", "sass", "vanilla", "unknown"]),
      tokens: z.array(z.string()).default([])
    }),
    state: z.object({
      system: z.enum(["redux", "zustand", "mobx", "context", "signals", "unknown"]),
      notes: z.string().default("")
    }),
    testing: z.object({
      runner: z.enum(["vitest", "jest", "playwright", "cypress", "other", "unknown"]),
      libs: z.array(z.string()).default([]),
      coverageTarget: z.number().min(0).max(100).default(85)
    }),
    build: z.object({
      tool: z.enum(["vite", "nextjs", "webpack", "rspack", "parcel", "other", "unknown"]),
      notes: z.string().default("")
    }),
    conventions: z.object({
      tsconfigStrict: z.boolean().default(true),
      linting: z.array(z.string()).default([]),
      formatting: z.array(z.string()).default([])
    }),
    a11y: z.object({
      target: z.string().default("WCAG 2.1 AA"),
      patterns: z.array(z.string()).default([])
    }),
    perf: z.object({
      budgets: z.array(z.string()).default([]),
      patterns: z.array(z.string()).default([])
    })
  }),
  keyFiles: z.array(
    z.object({
      path: z.string(),
      why: z.string(),
      excerpt: z.string().max(4000) // keep excerpts small
    })
  ),
  warnings: z.array(z.string()).default([]),
  nextQuestionsForUser: z.array(z.string()).default([])
});

export type ProjectContext = z.infer<typeof ProjectContextSchema>;
```

### 5.2 Build the Context Manager as a tool

`src/context/contextManager.ts`
```ts
import { tool } from "@openai/agents";
import { z } from "zod";
import { ProjectContextSchema, type ProjectContext } from "./schema.js";
import { promises as fs } from "node:fs";
import path from "node:path";

const RequestSchema = z.object({
  requesting_agent: z.string(),
  request_type: z.literal("get_project_context"),
  payload: z.object({
    query: z.string()
  })
});

async function tryRead(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function excerpt(text: string, max = 1200): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n…(truncated)…";
}

export const contextManagerTool = tool({
  name: "context_manager_get_project_context",
  description:
    "Builds a structured project context payload for specialist agents (frontend/backend/etc.). Prefer concrete evidence from key files.",
  parameters: RequestSchema,
  execute: async (req): Promise<ProjectContext> => {
    const root = process.cwd();

    // “Evidence-first” files
    const pkg = await tryRead(path.join(root, "package.json"));
    const tsconfig = await tryRead(path.join(root, "tsconfig.json"));
    const readme = await tryRead(path.join(root, "README.md"));
    const agentsMd = await tryRead(path.join(root, "AGENTS.md"));

    // Naive heuristics (replace with repo scan + repomap later)
    const ctx: ProjectContext = {
      repo: { root },
      frontend: {
        framework: "unknown",
        entrypoints: [],
        componentDirs: [],
        styling: { system: "unknown", tokens: [] },
        state: { system: "unknown", notes: "" },
        testing: { runner: "unknown", libs: [], coverageTarget: 85 },
        build: { tool: "unknown", notes: "" },
        conventions: { tsconfigStrict: true, linting: [], formatting: [] },
        a11y: { target: "WCAG 2.1 AA", patterns: [] },
        perf: { budgets: [], patterns: [] }
      },
      keyFiles: [],
      warnings: [],
      nextQuestionsForUser: []
    };

    if (pkg) ctx.keyFiles.push({ path: "package.json", why: "Dependencies reveal framework/tooling.", excerpt: excerpt(pkg) });
    if (tsconfig) ctx.keyFiles.push({ path: "tsconfig.json", why: "TypeScript strictness and path aliases.", excerpt: excerpt(tsconfig) });
    if (readme) ctx.keyFiles.push({ path: "README.md", why: "Project conventions and commands.", excerpt: excerpt(readme) });
    if (agentsMd) ctx.keyFiles.push({ path: "AGENTS.md", why: "Codex/agent guidance for this repo.", excerpt: excerpt(agentsMd) });

    // Validate output (fail fast if shape breaks)
    return ProjectContextSchema.parse(ctx);
  }
});
```

### 5.3 Wire it into your frontend-developer agent
Now you can give your frontend-developer agent a tool it can call (instead of “asking the user”),
and you can enforce tool use behavior.

`src/agents/frontendDeveloper.ts`
```ts
import { Agent } from "@openai/agents";
import { contextManagerTool } from "../context/contextManager.js";

export const frontendDeveloperAgent = new Agent({
  name: "frontend-developer",
  instructions: `
You are a senior frontend developer...

MANDATORY FIRST STEP:
Before beginning ANY frontend development work, you MUST request project context by calling the tool:
context_manager_get_project_context

Then, after receiving it:
- map architecture, patterns, tooling
- only ask targeted questions not covered by context

(Your full prompt can be pasted here.)
  `.trim(),
  tools: [contextManagerTool],
  model: "gpt-5"
});
```

### 5.4 Enforce “must call context manager first” (two patterns)

**Pattern A (prompt-only)**: rely on your prompt and hope the model complies.  
This is the weakest.

**Pattern B (tool-choice enforcement)**: for the *first* turn, force tool use:
- You send a *single user message*: “Do X”
- The run config says: “tool choice must be context_manager_get_project_context”
- Then you rerun with normal tool choice once context is present.

In Agents SDK, the exact knob depends on model/runner config; the tools guide references `tool_choice` / `toolUseBehavior`. Keep this as a TODO until you confirm which model backend you’re using (OpenAI Responses vs non-Responses). The approach is still correct.

---

## 6. Making the Context Manager actually good: repo scanning + repomap + snippet selection

Your placeholder context manager above only reads a few top-level files. For real repos you need:

1) **Repo inventory**: list files, identify candidate frontend roots  
2) **Evidence extraction**: open and excerpt the *most decisive* files:
   - `package.json`, `pnpm-lock.yaml`, `tsconfig*`, `.eslintrc*`, `.prettierrc*`
   - `vite.config.*`, `next.config.*`, `angular.json`, `vue.config.*`
   - `src/main.*`, `src/index.*`, `app/*` (Next), router setup, store setup
   - design tokens: `tailwind.config.*`, `tokens.*`, `theme.*`
   - test config: `vitest.config.*`, `jest.config.*`, `playwright.config.*`
   - CI: `.github/workflows/*`

3) **RepoMap**: compact map of the entire repo, to orient the agent without dumping everything  
4) **Token budget**: cap map size + snippet selection so you never blow context window

### 6.1 Repo scan (local, fast)

`src/context/repoScan.ts`
```ts
import { promises as fs } from "node:fs";
import path from "node:path";

export type RepoFile = { path: string; size: number };

export async function scanRepo(root: string, opts?: { maxFiles?: number }): Promise<RepoFile[]> {
  const maxFiles = opts?.maxFiles ?? 20000;
  const out: RepoFile[] = [];

  async function walk(dir: string) {
    if (out.length >= maxFiles) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (out.length >= maxFiles) return;
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else {
        const st = await fs.stat(p);
        out.push({ path: path.relative(root, p), size: st.size });
      }
    }
  }

  await walk(root);
  return out;
}
```

### 6.2 “Key file” ranking (simple heuristics)
Start with deterministic heuristics before adding embeddings.

`src/context/rankKeyFiles.ts`
```ts
import type { RepoFile } from "./repoScan.js";

const PRIORITY_PATTERNS: Array<{ rx: RegExp; score: number }> = [
  { rx: /^package\.json$/i, score: 1000 },
  { rx: /^pnpm-lock\.yaml$/i, score: 900 },
  { rx: /^tsconfig(\..+)?\.json$/i, score: 850 },
  { rx: /^(vite|next|webpack|rspack|angular|vue)\.config\./i, score: 800 },
  { rx: /^tailwind\.config\./i, score: 780 },
  { rx: /^\.eslintrc(\..+)?$/i, score: 760 },
  { rx: /^\.prettierrc(\..+)?$/i, score: 740 },
  { rx: /^src\/(main|index)\./i, score: 700 },
  { rx: /^src\/router\//i, score: 650 },
  { rx: /^src\/store\//i, score: 650 },
  { rx: /^\.github\/workflows\//i, score: 500 }
];

export function rankKeyFiles(files: RepoFile[]): RepoFile[] {
  const scored = files.map((f) => {
    let score = 0;
    for (const p of PRIORITY_PATTERNS) {
      if (p.rx.test(f.path)) score = Math.max(score, p.score);
    }
    // slight bias to smaller files (easier to excerpt)
    score += Math.max(0, 50 - Math.log10(Math.max(1, f.size)));
    return { ...f, score };
  });

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return scored as unknown as RepoFile[];
}
```

### 6.3 Add RepoMap (recommended)
At this point, plug in a RepoMap generator (e.g., RepoMapper/Aider-style). The key is:
- produce a compact “map” string under a token target
- keep it stable across runs (cache)
- include symbols/exports if possible (tree-sitter helps)

If you already have a RepoMap MCP server (RepoMapper), treat it as just another tool:
- `repomap_get({ tokenBudget, focusPaths? })`

Then include the map as a high-priority context item.

---

## 7. Persistent memory in Obsidian (basic-memory style) via Sessions

You said: “absolutely. i use basic-memory tied to obsidian”.

You have two good approaches:

### Approach A (recommended): Obsidian-backed `Session` store
Store the session history (and summaries) as Markdown notes in your Obsidian vault:
- easy to inspect + version
- supports your existing workflows
- allows “human curated memory”

#### 7.1 Obsidian vault layout
Example:

```
obsidian-vault/
  AI Memory/
    sessions/
      session_<id>.json
    summaries/
      session_<id>.md
    facts/
      project_<repo>.md
```

Keep raw history as JSON (lossless) and curated summaries as Markdown.

#### 7.2 ObsidianSession implementation
`src/sessions/obsidianSession.ts`
```ts
import type { AgentInputItem } from "@openai/agents-core";
import type { Session } from "@openai/agents";
import { promises as fs } from "node:fs";
import path from "node:path";

type Store = { sessionId: string; items: AgentInputItem[] };

export class ObsidianSession implements Session {
  private readonly sessionId: string;
  private readonly baseDir: string;

  constructor(opts: { vaultPath: string; sessionId: string }) {
    this.sessionId = opts.sessionId;
    this.baseDir = path.join(opts.vaultPath, "AI Memory", "sessions");
  }

  async getSessionId(): Promise<string> {
    return this.sessionId;
  }

  private filePath() {
    return path.join(this.baseDir, `session_${this.sessionId}.json`);
  }

  private async read(): Promise<Store> {
    try {
      const raw = await fs.readFile(this.filePath(), "utf8");
      return JSON.parse(raw) as Store;
    } catch {
      return { sessionId: this.sessionId, items: [] };
    }
  }

  private async write(s: Store) {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(this.filePath(), JSON.stringify(s, null, 2), "utf8");
  }

  async getItems(limit?: number): Promise<AgentInputItem[]> {
    const { items } = await this.read();
    if (typeof limit === "number") return items.slice(Math.max(0, items.length - limit));
    return items;
  }

  async addItems(items: AgentInputItem[]): Promise<void> {
    const s = await this.read();
    s.items.push(...items);
    await this.write(s);
  }

  async clearSession(): Promise<void> {
    await this.write({ sessionId: this.sessionId, items: [] });
  }
}
```

#### 7.3 Add a rolling summary note (human + machine friendly)
You can store a rolling summary in Markdown (for Obsidian visibility):

`src/sessions/summaryStore.ts`
```ts
import { promises as fs } from "node:fs";
import path from "node:path";

export async function writeSessionSummary(opts: {
  vaultPath: string;
  sessionId: string;
  summaryMarkdown: string;
}) {
  const dir = path.join(opts.vaultPath, "AI Memory", "summaries");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `session_${opts.sessionId}.md`), opts.summaryMarkdown, "utf8");
}

export async function readSessionSummary(opts: {
  vaultPath: string;
  sessionId: string;
}): Promise<string | undefined> {
  const p = path.join(opts.vaultPath, "AI Memory", "summaries", `session_${opts.sessionId}.md`);
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return undefined;
  }
}
```

Then inject that summary into every turn (high priority, low tokens) via `sessionInputCallback`.

### Approach B: MCP “memory server”
If you already have a memory MCP server compatible with your vault, you can attach it and expose:
- `remember_fact()`
- `search_memory()`
- `get_project_profile()`

This is excellent when you want retrieval (“find prior decisions”) instead of raw chat replay.

---

## 8. Putting it together: an orchestrator that runs the frontend agent correctly

### 8.1 `src/main.ts`
```ts
import { run } from "@openai/agents";
import { frontendDeveloperAgent } from "./agents/frontendDeveloper.js";
import { ObsidianSession } from "./sessions/obsidianSession.js";
import { buildSessionInputCallback } from "./sessions/sessionInputCallback.js";

const session = new ObsidianSession({
  vaultPath: process.env.OBSIDIAN_VAULT_PATH ?? "/path/to/vault",
  sessionId: "demo"
});

const sessionInputCallback = buildSessionInputCallback({
  maxInputTokens: 32000, // adjust based on where you're running (see token section)
  reserveForOutputTokens: 4000
});

const userTask = `
Add a ProductCard component for our catalog grid.
It must be responsive, accessible, tested, and match existing design tokens.
`.trim();

const result = await run(
  frontendDeveloperAgent,
  { input: userTask },
  { session, sessionInputCallback }
);

console.log(result.finalOutput);
```

This already gives you:
- persistent memory in Obsidian
- deterministic truncation
- a context manager tool the agent can call

Next: upgrade the context manager tool from “reads 4 files” → “real repo context pack”.

---

## 9. Token budgets for a $20 (Plus) plan: what’s reasonable?

You asked: “reasonable input token max for a $20 plan? repos are medium-small to large.”

There are *two different ceilings* you need to think about:

1) **Model context window** (hard technical limit)
   - GPT‑5‑Codex in the API lists a 400,000 token context window and 128,000 max output.  
     (This is the “absolute max” when you’re actually using that model endpoint.)
2) **Product-tier limits** in ChatGPT/Codex (rate limits, credits, UI caps)
   - Plus limits are typically expressed as “messages / window” or “tasks / window”, not as a published token cap.
   - In practice, larger prompts burn more of your allowance per message/task.

### Practical recommendation (works well in real coding work)
Even if a model supports 400k tokens, you usually shouldn’t stuff that much unless you must.

Use a tiered budget:
- **Interactive pairing** (fast iterations): **12k–40k input tokens**
- **Medium refactor** (multi-file but bounded): **40k–120k**
- **Large repo exploration / big migration**: **120k–200k** (rare; rely on repomap + targeted retrieval first)

And always reserve output:
- **4k–12k** reserved output for normal coding answers
- **20k+** reserved output only when you explicitly need massive diffs or generated docs

### Default budget settings I’d start with (Plus-friendly)
- `maxInputTokens = 32000`
- `reserveForOutputTokens = 6000`

Then add “escape hatches”:
- for “analyze entire subsystem”, allow 64k–96k
- for “delegate to Codex cloud task”, let Codex handle the heavy lifting and only pass a concise spec + pointers

---

## 10. Adding Codex SDK as a tool (delegate heavy work)

This pattern is great when your Agents SDK workflow decides something is too big for interactive chat.

### 10.1 Codex tool wrapper
`src/tools/codexDelegate.ts`
```ts
import { tool } from "@openai/agents";
import { z } from "zod";
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();

export const codexDelegateTool = tool({
  name: "codex_delegate_task",
  description:
    "Delegates a complex engineering task to Codex (async-style). Use for large refactors, CI fixes, or multi-hour tasks.",
  parameters: z.object({
    prompt: z.string().min(1),
    threadId: z.string().optional()
  }),
  execute: async ({ prompt, threadId }) => {
    const thread = threadId ? codex.resumeThread(threadId) : codex.startThread();
    const result = await thread.run(prompt);
    return {
      threadId: thread.id,
      result
    };
  }
});
```

### 10.2 Attach to your triage agent
You can create a triage agent that decides:
- answer directly
- or handoff to frontend-developer
- or delegate to Codex for a big task

---

## 11. Tracing, debugging, and safety (you want this in production)

### 11.1 Tracing
Agents SDK tracing is enabled by default. You can also force-flush in certain runtimes.

### 11.2 Debug logging
Set:
```bash
export DEBUG=openai-agents*
```

### 11.3 Human-in-the-loop approvals
For sensitive tools (filesystem write, shell execution, network), require approval.
This is critical if you run agents against real repos.

---

## 12. Where to go from here (expert upgrades)

### Upgrade 1: Build a real “Context Package”
Instead of returning a blob of prose, return:

- `repomap` (token-capped)
- `key files` excerpts
- `frontend “profile”` (framework, styling, state, tests)
- `commands` (lint/test/build)
- `decision log` (from Obsidian memory)
- `open questions` (only those not answerable from repo)

Then, inject that as the *first-class* context item every time.

### Upgrade 2: Retrieval (embeddings + keyword) over Obsidian memory
Turn your Obsidian facts/notes into a searchable index:
- store embeddings per note chunk
- retrieve top-k notes for current task
- include only the top 2–6 excerpts (not everything)

### Upgrade 3: Handoff filtering
When the triage agent hands off to frontend-developer, pass only:
- last few user turns
- context package
- *relevant* memory snippets

### Upgrade 4: RepoMap + symbol graph
Add tree-sitter parsing and generate:
- exported symbols
- cross-file references
- “hot files” for a query

### Upgrade 5: Structured outputs everywhere
When possible:
- enforce JSON schema for context manager output
- enforce JSON schema for “progress updates” / “completion messages”
- parse and log it

---

## Appendix: Reference links (URLs in code block)

```text
Codex overview: https://openai.com/codex/
Introducing Codex: https://openai.com/index/introducing-codex/
Codex generally available (Codex SDK): https://openai.com/index/codex-now-generally-available/
Codex SDK docs: https://developers.openai.com/codex/sdk
Codex GitHub Action docs: https://developers.openai.com/codex/github-action
Codex pricing/limits: https://developers.openai.com/codex/pricing/
GPT-5-Codex model docs: https://platform.openai.com/docs/models/gpt-5-codex/
OpenAI Agents SDK docs (JS/TS): https://openai.github.io/openai-agents-js/
Agents SDK - Sessions: https://openai.github.io/openai-agents-js/guides/sessions/
Agents SDK - Tools: https://openai.github.io/openai-agents-js/guides/tools/
Agents SDK - MCP: https://openai.github.io/openai-agents-js/guides/mcp/
Agents SDK - Tracing: https://openai.github.io/openai-agents-js/guides/tracing/
```
