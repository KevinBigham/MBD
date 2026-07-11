import { act, useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { SaveRecoveryProvider, useSaveRecovery } from '../SaveRecoveryProvider';
import type { LoadSaveSafelyResult } from '@/shared/lib/saveSystem';
import { logger } from '@/shared/lib/logger';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
  ok: false,
  reason: 'parse',
  detail: {
    slotId: 'save-slot-4',
    slotNumber: 4,
    message: 'Unexpected end of JSON input',
    rawJson: '{"id":"save-slot-4","broken":true}',
  },
};

const integrityFailure = {
  ok: false,
  reason: 'integrity_failed',
  detail: {
    slotId: 'save-slot-4',
    slotNumber: 4,
    message: 'The primary integrity checksum did not match.',
    rawJson: '{"id":"save-slot-4","changed":true}',
    repairAvailable: true,
    repairUpdatedAt: '2026-07-11T14:30:00.000Z',
  },
} satisfies Extract<LoadSaveSafelyResult, { ok: false }>;

type RecoveryAction = () => Promise<boolean | void> | boolean | void;

function TriggerRecovery({
  failure: recoveryFailure = failure,
  onDelete,
  onRepair,
  onRetry,
}: {
  failure?: Extract<LoadSaveSafelyResult, { ok: false }>;
  onDelete?: RecoveryAction;
  onRepair?: RecoveryAction;
  onRetry?: RecoveryAction;
}) {
  const recovery = useSaveRecovery();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) {
      return;
    }
    firedRef.current = true;
    recovery.showFailure({
      failure: recoveryFailure,
      onDelete,
      onRepair,
      onRetry,
    });
  }, [onDelete, onRepair, onRetry, recovery, recoveryFailure]);

  return null;
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  return button;
}

describe('SaveRecoveryProvider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let anchorClick: ReturnType<typeof vi.fn>;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    anchorClick = vi.fn();
    createObjectURL = vi.fn(() => 'blob:save-recovery');
    revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(anchorClick);
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('exports raw JSON through the rendered dialog action', async () => {
    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Export raw JSON').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:save-recovery');
  });

  it('keeps recovery open when a guarded delete reports that nothing was deleted', async () => {
    const onDelete = vi.fn().mockResolvedValue(false);
    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery onDelete={onDelete} />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Delete this save').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(buttonByText(container, 'Delete this save')).toBeTruthy();
  });

  it('keeps recovery open with an accessible error when safe deletion rejects', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Parent recovery required'));
    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery onDelete={onDelete} />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Delete this save').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'could not safely finish deleting',
    );
    expect(buttonByText(container, 'Delete this save')).toBeTruthy();
  });

  it('renders repair only when the integrity request has both restore and retry callbacks', async () => {
    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery
            failure={integrityFailure}
            onRepair={vi.fn()}
          />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Restore verified copy');

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);

    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery
            failure={integrityFailure}
            onRepair={vi.fn()}
            onRetry={vi.fn()}
          />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    expect(buttonByText(container, 'Restore verified copy')).toBeTruthy();
  });

  it('restores first, retries the ordinary load, and closes only after both succeed', async () => {
    const calls: string[] = [];
    let finishRepair!: (result: boolean) => void;
    const onRepair = vi.fn(() => new Promise<boolean>((resolve) => {
      calls.push('repair');
      finishRepair = resolve;
    }));
    const onRetry = vi.fn(async () => {
      calls.push('retry');
      return true;
    });

    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery
            failure={integrityFailure}
            onRepair={onRepair}
            onRetry={onRetry}
          />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Restore verified copy').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Restoring verified copy...');
    expect(Array.from(container.querySelectorAll('button')).every((button) => button.disabled)).toBe(true);
    expect(calls).toEqual(['repair']);

    await act(async () => {
      finishRepair(true);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(calls).toEqual(['repair', 'retry']);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps the dialog open with nothing-replaced evidence when restore returns false', async () => {
    const onRepair = vi.fn().mockResolvedValue(false);
    const onRetry = vi.fn();

    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery
            failure={integrityFailure}
            onRepair={onRepair}
            onRetry={onRetry}
          />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Restore verified copy').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(onRetry).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Nothing was replaced');
    expect(container.textContent).not.toContain('Restore verified copy');
    expect(container.textContent).toContain('No repair source is currently being offered');
  });

  it('keeps the dialog open with nothing-replaced evidence when restore throws', async () => {
    const onRepair = vi.fn().mockRejectedValue(new Error('repair transaction failed'));
    const onRetry = vi.fn();

    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery
            failure={integrityFailure}
            onRepair={onRepair}
            onRetry={onRetry}
          />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Restore verified copy').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onRetry).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Nothing was replaced');
    expect(container.textContent).not.toContain('Restore verified copy');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to restore verified save copy:',
      expect.any(Error),
    );
  });

  it('distinguishes a restored copy whose ordinary reload returns false', async () => {
    const onRepair = vi.fn().mockResolvedValue(true);
    const onRetry = vi.fn().mockResolvedValue(false);

    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery
            failure={integrityFailure}
            onRepair={onRepair}
            onRetry={onRetry}
          />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Restore verified copy').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const message = container.querySelector('[role="alert"]')?.textContent ?? '';
    expect(message).toContain('was restored, but MBD could not load it');
    expect(message).not.toContain('Nothing was replaced');
    expect(buttonByText(container, 'Retry')).toBeTruthy();
    expect(container.textContent).not.toContain('Restore verified copy');
  });

  it('distinguishes a restored copy whose ordinary reload throws', async () => {
    const onRepair = vi.fn().mockResolvedValue(true);
    const onRetry = vi.fn().mockRejectedValue(new Error('worker import failed'));

    await act(async () => {
      root.render(
        <SaveRecoveryProvider>
          <TriggerRecovery
            failure={integrityFailure}
            onRepair={onRepair}
            onRetry={onRetry}
          />
        </SaveRecoveryProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      buttonByText(container, 'Restore verified copy').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const message = container.querySelector('[role="alert"]')?.textContent ?? '';
    expect(message).toContain('was restored, but MBD could not load it');
    expect(message).not.toContain('Nothing was replaced');
    expect(container.textContent).not.toContain('Restore verified copy');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to load restored save copy:',
      expect.any(Error),
    );
  });
});
