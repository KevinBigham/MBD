import { describe, expect, it } from 'vitest';
import {
  adjustFABidForRelationship,
  adjustDraftPickTradeValue,
  createGameRNG,
  generateRelationshipEffectNarrative,
  getRule5TargetingBonus,
  shouldPassOnWaiverClaim,
  type GMRelationship,
  type GMPersonality,
  type RelationshipEffect,
} from '../src/index.js';

function makeRelationship(score: number, teamId = 'por'): GMRelationship {
  return {
    targetTeamId: teamId,
    score,
    tradeHistory: [],
    lastInteractionSeason: 4,
  };
}

function makeEffect(overrides: Partial<RelationshipEffect> = {}): RelationshipEffect {
  return {
    type: 'fa_block',
    teamId: 'por',
    magnitude: 15,
    description: 'Sources say the GM made it personal.',
    ...overrides,
  };
}

describe('relationshipEffects', () => {
  it.each([
    ['conservative', -70, true, 115],
    ['aggressive', -70, true, 118],
    ['win_now', -70, true, 118],
    ['analytical', -70, true, 112.75],
    ['prospect_hugger', -70, true, 112.75],
    ['conservative', 70, true, 90],
    ['aggressive', 70, true, 88],
    ['analytical', 70, true, 91.5],
    ['conservative', 10, true, 100],
    ['conservative', -70, false, 100],
    ['conservative', 55, false, 100],
  ] satisfies Array<[GMPersonality, number, boolean, number]>)(
    'adjusts free-agent bids for %s at score %i when targeted=%s',
    (personality, score, isTargetedByUser, expected) => {
      expect(
        adjustFABidForRelationship(
          100,
          makeRelationship(score),
          personality,
          isTargetedByUser,
        ),
      ).toBe(expected);
    },
  );

  it('makes hostile aggressive clubs bid more than hostile analytical clubs', () => {
    const aggressive = adjustFABidForRelationship(100, makeRelationship(-60), 'aggressive', true);
    const analytical = adjustFABidForRelationship(100, makeRelationship(-60), 'analytical', true);

    expect(aggressive).toBeGreaterThan(analytical);
  });

  it('makes trusted clubs back off more than neutral clubs', () => {
    const trusted = adjustFABidForRelationship(100, makeRelationship(80), 'conservative', true);
    const neutral = adjustFABidForRelationship(100, makeRelationship(0), 'conservative', true);

    expect(trusted).toBeLessThan(neutral);
  });

  it.each([
    [41, false],
    [42, true],
    [43, false],
  ] as Array<[number, boolean]>)(
    'produces deterministic waiver decisions for seed %i',
    (seed, expected) => {
      expect(
        shouldPassOnWaiverClaim(
          createGameRNG(seed),
          makeRelationship(45),
          150,
          true,
        ),
      ).toBe(expected);
    },
  );

  it('never passes on high-value waiver claims', () => {
    expect(
      shouldPassOnWaiverClaim(
        createGameRNG(44),
        makeRelationship(70),
        240,
        true,
      ),
    ).toBe(false);
  });

  it('never passes when the user is not the claiming team', () => {
    expect(
      shouldPassOnWaiverClaim(
        createGameRNG(45),
        makeRelationship(70),
        120,
        false,
      ),
    ).toBe(false);
  });

  it('does not pass for neutral relationships on marginal talent', () => {
    expect(
      shouldPassOnWaiverClaim(
        createGameRNG(46),
        makeRelationship(20),
        120,
        true,
      ),
    ).toBe(false);
  });

  it.each([
    [-60, 130],
    [-40, 100],
    [0, 100],
    [40, 100],
    [60, 85],
  ] as Array<[number, number]>)(
    'adjusts draft pick trade value for relationship score %i',
    (score, expected) => {
      expect(adjustDraftPickTradeValue(100, makeRelationship(score), 'conservative')).toBe(expected);
    },
  );

  it('keeps draft pick premiums deterministic regardless of personality input', () => {
    const aggressive = adjustDraftPickTradeValue(100, makeRelationship(-60), 'aggressive');
    const analytical = adjustDraftPickTradeValue(100, makeRelationship(-60), 'analytical');

    expect(aggressive).toBe(analytical);
  });

  it.each([
    [-80, 0.05],
    [-41, 0.05],
    [-40, 0],
    [0, 0],
    [55, 0],
  ] as Array<[number, number]>)(
    'returns the correct Rule 5 targeting bonus at relationship score %i',
    (score, expected) => {
      expect(getRule5TargetingBonus(makeRelationship(score))).toBe(expected);
    },
  );

  it.each([
    ['fa_block', 'Portland'],
    ['waiver_pass', 'Portland'],
    ['draft_premium', 'Portland'],
    ['rule5_target', 'Portland'],
  ] as Array<[RelationshipEffect['type'], string]>)(
    'generates grounded narrative for %s effects',
    (type, expectedTeamText) => {
      const narrative = generateRelationshipEffectNarrative(
        createGameRNG(50),
        makeEffect({
          type,
          description: 'The room still talks about the Martinez deal.',
        }),
      );

      expect(narrative).toContain(expectedTeamText);
      expect(narrative).toContain('Martinez deal');
    },
  );

  it('keeps effect narratives deterministic for the same seed', () => {
    const effect = makeEffect({
      type: 'fa_block',
      description: 'The front office still remembers the offseason fight.',
    });

    const first = generateRelationshipEffectNarrative(createGameRNG(51), effect);
    const second = generateRelationshipEffectNarrative(createGameRNG(51), effect);

    expect(second).toBe(first);
  });

  it('falls back to uppercase team ids in narratives when a lookup fails', () => {
    const narrative = generateRelationshipEffectNarrative(
      createGameRNG(52),
      makeEffect({
        teamId: 'xyz',
        type: 'rule5_target',
      }),
    );

    expect(narrative).toContain('XYZ');
  });
});
