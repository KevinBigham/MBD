import { describe, expect, it } from 'vitest';
import {
  POSITION_GROUP_BODY_VARIANTS,
  POSITION_GROUP_HEADLINE_VARIANTS,
  pickStablePositionGroupBody,
  pickStablePositionGroupHeadline,
  type PositionGroupTopicId,
} from '../src/narrative/positionGroupProse.js';

const context = {
  teamLabel: 'New York Voyagers',
  worstStarterEraPlus: 114,
  bestStarterEraPlus: 171,
  combinedInnings: 812,
  bullpenEraPlus: 74,
  bullpenInnings: 418,
  teamWrcPlus: 122,
  leagueRank: 2,
  leadingHitterName: 'Mason Vale',
};

describe('positionGroupProse', () => {
  it('returns the same headline and body for the same team, season, and topic', () => {
    const first = {
      headline: pickStablePositionGroupHeadline('dominant_rotation', context, 'nym', 12),
      body: pickStablePositionGroupBody('dominant_rotation', context, 'nym', 12),
    };
    const second = {
      headline: pickStablePositionGroupHeadline('dominant_rotation', context, 'nym', 12),
      body: pickStablePositionGroupBody('dominant_rotation', context, 'nym', 12),
    };

    expect(first).toEqual(second);
  });

  it.each([
    'dominant_rotation',
    'bullpen_collapse',
    'lineup_of_era',
  ] as const satisfies readonly PositionGroupTopicId[])('provides at least three headline and body variants for %s', (topicId) => {
    expect(POSITION_GROUP_HEADLINE_VARIANTS[topicId]).toHaveLength(3);
    expect(POSITION_GROUP_BODY_VARIANTS[topicId]).toHaveLength(3);
  });
});
