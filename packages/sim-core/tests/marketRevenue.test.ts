import { describe, expect, it } from 'vitest';
import {
  MARKET_REVENUE_ALLOCATION_FACTORS,
  MARKET_REVENUE_ATTENDANCE_LIMIT,
  MARKET_REVENUE_PLAYOFF_RATE,
  TEAM_MARKETS,
  TEAMS,
  deriveMarketRevenueStatement,
  getTeamMarketConfig,
} from '../src/index.js';

describe('market revenue statement', () => {
  it('keeps the explicit 8/14/10 market map and rejects unknown teams', () => {
    const counts = { large: 0, medium: 0, small: 0 };
    for (const team of TEAMS) {
      const market = getTeamMarketConfig(team.id);
      expect(market, team.id).not.toBeNull();
      counts[market!.size] += 1;
    }

    expect(counts).toEqual({ large: 8, medium: 14, small: 10 });
    expect(Object.keys(TEAM_MARKETS)).toHaveLength(32);
    expect(getTeamMarketConfig('NYT')?.size).toBe('large');
    expect(getTeamMarketConfig('KCF')?.size).toBe('medium');
    expect(getTeamMarketConfig('unknown')).toBeNull();
    expect(() => deriveMarketRevenueStatement({
      teamId: 'unknown',
      wins: 81,
      losses: 81,
      madePlayoffs: false,
      ownerArchetype: 'patient_builder',
    })).toThrow('no explicit market');
  });

  it('produces the exact neutral, record, playoff, and allocation components', () => {
    expect(MARKET_REVENUE_ATTENDANCE_LIMIT).toBe(0.08);
    expect(MARKET_REVENUE_PLAYOFF_RATE).toBe(0.035);
    expect(MARKET_REVENUE_ALLOCATION_FACTORS).toEqual({
      win_now: 1.12,
      patient_builder: 1,
      penny_pincher: 0.9,
    });

    const neutral = deriveMarketRevenueStatement({
      teamId: 'phi',
      wins: 81,
      losses: 81,
      madePlayoffs: false,
      ownerArchetype: 'patient_builder',
    });
    expect(neutral).toMatchObject({
      marketSize: 'large',
      marketBaseline: 315,
      attendanceRate: 0,
      attendanceRevenue: 0,
      playoffRate: 0,
      playoffRevenue: 0,
      grossRevenue: 315,
      allocationFactor: 1,
      annualBudget: 315,
      payrollCap: 289.8,
      expectationsPayrollTarget: 289.8,
      draftBonusPool: 9.45,
      ifaBonusPool: 7.09,
      staffBudget: 16.54,
    });

    const playoff = deriveMarketRevenueStatement({
      teamId: 'phi',
      wins: 100,
      losses: 62,
      madePlayoffs: true,
      ownerArchetype: 'win_now',
    });
    expect(playoff.attendanceRevenue).toBe(5.91);
    expect(playoff.playoffRevenue).toBe(11.03);
    expect(playoff.grossRevenue).toBe(331.94);
    expect(playoff.annualBudget).toBe(371.77);
    expect(playoff.payrollCap).toBe(342.03);
  });

  it('orders controlled performance, playoff, and market twins', () => {
    const common = {
      teamId: 'msp',
      ownerArchetype: 'patient_builder' as const,
    };
    const winner = deriveMarketRevenueStatement({
      ...common,
      wins: 100,
      losses: 62,
      madePlayoffs: true,
    });
    const neutral = deriveMarketRevenueStatement({
      ...common,
      wins: 81,
      losses: 81,
      madePlayoffs: false,
    });
    const loser = deriveMarketRevenueStatement({
      ...common,
      wins: 62,
      losses: 100,
      madePlayoffs: false,
    });
    expect(winner.grossRevenue).toBeGreaterThan(neutral.grossRevenue);
    expect(neutral.grossRevenue).toBeGreaterThan(loser.grossRevenue);

    const large = deriveMarketRevenueStatement({ ...common, teamId: 'phi', wins: 81, losses: 81, madePlayoffs: false });
    const medium = deriveMarketRevenueStatement({ ...common, teamId: 'msp', wins: 81, losses: 81, madePlayoffs: false });
    const small = deriveMarketRevenueStatement({ ...common, teamId: 'pit', wins: 81, losses: 81, madePlayoffs: false });
    expect(large.grossRevenue).toBeGreaterThan(medium.grossRevenue);
    expect(medium.grossRevenue).toBeGreaterThan(small.grossRevenue);
  });

  it('stays inside the structural bounds and preserves exact allocation ratios', () => {
    const cases = [
      { teamId: 'phi', wins: 162, losses: 0, madePlayoffs: true, ownerArchetype: 'win_now' as const },
      { teamId: 'pit', wins: 0, losses: 162, madePlayoffs: false, ownerArchetype: 'penny_pincher' as const },
    ].map(deriveMarketRevenueStatement);

    expect(cases[0]).toMatchObject({
      attendanceRate: 0.08,
      playoffRate: 0.035,
      grossRevenue: 351.23,
      annualBudget: 393.38,
      payrollCap: 361.91,
    });
    expect(cases[1]).toMatchObject({
      attendanceRate: -0.08,
      grossRevenue: 161,
      annualBudget: 144.9,
      payrollCap: 133.31,
    });
    for (const statement of cases) {
      expect(statement.grossRevenue / statement.marketBaseline).toBeGreaterThanOrEqual(0.92);
      expect(statement.grossRevenue / statement.marketBaseline).toBeLessThanOrEqual(1.1151);
      expect(statement.payrollCap).toBe(Math.round(statement.annualBudget * 0.92 * 100) / 100);
    }
  });

  it('rejects incomplete records before producing any statement', () => {
    for (const record of [
      { wins: 81, losses: 80 },
      { wins: 81.5, losses: 80.5 },
      { wins: -1, losses: 163 },
    ]) {
      expect(() => deriveMarketRevenueStatement({
        teamId: 'phi',
        ...record,
        madePlayoffs: false,
        ownerArchetype: 'win_now',
      })).toThrow('complete 162-game');
    }
  });

  it('is deterministic and ignores recursive or asymmetric extra inputs', () => {
    const canonical = {
      teamId: 'msp',
      wins: 92,
      losses: 70,
      madePlayoffs: true,
      ownerArchetype: 'patient_builder' as const,
    };
    const first = deriveMarketRevenueStatement(canonical);
    const hostileRuntimeInput = {
      ...canonical,
      annualBudget: 999,
      satisfaction: 0,
      fanSentiment: 100,
      difficulty: 'hard',
      userTeamId: 'msp',
      payroll: 500,
      projectedTax: 90,
    };
    const second = deriveMarketRevenueStatement(hostileRuntimeInput);

    expect(second).toEqual(first);
    expect(deriveMarketRevenueStatement(canonical)).toEqual(first);
    expect(first).not.toHaveProperty('cash');
    expect(first).not.toHaveProperty('attendance');
    expect(first).not.toHaveProperty('taxExpense');
  });
});
