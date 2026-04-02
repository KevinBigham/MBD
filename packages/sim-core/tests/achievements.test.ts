import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_DEFINITIONS,
  checkAchievements,
  type AchievementMetricMap,
} from '../src/index.js';

function metrics(overrides: Partial<AchievementMetricMap> = {}): AchievementMetricMap {
  return {
    championships: 0,
    pennants: 0,
    bestTitleStreak: 0,
    bestTitlesInFive: 0,
    bestPlayoffStreak: 0,
    bestDivisionTitlesInFour: 0,
    underdogTitles: 0,
    wireToWireTitles: 0,
    maxWins: 0,
    rebuildMasterRuns: 0,
    firstCallups: 0,
    homegrownMvps: 0,
    homegrownCyYoungs: 0,
    homegrownRoys: 0,
    homegrownMlbers: 0,
    lowMinorsFiveWarPlayers: 0,
    pipelineTitles: 0,
    youthPlayoffSeasons: 0,
    homegrownThreeWarSeasons: 0,
    firstFreeAgentSignings: 0,
    cheapFreeAgentFiveWarSeasons: 0,
    cheapFreeAgentThreeWarSeasons: 0,
    bargainBinPlayoffSeasons: 0,
    moneyballSeasons: 0,
    tradeSharkDeals: 0,
    deadlineTradeWins: 0,
    positiveTrades: 0,
    firstExtensions: 0,
    recordBreaks: 0,
    tenWarSeasons: 0,
    ironManSeasons: 0,
    fiftyHomeRunSeasons: 0,
    awardSweepSeasons: 0,
    cyYoungAwards: 0,
    mvpAwards: 0,
    totalAwards: 0,
    seasonsManaged: 0,
    playoffAppearances: 0,
    hundredWinSeasons: 0,
    draftedHallOfFamers: 0,
    homegrownHallOfFamers: 0,
    dynastyScore: 0,
    ...overrides,
  };
}

describe('achievement engine', () => {
  it('defines a broad catalog that covers the major replayability categories', () => {
    expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ACHIEVEMENT_DEFINITIONS.map((achievement) => achievement.category))).toEqual(
      new Set(['dynasty', 'development', 'moneyball', 'records', 'longevity']),
    );
  });

  it('unlocks milestone achievements from deterministic metrics and skips ids already earned', () => {
    const result = checkAchievements({
      metrics: metrics({
        championships: 3,
        pennants: 1,
        bestTitleStreak: 2,
        bestTitlesInFive: 3,
      }),
      alreadyUnlockedIds: ['champion'],
    });

    expect(result.newlyUnlocked.map((achievement) => achievement.id)).toEqual([
      'pennant',
      'repeat',
      'dynasty',
    ]);
    expect(result.progress.find(([id]) => id === 'champion')?.[1]).toEqual({
      current: 3,
      target: 1,
      summary: 'World Series titles',
    });
  });

  it('tracks progress for incomplete long-horizon achievements without unlocking them', () => {
    const result = checkAchievements({
      metrics: metrics({
        seasonsManaged: 6,
        tradeSharkDeals: 2,
        homegrownMlbers: 4,
      }),
      alreadyUnlockedIds: [],
    });

    expect(result.newlyUnlocked).toEqual([]);
    expect(result.progress.find(([id]) => id === 'decade')?.[1]).toEqual({
      current: 6,
      target: 10,
      summary: 'Seasons managed',
    });
    expect(result.progress.find(([id]) => id === 'trade_shark')?.[1]).toEqual({
      current: 2,
      target: 3,
      summary: 'Lopsided trades won',
    });
    expect(result.progress.find(([id]) => id === 'prospect_pipeline')?.[1]).toEqual({
      current: 4,
      target: 5,
      summary: 'Homegrown MLB regulars',
    });
  });

  it('supports moneyball and legacy achievements from the same metric map', () => {
    const result = checkAchievements({
      metrics: metrics({
        moneyballSeasons: 1,
        cheapFreeAgentFiveWarSeasons: 1,
        bargainBinPlayoffSeasons: 1,
        draftedHallOfFamers: 1,
        dynastyScore: 420,
      }),
      alreadyUnlockedIds: [],
    });

    expect(result.newlyUnlocked.map((achievement) => achievement.id).sort()).toEqual([
      'bargain_bin',
      'hall_of_famer',
      'legacy_builder',
      'market_inefficiency',
      'moneyball',
    ]);
  });
});
