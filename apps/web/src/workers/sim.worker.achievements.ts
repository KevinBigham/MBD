import type { AchievementProgress, AchievementUnlock, CeremonyMoment } from '@mbd/contracts';
import {
  ACHIEVEMENT_DEFINITIONS,
  TEAMS,
  checkAchievements,
  getTeamById,
  isTradeDeadlineModeDay,
  type AchievementDefinition,
  type AchievementMetricMap,
  type AchievementUnlockResult,
} from '@mbd/sim-core';
import { buildAdvancedStatsIndex } from './sim.worker.stats.js';
import { queueCeremonyMoment } from './sim.worker.ceremony.js';
import type { FullGameState } from './sim.worker.helpers.js';
import { getDifficultyAdjustedBudget } from './sim.worker.budget.js';
import { calculateStateTeamPayroll } from './sim.worker.tradeFinance.js';

export interface AchievementView extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt: string | null;
  unlockSummary: string | null;
  progress: AchievementProgress;
}

const HOMEGROWN_LEDGER = 'homegrownPlayerIds';
const DRAFTED_LEDGER = 'draftedPlayerIds';
const LOW_MINORS_LEDGER = 'lowMinorsHomegrownPlayerIds';
const HOMEGROWN_MLB_LEDGER = 'homegrownMlbPlayerIds';
const CHEAP_FA_LEDGER = 'cheapFreeAgentPlayerIds';
const COUNTED_LOW_MINORS_FIVE_WAR_LEDGER = 'countedLowMinorsFiveWarPlayerIds';
const COUNTED_CHEAP_FA_FIVE_WAR_LEDGER = 'countedCheapFreeAgentFiveWarPlayerIds';
const COUNTED_CHEAP_FA_THREE_WAR_LEDGER = 'countedCheapFreeAgentThreeWarPlayerIds';

function currentTimestamp(state: FullGameState): string {
  return `S${state.season}D${state.day}`;
}

function counterKey(name: string, season?: number): string {
  return season == null ? `lifetime:${name}` : `season:${season}:${name}`;
}

function readCounter(state: FullGameState, key: string): number {
  return state.achievements.counters.find(([entryKey]) => entryKey === key)?.[1] ?? 0;
}

function writeCounter(state: FullGameState, key: string, value: number) {
  const next = state.achievements.counters.filter(([entryKey]) => entryKey !== key);
  next.push([key, value]);
  state.achievements.counters = next;
}

function incrementCounter(state: FullGameState, key: string, amount: number = 1) {
  writeCounter(state, key, readCounter(state, key) + amount);
}

function readLedger(state: FullGameState, key: string): string[] {
  return state.achievements.ledgers.find(([entryKey]) => entryKey === key)?.[1] ?? [];
}

function writeLedger(state: FullGameState, key: string, values: string[]) {
  const deduped = Array.from(new Set(values.filter((value) => value.length > 0)));
  const next = state.achievements.ledgers.filter(([entryKey]) => entryKey !== key);
  next.push([key, deduped]);
  state.achievements.ledgers = next;
}

function addLedgerValue(state: FullGameState, key: string, value: string) {
  if (!value) {
    return;
  }
  writeLedger(state, key, [...readLedger(state, key), value]);
}

function hasLedgerValue(state: FullGameState, key: string, value: string): boolean {
  return readLedger(state, key).includes(value);
}

function recordPositiveTradeCounters(state: FullGameState) {
  const { positiveTrades, tradeSharkDeals, deadlineTradeWins } = deriveTradeMetrics(state);
  writeCounter(state, counterKey('positiveTrades'), positiveTrades);
  writeCounter(state, counterKey('tradeSharkDeals'), tradeSharkDeals);
  writeCounter(state, counterKey('deadlineTradeWins'), deadlineTradeWins);
}

