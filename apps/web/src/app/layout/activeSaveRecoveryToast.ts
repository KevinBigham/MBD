import { useEffect, useRef, type MouseEvent } from 'react';
import { toast, type ExternalToast } from 'sonner';
import {
  createActiveSavePersistenceBackup,
  type ActiveSavePersistenceFailureKind,
  type ActiveSavePersistenceStatus,
} from '@/shared/lib/activeSavePersistence';
import { requestBrowserDownload } from '@/shared/lib/browserDownload';

const RECOVERY_TOAST_PREFIX = 'active-save-recovery:';
const RECOVERY_TOAST_TEST_ID = 'active-save-recovery-toast';

export function activeSaveRecoveryToastId(saveId: string): string {
  return `${RECOVERY_TOAST_PREFIX}${saveId}`;
}

function failureTitle(kind: ActiveSavePersistenceFailureKind): string {
  switch (kind) {
    case 'quota':
      return 'Local storage is full.';
    case 'unavailable':
      return 'Browser storage is unavailable.';
    case 'indexeddb':
      return 'The browser database could not finish this save.';
    default:
      return 'Local saving failed.';
  }
}

function persistentToastOptions(saveId: string): ExternalToast {
  return {
    id: activeSaveRecoveryToastId(saveId),
    action: undefined,
    duration: Infinity,
    dismissible: true,
    closeButton: true,
    position: 'top-center',
    testId: RECOVERY_TOAST_TEST_ID,
  };
}

function requestBackup(saveId: string): void {
  const options = persistentToastOptions(saveId);
  const repeatDownload = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    requestBackup(saveId);
  };
  try {
    const backup = createActiveSavePersistenceBackup(saveId);
    if (!backup) {
      throw new Error('The retained save backup is no longer available.');
    }
    requestBrowserDownload({
      filename: backup.filename,
      payload: backup.payload,
    });
    toast.info('Backup download requested.', {
      ...options,
      description: 'Local saving is still pending. Use Retry when browser storage is available.',
      action: {
        label: 'Download again',
        onClick: repeatDownload,
      },
    });
  } catch (error) {
    toast.error('Backup download could not start.', {
      ...options,
      description: error instanceof Error
        ? `Local saving is still pending. ${error.message}`
        : 'Local saving is still pending. Try Download backup again.',
      action: {
        label: 'Download backup',
        onClick: repeatDownload,
      },
    });
  }
}

function showRecoveryToast(saveId: string, status: ActiveSavePersistenceStatus): void {
  const recovery = status.recovery;
  if (!recovery) {
    toast.dismiss(activeSaveRecoveryToastId(saveId));
    return;
  }

  const options = persistentToastOptions(saveId);
  if (recovery.phase === 'retry_scheduled') {
    const nextAttempt = Math.min(
      recovery.automaticAttempts + 1,
      recovery.automaticAttemptLimit,
    );
    toast.error(failureTitle(recovery.failureKind), {
      ...options,
      description: `Automatic persistence retry ${nextAttempt} of ${recovery.automaticAttemptLimit} is scheduled.`,
    });
    return;
  }

  if (recovery.phase === 'retrying') {
    toast.loading('Retrying local save automatically.', {
      ...options,
      description: recovery.automaticAttempts > 0
        ? `Persistence attempt ${recovery.automaticAttempts} of ${recovery.automaticAttemptLimit} is in progress.`
        : 'The latest full snapshot is being persisted.',
    });
    return;
  }

  if (recovery.phase === 'fallback_ready') {
    toast.error('Local save still failed.', {
      ...options,
      description: 'Download a backup, then use Retry when browser storage is available.',
      action: {
        label: 'Download backup',
        onClick: (event) => {
          event.preventDefault();
          requestBackup(saveId);
        },
      },
    });
    return;
  }

  toast.success('Local save recovered.', {
    ...options,
    duration: 6_000,
    description: 'Your latest changes are now durable on this device.',
  });
}

export function useActiveSaveRecoveryToast(
  saveId: string | null | undefined,
  status: ActiveSavePersistenceStatus,
): void {
  const previousSaveId = useRef<string | null>(null);

  useEffect(() => {
    if (previousSaveId.current && previousSaveId.current !== saveId) {
      toast.dismiss(activeSaveRecoveryToastId(previousSaveId.current));
    }
    previousSaveId.current = saveId ?? null;
    if (!saveId) return;
    showRecoveryToast(saveId, status);
  }, [saveId, status]);

  useEffect(() => () => {
    if (previousSaveId.current) {
      toast.dismiss(activeSaveRecoveryToastId(previousSaveId.current));
    }
  }, []);
}
