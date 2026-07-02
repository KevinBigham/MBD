import type {
  ArchivedSeason,
  AwardHistoryEntry,
  RecordWatchEntry,
  Rivalry,
  SeasonArchiveEntry,
  SeasonHistoryEntry,
  SeasonStatLeader,
} from '@mbd/contracts';
import { getTeamById, type AwardRaces } from '@mbd/sim-core';
import { humanizeLabel } from '@/shared/lib/labels';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';
import type { HallOfFameEntryView } from '../components/HallOfFamePanel';
import type { RecordBookView } from '../components/RecordsPanel';
import type { SeasonRecapData } from '../components/SeasonRecapModal';
import type { DynastyTimelineEntryLike } from './buildDynastyTimelineChapters';

export interface HistoryDisplayNames {
  players: Record<string, string>;
  teams: Record<string, string>;
}

export const EMPTY_DISPLAY_NAMES: HistoryDisplayNames = {
  players: {},
  teams: {},
};

export const HISTORY_TABS = ['records', 'seasons', 'leaders', 'timeline', 'legacy', 'awards'] as const;
export type HistoryTab = (typeof HISTORY_TABS)[number];

export function formatAwardLabel(value: string): string {
  return humanizeLabel(value);
}

export function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

export function collectHistoryIds(
  awardRaces: AwardRaces | null,
  awardHistory: AwardHistoryEntry[],
  seasonHistory: SeasonHistoryEntry[],
  franchiseTimeline: DynastyTimelineEntryLike[],
  seasonArchives: SeasonArchiveEntry[],
  archivedSeasons: ArchivedSeason[],
  recordBook: RecordBookView,
  recordWatch: RecordWatchEntry[],
  rivalries: Rivalry[],
  hallOfFame: HallOfFameEntryView[],
): { playerIds: string[]; teamIds: string[] } {
  const playerIds = [
    ...(awardRaces?.mvp ?? []).map((entry) => entry.playerId),
    ...(awardRaces?.cyYoung ?? []).map((entry) => entry.playerId),
    ...(awardRaces?.roy ?? []).map((entry) => entry.playerId),
    ...awardHistory.map((entry) => entry.playerId),
    ...hallOfFame.map((entry) => entry.playerId),
    ...franchiseTimeline.flatMap((entry) => (entry.playerMomentBeats ?? []).map((beat) => beat.playerId)),
    ...recordBook.franchise.flatMap((entry) => entry.holders.map((holder) => holder.playerId ?? '')),
    ...recordBook.league.flatMap((entry) => entry.holders.map((holder) => holder.playerId ?? '')),
    ...recordWatch.map((entry) => entry.playerId),
    ...seasonHistory.flatMap((entry) => [
      ...entry.awards.map((award) => award.playerId),
      ...entry.statLeaders.hr.map((leader) => leader.playerId),
      ...entry.statLeaders.rbi.map((leader) => leader.playerId),
      ...entry.statLeaders.avg.map((leader) => leader.playerId),
      ...entry.statLeaders.era.map((leader) => leader.playerId),
      ...entry.statLeaders.k.map((leader) => leader.playerId),
      ...entry.statLeaders.w.map((leader) => leader.playerId),
      ...entry.notableRetirements.map((retirement) => retirement.playerId),
      ...entry.blockbusterTrades.flatMap((trade) => trade.playerIds),
    ]),
    ...seasonArchives.flatMap((entry) => [
      ...entry.awards.map((award) => award.playerId),
      ...entry.statLeaders.hr.map((leader) => leader.playerId),
      ...entry.statLeaders.rbi.map((leader) => leader.playerId),
      ...entry.statLeaders.avg.map((leader) => leader.playerId),
      ...entry.statLeaders.era.map((leader) => leader.playerId),
      ...entry.statLeaders.k.map((leader) => leader.playerId),
      ...entry.statLeaders.w.map((leader) => leader.playerId),
      ...entry.transactions.flatMap((transaction) => transaction.playerIds),
      ...entry.draftClass.map((pick) => pick.playerId),
    ]),
    ...archivedSeasons.flatMap((entry) => [
      ...entry.statLeaders.hr.map((leader) => leader.playerId),
      ...entry.statLeaders.rbi.map((leader) => leader.playerId),
      ...entry.statLeaders.avg.map((leader) => leader.playerId),
      ...entry.statLeaders.era.map((leader) => leader.playerId),
      ...entry.statLeaders.k.map((leader) => leader.playerId),
      ...entry.statLeaders.w.map((leader) => leader.playerId),
    ]),
  ];
  const teamIds = [
    ...(awardRaces?.mvp ?? []).map((entry) => entry.teamId),
    ...(awardRaces?.cyYoung ?? []).map((entry) => entry.teamId),
    ...(awardRaces?.roy ?? []).map((entry) => entry.teamId),
    ...awardHistory.map((entry) => entry.teamId),
    ...hallOfFame.flatMap((entry) => entry.teamIds),
    ...franchiseTimeline.flatMap((entry) => (entry.playerMomentBeats ?? []).map((beat) => beat.teamId)),
    ...franchiseTimeline.flatMap((entry) =>
      (entry.teamMomentBeats ?? []).flatMap((beat) => beat.teamIds ?? [beat.teamId])),
    ...recordBook.franchise.flatMap((entry) => entry.holders.map((holder) => holder.teamId ?? '')),
    ...recordBook.league.flatMap((entry) => entry.holders.map((holder) => holder.teamId ?? '')),
    ...recordWatch.map((entry) => entry.teamId),
    ...seasonHistory.flatMap((entry) => [
      entry.championTeamId ?? '',
      entry.runnerUpTeamId ?? '',
      ...entry.awards.map((award) => award.teamId),
      ...entry.statLeaders.hr.map((leader) => leader.teamId),
      ...entry.statLeaders.rbi.map((leader) => leader.teamId),
      ...entry.statLeaders.avg.map((leader) => leader.teamId),
      ...entry.statLeaders.era.map((leader) => leader.teamId),
      ...entry.statLeaders.k.map((leader) => leader.teamId),
      ...entry.statLeaders.w.map((leader) => leader.teamId),
      ...entry.notableRetirements.map((retirement) => retirement.teamId),
      ...entry.blockbusterTrades.flatMap((trade) => trade.teamIds),
      entry.userSeason?.teamId ?? '',
    ]),
    ...seasonArchives.flatMap((entry) => [
      ...entry.standings.map((standing) => standing.teamId),
      ...entry.playoffSeries.flatMap((series) => [series.winnerTeamId ?? '', series.loserTeamId ?? '']),
      ...entry.awards.map((award) => award.teamId),
      ...entry.statLeaders.hr.map((leader) => leader.teamId),
      ...entry.statLeaders.rbi.map((leader) => leader.teamId),
      ...entry.statLeaders.avg.map((leader) => leader.teamId),
      ...entry.statLeaders.era.map((leader) => leader.teamId),
      ...entry.statLeaders.k.map((leader) => leader.teamId),
      ...entry.statLeaders.w.map((leader) => leader.teamId),
      ...entry.transactions.flatMap((transaction) => transaction.teamIds),
      ...entry.draftClass.map((pick) => pick.teamId),
      ...entry.financials.map((financial) => financial.teamId),
      entry.userSummary?.teamId ?? '',
    ]),
    ...archivedSeasons.flatMap((entry) => [
      ...entry.standings.map((standing) => standing.teamId),
      entry.championTeamId ?? '',
      ...entry.statLeaders.hr.map((leader) => leader.teamId),
      ...entry.statLeaders.rbi.map((leader) => leader.teamId),
      ...entry.statLeaders.avg.map((leader) => leader.teamId),
      ...entry.statLeaders.era.map((leader) => leader.teamId),
      ...entry.statLeaders.k.map((leader) => leader.teamId),
      ...entry.statLeaders.w.map((leader) => leader.teamId),
    ]),
    ...rivalries.flatMap((rivalry) => [rivalry.teamA, rivalry.teamB]),
  ];

  return {
    playerIds: uniqueStrings(playerIds),
    teamIds: uniqueStrings(teamIds),
  };
}

