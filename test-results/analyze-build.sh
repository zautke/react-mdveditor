#!/usr/bin/env bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Production Build Analysis Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# This script builds the production bundle and analyzes:
# - Bundle sizes by chunk
# - Compression ratios
# - Asset breakdown
# - Bundle composition
#
# Usage:
#   chmod +x test-results/analyze-build.sh
#   ./test-results/analyze-build.sh
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

PROJECT_ROOT="/Volumes/FLOUNDER/dev/mdeditor"
DIST_DIR="$PROJECT_ROOT/dist"
RESULTS_DIR="$PROJECT_ROOT/test-results"
REPORT_FILE="$RESULTS_DIR/build-analysis-$(date +%Y%m%d-%H%M%S).txt"

cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Production Build Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Clean previous build
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🧹 Cleaning previous build..."
rm -rf "$DIST_DIR"
echo "✓ Cleaned dist directory"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Run production build
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🏗️  Building production bundle..."
pnpm build --mode production 2>&1 | tee "$RESULTS_DIR/build-output.log"
echo ""

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Build failed! No dist directory found."
  exit 1
fi

echo "✓ Build completed successfully"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Analyze bundle sizes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 BUNDLE SIZE ANALYSIS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Generated: $(date)"
  echo ""
} > "$REPORT_FILE"

echo "📊 Analyzing bundle sizes..."

# JavaScript files
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "JavaScript Bundles (uncompressed)" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
find "$DIST_DIR/assets" -name "*.js" -type f -exec ls -lh {} \; | \
  awk '{print $9, $5}' | \
  sed 's|.*/||' | \
  sort -k2 -h -r >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# CSS files
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "CSS Bundles (uncompressed)" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
find "$DIST_DIR/assets" -name "*.css" -type f -exec ls -lh {} \; | \
  awk '{print $9, $5}' | \
  sed 's|.*/||' | \
  sort -k2 -h -r >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Total sizes
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "Total Sizes by Type" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"

JS_SIZE=$(find "$DIST_DIR/assets" -name "*.js" -type f -exec cat {} \; | wc -c | awk '{print $1}')
CSS_SIZE=$(find "$DIST_DIR/assets" -name "*.css" -type f -exec cat {} \; | wc -c | awk '{print $1}')
TOTAL_SIZE=$((JS_SIZE + CSS_SIZE))

echo "JavaScript: $(numfmt --to=iec-i --suffix=B $JS_SIZE)" >> "$REPORT_FILE"
echo "CSS:        $(numfmt --to=iec-i --suffix=B $CSS_SIZE)" >> "$REPORT_FILE"
echo "Total:      $(numfmt --to=iec-i --suffix=B $TOTAL_SIZE)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Simulate compression (gzip)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🗜️  Analyzing compression ratios..."

echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "Gzip Compression Analysis" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"

TOTAL_UNCOMPRESSED=0
TOTAL_GZIPPED=0

