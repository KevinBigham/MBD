import { humanizeLabel } from '@/shared/lib/labels';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import type { GuidedStartNudgeId } from '@/features/onboarding/nudges';
import type { OwnerPayrollPolicy } from '@mbd/sim-core';
import type { AttentionDeskItem } from '../components/AttentionDesk';
import type { DashboardSimAction } from '../components/DashboardSimControlsPanel';
import { normalizeProspectReadinessGrade } from './prospectReadiness';

export interface DashboardSummary {
  franchise: {
    teamName: string;
    abbreviation: string;
    gmName: string;
    difficulty: 'easy' | 'standard' | 'hard';
    welcomeBriefingPending: boolean;
    season: number;
    record: string;
    division: string;
    divisionRank: number;
    dynasty: { score: number; grade: string };
    status: 'active' | 'fired';
    endReason: string | null;
    owner: {
      hotSeat: boolean;
      patience: number;
      confidence: number;
      summary: string;
      satisfaction?: number;
      annualBudget?: number;
      payrollCap?: number;
    } | null;
    chemistry: { score: number; tier: string; summary: string } | null;
    frontOffice: { reputation: number; summary: string } | null;
  };
  fanSentiment: {
    score: number;
    trend: 'rising' | 'stable' | 'falling';
    summary: string;
  };
  challenge: {
    scenarioId: string;
    name: string;
    progress: number;
    completed: boolean;
    failed: boolean;
    summary: string;
  } | null;
  momentum: {
    last10: string;
    streak: string;
    runDifferential: number;
    seasonRunDiffPerGame: number;
    last30RunDiffPerGame: number;
    playoffProbability: number;
  };
  roster: {
    topPerformers: Array<{
      playerId: string;
      name: string;
      position: string;
      label: string;
      sparklineValues: number[];
      statLine: string;
    }>;
    injuredCount: number;
    nextReturnDays: number | null;
    fatigueWarnings: Array<{
      playerId: string;
      name: string;
      position: string;
      fatigueScore: number;
      summary: string;
    }>;
    payroll: number;
    budget: number;
    budgetRoom?: number;
    luxuryTax: number;
    ownerPayrollPolicy?: OwnerPayrollPolicy;
  };
  intel: {
    tradeInboxCount: number;
    expiringContracts: Array<{
      playerId: string;
      name: string;
      position: string;
      salary: number;
    }>;
    topProspect: {
      playerId: string;
      name: string;
      position: string;
      readiness: number;
      level: string;
    } | null;
    rivalries: Array<{
      id: string;
      opponentTeamId: string;
      intensity: number;
      summary: string;
      currentSeasonRecord: string;
      historicalRecord: string;
    }>;
  };
  tradeIntel: {
    daysUntilDeadline: number | null;
    deadlineMode: boolean;
    activeTradeOffers: number;
    recentSummary: string | null;
    recentTrades: Array<{
      id: string;
      summary: string;
      timestamp: string;
    }>;
  };
  farmIntel: {
    topProspects: Array<{
      playerId: string;
      name: string;
      position: string;
      level: string;
      readiness: number;
      trend: 'up' | 'steady' | 'down';
      latestLineSummary: string | null;
    }>;
    recentMoves: Array<{
      id: string;
      headline: string;
      timestamp: string;
    }>;
  };
  storylinesToWatch: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    arcType: string;
    phase: 'setup' | 'rising' | 'climax' | 'resolution';
    latestMilestone: string | null;
  }>;
  divisionStandings: Array<{
    teamId: string;
    teamName: string;
    city: string;
    abbreviation: string;
    division: string;
    wins: number;
    losses: number;
    pct: string;
    gamesBack: number;
    streak: string;
    runDifferential: number;
    divisionRank: number;
  }>;
  pressRoom: {
    feed: PressRoomEntry[];
    latest: PressRoomEntry | null;
    briefingCount: number;
    newsCount: number;
    unreadCount: number;
  };
  thisDayInHistory: {
    season: number;
    headline: string;
    summary: string;
  } | null;
}

export interface ScheduleGameEntry {
  day: number;
  isCompleted: boolean;
}

export interface DashboardScheduleFlags {
  completedUserGames: number;
  hasCurrentDayGame: boolean;
  hasPriorScheduledGame: boolean;
  hasFutureScheduledGame: boolean;
}

export type SimAction = DashboardSimAction;

export function quickActionLabel(action: Exclude<SimAction, null>): string {
  switch (action) {
    case 'day':
      return 'Sim Day';
    case 'week':
      return 'Sim Week';
    case 'month':
      return 'Sim Month';
  }
}

export function getDashboardScheduleFlags(
  scheduleEntries: ScheduleGameEntry[] | null,
  currentDay: number,
): DashboardScheduleFlags {
  return {
    completedUserGames: scheduleEntries?.filter((entry) => entry.isCompleted).length ?? 0,
    hasCurrentDayGame: scheduleEntries?.some((entry) => entry.day === currentDay) ?? false,
    hasPriorScheduledGame: scheduleEntries?.some((entry) => entry.day < currentDay) ?? false,
    hasFutureScheduledGame: scheduleEntries?.some((entry) => entry.day > currentDay) ?? false,
  };
}

