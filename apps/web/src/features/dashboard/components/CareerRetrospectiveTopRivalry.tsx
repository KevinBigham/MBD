import { Swords } from 'lucide-react';

export interface CareerRetrospectiveTopRivalryView {
  opponentTeamId: string;
  opponentTeamName: string;
  opponentAbbreviation: string;
  intensity: number;
  summary: string;
  currentSeasonRecord: string;
  historicalRecord: string;
}

export default function CareerRetrospectiveTopRivalry({
  rivalry,
}: {
  rivalry: CareerRetrospectiveTopRivalryView;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Swords className="h-3.5 w-3.5 text-accent-danger" />
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Top Rivalry</div>
        </div>
        <div className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          Intensity <span className="text-dynasty-textBright">{Math.round(rivalry.intensity)}</span>
        </div>
      </div>
      <div className="mt-2">
        <div className="font-heading text-xs font-semibold text-dynasty-textBright">
          vs {rivalry.opponentTeamName}
        </div>
        <div className="mt-1 font-heading text-xs text-dynasty-text">{rivalry.summary}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          <span>
            Season <span className="text-dynasty-textBright">{rivalry.currentSeasonRecord}</span>
          </span>
          <span>
            Lifetime <span className="text-dynasty-textBright">{rivalry.historicalRecord}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
