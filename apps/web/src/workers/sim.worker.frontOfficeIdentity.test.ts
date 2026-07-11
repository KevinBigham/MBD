// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOffseasonState, getInternationalScoutAccuracy } from '@mbd/sim-core';
import type { GMPhilosophy, ScoutingDirectorSnapshot } from '@mbd/contracts';
import {
  adjustDevelopmentSetbackForIdentity,
  adjustPromotionCandidateForIdentity,
  applyMonthlyFrontOfficeConsequences,
  applyMonthlyDevelopmentIdentity,
  getEffectiveScoutingAccuracy,
  getOwnerAlignmentDecisionScore,
} from './sim.worker.frontOfficeIdentity';
import { getTeamFreeAgencyAppealScore } from './sim.worker.setup';

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

import { api } from './sim.worker';
import { requireState, setState } from './sim.worker.helpers';

function startGame(seed: number) {
  return api.newGame({
    seed,
    userTeamId: 'nym',
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
  });
}

function philosophy(overrides: Partial<GMPhilosophy>): GMPhilosophy {
  return {
    seasonGoal: 'compete',
    developmentStyle: 'balanced',
    spendingStyle: 'balanced',
    tradeApproach: 'opportunistic',
    scoutingFocus: 'draft',
    mediaTone: 'measured',
    ...overrides,
  };
}

function director(specialty: ScoutingDirectorSnapshot['specialty']): ScoutingDirectorSnapshot {
  return {
    id: `director-${specialty}`,
    name: `Director ${specialty}`,
    age: 51,
    experience: 18,
    specialty,
    networkStrength: 72,
    evaluationAccuracy: 74,
    strengths: ['Focused coverage'],
    weaknesses: ['Narrow lane'],
  };
}

afterEach(() => {
  setState(null);
  vi.restoreAllMocks();
});

describe('front office scouting identity', () => {
  it('boosts only the selected scouting lane most strongly', () => {
    startGame(910);
    const state = requireState();
    state.franchise.scoutingDirector = director('international');
    state.franchise.gmPhilosophy = philosophy({ scoutingFocus: 'international' });

    const international = getEffectiveScoutingAccuracy(state, 'international', 0.7);
    const draft = getEffectiveScoutingAccuracy(state, 'draft', 0.7);
    const pro = getEffectiveScoutingAccuracy(state, 'pro', 0.7);

    expect(international.effectiveAccuracy).toBeGreaterThan(draft.effectiveAccuracy);
    expect(international.effectiveAccuracy).toBeGreaterThan(pro.effectiveAccuracy);
    expect(draft.effectiveAccuracy).toBeLessThan(0.71);
    expect(pro.effectiveAccuracy).toBeLessThan(0.71);
  });

  it('uses draft focus in actual draft scouting reports', () => {
    startGame(911);
    const state = requireState();
    state.franchise.scoutingDirector = director('draft');
    state.franchise.gmPhilosophy = philosophy({ scoutingFocus: 'draft' });
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'draft',
      phaseDay: 1,
      totalDay: 40,
    };

    const baseAccuracy = getInternationalScoutAccuracy(state.scoutingStaffs.get(state.userTeamId) ?? []);
    const expectedAccuracy = getEffectiveScoutingAccuracy(state, 'draft', baseAccuracy).effectiveAccuracy;
    const draftStart = api.startDraft() as {
      success: boolean;
      draft: { availableProspects: Array<{ id: string }> } | null;
    };
    const prospectId = draftStart.draft?.availableProspects[0]?.id;
    expect(prospectId).toBeTruthy();

    const result = api.scoutDraftPlayer(prospectId!) as {
      success: boolean;
      report?: { accuracy: number };
    };

    expect(result.success).toBe(true);
    expect(result.report?.accuracy).toBe(expectedAccuracy);
    expect(result.report?.accuracy).toBeGreaterThan(baseAccuracy);
  });

  it('uses international focus in the visible IFA pool accuracy', () => {
    startGame(912);
    const state = requireState();
    state.franchise.scoutingDirector = director('international');
    state.franchise.gmPhilosophy = philosophy({ scoutingFocus: 'international' });
    state.phase = 'offseason';
    state.offseasonState = {
      ...createOffseasonState(state.season),
      currentPhase: 'international_signing',
      phaseDay: 1,
      totalDay: 44,
    };

    const baseAccuracy = getInternationalScoutAccuracy(state.scoutingStaffs.get(state.userTeamId) ?? []);
    const expectedAccuracy = getEffectiveScoutingAccuracy(state, 'international', baseAccuracy).effectiveAccuracy;
    const pool = api.getIFAPool();

    expect(pool.staffAccuracy).toBe(expectedAccuracy);
    expect(pool.staffAccuracy).toBeGreaterThan(baseAccuracy);
  });

  it('uses pro focus to tighten visible player scouting reports', () => {
    startGame(913);
    const state = requireState();
    const target = state.players.find((player) => player.teamId !== state.userTeamId && player.rosterStatus === 'MLB');
    expect(target).toBeTruthy();

    state.franchise.scoutingDirector = director('draft');
    state.franchise.gmPhilosophy = philosophy({ scoutingFocus: 'draft' });
    const draftLaneReport = api.scoutPlayerReport(target!.id);

    state.franchise.scoutingDirector = director('pro_scouting');
    state.franchise.gmPhilosophy = philosophy({ scoutingFocus: 'pro_scouting' });
    const proLaneReport = api.scoutPlayerReport(target!.id);

    expect(proLaneReport?.confidence).toBeLessThanOrEqual(draftLaneReport?.confidence ?? 99);
    expect(proLaneReport?.reliability).toBeGreaterThanOrEqual(draftLaneReport?.reliability ?? 1);
    expect(proLaneReport?.notes).toContain('Pro reports are tighter');
  });
});

