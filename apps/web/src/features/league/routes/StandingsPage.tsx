import { useEffect, useState, useCallback } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface TeamStandings {
  teamId: string;
  teamName: string;
  city: string;
  abbreviation: string;
  division: string;
  wins: number;
  losses: number;
  pct: string;
  gamesBack: number;
  streak: string;
  runDifferential: number;
}

const DIVISION_LABELS: Record<string, string> = {
  AL_EAST: 'AL East',
  AL_CENTRAL: 'AL Central',
  AL_WEST: 'AL West',
  NL_EAST: 'NL East',
  NL_CENTRAL: 'NL Central',
  NL_WEST: 'NL West',
};

function DivisionCard({ divKey, teams, userTeamId }: {
  divKey: string;
  teams: TeamStandings[];
  userTeamId: string;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="border-b border-dynasty-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-dynasty-text">
          {DIVISION_LABELS[divKey] ?? divKey}
        </h2>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
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
            {teams.map(team => (
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

      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-dynasty-border/30">
        {teams.map((team, idx) => (
          <div
            key={team.teamId}
            className={`px-3 py-2.5 ${team.teamId === userTeamId ? 'bg-accent-primary/10' : ''}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-data text-[10px] text-dynasty-muted w-4">{idx + 1}</span>
                <TeamLogo teamId={team.teamId} size="xs" />
                <span className="font-heading text-sm font-medium text-dynasty-text">
                  {team.abbreviation}
                </span>
              </div>
              <div className="font-data text-sm font-semibold text-dynasty-text">
                {team.wins}-{team.losses}
              </div>
            </div>
            <div className="flex items-center gap-4 pl-6 text-[11px] font-data">
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

export default function StandingsPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { day, season, phase, userTeamId, isInitialized } = useGameStore();
  const [standings, setStandings] = useState<Record<string, TeamStandings[]>>({});

  const fetchStandings = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    const data = await worker.getStandings();
    if (data) setStandings(data.divisions as Record<string, TeamStandings[]>);
  }, [isInitialized, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings, day, season, phase]);

  const divisionOrder = ['AL_EAST', 'AL_CENTRAL', 'AL_WEST', 'NL_EAST', 'NL_CENTRAL', 'NL_WEST'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-dynasty-text">League Standings</h1>
        <p className="font-data text-sm text-dynasty-muted">
          Season {season} | Day {day}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {divisionOrder.map(div => (
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
