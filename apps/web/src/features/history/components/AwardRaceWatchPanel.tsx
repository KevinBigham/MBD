import { Award } from 'lucide-react';
import type { AwardRaceEntry, AwardRaces } from '@mbd/sim-core';
import { DensePanel } from '@/shared/components/DensePanel';

interface AwardRaceWatchPanelProps {
  awardRaces: AwardRaces | null;
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}

export default function AwardRaceWatchPanel({
  awardRaces,
  playerName,
  teamName,
}: AwardRaceWatchPanelProps) {
  return (
    <DensePanel
      title="Current Award Watch"
      icon={<Award className="h-4 w-4 text-accent-primary" />}
      titleClassName="text-dynasty-textBright"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <AwardRaceCard title="MVP" entries={awardRaces?.mvp ?? []} playerName={playerName} teamName={teamName} />
        <AwardRaceCard title="Cy Young" entries={awardRaces?.cyYoung ?? []} playerName={playerName} teamName={teamName} />
        <AwardRaceCard title="Rookie of the Year" entries={awardRaces?.roy ?? []} playerName={playerName} teamName={teamName} />
      </div>
    </DensePanel>
  );
}

function AwardRaceCard({
  title,
  entries,
  playerName,
  teamName,
}: {
  title: string;
  entries: AwardRaceEntry[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{title}</div>
      <div className="mt-3 space-y-3">
        {entries.length > 0 ? entries.slice(0, 3).map((entry, index) => (
          <div key={`${title}-${entry.playerId}`} className="border-b border-dynasty-border/50 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="font-data text-xs text-dynasty-muted">#{index + 1}</div>
              <div className="font-data text-xs text-dynasty-muted">{teamName(entry.teamId)}</div>
            </div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">{playerName(entry.playerId)}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
          </div>
        )) : (
          <div className="font-heading text-sm text-dynasty-muted">
            No race data yet.
          </div>
        )}
      </div>
    </div>
  );
}
