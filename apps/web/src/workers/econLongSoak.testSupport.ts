import type { GameSnapshot } from '@mbd/contracts';
import {
  TEAMS,
  getRosterComplianceIssues,
  runInvariantChecks,
  type FreeAgent,
  type OffseasonPhase,
} from '@mbd/sim-core';
import { actionApi, applyAISigningProgress } from './sim.worker.actions.js';
import {
  requireState,
  setState,
  skipOffseasonPhaseWithAI,
  type FullGameState,
} from './sim.worker.helpers.js';
import { calculateStateTeamPayroll } from './sim.worker.tradeFinance.js';
import { exportGameSnapshot, importGameSnapshot } from './snapshot.js';
import {
  ECON_LONG_SOAK_HORIZON,
  ECON_LONG_SOAK_CALIBRATION_SEEDS,
  ECON_LONG_SOAK_DIAGNOSTIC_MODE,
  assertAnnualRow,
  assertPayrollRows,
  buildInheritedCandidateDiagnostic,
  buildTradeFinanceAuditProjection,
  buildLongSoakTrends,
  buildMeasurementCandidateViolations,
  deriveNaturalMlbExpirationEvidence,
  deriveOptionOutcomeEvidence,
  sha256,
  stableJson,
  summarizePayroll,
  summarizeContractTerms,
  type ContractOrigin,
  type EconLongSoakAnnualRow,
  type EconLongSoakContractTerm,
  type EconLongSoakMode,
  type EconLongSoakPayrollRow,
  type EconLongSoakSeed,
  type FreeAgencyTier,
} from './econLongSoak.metrics.js';
import {
  createEconLongSoakReceipt,
  type EconLongSoakCheckpoint,
  type EconLongSoakReceipt,
} from './econLongSoak.receipts.js';
import {
  LONG_SAVE_PROFILE_STAGE_ORDER,
  finishLongSaveProfileStage,
  profileLongSaveStage,
  runWithLongSaveProfiler,
  startLongSaveProfileStage,
  type LongSaveProfileReport,
  type LongSaveProfileStage,
} from './sim.worker.longSaveProfiler.js';

export interface EconLongSoakRunOptions {
  seed: EconLongSoakSeed;
  mode: EconLongSoakMode;
  horizon?: number;
  sourceRevision: string;
  onProgress?: (marker: EconLongSoakProgressMarker) => void;
  onCheckpoint?: (capture: EconLongSoakCheckpointCapture) => void;
}

export interface EconLongSoakProgressMarker {
  phase: 'primary' | 'replay';
  status: 'start' | 'complete';
  seasonIndex: number;
}

export const ECON_LONG_SOAK_CHECKPOINT_SEASONS = [10, 15, 20, 30] as const;

export interface EconLongSoakCheckpointCapture {
  checkpoint: EconLongSoakCheckpoint;
  snapshot: GameSnapshot;
  row: EconLongSoakAnnualRow;
  previousRemainingIds: string[];
  baselinePopulation: number;
  baselineRosterInvariantCategories: string[];
}

interface RunContext {
  previousRemainingIds: Set<string>;
  baselineRosterInvariantCategories: string[];
}

export interface SeasonRunResult {
  row: EconLongSoakAnnualRow;
  remainingIds: Set<string>;
}

const OFFSEASON_PROFILE_STAGE: Record<OffseasonPhase, LongSaveProfileStage> = {
  season_review: 'offseason.season_review',
  arbitration: 'offseason.arbitration',
  tender_nontender: 'offseason.tender_nontender',
  extensions: 'offseason.extensions',
  qualifying_offers: 'offseason.qualifying_offers',
  free_agency: 'offseason.free_agency',
  draft: 'offseason.draft',
  protection_audit: 'offseason.protection_audit',
  rule5_draft: 'offseason.rule5_draft',
  international_signing: 'offseason.international_signing',
  coaching_changes: 'offseason.coaching_changes',
  spring_training: 'offseason.spring_training',
};

