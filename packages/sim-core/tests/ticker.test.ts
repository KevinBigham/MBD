import { describe, expect, it } from 'vitest';
import { GameRNG, generateTickerEntries, pruneTickerFeed } from '../src/index.js';

describe('ticker engine', () => {
  it('generates score, standings, injury, and seeded rumor entries', () => {
    const rng = new GameRNG(42);

    const entries = generateTickerEntries(rng, {
      season: 4,
      day: 92,
      scores: [{
        winningTeamId: 'nym',
        winningTeamName: 'Tycoons',
        losingTeamId: 'bos',
        losingTeamName: "Noreasters",
        winningScore: 5,
        losingScore: 3,
        starPlayerId: 'player-1',
        starPlayerName: 'Alex Slugger',
        hits: 3,
        atBats: 4,
        hr: 2,
      }],
      standingsChanges: [{
        teamId: 'nym',
        teamName: 'Tycoons',
        division: 'AL East',
        tookSoleLead: true,
      }],
      injuries: [{
        playerId: 'player-2',
        playerName: 'Ben Ace',
        teamId: 'nym',
        injury: 'forearm strain',
      }],
      trades: [],
      milestones: [],
      prospectCallups: [],
      recordWatches: [],
      rumorCandidates: [{
        teamId: 'bos',
        teamName: "Noreasters",
        position: 'SP',
      }],
      rumorsEnabled: true,
    });

    expect(entries.some((entry) =>
      entry.category === 'score'
      && entry.priority === 2
      && entry.text.includes('Tycoons defeats Noreasters 5-3')
      && entry.text.includes('Alex Slugger goes 3-for-4 with 2 HR'),
    )).toBe(true);

    expect(entries.some((entry) =>
      entry.category === 'standings'
      && entry.priority === 3
      && entry.text.includes('sole possession of first place')
      && entry.relatedTeamIds.includes('nym'),
    )).toBe(true);

    expect(entries.some((entry) =>
      entry.category === 'injury'
      && entry.priority === 3
      && entry.text.includes('Ben Ace placed on 15-day IL with forearm strain')
      && entry.relatedPlayerIds.includes('player-2')
    )).toBe(true);

    expect(entries.some((entry) =>
      entry.category === 'rumor'
      && entry.priority === 2
      && entry.text.includes('Sources: Noreasters exploring trades for SP'),
    )).toBe(true);
  });

  it('generates milestone, prospect, trade, and record-watch entries', () => {
    const rng = new GameRNG(77);

    const entries = generateTickerEntries(rng, {
      season: 5,
      day: 121,
      scores: [],
      standingsChanges: [],
      injuries: [],
      trades: [{
        acquiringTeamId: 'lax',
        acquiringTeamName: 'Sunset Strip',
        fromTeamId: 'mia',
        fromTeamName: 'Hurricanes',
        acquiredPlayerId: 'player-10',
        acquiredPlayerName: 'Carlos Trade',
        returnPlayerId: 'player-11',
        returnPlayerName: 'Mason Return',
      }],
      milestones: [{
        playerId: 'player-20',
        playerName: 'Victor Veteran',
        teamId: 'lax',
        text: 'records career hit #2000',
      }],
      prospectCallups: [{
        playerId: 'player-30',
        playerName: 'Danny Prospect',
        teamId: 'mia',
        teamName: 'Hurricanes',
        fromLevel: 'AAA',
      }],
      recordWatches: [{
        playerId: 'player-40',
        playerName: 'Sam Pace',
        teamId: 'lax',
        text: 'home run record',
        currentStat: 47,
      }],
      rumorCandidates: [],
      rumorsEnabled: false,
    });

    expect(entries.some((entry) => entry.category === 'trade' && entry.priority === 4)).toBe(true);
    expect(entries.some((entry) => entry.category === 'milestone' && entry.priority === 5)).toBe(true);
    expect(entries.some((entry) => entry.category === 'prospect' && entry.priority === 4)).toBe(true);
    expect(entries.some((entry) => entry.category === 'record' && entry.priority === 3)).toBe(true);
  });

  it('prunes expired entries and caps the rolling feed at 200 items', () => {
    const feed = Array.from({ length: 205 }, (_, index) => ({
      id: `ticker-${index}`,
      timestamp: `S4D${index + 1}`,
      category: 'score' as const,
      text: `Entry ${index}`,
      priority: 2 as const,
      relatedTeamIds: ['nym'],
      relatedPlayerIds: [],
      expiresDay: index < 3 ? 10 : 400,
    }));

    const pruned = pruneTickerFeed(feed, 200, 120);

    expect(pruned).toHaveLength(200);
    expect(pruned.some((entry) => entry.id === 'ticker-0')).toBe(false);
    expect(pruned.some((entry) => entry.id === 'ticker-1')).toBe(false);
    expect(pruned[0]?.id).toBe('ticker-204');
    expect(pruned.at(-1)?.id).toBe('ticker-5');
  });

  it('orders same-day ticker items deterministically regardless of input order', () => {
    const feed = [
      {
        id: 'ticker-b',
        timestamp: 'S4D120',
        category: 'score' as const,
        text: 'B',
        priority: 2 as const,
        relatedTeamIds: ['nym'],
        relatedPlayerIds: [],
        expiresDay: 9999,
      },
      {
        id: 'ticker-a',
        timestamp: 'S4D120',
        category: 'trade' as const,
        text: 'A',
        priority: 4 as const,
        relatedTeamIds: ['bos'],
        relatedPlayerIds: [],
        expiresDay: 9999,
      },
    ];

    expect(pruneTickerFeed(feed, 10, 100).map((entry) => entry.id)).toEqual(['ticker-a', 'ticker-b']);
    expect(pruneTickerFeed([...feed].reverse(), 10, 100).map((entry) => entry.id)).toEqual(['ticker-a', 'ticker-b']);
  });
});
