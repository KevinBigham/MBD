import { describe, expect, it } from 'vitest';
import {
  TEAMS,
  addTradeMemory,
  createRelationshipMap,
  decayRelationships,
  generateRelationshipTooltip,
  getRelationship,
  getRelationshipTier,
  getTradeValueAdjustment,
  modifyRelationship,
  MAX_TRADE_HISTORY,
  PERMANENT_DECAY_RATE,
  GRUDGE_DECAY_RATE,
  type GMRelationship,
  type GMPersonality,
  type RelationshipEvent,
  type RelationshipTier,
  type TradeMemory,
} from '../src/index.js';

function makeRelationship(overrides: Partial<GMRelationship> = {}): GMRelationship {
  return {
    targetTeamId: 'bos',
    score: 0,
    tradeHistory: [],
    lastInteractionSeason: 0,
    ...overrides,
  };
}

function makeMemory(overrides: Partial<TradeMemory> = {}): TradeMemory {
  return {
    season: 3,
    surplusValue: 12,
    permanentMemory: false,
    description: 'The Martinez deal',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<RelationshipEvent> = {}): RelationshipEvent {
  return {
    type: 'trade_won',
    magnitude: -15,
    permanent: false,
    description: 'You won the trade',
    season: 4,
    ...overrides,
  };
}

describe('gmRelationships', () => {
  it('creates one neutral relationship for every non-user team', () => {
    const relationships = createRelationshipMap(
      TEAMS.map((team) => team.id),
      'nym',
    );

    expect(relationships.size).toBe(TEAMS.length - 1);
    expect(relationships.has('nym')).toBe(false);
  });

  it('starts every relationship at score zero with empty history', () => {
    const relationships = createRelationshipMap(
      TEAMS.map((team) => team.id),
      'nym',
    );

    for (const relationship of relationships.values()) {
      expect(relationship.score).toBe(0);
      expect(relationship.tradeHistory).toEqual([]);
      expect(relationship.lastInteractionSeason).toBe(0);
    }
  });

  it('returns existing relationship entries', () => {
    const relationship = makeRelationship({ targetTeamId: 'por', score: 18 });
    const relationships = new Map([['por', relationship]]);

    expect(getRelationship(relationships, 'por')).toEqual(relationship);
  });

  it('returns a neutral fallback for unknown teams', () => {
    const fallback = getRelationship(new Map(), 'sea');

    expect(fallback).toEqual({
      targetTeamId: 'sea',
      score: 0,
      tradeHistory: [],
      lastInteractionSeason: 0,
    });
  });

  it.each([
    ['trade_won', -15, -15],
    ['trade_lost', 10, 10],
    ['trade_fair', 2, 2],
    ['offer_rejected', -5, -5],
    ['playoff_loss', -8, -8],
    ['fa_poached', -12, -12],
    ['dfa_claimed', -10, -10],
    ['player_became_allstar', 20, 20],
  ] satisfies Array<[RelationshipEvent['type'], number, number]>)(
    'applies %s events by the provided magnitude',
    (type, magnitude, expectedScore) => {
      const updated = modifyRelationship(
        makeRelationship(),
        makeEvent({ type, magnitude }),
      );

      expect(updated.score).toBe(expectedScore);
      expect(updated.lastInteractionSeason).toBe(4);
    },
  );

  it('compounds multiple events in sequence', () => {
    const afterLoss = modifyRelationship(
      makeRelationship(),
      makeEvent({ type: 'playoff_loss', magnitude: -8 }),
    );
    const afterAllStar = modifyRelationship(
      afterLoss,
      makeEvent({
        type: 'player_became_allstar',
        magnitude: 20,
        description: 'Former trade piece became an All-Star',
        season: 5,
      }),
    );

    expect(afterAllStar.score).toBe(12);
    expect(afterAllStar.lastInteractionSeason).toBe(5);
  });

  it('clamps scores at the lower bound', () => {
    const updated = modifyRelationship(
      makeRelationship({ score: -95 }),
      makeEvent({ magnitude: -20 }),
    );

    expect(updated.score).toBe(-100);
  });

  it('clamps scores at the upper bound', () => {
    const updated = modifyRelationship(
      makeRelationship({ score: 95 }),
      makeEvent({ type: 'trade_lost', magnitude: 20 }),
    );

    expect(updated.score).toBe(100);
  });

  it('adds new trade memories to the front of the history', () => {
    const updated = addTradeMemory(
      makeRelationship(),
      makeMemory({ season: 6, description: 'The Vega swap' }),
    );

    expect(updated.tradeHistory[0]?.description).toBe('The Vega swap');
  });

  it('retains only the most recent ten trade memories', () => {
    let relationship = makeRelationship();
    for (let season = 1; season <= 12; season++) {
      relationship = addTradeMemory(
        relationship,
        makeMemory({
          season,
          description: `Deal ${season}`,
        }),
      );
    }

    expect(relationship.tradeHistory).toHaveLength(MAX_TRADE_HISTORY);
    expect(relationship.tradeHistory[0]?.description).toBe('Deal 12');
    expect(relationship.tradeHistory.at(-1)?.description).toBe('Deal 3');
  });

  it('preserves newest-first order after repeated inserts', () => {
    const first = addTradeMemory(makeRelationship(), makeMemory({ season: 2, description: 'Deal 2' }));
    const second = addTradeMemory(first, makeMemory({ season: 5, description: 'Deal 5' }));
    const third = addTradeMemory(second, makeMemory({ season: 4, description: 'Deal 4' }));

    expect(third.tradeHistory.map((memory) => memory.description)).toEqual([
      'Deal 4',
      'Deal 5',
      'Deal 2',
    ]);
  });

  it('does not change relationships when no offseason has elapsed', () => {
    const relationship = makeRelationship({ score: -50, lastInteractionSeason: 4 });
    const relationships = new Map([['bos', relationship]]);

    const decayed = decayRelationships(relationships, 4);

    expect(decayed.get('bos')).toEqual(relationship);
  });

  it('applies standard offseason decay to grudges', () => {
    const relationships = new Map([
      ['bos', makeRelationship({ score: -50, lastInteractionSeason: 3 })],
    ]);

    const decayed = decayRelationships(relationships, 4);

    expect(decayed.get('bos')?.score).toBeCloseTo(-50 * GRUDGE_DECAY_RATE, 2);
  });

  it('applies permanent-memory decay when the latest memory is permanent', () => {
    const relationship = addTradeMemory(
      makeRelationship({ score: -50, lastInteractionSeason: 3 }),
      makeMemory({ permanentMemory: true }),
    );
    const decayed = decayRelationships(new Map([['bos', relationship]]), 4);

    expect(decayed.get('bos')?.score).toBeCloseTo(-50 * PERMANENT_DECAY_RATE, 2);
  });

  it('compounds decay across multiple seasons', () => {
    const relationship = makeRelationship({ score: -50, lastInteractionSeason: 1 });
    const decayed = decayRelationships(new Map([['bos', relationship]]), 6);

    expect(decayed.get('bos')?.score).toBeCloseTo(-22.19, 2);
  });

  it('returns a new map rather than mutating the original', () => {
    const original = new Map([
      ['bos', makeRelationship({ score: -25, lastInteractionSeason: 2 })],
    ]);
    const decayed = decayRelationships(original, 3);

    expect(decayed).not.toBe(original);
    expect(original.get('bos')?.score).toBe(-25);
  });

  it.each([
    [-100, 'hostile'],
    [-75, 'hostile'],
    [-74, 'strained'],
    [-25, 'strained'],
    [-24, 'neutral'],
    [0, 'neutral'],
    [24, 'neutral'],
    [25, 'friendly'],
    [74, 'friendly'],
    [75, 'trusted'],
    [100, 'trusted'],
  ] satisfies Array<[number, RelationshipTier]>)(
    'maps score %i to the %s tier',
    (score, tier) => {
      expect(getRelationshipTier(score)).toBe(tier);
    },
  );

  it.each([
    ['conservative', -90, -25],
    ['conservative', -40, -10],
    ['conservative', 0, 0],
    ['conservative', 50, 5],
    ['conservative', 90, 10],
    ['analytical', -90, -12.5],
    ['prospect_hugger', -40, -5],
    ['aggressive', -40, -15],
    ['aggressive', -90, -25],
    ['win_now', 90, 15],
  ] satisfies Array<[GMPersonality, number, number]>)(
    'returns the expected trade adjustment for %s at score %i',
    (personality, score, expected) => {
      expect(
        getTradeValueAdjustment(
          makeRelationship({ score }),
          personality,
        ),
      ).toBe(expected);
    },
  );

  it('generates a neutral tooltip when no memory exists', () => {
    const tooltip = generateRelationshipTooltip(
      makeRelationship({ targetTeamId: 'bos', score: 0 }),
      'bos',
    );

    expect(tooltip).toContain('Boston');
    expect(tooltip).toContain('neutral');
  });

  it('generates a friendly tooltip when the score is positive without trade history', () => {
    const tooltip = generateRelationshipTooltip(
      makeRelationship({ targetTeamId: 'por', score: 40 }),
      'por',
    );

    expect(tooltip).toContain('Portland');
    expect(tooltip.toLowerCase()).toContain('friendly');
  });

  it('references the latest trade memory in the tooltip', () => {
    const relationship = addTradeMemory(
      makeRelationship({ targetTeamId: 'sea', score: -35 }),
      makeMemory({
        season: 3,
        description: 'They remember the Martinez deal',
      }),
    );

    const tooltip = generateRelationshipTooltip(relationship, 'sea');

    expect(tooltip).toContain('Seattle');
    expect(tooltip).toContain('Martinez deal');
    expect(tooltip).toContain('S3');
  });

  it('falls back to an uppercase team id in the tooltip for unknown clubs', () => {
    const tooltip = generateRelationshipTooltip(
      makeRelationship({ targetTeamId: 'xyz', score: -80 }),
      'xyz',
    );

    expect(tooltip).toContain('XYZ');
  });
});
