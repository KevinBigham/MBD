import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  TEAMS,
  generatePlayer,
  generateLeaguePlayers,
  generateTeamRoster,
  calculatePlayerValue,
  qualifiesForSuperTwo,
  generateArbitrationCase,
  evaluateHoldout,
  resolveArbitration,
  calculateTeamPayroll,
  derivePlayerTradeSalaryResponsibility,
  calculateLuxuryTax,
  getTeamBudget,
  advanceContracts,
  getArbEligiblePlayers,
  serviceDaysToYears,
  LUXURY_TAX_THRESHOLD,
  activeRetainedContractCountForTeam,
  hasActiveTradeFinancialObligationForPlayer,
} from '../src/index.js';
import type { ContractDetail, GeneratedPlayer } from '../src/index.js';
import type { TradeHistoryEntry } from '@mbd/contracts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(seed: number, position: string = 'SS'): GeneratedPlayer {
  const rng = new GameRNG(seed);
  return generatePlayer(rng, position as any, 'NYT', 'MLB');
}

function withServiceDays(player: GeneratedPlayer, serviceTimeDays: number): GeneratedPlayer {
  return {
    ...player,
    serviceTimeDays,
  };
}

class FixedRng extends GameRNG {
  private floatIndex = 0;
  private intIndex = 0;

  constructor(
    private readonly floats: number[] = [0.5],
    private readonly ints: number[] = [7, 8],
  ) {
    super(1);
  }

  override nextFloat(): number {
    const value = this.floats[Math.min(this.floatIndex, this.floats.length - 1)] ?? 0.5;
    this.floatIndex += 1;
    return value;
  }

  override nextInt(min: number, max: number): number {
    const candidate = this.ints[Math.min(this.intIndex, this.ints.length - 1)] ?? min;
    this.intIndex += 1;
    return Math.max(min, Math.min(max, candidate));
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculatePlayerValue', () => {
  it('returns a positive number for any player', () => {
    const player = makePlayer(42);
    const value = calculatePlayerValue(player, 5);
    expect(value).toBeGreaterThan(0);
  });

  it('returns higher value for better-rated players', () => {
    const player1 = makePlayer(42);
    const player2 = makePlayer(43);
    const low = { ...player1, overallRating: 150 };
    const high = { ...player2, overallRating: 400 };
    const lowValue = calculatePlayerValue(low, 7);
    const highValue = calculatePlayerValue(high, 7);
    expect(highValue).toBeGreaterThan(lowValue);
  });

  it('returns league minimum for pre-arb players', () => {
    const player = makePlayer(42);
    const value = calculatePlayerValue(player, 1);
    expect(value).toBe(0.7);
  });
});

describe('generateArbitrationCase', () => {
  it('creates valid case with projected salary', () => {
    const rng = new GameRNG(42);
    const player = makePlayer(99);
    const arbCase = generateArbitrationCase(rng, player, 4, 2.0);
    expect(arbCase.playerId).toBe(player.id);
    expect(arbCase.projectedSalary).toBeGreaterThan(0);
    expect(arbCase.teamOffer).toBeLessThanOrEqual(arbCase.projectedSalary);
    expect(arbCase.playerAsk).toBeGreaterThanOrEqual(arbCase.projectedSalary);
    expect(arbCase.yearsOfService).toBe(4);
  });

  it('applies year-over-year escalators from prior player arbitration wins', () => {
    const baselinePlayer = {
      ...makePlayer(99),
      arbitrationHistory: [],
    };
    const oneWinPlayer = {
      ...baselinePlayer,
      arbitrationHistory: [
        {
          season: 2,
          teamId: 'NYT',
          yearsOfService: 3,
          teamOffer: 3.1,
          playerAsk: 4.2,
          projectedSalary: 3.6,
          awardedSalary: 4.2,
          teamWon: false,
        },
      ],
    };
    const cappedPlayer = {
      ...baselinePlayer,
      arbitrationHistory: Array.from({ length: 5 }, (_, index) => ({
        season: index + 1,
        teamId: 'NYT',
        yearsOfService: 3 + index,
        teamOffer: 3.1,
        playerAsk: 4.2,
        projectedSalary: 3.6,
        awardedSalary: 4.2,
        teamWon: false,
      })),
    };

    const baselineCase = generateArbitrationCase(new FixedRng([0.5, 0.5]), baselinePlayer, 4, 2.0);
    const oneWinCase = generateArbitrationCase(new FixedRng([0.5, 0.5]), oneWinPlayer, 4, 2.0);
    const cappedCase = generateArbitrationCase(new FixedRng([0.5, 0.5]), cappedPlayer, 4, 2.0);

    expect(oneWinCase.projectedSalary / baselineCase.projectedSalary).toBeCloseTo(1.08, 1);
    expect(cappedCase.projectedSalary / baselineCase.projectedSalary).toBeCloseTo(1.32, 1);
  });
});

