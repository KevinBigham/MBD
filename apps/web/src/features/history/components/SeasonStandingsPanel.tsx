import type {
  ArchivedSeasonStanding,
  AwardHistoryEntry,
  SeasonArchiveDraftPick,
  SeasonArchiveFinancial,
  SeasonArchivePlayoffSeries,
  SeasonArchiveStanding,
  SeasonArchiveTransaction,
} from '@mbd/contracts';
import TeamSeasonDetailCard from './TeamSeasonDetailCard';

export interface SeasonStandingsGroup {
  division: string;
  label: string;
  entries: Array<ArchivedSeasonStanding | SeasonArchiveStanding>;
}

interface SeasonStandingsPanelProps {
  awards: AwardHistoryEntry[];
  divisionLabelForTeam: (teamId: string) => string;
  draftPicks: SeasonArchiveDraftPick[];
  financial: SeasonArchiveFinancial | null;
  formatAwardLabel: (award: string) => string;
  formatMoney: (value: number | null | undefined) => string;
  groups: SeasonStandingsGroup[];
  onSelectTeam: (teamId: string) => void;
  playoffSeries: SeasonArchivePlayoffSeries[];
  selectedTeamId: string | null;
  standing: ArchivedSeasonStanding | SeasonArchiveStanding | null;
  teamName: (teamId: string | null) => string;
  transactions: SeasonArchiveTransaction[];
}

export default function SeasonStandingsPanel({
  awards,
  divisionLabelForTeam,
  draftPicks,
  financial,
  formatAwardLabel,
  formatMoney,
  groups,
  onSelectTeam,
  playoffSeries,
  selectedTeamId,
  standing,
  teamName,
  transactions,
}: SeasonStandingsPanelProps): JSX.Element {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.division} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
            <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">{group.label}</div>
            <div className="mt-3 space-y-2">
              {group.entries.map((entry) => (
                <button
                  key={entry.teamId}
                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left ${
                    selectedTeamId === entry.teamId
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-dynasty-border/70 bg-dynasty-surface/40'
                  }`}
                  onClick={() => onSelectTeam(entry.teamId)}
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

      <TeamSeasonDetailCard
        awards={awards}
        divisionLabelForTeam={divisionLabelForTeam}
        draftPicks={draftPicks}
        financial={financial}
        formatAwardLabel={formatAwardLabel}
        formatMoney={formatMoney}
        playoffSeries={playoffSeries}
        selectedTeamId={selectedTeamId}
        standing={standing}
        teamName={teamName}
        transactions={transactions}
      />
    </div>
  );
}
