import { Link } from 'react-router-dom';
import { ChevronRight, Newspaper } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { humanizeLabel } from '@/shared/lib/labels';

export interface DashboardStoryline {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  arcType: string;
  phase: 'setup' | 'rising' | 'climax' | 'resolution';
  latestMilestone: string | null;
}

interface ActiveStorylinesPanelProps {
  storylines: DashboardStoryline[];
}

function storyPhaseTone(phase: DashboardStoryline['phase']): string {
  switch (phase) {
    case 'climax':
      return 'border-accent-warning/50 text-accent-warning';
    case 'rising':
      return 'border-accent-info/50 text-accent-info';
    case 'resolution':
      return 'border-accent-success/50 text-accent-success';
    default:
      return 'border-dynasty-border text-dynasty-muted';
  }
}

function storyPhaseProgress(phase: DashboardStoryline['phase']): number {
  switch (phase) {
    case 'setup':
      return 25;
    case 'rising':
      return 50;
    case 'climax':
      return 80;
    case 'resolution':
      return 100;
  }
}

export default function ActiveStorylinesPanel({ storylines }: ActiveStorylinesPanelProps): JSX.Element {
  return (
    <DensePanel
      title="Active Storylines"
      icon={<Newspaper className="h-4 w-4 text-accent-warning" />}
      titleClassName="text-dynasty-textBright"
      meta={
        <Link to="/press-room" className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary">
          Press Room <ChevronRight className="h-3 w-3" />
        </Link>
      }
    >
      {storylines.length > 0 ? (
        <div className="space-y-3">
          {storylines.map((storyline) => (
            <Link
              key={`${storyline.playerId}-${storyline.arcType}`}
              to={`/players/${storyline.playerId}`}
              className="block rounded-lg border border-dynasty-border/70 bg-dynasty-elevated p-4 transition-colors hover:border-accent-primary/40 hover:bg-dynasty-surface"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-heading text-sm text-dynasty-textBright">{storyline.playerName}</div>
                <span className={`rounded border px-2 py-0.5 font-heading text-[10px] uppercase tracking-wide ${storyPhaseTone(storyline.phase)}`}>
                  {humanizeLabel(storyline.phase)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                <span>{humanizeLabel(storyline.arcType)}</span>
                <span>{storyline.teamId.toUpperCase()}</span>
              </div>
              <div className="mt-3">
                <ProgressFill toneClassName="bg-accent-primary" value={storyPhaseProgress(storyline.phase)} />
              </div>
              <div className="mt-3 font-heading text-sm text-dynasty-muted">
                {storyline.latestMilestone ?? `${storyline.playerName} is building a new arc.`}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyStatePanel
          className="border-dynasty-border/60 bg-dynasty-elevated"
          description="Advance a few checkpoints and the dynasty will start generating real narrative momentum."
          title="No active story arcs yet"
        />
      )}
    </DensePanel>
  );
}
