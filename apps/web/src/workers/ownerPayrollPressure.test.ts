// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGameSnapshot } from '@mbd/contracts';
import { TEAMS, createOffseasonState, deriveOwnerPayrollPolicy } from '@mbd/sim-core';
import { buildNewGameState } from './sim.worker.setup.js';
import {
  buildOffseasonStateView,
  setState,
  skipOffseasonPhaseWithAI,
} from './sim.worker.helpers.js';
import { queryApi } from './sim.worker.queries.js';
import { exportGameSnapshot, importGameSnapshot } from './snapshot.js';
import {
  buildOwnerPayrollNarrative,
  buildOwnerPayrollPolicy,
  ownerPayrollPressureReceiptId,
  reconcileCompletedOffseasonOwnerPayrollPressure,
} from './sim.worker.ownerPayrollPressure.js';

function makeState(seed = 7401, difficulty: 'easy' | 'standard' | 'hard' = 'standard') {
  return buildNewGameState({
    seed,
    userTeamId: 'nym',
    gmName: 'Payroll Audit',
    difficulty,
    saveSlot: 14,
    dayOneExperience: 'quick',
  });
}

function contractDigest(state: ReturnType<typeof makeState>) {
  return state.players
    .map((player) => ({
      id: player.id,
      teamId: player.teamId,
      rosterStatus: player.rosterStatus,
      contract: structuredClone(player.contract),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function setFinalSpringTrainingDay(state: ReturnType<typeof makeState>) {
  state.phase = 'offseason';
  state.offseasonState = {
    ...createOffseasonState(state.season),
    currentPhase: 'spring_training',
    phaseDay: 12,
    totalDay: 92,
    completed: false,
  };
}

describe('worker owner payroll pressure', () => {
  it('derives coherent policy for all 32 teams without changing the parent RNG', () => {
    const state = makeState();
    const rngBefore = state.rng.getState();
    const policies = TEAMS.map((team) => buildOwnerPayrollPolicy(state, team.id));
    const archetypes = TEAMS.reduce<Record<string, number>>((counts, team) => {
      const archetype = state.ownerState.get(team.id)?.archetype ?? 'missing';
      counts[archetype] = (counts[archetype] ?? 0) + 1;
      return counts;
    }, {});

    expect(policies).toHaveLength(32);
    expect(archetypes).toEqual({ win_now: 22, patient_builder: 10 });
    for (const policy of policies) {
      expect(Number.isFinite(policy.floor)).toBe(true);
      expect(policy.floor).toBeLessThan(policy.softCeiling);
      expect(policy.taxThreshold).toBe(230);
    }
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('keeps raw owner lines independent of user difficulty and observer identity', () => {
    const easy = makeState(7402, 'easy');
    const hard = makeState(7402, 'hard');
    const easyPolicy = buildOwnerPayrollPolicy(easy, 'nym');
    const hardPolicy = buildOwnerPayrollPolicy(hard, 'nym');
    hard.userTeamId = 'bos';

    expect(hardPolicy).toEqual(easyPolicy);
    expect(buildOwnerPayrollPolicy(hard, 'nym')).toEqual(easyPolicy);
  });

  it('feeds Finance, Dashboard, team finance, and Offseason from one policy result', () => {
    const state = makeState(7406);
    state.phase = 'offseason';
    state.offseasonState = createOffseasonState(state.season);
    setState(state);

    const policy = queryApi.getOwnerPayrollPolicy();
    const finance = queryApi.getFinanceOverview();
    const teamFinance = queryApi.getTeamFinances(state.userTeamId);
    const dashboard = queryApi.getDashboardSummary();
    const offseason = buildOffseasonStateView(state);

    expect(finance.ownerPayrollPolicy).toEqual(policy);
    expect(teamFinance.ownerPayrollPolicy).toEqual(policy);
    expect(dashboard?.roster.ownerPayrollPolicy).toEqual(policy);
    expect(offseason?.commandCenter.projectedOpeningDay.ownerPayrollPolicy).toEqual(policy);
    expect(finance.luxuryTax).toBe(policy.projectedTax);
    expect(teamFinance.luxuryTax).toBe(policy.projectedTax);
    expect(dashboard?.roster.luxuryTax).toBe(policy.projectedTax);
  });

  it('builds distinct factual copy without claiming a paid tax bill', () => {
    const below = buildOwnerPayrollNarrative(deriveOwnerPayrollPolicy({
      archetype: 'win_now',
      softCeiling: 200,
      totalPayroll: 90,
      luxuryTaxPayroll: 80,
    }));
    const onPlanTaxpayer = buildOwnerPayrollNarrative(deriveOwnerPayrollPolicy({
      archetype: 'patient_builder',
      softCeiling: 300,
      totalPayroll: 250,
      luxuryTaxPayroll: 250,
    }));
    const above = buildOwnerPayrollNarrative(deriveOwnerPayrollPolicy({
      archetype: 'penny_pincher',
      softCeiling: 150,
      totalPayroll: 175,
      luxuryTaxPayroll: 140,
    }));
    const atTaxLine = buildOwnerPayrollNarrative(deriveOwnerPayrollPolicy({
      archetype: 'win_now',
      softCeiling: 250,
      totalPayroll: 230,
      luxuryTaxPayroll: 230,
    }));

    expect(below.headline).toContain('stronger payroll commitment');
    expect(onPlanTaxpayer.headline).toContain('tax-line season');
    expect(onPlanTaxpayer.body).toContain('projected exposure');
    expect(above.headline).toContain('aggressive payroll finish');
    expect(atTaxLine.body).toContain('is at the $230.00M league line');
    expect(atTaxLine.body).not.toContain('is clear of');
    for (const narrative of [below, onPlanTaxpayer, above]) {
      expect(narrative.body).not.toMatch(/paid|debited|tax bill/i);
    }
  });

  it('repairs partial reconciliation artifacts and normalizes duplicate receipts idempotently', () => {
    const state = makeState(7408);
    const receipt = ownerPayrollPressureReceiptId(state.season);
    const userNewsId = `owner-payroll-pressure-${state.season}-${state.userTeamId}`;
    const cpuTeamId = TEAMS.find((team) => team.id !== state.userTeamId)!.id;
    state.storyFlags.set(state.userTeamId, [receipt, receipt, 'keep-me']);
    state.storyFlags.set(cpuTeamId, [receipt, receipt]);
    state.news = state.news.filter((item) => item.id !== userNewsId);
    state.briefingQueue = state.briefingQueue.filter((item) => item.id !== `brief-${userNewsId}`);

    const receipts = reconcileCompletedOffseasonOwnerPayrollPressure(state);

    expect(receipts).toHaveLength(30);
    for (const team of TEAMS) {
      expect(state.storyFlags.get(team.id)?.filter((flag) => flag === receipt)).toHaveLength(1);
    }
    expect(state.storyFlags.get(state.userTeamId)).toContain('keep-me');
    expect(state.news.filter((item) => item.id === userNewsId)).toHaveLength(1);
    expect(state.briefingQueue.filter((item) => item.id === `brief-${userNewsId}`)).toHaveLength(1);

    state.storyFlags.set(
      state.userTeamId,
      state.storyFlags.get(state.userTeamId)!.filter((flag) => flag !== receipt),
    );
    const presentationOnlyRepair = reconcileCompletedOffseasonOwnerPayrollPressure(state);
    const repeated = reconcileCompletedOffseasonOwnerPayrollPressure(state);

    expect(presentationOnlyRepair.map((entry) => entry.teamId)).toEqual([state.userTeamId]);
    expect(repeated).toEqual([]);
    expect(state.news.filter((item) => item.id === userNewsId)).toHaveLength(1);
    expect(state.briefingQueue.filter((item) => item.id === `brief-${userNewsId}`)).toHaveLength(1);
  });

  it('reconciles once per team and season without changing owner, franchise, contract, or RNG state', () => {
    const state = makeState(7403);
    const userOwner = state.ownerState.get(state.userTeamId)!;
    state.ownerState.set(state.userTeamId, {
      ...userOwner,
      patience: 16,
      confidence: 16,
      satisfaction: 16,
      hotSeat: false,
    });
    const ownersBefore = structuredClone(Array.from(state.ownerState.entries()));
    const franchiseBefore = structuredClone(state.franchise);
    const contractsBefore = contractDigest(state);
    const rngBefore = state.rng.getState();

    const receipts = reconcileCompletedOffseasonOwnerPayrollPressure(state);
    const repeated = reconcileCompletedOffseasonOwnerPayrollPressure(state);
    const receipt = ownerPayrollPressureReceiptId(state.season);

    expect(receipts).toHaveLength(32);
    expect(new Set(receipts.map((entry) => entry.teamId)).size).toBe(32);
    expect(repeated).toEqual([]);
    for (const team of TEAMS) {
      expect(state.storyFlags.get(team.id)?.filter((flag) => flag === receipt)).toHaveLength(1);
    }
    expect(state.news.filter((item) => item.id === `owner-payroll-pressure-${state.season}-${state.userTeamId}`)).toHaveLength(1);
    expect(state.briefingQueue.filter((item) => item.id === `brief-owner-payroll-pressure-${state.season}-${state.userTeamId}`)).toHaveLength(1);
    expect(Array.from(state.ownerState.entries())).toEqual(ownersBefore);
    expect(state.franchise).toEqual(franchiseBefore);
    expect(contractDigest(state)).toEqual(contractsBefore);
    expect(state.rng.getState()).toEqual(rngBefore);
  });

  it('runs reconciliation only on the exact incomplete-to-complete offseason transition', () => {
    const state = makeState(7404);
    const receipt = ownerPayrollPressureReceiptId(state.season);
    setFinalSpringTrainingDay(state);

    expect(TEAMS.some((team) => state.storyFlags.get(team.id)?.includes(receipt))).toBe(false);
    const progress = skipOffseasonPhaseWithAI(state);

    expect(progress.error).toBeUndefined();
    expect(state.offseasonState?.completed).toBe(true);
    expect(TEAMS.every((team) => state.storyFlags.get(team.id)?.includes(receipt))).toBe(true);
    expect(state.news.some((item) => item.id === `owner-payroll-pressure-${state.season}-${state.userTeamId}`)).toBe(true);

    const newsAfterCompletion = structuredClone(state.news);
    const flagsAfterCompletion = structuredClone(Array.from(state.storyFlags.entries()));
    skipOffseasonPhaseWithAI(state);
    expect(state.news).toEqual(newsAfterCompletion);
    expect(Array.from(state.storyFlags.entries())).toEqual(flagsAfterCompletion);
  });

  it('does not backfill annual receipts during pure old-save-compatible reads', () => {
    const state = makeState(7405);
    const owner = state.ownerState.get(state.userTeamId)!;
    state.ownerState.set(state.userTeamId, {
      ...owner,
      annualBudget: undefined,
      payrollCap: undefined,
    });
    const flagsBefore = structuredClone(Array.from(state.storyFlags.entries()));
    const policy = buildOwnerPayrollPolicy(state, state.userTeamId);

    expect(policy.softCeiling).toBe(owner.expectations.payrollTarget);
    expect(Array.from(state.storyFlags.entries())).toEqual(flagsBefore);
    expect(state.news.some((item) => item.id.startsWith('owner-payroll-pressure-'))).toBe(false);
  });

  it('returns complete read-only Owner Intel DTOs for compact v33, Season 10, missing, and partial owner state', () => {
    for (const fixtureName of ['core', 'season10']) {
      const fixture = JSON.parse(readFileSync(
        new URL(`../../../../packages/contracts/tests/fixtures/save/v33/${fixtureName}.json`, import.meta.url),
        'utf8',
      )) as unknown;
      const restored = importGameSnapshot(parseGameSnapshot(fixture));
      setState(restored);
      const before = exportGameSnapshot(restored);
      const presentation = queryApi.getOwnerPayrollPresentation();

      expect(presentation.owner.teamId).toBe(restored.userTeamId);
      expect(presentation.owner.spendingWillingness).toMatch(/cheap|moderate|lavish/);
      for (const key of [
        'satisfaction',
        'winNowPressure',
        'meddlingLevel',
        'annualBudget',
        'payrollCap',
        'draftBonusPool',
        'ifaBonusPool',
        'staffBudget',
      ] as const) {
        expect(Number.isFinite(presentation.owner[key]), `${fixtureName}:${key}`).toBe(true);
      }
      expect(presentation.ownerPayrollPolicy).toEqual(buildOwnerPayrollPolicy(restored, restored.userTeamId));
      expect(exportGameSnapshot(restored)).toEqual(before);
    }

    const partial = makeState(7409);
    const rawOwner = partial.ownerState.get(partial.userTeamId)!;
    partial.ownerState.set(partial.userTeamId, {
      ...rawOwner,
      spendingWillingness: undefined,
      satisfaction: undefined,
      annualBudget: undefined,
      payrollCap: undefined,
      draftBonusPool: undefined,
      ifaBonusPool: undefined,
      staffBudget: undefined,
    });
    setState(partial);
    const entriesBefore = structuredClone(Array.from(partial.ownerState.entries()));
    const partialPresentation = queryApi.getOwnerPayrollPresentation();

    expect(partialPresentation.owner.payrollCap).toBe(rawOwner.expectations.payrollTarget);
    expect(partialPresentation.owner.spendingWillingness).toMatch(/cheap|moderate|lavish/);
    expect(partialPresentation.owner.satisfaction).toBeTypeOf('number');
    expect(Array.from(partial.ownerState.entries())).toEqual(entriesBefore);
  });

  it('round-trips the current snapshot with one retained annual receipt and no derived policy field', () => {
    const state = makeState(7407);
    reconcileCompletedOffseasonOwnerPayrollPressure(state);
    const policyBefore = buildOwnerPayrollPolicy(state, state.userTeamId);
    const snapshot = exportGameSnapshot(state);
    const restored = importGameSnapshot(snapshot);
    const roundTrip = exportGameSnapshot(restored);

    expect(roundTrip).toEqual(snapshot);
    expect(buildOwnerPayrollPolicy(restored, restored.userTeamId)).toEqual(policyBefore);
    expect(restored.storyFlags.get(restored.userTeamId)).toContain(
      ownerPayrollPressureReceiptId(restored.season),
    );
    expect(restored.news.filter((item) => item.id.startsWith('owner-payroll-pressure-'))).toHaveLength(1);
    expect(snapshot).not.toHaveProperty('ownerPayrollPolicy');
    expect(snapshot.narrative).not.toHaveProperty('ownerPayrollPolicy');
  });
});
