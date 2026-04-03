export type AchievementCategory =
  | 'dynasty'
  | 'development'
  | 'moneyball'
  | 'records'
  | 'longevity';

export interface AchievementMetricMap {
  championships: number;
  pennants: number;
  bestTitleStreak: number;
  bestTitlesInFive: number;
  bestPlayoffStreak: number;
  bestDivisionTitlesInFour: number;
  underdogTitles: number;
  wireToWireTitles: number;
  maxWins: number;
  rebuildMasterRuns: number;
  firstCallups: number;
  homegrownMvps: number;
  homegrownCyYoungs: number;
  homegrownRoys: number;
  homegrownMlbers: number;
  lowMinorsFiveWarPlayers: number;
  pipelineTitles: number;
  youthPlayoffSeasons: number;
  homegrownThreeWarSeasons: number;
  firstFreeAgentSignings: number;
  cheapFreeAgentFiveWarSeasons: number;
  cheapFreeAgentThreeWarSeasons: number;
  bargainBinPlayoffSeasons: number;
  moneyballSeasons: number;
  tradeSharkDeals: number;
  deadlineTradeWins: number;
  positiveTrades: number;
  firstExtensions: number;
  recordBreaks: number;
  tenWarSeasons: number;
  ironManSeasons: number;
  fiftyHomeRunSeasons: number;
  awardSweepSeasons: number;
  cyYoungAwards: number;
  mvpAwards: number;
  totalAwards: number;
  seasonsManaged: number;
  playoffAppearances: number;
  hundredWinSeasons: number;
  draftedHallOfFamers: number;
  homegrownHallOfFamers: number;
  dynastyScore: number;
}

export interface AchievementProgressValue {
  current: number;
  target: number;
  summary?: string;
}

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  metric: keyof AchievementMetricMap;
  target: number;
  progressLabel: string;
}

export interface AchievementUnlockResult extends AchievementDefinition {
  current: number;
}

export interface CheckAchievementsArgs {
  metrics: AchievementMetricMap;
  alreadyUnlockedIds: string[];
}

export interface CheckAchievementsResult {
  newlyUnlocked: AchievementUnlockResult[];
  progress: Array<[string, AchievementProgressValue]>;
}

