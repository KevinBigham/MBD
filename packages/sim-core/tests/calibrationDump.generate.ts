// @vitest-environment node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCalibrationReport,
  renderCalibrationJson,
  renderCalibrationMarkdown,
} from '../src/index.js';
import type {
  AGMCandidateId,
  CalibrationOnboardingBalanceMetrics,
  CalibrationOnboardingBalanceSample,
  CalibrationOnboardingBalanceVariantSample,
  CalibrationWorkerSample,
  CalibrationWorkerSeasonMetrics,
  GMPhilosophy,
  PlayoffBracket,
  PlayoffSeriesState,
} from '../src/index.js';

const DEFAULT_SEED = 44_001;
const DEFAULT_SEASONS = 1;
const DEFAULT_WORKER_SEED_OFFSETS = [0, 1] as const;
const DEFAULT_WORKER_SEASONS = 1;
const DEFAULT_ONBOARDING_BALANCE_SEED = 12_701;
const DEFAULT_ONBOARDING_BALANCE_SEASONS = 1;
const DEFAULT_OUT = 'playtest-output/calibration.md';
const DEFAULT_JSON_OUT = 'playtest-output/calibration.json';
const TRADE_DEADLINE_DAY = 122;

type WorkerHarness = Awaited<ReturnType<typeof loadWorkerHarness>>;
type OnboardingBalanceMetrics = CalibrationOnboardingBalanceMetrics;

interface OnboardingBalanceVariant {
  readonly id: string;
  readonly assistantGMId: AGMCandidateId;
  readonly philosophy: GMPhilosophy;
}

interface OnboardingBalanceVariantRun {
  readonly variantId: string;
  readonly assistantGMId: AGMCandidateId;
  readonly philosophy: GMPhilosophy;
  readonly baseline: OnboardingBalanceMetrics;
  readonly seasons: readonly OnboardingBalanceMetrics[];
  readonly final: OnboardingBalanceMetrics;
}

