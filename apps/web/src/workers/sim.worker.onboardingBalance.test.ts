// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AGMCandidateId, GMPhilosophy } from '@mbd/contracts';
import { summarizeOnboardingBalanceSample } from '@mbd/sim-core';
import type {
  CalibrationOnboardingBalanceMetrics,
  CalibrationOnboardingBalanceSample,
  CalibrationOnboardingBalanceVariantSample,
} from '@mbd/sim-core';

declare const process: { env?: Record<string, string | undefined> };

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

const BALANCE_SEED = 12_701;
const SAMPLE_SEASONS = Number(process.env?.MBD_ONBOARDING_BALANCE_SAMPLE_SEASONS ?? 1);
const SAMPLE_TIMEOUT_MS = SAMPLE_SEASONS > 1 ? 720_000 : 360_000;
const SAMPLE_FULL_MATRIX = process.env?.MBD_ONBOARDING_BALANCE_FULL_MATRIX === '1';
const LOG_SAMPLE_SUMMARY = process.env?.MBD_ONBOARDING_BALANCE_LOG === '1';

interface OnboardingBalanceVariant {
  id: string;
  assistantGMId: AGMCandidateId;
  philosophy: GMPhilosophy;
}

type OnboardingBalanceMetrics = CalibrationOnboardingBalanceMetrics;

interface OnboardingBalanceSample {
  variantId: string;
  assistantGMId: AGMCandidateId;
  philosophy: GMPhilosophy;
  baseline: OnboardingBalanceMetrics;
  seasons: OnboardingBalanceMetrics[];
  final: OnboardingBalanceMetrics;
}

const ALL_VARIANTS: readonly OnboardingBalanceVariant[] = [
  {
    id: 'balanced_reference',
    assistantGMId: 'walt_kowalski',
    philosophy: {
      seasonGoal: 'compete',
      developmentStyle: 'balanced',
      spendingStyle: 'balanced',
      tradeApproach: 'opportunistic',
      scoutingFocus: 'draft',
      mediaTone: 'measured',
    },
  },
  {
    id: 'marcus_win_now',
    assistantGMId: 'marcus_chen',
    philosophy: {
      seasonGoal: 'championship',
      developmentStyle: 'aggressive',
      spendingStyle: 'big_spender',
      tradeApproach: 'buyer',
      scoutingFocus: 'pro_scouting',
      mediaTone: 'confident',
    },
  },
  {
    id: 'elena_rebuild',
    assistantGMId: 'elena_vargas',
    philosophy: {
      seasonGoal: 'rebuild',
      developmentStyle: 'patient',
      spendingStyle: 'penny_pincher',
      tradeApproach: 'seller',
      scoutingFocus: 'international',
      mediaTone: 'humble',
    },
  },
  {
    id: 'elena_prospect_push',
    assistantGMId: 'elena_vargas',
    philosophy: {
      seasonGoal: 'playoff',
      developmentStyle: 'aggressive',
      spendingStyle: 'balanced',
      tradeApproach: 'buyer',
      scoutingFocus: 'international',
      mediaTone: 'measured',
    },
  },
  {
    id: 'marcus_value_hold',
    assistantGMId: 'marcus_chen',
    philosophy: {
      seasonGoal: 'compete',
      developmentStyle: 'patient',
      spendingStyle: 'penny_pincher',
      tradeApproach: 'opportunistic',
      scoutingFocus: 'pro_scouting',
      mediaTone: 'humble',
    },
  },
] as const;
const EXTENDED_SAMPLE_VARIANT_IDS = [
  'balanced_reference',
  'marcus_win_now',
  'elena_rebuild',
] as const;

function parseSampleVariantIds(value: string | undefined): string[] | null {
  const ids = value?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];
  if (ids.length === 0) {
    return null;
  }

  const knownIds = new Set(ALL_VARIANTS.map((variant) => variant.id));
  const unknownIds = ids.filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`MBD_ONBOARDING_BALANCE_VARIANT_IDS contains unknown variants: ${unknownIds.join(', ')}.`);
  }

  return [...new Set(ids)];
}

function selectSampleVariants(
  sampleSeasons: number,
  variantIds: readonly string[] | null,
  fullMatrix: boolean,
): readonly OnboardingBalanceVariant[] {
  if (variantIds) {
    const selectedIds = new Set(variantIds);
    return ALL_VARIANTS.filter((variant) => selectedIds.has(variant.id));
  }

  if (sampleSeasons > 1 && !fullMatrix) {
    const selectedIds = new Set<string>(EXTENDED_SAMPLE_VARIANT_IDS);
    return ALL_VARIANTS.filter((variant) => selectedIds.has(variant.id));
  }

  return ALL_VARIANTS;
}

