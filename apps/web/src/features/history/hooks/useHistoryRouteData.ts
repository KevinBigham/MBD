import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { logger } from '@/shared/lib/logger';
import type {
  AwardHistoryEntry,
  DynastyCard,
  RecordWatchEntry,
  Rivalry,
  SeasonArchiveEntry,
  SeasonHistoryEntry,
  TimelineComparison,
} from '@mbd/contracts';
import type { AwardRaces } from '@mbd/sim-core';
import type { LeaderboardEntry } from '@/shared/lib/saveSystem';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';
import type { AllTimeLeadersView } from '../components/AllTimeLeadersPanel';
import type { DynastyScoreSummary } from '../components/DynastyScorePanel';
import type { AchievementSummary } from '../components/TrophyRoomPanel';
import type { RecordBookView } from '../components/RecordsPanel';
import type { SeasonComparisonView } from '../components/SeasonComparisonCard';
import type { HallOfFameEntryView } from '../components/HallOfFamePanel';
import type { DynastyTimelineEntryLike } from '../lib/buildDynastyTimelineChapters';
import {
  collectHistoryIds,
  EMPTY_DISPLAY_NAMES,
  isArchivedSeasonView,
  isFullSeasonArchive,
  sortSeasonsDescending,
  uniqueStrings,
  type HistoryDisplayNames,
} from '../lib/historyPageTransforms';

