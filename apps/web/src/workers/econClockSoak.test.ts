// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createFreeAgencyMarket, estimateSnapshotSize, runInvariantChecks } from '@mbd/sim-core';
import type { GameSnapshot } from '@mbd/contracts';
import {
  ECON_CLOCK_SOAK_ROLLOVERS,
  ECON_CLOCK_SOAK_SEEDS,
  assertPopulationSample,
  auditEconomyTeamRoster,
  assertRolloverFlow,
  assertEconomyTransitionEquations,
  assertEconomyMarketCohorts,
  assertAssignmentAttribution,
  assertCapturedEntrantsCanonical,
  assertEntrantAttribution,
  assertExactIdSet,
  assertFreeAgencyEntryUnion,
  assertNoNewInvariantCategory,
  assertNoDoubleClock,
  assertOptionPartition,
  assertSlopeBands,
  buildEconomyTransitionSummary,
  classifyEconomyAssignmentEvidence,
  classifyEconomyRule5Provenance,
  classifyEconomyPopulation,
  economySlope,
  mean,
  type EconomyPopulation,
  type EconomyMarketCohortRow,
  type EconomyMarketPrimaryCohort,
  type EconomyPopulationCategory,
  type EconomyRolloverSample,
  type EconomyTransitionMatrix,
  type EconomyRosterCausalRow,
  type EconomyRosterCause,
  type EconomyTeamRosterCheckpoint,
} from './econClockSoak.metrics.js';

vi.mock('comlink', () => ({ expose: () => {} }));

const runEconomySoak = process.env.MBD_ECON_CLOCK_SOAK === '1';
const measureEconomySoak = process.env.MBD_ECON_CLOCK_SOAK_MEASURE === '1';
const requestedEconomySeed = Number(process.env.MBD_ECON_CLOCK_SOAK_SEED);
const economySoakSeeds = Number.isFinite(requestedEconomySeed) && requestedEconomySeed > 0
  ? [requestedEconomySeed]
  : ECON_CLOCK_SOAK_SEEDS;
const economyIt = runEconomySoak ? it : it.skip;
const EXPECTED_ECON_CLOCK_RECEIPT_SHA256 = '5477faee99676a965a51a9ea394a179097f8c41c1ad96c06f83d3fb43ffe0814';

interface ClockInput {
  years: number;
  teamOption: boolean;
  snapshot: string;
}

interface EconomyReport extends EconomyRolloverSample {
  seed: number;
  naturalMlbExpiries: number;
  eligibleMinorExpiries: number;
  ineligibleMinorExpiries: number;
  optionExercises: number;
  optionDeclines: number;
  qualifyingOfferResults: Record<string, number>;
  assignmentChanges: number;
  unexplainedAssignmentChanges: string[];
  freeAgentSignings: number;
  perTeamMlbCounts: Record<string, number>;
  perTeamFortyCounts: Record<string, number>;
  payrollSpread: number;
  transitionReceipt: PopulationTransitionReceipt;
}

interface PopulationTransitionReceipt {
  seed: number;
  rollover: number;
  before: EconomyPopulation;
  after: EconomyPopulation;
  transitions: EconomyTransitionMatrix;
  gross: Record<EconomyPopulationCategory, number>;
  clock: {
    naturalMlbExpiries: number;
    eligibleMinorExpiries: number;
    ineligibleMinorExpiries: number;
    optionExercises: number;
    optionDeclines: number;
  };
  market: {
    postQoEligible: number;
    releasedFromMajor: number;
    releasedFromMinor: number;
    alreadyUnassigned: number;
    dayOneSigned: number;
    finalSigned: number;
    remaining: number;
    carryover: number;
    newAdmissions: number;
    lostPriorRemaining: number;
    cohorts: Record<EconomyMarketPrimaryCohort, number>;
    rows: EconomyMarketCohortRow[];
  };
  entrants: {
    draft: number;
    ifa: number;
    finalMajor: number;
    finalMinor: number;
    finalUnassigned: number;
  };
  exits: {
    fromMajor: number;
    fromMinor: number;
    fromUnassigned: number;
  };
  rosterTransitions: {
    minorToMajor: number;
    majorToMinor: number;
    sameTeamLevelChanges: number;
  };
  assignmentEvidence: {
    autofillPromotionCount: number;
    autofillPromotionIds: string[];
    autofillPromotionIdsSha256: string;
    rule5SelectionCount: number;
    rule5SelectionIds: string[];
    rule5SelectionIdsSha256: string;
    rule5RolloverStartSelectionCount: number;
    rule5RolloverStartSelectionIdsSha256: string;
    rule5SameRolloverDraftSelectionCount: number;
    rule5SameRolloverDraftSelectionIdsSha256: string;
  };
  rosterAudit: {
    checkpoints: TeamRosterAudit[];
    causalRows: EconomyRosterCausalRow[];
    adjacentOverLimitTeams: Array<{
      teamId: string;
      finalMlbCount: number;
      withoutGoal11Count: number;
      finalMlbIdsSha256: string;
    }>;
  };
  bytes: number;
  bytesPerPlayer: number;
}

interface TeamRosterAudit extends EconomyTeamRosterCheckpoint {
  teamId: string;
}

interface MarketCohortContext {
  priorRemainingIds: Set<string>;
  priorSignedIds: Set<string>;
  priorEntryCount: number;
  entryStreak: Map<string, number>;
}

async function loadHarness() {
  const { actionApi } = await import('./sim.worker.actions.js');
  const helpers = await import('./sim.worker.helpers.js');
  return {
    actionApi,
    requireState: helpers.requireState,
    setState: helpers.setState,
    getRosterComplianceIssuesForTeam: helpers.getRosterComplianceIssuesForTeam,
    resolveOutstandingQualifyingOffers: helpers.resolveOutstandingQualifyingOffers,
  };
}

function ids(players: readonly { id: string }[]) {
  return new Set(players.map((player) => player.id));
}

function populationCategory(player: { teamId: string; rosterStatus: string }): EconomyPopulationCategory {
  if (!player.teamId) return 'unassigned';
  return player.rosterStatus === 'MLB' ? 'major' : 'minor';
}

