import { describe, expect, it } from 'vitest';
import type { PAOutcome, PAResult } from '../src/index.js';
import {
  GameRNG,
  generateEnhancedPlayByPlay,
} from '../src/index.js';

function makePAResult(overrides: Partial<PAResult> = {}): PAResult {
  return {
    outcome: 'SINGLE',
    batterId: 'batter-1',
    pitcherId: 'pitcher-1',
    inning: 1,
    halfInning: 'top',
    outs: 0,
    runnersOn: 0,
    scoreBefore: [0, 0],
    scoreAfter: [0, 0],
    rbiOnPlay: 0,
    isWalkOff: false,
    ...overrides,
  };
}

function makeContext(overrides: Partial<Parameters<typeof generateEnhancedPlayByPlay>[2]> = {}) {
  return {
    inning: 5,
    outs: 1,
    runnersOn: 1,
    scoreDifferential: 0,
    isHomeTeam: false,
    batterName: 'Mason Cruz',
    pitcherName: 'Cal Foster',
    gameImportance: 'regular' as const,
    ...overrides,
  };
}

describe('enhanced play-by-play', () => {
  it.each([
    'HR',
    'K',
    'SINGLE',
    'DOUBLE',
    'TRIPLE',
    'BB',
    'GB_OUT',
    'FB_OUT',
    'LD_OUT',
    'DOUBLE_PLAY',
    'HBP',
  ] satisfies PAOutcome[])('generates non-empty text for %s outcomes', (outcome) => {
    const entry = generateEnhancedPlayByPlay(
      new GameRNG(12),
      makePAResult({ outcome }),
      makeContext(),
    );

    expect(entry.text.length).toBeGreaterThan(0);
  });

  it('includes both player names in generated text', () => {
    const entry = generateEnhancedPlayByPlay(
      new GameRNG(21),
      makePAResult({ outcome: 'DOUBLE' }),
      makeContext({ batterName: 'Theo Warren', pitcherName: 'Noah Cole' }),
    );

    expect(entry.text).toContain('Theo Warren');
    expect(entry.text).toContain('Noah Cole');
  });

  it('assigns walk-off plays the maximum excitement rating', () => {
    const entry = generateEnhancedPlayByPlay(
      new GameRNG(7),
      makePAResult({
        outcome: 'HR',
        inning: 9,
        halfInning: 'bottom',
        isWalkOff: true,
        rbiOnPlay: 2,
        scoreBefore: [4, 5],
        scoreAfter: [4, 6],
      }),
      makeContext({
        inning: 9,
        scoreDifferential: -1,
        isHomeTeam: true,
      }),
    );

    expect(entry.excitement).toBe(5);
    expect(entry.isHighlight).toBe(true);
    expect(entry.situation).toBe('walk_off');
  });

  it('keeps home runs at excitement three or higher', () => {
    const entry = generateEnhancedPlayByPlay(
      new GameRNG(5),
      makePAResult({ outcome: 'HR', rbiOnPlay: 1 }),
      makeContext(),
    );

    expect(entry.excitement).toBeGreaterThanOrEqual(3);
  });

  it('keeps routine groundouts at excitement two or lower', () => {
    const entry = generateEnhancedPlayByPlay(
      new GameRNG(6),
      makePAResult({ outcome: 'GB_OUT', runnersOn: 0 }),
      makeContext({ runnersOn: 0, outs: 1, scoreDifferential: 3 }),
    );

    expect(entry.excitement).toBeLessThanOrEqual(2);
  });

  it('uses different text for playoff and regular-season contexts', () => {
    const pa = makePAResult({ outcome: 'SINGLE', rbiOnPlay: 1 });
    const regular = generateEnhancedPlayByPlay(new GameRNG(14), pa, makeContext({ gameImportance: 'regular' }));
    const playoff = generateEnhancedPlayByPlay(new GameRNG(14), pa, makeContext({ gameImportance: 'playoff' }));

    expect(playoff.text).not.toBe(regular.text);
  });

  it('uses different text for world series and playoff contexts', () => {
    const pa = makePAResult({ outcome: 'DOUBLE', rbiOnPlay: 2 });
    const playoff = generateEnhancedPlayByPlay(new GameRNG(18), pa, makeContext({ gameImportance: 'playoff' }));
    const worldSeries = generateEnhancedPlayByPlay(new GameRNG(18), pa, makeContext({ gameImportance: 'world_series' }));

    expect(worldSeries.text).not.toBe(playoff.text);
  });

  it('marks bases-loaded plays as highlights', () => {
    const entry = generateEnhancedPlayByPlay(
      new GameRNG(24),
      makePAResult({ outcome: 'BB', runnersOn: 3, rbiOnPlay: 1 }),
      makeContext({ runnersOn: 3 }),
    );

    expect(entry.isHighlight).toBe(true);
    expect(entry.situation).toBe('bases_loaded');
  });

  it('tags extra-inning plays correctly', () => {
    const entry = generateEnhancedPlayByPlay(
      new GameRNG(31),
      makePAResult({ outcome: 'SINGLE', inning: 11 }),
      makeContext({ inning: 11 }),
    );

    expect(entry.situation).toBe('extra_innings');
    expect(entry.isHighlight).toBe(true);
  });

  it('is deterministic for the same seed and context', () => {
    const pa = makePAResult({ outcome: 'DOUBLE_PLAY', outs: 1, runnersOn: 2 });
    const context = makeContext({ outs: 1, runnersOn: 2, scoreDifferential: 1 });

    const first = generateEnhancedPlayByPlay(new GameRNG(42), pa, context);
    const second = generateEnhancedPlayByPlay(new GameRNG(42), pa, context);

    expect(second).toEqual(first);
  });
});
