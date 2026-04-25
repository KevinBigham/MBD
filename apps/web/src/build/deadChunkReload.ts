interface UpdateableServiceWorkerRegistration {
  update: () => Promise<unknown>;
}

interface DeadChunkReloadOptions {
  hasServiceWorkerController?: () => boolean;
  getRegistration?: () => Promise<UpdateableServiceWorkerRegistration | null | undefined>;
  reload?: () => void;
}

const DEAD_CHUNK_FAILURE_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk .+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload (?:CSS|JS|module)/i,
];

let listeners:
  | {
    error: EventListener;
    rejection: EventListener;
    preload: EventListener;
  }
  | null = null;
let reloadStarted = false;

function describeFailure(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name} ${value.message}`;
  }

  if (
    value
    && typeof value === 'object'
    && 'message' in value
    && typeof value.message === 'string'
  ) {
    const name = 'name' in value && typeof value.name === 'string'
      ? value.name
      : '';
    return `${name} ${value.message}`;
  }

  return '';
}

export function isDeadChunkLoadFailure(value: unknown): boolean {
  const description = describeFailure(value);
  return DEAD_CHUNK_FAILURE_PATTERNS.some((pattern) => pattern.test(description));
}

function getEventFailure(event: Event): unknown {
  if (typeof ErrorEvent !== 'undefined' && event instanceof ErrorEvent) {
    return event.error ?? event.message;
  }

  if (typeof PromiseRejectionEvent !== 'undefined' && event instanceof PromiseRejectionEvent) {
    return event.reason;
  }

  if ('reason' in event) {
    return event.reason;
  }

  if (event instanceof CustomEvent) {
    const detail = event.detail;
    if (
      detail
      && typeof detail === 'object'
      && 'error' in detail
    ) {
      return detail.error;
    }
    return detail;
  }

  return null;
}

function hasDefaultServiceWorkerController(): boolean {
  return (
    typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && Boolean(navigator.serviceWorker.controller)
  );
}

async function getDefaultRegistration(): Promise<UpdateableServiceWorkerRegistration | null | undefined> {
  if (
    typeof navigator === 'undefined'
    || !('serviceWorker' in navigator)
    || typeof navigator.serviceWorker.getRegistration !== 'function'
  ) {
    return null;
  }

  return navigator.serviceWorker.getRegistration();
}

async function reloadAfterServiceWorkerUpdate(options: Required<DeadChunkReloadOptions>) {
  if (reloadStarted || !options.hasServiceWorkerController()) {
    return;
  }

  reloadStarted = true;

  try {
    const registration = await options.getRegistration();
    await registration?.update();
  } catch {
    // Network may be offline; reload still gives the active SW a chance to serve
    // its current app shell instead of leaving the tab on a blank lazy import.
  }

  options.reload();
}

export function registerDeadChunkReload(options: DeadChunkReloadOptions = {}) {
  if (typeof window === 'undefined' || listeners) {
    return;
  }

  const resolvedOptions: Required<DeadChunkReloadOptions> = {
    hasServiceWorkerController: options.hasServiceWorkerController ?? hasDefaultServiceWorkerController,
    getRegistration: options.getRegistration ?? getDefaultRegistration,
    reload: options.reload ?? (() => window.location.reload()),
  };

  const handleFailureEvent: EventListener = (event) => {
    if (!isDeadChunkLoadFailure(getEventFailure(event))) {
      return;
    }

    event.preventDefault();
    void reloadAfterServiceWorkerUpdate(resolvedOptions);
  };

  const handlePreloadEvent: EventListener = (event) => {
    if (!isDeadChunkLoadFailure(getEventFailure(event))) {
      return;
    }

    event.preventDefault();
    void reloadAfterServiceWorkerUpdate(resolvedOptions);
  };

  listeners = {
    error: handleFailureEvent,
    rejection: handleFailureEvent,
    preload: handlePreloadEvent,
  };

  window.addEventListener('error', listeners.error);
  window.addEventListener('unhandledrejection', listeners.rejection);
  window.addEventListener('vite:preloadError', listeners.preload);
}

export function resetDeadChunkReloadForTests() {
  reloadStarted = false;

  if (typeof window === 'undefined' || !listeners) {
    listeners = null;
    return;
  }

  window.removeEventListener('error', listeners.error);
  window.removeEventListener('unhandledrejection', listeners.rejection);
  window.removeEventListener('vite:preloadError', listeners.preload);
  listeners = null;
}
