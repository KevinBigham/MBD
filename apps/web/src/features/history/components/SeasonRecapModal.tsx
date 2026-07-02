/**
 * SeasonRecapModal — Cinematic year-in-review presentation.
 * Multi-slide walkthrough of a completed season: record, standings,
 * stat leaders, awards, key transactions, and narrative summary.
 */

import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { getAudioEngine } from '@/shared/lib/audio';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import {
  getVisibleSeasonRecapSlides,
  SeasonRecapModalBody,
  type SeasonRecapData,
} from './SeasonRecapModalBody';
import SeasonRecapSlideNavigation from './SeasonRecapSlideNavigation';

interface SeasonRecapModalProps {
  data: SeasonRecapData;
  onDismiss: () => void;
}

export type { SeasonRecapData } from './SeasonRecapModalBody';

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------

export function SeasonRecapModal({ data, onDismiss }: SeasonRecapModalProps) {
  const reducedMotion = useEffectiveReducedMotion();
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const visibleSlides = getVisibleSeasonRecapSlides(data);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSlide = visibleSlides[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === visibleSlides.length - 1;

  const next = useCallback(() => {
    if (isLast) {
      getAudioEngine().playEffect('season_end');
      onDismiss();
    } else {
      setCurrentIndex((i) => i + 1);
      getAudioEngine().playEffect('button_click');
    }
  }, [isLast, onDismiss]);

  const prev = useCallback(() => {
    if (!isFirst) {
      setCurrentIndex((i) => i - 1);
      getAudioEngine().playEffect('button_click');
    }
  }, [isFirst]);

  const selectSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    getAudioEngine().playEffect('button_click');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [next, prev, onDismiss]);

  // Play sound on open
  useEffect(() => {
    if (data.isChampion) {
      getAudioEngine().playEffect('world_series_win');
    }
  }, [data.isChampion]);

  const animClass = reducedMotion ? '' : 'motion-safe:animate-ceremony-fade-in';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" onClick={onDismiss} />

      {/* Modal */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Season ${data.season} Year in Review`}
        tabIndex={-1}
        className={`relative w-full max-w-2xl rounded-xl border border-dynasty-border bg-dynasty-surface shadow-2xl outline-none ${animClass}`}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onDismiss}
          className="focus-ring absolute right-3 top-3 z-10 rounded p-1 text-dynasty-muted transition-colors hover:text-dynasty-text"
          aria-label="Close recap"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Gradient top bar */}
        <div className={`h-1 rounded-t-xl ${data.isChampion ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400' : 'bg-gradient-to-r from-accent-primary via-accent-info to-accent-primary'}`} />

        <SeasonRecapSlideNavigation
          slides={visibleSlides}
          currentIndex={currentIndex}
          onSelectSlide={selectSlide}
          onPrevious={prev}
          onNext={next}
        >
          {currentSlide ? (
            <SeasonRecapModalBody
              key={currentSlide.id}
              data={data}
              slideId={currentSlide.id}
              reducedMotion={reducedMotion}
            />
          ) : null}
        </SeasonRecapSlideNavigation>
      </div>
    </div>
  );
}
