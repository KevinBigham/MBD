import { describe, expect, it } from 'vitest';
import {
  PLAYER_MICRO_ARC_BODY_VARIANTS,
  PLAYER_MICRO_ARC_HEADLINE_VARIANTS,
  pickStablePlayerMicroArcBody,
  pickStablePlayerMicroArcHeadline,
  type PlayerMicroArcTopicId,
} from '../src/narrative/playerMicroArcProse.js';

const context = {
  playerName: 'Mason Vale',
  injuryLabel: 'Hamstring Strain',
  returnOpsPlusOrEraPlus: 142,
  daysOnIl: 38,
  teamLabel: 'New York Tycoons',
  acquiringTeamLabel: 'Boston Noreasters',
  priorTeamLabel: 'New York Tycoons',
  postTradeOpsPlusOrEraPlus: 151,
  tradeDayLabel: 'July 30',
  callupDayLabel: 'September 1',
  callupOpsPlusOrEraPlus: 146,
  ageAtCallup: 22,
};

describe('playerMicroArcProse', () => {
  it('returns stable headline and body copy for the same player, season, and topic', () => {
    const first = {
      headline: pickStablePlayerMicroArcHeadline('injury_return_hero', context, 'player-1', 12),
      body: pickStablePlayerMicroArcBody('injury_return_hero', context, 'player-1', 12),
    };
    const second = {
      headline: pickStablePlayerMicroArcHeadline('injury_return_hero', context, 'player-1', 12),
      body: pickStablePlayerMicroArcBody('injury_return_hero', context, 'player-1', 12),
    };

    expect(first).toEqual(second);
  });

  it.each([
    'injury_return_hero',
    'trade_deadline_spark',
    'september_callup_hero',
  ] as const satisfies readonly PlayerMicroArcTopicId[])('provides three headline and body variants for %s', (topicId) => {
    expect(PLAYER_MICRO_ARC_HEADLINE_VARIANTS[topicId]).toHaveLength(3);
    expect(PLAYER_MICRO_ARC_BODY_VARIANTS[topicId]).toHaveLength(3);
  });
});