describe('resolveArbitration', () => {
  it('returns a number (the resolved salary)', () => {
    const rng1 = new GameRNG(42);
    const player = makePlayer(99);
    const arbCase = generateArbitrationCase(rng1, player, 4, 2.0);
    const rng2 = new GameRNG(100);
    const resolved = resolveArbitration(rng2, arbCase);
    expect(typeof resolved).toBe('number');
    expect(resolved).toBeGreaterThan(0);
    // Must be either teamOffer or playerAsk
    expect([arbCase.teamOffer, arbCase.playerAsk]).toContain(resolved);
  });
});

describe('calculateTeamPayroll', () => {
  it('sums salaries correctly for a team', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'NYT');
    const payroll = calculateTeamPayroll('NYT', roster);
    expect(payroll.teamId).toBe('NYT');
    expect(payroll.totalPayroll).toBeGreaterThan(0);
    expect(payroll.mlbPayroll).toBeGreaterThanOrEqual(0);
    expect(payroll.minorsPayroll).toBeGreaterThanOrEqual(0);
    // Total should be mlb + minors + dead money
    expect(payroll.totalPayroll).toBeCloseTo(
      payroll.mlbPayroll + payroll.minorsPayroll + payroll.deadMoney,
      1,
    );
  });

  it('generates a mixed MLB service-time structure on opening day', () => {
    const players = generateLeaguePlayers(new GameRNG(44_001), TEAMS.map((team) => team.id));
    const serviceYears = players
      .filter((player) => player.rosterStatus === 'MLB')
      .map((player) => serviceDaysToYears(player.serviceTimeDays));

    const preArbShare = serviceYears.filter((years) => years <= 2).length / serviceYears.length;
    const arbShare = serviceYears.filter((years) => years >= 3 && years <= 6).length / serviceYears.length;
    const veteranShare = serviceYears.filter((years) => years >= 7).length / serviceYears.length;

    expect(preArbShare).toBeGreaterThanOrEqual(0.15);
    expect(arbShare).toBeGreaterThanOrEqual(0.2);
    expect(veteranShare).toBeGreaterThanOrEqual(0.2);
  });

  function financialTradeHistory(): TradeHistoryEntry[] {
    return [{
      id: 'trade-retained-1',
      fromTeamId: 'NYT',
      toTeamId: 'BOS',
      offeringAssets: [{
        type: 'player',
        playerId: 'retained-player',
        contractReference: { annualSalary: 20, contractEndSeasonExclusive: 13 },
        retainedSalary: { annualAmount: 5, startSeason: 10, endSeasonExclusive: 13 },
        cashConsideration: { amount: 2, season: 10 },
      }],
      requestingAssets: [],
      fairnessScore: 0,
      summary: 'Financial trade',
      timestamp: 'S10D80',
    }];
  }

  function retainedPlayer(teamId: string): GeneratedPlayer {
    const player = makePlayer(8_101);
    return {
      ...player,
      id: 'retained-player',
      teamId,
      rosterStatus: 'MLB',
      contract: {
        ...player.contract,
        years: 3,
        annualSalary: 20,
        totalValue: 60,
        playerOption: false,
        teamOption: false,
      },
    };
  }

  it('conserves gross salary across retained salary and one-season cash consideration', () => {
    const player = retainedPlayer('BOS');
    const history = financialTradeHistory();
    const context = { season: 10, tradeHistory: history, allPlayers: [player] };
    const payer = calculateTeamPayroll('NYT', [player], context);
    const controller = calculateTeamPayroll('BOS', [player], context);

    expect(payer).toMatchObject({
      totalPayroll: 7,
      deadMoney: 7,
      retainedSalaryCharges: 5,
      cashConsiderationCharges: 2,
      acquiredSalaryCredits: 0,
    });
    expect(controller).toMatchObject({
      totalPayroll: 13,
      mlbPayroll: 13,
      deadMoney: 0,
      acquiredSalaryCredits: 7,
    });
    expect(payer.totalPayroll + controller.totalPayroll).toBe(20);
    expect(payer.futureCommitments[0]! + controller.futureCommitments[0]!).toBe(20);
    expect(payer.futureCommitments[0]).toBe(5);
    expect(controller.futureCommitments[0]).toBe(15);
  });

  it('keeps the original payer charge while the exact credit follows a retrade and nets on return', () => {
    const reference = { annualSalary: 20, contractEndSeasonExclusive: 13 };
    const history: TradeHistoryEntry[] = [
      {
        id: 'trade-return',
        fromTeamId: 'LAD',
        toTeamId: 'NYT',
        offeringAssets: [{ type: 'player', playerId: 'retained-player', contractReference: reference }],
        requestingAssets: [],
        fairnessScore: 0,
        summary: 'Return trade',
        timestamp: 'S10D82',
      },
      {
        id: 'trade-retrade',
        fromTeamId: 'BOS',
        toTeamId: 'LAD',
        offeringAssets: [{ type: 'player', playerId: 'retained-player', contractReference: reference }],
        requestingAssets: [],
        fairnessScore: 0,
        summary: 'Retrade',
        timestamp: 'S10D81',
      },
      ...financialTradeHistory(),
    ];
    const returned = retainedPlayer('NYT');
    const returnContext = { season: 10, tradeHistory: history, allPlayers: [returned] };
    expect(calculateTeamPayroll('NYT', [returned], returnContext)).toMatchObject({
      totalPayroll: 20,
      acquiredSalaryCredits: 0,
    });
    expect(calculateTeamPayroll('LAD', [returned], returnContext).totalPayroll).toBe(0);

    const retraded = retainedPlayer('LAD');
    const retradeContext = { season: 10, tradeHistory: history.slice(1), allPlayers: [retraded] };
    expect(calculateTeamPayroll('NYT', [retraded], retradeContext).totalPayroll).toBe(7);
    expect(calculateTeamPayroll('LAD', [retraded], retradeContext).totalPayroll).toBe(13);
    expect(calculateTeamPayroll('BOS', [retraded], retradeContext).totalPayroll).toBe(0);
  });

  it('reports only external acquired support while retaining internal credits for conservation', () => {
    const reference = { annualSalary: 20, contractEndSeasonExclusive: 13 };
    const secondRetention: TradeHistoryEntry = {
      id: 'trade-retained-external',
      fromTeamId: 'BOS',
      toTeamId: 'NYT',
      offeringAssets: [{
        type: 'player',
        playerId: 'retained-player',
        contractReference: reference,
        retainedSalary: { annualAmount: 3, startSeason: 10, endSeasonExclusive: 13 },
      }],
      requestingAssets: [],
      fairnessScore: 0,
      summary: 'External retainer after return',
      timestamp: 'S10D83',
    };
    const returned = retainedPlayer('NYT');
    const payroll = calculateTeamPayroll('NYT', [returned], {
      season: 10,
      tradeHistory: [secondRetention, ...financialTradeHistory()],
      allPlayers: [returned],
    });

    expect(payroll).toMatchObject({
      totalPayroll: 17,
      retainedSalaryCharges: 5,
      cashConsiderationCharges: 2,
      acquiredSalaryCredits: 3,
    });
  });

  it('projects direct, retrade, return-to-payer, and multiple-retainer responsibility by team', () => {
    const reference = { annualSalary: 20, contractEndSeasonExclusive: 13 };
    const secondRetention: TradeHistoryEntry = {
      id: 'trade-retained-2',
      fromTeamId: 'BOS',
      toTeamId: 'LAD',
      offeringAssets: [{
        type: 'player',
        playerId: 'retained-player',
        contractReference: reference,
        retainedSalary: { annualAmount: 3, startSeason: 10, endSeasonExclusive: 13 },
      }],
      requestingAssets: [],
      fairnessScore: 0,
      summary: 'Second retention',
      timestamp: 'S10D81',
    };
    const player = retainedPlayer('LAD');
    const firstHistory = financialTradeHistory();

    expect(derivePlayerTradeSalaryResponsibility(
      [player], firstHistory, player.id, 'BOS', 10,
    )).toMatchObject({
      externalSupport: 7,
      teamResponsibility: 13,
    });
    expect(derivePlayerTradeSalaryResponsibility(
      [player], firstHistory, player.id, 'NYT', 10,
    )).toMatchObject({
      externalSupport: 0,
      teamResponsibility: 20,
    });
    expect(derivePlayerTradeSalaryResponsibility(
      [player], [secondRetention, ...firstHistory], player.id, 'LAD', 10,
    )).toMatchObject({
      externalSupport: 10,
      teamResponsibility: 10,
    });
    expect(derivePlayerTradeSalaryResponsibility(
      [player], [secondRetention, ...firstHistory], player.id, 'NYT', 10,
    )).toMatchObject({
      externalSupport: 3,
      teamResponsibility: 17,
    });
  });

  it('keeps released controller liability as dead payroll and does not attach to a replacement contract', () => {
    const released = retainedPlayer('');
    const history = financialTradeHistory();
    const context = { season: 10, tradeHistory: history, allPlayers: [released] };
    expect(calculateTeamPayroll('NYT', [released], context).totalPayroll).toBe(7);
    expect(calculateTeamPayroll('BOS', [released], context)).toMatchObject({
      totalPayroll: 13,
      releasedContractCharges: 13,
    });

    const replacement = {
      ...retainedPlayer('BOS'),
      contract: {
        ...retainedPlayer('BOS').contract,
        years: 4,
        annualSalary: 25,
        totalValue: 100,
      },
    };
    const replacementContext = { season: 10, tradeHistory: history, allPlayers: [replacement] };
    expect(calculateTeamPayroll('NYT', [replacement], replacementContext).totalPayroll).toBe(0);
    expect(calculateTeamPayroll('BOS', [replacement], replacementContext).totalPayroll).toBe(25);
    expect(activeRetainedContractCountForTeam(history, 'NYT', 10, [released], 10)).toBe(1);
    expect(hasActiveTradeFinancialObligationForPlayer([released], history, released.id, 10)).toBe(true);
    expect(activeRetainedContractCountForTeam(history, 'NYT', 10, [replacement], 10)).toBe(0);
    expect(hasActiveTradeFinancialObligationForPlayer([replacement], history, replacement.id, 10)).toBe(false);
  });
});

