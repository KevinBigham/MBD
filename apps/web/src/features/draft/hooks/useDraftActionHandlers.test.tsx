import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraftActionHandlers } from './useDraftActionHandlers';
import type {
  DraftActionResult,
  DraftRoomPick,
  DraftRoomProspect,
  DraftRoomView,
} from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDraftActionHandlers>[0];
type HookResult = ReturnType<typeof useDraftActionHandlers>;

function pick(index: number): DraftRoomPick {
  return {
    slotId: `standard:1:${index}:nym`,
    round: 1,
    pickNumber: index,
    teamId: 'nym',
    teamName: 'New York Tycoons',
    teamAbbreviation: 'NYT',
    playerId: `player-${index}`,
    playerName: `Player ${index}`,
    position: 'SS',
    scoutingGrade: 60 + index,
    origin: 'College',
    tone: 'user',
  };
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
      scoutAccuracy: {
        label: 'Draft focus 74%',
        value: 74,
        detail: '2 looks with the draft staff confidence model.',
      },
      disagreement: {
        label: 'Small gap',
        value: 3,
        detail: 'Your room is 3 points above the consensus board.',
      },
      makeup: {
        label: 'Strong makeup',
        value: 82,
        detail: 'Work ethic and mental toughness support a longer development runway.',
      },
      signability: {
        label: 'Difficult sign',
        value: 42,
        detail: 'Ask $2.80M against $2.40M slot; commitment leverage is live.',
      },
      risk: {
        label: 'High risk',
        value: 71,
        detail: 'Prep profile, bonus leverage, and limited certainty raise the variance.',
      },
      whyThisPick: 'Middle-of-diamond upside with a +3 internal grade edge; signability needs attention.',
    },
    ...overrides,
  };
}

