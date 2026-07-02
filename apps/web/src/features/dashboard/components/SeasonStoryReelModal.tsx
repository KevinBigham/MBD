import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Trophy,
  X,
} from 'lucide-react';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { useWorker } from '@/shared/hooks/useWorker';
import { SeasonStoryReelBody, type SeasonStoryReelView } from './SeasonStoryReelBody';

export type { SeasonStoryReelView } from './SeasonStoryReelBody';

interface SeasonStoryReelModalProps {
  seasonYear: number;
  onDismiss: () => void;
}

function formatRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  const mod10 = rank % 10;
  if (mod10 === 1) return `${rank}st`;
  if (mod10 === 2) return `${rank}nd`;
  if (mod10 === 3) return `${rank}rd`;
  return `${rank}th`;
}

export default function SeasonStoryReelModal({ seasonYear, onDismiss }: SeasonStoryReelModalProps) {
  const { getSeasonStoryReel, isReady } = useWorker();
  const currentSeason = useGameStore((state) => state.season);
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const [displayedSeason, setDisplayedSeason] = useState<number>(seasonYear);
  const [view, setView] = useState<SeasonStoryReelView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  // Sync displayed season if the opener swaps to a different initial season
  // (e.g. the user clicks a different season chip on the retrospective card).
  useEffect(() => {
    setDisplayedSeason(seasonYear);
  }, [seasonYear]);

  const canGoPrev = displayedSeason > 1;
  const canGoNext = displayedSeason < currentSeason;

  const goPrev = useCallback(() => {
    setDisplayedSeason((prev) => Math.max(1, prev - 1));
  }, []);
  const goNext = useCallback(() => {
    setDisplayedSeason((prev) => Math.min(currentSeason, prev + 1));
  }, [currentSeason]);

  const fetchReel = useCallback(async () => {
    if (!isReady || typeof getSeasonStoryReel !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getSeasonStoryReel(displayedSeason);
      setView((data as SeasonStoryReelView | null) ?? null);
      setErrored(false);
    } catch {
      setView(null);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [getSeasonStoryReel, isReady, displayedSeason]);

  useEffect(() => {
    void fetchReel();
  }, [fetchReel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
        return;
      }
      if (event.key === 'ArrowLeft' && canGoPrev) {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === 'ArrowRight' && canGoNext) {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss, canGoPrev, canGoNext, goPrev, goNext]);

  const header = useMemo(() => {
    if (!view) return null;
    const recordText = view.record ? `${view.record.wins}-${view.record.losses}` : null;
    const rankText = view.divisionRank ? `${formatRank(view.divisionRank)} in division` : null;
    return { recordText, rankText };
  }, [view]);

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="season-story-reel-title"
      tabIndex={-1}
      onClick={onDismiss}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-dynasty-border bg-dynasty-elevated shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-dynasty-border/70 px-5 py-4">
          <button
            type="button"
            onClick={onDismiss}
            className="order-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-dynasty-border/70 bg-dynasty-surface/70 text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright"
            aria-label="Close season story reel"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="order-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent-info" />
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                Season Story Reel
              </div>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canGoPrev}
                aria-label="Previous season"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-dynasty-border/70 bg-dynasty-surface/70 text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-dynasty-surface/70 disabled:hover:text-dynasty-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2
                id="season-story-reel-title"
                className="font-heading text-lg font-semibold text-dynasty-textBright"
              >
                Season {displayedSeason}
                {view ? ` — ${view.userTeamName}` : ''}
              </h2>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                aria-label="Next season"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-dynasty-border/70 bg-dynasty-surface/70 text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-dynasty-surface/70 disabled:hover:text-dynasty-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {view ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-data text-[11px] text-dynasty-text">
                {header?.recordText ? (
                  <span>
                    <span className="text-dynasty-muted">Record </span>
                    <span className="text-dynasty-textBright">{header.recordText}</span>
                  </span>
                ) : null}
                {header?.rankText ? <span className="text-dynasty-muted">{header.rankText}</span> : null}
                {view.playoffResult ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.14em] text-accent-warning">
                    <Trophy className="h-3 w-3" />
                    {view.playoffResult}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SeasonStoryReelBody
            loading={loading}
            errored={errored}
            view={view}
            displayedSeason={displayedSeason}
          />
        </div>
      </div>
    </div>
  );
}
