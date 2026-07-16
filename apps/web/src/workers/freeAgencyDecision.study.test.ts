// @vitest-environment node

import { createHash } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  TEAMS,
  calculateTeamPayroll,
  evaluateTeamNeeds,
  type FreeAgencyOfferDecision,
} from '@mbd/sim-core';
import {
  hasCanonicalFreeAgencyMarket,
  requireState,
  setState,
  skipOffseasonPhaseWithAI,
  type FullGameState,
} from './sim.worker.helpers.js';

vi.mock('comlink', () => ({ expose: () => {} }));

const DEFAULT_STUDY_SEEDS = [7601, 7602, 7603, 7604] as const;
const runStudy = process.env.MBD_FA_DECISION_STUDY === '1';
const measureStudy = process.env.MBD_FA_DECISION_STUDY_MEASURE === '1';
const requestedSeed = Number(process.env.MBD_FA_DECISION_STUDY_SEED);
const STUDY_SEEDS = measureStudy && Number.isInteger(requestedSeed) && requestedSeed > 0
  ? [requestedSeed]
  : [...DEFAULT_STUDY_SEEDS];
const requestedSeasons = Number(process.env.MBD_FA_DECISION_STUDY_SEASONS);
const SEASONS_PER_SEED = measureStudy
  && Number.isInteger(requestedSeasons)
  && requestedSeasons >= 1
  && requestedSeasons <= 4
  ? requestedSeasons
  : 4;
const studyIt = runStudy ? it : it.skip;

interface DecisionStudySigning {
  playerId: string;
  teamId: string;
  years: number;
  annualSalary: number;
  marketValue: number;
  decision: FreeAgencyOfferDecision | null;
  payrollBeforeSigning: number | null;
  independentlyDerivedPayrollBeforeSigning: number | null;
  spendingLimit: number | null;
  independentlyDerivedTeamNeed: number | null;
  reasonNewsCount: number;
  actor: 'cpu';
}

interface DecisionStudyRow {
  seed: number;
  season: number;
  marketSize: number;
  signings: DecisionStudySigning[];
  competitiveDecisions: number;
  marketExhaustedDecisions: number;
  missingDecisions: number;
  reasonCoverage: number;
  unsupportedReasons: number;
  duplicateDecisionNews: number;
  invalidRoleFacts: number;
  duplicatePlayers: number;
  canonicalMarket: boolean;
  overCapacityTeams: string[];
  unaffordableSignings: string[];
  meaningfulSignings: number;
  topAav: number;
  payrollSpread: number;
  reasonIncidence: Record<string, number>;
  cpuSignings: number;
  userSignings: number;
  receiptReconciliationErrors: string[];
  rngState: ReturnType<FullGameState['rng']['getState']>;
}

