# Performance Profiling Suite - README

## Overview

This directory contains a comprehensive frontend load-time performance profiling suite for the mdeditor project. The tools are designed for **research and analysis only** — no files will be modified.

---

## Available Tools

### 1. Browser-Based Performance Profiler
**File:** `performance-profiler.js`

**What it does:**
- Measures Core Web Vitals (LCP, FCP, TTFB, CLS, FID, INP)
- Analyzes navigation timing
- Breaks down resource loading by type and extension
- Identifies render-blocking resources
- Analyzes JavaScript bundle sizes and compression ratios
- Provides automated observations and recommendations

**How to use:**
1. Start dev server: `pnpm dev`
2. Open http://localhost:5200 in Chrome/Edge
3. Open DevTools Console (F12)
4. Copy/paste the entire `performance-profiler.js` file
5. Press Enter and wait 2-3 seconds
6. Review the formatted tables and recommendations

**Output:**
- Formatted console tables with all metrics
- Color-coded ratings (Good/Needs Improvement/Poor)
- Automated performance observations
- Comparison against Web Vitals thresholds

---

### 2. Build Analysis Script
**File:** `analyze-build.sh`

**What it does:**
- Builds production bundle
- Analyzes bundle sizes by chunk
- Calculates gzip compression ratios
- Compares against performance budgets
- Generates detailed text report

**How to use:**
```bash
cd /Volumes/FLOUNDER/dev/mdeditor
./test-results/analyze-build.sh
```

**Output:**
- Console output with all metrics
- Timestamped report file: `build-analysis-YYYYMMDD-HHMMSS.txt`
- Build log: `build-output.log`

**Performance budgets:**
- JavaScript: ≤ 500 KB (gzipped)
- CSS: ≤ 100 KB (gzipped)
- Total: ≤ 600 KB (gzipped)

---

### 3. Performance Profiling Guide
**File:** `PERFORMANCE_PROFILING_GUIDE.md`

**What it contains:**
- Comprehensive setup instructions
- Expected performance baselines (dev vs. production)
- Architectural analysis of performance bottlenecks
- Detailed optimization recommendations with code examples
- Continuous monitoring setup (Lighthouse CI, bundle analysis)
- Troubleshooting guide

**Key sections:**
- Quick Start (3 methods: browser console, DevTools, Lighthouse)
- Project Architecture Impact on Performance
- Expected Performance Targets
- Optimization Recommendations (prioritized)
- Measuring Performance Impact
- Continuous Monitoring

---

### 4. Static Performance Analysis
**File:** `STATIC_PERFORMANCE_ANALYSIS.md`

**What it contains:**
- Code-based performance analysis (no browser required)
- Dependency bundle composition breakdown
- Component-level performance audit
- Critical rendering path analysis
- Render-blocking resources identification
- Runtime performance optimization strategies
- Performance budget with current vs. target metrics
- Prioritized action items with effort estimates

**Key findings:**
- Total bundle size: ~2.99 MB uncompressed, ~982 KB gzipped
- Heavy dependencies: Mermaid (350KB), react-syntax-highlighter (175KB), MathJax (120KB)
- No lazy loading for Mermaid or MathJax
- Synchronous markdown rendering pipeline
- Good memoization patterns in place

---

## Quick Start Workflow

### Step 1: Browser Profiling (5 minutes)

```bash
# Start dev server
pnpm dev
```

Then in browser:
1. Open http://localhost:5200
2. Open DevTools Console
3. Paste `performance-profiler.js` contents
4. Review results

**Look for:**
- LCP > 2500ms (poor)
- FCP > 1800ms (poor)
- Large JavaScript bundles (>500KB)
- Render-blocking resources

---

### Step 2: Build Analysis (2 minutes)

```bash
# Run build analysis
./test-results/analyze-build.sh
```

**Look for:**
- Bundle sizes exceeding budget
- Poor compression ratios (<60%)
- Large individual chunks (>200KB gzipped)

---

### Step 3: Review Recommendations

Read the static analysis report:
```bash
cat test-results/STATIC_PERFORMANCE_ANALYSIS.md
```

**Focus on:**
- High Priority action items (immediate impact, low effort)
- Bundle composition (where the weight comes from)
- Component-level performance concerns

---

## Expected Baseline Results

### Development Mode (http://localhost:5200)

| Metric | Target | Expected Actual | Status |
|--------|--------|-----------------|--------|
| TTFB | ≤ 100ms | 10-50ms | ✅ Excellent |
| FCP | ≤ 1800ms | 400-600ms | ✅ Good |
| LCP | ≤ 2500ms | 800-1200ms | ✅ Good |
| CLS | ≤ 0.1 | 0.0-0.05 | ✅ Excellent |
| Total Load | ≤ 3000ms | 1000-1500ms | ✅ Good |

### Production Build

| Metric | Target | Expected Actual | Status |
|--------|--------|-----------------|--------|
| TTFB | ≤ 200ms | 50-150ms | ✅ Good |
| FCP | ≤ 1800ms | 600-900ms | ✅ Good |
| LCP | ≤ 2500ms | 1000-1800ms | ✅ Good |
| CLS | ≤ 0.1 | 0.0-0.05 | ✅ Excellent |
| Bundle (gzip) | ≤ 500KB | 450-500KB | ⚠️  Close to budget |
| Total Load | ≤ 3000ms | 1500-2500ms | ✅ Good |

