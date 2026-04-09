import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@mbd/ui';
import { Award, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface AwardNarrative {
  awardId: string;
  awardName: string;
  winnerId: string;
  winnerName: string;
  headline: string;
  votingSummary: string;
  historicalContext: string;
  reactionQuote: string;
  runnerUpNames: string[];
}

interface AwardCeremonyScript {
  season: number;
  awards: AwardNarrative[];
  openingRemarks: string;
  closingRemarks: string;
}

interface Props {
  ceremony: AwardCeremonyScript;
  onClose: () => void;
}

export default function AwardCeremonyModal({ ceremony, onClose }: Props) {
  // Slides: opening + each award + closing
  const totalSlides = ceremony.awards.length + 2;
  const [slideIndex, setSlideIndex] = useState(0);

  const goNext = useCallback(() => {
    setSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  const isOpening = slideIndex === 0;
  const isClosing = slideIndex === totalSlides - 1;
  const awardIndex = isOpening || isClosing ? -1 : slideIndex - 1;
  const currentAward = awardIndex >= 0 ? ceremony.awards[awardIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dynasty-base/90 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-accent-warning/30 bg-dynasty-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dynasty-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-accent-warning/10 p-2 text-accent-warning">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.22em] text-dynasty-muted">
                Season {ceremony.season}
              </div>
              <h2 className="font-brand text-xl tracking-wide text-dynasty-textBright">
                Awards Ceremony
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Slide content */}
        <div className="min-h-[20rem] px-6 py-6">
          {isOpening && (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <Award className="h-12 w-12 text-accent-warning" />
              <p className="mt-6 max-w-lg font-heading text-lg leading-relaxed text-dynasty-text">
                {ceremony.openingRemarks}
              </p>
            </div>
          )}

          {isClosing && (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <Award className="h-12 w-12 text-accent-warning" />
              <p className="mt-6 max-w-lg font-heading text-lg leading-relaxed text-dynasty-text">
                {ceremony.closingRemarks}
              </p>
            </div>
          )}

          {currentAward && (
            <div className="space-y-5">
              <div>
                <Badge variant="warning" className="mb-2">{currentAward.awardName}</Badge>
                <h3 className="font-heading text-lg font-semibold text-dynasty-textBright">
                  {currentAward.headline}
                </h3>
              </div>

              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
                  Voting Summary
                </div>
                <p className="mt-2 font-heading text-sm leading-relaxed text-dynasty-text">
                  {currentAward.votingSummary}
                </p>
              </div>

              <div className="rounded-lg border border-accent-info/20 bg-accent-info/5 p-4">
                <div className="font-heading text-xs uppercase tracking-[0.18em] text-accent-info">
                  Historical Context
                </div>
                <p className="mt-2 font-heading text-sm leading-relaxed text-dynasty-muted">
                  {currentAward.historicalContext}
                </p>
              </div>

              <div className="rounded-lg border border-accent-warning/20 bg-accent-warning/5 p-4">
                <div className="font-heading text-xs uppercase tracking-[0.18em] text-accent-warning">
                  Winner&apos;s Reaction
                </div>
                <p className="mt-2 font-heading text-sm italic leading-relaxed text-dynasty-text">
                  &ldquo;{currentAward.reactionQuote}&rdquo;
                </p>
                <p className="mt-1 font-data text-xs text-dynasty-muted">
                  &mdash; {currentAward.winnerName}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-dynasty-border px-6 py-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={slideIndex === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-heading text-sm text-dynasty-muted transition-colors hover:text-dynasty-text disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSlides }, (_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === slideIndex ? 'bg-accent-warning' : 'bg-dynasty-border'
                }`}
              />
            ))}
          </div>

          {slideIndex < totalSlides - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1 rounded-lg bg-accent-primary/10 px-3 py-1.5 font-heading text-sm text-accent-primary transition-colors hover:bg-accent-primary/20"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-accent-warning/10 px-3 py-1.5 font-heading text-sm text-accent-warning transition-colors hover:bg-accent-warning/20"
            >
              Close Ceremony
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
