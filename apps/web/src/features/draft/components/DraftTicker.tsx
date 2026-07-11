import { Radio } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { DraftRoomPick } from '@/workers/sim.worker.helpers';

function gradeChipClass(grade: number): string {
  if (grade >= 60) return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
  if (grade >= 50) return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
  if (grade >= 40) return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
  return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
}

function toneClasses(tone: DraftRoomPick['tone']): string {
  switch (tone) {
    case 'user':
      return 'border-accent-success/35 bg-accent-success/12 text-accent-success';
    case 'division_rival':
      return 'border-accent-warning/35 bg-accent-warning/12 text-accent-warning';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-text';
  }
}

function compensationContextLabel(compensation: DraftRoomPick['compensation'] | null | undefined): string | null {
  if (!compensation) {
    return null;
  }

  return compensation.compensationFromTeamName
    ? `QO for ${compensation.compensationForPlayerName} from ${compensation.compensationFromTeamName}`
    : `QO for ${compensation.compensationForPlayerName}`;
}

interface DraftTickerProps {
  picks: DraftRoomPick[];
  progressLabel: string;
}

export function DraftTicker({ picks, progressLabel }: DraftTickerProps) {
  return (
    <DensePanel
      title="Draft Ticker"
      subtitle={progressLabel}
      icon={<Radio className="h-4 w-4 text-accent-info" />}
      meta={`${picks.length} picks shown`}
      headerClassName="flex-row items-center justify-between"
      bodyClassName="max-h-[32rem] overflow-y-auto px-2 py-2"
    >
      {picks.length === 0 ? (
        <p className="px-2 py-10 text-center font-heading text-sm text-dynasty-muted">
          Start the draft to begin the ticker.
        </p>
      ) : (
        picks.map((pick) => (
          <div
            key={`${pick.pickNumber}-${pick.playerId}`}
            data-testid="draft-ticker-pick"
            data-player-id={pick.playerId}
            className={`mb-2 rounded border px-3 py-2 ${toneClasses(pick.tone)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Round {pick.round} · Pick {pick.pickNumber}
                </p>
                <p className="mt-1 font-heading text-sm font-semibold">
                  {pick.teamAbbreviation} selected {pick.playerName}
                </p>
                <p className="mt-1 font-data text-xs text-dynasty-muted">
                  {pick.position} · {pick.origin}
                </p>
                {pick.compensation && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded border border-accent-warning/30 bg-accent-warning/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.18em] text-accent-warning">
                    <span>QO</span>
                    <span>{compensationContextLabel(pick.compensation)}</span>
                  </div>
                )}
              </div>
              <span className={`rounded border px-2 py-1 font-data text-sm font-semibold ${gradeChipClass(pick.scoutingGrade)}`}>
                {pick.scoutingGrade}
              </span>
            </div>
          </div>
        ))
      )}
    </DensePanel>
  );
}
