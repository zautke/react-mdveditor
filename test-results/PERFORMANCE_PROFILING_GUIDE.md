# Frontend Load-Time Performance Profiling Guide

## Quick Start

### Method 1: Browser Console Script (RECOMMENDED)

1. **Start the dev server:**
   ```bash
   cd /Volumes/FLOUNDER/dev/mdeditor
   pnpm dev
   ```

2. **Open in browser:**
   Navigate to http://localhost:5200

3. **Run the profiler:**
   - Open Chrome/Edge DevTools (F12)
   - Go to the Console tab
   - Copy and paste the entire contents of `test-results/performance-profiler.js`
   - Press Enter
   - Wait 2-3 seconds for the comprehensive report

4. **Review results:**
   The script will output formatted tables showing:
   - Core Web Vitals (LCP, FCP, TTFB, CLS, FID, INP)
   - Navigation timing breakdown
   - Resource loading analysis by type and extension
   - Render-blocking resources
   - JavaScript bundle analysis
   - Critical rendering path
   - Automated observations and recommendations

### Method 2: Chrome DevTools Performance Panel

1. Open DevTools → Performance tab
2. Click the record button (or Ctrl+E)
3. Reload the page (Ctrl+R)
4. Wait for the page to fully load
5. Stop recording
6. Analyze the flame chart and timing breakdown

### Method 3: Lighthouse

1. Open DevTools → Lighthouse tab
2. Select "Performance" category
3. Choose "Desktop" or "Mobile"
4. Click "Analyze page load"
5. Review the generated report

---

## Performance Baseline Analysis

### Project Architecture Impact on Performance

Based on code review, here are the key architectural factors affecting load-time performance:

#### 1. **Dependency Bundle Size**

**Heavy Dependencies (potential performance impact):**

```json
{
  "react-markdown": "^10.1.0",           // ~200KB unpacked
  "react-syntax-highlighter": "^16.1.0",  // ~500KB+ with language packs
  "mermaid": "^11.12.2",                  // ~1.2MB unpacked
  "rehype-mathjax": "^7.1.0",             // MathJax is ~300KB
  "motion": "^12.23.26",                  // Animation library ~150KB
  "lucide-react": "^0.562.0",             // Icon library ~100KB
}
```

**Total estimated initial bundle size (uncompressed):** ~2.5MB
**Expected transfer size (with Brotli):** ~400-600KB

#### 2. **Code Splitting Configuration**

From `vite.config.ts`:

```typescript
manualChunks: {
  vendor: ['react', 'react-dom'],                    // ~140KB
  markdown: [
    'react-markdown',
    'react-syntax-highlighter',
    'remark-gfm',
    'rehype-raw',
    'rehype-slug'
  ],                                                  // ~700KB
  'react-preview': ['react-runner']                   // ~50KB
}
```

**Current strategy:**
- ✅ React core isolated in vendor chunk (good for caching)
- ✅ Markdown ecosystem separated
- ⚠️  Mermaid NOT in a separate chunk (loads eagerly)
- ⚠️  MathJax NOT in a separate chunk (loads eagerly)

#### 3. **Component-Level Performance Patterns**

**From `EditorWithProview.tsx`:**

✅ **Good patterns:**
- Memoization: `InputPane` and `RenderPane` are wrapped in `React.memo`
- Debounced persistence: localStorage save has 500ms debounce
- Conditional rendering: Editor pane hidden when expanded
- Hardware acceleration hints: `transform-gpu`, `backface-hidden`, `will-change`

⚠️  **Potential issues:**
- No lazy loading for renderer components
- MermaidDiagram renders synchronously (could block main thread)
- All markdown processing happens on main thread
- No virtualization for large documents

#### 4. **Rendering Pipeline Complexity**

**Markdown processing chain:**
```
User Input → react-markdown
          → remark-gfm (tables, strikethrough, etc.)
          → remark-math (equation parsing)
          → rehype-raw (HTML sanitization)
          → rehype-slug (heading IDs)
          → rehype-mathjax (equation rendering)
          → react-syntax-highlighter (code blocks)
          → MermaidDiagram (async diagram rendering)
          → DOM
```

**Performance characteristics:**
- 7+ transformation steps per render
- Each keystroke triggers full pipeline (mitigated by memoization)
- Syntax highlighting is synchronous
- Mermaid rendering is async but not web worker-based

---

## Expected Performance Targets

Based on the architecture analysis:

### Development Mode (Vite HMR at http://localhost:5200)

| Metric | Target | Expected Reality | Notes |
|--------|--------|------------------|-------|
| **TTFB** | ≤ 100ms | 10-50ms | Local dev server, extremely fast |
| **FCP** | ≤ 1800ms | 300-800ms | Vite pre-bundles dependencies |
| **LCP** | ≤ 2500ms | 800-1500ms | Large textarea/preview panes |
| **CLS** | ≤ 0.1 | 0.0-0.05 | Fixed layout, no dynamic content shifts |
| **FID** | ≤ 100ms | 10-50ms | Low JavaScript execution time initially |
| **Total Load** | ≤ 3000ms | 1000-2000ms | Development build, no minification |
| **Bundle Size** | N/A | 2-4MB | Unminified with sourcemaps |

