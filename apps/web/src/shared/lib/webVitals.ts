/**
 * @module webVitals
 * Client-side performance measurement using raw Performance API.
 * No external dependencies — gracefully degrades when observers are unsupported.
 */

export interface WebVitalsSnapshot {
  /** Largest Contentful Paint (ms). null if not yet observed. */
  lcp: number | null;
  /** Cumulative Layout Shift (unitless). null if not yet observed. */
  cls: number | null;
  /** Interaction to Next Paint p98 (ms). null if unsupported (Safari). */
  inp: number | null;
  /** Page load time from navigation start to load event (ms). */
  pageLoad: number | null;
}

const state: WebVitalsSnapshot = {
  lcp: null,
  cls: null,
  inp: null,
  pageLoad: null,
};

const inpDurations: number[] = [];

/**
 * Initialize performance observers. Call once from main.tsx.
 * Safe to call in environments where PerformanceObserver is undefined.
 */
export function initWebVitals(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const last = entries[entries.length - 1]!;
        state.lcp = Math.round(last.startTime);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // LCP not supported
  }

  // CLS
  try {
    let clsTotal = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count shifts without recent user input
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          clsTotal += (entry as PerformanceEntry & { value?: number }).value ?? 0;
        }
      }
      state.cls = Math.round(clsTotal * 1000) / 1000;
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // CLS not supported
  }

  // INP (not supported in Safari)
  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        inpDurations.push(entry.duration);
      }
      // P98 approximation
      if (inpDurations.length > 0) {
        const sorted = [...inpDurations].sort((a, b) => a - b);
        const p98Index = Math.floor(sorted.length * 0.98);
        state.inp = Math.round(sorted[Math.min(p98Index, sorted.length - 1)]!);
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  } catch {
    // INP/event type not supported (Safari, older Firefox)
  }

  // Page load time
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0]!;
      state.pageLoad = Math.round(nav.loadEventEnd > 0 ? nav.loadEventEnd : nav.domContentLoadedEventEnd);
    } else if (performance.timing) {
      // Level 1 fallback
      const t = performance.timing;
      state.pageLoad = t.loadEventEnd > 0 ? t.loadEventEnd - t.navigationStart : null;
    }
  } catch {
    // Navigation timing not available
  }

  // Re-measure page load after load event fires (if it hasn't yet)
  if (state.pageLoad === null || state.pageLoad === 0) {
    window.addEventListener('load', () => {
      try {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          const nav = navEntries[0]!;
          state.pageLoad = Math.round(nav.loadEventEnd > 0 ? nav.loadEventEnd : nav.domContentLoadedEventEnd);
        }
      } catch {
        // ignore
      }
    }, { once: true });
  }
}

/** Get a snapshot of current web vitals measurements. */
export function getWebVitalsSnapshot(): WebVitalsSnapshot {
  return { ...state };
}

/** Threshold targets for display color coding. */
export const WEB_VITALS_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
  pageLoad: { good: 3000, poor: 5000 },
} as const;
