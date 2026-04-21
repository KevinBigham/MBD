import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import type { GeneratedPlayer } from '../src/player/generation.js';
import {
  generateHoldoutBriefing,
  generateHoldoutResolutionBriefing,
} from '../src/narrative/holdoutCoverage.js';

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

describe('generateHoldoutResolutionBriefing', () => {
  it('returns null when there is no active holdout state', () => {
    const briefing = generateHoldoutResolutionBriefing({
      player: createPlayer({ holdoutState: null }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 60,
    });

    expect(briefing).toBeNull();
  });

  it('returns null for short (shock-tier) holdouts', () => {
    const briefing = generateHoldoutResolutionBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 1.2,
          holdoutDays: 2,
          moraleHit: 6,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 60,
    });

    expect(briefing).toBeNull();
  });

  it('returns null for posturing-tier holdouts (6 days)', () => {
    const briefing = generateHoldoutResolutionBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 2.0,
          holdoutDays: 6,
          moraleHit: 10,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 55,
    });

    expect(briefing).toBeNull();
  });

  it('fires priority-2 resolution for pressure-tier holdouts (7-13 days)', () => {
    const briefing = generateHoldoutResolutionBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 2.4,
          holdoutDays: 9,
          moraleHit: 12,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 55,
    });

    expect(briefing).toEqual(expect.objectContaining({
      topicId: 'holdout_resolution',
      topicCategory: 'HOLDOUT',
      priority: 2,
    }));
    expect(briefing?.id).toBe('briefing-holdout-resolution-player-1-6-3');
    expect(briefing?.headline).toContain('9-day holdout');
    expect(briefing?.headline).toContain('Boston');
    expect(briefing?.body).toContain('$2.4M');
  });

  it('fires priority-1 resolution for crisis-tier holdouts (>=14 days)', () => {
    const briefing = generateHoldoutResolutionBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 4.1,
          holdoutDays: 18,
          moraleHit: 18,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 32,
    });

    expect(briefing).toEqual(expect.objectContaining({
      topicId: 'holdout_resolution',
      topicCategory: 'HOLDOUT',
      priority: 1,
    }));
    expect(briefing?.headline).toContain('18-day holdout');
  });

  it('reflects morale tone in the resolution body', () => {
    const terseBriefing = generateHoldoutResolutionBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 3.0,
          holdoutDays: 10,
          moraleHit: 15,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 28,
    });

    const cordialBriefing = generateHoldoutResolutionBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 3.0,
          holdoutDays: 10,
          moraleHit: 15,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 72,
    });

    expect(terseBriefing?.body).toContain('terse');
    expect(cordialBriefing?.body).toContain('cordial');
  });

  it('uses a distinct ID prefix from the opening-holdout briefing', () => {
    const openingId = generateHoldoutBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 2.5,
          holdoutDays: 10,
          moraleHit: 14,
        },
      }),
      season: 5,
      day: 12,
      teamName: 'Boston',
      moraleScore: 50,
    })?.id;

    const resolutionId = generateHoldoutResolutionBriefing({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 2.5,
          holdoutDays: 10,
          moraleHit: 14,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 50,
    })?.id;

    expect(openingId).toBe('briefing-holdout-player-1-5-12');
    expect(resolutionId).toBe('briefing-holdout-resolution-player-1-6-3');
    expect(openingId).not.toBe(resolutionId);
  });

  it('stays deterministic for the same resolution seed', () => {
    const makeContext = () => ({
      player: createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 3.0,
          holdoutDays: 10,
          moraleHit: 15,
        },
      }),
      season: 6,
      day: 3,
      teamName: 'Boston',
      moraleScore: 55,
      rng: new GameRNG(901),
    });

    const first = generateHoldoutResolutionBriefing(makeContext());
    const second = generateHoldoutResolutionBriefing(makeContext());

    expect(first).toEqual(second);
  });

  it('uses at least four distinct pressure-tier resolution variants across seeds', () => {
    const variants = new Set(
      Array.from({ length: 20 }, (_, index) => generateHoldoutResolutionBriefing({
        player: createPlayer({
          holdoutState: {
            season: 5,
            teamId: 'bos',
            salaryGap: 2.9,
            holdoutDays: 10,
            moraleHit: 14,
          },
        }),
        season: 6,
        day: 3,
        teamName: 'Boston',
        moraleScore: 55,
        rng: new GameRNG(1000 + index),
      }))
        .filter((briefing): briefing is NonNullable<typeof briefing> => briefing != null)
        .map((briefing) => `${briefing.headline} :: ${briefing.body}`),
    );

    expect(variants.size).toBeGreaterThanOrEqual(4);
  });

  it('uses at least four distinct crisis-tier resolution variants across seeds', () => {
    const variants = new Set(
      Array.from({ length: 20 }, (_, index) => generateHoldoutResolutionBriefing({
        player: createPlayer({
          holdoutState: {
            season: 5,
            teamId: 'bos',
            salaryGap: 4.6,
            holdoutDays: 18,
            moraleHit: 19,
          },
        }),
        season: 6,
        day: 3,
        teamName: 'Boston',
        moraleScore: 32,
        rng: new GameRNG(1100 + index),
      }))
        .filter((briefing): briefing is NonNullable<typeof briefing> => briefing != null)
        .map((briefing) => `${briefing.headline} :: ${briefing.body}`),
    );

    expect(variants.size).toBeGreaterThanOrEqual(4);
  });
});
