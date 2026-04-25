import { act } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import { createSaveLoadRecoveryError } from '@/features/save-recovery';
import { logger } from '@/shared/lib/logger';
import type { LoadSaveSafelyResult } from '@/shared/lib/saveSystem';

const routeMockState = vi.hoisted(() => ({
  error: null as unknown,
}));

vi.mock('./routes', () => ({
  AppRoutes: () => {
    if (routeMockState.error) {
      throw routeMockState.error;
    }
    return <div>Routes</div>;
  },
}));

vi.mock('./providers/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createStorageMock(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

describe('App', () => {
  let container: HTMLDivElement;
  let root: Root | null;

  beforeEach(() => {
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    usePreferencesStore.getState().reset();
    routeMockState.error = null;
    document.documentElement.dataset.contrast = 'standard';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    container.remove();
    delete document.documentElement.dataset.contrast;
    vi.clearAllMocks();
  });

  it('applies the high contrast preference to the root document', async () => {
    usePreferencesStore.getState().setHighContrast(true);

    await act(async () => {
      root!.render(<App />);
      await Promise.resolve();
    });

    expect(document.documentElement.dataset.contrast).toBe('high');
  });

  it('routes save-load render failures into recovery instead of the generic app shell', async () => {
    const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
      ok: false,
      reason: 'parse',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Unexpected end of JSON input',
        rawJson: '{"id":"save-slot-1"}',
      },
    };
    routeMockState.error = createSaveLoadRecoveryError(failure);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await act(async () => {
      root!.render(<App />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Save Recovery');
    expect(container.textContent).toContain('Slot 1 needs recovery');
    expect(container.textContent).toContain('Export raw JSON');
  });

  it('does not swallow unrelated render failures at the root', async () => {
    routeMockState.error = new Error('Unrelated root failure');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(act(async () => {
      root!.render(<App />);
      await Promise.resolve();
    })).rejects.toThrow('Unrelated root failure');
  });
});
