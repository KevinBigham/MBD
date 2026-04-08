import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import {
  findComparableContracts,
  generateMarketReport,
  generateMarketSummary,
  predictSigning,
  type ComparableContract,
  type MarketReportContext,
} from '../src/finance/marketIntelligence.js';

const HISTORICAL_SIGNINGS: ComparableContract[] = [
  { playerName: 'Ace One', position: 'SP', ageAtSigning: 26, annualValue: 28, years: 6, season: 5 },
  { playerName: 'Ace Two', position: 'SP', ageAtSigning: 27, annualValue: 30, years: 7, season: 6 },
  { playerName: 'Ace Three', position: 'SP', ageAtSigning: 29, annualValue: 24, years: 5, season: 7 },
  { playerName: 'Bat One', position: 'RF', ageAtSigning: 27, annualValue: 26, years: 6, season: 5 },
  { playerName: 'Bat Two', position: 'RF', ageAtSigning: 31, annualValue: 14, years: 3, season: 7 },
  { playerName: 'Shortstop One', position: 'SS', ageAtSigning: 25, annualValue: 22, years: 6, season: 4 },
  { playerName: 'Closer One', position: 'CL', ageAtSigning: 30, annualValue: 15, years: 4, season: 5 },
];

function createContext(overrides: Partial<MarketReportContext> = {}): MarketReportContext {
  return {
    playerId: 'fa-1',
    playerName: 'Jordan Vale',
    position: 'SP',
    age: 27,
    overallRating: 390,
    warProjection: 5.8,
    historicalSignings: HISTORICAL_SIGNINGS,
    leagueAverageSalaryByPosition: {
      SP: 18,
      RF: 14,
      SS: 16,
      CL: 10,
    },
    teams: [
      { teamId: 'nym', budgetRemaining: 40, needsPosition: true },
      { teamId: 'bos', budgetRemaining: 28, needsPosition: false },
      { teamId: 'pit', budgetRemaining: 12, needsPosition: true },
    ],
    ...overrides,
  };
}

describe('generateMarketReport', () => {
  it('gives young elite players a hot market', () => {
    const report = generateMarketReport(
      new GameRNG(301),
      createContext({ age: 26, overallRating: 405, warProjection: 6.4, teams: [
        { teamId: 'nym', budgetRemaining: 50, needsPosition: true },
        { teamId: 'bos', budgetRemaining: 44, needsPosition: true },
        { teamId: 'lax', budgetRemaining: 41, needsPosition: true },
      ] }),
    );

    expect(['hot', 'bidding_war']).toContain(report.demandLevel);
  });

  it('gives older lower-rated players a cold market', () => {
    const report = generateMarketReport(
      new GameRNG(302),
      createContext({
        position: 'RF',
        age: 36,
        overallRating: 255,
        warProjection: 0.9,
        teams: [{ teamId: 'pit', budgetRemaining: 9, needsPosition: false }],
      }),
    );

    expect(report.demandLevel).toBe('cold');
  });

  it('is deterministic for the same seed and context', () => {
    const context = createContext();
    const first = generateMarketReport(new GameRNG(303), context);
    const second = generateMarketReport(new GameRNG(303), context);

    expect(second).toEqual(first);
  });

  it('returns a null likely team when nobody qualifies financially', () => {
    const report = generateMarketReport(
      new GameRNG(304),
      createContext({
        teams: [
          { teamId: 'pit', budgetRemaining: 3, needsPosition: false },
          { teamId: 'cha', budgetRemaining: 4, needsPosition: false },
        ],
      }),
    );

    expect(report.signingPrediction.likelyTeamId).toBeNull();
  });
});

