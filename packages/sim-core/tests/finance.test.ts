import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  TEAMS,
  generatePlayer,
  generateTeamRoster,
  calculatePlayerValue,
  generateArbitrationCase,
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
  return generatePlayer(rng, position as any, 'NYY', 'MLB');
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
    const roster = generateTeamRoster(rng, 'NYY');
    const payroll = calculateTeamPayroll('NYY', roster);
    expect(payroll.teamId).toBe('NYY');
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
    const largeBudget = getTeamBudget('nyy');
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
    expect(getTeamBudget('TBR')).toBe(getTeamBudget('tb'));
    expect(getTeamBudget('KCR')).toBe(getTeamBudget('kc'));
    expect(getTeamBudget('SDP')).toBe(getTeamBudget('sd'));
    expect(getTeamBudget('SFG')).toBe(getTeamBudget('sf'));
    expect(getTeamBudget('ANA')).toBe(getTeamBudget('laa'));
  });
});

describe('advanceContracts', () => {
  it('decrements yearsRemaining', () => {
    const contracts: ContractDetail[] = [
      {
        playerId: 'p1', teamId: 'NYY', years: 3, yearsRemaining: 3,
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
        playerId: 'p1', teamId: 'NYY', years: 1, yearsRemaining: 1,
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
    const roster = generateTeamRoster(rng, 'NYY');
    const mlbPlayers = roster.filter((p) => p.rosterStatus === 'MLB');
    const serviceTime = new Map<string, number>();
    mlbPlayers.forEach((p, i) => {
      // Give alternating service times: some arb-eligible, some not
      serviceTime.set(p.id, i % 2 === 0 ? 4 : 1);
    });
    const eligible = getArbEligiblePlayers(roster, 'NYY', serviceTime);
    // All eligible should have service time between 3 and 6
    for (const p of eligible) {
      const years = serviceTime.get(p.id) ?? 0;
      expect(years).toBeGreaterThanOrEqual(3);
      expect(years).toBeLessThanOrEqual(6);
    }
    expect(eligible.length).toBeGreaterThan(0);
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
