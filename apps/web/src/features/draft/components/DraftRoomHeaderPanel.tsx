import {
  Clock3,
  Star,
  Zap,
} from 'lucide-react';
import type { DraftRoomView } from '@/workers/sim.worker.helpers';

interface DraftRoomHeaderPanelProps {
  draftStatus: DraftRoomView['status'];
  loading: boolean;
  onWatchDraft: () => void;
  progressLabel: string;
  status: string;
  userOnClock: boolean;
  watching: boolean;
}

export function DraftRoomHeaderPanel({
  draftStatus,
  loading,
  onWatchDraft,
  progressLabel,
  status,
  userOnClock,
  watching,
}: DraftRoomHeaderPanelProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Draft Room</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded border border-dynasty-border bg-dynasty-surface px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {status}
          </span>
          {userOnClock && (
            <span className="inline-flex items-center gap-1 rounded border border-accent-success/30 bg-accent-success/10 px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-accent-success">
              <Star className="h-3 w-3" /> You Are On The Clock
            </span>
          )}
        </div>
        <p className="mt-2 font-heading text-sm text-dynasty-muted">{progressLabel}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onWatchDraft}
          disabled={loading || watching || draftStatus === 'complete'}
          className="inline-flex items-center gap-2 rounded-md border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:text-dynasty-muted"
        >
          {watching ? <Clock3 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          {watching ? 'Watching Draft' : 'Watch Draft'}
        </button>
      </div>
    </div>
  );
}
