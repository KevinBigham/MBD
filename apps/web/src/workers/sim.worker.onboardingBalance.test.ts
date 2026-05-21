// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AGMCandidateId, GMPhilosophy } from '@mbd/contracts';

declare const process: { env?: Record<string, string | undefined> };

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  createBranchSave: vi.fn(),
  deleteSaveById: vi.fn(),
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

const BALANCE_SEED = 12_701;
const SAMPLE_SEASONS = Number(process.env?.MBD_ONBOARDING_BALANCE_SAMPLE_SEASONS ?? 1);
const SAMPLE_TIMEOUT_MS = SAMPLE_SEASONS > 1 ? 720_000 : 360_000;
const SAMPLE_VARIANT_IDS = process.env?.MBD_ONBOARDING_BALANCE_VARIANT_IDS
  ?.split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const LOG_SAMPLE_SUMMARY = process.env?.MBD_ONBOARDING_BALANCE_LOG === '1';

interface OnboardingBalanceVariant {
  id: string;
  assistantGMId: AGMCandidateId;
  philosophy: GMPhilosophy;
}

interface OnboardingBalanceMetrics {
  ownerTrust: number;
  ownerPressure: number;
  fanSentiment: number;
  frontOfficeReputation: number;
  frontOfficeTrade: number;
  frontOfficeDraft: number;
  freeAgentAppeal: number;
  avgProspectProgress: number;
  aheadOfCurveReports: number;
  bustRiskReports: number;
  activeDevelopmentSetbacks: number;
  draftAccuracy: number;
  internationalAccuracy: number;
  proAccuracy: number;
  focusedScoutingAccuracy: number;
  offLaneScoutingAccuracy: number;
  monthlyConsequenceCount: number;
}

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
const VARIANTS = SAMPLE_VARIANT_IDS
  ? ALL_VARIANTS.filter((variant) => SAMPLE_VARIANT_IDS.includes(variant.id))
  : ALL_VARIANTS;

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function range(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

async function loadWorkerHarness() {
  const { api } = await import('./sim.worker');
  const helpers = await import('./sim.worker.helpers');
  const identity = await import('./sim.worker.frontOfficeIdentity');
  const budget = await import('./sim.worker.setup');

  return {
    api,
    requireState: helpers.requireState,
    setState: helpers.setState,
    getEffectiveScoutingAccuracy: identity.getEffectiveScoutingAccuracy,
    getTeamFreeAgencyAppealScore: budget.getTeamFreeAgencyAppealScore,
  };
}

function focusedScoutingDomain(focus: GMPhilosophy['scoutingFocus']): 'draft' | 'international' | 'pro' {
  return focus === 'pro_scouting' ? 'pro' : focus;
}

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

async function runVariantSample(variant: OnboardingBalanceVariant): Promise<OnboardingBalanceSample> {
  vi.resetModules();
  const harness = await loadWorkerHarness();
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

describe('onboarding consequence balance samples', () => {
  let samples: OnboardingBalanceSample[] = [];

  beforeAll(async () => {
    samples = [];
    for (const variant of VARIANTS) {
      samples.push(await runVariantSample(variant));
    }
    if (LOG_SAMPLE_SUMMARY) {
      console.info('ONBOARDING_BALANCE_SUMMARY', JSON.stringify({
        seed: BALANCE_SEED,
        seasons: SAMPLE_SEASONS,
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
    const baselines = samples.map((sample) => sample.baseline);
    const finals = samples.map((sample) => sample.final);

    expect(range(finals.map((entry) => entry.ownerTrust))).toBeGreaterThanOrEqual(6);
    expect(range(finals.map((entry) => entry.ownerTrust))).toBeLessThanOrEqual(SAMPLE_SEASONS > 1 ? 45 : 34);
    expect(range(baselines.map((entry) => entry.fanSentiment))).toBeGreaterThanOrEqual(4);
    expect(range(baselines.map((entry) => entry.fanSentiment))).toBeLessThanOrEqual(18);
    expect(range(finals.map((entry) => entry.frontOfficeReputation))).toBeGreaterThanOrEqual(4);
    expect(range(finals.map((entry) => entry.frontOfficeReputation))).toBeLessThanOrEqual(30);
    expect(range(finals.map((entry) => entry.freeAgentAppeal))).toBeGreaterThanOrEqual(8);
    expect(range(finals.map((entry) => entry.freeAgentAppeal))).toBeLessThanOrEqual(22);
  });

  it('keeps prospect and scouting consequences visible but bounded', () => {
    const finals = samples.map((sample) => sample.final);
    const aggressive = samples.filter((sample) => sample.philosophy.developmentStyle === 'aggressive');
    const patient = samples.filter((sample) => sample.philosophy.developmentStyle === 'patient');
    const aggressiveProgress = average(aggressive.map((sample) => sample.final.avgProspectProgress));
    const patientProgress = average(patient.map((sample) => sample.final.avgProspectProgress));
    const averageScoutingLift = average(
      finals.map((entry) => entry.focusedScoutingAccuracy - entry.offLaneScoutingAccuracy),
    );

    expect(aggressiveProgress).toBeGreaterThan(patientProgress);
    expect(range(finals.map((entry) => entry.avgProspectProgress))).toBeGreaterThanOrEqual(2);
    expect(range(finals.map((entry) => entry.avgProspectProgress))).toBeLessThanOrEqual(9);
    expect(averageScoutingLift).toBeGreaterThanOrEqual(0.045);
    expect(averageScoutingLift).toBeLessThanOrEqual(0.1);
  });
});