describe('calculateLuxuryTax', () => {
  it('returns 0 below threshold', () => {
    expect(calculateLuxuryTax(200)).toBe(0);
    expect(calculateLuxuryTax(LUXURY_TAX_THRESHOLD)).toBe(0);
  });

  it('returns positive above threshold', () => {
    const tax = calculateLuxuryTax(LUXURY_TAX_THRESHOLD + 10);
    expect(tax).toBeGreaterThan(0);
  });

  it('increases with larger overage', () => {
    const tax1 = calculateLuxuryTax(LUXURY_TAX_THRESHOLD + 10);
    const tax2 = calculateLuxuryTax(LUXURY_TAX_THRESHOLD + 50);
    expect(tax2).toBeGreaterThan(tax1);
  });
});

describe('getTeamBudget', () => {
  it('returns different amounts for large vs small market', () => {
    const largeBudget = getTeamBudget('nym');
    const smallBudget = getTeamBudget('pit');
    expect(largeBudget).toBeGreaterThan(smallBudget);
  });

  it('returns a reasonable value for unknown team', () => {
    const budget = getTeamBudget('UNKNOWN');
    expect(budget).toBeGreaterThan(0);
  });

  it('maps every canonical generated team id to a valid budget', () => {
    for (const team of TEAMS) {
      expect(getTeamBudget(team.id)).toBeGreaterThan(0);
    }
  });

  it('normalizes legacy alias keys to the canonical team budget', () => {
    expect(getTeamBudget('ORL')).toBe(getTeamBudget('orl'));
    expect(getTeamBudget('KCF')).toBe(getTeamBudget('kc'));
    expect(getTeamBudget('NYT')).toBe(getTeamBudget('nym'));
  });
});

