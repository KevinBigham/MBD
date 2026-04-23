import { describe, expect, it } from 'vitest';
import type { Rivalry } from '@mbd/contracts';
import {
  BREAKOUT_SEASON_IMPACT,
  CURSED_FRANCHISE_IMPACT,
  CHAMPIONSHIP_RUN_IMPACT,
  CONTENTION_COLLAPSE_IMPACT,
  CONTENTION_COLLAPSE_WINS_THRESHOLD,
  CONTENTION_WINDOW_OPENS_IMPACT,
  DYNASTY_END_IMPACT,
  FIRE_SALE_IMPACT,
  FIRST_DYNASTY_PEAK_IMPACT,
  LOSING_SEASON_STREAK_IMPACT,
  REBUILD_BEGUN_IMPACT,
  detectCursedFranchise,
  detectBreakoutSeason,
  detectChampionshipRun,
  detectContentionWindowOpens,
  detectContentionCollapse,
  detectDynastyEnd,
  detectFireSale,
  detectFirstDynastyPeak,
  detectLosingSeasonStreak,
  detectRivalryRenewed,
  detectRebuildBegun,
  detectSeasonIdentityMoments,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function summary(overrides: Partial<TeamSeasonSummary> & { teamId: string }): TeamSeasonSummary {
  return {
    wins: 81,
    losses: 81,
    madePlayoffs: false,
    isChampion: false,
    ...overrides,
  };
}

function context(
  overrides: Partial<SeasonIdentityMomentDetectionContext> & { teams: readonly TeamSeasonSummary[] },
): SeasonIdentityMomentDetectionContext {
  return {
    season: 7,
    day: 182,
    ...overrides,
  };
}

function tradeHistoryEntry(
  id: string,
  fromTeamId: string,
  toTeamId: string,
  playerIds: readonly string[],
  day: number,
  season: number = 7,
) {
  return {
    id,
    fromTeamId,
    toTeamId,
    offeringAssets: playerIds.map((playerId) => ({
      type: 'player' as const,
      playerId,
    })),
    requestingAssets: [],
    fairnessScore: 0,
    summary: `${fromTeamId} moved ${playerIds.join(', ')}`,
    timestamp: `S${season}D${day}`,
  };
}

function standingsEntry(overrides: Partial<{
  teamId: string;
  wins: number;
  losses: number;
  pct: number;
  gamesBack: number;
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
  streak: string;
  last10Wins: number;
  last10Losses: number;
}> & { teamId: string }) {
  return {
    teamId: overrides.teamId,
    wins: overrides.wins ?? 85,
    losses: overrides.losses ?? 77,
    pct: overrides.pct ?? 0.525,
    gamesBack: overrides.gamesBack ?? 0,
    runsScored: overrides.runsScored ?? 700,
    runsAllowed: overrides.runsAllowed ?? 650,
    runDifferential: overrides.runDifferential ?? 50,
    streak: overrides.streak ?? '-',
    last10Wins: overrides.last10Wins ?? 5,
    last10Losses: overrides.last10Losses ?? 5,
  };
}

function rivalry(overrides: Partial<Rivalry> = {}): Rivalry {
  return {
    id: 'bos:nym',
    teamA: 'nym',
    teamB: 'bos',
    intensity: 72,
    summary: 'The race keeps dragging both clubs back into the same frame.',
    reasons: ['Standings pressure', 'October carryover'],
    origin: 'historical',
    active: true,
    currentSeasonWinsA: 4,
    currentSeasonWinsB: 3,
    closeRaceStreak: 2,
    playoffSeriesStreak: 0,
    eventHistory: [
      { season: 7, type: 'division_race', summary: 'The division stayed live into September.' },
      { season: 6, type: 'playoff', summary: 'October kept the feud alive.' },
    ],
    ...overrides,
  };
}

describe('detectChampionshipRun', () => {
  it('emits a championship_run moment for the champion', () => {
    const result = detectChampionshipRun(
      summary({ teamId: 'nym', wins: 98, losses: 64, madePlayoffs: true, isChampion: true }),
      7,
      182,
    );
    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('championship_run');
    expect(result?.moment.impact).toBe(CHAMPIONSHIP_RUN_IMPACT);
    expect(result?.moment.relevance).toBe(1.0);
    expect(result?.moment.season).toBe(7);
    expect(result?.moment.day).toBe(182);
    expect(result?.moment.timestamp).toBe('S7D182');
    expect(result?.moment.description).toContain('98-64');
  });

  it('returns null for non-champions', () => {
    const result = detectChampionshipRun(
      summary({ teamId: 'bos', wins: 95, losses: 67, madePlayoffs: true, isChampion: false }),
      7,
      182,
    );
    expect(result).toBeNull();
  });
});

describe('detectContentionCollapse', () => {
  it('emits a contention_collapse moment for a non-playoff team at or above the threshold', () => {
    const result = detectContentionCollapse(
      summary({
        teamId: 'det',
        wins: CONTENTION_COLLAPSE_WINS_THRESHOLD,
        losses: 77,
        madePlayoffs: false,
      }),
      7,
      182,
    );
    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('contention_collapse');
    expect(result?.moment.impact).toBe(CONTENTION_COLLAPSE_IMPACT);
    expect(result?.moment.relevance).toBe(0.8);
    expect(result?.moment.description).toContain(`${CONTENTION_COLLAPSE_WINS_THRESHOLD}-77`);
  });

  it('returns null when the team made the playoffs', () => {
    const result = detectContentionCollapse(
      summary({ teamId: 'nym', wins: 95, losses: 67, madePlayoffs: true }),
      7,
      182,
    );
    expect(result).toBeNull();
  });

  it('returns null when the team is below the wins threshold', () => {
    const result = detectContentionCollapse(
      summary({
        teamId: 'mia',
        wins: CONTENTION_COLLAPSE_WINS_THRESHOLD - 1,
        losses: 78,
        madePlayoffs: false,
      }),
      7,
      182,
    );
    expect(result).toBeNull();
  });
});

describe('detectFirstDynastyPeak', () => {
  it('emits a first_dynasty_peak moment for a back-to-back division winner', () => {
    const result = detectFirstDynastyPeak(
      summary({
        teamId: 'nym',
        wins: 97,
        losses: 65,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 5, wins: 84, losses: 78, divisionRank: 2 },
          { season: 6, wins: 93, losses: 69, divisionRank: 1 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('first_dynasty_peak');
    expect(result?.moment.impact).toBe(FIRST_DYNASTY_PEAK_IMPACT);
    expect(result?.moment.description).toContain('97-65');
    expect(result?.moment.description).toContain("93-69");
  });

  it('returns null for a single-year division champion', () => {
    const result = detectFirstDynastyPeak(
      summary({
        teamId: 'bos',
        wins: 92,
        losses: 70,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 6, wins: 85, losses: 77, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when the prior season did not finish first in the division', () => {
    const result = detectFirstDynastyPeak(
      summary({
        teamId: 'det',
        wins: 94,
        losses: 68,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 6, wins: 90, losses: 72, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when no prior seasons summary exists', () => {
    const result = detectFirstDynastyPeak(
      summary({ teamId: 'sd', wins: 91, losses: 71, divisionRank: 1, priorSeasonsSummary: [] }),
      7,
      182,
    );

    expect(result).toBeNull();
  });
});

describe('detectLosingSeasonStreak', () => {
  it('emits a losing_season_streak moment for three consecutive losing seasons', () => {
    const result = detectLosingSeasonStreak(
      summary({
        teamId: 'mia',
        wins: 71,
        losses: 91,
        priorSeasonsSummary: [
          { season: 4, wins: 84, losses: 78, divisionRank: 3 },
          { season: 5, wins: 74, losses: 88, divisionRank: 4 },
          { season: 6, wins: 69, losses: 93, divisionRank: 5 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('losing_season_streak');
    expect(result?.moment.impact).toBe(LOSING_SEASON_STREAK_IMPACT);
    expect(result?.moment.description).toContain('71-91');
  });

  it('returns null when one of the two immediately prior seasons was winning', () => {
    const result = detectLosingSeasonStreak(
      summary({
        teamId: 'oak',
        wins: 73,
        losses: 89,
        priorSeasonsSummary: [
          { season: 4, wins: 76, losses: 86, divisionRank: 4 },
          { season: 5, wins: 82, losses: 80, divisionRank: 3 },
          { season: 6, wins: 70, losses: 92, divisionRank: 5 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when the current season is winning', () => {
    const result = detectLosingSeasonStreak(
      summary({
        teamId: 'sea',
        wins: 84,
        losses: 78,
        priorSeasonsSummary: [
          { season: 4, wins: 73, losses: 89, divisionRank: 4 },
          { season: 5, wins: 75, losses: 87, divisionRank: 4 },
          { season: 6, wins: 74, losses: 88, divisionRank: 5 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when no prior seasons summary exists', () => {
    const result = detectLosingSeasonStreak(
      summary({ teamId: 'col', wins: 66, losses: 96, priorSeasonsSummary: [] }),
      7,
      182,
    );

    expect(result).toBeNull();
  });
});

describe('detectRebuildBegun', () => {
  it('emits a rebuild_begun moment when a first losing season follows two winning seasons', () => {
    const result = detectRebuildBegun(
      summary({
        teamId: 'chc',
        wins: 74,
        losses: 88,
        priorSeasonsSummary: [
          { season: 5, wins: 86, losses: 76, divisionRank: 2 },
          { season: 6, wins: 90, losses: 72, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('rebuild_begun');
    expect(result?.moment.impact).toBe(REBUILD_BEGUN_IMPACT);
    expect(result?.moment.description).toContain('74-88');
  });

  it('returns null when the current season is winning', () => {
    const result = detectRebuildBegun(
      summary({
        teamId: 'sea',
        wins: 84,
        losses: 78,
        priorSeasonsSummary: [
          { season: 5, wins: 86, losses: 76, divisionRank: 2 },
          { season: 6, wins: 90, losses: 72, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when only one of the two prior seasons was winning', () => {
    const result = detectRebuildBegun(
      summary({
        teamId: 'pit',
        wins: 75,
        losses: 87,
        priorSeasonsSummary: [
          { season: 5, wins: 78, losses: 84, divisionRank: 4 },
          { season: 6, wins: 85, losses: 77, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when no prior seasons summary exists', () => {
    const result = detectRebuildBegun(
      summary({ teamId: 'col', wins: 68, losses: 94, priorSeasonsSummary: [] }),
      7,
      182,
    );

    expect(result).toBeNull();
  });
});

describe('detectBreakoutSeason', () => {
  it('emits a breakout_season moment for a division winner after three non-title seasons', () => {
    const result = detectBreakoutSeason(
      summary({
        teamId: 'hou',
        wins: 92,
        losses: 70,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 4, wins: 78, losses: 84, divisionRank: 3 },
          { season: 5, wins: 81, losses: 81, divisionRank: 2 },
          { season: 6, wins: 75, losses: 87, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('breakout_season');
    expect(result?.moment.impact).toBe(BREAKOUT_SEASON_IMPACT);
    expect(result?.moment.description).toContain('92-70');
  });

  it('returns null when the current team did not win the division', () => {
    const result = detectBreakoutSeason(
      summary({
        teamId: 'sea',
        wins: 89,
        losses: 73,
        divisionRank: 2,
        priorSeasonsSummary: [
          { season: 4, wins: 80, losses: 82, divisionRank: 3 },
          { season: 5, wins: 83, losses: 79, divisionRank: 2 },
          { season: 6, wins: 84, losses: 78, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when fewer than three prior seasons are available', () => {
    const result = detectBreakoutSeason(
      summary({
        teamId: 'cin',
        wins: 91,
        losses: 71,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 5, wins: 78, losses: 84, divisionRank: 3 },
          { season: 6, wins: 79, losses: 83, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when one of the prior three seasons was already a division title', () => {
    const result = detectBreakoutSeason(
      summary({
        teamId: 'lad',
        wins: 99,
        losses: 63,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 4, wins: 88, losses: 74, divisionRank: 1 },
          { season: 5, wins: 84, losses: 78, divisionRank: 2 },
          { season: 6, wins: 87, losses: 75, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('treats null prior division ranks as non-champions', () => {
    const result = detectBreakoutSeason(
      summary({
        teamId: 'mil',
        wins: 90,
        losses: 72,
        divisionRank: 1,
        priorSeasonsSummary: [
          { season: 4, wins: 70, losses: 92, divisionRank: null },
          { season: 5, wins: 76, losses: 86, divisionRank: 3 },
          { season: 6, wins: 80, losses: 82, divisionRank: 2 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('breakout_season');
  });
});

describe('detectContentionWindowOpens', () => {
  it('emits a contention_window_opens moment after two losing seasons and a winning turnaround', () => {
    const result = detectContentionWindowOpens(
      summary({
        teamId: 'mia',
        wins: 84,
        losses: 78,
        divisionRank: 2,
        priorSeasonsSummary: [
          { season: 5, wins: 69, losses: 93, divisionRank: 4 },
          { season: 6, wins: 74, losses: 88, divisionRank: 3 },
        ],
      }),
      7,
      182,
    );

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('contention_window_opens');
    expect(result?.moment.impact).toBe(CONTENTION_WINDOW_OPENS_IMPACT);
    expect(result?.moment.description).toContain('84-78');
  });

  it('returns null when the current season is losing', () => {
    const result = detectContentionWindowOpens(
      summary({
        teamId: 'pit',
        wins: 76,
        losses: 86,
        priorSeasonsSummary: [
          { season: 5, wins: 69, losses: 93, divisionRank: 4 },
          { season: 6, wins: 74, losses: 88, divisionRank: 3 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when only one prior season was losing', () => {
    const result = detectContentionWindowOpens(
      summary({
        teamId: 'tor',
        wins: 85,
        losses: 77,
        priorSeasonsSummary: [
          { season: 5, wins: 82, losses: 80, divisionRank: 3 },
          { season: 6, wins: 73, losses: 89, divisionRank: 4 },
        ],
      }),
      7,
      182,
    );

    expect(result).toBeNull();
  });

  it('returns null when no prior seasons summary exists', () => {
    const result = detectContentionWindowOpens(
      summary({ teamId: 'col', wins: 83, losses: 79, priorSeasonsSummary: [] }),
      7,
      182,
    );

    expect(result).toBeNull();
  });
});

describe('detectFireSale', () => {
  it('emits a fire_sale moment when a sub-.450 club ships out three veterans in the deadline window', () => {
    const detectionContext = context({
      teams: [
        summary({ teamId: 'oak', teamName: 'Oakland Comets', wins: 68, losses: 94 }),
      ],
      tradeHistory: [
        tradeHistoryEntry('trade-1', 'oak', 'lad', ['p1'], 94),
        tradeHistoryEntry('trade-2', 'oak', 'bos', ['p2'], 99),
        tradeHistoryEntry('trade-3', 'oak', 'nym', ['p3'], 104),
      ],
      playerContractYearsById: new Map([
        ['p1', 2],
        ['p2', 3],
        ['p3', 2],
      ]),
    });

    const result = detectFireSale(detectionContext.teams[0]!, detectionContext);

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('fire_sale');
    expect(result?.moment.impact).toBe(FIRE_SALE_IMPACT);
    expect(result?.moment.description).toContain('Oakland Comets');
    expect(result?.moment.description).toContain('3 veterans');
  });

  it('returns null when fewer than three veterans with term are moved', () => {
    const detectionContext = context({
      teams: [
        summary({ teamId: 'oak', teamName: 'Oakland Comets', wins: 65, losses: 97 }),
      ],
      tradeHistory: [
        tradeHistoryEntry('trade-1', 'oak', 'lad', ['p1'], 94, 11),
        tradeHistoryEntry('trade-2', 'oak', 'bos', ['p2'], 99, 11),
        tradeHistoryEntry('trade-3', 'oak', 'nym', ['p3'], 104, 11),
      ],
      playerContractYearsById: new Map([
        ['p1', 2],
        ['p2', 1],
        ['p3', 1],
      ]),
    });

    const result = detectFireSale(detectionContext.teams[0]!, detectionContext);

    expect(result).toBeNull();
  });

  it('returns null when the team sits exactly at a .450 win percentage proxy', () => {
    const detectionContext = context({
      teams: [
        summary({ teamId: 'oak', teamName: 'Oakland Comets', wins: 45, losses: 55 }),
      ],
      tradeHistory: [
        tradeHistoryEntry('trade-1', 'oak', 'lad', ['p1'], 94),
        tradeHistoryEntry('trade-2', 'oak', 'bos', ['p2'], 99),
        tradeHistoryEntry('trade-3', 'oak', 'nym', ['p3'], 104),
      ],
      playerContractYearsById: new Map([
        ['p1', 2],
        ['p2', 2],
        ['p3', 2],
      ]),
    });

    const result = detectFireSale(detectionContext.teams[0]!, detectionContext);

    expect(result).toBeNull();
  });
});

describe('detectDynastyEnd', () => {
  it('emits a dynasty_end moment when three of the prior four seasons were division titles before a losing crash', () => {
    const detectionContext = context({
      season: 11,
      teams: [
        summary({
          teamId: 'nym',
          teamName: 'New York Tycoons',
          wins: 78,
          losses: 84,
          priorSeasonsSummary: [
            { season: 7, wins: 96, losses: 66, divisionRank: 1 },
            { season: 8, wins: 101, losses: 61, divisionRank: 1 },
            { season: 9, wins: 87, losses: 75, divisionRank: 2 },
            { season: 10, wins: 94, losses: 68, divisionRank: 1 },
          ],
        }),
      ],
    });

    const result = detectDynastyEnd(detectionContext.teams[0]!, detectionContext);

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('dynasty_end');
    expect(result?.moment.impact).toBe(DYNASTY_END_IMPACT);
    expect(result?.moment.description).toContain('New York Tycoons');
    expect(result?.moment.description).toContain('7');
    expect(result?.moment.description).toContain('10');
  });

  it('returns null when the prior four-year window includes only two division titles', () => {
    const detectionContext = context({
      season: 11,
      teams: [
        summary({
          teamId: 'nym',
          teamName: 'New York Tycoons',
          wins: 76,
          losses: 86,
          priorSeasonsSummary: [
            { season: 7, wins: 88, losses: 74, divisionRank: 2 },
            { season: 8, wins: 96, losses: 66, divisionRank: 1 },
            { season: 9, wins: 84, losses: 78, divisionRank: 2 },
            { season: 10, wins: 93, losses: 69, divisionRank: 1 },
          ],
        }),
      ],
    });

    const result = detectDynastyEnd(detectionContext.teams[0]!, detectionContext);

    expect(result).toBeNull();
  });

  it('returns null when the current club finishes exactly .500', () => {
    const detectionContext = context({
      season: 11,
      teams: [
        summary({
          teamId: 'nym',
          teamName: 'New York Tycoons',
          wins: 81,
          losses: 81,
          priorSeasonsSummary: [
            { season: 7, wins: 96, losses: 66, divisionRank: 1 },
            { season: 8, wins: 101, losses: 61, divisionRank: 1 },
            { season: 9, wins: 87, losses: 75, divisionRank: 2 },
            { season: 10, wins: 94, losses: 68, divisionRank: 1 },
          ],
        }),
      ],
    });

    const result = detectDynastyEnd(detectionContext.teams[0]!, detectionContext);

    expect(result).toBeNull();
  });
});

describe('detectCursedFranchise', () => {
  it('emits a cursed_franchise moment on the tenth straight losing season', () => {
    const detectionContext = context({
      season: 10,
      teams: [
        summary({ teamId: 'pit', teamName: 'Pittsburgh Ironmen', wins: 67, losses: 95 }),
      ],
      archivedSeasons: Array.from({ length: 9 }, (_, index) => ({
        season: index + 1,
        standings: [
          {
            teamId: 'pit',
            wins: 70,
            losses: 92,
            divisionRank: 4,
          },
        ],
        userRecord: null,
        playoffResult: null,
        championshipWon: false,
        championTeamId: null,
        mvpName: null,
        cyYoungName: null,
        statLeaders: {
          hr: [],
          rbi: [],
          avg: [],
          era: [],
          k: [],
          w: [],
        },
        dynastyScore: null,
      })),
    });

    const result = detectCursedFranchise(detectionContext.teams[0]!, detectionContext);

    expect(result).not.toBeNull();
    expect(result?.moment.type).toBe('cursed_franchise');
    expect(result?.moment.impact).toBe(CURSED_FRANCHISE_IMPACT);
    expect(result?.moment.description).toContain('Pittsburgh Ironmen');
    expect(result?.moment.description).toContain('10th');
  });

  it('returns null when the franchise has only nine straight losing seasons', () => {
    const detectionContext = context({
      season: 9,
      teams: [
        summary({ teamId: 'pit', teamName: 'Pittsburgh Ironmen', wins: 71, losses: 91 }),
      ],
      archivedSeasons: Array.from({ length: 8 }, (_, index) => ({
        season: index + 1,
        standings: [
          {
            teamId: 'pit',
            wins: 70,
            losses: 92,
            divisionRank: 4,
          },
        ],
        userRecord: null,
        playoffResult: null,
        championshipWon: false,
        championTeamId: null,
        mvpName: null,
        cyYoungName: null,
        statLeaders: {
          hr: [],
          rbi: [],
          avg: [],
          era: [],
          k: [],
          w: [],
        },
        dynastyScore: null,
      })),
    });

    const result = detectCursedFranchise(detectionContext.teams[0]!, detectionContext);

    expect(result).toBeNull();
  });

  it('returns null on non-milestone streak lengths', () => {
    const detectionContext = context({
      season: 11,
      teams: [
        summary({ teamId: 'pit', teamName: 'Pittsburgh Ironmen', wins: 63, losses: 99 }),
      ],
      archivedSeasons: Array.from({ length: 10 }, (_, index) => ({
        season: index + 1,
        standings: [
          {
            teamId: 'pit',
            wins: 70,
            losses: 92,
            divisionRank: 4,
          },
        ],
        userRecord: null,
        playoffResult: null,
        championshipWon: false,
        championTeamId: null,
        mvpName: null,
        cyYoungName: null,
        statLeaders: {
          hr: [],
          rbi: [],
          avg: [],
          era: [],
          k: [],
          w: [],
        },
        dynastyScore: null,
      })),
    });

    const result = detectCursedFranchise(detectionContext.teams[0]!, detectionContext);

    expect(result).toBeNull();
  });
});

describe('detectRivalryRenewed', () => {
  it('emits rivalry_renewed for both clubs in a heated late-season contention matchup', () => {
    const result = detectRivalryRenewed(context({
      teams: [
        summary({ teamId: 'nym', teamName: 'New York Tycoons', wins: 89, losses: 73, madePlayoffs: true }),
        summary({ teamId: 'bos', teamName: 'Boston Noreasters', wins: 87, losses: 75, madePlayoffs: true }),
      ],
      rivalries: new Map([[
        'bos:nym',
        rivalry(),
      ]]),
      standingsByDivision: {
        AL_EAST: [
          standingsEntry({ teamId: 'nym', wins: 89, losses: 73, pct: 89 / 162, gamesBack: 0 }),
          standingsEntry({ teamId: 'bos', wins: 87, losses: 75, pct: 87 / 162, gamesBack: 2 }),
          standingsEntry({ teamId: 'bal', wins: 82, losses: 80, pct: 82 / 162, gamesBack: 7 }),
        ],
      },
      teamMoments: new Map([
        ['nym', [{
          season: 7,
          day: 182,
          timestamp: 'S7D182',
          type: 'first_dynasty_peak',
          description: 'Prior team momentum is already in the ledger.',
          impact: 55,
          relevance: 0.95,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
        ['bos', []],
      ]),
      playerMomentCountsByTeamId: new Map([
        ['nym', 1],
        ['bos', 0],
      ]),
    }));

    expect(result.map((entry) => ({ teamId: entry.teamId, type: entry.moment.type }))).toEqual([
      { teamId: 'bos', type: 'rivalry_renewed' },
      { teamId: 'nym', type: 'rivalry_renewed' },
    ]);
    expect(result.every((entry) => entry.moment.impact === 58)).toBe(true);
    expect(result.every((entry) => entry.moment.relevance === 0.84)).toBe(true);
  });

  it('fires for any current-season playoff meeting between active heated rivals', () => {
    const result = detectRivalryRenewed(context({
      teams: [
        summary({ teamId: 'nym', teamName: 'New York Tycoons', wins: 94, losses: 68, madePlayoffs: true }),
        summary({ teamId: 'bos', teamName: 'Boston Noreasters', wins: 91, losses: 71, madePlayoffs: true }),
      ],
      rivalries: new Map([[
        'bos:nym',
        rivalry({
          intensity: 85,
          currentSeasonWinsA: 6,
          currentSeasonWinsB: 5,
          closeRaceStreak: 1,
          playoffSeriesStreak: 2,
          eventHistory: [
            { season: 7, type: 'playoff', summary: 'October brought them together again.' },
            { season: 6, type: 'division_race', summary: 'They stayed on each other all season.' },
          ],
        }),
      ]]),
      playoffSeriesHistory: [{
        season: 7,
        round: 'DIVISION_SERIES',
        higherSeedTeamId: 'nym',
        lowerSeedTeamId: 'bos',
        bestOf: 5,
        deficitReached: null,
        deficitTeamId: null,
        winnerTeamId: 'nym',
      }],
      teamMoments: new Map([
        ['nym', [{
          season: 7,
          day: 182,
          timestamp: 'S7D182',
          type: 'first_dynasty_peak',
          description: 'Prior team momentum is already in the ledger.',
          impact: 55,
          relevance: 0.95,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
        ['bos', []],
      ]),
      playerMomentCountsByTeamId: new Map([
        ['nym', 0],
        ['bos', 0],
      ]),
    }));

    expect(result).toHaveLength(2);
    expect(result.every((entry) => entry.moment.type === 'rivalry_renewed')).toBe(true);
    expect(result.every((entry) => entry.moment.impact === 62)).toBe(true);
    expect(result.every((entry) => entry.moment.relevance === 0.88)).toBe(true);
  });

  it('returns no rivalry_renewed moments when the intensity score stays below the floor', () => {
    const result = detectRivalryRenewed(context({
      teams: [
        summary({ teamId: 'nym', wins: 84, losses: 78, madePlayoffs: false }),
        summary({ teamId: 'bos', wins: 83, losses: 79, madePlayoffs: false }),
      ],
      rivalries: new Map([[
        'bos:nym',
        rivalry({
          intensity: 35,
          currentSeasonWinsA: 1,
          currentSeasonWinsB: 0,
          closeRaceStreak: 0,
          playoffSeriesStreak: 0,
          eventHistory: [],
        }),
      ]]),
      standingsByDivision: {
        AL_EAST: [
          standingsEntry({ teamId: 'nym', wins: 84, losses: 78, pct: 84 / 162, gamesBack: 0 }),
          standingsEntry({ teamId: 'bos', wins: 83, losses: 79, pct: 83 / 162, gamesBack: 1 }),
        ],
      },
      teamMoments: new Map([
        ['nym', [{
          season: 7,
          day: 182,
          timestamp: 'S7D182',
          type: 'first_dynasty_peak',
          description: 'Prior team momentum is already in the ledger.',
          impact: 55,
          relevance: 0.95,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
        ['bos', []],
      ]),
      playerMomentCountsByTeamId: new Map([
        ['nym', 0],
        ['bos', 0],
      ]),
    }));

    expect(result).toEqual([]);
  });

  it('stays idempotent when either club already has a current-season rivalry_renewed moment', () => {
    const result = detectRivalryRenewed(context({
      teams: [
        summary({ teamId: 'nym', wins: 89, losses: 73, madePlayoffs: true }),
        summary({ teamId: 'bos', wins: 87, losses: 75, madePlayoffs: true }),
      ],
      rivalries: new Map([['bos:nym', rivalry()]]),
      standingsByDivision: {
        AL_EAST: [
          standingsEntry({ teamId: 'nym', wins: 89, losses: 73, pct: 89 / 162, gamesBack: 0 }),
          standingsEntry({ teamId: 'bos', wins: 87, losses: 75, pct: 87 / 162, gamesBack: 2 }),
        ],
      },
      teamMoments: new Map([
        ['nym', [{
          season: 7,
          day: 182,
          timestamp: 'S7D182',
          type: 'rivalry_renewed',
          description: 'Already recorded.',
          impact: 58,
          relevance: 0.84,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
        ['bos', []],
      ]),
      playerMomentCountsByTeamId: new Map([
        ['nym', 1],
        ['bos', 0],
      ]),
    }));

    expect(result).toEqual([]);
  });
});

describe('detectSeasonIdentityMoments', () => {
  it('emits moments deterministically sorted by teamId + canonical type order', () => {
    const result = detectSeasonIdentityMoments({
      season: 7,
      day: 182,
      teams: [
        summary({ teamId: 'bos', wins: 88, losses: 74, madePlayoffs: false }),
        summary({
          teamId: 'chc',
          wins: 74,
          losses: 88,
          madePlayoffs: false,
          priorSeasonsSummary: [
            { season: 5, wins: 86, losses: 76, divisionRank: 2 },
            { season: 6, wins: 90, losses: 72, divisionRank: 2 },
          ],
        }),
        summary({
          teamId: 'det',
          wins: 68,
          losses: 94,
          madePlayoffs: false,
          priorSeasonsSummary: [
            { season: 4, wins: 81, losses: 81, divisionRank: 4 },
            { season: 5, wins: 73, losses: 89, divisionRank: 4 },
            { season: 6, wins: 70, losses: 92, divisionRank: 5 },
          ],
        }),
        summary({
          teamId: 'hou',
          wins: 90,
          losses: 72,
          madePlayoffs: true,
          divisionRank: 1,
          priorSeasonsSummary: [
            { season: 4, wins: 70, losses: 92, divisionRank: null },
            { season: 5, wins: 68, losses: 94, divisionRank: 3 },
            { season: 6, wins: 75, losses: 87, divisionRank: 2 },
          ],
        }),
        summary({
          teamId: 'mia',
          wins: 84,
          losses: 78,
          madePlayoffs: false,
          divisionRank: 2,
          priorSeasonsSummary: [
            { season: 4, wins: 86, losses: 76, divisionRank: 2 },
            { season: 5, wins: 69, losses: 93, divisionRank: 4 },
            { season: 6, wins: 74, losses: 88, divisionRank: 3 },
          ],
        }),
        summary({
          teamId: 'nym',
          wins: 101,
          losses: 61,
          madePlayoffs: true,
          isChampion: true,
          divisionRank: 1,
          priorSeasonsSummary: [
            { season: 5, wins: 84, losses: 78, divisionRank: 2 },
            { season: 6, wins: 95, losses: 67, divisionRank: 1 },
          ],
        }),
      ],
    });

    expect(result.map((entry) => ({ teamId: entry.teamId, type: entry.moment.type })))
      .toEqual([
        { teamId: 'bos', type: 'contention_collapse' },
        { teamId: 'chc', type: 'rebuild_begun' },
        { teamId: 'det', type: 'losing_season_streak' },
        { teamId: 'hou', type: 'breakout_season' },
        { teamId: 'mia', type: 'contention_window_opens' },
        { teamId: 'nym', type: 'championship_run' },
        { teamId: 'nym', type: 'first_dynasty_peak' },
      ]);
  });

  it('returns the same output for identical input (determinism)', () => {
    const context = {
      season: 11,
      day: 182,
      teams: [
        summary({ teamId: 'nym', wins: 99, losses: 63, madePlayoffs: true, isChampion: true }),
        summary({ teamId: 'bos', wins: 92, losses: 70, madePlayoffs: false }),
      ],
    };
    const first = detectSeasonIdentityMoments(context);
    const second = detectSeasonIdentityMoments(context);
    expect(first).toEqual(second);
  });

  it('returns an empty array when no team qualifies', () => {
    const result = detectSeasonIdentityMoments({
      season: 7,
      day: 182,
      teams: [
        summary({ teamId: 'sd', wins: 72, losses: 90, madePlayoffs: false }),
        summary({ teamId: 'mia', wins: 80, losses: 82, madePlayoffs: false }),
        summary({ teamId: 'oak', wins: 60, losses: 102, madePlayoffs: false }),
      ],
    });
    expect(result).toEqual([]);
  });

  it('emits only the supported wave-3 team moments and omits skipped detector types', () => {
    const result = detectSeasonIdentityMoments(context({
      season: 11,
      teams: [
        summary({
          teamId: 'oak',
          teamName: 'Oakland Comets',
          wins: 68,
          losses: 94,
        }),
        summary({
          teamId: 'nym',
          teamName: 'New York Tycoons',
          wins: 78,
          losses: 84,
          priorSeasonsSummary: [
            { season: 7, wins: 96, losses: 66, divisionRank: 1 },
            { season: 8, wins: 101, losses: 61, divisionRank: 1 },
            { season: 9, wins: 87, losses: 75, divisionRank: 2 },
            { season: 10, wins: 94, losses: 68, divisionRank: 1 },
          ],
        }),
        summary({
          teamId: 'pit',
          teamName: 'Pittsburgh Ironmen',
          wins: 63,
          losses: 99,
        }),
      ],
      tradeHistory: [
        tradeHistoryEntry('trade-1', 'oak', 'lad', ['p1'], 94, 11),
        tradeHistoryEntry('trade-2', 'oak', 'bos', ['p2'], 99, 11),
        tradeHistoryEntry('trade-3', 'oak', 'nym', ['p3'], 104, 11),
      ],
      playerContractYearsById: new Map([
        ['p1', 2],
        ['p2', 3],
        ['p3', 2],
      ]),
      archivedSeasons: Array.from({ length: 9 }, (_, index) => ({
        season: index + 2,
        standings: [
          {
            teamId: 'pit',
            wins: 70,
            losses: 92,
            divisionRank: 4,
          },
        ],
        userRecord: null,
        playoffResult: null,
        championshipWon: false,
        championTeamId: null,
        mvpName: null,
        cyYoungName: null,
        statLeaders: {
          hr: [],
          rbi: [],
          avg: [],
          era: [],
          k: [],
          w: [],
        },
        dynastyScore: null,
      })),
    }));

    const emittedTypes = result.map((entry) => entry.moment.type);

    expect(emittedTypes).toContain('fire_sale');
    expect(emittedTypes).toContain('dynasty_end');
    expect(emittedTypes).toContain('cursed_franchise');
    expect(emittedTypes).not.toContain('playoff_gauntlet');
    expect(emittedTypes).not.toContain('veteran_core_retires');
  });

  it('emits rivalry_renewed once for each club in a heated pair meeting', () => {
    const result = detectSeasonIdentityMoments(context({
      teams: [
        summary({ teamId: 'nym', teamName: 'New York Tycoons', wins: 89, losses: 73, madePlayoffs: true }),
        summary({ teamId: 'bos', teamName: 'Boston Noreasters', wins: 87, losses: 75, madePlayoffs: true }),
      ],
      rivalries: new Map([['bos:nym', rivalry()]]),
      standingsByDivision: {
        AL_EAST: [
          standingsEntry({ teamId: 'nym', wins: 89, losses: 73, pct: 89 / 162, gamesBack: 0 }),
          standingsEntry({ teamId: 'bos', wins: 87, losses: 75, pct: 87 / 162, gamesBack: 2 }),
          standingsEntry({ teamId: 'bal', wins: 82, losses: 80, pct: 82 / 162, gamesBack: 7 }),
        ],
      },
      teamMoments: new Map([
        ['nym', [{
          season: 7,
          day: 182,
          timestamp: 'S7D182',
          type: 'first_dynasty_peak',
          description: 'Prior team momentum is already in the ledger.',
          impact: 55,
          relevance: 0.95,
          isPlayoff: false,
          isEliminationGame: false,
          worldSeriesClincher: false,
          round: null,
        }]],
        ['bos', []],
      ]),
      playerMomentCountsByTeamId: new Map([
        ['nym', 1],
        ['bos', 0],
      ]),
    }));

    expect(result.map((entry) => ({ teamId: entry.teamId, type: entry.moment.type }))).toEqual([
      { teamId: 'bos', type: 'rivalry_renewed' },
      { teamId: 'nym', type: 'rivalry_renewed' },
    ]);
  });
});
