import { Trophy } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import type { TeamStandingsDTO } from '@/workers/sim.worker.helpers';

interface StandingsCardProps {
  standings: TeamStandingsDTO[];
  userTeamId: string;
}

export default function StandingsCard({ standings, userTeamId }: StandingsCardProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-accent-info" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Standings</h2>
      </div>

      <div className="mt-4 max-h-72 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dynasty-border text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
              <th className="px-2 py-2 text-left font-heading">Team</th>
              <th className="px-2 py-2 text-right font-data">W</th>
              <th className="px-2 py-2 text-right font-data">L</th>
              <th className="px-2 py-2 text-right font-data">PCT</th>
              <th className="px-2 py-2 text-right font-data">GB</th>
              <th className="px-2 py-2 text-right font-data">STRK</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => (
              <tr
                key={team.teamId}
                className={`border-b border-dynasty-border/50 ${
                  team.teamId === userTeamId ? 'bg-accent-primary/10' : ''
                }`}
              >
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamId={team.teamId} size="xs" />
                    <span className="font-heading text-sm text-dynasty-textBright">{team.abbreviation}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-data text-sm text-dynasty-text">{team.wins}</td>
                <td className="px-2 py-2 text-right font-data text-sm text-dynasty-text">{team.losses}</td>
                <td className="px-2 py-2 text-right font-data text-sm text-dynasty-muted">{team.pct}</td>
                <td className="px-2 py-2 text-right font-data text-sm text-dynasty-muted">
                  {team.gamesBack === 0 ? '-' : team.gamesBack.toFixed(1)}
                </td>
                <td className={`px-2 py-2 text-right font-data text-sm ${
                  team.streak.startsWith('W') ? 'text-accent-success' : 'text-accent-danger'
                }`}>
                  {team.streak}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
