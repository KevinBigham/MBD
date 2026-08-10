// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { FullGameState } from './sim.worker.helpers.js';
import { buildCareerMilestoneEvents } from './sim.worker.milestones.js';

type Stat = { hr: number; hits: number; strikeouts: number; wins: number };

function player(id: string, teamId = 'nym', firstName = `First-${id}`, lastName = `Last-${id}`) {
  return { id, teamId, firstName, lastName };
}

function milestoneState(
  entries: Array<[string, Partial<Stat>]>,
  players: ReturnType<typeof player>[],
): FullGameState {
  return {
    season: 30,
    day: 162,
    players,
    careerStats: entries.map(([playerId, stats]) => ({
      playerId,
      batting: { hr: stats.hr ?? 0, hits: stats.hits ?? 0 },
      pitching: { strikeouts: stats.strikeouts ?? 0, wins: stats.wins ?? 0 },
    })),
    seasonState: { playerSeasonStats: new Map() },
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

describe('buildCareerMilestoneEvents', () => {
  it('does not read player ids when the canonical eligibility probe is empty', () => {
    const counted = countIdReads([player('ineligible')]);
    const state = milestoneState([['ineligible', { hr: 99 }]], counted.entries);

    expect(buildCareerMilestoneEvents(state, 162)).toEqual([]);
    expect(counted.reads()).toBe(0);
  });

  it('narrows player lookup work to the qualifying original-order rows', () => {
    const players = Array.from({ length: 128 }, (_, index) => player(`player-${index}`));
    const counted = countIdReads(players);
    const state = milestoneState(
      players.map((entry, index) => [entry.id, { hr: index === 127 ? 100 : 99 }]),
      counted.entries,
    );

    expect(buildCareerMilestoneEvents(state, 162)).toMatchObject([
      { playerId: 'player-127', playerName: 'First-player-127 Last-player-127', count: 100 },
    ]);
    expect(counted.reads()).toBeLessThanOrEqual(2 * 128 + 4);
  });

  it('retains duplicate order, first-match names, missing-player suppression, and exact moment order', () => {
    const state = milestoneState([
      ['duplicate', { hr: 100, hits: 500 }],
      ['missing', { hr: 100 }],
      ['second', { strikeouts: 500, wins: 50 }],
    ], [
      player('duplicate', 'nym', 'First', 'Match'),
      player('duplicate', 'bos', 'Second', 'Match'),
      player('second', 'bos', 'Second', 'Player'),
    ]);

    expect(buildCareerMilestoneEvents(state, 162)).toEqual([
      {
        count: 100,
        milestoneType: 'home runs',
        moment: {
          type: 'milestone_hr',
          headline: 'First Match hits career home run #100',
          description: 'First Match has reached the 100 home run milestone, a testament to sustained power production.',
          season: 30,
          day: 162,
          playerIds: ['duplicate'],
          teamIds: [],
          historical: false,
        },
        playerId: 'duplicate',
        playerName: 'First Match',
        teamId: 'nym',
        tickerText: 'hits career home run #100',
      },
      {
        count: 500,
        milestoneType: 'hits',
        moment: {
          type: 'milestone_hit',
          headline: 'First Match reaches 500 career hits',
          description: 'First Match has collected career hit #500, joining an elite group of hitters.',
          season: 30,
          day: 162,
          playerIds: ['duplicate'],
          teamIds: [],
          historical: false,
        },
        playerId: 'duplicate',
        playerName: 'First Match',
        teamId: 'nym',
        tickerText: 'records career hit #500',
      },
      {
        count: 500,
        milestoneType: 'strikeouts',
        moment: {
          type: 'milestone_k',
          headline: 'Second Player records career strikeout #500',
          description: 'Second Player has tallied 500 career strikeouts, a mark of pitching dominance.',
          season: 30,
          day: 162,
          playerIds: ['second'],
          teamIds: [],
          historical: false,
        },
        playerId: 'second',
        playerName: 'Second Player',
        teamId: 'bos',
        tickerText: 'records career strikeout #500',
      },
      {
        count: 50,
        milestoneType: 'wins',
        moment: {
          type: 'milestone_win',
          headline: 'Second Player earns career win #50',
          description: 'Second Player has reached 50 career victories.',
          season: 30,
          day: 162,
          playerIds: ['second'],
          teamIds: [],
          historical: false,
        },
        playerId: 'second',
        playerName: 'Second Player',
        teamId: 'bos',
        tickerText: 'earns career win #50',
      },
    ]);
  });
});
