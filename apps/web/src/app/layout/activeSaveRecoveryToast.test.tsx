import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { toast, type Action, type ExternalToast } from 'sonner';
import {
  createActiveSavePersistenceBackup,
  type ActiveSavePersistenceStatus,
} from '@/shared/lib/activeSavePersistence';
import { requestBrowserDownload } from '@/shared/lib/browserDownload';
import {
  activeSaveRecoveryToastId,
  useActiveSaveRecoveryToast,
} from './activeSaveRecoveryToast';

vi.mock('sonner', () => ({
  toast: {
    dismiss: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  createActiveSavePersistenceBackup: vi.fn(),
}));

vi.mock('@/shared/lib/browserDownload', () => ({
  requestBrowserDownload: vi.fn(),
}));

const mockedCreateBackup = vi.mocked(createActiveSavePersistenceBackup);
const mockedRequestDownload = vi.mocked(requestBrowserDownload);

function actionEvent() {
  let defaultPrevented = false;
  return {
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault: vi.fn(() => {
      defaultPrevented = true;
    }),
  };
}

type VisibleToast = {
  title: string;
  options: ExternalToast;
};

const visibleToasts = new Map<string | number, VisibleToast>();

function recordVisibleToast(title: unknown, options: ExternalToast | undefined): void {
  if (options?.id === undefined) return;
  visibleToasts.set(options.id, { title: String(title), options });
}

/**
 * Sonner normally dismisses an action toast after `onClick`.  This miniature
 * lifecycle model applies that default *after* the callback, which is exactly
 * the order that used to delete the same-id confirmation toast.  A callback
 * must prevent default for the replacement to remain visible.
 */
function invokeSonnerAction(options: ExternalToast, event: ReturnType<typeof actionEvent>): void {
  (options.action as Action | undefined)?.onClick(event as never);
  if (!event.defaultPrevented && options.id !== undefined) visibleToasts.delete(options.id);
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function status(
  recovery: ActiveSavePersistenceStatus['recovery'],
): ActiveSavePersistenceStatus {
  return {
    state: recovery?.phase === 'recovered' ? 'saved' : 'failed',
    saveId: 'save-slot-2',
    saveName: 'Recovery Dynasty',
    desiredGeneration: 2,
    durableGeneration: recovery?.phase === 'recovered' ? 2 : 1,
    pendingWrites: recovery?.phase === 'recovered' ? 0 : 1,
    canRetry: recovery?.phase !== 'retrying' && recovery?.phase !== 'recovered',
    lastSavedAt: '2026-04-02T19:42:03.000Z',
    errorMessage: recovery?.errorMessage ?? null,
    failureKind: recovery?.failureKind ?? null,
    recovery,
  };
}

function Harness({
  saveId,
  value,
}: {
  saveId: string | null;
  value: ActiveSavePersistenceStatus;
}) {
  useActiveSaveRecoveryToast(saveId, value);
  return null;
}

describe('useActiveSaveRecoveryToast', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockedCreateBackup.mockReturnValue({
      saveId: 'save-slot-2',
      generation: 2,
      filename: 'mbd-save-slot-2-pending-2.json',
      payload: '{"kind":"mbd-save-export"}',
    });
    visibleToasts.clear();
    for (const method of [toast.error, toast.info, toast.loading, toast.success]) {
      vi.mocked(method).mockImplementation((title, options) => {
        recordVisibleToast(title, options);
        return options?.id ?? 'mock-toast-id';
      });
    }
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('updates one stable toast through scheduled and in-progress retry states', async () => {
    const scheduled = status({
      phase: 'retry_scheduled',
      automaticAttempts: 0,
      automaticAttemptLimit: 2,
      failureKind: 'quota',
      errorMessage: 'QuotaExceededError',
    });
    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={scheduled} />);
    });

    expect(toast.error).toHaveBeenCalledWith('Local storage is full.', expect.objectContaining({
      id: activeSaveRecoveryToastId('save-slot-2'),
      duration: Infinity,
      position: 'top-center',
      testId: 'active-save-recovery-toast',
      description: 'Automatic persistence retry 1 of 2 is scheduled.',
    }));

    const retrying = status({
      ...scheduled.recovery!,
      phase: 'retrying',
      automaticAttempts: 1,
    });
    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={retrying} />);
    });
    expect(toast.loading).toHaveBeenCalledWith(
      'Retrying local save automatically.',
      expect.objectContaining({
        id: activeSaveRecoveryToastId('save-slot-2'),
        action: undefined,
        description: 'Persistence attempt 1 of 2 is in progress.',
      }),
    );
  });

  it.each([
    ['unavailable', 'Browser storage is unavailable.'],
    ['indexeddb', 'The browser database could not finish this save.'],
    ['storage', 'Local saving failed.'],
  ] as const)('names %s failures in the scheduled recovery toast', async (failureKind, title) => {
    const scheduled = status({
      phase: 'retry_scheduled',
      automaticAttempts: 0,
      automaticAttemptLimit: 2,
      failureKind,
      errorMessage: `${failureKind} failure`,
    });

    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={scheduled} />);
    });

    expect(toast.error).toHaveBeenCalledWith(title, expect.objectContaining({
      id: activeSaveRecoveryToastId('save-slot-2'),
      action: undefined,
      description: 'Automatic persistence retry 1 of 2 is scheduled.',
    }));
  });

  it('keeps the same Sonner confirmation visible for initial and repeated canonical backup actions', async () => {
    const fallback = status({
      phase: 'fallback_ready',
      automaticAttempts: 2,
      automaticAttemptLimit: 2,
      failureKind: 'unavailable',
      errorMessage: 'SecurityError',
    });
    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={fallback} />);
    });

    const options = vi.mocked(toast.error).mock.calls.at(-1)?.[1];
    expect(toast.error).toHaveBeenLastCalledWith('Local save still failed.', expect.objectContaining({
      id: activeSaveRecoveryToastId('save-slot-2'),
      description: 'Download a backup, then use Retry when browser storage is available.',
    }));
    expect(options?.action).toMatchObject({ label: 'Download backup' });

    const click = actionEvent();
    await act(async () => {
      invokeSonnerAction(options!, click);
    });

    expect(mockedCreateBackup).toHaveBeenCalledWith('save-slot-2');
    expect(mockedRequestDownload).toHaveBeenCalledWith({
      filename: 'mbd-save-slot-2-pending-2.json',
      payload: '{"kind":"mbd-save-export"}',
    });
    expect(click.preventDefault).toHaveBeenCalledTimes(1);
    expect(click.defaultPrevented).toBe(true);
    expect(toast.info).toHaveBeenCalledWith('Backup download requested.', expect.objectContaining({
      id: activeSaveRecoveryToastId('save-slot-2'),
      description: expect.stringContaining('Local saving is still pending'),
      action: expect.objectContaining({ label: 'Download again' }),
    }));
    const confirmationAfterInitial = visibleToasts.get(activeSaveRecoveryToastId('save-slot-2'));
    expect(confirmationAfterInitial).toMatchObject({
      title: 'Backup download requested.',
      options: expect.objectContaining({
        action: expect.objectContaining({ label: 'Download again' }),
      }),
    });

    const repeatClick = actionEvent();
    await act(async () => {
      invokeSonnerAction(confirmationAfterInitial!.options, repeatClick);
    });
    expect(repeatClick.preventDefault).toHaveBeenCalledTimes(1);
    expect(repeatClick.defaultPrevented).toBe(true);
    expect(mockedCreateBackup).toHaveBeenCalledTimes(2);
    expect(mockedRequestDownload).toHaveBeenCalledTimes(2);
    expect(visibleToasts.get(activeSaveRecoveryToastId('save-slot-2'))).toMatchObject({
      title: 'Backup download requested.',
      options: expect.objectContaining({
        description: expect.stringContaining('Local saving is still pending'),
        action: expect.objectContaining({ label: 'Download again' }),
      }),
    });
    expect(fallback).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      canRetry: true,
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps the fallback action and original failed coordinator state when download setup throws', async () => {
    mockedRequestDownload.mockImplementation(() => {
      throw new Error('Download blocked');
    });
    const fallback = status({
      phase: 'fallback_ready',
      automaticAttempts: 2,
      automaticAttemptLimit: 2,
      failureKind: 'indexeddb',
      errorMessage: 'TransactionInactiveError',
    });
    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={fallback} />);
    });
    const options = vi.mocked(toast.error).mock.calls.at(-1)?.[1];
    await act(async () => {
      (options?.action as Action | undefined)?.onClick(actionEvent() as never);
    });

    expect(toast.error).toHaveBeenLastCalledWith(
      'Backup download could not start.',
      expect.objectContaining({
        description: expect.stringContaining('Download blocked'),
        action: expect.objectContaining({ label: 'Download backup' }),
      }),
    );
    expect(fallback).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      canRetry: true,
    });
  });

  it('keeps a repeatable fallback action when canonical backup generation is unavailable', async () => {
    mockedCreateBackup.mockReturnValue(null);
    const fallback = status({
      phase: 'fallback_ready',
      automaticAttempts: 2,
      automaticAttemptLimit: 2,
      failureKind: 'quota',
      errorMessage: 'QuotaExceededError',
    });
    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={fallback} />);
    });
    const options = vi.mocked(toast.error).mock.calls.at(-1)?.[1];
    await act(async () => {
      (options?.action as Action | undefined)?.onClick(actionEvent() as never);
    });

    expect(mockedRequestDownload).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenLastCalledWith(
      'Backup download could not start.',
      expect.objectContaining({
        description: expect.stringContaining('retained save backup is no longer available'),
        action: expect.objectContaining({ label: 'Download backup' }),
      }),
    );
    expect(fallback).toMatchObject({
      state: 'failed',
      pendingWrites: 1,
      canRetry: true,
    });
  });

  it('announces recovered state once and dismisses stale save toasts on switch and unmount', async () => {
    const fallback = status({
      phase: 'fallback_ready',
      automaticAttempts: 2,
      automaticAttemptLimit: 2,
      failureKind: 'quota',
      errorMessage: 'QuotaExceededError',
    });
    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={fallback} />);
    });
    expect(vi.mocked(toast.error).mock.calls.at(-1)?.[1]?.action).toMatchObject({
      label: 'Download backup',
    });

    const recovered = status({
      phase: 'recovered',
      automaticAttempts: 1,
      automaticAttemptLimit: 2,
      failureKind: 'quota',
      errorMessage: 'QuotaExceededError',
    });
    await act(async () => {
      root.render(<Harness saveId="save-slot-2" value={recovered} />);
    });
    expect(toast.success).toHaveBeenCalledWith('Local save recovered.', expect.objectContaining({
      id: activeSaveRecoveryToastId('save-slot-2'),
      action: undefined,
      duration: 6_000,
    }));

    await act(async () => {
      root.render(<Harness saveId="save-slot-3" value={status(null)} />);
    });
    expect(toast.dismiss).toHaveBeenCalledWith(activeSaveRecoveryToastId('save-slot-2'));
    expect(toast.dismiss).toHaveBeenCalledWith(activeSaveRecoveryToastId('save-slot-3'));

    await act(async () => {
      root.unmount();
    });
    expect(toast.dismiss).toHaveBeenCalledWith(activeSaveRecoveryToastId('save-slot-3'));
    root = createRoot(container);
  });
});
