import {
  buildLeagueAdvancedContext,
  calculateAdvancedStatLine,
  getDaysUntilTradeDeadline,
  getPromotionCandidates,
  getRegularSeasonMonthForDay,
  getTradeDeadlineDay,
  getRosterComplianceIssues,
  getTeamById,
  getNextMonthStartDay,
  type PlayerGameStats,
  type RegularSeasonMonth,
} from '@mbd/sim-core';
import type {
  DecisionSpotlightItem,
  MonthlyPulseState,
  MonthlyReport,
} from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers.js';

interface TeamRecordSnapshot {
  wins: number;
  losses: number;
}

interface MonthlyAdvanceContext {
  month: RegularSeasonMonth;
  startDay: number;
  playerStatsBefore: Map<string, PlayerGameStats>;
  teamRecordBefore: TeamRecordSnapshot;
  divisionRankBefore: number;
  injuredPlayerIdsBefore: Set<string>;
}

const DECISION_PRIORITY: Record<DecisionSpotlightItem['urgency'], number> = {
  red: 0,
  yellow: 1,
  blue: 2,
};

function clonePlayerStatsMap(
  stats: Map<string, PlayerGameStats>,
): Map<string, PlayerGameStats> {
  return new Map(
    Array.from(stats.entries(), ([playerId, line]) => [playerId, { ...line }]),
  );
}

function getTeamRecordSnapshot(s: FullGameState, teamId: string): TeamRecordSnapshot {
  const record = s.seasonState.standings.getRecord(teamId);
  return {
    wins: record?.wins ?? 0,
    losses: record?.losses ?? 0,
  };
}

function getDivisionRank(s: FullGameState, teamId: string): number {
  const division = getTeamById(teamId)?.division;
  if (!division) return 1;

  const standings = s.seasonState.standings.getFullStandings()[division] ?? [];
  const index = standings.findIndex((entry) => entry.teamId === teamId);
  return index >= 0 ? index + 1 : 1;
}

function formatRecord(record: TeamRecordSnapshot): string {
  return `${record.wins}-${record.losses}`;
}

function formatPlayerName(s: FullGameState, playerId: string): string {
  const player = s.players.find((candidate) => candidate.id === playerId);
  return player ? `${player.firstName} ${player.lastName}` : playerId;
}

function buildScheduleDifficulty(s: FullGameState): MonthlyReport['upcomingScheduleDifficulty'] {
  if (s.phase !== 'regular') {
    return {
      score: 0,
      label: 'Complete',
      summary: 'No remaining regular-season games.',
    };
  }

  const nextMonthStart = getNextMonthStartDay(s.day);
  const games = s.schedule.filter((game) =>
    game.day >= s.day
    && game.day < nextMonthStart
    && (game.homeTeamId === s.userTeamId || game.awayTeamId === s.userTeamId),
  );

  if (games.length === 0) {
    return {
      score: 0,
      label: 'Clear',
      summary: 'No remaining regular-season games on the next monthly horizon.',
    };
  }

  const averagePct = games.reduce((sum, game) => {
    const opponentId = game.homeTeamId === s.userTeamId ? game.awayTeamId : game.homeTeamId;
    const opponent = s.seasonState.standings.getRecord(opponentId);
    const totalGames = (opponent?.wins ?? 0) + (opponent?.losses ?? 0);
    return sum + (totalGames > 0 ? (opponent?.wins ?? 0) / totalGames : 0.5);
  }, 0) / games.length;

  const score = Math.round(averagePct * 100);
  const label = averagePct >= 0.56
    ? 'Grueling'
    : averagePct >= 0.52
      ? 'Challenging'
      : averagePct >= 0.48
        ? 'Balanced'
        : 'Favorable';

  return {
    score,
    label,
    summary: `${games.length} games against opponents averaging a ${(averagePct * 100).toFixed(1)}% win rate.`,
  };
}