function draftView(completedPicks: DraftRoomPick[] = []): DraftRoomView {
  return {
    status: 'in_progress',
    availableProspects: [prospect()],
    udfaProspects: [],
    completedPicks,
    currentPick: {
      slotId: 'standard:1:3:nym',
      round: 1,
      pickNumber: 3,
      pickInRound: 3,
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
    userBigBoard: [],
  };
}

function actionResult(draft: DraftRoomView, newPicks: DraftRoomPick[] = []): DraftActionResult {
  return {
    success: true,
    draft,
    newPicks,
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDraftActionHandlers(options));
  return null;
}

describe('useDraftActionHandlers', () => {
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
      loadDraft: vi.fn().mockResolvedValue(undefined),
      makeDraftPick: vi.fn().mockResolvedValue(actionResult(draftView([pick(1)]))),
      scoutDraftPlayer: vi.fn().mockResolvedValue(undefined),
      selectedProspect: prospect(),
      season: 6,
      setDraft: vi.fn(),
      setRevealedPickCount: vi.fn(),
      setWatchTargetCount: vi.fn(),
      signDraftPick: vi.fn().mockResolvedValue(undefined),
      simulateRemainingDraft: vi.fn().mockResolvedValue(actionResult(
        draftView([pick(1), pick(2), pick(3)]),
        [pick(2), pick(3)],
      )),
      startDraft: vi.fn().mockResolvedValue(actionResult(draftView([pick(1), pick(2)]))),
      toggleDraftBigBoard: vi.fn().mockResolvedValue(undefined),
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

  it('starts the draft and applies a successful result to visible-pick state', async () => {
    const startedDraft = draftView([pick(1), pick(2)]);
    const options = baseOptions({
      startDraft: vi.fn().mockResolvedValue(actionResult(startedDraft)),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleStartDraft();
    });

    expect(options.startDraft).toHaveBeenCalledTimes(1);
    expect(options.setDraft).toHaveBeenCalledWith(startedDraft);
    expect(options.setWatchTargetCount).toHaveBeenCalledWith(null);
    expect(options.setRevealedPickCount).toHaveBeenCalledWith(2);
    expect(latestResult?.loading).toBe(false);
    expect(latestResult?.error).toBeNull();
  });

  it('sets watch-mode reveal boundaries when simulating the rest of the draft', async () => {
    const finalDraft = draftView([pick(1), pick(2), pick(3)]);
    const options = baseOptions({
      simulateRemainingDraft: vi.fn().mockResolvedValue(actionResult(finalDraft, [pick(2), pick(3)])),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleWatchDraft();
    });

    expect(options.simulateRemainingDraft).toHaveBeenCalledTimes(1);
    expect(options.setDraft).toHaveBeenCalledWith(finalDraft);
    expect(options.setRevealedPickCount).toHaveBeenCalledWith(1);
    expect(options.setWatchTargetCount).toHaveBeenCalledWith(3);
    expect(latestResult?.loading).toBe(false);
  });

  it('autosaves successful draft start, pick, and watch mutations', async () => {
    const autosaveActiveGame = vi.fn().mockResolvedValue(undefined);
    const options = {
      ...baseOptions(),
      autosaveActiveGame,
      season: 6,
    };
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleStartDraft();
      await latestResult?.handleMakePick();
      await latestResult?.handleWatchDraft();
    });

    expect(autosaveActiveGame).toHaveBeenCalledTimes(3);
    expect(autosaveActiveGame).toHaveBeenNthCalledWith(1, { season: 6 });
    expect(autosaveActiveGame).toHaveBeenNthCalledWith(2, { season: 6 });
    expect(autosaveActiveGame).toHaveBeenNthCalledWith(3, { season: 6 });
  });

  it('validates and parses draft signing bonuses before calling the worker', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleSignDraftPick('player-1');
    });

    expect(options.signDraftPick).not.toHaveBeenCalled();
    expect(latestResult?.error).toBe('Enter a valid bonus offer.');

    await act(async () => {
      latestResult?.handleBonusOfferChange('player-1', '2.75');
    });
    await act(async () => {
      await latestResult?.handleSignDraftPick('player-1');
    });

    expect(options.signDraftPick).toHaveBeenCalledWith('player-1', 2.75);
    expect(options.loadDraft).toHaveBeenCalledTimes(1);
    expect(latestResult?.signingPlayerId).toBeNull();
    expect(latestResult?.error).toBeNull();
  });

  it('reloads draft data after scout and big-board actions for the selected prospect', async () => {
    const selectedProspect = prospect({ id: 'prospect-42' });
    const options = baseOptions({ selectedProspect });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleScoutProspect();
      await latestResult?.handleToggleBigBoard();
    });

    expect(options.scoutDraftPlayer).toHaveBeenCalledWith('prospect-42');
    expect(options.toggleDraftBigBoard).toHaveBeenCalledWith('prospect-42');
    expect(options.loadDraft).toHaveBeenCalledTimes(2);
    expect(latestResult?.scouting).toBe(false);
    expect(latestResult?.error).toBeNull();
  });

  it('autosaves successful draft scouting, big-board, and signing mutations', async () => {
    const autosaveActiveGame = vi.fn().mockResolvedValue(undefined);
    const selectedProspect = prospect({ id: 'prospect-42' });
    const options = {
      ...baseOptions({ selectedProspect }),
      autosaveActiveGame,
      season: 6,
    };
    await renderHook(options);

    await act(async () => {
      latestResult?.handleBonusOfferChange('player-1', '2.75');
    });
    await act(async () => {
      await latestResult?.handleScoutProspect();
      await latestResult?.handleToggleBigBoard();
      await latestResult?.handleSignDraftPick('player-1');
    });

    expect(options.scoutDraftPlayer).toHaveBeenCalledWith('prospect-42');
    expect(options.toggleDraftBigBoard).toHaveBeenCalledWith('prospect-42');
    expect(options.signDraftPick).toHaveBeenCalledWith('player-1', 2.75);
    expect(autosaveActiveGame).toHaveBeenCalledTimes(3);
    expect(autosaveActiveGame).toHaveBeenNthCalledWith(1, { season: 6 });
    expect(autosaveActiveGame).toHaveBeenNthCalledWith(2, { season: 6 });
    expect(autosaveActiveGame).toHaveBeenNthCalledWith(3, { season: 6 });
  });

  it('persists an accepted signing before the room refresh, even when the refresh rejects', async () => {
    const autosaveActiveGame = vi.fn().mockResolvedValue(undefined);
    const loadDraft = vi.fn().mockRejectedValue(new Error('refresh offline'));
    const order: string[] = [];
    autosaveActiveGame.mockImplementation(async () => {
      order.push('autosave');
    });
    loadDraft.mockImplementation(async () => {
      order.push('refresh');
      throw new Error('refresh offline');
    });
    const options = {
      ...baseOptions(),
      autosaveActiveGame,
      loadDraft,
      season: 6,
    };
    await renderHook(options);

    await act(async () => {
      latestResult?.handleBonusOfferChange('player-1', '2.75');
    });
    await act(async () => {
      await latestResult?.handleSignDraftPick('player-1');
    });

    // The accepted signing was persisted before the refresh that later rejected.
    expect(autosaveActiveGame).toHaveBeenCalledTimes(1);
    expect(autosaveActiveGame).toHaveBeenCalledWith({ season: 6 });
    expect(order).toEqual(['autosave', 'refresh']);
    expect(latestResult?.signingPlayerId).toBeNull();
    // A display-only refresh failure must not surface as a signing error.
    expect(latestResult?.error).toBeNull();
  });

  it('does not autosave failed or invalid draft mutations', async () => {
    const autosaveActiveGame = vi.fn().mockResolvedValue(undefined);
    const options = {
      ...baseOptions({
        makeDraftPick: vi.fn().mockResolvedValue({ success: false, error: 'Board locked.' }),
        scoutDraftPlayer: vi.fn().mockResolvedValue({ success: false, error: 'Scouting locked.' }),
        signDraftPick: vi.fn().mockResolvedValue({ success: false, error: 'Signing locked.' }),
        startDraft: vi.fn().mockRejectedValue(new Error('offline')),
        toggleDraftBigBoard: vi.fn().mockResolvedValue({ success: false, error: 'Board update locked.' }),
      }),
      autosaveActiveGame,
      season: 6,
    };
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleStartDraft();
      await latestResult?.handleMakePick();
      await latestResult?.handleScoutProspect();
      await latestResult?.handleToggleBigBoard();
      await latestResult?.handleSignDraftPick('player-1');
    });
    await act(async () => {
      latestResult?.handleBonusOfferChange('player-1', '2.75');
    });
    await act(async () => {
      await latestResult?.handleSignDraftPick('player-1');
    });

    expect(autosaveActiveGame).not.toHaveBeenCalled();
  });
});
