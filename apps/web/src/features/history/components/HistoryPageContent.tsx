import type {
  AwardHistoryEntry,
  SeasonArchiveDraftPick,
  SeasonArchiveFinancial,
  SeasonArchivePlayoffSeries,
  SeasonArchiveTransaction,
} from '@mbd/contracts';
import AllTimeLeadersPanel from './AllTimeLeadersPanel';
import DynastyCardsPanel from './DynastyCardsPanel';
import DynastyScorePanel from './DynastyScorePanel';
import HistoryAwardsTabPanel from './HistoryAwardsTabPanel';
import HistoryMainTabs from './HistoryMainTabs';
import HistoryRecordsTabPanel from './HistoryRecordsTabPanel';
import LocalLeaderboardPanel from './LocalLeaderboardPanel';
import SeasonBrowserPanel from './SeasonBrowserPanel';
import type { SeasonBrowserTab } from './SeasonBrowserTabs';
import TimelinePanel from './TimelinePanel';
import type { useHistoryRouteData } from '../hooks/useHistoryRouteData';
import type { DynastyTimelineChapter } from '../lib/buildDynastyTimelineChapters';
import type {
  formatAwardLabel as formatAwardLabelHelper,
  formatMoney as formatMoneyHelper,
  groupArchiveStandings,
  HistoryTab,
} from '../lib/historyPageTransforms';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';

type HistoryRouteData = ReturnType<typeof useHistoryRouteData>;
type GroupedStandings = ReturnType<typeof groupArchiveStandings>;
type SelectedTeamStanding = GroupedStandings[number]['entries'][number];

export interface HistoryPageContentProps {
  achievements: HistoryRouteData['achievements'];
  allTimeLeaders: HistoryRouteData['allTimeLeaders'];
  availableSeasons: number[];
  awardHistory: HistoryRouteData['awardHistory'];
  awardRaces: HistoryRouteData['awardRaces'];
  comparisonSeason: HistoryRouteData['comparisonSeason'];
  divisionLabelForTeam: (teamId: string) => string;
  dynastyCards: HistoryRouteData['dynastyCards'];
  dynastyScore: HistoryRouteData['dynastyScore'];
  dynastyTimelineChapters: DynastyTimelineChapter[];
  expandedTimelineChapterId: string | null;
  formatAwardLabel: typeof formatAwardLabelHelper;
  formatMoney: typeof formatMoneyHelper;
  groupedStandings: GroupedStandings;
  hallOfFame: HistoryRouteData['hallOfFame'];
  leaderboardEntries: HistoryRouteData['leaderboardEntries'];
  onCopyLatestSummary: (textSummary: string) => void;
  onOpenTimelineSeasonRecap: (season: number) => void;
  onSelectAchievement: (achievementId: string) => void;
  onSelectComparisonSeason: (season: number) => void;
  onSelectHistoryTab: (tab: HistoryTab) => void;
  onSelectSeason: (season: number) => void;
  onSelectSeasonTab: (tab: SeasonBrowserTab) => void;
  onSelectTeam: (teamId: string) => void;
  onToggleTimelineChapter: (chapterId: string) => void;
  playerName: (playerId: string) => string;
  recordBook: HistoryRouteData['recordBook'];
  recordWatch: HistoryRouteData['recordWatch'];
  rivalries: HistoryRouteData['rivalries'];
  seasonComparison: HistoryRouteData['seasonComparison'];
  selectedAchievement: HistoryRouteData['achievements'][number] | null;
  selectedArchive: HistorySeasonView | null;
  selectedHistoryTab: HistoryTab;
  selectedSeason: number | null;
  selectedSeasonTab: SeasonBrowserTab;
  selectedTeamAwards: AwardHistoryEntry[];
  selectedTeamDraftPicks: SeasonArchiveDraftPick[];
  selectedTeamFinancial: SeasonArchiveFinancial | null;
  selectedTeamId: string | null;
  selectedTeamSeries: SeasonArchivePlayoffSeries[];
  selectedTeamStanding: SelectedTeamStanding | null;
  selectedTeamTransactions: SeasonArchiveTransaction[];
  teamAbbreviation: (teamId: string) => string;
  teamName: (teamId: string | null) => string;
  timelineCanOpenRecap: (season: number) => boolean;
  timelineComparisons: HistoryRouteData['timelineComparisons'];
  timelinePlayerNames: Record<string, string>;
  timelineTeamNames: Record<string, string>;
  visibleHistoryTabs: readonly HistoryTab[];
}

