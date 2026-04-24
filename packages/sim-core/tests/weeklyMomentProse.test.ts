import { describe, expect, it } from 'vitest';
import {
  WEEKLY_MOMENT_BODY_VARIANTS,
  WEEKLY_MOMENT_HEADLINE_VARIANTS,
  pickStableWeeklyMomentBody,
  pickStableWeeklyMomentHeadline,
  type WeeklyMomentTopicId,
} from '../src/narrative/weeklyMomentProse.js';

const context = {
  teamLabel: 'New York Tycoons',
  playerName: 'Mason Vale',
  wins: 6,
  losses: 1,
  runDifferential: 22,
  saves: 5,
  earnedRuns: 0,
  rbi: 7,
  homeRuns: 2,
  bullpenInnings: 27,
  consecutiveDays: 4,
};

describe('weeklyMomentProse', () => {
  it('returns stable headline and body variants for the same entity, season, week, and topic', () => {
    const first = {
      headline: pickStableWeeklyMomentHeadline('hot_streak_week', context, {
        teamId: 'nym',
        season: 7,
        weekStartDay: 43,
      }),
      body: pickStableWeeklyMomentBody('hot_streak_week', context, {
        teamId: 'nym',
        season: 7,
        weekStartDay: 43,
      }),
    };

    const second = {
      headline: pickStableWeeklyMomentHeadline('hot_streak_week', context, {
        teamId: 'nym',
        season: 7,
        weekStartDay: 43,
      }),
      body: pickStableWeeklyMomentBody('hot_streak_week', context, {
        teamId: 'nym',
        season: 7,
        weekStartDay: 43,
      }),
    };

    expect(first).toEqual(second);
  });

  it.each([
    'hot_streak_week',
    'cold_snap_week',
    'closer_lights_out',
    'closer_meltdown_week',
    'bench_clutch_week',
    'bullpen_overwork_warning',
  ] as const satisfies readonly WeeklyMomentTopicId[])('provides at least six headline and body variants for %s', (topicId) => {
    expect(WEEKLY_MOMENT_HEADLINE_VARIANTS[topicId].length).toBeGreaterThanOrEqual(6);
    expect(WEEKLY_MOMENT_BODY_VARIANTS[topicId].length).toBeGreaterThanOrEqual(6);
  });
});