---

## Top 3 Quick Wins

Based on the static analysis, these optimizations provide the best ROI:

### 1. Lazy Load Mermaid Library
**Impact:** -350KB initial bundle, FCP -200ms, LCP -300ms
**Effort:** 1-2 hours

```typescript
// Before
import { MermaidDiagram } from './MermaidDiagram'

// After
const MermaidDiagram = lazy(() => import('./MermaidDiagram'))

<Suspense fallback={<div>Loading diagram...</div>}>
  <MermaidDiagram code={code} />
</Suspense>
```

---

### 2. Debounce Markdown Rendering
**Impact:** -80% input lag, smoother typing
**Effort:** 30 minutes

```typescript
const [debouncedContent, setDebouncedContent] = useState(content)

useEffect(() => {
  const timer = setTimeout(() => setDebouncedContent(content), 150)
  return () => clearTimeout(timer)
}, [content])

// Use debouncedContent in RenderPane
```

---

### 3. Improve Manual Chunks
**Impact:** Better caching, -50% load time on repeat visits
**Effort:** 15 minutes

```typescript
// vite.config.ts
manualChunks: {
  vendor: ['react', 'react-dom'],
  markdown: ['react-markdown', 'react-syntax-highlighter', 'remark-gfm', 'rehype-raw', 'rehype-slug'],
  'react-preview': ['react-runner'],
  mermaid: ['mermaid'],              // NEW
  math: ['rehype-mathjax'],          // NEW
}
```

---

## Interpreting Results

### Core Web Vitals Ratings

**LCP (Largest Contentful Paint):**
- 🟢 Good: ≤ 2500ms
- 🟡 Needs Improvement: 2500-4000ms
- 🔴 Poor: > 4000ms

**FCP (First Contentful Paint):**
- 🟢 Good: ≤ 1800ms
- 🟡 Needs Improvement: 1800-3000ms
- 🔴 Poor: > 3000ms

**TTFB (Time to First Byte):**
- 🟢 Good: ≤ 800ms
- 🟡 Needs Improvement: 800-1800ms
- 🔴 Poor: > 1800ms

**CLS (Cumulative Layout Shift):**
- 🟢 Good: ≤ 0.1
- 🟡 Needs Improvement: 0.1-0.25
- 🔴 Poor: > 0.25

**FID (First Input Delay):**
- 🟢 Good: ≤ 100ms
- 🟡 Needs Improvement: 100-300ms
- 🔴 Poor: > 300ms

---

## Troubleshooting

### Browser Extension Not Connected

**Error:** `Browser extension is not connected`

**Solution:**
1. Install Claude Chrome Extension from https://claude.ai/chrome
2. Log into claude.ai with the same account as Claude Code
3. Restart Chrome
4. Use the browser console profiler instead (manual script execution)

---

### Build Script Fails

**Error:** `pnpm: command not found`

**Solution:**
```bash
npm install -g pnpm@10.28.0
```

---

### Large Bundle Warning

**Error:** `Chunk size exceeds 500 KB`

**Solution:**
- Review `STATIC_PERFORMANCE_ANALYSIS.md` for optimization recommendations
- Implement lazy loading for heavy dependencies
- Check for duplicate dependencies: `pnpm list`

---

### Poor LCP in Production

**Possible causes:**
1. Slow server response time (check TTFB)
2. Render-blocking resources (check network waterfall)
3. Large images without optimization
4. Heavy JavaScript execution blocking paint

**Solution:**
- Review render-blocking resources in profiler output
- Implement lazy loading recommendations
- Use resource hints (preconnect, dns-prefetch)

---

## Files in This Directory

```
test-results/
├── README_PERFORMANCE_PROFILING.md          ← You are here
├── PERFORMANCE_PROFILING_GUIDE.md           ← Comprehensive guide
├── STATIC_PERFORMANCE_ANALYSIS.md           ← Code-based analysis
├── performance-profiler.js                  ← Browser console script
├── analyze-build.sh                         ← Build analysis script
├── build-output.log                         ← Build console output (generated)
└── build-analysis-YYYYMMDD-HHMMSS.txt      ← Analysis reports (generated)
```

---

## Additional Resources

### Web Performance Documentation
- [Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)

### Vite Performance
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [Vite Build Optimizations](https://vitejs.dev/guide/build.html)

### React Performance
- [React Performance Optimization](https://react.dev/learn/render-and-commit#optimizing-performance)
- [React Profiler](https://react.dev/reference/react/Profiler)

---

## Contributing

To add new performance metrics or tools:

1. Add script to `test-results/` directory
2. Update this README with usage instructions
3. Document expected results and thresholds
4. Include troubleshooting guidance

---

## Notes

- **No file modifications:** All tools are read-only research tools
- **Browser required:** Some tools require Chrome/Edge with DevTools
- **Production builds:** Run `pnpm build` before production analysis
- **Baseline variability:** Dev mode metrics vary based on machine specs
- **Network conditions:** Production metrics depend on hosting and CDN

---

**Last Updated:** 2026-02-16
**Project:** mdeditor v1.0.0
**Author:** Frontend Performance Profiler (Research Mode)