for file in "$DIST_DIR/assets"/*.{js,css}; do
  if [ -f "$file" ]; then
    ORIGINAL_SIZE=$(wc -c < "$file")
    GZIPPED_SIZE=$(gzip -c "$file" | wc -c)
    RATIO=$(awk "BEGIN {printf \"%.1f\", (1 - $GZIPPED_SIZE / $ORIGINAL_SIZE) * 100}")

    FILENAME=$(basename "$file")
    printf "%-50s %10s → %10s (%s%%)\n" \
      "$FILENAME" \
      "$(numfmt --to=iec-i --suffix=B $ORIGINAL_SIZE)" \
      "$(numfmt --to=iec-i --suffix=B $GZIPPED_SIZE)" \
      "$RATIO" >> "$REPORT_FILE"

    TOTAL_UNCOMPRESSED=$((TOTAL_UNCOMPRESSED + ORIGINAL_SIZE))
    TOTAL_GZIPPED=$((TOTAL_GZIPPED + GZIPPED_SIZE))
  fi
done

echo "" >> "$REPORT_FILE"
OVERALL_RATIO=$(awk "BEGIN {printf \"%.1f\", (1 - $TOTAL_GZIPPED / $TOTAL_UNCOMPRESSED) * 100}")
echo "Total uncompressed: $(numfmt --to=iec-i --suffix=B $TOTAL_UNCOMPRESSED)" >> "$REPORT_FILE"
echo "Total gzipped:      $(numfmt --to=iec-i --suffix=B $TOTAL_GZIPPED)" >> "$REPORT_FILE"
echo "Compression ratio:  $OVERALL_RATIO%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. Extract chunk names from build output
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "Chunk Breakdown (from build log)" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"

if [ -f "$RESULTS_DIR/build-output.log" ]; then
  grep -E "(vendor|markdown|react-preview|index)" "$RESULTS_DIR/build-output.log" | \
    grep -v "Creating an optimized" >> "$REPORT_FILE" || true
else
  echo "No build log found" >> "$REPORT_FILE"
fi
echo "" >> "$REPORT_FILE"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. Summary and recommendations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"
echo "Performance Budget Assessment" >> "$REPORT_FILE"
echo "═══════════════════════════════════════════════════════════════════" >> "$REPORT_FILE"

# Performance budgets (in bytes)
BUDGET_JS=512000      # 500 KB
BUDGET_CSS=102400     # 100 KB
BUDGET_TOTAL=614400   # 600 KB

echo "Budget Limits:" >> "$REPORT_FILE"
echo "  JavaScript: ≤ 500 KB (gzipped)" >> "$REPORT_FILE"
echo "  CSS:        ≤ 100 KB (gzipped)" >> "$REPORT_FILE"
echo "  Total:      ≤ 600 KB (gzipped)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

JS_GZIPPED=$(find "$DIST_DIR/assets" -name "*.js" -type f -exec gzip -c {} \; | wc -c)
CSS_GZIPPED=$(find "$DIST_DIR/assets" -name "*.css" -type f -exec gzip -c {} \; | wc -c)
TOTAL_GZIPPED=$((JS_GZIPPED + CSS_GZIPPED))

echo "Actual Sizes (gzipped):" >> "$REPORT_FILE"
echo "  JavaScript: $(numfmt --to=iec-i --suffix=B $JS_GZIPPED)" >> "$REPORT_FILE"
echo "  CSS:        $(numfmt --to=iec-i --suffix=B $CSS_GZIPPED)" >> "$REPORT_FILE"
echo "  Total:      $(numfmt --to=iec-i --suffix=B $TOTAL_GZIPPED)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Budget status
echo "Budget Status:" >> "$REPORT_FILE"

if [ $JS_GZIPPED -le $BUDGET_JS ]; then
  echo "  ✅ JavaScript within budget" >> "$REPORT_FILE"
else
  OVER=$((JS_GZIPPED - BUDGET_JS))
  echo "  ❌ JavaScript OVER budget by $(numfmt --to=iec-i --suffix=B $OVER)" >> "$REPORT_FILE"
fi

if [ $CSS_GZIPPED -le $BUDGET_CSS ]; then
  echo "  ✅ CSS within budget" >> "$REPORT_FILE"
else
  OVER=$((CSS_GZIPPED - BUDGET_CSS))
  echo "  ❌ CSS OVER budget by $(numfmt --to=iec-i --suffix=B $OVER)" >> "$REPORT_FILE"
fi

if [ $TOTAL_GZIPPED -le $BUDGET_TOTAL ]; then
  echo "  ✅ Total bundle within budget" >> "$REPORT_FILE"
else
  OVER=$((TOTAL_GZIPPED - BUDGET_TOTAL))
  echo "  ⚠️  Total bundle OVER budget by $(numfmt --to=iec-i --suffix=B $OVER)" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. Display report
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

cat "$REPORT_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Analysis complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 Full report saved to: $REPORT_FILE"
echo ""
echo "Next steps:"
echo "  1. Review the bundle sizes above"
echo "  2. Run the browser profiler script for runtime metrics"
echo "  3. Check PERFORMANCE_PROFILING_GUIDE.md for optimization tips"
echo ""
