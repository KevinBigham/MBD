import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '../src/player/generation.js';
import {
  detectDeadlineIdentityMoments,
  detectTradeMoments,
} from '../src/moments/tradeMoments.js';

function createPlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Alex',
    lastName: 'Ramirez',
    age: 27,
    position: 'SS',
    hitterAttributes: {
      contact: 320,
      power: 290,
      eye: 280,
      speed: 300,
      defense: 295,
      durability: 310,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 65,
      mentalToughness: 61,
      leadership: 54,
      competitiveness: 74,
    },
    contract: {
      years: 1,
      annualSalary: 4.2,
      totalValue: 4.2,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    },
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    teamId: 'nym',
    nationality: 'latin',
    overallRating: 278,
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 520,
    optionYearsUsed: 1,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    arbitrationHistory: [],
    holdoutState: null,
    superTwoQualified: false,
    ...overrides,
  };
}

describe('detectTradeMoments', () => {
  it('returns empty when no moved player clears the blockbuster thresholds', () => {
    const moments = detectTradeMoments({
      season: 5,
      day: 60,
      movedPlayers: [createPlayer()],
      acquiredPlayers: [createPlayer({ id: 'player-2', overallRating: 250 })],
    });

    expect(moments).toEqual([]);
  });

  it('emits one moved beat and one acquired beat for a blockbuster trade', () => {
    const moments = detectTradeMoments({
      season: 5,
      day: 92,
      movedPlayers: [createPlayer({
        id: 'player-star',
        firstName: 'Juan',
        lastName: 'Soto',
        teamId: 'lad',
        overallRating: 401,
      })],
      acquiredPlayers: [createPlayer({
        id: 'player-haul',
        firstName: 'Kevin',
        lastName: 'Parada',
        teamId: 'sd',
        overallRating: 284,
      })],
    });

    expect(moments.map(({ playerId, moment }) => `${playerId}:${moment.type}`)).toEqual([
      'player-haul:blockbuster_trade_acquired',
      'player-star:blockbuster_trade_moved',
    ]);
  });

  it('treats the rating and contract cutoffs as inclusive boundaries', () => {
    const moments = detectTradeMoments({
      season: 5,
      day: 100,
      movedPlayers: [createPlayer({
        id: 'player-rating-cutoff',
        overallRating: 280,
      })],
      acquiredPlayers: [createPlayer({
        id: 'player-contract-cutoff',
        overallRating: 240,
        contract: {
          years: 3,
          annualSalary: 20,
          totalValue: 60,
          noTradeClause: false,
          playerOption: false,
          teamOption: false,
        },
      })],
    });

    expect(moments.map(({ playerId }) => playerId)).toEqual([
      'player-contract-cutoff',
      'player-rating-cutoff',
    ]);
  });

  it('sorts output deterministically by playerId regardless of asset order', () => {
    const moments = detectTradeMoments({
      season: 5,
      day: 110,
      movedPlayers: [
        createPlayer({ id: 'player-z', overallRating: 320 }),
        createPlayer({ id: 'player-a', overallRating: 330 }),
      ],
      acquiredPlayers: [
        createPlayer({ id: 'player-y', overallRating: 281 }),
        createPlayer({ id: 'player-b', overallRating: 282 }),
      ],
    });

    expect(moments.map(({ playerId, moment }) => `${playerId}:${moment.type}`)).toEqual([
      'player-a:blockbuster_trade_moved',
      'player-b:blockbuster_trade_acquired',
      'player-y:blockbuster_trade_acquired',
      'player-z:blockbuster_trade_moved',
    ]);
  });
});

describe('detectDeadlineIdentityMoments', () => {
  it('returns empty outside deadline mode even when the trade is a blockbuster', () => {
    const moments = detectDeadlineIdentityMoments({
      season: 5,
      day: 61,
      sellerTeamId: 'sd',
      buyerTeamId: 'lad',
      hasBlockbusterPlayers: true,
    });

    expect(moments).toEqual([]);
  });

  it('returns empty on the deadline when no blockbuster threshold is met', () => {
    const moments = detectDeadlineIdentityMoments({
      season: 5,
      day: 122,
      sellerTeamId: 'sd',
      buyerTeamId: 'lad',
      hasBlockbusterPlayers: false,
    });

    expect(moments).toEqual([]);
  });

  it('emits seller and buyer identity moments in teamId order on deadline day', () => {
    const moments = detectDeadlineIdentityMoments({
      season: 5,
      day: 122,
      sellerTeamId: 'sd',
      buyerTeamId: 'lad',
      hasBlockbusterPlayers: true,
    });

    expect(moments.map(({ teamId, moment }) => `${teamId}:${moment.type}`)).toEqual([
      'lad:deadline_buyer',
      'sd:deadline_seller',
    ]);
    expect(moments.every(({ moment }) => moment.timestamp === 'S5D122')).toBe(true);
  });
});
