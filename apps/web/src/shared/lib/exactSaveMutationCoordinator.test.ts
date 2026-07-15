// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import v34SnapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';

const mocks = vi.hoisted(() => ({
  beginPersistenceLease: vi.fn(),
  capture: vi.fn(),
  wait: vi.fn(),
  finishPersistenceLease: vi.fn(),
  abortPersistenceLease: vi.fn(),
  poisonPersistenceLease: vi.fn(),
  closePersistenceLease: vi.fn(),
  isDurable: vi.fn(),
  resolveTarget: vi.fn(),
  assertActive: vi.fn(),
  assertTree: vi.fn(),
}));

vi.mock('./activeSavePersistence', () => ({
  beginExactSaveMutationPersistenceLease: mocks.beginPersistenceLease,
  captureExactSaveMutationSnapshot: mocks.capture,
  waitForExactSaveMutationPersistenceReceipt: mocks.wait,
  finishExactSaveMutationPersistenceLease: mocks.finishPersistenceLease,
  abortExactSaveMutationPersistenceLease: mocks.abortPersistenceLease,
  poisonExactSaveMutationPersistenceLease: mocks.poisonPersistenceLease,
  closeCommittedExactSaveMutationPersistenceLeaseFailClosed: mocks.closePersistenceLease,
  isActiveSavePersistenceReceiptDurable: mocks.isDurable,
}));

vi.mock('./saveSystem', () => ({
  resolveSaveSessionTarget: mocks.resolveTarget,
}));

vi.mock('./saveSessionOwnership', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./saveSessionOwnership')>();
  return {
    ...actual,
    assertActiveSaveSessionOwned: mocks.assertActive,
    assertSaveTreeSessionOwned: mocks.assertTree,
  };
});

import {
  didFlowAwareExactMutationChange,
  executeExactSaveMutation,
  getExactSaveMutationStatus,
  resetExactSaveMutationCoordinatorForTesting,
} from './exactSaveMutationCoordinator';
import {
  beginWorkerMutation,
  getWorkerMutationPauseSnapshot,
  resetWorkerMutationSessionForTesting,
  type ExactSaveMutationWorkerSession,
} from './workerMutationSession';

const receipt = { saveId: 'save-slot-1', generation: 2 } as never;
const persistenceLease = {
  saveId: 'save-slot-1',
  rootSaveId: 'save-slot-1',
  leaseId: Symbol('exact-save-persistence'),
} as never;

function worker(overrides: Record<string, unknown> = {}) {
  return {
    exportSnapshot: vi.fn()
      .mockResolvedValueOnce(structuredClone(v34SnapshotFixture))
      .mockResolvedValueOnce({ ...structuredClone(v34SnapshotFixture), day: 2 }),
    execute: vi.fn().mockResolvedValue({ currentPhase: 'arbitration', phaseDay: 2 }),
    restoreBaseline: vi.fn().mockResolvedValue({
      importResult: { success: true },
      restoredSnapshot: structuredClone(v34SnapshotFixture),
    }),
    publishFlow: vi.fn(),
    discardFlow: vi.fn(),
    ...overrides,
  };
}

function options(exactWorker: ReturnType<typeof worker>) {
  return {
    saveId: 'save-slot-1',
    gmName: 'Test GM',
    teamName: 'Tycoons',
    season: 1,
    operation: 'advanceOffseason' as const,
    worker: exactWorker,
    failClosed: vi.fn(),
  };
}

beforeEach(() => {
  mocks.assertActive.mockImplementation(() => undefined);
  mocks.assertTree.mockImplementation(() => undefined);
  mocks.resolveTarget.mockResolvedValue({
    saveId: 'save-slot-1',
    rootSaveId: 'save-slot-1',
    slotNumber: 1,
    name: 'Test Dynasty',
  });
  mocks.beginPersistenceLease.mockResolvedValue(persistenceLease);
  mocks.capture.mockImplementation(async (_lease, capture) => {
    await capture.exportSnapshot();
    return receipt;
  });
  mocks.wait.mockResolvedValue({ kind: 'durable', record: {} });
  mocks.isDurable.mockReturnValue(true);
});

afterEach(() => {
  resetExactSaveMutationCoordinatorForTesting();
  resetWorkerMutationSessionForTesting();
  vi.clearAllMocks();
});