describe('front office monthly alignment', () => {
  it('feeds identity alignment into owner decisions and monthly consequences once', () => {
    startGame(914);
    const state = requireState();
    state.franchise.assistantGMId = 'marcus_chen';
    state.franchise.gmPhilosophy = philosophy({
      seasonGoal: 'championship',
      spendingStyle: 'penny_pincher',
      tradeApproach: 'buyer',
      mediaTone: 'confident',
    });
    state.phase = 'regular';
    state.day = 90;

    const ownerBefore = state.ownerState.get(state.userTeamId);
    const decisionScore = getOwnerAlignmentDecisionScore(state);
    applyMonthlyFrontOfficeConsequences(state, { month: 3 });
    const briefingCount = state.briefingQueue.filter((item) => item.id === 'front-office-monthly-1-3').length;
    const fanScoreAfterFirst = state.fanSentiment.score;
    const ownerAfter = state.ownerState.get(state.userTeamId);

    applyMonthlyFrontOfficeConsequences(state, { month: 3 });

    expect(decisionScore).not.toBe(0);
    expect(state.storyFlags.get(state.userTeamId)).toContain('front_office_monthly_1_3');
    expect(briefingCount).toBe(1);
    expect(state.briefingQueue.filter((item) => item.id === 'front-office-monthly-1-3')).toHaveLength(1);
    expect(state.fanSentiment.score).toBe(fanScoreAfterFirst);
    expect(ownerAfter?.summary).not.toBe(ownerBefore?.summary);
  });

  it('changes free-agent appeal from spending posture', () => {
    startGame(915);
    const state = requireState();
    state.franchise.gmPhilosophy = philosophy({ spendingStyle: 'big_spender' });
    const bigSpenderAppeal = getTeamFreeAgencyAppealScore(state, state.userTeamId);

    state.franchise.gmPhilosophy = philosophy({ spendingStyle: 'penny_pincher' });
    const pennyPincherAppeal = getTeamFreeAgencyAppealScore(state, state.userTeamId);

    expect(bigSpenderAppeal).toBeGreaterThan(pennyPincherAppeal);
  });
});

