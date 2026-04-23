// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SignatureMoment } from '@mbd/contracts';
import { SEASON_GAMES, getTeamById } from '@mbd/sim-core';

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

describe('worker getThisWeekInHistory query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  function makeMoment(season: number, day: number, type: string, description: string, relevance: number): SignatureMoment {
    return {
      season,
      day,
      timestamp: `S${season}D${day}`,
      type: type as SignatureMoment['type'],
      description,
      impact: 10,
      relevance,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    };
  }

  it('returns empty arrays when no prior-season moments fall within the window', () => {
    startGame(2211, 'nym');
    const state = requireState();
    state.season = 3;
    state.day = 120;

    // Only current-season moments; should be filtered out.
    state.teamMoments.set('nym', [makeMoment(3, 118, 'deadline_buyer', 'Current season.', 0.8)]);
    state.playerMoments.set('p1', [makeMoment(3, 119, 'walk_off_hr', 'Also current.', 0.7)]);

    const workerApi = api as typeof api & {
      getThisWeekInHistory: (dayWindow: number) => {
        season: number;
        day: number;
        dayWindow: number;
        playerMoments: ReadonlyArray<{ playerId: string; playerName: string; teamId: string; yearsAgo: number; moment: SignatureMoment }>;
        teamMoments: ReadonlyArray<{ teamId: string; yearsAgo: number; moment: SignatureMoment }>;
      };
    };

    const view = workerApi.getThisWeekInHistory(3);

    expect(view.season).toBe(3);
    expect(view.day).toBe(120);
    expect(view.dayWindow).toBe(3);
    expect(view.playerMoments).toEqual([]);
    expect(view.teamMoments).toEqual([]);
  });

  it('surfaces strictly-prior-season moments whose day is within ±window, annotated with yearsAgo', () => {
    startGame(2211, 'nym');
    const state = requireState();
    state.season = 7;
    state.day = 120;

    // In window (±3 of day 120): day 118, 120, 123. Out of window: day 100, day 130.
    const inWindowPlayer = makeMoment(5, 121, 'no_hitter', 'No-hitter at Fenway.', 0.9);
    const inWindowTeam = makeMoment(4, 118, 'championship_run', 'Clinched division.', 0.95);
    const outOfWindowPlayer = makeMoment(5, 100, 'walk_off_hr', 'Too far back.', 0.6);
    const outOfWindowTeam = makeMoment(4, 130, 'deadline_seller', 'Too far forward.', 0.5);
    // Current season, even if day matches, must be excluded.
    const currentSeasonTeam = makeMoment(7, 120, 'contention_window_opens', 'Current season match.', 0.9);

    state.playerMoments.set('p1', [inWindowPlayer, outOfWindowPlayer]);
    state.teamMoments.set('nym', [inWindowTeam, outOfWindowTeam, currentSeasonTeam]);

    const workerApi = api as typeof api & {
      getThisWeekInHistory: (dayWindow: number) => {
        season: number;
        day: number;
        dayWindow: number;
        playerMoments: Array<{ playerId: string; playerName: string; teamId: string; yearsAgo: number; moment: SignatureMoment }>;
        teamMoments: Array<{ teamId: string; yearsAgo: number; moment: SignatureMoment }>;
      };
    };

    const view = workerApi.getThisWeekInHistory(3);

    expect(view.playerMoments).toHaveLength(1);
    expect(view.playerMoments[0]?.playerId).toBe('p1');
    expect(view.playerMoments[0]?.yearsAgo).toBe(2);
    expect(view.playerMoments[0]?.moment).toEqual(inWindowPlayer);

    expect(view.teamMoments).toHaveLength(1);
    expect(view.teamMoments[0]?.teamId).toBe('nym');
    expect(view.teamMoments[0]?.yearsAgo).toBe(3);
    expect(view.teamMoments[0]?.moment).toEqual(inWindowTeam);
  });

  it('is deterministic and order-stable across repeated calls on the same state', () => {
    startGame(2211, 'nym');
    const state = requireState();
    state.season = 6;
    state.day = 100;

    state.teamMoments.set('nym', [makeMoment(4, 100, 'championship_run', 'A', 0.9)]);
    state.teamMoments.set('bos', [makeMoment(4, 100, 'championship_run', 'B', 0.9)]);
    state.teamMoments.set('det', [makeMoment(3, 101, 'championship_run', 'C', 0.9)]);

    const workerApi = api as typeof api & {
      getThisWeekInHistory: (dayWindow: number) => {
        teamMoments: ReadonlyArray<{ teamId: string; yearsAgo: number; moment: SignatureMoment }>;
      };
    };

    const first = workerApi.getThisWeekInHistory(3);
    const second = workerApi.getThisWeekInHistory(3);

    expect(first).toEqual(second);
    // Smaller yearsAgo sorts earlier. Among same yearsAgo, relevance desc;
    // here identical so tiebreaker falls to teamId ascending.
    expect(first.teamMoments.map((entry) => entry.teamId)).toEqual(['bos', 'nym', 'det']);
  });

  it('honors dayWindow=0 as exact-day match and excludes off-by-one days', () => {
    startGame(2211, 'nym');
    const state = requireState();
    state.season = 5;
    state.day = 80;

    state.teamMoments.set('nym', [
      makeMoment(3, 80, 'championship_run', 'Exact match.', 0.9),
      makeMoment(3, 81, 'championship_run', 'Off by one.', 0.9),
    ]);

    const workerApi = api as typeof api & {
      getThisWeekInHistory: (dayWindow: number) => {
        teamMoments: ReadonlyArray<{ teamId: string; yearsAgo: number; moment: SignatureMoment }>;
      };
    };

    const view = workerApi.getThisWeekInHistory(0);
    expect(view.teamMoments).toHaveLength(1);
    expect(view.teamMoments[0]?.moment.description).toBe('Exact match.');
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

describe('worker pennant races query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  interface PennantRaceView {
    season: number;
    day: number;
    gamesRemaining: number;
    divisionRaces: Array<{
      division: string;
      divisionLabel: string;
      leader: { teamId: string; abbreviation: string; name: string; wins: number; losses: number; streak: string };
      chaser: { teamId: string; abbreviation: string; name: string; wins: number; losses: number; streak: string } | null;
      gamesBack: number;
      magicNumber: number | null;
      heat: 'tight' | 'close' | 'comfortable';
    }>;
    wildcardRaces: Array<{
      league: 'AL' | 'NL';
      leagueLabel: string;
      teams: Array<{
        teamId: string;
        abbreviation: string;
        name: string;
        wins: number;
        losses: number;
        gamesBack: number;
        streak: string;
        inWildcard: boolean;
      }>;
    }>;
  }

  // Plant a controlled W-L record directly into the standings tracker's private
  // map. Much cleaner than calling recordGame repeatedly (which inflates both
  // the winner and the chosen loser, making multi-team scenarios noisy).
  function plantTeamRecord(
    state: ReturnType<typeof requireState>,
    teamId: string,
    wins: number,
    losses: number,
    streak: number = 0,
  ): void {
    const tracker = state.seasonState.standings as unknown as {
      records: Map<string, {
        teamId: string;
        wins: number;
        losses: number;
        runsScored: number;
        runsAllowed: number;
        streak: number;
        last10: [number, number];
        divisionWins: number;
        divisionLosses: number;
      }>;
    };
    tracker.records.set(teamId, {
      teamId,
      wins,
      losses,
      runsScored: 0,
      runsAllowed: 0,
      streak,
      last10: [0, 0],
      divisionWins: 0,
      divisionLosses: 0,
    });
  }

  it('returns a pennant race view with season/day plus division + wildcard arrays', () => {
    startGame(4411, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 60, 30);
    plantTeamRecord(state, 'phi', 55, 35);

    const workerApi = api as typeof api & { getPennantRaces: () => PennantRaceView };
    const view = workerApi.getPennantRaces();

    expect(view.season).toBe(state.season);
    expect(view.day).toBe(state.day);
    expect(typeof view.gamesRemaining).toBe('number');
    expect(Array.isArray(view.divisionRaces)).toBe(true);
    expect(Array.isArray(view.wildcardRaces)).toBe(true);
  });

  it('is deterministic — two calls against the same state return the same view', () => {
    startGame(4411, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 60, 30);
    plantTeamRecord(state, 'phi', 58, 32);

    const workerApi = api as typeof api & { getPennantRaces: () => PennantRaceView };
    const first = workerApi.getPennantRaces();
    const second = workerApi.getPennantRaces();

    expect(second).toEqual(first);
  });

  it('drops comfortable blowouts and keeps only tight/close divisional races', () => {
    startGame(4411, 'nym');
    const state = requireState();
    // AL_EAST: nym 60-30 vs phi 58-32 — 2 GB (tight)
    plantTeamRecord(state, 'nym', 60, 30);
    plantTeamRecord(state, 'phi', 58, 32);
    // AL_CENTRAL: chi 60-30 vs det 40-50 — 20 GB (comfortable blowout)
    plantTeamRecord(state, 'chi', 60, 30);
    plantTeamRecord(state, 'det', 40, 50);

    const workerApi = api as typeof api & { getPennantRaces: () => PennantRaceView };
    const view = workerApi.getPennantRaces();

    const divisions = view.divisionRaces.map((race) => race.division);
    expect(divisions).toContain('AL_EAST');
    expect(divisions).not.toContain('AL_CENTRAL');
  });

  it('computes magic number from the standard MLB formula (season - leaderWins - chaserLosses + 1)', () => {
    startGame(4411, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 80, 40);
    plantTeamRecord(state, 'phi', 78, 42);

    const workerApi = api as typeof api & { getPennantRaces: () => PennantRaceView };
    const view = workerApi.getPennantRaces();

    const alEast = view.divisionRaces.find((race) => race.division === 'AL_EAST');
    expect(alEast).toBeDefined();
    expect(alEast?.leader.teamId).toBe('nym');
    expect(alEast?.chaser?.teamId).toBe('phi');
    expect(alEast?.magicNumber).toBe(SEASON_GAMES - 80 - 42 + 1);
  });

  it('gates early-season output with empty races when no team has reached 10 games played', () => {
    startGame(4411, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 5, 3);
    plantTeamRecord(state, 'phi', 3, 5);

    const workerApi = api as typeof api & { getPennantRaces: () => PennantRaceView };
    const view = workerApi.getPennantRaces();

    expect(view.divisionRaces).toEqual([]);
    expect(view.wildcardRaces).toEqual([]);
  });

  it('surfaces league-wide coverage across both AL and NL division races', () => {
    startGame(4411, 'nym');
    const state = requireState();
    // AL_EAST tight
    plantTeamRecord(state, 'nym', 55, 35);
    plantTeamRecord(state, 'phi', 54, 36);
    // NL_WEST tight
    plantTeamRecord(state, 'lax', 55, 35);
    plantTeamRecord(state, 'sfb', 54, 36);

    const workerApi = api as typeof api & { getPennantRaces: () => PennantRaceView };
    const view = workerApi.getPennantRaces();

    const divisions = view.divisionRaces.map((race) => race.division);
    const leagues = new Set(divisions.map((div) => div.split('_')[0]));
    expect(leagues.has('AL')).toBe(true);
    expect(leagues.has('NL')).toBe(true);
  });
});

