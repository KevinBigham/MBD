// @vitest-environment node

import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  TEAMS,
  calculateTeamPayroll,
  type MarketRevenueStatement,
} from '@mbd/sim-core';
import { buildOwnerPayrollPolicy } from './sim.worker.ownerPayrollPressure.js';
import {
  marketRevenueReceiptId,
  prepareCompletedSeasonMarketRevenue,
  reconcileCompletedSeasonMarketRevenue,
} from './sim.worker.marketRevenue.js';
import type { FullGameState } from './sim.worker.helpers.js';
import { queryApi } from './sim.worker.queries.js';
import { exportGameSnapshot, importGameSnapshot } from './snapshot.js';

vi.mock('comlink', () => ({ expose: () => {} }));

const DEFAULT_STUDY_SEEDS = [7501, 7502, 7503, 7504] as const;
const requestedSeed = Number(process.env.MBD_MARKET_REVENUE_STUDY_SEED);
const STUDY_SEEDS = Number.isInteger(requestedSeed) && requestedSeed > 0
  ? [requestedSeed]
  : [...DEFAULT_STUDY_SEEDS];
const requestedSeasons = Number(process.env.MBD_MARKET_REVENUE_STUDY_SEASONS);
const SEASONS_PER_SEED = Number.isInteger(requestedSeasons)
  && requestedSeasons >= 1
  && requestedSeasons <= 4
  ? requestedSeasons
  : 4;
const runStudy = process.env.MBD_MARKET_REVENUE_STUDY === '1';
const measureStudy = process.env.MBD_MARKET_REVENUE_STUDY_MEASURE === '1';
const studyIt = runStudy ? it : it.skip;

interface RevenueStudyRow {
  seed: number;
  season: number;
  statements: MarketRevenueStatement[];
  receiptCount: number;
  duplicateReceipts: number;
  newsCount: number;
  briefingCount: number;
  budgetRange: { min: number; max: number };
  meanBudget: number;
  meanBudgetByMarket: Record<'large' | 'medium' | 'small', number>;
  totalMlbPayroll: number;
  averageMlbSalary: number;
  payrollSpread: number;
  freeAgencyMarketSize: number;
  freeAgentSignings: number;
  meaningfulFreeAgentSignings: number;
  topFreeAgentAav: number;
  acceptedExtensions: number;
  ownerPressure: {
    belowFloor: number;
    onPlan: number;
    aboveSoftCeiling: number;
    taxpayers: number;
  };
  surfaceStatementCount: number;
  crossSurfaceContradictions: number;
  firstApplicationReceiptCount: number;
  firstApplicationNewsCount: number;
  firstApplicationBriefingCount: number;
  settlementDigests: Record<SettlementDigestName, SettlementDigestPair>;
}

type SettlementDigestName =
  | 'nonFinancialOwner'
  | 'franchise'
  | 'player'
  | 'contract'
  | 'payroll'
  | 'roster'
  | 'parentRng';

interface SettlementDigestPair {
  before: string;
  after: string;
}

interface RevenueOpeningRow {
  seed: number;
  totalMlbPayroll: number;
  averageMlbSalary: number;
  payrollSpread: number;
}

