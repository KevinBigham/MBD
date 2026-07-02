import { useEffect, useMemo, useState } from 'react';
import { getTeamById } from '@mbd/sim-core';
import type { HistoryPageContentProps } from '../components/HistoryPageContent';
import type { SeasonBrowserTab } from '../components/SeasonBrowserTabs';
import type { SeasonRecapData } from '../components/SeasonRecapModal';
import {
  buildDynastyTimelineChapters,
} from '../lib/buildDynastyTimelineChapters';
import {
  buildSeasonRecapData,
  divisionLabelForTeam,
  formatAwardLabel,
  formatMoney,
  groupArchiveStandings,
  HISTORY_TABS,
  isFullSeasonArchive,
  sortSeasonsDescending,
  uniqueStrings,
  type HistoryTab,
} from '../lib/historyPageTransforms';
import type { useHistoryRouteData } from './useHistoryRouteData';

type HistoryRouteData = ReturnType<typeof useHistoryRouteData>;
export type HistoryPagePresentationRouteData = Pick<
  HistoryRouteData,
  | 'achievements'
  | 'allTimeLeaders'
  | 'awardHistory'
  | 'awardRaces'
  | 'branches'
  | 'comparisonSeason'
  | 'displayNames'
  | 'dynastyCards'
  | 'dynastyScore'
  | 'franchiseTimeline'
  | 'hallOfFame'
  | 'leaderboardEntries'
  | 'recordBook'
  | 'recordWatch'
  | 'rivalries'
  | 'seasonComparison'
  | 'seasonHistory'
  | 'seasonViews'
  | 'selectedAchievementId'
  | 'selectedSeason'
  | 'setComparisonSeason'
  | 'setSelectedAchievementId'
  | 'setSelectedSeason'
  | 'timelineComparisons'
>;

interface UseHistoryPagePresentationOptions {
  onCopyLatestSummary: (textSummary: string) => void;
  routeData: HistoryPagePresentationRouteData;
  userTeamId: string | null;
}

interface UseHistoryPagePresentationResult {
  contentProps: HistoryPageContentProps;
  onDismissSeasonRecap: () => void;
  recapData: SeasonRecapData | null;
}

export function useHistoryPagePresentation({
  onCopyLatestSummary,
  routeData,
  userTeamId,
}: UseHistoryPagePresentationOptions): UseHistoryPagePresentationResult {
  const {
    achievements,
    allTimeLeaders,
    awardHistory,
    awardRaces,
    branches,
    comparisonSeason,
    displayNames,
    dynastyCards,
    dynastyScore,
    franchiseTimeline,
    hallOfFame,
    leaderboardEntries,
    recordBook,
    recordWatch,
    rivalries,
    seasonComparison,
    seasonHistory,
    seasonViews,
    selectedAchievementId,
    selectedSeason,
    setComparisonSeason,
    setSelectedAchievementId,
    setSelectedSeason,
    timelineComparisons,
  } = routeData;
  const [selectedHistoryTab, setSelectedHistoryTab] = useState<HistoryTab>('seasons');
  const [selectedSeasonTab, setSelectedSeasonTab] = useState<SeasonBrowserTab>('standings');
  const [selectedSeasonTeamId, setSelectedSeasonTeamId] = useState<string | null>(null);
  const [recapData, setRecapData] = useState<SeasonRecapData | null>(null);
  const [expandedTimelineChapterId, setExpandedTimelineChapterId] = useState<string | null>(null);

  const dynastyTimelineChapters = useMemo(() => buildDynastyTimelineChapters({
    franchiseTimeline,
    seasonViews,
    seasonHistory,
  }), [franchiseTimeline, seasonHistory, seasonViews]);

  useEffect(() => {
    if (dynastyTimelineChapters.length === 0) {
      setExpandedTimelineChapterId(null);
      return;
    }

    setExpandedTimelineChapterId((current) =>
      current && dynastyTimelineChapters.some((chapter) => chapter.id === current)
        ? current
        : dynastyTimelineChapters[0]!.id,
    );
  }, [dynastyTimelineChapters]);

  const availableSeasons = useMemo(() => sortSeasonsDescending(uniqueStrings([
    ...seasonHistory.map((entry) => String(entry.season)),
    ...Object.keys(seasonViews),
  ]).map((value) => Number(value))), [seasonHistory, seasonViews]);
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
  const groupedStandings = groupArchiveStandings(selectedArchive);

  function openTimelineSeasonRecap(targetSeason: number) {
    const archive = seasonViews[targetSeason] ?? null;
    if (!userTeamId || !isFullSeasonArchive(archive)) {
      return;
    }

    const seasonHist = seasonHistory.find((entry) => entry.season === targetSeason);
    setRecapData(buildSeasonRecapData(archive, seasonHist, userTeamId, displayNames));
  }

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

  return {
    contentProps: {
      achievements,
      allTimeLeaders,
      availableSeasons,
      awardHistory,
      awardRaces,
      comparisonSeason,
      divisionLabelForTeam,
      dynastyCards,
      dynastyScore,
      dynastyTimelineChapters,
      expandedTimelineChapterId,
      formatAwardLabel,
      formatMoney,
      groupedStandings,
      hallOfFame,
      leaderboardEntries,
      onCopyLatestSummary,
      onOpenTimelineSeasonRecap: openTimelineSeasonRecap,
      onSelectAchievement: setSelectedAchievementId,
      onSelectComparisonSeason: setComparisonSeason,
      onSelectHistoryTab: setSelectedHistoryTab,
      onSelectSeason: setSelectedSeason,
      onSelectSeasonTab: setSelectedSeasonTab,
      onSelectTeam: setSelectedSeasonTeamId,
      onToggleTimelineChapter: (chapterId) => setExpandedTimelineChapterId((current) => current === chapterId ? null : chapterId),
      playerName,
      recordBook,
      recordWatch,
      rivalries,
      seasonComparison,
      selectedAchievement,
      selectedArchive,
      selectedHistoryTab,
      selectedSeason,
      selectedSeasonTab,
      selectedTeamAwards,
      selectedTeamDraftPicks,
      selectedTeamFinancial,
      selectedTeamId: selectedSeasonTeamId,
      selectedTeamSeries,
      selectedTeamStanding,
      selectedTeamTransactions,
      teamAbbreviation,
      teamName,
      timelineCanOpenRecap: (targetSeason) => isFullSeasonArchive(seasonViews[targetSeason] ?? null),
      timelineComparisons,
      timelinePlayerNames: displayNames.players,
      timelineTeamNames: displayNames.teams,
      visibleHistoryTabs,
    },
    onDismissSeasonRecap: () => setRecapData(null),
    recapData,
  };
}
