import type { OwnerState } from '@mbd/contracts';
import { getTeamMarketConfig, type MarketSize } from './contracts.js';

export const MARKET_REVENUE_ATTENDANCE_LIMIT = 0.08;
export const MARKET_REVENUE_PLAYOFF_RATE = 0.035;

export const MARKET_REVENUE_ALLOCATION_FACTORS: Readonly<
  Record<OwnerState['archetype'], number>
> = {
  win_now: 1.12,
  patient_builder: 1,
  penny_pincher: 0.9,
};

export interface MarketRevenueStatementInput {
  teamId: string;
  wins: number;
  losses: number;
  madePlayoffs: boolean;
  ownerArchetype: OwnerState['archetype'];
}

export interface MarketRevenueStatement {
  teamId: string;
  marketSize: MarketSize;
  marketBaseline: number;
  wins: number;
  losses: number;
  madePlayoffs: boolean;
  attendanceRate: number;
  attendanceRevenue: number;
  playoffRate: number;
  playoffRevenue: number;
  grossRevenue: number;
  allocationFactor: number;
  annualBudget: number;
  payrollCap: number;
  expectationsPayrollTarget: number;
  draftBonusPool: number;
  ifaBonusPool: number;
  staffBudget: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function assertCompleteRecord(wins: number, losses: number): void {
  if (!Number.isInteger(wins)
    || !Number.isInteger(losses)
    || wins < 0
    || losses < 0
    || wins + losses !== 162) {
    throw new Error('Market revenue requires one complete 162-game team record.');
  }
}

/**
 * Build one deterministic completed-season revenue statement. The static
 * market baseline is deliberately re-anchored every season, so repeating the
 * same facts cannot recursively compound a prior budget.
 */
export function deriveMarketRevenueStatement(
  input: MarketRevenueStatementInput,
): MarketRevenueStatement {
  const market = getTeamMarketConfig(input.teamId);
  if (!market) {
    throw new Error(`Market revenue has no explicit market for team ${input.teamId}.`);
  }
  assertCompleteRecord(input.wins, input.losses);

  const allocationFactor = MARKET_REVENUE_ALLOCATION_FACTORS[input.ownerArchetype];
  if (!Number.isFinite(allocationFactor)) {
    throw new Error(`Market revenue has no allocation factor for owner ${String(input.ownerArchetype)}.`);
  }

  const marketBaseline = roundMoney((market.budgetMin + market.budgetMax) / 2);
  const attendanceRate = clamp(
    ((input.wins - input.losses) / 162) * MARKET_REVENUE_ATTENDANCE_LIMIT,
    -MARKET_REVENUE_ATTENDANCE_LIMIT,
    MARKET_REVENUE_ATTENDANCE_LIMIT,
  );
  const playoffRate = input.madePlayoffs ? MARKET_REVENUE_PLAYOFF_RATE : 0;
  const attendanceRevenue = roundMoney(marketBaseline * attendanceRate);
  const playoffRevenue = roundMoney(marketBaseline * playoffRate);
  const grossRevenue = roundMoney(marketBaseline + attendanceRevenue + playoffRevenue);
  const annualBudget = roundMoney(grossRevenue * allocationFactor);
  const payrollCap = roundMoney(annualBudget * 0.92);

  return {
    teamId: input.teamId,
    marketSize: market.size,
    marketBaseline,
    wins: input.wins,
    losses: input.losses,
    madePlayoffs: input.madePlayoffs,
    attendanceRate,
    attendanceRevenue,
    playoffRate,
    playoffRevenue,
    grossRevenue,
    allocationFactor,
    annualBudget,
    payrollCap,
    expectationsPayrollTarget: payrollCap,
    draftBonusPool: roundMoney(Math.max(4.5, annualBudget * 0.03)),
    ifaBonusPool: roundMoney(Math.max(3.5, annualBudget * 0.0225)),
    staffBudget: roundMoney(Math.max(7.5, annualBudget * 0.0525)),
  };
}
