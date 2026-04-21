import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import type { Moment } from '../src/moments/momentDetector.js';
import {
  generateExtensionSignedBriefing,
  generateRebuildAnnouncementBriefing,
} from '../src/narrative/eventBriefings.js';
import type { GeneratedPlayer } from '../src/player/generation.js';

function createPlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Julio',
    lastName: 'Rodriguez',
    age: 27,
    position: 'CF',
    hitterAttributes: {
      contact: 350,
      power: 365,
      eye: 315,
      speed: 340,
      defense: 310,
      durability: 320,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 72,
      mentalToughness: 69,
      leadership: 63,
      competitiveness: 80,
    },
    contract: {
      years: 6,
      annualSalary: 28,
      totalValue: 168,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    },
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    teamId: 'sea',
    nationality: 'latin',
    overallRating: 378,
    rule5EligibleAfterSeason: 4,
    serviceTimeDays: 720,
    optionYearsUsed: 0,
    isOutOfOptions: true,
    minorLeagueLevel: null,
    arbitrationHistory: [],
    extensionHistory: [],
    holdoutState: null,
    superTwoQualified: false,
    ...overrides,
  };
}

function createTeamMoment(overrides: Partial<Moment> = {}): Moment {
  return {
    season: 7,
    type: 'fire_sale',
    description: 'Deadline teardown.',
    impact: -55,
    relevance: 0.9,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null,
    ...overrides,
  };
}

describe('generateExtensionSignedBriefing', () => {
  it('returns null when the accepted extension does not clear the big-extension threshold', () => {
    const briefing = generateExtensionSignedBriefing({
      player: createPlayer({
        extensionHistory: [
          {
            season: 7,
            teamId: 'sea',
            years: 3,
            annualSalary: 14,
            totalValue: 42,
            outcome: 'accepted',
          },
        ],
      }),
      season: 7,
      day: 118,
      teamName: 'Seattle',
    });

    expect(briefing).toBeNull();
  });

  it('emits an extension briefing for a big accepted extension', () => {
    const briefing = generateExtensionSignedBriefing({
      player: createPlayer({
        extensionHistory: [
          {
            season: 7,
            teamId: 'sea',
            years: 6,
            annualSalary: 28,
            totalValue: 168,
            outcome: 'accepted',
          },
        ],
      }),
      season: 7,
      day: 118,
      teamName: 'Seattle',
    });

    expect(briefing).toEqual(expect.objectContaining({
      category: 'extension',
      tag: 'BREAKING',
      relatedPlayerIds: ['player-1'],
      relatedTeamIds: ['sea'],
    }));
    expect(briefing?.headline).toContain('Seattle');
    expect(briefing?.body).toContain('$168.0M');
  });

  it('uses at least four distinct extension variants across seeds', () => {
    const variants = new Set(
      Array.from({ length: 20 }, (_, index) => generateExtensionSignedBriefing({
        player: createPlayer({
          extensionHistory: [
            {
              season: 7,
              teamId: 'sea',
              years: 6,
              annualSalary: 28,
              totalValue: 168,
              outcome: 'accepted',
            },
          ],
        }),
        season: 7,
        day: 118,
        teamName: 'Seattle',
        rng: new GameRNG(1200 + index),
      }))
        .filter((briefing): briefing is NonNullable<typeof briefing> => briefing != null)
        .map((briefing) => `${briefing.headline} :: ${briefing.body}`),
    );

    expect(variants.size).toBeGreaterThanOrEqual(4);
  });
});

describe('generateRebuildAnnouncementBriefing', () => {
  it('fires a breaking rebuild announcement when the team already logged a fire_sale moment', () => {
    const briefing = generateRebuildAnnouncementBriefing({
      teamId: 'pit',
      teamName: 'Pittsburgh',
      season: 7,
      day: 145,
      wins: 67,
      losses: 95,
      gmPersonality: 'prospect_hugger',
      teamMoments: [createTeamMoment()],
    });

    expect(briefing).toEqual(expect.objectContaining({
      category: 'news',
      tag: 'BREAKING',
      priority: 1,
      relatedTeamIds: ['pit'],
    }));
  });

  it('fires an analytical rebuild announcement for a sub-.400 finish without a fire sale', () => {
    const briefing = generateRebuildAnnouncementBriefing({
      teamId: 'pit',
      teamName: 'Pittsburgh',
      season: 7,
      day: 182,
      wins: 60,
      losses: 102,
      gmPersonality: 'analytical',
      teamMoments: [],
    });

    expect(briefing).toEqual(expect.objectContaining({
      category: 'news',
      tag: 'ANALYSIS',
      priority: 2,
    }));
    expect(briefing?.body).toContain('0.370');
  });

  it('uses at least four distinct rebuild-announcement variants across seeds', () => {
    const variants = new Set(
      Array.from({ length: 20 }, (_, index) => generateRebuildAnnouncementBriefing({
        teamId: 'pit',
        teamName: 'Pittsburgh',
        season: 7,
        day: 182,
        wins: 60,
        losses: 102,
        gmPersonality: 'analytical',
        teamMoments: [],
        rng: new GameRNG(1300 + index),
      }))
        .filter((briefing): briefing is NonNullable<typeof briefing> => briefing != null)
        .map((briefing) => `${briefing.headline} :: ${briefing.body}`),
    );

    expect(variants.size).toBeGreaterThanOrEqual(4);
  });
});