const ONBOARDING_BALANCE_VARIANTS: readonly OnboardingBalanceVariant[] = [
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

function pickEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function defaultWorkerSeeds(baseSeed: number): number[] {
  if (!Number.isSafeInteger(baseSeed)) {
    throw new Error('PLAYTEST_WORKER_SEED must be a safe integer.');
  }
  return DEFAULT_WORKER_SEED_OFFSETS.map((offset) => baseSeed + offset);
}

function parseWorkerSeeds(value: string | undefined, fallbackSeeds: readonly number[]): number[] {
  const rawSeeds = value == null || value.trim() === ''
    ? fallbackSeeds
    : value.split(',').map((seed) => seed.trim()).filter(Boolean).map(Number);
  if (rawSeeds.length === 0 || rawSeeds.some((seed) => !Number.isSafeInteger(seed))) {
    throw new Error('PLAYTEST_WORKER_SEEDS must contain safe integer seeds.');
  }
  return [...rawSeeds];
}

function parseSafeInteger(value: string, envName: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${envName} must be a safe integer.`);
  }
  return parsed;
}

function parsePositiveSafeInteger(value: string, envName: string): number {
  const parsed = parseSafeInteger(value, envName);
  if (parsed < 1) {
    throw new Error(`${envName} must be at least 1.`);
  }
  return parsed;
}

function shouldIncludeOnboardingBalanceSample(value = process.env.PLAYTEST_ONBOARDING_BALANCE): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

function parseOnboardingBalanceVariantIds(value: string | undefined): string[] | null {
  const ids = value?.split(',').map((id) => id.trim()).filter(Boolean) ?? [];
  if (ids.length === 0) {
    return null;
  }

  const knownIds = new Set(ONBOARDING_BALANCE_VARIANTS.map((variant) => variant.id));
  const unknownIds = ids.filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    throw new Error(`PLAYTEST_ONBOARDING_BALANCE_VARIANT_IDS contains unknown variants: ${unknownIds.join(', ')}.`);
  }

  return [...new Set(ids)];
}

function selectOnboardingBalanceVariants(ids: readonly string[] | null): readonly OnboardingBalanceVariant[] {
  if (ids == null) {
    return ONBOARDING_BALANCE_VARIANTS;
  }

  const selectedIds = new Set(ids);
  return ONBOARDING_BALANCE_VARIANTS.filter((variant) => selectedIds.has(variant.id));
}

function defaultJsonOut(markdownOut: string): string {
  return markdownOut.endsWith('.md')
    ? `${markdownOut.slice(0, -3)}.json`
    : DEFAULT_JSON_OUT;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

async function loadWorkerHarness() {
  const [{ actionApi }, helpers, onboardingApi, identity, budget] = await Promise.all([
    import('../../../apps/web/src/workers/sim.worker.actions.ts'),
    import('../../../apps/web/src/workers/sim.worker.helpers.ts'),
    import('../../../apps/web/src/workers/sim.worker.onboarding.ts'),
    import('../../../apps/web/src/workers/sim.worker.frontOfficeIdentity.ts'),
    import('../../../apps/web/src/workers/sim.worker.setup.ts'),
  ]);

  return {
    actionApi,
    onboardingApi,
    requireState: helpers.requireState,
    setState: helpers.setState,
    getEffectiveScoutingAccuracy: identity.getEffectiveScoutingAccuracy,
    getTeamFreeAgencyAppealScore: budget.getTeamFreeAgencyAppealScore,
  };
}

function focusedScoutingDomain(focus: GMPhilosophy['scoutingFocus']): 'draft' | 'international' | 'pro' {
  return focus === 'pro_scouting' ? 'pro' : focus;
}

function isSeasonTradeTimestamp(timestamp: string, season: number): boolean {
  return new RegExp(`^S${season}D\\d+$`).test(timestamp);
}

function isDeadlineTradeTimestamp(timestamp: string, season: number): boolean {
  const match = new RegExp(`^S${season}D(\\d+)$`).exec(timestamp);
  if (!match) {
    return false;
  }
  const day = Number(match[1]);
  return day >= 92 && day <= TRADE_DEADLINE_DAY;
}

function advanceEntireOffseason(harness: WorkerHarness) {
  harness.actionApi.proceedToOffseason();
  const beforeClock = harness.requireState().players.map((player) => ({
    id: player.id,
    teamId: player.teamId,
    years: player.contract.years,
    teamOption: player.contract.teamOption,
  }));
  let naturalContractExpiries = 0;
  let freeAgencyMarketSize = 0;
  let guard = 0;

  while (!harness.requireState().offseasonState?.completed) {
    const phaseBefore = harness.requireState().offseasonState?.currentPhase;
    const progressed = harness.actionApi.skipOffseasonPhase() ?? harness.actionApi.advanceOffseason();
    expect(progressed, 'worker calibration offseason must keep moving').not.toBeNull();
    const state = harness.requireState();
    if (naturalContractExpiries === 0 && state.offseasonState) {
      const afterClock = new Map(state.players.map((player) => [player.id, player] as const));
      naturalContractExpiries = beforeClock.filter((player) => (
        player.years === 1
        && !player.teamOption
        && afterClock.get(player.id)?.contract.years === 0
      )).length;
    }
    if (phaseBefore === 'qualifying_offers') {
      const marketEntryIds = [
        ...(state.freeAgencyMarket?.freeAgents.map((entry) => entry.player.id) ?? []),
        ...(state.freeAgencyMarket?.signedPlayers.map((entry) => entry.player.id) ?? []),
      ];
      if (new Set(marketEntryIds).size !== marketEntryIds.length) {
        throw new Error('Worker calibration found duplicate free-agency entry membership.');
      }
      freeAgencyMarketSize = marketEntryIds.length;
    }
    guard += 1;
    if (guard > 20) {
      throw new Error('Worker calibration offseason progression exceeded the expected number of phases.');
    }
  }

  const afterAssignments = new Map(harness.requireState().players.map((player) => [player.id, player.teamId] as const));
  const offseasonAssignmentChurn = beforeClock.filter((player) =>
    afterAssignments.has(player.id) && afterAssignments.get(player.id) !== player.teamId,
  ).length;
  return { freeAgencyMarketSize, naturalContractExpiries, offseasonAssignmentChurn };
}

function completedPlayoffSeries(bracket: PlayoffBracket): PlayoffSeriesState[] {
  const byId = new Map<string, PlayoffSeriesState>();
  for (const round of bracket.completedRounds) {
    for (const series of round.series) {
      byId.set(series.id, series);
    }
  }
  for (const series of bracket.currentRoundSeries) {
    if (series.status === 'complete') {
      byId.set(series.id, series);
    }
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function lowerSeedSeriesWins(bracket: PlayoffBracket): number {
  return completedPlayoffSeries(bracket).filter((series) =>
    series.winnerId === series.lowerSeed.teamId,
  ).length;
}

function championSeed(bracket: PlayoffBracket): number | null {
  return bracket.seeds.find((seed) => seed.teamId === bracket.champion)?.seed ?? null;
}

function captureRegularSeasonMetrics(harness: WorkerHarness, season: number) {
  const state = harness.requireState();
  const regularSeasonTrades = state.tradeState.tradeHistory.filter((entry) =>
    isSeasonTradeTimestamp(entry.timestamp, season),
  );
  const seasonStats = [...state.seasonState.playerSeasonStats.values()];
  const developmentLedger = state.minorLeagueState.developmentLedger;
  const developmentReports = state.minorLeagueState.developmentReports;

  return {
    activeInjuriesAtPlayoffStart: state.injuries.size,
    injuredPlayers: seasonStats.filter((entry) => (entry.gamesMissedToInjury ?? 0) > 0).length,
    gamesMissedToInjury: seasonStats.reduce((sum, entry) => sum + (entry.gamesMissedToInjury ?? 0), 0),
    regularSeasonTrades: regularSeasonTrades.length,
    deadlineTrades: regularSeasonTrades.filter((entry) =>
      isDeadlineTradeTimestamp(entry.timestamp, season),
    ).length,
    averageProspectProgress: Number(average(developmentLedger.map((entry) => entry.progressScore)).toFixed(2)),
    aheadOfCurveReports: developmentReports.filter((entry) => entry.trajectory === 'ahead_of_curve').length,
    bustRiskReports: developmentReports.filter((entry) => entry.trajectory === 'bust_risk').length,
    activeDevelopmentSetbacks: state.minorLeagueState.activeDevelopmentSetbacks.length,
  };
}

function captureOffseasonMetrics(harness: WorkerHarness) {
  const results = harness.requireState().offseasonState?.phaseResults;
  if (!results) {
    throw new Error('Expected worker calibration to have completed offseason phase results.');
  }

  return {
    freeAgentSignings: results.freeAgentSignings.length,
    meaningfulFreeAgentSignings: results.freeAgentSignings.filter((entry) => entry.annualSalary >= 10).length,
    topFreeAgentAav: results.freeAgentSignings.reduce((max, entry) => Math.max(max, entry.annualSalary), 0),
    acceptedExtensions: results.extensions.filter((entry) => entry.status === 'accepted').length,
    rejectedExtensions: results.extensions.filter((entry) => entry.status === 'rejected').length,
  };
}

async function buildWorkerCalibrationSample(seed: number, seasonCount: number): Promise<CalibrationWorkerSample> {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(seasonCount) || seasonCount < 1) {
    throw new Error('Worker calibration requires a safe integer seed and at least one sample season.');
  }

  const harness = await loadWorkerHarness();
  harness.setState(null);

  try {
    harness.actionApi.newGame({
      seed,
      userTeamId: 'nym',
      gmName: 'Calibration Tester',
      difficulty: 'standard',
      saveSlot: 1,
    });

    const seasons: CalibrationWorkerSeasonMetrics[] = [];
    for (let seasonIndex = 0; seasonIndex < seasonCount; seasonIndex += 1) {
      const regularSeason = harness.actionApi.simToPlayoffs();
      expect(regularSeason.phase, 'worker calibration must reach playoffs').toBe('playoffs');

      const season = harness.requireState().season;
      const regularSeasonMetrics = captureRegularSeasonMetrics(harness, season);
      const playoffResult = harness.actionApi.simRemainingPlayoffs();
      expect(playoffResult.phase, 'worker calibration playoff sim must stay in playoff phase').toBe('playoffs');
      const bracket = harness.requireState().playoffBracket;
      if (!bracket?.champion) {
        throw new Error('Expected worker calibration playoff bracket to produce a champion.');
      }

      const goal11Metrics = advanceEntireOffseason(harness);
      const offseasonMetrics = captureOffseasonMetrics(harness);
      seasons.push({
        seed,
        season,
        ...regularSeasonMetrics,
        ...offseasonMetrics,
        ...goal11Metrics,
        playoffTeams: bracket.seeds.length,
        championSeed: championSeed(bracket),
        lowerSeedSeriesWins: lowerSeedSeriesWins(bracket),
      });

      if (seasonIndex < seasonCount - 1) {
        const nextSeason = harness.actionApi.startNextSeason();
        expect(nextSeason.phase, 'worker calibration must roll to preseason for the next sample season').toBe('preseason');
      }
    }

    return {
      seed,
      seasonCount,
      seasons,
    };
  } finally {
    harness.setState(null);
  }
}

async function buildWorkerCalibrationSamples(
  seeds: readonly number[],
  seasonsPerSeed: number,
): Promise<CalibrationWorkerSample> {
  if (seeds.length === 0) {
    throw new Error('Worker calibration requires at least one seed.');
  }

  const seasons: CalibrationWorkerSeasonMetrics[] = [];
  for (const seed of seeds) {
    const sample = await buildWorkerCalibrationSample(seed, seasonsPerSeed);
    seasons.push(...sample.seasons);
  }

  return {
    seed: seeds[0]!,
    seeds: [...seeds],
    seasonCount: seasons.length,
    seasonsPerSeed,
    seasons,
  };
}

function completeVariantOnboarding(
  harness: WorkerHarness,
  variant: OnboardingBalanceVariant,
) {
  const data = harness.onboardingApi.getRevisedOnboardingData(variant.assistantGMId);
  const staffHires = {
    managerId: data.staffSlate.managerCandidates[0].id,
    pitchingCoachId: data.staffSlate.pitchingCoachCandidates[0].id,
    hittingCoachId: data.staffSlate.hittingCoachCandidates[0].id,
  };
  const scout = data.scoutingSlate.candidates.find((candidate) =>
    candidate.specialty === variant.philosophy.scoutingFocus,
  ) ?? data.scoutingSlate.candidates[0];

  harness.onboardingApi.applyStaffHires(staffHires);
  harness.onboardingApi.applyScoutingHire(scout.id);
  harness.onboardingApi.completeRevisedOnboarding({
    selectedAGMId: variant.assistantGMId,
    staffHires,
    scoutingHire: scout.id,
    gmPhilosophy: variant.philosophy,
  });
}

function readOnboardingBalanceMetrics(
  harness: WorkerHarness,
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

async function buildOnboardingBalanceVariantRun(
  harness: WorkerHarness,
  seed: number,
  seasonCount: number,
  variant: OnboardingBalanceVariant,
): Promise<OnboardingBalanceVariantRun> {
  harness.setState(null);

  try {
    harness.actionApi.newGame({
      seed,
      userTeamId: 'nym',
      gmName: 'Balance Tester',
      difficulty: 'standard',
      saveSlot: 1,
      dayOneExperience: 'full',
    });
    completeVariantOnboarding(harness, variant);

    const baseline = readOnboardingBalanceMetrics(harness, variant);
    const seasons: OnboardingBalanceMetrics[] = [];
    for (let seasonIndex = 0; seasonIndex < seasonCount; seasonIndex += 1) {
      const regularSeason = harness.actionApi.simToPlayoffs();
      expect(regularSeason.phase, 'onboarding balance sample must reach playoffs').toBe('playoffs');
      seasons.push(readOnboardingBalanceMetrics(harness, variant));

      if (seasonIndex < seasonCount - 1) {
        harness.actionApi.simRemainingPlayoffs();
        advanceEntireOffseason(harness);
        const nextSeason = harness.actionApi.startNextSeason();
        expect(nextSeason.phase, 'onboarding balance sample must roll to preseason for the next season').toBe('preseason');
      }
    }

    return {
      variantId: variant.id,
      assistantGMId: variant.assistantGMId,
      philosophy: variant.philosophy,
      baseline,
      seasons,
      final: seasons[seasons.length - 1]!,
    };
  } finally {
    harness.setState(null);
  }
}

async function buildOnboardingBalanceSample(
  seed: number,
  seasonCount: number,
  variantIds: readonly string[] | null,
): Promise<CalibrationOnboardingBalanceSample> {
  if (!Number.isSafeInteger(seed)) {
    throw new Error('PLAYTEST_ONBOARDING_BALANCE_SEED must be a safe integer.');
  }
  if (!Number.isSafeInteger(seasonCount) || seasonCount < 1) {
    throw new Error('PLAYTEST_ONBOARDING_BALANCE_YEARS must be at least 1.');
  }

  const variants = selectOnboardingBalanceVariants(variantIds);
  if (variants.length === 0) {
    throw new Error('Onboarding balance sample requires at least one variant.');
  }

  const harness = await loadWorkerHarness();
  const runs: OnboardingBalanceVariantRun[] = [];
  for (const variant of variants) {
    runs.push(await buildOnboardingBalanceVariantRun(harness, seed, seasonCount, variant));
  }

  return {
    seed,
    seasonCount,
    variants: runs.map((run): CalibrationOnboardingBalanceVariantSample => ({
      variantId: run.variantId,
      assistantGMId: run.assistantGMId,
      developmentStyle: run.philosophy.developmentStyle,
      scoutingFocus: run.philosophy.scoutingFocus,
      baseline: run.baseline,
      seasons: run.seasons,
      final: run.final,
    })),
  };
}

describe('calibration dump worker seed parsing', () => {
  it('defaults to adjacent deterministic worker seeds', () => {
    expect(defaultWorkerSeeds(44_001)).toEqual([44_001, 44_002]);
  });

  it('parses comma-delimited worker seed overrides', () => {
    expect(parseWorkerSeeds('44001, 45001, 46001', [1, 2])).toEqual([44_001, 45_001, 46_001]);
  });

  it('rejects unsafe worker seed overrides', () => {
    expect(() => parseWorkerSeeds('44001, nope', [44_001, 44_002])).toThrow(
      'PLAYTEST_WORKER_SEEDS must contain safe integer seeds.',
    );
  });
});

describe('calibration dump onboarding balance options', () => {
  it('keeps onboarding balance sampling disabled unless explicitly requested', () => {
    expect(shouldIncludeOnboardingBalanceSample('')).toBe(false);
    expect(shouldIncludeOnboardingBalanceSample('0')).toBe(false);
    expect(shouldIncludeOnboardingBalanceSample('1')).toBe(true);
    expect(shouldIncludeOnboardingBalanceSample('true')).toBe(true);
  });

  it('parses and validates onboarding balance variant filters', () => {
    expect(parseOnboardingBalanceVariantIds(undefined)).toBeNull();
    expect(parseOnboardingBalanceVariantIds('balanced_reference, marcus_win_now')).toEqual([
      'balanced_reference',
      'marcus_win_now',
    ]);
    expect(() => parseOnboardingBalanceVariantIds('balanced_reference, mystery')).toThrow(
      'PLAYTEST_ONBOARDING_BALANCE_VARIANT_IDS contains unknown variants: mystery.',
    );
  });

  it('requires safe positive onboarding sample season counts', () => {
    expect(parsePositiveSafeInteger('2', 'PLAYTEST_ONBOARDING_BALANCE_YEARS')).toBe(2);
    expect(() => parsePositiveSafeInteger('0', 'PLAYTEST_ONBOARDING_BALANCE_YEARS')).toThrow(
      'PLAYTEST_ONBOARDING_BALANCE_YEARS must be at least 1.',
    );
  });
});

describe.runIf(process.env.MBD_PLAYTEST_DUMP === '1')('calibration dump', () => {
  it('writes paired calibration markdown and JSON reports', async () => {
    const seed = Number(pickEnv('PLAYTEST_SEED', String(DEFAULT_SEED)));
    const seasons = Number(pickEnv('PLAYTEST_YEARS', String(DEFAULT_SEASONS)));
    const workerSeed = Number(pickEnv('PLAYTEST_WORKER_SEED', String(seed)));
    const workerSeeds = parseWorkerSeeds(process.env.PLAYTEST_WORKER_SEEDS, defaultWorkerSeeds(workerSeed));
    const workerSeasons = Number(pickEnv('PLAYTEST_WORKER_YEARS', String(DEFAULT_WORKER_SEASONS)));
    const out = pickEnv('PLAYTEST_OUT', DEFAULT_OUT);
    const jsonOut = pickEnv('PLAYTEST_JSON_OUT', defaultJsonOut(out));
    const onboardingBalanceSample = shouldIncludeOnboardingBalanceSample()
      ? await buildOnboardingBalanceSample(
        parseSafeInteger(
          pickEnv('PLAYTEST_ONBOARDING_BALANCE_SEED', String(DEFAULT_ONBOARDING_BALANCE_SEED)),
          'PLAYTEST_ONBOARDING_BALANCE_SEED',
        ),
        parsePositiveSafeInteger(
          pickEnv('PLAYTEST_ONBOARDING_BALANCE_YEARS', String(DEFAULT_ONBOARDING_BALANCE_SEASONS)),
          'PLAYTEST_ONBOARDING_BALANCE_YEARS',
        ),
        parseOnboardingBalanceVariantIds(process.env.PLAYTEST_ONBOARDING_BALANCE_VARIANT_IDS),
      )
      : null;

    const workerSample = await buildWorkerCalibrationSamples(workerSeeds, workerSeasons);
    const report = buildCalibrationReport({ seed, seasonCount: seasons }, {
      workerSample,
      onboardingBalanceSample,
    });
    const markdown = renderCalibrationMarkdown(report);
    const json = renderCalibrationJson(report);
    const markdownPath = resolve(process.cwd(), out);
    const jsonPath = resolve(process.cwd(), jsonOut);
    await mkdir(dirname(markdownPath), { recursive: true });
    await mkdir(dirname(jsonPath), { recursive: true });
    await writeFile(markdownPath, markdown, 'utf8');
    await writeFile(jsonPath, json, 'utf8');

    expect(markdown).toContain('Calibration Dump');
    expect(markdown).toContain('Target Bands');
    expect(markdown).toContain('Worker and Offseason Sample');
    expect(markdown).toContain('Seeds 44001, 44002, 2 total seasons (1 per seed).');
    expect(json).toContain('"bandResults"');
    expect(json).toContain('"workerSample"');
    expect(json).toContain('"seeds"');
    if (shouldIncludeOnboardingBalanceSample()) {
      expect(markdown).toContain('Onboarding Balance Sample');
      expect(json).toContain('"onboardingBalanceSample"');
    }
  }, shouldIncludeOnboardingBalanceSample() ? 420_000 : 60_000);
});