export interface BranchSaveView {
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

interface UseHistoryRouteDataOptions {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  compareSeasons?: (leftSeason: number, rightSeason: number) => Promise<unknown>;
  compareWithBranch?: (parentSaveId: string, branchSaveId: string) => Promise<unknown>;
  day: number;
  getAchievements: () => Promise<unknown>;
  getAllTimeLeaders?: () => Promise<unknown>;
  getAwardHistory: () => Promise<unknown>;
  getAwardRaces: () => Promise<unknown>;
  getBranches?: (parentSaveId: string) => Promise<unknown>;
  getDynastyCards?: () => Promise<unknown>;
  getDynastyLeaderboard?: () => Promise<unknown>;
  getDynastyScore: () => Promise<unknown>;
  getFranchiseTimeline: () => Promise<unknown>;
  getHallOfFame: () => Promise<unknown>;
  getHistoryOverview: () => Promise<unknown>;
  getRecordBook?: (teamId?: string) => Promise<unknown>;
  getRecordWatchList?: (teamId?: string) => Promise<unknown>;
  getRivalries: (teamId?: string) => Promise<unknown>;
  getSeasonArchive?: (season?: number) => Promise<unknown>;
  getSeasonHistory: () => Promise<unknown>;
  isInitialized: boolean;
  listLeaderboardEntries: () => Promise<LeaderboardEntry[]>;
  phase: string;
  resolveHistoryDisplayNames: (playerIds: string[], teamIds: string[]) => Promise<unknown>;
  season: number;
  userTeamId: string | null;
  workerReady: boolean;
}

interface UseHistoryRouteDataResult {
  achievements: AchievementSummary[];
  allTimeLeaders: AllTimeLeadersView | null;
  awardHistory: AwardHistoryEntry[];
  awardRaces: AwardRaces | null;
  branches: BranchSaveView[];
  comparisonSeason: number | null;
  displayNames: HistoryDisplayNames;
  dynastyCards: DynastyCard[];
  dynastyScore: DynastyScoreSummary | null;
  fetchHistory: () => Promise<void>;
  franchiseTimeline: DynastyTimelineEntryLike[];
  hallOfFame: HallOfFameEntryView[];
  leaderboardEntries: LeaderboardEntry[];
  loading: boolean;
  recordBook: RecordBookView;
  recordWatch: RecordWatchEntry[];
  rivalries: Rivalry[];
  seasonComparison: SeasonComparisonView | null;
  seasonHistory: SeasonHistoryEntry[];
  seasonViews: Record<number, HistorySeasonView>;
  selectedAchievementId: string | null;
  selectedSeason: number | null;
  setComparisonSeason: Dispatch<SetStateAction<number | null>>;
  setSeasonComparison: Dispatch<SetStateAction<SeasonComparisonView | null>>;
  setSelectedAchievementId: Dispatch<SetStateAction<string | null>>;
  setSelectedSeason: Dispatch<SetStateAction<number | null>>;
  timelineComparisons: TimelineComparison[];
}

export function useHistoryRouteData({
  activeSaveId,
  activeSaveSlot,
  compareSeasons,
  compareWithBranch,
  day,
  getAchievements,
  getAllTimeLeaders,
  getAwardHistory,
  getAwardRaces,
  getBranches,
  getDynastyCards,
  getDynastyLeaderboard,
  getDynastyScore,
  getFranchiseTimeline,
  getHallOfFame,
  getHistoryOverview,
  getRecordBook,
  getRecordWatchList,
  getRivalries,
  getSeasonArchive,
  getSeasonHistory,
  isInitialized,
  listLeaderboardEntries,
  phase,
  resolveHistoryDisplayNames,
  season,
  userTeamId,
  workerReady,
}: UseHistoryRouteDataOptions): UseHistoryRouteDataResult {
  const [awardRaces, setAwardRaces] = useState<AwardRaces | null>(null);
  const [awardHistory, setAwardHistory] = useState<AwardHistoryEntry[]>([]);
  const [seasonHistory, setSeasonHistory] = useState<SeasonHistoryEntry[]>([]);
  const [seasonViews, setSeasonViews] = useState<Record<number, HistorySeasonView>>({});
  const [recordBook, setRecordBook] = useState<RecordBookView>({ franchise: [], league: [] });
  const [recordWatch, setRecordWatch] = useState<RecordWatchEntry[]>([]);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntryView[]>([]);
  const [franchiseTimeline, setFranchiseTimeline] = useState<DynastyTimelineEntryLike[]>([]);
  const [dynastyScore, setDynastyScore] = useState<DynastyScoreSummary | null>(null);
  const [achievements, setAchievements] = useState<AchievementSummary[]>([]);
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [comparisonSeason, setComparisonSeason] = useState<number | null>(null);
  const [seasonComparison, setSeasonComparison] = useState<SeasonComparisonView | null>(null);
  const [displayNames, setDisplayNames] = useState<HistoryDisplayNames>(EMPTY_DISPLAY_NAMES);
  const [dynastyCards, setDynastyCards] = useState<DynastyCard[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [branches, setBranches] = useState<BranchSaveView[]>([]);
  const [timelineComparisons, setTimelineComparisons] = useState<TimelineComparison[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<AllTimeLeadersView | null>(null);
  const [loading, setLoading] = useState(true);
  const timelineRootSaveId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : activeSaveId;

  const fetchHistory = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    try {
      const recordBookPromise = typeof getRecordBook === 'function'
        ? getRecordBook(userTeamId ?? undefined)
        : Promise.resolve({ franchise: [], league: [] });
      const recordWatchPromise = typeof getRecordWatchList === 'function'
        ? getRecordWatchList(userTeamId ?? undefined)
        : Promise.resolve([]);
      const [races, awards, seasons, historyOverviewData, recordBookData, recordWatchData, rivalriesData, hallOfFameData, timelineData, dynastyData, achievementData, cardsData, liveLeaderboardData, storedLeaderboardData, branchData, leadersData] = await Promise.all([
        getAwardRaces(),
        getAwardHistory(),
        getSeasonHistory(),
        getHistoryOverview(),
        recordBookPromise,
        recordWatchPromise,
        getRivalries(userTeamId ?? undefined),
        getHallOfFame(),
        getFranchiseTimeline(),
        getDynastyScore(),
        getAchievements(),
        typeof getDynastyCards === 'function' ? getDynastyCards() : Promise.resolve([]),
        typeof getDynastyLeaderboard === 'function' ? getDynastyLeaderboard() : Promise.resolve([]),
        listLeaderboardEntries(),
        timelineRootSaveId && typeof getBranches === 'function'
          ? getBranches(timelineRootSaveId)
          : Promise.resolve([]),
        typeof getAllTimeLeaders === 'function' ? getAllTimeLeaders() : Promise.resolve(null),
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
          (typeof getSeasonArchive === 'function'
            ? await Promise.all(
              sortSeasonsDescending((nextSeasonHistory as SeasonHistoryEntry[]).map((entry) => entry.season))
                .map(async (archiveSeason) => [archiveSeason, await getSeasonArchive(archiveSeason)] as const),
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
        typeof compareSeasons === 'function'
        && initialSelectedSeason != null
        && initialComparisonSeason != null
        && initialComparisonSeason !== initialSelectedSeason
      )
        ? await compareSeasons(initialComparisonSeason, initialSelectedSeason)
        : null;
      const { playerIds, teamIds } = collectHistoryIds(
        nextAwardRaces as AwardRaces | null,
        nextAwardHistory as AwardHistoryEntry[],
        nextSeasonHistory as SeasonHistoryEntry[],
        nextTimeline as DynastyTimelineEntryLike[],
        Object.values(nextSeasonViews).filter(isFullSeasonArchive),
        Object.values(nextSeasonViews).filter(isArchivedSeasonView),
        nextRecordBook,
        nextRecordWatch,
        nextRivalries as Rivalry[],
        nextHallOfFame as HallOfFameEntryView[],
      );
      const resolvedNames = playerIds.length > 0 || teamIds.length > 0
        ? await resolveHistoryDisplayNames(playerIds, teamIds)
        : EMPTY_DISPLAY_NAMES;

      setAwardRaces(nextAwardRaces as AwardRaces | null);
      setAwardHistory(nextAwardHistory as AwardHistoryEntry[]);
      setSeasonHistory(nextSeasonHistory as SeasonHistoryEntry[]);
      setSeasonViews(nextSeasonViews);
      setRecordBook(nextRecordBook);
      setRecordWatch(nextRecordWatch);
      setRivalries(nextRivalries as Rivalry[]);
      setHallOfFame(nextHallOfFame as HallOfFameEntryView[]);
      setFranchiseTimeline(nextTimeline as DynastyTimelineEntryLike[]);
      const liveEntries = (liveLeaderboardData ?? []) as LeaderboardEntry[];
      const storedEntries = (storedLeaderboardData ?? []) as LeaderboardEntry[];
      const nextBranches = (branchData ?? []) as BranchSaveView[];
      const nextTimelineComparisons = timelineRootSaveId && typeof compareWithBranch === 'function'
        ? (
          await Promise.all(
            nextBranches.map((branch) => compareWithBranch(timelineRootSaveId, branch.id)),
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
      setAchievements((achievementData ?? []) as AchievementSummary[]);
      setDynastyCards((cardsData ?? []) as DynastyCard[]);
      setLeaderboardEntries(mergedLeaderboard);
      setBranches(nextBranches);
      setTimelineComparisons(nextTimelineComparisons);
      setAllTimeLeaders((leadersData ?? null) as AllTimeLeadersView | null);
      setSelectedAchievementId((current) => current ?? (((achievementData ?? []) as AchievementSummary[])[0]?.id ?? null));
      setSelectedSeason((current) => current ?? initialSelectedSeason);
      setComparisonSeason((current) => current ?? initialComparisonSeason);
      setSeasonComparison((comparisonData ?? null) as SeasonComparisonView | null);
      setDisplayNames((resolvedNames ?? EMPTY_DISPLAY_NAMES) as HistoryDisplayNames);
    } catch (err) {
      logger.error('Failed to fetch history data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    activeSaveId,
    activeSaveSlot,
    compareSeasons,
    compareWithBranch,
    getAchievements,
    getAllTimeLeaders,
    getAwardHistory,
    getAwardRaces,
    getBranches,
    getDynastyCards,
    getDynastyLeaderboard,
    getDynastyScore,
    getFranchiseTimeline,
    getHallOfFame,
    getHistoryOverview,
    getRecordBook,
    getRecordWatchList,
    getRivalries,
    getSeasonArchive,
    getSeasonHistory,
    isInitialized,
    listLeaderboardEntries,
    resolveHistoryDisplayNames,
    timelineRootSaveId,
    userTeamId,
    workerReady,
  ]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory, day, season, phase]);

  useEffect(() => {
    if (!isInitialized || !workerReady || selectedSeason == null || comparisonSeason == null || selectedSeason === comparisonSeason) {
      return;
    }
    if (typeof compareSeasons !== 'function') {
      return;
    }

    let cancelled = false;
    compareSeasons(comparisonSeason, selectedSeason)
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
  }, [comparisonSeason, compareSeasons, isInitialized, selectedSeason, workerReady]);

  return {
    achievements,
    allTimeLeaders,
    awardHistory,
    awardRaces,
    branches,
    comparisonSeason,
    displayNames,
    dynastyCards,
    dynastyScore,
    fetchHistory,
    franchiseTimeline,
    hallOfFame,
    leaderboardEntries,
    loading,
    recordBook,
    recordWatch,
    rivalries,
    seasonComparison,
    seasonHistory,
    seasonViews,
    selectedAchievementId,
    selectedSeason,
    setComparisonSeason,
    setSeasonComparison,
    setSelectedAchievementId,
    setSelectedSeason,
    timelineComparisons,
  };
}
