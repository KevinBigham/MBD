import { describe, expect, it } from 'vitest';
import type { Rivalry } from '@mbd/contracts';
import {
  deriveRivalriesFromStandings,
  finalizeSeasonRivalries,
  getRivalry,
  recordBlockbusterTradeRivalry,
  recordRivalryGame,
  recordStarDefectionRivalry,
  rivalryGameModifier,
  rivalryTradePenalty,
  seedHistoricalRivalries,
} from '../src/league/rivalries.js';

function baseRivalries(): Map<string, Rivalry> {
  return seedHistoricalRivalries(new Map());
}

describe('rivalry engine', () => {
  it('seeds historical rivalries on initialization', () => {
    const rivalries = baseRivalries();

    expect(getRivalry(rivalries, 'nym', 'bos')?.origin).toBe('historical');
    expect(getRivalry(rivalries, 'lax', 'sfb')?.intensity).toBeGreaterThanOrEqual(70);
    expect(getRivalry(rivalries, 'chi', 'det')).toBeTruthy();
  });

  it('looks up the same rivalry regardless of team-id argument order', () => {
    const rivalries = baseRivalries();

    expect(getRivalry(rivalries, 'nym', 'bos')).toEqual(getRivalry(rivalries, 'bos', 'nym'));
  });

  it('preserves saved rivalry intensity when historical rivals are re-seeded', () => {
    const existing = new Map<string, Rivalry>([[
      'bos:nym',
      {
        ...getRivalry(baseRivalries(), 'nym', 'bos')!,
        intensity: 76,
      },
    ]]);

    const reseeded = seedHistoricalRivalries(existing);

    expect(getRivalry(reseeded, 'nym', 'bos')?.intensity).toBe(76);
  });

  it('tracks head-to-head records for active rivalry games', () => {
    const rivalries = recordRivalryGame(baseRivalries(), {
      homeTeamId: 'nym',
      awayTeamId: 'bos',
      homeScore: 5,
      awayScore: 4,
    }, 3);
    const rivalry = getRivalry(rivalries, 'nym', 'bos');

    expect(rivalry?.currentSeasonWinsA ?? rivalry?.currentSeasonWinsB).toBeGreaterThan(0);
    expect((rivalry?.historicalWinsA ?? 0) + (rivalry?.historicalWinsB ?? 0)).toBe(1);
    expect(rivalry?.lastMetSeason).toBe(3);
  });

  it('forms emerging rivalries after three straight close division races', () => {
    let rivalries = new Map<string, Rivalry>();
    for (let season = 1; season <= 3; season += 1) {
      rivalries = finalizeSeasonRivalries(rivalries, {
        season,
        standingsByDivision: {
          AL_EAST: [
            { teamId: 'bal', wins: 92, losses: 70, pct: 0.568, gamesBack: 0, runsScored: 0, runsAllowed: 0, runDifferential: 0, streak: '-', last10Wins: 5, last10Losses: 5 },
            { teamId: 'orl', wins: 90, losses: 72, pct: 0.556, gamesBack: 2, runsScored: 0, runsAllowed: 0, runDifferential: 0, streak: '-', last10Wins: 5, last10Losses: 5 },
          ],
        },
        playoffSeries: [],
      });
    }

    const rivalry = getRivalry(rivalries, 'bal', 'orl');
    expect(rivalry?.origin).toBe('division_race');
    expect(rivalry?.closeRaceStreak).toBe(3);
    expect(rivalry?.intensity).toBeGreaterThanOrEqual(55);
  });

  it('accelerates intensity after consecutive playoff meetings', () => {
    let rivalries = new Map<string, Rivalry>();
    rivalries = finalizeSeasonRivalries(rivalries, {
      season: 1,
      standingsByDivision: {},
      playoffSeries: [{
        higherSeed: { teamId: 'hou', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
        lowerSeed: { teamId: 'sat', seed: 3, wins: 91, losses: 71, league: 'AL', divisionWinner: false },
        winnerId: 'hou',
        loserId: 'sat',
        round: 'CHAMPIONSHIP_SERIES',
      }],
    });
    rivalries = finalizeSeasonRivalries(rivalries, {
      season: 2,
      standingsByDivision: {},
      playoffSeries: [{
        higherSeed: { teamId: 'hou', seed: 2, wins: 95, losses: 67, league: 'AL', divisionWinner: false },
        lowerSeed: { teamId: 'sat', seed: 3, wins: 92, losses: 70, league: 'AL', divisionWinner: false },
        winnerId: 'sat',
        loserId: 'hou',
        round: 'DIVISION_SERIES',
      }],
    });

    const rivalry = getRivalry(rivalries, 'hou', 'sat');
    expect(rivalry?.origin).toBe('playoff');
    expect(rivalry?.playoffSeriesStreak).toBe(2);
    expect(rivalry?.reasons).toContain('Back-to-back playoff meetings');
  });

  it('records blockbuster trade events as rivalry accelerants', () => {
    const rivalries = recordBlockbusterTradeRivalry(new Map(), {
      season: 4,
      fromTeamId: 'nym',
      toTeamId: 'bos',
      impactScore: 54,
      summary: 'Blockbuster trade reopened old wounds',
    });
    const rivalry = getRivalry(rivalries, 'nym', 'bos');

    expect(rivalry?.lastTradeSeason).toBe(4);
    expect(rivalry?.reasons).toContain('Blockbuster trade reopened old wounds');
    expect(rivalry?.intensity).toBeGreaterThanOrEqual(80);
  });

  it('records star defections across rivalry lines', () => {
    const rivalries = recordStarDefectionRivalry(new Map(), {
      season: 5,
      fromTeamId: 'lax',
      toTeamId: 'sfb',
      playerName: 'Ace Example',
      starScore: 355,
    });
    const rivalry = getRivalry(rivalries, 'lax', 'sfb');

    expect(rivalry?.lastDefectionSeason).toBe(5);
    expect(rivalry?.reasons.some((reason) => reason.includes('Ace Example'))).toBe(true);
    expect(rivalry?.eventHistory?.some((event) => event.type === 'defection')).toBe(true);
  });

  it('decays dormant non-historical rivalries over time', () => {
    let rivalries = recordBlockbusterTradeRivalry(new Map(), {
      season: 2,
      fromTeamId: 'sea',
      toTeamId: 'sat',
      impactScore: 48,
    });

    rivalries = finalizeSeasonRivalries(rivalries, {
      season: 3,
      standingsByDivision: {},
      playoffSeries: [],
    });

    expect(getRivalry(rivalries, 'sea', 'sat')?.intensity).toBeLessThan(60);
  });

  it('applies an extra trade penalty when a rival is asked to move stars', () => {
    const penalty = rivalryTradePenalty(baseRivalries(), 'nym', 'bos', [365, 328, 250]);
    const neutralPenalty = rivalryTradePenalty(new Map(), 'nym', 'por', [365]);

    expect(penalty).toBeGreaterThan(neutralPenalty);
    expect(penalty).toBeGreaterThan(10);
  });

  it('amplifies chemistry edges in rivalry games', () => {
    const boost = rivalryGameModifier(baseRivalries(), 'nym', 'bos', 78);
    const drag = rivalryGameModifier(baseRivalries(), 'bos', 'nym', 28);

    expect(boost).toBeGreaterThan(0);
    expect(drag).toBeLessThan(0);
  });
});
