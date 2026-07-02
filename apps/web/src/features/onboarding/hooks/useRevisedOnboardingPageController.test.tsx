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
import { loadGameById, saveGame, saveGameById } from '@/shared/lib/saveSystem';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
import {
  useRevisedOnboardingPageController,
  type UseRevisedOnboardingPageControllerResult,
  type RevisedOnboardingPageControllerGameState,
  type RevisedOnboardingPageControllerWorker,
} from './useRevisedOnboardingPageController';

vi.mock('@/shared/lib/saveSystem', () => ({
  loadGameById: vi.fn(),
  saveGame: vi.fn(),
  saveGameById: vi.fn(),
}));

const mockedLoadGameById = vi.mocked(loadGameById);
const mockedSaveGame = vi.mocked(saveGame);
const mockedSaveGameById = vi.mocked(saveGameById);

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

const GAME_STATE: RevisedOnboardingPageControllerGameState = {
  activeSaveId: 'save-slot-1',
  activeSaveSlot: 1,
  gmName: 'General Manager',
};

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
    mockedLoadGameById.mockResolvedValue({
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
    });
    mockedSaveGame.mockResolvedValue(undefined);
    mockedSaveGameById.mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
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
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-1',
      'General Manager • New York Tycoons',
      expect.objectContaining({
        schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
      }),
      expect.objectContaining({
        slotNumber: 1,
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
      }),
    );
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });
});
