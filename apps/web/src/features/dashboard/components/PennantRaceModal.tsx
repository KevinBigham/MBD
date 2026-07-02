import { useCallback, useEffect, useState } from 'react';
import { Flame, X } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { PennantRaceModalBody, type PennantRaceDetailView } from './PennantRaceModalBody';

export type {
  PennantRaceDetailDivision,
  PennantRaceDetailTeam,
  PennantRaceDetailView,
  PennantRaceDetailWildcard,
  PennantRaceDetailWildcardTeam,
} from './PennantRaceModalBody';

interface PennantRaceModalProps {
  onDismiss: () => void;
}

export default function PennantRaceModal({ onDismiss }: PennantRaceModalProps) {
  const { getPennantRaceDetail, isReady } = useWorker();
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const [view, setView] = useState<PennantRaceDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const fetchView = useCallback(async () => {
    if (!isReady || typeof getPennantRaceDetail !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }
    try {
      const data = await getPennantRaceDetail();
      setView((data as PennantRaceDetailView | null) ?? null);
      setErrored(false);
    } catch {
      setView(null);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [getPennantRaceDetail, isReady]);

  useEffect(() => {
    void fetchView();
  }, [fetchView]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pennant-race-modal-title"
      onClick={onDismiss}
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-dynasty-border bg-dynasty-elevated shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-dynasty-border/70 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent-danger" />
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                Pennant Race Board
              </div>
            </div>
            <h2
              id="pennant-race-modal-title"
              className="mt-1 font-heading text-lg font-semibold text-dynasty-textBright"
            >
              {view ? `Season ${view.season} · Day ${view.day}` : 'Pennant Race Board'}
            </h2>
            {view ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-data text-[11px] text-dynasty-text">
                <span>
                  <span className="text-dynasty-muted">Games remaining </span>
                  <span className="text-dynasty-textBright">{view.gamesRemaining}</span>
                </span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-dynasty-border/70 bg-dynasty-surface/70 text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright"
            aria-label="Close pennant race board"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PennantRaceModalBody loading={loading} errored={errored} view={view} />
        </div>
      </div>
    </div>
  );
}
