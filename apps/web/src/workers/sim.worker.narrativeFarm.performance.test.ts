// @vitest-environment node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FullGameState } from './sim.worker.helpers.js';

const detectors = vi.hoisted(() => ({
  callup: vi.fn(),
  trade: vi.fn(),
}));

vi.mock('@mbd/sim-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mbd/sim-core')>();
  return {
    ...actual,
    detectSeptemberCallupHero: detectors.callup,
    detectTradeDeadlineSpark: detectors.trade,
  };
});

import { applySeasonEndPlayerMicroArcMoments } from './sim.worker.narrativeFarm.js';

function minimalState(): FullGameState {
  return {
    season: 8,
    day: 162,
    players: [],
    news: [],
    tradeState: { tradeHistory: [] },
    seasonState: { playerSeasonStats: new Map(), gameLog: [] },
    playerMoments: new Map(),
  } as unknown as FullGameState;
}

describe('applySeasonEndPlayerMicroArcMoments operation-local indexes', () => {
  beforeEach(() => {
    detectors.callup.mockReset();
    detectors.trade.mockReset();
  });

  it('is inert for no-news and no-trade states, including repeated invocation', () => {
    const state = minimalState();
    applySeasonEndPlayerMicroArcMoments(state);
    applySeasonEndPlayerMicroArcMoments(state);
    expect(state.playerMoments).toEqual(new Map());
  });

  it('preserves ordered duplicate facts, excludes malformed and wrong-season facts, and keeps equal-score first winners', () => {
    const state = minimalState();
    const alpha = { id: 'alpha', teamId: 'nym' };
    const beta = { id: 'beta', teamId: 'bos' };
    state.players = [alpha, alpha, beta] as FullGameState['players'];
    state.news = [
      {
        id: 'callup-alpha',
        body: 'alpha call-up is here',
        timestamp: 'S8D140',
        relatedPlayerIds: ['alpha'],
      },
      {
        id: 'callup-missing-player',
        body: 'missing call-up is here',
        timestamp: 'S8D141',
        relatedPlayerIds: ['missing'],
      },
      {
        id: 'callup-wrong-season',
        body: 'beta call-up is here',
        timestamp: 'S7D142',
        relatedPlayerIds: ['beta'],
      },
      {
        id: 'callup-malformed',
        body: 'beta call-up is here',
        timestamp: 'invalid',
        relatedPlayerIds: ['beta'],
      },
      {
        id: 'not-a-callup',
        body: 'beta reached the majors',
        timestamp: 'S8D143',
        relatedPlayerIds: ['beta'],
      },
    ] as FullGameState['news'];
    state.tradeState.tradeHistory = [
      {
        id: 'trade-first',
        fromTeamId: 'old',
        toTeamId: 'nym',
        offeringAssets: [
          { type: 'player', playerId: 'alpha' },
          { type: 'player', playerId: 'alpha' },
          { type: 'player', playerId: 'missing' },
        ],
        requestingAssets: [{ type: 'player', playerId: 'beta' }],
        fairnessScore: 0,
        summary: 'first',
        timestamp: 'S8D100',
      },
      {
        id: 'trade-second',
        fromTeamId: 'old-two',
        toTeamId: 'bos',
        offeringAssets: [{ type: 'player', playerId: 'alpha' }],
        requestingAssets: [],
        fairnessScore: 0,
        summary: 'second',
        timestamp: 'S8D110',
      },
      {
        id: 'trade-wrong-season',
        fromTeamId: 'old',
        toTeamId: 'bos',
        offeringAssets: [{ type: 'player', playerId: 'beta' }],
        requestingAssets: [],
        fairnessScore: 0,
        summary: 'wrong season',
        timestamp: 'S7D111',
      },
      {
        id: 'trade-malformed',
        fromTeamId: 'old',
        toTeamId: 'bos',
        offeringAssets: [{ type: 'player', playerId: 'beta' }],
        requestingAssets: [],
        fairnessScore: 0,
        summary: 'malformed',
        timestamp: 'not-a-timestamp',
      },
    ];
    const moment = (id: string, day: number) => ({
      season: 8,
      day,
      timestamp: `S8D${day}`,
      type: 'trade_deadline_spark',
      description: id,
      impact: 1,
      relevance: 0.1,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    });
    detectors.callup.mockReturnValue(null);
    detectors.trade.mockImplementation((player: { id: string }, context: {
      tradeDay: number;
      acquiringTeamId: string;
      playerMoments: Map<string, unknown[]>;
    }) => {
      if (context.playerMoments.has(player.id)) return null;
      if (player.id !== 'alpha') return null;
      const duplicateFirstFact = context.tradeDay === 100 && context.acquiringTeamId === 'nym'
        && detectors.trade.mock.calls.filter(([, value]) => value.tradeDay === 100).length > 1;
      return {
        playerId: player.id,
        score: context.acquiringTeamId === 'nym' ? 10 : 8,
        moment: moment(duplicateFirstFact ? 'trade-first-duplicate' : `trade-${context.acquiringTeamId}`, context.tradeDay),
      };
    });

    applySeasonEndPlayerMicroArcMoments(state);
    applySeasonEndPlayerMicroArcMoments(state);

    expect(detectors.callup.mock.calls.map(([player, context]) => `${player.id}:${context.callupDay}`)).toEqual(
      Array.from({ length: 4 }, () => 'alpha:140'),
    );
    expect(detectors.trade.mock.calls.map(([player, context]) =>
      `${player.id}:${context.tradeDay}:${context.acquiringTeamId}:${context.priorTeamId}`,
    )).toEqual(Array.from({ length: 2 }, () => [
      'alpha:100:nym:old',
      'alpha:100:nym:old',
      'alpha:110:bos:old-two',
      'alpha:100:nym:old',
      'alpha:100:nym:old',
      'alpha:110:bos:old-two',
      'beta:100:old:nym',
    ]).flat());
    expect(state.playerMoments.get('alpha')?.map((entry) => entry.description)).toEqual([
      'trade-bos',
      'trade-nym',
    ]);
    expect(state.playerMoments.get('alpha')?.some((entry) => entry.description === 'trade-first-duplicate')).toBe(false);
    expect(state.playerMoments.has('missing')).toBe(false);
    expect(state.playerMoments.has('beta')).toBe(false);
  });

  it('builds current-season news and trade facts before the ordered player pass', () => {
    const source = readFileSync(fileURLToPath(new URL('./sim.worker.narrativeFarm.ts', import.meta.url)), 'utf8');
    const start = source.indexOf('export function applySeasonEndPlayerMicroArcMoments(');
    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    let end = bodyStart;
    for (; end < source.length; end += 1) {
      if (source[end] === '{') depth += 1;
      if (source[end] === '}' && --depth === 0) break;
    }
    const body = source.slice(bodyStart, end + 1);
    const playerLoop = body.indexOf('for (const player of state.players)');
    const newsIndex = body.indexOf('for (const item of state.news)');
    const tradeIndex = body.indexOf('for (const trade of state.tradeState.tradeHistory)');
    expect(newsIndex).toBeGreaterThan(-1);
    expect(tradeIndex).toBeGreaterThan(-1);
    expect(newsIndex).toBeLessThan(playerLoop);
    expect(tradeIndex).toBeLessThan(playerLoop);
    expect(body.match(/for \(const item of state\.news\)/g)).toHaveLength(1);
    expect(body.match(/for \(const trade of state\.tradeState\.tradeHistory\)/g)).toHaveLength(1);
    expect(body).toContain('if (!current || detected.score! > current.score!)');
    expect(body).toContain('for (const teamId in bestTrades)');
  });
});
