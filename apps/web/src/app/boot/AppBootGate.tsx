import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { GameSnapshotSchema } from '@mbd/contracts';
import { materializeSimulationImportDefaults } from '@mbd/sim-core';
import { useSaveRecovery } from '@/features/save-recovery';
import type { SaveSessionConflictKind } from '@/features/save-session/SaveSessionConflictDialog';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useSimAdvanceCoordinatorStatus } from '@/shared/hooks/useSimAdvanceExecutor';
import { useWorker } from '@/shared/hooks/useWorker';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import {
  loadSaveSafely,
  consumeSimAdvanceIntentRollback,
  inspectSimAdvanceIntentForCandidate,
  resolveSaveSessionTarget,
  type LoadSaveSafelyResult,
  type SaveSessionTarget,
} from '@/shared/lib/saveSystem';
import { canonicalizeSaveIntegrityValue } from '@/shared/lib/saveIntegrity';
import { logger } from '@/shared/lib/logger';
import {
  activateActiveSavePersistenceMetadata,
  abortActiveSaveSessionTransition,
  completeActiveSaveSessionTransition,
  markActiveSaveSessionTransitionOwnershipCommitted,
  failCloseActiveSaveSessionTransition,
  prepareActiveSaveSessionTransition,
  reserveActiveSaveSessionTransitionCommit,
  stageActiveSavePersistenceMetadataForTransition,
  finishReservedActiveSaveSessionTransition,
  restoreInactiveSaveIntegrityBackup,
  type ActiveSaveSessionTransition,
} from '@/shared/lib/activeSavePersistence';
import {
  abortSaveSessionOwnership,
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  isSaveSessionOwnershipError,
  SaveSessionOwnershipError,
  withSaveSessionImportAuthorization,
  withSaveSessionCandidateSnapshotExportAuthorization,
  releaseActiveSaveSessionOwnership,
  type SaveSessionClaim,
} from '@/shared/lib/saveSessionOwnership';
import {
  captureOutgoingSaveSessionSnapshot,
  recoverWorkerAfterCandidateImportFailure,
} from '@/shared/lib/saveSessionTransitionRecovery';
import {
  beginBootRecoveryAdmission,
  cancelBootRecoveryAdmission,
  commitBootRecoverySuccess,
  failBootRecoveryAdmission,
  getBootRecoveryAdmissionStatus,
  reserveBootRecoverySuccess,
  withBootRecoveryCandidateAuthorization,
  type BootRecoveryPermit,
} from '@/shared/lib/bootRecoveryAdmission';

type AutoResumeFailure = Extract<LoadSaveSafelyResult, { ok: false }>;
type AutoResumeStatus = 'idle' | 'resuming' | 'finished';
type ResumeOptions = {
  fromRecovery?: boolean;
  fromSessionConflict?: boolean;
  resumePath?: string | null;
};

interface SessionConflictState {
  kind: SaveSessionConflictKind;
  saveId: string;
  slotNumber: number | null;
  resumePath: string | null;
  target: SaveSessionTarget | null;
  actionError: string | null;
  fromRecovery: boolean;
}

const SaveSessionConflictDialog = lazy(async () => {
  const module = await import('@/features/save-session/SaveSessionConflictDialog');
  return { default: module.SaveSessionConflictDialog };
});

