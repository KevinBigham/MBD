// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameSnapshot } from '@mbd/contracts';
import {
  TEAMS,
  createOffseasonState,
  createOwnerState,
  deriveMarketRevenueStatement,
  getTeamBudget,
} from '@mbd/sim-core';
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

type ExtensionSnapshot = Omit<GameSnapshot, 'offseasonState'> & {
  offseasonState: ReturnType<typeof createOffseasonState> | null;
};

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

function extensionPhaseWorker() {
  const baseline = structuredClone(v34SnapshotFixture) as unknown as ExtensionSnapshot;
  baseline.phase = 'offseason';
  baseline.offseasonState = {
    ...createOffseasonState(baseline.season),
    currentPhase: 'tender_nontender',
    phaseDay: 5,
    totalDay: 15,
  };
  const post = structuredClone(baseline);
  const player = post.players[0]!;
  player.contract = {
    ...player.contract,
    years: 5,
    annualSalary: 18,
    totalValue: 90,
  };
  player.extensionHistory = [{
    season: post.season,
    teamId: player.teamId,
    years: 5,
    annualSalary: 18,
    totalValue: 90,
    outcome: 'accepted',
  }];
  post.offseasonState = {
    ...post.offseasonState!,
    currentPhase: 'extensions',
    phaseDay: 1,
    totalDay: 16,
    phaseResults: {
      ...post.offseasonState!.phaseResults,
      extensions: [{
        playerId: player.id,
        teamId: player.teamId,
        status: 'accepted',
        years: 5,
        annualSalary: 18,
        totalValue: 90,
      }],
    },
  };
  let current: ExtensionSnapshot = baseline;
  return {
    baseline,
    post,
    adapter: {
      exportSnapshot: vi.fn(async () => structuredClone(current)),
      execute: vi.fn(async () => {
        current = post;
        return { currentPhase: 'extensions', flowStateChanged: true };
      }),
      restoreBaseline: vi.fn(async (_session, snapshot: object) => {
        current = structuredClone(snapshot) as ExtensionSnapshot;
        return {
          importResult: { success: true },
          restoredSnapshot: structuredClone(current),
        };
      }),
      publishFlow: vi.fn(),
      discardFlow: vi.fn(),
    },
    readCurrent: () => structuredClone(current),
  };
}

function ownerPayrollReconciliationWorker() {
  const baseline = structuredClone(v34SnapshotFixture) as unknown as ExtensionSnapshot;
  baseline.phase = 'offseason';
  baseline.offseasonState = {
    ...createOffseasonState(baseline.season),
    currentPhase: 'spring_training',
    phaseDay: 12,
    totalDay: 92,
  };
  const post = structuredClone(baseline);
  post.offseasonState = {
    ...post.offseasonState!,
    completed: true,
  };
  const flag = `owner_payroll_pressure_reconciled_s${post.season}`;
  post.narrative.storyFlags = TEAMS.map((team) => [team.id, [flag]]);
  post.news = [{
    id: `owner-payroll-pressure-${post.season}-${post.userTeamId}`,
    headline: 'Payroll finishes inside the owner plan',
    body: 'Projected exposure is $0.00M.',
    priority: 3,
    category: 'performance',
    tag: 'ANALYSIS',
    timestamp: `S${post.season}D92`,
    relatedPlayerIds: [],
    relatedTeamIds: [post.userTeamId],
    read: false,
  }];
  post.narrative.briefingQueue = [{
    id: `brief-owner-payroll-pressure-${post.season}-${post.userTeamId}`,
    priority: 3,
    category: 'owner',
    tag: 'ANALYSIS',
    headline: 'Payroll finishes inside the owner plan',
    body: 'Projected exposure is $0.00M.',
    relatedTeamIds: [post.userTeamId],
    relatedPlayerIds: [],
    timestamp: `S${post.season}D92`,
    acknowledged: false,
  }];

  let current: ExtensionSnapshot = baseline;
  return {
    baseline,
    post,
    adapter: {
      exportSnapshot: vi.fn(async () => structuredClone(current)),
      execute: vi.fn(async () => {
        current = post;
        return { currentPhase: 'spring_training', completed: true, flowStateChanged: true };
      }),
      restoreBaseline: vi.fn(async (_session, snapshot: object) => {
        current = structuredClone(snapshot) as ExtensionSnapshot;
        return {
          importResult: { success: true },
          restoredSnapshot: structuredClone(current),
        };
      }),
      publishFlow: vi.fn(),
      discardFlow: vi.fn(),
    },
  };
}

