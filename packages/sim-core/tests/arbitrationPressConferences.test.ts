import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '../src/player/generation.js';
import { generateArbitrationPressConference } from '../src/narrative/arbitrationPressConferences.js';

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

describe('generateArbitrationPressConference', () => {
  it('selects the team-win topic when the club wins a high-profile hearing', () => {
    const conference = generateArbitrationPressConference({
      player: createPlayer({
        arbitrationHistory: [{
          season: 5,
          teamId: 'nym',
          yearsOfService: 4,
          teamOffer: 20.1,
          playerAsk: 23.4,
          projectedSalary: 22.1,
          awardedSalary: 20.1,
          teamWon: true,
        }],
      }),
      season: 5,
      teamId: 'nym',
      teamName: 'New York Tycoons',
      gmPersonality: 'aggressive',
      moraleScore: 42,
    });

    expect(conference.topicId).toBe('team_won_vs_star');
    expect(conference.topicCategory).toBe('ARBITRATION');
    expect(conference.headline).toContain('Juan Soto');
  });

  it('selects the player-win topic when the player beats the filing', () => {
    const conference = generateArbitrationPressConference({
      player: createPlayer({
        arbitrationHistory: [{
          season: 5,
          teamId: 'nym',
          yearsOfService: 4,
          teamOffer: 18.6,
          playerAsk: 21.8,
          projectedSalary: 20.2,
          awardedSalary: 21.1,
          teamWon: false,
        }],
      }),
      season: 5,
      teamId: 'nym',
      teamName: 'New York Tycoons',
      gmPersonality: 'analytical',
      moraleScore: 61,
    });

    expect(conference.topicId).toBe('player_won_underdog');
    expect(conference.body).toContain('agent');
  });

  it('prioritizes the super-two debut framing on a first hearing', () => {
    const conference = generateArbitrationPressConference({
      player: createPlayer({
        superTwoQualified: true,
        arbitrationHistory: [{
          season: 5,
          teamId: 'sea',
          yearsOfService: 2,
          teamOffer: 4.7,
          playerAsk: 5.6,
          projectedSalary: 5.0,
          awardedSalary: 5.2,
          teamWon: false,
        }],
      }),
      season: 5,
      teamId: 'sea',
      teamName: 'Seattle Evergreens',
      gmPersonality: 'conservative',
      moraleScore: 57,
    });

    expect(conference.topicId).toBe('super_two_debut');
  });

  it('prioritizes the escalator streak framing after repeated player wins', () => {
    const conference = generateArbitrationPressConference({
      player: createPlayer({
        arbitrationHistory: [
          {
            season: 3,
            teamId: 'bos',
            yearsOfService: 2,
            teamOffer: 5.1,
            playerAsk: 6.2,
            projectedSalary: 5.8,
            awardedSalary: 6.0,
            teamWon: false,
          },
          {
            season: 4,
            teamId: 'bos',
            yearsOfService: 3,
            teamOffer: 7.9,
            playerAsk: 9.1,
            projectedSalary: 8.5,
            awardedSalary: 8.9,
            teamWon: false,
          },
          {
            season: 5,
            teamId: 'bos',
            yearsOfService: 4,
            teamOffer: 10.8,
            playerAsk: 12.5,
            projectedSalary: 11.4,
            awardedSalary: 12.1,
            teamWon: false,
          },
        ],
      }),
      season: 5,
      teamId: 'bos',
      teamName: 'Boston',
      gmPersonality: 'win_now',
      moraleScore: 68,
    });

    expect(conference.topicId).toBe('escalator_streak');
  });

  it('returns identical output for identical tuple-seeded context', () => {
    const context = {
      player: createPlayer({
        id: 'player-77',
        arbitrationHistory: [{
          season: 5,
          teamId: 'nym',
          yearsOfService: 4,
          teamOffer: 17.2,
          playerAsk: 19.0,
          projectedSalary: 18.1,
          awardedSalary: 18.6,
          teamWon: false,
        }],
      }),
      season: 5,
      teamId: 'nym',
      teamName: 'New York Tycoons',
      gmPersonality: 'analytical' as const,
      moraleScore: 64,
    };

    expect(generateArbitrationPressConference(context)).toEqual(
      generateArbitrationPressConference(context),
    );
  });
});
