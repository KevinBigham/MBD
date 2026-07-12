import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { AppBootGate } from './AppBootGate';
import { useWorker } from '@/shared/hooks/useWorker';
import {
  consumeSimAdvanceIntentRollback,
  inspectSimAdvanceIntentForCandidate,
  loadSaveSafely,
  resolveSaveSessionTarget,
  type LoadSaveSafelyResult,
} from '@/shared/lib/saveSystem';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  activateActiveSavePersistenceMetadata,
  abortActiveSaveSessionTransition,
  completeActiveSaveSessionTransition,
  finishReservedActiveSaveSessionTransition,
  markActiveSaveSessionTransitionOwnershipCommitted,
  prepareActiveSaveSessionTransition,
  stageActiveSavePersistenceMetadataForTransition,
  restoreInactiveSaveIntegrityBackup,
} from '@/shared/lib/activeSavePersistence';
import {
  abortSaveSessionOwnership,
  beginSaveSessionOwnership,
  commitSaveSessionOwnership,
  SaveSessionOwnershipError,
  withSaveSessionCandidateSnapshotExportAuthorization,
  withSaveSessionImportAuthorization,
} from '@/shared/lib/saveSessionOwnership';
import {
  captureOutgoingSaveSessionSnapshot,
  recoverWorkerAfterCandidateImportFailure,
} from '@/shared/lib/saveSessionTransitionRecovery';
import { toast } from 'sonner';
import { useSimAdvanceCoordinatorStatus } from '@/shared/hooks/useSimAdvanceExecutor';
import {
  getBootRecoveryAdmissionStatus,
  resetBootRecoveryAdmissionForTesting,
} from '@/shared/lib/bootRecoveryAdmission';
import snapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';
import { parseGameSnapshot } from '@mbd/contracts';
import { materializeSimulationImportDefaults } from '@mbd/sim-core';

const ordinaryCompatibilitySnapshot = parseGameSnapshot({
  ...snapshotFixture,
  season: 4,
  day: 88,
});
const ordinarySnapshotFixture = materializeSimulationImportDefaults(ordinaryCompatibilitySnapshot);
const journalSnapshotFixture = materializeSimulationImportDefaults(parseGameSnapshot(snapshotFixture));

const recoveryMock = vi.hoisted(() => ({
  close: vi.fn(),
  showFailure: vi.fn(),
}));

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useSimAdvanceExecutor', () => ({
  useSimAdvanceCoordinatorStatus: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  consumeSimAdvanceIntentRollback: vi.fn(),
  inspectSimAdvanceIntentForCandidate: vi.fn(),
  loadSaveSafely: vi.fn(),
  resolveSaveSessionTarget: vi.fn(),
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  abortActiveSaveSessionTransition: vi.fn(),
  activateActiveSavePersistenceMetadata: vi.fn(),
  completeActiveSaveSessionTransition: vi.fn(),
  failCloseActiveSaveSessionTransition: vi.fn(),
  finishReservedActiveSaveSessionTransition: vi.fn(async (_reservation, commit: () => Promise<void>) => commit()),
  markActiveSaveSessionTransitionOwnershipCommitted: vi.fn(),
  prepareActiveSaveSessionTransition: vi.fn(),
  reserveActiveSaveSessionTransitionCommit: vi.fn(() => ({ reservationId: Symbol('transition') })),
  stageActiveSavePersistenceMetadataForTransition: vi.fn(),
  restoreInactiveSaveIntegrityBackup: vi.fn(),
}));

vi.mock('@/shared/lib/saveSessionOwnership', () => {
  class MockSaveSessionOwnershipError extends Error {
    constructor(
      readonly kind: 'contended' | 'unavailable' | 'request_failed' | 'unknown_tree' | 'not_owner',
      message: string,
      readonly rootSaveId: string | null = null,
    ) {
      super(message);
      this.name = 'SaveSessionOwnershipError';
    }
  }
  return {
    abortSaveSessionOwnership: vi.fn(),
    beginSaveSessionOwnership: vi.fn(),
    commitSaveSessionOwnership: vi.fn(),
    isSaveSessionOwnershipError: (error: unknown) => error instanceof MockSaveSessionOwnershipError,
    SaveSessionOwnershipError: MockSaveSessionOwnershipError,
    withSaveSessionCandidateSnapshotExportAuthorization: vi.fn(
      (_claim, _candidateSaveId, operation: () => Promise<unknown>) => operation(),
    ),
    withSaveSessionImportAuthorization: vi.fn((_claim, operation: () => Promise<unknown>) => operation()),
  };
});