function definition(
  id: string,
  category: AchievementCategory,
  name: string,
  description: string,
  metric: keyof AchievementMetricMap,
  target: number,
  progressLabel: string,
): AchievementDefinition {
  return {
    id,
    category,
    name,
    description,
    metric,
    target,
    progressLabel,
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  definition('champion', 'dynasty', 'Champion', 'Win the World Series.', 'championships', 1, 'World Series titles'),
  definition('pennant', 'dynasty', 'Pennant', 'Reach the World Series.', 'pennants', 1, 'Pennants won'),
  definition('repeat', 'dynasty', 'Repeat', 'Win back-to-back titles.', 'bestTitleStreak', 2, 'Best title streak'),
  definition('dynasty', 'dynasty', 'Dynasty', 'Win 3 titles in 5 seasons.', 'bestTitlesInFive', 3, 'Titles in a five-year run'),
  definition('october_machine', 'dynasty', 'October Machine', 'Reach the playoffs in 5 straight seasons.', 'bestPlayoffStreak', 5, 'Best playoff streak'),
  definition('division_boss', 'dynasty', 'Division Boss', 'Win 3 division titles in 4 seasons.', 'bestDivisionTitlesInFour', 3, 'Division titles in four seasons'),
  definition('underdog', 'dynasty', 'Underdog', 'Win a title with a bottom-5 payroll.', 'underdogTitles', 1, 'Underdog titles'),
  definition('wire_to_wire', 'dynasty', 'Wire to Wire', 'Lead every month and finish with the trophy.', 'wireToWireTitles', 1, 'Wire-to-wire titles'),

  definition('first_callup', 'development', 'The Show', 'Promote your first prospect to the majors.', 'firstCallups', 1, 'Prospect callups'),
  definition('homegrown_hero', 'development', 'Homegrown Hero', 'Develop a homegrown MVP.', 'homegrownMvps', 1, 'Homegrown MVP winners'),
  definition('ace_built_here', 'development', 'Ace Built Here', 'Develop a homegrown Cy Young winner.', 'homegrownCyYoungs', 1, 'Homegrown Cy Young winners'),
  definition('rookie_rocket', 'development', 'Rookie Rocket', 'Develop a homegrown Rookie of the Year winner.', 'homegrownRoys', 1, 'Homegrown ROY winners'),
  definition('prospect_pipeline', 'development', 'Prospect Pipeline', 'Graduate 5 homegrown players to MLB roles.', 'homegrownMlbers', 5, 'Homegrown MLB regulars'),
  definition('prospect_whisperer', 'development', 'Prospect Whisperer', 'Develop 3 low-minors prospects into 5-WAR players.', 'lowMinorsFiveWarPlayers', 3, 'Low-minors stars developed'),
  definition('pipeline', 'development', 'Pipeline', 'Win a title with a roster that is mostly homegrown.', 'pipelineTitles', 1, 'Pipeline championships'),
  definition('youth_movement', 'development', 'Youth Movement', 'Reach October with a young roster.', 'youthPlayoffSeasons', 1, 'Young playoff seasons'),
  definition('breakout_lab', 'development', 'Breakout Lab', 'Produce 3 homegrown 3-WAR seasons.', 'homegrownThreeWarSeasons', 3, 'Homegrown 3-WAR seasons'),

  definition('first_signing', 'moneyball', 'Open for Business', 'Sign your first free agent.', 'firstFreeAgentSignings', 1, 'Free agents signed'),
  definition('market_inefficiency', 'moneyball', 'Market Inefficiency', 'Find a 5-WAR free agent bargain.', 'cheapFreeAgentFiveWarSeasons', 1, 'Cheap 5-WAR signings'),
  definition('value_hunter', 'moneyball', 'Value Hunter', 'Find 3 value free-agent seasons.', 'cheapFreeAgentThreeWarSeasons', 3, 'Cheap 3-WAR signings'),
  definition('bargain_bin', 'moneyball', 'Bargain Bin', 'Make the playoffs spending under 60% of budget.', 'bargainBinPlayoffSeasons', 1, 'Budget playoff seasons'),
  definition('moneyball', 'moneyball', 'Moneyball', 'Win 95+ games with a bottom-3 payroll.', 'moneyballSeasons', 1, 'Moneyball seasons'),
  definition('trade_shark', 'moneyball', 'Trade Shark', 'Win 3 lopsided trades.', 'tradeSharkDeals', 3, 'Lopsided trades won'),
  definition('deadline_thief', 'moneyball', 'Deadline Thief', 'Win the deadline with a major in-season deal.', 'deadlineTradeWins', 1, 'Deadline wins'),
  definition('asset_manager', 'moneyball', 'Asset Manager', 'Stack 10 positive-value trades.', 'positiveTrades', 10, 'Positive-value trades'),
  definition('extension_artist', 'moneyball', 'Extension Artist', 'Lock in your first extension.', 'firstExtensions', 1, 'Extensions completed'),

  definition('record_breaker', 'records', 'Record Breaker', 'Set a new franchise benchmark.', 'recordBreaks', 1, 'Franchise records broken'),
  definition('historic_season', 'records', 'Historic Season', 'Produce a 10-WAR player season.', 'tenWarSeasons', 1, '10-WAR seasons'),
  definition('iron_man', 'records', 'Iron Man', 'Play all 162 and still post 6+ WAR.', 'ironManSeasons', 1, 'Iron Man seasons'),
  definition('slugger_supreme', 'records', 'Slugger Supreme', 'Launch 50 home runs in a season.', 'fiftyHomeRunSeasons', 1, '50-home-run seasons'),
  definition('award_sweep', 'records', 'Award Sweep', 'Own the MVP and Cy Young in the same season.', 'awardSweepSeasons', 1, 'Award-sweep seasons'),
  definition('cy_young_factory', 'records', 'Cy Young Factory', 'Win 3 Cy Young awards.', 'cyYoungAwards', 3, 'Cy Young awards'),
  definition('mvp_factory', 'records', 'MVP Factory', 'Win 3 MVP awards.', 'mvpAwards', 3, 'MVP awards'),
  definition('award_arsenal', 'records', 'Award Arsenal', 'Collect 5 major awards.', 'totalAwards', 5, 'Major awards won'),

  definition('centurion', 'longevity', 'Centurion', 'Win 100 games in a season.', 'maxWins', 100, 'Best win total'),
  definition('rebuild_master', 'longevity', 'Rebuild Master', 'Turn a 100-loss crater into a title in 3 years.', 'rebuildMasterRuns', 1, 'Successful rebuilds'),
  definition('decade', 'longevity', 'Decade', 'Stay with one club for 10 seasons.', 'seasonsManaged', 10, 'Seasons managed'),
  definition('playoff_regular', 'longevity', 'Playoff Regular', 'Make the playoffs 10 times.', 'playoffAppearances', 10, 'Playoff appearances'),
  definition('hundred_win_club', 'longevity', 'Hundred Win Club', 'Post three 100-win seasons.', 'hundredWinSeasons', 3, '100-win seasons'),
  definition('hall_of_famer', 'longevity', 'Hall of Famer', 'Draft a player who reaches Cooperstown.', 'draftedHallOfFamers', 1, 'Drafted Hall of Famers'),
  definition('homegrown_hall', 'longevity', 'Homegrown Hall', 'Put 2 homegrown players in the Hall.', 'homegrownHallOfFamers', 2, 'Homegrown Hall of Famers'),
  definition('legacy_builder', 'longevity', 'Legacy Builder', 'Push the dynasty score into elite territory.', 'dynastyScore', 400, 'Dynasty score'),
];

export function checkAchievements({
  metrics,
  alreadyUnlockedIds,
}: CheckAchievementsArgs): CheckAchievementsResult {
  const unlockedSet = new Set(alreadyUnlockedIds);
  const progress: Array<[string, AchievementProgressValue]> = [];
  const newlyUnlocked: AchievementUnlockResult[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    const current = metrics[achievement.metric];
    progress.push([
      achievement.id,
      {
        current,
        target: achievement.target,
        summary: achievement.progressLabel,
      },
    ]);

    if (current >= achievement.target && !unlockedSet.has(achievement.id)) {
      unlockedSet.add(achievement.id);
      newlyUnlocked.push({
        ...achievement,
        current,
      });
    }
  }

  return {
    newlyUnlocked,
    progress,
  };
}