interface ContractClockProjectionRow {
  playerId: string;
  teamId: string;
  rosterStatus: string;
  years: number;
  annualSalary: number;
  totalValue: number;
  playerOption: boolean;
  teamOption: boolean;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function rosterInvariantCategories(state: FullGameState): string[] {
  const core = runInvariantChecks({
    players: state.players,
    rosterStates: [...state.rosterStates.values()],
  }).violations.map((violation) => `core:${violation.type}`);
  const compliance = [...state.rosterStates.entries()].flatMap(([teamId, rosterState]) => (
    getRosterComplianceIssues(
      state.players.filter((player) => player.teamId === teamId),
      rosterState,
      state.day,
    ).map((issue) => `roster:${issue.code}`)
  ));
  return sortedUnique([...core, ...compliance]);
}

function contractClockProjection(state: FullGameState): ContractClockProjectionRow[] {
  return state.players.map((player) => ({
    playerId: player.id,
    teamId: player.teamId,
    rosterStatus: player.rosterStatus,
    years: player.contract.years,
    annualSalary: player.contract.annualSalary,
    totalValue: player.contract.totalValue ?? player.contract.annualSalary * player.contract.years,
    playerOption: player.contract.playerOption ?? false,
    teamOption: player.contract.teamOption ?? false,
  })).sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function lifecycleReceipt(
  sourceMarker: string,
  applicationCount: number,
  subjectIds: readonly string[],
  sourceEvidence: unknown,
) {
  const sortedIds = sortedUnique(subjectIds);
  const sourceDigest = sha256(sourceEvidence);
  return {
    sourceMarker,
    applicationCount,
    subjectIds: sortedIds,
    sourceDigest,
    evidenceDigest: sha256({ applicationCount, sourceMarker, sourceDigest, subjectIds: sortedIds }),
  };
}

function deterministicSnapshotProjection(snapshot: GameSnapshot) {
  const { performanceDiagnostics: _runtimeDiagnostics, ...deterministic } = snapshot;
  return deterministic;
}

function snapshotDigest(state: FullGameState): string {
  return sha256(deterministicSnapshotProjection(exportGameSnapshot(state)));
}

function rngDigest(state: FullGameState): string {
  return sha256(state.rng.getState());
}

function captureCheckpoint(seasonIndex: 10 | 15 | 20 | 30): {
  checkpoint: EconLongSoakCheckpoint;
  snapshot: GameSnapshot;
} {
  const state = requireState();
  const snapshot = exportGameSnapshot(state);
  if (snapshot.schemaVersion !== 35) throw new Error(`Checkpoint ${seasonIndex} exported non-v35 snapshot.`);
  const restored = importGameSnapshot(structuredClone(snapshot));
  const stateDigest = sha256(deterministicSnapshotProjection(snapshot));
  const roundTripStateDigest = sha256(deterministicSnapshotProjection(exportGameSnapshot(restored)));
  const checkpoint = {
    seasonIndex,
    stateDigest,
    rngDigest: rngDigest(state),
    roundTripStateDigest,
    roundTripRngDigest: rngDigest(restored),
  };
  if (checkpoint.stateDigest !== checkpoint.roundTripStateDigest
    || checkpoint.rngDigest !== checkpoint.roundTripRngDigest) {
    throw new Error(`Checkpoint ${seasonIndex} failed exact v35 state/RNG preservation.`);
  }
  return { checkpoint, snapshot };
}

function payrollRows(state: FullGameState): EconLongSoakPayrollRow[] {
  return TEAMS.map((team) => {
    const payroll = calculateStateTeamPayroll(state, team.id);
    const owner = state.ownerState.get(team.id);
    if (!owner) throw new Error(`Missing owner inputs for ${team.id}.`);
    return {
      teamId: team.id,
      mlbPayroll: payroll.mlbPayroll,
      minorsPayroll: payroll.minorsPayroll,
      totalPayroll: payroll.totalPayroll,
      luxuryTaxPayroll: payroll.luxuryTaxPayroll,
      deadMoney: payroll.deadMoney,
      retainedSalaryCharges: payroll.retainedSalaryCharges,
      cashConsiderationCharges: payroll.cashConsiderationCharges,
      releasedContractCharges: payroll.releasedContractCharges,
      acquiredSalaryCredits: payroll.acquiredSalaryCredits,
      annualBudget: owner.annualBudget ?? 0,
      payrollCap: owner.payrollCap ?? 0,
    };
  }).sort((left, right) => left.teamId.localeCompare(right.teamId));
}

function freeAgencyTierIds(rows: readonly FreeAgent[]): Record<FreeAgencyTier, string[]> {
  const tiers: Record<FreeAgencyTier, string[]> = {
    elite: [], high: [], moderate: [], low: [], fringe: [],
  };
  for (const row of rows) tiers[row.demandLevel].push(row.player.id);
  for (const tier of Object.keys(tiers) as FreeAgencyTier[]) tiers[tier].sort();
  return tiers;
}

function contractTerms(
  canonicalPlayers: ReadonlyMap<string, {
    teamId: string;
    contract: { years: number; annualSalary: number; totalValue?: number | null };
  }>,
  phaseResults: NonNullable<FullGameState['offseasonState']>['phaseResults'],
  marketExhaustedIds: ReadonlySet<string>,
): EconLongSoakContractTerm[] {
  const byPlayer = new Map<string, EconLongSoakContractTerm>();
  const add = (
    playerId: string,
    teamId: string,
    origin: ContractOrigin,
    years: number,
    annualSalary: number,
    totalValue: number,
  ) => {
    if (byPlayer.has(playerId)) {
      throw new Error(`Created contract ${playerId} has more than one surviving origin.`);
    }
    const player = canonicalPlayers.get(playerId);
    if (!player) throw new Error(`Contract origin ${origin} references missing ${playerId}.`);
    byPlayer.set(playerId, {
      playerId,
      teamId,
      origin,
      years,
      annualSalary,
      totalValue,
      canonicalYears: player.contract.years,
      canonicalAnnualSalary: player.contract.annualSalary,
      canonicalTotalValue: player.contract.totalValue ?? player.contract.annualSalary * player.contract.years,
    });
  };

  for (const signing of phaseResults.freeAgentSignings) {
    add(
      signing.playerId,
      signing.teamId,
      marketExhaustedIds.has(signing.playerId) ? 'market_exhausted' : 'free_agency',
      signing.years,
      signing.annualSalary,
      signing.totalValue,
    );
  }
  for (const extension of phaseResults.extensions.filter((entry) => entry.status === 'accepted')) {
    add(extension.playerId, extension.teamId, 'accepted_extension', extension.years, extension.annualSalary, extension.totalValue);
  }
  for (const offer of phaseResults.qualifyingOffers.filter((entry) => entry.status === 'accepted')) {
    const player = canonicalPlayers.get(offer.playerId);
    if (player) add(offer.playerId, offer.teamId, 'accepted_qualifying_offer', 1, offer.amount, offer.amount);
  }
  for (const award of phaseResults.arbitrationResolved) {
    // A later extension, accepted QO, non-tender, or FA contract supersedes
    // the arbitration award. Only the one exact final contract origin survives
    // in the created-term union.
    if (byPlayer.has(award.playerId) || phaseResults.nonTenderedPlayers.includes(award.playerId)) continue;
    add(award.playerId, award.teamId, 'arbitration', 1, award.newSalary, award.newSalary);
  }
  for (const playerId of phaseResults.tenderedPlayers) {
    if (byPlayer.has(playerId)) continue;
    const player = canonicalPlayers.get(playerId);
    if (player) add(
      playerId,
      player.teamId,
      'tender_renewal',
      player.contract.years,
      player.contract.annualSalary,
      player.contract.totalValue ?? player.contract.annualSalary * player.contract.years,
    );
  }
  return [...byPlayer.values()].sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function assertExactEntrants(
  baselineIds: ReadonlySet<string>,
  finalIds: ReadonlySet<string>,
  draftIds: readonly string[],
  ifaIds: readonly string[],
): void {
  const entrants = sortedUnique([...finalIds].filter((id) => !baselineIds.has(id)));
  const attributed = sortedUnique([...draftIds, ...ifaIds]);
  if (stableJson(entrants) !== stableJson(attributed)) {
    throw new Error('New population does not equal the exact draft/IFA entrant union.');
  }
  if (new Set(draftIds).size !== draftIds.length || new Set(ifaIds).size !== ifaIds.length
    || draftIds.some((id) => ifaIds.includes(id))) {
    throw new Error('Draft/IFA entrant IDs are duplicated or overlapping.');
  }
}

function assertV35RoundTrip(state: FullGameState): void {
  const snapshot = exportGameSnapshot(state);
  if (snapshot.schemaVersion !== 35) throw new Error('Economy receipt did not export v35.');
  const restored = importGameSnapshot(structuredClone(snapshot));
  if (sha256(deterministicSnapshotProjection(snapshot))
      !== sha256(deterministicSnapshotProjection(exportGameSnapshot(restored)))
    || rngDigest(state) !== rngDigest(restored)) {
    throw new Error('Economy receipt failed exact v35 state/RNG round trip.');
  }
}

export function yieldEconLongSoakMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function runEconLongSoakSeasonBoundary<T>(
  phase: EconLongSoakProgressMarker['phase'],
  seasonIndex: number,
  onProgress: EconLongSoakRunOptions['onProgress'],
  operation: () => Promise<T> | T,
): Promise<T> {
  onProgress?.({ phase, status: 'start', seasonIndex });
  const result = await operation();
  onProgress?.({ phase, status: 'complete', seasonIndex });
  await yieldEconLongSoakMacrotask();
  return result;
}

export function assertExactStreamingReplayRow(
  expectedRow: unknown,
  replayRow: unknown,
  seasonIndex: number,
): void {
  if (stableJson(replayRow) !== stableJson(expectedRow)) {
    throw new Error(`Season-15 resume did not reproduce row ${seasonIndex} byte-for-byte.`);
  }
}

export function buildStreamingReplayDigest(primaryRows: readonly unknown[]): string {
  if (primaryRows.length !== ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Replay digest requires exactly ${ECON_LONG_SOAK_HORIZON} primary rows.`);
  }
  return sha256(primaryRows.slice(15));
}

export function plannedV35RoundTripSeasons(horizon: number): readonly number[] {
  return horizon === ECON_LONG_SOAK_HORIZON
    ? ECON_LONG_SOAK_CHECKPOINT_SEASONS
    : [horizon];
}

function runOneSeason(
  seasonIndex: number,
  context: RunContext,
  candidatePolicy: 'report_only' | 'enforce_all' | 'diagnostic_inherited_candidates',
): SeasonRunResult {
  let state = requireState();
  const completedSeason = state.season;
  const baselineIds = new Set(state.players.map((player) => player.id));
  if (baselineIds.size !== state.players.length) throw new Error('Baseline player IDs are not unique.');

  actionApi.simToPlayoffs();
  profileLongSaveStage('season.playoffs', () => {
    actionApi.simRemainingPlayoffs();
    actionApi.proceedToOffseason();
  });
  const annualRowStage = startLongSaveProfileStage('evidence.annualRow');
  try {
  state = requireState();
  const contractClockBefore = contractClockProjection(state);
  const beforeById = new Map(contractClockBefore.map((row) => [row.playerId, row] as const));
  let contractClockAfter: ContractClockProjectionRow[] | null = null;
  let contractClockApplicationCount = 0;
  let qualifyingOfferPhaseCount = 0;
  let freeAgencyPhaseCount = 0;
  const tradeFinanceAuditEvents: string[] = [];

  let entryRows: FreeAgent[] | null = null;
  let dayOneSignings = 0;
  const progressRows: Array<ReturnType<typeof skipOffseasonPhaseWithAI>['aiSignings'][number]> = [];
  let guard = 0;
  while (!requireState().offseasonState?.completed) {
    const beforePhase = requireState().offseasonState?.currentPhase ?? null;
    const beforeClockApplied = requireState().offseasonState?.serviceTimeReconciled ?? false;
    const progress = profileLongSaveStage(OFFSEASON_PROFILE_STAGE[beforePhase ?? 'season_review'], () => {
      const phaseProgress = skipOffseasonPhaseWithAI(requireState(), 'autonomous_league');
      if (phaseProgress.error) throw new Error(phaseProgress.error);
      applyAISigningProgress(requireState(), phaseProgress.aiSignings);
      return phaseProgress;
    });
    progressRows.push(...progress.aiSignings);
    state = requireState();
    if (!beforeClockApplied && state.offseasonState?.serviceTimeReconciled) {
      contractClockApplicationCount += 1;
      contractClockAfter = contractClockProjection(state);
    }
    if (beforePhase !== 'qualifying_offers' && state.offseasonState?.currentPhase === 'qualifying_offers') {
      qualifyingOfferPhaseCount += 1;
    }
    if (beforePhase !== 'free_agency' && state.offseasonState?.currentPhase === 'free_agency') {
      freeAgencyPhaseCount += 1;
    }
    if (!entryRows && state.offseasonState?.currentPhase === 'free_agency' && state.freeAgencyMarket) {
      entryRows = [...state.freeAgencyMarket.freeAgents, ...state.freeAgencyMarket.signedPlayers]
        .sort((left, right) => left.player.id.localeCompare(right.player.id));
      dayOneSignings = state.freeAgencyMarket.signedPlayers.length;
    }
    guard += 1;
    if (guard > 20) throw new Error('Autonomous offseason exceeded phase guard.');
  }

  state = requireState();
  if (!entryRows || !state.freeAgencyMarket || !state.offseasonState) {
    throw new Error('Autonomous offseason did not produce a canonical free-agency receipt.');
  }
  if (!contractClockAfter || contractClockApplicationCount !== 1
    || qualifyingOfferPhaseCount !== 1 || freeAgencyPhaseCount !== 1) {
    throw new Error('Autonomous offseason did not emit exact once-only lifecycle transitions.');
  }
  const afterById = new Map(contractClockAfter.map((row) => [row.playerId, row] as const));
  const changedPlayerIds = sortedUnique(contractClockBefore
    .filter((before) => stableJson(before) !== stableJson(afterById.get(before.playerId)))
    .map((before) => before.playerId));
  const optionOutcomes = deriveOptionOutcomeEvidence(contractClockBefore, contractClockAfter);
  const naturalMlbExpirationVacancies = deriveNaturalMlbExpirationEvidence(
    contractClockBefore,
    contractClockAfter,
  );
  const expirationIds = new Set(contractClockAfter
    .filter((after) => {
      const before = beforeById.get(after.playerId);
      return Boolean(before?.teamId) && (before?.years ?? 0) > 0 && after.years === 0;
    })
    .map((row) => row.playerId));
  const phaseResults = structuredClone(state.offseasonState.phaseResults);
  const canonicalPlayersAtOffseasonCompletion = new Map(state.players.map((player) => [player.id, {
    teamId: player.teamId,
    contract: { ...player.contract },
  }] as const));
  const finalMarketRows = [...state.freeAgencyMarket.freeAgents, ...state.freeAgencyMarket.signedPlayers];
  const classIds = sortedUnique(entryRows.map((row) => row.player.id));
  const remainingIds = sortedUnique(state.freeAgencyMarket.freeAgents.map((row) => row.player.id));
  const signedIds = sortedUnique(state.freeAgencyMarket.signedPlayers.map((row) => row.player.id));
  const marketExhaustedIds = new Set(progressRows
    .filter((row) => row.decision?.reasonCodes.includes('market_exhausted'))
    .map((row) => row.playerId));
  if (stableJson(sortedUnique(finalMarketRows.map((row) => row.player.id))) !== stableJson(classIds)) {
    throw new Error('Final free-agency membership does not equal post-QO entry class.');
  }

  profileLongSaveStage('season.rollover', () => actionApi.startNextSeason());
  state = requireState();
  if (state.season !== completedSeason + 1 || state.phase !== 'preseason') {
    throw new Error(`Season ${seasonIndex} did not complete exactly one rollover.`);
  }
  const finalIds = new Set(state.players.map((player) => player.id));
  if (finalIds.size !== state.players.length) throw new Error('Post-rollover player IDs are not unique.');
  const draftIds = phaseResults.draftPicks.map((pick) => pick.playerId);
  const ifaIds = phaseResults.ifaSignings.map((signing) => signing.playerId);
  assertExactEntrants(baselineIds, finalIds, draftIds, ifaIds);
  const exits = [...baselineIds].filter((id) => !finalIds.has(id));
  const payroll = payrollRows(state);
  assertPayrollRows(payroll);
  const tradeFinanceProjection = buildTradeFinanceAuditProjection(payroll);
  tradeFinanceAuditEvents.push(sha256(tradeFinanceProjection));
  const qualifyingOfferResultIds = sortedUnique(phaseResults.qualifyingOffers.map((offer) => offer.playerId));
  const qualifyingOfferIdSet = new Set(qualifyingOfferResultIds);
  const nonTenderIdSet = new Set(phaseResults.nonTenderedPlayers);
  const carryoverIds = classIds.filter((id) => context.previousRemainingIds.has(id));
  const newAdmissionIds = classIds.filter((id) => !context.previousRemainingIds.has(id));
  const qualifyingOfferIds = newAdmissionIds.filter((id) => qualifyingOfferIdSet.has(id));
  const nonTenderIds = newAdmissionIds.filter((id) => !qualifyingOfferIdSet.has(id) && nonTenderIdSet.has(id));
  const expirationCohortIds = newAdmissionIds.filter((id) => (
    !qualifyingOfferIdSet.has(id) && !nonTenderIdSet.has(id) && expirationIds.has(id)
  ));
  const attributedAdmissions = new Set([...qualifyingOfferIds, ...nonTenderIds, ...expirationCohortIds]);
  const freeAgency = {
    classIds,
    tierIds: freeAgencyTierIds(entryRows),
    qualifyingOfferResultIds,
    sourceCohorts: {
      carryoverIds,
      qualifyingOfferIds,
      nonTenderIds,
      expirationIds: expirationCohortIds,
      otherIds: newAdmissionIds.filter((id) => !attributedAdmissions.has(id)),
    },
    remainingIds,
    signedIds,
    meaningfulSignedIds: sortedUnique(phaseResults.freeAgentSignings
      .filter((signing) => signing.annualSalary >= 10)
      .map((signing) => signing.playerId)),
    marketExhaustedIds: sortedUnique(marketExhaustedIds),
    dayOneSignings,
    finalSignings: signedIds.length,
    topAav: Math.max(0, ...phaseResults.freeAgentSignings.map((signing) => signing.annualSalary)),
  };
  const terms = contractTerms(canonicalPlayersAtOffseasonCompletion, phaseResults, marketExhaustedIds);
  const population = {
    baseline: baselineIds.size,
    final: finalIds.size,
    major: state.players.filter((player) => player.teamId && player.rosterStatus === 'MLB').length,
    minor: state.players.filter((player) => player.teamId && player.rosterStatus !== 'MLB').length,
    unassigned: state.players.filter((player) => !player.teamId).length,
    entrants: [...finalIds].filter((id) => !baselineIds.has(id)).length,
    draftEntrants: draftIds.length,
    ifaEntrants: ifaIds.length,
    exits: exits.length,
    retirements: exits.length,
    rosterInvariantCategories: rosterInvariantCategories(state),
  };
  const contracts = summarizeContractTerms(
    terms,
    state.players
      .filter((player) => player.teamId && player.rosterStatus === 'MLB' && player.contract.years > 0)
      .map((player) => player.contract.years),
  );
  const contractClock = {
    beforeDigest: sha256(contractClockBefore),
    afterDigest: sha256(contractClockAfter),
    changedPlayerIds,
    optionOutcomes,
    naturalMlbExpirationVacancies,
  };
  const row: EconLongSoakAnnualRow = {
    seasonIndex,
    completedSeason,
    nextSeason: state.season,
    freeAgency,
    payrollRows: payroll,
    payroll: summarizePayroll(payroll),
    contracts,
    contractClock,
    population,
    digests: {
      state: snapshotDigest(state),
      rng: rngDigest(state),
      contracts: sha256(contracts),
      payroll: sha256(payroll),
      population: sha256(population),
      freeAgency: sha256(freeAgency),
    },
    lifecycleReceipts: {
      contractClock: lifecycleReceipt(
        `contract_clock_service_reconciled_s${completedSeason}`,
        contractClockApplicationCount,
        changedPlayerIds,
        contractClock,
      ),
      options: lifecycleReceipt(
        `contract_options_resolved_s${completedSeason}`,
        contractClockApplicationCount,
        optionOutcomes.map((entry) => entry.playerId),
        optionOutcomes,
      ),
      qualifyingOffers: lifecycleReceipt(
        `qualifying_offer_phase_results_s${completedSeason}`,
        qualifyingOfferPhaseCount,
        qualifyingOfferResultIds,
        qualifyingOfferResultIds,
      ),
      freeAgency: lifecycleReceipt(
        `free_agency_entry_class_s${completedSeason}`,
        freeAgencyPhaseCount,
        classIds,
        freeAgency,
      ),
      marketRevenue: lifecycleReceipt(
        `market_revenue_budget_reconciled_s${completedSeason}`,
        TEAMS.every((team) => (
          state.storyFlags.get(team.id) ?? []
        ).includes(`market_revenue_budget_reconciled_s${completedSeason}`)) ? 1 : 0,
        payroll.map((row) => row.teamId),
        payroll.map((row) => row.teamId).sort(),
      ),
      // Item 17 intentionally keeps regular-season trade origination at 31
      // CPU organizations plus the interactive user. Item 18 audits the exact
      // canonical retention/controller ledger once; it does not expand trade AI.
      tradeFinance: lifecycleReceipt(
        `trade_finance_payroll_audit_s${completedSeason}`,
        tradeFinanceAuditEvents.length,
        payroll.map((row) => row.teamId),
        tradeFinanceProjection,
      ),
    },
    measurementCandidateViolations: [],
  };
  row.measurementCandidateViolations = buildMeasurementCandidateViolations(row);
  assertAnnualRow(row, {
    expectedSeasonIndex: seasonIndex,
    baselineRosterInvariantCategories: context.baselineRosterInvariantCategories,
    enforceInheritedCandidates: candidatePolicy !== 'report_only',
    allowDiagnosticInheritedCandidateViolations: candidatePolicy === 'diagnostic_inherited_candidates',
  });
  return { row, remainingIds: new Set(remainingIds) };
  } finally {
    finishLongSaveProfileStage(annualRowStage);
  }
}

export interface EconLongSoakDiagnosticResumeInput {
  snapshot: GameSnapshot;
  precedingRow: EconLongSoakAnnualRow;
  baselineRosterInvariantCategories: string[];
  endSeasonIndex: 29 | 30;
  onProgress?: (marker: EconLongSoakProgressMarker) => void;
  profileSegment?: EconLongSoakProfileSegment;
}

export type EconLongSoakProfileSegment = <T>(operation: () => T) => T;

export interface EconLongSoakDiagnosticRoundTripProof {
  seasonIndex: 29 | 30;
  stateDigest: string;
  rngDigest: string;
  roundTripStateDigest: string;
  roundTripRngDigest: string;
}

export interface EconLongSoakDiagnosticResumeResult {
  rows: EconLongSoakAnnualRow[];
  previousRemainingIds: string[];
  snapshot: GameSnapshot;
  roundTripProof: EconLongSoakDiagnosticRoundTripProof;
}

function mergeLongSaveProfileReports(
  reports: readonly LongSaveProfileReport[],
): LongSaveProfileReport {
  return {
    stages: LONG_SAVE_PROFILE_STAGE_ORDER.flatMap((stage) => {
      const matches = reports.flatMap((report) => report.stages.filter((row) => row.stage === stage));
      if (matches.length === 0) return [];
      return [{
        stage,
        callCount: matches.reduce((total, row) => total + row.callCount, 0),
        inclusiveMs: matches.reduce((total, row) => total + row.inclusiveMs, 0),
        selfMs: matches.reduce((total, row) => total + row.selfMs, 0),
        minMs: Math.min(...matches.map((row) => row.minMs)),
        maxMs: Math.max(...matches.map((row) => row.maxMs)),
      }];
    }),
  };
}

/**
 * The production profiler intentionally owns only synchronous sessions. This
 * disposable adapter composes exact synchronous continuations around await
 * boundaries, then emits one frozen-order aggregate report. End-to-end wall
 * time remains external evidence rather than a fabricated inclusive stage.
 */
export async function runWithSegmentedLongSaveProfilerAsync<T>(
  operation: (profileSegment: EconLongSoakProfileSegment) => Promise<T>,
  observer: (report: LongSaveProfileReport) => void,
): Promise<T> {
  const reports: LongSaveProfileReport[] = [];
  const profileSegment: EconLongSoakProfileSegment = (segment) => runWithLongSaveProfiler(segment, {
    observer: (report) => reports.push(report),
  });
  try {
    return await operation(profileSegment);
  } finally {
    try {
      observer(mergeLongSaveProfileReports(reports));
    } catch {
      // Disposable profiling remains observational and cannot replace a
      // canonical simulation return value or error.
    }
  }
}

export function resolveEconLongSoakDiagnosticResumeRange(
  precedingSeasonIndex: number,
  endSeasonIndex: number,
): { startSeasonIndex: 16 | 30; endSeasonIndex: 29 | 30 } {
  if (precedingSeasonIndex === 15 && endSeasonIndex === 29) {
    return { startSeasonIndex: 16, endSeasonIndex: 29 };
  }
  if (precedingSeasonIndex === 29 && endSeasonIndex === 30) {
    return { startSeasonIndex: 30, endSeasonIndex: 30 };
  }
  throw new Error('Diagnostic resume accepts only exact season 15→29 capture or season 29→30 profile ranges.');
}

/**
 * Continues one authenticated diagnostic checkpoint through the canonical
 * Goal-18 season runner. This test-only helper deliberately admits only the
 * two Goal-30 ranges and clears singleton state before validating input.
 */
export async function runEconLongSoakDiagnosticRangeFromCheckpoint(
  input: EconLongSoakDiagnosticResumeInput,
): Promise<EconLongSoakDiagnosticResumeResult> {
  setState(null);
  const profileSegment: EconLongSoakProfileSegment = input.profileSegment ?? ((operation) => operation());
  const range = resolveEconLongSoakDiagnosticResumeRange(
    input.precedingRow.seasonIndex,
    input.endSeasonIndex,
  );
  const baselineCategories = sortedUnique(input.baselineRosterInvariantCategories);
  if (stableJson(baselineCategories) !== stableJson(input.baselineRosterInvariantCategories)) {
    throw new Error('Diagnostic resume baseline roster categories are not canonical.');
  }
  assertAnnualRow(input.precedingRow, {
    expectedSeasonIndex: input.precedingRow.seasonIndex,
    baselineRosterInvariantCategories: baselineCategories,
    enforceInheritedCandidates: true,
    allowDiagnosticInheritedCandidateViolations: true,
  });
  if (input.snapshot.schemaVersion !== 35
    || input.snapshot.season !== range.startSeasonIndex
    || input.snapshot.season !== input.precedingRow.nextSeason
    || input.snapshot.phase !== 'preseason'
    || input.snapshot.day !== 1
    || input.snapshot.players.length !== input.precedingRow.population.final) {
    throw new Error('Diagnostic resume snapshot does not continue the exact preceding annual row.');
  }
  if (sha256(deterministicSnapshotProjection(input.snapshot)) !== input.precedingRow.digests.state
    || sha256(input.snapshot.rng) !== input.precedingRow.digests.rng) {
    throw new Error('Diagnostic resume snapshot state/RNG does not match the preceding annual row.');
  }

  const { restored, reexported } = profileSegment(() => {
    const restoredState = profileLongSaveStage(
      'evidence.checkpointImport',
      () => importGameSnapshot(structuredClone(input.snapshot)),
    );
    const restoredSnapshot = profileLongSaveStage(
      'evidence.checkpointExport',
      () => exportGameSnapshot(restoredState),
    );
    return { restored: restoredState, reexported: restoredSnapshot };
  });
  if (stableJson(reexported) !== stableJson(input.snapshot)) {
    throw new Error('Diagnostic resume checkpoint failed exact v35 import/re-export.');
  }

  setState(restored);
  const rows: EconLongSoakAnnualRow[] = [];
  const context: RunContext = {
    previousRemainingIds: new Set(input.precedingRow.freeAgency.remainingIds),
    baselineRosterInvariantCategories: baselineCategories,
  };
  for (let seasonIndex = range.startSeasonIndex; seasonIndex <= range.endSeasonIndex; seasonIndex += 1) {
    await runEconLongSoakSeasonBoundary('primary', seasonIndex, input.onProgress, () => {
      const result = profileSegment(
        () => runOneSeason(seasonIndex, context, 'diagnostic_inherited_candidates'),
      );
      rows.push(result.row);
      context.previousRemainingIds = result.remainingIds;
    });
  }

  // This continuation deliberately executes after the awaited season-boundary
  // macrotask. The segmented wrapper must still capture its export/import/
  // digest stages in the final logical profile.
  const { snapshot, roundTripProof } = profileSegment(() => {
    const finalSnapshot = profileLongSaveStage(
      'evidence.checkpointExport',
      () => exportGameSnapshot(requireState()),
    );
    const restored = profileLongSaveStage(
      'evidence.checkpointImport',
      () => importGameSnapshot(structuredClone(finalSnapshot)),
    );
    const roundTripSnapshot = profileLongSaveStage(
      'evidence.checkpointExport',
      () => exportGameSnapshot(restored),
    );
    const proof = profileLongSaveStage('evidence.checkpointDigest', () => ({
      seasonIndex: range.endSeasonIndex,
      stateDigest: sha256(deterministicSnapshotProjection(finalSnapshot)),
      rngDigest: sha256(finalSnapshot.rng),
      roundTripStateDigest: sha256(deterministicSnapshotProjection(roundTripSnapshot)),
      roundTripRngDigest: sha256(roundTripSnapshot.rng),
    } satisfies EconLongSoakDiagnosticRoundTripProof));
    if (stableJson(roundTripSnapshot) !== stableJson(finalSnapshot)
      || proof.stateDigest !== proof.roundTripStateDigest
      || proof.rngDigest !== proof.roundTripRngDigest) {
      throw new Error(`Diagnostic checkpoint ${range.endSeasonIndex} failed exact v35 state/RNG round trip.`);
    }
    return { snapshot: finalSnapshot, roundTripProof: proof };
  });
  const finalRow = rows.at(-1);
  if (!finalRow
    || rows.length !== range.endSeasonIndex - range.startSeasonIndex + 1
    || finalRow.seasonIndex !== range.endSeasonIndex
    || snapshot.schemaVersion !== 35
    || snapshot.season !== range.endSeasonIndex + 1
    || snapshot.phase !== 'preseason'
    || snapshot.day !== 1
    || snapshot.players.length !== finalRow.population.final
    || sha256(deterministicSnapshotProjection(snapshot)) !== finalRow.digests.state
    || sha256(snapshot.rng) !== finalRow.digests.rng) {
    throw new Error('Diagnostic resume did not stop at the exact requested season boundary.');
  }
  return {
    rows,
    previousRemainingIds: sortedUnique(context.previousRemainingIds),
    snapshot,
    roundTripProof,
  };
}

export async function runEconLongSoak(options: EconLongSoakRunOptions): Promise<EconLongSoakReceipt> {
  const horizon = options.horizon ?? ECON_LONG_SOAK_HORIZON;
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Harness horizon must be 1..${ECON_LONG_SOAK_HORIZON}.`);
  }
  const isDiagnostic = options.mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE;
  if (options.mode === 'strict' && horizon !== ECON_LONG_SOAK_HORIZON) {
    throw new Error('Strict harness mode cannot use the smoke horizon override.');
  }
  if (isDiagnostic && horizon !== ECON_LONG_SOAK_HORIZON) {
    throw new Error('Diagnostic harness mode requires the exact 30-season horizon.');
  }
  if (isDiagnostic
    && !(ECON_LONG_SOAK_CALIBRATION_SEEDS as readonly number[]).includes(options.seed)) {
    throw new Error('Diagnostic harness accepts one calibration seed (7111..7113); seed 7114 remains held out.');
  }
  if (isDiagnostic && (!options.sourceRevision || options.sourceRevision === 'UNSPECIFIED')) {
    throw new Error('Diagnostic harness requires the exact source revision as outer evidence.');
  }
  if (options.mode === 'strict') {
    throw new Error('Strict economy long-soak expectations remain UNFROZEN until phase-2 calibration.');
  }
  actionApi.newGame({
    seed: options.seed,
    userTeamId: 'nym',
    gmName: 'Economy Long Soak',
    difficulty: 'standard',
    playMode: 'standard',
    dayOneExperience: 'quick',
    saveSlot: 1,
  });
  const initial = requireState();
  const baselinePopulation = initial.players.length;
  const baselineRosterInvariantCategories = rosterInvariantCategories(initial);
  const context: RunContext = {
    previousRemainingIds: new Set(),
    baselineRosterInvariantCategories,
  };
  const checkpoints: EconLongSoakCheckpoint[] = [];
  let season15Snapshot: GameSnapshot | null = null;
  const rows: EconLongSoakAnnualRow[] = [];
  const candidatePolicy = horizon < ECON_LONG_SOAK_HORIZON
    ? 'report_only' as const
    : isDiagnostic
      ? 'diagnostic_inherited_candidates' as const
      : 'enforce_all' as const;

  for (let index = 1; index <= horizon; index += 1) {
    let checkpointCapture: EconLongSoakCheckpointCapture | null = null;
    await runEconLongSoakSeasonBoundary('primary', index, options.onProgress, async () => {
      const result = await runOneSeason(index, context, candidatePolicy);
      rows.push(result.row);
      context.previousRemainingIds = result.remainingIds;
      if (horizon === ECON_LONG_SOAK_HORIZON
        && (ECON_LONG_SOAK_CHECKPOINT_SEASONS as readonly number[]).includes(index)) {
        const checkpointIndex = index as 10 | 15 | 20 | 30;
        const captured = captureCheckpoint(checkpointIndex);
        checkpoints.push(captured.checkpoint);
        if (checkpointIndex === 15) season15Snapshot = captured.snapshot;
        checkpointCapture = {
          checkpoint: captured.checkpoint,
          snapshot: captured.snapshot,
          row: result.row,
          previousRemainingIds: sortedUnique(result.remainingIds),
          baselinePopulation,
          baselineRosterInvariantCategories: [...baselineRosterInvariantCategories],
        };
      }
    });
    if (checkpointCapture) options.onCheckpoint?.(checkpointCapture);
  }
  if (horizon < ECON_LONG_SOAK_HORIZON) {
    assertV35RoundTrip(requireState());
  }

  let replayRows16To30Digest: string | null = null;
  if (horizon === ECON_LONG_SOAK_HORIZON) {
    if (!season15Snapshot) throw new Error('Season-15 checkpoint was not captured.');
    setState(importGameSnapshot(structuredClone(season15Snapshot)));
    const replayContext: RunContext = {
      previousRemainingIds: new Set(rows[14]!.freeAgency.remainingIds),
      baselineRosterInvariantCategories,
    };
    for (let index = 16; index <= ECON_LONG_SOAK_HORIZON; index += 1) {
      await runEconLongSoakSeasonBoundary('replay', index, options.onProgress, async () => {
        const result = await runOneSeason(index, replayContext, candidatePolicy);
        assertExactStreamingReplayRow(rows[index - 1], result.row, index);
        replayContext.previousRemainingIds = result.remainingIds;
      });
    }
    replayRows16To30Digest = buildStreamingReplayDigest(rows);
  }

  return createEconLongSoakReceipt(options.sourceRevision, {
    goal: 'ECON-LONG-SOAK-1',
    schema: 1,
    saveSchemaVersion: 35,
    seed: options.seed,
    horizon,
    mode: options.mode,
    baselinePopulation,
    baselineRosterInvariantCategories,
    rows,
    checkpoints,
    trends: horizon === ECON_LONG_SOAK_HORIZON ? buildLongSoakTrends(baselinePopulation, rows) : null,
    replayRows16To30Digest,
    diagnostic: isDiagnostic ? buildInheritedCandidateDiagnostic(baselinePopulation, rows) : null,
  });
}
