/**
 * Frontend Load-Time Performance Profiler
 *
 * Usage:
 * 1. Open http://localhost:5200 in Chrome/Edge
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Wait 3-5 seconds for measurements to complete
 * 5. Review the formatted performance report in the console
 *
 * This script measures:
 * - Core Web Vitals (LCP, FCP, CLS, INP/FID)
 * - Navigation timing metrics
 * - Resource loading waterfall
 * - Bundle size analysis
 * - Render-blocking resources
 */

(async function performanceProfiler() {
  console.clear();
  console.log('%c🎯 Frontend Load-Time Performance Profiler', 'font-size: 18px; font-weight: bold; color: #4CAF50');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Core Web Vitals Collection
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const webVitals = {
    LCP: null,
    FCP: null,
    CLS: 0,
    FID: null,
    INP: null,
    TTFB: null,
  };

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    webVitals.LCP = lastEntry.startTime;
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  // First Contentful Paint
  const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
  if (fcpEntry) {
    webVitals.FCP = fcpEntry.startTime;
  }

  // Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    webVitals.CLS = clsValue;
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    if (entries.length > 0) {
      webVitals.FID = entries[0].processingStart - entries[0].startTime;
    }
  });
  fidObserver.observe({ type: 'first-input', buffered: true });

  // Interaction to Next Paint (Chrome 96+)
  try {
    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const inpEntry = entries.reduce((max, entry) =>
        entry.duration > (max?.duration || 0) ? entry : max, null
      );
      if (inpEntry) {
        webVitals.INP = inpEntry.duration;
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (e) {
    // INP not supported in this browser
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Navigation Timing
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const navTiming = performance.getEntriesByType('navigation')[0];
  const navigationMetrics = {
    TTFB: navTiming.responseStart - navTiming.requestStart,
    DOMContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.startTime,
    Load: navTiming.loadEventEnd - navTiming.startTime,
    DOMInteractive: navTiming.domInteractive - navTiming.startTime,
    DOMComplete: navTiming.domComplete - navTiming.startTime,
    FirstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
  };
  webVitals.TTFB = navigationMetrics.TTFB;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Resource Loading Analysis
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const resources = performance.getEntriesByType('resource');

  // Group by type
  const byType = {};
  const byExtension = {};
  const renderBlockingResources = [];
  let totalTransferSize = 0;
  let totalDecodedSize = 0;

  resources.forEach(resource => {
    // File extension
    const urlParts = resource.name.split('?')[0].split('.');
    const ext = urlParts.length > 1 ? urlParts.pop().toLowerCase() : 'other';

    // Type tracking
    const type = resource.initiatorType || 'other';
    if (!byType[type]) {
      byType[type] = { count: 0, transferSize: 0, duration: 0 };
    }
    if (!byExtension[ext]) {
      byExtension[ext] = { count: 0, transferSize: 0, duration: 0 };
    }

    byType[type].count++;
    byType[type].transferSize += resource.transferSize || 0;
    byType[type].duration += resource.duration || 0;

    byExtension[ext].count++;
    byExtension[ext].transferSize += resource.transferSize || 0;
    byExtension[ext].duration += resource.duration || 0;

    totalTransferSize += resource.transferSize || 0;
    totalDecodedSize += resource.decodedBodySize || 0;

    // Identify render-blocking resources
    if (
      resource.renderBlockingStatus === 'blocking' ||
      (type === 'link' && ext === 'css') ||
      (type === 'script' && resource.startTime < navigationMetrics.DOMContentLoaded)
    ) {
      renderBlockingResources.push({
        url: resource.name.split('/').pop().substring(0, 50),
        type: ext,
        size: (resource.transferSize / 1024).toFixed(2) + ' KB',
        duration: resource.duration.toFixed(2) + 'ms',
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Bundle Size Analysis (JavaScript modules)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const jsResources = resources.filter(r => {
    const ext = r.name.split('.').pop().split('?')[0].toLowerCase();
    return ext === 'js' || r.initiatorType === 'script';
  });

  const bundleAnalysis = jsResources.map(r => ({
    name: r.name.split('/').pop().substring(0, 60),
    transferSize: (r.transferSize / 1024).toFixed(2) + ' KB',
    decodedSize: (r.decodedBodySize / 1024).toFixed(2) + ' KB',
    compression: r.transferSize > 0
      ? ((1 - r.transferSize / r.decodedBodySize) * 100).toFixed(1) + '%'
      : 'N/A',
    duration: r.duration.toFixed(2) + 'ms',
  }));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Critical Rendering Path
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const criticalPath = {
    htmlParsing: navTiming.domInteractive - navTiming.responseEnd,
    cssProcessing: navigationMetrics.DOMContentLoaded - navTiming.domInteractive,
    jsExecution: navigationMetrics.Load - navigationMetrics.DOMContentLoaded,
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Rating Helper
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function getRating(metric, value) {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      INP: { good: 200, poor: 500 },
    };

    if (!thresholds[metric] || value === null) return '⚪ N/A';

    const { good, poor } = thresholds[metric];
    if (value <= good) return '🟢 Good';
    if (value <= poor) return '🟡 Needs Improvement';
    return '🔴 Poor';
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. Output Formatted Report
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  await new Promise(resolve => setTimeout(resolve, 2000)); // Allow observers to settle

  console.log('\n%c📊 CORE WEB VITALS', 'font-size: 16px; font-weight: bold; color: #2196F3');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
  console.table({
    'LCP (Largest Contentful Paint)': {
      Value: webVitals.LCP ? webVitals.LCP.toFixed(2) + 'ms' : 'N/A',
      Rating: getRating('LCP', webVitals.LCP),
      Target: '≤ 2500ms',
    },
    'FCP (First Contentful Paint)': {
      Value: webVitals.FCP ? webVitals.FCP.toFixed(2) + 'ms' : 'N/A',
      Rating: getRating('FCP', webVitals.FCP),
      Target: '≤ 1800ms',
    },
    'TTFB (Time to First Byte)': {
      Value: webVitals.TTFB ? webVitals.TTFB.toFixed(2) + 'ms' : 'N/A',
      Rating: getRating('TTFB', webVitals.TTFB),
      Target: '≤ 800ms',
    },
    'CLS (Cumulative Layout Shift)': {
      Value: webVitals.CLS.toFixed(3),
      Rating: getRating('CLS', webVitals.CLS),
      Target: '≤ 0.1',
    },
    'FID (First Input Delay)': {
      Value: webVitals.FID ? webVitals.FID.toFixed(2) + 'ms' : 'No interaction yet',
      Rating: getRating('FID', webVitals.FID),
      Target: '≤ 100ms',
    },
    'INP (Interaction to Next Paint)': {
      Value: webVitals.INP ? webVitals.INP.toFixed(2) + 'ms' : 'Not available',
      Rating: getRating('INP', webVitals.INP),
      Target: '≤ 200ms',
    },
  });

  console.log('\n%c⏱️  NAVIGATION TIMING', 'font-size: 16px; font-weight: bold; color: #FF9800');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
  console.table({
    'First Paint': { Value: navigationMetrics.FirstPaint.toFixed(2) + 'ms' },
    'First Contentful Paint': { Value: webVitals.FCP ? webVitals.FCP.toFixed(2) + 'ms' : 'N/A' },
    'DOM Interactive': { Value: navigationMetrics.DOMInteractive.toFixed(2) + 'ms' },
    'DOM Content Loaded': { Value: navigationMetrics.DOMContentLoaded.toFixed(2) + 'ms' },
    'DOM Complete': { Value: navigationMetrics.DOMComplete.toFixed(2) + 'ms' },
    'Full Page Load': { Value: navigationMetrics.Load.toFixed(2) + 'ms' },
  });

  console.log('\n%c🌐 RESOURCE LOADING SUMMARY', 'font-size: 16px; font-weight: bold; color: #9C27B0');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
  console.log(`Total Resources: ${resources.length}`);
  console.log(`Total Transfer Size: ${(totalTransferSize / 1024).toFixed(2)} KB`);
  console.log(`Total Decoded Size: ${(totalDecodedSize / 1024).toFixed(2)} KB`);
  console.log(`Compression Ratio: ${((1 - totalTransferSize / totalDecodedSize) * 100).toFixed(1)}%`);

  console.log('\n%c📦 RESOURCES BY TYPE', 'font-size: 14px; font-weight: bold; color: #9C27B0');
  console.table(
    Object.entries(byType)
      .sort((a, b) => b[1].transferSize - a[1].transferSize)
      .reduce((acc, [key, val]) => {
        acc[key] = {
          Count: val.count,
          'Transfer Size': (val.transferSize / 1024).toFixed(2) + ' KB',
          'Avg Duration': (val.duration / val.count).toFixed(2) + 'ms',
        };
        return acc;
      }, {})
  );

  console.log('\n%c📄 RESOURCES BY EXTENSION', 'font-size: 14px; font-weight: bold; color: #9C27B0');
  console.table(
    Object.entries(byExtension)
      .sort((a, b) => b[1].transferSize - a[1].transferSize)
      .slice(0, 10)
      .reduce((acc, [key, val]) => {
        acc[key] = {
          Count: val.count,
          'Transfer Size': (val.transferSize / 1024).toFixed(2) + ' KB',
          'Avg Duration': (val.duration / val.count).toFixed(2) + 'ms',
        };
        return acc;
      }, {})
  );

  console.log('\n%c🚧 RENDER-BLOCKING RESOURCES', 'font-size: 16px; font-weight: bold; color: #F44336');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
  if (renderBlockingResources.length === 0) {
    console.log('✅ No obvious render-blocking resources detected!');
  } else {
    console.table(renderBlockingResources);
  }

  console.log('\n%c📦 JAVASCRIPT BUNDLE ANALYSIS', 'font-size: 16px; font-weight: bold; color: #4CAF50');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
  if (bundleAnalysis.length === 0) {
    console.log('⚠️  No JavaScript resources detected');
  } else {
    console.table(bundleAnalysis);
  }

  console.log('\n%c🎯 CRITICAL RENDERING PATH', 'font-size: 16px; font-weight: bold; color: #FF5722');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
  console.table({
    'HTML Parsing': { Duration: criticalPath.htmlParsing.toFixed(2) + 'ms' },
    'CSS Processing': { Duration: criticalPath.cssProcessing.toFixed(2) + 'ms' },
    'JS Execution': { Duration: criticalPath.jsExecution.toFixed(2) + 'ms' },
  });

  console.log('\n%c💡 OBSERVATIONS & RECOMMENDATIONS', 'font-size: 16px; font-weight: bold; color: #00BCD4');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');

  const observations = [];

  if (webVitals.LCP && webVitals.LCP > 2500) {
    observations.push('⚠️  LCP is above the 2.5s threshold. Consider optimizing largest content element loading.');
  }
  if (webVitals.FCP && webVitals.FCP > 1800) {
    observations.push('⚠️  FCP is slow. Optimize critical CSS and reduce render-blocking resources.');
  }
  if (webVitals.TTFB && webVitals.TTFB > 800) {
    observations.push('⚠️  TTFB is high. Check server response time or CDN configuration.');
  }
  if (webVitals.CLS > 0.1) {
    observations.push('⚠️  CLS is above 0.1. Ensure images/iframes have explicit dimensions.');
  }
  if (totalTransferSize / 1024 > 1000) {
    observations.push(`⚠️  Total page weight is ${(totalTransferSize / 1024).toFixed(0)} KB. Consider code splitting and lazy loading.`);
  }
  if (renderBlockingResources.length > 3) {
    observations.push(`⚠️  ${renderBlockingResources.length} render-blocking resources detected. Defer non-critical scripts.`);
  }
  if (jsResources.some(r => r.transferSize > 500 * 1024)) {
    observations.push('⚠️  Large JavaScript bundles detected (>500KB). Review code splitting strategy.');
  }

  if (observations.length === 0) {
    console.log('✅ No major performance issues detected! Great job!');
  } else {
    observations.forEach(obs => console.log(obs));
  }

  console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
  console.log('%c✅ Performance profiling complete!', 'font-size: 14px; font-weight: bold; color: #4CAF50');
  console.log('%cTimestamp: ' + new Date().toISOString(), 'color: #999');

  // Disconnect observers
  lcpObserver.disconnect();
  clsObserver.disconnect();
  fidObserver.disconnect();

  // Return data for programmatic access
  return {
    webVitals,
    navigationMetrics,
    resourceSummary: {
      totalResources: resources.length,
      totalTransferSize,
      totalDecodedSize,
      byType,
      byExtension,
    },
    renderBlockingResources,
    bundleAnalysis,
    criticalPath,
    observations,
  };
})();