const SAMPLE_VARIANT_IDS = parseSampleVariantIds(process.env?.MBD_ONBOARDING_BALANCE_VARIANT_IDS);
const VARIANTS = selectSampleVariants(SAMPLE_SEASONS, SAMPLE_VARIANT_IDS, SAMPLE_FULL_MATRIX);

describe('onboarding balance variant matrix', () => {
  it('keeps the default one-season guard on the full five-variant matrix', () => {
    expect(selectSampleVariants(1, null, false).map((variant) => variant.id)).toEqual(
      ALL_VARIANTS.map((variant) => variant.id),
    );
  });

  it.runIf(SAMPLE_SEASONS > 1 && !SAMPLE_VARIANT_IDS && !SAMPLE_FULL_MATRIX)('defaults multi-season samples to the key attribution variants', () => {
    expect(VARIANTS.map((variant) => variant.id)).toEqual([...EXTENDED_SAMPLE_VARIANT_IDS]);
  });

  it('allows explicit variant overrides for focused attribution runs', () => {
    expect(selectSampleVariants(2, ['elena_prospect_push', 'marcus_value_hold'], false).map((variant) => variant.id)).toEqual([
      'elena_prospect_push',
      'marcus_value_hold',
    ]);
  });

  it('rejects misspelled explicit variant ids', () => {
    expect(() => parseSampleVariantIds('balanced_reference,missing_variant')).toThrow(
      'MBD_ONBOARDING_BALANCE_VARIANT_IDS contains unknown variants: missing_variant.',
    );
  });
});

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

async function loadWorkerHarness() {
  const [{ actionApi }, onboarding, helpers, identity, budget] = await Promise.all([
    import('./sim.worker.actions'),
    import('./sim.worker.onboarding'),
    import('./sim.worker.helpers'),
    import('./sim.worker.frontOfficeIdentity'),
    import('./sim.worker.setup'),
  ]);

  return {
    api: {
      ...actionApi,
      getRevisedOnboardingData: onboarding.getRevisedOnboardingData,
      applyStaffHires: onboarding.applyStaffHires,
      applyScoutingHire: onboarding.applyScoutingHire,
      completeRevisedOnboarding: onboarding.completeRevisedOnboarding,
    },
    requireState: helpers.requireState,
    setState: helpers.setState,
    getEffectiveScoutingAccuracy: identity.getEffectiveScoutingAccuracy,
    getTeamFreeAgencyAppealScore: budget.getTeamFreeAgencyAppealScore,
  };
}

function focusedScoutingDomain(focus: GMPhilosophy['scoutingFocus']): 'draft' | 'international' | 'pro' {
  return focus === 'pro_scouting' ? 'pro' : focus;
}

describe('revised onboarding payroll truth', () => {
  it('keeps Owner Meeting and Financial Playbook aligned with minor-league salary present', async () => {
    const harness = await loadWorkerHarness();
    harness.setState(null);
    harness.api.newGame({
      seed: 12_702,
      userTeamId: 'nym',
      gmName: 'Payroll Truth',
      difficulty: 'standard',
      saveSlot: 1,
      dayOneExperience: 'full',
    });
    const state = harness.requireState();
    const minor = state.players.find((player) =>
      player.teamId === state.userTeamId && player.rosterStatus !== 'MLB',
    )!;
    minor.contract = {
      ...minor.contract,
      annualSalary: 25,
      totalValue: 25 * Math.max(1, minor.contract.years),
    };

    const data = await harness.api.getRevisedOnboardingData('walt_kowalski');
    const ownerBudget = data.chapterData.owner.budgetOverview;
    const financialFlexibility = data.chapterData.financial.flexibility;

    expect(ownerBudget.currentPayroll).toBe(data.chapterData.financial.payroll.totalPayroll);
    expect(ownerBudget.availableSpace).toBe(financialFlexibility.availableSpace);
    expect(ownerBudget.luxuryTaxDistance).toBe(financialFlexibility.luxuryTaxRoom);
    expect(ownerBudget.narrativeSummary).not.toMatch(/carrying|tax bill/i);
    harness.setState(null);
  });
});

function advanceEntireOffseason(harness: Awaited<ReturnType<typeof loadWorkerHarness>>) {
  harness.api.proceedToOffseason();
  let guard = 0;

  while (!harness.requireState().offseasonState?.completed) {
    const progressed = harness.api.skipOffseasonPhase() ?? harness.api.advanceOffseason();
    expect(progressed).not.toBeNull();
    guard += 1;
    if (guard > 20) {
      throw new Error('Offseason progression exceeded the expected number of phases.');
    }
  }
}

