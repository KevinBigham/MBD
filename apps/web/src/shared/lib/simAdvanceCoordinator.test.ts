import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGameSnapshot } from '@mbd/contracts';
import snapshotFixture from '../../../../../packages/contracts/tests/fixtures/save/v34/core.json';

const target = {
  saveId: 'save-slot-1', rootSaveId: 'save-slot-1', slotNumber: 1, name: 'Dynasty',
};
const lease = {
  leaseId: Symbol('lease'), saveId: 'save-slot-1', rootSaveId: 'save-slot-1',
};
const session = {
  sessionId: Symbol('session'), expectedSaveId: 'save-slot-1', expectedRootSaveId: 'save-slot-1',
};
const intent = {
  saveId: 'save-slot-1', rootSaveId: 'save-slot-1', operation: 'sim_day', attempt: 1,
};
let baseline = parseGameSnapshot(snapshotFixture);
let post = parseGameSnapshot({ ...baseline, day: baseline.day + 1 });
let readyProof: object;
let sealProof: object;
let persistenceStatus: { state: string; recovery: { phase: string } | null };
let persistenceListener: (() => void) | null = null;
const unsubscribePersistence = vi.fn();
const sealReceipt = { generation: 1, saveId: 'save-slot-1' };
const postReceipt = { generation: 2, saveId: 'save-slot-1' };
const reassessmentFailure = new Error('reassess failed');
const preparedIntentFailure = new Error('intent failed');

vi.mock('./saveSessionOwnership', () => ({
  assertActiveSaveSessionOwned: vi.fn(),
  assertSaveTreeSessionOwned: vi.fn(),
}));
vi.mock('./saveSystem', () => ({
  isJournalSimAdvancePhase: (phase: unknown) => phase === 'preseason' || phase === 'regular',
  resolveSaveSessionTarget: vi.fn(),
  assessSimAdvanceBaseline: vi.fn(),
  prepareSimAdvanceIntent: vi.fn(),
  consumeSimAdvanceIntentRollback: vi.fn(),
}));
vi.mock('./activeSavePersistence', () => ({
  SimAdvancePersistenceAdmissionBlockedError: class SimAdvancePersistenceAdmissionBlockedError extends Error {},
  beginSimAdvancePersistenceLease: vi.fn(),
  captureSimAdvanceBaselineSeal: vi.fn(),
  captureSimAdvanceSnapshot: vi.fn(),
  closeCommittedSimAdvancePersistenceLeaseFailClosed: vi.fn(),
  finishSimAdvancePersistenceLease: vi.fn(),
  getActiveSavePersistenceStatus: vi.fn(() => persistenceStatus),
  isActiveSavePersistenceReceiptDurable: vi.fn(() => true),
  poisonSimAdvancePersistenceLease: vi.fn(),
  subscribeToActiveSavePersistenceStatus: vi.fn((listener: () => void) => {
    persistenceListener = listener;
    return unsubscribePersistence;
  }),
  waitForActiveSavePersistenceReceipt: vi.fn(),
}));
vi.mock('./workerMutationSession', () => ({
  assertSimAdvanceWorkerSessionAdmissionAvailable: vi.fn(),
  assertSimAdvanceWorkerSessionCurrent: vi.fn(),
  beginSimAdvanceWorkerSession: vi.fn(),
  createSimAdvanceWorkerAuthorization: vi.fn(),
  finishSimAdvanceWorkerSession: vi.fn(),
}));

import {
  executeSimAdvance,
  getSimAdvanceCoordinatorStatus,
  resetSimAdvanceCoordinatorForTesting,
  subscribeToSimAdvanceCoordinator,
} from './simAdvanceCoordinator';
import {
  assessSimAdvanceBaseline,
  consumeSimAdvanceIntentRollback,
  prepareSimAdvanceIntent,
  resolveSaveSessionTarget,
  type SimAdvanceOperation,
} from './saveSystem';
import {
  beginSimAdvancePersistenceLease,
  captureSimAdvanceBaselineSeal,
  captureSimAdvanceSnapshot,
  closeCommittedSimAdvancePersistenceLeaseFailClosed,
  finishSimAdvancePersistenceLease,
  getActiveSavePersistenceStatus,
  isActiveSavePersistenceReceiptDurable,
  poisonSimAdvancePersistenceLease,
  subscribeToActiveSavePersistenceStatus,
  SimAdvancePersistenceAdmissionBlockedError,
  waitForActiveSavePersistenceReceipt,
} from './activeSavePersistence';
import {
  assertSimAdvanceWorkerSessionAdmissionAvailable,
  assertSimAdvanceWorkerSessionCurrent,
  beginSimAdvanceWorkerSession,
  createSimAdvanceWorkerAuthorization,
  finishSimAdvanceWorkerSession,
} from './workerMutationSession';
import { assertActiveSaveSessionOwned, assertSaveTreeSessionOwned } from './saveSessionOwnership';

function worker(overrides: Record<string, unknown> = {}) {
  return {
    exportSnapshot: vi.fn().mockResolvedValueOnce(baseline).mockResolvedValueOnce(post),
    execute: vi.fn().mockResolvedValue({ result: { day: post.day }, flowStateChanged: true }),
    publishFlow: vi.fn(),
    discardFlow: vi.fn(),
    restoreBaseline: vi.fn().mockResolvedValue({ importResult: { success: true }, restoredSnapshot: baseline }),
    ...overrides,
  };
}

function options(
  currentWorker: ReturnType<typeof worker>,
  operation: SimAdvanceOperation = 'sim_day',
) {
  return {
    saveId: target.saveId,
    operation,
    worker: currentWorker,
    publishDurable: vi.fn(),
    failClosed: vi.fn(),
  };
}

