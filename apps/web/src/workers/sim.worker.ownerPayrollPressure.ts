import {
  TEAMS,
  createOwnerState,
  deriveOwnerPayrollPolicy,
  getOffseasonLength,
  getTeamBudget,
  resolveOwnerSoftCeiling,
  type OwnerPayrollPolicy,
  type MarketRevenueStatement,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import type { OwnerState } from '@mbd/contracts';
import { getSettledMarketRevenueStatement } from './sim.worker.marketRevenue.js';
import { calculateStateTeamPayroll } from './sim.worker.tradeFinance.js';

type NormalizedOwnerState = OwnerState & Required<Pick<OwnerState,
  | 'spendingWillingness'
  | 'winNowPressure'
  | 'meddlingLevel'
  | 'satisfaction'
  | 'annualBudget'
  | 'payrollCap'
  | 'draftBonusPool'
  | 'ifaBonusPool'
  | 'staffBudget'
>>;

export interface OwnerPayrollPresentation {
  owner: NormalizedOwnerState;
  ownerPayrollPolicy: OwnerPayrollPolicy;
  marketRevenueStatement: MarketRevenueStatement | null;
}

export interface OwnerPayrollReconciliationReceipt {
  teamId: string;
  season: number;
  receiptId: string;
  policy: OwnerPayrollPolicy;
}

function money(value: number): string {
  return `$${value.toFixed(2)}M`;
}

function ownerVoice(policy: OwnerPayrollPolicy): string {
  switch (policy.archetype) {
    case 'win_now':
      return 'This win-now owner expects the roster investment to match the competitive mandate.';
    case 'patient_builder':
      return 'This patient builder wants sustainable investment without mistaking patience for inactivity.';
    case 'penny_pincher':
      return 'This cost-conscious owner is watching every payroll commitment closely.';
  }
}

export function buildOwnerPayrollPolicy(
  state: FullGameState,
  teamId: string,
): OwnerPayrollPolicy {
  const owner = state.ownerState.get(teamId)
    ?? createOwnerState(teamId, getTeamBudget(teamId));
  const payroll = calculateStateTeamPayroll(state, teamId);
  const softCeiling = resolveOwnerSoftCeiling({
    payrollCap: owner.payrollCap,
    payrollTarget: owner.expectations.payrollTarget,
    fallbackBudget: getTeamBudget(teamId),
  });

  return deriveOwnerPayrollPolicy({
    archetype: owner.archetype,
    softCeiling,
    totalPayroll: payroll.totalPayroll,
    luxuryTaxPayroll: payroll.luxuryTaxPayroll,
  });
}

function normalizeOwnerPresentation(
  state: FullGameState,
  teamId: string,
): NormalizedOwnerState {
  const fallback = createOwnerState(teamId, getTeamBudget(teamId));
  const persisted = state.ownerState.get(teamId);
  const expectations = {
    ...fallback.expectations,
    ...persisted?.expectations,
  };

  return {
    ...fallback,
    ...persisted,
    teamId,
    expectations,
    spendingWillingness: persisted?.spendingWillingness ?? fallback.spendingWillingness!,
    winNowPressure: persisted?.winNowPressure ?? fallback.winNowPressure!,
    meddlingLevel: persisted?.meddlingLevel ?? fallback.meddlingLevel!,
    satisfaction: persisted?.satisfaction ?? fallback.satisfaction!,
    annualBudget: persisted?.annualBudget ?? fallback.annualBudget!,
    payrollCap: persisted?.payrollCap ?? persisted?.expectations.payrollTarget ?? fallback.payrollCap!,
    draftBonusPool: persisted?.draftBonusPool ?? fallback.draftBonusPool!,
    ifaBonusPool: persisted?.ifaBonusPool ?? fallback.ifaBonusPool!,
    staffBudget: persisted?.staffBudget ?? fallback.staffBudget!,
  };
}

export function buildOwnerPayrollPresentation(
  state: FullGameState,
  teamId: string,
): OwnerPayrollPresentation {
  return {
    owner: normalizeOwnerPresentation(state, teamId),
    ownerPayrollPolicy: buildOwnerPayrollPolicy(state, teamId),
    marketRevenueStatement: getSettledMarketRevenueStatement(state, teamId),
  };
}

export function buildOwnerPayrollNarrative(policy: OwnerPayrollPolicy): {
  headline: string;
  body: string;
  priority: 2 | 3;
  tag: 'WATCH' | 'ANALYSIS';
} {
  const ownerStatus = policy.ownerBand === 'below_floor'
    ? `Total payroll ${money(policy.totalPayroll)} finished ${money(policy.floorShortfall)} below the ${money(policy.floor)} owner floor.`
    : policy.ownerBand === 'above_soft_ceiling'
      ? `Total payroll ${money(policy.totalPayroll)} finished ${money(policy.softCeilingOverage)} above the ${money(policy.softCeiling)} owner soft ceiling.`
      : `Total payroll ${money(policy.totalPayroll)} finished inside the ${money(policy.floor)}-${money(policy.softCeiling)} owner plan.`;
  const taxStatus = policy.taxBand === 'taxpayer'
    ? `Tax payroll ${money(policy.luxuryTaxPayroll)} is ${money(policy.taxOverage)} above the ${money(policy.taxThreshold)} league line, for ${money(policy.projectedTax)} in projected exposure.`
    : policy.luxuryTaxPayroll === policy.taxThreshold
      ? `Tax payroll ${money(policy.luxuryTaxPayroll)} is at the ${money(policy.taxThreshold)} league line; projected exposure is $0.00M.`
      : `Tax payroll ${money(policy.luxuryTaxPayroll)} is clear of the ${money(policy.taxThreshold)} league line; projected exposure is $0.00M.`;

  return {
    headline: policy.ownerBand === 'below_floor'
      ? 'Ownership expects a stronger payroll commitment'
      : policy.ownerBand === 'above_soft_ceiling'
        ? 'Ownership marks an aggressive payroll finish'
        : policy.taxBand === 'taxpayer'
          ? 'Ownership accepts a tax-line season'
          : 'Payroll finishes inside the owner plan',
    body: `${ownerStatus} ${taxStatus} ${ownerVoice(policy)}`,
    priority: policy.ownerBand === 'on_plan' && policy.taxBand === 'clear' ? 3 : 2,
    tag: policy.ownerBand === 'on_plan' && policy.taxBand === 'clear' ? 'ANALYSIS' : 'WATCH',
  };
}

function receiptId(season: number): string {
  return `owner_payroll_pressure_reconciled_s${season}`;
}

export function reconcileCompletedOffseasonOwnerPayrollPressure(
  state: FullGameState,
): OwnerPayrollReconciliationReceipt[] {
  const receipts: OwnerPayrollReconciliationReceipt[] = [];

  for (const team of TEAMS) {
    const id = receiptId(state.season);
    const flags = state.storyFlags.get(team.id) ?? [];
    const alreadyReconciled = flags.includes(id);
    const normalizedFlags = Array.from(new Set([...flags, id]))
      .sort((left, right) => left.localeCompare(right));
    if (normalizedFlags.length !== flags.length
      || normalizedFlags.some((flag, index) => flag !== flags[index])) {
      state.storyFlags.set(team.id, normalizedFlags);
    }

    if (!alreadyReconciled) {
      const policy = buildOwnerPayrollPolicy(state, team.id);
      receipts.push({ teamId: team.id, season: state.season, receiptId: id, policy });
    }

    if (team.id !== state.userTeamId) continue;

    const policy = buildOwnerPayrollPolicy(state, team.id);
    const narrative = buildOwnerPayrollNarrative(policy);
    const newsId = `owner-payroll-pressure-${state.season}-${team.id}`;
    const timestamp = `S${state.season}D${getOffseasonLength()}`;
    if (!state.news.some((item) => item.id === newsId)) {
      state.news.unshift({
        id: newsId,
        headline: narrative.headline,
        body: narrative.body,
        priority: narrative.priority,
        category: 'performance',
        tag: narrative.tag,
        timestamp,
        relatedPlayerIds: [],
        relatedTeamIds: [team.id],
        read: false,
      });
    }

    const briefingId = `brief-${newsId}`;
    if (!state.briefingQueue.some((item) => item.id === briefingId)) {
      state.briefingQueue.unshift({
        id: briefingId,
        priority: narrative.priority,
        category: 'owner',
        tag: narrative.tag,
        headline: narrative.headline,
        body: narrative.body,
        relatedTeamIds: [team.id],
        relatedPlayerIds: [],
        timestamp,
        acknowledged: false,
      });
    }
  }

  return receipts;
}

export function ownerPayrollPressureReceiptId(season: number): string {
  return receiptId(season);
}
