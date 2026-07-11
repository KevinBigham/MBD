import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { SaveRecoveryDialog } from '../SaveRecoveryDialog';
import { createSaveRecoveryRequest, type SaveRecoveryRequest } from '../reducer';
import type { LoadSaveSafelyResult, SaveLoadFailureReason } from '@/shared/lib/saveSystem';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const reasons: SaveLoadFailureReason[] = [
  'parse',
  'zod',
  'version_too_new',
  'version_too_old',
  'migration_failed',
  'storage_failed',
];

function requestFor(
  reason: SaveLoadFailureReason,
  repairAvailable = false,
): SaveRecoveryRequest {
  const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
    ok: false,
    reason,
    detail: {
      slotId: 'save-slot-3',
      slotNumber: 3,
      message: `Detailed ${reason} message`,
      rawJson: '{"id":"save-slot-3","name":"Broken"}',
      schemaVersion: reason === 'version_too_new' ? 999 : 34,
      currentVersion: 33,
      minimumSupportedVersion: 2,
      repairAvailable,
      repairUpdatedAt: '2026-07-11T14:30:00.000Z',
    },
  };
  return createSaveRecoveryRequest(failure);
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

describe('SaveRecoveryDialog', () => {
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

  it.each(reasons)('renders every action for %s failures', async (reason) => {
    const request = requestFor(reason);

    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={request}
          stateStatus="showing_dialog"
          detailsVisible={false}
          onClose={vi.fn()}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-describedby')).toBe(
      'save-recovery-summary save-recovery-body',
    );
    expect(container.textContent).toContain('Save Recovery');
    expect(container.textContent).toContain('Slot 3 needs recovery');
    expect(container.textContent).toContain(request.title);
    expect(container.textContent).toContain('Export raw JSON');
    expect(container.textContent).toContain('Delete this save');
    expect(container.textContent).toContain('View error details');
    expect(container.textContent).toContain('Retry');
  });

  it('calls the export path and toggles error details', async () => {
    const onExportRaw = vi.fn();
    const onToggleDetails = vi.fn();
    const request = requestFor('zod');

    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={request}
          stateStatus="showing_dialog"
          detailsVisible={false}
          onClose={vi.fn()}
          onDelete={vi.fn()}
          onExportRaw={onExportRaw}
          onRetry={vi.fn()}
          onToggleDetails={onToggleDetails}
        />,
      );
    });

    await act(async () => {
      buttonByText(container, 'Export raw JSON').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttonByText(container, 'View error details').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onExportRaw).toHaveBeenCalledTimes(1);
    expect(onToggleDetails).toHaveBeenCalledTimes(1);
    expect(buttonByText(container, 'View error details').getAttribute('aria-expanded')).toBe('false');
    expect(buttonByText(container, 'View error details').getAttribute('aria-controls')).toBe(
      'save-recovery-error-details',
    );
  });

  it('offers an honest verified-copy action only for a repairable request with a callback', async () => {
    const onRepair = vi.fn();
    const request = requestFor('integrity_failed', true);

    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={request}
          stateStatus="showing_dialog"
          detailsVisible={false}
          onClose={vi.fn()}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRepair={onRepair}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('changed after MBD sealed it');
    expect(container.textContent).toContain('same save generation');
    expect(container.textContent).toContain('not a security guarantee or an older-save rollback');

    await act(async () => {
      buttonByText(container, 'Restore verified copy').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    expect(onRepair).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={request}
          stateStatus="showing_dialog"
          detailsVisible={false}
          onClose={vi.fn()}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });
    expect(container.textContent).not.toContain('Restore verified copy');

    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={requestFor('parse', true)}
          stateStatus="showing_dialog"
          detailsVisible={false}
          onClose={vi.fn()}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRepair={vi.fn()}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });
    expect(container.textContent).not.toContain('Restore verified copy');
  });

  it('disables every control while restoring and announces the repairing state', async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={requestFor('integrity_failed', true)}
          stateStatus="repairing"
          detailsVisible
          onClose={onClose}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRepair={vi.fn()}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Restoring verified copy...');
    const busyStatus = container.querySelector('[role="status"]');
    expect(busyStatus?.getAttribute('aria-live')).toBe('polite');
    const controls = Array.from(container.querySelectorAll('button'));
    expect(controls).toHaveLength(6);
    expect(controls.every((button) => button.disabled)).toBe(true);
    const panel = container.querySelector('[role="dialog"] > div') as HTMLElement | null;
    expect(document.activeElement).toBe(panel);

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(panel);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders action errors assertively and bounds the dialog for mobile scrolling', async () => {
    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={requestFor('integrity_failed', true)}
          stateStatus="showing_dialog"
          detailsVisible
          actionError="The verified copy was restored, but it could not be loaded."
          onClose={vi.fn()}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRepair={vi.fn()}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('was restored');

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.className).toContain('overflow-y-auto');
    expect(dialog?.firstElementChild?.className).toContain('max-h-[calc(100dvh-2rem)]');
    expect(dialog?.firstElementChild?.className).toContain('overflow-y-auto');
    expect(dialog?.firstElementChild?.className).toContain('overscroll-contain');
  });

  it('closes on Escape only when not busy', async () => {
    const onClose = vi.fn();
    const request = requestFor('parse');

    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={request}
          stateStatus="showing_dialog"
          detailsVisible={false}
          onClose={onClose}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <SaveRecoveryDialog
          request={request}
          stateStatus="deleting"
          detailsVisible={false}
          onClose={onClose}
          onDelete={vi.fn()}
          onExportRaw={vi.fn()}
          onRetry={vi.fn()}
          onToggleDetails={vi.fn()}
        />,
      );
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