function marketRevenueReconciliationWorker() {
  const baseline = structuredClone(v34SnapshotFixture) as unknown as ExtensionSnapshot;
  baseline.phase = 'offseason';
  baseline.offseasonState = createOffseasonState(baseline.season);
  const post = structuredClone(baseline);
  post.offseasonState = {
    ...post.offseasonState!,
    phaseDay: 2,
    totalDay: 2,
  };
  const flag = `market_revenue_budget_reconciled_s${post.season}`;
  post.narrative.storyFlags = TEAMS.map((team) => [team.id, [flag]]);
  post.narrative.ownerState = TEAMS.map((team) => {
    const owner = createOwnerState(team.id, getTeamBudget(team.id));
    const statement = deriveMarketRevenueStatement({
      teamId: team.id,
      wins: 81,
      losses: 81,
      madePlayoffs: team.id === post.userTeamId,
      ownerArchetype: owner.archetype,
    });
    return [team.id, {
      ...owner,
      annualBudget: statement.annualBudget,
      payrollCap: statement.payrollCap,
      draftBonusPool: statement.draftBonusPool,
      ifaBonusPool: statement.ifaBonusPool,
      staffBudget: statement.staffBudget,
      expectations: { ...owner.expectations, payrollTarget: statement.payrollCap },
    }];
  });
  post.news = [{
    id: `market-revenue-${post.season}-${post.userTeamId}`,
    headline: 'Market revenue sets the next-season budget',
    body: 'Modeled gross revenue sets the raw next-season budget. Projected tax remains separate.',
    priority: 2,
    category: 'performance',
    tag: 'ANALYSIS',
    timestamp: `S${post.season}D1`,
    relatedPlayerIds: [],
    relatedTeamIds: [post.userTeamId],
    read: false,
  }];
  post.narrative.briefingQueue = [{
    id: `brief-market-revenue-${post.season}-${post.userTeamId}`,
    priority: 2,
    category: 'owner',
    tag: 'ANALYSIS',
    headline: 'Market revenue sets the next-season budget',
    body: 'Modeled gross revenue sets the raw next-season budget. Projected tax remains separate.',
    relatedTeamIds: [post.userTeamId],
    relatedPlayerIds: [],
    timestamp: `S${post.season}D1`,
    acknowledged: false,
  }];

  let current: ExtensionSnapshot = baseline;
  return {
    baseline,
    post,
    adapter: {
      exportSnapshot: vi.fn(async () => structuredClone(current)),
      execute: vi.fn(async () => {
        current = post;
        return { currentPhase: 'season_review', phaseDay: 2, flowStateChanged: true };
      }),
      restoreBaseline: vi.fn(async (_session, snapshot: object) => {
        current = structuredClone(snapshot) as ExtensionSnapshot;
        return {
          importResult: { success: true },
          restoredSnapshot: structuredClone(current),
        };
      }),
      publishFlow: vi.fn(),
      discardFlow: vi.fn(),
    },
    readCurrent: () => structuredClone(current),
  };
}