describe('exact-save mutation coordinator', () => {
  it('admits only one callback before asynchronous target resolution completes', async () => {
    let resolveTarget!: (value: {
      saveId: string;
      rootSaveId: string;
      slotNumber: number;
      name: string;
    }) => void;
    mocks.resolveTarget.mockReturnValueOnce(new Promise((resolve) => { resolveTarget = resolve; }));
    const exactWorker = worker();
    const first = executeExactSaveMutation(options(exactWorker));

    expect(getExactSaveMutationStatus()).toEqual({ kind: 'running' });
    await expect(executeExactSaveMutation(options(exactWorker))).resolves.toMatchObject({
      kind: 'blocked',
    });
    expect(mocks.resolveTarget).toHaveBeenCalledTimes(1);
    expect(exactWorker.execute).not.toHaveBeenCalled();

    resolveTarget({
      saveId: 'save-slot-1',
      rootSaveId: 'save-slot-1',
      slotNumber: 1,
      name: 'Test Dynasty',
    });
    await expect(first).resolves.toMatchObject({ kind: 'durable' });
    expect(exactWorker.execute).toHaveBeenCalledTimes(1);
  });

  it('publishes only after the exact retained post snapshot is durable', async () => {
    const exactWorker = worker();
    const outcome = await executeExactSaveMutation(options(exactWorker));

    expect(outcome).toMatchObject({ kind: 'durable', result: { currentPhase: 'arbitration' } });
    expect(exactWorker.execute).toHaveBeenCalledTimes(1);
    expect(exactWorker.exportSnapshot).toHaveBeenCalledTimes(2);
    expect(exactWorker.publishFlow).toHaveBeenCalledTimes(1);
    expect(mocks.beginPersistenceLease).toHaveBeenCalledWith('save-slot-1', 'save-slot-1');
    expect(mocks.capture).toHaveBeenCalledTimes(1);
    expect(mocks.capture.mock.calls[0]?.[1]).toMatchObject({ activeSaveSlot: 1 });
    expect(mocks.wait).toHaveBeenCalledWith(receipt);
    expect(mocks.finishPersistenceLease).toHaveBeenCalledWith(persistenceLease, receipt);
    expect(getExactSaveMutationStatus()).toEqual({ kind: 'idle' });
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
  });

  it('releases an exact no-change result without accepting a persistence receipt', async () => {
    const exactWorker = worker({
      exportSnapshot: vi.fn()
        .mockResolvedValueOnce(structuredClone(v34SnapshotFixture))
        .mockResolvedValueOnce(structuredClone(v34SnapshotFixture)),
      execute: vi.fn().mockResolvedValue({ success: false, flowStateChanged: false }),
    });
    const runOptions = {
      ...options(exactWorker),
      didChange: (result: { flowStateChanged: boolean }) => result.flowStateChanged,
    };

    await expect(executeExactSaveMutation(runOptions)).resolves.toMatchObject({
      kind: 'unchanged',
      result: { success: false },
    });
    expect(exactWorker.discardFlow).toHaveBeenCalledTimes(1);
    expect(exactWorker.publishFlow).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.abortPersistenceLease).toHaveBeenCalledWith(persistenceLease);
    expect(getExactSaveMutationStatus()).toEqual({ kind: 'idle' });
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
  });

  it('treats a hostile offseason transition result as unchanged without capture or publication', async () => {
    const blockedView = {
      currentPhase: 'draft',
      phaseDay: 3,
      flowStateChanged: false,
      error: 'Qualifying-offer compensation state is inconsistent.',
    };
    const exactWorker = worker({
      exportSnapshot: vi.fn()
        .mockResolvedValueOnce(structuredClone(v34SnapshotFixture))
        .mockResolvedValueOnce(structuredClone(v34SnapshotFixture)),
      execute: vi.fn().mockResolvedValue(blockedView),
    });

    await expect(executeExactSaveMutation({
      ...options(exactWorker),
      operation: 'skipOffseasonPhase',
      didChange: didFlowAwareExactMutationChange,
    })).resolves.toMatchObject({ kind: 'unchanged', result: blockedView });
    expect(exactWorker.discardFlow).toHaveBeenCalledTimes(1);
    expect(exactWorker.publishFlow).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.abortPersistenceLease).toHaveBeenCalledWith(persistenceLease);
  });

  it('derives branch persistence metadata from the resolved save target, never the UI mirror', async () => {
    mocks.resolveTarget.mockResolvedValue({
      saveId: 'save-slot-1',
      rootSaveId: 'root-slot-1',
      slotNumber: 7,
      name: 'Branch Dynasty',
    });
    const exactWorker = worker();

    await expect(executeExactSaveMutation(options(exactWorker))).resolves.toMatchObject({ kind: 'durable' });

    expect(mocks.beginPersistenceLease).toHaveBeenCalledWith('save-slot-1', 'root-slot-1');
    expect(mocks.capture.mock.calls[0]?.[1]).toMatchObject({ activeSaveSlot: null });
  });

  it('keeps every mutation lane fenced while a failed write retries the same accepted snapshot', async () => {
    let settleReceipt!: (value: { kind: 'durable'; record: object }) => void;
    mocks.wait.mockReturnValue(new Promise((resolve) => { settleReceipt = resolve; }));
    const exactWorker = worker();
    const pending = executeExactSaveMutation(options(exactWorker));

    await vi.waitFor(() => expect(mocks.wait).toHaveBeenCalledWith(receipt));
    expect(getExactSaveMutationStatus()).toEqual({ kind: 'persisting' });
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    expect(exactWorker.execute).toHaveBeenCalledTimes(1);
    expect(exactWorker.exportSnapshot).toHaveBeenCalledTimes(2);

    settleReceipt({ kind: 'durable', record: {} });
    await expect(pending).resolves.toMatchObject({ kind: 'durable' });
    expect(exactWorker.execute).toHaveBeenCalledTimes(1);
    expect(exactWorker.exportSnapshot).toHaveBeenCalledTimes(2);
  });

  it('restores the exact baseline when post export fails before receipt acceptance', async () => {
    const exactWorker = worker({
      exportSnapshot: vi.fn()
        .mockResolvedValueOnce(structuredClone(v34SnapshotFixture))
        .mockRejectedValueOnce(new Error('post export failed')),
    });

    const outcome = await executeExactSaveMutation(options(exactWorker));

    expect(outcome).toMatchObject({ kind: 'rolled_back' });
    expect(exactWorker.restoreBaseline).toHaveBeenCalledWith(
      expect.any(Object) as ExactSaveMutationWorkerSession,
      v34SnapshotFixture,
    );
    expect(exactWorker.publishFlow).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(mocks.abortPersistenceLease).toHaveBeenCalledWith(persistenceLease);
    expect(getWorkerMutationPauseSnapshot()).toBe(false);
  });

  it('fails closed when an accepted receipt is retired instead of becoming durable', async () => {
    mocks.wait.mockResolvedValue({ kind: 'retired', reason: 'ownership_lost' });
    mocks.isDurable.mockReturnValue(false);
    const exactWorker = worker();
    const runOptions = options(exactWorker);

    const outcome = await executeExactSaveMutation(runOptions);

    expect(outcome).toMatchObject({ kind: 'reload_required' });
    expect(runOptions.failClosed).toHaveBeenCalledTimes(1);
    expect(exactWorker.publishFlow).not.toHaveBeenCalled();
    expect(getExactSaveMutationStatus().kind).toBe('fail_closed');
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    expect(mocks.poisonPersistenceLease).toHaveBeenCalledWith(persistenceLease);
  });

  it('fails closed when exact save authority is lost after receipt acceptance', async () => {
    mocks.wait.mockImplementation(async () => {
      mocks.assertActive.mockImplementation(() => {
        throw new Error('The active save session is no longer owned.');
      });
      return { kind: 'durable', record: {} };
    });
    const exactWorker = worker();
    const runOptions = options(exactWorker);

    const outcome = await executeExactSaveMutation(runOptions);

    expect(outcome).toMatchObject({ kind: 'reload_required' });
    expect(runOptions.failClosed).toHaveBeenCalledTimes(1);
    expect(exactWorker.publishFlow).not.toHaveBeenCalled();
    expect(getExactSaveMutationStatus().kind).toBe('fail_closed');
    expect(getWorkerMutationPauseSnapshot()).toBe(true);
    expect(() => beginWorkerMutation('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    expect(mocks.closePersistenceLease).toHaveBeenCalledWith(persistenceLease, receipt);
  });
});
