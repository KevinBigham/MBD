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
        {divisionOrder.map(div => {
          const teams = standings[div] ?? [];
          return (
            <div key={div} className="rounded-lg border border-dynasty-border bg-dynasty-surface">
              <div className="border-b border-dynasty-border px-4 py-3">
                <h2 className="font-heading text-sm font-semibold text-dynasty-text">
                  {DIVISION_LABELS[div] ?? div}
                </h2>
              </div>
              <div className="overflow-x-auto">
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
                    {teams.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center font-heading text-sm text-dynasty-muted">
                          Sim games to see standings
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
