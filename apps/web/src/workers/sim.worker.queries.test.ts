// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SignatureMoment } from '@mbd/contracts';

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  createBranchSave: vi.fn(),
  deleteSaveById: vi.fn(),
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

import { api } from './sim.worker';
import { requireState, setState } from './sim.worker.helpers';

function startGame(seed: number, userTeamId: string = 'nym') {
  return api.newGame({
    seed,
    userTeamId,
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
  });
}

describe('worker team moments query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  it('returns a sorted copy of team moments without mutating stored state', () => {
    startGame(2211, 'nym');
    const state = requireState();
    const storedMoments: SignatureMoment[] = [
      {
        season: 7,
        day: 118,
        timestamp: 'S7D118',
        type: 'deadline_buyer',
        description: 'Ownership greenlit the all-in move.',
        impact: 18,
        relevance: 0.74,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'The room doubled down on contention.',
        impact: 21,
        relevance: 0.91,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
      {
        season: 7,
        timestamp: 'S7D120',
        type: 'deadline_seller',
        description: 'The front office pivoted toward future value.',
        impact: -16,
        relevance: 0.91,
        isPlayoff: false,
        isEliminationGame: false,
        worldSeriesClincher: false,
        round: null,
      },
    ];

    state.teamMoments.set('nym', storedMoments);

    const workerApi = api as typeof api & {
      getTeamMoments: (teamId: string) => SignatureMoment[];
    };
    const first = workerApi.getTeamMoments('nym');
    const second = workerApi.getTeamMoments('nym');

    expect(first).toEqual([
      storedMoments[1],
      storedMoments[2],
      storedMoments[0],
    ]);
    expect(second).toEqual(first);
    expect(first).not.toBe(storedMoments);
    expect(state.teamMoments.get('nym')).toEqual(storedMoments);
    expect(workerApi.getTeamMoments('unknown')).toEqual([]);
  });
});

describe('worker getRecentTeamMoments query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  it('returns team moments flattened across teams, sorted by recency and filtered by sinceDay', () => {
    startGame(2211, 'nym');
    const state = requireState();
    state.season = 7;

    const momentA: SignatureMoment = {
      season: 7,
      day: 120,
      timestamp: 'S7D120',
      type: 'deadline_buyer',
      description: 'Tycoons doubled down.',
      impact: 21,
      relevance: 0.91,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    };
    const momentB: SignatureMoment = {
      season: 7,
      day: 115,
      timestamp: 'S7D115',
      type: 'deadline_seller',
      description: 'Sluggers sold at the deadline.',
      impact: -16,
      relevance: 0.88,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    };
    const staleMoment: SignatureMoment = {
      season: 7,
      day: 40,
      timestamp: 'S7D40',
      type: 'deadline_seller',
      description: 'Way back.',
      impact: -10,
      relevance: 0.5,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    };

    state.teamMoments.set('nym', [momentA]);
    state.teamMoments.set('det', [momentB, staleMoment]);

    const workerApi = api as typeof api & {
      getRecentTeamMoments: (sinceDay: number) => Array<{ teamId: string; moment: SignatureMoment }>;
    };

    const recent = workerApi.getRecentTeamMoments(100);

    expect(recent).toEqual([
      { teamId: 'nym', moment: momentA },
      { teamId: 'det', moment: momentB },
    ]);

    const repeat = workerApi.getRecentTeamMoments(100);
    expect(repeat).toEqual(recent);
    expect(workerApi.getRecentTeamMoments(200)).toEqual([]);
  });
});

describe('worker chase watch query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  interface ChaseWatchView {
    season: number;
    day: number;
    careerChases: Array<{
      playerId: string;
      playerName: string;
      teamId: string;
      milestoneLabel: string;
      currentValue: number;
      threshold: number;
      remaining: number;
      urgency: 'imminent' | 'close' | 'approaching';
    }>;
    paceChases: Array<{
      playerId: string;
      playerName: string;
      teamId: string;
      category: string;
      projectedValue: string;
      benchmark: string;
      paceDescription: string;
      confidenceLevel: 'high' | 'medium' | 'low';
    }>;
  }

  it('returns a chase watch view with season/day plus career + pace arrays', () => {
    startGame(3311, 'nym');
    const state = requireState();
    const workerApi = api as typeof api & { getChaseWatch: () => ChaseWatchView };

    const view = workerApi.getChaseWatch();

    expect(view.season).toBe(state.season);
    expect(view.day).toBe(state.day);
    expect(Array.isArray(view.careerChases)).toBe(true);
    expect(Array.isArray(view.paceChases)).toBe(true);
    expect(view.careerChases.length).toBeLessThanOrEqual(5);
    expect(view.paceChases.length).toBeLessThanOrEqual(5);
  });

  it('is deterministic — two calls against the same state return the same view', () => {
    startGame(3311, 'nym');
    const workerApi = api as typeof api & { getChaseWatch: () => ChaseWatchView };

    const first = workerApi.getChaseWatch();
    const second = workerApi.getChaseWatch();

    expect(second).toEqual(first);
  });

  it('surfaces career chases league-wide (not just user team)', () => {
    startGame(3311, 'nym');
    const state = requireState();

    // Find a non-user-team MLB batter and plant a career-chase-worthy stat line.
    // 3000 H is the top hits threshold ([1000, 2000, 3000]) — 2950 is within 10%.
    const nonUserMlb = state.players.find((player) =>
      player.rosterStatus === 'MLB'
      && player.teamId !== 'nym'
      && player.position !== 'SP'
      && player.position !== 'RP'
      && player.position !== 'CL',
    );
    expect(nonUserMlb).toBeTruthy();
    if (!nonUserMlb) return;

    const existing = state.careerStats.find((entry) => entry.playerId === nonUserMlb.id);
    if (existing) {
      existing.batting = { hits: 2950, hr: existing.batting?.hr ?? 0, rbi: existing.batting?.rbi ?? 0 };
      existing.seasonsPlayed = 15;
    } else {
      state.careerStats.push({
        playerId: nonUserMlb.id,
        playerName: `${nonUserMlb.firstName} ${nonUserMlb.lastName}`,
        position: nonUserMlb.position,
        seasonsPlayed: 15,
        teamIds: [nonUserMlb.teamId],
        peakOverall: nonUserMlb.overallRating,
        championshipRings: 0,
        allStarSelections: 0,
        batting: { hits: 2950, hr: 0, rbi: 0 },
        pitching: null,
      });
    }

    const workerApi = api as typeof api & { getChaseWatch: () => ChaseWatchView };
    const view = workerApi.getChaseWatch();

    const chase = view.careerChases.find((entry) => entry.playerId === nonUserMlb.id);
    expect(chase).toBeTruthy();
    expect(chase?.teamId).toBe(nonUserMlb.teamId);
    expect(chase?.milestoneLabel).toBe('Hits');
    expect(chase?.threshold).toBe(3000);
    expect(chase?.remaining).toBe(50);
    // 50 / 3000 = 1.67% — below the 2% IMMINENT_THRESHOLD_FRACTION floor.
    expect(chase?.urgency).toBe('imminent');
  });
});
