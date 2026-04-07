import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  calculateDynastyScore,
  evaluateHOFCandidate,
  processHOFInductions,
  type AwardHistoryEntry,
  type CareerStatsLedger,
  type FranchiseTimelineEntry,
  type HallOfFameBallotEntry,
  type HallOfFameCandidate,
} from '../src/index.js';

function createCandidate(overrides: Partial<HallOfFameCandidate> = {}): HallOfFameCandidate {
  return {
    playerId: 'p1',
    playerName: 'Test Legend',
    position: 'CF',
    seasonsPlayed: 14,
    peakOverall: 78,
    currentOverall: 62,
    teamIds: ['nym', 'sea'],
    championshipRings: 2,
    allStarSelections: 0,
    careerStats: {
      playerId: 'p1',
      playerName: 'Test Legend',
      position: 'CF',
      seasonsPlayed: 14,
      teamIds: ['nym', 'sea'],
      peakOverall: 78,
      championshipRings: 2,
      allStarSelections: 0,
      batting: {
        hits: 2214,
        hr: 347,
        rbi: 1182,
      },
      pitching: null,
    },
    ...overrides,
  };
}

describe('hall of fame scoring', () => {
  it('scores elite multi-award careers above the first-ballot threshold', () => {
    const awardHistory: AwardHistoryEntry[] = [
      { season: 4, award: 'MVP', league: 'AL', playerId: 'p1', teamId: 'nym', summary: 'Won MVP.' },
      { season: 7, award: 'MVP', league: 'AL', playerId: 'p1', teamId: 'nym', summary: 'Won MVP again.' },
      { season: 2, award: 'ROY', league: 'AL', playerId: 'p1', teamId: 'nym', summary: 'Won ROY.' },
    ];

    const result = evaluateHOFCandidate(createCandidate(), awardHistory);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.inductionTier).toBe('first_ballot');
    expect(result.summary).toContain('Hall of Fame');
  });

  it('places borderline candidates on the ballot before induction', () => {
    const awardHistory: AwardHistoryEntry[] = [
      { season: 5, award: 'CY_YOUNG', league: 'NL', playerId: 'p1', teamId: 'lax', summary: 'Won the Cy Young.' },
    ];
    const candidate = createCandidate({
      position: 'SP',
      seasonsPlayed: 11,
      peakOverall: 72,
      championshipRings: 0,
      careerStats: {
        playerId: 'p1',
        playerName: 'Test Legend',
        position: 'SP',
        seasonsPlayed: 11,
        teamIds: ['lax'],
        peakOverall: 72,
        championshipRings: 0,
        allStarSelections: 0,
        batting: null,
        pitching: {
          wins: 154,
          strikeouts: 2018,
          inningsPitched: 2240,
          earnedRuns: 812,
        },
      },
    });

    const result = evaluateHOFCandidate(candidate, awardHistory);

    expect(result.score).toBeGreaterThanOrEqual(65);
    expect(result.score).toBeLessThan(80);
    expect(result.inductionTier).toBe('ballot');
  });

  it('processes first-ballot and delayed-ballot inductions deterministically', () => {
    const retiredPlayers = [
      createCandidate({
        playerId: 'first-ballot',
        playerName: 'First Ballot',
      }),
      createCandidate({
        playerId: 'borderline',
        playerName: 'Borderline Ace',
        seasonsPlayed: 11,
        peakOverall: 72,
        championshipRings: 0,
        careerStats: {
          playerId: 'borderline',
          playerName: 'Borderline Ace',
          position: 'SP',
          seasonsPlayed: 11,
          teamIds: ['lax'],
          peakOverall: 72,
          championshipRings: 0,
          allStarSelections: 0,
          batting: null,
          pitching: {
            wins: 154,
            strikeouts: 2018,
            inningsPitched: 2240,
            earnedRuns: 812,
          },
        },
      }),
    ];
    const awardHistory: AwardHistoryEntry[] = [
      { season: 4, award: 'MVP', league: 'AL', playerId: 'first-ballot', teamId: 'nym', summary: 'Won MVP.' },
      { season: 8, award: 'MVP', league: 'AL', playerId: 'first-ballot', teamId: 'nym', summary: 'Won MVP again.' },
      { season: 2, award: 'ROY', league: 'AL', playerId: 'first-ballot', teamId: 'nym', summary: 'Won ROY.' },
      { season: 5, award: 'CY_YOUNG', league: 'NL', playerId: 'borderline', teamId: 'lax', summary: 'Won Cy Young.' },
    ];

    const firstPass = processHOFInductions({
      retiredPlayers,
      awardHistory,
      existingHallOfFame: [],
      ballotEntries: [],
      currentSeason: 15,
      rng: new GameRNG(99),
    });

    expect(firstPass.inductees.map((entry) => entry.playerId)).toContain('first-ballot');
    expect(firstPass.inductees.map((entry) => entry.playerId)).not.toContain('borderline');
    expect(firstPass.ballotEntries).toHaveLength(1);

    const laterPass = processHOFInductions({
      retiredPlayers: [],
      awardHistory,
      existingHallOfFame: firstPass.hallOfFame,
      ballotEntries: firstPass.ballotEntries,
      currentSeason: 18,
      rng: new GameRNG(99),
    });

    expect(laterPass.inductees.map((entry) => entry.playerId)).toContain('borderline');
  });
});

describe('dynasty scoring', () => {
  it('totals dynasty points and returns the grade band', () => {
    const timeline: FranchiseTimelineEntry[] = [
      {
        season: 1,
        teamId: 'nym',
        record: '92-70',
        winTotal: 92,
        playoffResult: 'World Series champion',
        championship: true,
        worldSeriesAppearance: true,
        playoffAppearance: true,
        divisionTitle: true,
        awardWinnerCount: 2,
        keyAcquisitions: ['Signed ace starter'],
        keyDepartures: [],
        dynastyScore: 0,
      },
      {
        season: 2,
        teamId: 'nym',
        record: '95-67',
        winTotal: 95,
        playoffResult: 'World Series runner-up',
        championship: false,
        worldSeriesAppearance: true,
        playoffAppearance: true,
        divisionTitle: true,
        awardWinnerCount: 1,
        keyAcquisitions: [],
        keyDepartures: ['Lost closer in free agency'],
        dynastyScore: 0,
      },
      {
        season: 3,
        teamId: 'nym',
        record: '78-84',
        winTotal: 78,
        playoffResult: 'Missed playoffs',
        championship: false,
        worldSeriesAppearance: false,
        playoffAppearance: false,
        divisionTitle: false,
        awardWinnerCount: 0,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 0,
      },
    ];

    const result = calculateDynastyScore(timeline);

    expect(result.score).toBe(280);
    expect(result.grade).toBe('B');
  });
});