describe('front office development identity', () => {
  it('adjusts monthly prospect progress from development posture and AGM identity', () => {
    startGame(916);
    const state = requireState();
    const prospect = state.players.find((player) => player.teamId === state.userTeamId && player.rosterStatus !== 'MLB')!;
    state.franchise.assistantGMId = 'elena_vargas';
    state.franchise.gmPhilosophy = philosophy({ developmentStyle: 'aggressive' });
    state.minorLeagueState.developmentLedger = [{
      playerId: prospect.id,
      teamId: state.userTeamId,
      season: state.season,
      month: 2,
      progressScore: 1,
      coachModifier: 1,
      programBonus: 0,
      breakoutProbability: 0.1,
      bustRisk: 0.2,
    }];
    state.minorLeagueState.developmentReports = [{
      playerId: prospect.id,
      teamId: state.userTeamId,
      season: state.season,
      month: 2,
      trajectory: 'on_track',
      summary: 'Baseline report.',
      overallRating: prospect.overallRating,
    }];

    applyMonthlyDevelopmentIdentity(state, 2);

    expect(state.minorLeagueState.developmentLedger[0]?.progressScore).toBeGreaterThan(4);
    expect(state.minorLeagueState.developmentLedger[0]?.breakoutProbability).toBeGreaterThan(0.1);
    expect(state.minorLeagueState.developmentReports[0]?.summary).toContain('Aggressive posture');
  });

  it('moves promotion recommendation scores earlier or later', () => {
    startGame(917);
    const state = requireState();
    const baseCandidate = {
      playerId: 'prospect-1',
      teamId: state.userTeamId,
      currentLevel: 'AAA' as const,
      targetLevel: 'MLB' as const,
      score: 42,
      reason: 'AAA production merits a look.',
    };

    state.franchise.assistantGMId = 'elena_vargas';
    state.franchise.gmPhilosophy = philosophy({ developmentStyle: 'aggressive' });
    const aggressive = adjustPromotionCandidateForIdentity(state, baseCandidate);

    state.franchise.assistantGMId = 'walt_kowalski';
    state.franchise.gmPhilosophy = philosophy({ developmentStyle: 'patient' });
    const patient = adjustPromotionCandidateForIdentity(state, baseCandidate);

    expect(aggressive.score).toBeGreaterThan(baseCandidate.score);
    expect(patient.score).toBeLessThan(baseCandidate.score);
    expect(aggressive.reason).toContain('Aggressive development posture pushes');
    expect(patient.reason).toContain('Patient development posture slows');
  });

  it('changes prospect setback severity from posture and AGM identity', () => {
    startGame(918);
    const state = requireState();
    const prospect = state.players.find((player) => player.teamId === state.userTeamId && player.rosterStatus !== 'MLB')!;
    const setback = {
      playerId: prospect.id,
      type: 'mental_block' as const,
      overallModifier: -6,
      startSeason: state.season,
      startMonth: 3,
      endSeason: state.season,
      endMonth: 4,
      summary: 'Baseline setback.',
      active: true,
    };

    state.franchise.assistantGMId = 'marcus_chen';
    state.franchise.gmPhilosophy = philosophy({ developmentStyle: 'aggressive' });
    const aggressive = adjustDevelopmentSetbackForIdentity(state, prospect, setback, 3);

    state.franchise.assistantGMId = 'elena_vargas';
    state.franchise.gmPhilosophy = philosophy({ developmentStyle: 'patient' });
    const patient = adjustDevelopmentSetbackForIdentity(state, prospect, setback, 3);

    expect(aggressive?.overallModifier).toBeLessThan(setback.overallModifier);
    if (patient) {
      expect(patient.overallModifier).toBeGreaterThan(setback.overallModifier);
      expect(patient.summary).toContain('Patient development posture');
    } else {
      expect(patient).toBeNull();
    }
  });
});

describe('front office press identity', () => {
  it('applies press fan sentiment deltas and media-tone consequences', () => {
    startGame(919);
    const state = requireState();
    state.phase = 'regular';
    state.day = 60;
    state.franchise.gmPhilosophy = philosophy({ mediaTone: 'confident' });
    const standing = state.seasonState.standings.getRecord(state.userTeamId);
    if (!standing) {
      throw new Error('Missing user standing.');
    }
    standing.wins = 10;
    standing.losses = 25;

    const conference = api.getInteractivePressConference();
    expect(conference).not.toBeNull();
    const confident = conference?.responses.find((response) => response.tone === 'confident');
    expect(confident?.fanSentimentDelta).toBeGreaterThan(0);

    const fanBefore = state.fanSentiment.score;
    const result = api.respondToPressConference(conference!.id, confident!.id);

    expect(result.success).toBe(true);
    expect(result.fanSentimentDelta).toBe(confident?.fanSentimentDelta);
    expect(state.fanSentiment.score).toBeGreaterThan(fanBefore);
    expect(state.storyFlags.get(state.userTeamId)?.some((flag) => flag.startsWith('press_tone_backlash_'))).toBe(true);
    expect(state.briefingQueue.some((item) => item.id.startsWith('front-office-press-tone-'))).toBe(true);
    expect(api.getInteractivePressConference()).toBeNull();

    const fanAfterResponse = state.fanSentiment.score;
    const duplicate = api.respondToPressConference(conference!.id, confident!.id);
    expect(duplicate.success).toBe(false);
    expect(state.fanSentiment.score).toBe(fanAfterResponse);
  });
});
