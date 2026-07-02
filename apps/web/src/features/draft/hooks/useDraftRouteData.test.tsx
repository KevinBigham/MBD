import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useDraftRouteData } from './useDraftRouteData';
import type { WorkerApi } from '@/workers/sim.worker';
import type {
  DraftRoomPick,
  DraftRoomProspect,
  DraftRoomView,
} from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDraftRouteData>[0];
type HookResult = ReturnType<typeof useDraftRouteData>;
type DraftCommentaryView = Awaited<ReturnType<WorkerApi['getDraftCommentary']>>;
type DraftProspectReactionView = Awaited<ReturnType<WorkerApi['getDraftProspectReaction']>>;
type DraftPostDraftGradesView = Awaited<ReturnType<WorkerApi['getDraftPostDraftGrades']>>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDraftRouteData(options));
  return null;
}

function makeProspect(overrides: Partial<DraftRoomProspect> & Pick<DraftRoomProspect, 'id' | 'name' | 'scoutingGrade'>): DraftRoomProspect {
  return {
    id: overrides.id,
    playerId: overrides.playerId ?? overrides.id,
    name: overrides.name,
    firstName: overrides.firstName ?? overrides.name.split(' ')[0] ?? overrides.name,
    lastName: overrides.lastName ?? (overrides.name.split(' ').slice(1).join(' ') || overrides.name),
    position: overrides.position ?? 'SS',
    scoutingGrade: overrides.scoutingGrade,
    consensusGrade: overrides.consensusGrade ?? overrides.scoutingGrade,
    looks: overrides.looks ?? 2,
    slotValue: overrides.slotValue ?? 2.4,
    askBonus: overrides.askBonus ?? 2.8,
    background: overrides.background ?? 'high_school',
    bigBoardRank: overrides.bigBoardRank ?? null,
    age: overrides.age ?? 18,
    origin: overrides.origin ?? 'HS',
    scoutConflict: overrides.scoutConflict ?? null,
    decisionInputs: overrides.decisionInputs ?? {
      scoutAccuracy: { label: 'Draft focus 74%', value: 74, detail: '2 looks with the draft staff confidence model.' },
      disagreement: { label: 'Small gap', value: 3, detail: 'Your room is 3 points above the consensus board.' },
      makeup: { label: 'Strong makeup', value: 82, detail: 'Work ethic supports a longer development runway.' },
      signability: { label: 'Difficult sign', value: 42, detail: 'Commitment leverage is live.' },
      risk: { label: 'High risk', value: 71, detail: 'Prep profile and limited certainty raise the variance.' },
      whyThisPick: 'Middle-of-diamond upside with a strong internal grade edge.',
    },
  };
}

