import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useSaveRecovery } from '@/features/save-recovery';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { loadSaveSafely, type LoadSaveSafelyResult } from '@/shared/lib/saveSystem';
import { logger } from '@/shared/lib/logger';
import {
  activateActiveSavePersistenceMetadata,
  prepareActiveSavePersistenceForLoad,
  releaseActiveSavePersistenceLoad,
} from '@/shared/lib/activeSavePersistence';

type AutoResumeFailure = Extract<LoadSaveSafelyResult, { ok: false }>;
type AutoResumeStatus = 'idle' | 'resuming' | 'finished';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingSaveFailure(failure: AutoResumeFailure): boolean {
  return (
    failure.reason === 'storage_failed'
    && failure.detail.message === 'No save record found.'
  );
}

function storageFailure(saveId: string, slotNumber: number | null, message: string): AutoResumeFailure {
  return {
    ok: false,
    reason: 'storage_failed',
    detail: {
      slotId: saveId,
      slotNumber,
      message,
      rawJson: null,
    },
  };
}

function ResumeFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dynasty-base px-6 py-24 text-dynasty-text">
      <div className="w-full max-w-3xl rounded-2xl border border-dynasty-border bg-dynasty-surface p-6 shadow-2xl" role="status" aria-live="polite">
        <div className="flex items-center justify-between gap-4 border-b border-dynasty-border pb-4">
          <div>
            <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-info">Save Hub Relay</div>
            <div className="mt-2 font-brand text-3xl text-dynasty-textBright">Reopening the front office</div>
          </div>
          <div className="font-brand text-2xl text-accent-primary motion-safe:animate-pulse">MBD</div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {['Loading roster desk', 'Restoring league wire', 'Checking autosave'].map((label) => (
            <div key={label} className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">{label}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-dynasty-border">
                <div className="h-full w-1/2 rounded-full bg-accent-primary motion-safe:animate-[shimmer_1.2s_ease-in-out_infinite]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppBootGate({ children }: { children: ReactNode }) {
  const worker = useWorker();
  const recovery = useSaveRecovery();
  const activeSaveId = useGameStore((state) => state.activeSaveId);
  const activeSaveSlot = useGameStore((state) => state.activeSaveSlot);
  const isInitialized = useGameStore((state) => state.isInitialized);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const setActiveSave = useGameStore((state) => state.setActiveSave);
  const [resumeStatus, setResumeStatus] = useState<AutoResumeStatus>('idle');
  const attemptedSaveIdRef = useRef<string | null>(null);

  const attemptResume = useCallback(async (
    saveId: string,
    slotNumber: number | null,
    options: { fromRecovery?: boolean } = {},
  ): Promise<boolean> => {
    setResumeStatus('resuming');

    try {
      await prepareActiveSavePersistenceForLoad(saveId);
      const loadResult = await loadSaveSafely(saveId);

      if (!loadResult.ok) {
        releaseActiveSavePersistenceLoad(saveId);
        setActiveSave(null, null);
        setResumeStatus('finished');

        if (isMissingSaveFailure(loadResult)) {
          toast.info('Saved dynasty was not found. Returning to the Save Hub.');
          return false;
        }

        if (!options.fromRecovery) {
          recovery.showFailure({
            failure: loadResult,
            onRetry: () => attemptResume(saveId, slotNumber, { fromRecovery: true }),
          });
        }
        return false;
      }

      const imported = await worker.importSnapshot(loadResult.snapshot);
      if (!imported.success) {
        releaseActiveSavePersistenceLoad(saveId);
        const failure = storageFailure(
          saveId,
          loadResult.save.slotNumber ?? slotNumber,
          'error' in imported && typeof imported.error === 'string'
            ? imported.error
            : 'The saved dynasty could not be imported.',
        );
        setActiveSave(null, null);
        setResumeStatus('finished');
        if (!options.fromRecovery) {
          recovery.showFailure({
            failure,
            onRetry: () => attemptResume(saveId, slotNumber, { fromRecovery: true }),
          });
        }
        return false;
      }

      activateActiveSavePersistenceMetadata(loadResult.save);
      initializeGame({
        season: imported.season,
        day: imported.day,
        phase: imported.phase,
        playerCount: imported.playerCount,
        userTeamId: imported.userTeamId,
        teamName: imported.teamName,
        gmName: imported.gmName,
        difficulty: imported.difficulty,
        activeSaveId: loadResult.save.id,
        activeSaveSlot: loadResult.save.slotNumber,
      });
      setResumeStatus('finished');
      return true;
    } catch (error) {
      releaseActiveSavePersistenceLoad(saveId);
      logger.error('Failed to auto-resume save:', error);
      const failure = storageFailure(saveId, slotNumber, errorMessage(error));
      setActiveSave(null, null);
      setResumeStatus('finished');
      toast.error('Could not resume the saved dynasty. Returning to the Save Hub.');
      if (!options.fromRecovery) {
        recovery.showFailure({
          failure,
          onRetry: () => attemptResume(saveId, slotNumber, { fromRecovery: true }),
        });
      }
      return false;
    }
  }, [initializeGame, recovery, setActiveSave, worker]);

  useEffect(() => {
    if (isInitialized) {
      setResumeStatus('finished');
      return;
    }

    if (!activeSaveId) {
      attemptedSaveIdRef.current = null;
      setResumeStatus('finished');
      return;
    }

    if (!worker.isReady) {
      setResumeStatus('resuming');
      return;
    }

    if (attemptedSaveIdRef.current === activeSaveId) {
      return;
    }

    attemptedSaveIdRef.current = activeSaveId;
    void attemptResume(activeSaveId, activeSaveSlot);
  }, [activeSaveId, activeSaveSlot, attemptResume, isInitialized, worker.isReady]);

  if (activeSaveId && !isInitialized && resumeStatus !== 'finished') {
    return <ResumeFallback />;
  }

  return <>{children}</>;
}