describe('advanceContracts', () => {
  it('decrements yearsRemaining', () => {
    const contracts: ContractDetail[] = [
      {
        playerId: 'p1', teamId: 'NYT', years: 3, yearsRemaining: 3,
        annualSalary: 10, totalValue: 30, noTradeClause: false,
        playerOption: false, teamOption: false, signingBonus: 0,
        yearSalaries: [10, 10, 10], status: 'active',
      },
    ];
    const advanced = advanceContracts(contracts);
    expect(advanced[0]!.yearsRemaining).toBe(2);
    expect(advanced[0]!.status).toBe('active');
  });

  it('marks contract as expired when yearsRemaining reaches 0', () => {
    const contracts: ContractDetail[] = [
      {
        playerId: 'p1', teamId: 'NYT', years: 1, yearsRemaining: 1,
        annualSalary: 5, totalValue: 5, noTradeClause: false,
        playerOption: false, teamOption: false, signingBonus: 0,
        yearSalaries: [5], status: 'active',
      },
    ];
    const advanced = advanceContracts(contracts);
    expect(advanced[0]!.yearsRemaining).toBe(0);
    expect(advanced[0]!.status).toBe('expired');
  });
});

describe('getArbEligiblePlayers', () => {
  it('filters by exact service days instead of the legacy years mirror', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'NYT');
    const mlbPlayers = roster.filter((p) => p.rosterStatus === 'MLB');
    const serviceTime = new Map<string, number>();
    mlbPlayers.forEach((p, i) => {
      // Give alternating service times: some arb-eligible, some not
      p.serviceTimeDays = (i % 2 === 0 ? 4 : 1) * 172;
      serviceTime.set(p.id, i % 2 === 0 ? 1 : 4);
    });
    const eligible = getArbEligiblePlayers(roster, 'NYT', serviceTime);
    // All eligible should have exact service between ordinary arb years 3–5,
    // even though the compatibility map claims the opposite cohort.
    for (const p of eligible) {
      const years = serviceDaysToYears(p.serviceTimeDays);
      expect(years).toBeGreaterThanOrEqual(3);
      expect(years).toBeLessThanOrEqual(5);
    }
    expect(eligible.length).toBeGreaterThan(0);
  });

  it('includes qualified super-two players with exactly two service years', () => {
    const superTwo = {
      ...makePlayer(100),
      id: '00000000-0000-4000-8000-000000000010',
      teamId: 'NYT',
      serviceTimeDays: 2 * 172,
      superTwoQualified: true,
    };
    const standardArb = {
      ...makePlayer(101),
      teamId: 'NYT',
      serviceTimeDays: 4 * 172,
      superTwoQualified: false,
    };
    const preArb = {
      ...makePlayer(102),
      teamId: 'NYT',
      serviceTimeDays: 172,
      superTwoQualified: false,
    };
    const roster = [superTwo, standardArb, preArb];
    const serviceTime = new Map<string, number>([
      [superTwo.id, 2],
      [standardArb.id, 4],
      [preArb.id, 1],
    ]);

    const eligible = getArbEligiblePlayers(roster, 'NYT', serviceTime);

    expect(eligible.map((player) => player.id)).toEqual([superTwo.id, standardArb.id]);
  });
});