function configureDefaults(): void {
  persistenceStatus = { state: 'saving', recovery: null };
  persistenceListener = null;
  vi.mocked(resolveSaveSessionTarget).mockResolvedValue(target as never);
  vi.mocked(assessSimAdvanceBaseline).mockResolvedValue({ kind: 'ready', proof: readyProof } as never);
  vi.mocked(prepareSimAdvanceIntent).mockResolvedValue(intent as never);
  vi.mocked(consumeSimAdvanceIntentRollback).mockResolvedValue(undefined);
  vi.mocked(assertSimAdvanceWorkerSessionAdmissionAvailable).mockReturnValue(undefined);
  vi.mocked(beginSimAdvanceWorkerSession).mockReturnValue(session as never);
  vi.mocked(createSimAdvanceWorkerAuthorization).mockReturnValue({ authorizationId: Symbol('authorization') } as never);
  vi.mocked(finishSimAdvanceWorkerSession).mockImplementation((_session, beforeRelease) => {
    beforeRelease?.();
  });
  vi.mocked(beginSimAdvancePersistenceLease).mockResolvedValue(lease as never);
  vi.mocked(captureSimAdvanceBaselineSeal).mockImplementation(async (_lease, _proof, capture) => {
    await capture.exportSnapshot();
    return sealReceipt as never;
  });
  vi.mocked(captureSimAdvanceSnapshot).mockImplementation(async (_lease, _intent, capture) => {
    expect(await capture.exportSnapshot()).toBe(post);
    return postReceipt as never;
  });
  vi.mocked(waitForActiveSavePersistenceReceipt).mockResolvedValue({ kind: 'durable', record: { id: target.saveId } } as never);
  vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(true);
  vi.mocked(getActiveSavePersistenceStatus).mockImplementation(() => persistenceStatus as never);
  vi.mocked(subscribeToActiveSavePersistenceStatus).mockImplementation((listener) => {
    persistenceListener = listener;
    return unsubscribePersistence;
  });
}