vi.mock('@/shared/lib/saveSessionTransitionRecovery', () => ({
  captureOutgoingSaveSessionSnapshot: vi.fn(),
  recoverWorkerAfterCandidateImportFailure: vi.fn(),
}));

vi.mock('@/features/save-recovery', () => ({
  useSaveRecovery: () => recoveryMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
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

const okLoadResult: Extract<LoadSaveSafelyResult, { ok: true }> = {
  ok: true,
  snapshot: ordinaryCompatibilitySnapshot,
  save: {
    id: 'save-slot-1',
    slotNumber: 1,
    name: 'Tycoons Year 4',
    season: 4,
    day: 88,
    phase: 'regular',
    schemaVersion: 34,
    hasSnapshot: true,
    snapshot: ordinaryCompatibilitySnapshot,
    legacyState: null,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T12:00:00.000Z',
    parentSaveId: null,
    isRootSave: true,
    branchMeta: null,
  },
  rawJson: '{"id":"save-slot-1"}',
};

function resetGameStore() {
  useGameStore.setState({
    season: 1,
    day: 1,
    phase: 'preseason',
    isSimulating: false,
    isInitialized: false,
    userTeamId: 'nym',
    teamName: 'Tycoons',
    gmName: 'General Manager',
    difficulty: 'standard',
    activeSaveId: null,
    activeSaveSlot: null,
    playerCount: 0,
    gamesPlayed: 0,
  });
}

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AppBootGate', () => {
  let container: HTMLDivElement;
  let root: Root;
  let workerMock: {
    exportSnapshot: ReturnType<typeof vi.fn>;
    isReady: boolean;
    importSnapshot: ReturnType<typeof vi.fn>;
    restartWorker: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    resetBootRecoveryAdmissionForTesting();
    window.history.replaceState(null, '', '/MBD/dashboard');
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
    window.localStorage.clear();
    resetGameStore();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    workerMock = {
      exportSnapshot: vi.fn().mockResolvedValue(ordinarySnapshotFixture),
      isReady: true,
      importSnapshot: vi.fn().mockResolvedValue({
        success: true,
        season: 4,
        day: 88,
        phase: 'regular',
        playerCount: 780,
        userTeamId: 'nym',
        teamName: 'New York Tycoons',
        gmName: 'General Manager',
        difficulty: 'standard',
      }),
      restartWorker: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(useSimAdvanceCoordinatorStatus).mockReturnValue({ kind: 'idle' });
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockResolvedValue({ kind: 'none' });
    vi.mocked(consumeSimAdvanceIntentRollback).mockResolvedValue(undefined);
    vi.mocked(useWorker).mockReturnValue(workerMock as unknown as ReturnType<typeof useWorker>);
    vi.mocked(resolveSaveSessionTarget).mockImplementation(async (saveId) => ({
      saveId,
      rootSaveId: /^save-slot-\d+$/.test(saveId) ? saveId : 'save-slot-1',
      slotNumber: Number(/^save-slot-(\d+)$/.exec(saveId)?.[1] ?? 1),
      name: saveId === 'save-slot-1' ? 'Tycoons Year 4' : null,
    }));
    vi.mocked(beginSaveSessionOwnership).mockImplementation(async (rootSaveId) => ({
      rootSaveId,
      resourceName: `mbd-save-tree-v1:${rootSaveId}`,
      claimId: Symbol(rootSaveId),
    }));
    vi.mocked(prepareActiveSaveSessionTransition).mockImplementation(async (targetSaveId) => ({
      transitionId: Symbol(targetSaveId),
      targetSaveId,
      outgoingSaveId: null,
    }));
    vi.mocked(abortSaveSessionOwnership).mockResolvedValue(undefined);
    vi.mocked(commitSaveSessionOwnership).mockResolvedValue(undefined);
    vi.mocked(captureOutgoingSaveSessionSnapshot).mockResolvedValue(null);
    vi.mocked(recoverWorkerAfterCandidateImportFailure).mockResolvedValue({
      kind: 'discarded_candidate',
    });
    recoveryMock.showFailure.mockReset();
    recoveryMock.close.mockReset();
    vi.mocked(toast.info).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    // Journal-failure cases intentionally leave the production latch terminal.
    // Each test needs a fresh page-runtime boundary.
    resetBootRecoveryAdmissionForTesting();
    window.history.replaceState(null, '', '/MBD/dashboard');
    vi.clearAllMocks();
  });

  it('blocks the route with a resume skeleton, hydrates the worker, and then renders children', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    let resolveLoad: (value: Extract<LoadSaveSafelyResult, { ok: true }>) => void = () => {};
    vi.mocked(loadSaveSafely).mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Dashboard Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(container.textContent).toContain('Reopening the front office');
    expect(container.textContent).not.toContain('Dashboard Route');

    await act(async () => {
      resolveLoad(okLoadResult);
      await flushAsync();
    });

    expect(loadSaveSafely).toHaveBeenCalledWith('save-slot-1');
    expect(workerMock.importSnapshot).toHaveBeenCalledWith(okLoadResult.snapshot);
    expect(resolveSaveSessionTarget).toHaveBeenCalledWith('save-slot-1');
    expect(beginSaveSessionOwnership).toHaveBeenCalledWith('save-slot-1');
    expect(prepareActiveSaveSessionTransition).toHaveBeenCalledWith(
      'save-slot-1',
      expect.objectContaining({ persistOutgoingSnapshot: expect.any(Function) }),
    );
    expect(withSaveSessionImportAuthorization).toHaveBeenCalled();
    expect(withSaveSessionCandidateSnapshotExportAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ rootSaveId: 'save-slot-1' }),
      'save-slot-1',
      expect.any(Function),
    );
    expect(workerMock.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(workerMock.exportSnapshot.mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(commitSaveSessionOwnership).mock.invocationCallOrder[0]!);
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(okLoadResult.save);
    expect(completeActiveSaveSessionTransition).toHaveBeenCalled();
    expect(commitSaveSessionOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ rootSaveId: 'save-slot-1' }),
      'save-slot-1',
    );
    expect(markActiveSaveSessionTransitionOwnershipCommitted).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState()).toMatchObject({
      isInitialized: true,
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      season: 4,
      day: 88,
      phase: 'regular',
      teamName: 'New York Tycoons',
    });
    expect(container.textContent).toContain('Dashboard Route');
  });

  it('keeps ordinary ownership and presentation blocked until exact post-import export verifies', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    let releaseExport!: (snapshot: typeof ordinarySnapshotFixture) => void;
    workerMock.exportSnapshot.mockReturnValueOnce(new Promise((resolve) => {
      releaseExport = resolve;
    }));

    await act(async () => {
      root.render(<AppBootGate><div>Hidden dashboard</div></AppBootGate>);
      await flushAsync();
    });

    expect(container.textContent).toContain('Reopening the front office');
    expect(container.textContent).not.toContain('Hidden dashboard');
    expect(commitSaveSessionOwnership).not.toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(useGameStore.getState().isInitialized).toBe(false);

    await act(async () => {
      releaseExport(ordinarySnapshotFixture);
      await flushAsync();
    });

    expect(commitSaveSessionOwnership).toHaveBeenCalledTimes(1);
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Hidden dashboard');
  });

  it('discards an ordinary imported candidate that differs from the verified durable snapshot', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    workerMock.exportSnapshot.mockResolvedValueOnce({
      ...ordinarySnapshotFixture,
      rng: { ...ordinarySnapshotFixture.rng, callCount: ordinarySnapshotFixture.rng.callCount + 1 },
    });

    await act(async () => {
      root.render(<AppBootGate><div>Hidden dashboard</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(recoverWorkerAfterCandidateImportFailure).toHaveBeenCalledTimes(1);
    expect(commitSaveSessionOwnership).not.toHaveBeenCalled();
    expect(markActiveSaveSessionTransitionOwnershipCommitted).not.toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(completeActiveSaveSessionTransition).not.toHaveBeenCalled();
    expect(useGameStore.getState()).toMatchObject({ isInitialized: false, activeSaveId: null });
  });

  it('restores an exact journal baseline before activation and publishes rollback notice only after consume', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const baseline = {
      ...okLoadResult.save,
      season: (snapshotFixture as { season: number }).season,
      day: (snapshotFixture as { day: number }).day,
      phase: (snapshotFixture as { phase: string }).phase,
      snapshot: journalSnapshotFixture,
    };
    const intent = { saveId: 'save-slot-1', rootSaveId: 'save-slot-1', token: 'boot-intent' };
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockResolvedValue({
      kind: 'rollback', intent, baseline,
    } as never);
    workerMock.exportSnapshot.mockResolvedValue(journalSnapshotFixture);

    await act(async () => {
      root.render(<AppBootGate><div>Dashboard Route</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(workerMock.restartWorker).toHaveBeenCalledTimes(1);
    expect(workerMock.importSnapshot).toHaveBeenCalledWith(journalSnapshotFixture);
    expect(withSaveSessionCandidateSnapshotExportAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ rootSaveId: 'save-slot-1' }),
      'save-slot-1',
      expect.any(Function),
    );
    expect(workerMock.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(consumeSimAdvanceIntentRollback).toHaveBeenCalledWith(intent);
    expect(stageActiveSavePersistenceMetadataForTransition).toHaveBeenCalledWith(
      expect.anything(), baseline,
    );
    expect(finishReservedActiveSaveSessionTransition).toHaveBeenCalledTimes(1);
    expect(vi.mocked(stageActiveSavePersistenceMetadataForTransition).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(consumeSimAdvanceIntentRollback).mock.invocationCallOrder[0]!);
    expect(vi.mocked(finishReservedActiveSaveSessionTransition).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(toast.info).mock.invocationCallOrder[0]!);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('not replayed'));
  });

  it('keeps boot hidden and the exact journal intact while its reserved delete is held', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const baseline = { ...okLoadResult.save, snapshot: journalSnapshotFixture };
    const intent = { saveId: 'save-slot-1', rootSaveId: 'save-slot-1', token: 'held-delete-intent' };
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockResolvedValue({ kind: 'rollback', intent, baseline } as never);
    workerMock.exportSnapshot.mockResolvedValue(journalSnapshotFixture);
    let releaseDelete!: () => void;
    vi.mocked(finishReservedActiveSaveSessionTransition).mockImplementationOnce(
      async (_reservation, commit) => new Promise<void>((resolve, reject) => {
        releaseDelete = () => { void commit().then(resolve, reject); };
      }),
    );

    await act(async () => {
      root.render(<AppBootGate><div>Hidden dashboard</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(useGameStore.getState().isInitialized).toBe(true);
    expect(container.textContent).not.toContain('Hidden dashboard');
    expect(container.textContent).toContain('Reopening the front office');
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();

    await act(async () => {
      releaseDelete();
      await vi.dynamicImportSettled();
      await flushAsync();
    });
    expect(consumeSimAdvanceIntentRollback).toHaveBeenCalledWith(intent);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('not replayed'));
  });

  it('treats route and notice failures after durable rollback as presentation-only', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const baseline = { ...okLoadResult.save, snapshot: journalSnapshotFixture };
    const intent = { saveId: 'save-slot-1', rootSaveId: 'save-slot-1', token: 'presentation-failure-intent' };
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockResolvedValue({ kind: 'rollback', intent, baseline } as never);
    workerMock.exportSnapshot.mockResolvedValue(journalSnapshotFixture);
    let releaseDelete!: () => void;
    vi.mocked(finishReservedActiveSaveSessionTransition).mockImplementationOnce(
      async (_reservation, commit) => new Promise<void>((resolve, reject) => {
        releaseDelete = () => { void commit().then(resolve, reject); };
      }),
    );

    await act(async () => {
      root.render(<AppBootGate><div>Dashboard Route</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });
    window.history.pushState(null, '', '/MBD/other-route');
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new Error('route presentation failed');
    });
    vi.mocked(toast.info).mockImplementationOnce(() => { throw new Error('notice failed'); });

    await act(async () => {
      releaseDelete();
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(consumeSimAdvanceIntentRollback).toHaveBeenCalledWith(intent);
    expect(getBootRecoveryAdmissionStatus()).toEqual({ kind: 'idle' });
    expect(workerMock.restartWorker).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalled();
    replaceState.mockRestore();
  });

  it('preserves journal evidence and fails closed when baseline import fails', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const baseline = { ...okLoadResult.save, snapshot: journalSnapshotFixture };
    const intent = { saveId: 'save-slot-1', rootSaveId: 'save-slot-1', token: 'failed-import-intent' };
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockResolvedValue({ kind: 'rollback', intent, baseline } as never);
    workerMock.importSnapshot.mockResolvedValueOnce({ success: false, error: 'baseline import failed' });

    await act(async () => {
      root.render(<AppBootGate><div>Dashboard Route</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(workerMock.restartWorker).toHaveBeenCalledTimes(2);
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(completeActiveSaveSessionTransition).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Reload required');
    expect(useGameStore.getState().activeSaveId).toBe('save-slot-1');
  });

  it('fails before the durable delete when candidate persistence staging cannot preflight', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const baseline = { ...okLoadResult.save, snapshot: journalSnapshotFixture };
    const intent = { saveId: 'save-slot-1', rootSaveId: 'save-slot-1', token: 'stage-failure-intent' };
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockResolvedValue({ kind: 'rollback', intent, baseline } as never);
    workerMock.exportSnapshot.mockResolvedValue(journalSnapshotFixture);
    vi.mocked(stageActiveSavePersistenceMetadataForTransition).mockImplementationOnce(() => {
      throw new Error('candidate persistence preflight failed');
    });

    await act(async () => {
      root.render(<AppBootGate><div>Hidden dashboard</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(finishReservedActiveSaveSessionTransition).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Reload required');
  });

  it('globally fail-closes malformed journal inspection before candidate worker work', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockRejectedValueOnce(new Error('malformed journal root'));

    await act(async () => {
      root.render(<AppBootGate><div>Hidden dashboard</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(getBootRecoveryAdmissionStatus()).toMatchObject({ kind: 'fail_closed', saveId: 'save-slot-1' });
    expect(workerMock.importSnapshot).not.toHaveBeenCalled();
    expect(workerMock.exportSnapshot).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Reload required');
  });

  it.each([
    ['restored RNG differs', () => ({ ...journalSnapshotFixture, rng: { ...journalSnapshotFixture.rng, seed: journalSnapshotFixture.rng.seed + 1 } })],
    ['rollback consume rejects', () => journalSnapshotFixture],
  ])('preserves journal evidence and fails closed when %s', async (label, exportedSnapshot) => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    const baseline = { ...okLoadResult.save, snapshot: journalSnapshotFixture };
    const intent = { saveId: 'save-slot-1', rootSaveId: 'save-slot-1', token: `failed-${label}` };
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(inspectSimAdvanceIntentForCandidate).mockResolvedValue({ kind: 'rollback', intent, baseline } as never);
    workerMock.exportSnapshot.mockResolvedValue(exportedSnapshot());
    if (label === 'rollback consume rejects') {
      vi.mocked(consumeSimAdvanceIntentRollback).mockRejectedValueOnce(new Error('consume failed'));
    }

    await act(async () => {
      root.render(<AppBootGate><div>Dashboard Route</div></AppBootGate>);
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(completeActiveSaveSessionTransition).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Reload required');
    expect(useGameStore.getState().activeSaveId).toBe('save-slot-1');
    if (label === 'restored RNG differs') {
      expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    } else {
      expect(consumeSimAdvanceIntentRollback).toHaveBeenCalledWith(intent);
    }
  });

  it('renders reload-only fail-closed presentation without starting resume work', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(useSimAdvanceCoordinatorStatus).mockReturnValue({
      kind: 'fail_closed',
      error: new Error('durable publication failed'),
    });
    await act(async () => {
      root.render(<AppBootGate><div>Hidden dashboard</div></AppBootGate>);
      await flushAsync();
    });
    expect(container.textContent).toContain('Reload required');
    expect(container.textContent).not.toContain('Hidden dashboard');
    const dialog = container.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-labelledby')).toBe('simulation-reload-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('simulation-reload-detail');
    expect(resolveSaveSessionTarget).not.toHaveBeenCalled();
    expect(loadSaveSafely).not.toHaveBeenCalled();
    expect(workerMock.exportSnapshot).not.toHaveBeenCalled();
    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'Reload dynasty');
    expect(button).toBeTruthy();
    expect(button?.className).toContain('min-h-11');
    button?.focus();
    expect(document.activeElement).toBe(button);
    expect(useGameStore.getState().activeSaveId).toBe('save-slot-1');
  });

  it('discards an imported candidate before aborting when ownership commit fails', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);
    vi.mocked(commitSaveSessionOwnership).mockRejectedValueOnce(
      new SaveSessionOwnershipError(
        'not_owner',
        'Exclusive ownership ended before activation.',
        'save-slot-1',
      ),
    );

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Dashboard Route</div>
        </AppBootGate>,
      );
      await flushAsync();
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(workerMock.importSnapshot).toHaveBeenCalledWith(okLoadResult.snapshot);
    expect(recoverWorkerAfterCandidateImportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        importSnapshot: workerMock.importSnapshot,
        outgoingSnapshot: null,
        restartWorker: workerMock.restartWorker,
      }),
    );
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(abortActiveSaveSessionTransition).toHaveBeenCalledTimes(1);
    expect(abortSaveSessionOwnership).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(recoverWorkerAfterCandidateImportFailure).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(abortActiveSaveSessionTransition).mock.invocationCallOrder[0]!);
    await act(async () => {
      await vi.dynamicImportSettled();
      await flushAsync();
    });
    expect(container.textContent).toContain('Editing ownership changed');
    expect(container.textContent).toContain('browser did not reject this request');
    expect(container.querySelector('[role="alertdialog"]')?.getAttribute('data-failure-kind')).toBe('ownership_lost');
    expect(container.textContent).not.toContain('Dashboard Route');
  });

  it('clears a missing persisted save id and falls through to children without recovery', async () => {
    useGameStore.getState().setActiveSave('save-slot-404', null);
    vi.mocked(loadSaveSafely).mockResolvedValue({
      ok: false,
      reason: 'storage_failed',
      detail: {
        slotId: 'save-slot-404',
        slotNumber: null,
        message: 'No save record found.',
        rawJson: null,
      },
    });

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Save Hub Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(loadSaveSafely).toHaveBeenCalledWith('save-slot-404');
    expect(useGameStore.getState().activeSaveId).toBeNull();
    expect(useGameStore.getState().activeSaveSlot).toBeNull();
    expect(recoveryMock.showFailure).not.toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(abortActiveSaveSessionTransition).toHaveBeenCalled();
    expect(abortSaveSessionOwnership).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalled();
    expect(container.textContent).toContain('Save Hub Route');
  });

  it('hands corrupt persisted saves to Save Recovery and clears the stale active id', async () => {
    const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
      ok: false,
      reason: 'zod',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Snapshot payload is invalid.',
        rawJson: '{"id":"save-slot-1"}',
      },
    };
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely).mockResolvedValue(failure);

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Save Hub Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(recoveryMock.showFailure).toHaveBeenCalledWith(expect.objectContaining({
      failure,
      onRetry: expect.any(Function),
    }));
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(abortActiveSaveSessionTransition).toHaveBeenCalled();
    expect(abortSaveSessionOwnership).toHaveBeenCalled();
    expect(useGameStore.getState().activeSaveId).toBeNull();
    expect(container.textContent).toContain('Save Hub Route');
  });

  it('restores an integrity failure through the persistence boundary before ordinary retry', async () => {
    const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
      ok: false,
      reason: 'integrity_failed',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'The primary checksum does not match.',
        rawJson: '{"id":"save-slot-1"}',
        integrityFailureKind: 'mismatch',
        repairAvailable: true,
        repairUpdatedAt: okLoadResult.save.updatedAt,
      },
    };
    window.history.replaceState(null, '', '/MBD/players/player-42');
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely)
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(okLoadResult);
    vi.mocked(restoreInactiveSaveIntegrityBackup).mockResolvedValue(okLoadResult.save);

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Recovered Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    const actions = recoveryMock.showFailure.mock.calls[0]?.[0] as {
      onRepair: () => Promise<boolean>;
      onRetry: () => Promise<boolean>;
    };
    expect(actions.onRepair).toEqual(expect.any(Function));
    expect(actions.onRetry).toEqual(expect.any(Function));

    await expect(actions.onRepair()).resolves.toBe(true);
    expect(restoreInactiveSaveIntegrityBackup).toHaveBeenCalledWith('save-slot-1');

    // A failed protected-route boot redirects to the Save Hub while the
    // recovery dialog remains open. Successful retry must restore the route
    // the player was using before that redirect.
    window.history.replaceState(null, '', '/MBD/');

    await act(async () => {
      await expect(actions.onRetry()).resolves.toBe(true);
      await flushAsync();
    });
    expect(loadSaveSafely).toHaveBeenLastCalledWith('save-slot-1');
    expect(workerMock.importSnapshot).toHaveBeenCalledWith(okLoadResult.snapshot);
    expect(activateActiveSavePersistenceMetadata).toHaveBeenCalledWith(okLoadResult.save);
    expect(useGameStore.getState().activeSaveId).toBe('save-slot-1');
    expect(window.location.pathname).toBe('/MBD/players/player-42');
  });

  it('does not auto-load when there is no persisted active save id', async () => {
    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Save Hub Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });

    expect(loadSaveSafely).not.toHaveBeenCalled();
    expect(workerMock.importSnapshot).not.toHaveBeenCalled();
    expect(beginSaveSessionOwnership).not.toHaveBeenCalled();
    expect(prepareActiveSaveSessionTransition).not.toHaveBeenCalled();
    expect(activateActiveSavePersistenceMetadata).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Save Hub Route');
  });

  it('blocks a contending tab before load/import without clearing the shared target, then retries fresh', async () => {
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(beginSaveSessionOwnership)
      .mockRejectedValueOnce(new SaveSessionOwnershipError(
        'contended',
        'This dynasty is already open.',
        'save-slot-1',
      ));
    vi.mocked(loadSaveSafely).mockResolvedValue(okLoadResult);

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Dashboard Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });
    await act(async () => {
      await vi.dynamicImportSettled();
      await flushAsync();
    });

    expect(container.textContent).toContain('Dynasty already open');
    expect(container.textContent).toContain('Tycoons Year 4');
    expect(loadSaveSafely).not.toHaveBeenCalled();
    expect(workerMock.importSnapshot).not.toHaveBeenCalled();
    expect(useGameStore.getState().activeSaveId).toBe('save-slot-1');

    const checkAgain = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Check again'));
    expect(checkAgain).toBeDefined();
    await act(async () => {
      checkAgain?.click();
      await flushAsync();
      await flushAsync();
    });

    expect(loadSaveSafely).toHaveBeenCalledWith('save-slot-1');
    expect(workerMock.importSnapshot).toHaveBeenCalledWith(okLoadResult.snapshot);
    expect(container.textContent).toContain('Dashboard Route');
    expect(useGameStore.getState().activeSaveId).toBe('save-slot-1');
  });

  it('supersedes recovery after a contended recovery retry later acquires ownership', async () => {
    const failure: Extract<LoadSaveSafelyResult, { ok: false }> = {
      ok: false,
      reason: 'zod',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Snapshot payload is invalid.',
        rawJson: '{"id":"save-slot-1"}',
      },
    };
    useGameStore.getState().setActiveSave('save-slot-1', 1);
    vi.mocked(loadSaveSafely)
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(okLoadResult);

    await act(async () => {
      root.render(
        <AppBootGate>
          <div>Dashboard Route</div>
        </AppBootGate>,
      );
      await flushAsync();
    });
    const retry = recoveryMock.showFailure.mock.calls[0]?.[0]?.onRetry as
      | (() => Promise<boolean>)
      | undefined;
    expect(retry).toEqual(expect.any(Function));
    vi.mocked(beginSaveSessionOwnership).mockRejectedValueOnce(
      new SaveSessionOwnershipError(
        'contended',
        'This dynasty is already open.',
        'save-slot-1',
      ),
    );

    await act(async () => {
      await expect(retry!()).resolves.toBe(false);
      await vi.dynamicImportSettled();
      await flushAsync();
    });
    const checkAgain = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Check again'));
    expect(checkAgain).toBeDefined();

    await act(async () => {
      checkAgain?.click();
      await flushAsync();
      await flushAsync();
    });

    expect(recoveryMock.close).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Dashboard Route');
    expect(container.textContent).not.toContain('Dynasty already open');
  });
});
