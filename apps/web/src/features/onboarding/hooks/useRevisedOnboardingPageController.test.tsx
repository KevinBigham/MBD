import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CURRENT_GAME_SNAPSHOT_VERSION } from '@mbd/contracts';
import {
  AGM_CANDIDATES,
  type AGMCandidate,
  type RevisedOnboardingScript,
  type ScoutingHiringSlate,
  type StaffHireChoices,
  type StaffHiringSlate,
} from '@mbd/sim-core';
import { loadGameById } from '@/shared/lib/saveSystem';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
import { useGameStore } from '@/shared/hooks/useGameStore';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
import {
  useRevisedOnboardingPageController,
  type UseRevisedOnboardingPageControllerResult,
  type RevisedOnboardingPageControllerGameState,
  type RevisedOnboardingPageControllerWorker,
} from './useRevisedOnboardingPageController';

const simAdvanceRuntime = vi.hoisted(() => ({
  status: { kind: 'idle' } as { kind: string },
}));

vi.mock('@/shared/hooks/useSimAdvanceExecutor', () => ({
  isSimAdvanceCoordinatorBusy: () => simAdvanceRuntime.status.kind !== 'idle',
  useSimAdvanceCoordinatorStatus: () => simAdvanceRuntime.status,
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  loadGameById: vi.fn(),
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  persistActiveSaveSnapshot: vi.fn(),
}));

const mockedLoadGameById = vi.mocked(loadGameById);
const mockedPersistActiveSaveSnapshot = vi.mocked(persistActiveSaveSnapshot);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const AGMS = AGM_CANDIDATES as unknown as AGMCandidate[];

const STAFF_HIRES: StaffHireChoices = {
  managerId: 'manager-analytics',
  pitchingCoachId: 'pitching-development',
  hittingCoachId: 'hitting-approach',
};

const STAFF_SLATE = {
  managerCandidates: [{ id: STAFF_HIRES.managerId }],
  pitchingCoachCandidates: [{ id: STAFF_HIRES.pitchingCoachId }],
  hittingCoachCandidates: [{ id: STAFF_HIRES.hittingCoachId }],
} as unknown as StaffHiringSlate;

const SCOUTING_SLATE = {
  candidates: [
    {
      id: 'scout-draft',
      name: 'Nate Shaw',
      specialty: 'draft',
    },
  ],
} as unknown as ScoutingHiringSlate;

function scriptLine(text: string) {
  return {
    speaker: 'agm',
    text,
    tone: 'confident',
  };
}

function buildScript(agm = AGMS[0]!): RevisedOnboardingScript {
  return {
    agm,
    greeting: [scriptLine('Ready to begin.')],
    chapters: {},
    farewell: [scriptLine('The office is ready.')],
    staffOpinions: {},
    scoutOpinions: {},
  } as unknown as RevisedOnboardingScript;
}

function buildOnboardingData(agm = AGMS[0]!): RevisedOnboardingData {
  return {
    script: buildScript(agm),
    chapterData: {},
    staffSlate: STAFF_SLATE,
    scoutingSlate: SCOUTING_SLATE,
  } as unknown as RevisedOnboardingData;
}

