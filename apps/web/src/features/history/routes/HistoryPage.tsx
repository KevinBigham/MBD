import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { listLeaderboardEntries } from '@/shared/lib/saveSystem';
import HistoryPageContent from '../components/HistoryPageContent';
import HistoryLoadingSkeleton from '../components/HistoryLoadingSkeleton';
import { SeasonRecapModal } from '../components/SeasonRecapModal';
import { useHistoryPagePresentation } from '../hooks/useHistoryPagePresentation';
import { useHistoryRouteData } from '../hooks/useHistoryRouteData';

export default function HistoryPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, userTeamId, day, season, phase, activeSaveId, activeSaveSlot } = useGameStore();
  const historyRouteData = useHistoryRouteData({
    activeSaveId,
    activeSaveSlot,
    compareSeasons: worker.compareSeasons,
    compareWithBranch: worker.compareWithBranch,
    day,
    getAchievements: worker.getAchievements,
    getAllTimeLeaders: worker.getAllTimeLeaders,
    getAwardHistory: worker.getAwardHistory,
    getAwardRaces: worker.getAwardRaces,
    getBranches: worker.getBranches,
    getDynastyCards: worker.getDynastyCards,
    getDynastyLeaderboard: worker.getDynastyLeaderboard,
    getDynastyScore: worker.getDynastyScore,
    getFranchiseTimeline: worker.getFranchiseTimeline,
    getHallOfFame: worker.getHallOfFame,
    getHistoryOverview: worker.getHistoryOverview,
    getRecordBook: worker.getRecordBook,
    getRecordWatchList: worker.getRecordWatchList,
    getRivalries: worker.getRivalries,
    getSeasonArchive: worker.getSeasonArchive,
    getSeasonHistory: worker.getSeasonHistory,
    isInitialized,
    listLeaderboardEntries,
    phase,
    resolveHistoryDisplayNames: worker.resolveHistoryDisplayNames,
    season,
    userTeamId,
    workerReady,
  });
  const {
    contentProps,
    onDismissSeasonRecap,
    recapData,
  } = useHistoryPagePresentation({
    onCopyLatestSummary: (textSummary) => {
      void navigator.clipboard?.writeText(textSummary);
    },
    routeData: historyRouteData,
    userTeamId,
  });

  return (
    <PageShell loading={historyRouteData.loading && historyRouteData.dynastyScore == null} skeleton={<HistoryLoadingSkeleton />}>
      <HistoryPageContent {...contentProps} />

      {recapData && (
        <SeasonRecapModal data={recapData} onDismiss={onDismissSeasonRecap} />
      )}
    </PageShell>
  );
}