export function buildAttentionItems(
  summary: DashboardSummary | null,
  currentPhase: string,
  completedUserGames: number,
  hasCurrentDayGame: boolean,
): AttentionDeskItem[] {
  if (!summary) {
    return [];
  }

  const items: AttentionDeskItem[] = [];
  const fatigueWarnings = summary.roster?.fatigueWarnings ?? [];
  const injuredCount = summary.roster?.injuredCount ?? 0;
  const fatigueCount = fatigueWarnings.length;
  const healthCount = injuredCount + fatigueCount;

  if (healthCount > 0) {
    items.push({
      id: 'roster-health',
      title: 'Roster health needs attention',
      detail: `${injuredCount} injured, ${fatigueCount} fatigue flag${fatigueCount === 1 ? '' : 's'}.`,
      to: '/roster',
      tone: 'warning',
    });
  }

  const activeTradeOffers = summary.tradeIntel?.activeTradeOffers ?? 0;
  if (activeTradeOffers > 0) {
    items.push({
      id: 'trade-inbox',
      title: 'Trade inbox is active',
      detail: `${activeTradeOffers} offer${activeTradeOffers === 1 ? '' : 's'} waiting for a front-office call.`,
      to: '/trade',
      tone: 'info',
    });
  }

  const unreadPressCount = summary.pressRoom?.unreadCount ?? 0;
  if (unreadPressCount > 0) {
    items.push({
      id: 'press-room',
      title: 'Press room has fresh noise',
      detail: `${unreadPressCount} unread item${unreadPressCount === 1 ? '' : 's'} on the wire.`,
      to: '/press-room',
      tone: 'info',
    });
  }

  const expiringContracts = summary.intel?.expiringContracts ?? [];
  if (expiringContracts.length > 0) {
    const first = expiringContracts[0];
    const remaining = Math.max(0, expiringContracts.length - 1);
    items.push({
      id: 'contract-clock',
      title: 'Contract clock is ticking',
      detail: remaining > 0
        ? `${first?.name ?? 'Key contributors'} and ${remaining} more expiring deal${remaining === 1 ? '' : 's'}.`
        : `${first?.name ?? 'A key contributor'} is on an expiring deal.`,
      to: '/finance',
      tone: 'warning',
    });
  }

  const topProspect = summary.intel?.topProspect;
  const topProspectReadinessGrade = topProspect ? normalizeProspectReadinessGrade(topProspect.readiness) : null;
  if (topProspect && topProspectReadinessGrade != null && topProspectReadinessGrade >= 60) {
    items.push({
      id: 'prospect-ready',
      title: 'Prospect pipeline has a near-term piece',
      detail: `${topProspect.name} carries a ${topProspectReadinessGrade} OVR near-term grade in ${humanizeLabel(topProspect.level)}.`,
      to: '/minors',
      tone: 'success',
    });
  }

  if (summary.challenge && !summary.challenge.completed && !summary.challenge.failed) {
    items.push({
      id: 'challenge',
      title: 'Challenge objective is live',
      detail: summary.challenge.summary,
      to: '/scenarios',
      tone: 'info',
    });
  }

  if (summary.franchise?.season === 1 && currentPhase === 'regular' && completedUserGames === 0 && hasCurrentDayGame) {
    items.push({
      id: 'first-sim',
      title: 'Opening Day is ready',
      detail: 'Run the first day once roster, staff, trade posture, and press room checks feel clean.',
      to: '/dashboard',
      tone: 'success',
    });
  }

  return items.slice(0, 5);
}

export function shouldShowOpeningDayChecklist(
  summary: DashboardSummary | null,
  phase: string,
  completedUserGames: number,
): boolean {
  return Boolean(
    summary
      && summary.franchise.season === 1
      && phase !== 'offseason'
      && phase !== 'playoffs'
      && (phase !== 'regular' || completedUserGames === 0),
  );
}

export function buildDashboardNudgeTriggers(params: {
  isInitialized: boolean;
  season: number;
  phase: string;
  scheduleLoaded: boolean;
  completedUserGames: number;
  hasCurrentDayGame: boolean;
  hasPriorScheduledGame: boolean;
  hasFutureScheduledGame: boolean;
}): GuidedStartNudgeId[] {
  if (!params.isInitialized || params.season !== 1 || params.phase !== 'regular' || !params.scheduleLoaded) {
    return [];
  }

  if (params.completedUserGames === 0 && params.hasCurrentDayGame) {
    return ['first_series_pointer'];
  }

  if (
    params.completedUserGames > 0
    && !params.hasCurrentDayGame
    && params.hasPriorScheduledGame
    && params.hasFutureScheduledGame
  ) {
    return ['first_offday_autosave_prompt'];
  }

  return [];
}

export function shouldAutoSkipFirstSeriesPointerNudge(params: {
  isInitialized: boolean;
  season: number;
  phase: string;
  scheduleLoaded: boolean;
  completedUserGames: number;
}): boolean {
  return params.isInitialized
    && params.season === 1
    && params.phase === 'regular'
    && params.scheduleLoaded
    && params.completedUserGames > 0;
}