describe('qualifiesForSuperTwo', () => {
  it('selects the top 22 percent of the two-year cohort by service time', () => {
    const cohort = Array.from({ length: 10 }, (_, index) =>
      withServiceDays({
        ...makePlayer(200 + index),
        id: `00000000-0000-4000-8000-0000000000${String(index + 10).padStart(2, '0')}`,
      }, 344 + (9 - index)),
    );

    const qualifiers = cohort.filter((player) => qualifiesForSuperTwo(player, cohort));

    expect(qualifiers.map((player) => player.serviceTimeDays)).toEqual([353, 352, 351]);
  });

  it('breaks service-time ties by ascending player id', () => {
    const higherId = withServiceDays({
      ...makePlayer(300),
      id: '00000000-0000-4000-8000-000000000200',
    }, 350);
    const lowerId = withServiceDays({
      ...makePlayer(301),
      id: '00000000-0000-4000-8000-000000000100',
    }, 350);
    const cohort = [
      withServiceDays({ ...makePlayer(302), id: '00000000-0000-4000-8000-000000000050' }, 355),
      lowerId,
      higherId,
      withServiceDays({ ...makePlayer(303), id: '00000000-0000-4000-8000-000000000300' }, 344),
      withServiceDays({ ...makePlayer(304), id: '00000000-0000-4000-8000-000000000400' }, 344),
      withServiceDays({ ...makePlayer(305), id: '00000000-0000-4000-8000-000000000500' }, 344),
      withServiceDays({ ...makePlayer(306), id: '00000000-0000-4000-8000-000000000600' }, 344),
      withServiceDays({ ...makePlayer(307), id: '00000000-0000-4000-8000-000000000700' }, 344),
      withServiceDays({ ...makePlayer(308), id: '00000000-0000-4000-8000-000000000800' }, 344),
    ];

    expect(qualifiesForSuperTwo(lowerId, cohort)).toBe(true);
    expect(qualifiesForSuperTwo(higherId, cohort)).toBe(false);
  });
});