function buildPlayerOfTheMonth(
  s: FullGameState,
  beforeStats: Map<string, PlayerGameStats>,
): MonthlyReport['playerOfTheMonth'] {
  const beforeContext = buildLeagueAdvancedContext(s.players, beforeStats);
  const afterContext = buildLeagueAdvancedContext(s.players, s.seasonState.playerSeasonStats);

  let best: MonthlyReport['playerOfTheMonth'] = null;
  let bestWarDelta = Number.NEGATIVE_INFINITY;

  for (const player of s.players) {
    if (player.teamId !== s.userTeamId || player.rosterStatus !== 'MLB') continue;

    const afterStats = s.seasonState.playerSeasonStats.get(player.id);
    if (!afterStats || (afterStats.pa === 0 && afterStats.ip === 0)) continue;

    const beforeLine = beforeStats.get(player.id);
    const beforeWar = beforeLine && (beforeLine.pa > 0 || beforeLine.ip > 0)
      ? calculateAdvancedStatLine(player, beforeLine, beforeContext).war
      : 0;
    const afterWar = calculateAdvancedStatLine(player, afterStats, afterContext).war;
    const warDelta = Number((afterWar - beforeWar).toFixed(1));

    if (warDelta > bestWarDelta) {
      bestWarDelta = warDelta;
      best = {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        war: warDelta,
      };
    }
  }

  return best;
}

function buildDecisionQueue(
  s: FullGameState,
  month: RegularSeasonMonth,
): DecisionSpotlightItem[] {
  const items: DecisionSpotlightItem[] = [];
  const rosterState = s.rosterStates.get(s.userTeamId);
  const rosterIssues = rosterState
    ? getRosterComplianceIssues(s.players.filter((player) => player.teamId === s.userTeamId), rosterState, s.day)
    : [];

  if (rosterIssues.some((issue) => issue.code === 'active_roster_over_limit')) {
    items.push({
      id: `spotlight-roster-${s.season}-${month.month}`,
      urgency: 'red',
      title: 'Roster is over the active limit',
      body: 'You need to clear a roster spot before the next series starts.',
      route: '/roster',
      actionLabel: 'Open Roster',
    });
  }

  if (s.tradeState.pendingOffers.length > 0) {
    items.push({
      id: `spotlight-trade-${s.season}-${month.month}`,
      urgency: 'yellow',
      title: 'Trade offer is waiting on your board',
      body: `${s.tradeState.pendingOffers.length} active offer${s.tradeState.pendingOffers.length === 1 ? '' : 's'} still need a decision.`,
      route: '/trade',
      actionLabel: 'Open Trade Center',
    });
  } else {
    const topPromotion = getPromotionCandidates(s.players, s.minorLeagueState, s.userTeamId)[0];
    if (topPromotion) {
      items.push({
        id: `spotlight-promotion-${topPromotion.playerId}-${s.season}-${month.month}`,
        urgency: 'yellow',
        title: 'A prospect is knocking on the door',
        body: `${formatPlayerName(s, topPromotion.playerId)} has earned a look at ${topPromotion.targetLevel}.`,
        route: '/minors',
        actionLabel: 'Review Minors',
      });
    }
  }

  const latestDevelopment = [...s.minorLeagueState.developmentReports]
    .sort((left, right) => right.season - left.season || right.month - left.month)[0];
  if (latestDevelopment) {
    items.push({
      id: `spotlight-development-${latestDevelopment.playerId}-${latestDevelopment.season}-${latestDevelopment.month}`,
      urgency: 'blue',
      title: 'A new development report is on your desk',
      body: latestDevelopment.summary,
      route: '/scouting',
      actionLabel: 'Open Scouting',
    });
  }

  return items
    .sort((left, right) =>
      DECISION_PRIORITY[left.urgency] - DECISION_PRIORITY[right.urgency]
      || left.title.localeCompare(right.title),
    )
    .slice(0, 3);
}

