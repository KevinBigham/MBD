import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraftPageController } from './useDraftPageController';
import type {
  DraftRoomPick,
  DraftRoomProspect,
  DraftRoomView,
} from '@/workers/sim.worker.helpers';

vi.mock('@/shared/hooks/useExactOffseasonMutationExecutor', () => ({
  useExactSaveMutationExecutor: (worker: { execute: (session: object, operation: unknown) => Promise<unknown> }) =>
    (operation: unknown) => worker.execute({}, operation),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDraftPageController>[0];
type HookResult = ReturnType<typeof useDraftPageController>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDraftPageController(options));
  return null;
}

function prospect(overrides: Partial<DraftRoomProspect> = {}): DraftRoomProspect {
  return {
    id: 'prospect-1',
    playerId: 'prospect-1',
    name: 'Eli Prospect',
    firstName: 'Eli',
    lastName: 'Prospect',
    position: 'SS',
    scoutingGrade: 61,
    consensusGrade: 58,
    looks: 2,
    slotValue: 2.4,
    askBonus: 2.8,
    background: 'high_school',
    bigBoardRank: 1,
    age: 18,
    origin: 'HS',
    scoutConflict: null,
    decisionInputs: {
      scoutAccuracy: { label: 'Draft focus 74%', value: 74, detail: '2 looks with the draft staff confidence model.' },
      disagreement: { label: 'Small gap', value: 3, detail: 'Your room is 3 points above the consensus board.' },
      makeup: { label: 'Strong makeup', value: 82, detail: 'Work ethic supports a longer development runway.' },
      signability: { label: 'Difficult sign', value: 42, detail: 'Commitment leverage is live.' },
      risk: { label: 'High risk', value: 71, detail: 'Prep profile and limited certainty raise the variance.' },
      whyThisPick: 'Middle-of-diamond upside with a strong internal grade edge.',
    },
    ...overrides,
  };
}

function pick(overrides: Partial<DraftRoomPick> & Pick<DraftRoomPick, 'pickNumber' | 'playerId' | 'playerName'>): DraftRoomPick {
  return {
    slotId: overrides.slotId ?? `standard:1:${overrides.pickNumber}:nym`,
    round: overrides.round ?? 1,
    pickNumber: overrides.pickNumber,
    teamId: overrides.teamId ?? 'nym',
    teamName: overrides.teamName ?? 'New York Tycoons',
    teamAbbreviation: overrides.teamAbbreviation ?? 'NYT',
    playerId: overrides.playerId,
    playerName: overrides.playerName,
    position: overrides.position ?? 'SS',
    scoutingGrade: overrides.scoutingGrade ?? 61,
    origin: overrides.origin ?? 'HS',
    slotKind: overrides.slotKind,
    compensation: overrides.compensation,
    tone: overrides.tone ?? 'user',
  };
}

function draftView(overrides: Partial<DraftRoomView> = {}): DraftRoomView {
  const completedPicks = overrides.completedPicks ?? [
    pick({ pickNumber: 1, playerId: 'pick-1', playerName: 'Marcus Early' }),
  ];
  return {
    status: 'in_progress',
    availableProspects: [prospect()],
    udfaProspects: [],
    completedPicks,
    currentPick: {
      slotId: 'standard:1:2:nym',
      round: 1,
      pickNumber: 2,
      pickInRound: 2,
      totalPicks: 3,
      teamId: 'nym',
      teamName: 'New York Tycoons',
      teamAbbreviation: 'NYT',
      userOnClock: true,
    },
    board: { teams: [], rounds: [] },
    counts: {
      totalRounds: 20,
      totalPicks: 3,
      picksMade: completedPicks.length,
      picksRemaining: Math.max(0, 3 - completedPicks.length),
    },
    userDraftClass: null,
    userBigBoard: ['prospect-1'],
    ...overrides,
  };
}

describe('useDraftPageController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      isInitialized: true,
      nudgeCard: <div data-testid="draft-nudge">nudge</div>,
      phase: 'offseason',
      playEffect: vi.fn(),
      season: 4,
      worker: {
        exactSaveMutation: {
          exportSnapshot: vi.fn(),
          execute: vi.fn().mockImplementation((_session, operation) => {
            if ((operation as { kind?: string }).kind === 'simulateRemainingDraft') {
              return Promise.resolve({ success: true, draft: draftView(), newPicks: [] });
            }
            return Promise.resolve({ success: true, draft: draftView(), newPicks: [] });
          }),
          restoreBaseline: vi.fn(),
          publishFlow: vi.fn(),
          discardFlow: vi.fn(),
        },
        getDraftClass: vi.fn().mockResolvedValue(draftView()),
        getDraftCommentary: vi.fn().mockResolvedValue({
          heartbeat: 'NYT are live at pick 2.',
          entries: [],
          buzz: [],
        }),
        getDraftPostDraftGrades: vi.fn().mockResolvedValue(null),
        getDraftProspectReaction: vi.fn().mockResolvedValue(null),
        getOffseasonState: vi.fn().mockResolvedValue({ currentPhase: 'draft' }),
        isReady: true,
        makeDraftPick: vi.fn().mockResolvedValue({ success: true, draft: draftView(), newPicks: [] }),
        scoutDraftPlayer: vi.fn().mockResolvedValue({ success: true, draft: draftView(), newPicks: [] }),
        signDraftPick: vi.fn().mockResolvedValue({ success: true, draft: draftView(), newPicks: [] }),
        simulateRemainingDraft: vi.fn().mockResolvedValue({ success: true, draft: draftView(), newPicks: [] }),
        startDraft: vi.fn().mockResolvedValue({ success: true, draft: draftView(), newPicks: [] }),
        toggleDraftBigBoard: vi.fn().mockResolvedValue({ success: true, draft: draftView(), newPicks: [] }),
      },
      ...overrides,
    } as HookOptions;
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await Promise.resolve();
      });
    }
    throw lastError;
  }

  it('builds draft-page content props from existing route data and action hooks', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.availabilityPanelProps).toBeNull();
      expect(latestResult?.contentProps.nudgeCard).toBe(options.nudgeCard);
      expect(latestResult?.contentProps.roomContentProps?.roomHeaderPanelProps.status).toBe('Draft In Progress');
      expect(latestResult?.contentProps.roomContentProps?.roomHeaderPanelProps.progressLabel)
        .toBe('Round 1 of 20 — Pick 1 of 3');
      expect(latestResult?.contentProps.roomContentProps?.currentPickPanelProps.selectedProspect?.name)
        .toBe('Eli Prospect');
      expect(latestResult?.contentProps.roomContentProps?.tickerProps.picks.map((row) => row.playerName))
        .toEqual(['Marcus Early']);
    });

    await act(async () => {
      await latestResult?.contentProps.roomContentProps?.roomHeaderPanelProps.onWatchDraft();
    });

    expect(options.worker.exactSaveMutation.execute).toHaveBeenCalledWith(
      {},
      { kind: 'simulateRemainingDraft' },
    );
  });

  it('keeps the draft unavailable until the exact offseason draft subphase', async () => {
    const options = baseOptions({
      worker: {
        ...baseOptions().worker,
        getOffseasonState: vi.fn().mockResolvedValue({ currentPhase: 'qualifying_offers' }),
      },
    });
    await renderHook(options);
    await waitForAssertion(() => {
      expect(latestResult?.contentProps.availabilityPanelProps?.status).toBe('Draft Unavailable');
      expect(latestResult?.contentProps.availabilityPanelProps?.variant).toBe('unavailable');
      expect(latestResult?.contentProps.roomContentProps).toBeNull();
    });
  });
});
