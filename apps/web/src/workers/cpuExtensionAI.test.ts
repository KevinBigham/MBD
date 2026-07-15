// @vitest-environment node

import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  MAX_CONTRACT_YEARS,
  TEAMS,
  calculateTeamPayroll,
  createOffseasonState,
  type GMPersonality,
} from '@mbd/sim-core';

vi.mock('comlink', () => ({ expose: () => {} }));

import { api } from './sim.worker';
import {
  getExtensionCandidatesForTeam,
  requireState,
  setState,
} from './sim.worker.helpers';

const STUDY_SEEDS = [7_301, 7_302, 7_303, 7_304] as const;

interface ExtensionStudyMetrics {
  seed: number;
  eligible: number;
  attempted: number;
  accepted: number;
  rejected: number;
  averageYears: number;
  averageAav: number;
  budgetOverages: Array<{
    teamId: string;
    baselinePayroll: number;
    payroll: number;
    budget: number;
    results: Array<{ playerId: string; annualSalary: number }>;
  }>;
  duplicateResults: number;
  historyMismatches: number;
  parentRngChanged: boolean;
  identityAttempts: Partial<Record<GMPersonality, number>>;
  digest: string;
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function runStudySeed(seed: number): ExtensionStudyMetrics {
  setState(null);
  api.newGame({
    seed,
    userTeamId: 'nym',
    gmName: 'Extension Study GM',
    difficulty: 'standard',
    saveSlot: 1,
  });
  const state = requireState();
  state.phase = 'offseason';
  state.offseasonState = {
    ...createOffseasonState(state.season),
    currentPhase: 'tender_nontender',
    phaseDay: 5,
    totalDay: 15,
  };

  const cpuTeamIds = TEAMS
    .map((team) => team.id)
    .filter((teamId) => teamId !== state.userTeamId);
  const eligible = cpuTeamIds.reduce(
    (total, teamId) => total + getExtensionCandidatesForTeam(state, teamId).length,
    0,
  );
  const baselinePayrolls = new Map(cpuTeamIds.map((teamId) => [
    teamId,
    calculateTeamPayroll(teamId, state.players).totalPayroll,
  ]));
  const rngBefore = structuredClone(api.exportSnapshot().rng);

  const transition = api.advanceOffseason();

  expect(transition?.currentPhase).toBe('extensions');
  expect(transition?.flowStateChanged).toBe(true);
  const after = requireState();
  const results = after.offseasonState?.phaseResults.extensions ?? [];
  const resultIds = results.map((entry) => entry.playerId);
  const duplicateResults = resultIds.length - new Set(resultIds).size;
  const acceptedTeamIds = new Set(results
    .filter((entry) => entry.status === 'accepted')
    .map((entry) => entry.teamId));
  const budgetOverages = Array.from(acceptedTeamIds)
    .flatMap((teamId) => {
      const payroll = calculateTeamPayroll(teamId, after.players).totalPayroll;
      const budget = after.ownerState.get(teamId)?.annualBudget ?? Number.POSITIVE_INFINITY;
      return payroll > budget ? [{
        teamId,
        baselinePayroll: baselinePayrolls.get(teamId) ?? 0,
        payroll,
        budget,
        results: results
          .filter((entry) => entry.teamId === teamId)
          .map((entry) => ({ playerId: entry.playerId, annualSalary: entry.annualSalary })),
      }] : [];
    });
  const historyMismatches = results.filter((entry) => {
    const player = after.players.find((candidate) => candidate.id === entry.playerId);
    const matches = (player?.extensionHistory ?? []).filter((history) =>
      history.season === after.season
      && history.teamId === entry.teamId
      && history.outcome === entry.status
      && history.years === entry.years
      && history.annualSalary === entry.annualSalary
      && history.totalValue === entry.totalValue);
    return player?.teamId !== entry.teamId || player.rosterStatus !== 'MLB' || matches.length !== 1;
  }).length;
  const identityAttempts = results.reduce<Partial<Record<GMPersonality, number>>>((counts, entry) => {
    const personality = after.gmPersonalities.get(entry.teamId) ?? 'analytical';
    counts[personality] = (counts[personality] ?? 0) + 1;
    return counts;
  }, {});
  const averageYears = results.length === 0
    ? 0
    : round(results.reduce((sum, entry) => sum + entry.years, 0) / results.length);
  const averageAav = results.length === 0
    ? 0
    : round(results.reduce((sum, entry) => sum + entry.annualSalary, 0) / results.length);
  const digest = JSON.stringify(results
    .map((entry) => ({ ...entry }))
    .sort((left, right) => left.teamId.localeCompare(right.teamId)
      || left.playerId.localeCompare(right.playerId)));

  return {
    seed,
    eligible,
    attempted: results.length,
    accepted: results.filter((entry) => entry.status === 'accepted').length,
    rejected: results.filter((entry) => entry.status === 'rejected').length,
    averageYears,
    averageAav,
    budgetOverages,
    duplicateResults,
    historyMismatches,
    parentRngChanged: JSON.stringify(api.exportSnapshot().rng) !== JSON.stringify(rngBefore),
    identityAttempts,
    digest,
  };
}

describe('identity-driven CPU extension bounded study', () => {
  it('stays deterministic, factual, budget-bound, and active across four league seeds', () => {
    const firstPass = STUDY_SEEDS.map(runStudySeed);
    const replay = STUDY_SEEDS.map(runStudySeed);
    const receipt = firstPass.map(({ digest: _digest, ...metrics }) => metrics);
    process.stdout.write(`ECON-EXTENSION-AI-1 receipt ${JSON.stringify(receipt)}\n`);

    expect(replay.map((entry) => entry.digest), JSON.stringify(receipt, null, 2))
      .toEqual(firstPass.map((entry) => entry.digest));
    expect(firstPass.every((entry) => entry.eligible > 0), JSON.stringify(receipt, null, 2)).toBe(true);
    expect(firstPass.every((entry) => entry.attempted > 0), JSON.stringify(receipt, null, 2)).toBe(true);
    expect(firstPass.reduce((sum, entry) => sum + entry.accepted, 0), JSON.stringify(receipt, null, 2))
      .toBeGreaterThan(0);
    expect(firstPass.reduce((sum, entry) => sum + entry.rejected, 0), JSON.stringify(receipt, null, 2))
      .toBeGreaterThan(0);
    expect(firstPass.every((entry) => entry.averageYears >= 1 && entry.averageYears <= MAX_CONTRACT_YEARS))
      .toBe(true);
    expect(firstPass.every((entry) => entry.averageAav >= 1)).toBe(true);
    expect(firstPass.every((entry) => entry.budgetOverages.length === 0), JSON.stringify(receipt, null, 2)).toBe(true);
    expect(firstPass.every((entry) => entry.duplicateResults === 0), JSON.stringify(receipt, null, 2)).toBe(true);
    expect(firstPass.every((entry) => entry.historyMismatches === 0), JSON.stringify(receipt, null, 2)).toBe(true);
    expect(firstPass.every((entry) => !entry.parentRngChanged), JSON.stringify(receipt, null, 2)).toBe(true);
    expect(new Set(firstPass.flatMap((entry) => Object.keys(entry.identityAttempts))).size)
      .toBeGreaterThanOrEqual(4);
  });
});

afterAll(() => {
  setState(null);
  vi.restoreAllMocks();
});