describe('findComparableContracts', () => {
  it('prefers position matches and nearby ages', () => {
    const comparables = findComparableContracts('SP', 27, 390, HISTORICAL_SIGNINGS);

    expect(comparables.length).toBeGreaterThanOrEqual(3);
    expect(comparables[0]?.position).toBe('SP');
    expect(comparables[1]?.position).toBe('SP');
    expect(comparables.every((contract, index, all) => index === 0 || contract.ageAtSigning >= 24 && contract.ageAtSigning <= 31 || all.length < 3)).toBe(true);
  });

  it('clamps the comparable list to the available 3-5 best matches', () => {
    const comparables = findComparableContracts('SP', 27, 390, [
      ...HISTORICAL_SIGNINGS,
      { playerName: 'Ace Four', position: 'SP', ageAtSigning: 28, annualValue: 29, years: 6, season: 8 },
      { playerName: 'Ace Five', position: 'SP', ageAtSigning: 25, annualValue: 27, years: 5, season: 9 },
      { playerName: 'Ace Six', position: 'SP', ageAtSigning: 30, annualValue: 23, years: 4, season: 10 },
    ]);

    expect(comparables.length).toBeGreaterThanOrEqual(3);
    expect(comparables.length).toBeLessThanOrEqual(5);
  });
});

describe('predictSigning', () => {
  it('leans toward teams with need and budget', () => {
    const report = generateMarketReport(
      new GameRNG(305),
      createContext({
        teams: [
          { teamId: 'nym', budgetRemaining: 45, needsPosition: true },
          { teamId: 'bos', budgetRemaining: 35, needsPosition: false },
          { teamId: 'pit', budgetRemaining: 11, needsPosition: true },
        ],
      }),
    );
    const prediction = predictSigning(new GameRNG(306), report);

    expect(prediction.likelyTeamId).toBe('nym');
  });

  it('maps confidence to demand level', () => {
    const hotReport = generateMarketReport(
      new GameRNG(307),
      createContext({
        teams: [
          { teamId: 'nym', budgetRemaining: 50, needsPosition: true },
          { teamId: 'bos', budgetRemaining: 44, needsPosition: true },
          { teamId: 'lax', budgetRemaining: 41, needsPosition: true },
        ],
      }),
    );
    const coldReport = generateMarketReport(
      new GameRNG(308),
      createContext({
        position: 'RF',
        age: 36,
        overallRating: 250,
        warProjection: 0.6,
        teams: [{ teamId: 'pit', budgetRemaining: 7, needsPosition: false }],
      }),
    );

    expect(['medium', 'high']).toContain(hotReport.signingPrediction.confidence);
    expect(coldReport.signingPrediction.confidence).toBe('low');
  });
});

describe('generateMarketSummary', () => {
  it('identifies the hottest position from report demand', () => {
    const reports = [
      generateMarketReport(new GameRNG(309), createContext({ position: 'SP', overallRating: 395, warProjection: 6.1 })),
      generateMarketReport(new GameRNG(310), createContext({ playerId: 'fa-2', playerName: 'Ace Two', position: 'SP', overallRating: 380, warProjection: 5.4 })),
      generateMarketReport(new GameRNG(311), createContext({ playerId: 'fa-3', playerName: 'Bat Three', position: 'RF', overallRating: 310, warProjection: 2.8 })),
    ];
    const summary = generateMarketSummary(reports);

    expect(summary.hottestPosition).toBe('SP');
  });

  it('sorts top free agents by projected AAV', () => {
    const reports = [
      generateMarketReport(new GameRNG(312), createContext({ playerId: 'fa-2', playerName: 'Ace Two', overallRating: 370, warProjection: 5.1 })),
      generateMarketReport(new GameRNG(313), createContext({ playerId: 'fa-3', playerName: 'Ace Three', overallRating: 410, warProjection: 6.7 })),
      generateMarketReport(new GameRNG(314), createContext({ playerId: 'fa-4', playerName: 'Bat Three', position: 'RF', overallRating: 320, warProjection: 3.2 })),
    ];
    const summary = generateMarketSummary(reports);

    expect(summary.topFreeAgents[0]!.projectedAAV).toBeGreaterThanOrEqual(summary.topFreeAgents[1]!.projectedAAV);
    expect(summary.topFreeAgents[1]!.projectedAAV).toBeGreaterThanOrEqual(summary.topFreeAgents[2]!.projectedAAV);
  });
});