interface RevenueSeedTrend {
  seed: number;
  firstMeanBudget: number;
  lastMeanBudget: number;
  cagr: number;
  firstHalfSlope: number;
  secondHalfSlope: number;
  acceleration: number;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function range(values: number[]): { min: number; max: number } {
  return {
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  };
}

function mean(values: number[]): number {
  return round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = value instanceof Map
      ? Array.from(value.entries()).sort(([left], [right]) => String(left).localeCompare(String(right)))
      : Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

async function loadHarness() {
  const [{ actionApi }, helpers] = await Promise.all([
    import('./sim.worker.actions.js'),
    import('./sim.worker.helpers.js'),
  ]);
  return {
    actionApi,
    buildOffseasonStateView: helpers.buildOffseasonStateView,
    requireState: helpers.requireState,
    setState: helpers.setState,
  };
}

function completeOffseason(harness: Awaited<ReturnType<typeof loadHarness>>) {
  harness.actionApi.simRemainingPlayoffs();
  harness.actionApi.proceedToOffseason();
  expect(harness.requireState().phase).toBe('offseason');

  let guard = 0;
  while (!harness.requireState().offseasonState?.completed) {
    const progress = harness.actionApi.skipOffseasonPhase()
      ?? harness.actionApi.advanceOffseason();
    expect(progress).not.toBeNull();
    expect(progress?.error).toBeUndefined();
    guard += 1;
    if (guard > 20) {
      throw new Error('Market revenue study exceeded the offseason phase guard.');
    }
  }
}

function captureOpeningRow(seed: number, state: FullGameState): RevenueOpeningRow {
  const payrolls = TEAMS.map((team) => calculateTeamPayroll(team.id, state.players).mlbPayroll);
  const mlbSalaries = state.players
    .filter((player) => player.teamId != null && player.rosterStatus === 'MLB')
    .map((player) => player.contract.annualSalary)
    .filter((salary) => salary > 0);
  return {
    seed,
    totalMlbPayroll: round(payrolls.reduce((sum, payroll) => sum + payroll, 0)),
    averageMlbSalary: mean(mlbSalaries),
    payrollSpread: round(Math.max(...payrolls) - Math.min(...payrolls)),
  };
}

function nonFinancialOwnerFacts(state: FullGameState) {
  return Array.from(state.ownerState.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([teamId, owner]) => {
      const {
        annualBudget: _annualBudget,
        payrollCap: _payrollCap,
        draftBonusPool: _draftBonusPool,
        ifaBonusPool: _ifaBonusPool,
        staffBudget: _staffBudget,
        expectations,
        ...nonFinancial
      } = owner;
      const { payrollTarget: _payrollTarget, ...nonFinancialExpectations } = expectations;
      return [teamId, { ...nonFinancial, expectations: nonFinancialExpectations }];
    });
}

function playerFacts(state: FullGameState) {
  return state.players.map((player) => {
    const {
      contract: _contract,
      teamId: _teamId,
      rosterStatus: _rosterStatus,
      minorLeagueLevel: _minorLeagueLevel,
      ...facts
    } = player;
    return facts;
  });
}

function contractFacts(state: FullGameState) {
  return state.players.map((player) => [player.id, player.contract]);
}

function payrollFacts(state: FullGameState) {
  return TEAMS.map((team) => [team.id, calculateTeamPayroll(team.id, state.players)]);
}

function rosterFacts(state: FullGameState) {
  return {
    memberships: state.players.map((player) => ({
      id: player.id,
      teamId: player.teamId,
      rosterStatus: player.rosterStatus,
      minorLeagueLevel: player.minorLeagueLevel,
    })),
    rosterStates: state.rosterStates,
  };
}

function settlementDigestValues(state: FullGameState): Record<SettlementDigestName, string> {
  return {
    nonFinancialOwner: digest(nonFinancialOwnerFacts(state)),
    franchise: digest(state.franchise),
    player: digest(playerFacts(state)),
    contract: digest(contractFacts(state)),
    payroll: digest(payrollFacts(state)),
    roster: digest(rosterFacts(state)),
    parentRng: digest(state.rng.getState()),
  };
}

function auditFirstApplication(state: FullGameState) {
  const auditState = importGameSnapshot(exportGameSnapshot(state));
  const receipt = marketRevenueReceiptId(auditState.season);
  const newsId = `market-revenue-${auditState.season}-${auditState.userTeamId}`;
  for (const team of TEAMS) {
    auditState.storyFlags.set(
      team.id,
      (auditState.storyFlags.get(team.id) ?? []).filter((flag) => flag !== receipt),
    );
  }
  auditState.news = auditState.news.filter((item) => item.id !== newsId);
  auditState.briefingQueue = auditState.briefingQueue.filter((item) => item.id !== `brief-${newsId}`);

  const before = settlementDigestValues(auditState);
  reconcileCompletedSeasonMarketRevenue(auditState);
  const after = settlementDigestValues(auditState);
  const receiptCounts = TEAMS.map((team) => (
    auditState.storyFlags.get(team.id) ?? []
  ).filter((flag) => flag === receipt).length);
  const settlementDigests = Object.fromEntries(
    (Object.keys(before) as SettlementDigestName[]).map((name) => [
      name,
      { before: before[name], after: after[name] },
    ]),
  ) as Record<SettlementDigestName, SettlementDigestPair>;

  return {
    firstApplicationReceiptCount: receiptCounts.reduce((sum, count) => sum + count, 0),
    firstApplicationNewsCount: auditState.news.filter((item) => item.id === newsId).length,
    firstApplicationBriefingCount: auditState.briefingQueue
      .filter((item) => item.id === `brief-${newsId}`).length,
    settlementDigests,
  };
}

function captureRow(
  seed: number,
  state: FullGameState,
  harness: Awaited<ReturnType<typeof loadHarness>>,
): RevenueStudyRow {
  const statements = prepareCompletedSeasonMarketRevenue(state).statements;
  const receipt = marketRevenueReceiptId(state.season);
  const receiptCounts = TEAMS.map((team) =>
    (state.storyFlags.get(team.id) ?? []).filter((flag) => flag === receipt).length,
  );
  const newsId = `market-revenue-${state.season}-${state.userTeamId}`;
  const userStatement = statements.find((statement) => statement.teamId === state.userTeamId);
  if (!userStatement) throw new Error('Market revenue study could not resolve the user statement.');

  const surfaceStatements: Array<MarketRevenueStatement | null | undefined> = [
    queryApi.getOwnerPayrollPresentation().marketRevenueStatement,
    queryApi.getFinanceOverview().marketRevenueStatement,
    queryApi.getTeamFinances(state.userTeamId).marketRevenueStatement,
    harness.buildOffseasonStateView(state)?.commandCenter.projectedOpeningDay.marketRevenueStatement,
  ];

  const payrolls = TEAMS.map((team) => calculateTeamPayroll(team.id, state.players).mlbPayroll);
  const mlbSalaries = state.players
    .filter((player) => player.teamId != null && player.rosterStatus === 'MLB')
    .map((player) => player.contract.annualSalary)
    .filter((salary) => salary > 0);
  const results = state.offseasonState?.phaseResults;
  const signings = results?.freeAgentSignings ?? [];
  const policies = TEAMS.map((team) => buildOwnerPayrollPolicy(state, team.id));
  const meanBudgetByMarket = (['large', 'medium', 'small'] as const)
    .reduce<Record<'large' | 'medium' | 'small', number>>((output, market) => {
      output[market] = mean(statements
        .filter((statement) => statement.marketSize === market)
        .map((statement) => statement.annualBudget));
      return output;
    }, { large: 0, medium: 0, small: 0 });

  return {
    seed,
    season: state.season,
    statements,
    receiptCount: receiptCounts.filter((count) => count === 1).length,
    duplicateReceipts: receiptCounts.filter((count) => count > 1).length,
    newsCount: state.news.filter((item) => item.id === newsId).length,
    briefingCount: state.briefingQueue.filter((item) => item.id === `brief-${newsId}`).length,
    budgetRange: range(statements.map((statement) => statement.annualBudget)),
    meanBudget: mean(statements.map((statement) => statement.annualBudget)),
    meanBudgetByMarket,
    totalMlbPayroll: round(payrolls.reduce((sum, payroll) => sum + payroll, 0)),
    averageMlbSalary: mean(mlbSalaries),
    payrollSpread: round(Math.max(...payrolls) - Math.min(...payrolls)),
    freeAgencyMarketSize: (state.freeAgencyMarket?.freeAgents.length ?? 0)
      + (state.freeAgencyMarket?.signedPlayers.length ?? 0),
    freeAgentSignings: signings.length,
    meaningfulFreeAgentSignings: signings.filter((entry) => entry.annualSalary >= 10).length,
    topFreeAgentAav: round(signings.reduce((max, entry) => Math.max(max, entry.annualSalary), 0)),
    acceptedExtensions: results?.extensions.filter((entry) => entry.status === 'accepted').length ?? 0,
    ownerPressure: {
      belowFloor: policies.filter((policy) => policy.ownerBand === 'below_floor').length,
      onPlan: policies.filter((policy) => policy.ownerBand === 'on_plan').length,
      aboveSoftCeiling: policies.filter((policy) => policy.ownerBand === 'above_soft_ceiling').length,
      taxpayers: policies.filter((policy) => policy.taxBand === 'taxpayer').length,
    },
    surfaceStatementCount: surfaceStatements.filter((statement) => statement != null).length,
    crossSurfaceContradictions: surfaceStatements
      .filter((statement) => statement == null || digest(statement) !== digest(userStatement)).length,
    ...auditFirstApplication(state),
  };
}

function buildTrends(rows: RevenueStudyRow[]): RevenueSeedTrend[] {
  return STUDY_SEEDS.map((seed) => {
    const seedRows = rows.filter((row) => row.seed === seed);
    const first = seedRows[0]?.meanBudget ?? 0;
    const last = seedRows.at(-1)?.meanBudget ?? 0;
    const periods = Math.max(1, seedRows.length - 1);
    const firstHalfSlope = seedRows.length >= 2
      ? round(seedRows[1]!.meanBudget - seedRows[0]!.meanBudget)
      : 0;
    const secondHalfSlope = seedRows.length >= 4
      ? round(seedRows[3]!.meanBudget - seedRows[2]!.meanBudget)
      : firstHalfSlope;
    return {
      seed,
      firstMeanBudget: first,
      lastMeanBudget: last,
      cagr: round((Math.pow(last / Math.max(first, 0.01), 1 / periods) - 1) * 100),
      firstHalfSlope,
      secondHalfSlope,
      acceleration: round(secondHalfSlope - firstHalfSlope),
    };
  });
}

describe('market revenue 4x4 annual study', () => {
  studyIt('stays deterministic, bounded, and economically connected', { timeout: 900_000 }, async () => {
    const harness = await loadHarness();
    const rows: RevenueStudyRow[] = [];
    const openingRows: RevenueOpeningRow[] = [];

    for (const seed of STUDY_SEEDS) {
      harness.setState(null);
      harness.actionApi.newGame({
        seed,
        userTeamId: 'nym',
        gmName: 'Revenue Study',
        difficulty: 'standard',
        saveSlot: 15,
        dayOneExperience: 'quick',
      });
      const openingRow = captureOpeningRow(seed, harness.requireState());
      openingRows.push(openingRow);
      expect(openingRow.totalMlbPayroll).toBeGreaterThanOrEqual(3_800);
      expect(openingRow.totalMlbPayroll).toBeLessThanOrEqual(6_800);
      expect(openingRow.averageMlbSalary).toBeGreaterThanOrEqual(2.5);
      expect(openingRow.averageMlbSalary).toBeLessThanOrEqual(8.5);
      expect(openingRow.payrollSpread).toBeGreaterThanOrEqual(25);
      expect(openingRow.payrollSpread).toBeLessThanOrEqual(350);

      for (let completedSeason = 0; completedSeason < SEASONS_PER_SEED; completedSeason += 1) {
        harness.actionApi.simToPlayoffs();
        completeOffseason(harness);
        const row = captureRow(seed, harness.requireState(), harness);
        rows.push(row);

        expect(row.statements).toHaveLength(32);
        expect(row.receiptCount).toBe(32);
        expect(row.duplicateReceipts).toBe(0);
        expect(row.newsCount).toBe(1);
        // The briefing queue is an ephemeral delivery lane and may be consumed
        // by later offseason phases; first-application proof below requires the
        // singular canonical briefing at the settlement boundary.
        expect(row.briefingCount).toBeLessThanOrEqual(1);
        expect(row.budgetRange.min).toBeGreaterThanOrEqual(144.9);
        expect(row.budgetRange.max).toBeLessThanOrEqual(393.38);
        expect(row.meanBudget).toBeGreaterThanOrEqual(255);
        expect(row.meanBudget).toBeLessThanOrEqual(275);
        expect(row.firstApplicationReceiptCount).toBe(32);
        expect(row.firstApplicationNewsCount).toBe(1);
        expect(row.firstApplicationBriefingCount).toBe(1);
        for (const receipt of Object.values(row.settlementDigests)) {
          expect(receipt.after).toBe(receipt.before);
        }
        expect(row.surfaceStatementCount).toBe(4);
        expect(row.crossSurfaceContradictions).toBe(0);
        expect(row.totalMlbPayroll).toBeGreaterThanOrEqual(3_800);
        expect(row.totalMlbPayroll).toBeLessThanOrEqual(6_800);
        expect(row.payrollSpread).toBeGreaterThanOrEqual(25);
        expect(row.payrollSpread).toBeLessThanOrEqual(350);

        if (!measureStudy) {
          expect(row.freeAgencyMarketSize).toBeGreaterThanOrEqual(450);
          expect(row.freeAgencyMarketSize).toBeLessThanOrEqual(1_089);
          expect(row.freeAgentSignings).toBeGreaterThanOrEqual(21);
          expect(row.freeAgentSignings).toBeLessThanOrEqual(58);
          expect(row.meaningfulFreeAgentSignings).toBeGreaterThanOrEqual(21);
          expect(row.meaningfulFreeAgentSignings).toBeLessThanOrEqual(57);
          expect(row.topFreeAgentAav).toBeGreaterThanOrEqual(20);
          expect(row.topFreeAgentAav).toBeLessThanOrEqual(45);
          expect(row.acceptedExtensions).toBeGreaterThanOrEqual(8);
          expect(row.acceptedExtensions).toBeLessThanOrEqual(80);
          expect(row.ownerPressure.belowFloor).toBeGreaterThanOrEqual(0);
          expect(row.ownerPressure.belowFloor).toBeLessThanOrEqual(3);
          expect(row.ownerPressure.onPlan).toBeGreaterThanOrEqual(12);
          expect(row.ownerPressure.onPlan).toBeLessThanOrEqual(31);
          expect(row.ownerPressure.aboveSoftCeiling).toBeGreaterThanOrEqual(1);
          expect(row.ownerPressure.aboveSoftCeiling).toBeLessThanOrEqual(20);
          expect(row.ownerPressure.taxpayers).toBeGreaterThanOrEqual(0);
          expect(row.ownerPressure.taxpayers).toBeLessThanOrEqual(8);
        }

        if (completedSeason < SEASONS_PER_SEED - 1) {
          harness.actionApi.startNextSeason();
        }
      }
    }

    const trends = buildTrends(rows);
    expect(openingRows).toHaveLength(STUDY_SEEDS.length);
    expect(rows).toHaveLength(STUDY_SEEDS.length * SEASONS_PER_SEED);
    expect(rows.flatMap((row) => row.statements)).toHaveLength(
      STUDY_SEEDS.length * SEASONS_PER_SEED * 32,
    );
    if (!measureStudy && SEASONS_PER_SEED === 4) {
      expect(mean(rows.map((row) => row.meaningfulFreeAgentSignings))).toBeGreaterThanOrEqual(1.5);
      expect(mean(rows.map((row) => row.topFreeAgentAav))).toBeGreaterThanOrEqual(20);
      expect(mean(rows.map((row) => row.topFreeAgentAav))).toBeLessThanOrEqual(45);
      for (const trend of trends) {
        expect(trend.cagr).toBeGreaterThanOrEqual(-1);
        expect(trend.cagr).toBeLessThanOrEqual(1);
        expect(trend.firstHalfSlope).toBeGreaterThanOrEqual(-3);
        expect(trend.firstHalfSlope).toBeLessThanOrEqual(3);
        expect(trend.secondHalfSlope).toBeGreaterThanOrEqual(-3);
        expect(trend.secondHalfSlope).toBeLessThanOrEqual(3);
        expect(trend.acceleration).toBeGreaterThanOrEqual(-4);
        expect(trend.acceleration).toBeLessThanOrEqual(4);
      }
    }

    console.info(`MARKET_REVENUE_STUDY ${JSON.stringify({ openingRows, rows, trends })}`);
    harness.setState(null);
  });
});