function deriveTradeMetrics(state: FullGameState): {
  positiveTrades: number;
  tradeSharkDeals: number;
  deadlineTradeWins: number;
} {
  const positiveTrades = state.tradeState.tradeHistory.filter((trade) => {
    if (trade.fromTeamId === state.userTeamId) {
      return trade.fairnessScore > 0;
    }
    if (trade.toTeamId === state.userTeamId) {
      return trade.fairnessScore < 0;
    }
    return false;
  });
  const tradeSharkDeals = positiveTrades.filter((trade) => Math.abs(trade.fairnessScore) >= 5).length;
  const deadlineTradeWins = positiveTrades.filter((trade) => {
    const match = /^S\d+D(\d+)$/.exec(trade.timestamp);
    return match ? isTradeDeadlineModeDay(Number(match[1])) && Math.abs(trade.fairnessScore) >= 5 : false;
  }).length;

  return {
    positiveTrades: positiveTrades.length,
    tradeSharkDeals,
    deadlineTradeWins,
  };
}

function bestStreak(entries: boolean[]): number {
  let best = 0;
  let current = 0;
  for (const entry of entries) {
    if (entry) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function bestWindowCount(entries: boolean[], width: number): number {
  if (entries.length === 0) {
    return 0;
  }

  let best = 0;
  for (let start = 0; start < entries.length; start += 1) {
    const window = entries.slice(start, start + width);
    const total = window.filter(Boolean).length;
    best = Math.max(best, total);
  }
  return best;
}

function publishAchievementUnlock(state: FullGameState, achievement: AchievementUnlockResult) {
  const unlockId = `achievement-${achievement.id}`;
  const headline = `Achievement unlocked: ${achievement.name}`;
  const body = `${achievement.description} Progress: ${achievement.current}/${achievement.target}.`;

  queueCeremonyMoment(state, {
    id: unlockId,
    type: 'achievement',
    title: 'ACHIEVEMENT UNLOCKED',
    subtitle: achievement.name,
    detailLines: [achievement.description, `${achievement.current}/${achievement.target} ${achievement.progressLabel.toLowerCase()}`],
    soundEffect: 'achievement_unlock',
    autoDismissMs: 5000,
    createdAt: currentTimestamp(state),
    theme: 'historic',
    relatedTeamIds: [state.userTeamId],
    relatedPlayerIds: [],
  } satisfies CeremonyMoment);

  const newsId = `news-${unlockId}`;
  if (!state.news.some((entry) => entry.id === newsId)) {
    state.news.unshift({
      id: newsId,
      headline,
      body,
      priority: 1,
      category: 'award',
      tag: 'BREAKING',
      timestamp: currentTimestamp(state),
      relatedPlayerIds: [],
      relatedTeamIds: [state.userTeamId],
      read: false,
    });
  }

  const briefingId = `brief-${unlockId}`;
  if (!state.briefingQueue.some((entry) => entry.id === briefingId)) {
    state.briefingQueue.unshift({
      id: briefingId,
      priority: 1,
      category: 'award',
      headline,
      body,
      relatedPlayerIds: [],
      relatedTeamIds: [state.userTeamId],
      timestamp: currentTimestamp(state),
      acknowledged: false,
    });
  }
}

function titleForMetricLabel(metricLabel: string): string {
  return metricLabel;
}

export function recordDraftedHomegrownPlayer(state: FullGameState, playerId: string, originLevel: string) {
  addLedgerValue(state, HOMEGROWN_LEDGER, playerId);
  addLedgerValue(state, DRAFTED_LEDGER, playerId);
  if (['A', 'A_PLUS', 'ROOKIE', 'INTERNATIONAL'].includes(originLevel)) {
    addLedgerValue(state, LOW_MINORS_LEDGER, playerId);
  }
}

export function recordInternationalHomegrownPlayer(state: FullGameState, playerId: string, originLevel: string) {
  addLedgerValue(state, HOMEGROWN_LEDGER, playerId);
  if (['A', 'A_PLUS', 'ROOKIE', 'INTERNATIONAL'].includes(originLevel)) {
    addLedgerValue(state, LOW_MINORS_LEDGER, playerId);
  }
}

export function recordProspectCallup(state: FullGameState, playerId: string) {
  incrementCounter(state, counterKey('firstCallups'));
  if (hasLedgerValue(state, HOMEGROWN_LEDGER, playerId)) {
    addLedgerValue(state, HOMEGROWN_MLB_LEDGER, playerId);
  }
}

export function recordFreeAgentSigning(state: FullGameState, playerId: string, annualSalary: number) {
  incrementCounter(state, counterKey('firstFreeAgentSignings'));
  if (annualSalary <= 10) {
    addLedgerValue(state, CHEAP_FA_LEDGER, playerId);
  }
}

export function recordExtensionCompleted(state: FullGameState) {
  incrementCounter(state, counterKey('firstExtensions'));
}

export function recordMonthlyDivisionLead(state: FullGameState) {
  const userDivision = getTeamById(state.userTeamId)?.division;
  if (!userDivision) {
    return;
  }
  const standings = state.seasonState.standings.getFullStandings()[userDivision] ?? [];
  if (standings[0]?.teamId === state.userTeamId) {
    incrementCounter(state, counterKey('divisionLeadMonths', state.season));
  }
}

function captureSeasonRecordBreaks(state: FullGameState) {
  const advancedIndex = buildAdvancedStatsIndex(state);
  const userPlayers = state.players.filter((player) => player.teamId === state.userTeamId && player.rosterStatus === 'MLB');
  const wins = state.seasonState.standings.getRecord(state.userTeamId)?.wins ?? 0;
  const maxWar = Math.max(0, ...userPlayers.map((player) => advancedIndex.get(player.id)?.war ?? 0));
  const maxHr = Math.max(0, ...userPlayers.map((player) => state.seasonState.playerSeasonStats.get(player.id)?.hr ?? 0));
  const maxHits = Math.max(0, ...userPlayers.map((player) => state.seasonState.playerSeasonStats.get(player.id)?.hits ?? 0));
  const maxPitcherWins = Math.max(
    0,
    ...userPlayers
      .filter((player) => player.pitcherAttributes != null)
      .map((player) => state.seasonState.playerSeasonStats.get(player.id)?.wins ?? 0),
  );
  const maxStrikeouts = Math.max(
    0,
    ...userPlayers
      .filter((player) => player.pitcherAttributes != null)
      .map((player) => state.seasonState.playerSeasonStats.get(player.id)?.strikeouts ?? 0),
  );

  const candidates: Array<[string, number]> = [
    ['wins', wins],
    ['war', maxWar],
    ['hr', maxHr],
    ['hits', maxHits],
    ['pitcherWins', maxPitcherWins],
    ['strikeouts', maxStrikeouts],
  ];

  let recordBreaks = readCounter(state, counterKey('recordBreaks'));
  for (const [label, value] of candidates) {
    const previous = readCounter(state, `record:max:${label}`);
    if (value > previous) {
      recordBreaks += 1;
      writeCounter(state, `record:max:${label}`, value);
    }
  }
  writeCounter(state, counterKey('recordBreaks'), recordBreaks);
}

export function captureSeasonAchievementFacts(state: FullGameState) {
  const advancedIndex = buildAdvancedStatsIndex(state);
  const userPlayers = state.players.filter((player) => player.teamId === state.userTeamId && player.rosterStatus === 'MLB');
  const homegrownIds = new Set(readLedger(state, HOMEGROWN_LEDGER));
  const lowMinorsIds = new Set(readLedger(state, LOW_MINORS_LEDGER));
  const cheapFaIds = new Set(readLedger(state, CHEAP_FA_LEDGER));
  const countedLowMinors = new Set(readLedger(state, COUNTED_LOW_MINORS_FIVE_WAR_LEDGER));
  const countedCheapFive = new Set(readLedger(state, COUNTED_CHEAP_FA_FIVE_WAR_LEDGER));
  const countedCheapThree = new Set(readLedger(state, COUNTED_CHEAP_FA_THREE_WAR_LEDGER));

  const payrolls = TEAMS.map((team) => ({
    teamId: team.id,
    payroll: calculateStateTeamPayroll(state, team.id).totalPayroll,
  })).sort((left, right) => right.payroll - left.payroll);
  const payrollRank = Math.max(1, payrolls.findIndex((entry) => entry.teamId === state.userTeamId) + 1);
  writeCounter(state, counterKey('payrollRank', state.season), payrollRank);

  const userPayroll = payrolls.find((entry) => entry.teamId === state.userTeamId)?.payroll ?? 0;
  const budget = getDifficultyAdjustedBudget(state, state.userTeamId);
  writeCounter(state, counterKey('budgetRatio', state.season), budget > 0 ? userPayroll / budget : 0);

  const homegrownMlbCount = userPlayers.filter((player) => homegrownIds.has(player.id)).length;
  writeCounter(state, counterKey('homegrownRatio', state.season), userPlayers.length > 0 ? homegrownMlbCount / userPlayers.length : 0);
  writeCounter(
    state,
    counterKey('avgAge', state.season),
    userPlayers.length > 0 ? userPlayers.reduce((sum, player) => sum + player.age, 0) / userPlayers.length : 0,
  );

  let newThreeWarCount = 0;
  for (const player of userPlayers) {
    const advanced = advancedIndex.get(player.id);
    const stats = state.seasonState.playerSeasonStats.get(player.id);
    if (!advanced || !stats) {
      continue;
    }

    if (homegrownIds.has(player.id) && advanced.war >= 3) {
      newThreeWarCount += 1;
    }

    if (lowMinorsIds.has(player.id) && advanced.war >= 5 && !countedLowMinors.has(player.id)) {
      countedLowMinors.add(player.id);
    }

    if (cheapFaIds.has(player.id) && advanced.war >= 5 && !countedCheapFive.has(player.id)) {
      countedCheapFive.add(player.id);
    }

    if (cheapFaIds.has(player.id) && advanced.war >= 3 && !countedCheapThree.has(player.id)) {
      countedCheapThree.add(player.id);
    }
  }

  writeCounter(state, counterKey('homegrownThreeWarSeasons'), newThreeWarCount);
  writeLedger(state, COUNTED_LOW_MINORS_FIVE_WAR_LEDGER, [...countedLowMinors]);
  writeLedger(state, COUNTED_CHEAP_FA_FIVE_WAR_LEDGER, [...countedCheapFive]);
  writeLedger(state, COUNTED_CHEAP_FA_THREE_WAR_LEDGER, [...countedCheapThree]);

  const tenWarCount = userPlayers.filter((player) => (advancedIndex.get(player.id)?.war ?? 0) >= 10).length;
  writeCounter(state, counterKey('tenWarSeasons'), tenWarCount);

  const ironManCount = userPlayers.filter((player) => {
    const stats = state.seasonState.playerSeasonStats.get(player.id);
    return player.pitcherAttributes == null
      && (stats?.pa ?? 0) >= 650
      && (advancedIndex.get(player.id)?.war ?? 0) >= 6;
  }).length;
  writeCounter(state, counterKey('ironManSeasons'), ironManCount);

  const fiftyHrCount = userPlayers.filter((player) => (state.seasonState.playerSeasonStats.get(player.id)?.hr ?? 0) >= 50).length;
  writeCounter(state, counterKey('fiftyHomeRunSeasons'), fiftyHrCount);

  const userAwards = state.awardHistory.filter((entry) => entry.season === state.season && entry.teamId === state.userTeamId);
  writeCounter(state, counterKey('awardSweepSeasons'), userAwards.some((entry) => entry.award === 'MVP') && userAwards.some((entry) => entry.award === 'CY_YOUNG') ? 1 : 0);

  captureSeasonRecordBreaks(state);
  recordPositiveTradeCounters(state);
}

export function buildAchievementMetrics(state: FullGameState): AchievementMetricMap {
  const timeline = [...state.franchiseTimeline].sort((left, right) => left.season - right.season);
  const championships = timeline.filter((entry) => entry.championship).length;
  const pennants = timeline.filter((entry) => entry.worldSeriesAppearance).length;
  const playoffAppearances = timeline.filter((entry) => entry.playoffAppearance).length;
  const hundredWinSeasons = timeline.filter((entry) => entry.winTotal >= 100).length;
  const maxWins = Math.max(0, ...timeline.map((entry) => entry.winTotal));
  const titleFlags = timeline.map((entry) => entry.championship);
  const playoffFlags = timeline.map((entry) => entry.playoffAppearance);
  const divisionFlags = timeline.map((entry) => entry.divisionTitle);
  const homegrownIds = new Set(readLedger(state, HOMEGROWN_LEDGER));
  const draftedIds = new Set(readLedger(state, DRAFTED_LEDGER));

  const bottomFiveThreshold = Math.max(1, TEAMS.length - 4);
  const bottomThreeThreshold = Math.max(1, TEAMS.length - 2);
  const underdogTitles = timeline.filter((entry) =>
    entry.championship && readCounter(state, counterKey('payrollRank', entry.season)) >= bottomFiveThreshold,
  ).length;
  const wireToWireTitles = timeline.filter((entry) =>
    entry.championship && readCounter(state, counterKey('divisionLeadMonths', entry.season)) >= 6,
  ).length;
  const pipelineTitles = timeline.filter((entry) =>
    entry.championship && readCounter(state, counterKey('homegrownRatio', entry.season)) >= 0.5,
  ).length;
  const youthPlayoffSeasons = timeline.filter((entry) =>
    entry.playoffAppearance && readCounter(state, counterKey('avgAge', entry.season)) > 0 && readCounter(state, counterKey('avgAge', entry.season)) <= 26.5,
  ).length;
  const bargainBinPlayoffSeasons = timeline.filter((entry) =>
    entry.playoffAppearance && readCounter(state, counterKey('budgetRatio', entry.season)) > 0 && readCounter(state, counterKey('budgetRatio', entry.season)) < 0.6,
  ).length;
  const moneyballSeasons = timeline.filter((entry) =>
    entry.winTotal >= 95 && readCounter(state, counterKey('payrollRank', entry.season)) >= bottomThreeThreshold,
  ).length;

  let rebuildMasterRuns = 0;
  for (let index = 0; index < timeline.length; index += 1) {
    const entry = timeline[index]!;
    if (entry.winTotal > 62) {
      continue;
    }
    const futureWindow = timeline.slice(index + 1, index + 4);
    if (futureWindow.some((candidate) => candidate.championship)) {
      rebuildMasterRuns += 1;
    }
  }

  const cyYoungAwards = state.awardHistory.filter((entry) => entry.teamId === state.userTeamId && entry.award === 'CY_YOUNG').length;
  const mvpAwards = state.awardHistory.filter((entry) => entry.teamId === state.userTeamId && entry.award === 'MVP').length;
  const totalAwards = state.awardHistory.filter((entry) => entry.teamId === state.userTeamId).length;

  const homegrownMvps = state.awardHistory.filter((entry) => entry.award === 'MVP' && homegrownIds.has(entry.playerId)).length;
  const homegrownCyYoungs = state.awardHistory.filter((entry) => entry.award === 'CY_YOUNG' && homegrownIds.has(entry.playerId)).length;
  const homegrownRoys = state.awardHistory.filter((entry) => entry.award === 'ROY' && homegrownIds.has(entry.playerId)).length;

  const draftedHallOfFamers = state.hallOfFame.filter((entry) => draftedIds.has(entry.playerId)).length;
  const homegrownHallOfFamers = state.hallOfFame.filter((entry) => homegrownIds.has(entry.playerId)).length;
  const tradeMetrics = deriveTradeMetrics(state);

  return {
    championships,
    pennants,
    bestTitleStreak: bestStreak(titleFlags),
    bestTitlesInFive: bestWindowCount(titleFlags, 5),
    bestPlayoffStreak: bestStreak(playoffFlags),
    bestDivisionTitlesInFour: bestWindowCount(divisionFlags, 4),
    underdogTitles,
    wireToWireTitles,
    maxWins,
    rebuildMasterRuns,
    firstCallups: readCounter(state, counterKey('firstCallups')),
    homegrownMvps,
    homegrownCyYoungs,
    homegrownRoys,
    homegrownMlbers: readLedger(state, HOMEGROWN_MLB_LEDGER).length,
    lowMinorsFiveWarPlayers: readLedger(state, COUNTED_LOW_MINORS_FIVE_WAR_LEDGER).length,
    pipelineTitles,
    youthPlayoffSeasons,
    homegrownThreeWarSeasons: readCounter(state, counterKey('homegrownThreeWarSeasons')),
    firstFreeAgentSignings: readCounter(state, counterKey('firstFreeAgentSignings')),
    cheapFreeAgentFiveWarSeasons: readLedger(state, COUNTED_CHEAP_FA_FIVE_WAR_LEDGER).length,
    cheapFreeAgentThreeWarSeasons: readLedger(state, COUNTED_CHEAP_FA_THREE_WAR_LEDGER).length,
    bargainBinPlayoffSeasons,
    moneyballSeasons,
    tradeSharkDeals: tradeMetrics.tradeSharkDeals,
    deadlineTradeWins: tradeMetrics.deadlineTradeWins,
    positiveTrades: tradeMetrics.positiveTrades,
    firstExtensions: readCounter(state, counterKey('firstExtensions')),
    recordBreaks: readCounter(state, counterKey('recordBreaks')),
    tenWarSeasons: readCounter(state, counterKey('tenWarSeasons')),
    ironManSeasons: readCounter(state, counterKey('ironManSeasons')),
    fiftyHomeRunSeasons: readCounter(state, counterKey('fiftyHomeRunSeasons')),
    awardSweepSeasons: timeline.reduce((count, entry) => count + (readCounter(state, counterKey('awardSweepSeasons', entry.season)) >= 1 ? 1 : 0), 0),
    cyYoungAwards,
    mvpAwards,
    totalAwards,
    seasonsManaged: timeline.length,
    playoffAppearances,
    hundredWinSeasons,
    draftedHallOfFamers,
    homegrownHallOfFamers,
    dynastyScore: timeline.at(-1)?.dynastyScore ?? 0,
  };
}

export function syncAchievementState(
  state: FullGameState,
  options: { publish?: boolean } = {},
): AchievementUnlock[] {
  const publish = options.publish ?? true;
  const result = checkAchievements({
    metrics: buildAchievementMetrics(state),
    alreadyUnlockedIds: state.achievements.unlocked.map((achievement) => achievement.id),
  });

  state.achievements.progress = result.progress;

  const unlocked: AchievementUnlock[] = [];
  for (const achievement of result.newlyUnlocked) {
    const unlockRecord: AchievementUnlock = {
      id: achievement.id,
      unlockedAt: currentTimestamp(state),
      season: state.season,
      teamId: state.userTeamId,
      summary: `${achievement.name}: ${achievement.description}`,
    };
    state.achievements.unlocked = [...state.achievements.unlocked, unlockRecord];
    if (publish) {
      publishAchievementUnlock(state, achievement);
    }
    unlocked.push(unlockRecord);
  }

  return unlocked;
}

export function buildAchievementView(state: FullGameState): AchievementView[] {
  const persistedProgress = new Map(state.achievements.progress);
  const liveProgress = new Map(
    checkAchievements({
      metrics: buildAchievementMetrics(state),
      alreadyUnlockedIds: state.achievements.unlocked.map((achievement) => achievement.id),
    }).progress,
  );
  const unlocks = new Map(state.achievements.unlocked.map((achievement) => [achievement.id, achievement] as const));

  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const progress = persistedProgress.get(definition.id) ?? liveProgress.get(definition.id) ?? {
      current: 0,
      target: definition.target,
      summary: titleForMetricLabel(definition.progressLabel),
    };
    const unlock = unlocks.get(definition.id) ?? null;

    return {
      ...definition,
      unlocked: unlock != null,
      unlockedAt: unlock?.unlockedAt ?? null,
      unlockSummary: unlock?.summary ?? null,
      progress,
    };
  });
}
