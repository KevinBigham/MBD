// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '@mbd/sim-core';
import {
  applyVirtualFreeAgencySigning,
  buildFreeAgencyDecisionContext,
  buildFreeAgencyPreferencePreview,
  deriveFreeAgencyContenderStatus,
} from './sim.worker.freeAgencyDecision.js';

function standings(records: Record<string, [number, number]>) {
  return {
    getFullStandings: () => ({
      AL_EAST: Object.entries(records).map(([teamId, [wins, losses]]) => ({
        teamId,
        wins,
        losses,
      })),
    }),
  };
}

function baseState() {
  return {
    season: 6,
    seasonState: {
      standings: standings({
        bos: [101, 61],
        nym: [94, 68],
        lad: [90, 72],
        sea: [81, 81],
        pit: [70, 92],
        chc: [40, 40],
      }),
    },
    playoffBracket: {
      champion: 'bos',
      seeds: [{ teamId: 'bos' }, { teamId: 'nym' }],
    },
    prospectBonds: [{
      prospectId: 'fa-1',
      draftedSeason: 1,
      debutSeason: 3,
      currentLevel: 'MLB',
      bondStrength: 50,
      milestones: [],
      loyaltyModifier: 0.5,
    }],
    playerOrigins: new Map([['fa-1', {
      playerId: 'fa-1',
      originTeamId: 'nym',
      acquisitionType: 'draft' as const,
      acquiredSeason: 1,
      draftSeason: 1,
      draftRound: 2,
      draftPickNumber: 40,
      originalGrade: 55,
      bonusAmount: 2,
    }]]),
    teamChemistry: new Map([
      ['nym', { score: 80 }],
      ['bos', { score: 60 }],
    ]),
    frontOfficeState: new Map([
      ['nym', { reputation: 70 }],
      ['bos', { reputation: 70 }],
    ]),
  };
}

const PLAYER = {
  id: 'fa-1',
  age: 33,
  teamTenures: [
    { teamId: 'nym', startSeason: 1, endSeason: 5 },
    { teamId: 'bos', startSeason: 5, endSeason: 5 },
  ],
} as Pick<GeneratedPlayer, 'id' | 'age' | 'teamTenures'>;

describe('worker free-agent decision facts', () => {
  it('derives contender labels only from complete standings and playoff facts', () => {
    const state = baseState();

    expect(deriveFreeAgencyContenderStatus(state as never, 'bos')).toBe('champion');
    expect(deriveFreeAgencyContenderStatus(state as never, 'nym')).toBe('playoff');
    expect(deriveFreeAgencyContenderStatus(state as never, 'lad')).toBe('contender');
    expect(deriveFreeAgencyContenderStatus(state as never, 'sea')).toBe('competitive');
    expect(deriveFreeAgencyContenderStatus(state as never, 'pit')).toBe('developing');
    expect(deriveFreeAgencyContenderStatus(state as never, 'chc')).toBe('unknown');
    expect(deriveFreeAgencyContenderStatus(state as never, 'missing')).toBe('unknown');
  });

  it('combines matching persisted tenure and homegrown bond without leaking it to another club', () => {
    const state = baseState();
    const homegrown = buildFreeAgencyDecisionContext(
      state as never,
      'nym',
      PLAYER,
      82,
    );
    const otherClub = buildFreeAgencyDecisionContext(
      state as never,
      'bos',
      PLAYER,
      82,
    );

    expect(homegrown).toMatchObject({
      teamNeed: 82,
      contenderStatus: 'playoff',
      tenureSeasons: 5,
      homegrownBond: 0.5,
      clubhouseScore: 72,
    });
    expect(otherClub).toMatchObject({
      contenderStatus: 'champion',
      tenureSeasons: 1,
      homegrownBond: 0,
    });
  });

  it('is invariant to hidden potential, user identity, difficulty, fan, and spending facts', () => {
    const state = baseState();
    const baseline = buildFreeAgencyDecisionContext(state as never, 'nym', PLAYER, 75);
    const polluted = {
      ...state,
      userTeamId: 'nym',
      franchise: {
        difficulty: 'hard',
        gmPhilosophy: { spendingStyle: 'big_spender' },
      },
      fanSentiment: { score: 100 },
    };
    const hiddenTwin = { ...PLAYER, potential: 500, ceiling: 500 };

    expect(buildFreeAgencyDecisionContext(
      polluted as never,
      'nym',
      hiddenTwin,
      75,
    )).toEqual(baseline);
  });

  it('keeps chemistry and front-office reputation as separate factual inputs', () => {
    const baselineState = baseState();
    const baseline = buildFreeAgencyDecisionContext(
      baselineState as never,
      'nym',
      PLAYER,
      75,
    );
    const chemistryTwin = {
      ...baselineState,
      teamChemistry: new Map([
        ...baselineState.teamChemistry,
        ['nym', { score: 40 }],
      ]),
    };
    const reputationTwin = {
      ...baselineState,
      frontOfficeState: new Map([
        ...baselineState.frontOfficeState,
        ['nym', { reputation: 30 }],
      ]),
    };

    expect(baseline.clubhouseScore).toBe(72);
    expect(buildFreeAgencyDecisionContext(
      chemistryTwin as never,
      'nym',
      PLAYER,
      75,
    ).clubhouseScore).toBe(44);
    expect(buildFreeAgencyDecisionContext(
      reputationTwin as never,
      'nym',
      PLAYER,
      75,
    ).clubhouseScore).toBe(70);
  });

  it('builds an age-shaped, factual, query-only preference preview', () => {
    const state = baseState();
    const context = buildFreeAgencyDecisionContext(state as never, 'nym', PLAYER, 75);
    const preview = buildFreeAgencyPreferencePreview(PLAYER, context);

    expect(preview).toMatchObject({
      careerStage: 'veteran',
      projectedOpportunity: 'featured',
      contenderStatus: 'playoff',
      loyaltySource: 'homegrown_and_tenure',
      tenureSeasons: 5,
      homegrownBond: 0.5,
      clubhouseScore: 72,
    });
    expect(preview.priorityOrder.slice(0, 2)).toEqual(['contender_status', 'loyalty']);
  });

  it('recomputes same-day opportunity immediately after each accepted signing', () => {
    const virtualRosters = new Map<string, GeneratedPlayer[]>([['bos', []]]);
    const needs = new Map<string, Map<string, number>>([
      ['bos', new Map([['C', 90]])],
    ]);
    const firstCatcher = {
      id: 'catcher-1',
      position: 'C',
      overallRating: 550,
    } as GeneratedPlayer;
    const secondCatcher = {
      id: 'catcher-2',
      position: 'C',
      overallRating: 550,
    } as GeneratedPlayer;

    applyVirtualFreeAgencySigning(virtualRosters, needs, 'bos', firstCatcher);
    expect(needs.get('bos')?.get('C')).toBe(70);
    expect(buildFreeAgencyPreferencePreview(
      { age: 28 },
      contextForNeed(needs.get('bos')?.get('C') ?? 0),
    ).projectedOpportunity).toBe('regular');

    applyVirtualFreeAgencySigning(virtualRosters, needs, 'bos', secondCatcher);
    expect(needs.get('bos')?.get('C')).toBe(50);
    expect(virtualRosters.get('bos')?.map((player) => player.id)).toEqual([
      'catcher-1',
      'catcher-2',
    ]);
  });
});

function contextForNeed(teamNeed: number) {
  return {
    teamNeed,
    contenderStatus: 'unknown' as const,
    tenureSeasons: 0,
    homegrownBond: 0,
    clubhouseScore: 0,
  };
}