export function createEmptyMonthlyPulseState(): MonthlyPulseState {
  return {
    pendingReport: null,
    decisionQueue: [],
  };
}

export function captureMonthlyAdvanceContext(s: FullGameState): MonthlyAdvanceContext {
  return {
    month: getRegularSeasonMonthForDay(s.day),
    startDay: s.day,
    playerStatsBefore: clonePlayerStatsMap(s.seasonState.playerSeasonStats),
    teamRecordBefore: getTeamRecordSnapshot(s, s.userTeamId),
    divisionRankBefore: getDivisionRank(s, s.userTeamId),
    injuredPlayerIdsBefore: new Set(
      Array.from(s.injuries.keys()).filter((playerId) =>
        s.players.find((candidate) => candidate.id === playerId)?.teamId === s.userTeamId,
      ),
    ),
  };
}

export function generateMonthlyPulse(
  s: FullGameState,
  context: MonthlyAdvanceContext,
): MonthlyPulseState {
  const afterRecord = getTeamRecordSnapshot(s, s.userTeamId);
  const divisionRank = getDivisionRank(s, s.userTeamId);
  const newInjuries = Array.from(s.injuries.keys())
    .filter((playerId) =>
      !context.injuredPlayerIdsBefore.has(playerId)
      && s.players.find((candidate) => candidate.id === playerId)?.teamId === s.userTeamId,
    )
    .slice(0, 3)
    .map((playerId) => `${formatPlayerName(s, playerId)} (${s.injuries.get(playerId)?.daysRemaining ?? 0} days)`);
  const returns = Array.from(context.injuredPlayerIdsBefore)
    .filter((playerId) => !s.injuries.has(playerId))
    .slice(0, 3)
    .map((playerId) => formatPlayerName(s, playerId));
  const completedDay = s.phase === 'regular' ? s.day - 1 : context.month.endDay;
  const tradeDeadlineDay = getTradeDeadlineDay();
  const monthRecord = {
    wins: afterRecord.wins - context.teamRecordBefore.wins,
    losses: afterRecord.losses - context.teamRecordBefore.losses,
  };

  const report: MonthlyReport = {
    id: `monthly-report-${s.season}-${context.month.month}`,
    season: s.season,
    month: context.month.month,
    monthLabel: context.month.label,
    startDay: context.startDay,
    endDay: completedDay,
    teamRecord: formatRecord(monthRecord),
    overallRecord: formatRecord(afterRecord),
    divisionRank,
    divisionMovement: context.divisionRankBefore - divisionRank,
    playerOfTheMonth: buildPlayerOfTheMonth(s, context.playerStatsBefore),
    keyInjuries: newInjuries,
    keyReturns: returns,
    tradeDeadlineCountdown:
      context.month.month >= 7 && context.month.month <= 8 && completedDay < tradeDeadlineDay
        ? getDaysUntilTradeDeadline(completedDay)
        : null,
    upcomingScheduleDifficulty: buildScheduleDifficulty(s),
  };

  return {
    pendingReport: report,
    decisionQueue: buildDecisionQueue(s, context.month),
  };
}

export function getMonthlyPulse(s: FullGameState): MonthlyPulseState {
  return s.monthlyPulse;
}

export function acknowledgeMonthlyReport(s: FullGameState, reportId: string): { success: boolean } {
  if (s.monthlyPulse.pendingReport?.id !== reportId) {
    return { success: false };
  }

  s.monthlyPulse = {
    ...s.monthlyPulse,
    pendingReport: null,
  };
  return { success: true };
}

export function dismissDecisionSpotlight(s: FullGameState, decisionId: string): { success: boolean } {
  const exists = s.monthlyPulse.decisionQueue.some((item) => item.id === decisionId);
  if (!exists) {
    return { success: false };
  }

  s.monthlyPulse = {
    ...s.monthlyPulse,
    decisionQueue: s.monthlyPulse.decisionQueue.filter((item) => item.id !== decisionId),
  };
  return { success: true };
}
