function createMediaQueryList(query: string): MediaQueryList {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      }
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      }
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      for (const listener of listeners) {
        listener(event as MediaQueryListEvent);
      }
      return true;
    },
  };
}

function hasUsableMatchMedia(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  try {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return Boolean(
      mediaQuery
        && typeof mediaQuery.matches === 'boolean'
        && typeof mediaQuery.addEventListener === 'function'
        && typeof mediaQuery.removeEventListener === 'function',
    );
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined' && !hasUsableMatchMedia()) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => createMediaQueryList(query),
  });
}