### Production Build (`pnpm build`)

| Metric | Target | Expected Reality | Notes |
|--------|--------|------------------|-------|
| **TTFB** | ≤ 800ms | 50-200ms | Depends on hosting |
| **FCP** | ≤ 1800ms | 600-1200ms | Minified bundles |
| **LCP** | ≤ 2500ms | 1000-2000ms | Heavy markdown renderer |
| **CLS** | ≤ 0.1 | 0.0-0.05 | Fixed layout |
| **FID** | ≤ 100ms | 20-80ms | Minified JavaScript |
| **Total Load** | ≤ 3000ms | 1500-2500ms | All chunks loaded |
| **Bundle Size** | ≤ 500KB | 400-600KB | Gzipped/Brotli |

---

## Optimization Recommendations

### 1. **Lazy Load Heavy Dependencies**

**Current bottleneck:** Mermaid (~1.2MB) loads eagerly

**Solution:**
```typescript
// Instead of:
import { MermaidDiagram } from '@/components/markdown/MermaidDiagram'

// Use dynamic import:
const MermaidDiagram = lazy(() => import('@/components/markdown/MermaidDiagram'))

// Wrap in Suspense:
<Suspense fallback={<div>Loading diagram...</div>}>
  <MermaidDiagram code={code} />
</Suspense>
```

**Expected improvement:**
- FCP: -200ms to -400ms
- Bundle size: -400KB initial transfer

### 2. **Add Mermaid to Manual Chunks**

Update `vite.config.ts`:

```typescript
manualChunks: {
  vendor: ['react', 'react-dom'],
  markdown: ['react-markdown', 'react-syntax-highlighter', 'remark-gfm', 'rehype-raw', 'rehype-slug'],
  'react-preview': ['react-runner'],
  mermaid: ['mermaid'],              // NEW: Isolate Mermaid
  math: ['rehype-mathjax'],          // NEW: Isolate MathJax
}
```

**Expected improvement:**
- Better caching (Mermaid rarely updates)
- Parallel loading of chunks

### 3. **Debounce Markdown Rendering**

**Current:** Renders on every keystroke (mitigated by `React.memo` but still processes)

**Solution:**
```typescript
const [debouncedContent, setDebouncedContent] = useState(content)

useEffect(() => {
  const timer = setTimeout(() => setDebouncedContent(content), 150)
  return () => clearTimeout(timer)
}, [content])

// Pass debouncedContent to RenderPane instead of content
```

**Expected improvement:**
- Smoother typing experience
- Reduced CPU usage during editing

### 4. **Virtualize Large Documents**

For documents with >100 paragraphs, consider using `react-window` or `react-virtual` to render only visible content.

### 5. **Optimize Syntax Highlighter**

**Current:** Loads all Prism languages

**Solution:**
```typescript
// Import only needed languages
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
// Language-specific imports instead of auto-detect
```

**Expected improvement:**
- Bundle size: -100KB to -200KB

### 6. **Add Resource Hints**

In `index.html`:
```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
```

### 7. **Enable Compression in Production**

Ensure your hosting platform serves files with Brotli or Gzip compression.

---

## Measuring Performance Impact

After implementing optimizations, re-run the profiler script and compare:

```bash
# Before optimization
LCP: 1500ms
FCP: 800ms
Bundle: 600KB

# After optimization (expected)
LCP: 1000ms (-33%)
FCP: 500ms (-37%)
Bundle: 350KB (-42%)
```

---

## Continuous Monitoring

### 1. **Bundle Size Tracking**

Add to `package.json`:
```json
{
  "scripts": {
    "analyze": "vite build && vite-bundle-analyzer"
  }
}
```

### 2. **Performance Budget**

Create `.lighthouserc.json`:
```json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 1800}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["error", {"maxNumericValue": 300}]
      }
    }
  }
}
```

### 3. **CI/CD Integration**

Run Lighthouse in GitHub Actions on every PR:
```yaml
- name: Run Lighthouse
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: http://localhost:5200
    budgetPath: ./.lighthouserc.json
```

---

## Troubleshooting

### "LCP is the page background"
→ Ensure the largest content element (textarea or preview) renders quickly

### "CLS spikes during diagram rendering"
→ Reserve space for Mermaid diagrams with min-height

### "FCP delayed by font loading"
→ Add `font-display: swap` to @font-face rules

### "High TTFB in production"
→ Check CDN configuration and server response times

---

## Additional Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Chrome DevTools Performance Guide](https://developer.chrome.com/docs/devtools/performance/)
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit#optimizing-performance)

---

**Last Updated:** 2026-02-16
**Project:** mdeditor
**Version:** 1.0.0