function freeAgencySigningWorker() {
  const baseline = structuredClone(v34SnapshotFixture) as unknown as ExtensionSnapshot;
  baseline.phase = 'offseason';
  baseline.offseasonState = {
    ...createOffseasonState(baseline.season),
    currentPhase: 'free_agency',
    phaseDay: 1,
    totalDay: 21,
  };
  const post = structuredClone(baseline);
  const player = post.players[0]!;
  const explanation = 'At age 31, the $18.00M AAV and a featured projected MLB opportunity carried the offer above the $17.00M equivalent-AAV minimum.';
  player.teamId = post.userTeamId;
  player.rosterStatus = 'MLB';
  player.contract = {
    ...player.contract,
    years: 4,
    annualSalary: 18,
    totalValue: 72,
  };
  post.freeAgencyMarket = {
    season: post.season,
    day: 1,
    freeAgents: [],
    signedPlayers: [{
      player,
      marketValue: 18.89,
      demandLevel: 'high',
      interestedTeams: [post.userTeamId],
      signedWith: post.userTeamId,
      contract: {
        teamId: post.userTeamId,
        playerId: player.id,
        years: 4,
        annualSalary: 18,
        totalValue: 72,
        noTradeClause: false,
        playerOption: false,
        teamOption: false,
        signingBonus: 0,
      },
    }],
  };
  post.offseasonState = {
    ...post.offseasonState!,
    phaseResults: {
      ...post.offseasonState!.phaseResults,
      freeAgentSignings: [{
        playerId: player.id,
        teamId: post.userTeamId,
        years: 4,
        annualSalary: 18,
        totalValue: 72,
      }],
    },
  };
  post.news = [{
    id: `fa-decision-${post.season}-${player.id}`,
    headline: `${player.firstName} ${player.lastName} signs with the club`,
    body: `${player.firstName} ${player.lastName} signed a four-year deal. Decision: ${explanation}`,
    priority: 2,
    category: 'signing',
    tag: 'ANALYSIS',
    timestamp: `S${post.season}D1`,
    relatedPlayerIds: [player.id],
    relatedTeamIds: [post.userTeamId],
    read: false,
  }];
  post.narrative.briefingQueue = [{
    id: `brief-fa-decision-${post.season}-${player.id}`,
    priority: 2,
    category: 'news',
    tag: 'ANALYSIS',
    headline: `${player.firstName} ${player.lastName} signs with the club`,
    body: `Decision: ${explanation}`,
    relatedTeamIds: [post.userTeamId],
    relatedPlayerIds: [player.id],
    timestamp: `S${post.season}D1`,
    acknowledged: false,
  }];

  const result = {
    accepted: true,
    reason: explanation,
    decision: {
      accepted: true,
      actualAav: 18,
      summary: explanation,
    },
  };
  let current: ExtensionSnapshot = baseline;
  return {
    baseline,
    post,
    result,
    playerId: player.id,
    adapter: {
      exportSnapshot: vi.fn(async () => structuredClone(current)),
      execute: vi.fn(async () => {
        current = post;
        return result;
      }),
      restoreBaseline: vi.fn(async (_session, snapshot: object) => {
        current = structuredClone(snapshot) as ExtensionSnapshot;
        return {
          importResult: { success: true },
          restoredSnapshot: structuredClone(current),
        };
      }),
      publishFlow: vi.fn(),
      discardFlow: vi.fn(),
    },
    readCurrent: () => structuredClone(current),
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

  it('retains one extension-phase post snapshot through persistence retry without rerunning decisions', async () => {
    let settleReceipt!: (value: { kind: 'durable'; record: object }) => void;
    let retainedSnapshot: object | null = null;
    mocks.capture.mockImplementationOnce(async (_lease, capture) => {
      retainedSnapshot = await capture.exportSnapshot();
      return receipt;
    });
    mocks.wait.mockReturnValue(new Promise((resolve) => { settleReceipt = resolve; }));
    const extension = extensionPhaseWorker();
    const pending = executeExactSaveMutation(options(extension.adapter));

    await vi.waitFor(() => expect(mocks.wait).toHaveBeenCalledWith(receipt));
    expect(extension.adapter.execute).toHaveBeenCalledTimes(1);
    expect(retainedSnapshot).toEqual(extension.post);
    expect((retainedSnapshot as unknown as ExtensionSnapshot).offseasonState?.phaseResults.extensions)
      .toEqual(extension.post.offseasonState?.phaseResults.extensions);
    expect(getExactSaveMutationStatus()).toEqual({ kind: 'persisting' });

    settleReceipt({ kind: 'durable', record: {} });
    await expect(pending).resolves.toMatchObject({ kind: 'durable' });
    expect(extension.adapter.execute).toHaveBeenCalledTimes(1);
    expect(extension.readCurrent()).toEqual(extension.post);
  });

  it('retains one reason-bearing free-agent signing through retry without rerunning the decision', async () => {
    let settleReceipt!: (value: { kind: 'durable'; record: object }) => void;
    let retainedSnapshot: ExtensionSnapshot | null = null;
    mocks.capture.mockImplementationOnce(async (_lease, capture) => {
      retainedSnapshot = await capture.exportSnapshot() as ExtensionSnapshot;
      return receipt;
    });
    mocks.wait.mockReturnValue(new Promise((resolve) => { settleReceipt = resolve; }));
    const signing = freeAgencySigningWorker();
    const pending = executeExactSaveMutation({
      ...options(signing.adapter),
      operation: {
        kind: 'makeContractOffer',
        playerId: signing.playerId,
        years: 4,
        salary: 18,
      },
      didChange: (result: typeof signing.result) => result.accepted,
    });

    await vi.waitFor(() => expect(mocks.wait).toHaveBeenCalledWith(receipt));
    const retained = retainedSnapshot as ExtensionSnapshot | null;
    expect(signing.adapter.execute).toHaveBeenCalledTimes(1);
    expect(retained?.players.find((player) => player.id === signing.playerId)?.contract)
      .toMatchObject({ years: 4, annualSalary: 18, totalValue: 72 });
    expect(retained?.offseasonState?.phaseResults.freeAgentSignings)
      .toContainEqual(expect.objectContaining({ playerId: signing.playerId, annualSalary: 18 }));
    expect(retained?.news).toContainEqual(expect.objectContaining({
      relatedPlayerIds: [signing.playerId],
      body: expect.stringContaining(`Decision: ${signing.result.reason}`),
    }));
    expect(retained?.narrative.briefingQueue).toContainEqual(expect.objectContaining({
      relatedPlayerIds: [signing.playerId],
      body: expect.stringContaining(`Decision: ${signing.result.reason}`),
    }));
    expect(signing.adapter.publishFlow).not.toHaveBeenCalled();
    expect(getExactSaveMutationStatus()).toEqual({ kind: 'persisting' });

    settleReceipt({ kind: 'durable', record: {} });
    await expect(pending).resolves.toMatchObject({
      kind: 'durable',
      result: signing.result,
    });
    expect(signing.adapter.execute).toHaveBeenCalledTimes(1);
    expect(signing.adapter.publishFlow).toHaveBeenCalledTimes(1);
    expect(signing.readCurrent()).toEqual(signing.post);
  });

  it('retains the completed-offseason payroll reconciliation through persistence retry without replay', async () => {
    let settleReceipt!: (value: { kind: 'durable'; record: object }) => void;
    let retainedSnapshot: ExtensionSnapshot | null = null;
    mocks.capture.mockImplementationOnce(async (_lease, capture) => {
      retainedSnapshot = await capture.exportSnapshot() as ExtensionSnapshot;
      return receipt;
    });
    mocks.wait.mockReturnValue(new Promise((resolve) => { settleReceipt = resolve; }));
    const payroll = ownerPayrollReconciliationWorker();
    const pending = executeExactSaveMutation({
      ...options(payroll.adapter),
      operation: 'skipOffseasonPhase',
    });

    await vi.waitFor(() => expect(mocks.wait).toHaveBeenCalledWith(receipt));
    expect(payroll.adapter.execute).toHaveBeenCalledTimes(1);
    const retained = retainedSnapshot as ExtensionSnapshot | null;
    expect(retained?.offseasonState?.completed).toBe(true);
    expect(retained?.narrative.storyFlags).toHaveLength(32);
    expect(retained?.news).toContainEqual(expect.objectContaining({
      id: `owner-payroll-pressure-${payroll.post.season}-${payroll.post.userTeamId}`,
    }));
    expect(retained?.narrative.briefingQueue).toContainEqual(expect.objectContaining({
      id: `brief-owner-payroll-pressure-${payroll.post.season}-${payroll.post.userTeamId}`,
    }));

    settleReceipt({ kind: 'durable', record: {} });
    await expect(pending).resolves.toMatchObject({ kind: 'durable' });
    expect(payroll.adapter.execute).toHaveBeenCalledTimes(1);
  });

  it('retains one all-team market-revenue settlement through retry without replay or partial publication', async () => {
    let settleReceipt!: (value: { kind: 'durable'; record: object }) => void;
    let retainedSnapshot: ExtensionSnapshot | null = null;
    mocks.capture.mockImplementationOnce(async (_lease, capture) => {
      retainedSnapshot = await capture.exportSnapshot() as ExtensionSnapshot;
      return receipt;
    });
    mocks.wait.mockReturnValue(new Promise((resolve) => { settleReceipt = resolve; }));
    const revenue = marketRevenueReconciliationWorker();
    const pending = executeExactSaveMutation({
      ...options(revenue.adapter),
      didChange: didFlowAwareExactMutationChange,
    });

    await vi.waitFor(() => expect(mocks.wait).toHaveBeenCalledWith(receipt));
    const retained = retainedSnapshot as ExtensionSnapshot | null;
    const flag = `market_revenue_budget_reconciled_s${revenue.post.season}`;
    expect(revenue.adapter.execute).toHaveBeenCalledTimes(1);
    expect(retained?.narrative.storyFlags).toHaveLength(32);
    expect(retained?.narrative.storyFlags.every(([, flags]) => flags.includes(flag))).toBe(true);
    expect(retained?.narrative.ownerState).toHaveLength(32);
    expect(retained?.news).toContainEqual(expect.objectContaining({
      id: `market-revenue-${revenue.post.season}-${revenue.post.userTeamId}`,
    }));
    expect(revenue.adapter.publishFlow).not.toHaveBeenCalled();

    settleReceipt({ kind: 'durable', record: {} });
    await expect(pending).resolves.toMatchObject({ kind: 'durable' });
    expect(revenue.adapter.execute).toHaveBeenCalledTimes(1);
    expect(revenue.adapter.publishFlow).toHaveBeenCalledTimes(1);
    expect(revenue.readCurrent()).toEqual(revenue.post);
  });

  it('restores the exact pre-revenue baseline when settlement persistence is rejected before acceptance', async () => {
    mocks.capture.mockRejectedValueOnce(new Error('revenue receipt not accepted'));
    const revenue = marketRevenueReconciliationWorker();

    const outcome = await executeExactSaveMutation({
      ...options(revenue.adapter),
      didChange: didFlowAwareExactMutationChange,
    });

    expect(outcome).toMatchObject({ kind: 'rolled_back' });
    expect(revenue.adapter.execute).toHaveBeenCalledTimes(1);
    expect(revenue.adapter.restoreBaseline).toHaveBeenCalledTimes(1);
    expect(revenue.readCurrent()).toEqual(revenue.baseline);
    expect(revenue.readCurrent().narrative.storyFlags).toEqual(revenue.baseline.narrative.storyFlags);
    expect(revenue.readCurrent().narrative.ownerState).toEqual(revenue.baseline.narrative.ownerState);
    expect(revenue.adapter.publishFlow).not.toHaveBeenCalled();
  });

  it('restores the extension-phase baseline when persistence fails before receipt acceptance', async () => {
    mocks.capture.mockRejectedValueOnce(new Error('extension receipt not accepted'));
    const extension = extensionPhaseWorker();

    const outcome = await executeExactSaveMutation(options(extension.adapter));

    expect(outcome).toMatchObject({ kind: 'rolled_back' });
    expect(extension.adapter.execute).toHaveBeenCalledTimes(1);
    expect(extension.adapter.restoreBaseline).toHaveBeenCalledTimes(1);
    expect(extension.readCurrent()).toEqual(extension.baseline);
    expect(extension.readCurrent().offseasonState?.phaseResults.extensions)
      .toEqual([]);
    expect(extension.adapter.publishFlow).not.toHaveBeenCalled();
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
