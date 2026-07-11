import { act, useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { SaveRecoveryProvider, useSaveRecovery } from '../SaveRecoveryProvider';
import type { LoadSaveSafelyResult } from '@/shared/lib/saveSystem';

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

function TriggerRecovery({
  onDelete,
}: {
  onDelete?: () => Promise<boolean | void> | boolean | void;
}) {
  const recovery = useSaveRecovery();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) {
      return;
    }
    firedRef.current = true;
    recovery.showFailure({ failure, onDelete });
  }, [onDelete, recovery]);

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
      buttonByText(container, 'Delete this slot').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(buttonByText(container, 'Delete this slot')).toBeTruthy();
  });
});
