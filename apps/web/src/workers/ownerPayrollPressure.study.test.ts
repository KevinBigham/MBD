// @vitest-environment node

import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { TEAMS, calculateTeamPayroll } from '@mbd/sim-core';
import {
  buildOwnerPayrollPolicy,
  ownerPayrollPressureReceiptId,
  reconcileCompletedOffseasonOwnerPayrollPressure,
} from './sim.worker.ownerPayrollPressure.js';
import type { FullGameState } from './sim.worker.helpers.js';
import { queryApi } from './sim.worker.queries.js';
import { exportGameSnapshot, importGameSnapshot } from './snapshot.js';

vi.mock('comlink', () => ({ expose: () => {} }));

const STUDY_SEEDS = [7401, 7402, 7403, 7404] as const;
const OFFSEASONS_PER_SEED = 4;
const runStudy = process.env.MBD_OWNER_PAYROLL_STUDY === '1';
const measureStudy = process.env.MBD_OWNER_PAYROLL_STUDY_MEASURE === '1';
const studyIt = runStudy ? it : it.skip;

interface StudyRow {
  seed: number;
  season: number;
  totalMlbPayroll: number;
  averageMlbSalary: number;
  payrollSpread: number;
  belowFloor: number;
  onPlan: number;
  aboveSoftCeiling: number;
  taxpayers: number;
  receiptCount: number;
  duplicateReceipts: number;
  invalidPolicies: number;
  archetypes: Record<string, number>;
  policyDigest: string;
  totalPayrollRange: { min: number; max: number };
  luxuryTaxPayrollRange: { min: number; max: number };
  taxThresholds: number[];
  taxOverageRange: { min: number; max: number };
  projectedTaxRange: { min: number; max: number };
  taxpayerFacts: Array<{
    teamId: string;
    totalPayroll: number;
    luxuryTaxPayroll: number;
    taxThreshold: number;
    taxOverage: number;
    projectedTax: number;
  }>;
  reconciliationOwnerStateChanges: number;
  reconciliationFranchiseChanges: number;
  reconciliationContractChanges: number;
  reconciliationRngChanges: number;
  firstApplicationReceiptCount: number;
  firstApplicationNewsCount: number;
  firstApplicationBriefingCount: number;
  crossSurfaceContradictions: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function valueRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return {
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
  };
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
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

function contractFacts(state: FullGameState) {
  return state.players
    .map((player) => ({
      id: player.id,
      teamId: player.teamId,
      rosterStatus: player.rosterStatus,
      contract: player.contract,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function auditFirstReconciliation(state: FullGameState) {
  const auditState = importGameSnapshot(exportGameSnapshot(state));
  const receipt = ownerPayrollPressureReceiptId(auditState.season);
  const newsId = `owner-payroll-pressure-${auditState.season}-${auditState.userTeamId}`;
  for (const team of TEAMS) {
    auditState.storyFlags.set(
      team.id,
      (auditState.storyFlags.get(team.id) ?? []).filter((flag) => flag !== receipt),
    );
  }
  auditState.news = auditState.news.filter((item) => item.id !== newsId);
  auditState.briefingQueue = auditState.briefingQueue.filter((item) => item.id !== `brief-${newsId}`);

  const ownerBefore = digest(Array.from(auditState.ownerState.entries()));
  const franchiseBefore = digest(auditState.franchise);
  const contractsBefore = digest(contractFacts(auditState));
  const rngBefore = digest(auditState.rng.getState());
  const receipts = reconcileCompletedOffseasonOwnerPayrollPressure(auditState);

  return {
    reconciliationOwnerStateChanges: Number(digest(Array.from(auditState.ownerState.entries())) !== ownerBefore),
    reconciliationFranchiseChanges: Number(digest(auditState.franchise) !== franchiseBefore),
    reconciliationContractChanges: Number(digest(contractFacts(auditState)) !== contractsBefore),
    reconciliationRngChanges: Number(digest(auditState.rng.getState()) !== rngBefore),
    firstApplicationReceiptCount: receipts.length,
    firstApplicationNewsCount: auditState.news.filter((item) => item.id === newsId).length,
    firstApplicationBriefingCount: auditState.briefingQueue.filter((item) => item.id === `brief-${newsId}`).length,
  };
}

function policyFacts(state: FullGameState) {
  return TEAMS.map((team) => {
    const policy = buildOwnerPayrollPolicy(state, team.id);
    return {
      teamId: team.id,
      archetype: policy.archetype,
      floor: policy.floor,
      softCeiling: policy.softCeiling,
      totalPayroll: policy.totalPayroll,
      luxuryTaxPayroll: policy.luxuryTaxPayroll,
      ownerBand: policy.ownerBand,
      taxBand: policy.taxBand,
      projectedTax: policy.projectedTax,
    };
  });
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
      throw new Error('Owner payroll study exceeded the offseason phase guard.');
    }
  }
}

function captureRow(
  seed: number,
  state: FullGameState,
  harness: Awaited<ReturnType<typeof loadHarness>>,
): StudyRow {
  const payrolls = TEAMS.map((team) => calculateTeamPayroll(team.id, state.players));
  const policies = TEAMS.map((team) => ({
    teamId: team.id,
    policy: buildOwnerPayrollPolicy(state, team.id),
  }));
  const mlbSalaries = state.players
    .filter((player) => player.rosterStatus === 'MLB' && player.teamId != null)
    .map((player) => player.contract.annualSalary)
    .filter((salary) => salary > 0);
  const mlbPayrolls = payrolls.map((payroll) => payroll.mlbPayroll);
  const receipt = ownerPayrollPressureReceiptId(state.season);
  const receiptCounts = TEAMS.map((team) =>
    (state.storyFlags.get(team.id) ?? []).filter((flag) => flag === receipt).length,
  );
  const archetypes = TEAMS.reduce<Record<string, number>>((counts, team) => {
    const archetype = state.ownerState.get(team.id)?.archetype ?? 'missing';
    counts[archetype] = (counts[archetype] ?? 0) + 1;
    return counts;
  }, {});
  const canonicalUserPolicy = buildOwnerPayrollPolicy(state, state.userTeamId);
  const surfacePolicies = [
    queryApi.getOwnerPayrollPolicy(),
    queryApi.getOwnerPayrollPresentation().ownerPayrollPolicy,
    queryApi.getFinanceOverview().ownerPayrollPolicy,
    queryApi.getTeamFinances(state.userTeamId).ownerPayrollPolicy,
    queryApi.getDashboardSummary()?.roster.ownerPayrollPolicy,
    harness.buildOffseasonStateView(state)?.commandCenter.projectedOpeningDay.ownerPayrollPolicy,
  ].filter((policy): policy is NonNullable<typeof policy> => policy != null);
  const crossSurfaceContradictions = surfacePolicies
    .filter((policy) => digest(policy) !== digest(canonicalUserPolicy))
    .length;
  const reconciliationAudit = auditFirstReconciliation(state);
  const taxpayerFacts = policies
    .filter(({ policy }) => policy.taxBand === 'taxpayer')
    .map(({ teamId, policy }) => ({
      teamId,
      totalPayroll: policy.totalPayroll,
      luxuryTaxPayroll: policy.luxuryTaxPayroll,
      taxThreshold: policy.taxThreshold,
      taxOverage: policy.taxOverage,
      projectedTax: policy.projectedTax,
    }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId));

  return {
    seed,
    season: state.season,
    totalMlbPayroll: round(mlbPayrolls.reduce((sum, payroll) => sum + payroll, 0)),
    averageMlbSalary: round(mlbSalaries.reduce((sum, salary) => sum + salary, 0) / Math.max(1, mlbSalaries.length)),
    payrollSpread: round(Math.max(...mlbPayrolls) - Math.min(...mlbPayrolls)),
    belowFloor: policies.filter(({ policy }) => policy.ownerBand === 'below_floor').length,
    onPlan: policies.filter(({ policy }) => policy.ownerBand === 'on_plan').length,
    aboveSoftCeiling: policies.filter(({ policy }) => policy.ownerBand === 'above_soft_ceiling').length,
    taxpayers: policies.filter(({ policy }) => policy.taxBand === 'taxpayer').length,
    receiptCount: receiptCounts.filter((count) => count === 1).length,
    duplicateReceipts: receiptCounts.filter((count) => count > 1).length,
    invalidPolicies: policies.filter(({ policy }) =>
      !Number.isFinite(policy.floor)
      || !Number.isFinite(policy.softCeiling)
      || policy.floor < 0
      || policy.floor >= policy.softCeiling,
    ).length,
    archetypes,
    policyDigest: digest(policyFacts(state)),
    totalPayrollRange: valueRange(policies.map(({ policy }) => policy.totalPayroll)),
    luxuryTaxPayrollRange: valueRange(policies.map(({ policy }) => policy.luxuryTaxPayroll)),
    taxThresholds: Array.from(new Set(policies.map(({ policy }) => policy.taxThreshold))).sort((left, right) => left - right),
    taxOverageRange: valueRange(policies.map(({ policy }) => policy.taxOverage)),
    projectedTaxRange: valueRange(policies.map(({ policy }) => policy.projectedTax)),
    taxpayerFacts,
    ...reconciliationAudit,
    crossSurfaceContradictions,
  };
}

describe('owner payroll pressure 4x4 annual study', () => {
  studyIt('stays inside the frozen payroll, incidence, receipt, and determinism bands', { timeout: 900_000 }, async () => {
    const harness = await loadHarness();
    const rows: StudyRow[] = [];
    const openingRows: StudyRow[] = [];

    for (const seed of STUDY_SEEDS) {
      harness.setState(null);
      harness.actionApi.newGame({
        seed,
        userTeamId: 'nym',
        gmName: 'Payroll Study',
        difficulty: 'standard',
        saveSlot: 14,
        dayOneExperience: 'quick',
      });
      const openingRow = captureRow(seed, harness.requireState(), harness);
      openingRows.push(openingRow);
      expect(openingRow.totalMlbPayroll).toBeGreaterThanOrEqual(3_800);
      expect(openingRow.totalMlbPayroll).toBeLessThanOrEqual(6_800);
      expect(openingRow.averageMlbSalary).toBeGreaterThanOrEqual(2.5);
      expect(openingRow.averageMlbSalary).toBeLessThanOrEqual(8.5);
      expect(openingRow.payrollSpread).toBeGreaterThanOrEqual(25);
      expect(openingRow.payrollSpread).toBeLessThanOrEqual(350);
      expect(openingRow.archetypes).toEqual({ win_now: 22, patient_builder: 10 });

      for (let offseason = 0; offseason < OFFSEASONS_PER_SEED; offseason += 1) {
        harness.actionApi.simToPlayoffs();
        completeOffseason(harness);
        const row = captureRow(seed, harness.requireState(), harness);
        rows.push(row);

        if (!measureStudy) {
          expect(row.belowFloor).toBeGreaterThanOrEqual(0);
          expect(row.belowFloor).toBeLessThanOrEqual(3);
          expect(row.onPlan).toBeGreaterThanOrEqual(12);
          expect(row.onPlan).toBeLessThanOrEqual(31);
          expect(row.aboveSoftCeiling).toBeGreaterThanOrEqual(1);
          expect(row.aboveSoftCeiling).toBeLessThanOrEqual(20);
          expect(row.taxpayers).toBeGreaterThanOrEqual(0);
          expect(row.taxpayers).toBeLessThanOrEqual(8);
        }
        expect(row.receiptCount).toBe(32);
        expect(row.duplicateReceipts).toBe(0);
        expect(row.invalidPolicies).toBe(0);
        expect(row.archetypes).toEqual({ win_now: 22, patient_builder: 10 });
        expect(row.reconciliationOwnerStateChanges).toBe(0);
        expect(row.reconciliationFranchiseChanges).toBe(0);
        expect(row.reconciliationContractChanges).toBe(0);
        expect(row.reconciliationRngChanges).toBe(0);
        expect(row.firstApplicationReceiptCount).toBe(32);
        expect(row.firstApplicationNewsCount).toBe(1);
        expect(row.firstApplicationBriefingCount).toBe(1);
        expect(row.crossSurfaceContradictions).toBe(0);
        expect(row.taxThresholds).toEqual([230]);
        expect(row.taxpayerFacts).toHaveLength(row.taxpayers);
        for (const fact of row.taxpayerFacts) {
          expect(fact.luxuryTaxPayroll).toBeGreaterThan(fact.taxThreshold);
          expect(fact.taxOverage).toBe(round(fact.luxuryTaxPayroll - fact.taxThreshold));
          expect(fact.projectedTax).toBeGreaterThan(0);
        }
        expect(digest(policyFacts(harness.requireState()))).toBe(row.policyDigest);

        if (offseason < OFFSEASONS_PER_SEED - 1) {
          harness.actionApi.startNextSeason();
        }
      }
    }

    expect(rows).toHaveLength(STUDY_SEEDS.length * OFFSEASONS_PER_SEED);
    expect(openingRows).toHaveLength(STUDY_SEEDS.length);
    expect(rows.some((row) => row.belowFloor > 0)).toBe(true);
    expect(rows.some((row) => row.onPlan > 0)).toBe(true);
    console.info(`OWNER_PAYROLL_STUDY ${JSON.stringify({ openingRows, annualRows: rows })}`);
    harness.setState(null);
  });
});
