import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isDeadChunkLoadFailure,
  registerDeadChunkReload,
  resetDeadChunkReloadForTests,
} from './deadChunkReload';

describe('isDeadChunkLoadFailure', () => {
  it.each([
    new Error('Failed to fetch dynamically imported module: /MBD/assets/SettingsPage.abc123.js'),
    new Error('error loading dynamically imported module'),
    new Error('Importing a module script failed.'),
    Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' }),
    'Unable to preload CSS for /MBD/assets/index.abc123.css',
  ])('matches known lazy chunk failure shapes', (error) => {
    expect(isDeadChunkLoadFailure(error)).toBe(true);
  });

  it('ignores non-chunk failures', () => {
    expect(isDeadChunkLoadFailure(new Error('regular route render failure'))).toBe(false);
    expect(isDeadChunkLoadFailure('network request failed for standings.json')).toBe(false);
  });
});

describe('registerDeadChunkReload', () => {
  const update = vi.fn().mockResolvedValue(undefined);
  const reload = vi.fn();

  beforeEach(() => {
    update.mockClear();
    reload.mockClear();
    resetDeadChunkReloadForTests();
  });

  afterEach(() => {
    resetDeadChunkReloadForTests();
  });

  it('updates the active service worker and reloads once after a dead chunk error', async () => {
    registerDeadChunkReload({
      hasServiceWorkerController: () => true,
      getRegistration: async () => ({ update }),
      reload,
    });

    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('Failed to fetch dynamically imported module: /MBD/assets/Dashboard.deadbeef.js'),
    }));
    await Promise.resolve();
    await Promise.resolve();

    expect(update).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads only once when multiple chunk failures arrive', async () => {
    registerDeadChunkReload({
      hasServiceWorkerController: () => true,
      getRegistration: async () => ({ update }),
      reload,
    });

    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('Failed to fetch dynamically imported module: /MBD/assets/A.deadbeef.js'),
    }));
    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('Loading chunk B failed.'),
    }));
    await Promise.resolve();
    await Promise.resolve();

    expect(update).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('handles unhandled dynamic import rejections', async () => {
    registerDeadChunkReload({
      hasServiceWorkerController: () => true,
      getRegistration: async () => ({ update }),
      reload,
    });

    const event = new Event('unhandledrejection', { cancelable: true }) as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', {
      value: new Error('error loading dynamically imported module'),
    });
    window.dispatchEvent(event);
    await Promise.resolve();
    await Promise.resolve();

    expect(event.defaultPrevented).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no service worker controller', async () => {
    registerDeadChunkReload({
      hasServiceWorkerController: () => false,
      getRegistration: async () => ({ update }),
      reload,
    });

    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('Failed to fetch dynamically imported module: /MBD/assets/Dashboard.deadbeef.js'),
    }));
    await Promise.resolve();

    expect(update).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores non-chunk global errors', async () => {
    registerDeadChunkReload({
      hasServiceWorkerController: () => true,
      getRegistration: async () => ({ update }),
      reload,
    });

    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('regular route render failure'),
    }));
    await Promise.resolve();

    expect(update).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('handles Vite preload errors without letting the browser show a blank page', async () => {
    registerDeadChunkReload({
      hasServiceWorkerController: () => true,
      getRegistration: async () => ({ update }),
      reload,
    });

    const event = new CustomEvent('vite:preloadError', {
      cancelable: true,
      detail: {
        error: new Error('Failed to fetch dynamically imported module: /MBD/assets/Settings.deadbeef.js'),
      },
    });
    window.dispatchEvent(event);
    await Promise.resolve();
    await Promise.resolve();

    expect(event.defaultPrevented).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
