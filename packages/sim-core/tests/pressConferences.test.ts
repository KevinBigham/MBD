import { describe, expect, it } from 'vitest';
import type { Rivalry } from '@mbd/contracts';
import {
  GameRNG,
  evaluatePressConferenceResponse,
  generateEnhancedPressConference,
  selectPressConferenceTopic,
  type EnhancedPressConference,
  type PressConferenceTopicCategory,
  type PressConferenceTopicContext,
} from '../src/index.js';
import {
  getRivalryPressTopic,
  type RivalryPressTopicId,
} from '../src/narrative/pressConferences.js';

function makeContext(
  overrides: Partial<PressConferenceTopicContext> = {},
): PressConferenceTopicContext {
  return {
    season: 6,
    day: 40,
    teamId: 'kc',
    teamRecord: {
      wins: 20,
      losses: 20,
    },
    recentResults: ['W', 'L', 'W', 'L', 'W', 'L', 'W', 'L', 'W', 'L'],
    ownerTone: 'neutral',
    hasInjuredStar: false,
    hasRecentTrade: false,
    hasRecentCallup: false,
    isPlayoffContender: false,
    divisionRank: 3,
    gamesBack: 8,
    isOffseason: false,
    hasPlayerNearMilestone: false,
    hasRecentCoachingChange: false,
    isAllStarBreak: false,
    hasRecentControversy: false,
    isDivisionRivalrySeries: false,
    ...overrides,
  };
}

function contextForCategory(category: PressConferenceTopicCategory): PressConferenceTopicContext {
  switch (category) {
    case 'TRADE_DEADLINE':
      return makeContext({ day: 96, teamRecord: { wins: 48, losses: 42 }, gamesBack: 2 });
    case 'PROSPECT_CALLUP':
      return makeContext({ hasRecentCallup: true });
    case 'LOSING_STREAK':
      return makeContext({
        recentResults: ['L', 'L', 'L', 'L', 'L', 'W', 'L', 'W', 'L', 'W'],
        teamRecord: { wins: 18, losses: 29 },
        gamesBack: 11,
      });
    case 'WINNING_STREAK':
      return makeContext({
        recentResults: ['W', 'W', 'W', 'W', 'W', 'L', 'W', 'L', 'W', 'L'],
        teamRecord: { wins: 31, losses: 19 },
        gamesBack: 1,
      });
    case 'INJURY_UPDATE':
      return makeContext({ hasInjuredStar: true, teamRecord: { wins: 26, losses: 24 } });
    case 'RIVALRY_PREVIEW':
      return makeContext({ isDivisionRivalrySeries: true, divisionRank: 2, gamesBack: 3 });
    case 'PENNANT_RACE':
      return makeContext({
        day: 150,
        teamRecord: { wins: 86, losses: 64 },
        isPlayoffContender: true,
        divisionRank: 2,
        gamesBack: 3,
      });
    case 'OFFSEASON_PLANS':
      return makeContext({
        day: 5,
        isOffseason: true,
        teamRecord: { wins: 81, losses: 81 },
        gamesBack: 0,
      });
    case 'MILESTONE_CHASE':
      return makeContext({
        day: 145,
        hasPlayerNearMilestone: true,
        teamRecord: { wins: 79, losses: 66 },
        gamesBack: 4,
      });
    case 'COACHING_CHANGE':
      return makeContext({ hasRecentCoachingChange: true, ownerTone: 'impatient' });
    case 'ALL_STAR_BREAK':
      return makeContext({ day: 88, isAllStarBreak: true, teamRecord: { wins: 50, losses: 38 } });
    case 'CONTROVERSY':
      return makeContext({
        hasRecentControversy: true,
        ownerTone: 'impatient',
        teamRecord: { wins: 33, losses: 41 },
        gamesBack: 9,
      });
    default:
      return makeContext();
  }
}

const ALL_CATEGORIES: PressConferenceTopicCategory[] = [
  'TRADE_DEADLINE',
  'PROSPECT_CALLUP',
  'LOSING_STREAK',
  'WINNING_STREAK',
  'INJURY_UPDATE',
  'RIVALRY_PREVIEW',
  'PENNANT_RACE',
  'OFFSEASON_PLANS',
  'MILESTONE_CHASE',
  'COACHING_CHANGE',
  'ALL_STAR_BREAK',
  'CONTROVERSY',
];

function heatedRivalry(): Rivalry {
  return {
    id: 'bos:nym',
    teamA: 'nym',
    teamB: 'bos',
    intensity: 84,
    summary: 'The race keeps forcing both clubs into the same spotlight.',
    reasons: ['Standings pressure', 'October carryover'],
    origin: 'historical',
    active: true,
    currentSeasonWinsA: 6,
    currentSeasonWinsB: 5,
    closeRaceStreak: 2,
    playoffSeriesStreak: 2,
    eventHistory: [
      { season: 6, type: 'playoff', summary: 'October put the feud back on the front page.' },
      { season: 7, type: 'division_race', summary: 'The division stayed live into September again.' },
    ],
  };
}

