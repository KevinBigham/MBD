import { useEffect, useState, useCallback } from 'react';
import { History, Award, Flame, Trophy, BarChart3, Film } from 'lucide-react';
import { Skeleton } from '@mbd/ui';
import { Link } from 'react-router-dom';
import { logger } from '@/shared/lib/logger';
import type {
  ArchivedSeason,
  AwardHistoryEntry,
  DynastyCard,
  RecordBookEntry,
  RecordWatchEntry,
  Rivalry,
  SeasonArchiveEntry,
  SeasonHistoryEntry,
  SeasonStatLeader,
  TimelineComparison,
} from '@mbd/contracts';
import { getTeamById, type AwardRaceEntry, type AwardRaces } from '@mbd/sim-core';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { PageShell } from '@/shared/components/PageShell';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { listLeaderboardEntries, type LeaderboardEntry } from '@/shared/lib/saveSystem';
import { TimelineComparisonPanel } from '../components/TimelineComparisonPanel';
import { SeasonRecapModal, type SeasonRecapData } from '../components/SeasonRecapModal';

interface HistoryDisplayNames {
  players: Record<string, string>;
  teams: Record<string, string>;
}

interface HallOfFameEntryView {
  playerId: string;
  playerName: string;
  position: string;
  seasonsPlayed: number;
  teamIds: string[];
  inductionSeason: number;
  score: number;
  inductionType: string;
  careerStats: {
    batting: { hits: number; hr: number; rbi: number } | null;
    pitching: { wins: number; strikeouts: number; inningsPitched: number; earnedRuns: number } | null;
  };
}

interface FranchiseTimelineEntryView {
  season: number;
  record: string;
  playoffResult: string;
  championship: boolean;
  keyAcquisitions: string[];
  keyDepartures: string[];
  dynastyScore: number;
}

interface DynastyScoreSummary {
  score: number;
  grade: string;
  breakdown: {
    championships: number;
    worldSeriesAppearances: number;
    playoffAppearances: number;
    ninetyWinSeasons: number;
    divisionTitles: number;
    losingSeasons: number;
    awardWinners: number;
  };
}

interface RecordBookView {
  franchise: RecordBookEntry[];
  league: RecordBookEntry[];
}

interface SeasonComparisonView {
  userTeamId: string;
  left: HistorySeasonView | null;
  right: HistorySeasonView | null;
  deltas: {
    wins: number | null;
    payroll: number | null;
    budget: number | null;
  };
}

type HistorySeasonView = SeasonArchiveEntry | ArchivedSeason;

interface AchievementView {
  id: string;
  category: 'dynasty' | 'development' | 'moneyball' | 'records' | 'longevity';
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
  unlockSummary: string | null;
  progress: {
    current: number;
    target: number;
    summary?: string;
  };
}

interface AllTimeLeaderEntry {
  playerId: string;
  playerName: string;
  value: number;
  display: string;
}

interface AllTimeLeadersView {
  batting: {
    hits: AllTimeLeaderEntry[];
    hr: AllTimeLeaderEntry[];
    rbi: AllTimeLeaderEntry[];
  };
  pitching: {
    wins: AllTimeLeaderEntry[];
    strikeouts: AllTimeLeaderEntry[];
    era: AllTimeLeaderEntry[];
    saves: AllTimeLeaderEntry[];
  };
}

interface BranchSaveView {
  id: string;
  season: number;
  day: number;
  phase: string;
  parentSaveId: string | null;
  isRootSave: boolean;
  branchMeta: {
    id: string;
    saveId: string;
    branchedAtSeason: number;
    branchedAtDay: number;
    description: string;
    createdAt: string;
  } | null;
}

const EMPTY_DISPLAY_NAMES: HistoryDisplayNames = {
  players: {},
  teams: {},
};

const HISTORY_TABS = ['records', 'seasons', 'leaders', 'timeline', 'legacy', 'awards'] as const;
type HistoryTab = (typeof HISTORY_TABS)[number];
const SEASON_BROWSER_TABS = ['standings', 'playoffs', 'awards', 'leaders', 'transactions', 'draft', 'financials'] as const;
type SeasonBrowserTab = (typeof SEASON_BROWSER_TABS)[number];

function intensityTone(intensity: number): string {
  if (intensity >= 75) return 'text-accent-danger';
  if (intensity >= 55) return 'text-accent-warning';
  if (intensity >= 35) return 'text-accent-info';
  return 'text-dynasty-muted';
}

function formatAwardLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatRivalryOrigin(origin: Rivalry['origin']): string {
  if (!origin) return 'Emergent';
  return origin.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

function collectHistoryIds(
  awardRaces: AwardRaces | null,
  awardHistory: AwardHistoryEntry[],
  seasonHistory: SeasonHistoryEntry[],
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

function sortSeasonsDescending(values: number[]): number[] {
  return [...values].sort((left, right) => right - left);
}

function isArchivedSeasonView(view: HistorySeasonView | null): view is ArchivedSeason {
  return view != null && !('playoffSeries' in view);
}

function isFullSeasonArchive(view: HistorySeasonView | null): view is SeasonArchiveEntry {
  return view != null && 'playoffSeries' in view;
}

function formatSeasonViewRecord(view: HistorySeasonView | null): string {
  if (!view) {
    return 'No user summary';
  }
  if (isArchivedSeasonView(view)) {
    return view.userRecord ? `${view.userRecord.wins}-${view.userRecord.losses}` : 'No user summary';
  }
  return view.userSummary?.record ?? 'No user summary';
}

function formatSeasonViewPlayoffResult(view: HistorySeasonView | null): string {
  if (!view) {
    return 'No playoff result recorded';
  }
  if (isArchivedSeasonView(view)) {
    return view.playoffResult ?? (view.championshipWon ? 'Won World Series' : 'No playoff result recorded');
  }
  return view.userSummary?.playoffResult ?? 'No playoff result recorded';
}

function getSeasonViewTimelineEvents(view: HistorySeasonView | null): string[] {
  return isFullSeasonArchive(view) ? view.timelineEvents : [];
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return '--';
  return `$${value.toFixed(1)}M`;
}

function formatSignedMetric(value: number | null | undefined, suffix: string): string {
  if (value == null) return `-- ${suffix}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

function buildSeasonRecapData(
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

function HistorySkeleton() {
  return (
    <div className="space-y-6" data-testid="history-loading">
      <div className="space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

function divisionLabelForTeam(teamId: string): string {
  return getTeamById(teamId)?.division.replace('_', ' ') ?? 'League';
}

function groupArchiveStandings(archive: HistorySeasonView | null) {
  if (!archive) return [];

  const groups = new Map<string, typeof archive.standings>();
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

function timelineToneForSeason(archive: HistorySeasonView | null): string {
  if (!archive) {
    return 'border-dynasty-border bg-dynasty-elevated';
  }

  const userRecord = formatSeasonViewRecord(archive);
  const [wins, losses] = userRecord.split('-').map((value) => Number(value));
  const playoffResult = formatSeasonViewPlayoffResult(archive);

  if (playoffResult === 'Champion') {
    return 'border-accent-success/50 bg-accent-success/10';
  }
  if (playoffResult !== '' && playoffResult !== 'Missed playoffs') {
    return 'border-accent-info/50 bg-accent-info/10';
  }
  if ((wins || 0) >= (losses || 0)) {
    return 'border-accent-warning/50 bg-accent-warning/10';
  }

  return 'border-accent-danger/40 bg-accent-danger/10';
}

export default function HistoryPage() {
  const worker = useWorker();
  const historyWorker = worker as typeof worker & {
    getHistoryOverview?: () => Promise<{ seasonViews?: HistorySeasonView[] } | null>;
  };
  const workerReady = worker.isReady;
  const { isInitialized, userTeamId, day, season, phase, activeSaveId, activeSaveSlot } = useGameStore();
  const [awardRaces, setAwardRaces] = useState<AwardRaces | null>(null);
  const [awardHistory, setAwardHistory] = useState<AwardHistoryEntry[]>([]);
  const [seasonHistory, setSeasonHistory] = useState<SeasonHistoryEntry[]>([]);
  const [seasonViews, setSeasonViews] = useState<Record<number, HistorySeasonView>>({});
  const [recordBook, setRecordBook] = useState<RecordBookView>({ franchise: [], league: [] });
  const [recordWatch, setRecordWatch] = useState<RecordWatchEntry[]>([]);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntryView[]>([]);
  const [franchiseTimeline, setFranchiseTimeline] = useState<FranchiseTimelineEntryView[]>([]);
  const [dynastyScore, setDynastyScore] = useState<DynastyScoreSummary | null>(null);
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);
  const [selectedHistoryTab, setSelectedHistoryTab] = useState<HistoryTab>('seasons');
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [comparisonSeason, setComparisonSeason] = useState<number | null>(null);
  const [selectedSeasonTab, setSelectedSeasonTab] = useState<SeasonBrowserTab>('standings');
  const [selectedSeasonTeamId, setSelectedSeasonTeamId] = useState<string | null>(null);
  const [seasonComparison, setSeasonComparison] = useState<SeasonComparisonView | null>(null);
  const [displayNames, setDisplayNames] = useState<HistoryDisplayNames>(EMPTY_DISPLAY_NAMES);
  const [dynastyCards, setDynastyCards] = useState<DynastyCard[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [branches, setBranches] = useState<BranchSaveView[]>([]);
  const [timelineComparisons, setTimelineComparisons] = useState<TimelineComparison[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<AllTimeLeadersView | null>(null);
  const [recapData, setRecapData] = useState<SeasonRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const timelineRootSaveId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : activeSaveId;

  const fetchHistory = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    try {
      const recordBookPromise = typeof worker.getRecordBook === 'function'
        ? worker.getRecordBook(userTeamId)
        : Promise.resolve({ franchise: [], league: [] });
      const recordWatchPromise = typeof worker.getRecordWatchList === 'function'
        ? worker.getRecordWatchList(userTeamId)
        : Promise.resolve([]);
      const [races, awards, seasons, historyOverviewData, recordBookData, recordWatchData, rivalriesData, hallOfFameData, timelineData, dynastyData, achievementData, cardsData, liveLeaderboardData, storedLeaderboardData, branchData, leadersData] = await Promise.all([
        worker.getAwardRaces(),
        worker.getAwardHistory(),
        worker.getSeasonHistory(),
        typeof historyWorker.getHistoryOverview === 'function' ? historyWorker.getHistoryOverview() : Promise.resolve(null),
        recordBookPromise,
        recordWatchPromise,
        worker.getRivalries(userTeamId),
        worker.getHallOfFame(),
        worker.getFranchiseTimeline(),
        worker.getDynastyScore(),
        worker.getAchievements(),
        typeof worker.getDynastyCards === 'function' ? worker.getDynastyCards() : Promise.resolve([]),
        typeof worker.getDynastyLeaderboard === 'function' ? worker.getDynastyLeaderboard() : Promise.resolve([]),
        listLeaderboardEntries(),
        timelineRootSaveId && typeof worker.getBranches === 'function'
          ? worker.getBranches(timelineRootSaveId)
          : Promise.resolve([]),
        typeof worker.getAllTimeLeaders === 'function' ? worker.getAllTimeLeaders() : Promise.resolve(null),
      ]);
      const nextAwardRaces = races ?? null;
      const nextAwardHistory = awards ?? [];
      const nextSeasonHistory = seasons ?? [];
      const nextRecordBook = (recordBookData ?? { franchise: [], league: [] }) as RecordBookView;
      const nextRecordWatch = (recordWatchData ?? []) as RecordWatchEntry[];
      const nextRivalries = rivalriesData ?? [];
      const nextHallOfFame = hallOfFameData ?? [];
      const nextTimeline = timelineData ?? [];
      const overviewSeasonViews = ((historyOverviewData as { seasonViews?: HistorySeasonView[] } | null)?.seasonViews ?? []);
      const nextSeasonViews = overviewSeasonViews.length > 0
        ? Object.fromEntries(overviewSeasonViews.map((entry) => [entry.season, entry]))
        : Object.fromEntries(
          (typeof worker.getSeasonArchive === 'function'
            ? await Promise.all(
              sortSeasonsDescending((nextSeasonHistory as SeasonHistoryEntry[]).map((entry) => entry.season))
                .map(async (archiveSeason) => [archiveSeason, await worker.getSeasonArchive(archiveSeason)] as const),
            )
            : []
          )
            .filter((entry): entry is readonly [number, SeasonArchiveEntry] => entry[1] != null)
            .map(([archiveSeason, archive]) => [archiveSeason, archive]),
        );
      const seasonsInHistory = sortSeasonsDescending(uniqueStrings([
        ...(nextSeasonHistory as SeasonHistoryEntry[]).map((entry) => String(entry.season)),
        ...Object.keys(nextSeasonViews),
      ]).map((value) => Number(value)));
      const initialSelectedSeason = seasonsInHistory[0] ?? null;
      const initialComparisonSeason = seasonsInHistory[1] ?? seasonsInHistory[0] ?? null;
      const comparisonData = (
        typeof worker.compareSeasons === 'function'
        && initialSelectedSeason != null
        && initialComparisonSeason != null
        && initialComparisonSeason !== initialSelectedSeason
      )
        ? await worker.compareSeasons(initialComparisonSeason, initialSelectedSeason)
        : null;
      const { playerIds, teamIds } = collectHistoryIds(
        nextAwardRaces as AwardRaces | null,
        nextAwardHistory as AwardHistoryEntry[],
        nextSeasonHistory as SeasonHistoryEntry[],
        Object.values(nextSeasonViews).filter((entry): entry is SeasonArchiveEntry => isFullSeasonArchive(entry)),
        Object.values(nextSeasonViews).filter((entry): entry is ArchivedSeason => isArchivedSeasonView(entry)),
        nextRecordBook,
        nextRecordWatch,
        nextRivalries as Rivalry[],
        nextHallOfFame as HallOfFameEntryView[],
      );
      const resolvedNames = playerIds.length > 0 || teamIds.length > 0
        ? await worker.resolveHistoryDisplayNames(playerIds, teamIds)
        : EMPTY_DISPLAY_NAMES;

      setAwardRaces(nextAwardRaces as AwardRaces | null);
      setAwardHistory(nextAwardHistory as AwardHistoryEntry[]);
      setSeasonHistory(nextSeasonHistory as SeasonHistoryEntry[]);
      setSeasonViews(nextSeasonViews);
      setRecordBook(nextRecordBook);
      setRecordWatch(nextRecordWatch);
      setRivalries(nextRivalries as Rivalry[]);
      setHallOfFame(nextHallOfFame as HallOfFameEntryView[]);
      setFranchiseTimeline(nextTimeline as FranchiseTimelineEntryView[]);
      const liveEntries = (liveLeaderboardData ?? []) as LeaderboardEntry[];
      const storedEntries = (storedLeaderboardData ?? []) as LeaderboardEntry[];
      const nextBranches = (branchData ?? []) as BranchSaveView[];
      const nextTimelineComparisons = timelineRootSaveId && typeof worker.compareWithBranch === 'function'
        ? (
          await Promise.all(
            nextBranches.map((branch) => worker.compareWithBranch(timelineRootSaveId, branch.id)),
          )
        ).filter((entry): entry is TimelineComparison => entry != null)
        : [];
      const mergedLeaderboard = [
        ...liveEntries.filter((entry) => !storedEntries.some((stored) =>
          (activeSaveId != null && stored.id === activeSaveId)
          || (activeSaveSlot != null && stored.slotNumber === activeSaveSlot)
          || (stored.teamId === entry.teamId && stored.season === entry.season && stored.gmName === entry.gmName),
        )),
        ...storedEntries,
      ];

      setDynastyScore((dynastyData ?? null) as DynastyScoreSummary | null);
      setAchievements((achievementData ?? []) as AchievementView[]);
      setDynastyCards((cardsData ?? []) as DynastyCard[]);
      setLeaderboardEntries(mergedLeaderboard);
      setBranches(nextBranches);
      setTimelineComparisons(nextTimelineComparisons);
      setAllTimeLeaders((leadersData ?? null) as AllTimeLeadersView | null);
      setSelectedAchievementId((current) => current ?? (((achievementData ?? []) as AchievementView[])[0]?.id ?? null));
      setSelectedSeason((current) => current ?? initialSelectedSeason);
      setComparisonSeason((current) => current ?? initialComparisonSeason);
      setSeasonComparison((comparisonData ?? null) as SeasonComparisonView | null);
      setDisplayNames((resolvedNames ?? EMPTY_DISPLAY_NAMES) as HistoryDisplayNames);
    } catch (err) {
      logger.error('Failed to fetch history data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSaveId, activeSaveSlot, historyWorker, isInitialized, timelineRootSaveId, workerReady, worker, userTeamId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, day, season, phase]);

  useEffect(() => {
    if (!isInitialized || !workerReady || selectedSeason == null || comparisonSeason == null || selectedSeason === comparisonSeason) {
      return;
    }
    if (typeof worker.compareSeasons !== 'function') {
      return;
    }

    let cancelled = false;
    worker.compareSeasons(comparisonSeason, selectedSeason)
      .then((result) => {
        if (!cancelled) {
          setSeasonComparison((result ?? null) as SeasonComparisonView | null);
        }
      })
      .catch((err) => {
        logger.error('Failed to compare seasons:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [comparisonSeason, isInitialized, selectedSeason, worker, workerReady]);

  const availableSeasons = sortSeasonsDescending(uniqueStrings([
    ...seasonHistory.map((entry) => String(entry.season)),
    ...Object.keys(seasonViews),
  ]).map((value) => Number(value)));
  const selectedArchive = selectedSeason != null ? seasonViews[selectedSeason] ?? null : null;

  useEffect(() => {
    if (!selectedArchive) {
      setSelectedSeasonTeamId(null);
      return;
    }

    setSelectedSeasonTeamId((current) => {
      if (current && selectedArchive.standings.some((entry) => entry.teamId === current)) {
        return current;
      }
      return isFullSeasonArchive(selectedArchive)
        ? (selectedArchive.userSummary?.teamId ?? selectedArchive.standings[0]?.teamId ?? null)
        : (selectedArchive.standings[0]?.teamId ?? null);
    });
  }, [selectedArchive]);

  useEffect(() => {
    if (selectedHistoryTab === 'timeline' && branches.length === 0) {
      setSelectedHistoryTab('seasons');
    }
  }, [branches.length, selectedHistoryTab]);

  const playerName = (playerId: string) => displayNames.players[playerId] ?? playerId;
  const teamName = (teamId: string | null) => {
    if (!teamId) return 'Unknown team';
    return displayNames.teams[teamId] ?? teamId.toUpperCase();
  };
  const teamAbbreviation = (teamId: string) => getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
  const selectedAchievement = achievements.find((achievement) => achievement.id === selectedAchievementId) ?? achievements[0] ?? null;
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;
  const groupedStandings = groupArchiveStandings(selectedArchive);
  const visibleHistoryTabs = branches.length > 0
    ? HISTORY_TABS
    : HISTORY_TABS.filter((tab) => tab !== 'timeline');
  const selectedTeamStanding = selectedArchive?.standings.find((entry) => entry.teamId === selectedSeasonTeamId) ?? null;
  const selectedTeamFinancial = isFullSeasonArchive(selectedArchive)
    ? selectedArchive.financials.find((entry) => entry.teamId === selectedSeasonTeamId) ?? null
    : null;
  const selectedTeamSeries = isFullSeasonArchive(selectedArchive)
    ? selectedArchive.playoffSeries.filter((series) =>
      series.winnerTeamId === selectedSeasonTeamId || series.loserTeamId === selectedSeasonTeamId,
    )
    : [];
  const selectedTeamAwards = isFullSeasonArchive(selectedArchive)
    ? selectedArchive.awards.filter((entry) => entry.teamId === selectedSeasonTeamId)
    : [];
  const selectedTeamTransactions = isFullSeasonArchive(selectedArchive)
    ? selectedArchive.transactions.filter((entry) => entry.teamIds.includes(selectedSeasonTeamId ?? ''))
    : [];
  const selectedTeamDraftPicks = isFullSeasonArchive(selectedArchive)
    ? selectedArchive.draftClass.filter((entry) => entry.teamId === selectedSeasonTeamId)
    : [];

  return (
    <PageShell loading={loading && dynastyScore == null} skeleton={<HistorySkeleton />}>
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Franchise History
          </h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Award races, season recaps, and the grudges your franchise is building.
          </p>
        </div>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent-primary" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Dynasty Score</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[0.45fr_0.55fr]">
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-brand text-5xl text-accent-primary">{dynastyScore?.grade ?? 'F'}</div>
              <div className="mt-2 font-data text-sm text-dynasty-muted">
                <AnimatedNumber value={dynastyScore?.score ?? 0} formatter={(value) => `${Math.round(value)} total points`} />
              </div>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="font-heading text-xs text-dynasty-muted">Titles: {dynastyScore?.breakdown.championships ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Pennants: {dynastyScore?.breakdown.worldSeriesAppearances ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Playoff trips: {dynastyScore?.breakdown.playoffAppearances ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Division crowns: {dynastyScore?.breakdown.divisionTitles ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">90-win years: {dynastyScore?.breakdown.ninetyWinSeasons ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Award winners: {dynastyScore?.breakdown.awardWinners ?? 0}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-3">
          <div className="flex flex-wrap gap-2">
            {visibleHistoryTabs.map((tab) => (
              <button
                key={tab}
                className={`rounded border px-3 py-2 font-heading text-xs uppercase tracking-[0.16em] ${
                  selectedHistoryTab === tab
                    ? 'border-accent-primary bg-accent-primary/10 text-dynasty-textBright'
                    : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted'
                }`}
                onClick={() => setSelectedHistoryTab(tab)}
                type="button"
              >
                {tab === 'awards' ? 'Awards / HOF' : tab === 'legacy' ? 'Legacy' : tab === 'leaders' ? 'All-Time Leaders' : tab}
              </button>
            ))}
          </div>
        </section>

        {selectedHistoryTab === 'records' && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-accent-primary" />
                  <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Current Award Watch</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <AwardRaceCard title="MVP" entries={awardRaces?.mvp ?? []} playerName={playerName} teamName={teamName} />
                  <AwardRaceCard title="Cy Young" entries={awardRaces?.cyYoung ?? []} playerName={playerName} teamName={teamName} />
                  <AwardRaceCard title="Rookie of the Year" entries={awardRaces?.roy ?? []} playerName={playerName} teamName={teamName} />
                </div>
              </section>

              <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent-warning" />
                  <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Rivalry Watch</h2>
                </div>
                <div className="space-y-3">
                  {rivalries.length > 0 ? rivalries.map((rivalry) => (
                    <div key={rivalry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-heading text-sm text-dynasty-text">
                          {teamName(rivalry.teamA)} vs {teamName(rivalry.teamB)}
                        </div>
                        <div className={`font-data text-sm ${intensityTone(rivalry.intensity)}`}>
                          {rivalry.intensity}
                        </div>
                      </div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">
                        {rivalry.summary}
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div className="rounded border border-dynasty-border/70 px-2 py-2">
                          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Origin</div>
                          <div className="mt-1 font-heading text-xs text-dynasty-textBright">
                            {formatRivalryOrigin(rivalry.origin)}
                          </div>
                        </div>
                        <div className="rounded border border-dynasty-border/70 px-2 py-2">
                          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Current season</div>
                          <div className="mt-1 font-heading text-xs text-dynasty-textBright">
                            {teamAbbreviation(rivalry.teamA)} {rivalry.currentSeasonWinsA ?? 0}-{rivalry.currentSeasonWinsB ?? 0} {teamAbbreviation(rivalry.teamB)}
                          </div>
                        </div>
                        <div className="rounded border border-dynasty-border/70 px-2 py-2">
                          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Historical record</div>
                          <div className="mt-1 font-heading text-xs text-dynasty-textBright">
                            {teamAbbreviation(rivalry.teamA)} {rivalry.historicalWinsA ?? 0}-{rivalry.historicalWinsB ?? 0} {teamAbbreviation(rivalry.teamB)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rivalry.reasons.map((reason) => (
                          <span key={reason} className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase text-dynasty-muted">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                      Rivalries will appear once the standings tighten or postseason history starts to repeat.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent-info" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Records</h2>
              </div>
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr_0.8fr]">
                <RecordBookColumn
                  entries={recordBook.franchise}
                  playerName={playerName}
                  teamName={teamName}
                  title="Franchise Record Book"
                />
                <RecordBookColumn
                  entries={recordBook.league}
                  playerName={playerName}
                  teamName={teamName}
                  title="League Record Book"
                />
                <RecordWatchPanel
                  entries={recordWatch}
                  playerName={playerName}
                  teamName={teamName}
                />
              </div>
            </section>
          </div>
        )}

        {selectedHistoryTab === 'seasons' && (
          <div className="space-y-6">
            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-heading text-sm font-semibold text-dynasty-textBright">Season Browser</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">
                    Replay the shape of any year and compare it to the one that followed.
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 font-heading text-xs text-dynasty-muted">
                    Season
                    <select
                      className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 text-dynasty-textBright"
                      onChange={(event) => setSelectedSeason(Number(event.target.value))}
                      value={selectedSeason ?? ''}
                    >
                      {availableSeasons.map((availableSeason) => (
                        <option key={availableSeason} value={availableSeason}>Season {availableSeason}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 font-heading text-xs text-dynasty-muted">
                    Compare
                    <select
                      className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 text-dynasty-textBright"
                      onChange={(event) => setComparisonSeason(Number(event.target.value))}
                      value={comparisonSeason ?? ''}
                    >
                      {availableSeasons.filter((availableSeason) => availableSeason !== selectedSeason).map((availableSeason) => (
                        <option key={availableSeason} value={availableSeason}>Season {availableSeason}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {selectedArchive ? (
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-heading text-base text-dynasty-textBright">Season {selectedArchive.season} Archive</div>
                        <div className="flex items-center gap-3">
                          {!isArchivedSeasonView(selectedArchive) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isArchivedSeasonView(selectedArchive)) return;
                                const seasonHist = seasonHistory.find((s) => s.season === selectedArchive.season);
                                const recap = buildSeasonRecapData(selectedArchive, seasonHist, userTeamId, displayNames);
                                setRecapData(recap);
                              }}
                              className="focus-ring flex items-center gap-1.5 rounded border border-accent-primary/40 bg-accent-primary/10 px-2.5 py-1 font-heading text-xs text-accent-primary transition-colors hover:bg-accent-primary/20"
                            >
                              <Film className="h-3.5 w-3.5" />
                              Year in Review
                            </button>
                          )}
                          <div className="font-data text-xs text-dynasty-muted">
                            {formatSeasonViewRecord(selectedArchive)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 font-heading text-sm text-dynasty-text">
                        {formatSeasonViewPlayoffResult(selectedArchive)}
                      </div>
                      <div className="mt-3 space-y-2">
                        {getSeasonViewTimelineEvents(selectedArchive).map((event) => (
                          <div key={event} className="font-heading text-xs text-dynasty-muted">{event}</div>
                        ))}
                        {isArchivedSeasonView(selectedArchive) ? (
                          <div className="font-heading text-xs text-dynasty-muted">
                            Detailed transaction, draft, and payroll logs were archived to keep long dynasties fast.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                      <div className="font-heading text-sm text-dynasty-textBright">Compare Seasons</div>
                      {seasonComparison?.left && seasonComparison.right ? (
                        <div className="mt-3 space-y-3">
                          <div className="font-heading text-sm text-dynasty-text">
                            Season {seasonComparison.right.season} vs Season {seasonComparison.left.season}
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded border border-dynasty-border/70 px-3 py-2">
                              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Wins</div>
                              <div className="mt-1 font-data text-sm text-dynasty-textBright">{formatSignedMetric(seasonComparison.deltas.wins, ' wins')}</div>
                            </div>
                            <div className="rounded border border-dynasty-border/70 px-3 py-2">
                              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Payroll</div>
                              <div className="mt-1 font-data text-sm text-dynasty-textBright">
                                {formatMoney(
                                  isFullSeasonArchive(seasonComparison.right)
                                    ? seasonComparison.right.financials.find((entry) => entry.teamId === seasonComparison.userTeamId)?.payroll
                                    : null,
                                )}
                              </div>
                              <div className="mt-1 font-heading text-[11px] text-dynasty-muted">{formatMoney(seasonComparison.deltas.payroll)}</div>
                            </div>
                            <div className="rounded border border-dynasty-border/70 px-3 py-2">
                              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Budget</div>
                              <div className="mt-1 font-data text-sm text-dynasty-textBright">
                                {formatMoney(
                                  isFullSeasonArchive(seasonComparison.right)
                                    ? seasonComparison.right.financials.find((entry) => entry.teamId === seasonComparison.userTeamId)?.budget
                                    : null,
                                )}
                              </div>
                              <div className="mt-1 font-heading text-[11px] text-dynasty-muted">{formatMoney(seasonComparison.deltas.budget)}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 font-heading text-sm text-dynasty-muted">
                          Pick two archived seasons to compare.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {SEASON_BROWSER_TABS.map((tab) => (
                      <button
                        key={tab}
                        disabled={isArchivedSeasonView(selectedArchive) && (tab === 'transactions' || tab === 'draft' || tab === 'financials')}
                        className={`rounded border px-3 py-2 font-heading text-[11px] uppercase tracking-[0.16em] ${
                          selectedSeasonTab === tab
                            ? 'border-accent-primary bg-accent-primary/10 text-dynasty-textBright'
                            : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted'
                        } ${(isArchivedSeasonView(selectedArchive) && (tab === 'transactions' || tab === 'draft' || tab === 'financials')) ? 'cursor-not-allowed opacity-50' : ''}`}
                        onClick={() => setSelectedSeasonTab(tab)}
                        type="button"
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {selectedSeasonTab === 'standings' && (
                    <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
                      <div className="space-y-4">
                        {groupedStandings.map((group) => (
                          <div key={group.division} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                            <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">{group.label}</div>
                            <div className="mt-3 space-y-2">
                              {group.entries.map((entry) => (
                                <button
                                  key={entry.teamId}
                                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left ${
                                    selectedSeasonTeamId === entry.teamId
                                      ? 'border-accent-primary bg-accent-primary/10'
                                      : 'border-dynasty-border/70 bg-dynasty-surface/40'
                                  }`}
                                  onClick={() => setSelectedSeasonTeamId(entry.teamId)}
                                  type="button"
                                >
                                  <div>
                                    <div className="font-heading text-sm text-dynasty-text">{teamName(entry.teamId)}</div>
                                    <div className="mt-1 font-heading text-[11px] text-dynasty-muted">
                                      Rank {entry.divisionRank}
                                      {'gamesBack' in entry ? ` · GB ${entry.gamesBack}` : ''}
                                    </div>
                                  </div>
                                  <div className="font-data text-sm text-dynasty-textBright">{entry.wins}-{entry.losses}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                        <div className="font-heading text-sm text-dynasty-textBright">Team Season Detail</div>
                        {selectedSeasonTeamId && selectedTeamStanding ? (
                          <div className="mt-3 space-y-3">
                            <div>
                              <div className="font-heading text-base text-dynasty-text">{teamName(selectedSeasonTeamId)}</div>
                              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                                {divisionLabelForTeam(selectedSeasonTeamId)} · {selectedTeamStanding.wins}-{selectedTeamStanding.losses}
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded border border-dynasty-border/70 px-3 py-2">
                                <div className="font-heading text-[11px] uppercase text-dynasty-muted">Payroll</div>
                                <div className="mt-1 font-data text-sm text-dynasty-textBright">{formatMoney(selectedTeamFinancial?.payroll ?? null)}</div>
                              </div>
                              <div className="rounded border border-dynasty-border/70 px-3 py-2">
                                <div className="font-heading text-[11px] uppercase text-dynasty-muted">Budget</div>
                                <div className="mt-1 font-data text-sm text-dynasty-textBright">{formatMoney(selectedTeamFinancial?.budget ?? null)}</div>
                              </div>
                            </div>
                            {selectedTeamSeries.length > 0 && (
                              <div>
                                <div className="font-heading text-[11px] uppercase text-dynasty-muted">Playoff Path</div>
                                <div className="mt-2 space-y-2">
                                  {selectedTeamSeries.map((series, index) => (
                                    <div key={`${series.round}-${index}`} className="rounded border border-dynasty-border/70 px-3 py-2 font-heading text-xs text-dynasty-muted">
                                      {series.round} · {teamName(series.winnerTeamId)} def. {teamName(series.loserTeamId)} ({series.result})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedTeamAwards.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {selectedTeamAwards.map((award) => (
                                  <span key={`${award.award}-${award.playerId}`} className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase text-dynasty-muted">
                                    {award.league} {formatAwardLabel(award.award)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {selectedTeamTransactions.length > 0 && (
                              <div className="space-y-2">
                                {selectedTeamTransactions.slice(0, 3).map((entry) => (
                                  <div key={entry.headline} className="font-heading text-xs text-dynasty-muted">{entry.headline}</div>
                                ))}
                              </div>
                            )}
                            {selectedTeamDraftPicks.length > 0 && (
                              <div className="space-y-2">
                                {selectedTeamDraftPicks.map((pick) => (
                                  <div key={pick.playerId} className="font-heading text-xs text-dynasty-muted">
                                    Pick {pick.pickNumber}: {pick.playerName} · {pick.currentStatus}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 font-heading text-sm text-dynasty-muted">
                            Pick a team from the standings to inspect that season.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedSeasonTab === 'playoffs' && (
                    <div className="grid gap-3">
                      {isFullSeasonArchive(selectedArchive) ? selectedArchive.playoffSeries.map((series, index) => (
                        <div key={`${series.round}-${index}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-heading text-sm text-dynasty-text">{series.round}</div>
                            <div className="font-data text-xs text-dynasty-muted">{series.result}</div>
                          </div>
                          <div className="mt-2 font-heading text-sm text-dynasty-text">
                            {teamName(series.winnerTeamId)} def. {teamName(series.loserTeamId)}
                          </div>
                        </div>
                      )) : (
                        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                          <div className="font-heading text-sm text-dynasty-text">
                            {formatSeasonViewPlayoffResult(selectedArchive)}
                          </div>
                          <div className="mt-2 font-heading text-xs text-dynasty-muted">
                            Champion: {teamName(selectedArchive.championTeamId)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedSeasonTab === 'awards' && (
                    <div className="space-y-3">
                      {isFullSeasonArchive(selectedArchive) ? selectedArchive.awards.map((entry) => (
                        <div key={`${entry.award}-${entry.playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-heading text-sm text-dynasty-text">Season {entry.season} {entry.league} {formatAwardLabel(entry.award)}</div>
                            <div className="font-data text-xs text-dynasty-muted">{teamName(entry.teamId)}</div>
                          </div>
                          <div className="mt-2 font-heading text-sm text-dynasty-text">{playerName(entry.playerId)}</div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
                        </div>
                      )) : (
                        <>
                          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                            <div className="font-heading text-sm text-dynasty-text">MVP</div>
                            <div className="mt-2 font-heading text-xs text-dynasty-muted">{selectedArchive.mvpName ?? 'No archived MVP summary'}</div>
                          </div>
                          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                            <div className="font-heading text-sm text-dynasty-text">Cy Young</div>
                            <div className="mt-2 font-heading text-xs text-dynasty-muted">{selectedArchive.cyYoungName ?? 'No archived Cy Young summary'}</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {selectedSeasonTab === 'leaders' && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <LeaderList title="HR Leaders" leaders={selectedArchive.statLeaders.hr} playerName={playerName} teamName={teamName} />
                      <LeaderList title="RBI Leaders" leaders={selectedArchive.statLeaders.rbi} playerName={playerName} teamName={teamName} />
                      <LeaderList title="AVG Leaders" leaders={selectedArchive.statLeaders.avg} playerName={playerName} teamName={teamName} />
                      <LeaderList title="ERA Leaders" leaders={selectedArchive.statLeaders.era} playerName={playerName} teamName={teamName} />
                      <LeaderList title="Strikeout Leaders" leaders={selectedArchive.statLeaders.k} playerName={playerName} teamName={teamName} />
                      <LeaderList title="Win Leaders" leaders={selectedArchive.statLeaders.w} playerName={playerName} teamName={teamName} />
                    </div>
                  )}

                  {selectedSeasonTab === 'transactions' && (
                    <div className="space-y-3">
                      {isFullSeasonArchive(selectedArchive) ? selectedArchive.transactions.map((entry) => (
                        <div key={entry.headline} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-heading text-sm text-dynasty-text">{entry.headline}</div>
                            <div className="font-data text-xs text-dynasty-muted">{entry.impactScore.toFixed(1)} impact</div>
                          </div>
                          <div className="mt-2 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
                        </div>
                      )) : (
                        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                          Detailed transaction logs were archived for this season.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedSeasonTab === 'draft' && (
                    <div className="space-y-3">
                      {isFullSeasonArchive(selectedArchive) && selectedArchive.draftClass.length > 0 ? selectedArchive.draftClass.map((pick) => (
                        <div key={pick.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-heading text-sm text-dynasty-text">Pick {pick.pickNumber} · {pick.playerName}</div>
                            <div className="font-data text-xs text-dynasty-muted">{teamName(pick.teamId)}</div>
                          </div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">{pick.currentStatus}</div>
                        </div>
                      )) : (
                        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                          {isFullSeasonArchive(selectedArchive)
                            ? 'No draft class has been archived for this season yet.'
                            : 'Detailed draft logs were archived for this season.'}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedSeasonTab === 'financials' && (
                    <div className="space-y-3">
                      {isFullSeasonArchive(selectedArchive) ? selectedArchive.financials.map((entry) => (
                        <div key={entry.teamId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-heading text-sm text-dynasty-text">{teamName(entry.teamId)}</div>
                            <div className="font-data text-xs text-dynasty-muted">{formatMoney(entry.payroll)}</div>
                          </div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">Budget {formatMoney(entry.budget)}</div>
                        </div>
                      )) : (
                        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                          Detailed payroll archives were compressed for this season.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <EmptyStatePanel
                  description="Complete a season to unlock the full archive browser."
                  title="No archived seasons yet"
                  actionLabel="Back to Dashboard"
                  actionHref="/MBD/dashboard"
                />
              )}
            </section>
          </div>
        )}

        {selectedHistoryTab === 'leaders' && (
          <div className="space-y-6">
            {allTimeLeaders ? (
              <>
                <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent-primary" />
                    <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Career Batting Leaders</h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-3">
                    <AllTimeLeaderColumn title="Hits" entries={allTimeLeaders.batting.hits} />
                    <AllTimeLeaderColumn title="Home Runs" entries={allTimeLeaders.batting.hr} />
                    <AllTimeLeaderColumn title="RBI" entries={allTimeLeaders.batting.rbi} />
                  </div>
                </section>
                <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-accent-info" />
                    <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Career Pitching Leaders</h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <AllTimeLeaderColumn title="Wins" entries={allTimeLeaders.pitching.wins} />
                    <AllTimeLeaderColumn title="Strikeouts" entries={allTimeLeaders.pitching.strikeouts} />
                    <AllTimeLeaderColumn title="ERA (min 200 IP)" entries={allTimeLeaders.pitching.era} />
                    <AllTimeLeaderColumn title="Saves" entries={allTimeLeaders.pitching.saves} />
                  </div>
                </section>
              </>
            ) : (
              <EmptyStatePanel
                title="No career stats recorded yet"
                description="Complete a full season to start building the all-time leaderboards."
              />
            )}
          </div>
        )}

        {selectedHistoryTab === 'timeline' && (
          <div className="space-y-6">
            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-accent-success" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">What-If Timeline Branches</h2>
              </div>
              <div className="space-y-4">
                {timelineComparisons.length > 0 ? timelineComparisons.map((comparison) => (
                  <TimelineComparisonPanel key={comparison.branchMeta.id} comparison={comparison} />
                )) : (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                    No what-if branches are available for this save.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-accent-success" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Franchise Timeline</h2>
              </div>
              <div className="space-y-3">
                {franchiseTimeline.length > 0 ? franchiseTimeline.map((entry) => (
                  <div key={entry.season} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading text-sm text-dynasty-text">Season {entry.season}</div>
                      <div className="font-data text-xs text-dynasty-muted">Dynasty score {entry.dynastyScore}</div>
                    </div>
                    <div className="mt-1 font-heading text-sm text-dynasty-muted">
                      {entry.record} · {entry.playoffResult} {entry.championship ? '· Title' : ''}
                    </div>
                    {entry.keyAcquisitions.length > 0 && (
                      <div className="mt-3 font-heading text-xs text-dynasty-muted">
                        Added: {entry.keyAcquisitions.join(' | ')}
                      </div>
                    )}
                    {entry.keyDepartures.length > 0 && (
                      <div className="mt-2 font-heading text-xs text-dynasty-muted">
                        Lost: {entry.keyDepartures.join(' | ')}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                    The franchise timeline starts once the first season closes.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {selectedHistoryTab === 'legacy' && (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent-warning" />
                  <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Dynasty Cards</h2>
                </div>
                {dynastyCards[0] ? (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(dynastyCards[0]!.textSummary);
                    }}
                    className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-text hover:bg-dynasty-elevated"
                  >
                    Copy Latest Summary
                  </button>
                ) : null}
              </div>
              <div className="space-y-3">
                {dynastyCards.length > 0 ? dynastyCards.map((card) => (
                  <div key={card.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-heading text-sm text-dynasty-textBright">{card.title}</div>
                        <div className="mt-1 font-data text-xs text-dynasty-muted">{card.subtitle}</div>
                      </div>
                      <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                        {card.generatedAt}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {card.stats.map((stat) => (
                        <div key={`${card.id}-${stat.label}`} className="font-heading text-xs text-dynasty-muted">
                          {stat.label}: <span className="text-dynasty-text">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                    {card.highlights.length > 0 ? (
                      <div className="mt-3 font-heading text-xs text-dynasty-muted">
                        {card.highlights.join(' | ')}
                      </div>
                    ) : null}
                  </div>
                )) : (
                  <EmptyStatePanel
                    title="No legacy cards yet"
                    description="Season recaps, championships, and career-overview cards appear here once those moments are recorded."
                  />
                )}
              </div>
            </section>

            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent-success" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Local Leaderboard</h2>
              </div>
              <div className="space-y-3">
                {leaderboardEntries.length > 0 ? leaderboardEntries.map((entry, index) => (
                  <div key={entry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-heading text-sm text-dynasty-textBright">
                          #{index + 1} · {entry.gmName}
                        </div>
                        <div className="mt-1 font-data text-xs text-dynasty-muted">
                          {entry.teamName} · Season {entry.season} · {entry.record}
                        </div>
                      </div>
                      <div className="font-brand text-2xl text-accent-primary">{entry.score}</div>
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
                  </div>
                )) : (
                  <EmptyStatePanel
                    title="No leaderboard entries yet"
                    description="Save snapshots populate the cross-save leaderboard automatically."
                  />
                )}
              </div>
            </section>
          </div>
        )}

        {selectedHistoryTab === 'awards' && (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-accent-success" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Hall of Fame</h2>
              </div>
              <div className="space-y-3">
                {hallOfFame.length > 0 ? hallOfFame.map((entry) => (
                  <div key={`${entry.playerId}-${entry.inductionSeason}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading text-sm text-dynasty-text">{entry.playerName}</div>
                      <div className="font-data text-xs text-dynasty-muted">Season {entry.inductionSeason}</div>
                    </div>
                    <div className="mt-1 font-heading text-xs text-dynasty-muted">
                      {entry.position} · {entry.seasonsPlayed} seasons · {entry.score} score
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-muted">
                      {entry.teamIds.map((teamId) => teamName(teamId)).join(', ')}
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-muted">
                      {entry.careerStats.batting
                        ? `${entry.careerStats.batting.hits} hits · ${entry.careerStats.batting.hr} HR · ${entry.careerStats.batting.rbi} RBI`
                        : `${entry.careerStats.pitching?.wins ?? 0} wins · ${entry.careerStats.pitching?.strikeouts ?? 0} strikeouts`}
                    </div>
                  </div>
                )) : (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                    Retired legends will appear here once the Hall of Fame begins to fill.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent-warning" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Trophy Room</h2>
                <div className="ml-auto font-data text-[11px] text-dynasty-muted">
                  {unlockedAchievements}/{achievements.length}
                </div>
              </div>
              {unlockedAchievements === 0 ? (
                <div className="mb-4">
                  <EmptyStatePanel
                    description="Keep pushing seasons, titles, and milestones to fill the trophy room."
                    title="No achievements unlocked yet"
                  />
                </div>
              ) : null}
              {selectedAchievement && (
                <div className="mb-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-heading text-sm text-dynasty-textBright">{selectedAchievement.name}</div>
                      <div className="mt-1 font-heading text-xs uppercase text-dynasty-muted">{selectedAchievement.category}</div>
                    </div>
                    <div className={`font-data text-xs ${selectedAchievement.unlocked ? 'text-accent-warning' : 'text-dynasty-muted'}`}>
                      {selectedAchievement.unlocked ? (selectedAchievement.unlockedAt ?? 'Unlocked') : 'Locked'}
                    </div>
                  </div>
                  <div className="mt-2 font-heading text-sm text-dynasty-text">{selectedAchievement.description}</div>
                  <div className="mt-3">
                    <ProgressFill
                      toneClassName={selectedAchievement.unlocked ? 'bg-accent-warning' : 'bg-accent-primary'}
                      trackClassName="bg-dynasty-surface"
                      value={Math.max(6, Math.min(100, (selectedAchievement.progress.current / Math.max(1, selectedAchievement.progress.target)) * 100))}
                    />
                  </div>
                  <div className="mt-2 font-data text-xs text-dynasty-muted">
                    {selectedAchievement.progress.current} / {selectedAchievement.progress.target}
                    {selectedAchievement.progress.summary ? ` ${selectedAchievement.progress.summary}` : ''}
                  </div>
                  {selectedAchievement.unlockSummary && (
                    <div className="mt-2 font-heading text-xs text-dynasty-muted">
                      {selectedAchievement.unlockSummary}
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {achievements.map((achievement) => (
                  <button
                    key={achievement.id}
                    className={`rounded border px-3 py-3 text-left transition-colors ${
                      achievement.unlocked
                        ? 'border-accent-warning/40 bg-accent-warning/10'
                        : 'border-dynasty-border bg-dynasty-elevated'
                    } ${selectedAchievement?.id === achievement.id ? 'ring-1 ring-accent-primary' : ''}`}
                    onClick={() => setSelectedAchievementId(achievement.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading text-sm text-dynasty-text">{achievement.name}</div>
                      <div className="font-data text-[10px] uppercase text-dynasty-muted">{achievement.category}</div>
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-muted">{achievement.description}</div>
                    <div className="mt-3 font-data text-xs text-dynasty-muted">
                      {achievement.progress.current} / {achievement.progress.target}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 xl:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-accent-info" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Award Ledger</h2>
              </div>
              <div className="space-y-3">
                {awardHistory.length > 0 ? awardHistory.map((entry) => (
                  <div key={`${entry.season}-${entry.award}-${entry.playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading text-sm text-dynasty-text">
                        Season {entry.season} {entry.league} {formatAwardLabel(entry.award)}
                      </div>
                      <div className="font-data text-xs text-dynasty-muted">
                        {teamName(entry.teamId)}
                      </div>
                    </div>
                    <div className="mt-2 font-heading text-sm text-dynasty-text">
                      {playerName(entry.playerId)}
                    </div>
                    <div className="mt-1 font-heading text-xs text-dynasty-muted">
                      {entry.summary}
                    </div>
                  </div>
                )) : (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                    No awards recorded yet. Complete a season to start building the ledger.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {recapData && (
        <SeasonRecapModal data={recapData} onDismiss={() => setRecapData(null)} />
      )}
    </PageShell>
  );
}

function AwardRaceCard({
  title,
  entries,
  playerName,
  teamName,
}: {
  title: string;
  entries: AwardRaceEntry[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{title}</div>
      <div className="mt-3 space-y-3">
        {entries.length > 0 ? entries.slice(0, 3).map((entry, index) => (
          <div key={`${title}-${entry.playerId}`} className="border-b border-dynasty-border/50 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="font-data text-xs text-dynasty-muted">#{index + 1}</div>
              <div className="font-data text-xs text-dynasty-muted">{teamName(entry.teamId)}</div>
            </div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">{playerName(entry.playerId)}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
          </div>
        )) : (
          <div className="font-heading text-sm text-dynasty-muted">
            No race data yet.
          </div>
        )}
      </div>
    </div>
  );
}

function RecordBookColumn({
  title,
  entries,
  playerName,
  teamName,
}: {
  title: string;
  entries: RecordBookEntry[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  return (
    <div>
      <div className="mb-3 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
        {title}
      </div>
      <div className="space-y-3">
        {entries.length > 0 ? entries.map((entry) => (
          <div key={entry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-heading text-sm text-dynasty-textBright">{entry.label}</div>
            {entry.qualifier && (
              <div className="mt-1 font-heading text-[11px] uppercase text-dynasty-muted">
                {entry.qualifier}
              </div>
            )}
            <div className="mt-2 space-y-2">
              {entry.holders.length > 0 ? entry.holders.map((holder, index) => (
                <div key={`${entry.id}-${holder.playerId ?? 'team'}-${index}`} className="flex items-start justify-between gap-3">
                  <div>
                    {holder.playerId ? (
                      <Link className="font-heading text-sm text-accent-primary hover:text-accent-primary/80" to={`/players/${holder.playerId}`}>
                        {playerName(holder.playerId)}
                      </Link>
                    ) : (
                      <div className="font-heading text-sm text-dynasty-text">
                        {teamName(holder.teamId)}
                      </div>
                    )}
                    <div className="mt-1 font-heading text-xs text-dynasty-muted">
                      {holder.teamId ? teamName(holder.teamId) : 'Team record'}
                      {holder.season ? ` · Season ${holder.season}` : ''}
                    </div>
                  </div>
                  <div className="font-data text-sm text-dynasty-textBright">{holder.displayValue}</div>
                </div>
              )) : (
                <div className="font-heading text-xs text-dynasty-muted">
                  {entry.trackingFromSeason
                    ? `Tracking from Season ${entry.trackingFromSeason}.`
                    : 'No official holder recorded yet.'}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
            No records tracked yet.
          </div>
        )}
      </div>
    </div>
  );
}

function RecordWatchPanel({
  entries,
  playerName,
  teamName,
}: {
  entries: RecordWatchEntry[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  return (
    <div>
      <div className="mb-3 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
        Active Record Watch
      </div>
      <div className="space-y-3">
        {entries.length > 0 ? entries.map((entry) => (
          <div key={entry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="flex items-center justify-between gap-3">
              <Link className="font-heading text-sm text-accent-primary hover:text-accent-primary/80" to={`/players/${entry.playerId}`}>
                {playerName(entry.playerId)}
              </Link>
              <div className="font-data text-xs text-dynasty-muted">{teamName(entry.teamId)}</div>
            </div>
            <div className="mt-2 font-heading text-xs uppercase text-dynasty-muted">
              {entry.recordLabel}
            </div>
            <div className="mt-2">
              <ProgressFill
                toneClassName="bg-accent-info"
                trackClassName="bg-dynasty-surface"
                value={Math.max(6, Math.min(100, entry.progressRatio * 100))}
              />
            </div>
            <div className="mt-2 font-data text-xs text-dynasty-textBright">
              {entry.currentValue} now · {entry.projectedValue} projected
            </div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">
              {entry.summary}
            </div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
            No one is within record range right now.
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderList({
  title,
  leaders,
  playerName,
  teamName,
}: {
  title: string;
  leaders: SeasonStatLeader[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  if (leaders.length === 0) return null;

  return (
    <div className="rounded border border-dynasty-border/70 p-3">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{title}</div>
      <div className="mt-2 space-y-2">
        {leaders.map((leader) => (
          <div key={`${title}-${leader.playerId}`} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-heading text-sm text-dynasty-text">{playerName(leader.playerId)}</div>
              <div className="font-heading text-[11px] text-dynasty-muted">{teamName(leader.teamId)}</div>
            </div>
            <div className="font-data text-sm text-dynasty-textBright">{leader.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllTimeLeaderColumn({
  title,
  entries,
}: {
  title: string;
  entries: AllTimeLeaderEntry[];
}) {
  return (
    <div>
      <div className="mb-3 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
        {title}
      </div>
      <div className="space-y-1">
        {entries.length > 0 ? entries.map((entry, index) => (
          <div key={`${title}-${entry.playerId}`} className="flex items-center gap-3 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
            <div className="w-5 shrink-0 font-data text-xs text-dynasty-muted">{index + 1}</div>
            <Link
              className="min-w-0 flex-1 truncate font-heading text-sm text-accent-primary hover:text-accent-primary/80"
              to={`/players/${entry.playerId}`}
            >
              {entry.playerName}
            </Link>
            <div className="shrink-0 font-data text-sm text-dynasty-textBright">{entry.display}</div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3 font-heading text-sm text-dynasty-muted">
            No leaders recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