describe('worker pennant race detail query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  interface PennantRaceDetailView {
    season: number;
    day: number;
    gamesRemaining: number;
    divisions: Array<{
      division: string;
      divisionLabel: string;
      teams: Array<{
        teamId: string;
        abbreviation: string;
        name: string;
        wins: number;
        losses: number;
        pct: number;
        gamesBack: number;
        streak: string;
        projectedWins: number;
      }>;
    }>;
    wildcards: Array<{
      league: 'AL' | 'NL';
      leagueLabel: string;
      teams: Array<{
        teamId: string;
        abbreviation: string;
        name: string;
        wins: number;
        losses: number;
        pct: number;
        gamesBack: number;
        streak: string;
        projectedWins: number;
        inWildcard: boolean;
      }>;
    }>;
  }

  function plantTeamRecord(
    state: ReturnType<typeof requireState>,
    teamId: string,
    wins: number,
    losses: number,
    streak: number = 0,
  ): void {
    const tracker = state.seasonState.standings as unknown as {
      records: Map<string, {
        teamId: string;
        wins: number;
        losses: number;
        runsScored: number;
        runsAllowed: number;
        streak: number;
        last10: [number, number];
        divisionWins: number;
        divisionLosses: number;
      }>;
    };
    tracker.records.set(teamId, {
      teamId,
      wins,
      losses,
      runsScored: 0,
      runsAllowed: 0,
      streak,
      last10: [0, 0],
      divisionWins: 0,
      divisionLosses: 0,
    });
  }

  it('returns all six divisions with full standings and projected wins', () => {
    startGame(4411, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 60, 30);
    plantTeamRecord(state, 'phi', 58, 32);

    const workerApi = api as typeof api & {
      getPennantRaceDetail: () => PennantRaceDetailView;
    };
    const view = workerApi.getPennantRaceDetail();

    expect(view.season).toBe(state.season);
    expect(view.day).toBe(state.day);
    expect(typeof view.gamesRemaining).toBe('number');
    expect(view.divisions.length).toBe(6);
    for (const div of view.divisions) {
      expect(div.teams.length).toBeGreaterThanOrEqual(4);
      for (const team of div.teams) {
        expect(typeof team.pct).toBe('number');
        expect(typeof team.projectedWins).toBe('number');
        expect(team.projectedWins).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('computes projected wins from the current winning percentage pace', () => {
    startGame(4411, 'nym');
    const state = requireState();
    // 60 wins in 90 games → .667 pace → 108 projected over 162 games.
    plantTeamRecord(state, 'nym', 60, 30);

    const workerApi = api as typeof api & {
      getPennantRaceDetail: () => PennantRaceDetailView;
    };
    const view = workerApi.getPennantRaceDetail();

    const alEast = view.divisions.find((d) => d.division === 'AL_EAST');
    const nymEntry = alEast?.teams.find((t) => t.teamId === 'nym');
    expect(nymEntry).toBeDefined();
    expect(nymEntry?.projectedWins).toBe(Math.round((60 / 90) * SEASON_GAMES));
  });

  it('surfaces both leagues in the wildcard picture with top-5 non-leaders each', () => {
    startGame(4411, 'nym');
    const state = requireState();
    // Spread varied records across divisions so the wildcard sort has real fodder.
    plantTeamRecord(state, 'nym', 90, 40);
    plantTeamRecord(state, 'phi', 85, 45);
    plantTeamRecord(state, 'lax', 90, 40);
    plantTeamRecord(state, 'sfb', 85, 45);

    const workerApi = api as typeof api & {
      getPennantRaceDetail: () => PennantRaceDetailView;
    };
    const view = workerApi.getPennantRaceDetail();

    const leagues = view.wildcards.map((wc) => wc.league);
    expect(leagues).toContain('AL');
    expect(leagues).toContain('NL');
    for (const wc of view.wildcards) {
      expect(wc.teams.length).toBeLessThanOrEqual(5);
      const inCount = wc.teams.filter((t) => t.inWildcard).length;
      expect(inCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('is deterministic — two calls against the same state return the same view', () => {
    startGame(4411, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 60, 30);
    plantTeamRecord(state, 'phi', 58, 32);

    const workerApi = api as typeof api & {
      getPennantRaceDetail: () => PennantRaceDetailView;
    };
    const first = workerApi.getPennantRaceDetail();
    const second = workerApi.getPennantRaceDetail();

    expect(second).toEqual(first);
  });

  it('gates early-season output with empty divisions/wildcards when under 10 games played', () => {
    startGame(4411, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 5, 3);
    plantTeamRecord(state, 'phi', 3, 5);

    const workerApi = api as typeof api & {
      getPennantRaceDetail: () => PennantRaceDetailView;
    };
    const view = workerApi.getPennantRaceDetail();

    expect(view.divisions).toEqual([]);
    expect(view.wildcards).toEqual([]);
  });
});

describe('worker award race boards query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  interface AwardEntryView {
    playerId: string;
    playerName: string;
    teamId: string;
    teamAbbreviation: string;
    teamName: string;
    score: number;
    statCallout: string;
  }

  interface AwardBoardView {
    mvp: AwardEntryView[];
    cyYoung: AwardEntryView[];
    roy: AwardEntryView[];
  }

  interface AwardRaceBoardsView {
    season: number;
    day: number;
    gamesRemaining: number;
    al: AwardBoardView;
    nl: AwardBoardView;
  }

  // Plant a controlled W-L record directly into the standings tracker's private
  // map. Mirrors the pattern used for pennant races — avoids recordGame noise.
  function plantTeamRecord(
    state: ReturnType<typeof requireState>,
    teamId: string,
    wins: number,
    losses: number,
  ): void {
    const tracker = state.seasonState.standings as unknown as {
      records: Map<string, {
        teamId: string;
        wins: number;
        losses: number;
        runsScored: number;
        runsAllowed: number;
        streak: number;
        last10: [number, number];
        divisionWins: number;
        divisionLosses: number;
      }>;
    };
    tracker.records.set(teamId, {
      teamId,
      wins,
      losses,
      runsScored: 0,
      runsAllowed: 0,
      streak: 0,
      last10: [0, 0],
      divisionWins: 0,
      divisionLosses: 0,
    });
  }

  it('returns a view with season/day plus al + nl boards', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 30, 20);

    const workerApi = api as typeof api & { getAwardRaceBoards: () => AwardRaceBoardsView };
    const view = workerApi.getAwardRaceBoards();

    expect(view.season).toBe(state.season);
    expect(view.day).toBe(state.day);
    expect(typeof view.gamesRemaining).toBe('number');
    expect(view.al).toBeDefined();
    expect(view.nl).toBeDefined();
    expect(Array.isArray(view.al.mvp)).toBe(true);
    expect(Array.isArray(view.al.cyYoung)).toBe(true);
    expect(Array.isArray(view.al.roy)).toBe(true);
  });

  it('is deterministic — two calls against the same state return the same view', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);

    const workerApi = api as typeof api & { getAwardRaceBoards: () => AwardRaceBoardsView };
    const first = workerApi.getAwardRaceBoards();
    const second = workerApi.getAwardRaceBoards();

    expect(second).toEqual(first);
  });

  it('gates early-season output with empty boards when no team has reached 30 games', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 10, 5);

    const workerApi = api as typeof api & { getAwardRaceBoards: () => AwardRaceBoardsView };
    const view = workerApi.getAwardRaceBoards();

    expect(view.al.mvp).toEqual([]);
    expect(view.al.cyYoung).toEqual([]);
    expect(view.al.roy).toEqual([]);
    expect(view.nl.mvp).toEqual([]);
    expect(view.nl.cyYoung).toEqual([]);
    expect(view.nl.roy).toEqual([]);
  });

  it('applies sample-size filter — a thumping hitter below 100 PA is excluded from MVP board', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);

    // Find an AL hitter from nym (Mets sit in AL_EAST in the fixture universe)
    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.pitcherAttributes == null,
    );
    expect(hitter).toBeDefined();
    if (!hitter) return;

    // Plant overwhelming stats but under the 100 PA floor — should not qualify.
    state.seasonState.playerSeasonStats.set(hitter.id, {
      playerId: hitter.id,
      teamId: hitter.teamId,
      pa: 40,
      ab: 35,
      hits: 20,
      doubles: 4,
      triples: 0,
      hr: 12,
      rbi: 35,
      bb: 5,
      k: 6,
      runs: 18,
      hbp: 0,
      sacFlies: 0,
      ip: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      hitsAllowed: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      flyBallsAllowed: 0,
      wins: 0,
      losses: 0,
    });

    const workerApi = api as typeof api & { getAwardRaceBoards: () => AwardRaceBoardsView };
    const view = workerApi.getAwardRaceBoards();

    const appearsInMvp = view.al.mvp.some((entry) => entry.playerId === hitter.id)
      || view.nl.mvp.some((entry) => entry.playerId === hitter.id);
    expect(appearsInMvp).toBe(false);
  });

  it('enriches entries with playerName, team display info, and a stat callout', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);

    const hitter = state.players.find(
      (player) => player.teamId === 'nym' && player.pitcherAttributes == null,
    );
    expect(hitter).toBeDefined();
    if (!hitter) return;

    state.seasonState.playerSeasonStats.set(hitter.id, {
      playerId: hitter.id,
      teamId: hitter.teamId,
      pa: 200,
      ab: 180,
      hits: 63,
      doubles: 12,
      triples: 1,
      hr: 25,
      rbi: 70,
      bb: 20,
      k: 40,
      runs: 55,
      hbp: 0,
      sacFlies: 0,
      ip: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      hitsAllowed: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      flyBallsAllowed: 0,
      wins: 0,
      losses: 0,
    });

    const workerApi = api as typeof api & { getAwardRaceBoards: () => AwardRaceBoardsView };
    const view = workerApi.getAwardRaceBoards();

    const allMvp = [...view.al.mvp, ...view.nl.mvp];
    const entry = allMvp.find((candidate) => candidate.playerId === hitter.id);
    expect(entry).toBeDefined();
    expect(entry?.playerName).toBe(`${hitter.firstName} ${hitter.lastName}`);
    expect(entry?.teamAbbreviation).toBeTruthy();
    expect(entry?.teamAbbreviation).not.toBe(hitter.teamId.toLowerCase());
    expect(entry?.statCallout).toMatch(/HR/);
    expect(entry?.statCallout).toMatch(/RBI/);
  });

  it('routes hitters into mvp and pitchers into cyYoung on their respective league board', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);

    const pitcher = state.players.find(
      (player) => player.teamId === 'nym' && player.pitcherAttributes != null,
    );
    expect(pitcher).toBeDefined();
    if (!pitcher) return;

    // Plant a dominant pitcher stat line — 80 IP (240 thirds) of ace-level work.
    state.seasonState.playerSeasonStats.set(pitcher.id, {
      playerId: pitcher.id,
      teamId: pitcher.teamId,
      pa: 0,
      ab: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      k: 0,
      runs: 0,
      hbp: 0,
      sacFlies: 0,
      ip: 240,
      earnedRuns: 18,
      strikeouts: 110,
      walks: 15,
      hitsAllowed: 55,
      homeRunsAllowed: 5,
      hitBatters: 1,
      flyBallsAllowed: 40,
      wins: 10,
      losses: 2,
    });

    const workerApi = api as typeof api & { getAwardRaceBoards: () => AwardRaceBoardsView };
    const view = workerApi.getAwardRaceBoards();

    const division = state.players.find((p) => p.id === pitcher.id)?.teamId;
    expect(division).toBeDefined();

    const boards = [view.al, view.nl];
    const appearsInCyYoung = boards.some((board) =>
      board.cyYoung.some((entry) => entry.playerId === pitcher.id),
    );
    const appearsInMvp = boards.some((board) =>
      board.mvp.some((entry) => entry.playerId === pitcher.id),
    );
    expect(appearsInCyYoung).toBe(true);
    expect(appearsInMvp).toBe(false);

    const cyEntry = boards
      .flatMap((board) => board.cyYoung)
      .find((entry) => entry.playerId === pitcher.id);
    expect(cyEntry?.statCallout).toMatch(/ERA/);
    expect(cyEntry?.statCallout).toMatch(/K/);
  });
});