function makePick(overrides: Partial<DraftRoomPick> & Pick<DraftRoomPick, 'pickNumber' | 'playerId' | 'playerName'>): DraftRoomPick {
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

function makeDraftView(overrides: Partial<DraftRoomView> = {}): DraftRoomView {
  const completedPicks = overrides.completedPicks ?? [
    makePick({ pickNumber: 1, playerId: 'pick-1', playerName: 'Marcus Early' }),
  ];
  const availableProspects = overrides.availableProspects ?? [
    makeProspect({ id: 'prospect-1', name: 'Eli Prospect', scoutingGrade: 61 }),
    makeProspect({ id: 'prospect-2', name: 'Maya College', scoutingGrade: 63, position: 'SP' }),
  ];

  return {
    status: 'in_progress',
    availableProspects,
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

const commentaryView: NonNullable<DraftCommentaryView> = {
  heartbeat: 'NYT are live at pick 2 with 2 prospects still on the board.',
  entries: [
    {
      id: 'clock-2',
      pickNumber: null,
      tag: 'scouting-director',
      headline: 'NYT are on the clock at 2nd',
      detail: 'Best names left for New York Tycoons: Eli Prospect.',
      tone: 'user',
      playerId: null,
    },
  ],
  buzz: [],
};

const reactionView: NonNullable<DraftProspectReactionView> = {
  playerId: 'prospect-1',
  headline: 'Eli Prospect looks like a board win if the card is ready',
  summary: 'Eli Prospect fits the zone where talent and cost can still balance out.',
  fit: 'New York Tycoons would be targeting an infielder who can stay in the middle of the diamond.',
  risk: 'The risk lives in the runway: high school profile, more development turns, more variance.',
  signability: 'The signability should play cleanly if the bonus room is ready.',
  recommendation: 'hover',
};

const gradesView: NonNullable<DraftPostDraftGradesView> = {
  userTeamId: 'nym',
  userTeamGrade: {
    teamId: 'nym',
    teamName: 'New York Tycoons',
    pickCount: 1,
    averageScoutingGrade: 61,
    grade: 'B',
    bestPickPlayerId: 'pick-1',
    bestPickPlayerName: 'Marcus Early',
    summary: 'New York Tycoons landed a steady class.',
  },
  grades: [
    {
      teamId: 'nym',
      teamName: 'New York Tycoons',
      pickCount: 1,
      averageScoutingGrade: 61,
      grade: 'B',
      bestPickPlayerId: 'pick-1',
      bestPickPlayerName: 'Marcus Early',
      summary: 'New York Tycoons landed a steady class.',
    },
  ],
};

describe('useDraftRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      getDraftClass: vi.fn().mockResolvedValue(makeDraftView()),
      getDraftCommentary: vi.fn().mockResolvedValue(commentaryView),
      getDraftPostDraftGrades: vi.fn().mockResolvedValue(gradesView),
      getDraftProspectReaction: vi.fn().mockResolvedValue(reactionView),
      isInitialized: true,
      phase: 'offseason',
      playEffect: vi.fn(),
      season: 4,
      workerReady: true,
      ...overrides,
    };
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

  it('loads draft room data, selects the top available prospect, and refreshes war-room DTOs', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.draft?.status).toBe('in_progress');
      expect(latestResult?.selectedProspect?.id).toBe('prospect-1');
      expect(latestResult?.visiblePicks.map((pick) => pick.playerName)).toEqual(['Marcus Early']);
      expect(latestResult?.commentary?.heartbeat).toContain('NYT are live');
      expect(latestResult?.reaction?.headline).toContain('Eli Prospect');
      expect(latestResult?.gradesView?.userTeamGrade?.grade).toBe('B');
    });

    expect(options.getDraftClass).toHaveBeenCalledTimes(1);
    expect(options.getDraftCommentary).toHaveBeenCalledWith(1);
    expect(options.getDraftProspectReaction).toHaveBeenCalledWith('prospect-1');
    expect(options.getDraftPostDraftGrades).toHaveBeenCalled();
  });

  it('does not query draft worker DTOs before the route is initialized and ready', async () => {
    const options = baseOptions({ isInitialized: false, workerReady: false });
    await renderHook(options);

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestResult?.draft).toBeNull();
    expect(latestResult?.visiblePicks).toEqual([]);
    expect(options.getDraftClass).not.toHaveBeenCalled();
    expect(options.getDraftCommentary).not.toHaveBeenCalled();
    expect(options.getDraftProspectReaction).not.toHaveBeenCalled();
    expect(options.getDraftPostDraftGrades).not.toHaveBeenCalled();
  });

  it('reveals watched draft picks on the existing timer and plays the announcement effect', async () => {
    const options = baseOptions({
      getDraftClass: vi.fn().mockResolvedValue(makeDraftView({
        completedPicks: [
          makePick({ pickNumber: 1, playerId: 'pick-1', playerName: 'Marcus Early' }),
          makePick({ pickNumber: 2, playerId: 'pick-2', playerName: 'Eli Prospect' }),
          makePick({ pickNumber: 3, playerId: 'pick-3', playerName: 'Maya College', position: 'SP' }),
        ],
      })),
    });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.visiblePicks).toHaveLength(3);
    });

    await act(async () => {
      latestResult?.setRevealedPickCount(1);
      latestResult?.setWatchTargetCount(3);
    });

    expect(latestResult?.visiblePicks.map((pick) => pick.playerName)).toEqual(['Marcus Early']);

    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    expect(latestResult?.visiblePicks.map((pick) => pick.playerName)).toEqual(['Marcus Early', 'Eli Prospect']);
    expect(options.playEffect).toHaveBeenCalledWith('draft_pick_announced');

    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(latestResult?.visiblePicks.map((pick) => pick.playerName)).toEqual([
      'Marcus Early',
      'Eli Prospect',
      'Maya College',
    ]);
    expect(latestResult?.watching).toBe(false);
  });
});