export function sortSeasonsDescending(values: number[]): number[] {
  return [...values].sort((left, right) => right - left);
}

export function isArchivedSeasonView(view: HistorySeasonView | null): view is ArchivedSeason {
  return view != null && !('playoffSeries' in view);
}

export function isFullSeasonArchive(view: HistorySeasonView | null): view is SeasonArchiveEntry {
  return view != null && 'playoffSeries' in view;
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '--';
  return `$${value.toFixed(1)}M`;
}

export function buildSeasonRecapData(
  archive: SeasonArchiveEntry,
  seasonHistory: SeasonHistoryEntry | undefined,
  userTeamId: string,
  displayNames: HistoryDisplayNames,
): SeasonRecapData {
  const teamDef = getTeamById(userTeamId);
  const teamName = teamDef?.name ?? userTeamId;

  const userStanding = archive.standings?.find((s) => s.teamId === userTeamId);
  const wins = userStanding?.wins ?? 0;
  const losses = userStanding?.losses ?? 0;
  const pct = wins + losses > 0 ? (wins / (wins + losses)).toFixed(3) : '.000';

  const userSummary = archive.userSummary ?? seasonHistory?.userSeason;
  const isChampion = seasonHistory?.championTeamId === userTeamId;

  function leaderForStat(leaders: SeasonStatLeader[] | undefined): { name: string; value: string } | null {
    if (!leaders || leaders.length === 0) return null;
    const teamLeader = leaders.find((l) => l.teamId === userTeamId) ?? leaders[0];
    if (!teamLeader) return null;
    const name = displayNames.players[teamLeader.playerId] ?? 'Unknown';
    return { name, value: teamLeader.value ?? teamLeader.summary ?? '' };
  }

  const awards = (archive.awards ?? [])
    .filter((a) => a.teamId === userTeamId)
    .slice(0, 6)
    .map((a) => ({
      award: a.award ?? 'Award',
      playerName: displayNames.players[a.playerId] ?? 'Unknown',
    }));

  const keyTransactions = (archive.transactions ?? [])
    .slice(0, 8)
    .map((tx) => ({ description: tx.headline }));

  const narrative = seasonHistory
    ? `${userSummary?.record ?? `${wins}-${losses}`}. ${userSummary?.playoffResult ?? 'Did not qualify.'}${seasonHistory.summary ? ` ${seasonHistory.summary}` : ''}`
    : `${wins}-${losses}. Season ${archive.season} complete.`;

  const financialEntry = archive.financials?.find((f) => f.teamId === userTeamId);

  return {
    season: archive.season,
    teamName,
    teamId: userTeamId,
    record: `${wins}-${losses}`,
    winPct: pct,
    divisionRank: userStanding?.divisionRank ?? 0,
    gamesBack: userStanding?.gamesBack ?? 0,
    playoffResult: userSummary?.playoffResult ?? null,
    isChampion,
    statLeaders: {
      hr: leaderForStat(archive.statLeaders?.hr),
      rbi: leaderForStat(archive.statLeaders?.rbi),
      avg: leaderForStat(archive.statLeaders?.avg),
      era: leaderForStat(archive.statLeaders?.era),
      k: leaderForStat(archive.statLeaders?.k),
      w: leaderForStat(archive.statLeaders?.w),
    },
    awards,
    keyTransactions,
    narrative,
    storylines: userSummary?.storylines ?? seasonHistory?.keyMoments ?? [],
    fanSentiment: null,
    payroll: financialEntry?.payroll != null ? `$${financialEntry.payroll.toFixed(1)}M` : null,
  };
}

export function divisionLabelForTeam(teamId: string): string {
  return getTeamById(teamId)?.division.replace('_', ' ') ?? 'League';
}

export function groupArchiveStandings(archive: HistorySeasonView | null) {
  if (!archive) return [];

  const groups = new Map<string, HistorySeasonView['standings']>();
  for (const standing of archive.standings) {
    const division = getTeamById(standing.teamId)?.division ?? 'LEAGUE';
    const existing = groups.get(division) ?? [];
    groups.set(division, [...existing, standing]);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([division, entries]) => ({
      division,
      label: division.replace('_', ' '),
      entries: [...entries].sort((left, right) =>
        left.divisionRank - right.divisionRank || right.wins - left.wins || left.losses - right.losses,
      ),
    }));
}
