import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  TEAMS,
  generatePlayer,
  generateTeamRoster,
  calculatePlayerValue,
  qualifiesForSuperTwo,
  generateArbitrationCase,
  evaluateHoldout,
  resolveArbitration,
  calculateTeamPayroll,
  calculateLuxuryTax,
  getTeamBudget,
  advanceContracts,
  getArbEligiblePlayers,
  serviceDaysToYears,
  LUXURY_TAX_THRESHOLD,
} from '../src/index.js';
import type { ContractDetail, GeneratedPlayer } from '../src/index.js';

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
  it('filters correctly by service time', () => {
    const rng = new GameRNG(42);
    const roster = generateTeamRoster(rng, 'NYT');
    const mlbPlayers = roster.filter((p) => p.rosterStatus === 'MLB');
    const serviceTime = new Map<string, number>();
    mlbPlayers.forEach((p, i) => {
      // Give alternating service times: some arb-eligible, some not
      serviceTime.set(p.id, i % 2 === 0 ? 4 : 1);
    });
    const eligible = getArbEligiblePlayers(roster, 'NYT', serviceTime);
    // All eligible should have service time between 3 and 6
    for (const p of eligible) {
      const years = serviceTime.get(p.id) ?? 0;
      expect(years).toBeGreaterThanOrEqual(3);
      expect(years).toBeLessThanOrEqual(6);
    }
    expect(eligible.length).toBeGreaterThan(0);
  });

  it('includes qualified super-two players with exactly two service years', () => {
    const superTwo = {
      ...makePlayer(100),
      id: '00000000-0000-4000-8000-000000000010',
      teamId: 'NYT',
      superTwoQualified: true,
    };
    const standardArb = {
      ...makePlayer(101),
      teamId: 'NYT',
      superTwoQualified: false,
    };
    const preArb = {
      ...makePlayer(102),
      teamId: 'NYT',
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
