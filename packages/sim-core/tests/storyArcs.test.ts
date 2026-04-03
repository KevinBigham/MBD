import { describe, expect, it } from 'vitest';
import type { AwardHistoryEntry, PlayerOrigin, PlayerStoryArc } from '@mbd/contracts';
import {
  GameRNG,
  advanceStoryArcs,
  detectNewStoryArcs,
  generatePlayer,
  type GeneratedPlayer,
} from '../src/index.js';

function makePlayer(
  seed: number,
  overrides: Partial<GeneratedPlayer> = {},
  position: GeneratedPlayer['position'] = 'SS',
  teamId: string = 'nyy',
  rosterStatus: GeneratedPlayer['rosterStatus'] = 'MLB',
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, rosterStatus),
    ...overrides,
  };
}

function buildSnapshot(overrides: Partial<Parameters<typeof detectNewStoryArcs>[1]> = {}) {
  return {
    season: 6,
    day: 108,
    userTeamId: 'nyy',
    players: [],
    playerStoryArcs: [],
    seasonStats: new Map(),
    standings: new Map<string, { wins: number; losses: number }>([
      ['nyy', { wins: 58, losses: 40 }],
      ['bos', { wins: 44, losses: 54 }],
      ['lad', { wins: 55, losses: 45 }],
    ]),
    awardHistory: [] as AwardHistoryEntry[],
    playerOrigins: new Map<string, PlayerOrigin>(),
    ...overrides,
  };
}