describe('simAdvanceCoordinator', () => {
  beforeEach(() => {
    resetSimAdvanceCoordinatorForTesting();
    vi.resetAllMocks();
    baseline = parseGameSnapshot(snapshotFixture);
    post = parseGameSnapshot({ ...baseline, day: baseline.day + 1 });
    readyProof = {
      saveId: target.saveId,
      rootSaveId: target.rootSaveId,
      baseline: { season: baseline.season, name: 'Exact durable baseline name' },
      workerSnapshot: baseline,
    };
    sealProof = {
      saveId: target.saveId,
      rootSaveId: target.rootSaveId,
      baseline: { season: baseline.season, name: 'Exact durable baseline name' },
      workerSnapshot: baseline,
    };
    configureDefaults();
  });

  afterEach(() => resetSimAdvanceCoordinatorForTesting());

  it.each([
    ['sim_day', 'simDay'],
    ['sim_week', 'simWeek'],
    ['sim_month', 'simMonth'],
    ['sim_to_playoffs', 'simToPlayoffs'],
  ] as const)('runs ready %s exactly once after its durable intent and publishes only after post durability', async (operation, workerOperation) => {
    const order: string[] = [];
    let releaseIntent!: () => void;
    vi.mocked(prepareSimAdvanceIntent).mockImplementationOnce(async () => {
      order.push('intent');
      await new Promise<void>((resolve) => { releaseIntent = resolve; });
      return intent as never;
    });
    const currentWorker = worker({
      execute: vi.fn(async (_session, _authorization, op) => {
        order.push(`execute:${op}`);
        return { result: { day: post.day }, flowStateChanged: true };
      }),
    });
    const run = options(currentWorker, operation);
    run.publishDurable.mockImplementation(() => { order.push('publish'); });
    currentWorker.publishFlow.mockImplementation(() => { order.push('flow'); });
    vi.mocked(finishSimAdvancePersistenceLease).mockImplementation(() => { order.push('persistence'); });
    vi.mocked(finishSimAdvanceWorkerSession).mockImplementation((_session, beforeRelease) => {
      order.push('worker:begin-release');
      beforeRelease?.();
      order.push('worker:released');
    });
    const pending = executeSimAdvance(run);
    await vi.waitFor(() => expect(order).toEqual(['intent']));
    expect(currentWorker.execute).not.toHaveBeenCalled();
    releaseIntent();

    await expect(pending).resolves.toEqual({ kind: 'durable' });
    expect(order).toEqual([
      'intent', `execute:${workerOperation}`, 'publish', 'flow',
      'worker:begin-release', 'persistence', 'worker:released',
    ]);
    expect(captureSimAdvanceSnapshot).toHaveBeenCalledWith(
      lease,
      intent,
      expect.objectContaining({ saveName: 'Exact durable baseline name' }),
    );
    expect(run.publishDurable).toHaveBeenCalledTimes(1);
    expect(currentWorker.publishFlow).toHaveBeenCalledTimes(1);
    expect(assertActiveSaveSessionOwned).toHaveBeenCalledWith(target.saveId);
    expect(assertSaveTreeSessionOwned).toHaveBeenCalledWith(target.rootSaveId);
    expect(assertSimAdvanceWorkerSessionCurrent).toHaveBeenCalledWith(session, target.saveId, target.rootSaveId);
  });

  it('rejects a duplicate command before any second worker or storage side effect', async () => {
    let settle!: (outcome: object) => void;
    vi.mocked(waitForActiveSavePersistenceReceipt).mockImplementationOnce((receivedReceipt) => {
      expect(receivedReceipt).toBe(postReceipt);
      return new Promise((resolve) => { settle = resolve; }) as never;
    });
    const currentWorker = worker();
    const first = executeSimAdvance(options(currentWorker));
    await vi.waitFor(() => expect(captureSimAdvanceSnapshot).toHaveBeenCalledTimes(1));
    await expect(executeSimAdvance(options(worker()))).rejects.toThrow('already active');
    expect(beginSimAdvanceWorkerSession).toHaveBeenCalledTimes(1);
    settle({ kind: 'durable', record: { id: target.saveId } });
    await first;
  });

  it('blocks an active ordinary worker permit before publishing coordinator work', async () => {
    const blocked = new Error('ordinary worker permit is active');
    vi.mocked(assertSimAdvanceWorkerSessionAdmissionAvailable).mockImplementationOnce(() => {
      throw blocked;
    });
    const observer = vi.fn();
    const unsubscribe = subscribeToSimAdvanceCoordinator(observer);
    const currentWorker = worker();
    const run = options(currentWorker);

    await expect(executeSimAdvance(run)).resolves.toEqual({ kind: 'blocked', error: blocked });

    expect(observer).not.toHaveBeenCalled();
    expect(resolveSaveSessionTarget).not.toHaveBeenCalled();
    expect(beginSimAdvanceWorkerSession).not.toHaveBeenCalled();
    expect(beginSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(currentWorker.exportSnapshot).not.toHaveBeenCalled();
    expect(run.failClosed).not.toHaveBeenCalled();
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'idle' });
    unsubscribe();
  });

  it.each(['recovering', 'fail_closed'])('keeps coordinator idle before resolution when boot admission is %s', async (bootState) => {
    const blocked = new Error(`Boot recovery is active: ${bootState}`);
    vi.mocked(assertSimAdvanceWorkerSessionAdmissionAvailable).mockImplementationOnce(() => { throw blocked; });
    const currentWorker = worker();

    await expect(executeSimAdvance(options(currentWorker))).resolves.toEqual({ kind: 'blocked', error: blocked });
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'idle' });
    expect(resolveSaveSessionTarget).not.toHaveBeenCalled();
    expect(beginSimAdvanceWorkerSession).not.toHaveBeenCalled();
    expect(beginSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(currentWorker.exportSnapshot).not.toHaveBeenCalled();
  });

  it('returns to idle without fail-closing a newer save when persistence admission is cleanly blocked', async () => {
    const blocked = new SimAdvancePersistenceAdmissionBlockedError('ordinary recovery is still retained');
    vi.mocked(beginSimAdvancePersistenceLease).mockRejectedValueOnce(blocked);
    const currentWorker = worker();
    const run = options(currentWorker);

    await expect(executeSimAdvance(run)).resolves.toEqual({ kind: 'blocked', error: blocked });
    expect(currentWorker.exportSnapshot).not.toHaveBeenCalled();
    expect(assessSimAdvanceBaseline).not.toHaveBeenCalled();
    expect(prepareSimAdvanceIntent).not.toHaveBeenCalled();
    expect(currentWorker.execute).not.toHaveBeenCalled();
    expect(run.failClosed).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).toHaveBeenCalledWith(session);
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'idle' });
  });

  it.each(['ready', 'seal_required'] as const)(
    'releases both exact lanes without journal side effects when authoritative %s proof is postseason',
    async (assessmentKind) => {
      baseline = parseGameSnapshot({ ...baseline, phase: 'playoffs' });
      readyProof = {
        saveId: target.saveId,
        rootSaveId: target.rootSaveId,
        baseline: { season: baseline.season, name: 'Postseason baseline' },
        workerSnapshot: baseline,
      };
      vi.mocked(assessSimAdvanceBaseline).mockResolvedValueOnce({ kind: assessmentKind, proof: readyProof } as never);
      const events: string[] = [];
      vi.mocked(finishSimAdvancePersistenceLease).mockImplementation(() => { events.push('persistence'); });
      vi.mocked(finishSimAdvanceWorkerSession).mockImplementation((_session, beforeRelease) => {
        events.push('worker:begin-release');
        beforeRelease?.();
        events.push('worker:released');
      });
      const currentWorker = worker({
        exportSnapshot: vi.fn().mockResolvedValue(baseline),
        discardFlow: vi.fn(() => { events.push('discard'); }),
      });
      const run = options(currentWorker);

      await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'blocked' });

      expect(events).toEqual(['discard', 'worker:begin-release', 'persistence', 'worker:released']);
      expect(captureSimAdvanceBaselineSeal).not.toHaveBeenCalled();
      expect(prepareSimAdvanceIntent).not.toHaveBeenCalled();
      expect(createSimAdvanceWorkerAuthorization).not.toHaveBeenCalled();
      expect(currentWorker.execute).not.toHaveBeenCalled();
      expect(captureSimAdvanceSnapshot).not.toHaveBeenCalled();
      expect(run.publishDurable).not.toHaveBeenCalled();
      expect(run.failClosed).not.toHaveBeenCalled();
      expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'idle' });
    },
  );

  it.each(['discard', 'release'] as const)(
    'fails closed if non-journal %s cannot retire both exact lanes coherently',
    async (failurePoint) => {
      baseline = parseGameSnapshot({ ...baseline, phase: 'offseason' });
      readyProof = {
        saveId: target.saveId,
        rootSaveId: target.rootSaveId,
        baseline: { season: baseline.season, name: 'Offseason baseline' },
        workerSnapshot: baseline,
      };
      vi.mocked(assessSimAdvanceBaseline).mockResolvedValueOnce({ kind: 'ready', proof: readyProof } as never);
      if (failurePoint === 'release') {
        vi.mocked(finishSimAdvanceWorkerSession).mockImplementationOnce(() => { throw new Error('release failed'); });
      }
      const currentWorker = worker({
        exportSnapshot: vi.fn().mockResolvedValue(baseline),
        discardFlow: failurePoint === 'discard'
          ? vi.fn(() => { throw new Error('discard failed'); })
          : vi.fn(),
      });
      const run = options(currentWorker);

      await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
      expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
      expect(run.failClosed).toHaveBeenCalledTimes(1);
      expect(prepareSimAdvanceIntent).not.toHaveBeenCalled();
      expect(currentWorker.execute).not.toHaveBeenCalled();
      expect(getSimAdvanceCoordinatorStatus().kind).toBe('fail_closed');
    },
  );

  it('allows a journalled regular advance to durably finish in playoffs', async () => {
    baseline = parseGameSnapshot({ ...baseline, phase: 'regular' });
    post = parseGameSnapshot({ ...baseline, day: baseline.day + 1, phase: 'playoffs' });
    readyProof = {
      saveId: target.saveId,
      rootSaveId: target.rootSaveId,
      baseline: { season: baseline.season, name: 'Regular baseline' },
      workerSnapshot: baseline,
    };
    vi.mocked(assessSimAdvanceBaseline).mockResolvedValueOnce({ kind: 'ready', proof: readyProof } as never);
    const currentWorker = worker({
      exportSnapshot: vi.fn().mockResolvedValueOnce(baseline).mockResolvedValueOnce(post),
      execute: vi.fn().mockResolvedValue({ result: { day: post.day, phase: 'playoffs' }, flowStateChanged: true }),
    });
    const run = options(currentWorker);

    await expect(executeSimAdvance(run)).resolves.toEqual({ kind: 'durable' });
    expect(prepareSimAdvanceIntent).toHaveBeenCalledTimes(1);
    expect(captureSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
    expect(run.publishDurable).toHaveBeenCalledWith(expect.objectContaining({ phase: 'playoffs' }));
    expect(currentWorker.publishFlow).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['resolution', () => vi.mocked(resolveSaveSessionTarget).mockResolvedValueOnce(null), false],
    ['initial active authority', () => vi.mocked(assertActiveSaveSessionOwned).mockImplementationOnce(() => { throw new Error('initial ownership lost'); }), false],
    ['worker-session admission', () => vi.mocked(beginSimAdvanceWorkerSession).mockImplementationOnce(() => { throw new Error('worker admission blocked'); }), false],
    ['authority after worker-session acquisition', () => {
      let calls = 0;
      vi.mocked(assertActiveSaveSessionOwned).mockImplementation(() => {
        calls += 1;
        if (calls === 2) throw new Error('ownership lost after worker session');
      });
    }, true],
    ['typed persistence admission', () => vi.mocked(beginSimAdvancePersistenceLease)
      .mockRejectedValueOnce(new SimAdvancePersistenceAdmissionBlockedError('ordinary recovery retained')), true],
  ] as const)('keeps clean pre-lease %s failure idle without export, journal, gameplay, or failClosed', async (_label, arrange, sessionWasAcquired) => {
    arrange();
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'blocked' });
    expect(currentWorker.exportSnapshot).not.toHaveBeenCalled();
    expect(assessSimAdvanceBaseline).not.toHaveBeenCalled();
    expect(prepareSimAdvanceIntent).not.toHaveBeenCalled();
    expect(currentWorker.execute).not.toHaveBeenCalled();
    expect(run.failClosed).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).toHaveBeenCalledTimes(sessionWasAcquired ? 1 : 0);
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'idle' });
  });

  it('leaves a stale receipt-status listener from run A unable to overwrite running run B', async () => {
    const receiptListeners: Array<() => void> = [];
    vi.mocked(subscribeToActiveSavePersistenceStatus).mockImplementation((listener) => {
      receiptListeners.push(listener);
      return vi.fn();
    });
    let settleA!: (outcome: object) => void;
    let settleB!: (outcome: object) => void;
    vi.mocked(waitForActiveSavePersistenceReceipt)
      .mockImplementationOnce(() => new Promise((resolve) => { settleA = resolve; }) as never)
      .mockImplementationOnce(() => new Promise((resolve) => { settleB = resolve; }) as never);

    const first = executeSimAdvance(options(worker()));
    await vi.waitFor(() => expect(receiptListeners).toHaveLength(1));
    settleA({ kind: 'durable', record: { id: target.saveId } });
    await expect(first).resolves.toEqual({ kind: 'durable' });

    const second = executeSimAdvance(options(worker()));
    await vi.waitFor(() => expect(receiptListeners).toHaveLength(2));
    persistenceStatus = { state: 'failed', recovery: { phase: 'fallback_ready' } };
    receiptListeners[0]!();
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'persisting', operation: 'sim_day' });

    settleB({ kind: 'durable', record: { id: target.saveId } });
    await expect(second).resolves.toEqual({ kind: 'durable' });
  });

  it.each([
    ['root', target.saveId, target.rootSaveId],
    ['branch', 'branch-1', target.rootSaveId],
  ])('seals a %s baseline by reusing one retained worker export before intent/gameplay', async (_kind, saveId, rootSaveId) => {
    const branchTarget = { ...target, saveId, rootSaveId };
    const branchSession = { ...session, expectedSaveId: saveId, expectedRootSaveId: rootSaveId };
    const branchLease = { ...lease, saveId, rootSaveId };
    const branchReadyProof = {
      ...readyProof, saveId, rootSaveId, baseline: { season: baseline.season, name: 'Fresh sealed name' }, workerSnapshot: baseline,
    };
    const branchSealProof = {
      ...sealProof, saveId, rootSaveId, baseline: { season: baseline.season, name: 'Old baseline name' }, workerSnapshot: baseline,
    };
    const branchIntent = {
      ...intent,
      saveId,
      rootSaveId,
      token: `branch-intent:${saveId}`,
    };
    const branchSealReceipt = { generation: 1, saveId };
    const branchPostReceipt = { generation: 2, saveId };
    vi.mocked(resolveSaveSessionTarget).mockResolvedValueOnce(branchTarget as never);
    vi.mocked(beginSimAdvanceWorkerSession).mockReturnValueOnce(branchSession as never);
    vi.mocked(beginSimAdvancePersistenceLease).mockResolvedValueOnce(branchLease as never);
    vi.mocked(assessSimAdvanceBaseline)
      .mockResolvedValueOnce({ kind: 'seal_required', proof: branchSealProof } as never)
      .mockResolvedValueOnce({ kind: 'ready', proof: branchReadyProof } as never);
    vi.mocked(prepareSimAdvanceIntent).mockResolvedValueOnce(branchIntent as never);
    let settleSeal!: (outcome: object) => void;
    vi.mocked(waitForActiveSavePersistenceReceipt)
      .mockImplementationOnce((receivedReceipt) => {
        expect(receivedReceipt).toBe(branchSealReceipt);
        return new Promise((resolve) => { settleSeal = resolve; }) as never;
      })
      .mockImplementationOnce(async (receivedReceipt) => {
        expect(receivedReceipt).toBe(branchPostReceipt);
        return { kind: 'durable', record: { id: saveId } } as never;
      });
    vi.mocked(captureSimAdvanceBaselineSeal).mockImplementationOnce(async (receivedLease, receivedProof, capture) => {
      expect(receivedLease).toBe(branchLease);
      expect(receivedProof).toBe(branchSealProof);
      expect(await capture.exportSnapshot()).toBe(baseline);
      return branchSealReceipt as never;
    });
    vi.mocked(captureSimAdvanceSnapshot).mockImplementationOnce(async (receivedLease, receivedIntent, capture) => {
      expect(receivedLease).toBe(branchLease);
      expect(receivedIntent).toBe(branchIntent);
      expect(await capture.exportSnapshot()).toBe(post);
      return branchPostReceipt as never;
    });
    const currentWorker = worker();
    const pending = executeSimAdvance({ ...options(currentWorker), saveId });
    await vi.waitFor(() => expect(captureSimAdvanceBaselineSeal).toHaveBeenCalledTimes(1));
    expect(prepareSimAdvanceIntent).not.toHaveBeenCalled();
    expect(currentWorker.execute).not.toHaveBeenCalled();
    expect(captureSimAdvanceSnapshot).not.toHaveBeenCalled();
    expect(persistenceListener).not.toBeNull();
    persistenceStatus = { state: 'failed', recovery: { phase: 'fallback_ready' } };
    persistenceListener?.();
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'retry_wait', operation: 'sim_day', resume: 'preparing' });
    persistenceStatus = { state: 'saving', recovery: null };
    persistenceListener?.();
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'preparing', operation: 'sim_day' });
    settleSeal({ kind: 'durable', record: { id: saveId } });
    await expect(pending).resolves.toEqual({ kind: 'durable' });
    expect(currentWorker.exportSnapshot).toHaveBeenCalledTimes(2);
    expect(assessSimAdvanceBaseline).toHaveBeenNthCalledWith(1, saveId, rootSaveId, baseline);
    expect(assessSimAdvanceBaseline).toHaveBeenNthCalledWith(2, saveId, rootSaveId, baseline);
    expect(captureSimAdvanceSnapshot).toHaveBeenCalledWith(
      branchLease,
      branchIntent,
      expect.objectContaining({ saveName: 'Fresh sealed name' }),
    );
  });

  it.each([
    ['retired seal', () => {
      vi.mocked(assessSimAdvanceBaseline).mockResolvedValueOnce({ kind: 'seal_required', proof: sealProof } as never);
      vi.mocked(waitForActiveSavePersistenceReceipt).mockResolvedValueOnce({ kind: 'retired', reason: 'fail_closed' } as never);
    }, 'poison'],
    ['rejected seal wait', () => {
      vi.mocked(assessSimAdvanceBaseline).mockResolvedValueOnce({ kind: 'seal_required', proof: sealProof } as never);
      vi.mocked(waitForActiveSavePersistenceReceipt).mockRejectedValueOnce(new Error('seal wait rejected'));
    }, 'poison'],
    ['repeated seal requirement', () => vi.mocked(assessSimAdvanceBaseline)
      .mockResolvedValueOnce({ kind: 'seal_required', proof: sealProof } as never)
      .mockResolvedValueOnce({ kind: 'seal_required', proof: sealProof } as never), 'close'],
    ['reassessment failure', () => vi.mocked(assessSimAdvanceBaseline)
      .mockResolvedValueOnce({ kind: 'seal_required', proof: sealProof } as never)
      .mockRejectedValueOnce(reassessmentFailure), 'close'],
    ['intent failure after durable seal', () => {
      vi.mocked(assessSimAdvanceBaseline)
        .mockResolvedValueOnce({ kind: 'seal_required', proof: sealProof } as never)
        .mockResolvedValueOnce({ kind: 'ready', proof: readyProof } as never);
      vi.mocked(prepareSimAdvanceIntent).mockRejectedValueOnce(preparedIntentFailure);
    }, 'close'],
  ] as const)('fails closed for %s without gameplay replay', async (_label, arrange, retirement) => {
    arrange();
    if (retirement === 'poison') vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(false);
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(currentWorker.execute).not.toHaveBeenCalled();
    expect(run.failClosed).toHaveBeenCalledTimes(1);
    if (retirement === 'close') {
      expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, sealReceipt);
    } else {
      expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
    }
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
    if (_label === 'reassessment failure') {
      expect(assessSimAdvanceBaseline).toHaveBeenCalledTimes(2);
      expect(prepareSimAdvanceIntent).not.toHaveBeenCalled();
      expect(run.failClosed).toHaveBeenCalledWith(reassessmentFailure);
    }
    if (_label === 'intent failure after durable seal') {
      expect(assessSimAdvanceBaseline).toHaveBeenCalledTimes(2);
      expect(prepareSimAdvanceIntent).toHaveBeenCalledTimes(1);
      expect(run.failClosed).toHaveBeenCalledWith(preparedIntentFailure);
    }
  });

  it.each([
    ['execute rejection', (currentWorker: ReturnType<typeof worker>) => currentWorker.execute.mockRejectedValueOnce(new Error('execute failed'))],
    ['post export rejection', (currentWorker: ReturnType<typeof worker>) => currentWorker.exportSnapshot.mockReset().mockResolvedValueOnce(baseline).mockRejectedValueOnce(new Error('post export failed'))],
    ['post capture rejection', () => vi.mocked(captureSimAdvanceSnapshot).mockRejectedValueOnce(new Error('post capture failed'))],
  ])('restores, verifies, and consumes exactly once for pre-receipt %s', async (_label, arrange) => {
    const currentWorker = worker();
    arrange(currentWorker);
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toEqual({ kind: 'rolled_back' });
    expect(currentWorker.restoreBaseline).toHaveBeenCalledWith(session, baseline);
    expect(consumeSimAdvanceIntentRollback).toHaveBeenCalledWith(intent);
    expect(run.publishDurable).not.toHaveBeenCalled();
    expect(currentWorker.publishFlow).not.toHaveBeenCalled();
    expect(poisonSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(finishSimAdvancePersistenceLease).toHaveBeenCalledTimes(1);
    expect(finishSimAdvanceWorkerSession).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['failed import', { importResult: { success: false }, restoredSnapshot: baseline }],
    ['rng mismatch', { importResult: { success: true }, restoredSnapshot: parseGameSnapshot({ ...baseline, rng: { ...baseline.rng, seed: baseline.rng.seed + 1 } }) }],
  ])('preserves intent and worker fencing when rollback %s', async (_label, restored) => {
    vi.mocked(captureSimAdvanceSnapshot).mockRejectedValueOnce(new Error('post capture failed'));
    const currentWorker = worker({ restoreBaseline: vi.fn().mockResolvedValue(restored) });
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
    expect(run.publishDurable).not.toHaveBeenCalled();
  });

  it('fails closed and preserves evidence when rollback consume or authority reassertion fails', async () => {
    vi.mocked(captureSimAdvanceSnapshot).mockRejectedValueOnce(new Error('post capture failed'));
    vi.mocked(consumeSimAdvanceIntentRollback).mockRejectedValueOnce(new Error('consume failed'));
    const consumeWorker = worker();
    await expect(executeSimAdvance(options(consumeWorker))).resolves.toMatchObject({ kind: 'reload_required' });
    expect(consumeSimAdvanceIntentRollback).toHaveBeenCalledWith(intent);
    expect(finishSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();

    resetSimAdvanceCoordinatorForTesting();
    vi.resetAllMocks();
    configureDefaults();
    vi.mocked(captureSimAdvanceSnapshot).mockRejectedValue(new Error('post capture failed'));
    let authorityLost = false;
    vi.mocked(assertActiveSaveSessionOwned).mockImplementation(() => {
      if (authorityLost) throw new Error('authority lost during rollback');
    });
    const authorityWorker = worker({
      restoreBaseline: vi.fn().mockImplementation(async () => {
        authorityLost = true;
        return { importResult: { success: true }, restoredSnapshot: baseline };
      }),
    });
    await expect(executeSimAdvance(options(authorityWorker))).resolves.toMatchObject({ kind: 'reload_required' });
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
  });

  it('holds the exact accepted post through retry_wait and never replays worker work', async () => {
    let settle!: (outcome: object) => void;
    vi.mocked(waitForActiveSavePersistenceReceipt).mockImplementationOnce(() => new Promise((resolve) => { settle = resolve; }) as never);
    const currentWorker = worker();
    const run = options(currentWorker);
    const pending = executeSimAdvance(run);
    await vi.waitFor(() => expect(persistenceListener).not.toBeNull());
    expect(run.publishDurable).not.toHaveBeenCalled();
    expect(currentWorker.publishFlow).not.toHaveBeenCalled();
    expect(finishSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
    persistenceStatus = { state: 'failed', recovery: { phase: 'fallback_ready' } };
    persistenceListener?.();
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'retry_wait', operation: 'sim_day', resume: 'persisting' });
    expect(currentWorker.execute).toHaveBeenCalledTimes(1);
    persistenceStatus = { state: 'saving', recovery: null };
    persistenceListener?.();
    settle({ kind: 'durable', record: { id: target.saveId } });
    await expect(pending).resolves.toEqual({ kind: 'durable' });
    expect(currentWorker.execute).toHaveBeenCalledTimes(1);
    expect(currentWorker.exportSnapshot).toHaveBeenCalledTimes(2);
    expect(captureSimAdvanceSnapshot).toHaveBeenCalledTimes(1);
    expect(run.publishDurable).toHaveBeenCalledTimes(1);
    expect(unsubscribePersistence).toHaveBeenCalledTimes(1);
    expect(currentWorker.publishFlow).toHaveBeenCalledTimes(1);
    expect(finishSimAdvancePersistenceLease).toHaveBeenCalledTimes(1);
    expect(finishSimAdvanceWorkerSession).toHaveBeenCalledTimes(1);
    expect(run.publishDurable).toHaveBeenCalledBefore(currentWorker.publishFlow);
    expect(currentWorker.publishFlow).toHaveBeenCalledBefore(finishSimAdvancePersistenceLease as never);
    expect(finishSimAdvancePersistenceLease).toHaveBeenCalledTimes(1);
    expect(finishSimAdvanceWorkerSession).toHaveBeenCalledTimes(1);
  });

  it('uses the accepted post receipt, not an earlier durable seal receipt, when the post wait rejects', async () => {
    vi.mocked(assessSimAdvanceBaseline)
      .mockResolvedValueOnce({ kind: 'seal_required', proof: sealProof } as never)
      .mockResolvedValueOnce({ kind: 'ready', proof: readyProof } as never);
    vi.mocked(waitForActiveSavePersistenceReceipt)
      .mockImplementationOnce(async (receivedReceipt) => {
        expect(receivedReceipt).toBe(sealReceipt);
        return { kind: 'durable', record: { id: target.saveId } } as never;
      })
      .mockImplementationOnce(async (receivedReceipt) => {
        expect(receivedReceipt).toBe(postReceipt);
        throw new Error('post receipt wait rejected');
      });
    vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(false);
    const currentWorker = worker();
    const run = options(currentWorker);

    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).not.toHaveBeenCalled();
    expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
    expect(currentWorker.restoreBaseline).not.toHaveBeenCalled();
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
  });

  it.each([
    ['retired receipt', () => {
      vi.mocked(waitForActiveSavePersistenceReceipt).mockResolvedValueOnce({ kind: 'retired', reason: 'ownership_lost' } as never);
      vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(false);
    }, 'poison'],
    ['nondurable wait rejection', () => {
      vi.mocked(waitForActiveSavePersistenceReceipt).mockRejectedValueOnce(new Error('wait failed'));
      vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(false);
    }, 'poison'],
    ['durable wait rejection', () => {
      vi.mocked(waitForActiveSavePersistenceReceipt).mockRejectedValueOnce(new Error('wait failed after commit'));
      vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(true);
    }, 'close'],
  ] as const)('never rolls back after an accepted post %s', async (_label, arrange, retirement) => {
    arrange();
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(currentWorker.restoreBaseline).not.toHaveBeenCalled();
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(currentWorker.execute).toHaveBeenCalledTimes(1);
    expect(run.publishDurable).not.toHaveBeenCalled();
    if (retirement === 'close') {
      expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
    } else {
      expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
    }
  });

  it.each([
    ['ownership changes during publish', (run: ReturnType<typeof options>) => {
      run.publishDurable.mockImplementation(async () => { vi.mocked(assertActiveSaveSessionOwned).mockImplementation(() => { throw new Error('active ownership lost'); }); });
    }],
    ['publish callback throws', (run: ReturnType<typeof options>) => run.publishDurable.mockImplementation(() => { throw new Error('publish failed'); })],
    ['flow publication throws', (_run: ReturnType<typeof options>, currentWorker: ReturnType<typeof worker>) => currentWorker.publishFlow.mockImplementation(() => { throw new Error('flow failed'); })],
  ] as const)('committed-closes and suppresses remaining publication when %s', async (_label, arrange) => {
    const currentWorker = worker();
    const run = options(currentWorker);
    arrange(run, currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
    expect(poisonSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(currentWorker.restoreBaseline).not.toHaveBeenCalled();
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(finishSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
    expect(run.failClosed).toHaveBeenCalledTimes(1);
    expect(currentWorker.publishFlow).toHaveBeenCalledTimes(_label === 'flow publication throws' ? 1 : 0);
  });

  it.each([
    ['active authority before publication', 'active', 'before'],
    ['root authority before publication', 'root', 'before'],
    ['worker authority before publication', 'worker', 'before'],
    ['active authority during awaited publication', 'active', 'during'],
  ] as const)('committed-closes the exact durable post when %s is lost', async (_label, authority, timing) => {
    let settle!: (outcome: object) => void;
    let lost = false;
    vi.mocked(waitForActiveSavePersistenceReceipt).mockImplementationOnce((receivedReceipt) => {
      expect(receivedReceipt).toBe(postReceipt);
      return new Promise((resolve) => { settle = resolve; }) as never;
    });
    vi.mocked(assertActiveSaveSessionOwned).mockImplementation(() => {
      if (lost && authority === 'active') throw new Error('active ownership lost');
    });
    vi.mocked(assertSaveTreeSessionOwned).mockImplementation(() => {
      if (lost && authority === 'root') throw new Error('root ownership lost');
    });
    vi.mocked(assertSimAdvanceWorkerSessionCurrent).mockImplementation(() => {
      if (lost && authority === 'worker') throw new Error('worker authority lost');
    });
    const currentWorker = worker();
    const run = options(currentWorker);
    if (timing === 'during') {
      run.publishDurable.mockImplementation(async () => { lost = true; });
    }
    const pending = executeSimAdvance(run);
    await vi.waitFor(() => expect(persistenceListener).not.toBeNull());
    if (timing === 'before') lost = true;
    settle({ kind: 'durable', record: { id: target.saveId } });
    await expect(pending).resolves.toMatchObject({ kind: 'reload_required' });
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
    expect(currentWorker.publishFlow).not.toHaveBeenCalled();
    expect(currentWorker.restoreBaseline).not.toHaveBeenCalled();
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
  });

  it('holds publication and both lanes while a suspended durable callback resolves, then committed-closes on authority loss', async () => {
    let resolvePublication!: () => void;
    let lost = false;
    vi.mocked(assertActiveSaveSessionOwned).mockImplementation(() => {
      if (lost) throw new Error('ownership lost while durable publication was suspended');
    });
    const currentWorker = worker();
    const run = options(currentWorker);
    run.publishDurable.mockImplementation(() => new Promise<void>((resolve) => { resolvePublication = resolve; }));

    const pending = executeSimAdvance(run);
    await vi.waitFor(() => expect(run.publishDurable).toHaveBeenCalledTimes(1));
    expect(currentWorker.publishFlow).not.toHaveBeenCalled();
    expect(finishSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
    lost = true;
    resolvePublication();

    await expect(pending).resolves.toMatchObject({ kind: 'reload_required' });
    expect(currentWorker.publishFlow).not.toHaveBeenCalled();
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
    expect(currentWorker.restoreBaseline).not.toHaveBeenCalled();
  });

  it.each(['active', 'root', 'worker'] as const)(
    'committed-closes after flow publication when the immediate post-flow %s reassertion loses ownership',
    async (authority) => {
    let lost = false;
    vi.mocked(assertActiveSaveSessionOwned).mockImplementation(() => {
      if (lost && authority === 'active') throw new Error('active ownership lost after flow publication');
    });
    vi.mocked(assertSaveTreeSessionOwned).mockImplementation(() => {
      if (lost && authority === 'root') throw new Error('root ownership lost after flow publication');
    });
    vi.mocked(assertSimAdvanceWorkerSessionCurrent).mockImplementation(() => {
      if (lost && authority === 'worker') throw new Error('worker ownership lost after flow publication');
    });
    const currentWorker = worker({
      publishFlow: vi.fn(() => { lost = true; }),
    });
    const run = options(currentWorker);

    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(currentWorker.publishFlow).toHaveBeenCalledTimes(1);
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
  },
  );

  it.each([
    ['active durable', 'active', { kind: 'durable', record: { id: target.saveId } }, 'close'],
    ['active retired', 'active', { kind: 'retired', reason: 'ownership_lost' }, 'poison'],
    ['root retired', 'root', { kind: 'retired', reason: 'ownership_lost' }, 'poison'],
    ['worker retired', 'worker', { kind: 'retired', reason: 'fail_closed' }, 'poison'],
  ] as const)('retires the exact accepted post without rollback when %s authority is lost', async (_label, authority, outcome, retirement) => {
    let settle!: (outcome: object) => void;
    let lost = false;
    vi.mocked(waitForActiveSavePersistenceReceipt).mockImplementationOnce((receivedReceipt) => {
      expect(receivedReceipt).toBe(postReceipt);
      return new Promise((resolve) => { settle = resolve; }) as never;
    });
    vi.mocked(assertActiveSaveSessionOwned).mockImplementation(() => {
      if (lost && authority === 'active') throw new Error('active ownership lost after post acceptance');
    });
    vi.mocked(assertSaveTreeSessionOwned).mockImplementation(() => {
      if (lost && authority === 'root') throw new Error('root ownership lost after post acceptance');
    });
    vi.mocked(assertSimAdvanceWorkerSessionCurrent).mockImplementation(() => {
      if (lost && authority === 'worker') throw new Error('worker authority lost after post acceptance');
    });
    vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(retirement === 'close');
    const currentWorker = worker();
    const run = options(currentWorker);
    const pending = executeSimAdvance(run);
    await vi.waitFor(() => expect(persistenceListener).not.toBeNull());
    lost = true;
    settle(outcome);

    await expect(pending).resolves.toMatchObject({ kind: 'reload_required' });
    expect(currentWorker.restoreBaseline).not.toHaveBeenCalled();
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
    expect(run.publishDurable).not.toHaveBeenCalled();
    expect(currentWorker.publishFlow).not.toHaveBeenCalled();
    expect(finishSimAdvancePersistenceLease).not.toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
    expect(run.failClosed).toHaveBeenCalledTimes(1);
    if (retirement === 'close') {
      expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
      expect(poisonSimAdvancePersistenceLease).not.toHaveBeenCalled();
    } else {
      expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
      expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['persistence subscription', () => vi.mocked(subscribeToActiveSavePersistenceStatus).mockImplementation(() => { throw new Error('subscribe failed'); })],
    ['initial persistence status', () => vi.mocked(getActiveSavePersistenceStatus).mockImplementation(() => { throw new Error('status read failed'); })],
  ] as const)('fails closed after post acceptance when %s setup throws', async (_label, arrange) => {
    arrange();
    vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(false);
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
    expect(run.failClosed).toHaveBeenCalledTimes(1);
    expect(currentWorker.restoreBaseline).not.toHaveBeenCalled();
    expect(consumeSimAdvanceIntentRollback).not.toHaveBeenCalled();
  });

  it('isolates an unsubscribe throw and late receipt listener after durable success', async () => {
    let lateListener: (() => void) | null = null;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(subscribeToActiveSavePersistenceStatus).mockImplementation((listener) => {
      lateListener = listener;
      return () => { throw new Error('unsubscribe failed'); };
    });
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toEqual({ kind: 'durable' });
    persistenceStatus = { state: 'failed', recovery: { phase: 'fallback_ready' } };
    (lateListener as (() => void) | null)?.();
    expect(getSimAdvanceCoordinatorStatus()).toEqual({ kind: 'idle' });
    expect(consoleError).toHaveBeenCalled();
  });

  it('poisons rather than committed-closing when durable-receipt inspection throws', async () => {
    vi.mocked(waitForActiveSavePersistenceReceipt).mockResolvedValueOnce({ kind: 'retired', reason: 'fail_closed' } as never);
    vi.mocked(isActiveSavePersistenceReceiptDurable).mockImplementation(() => { throw new Error('durable inspection failed'); });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledWith(lease);
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).not.toHaveBeenCalled();
    expect(run.failClosed).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
  });

  it.each([
    ['persistence callback', () => vi.mocked(finishSimAdvancePersistenceLease).mockImplementation(() => { throw new Error('persistence finish failed'); }), { persistence: 1, worker: 1 }],
    ['worker validation', () => vi.mocked(finishSimAdvanceWorkerSession).mockImplementation(() => { throw new Error('worker validation failed'); }), { persistence: 0, worker: 1 }],
  ] as const)('fails closed without replay when durable success %s throws', async (_label, arrange, calls) => {
    arrange();
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(run.publishDurable).toHaveBeenCalledTimes(1);
    expect(currentWorker.publishFlow).toHaveBeenCalledTimes(1);
    expect(currentWorker.execute).toHaveBeenCalledTimes(1);
    expect(finishSimAdvancePersistenceLease).toHaveBeenCalledTimes(calls.persistence);
    expect(finishSimAdvanceWorkerSession).toHaveBeenCalledTimes(calls.worker);
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledTimes(1);
    expect(poisonSimAdvancePersistenceLease).not.toHaveBeenCalled();
  });

  it.each([
    ['persistence callback', () => vi.mocked(finishSimAdvancePersistenceLease).mockImplementation(() => { throw new Error('rollback persistence finish failed'); }), { persistence: 1, worker: 1 }],
    ['worker validation', () => vi.mocked(finishSimAdvanceWorkerSession).mockImplementation(() => { throw new Error('rollback worker validation failed'); }), { persistence: 0, worker: 1 }],
  ] as const)('fails closed without replay when rollback %s throws', async (_label, arrange, calls) => {
    vi.mocked(captureSimAdvanceSnapshot).mockRejectedValueOnce(new Error('post capture failed'));
    arrange();
    const currentWorker = worker();
    const run = options(currentWorker);
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(currentWorker.restoreBaseline).toHaveBeenCalledTimes(1);
    expect(consumeSimAdvanceIntentRollback).toHaveBeenCalledTimes(1);
    expect(currentWorker.execute).toHaveBeenCalledTimes(1);
    expect(run.publishDurable).not.toHaveBeenCalled();
    expect(finishSimAdvancePersistenceLease).toHaveBeenCalledTimes(calls.persistence);
    expect(finishSimAdvanceWorkerSession).toHaveBeenCalledTimes(calls.worker);
    expect(poisonSimAdvancePersistenceLease).toHaveBeenCalledTimes(1);
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).not.toHaveBeenCalled();
  });

  it('orders durable publication and rollback cleanup exactly once while isolating a durable observer throw', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const observer = subscribeToSimAdvanceCoordinator(() => { throw new Error('durable observer failed'); });
    const durableEvents: string[] = [];
    vi.mocked(finishSimAdvancePersistenceLease).mockImplementation(() => { durableEvents.push('persistence'); });
    vi.mocked(finishSimAdvanceWorkerSession).mockImplementation((_session, beforeRelease) => {
      durableEvents.push('worker:begin-release');
      beforeRelease?.();
      durableEvents.push('worker:released');
    });
    const durableWorker = worker({ publishFlow: vi.fn(() => { durableEvents.push('flow'); }) });
    const durableRun = options(durableWorker);
    durableRun.publishDurable.mockImplementation(() => { durableEvents.push('publish'); });
    await expect(executeSimAdvance(durableRun)).resolves.toEqual({ kind: 'durable' });
    expect(durableEvents).toEqual(['publish', 'flow', 'worker:begin-release', 'persistence', 'worker:released']);
    expect(consoleError).toHaveBeenCalled();
    observer();

    resetSimAdvanceCoordinatorForTesting();
    vi.resetAllMocks();
    configureDefaults();
    vi.mocked(captureSimAdvanceSnapshot).mockRejectedValueOnce(new Error('post capture failed'));
    const rollbackEvents: string[] = [];
    vi.mocked(consumeSimAdvanceIntentRollback).mockImplementation(async () => { rollbackEvents.push('consume'); });
    vi.mocked(finishSimAdvancePersistenceLease).mockImplementation(() => { rollbackEvents.push('persistence'); });
    vi.mocked(finishSimAdvanceWorkerSession).mockImplementation((_session, beforeRelease) => {
      rollbackEvents.push('worker:begin-release');
      beforeRelease?.();
      rollbackEvents.push('worker:released');
    });
    const rollbackWorker = worker({
      restoreBaseline: vi.fn(async () => {
        rollbackEvents.push('restore');
        return { importResult: { success: true }, restoredSnapshot: baseline };
      }),
    });
    await expect(executeSimAdvance(options(rollbackWorker))).resolves.toEqual({ kind: 'rolled_back' });
    expect(rollbackEvents).toEqual(['restore', 'consume', 'worker:begin-release', 'persistence', 'worker:released']);
  });

  it('keeps reload_required when exact committed-close throws after durable publication failure', async () => {
    vi.mocked(closeCommittedSimAdvancePersistenceLeaseFailClosed)
      .mockImplementationOnce(() => { throw new Error('close failed'); });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const currentWorker = worker();
    const run = {
      ...options(currentWorker),
      publishDurable: vi.fn(() => { throw new Error('publication failed'); }),
    };
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(closeCommittedSimAdvancePersistenceLeaseFailClosed).toHaveBeenCalledWith(lease, postReceipt);
    expect(run.failClosed).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    expect(finishSimAdvanceWorkerSession).not.toHaveBeenCalled();
  });

  it('keeps reload_required when receipt retirement, retirement, failClosed, or observers throw', async () => {
    vi.mocked(waitForActiveSavePersistenceReceipt).mockResolvedValueOnce({ kind: 'retired', reason: 'fail_closed' } as never);
    vi.mocked(isActiveSavePersistenceReceiptDurable).mockReturnValue(false);
    vi.mocked(poisonSimAdvancePersistenceLease).mockImplementationOnce(() => { throw new Error('poison failed'); });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const observer = subscribeToSimAdvanceCoordinator(() => { throw new Error('observer failed'); });
    const currentWorker = worker();
    const run = { ...options(currentWorker), failClosed: vi.fn(() => { throw new Error('fail closed failed'); }) };
    await expect(executeSimAdvance(run)).resolves.toMatchObject({ kind: 'reload_required' });
    expect(run.failClosed).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    expect(getSimAdvanceCoordinatorStatus().kind).toBe('fail_closed');
    observer();
  });
});