async function completeVariantOnboarding(
  harness: Awaited<ReturnType<typeof loadWorkerHarness>>,
  variant: OnboardingBalanceVariant,
) {
  const data = await harness.api.getRevisedOnboardingData(variant.assistantGMId);
  const staffHires = {
    managerId: data.staffSlate.managerCandidates[0].id,
    pitchingCoachId: data.staffSlate.pitchingCoachCandidates[0].id,
    hittingCoachId: data.staffSlate.hittingCoachCandidates[0].id,
  };
  const scout = data.scoutingSlate.candidates.find((candidate) =>
    candidate.specialty === variant.philosophy.scoutingFocus,
  ) ?? data.scoutingSlate.candidates[0];

  await harness.api.applyStaffHires(staffHires);
  await harness.api.applyScoutingHire(scout.id);
  await harness.api.completeRevisedOnboarding({
    selectedAGMId: variant.assistantGMId,
    staffHires,
    scoutingHire: scout.id,
    gmPhilosophy: variant.philosophy,
  });
}

function readBalanceMetrics(
  harness: Awaited<ReturnType<typeof loadWorkerHarness>>,
  variant: OnboardingBalanceVariant,
): OnboardingBalanceMetrics {
  const state = harness.requireState();
  const owner = state.ownerState.get(state.userTeamId);
  const frontOffice = state.frontOfficeState.get(state.userTeamId);
  const reports = state.minorLeagueState.developmentReports.filter((entry) =>
    entry.teamId === state.userTeamId,
  );
  const ledger = state.minorLeagueState.developmentLedger.filter((entry) =>
    entry.teamId === state.userTeamId,
  );
  const activeDevelopmentSetbacks = state.minorLeagueState.activeDevelopmentSetbacks.filter((entry) => {
    const player = state.players.find((candidate) => candidate.id === entry.playerId);
    return player?.teamId === state.userTeamId;
  });
  const scouting = {
    draft: harness.getEffectiveScoutingAccuracy(state, 'draft').effectiveAccuracy,
    international: harness.getEffectiveScoutingAccuracy(state, 'international').effectiveAccuracy,
    pro: harness.getEffectiveScoutingAccuracy(state, 'pro').effectiveAccuracy,
  };
  const focusedDomain = focusedScoutingDomain(variant.philosophy.scoutingFocus);
  const offLaneAccuracy = average(
    (Object.entries(scouting) as Array<[keyof typeof scouting, number]>)
      .filter(([domain]) => domain !== focusedDomain)
      .map(([, value]) => value),
  );
  const flags = state.storyFlags.get(state.userTeamId) ?? [];

  return {
    ownerTrust: Math.round(average([owner?.patience ?? 50, owner?.confidence ?? 50])),
    ownerPressure: owner?.winNowPressure ?? 50,
    fanSentiment: state.fanSentiment.score,
    frontOfficeReputation: frontOffice?.reputation ?? 50,
    frontOfficeTrade: frontOffice?.tradeScore ?? 0,
    frontOfficeDraft: frontOffice?.draftScore ?? 0,
    freeAgentAppeal: harness.getTeamFreeAgencyAppealScore(state, state.userTeamId),
    avgProspectProgress: Number(average(ledger.map((entry) => entry.progressScore)).toFixed(2)),
    aheadOfCurveReports: reports.filter((entry) => entry.trajectory === 'ahead_of_curve').length,
    bustRiskReports: reports.filter((entry) => entry.trajectory === 'bust_risk').length,
    activeDevelopmentSetbacks: activeDevelopmentSetbacks.length,
    draftAccuracy: scouting.draft,
    internationalAccuracy: scouting.international,
    proAccuracy: scouting.pro,
    focusedScoutingAccuracy: scouting[focusedDomain],
    offLaneScoutingAccuracy: Number(offLaneAccuracy.toFixed(3)),
    monthlyConsequenceCount: flags.filter((flag) => flag.startsWith('front_office_monthly_')).length,
  };
}

async function runVariantSample(
  harness: Awaited<ReturnType<typeof loadWorkerHarness>>,
  variant: OnboardingBalanceVariant,
): Promise<OnboardingBalanceSample> {
  harness.setState(null);
  harness.api.newGame({
    seed: BALANCE_SEED,
    userTeamId: 'nym',
    gmName: 'Balance Tester',
    difficulty: 'standard',
    saveSlot: 1,
    dayOneExperience: 'full',
  });
  await completeVariantOnboarding(harness, variant);

  const baseline = readBalanceMetrics(harness, variant);
  const seasons: OnboardingBalanceMetrics[] = [];
  for (let seasonIndex = 0; seasonIndex < SAMPLE_SEASONS; seasonIndex += 1) {
    const regularSeason = harness.api.simToPlayoffs();
    expect(regularSeason.phase).toBe('playoffs');
    seasons.push(readBalanceMetrics(harness, variant));

    if (seasonIndex < SAMPLE_SEASONS - 1) {
      harness.api.simRemainingPlayoffs();
      advanceEntireOffseason(harness);
      const nextSeason = harness.api.startNextSeason();
      expect(nextSeason.phase).toBe('preseason');
    }
  }

  const final = seasons[seasons.length - 1]!;
  harness.setState(null);
  return {
    variantId: variant.id,
    assistantGMId: variant.assistantGMId,
    philosophy: variant.philosophy,
    baseline,
    seasons,
    final,
  };
}

