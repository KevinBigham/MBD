import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '../src/player/generation.js';
import {
  detectArbitrationMoments,
  detectHoldoutResolutions,
} from '../src/moments/arbitrationMoments.js';

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
    overallRating: 318,
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

describe('detectArbitrationMoments', () => {
  it('returns empty when no players carry current-season arbitration history', () => {
    const moments = detectArbitrationMoments([], {
      season: 5,
      day: 12,
    });

    expect(moments).toEqual([]);
  });

  it('emits an arbitration win when the player wins at or above projection', () => {
    const moments = detectArbitrationMoments([
      createPlayer({
        arbitrationHistory: [{
          season: 5,
          teamId: 'nym',
          yearsOfService: 3,
          teamOffer: 7.4,
          playerAsk: 8.8,
          projectedSalary: 8.1,
          awardedSalary: 8.1,
          teamWon: false,
        }],
      }),
    ], {
      season: 5,
      day: 12,
    });

    expect(moments).toContainEqual(expect.objectContaining({
      playerId: 'player-1',
      moment: expect.objectContaining({
        type: 'arbitration_win',
        day: 12,
      }),
    }));
  });

  it('emits an arbitration loss when the club beats the player filing', () => {
    const moments = detectArbitrationMoments([
      createPlayer({
        arbitrationHistory: [{
          season: 5,
          teamId: 'bos',
          yearsOfService: 4,
          teamOffer: 9.2,
          playerAsk: 10.5,
          projectedSalary: 10.1,
          awardedSalary: 9.2,
          teamWon: true,
        }],
      }),
    ], {
      season: 5,
      day: 12,
    });

    expect(moments).toContainEqual(expect.objectContaining({
      playerId: 'player-1',
      moment: expect.objectContaining({
        type: 'arbitration_loss',
        day: 12,
      }),
    }));
  });

  it('emits a super-two debut alongside the first hearing', () => {
    const moments = detectArbitrationMoments([
      createPlayer({
        superTwoQualified: true,
        arbitrationHistory: [{
          season: 5,
          teamId: 'sea',
          yearsOfService: 2,
          teamOffer: 4.8,
          playerAsk: 5.6,
          projectedSalary: 5.2,
          awardedSalary: 5.4,
          teamWon: false,
        }],
      }),
    ], {
      season: 5,
      day: 12,
    });

    expect(moments).toContainEqual(expect.objectContaining({
      playerId: 'player-1',
      moment: expect.objectContaining({
        type: 'super_two_debut',
      }),
    }));
  });

  it('never emits holdout resolution from the v20 arbitration pass', () => {
    const moments = detectArbitrationMoments([
      createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'nym',
          salaryGap: 1.5,
          holdoutDays: 7,
          moraleHit: 12,
        },
        arbitrationHistory: [{
          season: 5,
          teamId: 'nym',
          yearsOfService: 3,
          teamOffer: 6.5,
          playerAsk: 7.9,
          projectedSalary: 7.2,
          awardedSalary: 6.5,
          teamWon: true,
        }],
      }),
    ], {
      season: 5,
      day: 12,
    });

    expect(moments.some(({ moment }) => moment.type === 'holdout_resolution')).toBe(false);
  });

  it('sorts moment output deterministically by player id and moment order', () => {
    const moments = detectArbitrationMoments([
      createPlayer({
        id: 'player-z',
        superTwoQualified: true,
        arbitrationHistory: [{
          season: 5,
          teamId: 'nym',
          yearsOfService: 2,
          teamOffer: 4.2,
          playerAsk: 5.0,
          projectedSalary: 4.6,
          awardedSalary: 4.9,
          teamWon: false,
        }],
      }),
      createPlayer({
        id: 'player-a',
        arbitrationHistory: [{
          season: 5,
          teamId: 'bos',
          yearsOfService: 4,
          teamOffer: 8.1,
          playerAsk: 9.0,
          projectedSalary: 8.6,
          awardedSalary: 8.1,
          teamWon: true,
        }],
      }),
    ], {
      season: 5,
      day: 12,
    });

    expect(moments.map(({ playerId, moment }) => `${playerId}:${moment.type}`)).toEqual([
      'player-a:arbitration_loss',
      'player-z:arbitration_win',
      'player-z:super_two_debut',
    ]);
  });
});

describe('detectHoldoutResolutions', () => {
  it('returns empty when no players carry an active holdout', () => {
    const moments = detectHoldoutResolutions([createPlayer()], {
      season: 6,
      day: 3,
    });

    expect(moments).toEqual([]);
  });

  it('emits a holdout_resolution moment for each player with holdoutState', () => {
    const moments = detectHoldoutResolutions([
      createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'nym',
          salaryGap: 1.5,
          holdoutDays: 7,
          moraleHit: 12,
        },
      }),
    ], {
      season: 6,
      day: 3,
    });

    expect(moments).toHaveLength(1);
    expect(moments[0]).toEqual(expect.objectContaining({
      playerId: 'player-1',
      moment: expect.objectContaining({
        type: 'holdout_resolution',
        season: 6,
        day: 3,
        timestamp: 'S6D3',
      }),
    }));
    expect(moments[0].moment.description).toContain('7 days');
    expect(moments[0].moment.description).toContain('$1.5M');
  });

  it('singularizes "1 day" in the resolution description', () => {
    const [resolution] = detectHoldoutResolutions([
      createPlayer({
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 0.8,
          holdoutDays: 1,
          moraleHit: 4,
        },
      }),
    ], {
      season: 6,
      day: 3,
    });

    expect(resolution.moment.description).toContain('1 day ');
    expect(resolution.moment.description).not.toContain('1 days');
  });

  it('skips players without a holdoutState', () => {
    const moments = detectHoldoutResolutions([
      createPlayer({ id: 'player-clear', holdoutState: null }),
      createPlayer({
        id: 'player-held',
        holdoutState: {
          season: 5,
          teamId: 'sea',
          salaryGap: 2.1,
          holdoutDays: 14,
          moraleHit: 18,
        },
      }),
    ], {
      season: 6,
      day: 3,
    });

    expect(moments.map(({ playerId }) => playerId)).toEqual(['player-held']);
  });

  it('sorts resolutions deterministically by player id', () => {
    const moments = detectHoldoutResolutions([
      createPlayer({
        id: 'player-z',
        holdoutState: {
          season: 5,
          teamId: 'nym',
          salaryGap: 1.2,
          holdoutDays: 9,
          moraleHit: 11,
        },
      }),
      createPlayer({
        id: 'player-a',
        holdoutState: {
          season: 5,
          teamId: 'bos',
          salaryGap: 2.0,
          holdoutDays: 5,
          moraleHit: 8,
        },
      }),
    ], {
      season: 6,
      day: 3,
    });

    expect(moments.map(({ playerId }) => playerId)).toEqual(['player-a', 'player-z']);
  });
});