describe('enhanced press conferences', () => {
  it.each(ALL_CATEGORIES.map((category) => [category]))('selects %s when its trigger context is present', (category) => {
    const topic = selectPressConferenceTopic(new GameRNG(17), contextForCategory(category));
    expect(topic?.category).toBe(category);
  });

  it('returns null when no topic matches the current context', () => {
    const topic = selectPressConferenceTopic(new GameRNG(4), makeContext());
    expect(topic).toBeNull();
  });

  it('is deterministic for the same seed and context', () => {
    const context = contextForCategory('TRADE_DEADLINE');
    const first = generateEnhancedPressConference(new GameRNG(91), context);
    const second = generateEnhancedPressConference(new GameRNG(91), context);

    expect(second).toEqual(first);
  });

  it('includes all four response tones for every topic', () => {
    for (const category of ALL_CATEGORIES) {
      const conference = generateEnhancedPressConference(new GameRNG(23), contextForCategory(category));
      expect(conference?.responses.map((response) => response.tone)).toEqual([
        'confident',
        'measured',
        'deflect',
        'aggressive',
      ]);
    }
  });

  it('keeps all response deltas within the documented bounds', () => {
    for (const category of ALL_CATEGORIES) {
      const conference = generateEnhancedPressConference(new GameRNG(34), contextForCategory(category));
      expect(conference).not.toBeNull();
      for (const response of (conference as EnhancedPressConference).responses) {
        expect(response.moraleDelta).toBeGreaterThanOrEqual(-5);
        expect(response.moraleDelta).toBeLessThanOrEqual(5);
        expect(response.ownerDelta).toBeGreaterThanOrEqual(-5);
        expect(response.ownerDelta).toBeLessThanOrEqual(5);
        expect(response.fanSentimentDelta).toBeGreaterThanOrEqual(-3);
        expect(response.fanSentimentDelta).toBeLessThanOrEqual(3);
      }
    }
  });

  it('resolves follow-up chains from the response identifier alone', () => {
    const conference = generateEnhancedPressConference(new GameRNG(51), contextForCategory('TRADE_DEADLINE'));
    const aggressiveResponse = conference?.responses.find((response) => response.tone === 'aggressive');
    expect(conference).not.toBeNull();
    expect(aggressiveResponse?.followUpTopicId).toBeTruthy();

    const outcome = evaluatePressConferenceResponse(conference!.id, aggressiveResponse!.id);

    expect(outcome.followUpTopicId).toBe(aggressiveResponse?.followUpTopicId);
    expect(outcome.followUpTopic?.category).toBe('CONTROVERSY');
  });

  it('returns the static outcome deltas for a chosen response', () => {
    const conference = generateEnhancedPressConference(new GameRNG(73), contextForCategory('PROSPECT_CALLUP'));
    const measuredResponse = conference?.responses.find((response) => response.tone === 'measured');
    expect(conference).not.toBeNull();
    expect(measuredResponse).toBeTruthy();

    const outcome = evaluatePressConferenceResponse(conference!.id, measuredResponse!.id);

    expect(outcome.moraleDelta).toBe(measuredResponse?.moraleDelta);
    expect(outcome.ownerDelta).toBe(measuredResponse?.ownerDelta);
    expect(outcome.fanSentimentDelta).toBe(measuredResponse?.fanSentimentDelta);
  });

  it.each([
    'rival_trade_aftermath',
    'rival_playoff_meeting',
    'rival_clinch_against',
  ] satisfies RivalryPressTopicId[])('builds deterministic rivalry press copy for %s', (topicId) => {
    const first = getRivalryPressTopic({
      rivalry: heatedRivalry(),
      season: 7,
      day: 154,
      teamId: 'nym',
      opponentTeamId: 'bos',
      topicId,
    });
    const second = getRivalryPressTopic({
      rivalry: heatedRivalry(),
      season: 7,
      day: 154,
      teamId: 'nym',
      opponentTeamId: 'bos',
      topicId,
    });

    expect(first).not.toBeNull();
    expect(second).toEqual(first);
  });

  it('keeps rivalry press topics independent across topic ids', () => {
    const trade = getRivalryPressTopic({
      rivalry: heatedRivalry(),
      season: 7,
      day: 154,
      teamId: 'nym',
      opponentTeamId: 'bos',
      topicId: 'rival_trade_aftermath',
    });
    const playoff = getRivalryPressTopic({
      rivalry: heatedRivalry(),
      season: 7,
      day: 154,
      teamId: 'nym',
      opponentTeamId: 'bos',
      topicId: 'rival_playoff_meeting',
    });

    expect(trade).not.toBeNull();
    expect(playoff).not.toBeNull();
    expect(trade?.headline).not.toBe(playoff?.headline);
    expect(trade?.body).not.toBe(playoff?.body);
  });

  it('falls back when the rivalry score is not hot enough for the press room', () => {
    expect(getRivalryPressTopic({
      rivalry: {
        ...heatedRivalry(),
        intensity: 28,
        currentSeasonWinsA: 1,
        currentSeasonWinsB: 0,
        closeRaceStreak: 0,
        playoffSeriesStreak: 0,
        eventHistory: [],
      },
      season: 7,
      day: 154,
      teamId: 'nym',
      opponentTeamId: 'bos',
      topicId: 'rival_trade_aftermath',
    })).toBeNull();
  });
});