function populationCategories(
  players: readonly { id: string; teamId: string; rosterStatus: string }[],
): Map<string, EconomyPopulationCategory> {
  return new Map(players.map((player) => [player.id, populationCategory(player)] as const));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function compactRosterAuditForConsole(rosterAudit: PopulationTransitionReceipt['rosterAudit']) {
  const { checkpoints, causalRows, ...summary } = rosterAudit;
  return {
    ...summary,
    checkpointCount: checkpoints.length,
    checkpointsSha256: createHash('sha256').update(stableJson(checkpoints)).digest('hex'),
    causalRowCount: causalRows.length,
    causalRowsSha256: createHash('sha256').update(stableJson(causalRows)).digest('hex'),
  };
}

describe('Goal 11 receipt console projection', () => {
  it('compacts roster arrays without mutating or changing the full receipt digest', () => {
    const rosterAudit: PopulationTransitionReceipt['rosterAudit'] = {
      checkpoints: [{ teamId: 'nym', checkpoint: 'final', mlbIds: ['p1'], fortyManIds: ['p1'] }],
      causalRows: [{
        playerId: 'p1',
        teamId: 'nym',
        direction: 'in',
        cause: 'goal11_fa_signing',
        evidenceId: 'p1',
        fromCheckpoint: 'post_clock',
        toCheckpoint: 'post_fa',
      }],
      adjacentOverLimitTeams: [],
    };
    const digestBefore = createHash('sha256').update(stableJson(rosterAudit)).digest('hex');

    const summary = compactRosterAuditForConsole(rosterAudit);

    expect(summary).not.toHaveProperty('checkpoints');
    expect(summary).not.toHaveProperty('causalRows');
    expect(summary).toMatchObject({ checkpointCount: 1, causalRowCount: 1, adjacentOverLimitTeams: [] });
    expect(summary.checkpointsSha256).toBe(createHash('sha256').update(stableJson(rosterAudit.checkpoints)).digest('hex'));
    expect(summary.causalRowsSha256).toBe(createHash('sha256').update(stableJson(rosterAudit.causalRows)).digest('hex'));
    expect(rosterAudit.checkpoints).toHaveLength(1);
    expect(rosterAudit.causalRows).toHaveLength(1);
    expect(createHash('sha256').update(stableJson(rosterAudit)).digest('hex')).toBe(digestBefore);
  });
});

function clockInputs(players: readonly {
  id: string;
  contract: { years: number; teamOption: boolean };
  teamId: string;
  rosterStatus: string;
}[]) {
  return new Map(players.map((player) => [player.id, {
    years: player.contract.years,
    teamOption: player.contract.teamOption,
    snapshot: JSON.stringify(player),
    teamId: player.teamId,
    rosterStatus: player.rosterStatus,
  }] as const));
}

function assertClockExactlyOnce(
  before: ReturnType<typeof clockInputs>,
  afterPlayers: readonly { id: string; contract: { years: number; teamOption: boolean }; teamId: string; rosterStatus: string }[],
) {
  const afterById = new Map(afterPlayers.map((player) => [player.id, player] as const));
  const exercises: string[] = [];
  const declines: string[] = [];
  let naturalMlbExpiries = 0;
  let eligibleMinorExpiries = 0;
  let ineligibleMinorExpiries = 0;

  for (const [playerId, input] of before) {
    const after = afterById.get(playerId);
    expect(after, `clocked player ${playerId} remains canonical`).toBeTruthy();
    if (!after) continue;
    if (input.years <= 0) {
      expect(JSON.stringify(after)).toBe(input.snapshot);
      continue;
    }
    expect(after.contract.years).toBeGreaterThanOrEqual(0);
    if (input.years === 1 && input.teamOption) {
      expect([0, 1]).toContain(after.contract.years);
      expect(after.contract.teamOption).toBe(false);
      if (after.contract.years === 1) exercises.push(playerId);
      else declines.push(playerId);
      continue;
    }
    expect(after.contract.years).toBe(input.years - 1);
    if (input.years === 1) {
      if (input.rosterStatus === 'MLB') naturalMlbExpiries += 1;
      else if (input.teamId) eligibleMinorExpiries += 1;
      else ineligibleMinorExpiries += 1;
    }
  }
  return { exercises, declines, naturalMlbExpiries, eligibleMinorExpiries, ineligibleMinorExpiries };
}

function assertCanonicalRosterOwnership(state: ReturnType<Awaited<ReturnType<typeof loadHarness>>['requireState']>) {
  const canonicalById = new Map(state.players.map((player) => [player.id, player] as const));
  expect(canonicalById.size).toBe(state.players.length);
  expect(state.rosterStates.has('')).toBe(false);
  const assignedRosterTeamById = new Map<string, string>();
  for (const [teamId, roster] of state.rosterStates) {
    expect(new Set(roster.mlbRoster).size, `${teamId} duplicate MLB roster entry`).toBe(roster.mlbRoster.length);
    expect(new Set(roster.fortyManRoster).size, `${teamId} duplicate 40-man roster entry`).toBe(roster.fortyManRoster.length);
    for (const playerId of [...roster.mlbRoster, ...roster.fortyManRoster]) {
      expect(canonicalById.get(playerId)?.teamId, `${playerId} roster ownership`).toBe(teamId);
      const priorTeam = assignedRosterTeamById.get(playerId);
      expect(priorTeam == null || priorTeam === teamId, `${playerId} has two roster assignments`).toBe(true);
      assignedRosterTeamById.set(playerId, teamId);
    }
  }
}

function invariantCategories(
  harness: Awaited<ReturnType<typeof loadHarness>>,
  state: ReturnType<Awaited<ReturnType<typeof loadHarness>>['requireState']>,
) {
  const core = runInvariantChecks({
    players: state.players,
    rosterStates: [...state.rosterStates.values()],
  }).violations.map((violation) => `core:${violation.type}`);
  const roster = [...state.rosterStates.keys()].flatMap((teamId) =>
    harness.getRosterComplianceIssuesForTeam(state, teamId).map((issue) => `roster:${issue.code}`),
  );
  return [...new Set([...core, ...roster])].sort();
}

function captureTeamRosterAudit(
  state: ReturnType<Awaited<ReturnType<typeof loadHarness>>['requireState']>,
  checkpoint: string,
): TeamRosterAudit[] {
  return [...state.rosterStates.entries()]
    .map(([teamId, roster]) => ({
      teamId,
      checkpoint,
      mlbIds: [...roster.mlbRoster].sort(),
      fortyManIds: [...roster.fortyManRoster].sort(),
    }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId));
}

function advanceOneRollover(
  harness: Awaited<ReturnType<typeof loadHarness>>,
  seed: number,
  rollover: number,
  baseline: EconomyPopulation,
  marketContext: MarketCohortContext,
): EconomyReport {
  const { actionApi, requireState } = harness;
  const rolloverStartState = requireState();
  const rolloverStartIds = ids(rolloverStartState.players);
  const rolloverStartCategories = populationCategories(rolloverStartState.players);
  const rolloverStartTeamById = new Map(rolloverStartState.players.map((player) => [player.id, player.teamId] as const));
  const rolloverStartPopulation = classifyEconomyPopulation(
    rolloverStartState.players,
    estimateSnapshotSize(actionApi.exportSnapshot() as GameSnapshot),
  );
  actionApi.simToPlayoffs();
  actionApi.simRemainingPlayoffs();
  actionApi.proceedToOffseason();
  const preClockRosterAudit = captureTeamRosterAudit(requireState(), 'pre_clock');
  const baselineInvariantCategories = invariantCategories(harness, requireState());

  const beforePlayers = requireState().players.map((player) => ({ ...player, contract: { ...player.contract } }));
  const beforeIds = ids(beforePlayers);
  expect(beforeIds.size, `duplicate canonical IDs before clock ${rollover}`).toBe(beforePlayers.length);
  const beforeAssignments = new Map(beforePlayers.map((player) => [player.id, player.teamId] as const));
  const inputs = clockInputs(beforePlayers);
  const rngBeforeClock = requireState().rng.getState();
  actionApi.advanceOffseason();
  const clockFacts = assertClockExactlyOnce(inputs, requireState().players);
  assertExactIdSet(ids(requireState().players), beforeIds, `canonical IDs after clock ${rollover}`);
  const optionEligibleIds = [...inputs.entries()]
    .filter(([, input]) => input.years === 1 && input.teamOption)
    .map(([playerId]) => playerId);
  assertOptionPartition(optionEligibleIds, clockFacts.exercises, clockFacts.declines);
  expect(requireState().rng.getState()).toEqual(rngBeforeClock);
  const afterFirstClock = requireState().players.map((player) => ({ id: player.id, years: player.contract.years }));
  actionApi.advanceOffseason();
  assertNoDoubleClock(afterFirstClock, requireState().players.map((player) => ({ id: player.id, years: player.contract.years })));
  const postClockRosterAudit = captureTeamRosterAudit(requireState(), 'post_clock');

  let marketAtEntry = 0;
  let capturedEntrantIds = new Set<string>();
  let postQoEligibleCount = 0;
  let releasedFromMajor = 0;
  let releasedFromMinor = 0;
  let alreadyUnassigned = 0;
  let dayOneSignedCount = 0;
  let marketCohortRows: EconomyMarketCohortRow[] = [];
  let marketCohortSummary = { carryover: 0, newAdmissions: 0, lost: 0 };
  let postFaRosterAudit: TeamRosterAudit[] | null = null;
  let postRule5RosterAudit: TeamRosterAudit[] | null = null;
  let guard = 0;
  while (!requireState().offseasonState?.completed) {
    const phaseBefore = requireState().offseasonState?.currentPhase;
    let preFreeAgencySnapshot: ReturnType<typeof actionApi.exportSnapshot> | null = null;
    let postQoEligibleIds: string[] = [];
    if (phaseBefore === 'qualifying_offers') {
      // The production resolver is idempotent. Resolve once here so the soak
      // can independently derive the post-QO/pre-market source set before
      // entry releases and day-one simulation change any player contract.
      harness.resolveOutstandingQualifyingOffers(requireState());
      postQoEligibleIds = createFreeAgencyMarket(
        requireState().season,
        requireState().players,
      ).freeAgents.map((entry) => entry.player.id);
      const postQoCategories = populationCategories(requireState().players);
      postQoEligibleCount = postQoEligibleIds.length;
      releasedFromMajor = postQoEligibleIds.filter((id) => postQoCategories.get(id) === 'major').length;
      releasedFromMinor = postQoEligibleIds.filter((id) => postQoCategories.get(id) === 'minor').length;
      alreadyUnassigned = postQoEligibleIds.filter((id) => postQoCategories.get(id) === 'unassigned').length;
      expect(releasedFromMajor + releasedFromMinor + alreadyUnassigned).toBe(postQoEligibleCount);
      const qoStatusById = new Map(requireState().draftState.qualifyingOffers
        .filter((record) => record.season === requireState().season)
        .map((record) => [record.playerId, record.status] as const));
      const currentNonTenderIds = new Set(
        requireState().offseasonState?.phaseResults.nonTenderedPlayers ?? [],
      );
      const currentPlayersById = new Map(requireState().players.map((player) => [player.id, player] as const));
      const declinedOptionIds = new Set(clockFacts.declines);
      marketCohortRows = postQoEligibleIds.map((playerId) => {
        const input = inputs.get(playerId);
        const current = currentPlayersById.get(playerId);
        const qoStatus = qoStatusById.get(playerId);
        const normalizedQoStatus: EconomyMarketCohortRow['qoStatus'] = qoStatus === 'rejected' || qoStatus === 'expired'
          ? qoStatus
          : 'none';
        const clockReason: EconomyMarketCohortRow['clockReason'] = declinedOptionIds.has(playerId)
          ? 'option_decline'
          : input && input.years > 0 && current && current.contract.years <= 0
            ? 'ordinary'
            : 'none';
        let primaryCohort: EconomyMarketPrimaryCohort;
        if (marketContext.priorRemainingIds.has(playerId)) primaryCohort = 'unsigned_carryover';
        else if (normalizedQoStatus !== 'none') primaryCohort = 'qo_rejected_or_expired';
        else if (currentNonTenderIds.has(playerId)) primaryCohort = 'current_non_tender';
        else if (clockReason !== 'none') primaryCohort = 'new_clock_expiry';
        else if (input && input.years <= 0 && input.teamId) primaryCohort = 'existing_zero_assigned';
        else if (input && input.years <= 0 && !input.teamId) primaryCohort = 'existing_zero_unassigned_other';
        else primaryCohort = 'unattributed';
        const priorLevel: EconomyMarketCohortRow['priorLevel'] = !input?.teamId
          ? 'unassigned'
          : input.rosterStatus === 'MLB'
            ? 'MLB'
            : 'minor';
        return {
          playerId,
          primaryCohort,
          priorLevel,
          priorYears: input?.years ?? current?.contract.years ?? 0,
          clockReason,
          qoStatus: normalizedQoStatus,
          priorMarketRollover: marketContext.priorRemainingIds.has(playerId) ? rollover - 1 : null,
          consecutiveEntryCount: (marketContext.entryStreak.get(playerId) ?? 0) + 1,
          wasPriorSigned: marketContext.priorSignedIds.has(playerId),
        };
      }).sort((left, right) => left.playerId.localeCompare(right.playerId));
      preFreeAgencySnapshot = actionApi.exportSnapshot();
    }
    const advanced = actionApi.skipOffseasonPhase() ?? actionApi.advanceOffseason();
    expect(advanced).not.toBeNull();
    if (phaseBefore === 'free_agency') {
      postFaRosterAudit = captureTeamRosterAudit(requireState(), 'post_fa');
    }
    if (phaseBefore === 'rule5_draft') {
      postRule5RosterAudit = captureTeamRosterAudit(requireState(), 'post_rule5');
    }
    if (phaseBefore === 'qualifying_offers') {
      // Replay the exact persisted QO boundary once. This is a small real
      // worker replay, not a second population rollout, and proves matching
      // contract outcomes, market capture, and RNG from the same save bytes.
      const firstBoundarySnapshot = actionApi.exportSnapshot();
      expect(actionApi.importSnapshot(preFreeAgencySnapshot).success).toBe(true);
      const replayed = actionApi.skipOffseasonPhase() ?? actionApi.advanceOffseason();
      expect(replayed).not.toBeNull();
      expect(actionApi.exportSnapshot()).toEqual(firstBoundarySnapshot);
      const market = requireState().freeAgencyMarket;
      expect(market, 'free-agency entry creates a canonical market').toBeTruthy();
      const remainingIds = market?.freeAgents.map((entry) => entry.player.id) ?? [];
      const dayOneSignedIds = market?.signedPlayers.map((entry) => entry.player.id) ?? [];
      assertFreeAgencyEntryUnion(remainingIds, dayOneSignedIds, postQoEligibleIds);
      marketCohortSummary = assertEconomyMarketCohorts(
        [...remainingIds, ...dayOneSignedIds],
        marketCohortRows,
        marketContext.priorRemainingIds,
        marketContext.priorEntryCount,
      );
      const entryCohortCounts = Object.fromEntries(
        [...new Set(marketCohortRows.map((row) => row.primaryCohort))]
          .sort()
          .map((cohort) => [cohort, marketCohortRows.filter((row) => row.primaryCohort === cohort).length]),
      );
      console.info(JSON.stringify({
        goal: 'ECON-CLOCK-1',
        kind: 'market-cohort-receipt',
        seed,
        rollover,
        entryCount: postQoEligibleIds.length,
        ...marketCohortSummary,
        cohorts: entryCohortCounts,
        rowsSha256: createHash('sha256').update(stableJson(marketCohortRows)).digest('hex'),
      }));
      marketContext.entryStreak = new Map(marketCohortRows.map((row) => [
        row.playerId,
        row.consecutiveEntryCount,
      ] as const));
      marketAtEntry = remainingIds.length + dayOneSignedIds.length;
      dayOneSignedCount = dayOneSignedIds.length;
      capturedEntrantIds = new Set([...remainingIds, ...dayOneSignedIds]);
      expect(capturedEntrantIds.size).toBe(marketAtEntry);
      assertExactIdSet(ids(requireState().players), beforeIds, `canonical IDs through market release ${rollover}`);
      assertCapturedEntrantsCanonical(
        market?.freeAgents.map((entry) => entry.player) ?? [],
        new Map(requireState().players.map((player) => [player.id, player] as const)),
      );
      for (const entry of market?.freeAgents ?? []) {
        const canonical = requireState().players.find((player) => player.id === entry.player.id);
        expect(entry.player).toBe(canonical);
        expect(canonical?.teamId).toBe('');
      }
      for (const entry of market?.signedPlayers ?? []) {
        const canonical = requireState().players.find((player) => player.id === entry.player.id);
        expect(entry.signedWith, `day-one signed entrant ${entry.player.id} team`).toBeTruthy();
        expect(canonical?.teamId, `day-one signed entrant ${entry.player.id} canonical ownership`).toBe(entry.signedWith);
        expect(requireState().offseasonState?.phaseResults.freeAgentSignings
          .filter((result) => result.playerId === entry.player.id)).toHaveLength(1);
      }
    }
    guard += 1;
    if (guard > 24) throw new Error('Goal-11 offseason exceeded its bounded phase guard.');
  }

  const completed = requireState().offseasonState!;
  expect(postFaRosterAudit, 'captured post-FA roster checkpoint').toBeTruthy();
  expect(postRule5RosterAudit, 'captured post-Rule 5 roster checkpoint').toBeTruthy();
  const marketAfterPhase = requireState().freeAgencyMarket?.freeAgents.length ?? 0;
  const phaseResultIds = new Set([
    ...completed.phaseResults.nonTenderedPlayers,
    ...completed.phaseResults.extensions.map((entry) => entry.playerId),
    ...completed.phaseResults.qualifyingOffers.map((entry) => entry.playerId),
    ...completed.phaseResults.freeAgentSignings.map((entry) => entry.playerId),
    ...completed.phaseResults.draftPicks.map((entry) => entry.playerId),
    ...completed.phaseResults.ifaSignings.map((entry) => entry.playerId),
    ...capturedEntrantIds,
  ]);
  // startNextSeason intentionally clears Rule 5 session/obligation state. Keep
  // the exact source tuples so post-transition ownership can be audited.
  const rule5Selections = structuredClone(requireState().rule5Session?.selections ?? []);
  const rule5CandidatePlayers = structuredClone(requireState().rule5Session?.candidatePlayers ?? []);
  const rule5Obligations = structuredClone(requireState().rule5Obligations);
  const preStartPlayers = requireState().players.map((player) => ({
    id: player.id,
    teamId: player.teamId,
    rosterStatus: player.rosterStatus,
    overallRating: player.overallRating,
  }));
  const preStartNextRosterAudit = captureTeamRosterAudit(requireState(), 'pre_start_next');
  const activeRule5Ids = new Set(rule5Obligations
    .filter((obligation) => obligation.status === 'active')
    .map((obligation) => obligation.playerId));
  const finalNormalizationDemotionIds = preStartNextRosterAudit.flatMap((audit) => {
    const candidates = preStartPlayers
      .filter((player) => player.teamId === audit.teamId && player.rosterStatus === 'MLB')
      .sort((left, right) => {
        const leftProtected = activeRule5Ids.has(left.id) ? 1 : 0;
        const rightProtected = activeRule5Ids.has(right.id) ? 1 : 0;
        if (leftProtected !== rightProtected) return leftProtected - rightProtected;
        return left.overallRating - right.overallRating || left.id.localeCompare(right.id);
      });
    const demoted: string[] = [];
    while (candidates.length > 30) {
      const overflowIndex = candidates.findIndex((player) => !activeRule5Ids.has(player.id));
      if (overflowIndex === -1) break;
      const [overflow] = candidates.splice(overflowIndex, 1);
      if (overflow) demoted.push(overflow.id);
    }
    return demoted;
  }).sort();
  const startNext = actionApi.startNextSeason();
  expect(startNext.phase).toBe('preseason');
  const state = requireState();
  assertCanonicalRosterOwnership(state);

  const afterIds = ids(state.players);
  const afterCategories = populationCategories(state.players);
  const transitionSummary = buildEconomyTransitionSummary(rolloverStartCategories, afterCategories);
  assertEconomyTransitionEquations(rolloverStartCategories, afterCategories, transitionSummary);
  const population = classifyEconomyPopulation(state.players, estimateSnapshotSize(actionApi.exportSnapshot() as GameSnapshot));
  const entrants = [...afterIds].filter((id) => !rolloverStartIds.has(id));
  const exits = [...rolloverStartIds].filter((id) => !afterIds.has(id));
  const recordedRetirementIds = state.historicalPlayers
    .filter((player) => player.retiredSeason === state.season - 1)
    .map((player) => player.playerId);
  assertExactIdSet(exits, recordedRetirementIds, `recorded exits ${rollover}`);
  const assignmentChanges = state.players.filter((player) => (
    beforeAssignments.has(player.id) && beforeAssignments.get(player.id) !== player.teamId
  ));
  const rule5ProvenanceById = new Map<string, 'rollover_start' | 'same_rollover_draft'>();
  const validatedRule5Ids = rule5Selections.map((selection) => {
    const matchingObligations = rule5Obligations.filter((entry) => entry.playerId === selection.playerId);
    expect(matchingObligations, `Rule 5 ${selection.playerId} has one obligation`).toHaveLength(1);
    const obligation = matchingObligations[0];
    const before = inputs.get(selection.playerId);
    const after = state.players.find((player) => player.id === selection.playerId);
    expect(obligation, `Rule 5 ${selection.playerId} retained its obligation tuple before reset`).toBeTruthy();
    const provenance = classifyEconomyRule5Provenance({
      playerId: selection.playerId,
      originalTeamId: selection.originalTeamId,
      currentSeason: completed.season,
      rolloverStartTeamId: before?.teamId,
      draftResults: completed.phaseResults.draftPicks,
      ifaResults: completed.phaseResults.ifaSignings,
      candidateRows: rule5CandidatePlayers,
    });
    rule5ProvenanceById.set(selection.playerId, provenance);
    expect(after?.teamId, `Rule 5 ${selection.playerId} drafting owner`).toBe(selection.draftingTeamId);
    expect(after?.rosterStatus, `Rule 5 ${selection.playerId} MLB placement`).toBe('MLB');
    expect(after?.contract.years, `Rule 5 ${selection.playerId} contract term`).toBeGreaterThanOrEqual(1);
    expect(state.rosterStates.get(selection.draftingTeamId)?.mlbRoster).toContain(selection.playerId);
    expect(state.rosterStates.get(selection.draftingTeamId)?.fortyManRoster).toContain(selection.playerId);
    expect(state.rosterStates.get(selection.originalTeamId)?.mlbRoster).not.toContain(selection.playerId);
    expect(state.rosterStates.get(selection.originalTeamId)?.fortyManRoster).not.toContain(selection.playerId);
    expect(classifyEconomyAssignmentEvidence({
      playerId: selection.playerId,
      beforeTeamId: selection.originalTeamId,
      afterTeamId: after?.teamId ?? '',
      beforeLevel: before?.rosterStatus ?? 'INTERNATIONAL',
      afterLevel: after?.rosterStatus ?? 'INTERNATIONAL',
      rule5Selection: selection,
      rule5Obligation: obligation,
    })).toBe('rule5');
    return selection.playerId;
  }).sort();
  expect(new Set(validatedRule5Ids).size, 'Rule 5 selections are unique').toBe(validatedRule5Ids.length);
  const rolloverStartRule5Ids = validatedRule5Ids
    .filter((playerId) => rule5ProvenanceById.get(playerId) === 'rollover_start');
  const sameRolloverDraftRule5Ids = validatedRule5Ids
    .filter((playerId) => rule5ProvenanceById.get(playerId) === 'same_rollover_draft');

  const autofillPromotionIds = [...new Set([...state.rosterStates.values()]
    .flatMap((roster) => roster.transactions)
    .filter((transaction) => transaction.action === 'promote' && transaction.timestamp === 'AUTO')
    .map((transaction) => {
      const before = inputs.get(transaction.playerId);
      const after = state.players.find((player) => player.id === transaction.playerId);
      expect(classifyEconomyAssignmentEvidence({
        playerId: transaction.playerId,
        beforeTeamId: before?.teamId ?? '',
        afterTeamId: after?.teamId ?? '',
        beforeLevel: before?.rosterStatus ?? 'INTERNATIONAL',
        afterLevel: after?.rosterStatus ?? 'INTERNATIONAL',
        autoPromotion: transaction,
      })).toBe('autofill');
      return transaction.playerId;
    }))].sort();
  const finalRosterAudit = captureTeamRosterAudit(state, 'final_preseason');
  const acceptedAssignmentIds = new Set([
    ...phaseResultIds,
    ...clockFacts.declines,
    ...clockFacts.exercises,
    ...validatedRule5Ids,
  ]);
  const changedAssignmentIds = assignmentChanges.map((player) => player.id);
  const unexplainedAssignmentChanges = changedAssignmentIds.filter((playerId) => !acceptedAssignmentIds.has(playerId));
  assertAssignmentAttribution(changedAssignmentIds, [...acceptedAssignmentIds]);
  expect(unexplainedAssignmentChanges).toEqual([]);

  const draftEntrants = completed.phaseResults.draftPicks.length;
  const ifaEntrants = completed.phaseResults.ifaSignings.length;
  assertEntrantAttribution(
    entrants,
    completed.phaseResults.draftPicks.map((entry) => entry.playerId),
    completed.phaseResults.ifaSignings.map((entry) => entry.playerId),
  );
  const postInvariantCategories = invariantCategories(harness, state);
  const rosterCheckpoints = [
    ...preClockRosterAudit,
    ...postClockRosterAudit,
    ...(postFaRosterAudit ?? []),
    ...(postRule5RosterAudit ?? []),
    ...preStartNextRosterAudit,
    ...finalRosterAudit,
  ];
  const checkpointOrder = [
    'pre_clock',
    'post_clock',
    'post_fa',
    'post_rule5',
    'pre_start_next',
    'final_preseason',
  ];
  const nonTenderIds = completed.phaseResults.nonTenderedPlayers;
  const qoIds = completed.phaseResults.qualifyingOffers.map((entry) => entry.playerId);
  const faSigningIds = completed.phaseResults.freeAgentSignings.map((entry) => entry.playerId);
  const draftIds = completed.phaseResults.draftPicks.map((entry) => entry.playerId);
  const ifaIds = completed.phaseResults.ifaSignings.map((entry) => entry.playerId);
  const evidenceByCause: Partial<Record<EconomyRosterCause, string[]>> = {
    goal11_expiry_release: [...capturedEntrantIds],
    goal11_fa_signing: faSigningIds,
    goal11_qo: qoIds,
    non_tender: nonTenderIds,
    rule5_in: validatedRule5Ids,
    rule5_out: validatedRule5Ids,
    auto_promotion: autofillPromotionIds,
    final_normalization_demotion: finalNormalizationDemotionIds,
    draft_entry: draftIds,
    ifa_entry: ifaIds,
    retirement: recordedRetirementIds,
  };
  const rosterCausalRows: EconomyRosterCausalRow[] = [];
  const classifyRosterCause = (playerId: string, teamId: string, direction: 'in' | 'out'): EconomyRosterCause => {
    const rule5 = rule5Selections.find((selection) => selection.playerId === playerId);
    if (direction === 'in') {
      if (rule5?.draftingTeamId === teamId && validatedRule5Ids.includes(playerId)) return 'rule5_in';
      if (completed.phaseResults.freeAgentSignings.some((entry) => entry.playerId === playerId && entry.teamId === teamId)) return 'goal11_fa_signing';
      if (autofillPromotionIds.includes(playerId)) return 'auto_promotion';
      if (completed.phaseResults.draftPicks.some((entry) => entry.playerId === playerId && entry.teamId === teamId)) return 'draft_entry';
      if (completed.phaseResults.ifaSignings.some((entry) => entry.playerId === playerId && entry.teamId === teamId)) return 'ifa_entry';
      return 'unexplained';
    }
    if (rule5?.originalTeamId === teamId && validatedRule5Ids.includes(playerId)) return 'rule5_out';
    if (nonTenderIds.includes(playerId)) return 'non_tender';
    if (qoIds.includes(playerId) && capturedEntrantIds.has(playerId)) return 'goal11_qo';
    if (capturedEntrantIds.has(playerId)) return 'goal11_expiry_release';
    if (recordedRetirementIds.includes(playerId)) return 'retirement';
    if (finalNormalizationDemotionIds.includes(playerId)) return 'final_normalization_demotion';
    return 'unexplained';
  };
  const rosterTeamIds = [...new Set(rosterCheckpoints.map((audit) => audit.teamId))].sort();
  for (const teamId of rosterTeamIds) {
    const teamCheckpoints = checkpointOrder.map((checkpoint) => {
      const audit = rosterCheckpoints.find((entry) => entry.teamId === teamId && entry.checkpoint === checkpoint);
      expect(audit, `${teamId} ${checkpoint} roster audit`).toBeTruthy();
      return audit!;
    });
    for (let index = 1; index < teamCheckpoints.length; index += 1) {
      const before = teamCheckpoints[index - 1]!;
      const after = teamCheckpoints[index]!;
      const beforeIds = new Set(before.mlbIds);
      const afterIds = new Set(after.mlbIds);
      for (const playerId of before.mlbIds.filter((id) => !afterIds.has(id))) {
        rosterCausalRows.push({
          playerId,
          teamId,
          direction: 'out',
          cause: classifyRosterCause(playerId, teamId, 'out'),
          evidenceId: playerId,
          fromCheckpoint: before.checkpoint,
          toCheckpoint: after.checkpoint,
        });
      }
      for (const playerId of after.mlbIds.filter((id) => !beforeIds.has(id))) {
        rosterCausalRows.push({
          playerId,
          teamId,
          direction: 'in',
          cause: classifyRosterCause(playerId, teamId, 'in'),
          evidenceId: playerId,
          fromCheckpoint: before.checkpoint,
          toCheckpoint: after.checkpoint,
        });
      }
    }
  }
  if (seed === 7112 && rollover === 5) {
    for (const playerId of ['auth-chi-mlb-020', 'auth-nas-aa-010']) {
      expect(rosterCausalRows.some((row) => (
        row.teamId === 'sfb'
        && row.playerId === playerId
        && row.direction === 'in'
        && row.cause === 'goal11_fa_signing'
      )), `seed 7112 rollover 5 must not admit ${playerId} to SFB through Goal-11 FA`).toBe(false);
    }
  }
  const canonicalFinalTeamById = new Map(state.players.map((player) => [player.id, player.teamId] as const));
  const adjacentOverLimitTeams = rosterTeamIds.flatMap((teamId) => {
    const result = auditEconomyTeamRoster({
      teamId,
      checkpoints: checkpointOrder.map((checkpoint) => {
        const audit = rosterCheckpoints.find((entry) => entry.teamId === teamId && entry.checkpoint === checkpoint)!;
        return { checkpoint, mlbIds: audit.mlbIds, fortyManIds: audit.fortyManIds };
      }),
      rows: rosterCausalRows.filter((row) => row.teamId === teamId),
      evidenceByCause,
      canonicalFinalTeamById,
    });
    if (result.overLimitClassification !== 'adjacent') return [];
    const finalIds = finalRosterAudit.find((audit) => audit.teamId === teamId)?.mlbIds ?? [];
    return [{
      teamId,
      finalMlbCount: result.finalMlbCount,
      withoutGoal11Count: result.withoutGoal11Count,
      finalMlbIdsSha256: createHash('sha256').update(stableJson(finalIds)).digest('hex'),
    }];
  });
  const allowedExpiryVacancy = clockFacts.naturalMlbExpiries > 0
    ? postInvariantCategories.filter((category) => category !== 'roster:active_roster_under_limit')
    : postInvariantCategories;
  assertNoNewInvariantCategory(
    baselineInvariantCategories,
    allowedExpiryVacancy.filter((category) => (
      category !== 'core:roster_size_exceeded' && category !== 'roster:active_roster_over_limit'
    )),
  );
  const sample: EconomyRolloverSample = {
    rollover,
    ...population,
    entrants: entrants.length,
    exits: exits.length,
    draftEntrants,
    ifaEntrants,
    marketAtEntry,
    marketAfterPhase,
  };
  assertPopulationSample(sample, baseline, {
    skipAssignmentPartitionBands: measureEconomySoak,
    skipMarketEntryUpperBand: measureEconomySoak,
    skipMarketAfterPhaseUpperBand: measureEconomySoak,
  });

  const perTeamMlbCounts = Object.fromEntries([...state.rosterStates].map(([teamId, roster]) => [teamId, roster.mlbRoster.length]));
  const perTeamFortyCounts = Object.fromEntries([...state.rosterStates].map(([teamId, roster]) => [teamId, roster.fortyManRoster.length]));
  const payrolls = [...state.rosterStates.keys()].map((teamId) => state.players
    .filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB')
    .reduce((sum, player) => sum + player.contract.annualSalary, 0));

  const entrantCategories = entrants.map((id) => afterCategories.get(id));
  const exitCategories = exits.map((id) => rolloverStartCategories.get(id));
  const sameTeamLevelChanges = state.players.filter((player) => {
    const beforeCategory = rolloverStartCategories.get(player.id);
    const afterCategory = afterCategories.get(player.id);
    return rolloverStartTeamById.get(player.id) === player.teamId
      && ((beforeCategory === 'minor' && afterCategory === 'major')
        || (beforeCategory === 'major' && afterCategory === 'minor'));
  }).length;
  const cohortCounts: Record<EconomyMarketPrimaryCohort, number> = {
    unsigned_carryover: 0,
    qo_rejected_or_expired: 0,
    current_non_tender: 0,
    new_clock_expiry: 0,
    existing_zero_assigned: 0,
    existing_zero_unassigned_other: 0,
    other_accepted: 0,
    unattributed: 0,
  };
  for (const row of marketCohortRows) cohortCounts[row.primaryCohort] += 1;
  const transitionReceipt: PopulationTransitionReceipt = {
    seed,
    rollover,
    before: rolloverStartPopulation,
    after: population,
    transitions: transitionSummary.transitions,
    gross: transitionSummary.gross,
    clock: {
      naturalMlbExpiries: clockFacts.naturalMlbExpiries,
      eligibleMinorExpiries: clockFacts.eligibleMinorExpiries,
      ineligibleMinorExpiries: clockFacts.ineligibleMinorExpiries,
      optionExercises: clockFacts.exercises.length,
      optionDeclines: clockFacts.declines.length,
    },
    market: {
      postQoEligible: postQoEligibleCount,
      releasedFromMajor,
      releasedFromMinor,
      alreadyUnassigned,
      dayOneSigned: dayOneSignedCount,
      finalSigned: state.freeAgencyMarket?.signedPlayers.length ?? 0,
      remaining: state.freeAgencyMarket?.freeAgents.length ?? 0,
      carryover: marketCohortSummary.carryover,
      newAdmissions: marketCohortSummary.newAdmissions,
      lostPriorRemaining: marketCohortSummary.lost,
      cohorts: cohortCounts,
      rows: marketCohortRows,
    },
    entrants: {
      draft: draftEntrants,
      ifa: ifaEntrants,
      finalMajor: entrantCategories.filter((category) => category === 'major').length,
      finalMinor: entrantCategories.filter((category) => category === 'minor').length,
      finalUnassigned: entrantCategories.filter((category) => category === 'unassigned').length,
    },
    exits: {
      fromMajor: exitCategories.filter((category) => category === 'major').length,
      fromMinor: exitCategories.filter((category) => category === 'minor').length,
      fromUnassigned: exitCategories.filter((category) => category === 'unassigned').length,
    },
    rosterTransitions: {
      minorToMajor: transitionSummary.transitions.minor.major,
      majorToMinor: transitionSummary.transitions.major.minor,
      sameTeamLevelChanges,
    },
    assignmentEvidence: {
      autofillPromotionCount: autofillPromotionIds.length,
      autofillPromotionIds,
      autofillPromotionIdsSha256: createHash('sha256').update(stableJson(autofillPromotionIds)).digest('hex'),
      rule5SelectionCount: validatedRule5Ids.length,
      rule5SelectionIds: validatedRule5Ids,
      rule5SelectionIdsSha256: createHash('sha256').update(stableJson(validatedRule5Ids)).digest('hex'),
      rule5RolloverStartSelectionCount: rolloverStartRule5Ids.length,
      rule5RolloverStartSelectionIdsSha256: createHash('sha256').update(stableJson(rolloverStartRule5Ids)).digest('hex'),
      rule5SameRolloverDraftSelectionCount: sameRolloverDraftRule5Ids.length,
      rule5SameRolloverDraftSelectionIdsSha256: createHash('sha256').update(stableJson(sameRolloverDraftRule5Ids)).digest('hex'),
    },
    rosterAudit: {
      checkpoints: rosterCheckpoints,
      causalRows: rosterCausalRows,
      adjacentOverLimitTeams,
    },
    bytes: population.bytes,
    bytesPerPlayer: population.bytes / population.total,
  };
  marketContext.priorRemainingIds = new Set(
    state.freeAgencyMarket?.freeAgents.map((entry) => entry.player.id) ?? [],
  );
  marketContext.priorSignedIds = new Set(
    state.freeAgencyMarket?.signedPlayers.map((entry) => entry.player.id) ?? [],
  );
  marketContext.priorEntryCount = marketAtEntry;

  return {
    seed,
    ...sample,
    naturalMlbExpiries: clockFacts.naturalMlbExpiries,
    eligibleMinorExpiries: clockFacts.eligibleMinorExpiries,
    ineligibleMinorExpiries: clockFacts.ineligibleMinorExpiries,
    optionExercises: clockFacts.exercises.length,
    optionDeclines: clockFacts.declines.length,
    qualifyingOfferResults: completed.phaseResults.qualifyingOffers.reduce<Record<string, number>>((counts, entry) => ({
      ...counts,
      [entry.status]: (counts[entry.status] ?? 0) + 1,
    }), {}),
    assignmentChanges: assignmentChanges.length,
    unexplainedAssignmentChanges,
    freeAgentSignings: completed.phaseResults.freeAgentSignings.length,
    perTeamMlbCounts,
    perTeamFortyCounts,
    payrollSpread: Math.max(...payrolls) - Math.min(...payrolls),
    transitionReceipt,
  };
}

describe('Goal 11 current-schema economy soak (explicit gate required)', () => {
  afterEach(async () => {
    const harness = await loadHarness();
    harness.setState(null);
    vi.restoreAllMocks();
  });

  economyIt('runs the frozen 7111/7112/7113 × six-rollover real-worker matrix', async () => {
    const reports: EconomyReport[][] = [];
    const baselines: EconomyPopulation[] = [];
    for (const seed of economySoakSeeds) {
      const harness = await loadHarness();
      harness.actionApi.newGame({ seed, userTeamId: 'nym', gmName: 'Economy Audit', difficulty: 'standard', saveSlot: 1 });
      const baseline = classifyEconomyPopulation(harness.requireState().players, estimateSnapshotSize(harness.actionApi.exportSnapshot() as GameSnapshot));
      expect(baseline).toMatchObject({ total: 5408, minor: 4512, major: 896, unassigned: 0 });
      baselines.push(baseline);
      const seedReports: EconomyReport[] = [];
      const marketContext: MarketCohortContext = {
        priorRemainingIds: new Set(),
        priorSignedIds: new Set(),
        priorEntryCount: 0,
        entryStreak: new Map(),
      };
      for (let rollover = 1; rollover <= ECON_CLOCK_SOAK_ROLLOVERS; rollover += 1) {
        const report = advanceOneRollover(harness, seed, rollover, baseline, marketContext);
        assertRolloverFlow(rollover === 1 ? baseline : seedReports[rollover - 2]!, report);
        seedReports.push(report);
      }
      reports.push(seedReports);
    }

    const slopeMetrics = measureEconomySoak
      ? (['total'] as const)
      : (['total', 'minor', 'major', 'unassigned', 'bytes'] as const);
    for (const [seedIndex, seedReports] of reports.entries()) {
      for (const metric of slopeMetrics) {
        assertSlopeBands(metric, economySlope([
          baselines[seedIndex]![metric],
          ...seedReports.map((report) => report[metric]),
        ]));
      }
    }
    for (const metric of slopeMetrics) {
      assertSlopeBands(metric, economySlope([
        mean(baselines.map((baseline) => baseline[metric])),
        ...Array.from({ length: ECON_CLOCK_SOAK_ROLLOVERS }, (_, index) => mean(reports.map((seedReports) => seedReports[index]![metric]))),
      ]));
    }
    const transitionReceipts = reports.flatMap((seedReports) =>
      seedReports.map((report) => report.transitionReceipt));
    const receiptJson = stableJson({
      goal: 'ECON-CLOCK-1',
      seeds: economySoakSeeds,
      rollovers: ECON_CLOCK_SOAK_ROLLOVERS,
      transitionReceipts,
    });
    const receiptSha256 = createHash('sha256').update(receiptJson).digest('hex');
    if (!measureEconomySoak && EXPECTED_ECON_CLOCK_RECEIPT_SHA256) {
      expect(receiptSha256).toBe(EXPECTED_ECON_CLOCK_RECEIPT_SHA256);
    }
    const scalarReports = reports.map((seedReports) => seedReports.map((report) => ({
      seed: report.seed,
      rollover: report.rollover,
      total: report.total,
      minor: report.minor,
      major: report.major,
      unassigned: report.unassigned,
      bytes: report.bytes,
      entrants: report.entrants,
      exits: report.exits,
      marketAtEntry: report.marketAtEntry,
      marketAfterPhase: report.marketAfterPhase,
      naturalMlbExpiries: report.naturalMlbExpiries,
      optionExercises: report.optionExercises,
      optionDeclines: report.optionDeclines,
      freeAgentSignings: report.freeAgentSignings,
    })));
    console.info(JSON.stringify({
      goal: 'ECON-CLOCK-1',
      kind: 'band-freeze-receipt',
      mode: measureEconomySoak ? 'measurement' : 'authoritative',
      seeds: economySoakSeeds,
      baselines,
      reports: scalarReports,
      slopes: (['total', 'minor', 'major', 'unassigned', 'bytes'] as const).map((metric) => ({
        metric,
        perSeed: reports.map((seedReports, seedIndex) => economySlope([
          baselines[seedIndex]![metric],
          ...seedReports.map((report) => report[metric]),
        ])),
        mean: economySlope([
          mean(baselines.map((baseline) => baseline[metric])),
          ...Array.from({ length: ECON_CLOCK_SOAK_ROLLOVERS }, (_, index) =>
            mean(reports.map((seedReports) => seedReports[index]![metric]))),
        ]),
      })),
      receiptSha256,
    }));
    const reportSummaries = reports.map((seedReports) => seedReports.map((report) => {
      const { rows: _rows, ...market } = report.transitionReceipt.market;
      const {
        autofillPromotionIds: _autofillPromotionIds,
        rule5SelectionIds: _rule5SelectionIds,
        ...assignmentEvidence
      } = report.transitionReceipt.assignmentEvidence;
      return {
        ...report,
        transitionReceipt: {
          ...report.transitionReceipt,
          market,
          assignmentEvidence,
          rosterAudit: compactRosterAuditForConsole(report.transitionReceipt.rosterAudit),
        },
      };
    }));
    console.info(JSON.stringify({
      goal: 'ECON-CLOCK-1',
      mode: measureEconomySoak ? 'measurement' : 'authoritative',
      seeds: economySoakSeeds,
      rollovers: ECON_CLOCK_SOAK_ROLLOVERS,
      receiptSha256,
      reports: reportSummaries,
    }));
  }, 1_800_000);
});