describe('story arcs', () => {
  it.each([
    ['rookie_sensation', makePlayer(1, { age: 23, serviceTimeDays: 100 }, 'CF', 'nyy', 'MLB'), { pa: 140, ab: 120, hits: 40, hr: 9 }],
    ['breakout_campaign', makePlayer(2, { age: 27, serviceTimeDays: 400, overallRating: 330 }, 'RF', 'lad', 'MLB'), { pa: 180, ab: 150, hits: 52, hr: 17, rbi: 68 }],
    ['comeback_trail', makePlayer(3, { age: 29, developmentTrajectory: 'ahead_of_curve', overallRating: 390 }, '1B', 'nyy', 'MLB'), { pa: 130, ab: 110, hits: 34, hr: 8 }],
    ['decline_watch', makePlayer(4, { age: 35, developmentTrajectory: 'bust_risk' }, 'DH', 'bos', 'MLB'), { pa: 130, ab: 120, hits: 25, hr: 4 }],
    ['trade_saga', makePlayer(5, { contract: { ...makePlayer(5).contract, years: 1 }, overallRating: 340 }, 'SP', 'bos', 'MLB'), { ip: 78, earnedRuns: 27, wins: 7, strikeouts: 82 }],
    ['contract_drama', makePlayer(6, { age: 32, contract: { ...makePlayer(6).contract, years: 1 }, overallRating: 360 }, '3B', 'nyy', 'MLB'), { pa: 155, ab: 140, hits: 48, hr: 19, rbi: 73 }],
    ['prospect_rise', makePlayer(7, { age: 21, overallRating: 320 }, 'SS', 'nyy', 'AAA'), { pa: 0 }],
    ['dynasty_cornerstone', makePlayer(8, { age: 31, serviceTimeDays: 9 * 172, overallRating: 365 }, 'CF', 'nyy', 'MLB'), { pa: 160, ab: 142, hits: 46, hr: 15 }],
  ] as const)('detects %s arcs from player state', (expectedArcType, player, stats) => {
    const awardHistory: AwardHistoryEntry[] = expectedArcType === 'dynasty_cornerstone'
      ? [
          { season: 3, award: 'All-Star', league: 'MLB', playerId: player.id, teamId: player.teamId, summary: 'All-Star nod.' },
          { season: 4, award: 'All-Star', league: 'MLB', playerId: player.id, teamId: player.teamId, summary: 'All-Star nod.' },
          { season: 5, award: 'All-Star', league: 'MLB', playerId: player.id, teamId: player.teamId, summary: 'All-Star nod.' },
        ]
      : [];
    const origins = new Map<string, PlayerOrigin>();
    if (expectedArcType === 'prospect_rise') {
      origins.set(player.id, {
        playerId: player.id,
        originTeamId: 'nyy',
        acquisitionType: 'draft',
        acquiredSeason: 5,
        draftSeason: 5,
        draftRound: 1,
        draftPickNumber: 12,
        originalGrade: 62,
        bonusAmount: 5.2,
      });
    }

    const snapshot = buildSnapshot({
      players: [player],
      seasonStats: new Map([[player.id, stats]]),
      awardHistory,
      playerOrigins: origins,
    });

    const arcs = detectNewStoryArcs(new GameRNG(42), snapshot);
    expect(arcs).toHaveLength(1);
    expect(arcs[0]?.arcType).toBe(expectedArcType);
    expect(arcs[0]?.phase).toBe('setup');
  });

  it('enforces the 5-arc cap and skips players with an existing active arc', () => {
    const rookie = makePlayer(21, { age: 23, serviceTimeDays: 100 }, 'CF', 'nyy', 'MLB');
    const players = [
      rookie,
      makePlayer(22, { age: 27, serviceTimeDays: 400, overallRating: 330 }, 'RF', 'lad', 'MLB'),
      makePlayer(23, { age: 29, developmentTrajectory: 'ahead_of_curve', overallRating: 390 }, '1B', 'nyy', 'MLB'),
      makePlayer(24, { age: 35, developmentTrajectory: 'bust_risk' }, 'DH', 'bos', 'MLB'),
      makePlayer(25, { contract: { ...makePlayer(25).contract, years: 1 }, overallRating: 340 }, 'SP', 'bos', 'MLB'),
      makePlayer(26, { age: 32, contract: { ...makePlayer(26).contract, years: 1 }, overallRating: 360 }, '3B', 'nyy', 'MLB'),
      makePlayer(27, { age: 21, overallRating: 320 }, 'SS', 'nyy', 'AAA'),
      makePlayer(28, { age: 31, serviceTimeDays: 9 * 172, overallRating: 365 }, 'CF', 'nyy', 'MLB'),
    ];
    const seasonStats = new Map(players.map((player, index) => [player.id, {
      pa: player.rosterStatus === 'MLB' ? 150 + index : 0,
      ab: player.rosterStatus === 'MLB' ? 130 + index : 0,
      hits: player.rosterStatus === 'MLB' ? 44 : 0,
      hr: 16,
      rbi: 70,
      ip: player.position === 'SP' ? 80 : 0,
      earnedRuns: player.position === 'SP' ? 26 : 0,
      wins: player.position === 'SP' ? 8 : 0,
      strikeouts: player.position === 'SP' ? 90 : 0,
    }]));
    const origins = new Map<string, PlayerOrigin>([[
      players[6]!.id,
      {
        playerId: players[6]!.id,
        originTeamId: 'nyy',
        acquisitionType: 'draft',
        acquiredSeason: 5,
        draftSeason: 5,
        draftRound: 1,
        draftPickNumber: 9,
        originalGrade: 64,
        bonusAmount: 4.8,
      },
    ]]);
    const awardHistory: AwardHistoryEntry[] = [
      { season: 3, award: 'All-Star', league: 'MLB', playerId: players[7]!.id, teamId: 'nyy', summary: 'All-Star nod.' },
      { season: 4, award: 'All-Star', league: 'MLB', playerId: players[7]!.id, teamId: 'nyy', summary: 'All-Star nod.' },
      { season: 5, award: 'All-Star', league: 'MLB', playerId: players[7]!.id, teamId: 'nyy', summary: 'All-Star nod.' },
    ];

    const arcs = detectNewStoryArcs(new GameRNG(9), buildSnapshot({
      players,
      seasonStats,
      awardHistory,
      playerOrigins: origins,
      playerStoryArcs: [{
        playerId: rookie.id,
        arcType: 'rookie_sensation',
        startSeason: 6,
        startDay: 90,
        phase: 'rising',
        milestones: [],
        resolvedSeason: null,
      }],
    }));

    expect(arcs).toHaveLength(4);
    expect(arcs.some((arc) => arc.playerId === rookie.id)).toBe(false);
  });

  it('advances arc phases, emits news/ticker updates, and preserves resolved history', () => {
    const risingPlayer = makePlayer(31, { age: 23, serviceTimeDays: 100 }, 'CF', 'nyy', 'MLB');
    const climaxPlayer = makePlayer(32, { age: 27, serviceTimeDays: 400, overallRating: 330 }, 'RF', 'lad', 'MLB');
    const resolutionPlayer = makePlayer(33, { age: 21, overallRating: 320 }, 'SS', 'nyy', 'MLB');
    const snapshot = buildSnapshot({
      day: 150,
      players: [risingPlayer, climaxPlayer, resolutionPlayer],
      seasonStats: new Map([
        [risingPlayer.id, { pa: 160, ab: 140, hits: 48, hr: 10 }],
        [climaxPlayer.id, { pa: 180, ab: 150, hits: 55, hr: 24, rbi: 80 }],
        [resolutionPlayer.id, { pa: 40, ab: 35, hits: 11, hr: 1 }],
      ]),
      playerStoryArcs: [
        {
          playerId: risingPlayer.id,
          arcType: 'rookie_sensation',
          startSeason: 6,
          startDay: 60,
          phase: 'setup',
          milestones: [],
          resolvedSeason: null,
        },
        {
          playerId: climaxPlayer.id,
          arcType: 'breakout_campaign',
          startSeason: 6,
          startDay: 60,
          phase: 'rising',
          milestones: [],
          resolvedSeason: null,
        },
        {
          playerId: resolutionPlayer.id,
          arcType: 'prospect_rise',
          startSeason: 6,
          startDay: 60,
          phase: 'climax',
          milestones: [],
          resolvedSeason: null,
        },
      ],
    });

    const result = advanceStoryArcs(new GameRNG(77), snapshot);

    expect(result.updatedArcs[0]?.phase).toBe('rising');
    expect(result.updatedArcs[1]?.phase).toBe('climax');
    expect(result.updatedArcs[2]?.phase).toBe('resolution');
    expect(result.updatedArcs[2]?.resolvedSeason).toBe(6);
    expect(result.newsItems).toHaveLength(3);
    expect(result.tickerEntries).toHaveLength(3);
    expect(result.tickerEntries.some((entry) => entry.text.includes('gaining momentum'))).toBe(true);
    expect(result.tickerEntries.some((entry) => entry.text.includes('reaches a crescendo'))).toBe(true);
    expect(result.tickerEntries.some((entry) => entry.text.includes('concludes with a defining turn'))).toBe(true);
  });

  it('is deterministic with the same seeded input', () => {
    const player = makePlayer(41, { age: 23, serviceTimeDays: 100 }, 'CF', 'nyy', 'MLB');
    const snapshot = buildSnapshot({
      players: [player],
      seasonStats: new Map([[player.id, { pa: 160, ab: 140, hits: 47, hr: 11 }]]),
    });

    const first = detectNewStoryArcs(new GameRNG(1234), snapshot);
    const second = detectNewStoryArcs(new GameRNG(1234), snapshot);

    expect(first).toEqual(second);
  });
});
