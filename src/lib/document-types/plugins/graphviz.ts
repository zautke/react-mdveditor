/**
 * GraphViz Plugin — Document Type Definition
 *
 * Priority 11 (above mermaid=10) — checked first to claim `digraph`
 * and `graph { }` syntax before mermaid's first-word `'graph'` match fires.
 *
 * Detection uses a brace heuristic: mermaid's `graph TD/LR` never has
 * an opening brace on the header line; valid DOT always does.
 */

import { lazy, Suspense, createElement } from 'react'
import { Workflow } from 'lucide-react'
import type { DocumentTypePlugin, RendererProps } from '../types'

// ── Lazy renderer ───────────────────────────────────────────────────
// The @hpcc-js/wasm-graphviz WASM binary (~650 KB) is only fetched
// when this chunk is first loaded.

const LazyGraphvizPreview = lazy(
  () => import('@/components/markdown/GraphvizPreview'),
)

function GraphvizRendererWrapper({ content }: RendererProps) {
  return createElement(
    Suspense,
    {
      fallback: createElement(
        'div',
        { style: { padding: '1rem', color: '#888', fontStyle: 'italic' } },
        'Rendering diagram…',
      ),
    },
    createElement(LazyGraphvizPreview, { content }),
  )
}
GraphvizRendererWrapper.displayName = 'GraphvizRendererWrapper'

export default GraphvizRendererWrapper

// ── Detection ───────────────────────────────────────────────────────

/**
 * Returns `true` when `text` is DOT language.
 *
 * Scans the first 100 characters for the DOT header pattern:
 *   [strict] (di)?graph [name] {
 *
 * The `{` requirement is the key discriminator: mermaid's `graph TD`
 * has no brace, so this never fires a false positive for mermaid content.
 *
 * The `is` flags enable dotAll (`.` matches `\n`) so a brace on the
 * next line (e.g. K&R style) is also detected.
 */
export function isGraphvizText(text: string): boolean {
  const peek = text.trimStart().slice(0, 100)
  return /^(strict\s+)?(sub|di)?graph(\s+[\w"]+)?\s*\{/is.test(peek)
}

// ── Default content ─────────────────────────────────────────────────

const defaultGraphvizContent = `digraph Pipeline {
    rankdir=LR;
    node [shape=box];

    DiscoverFiles -> ParseAST [label="inputs: repo_root:str, extensions:list[str]\\noutputs: file_paths:list[str]"];
    ParseAST -> ExtractSpans [label="inputs: file_path:str, code:str, parser\\noutputs: spans:list[(int,int)]"];
    ExtractSpans -> MakeChunks [label="inputs: repo_root:str, file_path:str, language:str,\\nspans & code\\noutputs: CodeChunks:list[CodeChunk]"];
    MakeChunks -> BuildGraphDocs [label="inputs: CodeChunks\\noutputs: GraphNodes:list[GraphNode], GraphEdges:list[GraphEdge]"];
    BuildGraphDocs -> PersistGraph [label="inputs: nodes, edges, Neo4j credentials\\noutputs: graph persisted"];
    PersistGraph -> GenerateEmbeddings [label="inputs: CodeChunks, embedder\\noutputs: embeddings:numpy.ndarray"];
    GenerateEmbeddings -> UpsertVectors [label="inputs: embeddings, Qdrant client, metadata\\noutputs: vectors stored"];
    UpsertVectors -> VectorSearch [label="inputs: query:str, embedder, top_k:int\\noutputs: semantic hits:list[(id, score, payload)]"];
    VectorSearch -> LoadGraph [label="inputs: Neo4j driver\\noutputs: graph:nx.DiGraph"];
    LoadGraph -> ExpandNeighbourhood [label="inputs: graph:nx.DiGraph, seed_ids:list[str], max_hops:int\\noutputs: neighbour_ids:set[str]"];
    ExpandNeighbourhood -> RerankWithPageRank [label="inputs: semantic hits, neighbour_ids, PageRank scores\\noutputs: candidates:list[RetrievalCandidate]"];
    RerankWithPageRank -> HydrateChunks [label="inputs: semantic hits\\noutputs: hydrated_chunks:dict[str,CodeChunk]"];
    HydrateChunks -> SelectContext [label="inputs: candidates, hydrated_chunks, max_chunks:int\\noutputs: context:list[CodeChunk]"];
    SelectContext -> BuildPrompt [label="inputs: query:str, context:list[CodeChunk]\\noutputs: prompt:str"];
    BuildPrompt -> LLMCall [label="inputs: prompt\\noutputs: answer:str"];
}
`

// ── Plugin definition ───────────────────────────────────────────────

export const graphvizPlugin: DocumentTypePlugin = {
  kind: 'graphviz',
  label: 'GraphViz Diagram',
  icon: Workflow,
  detect: isGraphvizText,
  priority: 11,
  renderer: GraphvizRendererWrapper,
  layout: 'split',
  fileExtensions: ['.dot', '.gv'],
  exportMimeType: 'text/plain',
  exportExtension: '.dot',
  defaultContent: defaultGraphvizContent,
  defaultTitle: (n: number) => `Graph-${n}`,
  tabColor: 'oklch(0.65 0.18 45)',
}
