import { Trophy } from 'lucide-react';
import type { TeamStandingsDTO } from '@/workers/sim.worker.helpers';
import StandingsCardBody from './StandingsCardBody';

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

      <StandingsCardBody standings={standings} userTeamId={userTeamId} />
    </section>
  );
}
