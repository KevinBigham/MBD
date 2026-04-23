import { describe, expect, it } from 'vitest';
import {
  PLAYER_ARC_BODY_VARIANTS,
  PLAYER_ARC_HEADLINE_VARIANTS,
  pickStablePlayerArcBody,
  pickStablePlayerArcHeadline,
  type PlayerArcTopicId,
} from '../src/narrative/playerArcProse.js';

const context = {
  playerName: 'Mason Vale',
  teamLabel: 'New York Voyagers',
  priorWar: 0.4,
  currentWar: 4.2,
  age: 37,
  careerWar: 45.3,
};

describe('playerArcProse', () => {
  it('returns the same headline and body for the same player, season, and topic', () => {
    const first = {
      headline: pickStablePlayerArcHeadline('redemption_arc', context, 'player-1', 12),
      body: pickStablePlayerArcBody('redemption_arc', context, 'player-1', 12),
    };
    const second = {
      headline: pickStablePlayerArcHeadline('redemption_arc', context, 'player-1', 12),
      body: pickStablePlayerArcBody('redemption_arc', context, 'player-1', 12),
    };

    expect(first).toEqual(second);
  });

  it.each([
    'redemption_arc',
    'late_career_peak',
    'rookie_breakout',
  ] as const satisfies readonly PlayerArcTopicId[])('provides at least three headline and body variants for %s', (topicId) => {
    expect(PLAYER_ARC_HEADLINE_VARIANTS[topicId]).toHaveLength(3);
    expect(PLAYER_ARC_BODY_VARIANTS[topicId]).toHaveLength(3);
  });
});
