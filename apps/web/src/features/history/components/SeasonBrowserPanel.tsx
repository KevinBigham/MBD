import type {
  AwardHistoryEntry,
  SeasonArchiveDraftPick,
  SeasonArchiveFinancial,
  SeasonArchivePlayoffSeries,
  SeasonArchiveTransaction,
} from '@mbd/contracts';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';
import SeasonArchiveSummaryCard from './SeasonArchiveSummaryCard';
import SeasonAwardsPanel from './SeasonAwardsPanel';
import SeasonBrowserTabs, { type SeasonBrowserTab } from './SeasonBrowserTabs';
import SeasonComparisonCard, { type SeasonComparisonView } from './SeasonComparisonCard';
import SeasonDraftPanel from './SeasonDraftPanel';
import SeasonFinancialsPanel from './SeasonFinancialsPanel';
import SeasonLeadersPanel from './SeasonLeadersPanel';
import SeasonPlayoffsPanel from './SeasonPlayoffsPanel';
import SeasonStandingsPanel, { type SeasonStandingsGroup } from './SeasonStandingsPanel';
import SeasonTransactionsPanel from './SeasonTransactionsPanel';

type SeasonStandingView = SeasonStandingsGroup['entries'][number];

interface SeasonBrowserPanelProps {
  availableSeasons: number[];
  comparisonSeason: number | null;
  divisionLabelForTeam: (teamId: string) => string;
  formatAwardLabel: (award: string) => string;
  formatMoney: (value: number | null | undefined) => string;
  groupedStandings: SeasonStandingsGroup[];
  onOpenYearInReview: (season: number) => void;
  onSelectComparisonSeason: (season: number) => void;
  onSelectSeason: (season: number) => void;
  onSelectSeasonTab: (tab: SeasonBrowserTab) => void;
  onSelectTeam: (teamId: string) => void;
  playerName: (playerId: string) => string;
  seasonComparison: SeasonComparisonView | null;
  selectedArchive: HistorySeasonView | null;
  selectedSeason: number | null;
  selectedSeasonTab: SeasonBrowserTab;
  selectedTeamAwards: AwardHistoryEntry[];
  selectedTeamDraftPicks: SeasonArchiveDraftPick[];
  selectedTeamFinancial: SeasonArchiveFinancial | null;
  selectedTeamId: string | null;
  selectedTeamSeries: SeasonArchivePlayoffSeries[];
  selectedTeamStanding: SeasonStandingView | null;
  selectedTeamTransactions: SeasonArchiveTransaction[];
  teamName: (teamId: string | null) => string;
}

function isArchivedSeasonView(view: HistorySeasonView | null): boolean {
  return view != null && !('playoffSeries' in view);
}

export default function SeasonBrowserPanel({
  availableSeasons,
  comparisonSeason,
  divisionLabelForTeam,
  formatAwardLabel,
  formatMoney,
  groupedStandings,
  onOpenYearInReview,
  onSelectComparisonSeason,
  onSelectSeason,
  onSelectSeasonTab,
  onSelectTeam,
  playerName,
  seasonComparison,
  selectedArchive,
  selectedSeason,
  selectedSeasonTab,
  selectedTeamAwards,
  selectedTeamDraftPicks,
  selectedTeamFinancial,
  selectedTeamId,
  selectedTeamSeries,
  selectedTeamStanding,
  selectedTeamTransactions,
  teamName,
}: SeasonBrowserPanelProps): JSX.Element {
  return (
    <DensePanel
      title="Season Browser"
      subtitle="Replay the shape of any year and compare it to the one that followed."
      subtitleClassName="font-heading text-xs normal-case tracking-normal"
      titleClassName="text-dynasty-textBright"
      meta={(
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 font-heading text-xs text-dynasty-muted">
            Season
            <select
              data-mobile-critical-control="history-season-select"
              className="mobile-critical-control rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 text-dynasty-textBright"
              onChange={(event) => onSelectSeason(Number(event.target.value))}
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
              data-mobile-critical-control="history-compare-select"
              className="mobile-critical-control rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 text-dynasty-textBright"
              onChange={(event) => onSelectComparisonSeason(Number(event.target.value))}
              value={comparisonSeason ?? ''}
            >
              {availableSeasons.filter((availableSeason) => availableSeason !== selectedSeason).map((availableSeason) => (
                <option key={availableSeason} value={availableSeason}>Season {availableSeason}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    >

      {selectedArchive ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <SeasonArchiveSummaryCard
              seasonView={selectedArchive}
              onOpenYearInReview={() => onOpenYearInReview(selectedArchive.season)}
            />

            <SeasonComparisonCard seasonComparison={seasonComparison} />
          </div>

          <SeasonBrowserTabs
            archived={isArchivedSeasonView(selectedArchive)}
            onSelectTab={onSelectSeasonTab}
            selectedTab={selectedSeasonTab}
          />

          {selectedSeasonTab === 'standings' && (
            <SeasonStandingsPanel
              awards={selectedTeamAwards}
              divisionLabelForTeam={divisionLabelForTeam}
              draftPicks={selectedTeamDraftPicks}
              financial={selectedTeamFinancial}
              formatAwardLabel={formatAwardLabel}
              formatMoney={formatMoney}
              groups={groupedStandings}
              onSelectTeam={onSelectTeam}
              playoffSeries={selectedTeamSeries}
              selectedTeamId={selectedTeamId}
              standing={selectedTeamStanding}
              teamName={teamName}
              transactions={selectedTeamTransactions}
            />
          )}

          {selectedSeasonTab === 'playoffs' && (
            <SeasonPlayoffsPanel seasonView={selectedArchive} teamName={teamName} />
          )}

          {selectedSeasonTab === 'awards' && (
            <SeasonAwardsPanel
              seasonView={selectedArchive}
              formatAwardLabel={formatAwardLabel}
              playerName={playerName}
              teamName={teamName}
            />
          )}

          {selectedSeasonTab === 'leaders' && (
            <SeasonLeadersPanel
              statLeaders={selectedArchive.statLeaders}
              playerName={playerName}
              teamName={teamName}
            />
          )}

          {selectedSeasonTab === 'transactions' && (
            <SeasonTransactionsPanel seasonView={selectedArchive} />
          )}

          {selectedSeasonTab === 'draft' && (
            <SeasonDraftPanel seasonView={selectedArchive} teamName={teamName} />
          )}

          {selectedSeasonTab === 'financials' && (
            <SeasonFinancialsPanel
              seasonView={selectedArchive}
              teamName={teamName}
              formatMoney={formatMoney}
            />
          )}
        </div>
      ) : (
        <EmptyStatePanel
          description="Complete a season to unlock the full archive browser."
          title="No archived seasons yet"
          actionLabel="Back to Dashboard"
          actionHref="/dashboard"
        />
      )}
    </DensePanel>
  );
}
