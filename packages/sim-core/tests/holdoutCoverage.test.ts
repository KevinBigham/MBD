import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '../src/player/generation.js';
import { generateHoldoutBriefing } from '../src/narrative/holdoutCoverage.js';

function createPlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Rafael',
    lastName: 'Devers',
    age: 28,
    position: '3B',
    hitterAttributes: {
      contact: 355,
      power: 370,
      eye: 310,
      speed: 230,
      defense: 260,
      durability: 315,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 62,
      mentalToughness: 58,
      leadership: 51,
      competitiveness: 82,
    },
    contract: {
      years: 1,
      annualSalary: 9.4,
      totalValue: 9.4,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    },
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    teamId: 'bos',
    nationality: 'latin',
    overallRating: 374,
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 712,
    optionYearsUsed: 0,
    isOutOfOptions: true,
    minorLeagueLevel: null,
    arbitrationHistory: [],
    holdoutState: {
      season: 5,
      teamId: 'bos',
      salaryGap: 2.3,
      holdoutDays: 2,
      moraleHit: 8,
    },
    superTwoQualified: false,
    ...overrides,
  };
}

describe('generateHoldoutBriefing', () => {
  it('uses the shock beat for short holdouts', () => {
    const briefing = generateHoldoutBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 1.8,
          holdoutDays: 2,
          moraleHit: 6,
        },
      }),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 61,
    });

    expect(briefing?.topicId).toBe('holdout_shock');
    expect(briefing?.topicCategory).toBe('HOLDOUT');
  });

  it('uses the posturing beat for medium holdouts', () => {
    const briefing = generateHoldoutBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 2.1,
          holdoutDays: 5,
          moraleHit: 10,
        },
      }),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 55,
    });

    expect(briefing?.topicId).toBe('holdout_posturing');
  });

  it('uses the pressure beat for week-long holdouts', () => {
    const briefing = generateHoldoutBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 2.8,
          holdoutDays: 9,
          moraleHit: 14,
        },
      }),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 44,
    });

    expect(briefing?.topicId).toBe('holdout_pressure');
  });

  it('uses the crisis beat for long holdouts', () => {
    const briefing = generateHoldoutBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 4.4,
          holdoutDays: 16,
          moraleHit: 18,
        },
      }),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 29,
    });

    expect(briefing?.topicId).toBe('holdout_crisis');
  });

  it('darkens the tone for low-morale standoffs', () => {
    const lowMorale = generateHoldoutBriefing({
      player: createPlayer(),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 25,
    });

    const stableMorale = generateHoldoutBriefing({
      player: createPlayer(),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 68,
    });

    expect(lowMorale?.body).not.toBe(stableMorale?.body);
  });

  it('returns null when there is no active holdout state', () => {
    const briefing = generateHoldoutBriefing({
      player: createPlayer({ holdoutState: null }),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 68,
    });

    expect(briefing).toBeNull();
  });
});