describe('evaluateHoldout', () => {
  it('returns holdout days and morale hit when the dispute crosses the trigger thresholds', () => {
    const result = evaluateHoldout({
      playerId: 'p1',
      currentSalary: 3.2,
      teamOffer: 4.0,
      playerAsk: 5.2,
      projectedSalary: 4.6,
      yearsOfService: 4,
    }, 30, new FixedRng([0.05], [14, 12]));

    expect(result).toEqual({
      holdoutDays: 14,
      moraleHit: 12,
    });
  });

  it('does not trigger when morale is too high or the gap is at the boundary', () => {
    expect(evaluateHoldout({
      playerId: 'p1',
      currentSalary: 3.2,
      teamOffer: 4.0,
      playerAsk: 4.72,
      projectedSalary: 4.3,
      yearsOfService: 4,
    }, 30, new FixedRng([0.01], [10, 8]))).toBeNull();

    expect(evaluateHoldout({
      playerId: 'p1',
      currentSalary: 3.2,
      teamOffer: 4.0,
      playerAsk: 5.2,
      projectedSalary: 4.6,
      yearsOfService: 4,
    }, 45, new FixedRng([0.01], [10, 8]))).toBeNull();
  });
});

describe('serviceDaysToYears', () => {
  it('converts MLB roster days into whole service years', () => {
    expect(serviceDaysToYears(0)).toBe(0);
    expect(serviceDaysToYears(171)).toBe(0);
    expect(serviceDaysToYears(172)).toBe(1);
    expect(serviceDaysToYears(343)).toBe(1);
    expect(serviceDaysToYears(344)).toBe(2);
  });
});
