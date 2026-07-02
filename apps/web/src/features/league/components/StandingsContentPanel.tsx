import { TeamLogo } from '@/shared/components/TeamLogo';
import { PageHelp } from '@/shared/components/PageHelp';
import { divisionLabel } from '@/shared/lib/labels';
import type { TeamStandingsDTO } from '@/workers/sim.worker.helpers';

function DivisionCard({ divKey, teams, userTeamId }: {
  divKey: string;
  teams: TeamStandingsDTO[];
  userTeamId: string;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="border-b border-dynasty-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-dynasty-text">
          {divisionLabel(divKey)}
        </h2>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
              <th className="px-4 py-2 text-left font-heading">Team</th>
              <th className="px-2 py-2 text-right font-data">W</th>
              <th className="px-2 py-2 text-right font-data">L</th>
              <th className="px-2 py-2 text-right font-data">PCT</th>
              <th className="px-2 py-2 text-right font-data">GB</th>
              <th className="px-2 py-2 text-right font-data">DIFF</th>
              <th className="px-2 py-2 text-right font-data">STRK</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr
                key={team.teamId}
                className={`border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated ${
                  team.teamId === userTeamId ? 'bg-accent-primary/10' : ''
                }`}
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2.5">
                    <TeamLogo teamId={team.teamId} size="sm" />
                    <div>
                      <div className="font-heading font-medium text-dynasty-text">
                        {team.abbreviation}
                      </div>
                      <div className="font-heading text-xs text-dynasty-muted">
                        {team.city} {team.teamName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-data text-dynasty-text">{team.wins}</td>
                <td className="px-2 py-2 text-right font-data text-dynasty-text">{team.losses}</td>
                <td className="px-2 py-2 text-right font-data text-dynasty-muted">{team.pct}</td>
                <td className="px-2 py-2 text-right font-data text-dynasty-muted">
                  {team.gamesBack === 0 ? '-' : team.gamesBack.toFixed(1)}
                </td>
                <td className={`px-2 py-2 text-right font-data ${
                  team.runDifferential >= 0 ? 'text-accent-success' : 'text-accent-danger'
                }`}>
                  {team.runDifferential >= 0 ? '+' : ''}{team.runDifferential}
                </td>
                <td className={`px-2 py-2 text-right font-data ${
                  team.streak.startsWith('W') ? 'text-accent-success' : 'text-accent-danger'
                }`}>
                  {team.streak}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-dynasty-border/30 md:hidden">
        {teams.map((team, idx) => (
          <div
            key={team.teamId}
            className={`px-3 py-2.5 ${team.teamId === userTeamId ? 'bg-accent-primary/10' : ''}`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 font-data text-[10px] text-dynasty-muted">{idx + 1}</span>
                <TeamLogo teamId={team.teamId} size="xs" />
                <span className="font-heading text-sm font-medium text-dynasty-text">
                  {team.abbreviation}
                </span>
              </div>
              <div className="font-data text-sm font-semibold text-dynasty-text">
                {team.wins}-{team.losses}
              </div>
            </div>
            <div className="flex items-center gap-4 pl-6 font-data text-[11px]">
              <span className="text-dynasty-muted">
                PCT <span className="text-dynasty-text">{team.pct}</span>
              </span>
              <span className="text-dynasty-muted">
                GB <span className="text-dynasty-text">{team.gamesBack === 0 ? '-' : team.gamesBack.toFixed(1)}</span>
              </span>
              <span className={team.runDifferential >= 0 ? 'text-accent-success' : 'text-accent-danger'}>
                {team.runDifferential >= 0 ? '+' : ''}{team.runDifferential}
              </span>
              <span className={team.streak.startsWith('W') ? 'text-accent-success' : 'text-accent-danger'}>
                {team.streak}
              </span>
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="px-4 py-6 text-center font-heading text-sm text-dynasty-muted">
            Sim games to see standings
          </div>
        )}
      </div>
    </div>
  );
}

interface StandingsContentPanelProps {
  day: number;
  season: number;
  standings: Record<string, TeamStandingsDTO[]>;
  userTeamId: string;
}

export default function StandingsContentPanel({
  day,
  season,
  standings,
  userTeamId,
}: StandingsContentPanelProps) {
  const divisionOrder = Object.keys(standings).sort((left, right) => divisionLabel(left).localeCompare(divisionLabel(right)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">League Standings</h1>
          <p className="font-data text-sm text-dynasty-muted">
            Season {season} | Day {day}
          </p>
        </div>
        <PageHelp pageKey="standings" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {divisionOrder.map((div) => (
          <DivisionCard
            key={div}
            divKey={div}
            teams={standings[div] ?? []}
            userTeamId={userTeamId}
          />
        ))}
      </div>
    </div>
  );
}
