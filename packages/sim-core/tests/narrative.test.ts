import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateNews,
  generateNewsId,
  checkMilestones,
  generateSeasonRecap,
  getUnreadNews,
  markAsRead,
  deduplicateNews,
} from '../src/index.js';
import type { NewsItem, GameEvent, GeneratedPlayer } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(seed: number): GeneratedPlayer {
  const rng = new GameRNG(seed);
  return generatePlayer(rng, 'SS', 'NYT', 'MLB');
}

function makeGameResultEvent(player: GeneratedPlayer): GameEvent {
  return {
    type: 'game_result',
    data: {
      winningTeamId: 'NYT',
      losingTeamId: 'BOS',
      winningTeamName: 'Tycoons',
      losingTeamName: "Noreasters",
      starPlayerId: player.id,
      hits: 3,
      ab: 4,
      hr: 1,
    },
    season: 1,
    day: 45,
  };
}

function makeEvent(
  type: GameEvent['type'],
  data: GameEvent['data'],
  season: number = 1,
  day: number = 45,
): GameEvent {
  return { type, data, season, day };
}

function makeSampleNews(count: number): NewsItem[] {
  const rng = new GameRNG(42);
  const items: NewsItem[] = [];
  const categories: Array<NewsItem['category']> = ['injury', 'trade', 'signing', 'milestone', 'performance'];
  const priorities: Array<NewsItem['priority']> = [1, 2, 3, 4, 5];
  for (let i = 0; i < count; i++) {
    items.push({
      id: generateNewsId(rng),
      headline: `Headline ${i}`,
      body: `Body ${i}`,
      priority: priorities[i % priorities.length]!,
      category: categories[i % categories.length]!,
      timestamp: `S1D${i}`,
      relatedPlayerIds: [`player-${i}`],
      relatedTeamIds: ['NYT'],
      read: i % 3 === 0, // Every third item is read
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateNews', () => {
  it('creates news items from game_result event', () => {
    const player = makePlayer(42);
    const event = makeGameResultEvent(player);
    const rng = new GameRNG(99);
    const news = generateNews(rng, event, [player], 1, 45);
    expect(news.length).toBeGreaterThan(0);
    for (const item of news) {
      expect(item.headline.length).toBeGreaterThan(0);
      expect(item.body.length).toBeGreaterThan(0);
      expect(item.id).toBeTruthy();
    }
  });

  it('all news items have valid priority (1-5) and category', () => {
    const player = makePlayer(42);
    const events: GameEvent[] = [
      makeGameResultEvent(player),
      makeEvent('injury', { playerId: player.id, teamId: 'NYT', teamName: 'Tycoons', injury: 'hamstring strain', ilDays: 15 }, 1, 50),
      makeEvent('trade', { player1Id: player.id, team1Id: 'NYT', team1Name: 'Tycoons', team2Id: 'BOS', team2Name: "Noreasters" }, 1, 55),
      makeEvent('extension', {
        playerId: player.id,
        teamId: 'NYT',
        teamName: 'Tycoons',
        years: 8,
        totalValue: 280,
        outcome: 'accepted',
        record: '58-34',
        streak: 'W6',
      }, 1, 90),
      makeEvent('qualifying_offer', {
        playerId: player.id,
        teamId: 'NYT',
        teamName: 'Tycoons',
        amount: 21.1,
        outcome: 'rejected',
      }, 1, 161),
      makeEvent('coaching', {
        teamId: 'BOS',
        teamName: "Noreasters",
        coachName: 'Sam Walker',
        role: 'pitching_coach',
      }, 1, 72),
      makeEvent('development', {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        teamId: 'NYT',
        teamName: 'Tycoons',
        level: 'AAA',
      }, 1, 68),
      makeEvent('rivalry', {
        team1Id: 'NYT',
        team1Name: 'Tycoons',
        team2Id: 'BOS',
        team2Name: "Noreasters",
        intensity: 76,
        playoffPosition: '1.5 games apart in the Wild Card race',
      }, 1, 101),
      makeEvent('rumor', {
        teamId: 'NYT',
        teamName: 'Tycoons',
        targetPlayerId: player.id,
        daysToDeadline: 4,
        need: 'rotation help',
      }, 1, 118),
    ];
    const rng = new GameRNG(200);
    for (const event of events) {
      const news = generateNews(rng, event, [player], event.season, event.day);
      for (const item of news) {
        expect(item.priority).toBeGreaterThanOrEqual(1);
        expect(item.priority).toBeLessThanOrEqual(5);
        expect(item.category).toBeTruthy();
      }
    }
  });

  it('generates tagged extension coverage with contract context', () => {
    const player = makePlayer(42);
    const rng = new GameRNG(501);
    const event = makeEvent('extension', {
      playerId: player.id,
      teamId: 'NYT',
      teamName: 'Tycoons',
      years: 8,
      totalValue: 280,
      outcome: 'accepted',
      record: '61-37',
      streak: 'W5',
      playoffPosition: '1st in AL East',
    }, 2, 95);

    const [item] = generateNews(rng, event, [player], event.season, event.day);

    expect(item).toMatchObject({
      category: 'extension',
      tag: 'BREAKING',
      relatedPlayerIds: [player.id],
      relatedTeamIds: ['NYT'],
      timestamp: 'S2D95',
    });
    expect(item.headline).toContain('Tycoons');
    expect(item.body).toContain('$280.0M');
    expect(item.body).toContain('61-37 record');
    expect(item.body).toContain('W5 streak');
  });

  it('generates tagged qualifying-offer resolution coverage', () => {
    const player = makePlayer(43);
    const rng = new GameRNG(502);
    const event = makeEvent('qualifying_offer', {
      playerId: player.id,
      teamId: 'NYT',
      teamName: 'Tycoons',
      amount: 21.1,
      outcome: 'rejected',
      record: '86-76',
    }, 3, 162);

    const [item] = generateNews(rng, event, [player], event.season, event.day);

    expect(item).toMatchObject({
      category: 'qualifying_offer',
      tag: 'BREAKING',
      relatedPlayerIds: [player.id],
      relatedTeamIds: ['NYT'],
    });
    expect(item.body).toContain('$21.1M');
    expect(item.body).toContain('free agency');
  });

  it('does not emit malformed milestone copy when structured data is missing', () => {
    const player = makePlayer(45);
    const malformedEvents: GameEvent[] = [
      makeEvent('milestone', {}, 3, 44),
      makeEvent('milestone', {
        playerId: player.id,
        milestoneType: 'strikeouts',
      }, 3, 45),
      makeEvent('milestone', {
        playerId: 'missing-player',
        milestoneType: 'home runs',
        count: 500,
      }, 3, 46),
    ];

    for (const event of malformedEvents) {
      expect(generateNews(new GameRNG(900), event, [player], event.season, event.day)).toEqual([]);
    }
  });

  it('uses structured milestone data for player, count, and team references', () => {
    const player = makePlayer(46);
    const event = makeEvent('milestone', {
      playerId: player.id,
      milestoneType: 'strikeouts',
      count: 1000,
      teamId: 'NYT',
    }, 3, 46);

    const [item] = generateNews(new GameRNG(901), event, [player], event.season, event.day);
    const combined = `${item?.headline ?? ''} ${item?.body ?? ''}`;

    expect(item).toMatchObject({
      category: 'milestone',
      relatedPlayerIds: [player.id],
      relatedTeamIds: ['NYT'],
      timestamp: 'S3D46',
    });
    expect(combined).toContain('1000');
    expect(combined).not.toMatch(/Unknown|#0|0th|undefined/);
  });

  it('generates coaching coverage with analysis tagging', () => {
    const rng = new GameRNG(503);
    const event = makeEvent('coaching', {
      teamId: 'BOS',
      teamName: "Noreasters",
      coachName: 'Maggie Price',
      role: 'pitching_coach',
      playoffPosition: '3 games out of the Wild Card',
    }, 2, 58);

    const [item] = generateNews(rng, event, [], event.season, event.day);

    expect(item).toMatchObject({
      category: 'coaching',
      tag: 'ANALYSIS',
      relatedTeamIds: ['BOS'],
    });
    expect(item.headline).toContain('Maggie Price');
    expect(item.body).toContain('pitching coach');
    expect(item.body).toContain('3 games out of the Wild Card');
  });

  it('generates development coverage with level context', () => {
    const player = makePlayer(44);
    const rng = new GameRNG(504);
    const event = makeEvent('development', {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      teamId: 'NYT',
      teamName: 'Tycoons',
      level: 'AAA',
      streak: '12-game hitting',
    }, 2, 64);

    const [item] = generateNews(rng, event, [player], event.season, event.day);

    expect(item).toMatchObject({
      category: 'development',
      tag: 'ANALYSIS',
      relatedPlayerIds: [player.id],
      relatedTeamIds: ['NYT'],
    });
    expect(item.headline).toContain('AAA');
    expect(item.body).toContain('AAA');
    expect(item.body).toContain('12-game hitting streak');
  });

  it('generates rivalry coverage with both clubs attached', () => {
    const rng = new GameRNG(505);
    const event = makeEvent('rivalry', {
      team1Id: 'NYT',
      team1Name: 'Tycoons',
      team2Id: 'BOS',
      team2Name: "Noreasters",
      intensity: 84,
      playoffPosition: 'tied atop the division',
    }, 4, 122);

    const [item] = generateNews(rng, event, [], event.season, event.day);

    expect(item).toMatchObject({
      category: 'rivalry',
      tag: 'ANALYSIS',
      relatedTeamIds: ['NYT', 'BOS'],
    });
    expect(item.headline).toMatch(/Tycoons|Noreasters/);
    expect(item.body).toContain('84');
    expect(item.body).toContain('tied atop the division');
  });

  it('generates rumor coverage with rumor tagging', () => {
    const player = makePlayer(45);
    const rng = new GameRNG(506);
    const event = makeEvent('rumor', {
      teamId: 'NYT',
      teamName: 'Tycoons',
      targetPlayerId: player.id,
      targetName: `${player.firstName} ${player.lastName}`,
      daysToDeadline: 5,
      need: 'bullpen help',
    }, 2, 117);

    const [item] = generateNews(rng, event, [player], event.season, event.day);

    expect(item).toMatchObject({
      category: 'rumor',
      tag: 'RUMOR',
      relatedPlayerIds: [player.id],
      relatedTeamIds: ['NYT'],
    });
    expect(item.headline).toContain('Tycoons');
    expect(item.body).toContain('rumor traffic');
    expect(item.body).toContain('5 days to the deadline');
  });

  it('is deterministic for repeated rumor events with the same seed', () => {
    const player = makePlayer(46);
    const event = makeEvent('rumor', {
      teamId: 'NYT',
      teamName: 'Tycoons',
      targetPlayerId: player.id,
      daysToDeadline: 3,
      need: 'rotation help',
    }, 2, 119);

    const first = generateNews(new GameRNG(700), event, [player], event.season, event.day);
    const second = generateNews(new GameRNG(700), event, [player], event.season, event.day);

    expect(second).toEqual(first);
  });

  it('uses multiple headline templates across extension events', () => {
    const player = makePlayer(47);
    const event = makeEvent('extension', {
      playerId: player.id,
      teamId: 'NYT',
      teamName: 'Tycoons',
      years: 7,
      totalValue: 210,
      outcome: 'accepted',
    }, 2, 80);

    const headlines = new Set(
      Array.from({ length: 12 }, (_, seed) =>
        generateNews(new GameRNG(800 + seed), event, [player], event.season, event.day)[0]?.headline ?? '',
      ),
    );

    expect(headlines.size).toBeGreaterThan(1);
  });
});

describe('generateNewsId', () => {
  it('returns unique strings', () => {
    const rng = new GameRNG(42);
    const id1 = generateNewsId(rng);
    const id2 = generateNewsId(rng);
    expect(typeof id1).toBe('string');
    expect(id1.startsWith('news_')).toBe(true);
    expect(id1.length).toBeGreaterThan(5);
    expect(id1).not.toBe(id2);
  });
});

describe('checkMilestones', () => {
  it('detects home run milestones', () => {
    const player = makePlayer(42);
    const stats = new Map<string, { hr: number; hits: number }>();
    stats.set(player.id, { hr: 500, hits: 2000 });
    const moments = checkMilestones(stats, [player], 5, 100);
    const hrMoments = moments.filter((m) => m.type === 'milestone_hr');
    expect(hrMoments.length).toBeGreaterThan(0);
    expect(hrMoments[0]!.headline).toContain('500');
    expect(hrMoments[0]!.historical).toBe(true);
  });

  it('detects hit milestones', () => {
    const player = makePlayer(42);
    const stats = new Map<string, { hr: number; hits: number }>();
    stats.set(player.id, { hr: 50, hits: 3000 });
    const moments = checkMilestones(stats, [player], 10, 50);
    const hitMoments = moments.filter((m) => m.type === 'milestone_hit');
    expect(hitMoments.length).toBeGreaterThan(0);
    expect(hitMoments[0]!.historical).toBe(true);
  });

  it('returns empty for non-milestone stats', () => {
    const player = makePlayer(42);
    const stats = new Map<string, { hr: number; hits: number }>();
    stats.set(player.id, { hr: 47, hits: 150 });
    const moments = checkMilestones(stats, [player], 1, 30);
    expect(moments.length).toBe(0);
  });
});

describe('getUnreadNews', () => {
  it('filters correctly and sorts by priority', () => {
    const news = makeSampleNews(10);
    const unread = getUnreadNews(news);
    // Should not contain read items
    for (const item of unread) {
      expect(item.read).toBe(false);
    }
    // Should be sorted by priority (ascending = highest priority first)
    for (let i = 1; i < unread.length; i++) {
      expect(unread[i - 1]!.priority).toBeLessThanOrEqual(unread[i]!.priority);
    }
  });

  it('orders equal-priority unread items deterministically across input order', () => {
    const items: NewsItem[] = [
      {
        id: 'news-b',
        headline: 'Older tie',
        body: 'Body',
        priority: 2,
        category: 'trade',
        timestamp: 'S1D9',
        relatedPlayerIds: [],
        relatedTeamIds: ['NYT'],
        read: false,
      },
      {
        id: 'news-a',
        headline: 'Newer tie',
        body: 'Body',
        priority: 2,
        category: 'trade',
        timestamp: 'S1D10',
        relatedPlayerIds: [],
        relatedTeamIds: ['NYT'],
        read: false,
      },
    ];

    expect(getUnreadNews(items).map((item) => item.id)).toEqual(['news-a', 'news-b']);
    expect(getUnreadNews([...items].reverse()).map((item) => item.id)).toEqual(['news-a', 'news-b']);
  });
});

describe('markAsRead', () => {
  it('updates read status for the specified item', () => {
    const news = makeSampleNews(5);
    const unreadItem = news.find((n) => !n.read)!;
    expect(unreadItem).toBeTruthy();
    const updated = markAsRead(news, unreadItem.id);
    const found = updated.find((n) => n.id === unreadItem.id)!;
    expect(found.read).toBe(true);
    // Should not mutate original
    expect(news.find((n) => n.id === unreadItem.id)!.read).toBe(false);
  });
});

describe('deduplicateNews', () => {
  it('removes duplicates with same category, timestamp, and players', () => {
    const rng = new GameRNG(42);
    const items: NewsItem[] = [
      {
        id: generateNewsId(rng),
        headline: 'First headline',
        body: 'Body 1',
        priority: 2,
        category: 'injury',
        timestamp: 'S1D10',
        relatedPlayerIds: ['p1'],
        relatedTeamIds: ['NYT'],
        read: false,
      },
      {
        id: generateNewsId(rng),
        headline: 'Duplicate headline',
        body: 'Body 2',
        priority: 4,
        category: 'injury',
        timestamp: 'S1D10',
        relatedPlayerIds: ['p1'],
        relatedTeamIds: ['NYT'],
        read: false,
      },
      {
        id: generateNewsId(rng),
        headline: 'Different event',
        body: 'Body 3',
        priority: 3,
        category: 'trade',
        timestamp: 'S1D10',
        relatedPlayerIds: ['p2'],
        relatedTeamIds: ['BOS'],
        read: false,
      },
    ];
    const deduped = deduplicateNews(items);
    // The two injury items with same timestamp and player should be deduped to one
    const injuryItems = deduped.filter((n) => n.category === 'injury');
    expect(injuryItems.length).toBe(1);
    // Should keep the higher priority one (priority 2 < 4, so priority 2 is "higher")
    expect(injuryItems[0]!.priority).toBe(2);
    // Trade item should remain
    expect(deduped.filter((n) => n.category === 'trade').length).toBe(1);
  });

  it('keeps the same duplicate winner for equal-priority ties regardless of input order', () => {
    const items: NewsItem[] = [
      {
        id: 'news-b',
        headline: 'Later lexical id',
        body: 'Body 1',
        priority: 2,
        category: 'injury',
        timestamp: 'S1D10',
        relatedPlayerIds: ['p1'],
        relatedTeamIds: ['NYT'],
        read: false,
      },
      {
        id: 'news-a',
        headline: 'Earlier lexical id',
        body: 'Body 2',
        priority: 2,
        category: 'injury',
        timestamp: 'S1D10',
        relatedPlayerIds: ['p1'],
        relatedTeamIds: ['NYT'],
        read: false,
      },
    ];

    expect(deduplicateNews(items)[0]?.id).toBe('news-a');
    expect(deduplicateNews([...items].reverse())[0]?.id).toBe('news-a');
  });
});

describe('generateSeasonRecap', () => {
  it('chooses the tied best-record club deterministically regardless of standings order', () => {
    const standings = [
      { teamId: 'nym', wins: 95, losses: 67 },
      { teamId: 'bos', wins: 95, losses: 67 },
      { teamId: 'orl', wins: 88, losses: 74 },
    ];

    const forward = generateSeasonRecap(new GameRNG(800), standings, null, 5);
    const reversed = generateSeasonRecap(new GameRNG(800), [...standings].reverse(), null, 5);

    const forwardBest = forward.find((item) => item.category === 'standings');
    const reversedBest = reversed.find((item) => item.category === 'standings');

    expect(forwardBest?.headline).toBe('bos finishes Season 5 with league-best 95-67 record');
    expect(reversedBest?.headline).toBe('bos finishes Season 5 with league-best 95-67 record');
  });
});