async function loadActionApi() {
  const { actionApi, applyAISigningProgress } = await import('./sim.worker.actions.js');
  return { actionApi, applyAISigningProgress };
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function completeOffseasonWithDecisionReceipts(
  actions: Awaited<ReturnType<typeof loadActionApi>>,
): Array<{
  playerId: string;
  teamId: string;
  years: number;
  annualSalary: number;
  marketValue: number;
  decision?: FreeAgencyOfferDecision;
  payrollBeforeSigning?: number;
  independentlyDerivedPayrollBeforeSigning?: number;
  spendingLimit?: number;
  independentlyDerivedTeamNeed?: number;
}> {
  const { actionApi, applyAISigningProgress } = actions;
  actionApi.simRemainingPlayoffs();
  actionApi.proceedToOffseason();
  const decisions = [] as ReturnType<typeof completeOffseasonWithDecisionReceipts>;
  let guard = 0;

  while (!requireState().offseasonState?.completed) {
    const progress = skipOffseasonPhaseWithAI(requireState());
    expect(progress.error).toBeUndefined();
    const state = requireState();
    const receiptRows = progress.aiSignings.map((signing) => {
      const player = state.players.find((candidate) => candidate.id === signing.playerId);
      const rosterBeforeSigning = (signing.mlbRosterPlayerIdsBeforeSigning ?? [])
        .map((playerId) => state.players.find((candidate) => candidate.id === playerId))
        .filter((candidate): candidate is NonNullable<typeof candidate> => candidate != null);
      const independentlyDerivedTeamNeed = player
        ? evaluateTeamNeeds(rosterBeforeSigning).get(player.position)
        : undefined;
      return { ...signing, independentlyDerivedTeamNeed };
    });
    applyAISigningProgress(state, progress.aiSignings);
    decisions.push(...receiptRows);
    guard += 1;
    if (guard > 20) {
      throw new Error('Free-agent decision study exceeded the offseason phase guard.');
    }
  }

  return decisions;
}

function captureRow(
  seed: number,
  state: FullGameState,
  progressSignings: ReturnType<typeof completeOffseasonWithDecisionReceipts>,
): DecisionStudyRow {
  const signingRows = progressSignings.map((signing): DecisionStudySigning => {
    const decision = signing.decision ?? null;
    const reasonNewsCount = decision
      ? state.news.filter((item) => (
        item.category === 'signing'
        && item.relatedPlayerIds.includes(signing.playerId)
        && item.body.includes(`Decision: ${decision.summary}`)
      )).length
      : 0;
    return {
      ...signing,
      decision,
      payrollBeforeSigning: signing.payrollBeforeSigning ?? null,
      independentlyDerivedPayrollBeforeSigning:
        signing.independentlyDerivedPayrollBeforeSigning ?? null,
      spendingLimit: signing.spendingLimit ?? null,
      independentlyDerivedTeamNeed: signing.independentlyDerivedTeamNeed ?? null,
      reasonNewsCount,
      actor: 'cpu',
    };
  });
  const playerIds = state.players.map((player) => player.id);
  const payrolls = TEAMS.map((team) => calculateTeamPayroll(team.id, state.players).mlbPayroll);
  const reasonIncidence: Record<string, number> = {};
  for (const row of signingRows) {
    for (const reason of row.decision?.reasonCodes ?? []) {
      reasonIncidence[reason] = (reasonIncidence[reason] ?? 0) + 1;
    }
  }
  const sortTuples = <T extends { playerId: string }>(tuples: T[]) => (
    tuples.sort((left, right) => left.playerId.localeCompare(right.playerId))
  );
  const receiptTuples = sortTuples(signingRows.map((row) => ({
    playerId: row.playerId,
    teamId: row.teamId,
    years: row.years,
    annualSalary: row.annualSalary,
  })));
  const phaseResultTuples = sortTuples(
    [...(state.offseasonState?.phaseResults.freeAgentSignings ?? [])].map((signing) => ({
      playerId: signing.playerId,
      teamId: signing.teamId,
      years: signing.years,
      annualSalary: signing.annualSalary,
    })),
  );
  const marketSigningTuples = sortTuples(
    [...(state.freeAgencyMarket?.signedPlayers ?? [])].map((signing) => ({
      playerId: signing.player.id,
      teamId: signing.signedWith ?? '',
      years: signing.contract?.years ?? -1,
      annualSalary: signing.contract?.annualSalary ?? -1,
    })),
  );
  const canonicalPlayerTuples = sortTuples(signingRows.map((row) => {
    const player = state.players.find((candidate) => candidate.id === row.playerId);
    return {
      playerId: row.playerId,
      teamId: player?.teamId ?? '',
      years: player?.contract.years ?? -1,
      annualSalary: player?.contract.annualSalary ?? -1,
    };
  }));
  const receiptReconciliationErrors = [
    ...(JSON.stringify(receiptTuples) === JSON.stringify(phaseResultTuples)
      ? []
      : ['phase-results']),
    ...(JSON.stringify(receiptTuples) === JSON.stringify(marketSigningTuples)
      ? []
      : ['canonical-market']),
    ...(JSON.stringify(receiptTuples) === JSON.stringify(canonicalPlayerTuples)
      ? []
      : ['canonical-players']),
  ];

  return {
    seed,
    season: state.season,
    marketSize: (state.freeAgencyMarket?.freeAgents.length ?? 0)
      + (state.freeAgencyMarket?.signedPlayers.length ?? 0),
    signings: signingRows,
    competitiveDecisions: signingRows.filter((row) => row.decision?.kind === 'competitive').length,
    marketExhaustedDecisions: signingRows.filter((row) => row.decision?.kind === 'market_exhausted').length,
    missingDecisions: signingRows.filter((row) => !row.decision).length,
    reasonCoverage: signingRows.filter((row) => row.reasonNewsCount === 1).length,
    unsupportedReasons: signingRows.filter((row) => {
      const decision = row.decision;
      if (!decision) return true;
      if (decision.kind === 'market_exhausted') {
        return decision.reasonCodes.join(',') !== 'market_exhausted'
          || decision.primaryPreference !== null
          || Object.values(decision.factors).some((factor) => factor.contribution !== 0);
      }
      return !decision.accepted
        || decision.reasonCodes[0] !== 'financial_terms'
        || decision.primaryPreference == null
        || !decision.reasonCodes.includes(decision.primaryPreference);
    }).length,
    duplicateDecisionNews: signingRows.filter((row) => row.reasonNewsCount > 1).length,
    invalidRoleFacts: signingRows.filter((row) => {
      const decision = row.decision;
      if (!decision) return true;
      const opportunity = decision.context.projectedOpportunity;
      const need = decision.context.teamNeed;
      return row.independentlyDerivedTeamNeed !== need
        || (opportunity === 'featured'
        ? need < 75
        : opportunity === 'regular'
          ? need < 50 || need >= 75
          : need >= 50);
    }).length,
    duplicatePlayers: playerIds.length - new Set(playerIds).size,
    canonicalMarket: hasCanonicalFreeAgencyMarket(state),
    overCapacityTeams: TEAMS
      .filter((team) => state.players.filter((player) => (
        player.teamId === team.id && player.rosterStatus === 'MLB'
      )).length > 26)
      .map((team) => team.id),
    unaffordableSignings: signingRows
      .filter((row) => (
        row.payrollBeforeSigning == null
        || row.independentlyDerivedPayrollBeforeSigning == null
        || row.spendingLimit == null
        || row.payrollBeforeSigning !== row.independentlyDerivedPayrollBeforeSigning
        || row.payrollBeforeSigning + row.annualSalary > row.spendingLimit
      ))
      .map((row) => row.playerId),
    meaningfulSignings: signingRows.filter((row) => row.annualSalary >= 10).length,
    topAav: round(signingRows.reduce((max, row) => Math.max(max, row.annualSalary), 0)),
    payrollSpread: round(Math.max(...payrolls) - Math.min(...payrolls)),
    reasonIncidence,
    cpuSignings: signingRows.filter((row) => row.actor === 'cpu').length,
    userSignings: 0,
    receiptReconciliationErrors,
    rngState: state.rng.getState(),
  };
}

function assertStudyRow(row: DecisionStudyRow, state: FullGameState): void {
  expect(row.missingDecisions).toBe(0);
  expect(row.reasonCoverage).toBe(row.signings.length);
  expect(row.unsupportedReasons).toBe(0);
  expect(row.duplicateDecisionNews).toBe(0);
  expect(row.invalidRoleFacts).toBe(0);
  expect(row.duplicatePlayers).toBe(0);
  expect(row.canonicalMarket).toBe(true);
  expect(row.overCapacityTeams).toEqual([]);
  expect(row.unaffordableSignings).toEqual([]);
  expect(row.receiptReconciliationErrors).toEqual([]);
  expect(row.cpuSignings).toBe(row.signings.length);
  expect(row.userSignings).toBe(0);
  expect(row.competitiveDecisions + row.marketExhaustedDecisions).toBe(row.signings.length);
  for (const signing of row.signings) {
    const player = state.players.find((candidate) => candidate.id === signing.playerId);
    expect(player).toMatchObject({
      teamId: signing.teamId,
      rosterStatus: 'MLB',
      contract: {
        years: signing.years,
        annualSalary: signing.annualSalary,
      },
    });
    expect(signing.independentlyDerivedTeamNeed).toBe(signing.decision?.context.teamNeed);
    expect(signing.independentlyDerivedPayrollBeforeSigning).toBe(signing.payrollBeforeSigning);
    expect(signing.decision?.actualAav).toBe(signing.annualSalary);
    expect(signing.decision?.teamId).toBe(signing.teamId);
    expect(signing.decision?.playerId).toBe(signing.playerId);
  }

  expect(row.marketSize).toBeGreaterThanOrEqual(450);
  expect(row.marketSize).toBeLessThanOrEqual(1_089);
  expect(row.signings.length).toBeGreaterThanOrEqual(21);
  expect(row.signings.length).toBeLessThanOrEqual(58);
  expect(row.meaningfulSignings).toBeGreaterThanOrEqual(21);
  expect(row.meaningfulSignings).toBeLessThanOrEqual(57);
  expect(row.topAav).toBeGreaterThanOrEqual(20);
  expect(row.topAav).toBeLessThanOrEqual(45);
  expect(row.payrollSpread).toBeGreaterThanOrEqual(25);
  expect(row.payrollSpread).toBeLessThanOrEqual(350);
}

async function runStudyPass(
  actions: Awaited<ReturnType<typeof loadActionApi>>,
  emitRows: boolean,
  seeds: readonly number[],
): Promise<DecisionStudyRow[]> {
  const rows: DecisionStudyRow[] = [];
  for (const seed of seeds) {
    setState(null);
    actions.actionApi.newGame({
      seed,
      userTeamId: 'nym',
      gmName: 'FA Decision Study',
      difficulty: 'standard',
      saveSlot: 16,
      dayOneExperience: 'quick',
    });

    for (let completedSeason = 0; completedSeason < SEASONS_PER_SEED; completedSeason += 1) {
      const expectedSeason = requireState().season;
      const regularSeason = actions.actionApi.simToPlayoffs();
      expect(
        regularSeason.phase,
        `Seed ${seed}, season ${expectedSeason} did not reach the playoffs before the Goal-16 offseason audit.`,
      ).toBe('playoffs');
      const incompleteRecords = Object.values(
        requireState().seasonState.standings.getFullStandings(),
      )
        .flat()
        .filter((entry) => entry.wins + entry.losses !== 162)
        .map((entry) => {
          const state = requireState();
          const mlbPlayers = state.players.filter((player) => (
            player.teamId === entry.teamId && player.rosterStatus === 'MLB'
          ));
          const pitchers = mlbPlayers.filter((player) => player.pitcherAttributes != null);
          const availablePitchers = pitchers.filter((player) => (
            (state.injuries.get(player.id)?.daysRemaining ?? 0) <= 0
          ));
          return `${entry.teamId}:${entry.wins}-${entry.losses}:mlb=${mlbPlayers.length}:pitchers=${pitchers.length}:available=${availablePitchers.length}`;
        });
      expect(
        incompleteRecords,
        `Seed ${seed}, season ${expectedSeason} entered the Goal-16 offseason audit with incomplete records.`,
      ).toEqual([]);
      const progressSignings = completeOffseasonWithDecisionReceipts(actions);
      const state = requireState();
      const row = captureRow(seed, state, progressSignings);
      rows.push(row);
      if (emitRows) {
        console.info(`FREE_AGENCY_DECISION_STUDY_ROW ${JSON.stringify(row)}`);
      }
      assertStudyRow(row, state);

      if (completedSeason < SEASONS_PER_SEED - 1) {
        actions.actionApi.startNextSeason();
      }
    }
  }

  setState(null);
  return rows;
}

function studyDigest(rows: DecisionStudyRow[]): string {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

function studyReport(rows: DecisionStudyRow[]) {
  return rows.map((row) => ({
    seed: row.seed,
    season: row.season,
    marketSize: row.marketSize,
    cpuSignings: row.cpuSignings,
    userSignings: row.userSignings,
    competitiveDecisions: row.competitiveDecisions,
    marketExhaustedDecisions: row.marketExhaustedDecisions,
    reasonCoverage: row.reasonCoverage,
    invalidRoleFacts: row.invalidRoleFacts,
    duplicateDecisionNews: row.duplicateDecisionNews,
    duplicatePlayers: row.duplicatePlayers,
    unaffordableSignings: row.unaffordableSignings.length,
    reconciliationErrors: row.receiptReconciliationErrors,
    meaningfulSignings: row.meaningfulSignings,
    topAav: row.topAav,
    payrollSpread: row.payrollSpread,
    reasonIncidence: row.reasonIncidence,
    rngState: row.rngState,
  }));
}

describe.sequential('free-agent decision 4x4 study', () => {
  const allRows: DecisionStudyRow[] = [];
  const allReplayRows: DecisionStudyRow[] = [];

  for (const seed of STUDY_SEEDS) {
    studyIt(`keeps seed ${seed} factual, explainable, legal, deterministic, and economically bounded`, { timeout: 7_200_000 }, async () => {
      const actions = await loadActionApi();
      const rows = await runStudyPass(actions, true, [seed]);
      const replayRows = await runStudyPass(actions, false, [seed]);
      const digest = studyDigest(rows);
      const replayDigest = studyDigest(replayRows);

      expect(rows).toHaveLength(SEASONS_PER_SEED);
      expect(replayDigest).toBe(digest);
      expect(replayRows).toEqual(rows);
      allRows.push(...rows);
      allReplayRows.push(...replayRows);
      console.info(`FREE_AGENCY_DECISION_STUDY_SEED ${JSON.stringify({
        seed,
        digest,
        replayDigest,
        rows: studyReport(rows),
      })}`);
      setState(null);
    });
  }

  afterAll(() => {
    if (!runStudy) return;
    expect(allRows).toHaveLength(STUDY_SEEDS.length * SEASONS_PER_SEED);
    if (!measureStudy) {
      expect(allRows).toHaveLength(16);
    }
    expect(allReplayRows).toEqual(allRows);
    const digest = studyDigest(allRows);
    const replayDigest = studyDigest(allReplayRows);
    expect(replayDigest).toBe(digest);
    console.info(`FREE_AGENCY_DECISION_STUDY ${JSON.stringify({
      digest,
      replayDigest,
      rows: studyReport(allRows),
    })}`);
    setState(null);
  });
});