function buildWorker(
  overrides: Partial<RevisedOnboardingPageControllerWorker> = {},
): RevisedOnboardingPageControllerWorker {
  return {
    isReady: true,
    getAGMCandidates: vi.fn().mockResolvedValue(AGMS),
    getRevisedOnboardingData: vi.fn().mockResolvedValue(buildOnboardingData()),
    applyStaffHires: vi.fn().mockResolvedValue({ success: true, flowStateChanged: false }),
    applyScoutingHire: vi.fn().mockResolvedValue({ success: true, flowStateChanged: false }),
    completeRevisedOnboarding: vi.fn().mockResolvedValue({ success: true, flowStateChanged: true }),
    exportSnapshot: vi.fn().mockResolvedValue({
      schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
      season: 1,
      day: 1,
      phase: 'preseason',
      franchise: {
        assistantGMId: 'marcus_chen',
        onboarding: { welcomeBriefingSeen: true },
      },
    }),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

const GAME_STATE: RevisedOnboardingPageControllerGameState = {
  activeSaveId: 'save-slot-1',
  activeSaveSlot: 1,
  gmName: 'General Manager',
};

const EXISTING_SAVE_RECORD = {
  id: 'save-slot-1',
  slotNumber: 1,
  name: 'General Manager • New York Tycoons',
  season: 1,
  day: 1,
  phase: 'preseason',
  schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
  hasSnapshot: true,
  snapshot: null,
  legacyState: null,
  createdAt: '2026-04-13T00:00:00.000Z',
  updatedAt: '2026-04-13T00:00:00.000Z',
  parentSaveId: 'root-save',
  isRootSave: false,
  branchMeta: {
    id: 'branch-a',
    saveId: 'save-slot-1',
    description: 'Branch A',
    branchedAtSeason: 1,
    branchedAtDay: 1,
    createdAt: '2026-04-13T00:00:00.000Z',
  },
} as const;

function ControllerHarness({
  game = GAME_STATE,
  navigate,
  onRender,
  worker,
}: {
  game?: RevisedOnboardingPageControllerGameState;
  navigate: (path: string) => void;
  onRender: (controller: UseRevisedOnboardingPageControllerResult) => void;
  worker: RevisedOnboardingPageControllerWorker;
}) {
  onRender(useRevisedOnboardingPageController({ game, navigate, worker }));
  return null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function expectFlow(
  latest: UseRevisedOnboardingPageControllerResult | null,
) {
  await flush();
  expect(latest?.screen.kind).toBe('flow');
  if (latest?.screen.kind !== 'flow') {
    throw new Error(`Expected flow screen, received ${latest?.screen.kind}`);
  }

  return latest.screen.contentProps;
}

describe('useRevisedOnboardingPageController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: UseRevisedOnboardingPageControllerResult | null;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
    navigate = vi.fn();
    mockedLoadGameById.mockResolvedValue(EXISTING_SAVE_RECORD as never);
    mockedPersistActiveSaveSnapshot.mockImplementation(async (options) => {
      await options.exportSnapshot();
      return {
        saved: true,
        saveName: EXISTING_SAVE_RECORD.name,
      };
    });
    useGameStore.setState({ activeSaveId: 'save-slot-1', activeSaveSlot: 1 });
    simAdvanceRuntime.status = { kind: 'idle' };
  });

  async function renderToFlow(worker: RevisedOnboardingPageControllerWorker) {
    await act(async () => {
      root.render(
        <ControllerHarness
          navigate={navigate}
          onRender={(controller) => { latest = controller; }}
          worker={worker}
        />,
      );
    });
    await flush();
    if (latest?.screen.kind !== 'agm-selection') throw new Error(`Expected selection, received ${latest?.screen.kind}`);
    const selection = latest.screen;
    await act(async () => { await selection.onSelectAGM('marcus_chen'); });
    return expectFlow(latest);
  }

  async function advanceToStaff(worker: RevisedOnboardingPageControllerWorker) {
    let flow = await renderToFlow(worker);
    await act(async () => { flow.onChoice('seasonGoal', 'playoff'); });
    flow = await expectFlow(latest);
    await act(async () => { flow.onRosterAdvance(); });
    return expectFlow(latest);
  }

  async function completeLocalFlow(worker: RevisedOnboardingPageControllerWorker) {
    let flow = await advanceToStaff(worker);
    await act(async () => { await flow.onStaffHires(STAFF_HIRES); });
    flow = await expectFlow(latest);
    await act(async () => { flow.onChoice('developmentStyle', 'balanced'); });
    flow = await expectFlow(latest);
    await act(async () => { await flow.onScoutingHire('scout-draft'); });
    flow = await expectFlow(latest);
    for (const [field, value] of [
      ['spendingStyle', 'balanced'],
      ['tradeApproach', 'buyer'],
      ['mediaTone', 'confident'],
    ] as const) {
      await act(async () => { flow.onChoice(field, value); });
      flow = await expectFlow(latest);
    }
    expect(flow.flowState.isComplete).toBe(true);
    return flow;
  }

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
    useGameStore.setState({ activeSaveId: null, activeSaveSlot: null });
  });

  it('loads AGM candidates and advances into the selected AGM flow', async () => {
    const worker = buildWorker();

    await act(async () => {
      root.render(
        <ControllerHarness
          navigate={navigate}
          onRender={(controller) => {
            latest = controller;
          }}
          worker={worker}
        />,
      );
    });
    await flush();

    expect(worker.getAGMCandidates).toHaveBeenCalledTimes(1);
    expect(latest?.screen.kind).toBe('agm-selection');
    if (latest?.screen.kind !== 'agm-selection') {
      throw new Error(`Expected selection screen, received ${latest?.screen.kind}`);
    }

    expect(latest.screen.candidates).toHaveLength(3);

    const selectionScreen = latest.screen;
    await act(async () => {
      await selectionScreen.onSelectAGM('marcus_chen');
    });

    const flowProps = await expectFlow(latest);
    expect(worker.getRevisedOnboardingData).toHaveBeenCalledWith('marcus_chen');
    expect(flowProps.flowState.selectedAGMId).toBe('marcus_chen');
    expect(flowProps.currentChapter.id).toBe('owners_office');
  });

  it('completes the flow and preserves existing save metadata during persistence', async () => {
    const worker = buildWorker();

    await act(async () => {
      root.render(
        <ControllerHarness
          navigate={navigate}
          onRender={(controller) => {
            latest = controller;
          }}
          worker={worker}
        />,
      );
    });
    await flush();

    if (latest?.screen.kind !== 'agm-selection') {
      throw new Error(`Expected selection screen, received ${latest?.screen.kind}`);
    }

    const selectionScreen = latest.screen;
    await act(async () => {
      await selectionScreen.onSelectAGM('marcus_chen');
    });

    let flowProps = await expectFlow(latest);

    await act(async () => {
      flowProps.onChoice('seasonGoal', 'playoff');
    });
    flowProps = await expectFlow(latest);

    await act(async () => {
      flowProps.onRosterAdvance();
    });
    flowProps = await expectFlow(latest);

    await act(async () => {
      await flowProps.onStaffHires(STAFF_HIRES);
    });
    expect(worker.applyStaffHires).toHaveBeenCalledWith(STAFF_HIRES);
    flowProps = await expectFlow(latest);

    await act(async () => {
      flowProps.onChoice('developmentStyle', 'balanced');
    });
    flowProps = await expectFlow(latest);

    await act(async () => {
      await flowProps.onScoutingHire('scout-draft');
    });
    expect(worker.applyScoutingHire).toHaveBeenCalledWith('scout-draft');
    flowProps = await expectFlow(latest);

    await act(async () => {
      flowProps.onChoice('spendingStyle', 'balanced');
    });
    flowProps = await expectFlow(latest);

    await act(async () => {
      flowProps.onChoice('tradeApproach', 'buyer');
    });
    flowProps = await expectFlow(latest);

    await act(async () => {
      flowProps.onChoice('mediaTone', 'confident');
    });
    flowProps = await expectFlow(latest);
    expect(flowProps.flowState.isComplete).toBe(true);

    await act(async () => {
      await flowProps.onEnterFrontOffice();
    });

    expect(worker.completeRevisedOnboarding).toHaveBeenCalledWith(expect.objectContaining({
      selectedAGMId: 'marcus_chen',
      staffHires: STAFF_HIRES,
      scoutingHire: 'scout-draft',
      gmPhilosophy: expect.objectContaining({
        developmentStyle: 'balanced',
        mediaTone: 'confident',
        scoutingFocus: 'draft',
        seasonGoal: 'playoff',
        spendingStyle: 'balanced',
        tradeApproach: 'buyer',
      }),
    }));
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(3);
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(3);
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      saveName: 'General Manager • New York Tycoons',
      season: 1,
    }));
    expect(mockedLoadGameById.mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(worker.completeRevisedOnboarding).mock.invocationCallOrder[0]!);
    expect(vi.mocked(worker.completeRevisedOnboarding).mock.invocationCallOrder[0]!)
      .toBeLessThan(mockedPersistActiveSaveSnapshot.mock.invocationCallOrder[2]!);
    expect(mockedPersistActiveSaveSnapshot.mock.invocationCallOrder[2]!)
      .toBeLessThan(vi.mocked(worker.exportSnapshot).mock.invocationCallOrder[2]!);
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('blocks worker-backed actions while a simulation advance is active but keeps local choices available', async () => {
    const worker = buildWorker();
    let flow = await renderToFlow(worker);
    simAdvanceRuntime.status = { kind: 'running' };
    await act(async () => {
      root.render(<ControllerHarness navigate={navigate} onRender={(controller) => { latest = controller; }} worker={worker} />);
    });
    flow = await expectFlow(latest);
    expect(flow.mutationBlocked).toBe(true);

    await act(async () => { flow.onChoice('seasonGoal', 'playoff'); });
    expect((await expectFlow(latest)).flowState.currentChapter).toBe(2);
    await act(async () => { await flow.onStaffHires(STAFF_HIRES); });
    expect(worker.applyStaffHires).not.toHaveBeenCalled();
  });

  it.each(['save-slot-2', null] as const)(
    'does not publish held staff work after live save A becomes %s',
    async (successorSaveId) => {
      const held = deferred<{ success: boolean; flowStateChanged: boolean }>();
      const worker = buildWorker({ applyStaffHires: vi.fn().mockReturnValue(held.promise) });
      const flow = await advanceToStaff(worker);
      const chapterBefore = flow.flowState.currentChapter;
      let pending!: Promise<void>;
      await act(async () => {
        pending = flow.onStaffHires(STAFF_HIRES) as unknown as Promise<void>;
        await Promise.resolve();
      });
      useGameStore.setState({ activeSaveId: successorSaveId, activeSaveSlot: successorSaveId ? 2 : null });
      await act(async () => { held.resolve({ success: true, flowStateChanged: false }); await pending; });
      expect((await expectFlow(latest)).flowState.currentChapter).toBe(chapterBefore);
      expect(mockedPersistActiveSaveSnapshot).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('keeps accepted staff hiring presentation unchanged until its exact snapshot is saved', async () => {
    const heldPersistence = deferred<{ saved: boolean; saveName: string | null }>();
    mockedPersistActiveSaveSnapshot.mockReturnValue(heldPersistence.promise as never);
    const worker = buildWorker();
    const flow = await advanceToStaff(worker);
    const chapterBefore = flow.flowState.currentChapter;
    let pending!: Promise<void>;
    await act(async () => {
      pending = flow.onStaffHires(STAFF_HIRES) as unknown as Promise<void>;
      await Promise.resolve();
    });
    expect((await expectFlow(latest)).flowState.currentChapter).toBe(chapterBefore);
    await act(async () => {
      heldPersistence.resolve({ saved: true, saveName: 'A' });
      await pending;
    });
    expect((await expectFlow(latest)).flowState.currentChapter).not.toBe(chapterBefore);
  });

  it.each(['save-slot-2', null] as const)(
    'does not navigate when persistence A settles after live save becomes %s',
    async (successorSaveId) => {
      const heldPersistence = deferred<{ saved: boolean; saveName: string | null }>();
      mockedPersistActiveSaveSnapshot
        .mockImplementationOnce(async (options) => {
          await options.exportSnapshot();
          return { saved: true, saveName: 'A' };
        })
        .mockImplementationOnce(async (options) => {
          await options.exportSnapshot();
          return { saved: true, saveName: 'A' };
        })
        .mockReturnValue(heldPersistence.promise as never);
      const worker = buildWorker();
      const flow = await completeLocalFlow(worker);
      let pending!: Promise<void>;
      await act(async () => {
        pending = flow.onEnterFrontOffice() as unknown as Promise<void>;
        for (let index = 0; index < 4; index += 1) await Promise.resolve();
      });
      expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(3);
      useGameStore.setState({ activeSaveId: successorSaveId, activeSaveSlot: successorSaveId ? 2 : null });
      await act(async () => {
        heldPersistence.resolve({ saved: true, saveName: 'A' });
        await pending;
      });
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('rejects a held A callback after an A to B to A activation cycle', async () => {
    const heldExport = deferred<object>();
    const worker = buildWorker({ exportSnapshot: vi.fn()
      .mockResolvedValueOnce({ season: 1 })
      .mockResolvedValueOnce({ season: 1 })
      .mockReturnValue(heldExport.promise) });
    const flow = await completeLocalFlow(worker);
    let pending!: Promise<void>;
    await act(async () => {
      pending = flow.onEnterFrontOffice() as unknown as Promise<void>;
      await Promise.resolve();
      await Promise.resolve();
    });
    useGameStore.setState({ activeSaveId: 'save-slot-2', activeSaveSlot: 2 });
    useGameStore.setState({ activeSaveId: 'save-slot-1', activeSaveSlot: 1 });
    await act(async () => { heldExport.resolve({ season: 1 }); await pending; });
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(3);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects a held export after the originating controller unmounts', async () => {
    const heldExport = deferred<object>();
    const worker = buildWorker({ exportSnapshot: vi.fn()
      .mockResolvedValueOnce({ season: 1 })
      .mockResolvedValueOnce({ season: 1 })
      .mockReturnValue(heldExport.promise) });
    const flow = await completeLocalFlow(worker);
    let pending!: Promise<void>;
    await act(async () => {
      pending = flow.onEnterFrontOffice() as unknown as Promise<void>;
      await vi.waitFor(() => expect(worker.exportSnapshot).toHaveBeenCalledTimes(3));
      root.unmount();
    });
    await act(async () => { heldExport.resolve({ season: 1 }); await pending; });
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(3);
    expect(navigate).not.toHaveBeenCalled();
    root = createRoot(container);
  });

  it('renders a reachable missing-save route and blocks Return to Save Hub while coordinator work is active', async () => {
    useGameStore.setState({ activeSaveId: null, activeSaveSlot: null });
    const worker = buildWorker();
    const missingGame = { ...GAME_STATE, activeSaveId: null, activeSaveSlot: null };
    await act(async () => {
      root.render(<ControllerHarness game={missingGame} navigate={navigate} onRender={(controller) => { latest = controller; }} worker={worker} />);
    });
    expect(latest?.screen.kind).toBe('missing-save');
    expect(worker.getAGMCandidates).not.toHaveBeenCalled();

    simAdvanceRuntime.status = { kind: 'running' };
    await act(async () => {
      root.render(<ControllerHarness game={missingGame} navigate={navigate} onRender={(controller) => { latest = controller; }} worker={worker} />);
    });
    expect(latest?.screen.kind).toBe('missing-save');
    if (latest?.screen.kind !== 'missing-save') throw new Error('Expected missing-save screen.');
    expect(latest.screen.actionDisabled).toBe(true);
    latest.screen.onReturnToSaveHub();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('treats rejected staff and scouting mutations as no-ops', async () => {
    const worker = buildWorker({
      applyStaffHires: vi.fn().mockResolvedValue({ success: false, flowStateChanged: false }),
      applyScoutingHire: vi.fn().mockResolvedValue({ success: false, flowStateChanged: false }),
    });
    let flow = await advanceToStaff(worker);
    const staffChapter = flow.flowState.currentChapter;
    await act(async () => { await flow.onStaffHires(STAFF_HIRES); });
    flow = await expectFlow(latest);
    expect(flow.flowState.currentChapter).toBe(staffChapter);
    expect(flow.error).toContain('rejected');

    vi.mocked(worker.applyStaffHires).mockResolvedValue({ success: true, flowStateChanged: false } as never);
    await act(async () => { await flow.onStaffHires(STAFF_HIRES); });
    flow = await expectFlow(latest);
    await act(async () => { flow.onChoice('developmentStyle', 'balanced'); });
    flow = await expectFlow(latest);
    const scoutChapter = flow.flowState.currentChapter;
    await act(async () => { await flow.onScoutingHire('scout-draft'); });
    flow = await expectFlow(latest);
    expect(flow.flowState.currentChapter).toBe(scoutChapter);
    expect(flow.error).toContain('rejected');
  });

  it('does not export, persist, or navigate when onboarding completion is rejected', async () => {
    const worker = buildWorker({
      completeRevisedOnboarding: vi.fn().mockResolvedValue({ success: false, flowStateChanged: false }),
    });
    const flow = await completeLocalFlow(worker);
    await act(async () => { await flow.onEnterFrontOffice(); });
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(2);
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(2);
    expect(navigate).not.toHaveBeenCalled();
    expect((await expectFlow(latest)).error).toContain('rejected');
  });

  it.each(['save-slot-2', null] as const)(
    'does not export or persist held completion after live save A becomes %s',
    async (successorSaveId) => {
      const held = deferred<{ success: boolean; flowStateChanged: boolean }>();
      const worker = buildWorker({ completeRevisedOnboarding: vi.fn().mockReturnValue(held.promise) });
      const flow = await completeLocalFlow(worker);
      let pending!: Promise<void>;
      await act(async () => {
        pending = flow.onEnterFrontOffice() as unknown as Promise<void>;
        await Promise.resolve();
      });
      useGameStore.setState({ activeSaveId: successorSaveId, activeSaveSlot: successorSaveId ? 2 : null });
      await act(async () => { held.resolve({ success: true, flowStateChanged: true }); await pending; });
      expect(worker.exportSnapshot).toHaveBeenCalledTimes(2);
      expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(2);
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it.each(['save-slot-2', null] as const)(
    'does not finish a held in-capture export after live save A becomes %s',
    async (successorSaveId) => {
      const held = deferred<object>();
      const worker = buildWorker({ exportSnapshot: vi.fn()
        .mockResolvedValueOnce({ season: 1 })
        .mockResolvedValueOnce({ season: 1 })
        .mockReturnValue(held.promise) });
      const flow = await completeLocalFlow(worker);
      let pending!: Promise<void>;
      await act(async () => {
        pending = flow.onEnterFrontOffice() as unknown as Promise<void>;
        await Promise.resolve();
        await Promise.resolve();
      });
      useGameStore.setState({ activeSaveId: successorSaveId, activeSaveSlot: successorSaveId ? 2 : null });
      await act(async () => { held.resolve({ season: 1 }); await pending; });
      expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledTimes(3);
      expect(navigate).not.toHaveBeenCalled();
    },
  );
});