function toCalibrationOnboardingBalanceSample(
  samples: readonly OnboardingBalanceSample[],
): CalibrationOnboardingBalanceSample {
  return {
    seed: BALANCE_SEED,
    seasonCount: SAMPLE_SEASONS,
    variants: samples.map((sample): CalibrationOnboardingBalanceVariantSample => ({
      variantId: sample.variantId,
      assistantGMId: sample.assistantGMId,
      developmentStyle: sample.philosophy.developmentStyle,
      scoutingFocus: sample.philosophy.scoutingFocus,
      baseline: sample.baseline,
      seasons: sample.seasons,
      final: sample.final,
    })),
  };
}

describe('onboarding consequence balance samples', () => {
  let samples: OnboardingBalanceSample[] = [];

  beforeAll(async () => {
    samples = [];
    const harness = await loadWorkerHarness();
    for (const variant of VARIANTS) {
      samples.push(await runVariantSample(harness, variant));
    }
    if (LOG_SAMPLE_SUMMARY) {
      const summary = summarizeOnboardingBalanceSample(toCalibrationOnboardingBalanceSample(samples));
      console.info('ONBOARDING_BALANCE_SUMMARY', JSON.stringify({
        seed: BALANCE_SEED,
        seasons: SAMPLE_SEASONS,
        summary,
        variants: samples.map((sample) => ({
          variantId: sample.variantId,
          baseline: sample.baseline,
          final: sample.final,
        })),
      }));
    }
  }, SAMPLE_TIMEOUT_MS);

  afterAll(async () => {
    vi.restoreAllMocks();
    const harness = await loadWorkerHarness();
    harness.setState(null);
  });

  it('runs deterministic season samples across onboarding variants', () => {
    expect(samples.map((sample) => sample.variantId)).toEqual(VARIANTS.map((variant) => variant.id));
    expect(samples.every((sample) => sample.seasons.length === SAMPLE_SEASONS)).toBe(true);
    expect(samples.every((sample) => sample.final.monthlyConsequenceCount >= 4)).toBe(true);
  });

  it('keeps owner, fan, and front-office outcomes meaningful without becoming wild', () => {
    const summary = summarizeOnboardingBalanceSample(toCalibrationOnboardingBalanceSample(samples));

    expect(summary.finalOwnerTrustRange).toBeGreaterThanOrEqual(6);
    expect(summary.finalOwnerTrustRange).toBeLessThanOrEqual(45);
    expect(summary.baselineFanSentimentRange).toBeGreaterThanOrEqual(4);
    expect(summary.baselineFanSentimentRange).toBeLessThanOrEqual(18);
    expect(summary.finalFrontOfficeReputationRange).toBeGreaterThanOrEqual(4);
    expect(summary.finalFrontOfficeReputationRange).toBeLessThanOrEqual(30);
    expect(summary.finalFreeAgentAppealRange).toBeGreaterThanOrEqual(8);
    expect(summary.finalFreeAgentAppealRange).toBeLessThanOrEqual(22);
  });

  it('keeps prospect and scouting consequences visible but bounded', () => {
    const summary = summarizeOnboardingBalanceSample(toCalibrationOnboardingBalanceSample(samples));

    if (SAMPLE_SEASONS === 1) {
      expect(summary.aggressiveVsPatientProspectProgressDelta).toBeGreaterThan(0);
      expect(summary.finalAvgProspectProgressRange).toBeGreaterThanOrEqual(2);
      expect(summary.finalAvgProspectProgressRange).toBeLessThanOrEqual(9);
    } else {
      expect(Math.abs(summary.aggressiveVsPatientProspectProgressDelta)).toBeLessThanOrEqual(8);
      expect(summary.finalAvgProspectProgressRange).toBeGreaterThanOrEqual(1);
      expect(summary.finalAvgProspectProgressRange).toBeLessThanOrEqual(14);
    }
    expect(summary.averageFocusedScoutingLift).toBeGreaterThanOrEqual(0.045);
    expect(summary.averageFocusedScoutingLift).toBeLessThanOrEqual(0.1);
  });
});