function currentBrowserPath(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function restoreBrowserPath(path: string | null): void {
  if (!path || typeof window === 'undefined' || currentBrowserPath() === path) {
    return;
  }
  window.history.replaceState(window.history.state, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

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

function conflictKind(error: SaveSessionOwnershipError): SaveSessionConflictKind {
  return error.kind === 'not_owner' ? 'ownership_lost' : error.kind;
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

function ReloadRequiredSurface() {
  return (
    <main
      className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-dynasty-base px-5 py-8 text-dynasty-text"
    >
      <section
        className="w-full max-w-lg rounded-2xl border border-dynasty-border bg-dynasty-surface p-6 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-labelledby="simulation-reload-title"
        aria-describedby="simulation-reload-detail"
      >
        <p className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">Saved dynasty protection</p>
        <h1 id="simulation-reload-title" className="mt-2 font-brand text-3xl text-dynasty-textBright">Reload required</h1>
        <p id="simulation-reload-detail" className="mt-3 text-sm leading-6 text-dynasty-muted">
          Your last verified durable save is preserved. Reload this dynasty to recover it; the simulation will not be replayed.
        </p>
        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded-lg bg-accent-primary px-4 py-3 font-heading text-sm font-semibold text-dynasty-base"
          onClick={() => window.location.reload()}
        >
          Reload dynasty
        </button>
      </section>
    </main>
  );
}

export function AppBootGate({ children }: { children: ReactNode }) {
  const worker = useWorker();
  const simAdvanceStatus = useSimAdvanceCoordinatorStatus();
  const persistActiveSave = useActiveSaveAutosave();
  const recovery = useSaveRecovery();
  const activeSaveId = useGameStore((state) => state.activeSaveId);
  const activeSaveSlot = useGameStore((state) => state.activeSaveSlot);
  const isInitialized = useGameStore((state) => state.isInitialized);
  const initializeGame = useGameStore((state) => state.initializeGame);
  const setActiveSave = useGameStore((state) => state.setActiveSave);
  const setInitialized = useGameStore((state) => state.setInitialized);
  const [resumeStatus, setResumeStatus] = useState<AutoResumeStatus>('idle');
  const [sessionConflict, setSessionConflict] = useState<SessionConflictState | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [journalRecoveryFailed, setJournalRecoveryFailed] = useState(false);
  const attemptedSaveIdRef = useRef<string | null>(null);

  const attemptResume = useCallback(async (
    saveId: string,
    slotNumber: number | null,
    options: ResumeOptions = {},
  ): Promise<boolean> => {
    const resumePath = options.resumePath ?? currentBrowserPath();
    setResumeStatus('resuming');
    if (options.fromSessionConflict) {
      setCheckingSession(true);
    }

    let claim: SaveSessionClaim | null = null;
    let transition: ActiveSaveSessionTransition | null = null;
    let target: SaveSessionTarget | null = null;
    let outgoingSnapshot: object | null = null;
    let workerMayBeReplaced = false;
    let candidateCommitted = false;
    let journalRollback = false;
    let journalInspectionFailed = false;
    let bootPermit: BootRecoveryPermit | null = null;
    const cancelAttempt = async () => {
      const pendingTransition = transition;
      const pendingClaim = claim;
      transition = null;
      claim = null;
      if (pendingTransition) {
        try {
          abortActiveSaveSessionTransition(pendingTransition);
        } catch (error) {
          logger.error('Failed to roll back an incomplete save-session transition:', error);
        }
      }
      if (pendingClaim) {
        try {
          await abortSaveSessionOwnership(pendingClaim);
        } catch (error) {
          logger.error('Failed to release an incomplete save-session claim:', error);
        }
      }
    };

    try {
      target = await resolveSaveSessionTarget(saveId);
      if (!target) {
        throw new SaveSessionOwnershipError(
          'unknown_tree',
          'MBD could not identify the root dynasty for this saved branch.',
          null,
        );
      }
      claim = await beginSaveSessionOwnership(target.rootSaveId);
      transition = await prepareActiveSaveSessionTransition(saveId, {
        persistOutgoingSnapshot: (outgoingSaveId) => persistActiveSave({
          transitionSaveId: outgoingSaveId,
        }),
      });
      const loadResult = await loadSaveSafely(saveId);

      if (!loadResult.ok) {
        await cancelAttempt();
        setSessionConflict(null);
        setActiveSave(null, null);
        setResumeStatus('finished');

        if (isMissingSaveFailure(loadResult)) {
          toast.info('Saved dynasty was not found. Returning to the Save Hub.');
          return false;
        }

        if (!options.fromRecovery) {
          recovery.showFailure({
            failure: loadResult,
            onRepair: async () => {
              await restoreInactiveSaveIntegrityBackup(saveId);
              return true;
            },
            onRetry: () => attemptResume(saveId, slotNumber, {
              fromRecovery: true,
              resumePath,
            }),
          });
        }
        return false;
      }

      if ((loadResult.save.parentSaveId ?? loadResult.save.id) !== target.rootSaveId) {
        throw new SaveSessionOwnershipError(
          'unknown_tree',
          'The save-tree relationship changed while exclusive access was being prepared.',
          target.rootSaveId,
        );
      }
      // Inspect durable journal evidence after tree ownership/transition
      // preparation but before any candidate worker import. An exact-key row
      // with malformed topology is an integrity failure, never ordinary boot.
      // Capture the outgoing realm while the transition's exact export
      // authorization is still the only active lane. Recovery admission then
      // fences it permanently before inspecting/importing the candidate.
      workerMayBeReplaced = transition.outgoingSaveId != null;
      outgoingSnapshot = await captureOutgoingSaveSessionSnapshot(
        transition,
        worker.exportSnapshot,
      );
      workerMayBeReplaced = true;

      // Latch before touching the journal: malformed/missing-root evidence is
      // itself a terminal recovery condition, not ordinary boot work.
      bootPermit = beginBootRecoveryAdmission(saveId, target.rootSaveId);
      let journal;
      try {
        journal = await inspectSimAdvanceIntentForCandidate(
          loadResult.save.id,
          target.rootSaveId,
        );
      } catch (error) {
        journalInspectionFailed = true;
        throw error;
      }
      if (journal.kind === 'none') {
        cancelBootRecoveryAdmission(bootPermit);
        bootPermit = null;
      }
      if (journal.kind === 'rollback') {
        journalRollback = true;
        const rollbackPermit = bootPermit;
        if (!rollbackPermit) {
          throw new Error('Boot rollback lost its exact recovery admission before candidate import.');
        }
        await worker.restartWorker();
        const importedBaseline = await withBootRecoveryCandidateAuthorization(
          rollbackPermit,
          () => withSaveSessionImportAuthorization(
            claim!,
            () => worker.importSnapshot(journal.baseline.snapshot as object),
          ),
        );
        if (!importedBaseline.success) {
          throw new Error('The verified simulation baseline could not be imported.');
        }
        const restoredSnapshot = await withBootRecoveryCandidateAuthorization(
          rollbackPermit,
          () => withSaveSessionCandidateSnapshotExportAuthorization(
            claim!,
            loadResult.save.id,
            () => worker.exportSnapshot(),
          ),
        );
        const expectedSnapshot = materializeSimulationImportDefaults(
          GameSnapshotSchema.parse(journal.baseline.snapshot),
        );
        const actualSnapshot = GameSnapshotSchema.parse(restoredSnapshot);
        if (canonicalizeSaveIntegrityValue(expectedSnapshot) !== canonicalizeSaveIntegrityValue(actualSnapshot)) {
          throw new Error('The restored simulation baseline did not exactly match the verified durable snapshot.');
        }
        await commitSaveSessionOwnership(claim, loadResult.save.id);
        markActiveSaveSessionTransitionOwnershipCommitted(transition);
        candidateCommitted = true;
        claim = null;
        stageActiveSavePersistenceMetadataForTransition(transition, journal.baseline);
        initializeGame({
          season: importedBaseline.season,
          day: importedBaseline.day,
          phase: importedBaseline.phase,
          playerCount: importedBaseline.playerCount,
          userTeamId: importedBaseline.userTeamId,
          teamName: importedBaseline.teamName,
          gmName: importedBaseline.gmName,
          difficulty: importedBaseline.difficulty,
          activeSaveId: journal.baseline.id,
          activeSaveSlot: journal.baseline.slotNumber,
        });
        const transitionReservation = reserveActiveSaveSessionTransitionCommit(transition);
        const bootSuccess = reserveBootRecoverySuccess(rollbackPermit);
        await finishReservedActiveSaveSessionTransition(
          transitionReservation,
          () => consumeSimAdvanceIntentRollback(journal.intent),
        );
        commitBootRecoverySuccess(bootSuccess);
        bootPermit = null;
        transition = null;
        setSessionConflict(null);
        setResumeStatus('finished');
        // The durable rollback is already complete. Route/toast presentation
        // is deliberately best-effort and must never re-enter journal cleanup.
        try { restoreBrowserPath(resumePath); }
        catch (presentationError) { logger.error('Restored boot path could not be applied:', presentationError); }
        try { toast.info('Restored the last verified saved dynasty. The interrupted simulation was not replayed.'); }
        catch (presentationError) { logger.error('Restored boot notice could not be shown:', presentationError); }
        return true;
      }
      const imported = await withSaveSessionImportAuthorization(
        claim,
        () => worker.importSnapshot(loadResult.snapshot),
      );
      if (!imported.success) {
        await recoverWorkerAfterCandidateImportFailure({
          importSnapshot: worker.importSnapshot,
          candidateCommitted,
          outgoingSnapshot,
          restartWorker: worker.restartWorker,
          setInitialized,
          transition,
        });
        workerMayBeReplaced = false;
        await cancelAttempt();
        setSessionConflict(null);
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
            onRetry: () => attemptResume(saveId, slotNumber, {
              fromRecovery: true,
              resumePath,
            }),
          });
        }
        return false;
      }

      // Ordinary boot must prove that import was load-pure before the
      // candidate becomes authoritative. A future import-time normalizer may
      // not silently move the singleton worker ahead of the exact durable
      // primary/shadow baseline.
      const importedSnapshot = await withSaveSessionCandidateSnapshotExportAuthorization(
        claim,
        loadResult.save.id,
        () => worker.exportSnapshot(),
      );
      const expectedSnapshot = materializeSimulationImportDefaults(
        GameSnapshotSchema.parse(loadResult.snapshot),
      );
      const actualSnapshot = GameSnapshotSchema.parse(importedSnapshot);
      if (canonicalizeSaveIntegrityValue(expectedSnapshot) !== canonicalizeSaveIntegrityValue(actualSnapshot)) {
        throw new Error('The imported worker did not exactly match the verified durable snapshot.');
      }

      await commitSaveSessionOwnership(claim, loadResult.save.id);
      markActiveSaveSessionTransitionOwnershipCommitted(transition);
      candidateCommitted = true;
      claim = null;
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
      completeActiveSaveSessionTransition(transition);
      transition = null;
      if (options.fromSessionConflict && options.fromRecovery) {
        recovery.close();
      }
      setSessionConflict(null);
      restoreBrowserPath(resumePath);
      setResumeStatus('finished');
      return true;
    } catch (error) {
      if (journalRollback || journalInspectionFailed) {
        // Enter the global fence before any pause/barrier can reopen. Each
        // cleanup is isolated: preserving the durable journal beats restoring
        // a possibly stale outgoing worker realm.
        if (bootPermit) {
          try { failBootRecoveryAdmission(bootPermit, error); }
          catch (latchError) { logger.error('Boot recovery latch could not fail closed:', latchError); }
        }
        try { setInitialized(false); }
        catch (stateError) { logger.error('Boot rollback could not clear initialization:', stateError); }
        try { await releaseActiveSaveSessionOwnership(); }
        catch (releaseError) { logger.error('Boot rollback could not release active ownership:', releaseError); }
        try { await worker.restartWorker(); }
        catch (discardError) { logger.error('Boot rollback could not discard the candidate worker:', discardError); }
        if (transition) {
          try { failCloseActiveSaveSessionTransition(transition); }
          catch (transitionError) { logger.error('Boot rollback could not terminally close its transition:', transitionError); }
          transition = null;
        }
        if (claim) {
          try { await abortSaveSessionOwnership(claim); }
          catch (claimError) { logger.error('Boot rollback could not abort its candidate claim:', claimError); }
          claim = null;
        }
        setJournalRecoveryFailed(true);
        setSessionConflict(null);
        setResumeStatus('finished');
        logger.error('Simulation journal rollback failed; durable evidence was preserved:', error);
        return false;
      }
      if (workerMayBeReplaced && transition) {
        const recoveryResult = await recoverWorkerAfterCandidateImportFailure({
          importSnapshot: worker.importSnapshot,
          candidateCommitted,
          outgoingSnapshot,
          restartWorker: worker.restartWorker,
          setInitialized,
          transition,
        });
        if (recoveryResult.kind === 'reload_required') {
          logger.error(
            'Failed to restore the outgoing worker after auto-resume:',
            recoveryResult.error,
          );
        }
        workerMayBeReplaced = false;
      }
      await cancelAttempt();
      if (isSaveSessionOwnershipError(error)) {
        const kind = conflictKind(error);
        setSessionConflict({
          kind,
          saveId,
          slotNumber: target?.slotNumber ?? slotNumber,
          resumePath,
          target,
          actionError: options.fromSessionConflict && (kind === 'request_failed' || kind === 'ownership_lost')
            ? errorMessage(error)
            : null,
          fromRecovery: Boolean(options.fromRecovery),
        });
        setResumeStatus('finished');
        return false;
      }
      setSessionConflict(null);
      logger.error('Failed to auto-resume save:', error);
      const failure = storageFailure(saveId, slotNumber, errorMessage(error));
      setActiveSave(null, null);
      setResumeStatus('finished');
      toast.error('Could not resume the saved dynasty. Returning to the Save Hub.');
      if (!options.fromRecovery) {
        recovery.showFailure({
          failure,
          onRetry: () => attemptResume(saveId, slotNumber, {
            fromRecovery: true,
            resumePath,
          }),
        });
      }
      return false;
    } finally {
      if (options.fromSessionConflict) {
        setCheckingSession(false);
      }
    }
  }, [initializeGame, persistActiveSave, recovery, setActiveSave, setInitialized, worker]);

  useEffect(() => {
    // S4 only owns presentation/suppression. S5 will inspect journal evidence
    // before import; for now a fail-closed coordinator result must never start
    // a new resume, ownership claim, worker export, or repair flow.
    if (simAdvanceStatus.kind === 'fail_closed' || journalRecoveryFailed) {
      return;
    }
    if (isInitialized) {
      attemptedSaveIdRef.current = null;
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
  }, [activeSaveId, activeSaveSlot, attemptResume, isInitialized, journalRecoveryFailed, simAdvanceStatus.kind, worker.isReady]);

  if (simAdvanceStatus.kind === 'fail_closed' || journalRecoveryFailed) {
    return <ReloadRequiredSurface />;
  }

  if (sessionConflict) {
    return (
      <Suspense fallback={<ResumeFallback />}>
        <SaveSessionConflictDialog
          targetName={sessionConflict.target?.name}
          targetLabel={sessionConflict.saveId}
          slotNumber={sessionConflict.slotNumber}
          failureKind={sessionConflict.kind}
          checking={checkingSession}
          actionError={sessionConflict.actionError}
          onCheckAgain={() => {
            void attemptResume(sessionConflict.saveId, sessionConflict.slotNumber, {
              fromRecovery: sessionConflict.fromRecovery,
              fromSessionConflict: true,
              resumePath: sessionConflict.resumePath,
            });
          }}
        />
      </Suspense>
    );
  }

  if (getBootRecoveryAdmissionStatus().kind === 'recovering') {
    return <ResumeFallback />;
  }

  if (activeSaveId && !isInitialized && resumeStatus !== 'finished') {
    return <ResumeFallback />;
  }

  return <>{children}</>;
}
