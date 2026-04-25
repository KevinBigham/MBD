import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  SaveLoadErrorBoundary,
  SaveRecoveryProvider,
  createSaveLoadRecoveryError,
} from '../index';
import type { LoadSaveSafelyResult } from '@/shared/lib/saveSystem';
import { logger } from '@/shared/lib/logger';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

function ThrowSaveLoadError(): never {
  throw createSaveLoadRecoveryError(failure);
}

function ThrowUnrelatedError(): never {
  throw new Error('Unrelated render failure');
}

describe('SaveLoadErrorBoundary', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('routes marked save-load render errors into the recovery dialog', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <SaveLoadErrorBoundary>
            <ThrowSaveLoadError />
          </SaveLoadErrorBoundary>
        </SaveRecoveryProvider>,
      );
    });

    expect(container.textContent).toContain('Save Recovery');
    expect(container.textContent).toContain('Slot 1 needs recovery');
    expect(container.textContent).toContain('Export raw JSON');
  });

  it('does not swallow unrelated render errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    await expect(act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <SaveLoadErrorBoundary>
            <ThrowUnrelatedError />
          </SaveLoadErrorBoundary>
        </SaveRecoveryProvider>,
      );
    })).rejects.toThrow('Unrelated render failure');
  });
});