describe('worker award race detail query', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  interface AwardEntryView {
    playerId: string;
    playerName: string;
    teamId: string;
    teamAbbreviation: string;
    teamName: string;
    score: number;
    statCallout: string;
  }

  interface AwardBoardView {
    mvp: AwardEntryView[];
    cyYoung: AwardEntryView[];
    roy: AwardEntryView[];
  }

  interface PriorSeasonWinnerView {
    award: 'mvp' | 'cyYoung' | 'roy';
    league: 'AL' | 'NL';
    season: number;
    playerId: string;
    playerName: string;
    teamId: string;
    teamAbbreviation: string;
    summary: string;
  }

  interface AwardRaceDetailView {
    season: number;
    day: number;
    gamesRemaining: number;
    al: AwardBoardView;
    nl: AwardBoardView;
    priorSeasonWinners: PriorSeasonWinnerView[];
  }

  function plantTeamRecord(
    state: ReturnType<typeof requireState>,
    teamId: string,
    wins: number,
    losses: number,
  ): void {
    const tracker = state.seasonState.standings as unknown as {
      records: Map<string, {
        teamId: string;
        wins: number;
        losses: number;
        runsScored: number;
        runsAllowed: number;
        streak: number;
        last10: [number, number];
        divisionWins: number;
        divisionLosses: number;
      }>;
    };
    tracker.records.set(teamId, {
      teamId,
      wins,
      losses,
      runsScored: 0,
      runsAllowed: 0,
      streak: 0,
      last10: [0, 0],
      divisionWins: 0,
      divisionLosses: 0,
    });
  }

  it('returns the same shape as getAwardRaceBoards with season/day/al/nl fields', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);

    const workerApi = api as typeof api & {
      getAwardRaceDetail: () => AwardRaceDetailView;
    };
    const view = workerApi.getAwardRaceDetail();

    expect(view.season).toBe(state.season);
    expect(view.day).toBe(state.day);
    expect(typeof view.gamesRemaining).toBe('number');
    expect(view.al).toBeDefined();
    expect(view.nl).toBeDefined();
    expect(Array.isArray(view.al.mvp)).toBe(true);
    expect(Array.isArray(view.al.cyYoung)).toBe(true);
    expect(Array.isArray(view.al.roy)).toBe(true);
  });

  it('returns up to 10 entries per list (vs 3 for the card query)', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 60, 40);

    // Plant 12 qualifying AL hitters so the detail query has deep leaderboards
    // to populate beyond the top-3 surface the card shows.
    const alHitters = state.players
      .filter((player) => {
        if (player.pitcherAttributes != null) return false;
        const team = getTeamById(player.teamId);
        return team?.division?.startsWith('AL') ?? false;
      })
      .slice(0, 12);

    expect(alHitters.length).toBeGreaterThanOrEqual(12);

    alHitters.forEach((hitter, idx) => {
      state.seasonState.playerSeasonStats.set(hitter.id, {
        playerId: hitter.id,
        teamId: hitter.teamId,
        pa: 300 - idx,
        ab: 270 - idx,
        hits: 95 - idx,
        doubles: 15,
        triples: 1,
        hr: 30 - idx,
        rbi: 90 - idx,
        bb: 25,
        k: 45,
        runs: 65 - idx,
        hbp: 0,
        sacFlies: 0,
        ip: 0,
        earnedRuns: 0,
        strikeouts: 0,
        walks: 0,
        hitsAllowed: 0,
        homeRunsAllowed: 0,
        hitBatters: 0,
        flyBallsAllowed: 0,
        wins: 0,
        losses: 0,
      });
    });

    const workerApi = api as typeof api & {
      getAwardRaceBoards: () => AwardRaceDetailView;
      getAwardRaceDetail: () => AwardRaceDetailView;
    };
    const boards = workerApi.getAwardRaceBoards();
    const detail = workerApi.getAwardRaceDetail();

    expect(boards.al.mvp.length).toBeLessThanOrEqual(3);
    expect(detail.al.mvp.length).toBeGreaterThan(boards.al.mvp.length);
    expect(detail.al.mvp.length).toBeLessThanOrEqual(10);
  });

  it('is deterministic — two calls against the same state return the same view', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);

    const workerApi = api as typeof api & {
      getAwardRaceDetail: () => AwardRaceDetailView;
    };
    const first = workerApi.getAwardRaceDetail();
    const second = workerApi.getAwardRaceDetail();

    expect(second).toEqual(first);
  });

  it('returns empty boards early-season with no team past 30 games', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 10, 5);

    const workerApi = api as typeof api & {
      getAwardRaceDetail: () => AwardRaceDetailView;
    };
    const view = workerApi.getAwardRaceDetail();

    expect(view.al.mvp).toEqual([]);
    expect(view.al.cyYoung).toEqual([]);
    expect(view.al.roy).toEqual([]);
    expect(view.nl.mvp).toEqual([]);
  });

  it('returns empty priorSeasonWinners when awardHistory is empty (year 1)', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);
    expect(state.awardHistory).toEqual([]);

    const workerApi = api as typeof api & {
      getAwardRaceDetail: () => AwardRaceDetailView;
    };
    const view = workerApi.getAwardRaceDetail();

    expect(view.priorSeasonWinners).toEqual([]);
  });

  it('returns prior-season MVP/Cy Young/ROY winners when awardHistory has them', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);
    state.season = 2;

    const alHitter = state.players.find((p) => {
      if (p.pitcherAttributes != null) return false;
      const team = getTeamById(p.teamId);
      return team?.division?.startsWith('AL') ?? false;
    });
    const nlPitcher = state.players.find((p) => {
      if (p.pitcherAttributes == null) return false;
      const team = getTeamById(p.teamId);
      return team?.division?.startsWith('NL') ?? false;
    });
    expect(alHitter).toBeDefined();
    expect(nlPitcher).toBeDefined();

    state.awardHistory = [
      {
        season: 1,
        award: 'MVP',
        league: 'AL',
        playerId: alHitter!.id,
        teamId: alHitter!.teamId,
        summary: '.312 / 36 HR / 108 RBI',
      },
      {
        season: 1,
        award: 'Cy Young',
        league: 'NL',
        playerId: nlPitcher!.id,
        teamId: nlPitcher!.teamId,
        summary: '2.18 ERA / 228 K / 19-6',
      },
      // Prior-season entry that should be filtered out (wrong season)
      {
        season: 0,
        award: 'MVP',
        league: 'AL',
        playerId: alHitter!.id,
        teamId: alHitter!.teamId,
        summary: 'ignored',
      },
    ];

    const workerApi = api as typeof api & {
      getAwardRaceDetail: () => AwardRaceDetailView;
    };
    const view = workerApi.getAwardRaceDetail() as AwardRaceDetailView;

    const winners = view.priorSeasonWinners;
    expect(winners).toHaveLength(2);
    const alMvp = winners.find((w) => w.award === 'mvp' && w.league === 'AL');
    expect(alMvp).toBeDefined();
    expect(alMvp!.season).toBe(1);
    expect(alMvp!.playerId).toBe(alHitter!.id);
    expect(alMvp!.summary).toBe('.312 / 36 HR / 108 RBI');
    expect(alMvp!.playerName).toBe(`${alHitter!.firstName} ${alHitter!.lastName}`);
    expect(alMvp!.teamAbbreviation.length).toBeGreaterThan(0);

    const nlCy = winners.find((w) => w.award === 'cyYoung' && w.league === 'NL');
    expect(nlCy).toBeDefined();
    expect(nlCy!.summary).toBe('2.18 ERA / 228 K / 19-6');
  });

  it('filters out MLB-league and unknown-award awardHistory entries', () => {
    startGame(5522, 'nym');
    const state = requireState();
    plantTeamRecord(state, 'nym', 40, 20);
    state.season = 2;

    state.awardHistory = [
      {
        season: 1,
        award: 'MVP',
        league: 'MLB',
        playerId: 'p-ignored',
        teamId: 'nym',
        summary: 'skip-mlb',
      },
      {
        season: 1,
        award: 'Gold Glove',
        league: 'AL',
        playerId: 'p-ignored-2',
        teamId: 'nym',
        summary: 'skip-unknown-award',
      },
    ];

    const workerApi = api as typeof api & {
      getAwardRaceDetail: () => AwardRaceDetailView;
    };
    const view = workerApi.getAwardRaceDetail();

    expect(view.priorSeasonWinners).toEqual([]);
  });
});
