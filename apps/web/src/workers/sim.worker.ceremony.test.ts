// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { FullGameState } from './sim.worker.helpers.js';
import { queueCareerMilestoneMoments } from './sim.worker.ceremony.js';

function player(id: string, teamId = 'nym', firstName = `First-${id}`, lastName = `Last-${id}`) {
  return { id, teamId, firstName, lastName };
}

function milestoneState(
  entries: Array<[string, { hr?: number; hits?: number; strikeouts?: number; wins?: number }]>,
  players: ReturnType<typeof player>[],
): FullGameState {
  return {
    season: 30,
    day: 162,
    userTeamId: 'nym',
    players,
    careerStats: entries.map(([playerId, stats]) => ({
      playerId,
      batting: { hr: stats.hr ?? 0, hits: stats.hits ?? 0 },
      pitching: { strikeouts: stats.strikeouts ?? 0, wins: stats.wins ?? 0 },
    })),
    seasonState: { playerSeasonStats: new Map() },
    ceremony: { pendingMoments: [], seenMomentIds: [] },
  } as unknown as FullGameState;
}

function countIdReads<T extends { id: string }>(entries: T[]) {
  let reads = 0;
  return {
    entries: entries.map((entry) => new Proxy(entry, {
      get(target, property, receiver) {
        if (property === 'id') reads += 1;
        return Reflect.get(target, property, receiver);
      },
    })),
    reads: () => reads,
  };
}

describe('queueCareerMilestoneMoments', () => {
  it('does not read player ids when no canonical milestone qualifies', () => {
    const counted = countIdReads([player('ineligible')]);
    const state = milestoneState([['ineligible', { hr: 99 }]], counted.entries);

    queueCareerMilestoneMoments(state);

    expect(state.ceremony.pendingMoments).toEqual([]);
    expect(counted.reads()).toBe(0);
  });

  it('bounds reads to qualifying original-order rows', () => {
    const players = Array.from({ length: 128 }, (_, index) => player(`player-${index}`));
    const counted = countIdReads(players);
    const state = milestoneState(
      players.map((entry, index) => [entry.id, { hr: index === 127 ? 100 : 99 }]),
      counted.entries,
    );

    queueCareerMilestoneMoments(state);

    expect(state.ceremony.pendingMoments).toHaveLength(1);
    expect(counted.reads()).toBeLessThanOrEqual(2 * 128 + 4);
  });

  it('preserves first-match and exact user-team queue semantics while suppressing missing and rival moments', () => {
    const state = milestoneState([
      ['duplicate', { hr: 100 }],
      ['rival', { hits: 500 }],
      ['missing', { hr: 100 }],
    ], [
      player('duplicate', 'nym', 'First', 'Match'),
      player('duplicate', 'bos', 'Second', 'Match'),
      player('rival', 'bos', 'Rival', 'Player'),
    ]);

    queueCareerMilestoneMoments(state);
    queueCareerMilestoneMoments(state);

    expect(state.ceremony.pendingMoments).toEqual([
      {
        id: 'career-milestone-milestone_hr-duplicate-First Match hits career home run #100',
        type: 'career_milestone',
        title: '100',
        subtitle: 'First Match',
        detailLines: ['First Match has reached the 100 home run milestone, a testament to sustained power production.'],
        soundEffect: 'achievement_unlock',
        autoDismissMs: 5000,
        createdAt: 'S30D162',
        theme: 'historic',
        relatedTeamIds: ['nym'],
        relatedPlayerIds: ['duplicate'],
      },
    ]);
  });
});
