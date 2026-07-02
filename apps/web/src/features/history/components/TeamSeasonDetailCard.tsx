import type {
  ArchivedSeasonStanding,
  AwardHistoryEntry,
  SeasonArchiveDraftPick,
  SeasonArchiveFinancial,
  SeasonArchivePlayoffSeries,
  SeasonArchiveStanding,
  SeasonArchiveTransaction,
} from '@mbd/contracts';

interface TeamSeasonDetailCardProps {
  awards: AwardHistoryEntry[];
  divisionLabelForTeam: (teamId: string) => string;
  draftPicks: SeasonArchiveDraftPick[];
  financial: SeasonArchiveFinancial | null;
  formatAwardLabel: (award: string) => string;
  formatMoney: (value: number | null | undefined) => string;
  playoffSeries: SeasonArchivePlayoffSeries[];
  selectedTeamId: string | null;
  standing: ArchivedSeasonStanding | SeasonArchiveStanding | null;
  teamName: (teamId: string | null) => string;
  transactions: SeasonArchiveTransaction[];
}

export default function TeamSeasonDetailCard({
  awards,
  divisionLabelForTeam,
  draftPicks,
  financial,
  formatAwardLabel,
  formatMoney,
  playoffSeries,
  selectedTeamId,
  standing,
  teamName,
  transactions,
}: TeamSeasonDetailCardProps): JSX.Element {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="font-heading text-sm text-dynasty-textBright">Team Season Detail</div>
      {selectedTeamId && standing ? (
        <div className="mt-3 space-y-3">
          <div>
            <div className="font-heading text-base text-dynasty-text">{teamName(selectedTeamId)}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">
              {divisionLabelForTeam(selectedTeamId)} · {standing.wins}-{standing.losses}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-dynasty-border/70 px-3 py-2">
              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Payroll</div>
              <div className="mt-1 font-data text-sm text-dynasty-textBright">{formatMoney(financial?.payroll ?? null)}</div>
            </div>
            <div className="rounded border border-dynasty-border/70 px-3 py-2">
              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Budget</div>
              <div className="mt-1 font-data text-sm text-dynasty-textBright">{formatMoney(financial?.budget ?? null)}</div>
            </div>
          </div>
          {playoffSeries.length > 0 && (
            <div>
              <div className="font-heading text-[11px] uppercase text-dynasty-muted">Playoff Path</div>
              <div className="mt-2 space-y-2">
                {playoffSeries.map((series, index) => (
                  <div key={`${series.round}-${index}`} className="rounded border border-dynasty-border/70 px-3 py-2 font-heading text-xs text-dynasty-muted">
                    {series.round} · {teamName(series.winnerTeamId)} def. {teamName(series.loserTeamId)} ({series.result})
                  </div>
                ))}
              </div>
            </div>
          )}
          {awards.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {awards.map((award) => (
                <span key={`${award.award}-${award.playerId}`} className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase text-dynasty-muted">
                  {award.league} {formatAwardLabel(award.award)}
                </span>
              ))}
            </div>
          )}
          {transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.slice(0, 3).map((entry) => (
                <div key={entry.headline} className="font-heading text-xs text-dynasty-muted">{entry.headline}</div>
              ))}
            </div>
          )}
          {draftPicks.length > 0 && (
            <div className="space-y-2">
              {draftPicks.map((pick) => (
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
  );
}
