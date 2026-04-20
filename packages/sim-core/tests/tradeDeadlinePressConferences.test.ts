import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '../src/player/generation.js';
import type { GMPersonality } from '../src/trade/tradeAI.js';
import { generateTradeDeadlinePressConference } from '../src/narrative/tradeDeadlinePressConferences.js';

function createPlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Juan',
    lastName: 'Soto',
    age: 26,
    position: 'RF',
    hitterAttributes: {
      contact: 385,
      power: 380,
      eye: 410,
      speed: 250,
      defense: 275,
      durability: 320,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 73,
      mentalToughness: 78,
      leadership: 60,
      competitiveness: 88,
    },
    contract: {
      years: 1,
      annualSalary: 21.5,
      totalValue: 21.5,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    },
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    teamId: 'nym',
    nationality: 'latin',
    overallRating: 402,
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 860,
    optionYearsUsed: 0,
    isOutOfOptions: true,
    minorLeagueLevel: null,
    arbitrationHistory: [],
    holdoutState: null,
    superTwoQualified: false,
    ...overrides,
  };
}

function createContext(overrides: Partial<Parameters<typeof generateTradeDeadlinePressConference>[0]> = {}) {
  return {
    tradeId: 'trade-1',
    season: 5,
    day: 122,
    sellerTeamId: 'sd',
    sellerTeamName: 'San Diego Waves',
    sellerGMPersonality: 'analytical' as GMPersonality,
    buyerTeamId: 'lad',
    buyerTeamName: 'Los Angeles Stars',
    buyerGMPersonality: 'analytical' as GMPersonality,
    movedPlayers: [createPlayer({
      id: 'player-star',
      firstName: 'Juan',
      lastName: 'Soto',
      teamId: 'lad',
      overallRating: 405,
      contract: {
        years: 1,
        annualSalary: 28,
        totalValue: 28,
        noTradeClause: false,
        playerOption: false,
        teamOption: false,
      },
    })],
    acquiredPlayers: [createPlayer({
      id: 'player-haul',
      firstName: 'Leo',
      lastName: 'De Vries',
      teamId: 'sd',
      overallRating: 287,
      contract: {
        years: 6,
        annualSalary: 2,
        totalValue: 12,
        noTradeClause: false,
        playerOption: false,
        teamOption: false,
      },
    })],
    ...overrides,
  };
}

describe('generateTradeDeadlinePressConference', () => {
  it('selects the default deadline blockbuster topic for a July star move', () => {
    const conference = generateTradeDeadlinePressConference(createContext());

    expect(conference.topicId).toBe('deadline_blockbuster');
    expect(conference.topicCategory).toBe('TRADE_DEADLINE');
    expect(conference.headline).toContain('Juan Soto');
  });

  it('selects the seller-signal topic when a patient seller explains the pivot', () => {
    const conference = generateTradeDeadlinePressConference(createContext({
      sellerGMPersonality: 'prospect_hugger',
      buyerGMPersonality: 'conservative',
    }));

    expect(conference.topicId).toBe('deadline_sell_signal');
    expect(conference.body).toContain('San Diego Waves');
  });

  it('selects the buyer-signal topic when an urgent contender pushes in', () => {
    const conference = generateTradeDeadlinePressConference(createContext({
      sellerGMPersonality: 'analytical',
      buyerGMPersonality: 'win_now',
    }));

    expect(conference.topicId).toBe('deadline_buy_signal');
    expect(conference.body).toContain('Los Angeles Stars');
  });

  it('falls back to the offseason blockbuster topic outside the July window', () => {
    const conference = generateTradeDeadlinePressConference(createContext({
      day: 45,
    }));

    expect(conference.topicId).toBe('offseason_blockbuster');
  });

  it('uses the routine swap topic for moderate trades', () => {
    const conference = generateTradeDeadlinePressConference(createContext({
      movedPlayers: [createPlayer({
        id: 'player-moderate-out',
        overallRating: 274,
        contract: {
          years: 2,
          annualSalary: 8,
          totalValue: 16,
          noTradeClause: false,
          playerOption: false,
          teamOption: false,
        },
      })],
      acquiredPlayers: [createPlayer({
        id: 'player-moderate-in',
        overallRating: 276,
        contract: {
          years: 3,
          annualSalary: 5,
          totalValue: 15,
          noTradeClause: false,
          playerOption: false,
          teamOption: false,
        },
      })],
    }));

    expect(conference.topicId).toBe('routine_swap');
    expect(conference.priority).toBe(3);
  });

  it('produces readable deterministic copy across every GM personality', () => {
    const personalities: GMPersonality[] = [
      'aggressive',
      'conservative',
      'analytical',
      'prospect_hugger',
      'win_now',
    ];

    for (const personality of personalities) {
      const context = createContext({
        tradeId: `trade-${personality}`,
        sellerGMPersonality: personality,
      });
      const conference = generateTradeDeadlinePressConference(context);

      expect(conference.headline.length).toBeGreaterThan(20);
      expect(conference.body).not.toContain('undefined');
      expect(generateTradeDeadlinePressConference(context)).toEqual(conference);
    }
  });
});
