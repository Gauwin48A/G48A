/**
 * Web Vitals — lightweight performance telemetry
 * Tracks FCP, LCP, CLS, INP, TTFB using PerformanceObserver
 * Fire-and-forget: call initWebVitals() once at app startup
 */

const VITALS = {};

function observe(type, callback) {
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) callback(entries[entries.length - 1]);
    });
    po.observe({ type, buffered: true });
  } catch {
    // PerformanceObserver not supported for this type
  }
}

export function initWebVitals() {
  // First Contentful Paint
  observe('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') {
      VITALS.fcp = Math.round(entry.startTime);
    }
  });

  // Largest Contentful Paint
  observe('largest-contentful-paint', (entry) => {
    VITALS.lcp = Math.round(entry.startTime);
  });

  // Cumulative Layout Shift
  let clsValue = 0;
  observe('layout-shift', (entry) => {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
      VITALS.cls = Math.round(clsValue * 1000) / 1000;
    }
  });

  // Interaction to Next Paint
  observe('event', (entry) => {
    const inp = entry.processingStart ? entry.duration : 0;
    if (!VITALS.inp || inp > VITALS.inp) {
      VITALS.inp = Math.round(inp);
    }
  });

  // Time to First Byte
  observe('navigation', (entry) => {
    VITALS.ttfb = Math.round(entry.responseStart);
  });

  // Report on page hide (most reliable)
  const report = () => {
    if (Object.keys(VITALS).length === 0) return;
    // Use sendBeacon for reliable delivery on page close
    const payload = JSON.stringify({ ...VITALS, url: location.pathname, ts: Date.now() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry/vitals', payload);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') report();
  });
}

/** Get current vitals snapshot (for debug/display) */
export function getVitals() {
  return { ...VITALS };
}