export default function HistoryPageContent({
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
  onOpenTimelineSeasonRecap,
  onSelectAchievement,
  onSelectComparisonSeason,
  onSelectHistoryTab,
  onSelectSeason,
  onSelectSeasonTab,
  onSelectTeam,
  onToggleTimelineChapter,
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
  selectedTeamId,
  selectedTeamSeries,
  selectedTeamStanding,
  selectedTeamTransactions,
  teamAbbreviation,
  teamName,
  timelineCanOpenRecap,
  timelineComparisons,
  timelinePlayerNames,
  timelineTeamNames,
  visibleHistoryTabs,
}: HistoryPageContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          Franchise History
        </h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Award races, season recaps, and the grudges your franchise is building.
        </p>
      </div>

      <DynastyScorePanel dynastyScore={dynastyScore} />

      <HistoryMainTabs
        onSelectTab={onSelectHistoryTab}
        selectedTab={selectedHistoryTab}
        tabs={visibleHistoryTabs}
      />

      {selectedHistoryTab === 'records' && (
        <HistoryRecordsTabPanel
          awardRaces={awardRaces}
          playerName={playerName}
          recordBook={recordBook}
          recordWatch={recordWatch}
          rivalries={rivalries}
          teamAbbreviation={teamAbbreviation}
          teamName={teamName}
        />
      )}

      {selectedHistoryTab === 'seasons' && (
        <div className="space-y-6">
          <SeasonBrowserPanel
            availableSeasons={availableSeasons}
            comparisonSeason={comparisonSeason}
            divisionLabelForTeam={divisionLabelForTeam}
            formatAwardLabel={formatAwardLabel}
            formatMoney={formatMoney}
            groupedStandings={groupedStandings}
            onOpenYearInReview={onOpenTimelineSeasonRecap}
            onSelectComparisonSeason={onSelectComparisonSeason}
            onSelectSeason={onSelectSeason}
            onSelectSeasonTab={onSelectSeasonTab}
            onSelectTeam={onSelectTeam}
            playerName={playerName}
            seasonComparison={seasonComparison}
            selectedArchive={selectedArchive}
            selectedSeason={selectedSeason}
            selectedSeasonTab={selectedSeasonTab}
            selectedTeamAwards={selectedTeamAwards}
            selectedTeamDraftPicks={selectedTeamDraftPicks}
            selectedTeamFinancial={selectedTeamFinancial}
            selectedTeamId={selectedTeamId}
            selectedTeamSeries={selectedTeamSeries}
            selectedTeamStanding={selectedTeamStanding}
            selectedTeamTransactions={selectedTeamTransactions}
            teamName={teamName}
          />
        </div>
      )}

      {selectedHistoryTab === 'leaders' && (
        <AllTimeLeadersPanel allTimeLeaders={allTimeLeaders} />
      )}

      {selectedHistoryTab === 'timeline' && (
        <TimelinePanel
          canOpenRecap={timelineCanOpenRecap}
          dynastyTimelineChapters={dynastyTimelineChapters}
          expandedTimelineChapterId={expandedTimelineChapterId}
          onOpenRecap={onOpenTimelineSeasonRecap}
          onToggleChapter={onToggleTimelineChapter}
          playerNames={timelinePlayerNames}
          teamNames={timelineTeamNames}
          timelineComparisons={timelineComparisons}
        />
      )}

      {selectedHistoryTab === 'legacy' && (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <DynastyCardsPanel
            dynastyCards={dynastyCards}
            onCopyLatestSummary={onCopyLatestSummary}
          />

          <LocalLeaderboardPanel leaderboardEntries={leaderboardEntries} />
        </div>
      )}

      {selectedHistoryTab === 'awards' && (
        <HistoryAwardsTabPanel
          achievements={achievements}
          awardHistory={awardHistory}
          formatAwardLabel={formatAwardLabel}
          hallOfFame={hallOfFame}
          onSelectAchievement={onSelectAchievement}
          playerName={playerName}
          selectedAchievement={selectedAchievement}
          teamName={teamName}
        />
      )}
    </div>
  );
}
