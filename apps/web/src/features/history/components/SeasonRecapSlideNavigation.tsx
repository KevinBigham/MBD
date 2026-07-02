import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SeasonRecapSlideConfig } from './SeasonRecapModalBody';

interface SeasonRecapSlideNavigationProps {
  slides: SeasonRecapSlideConfig[];
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  children?: ReactNode;
}

export default function SeasonRecapSlideNavigation({
  slides,
  currentIndex,
  onSelectSlide,
  onPrevious,
  onNext,
  children,
}: SeasonRecapSlideNavigationProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === slides.length - 1;

  return (
    <>
      <div className="flex items-center justify-center gap-1 px-6 pt-4">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => onSelectSlide(i)}
            className={`focus-ring flex items-center gap-1 rounded-full px-2.5 py-1 font-data text-[10px] uppercase tracking-[0.14em] transition-colors ${
              i === currentIndex
                ? 'bg-accent-primary/20 text-accent-primary'
                : 'text-dynasty-muted hover:text-dynasty-text'
            }`}
            aria-label={`Go to ${slide.label} slide`}
          >
            {slide.icon}
            <span className="hidden sm:inline">{slide.label}</span>
          </button>
        ))}
      </div>

      {children}

      <div className="flex items-center justify-between border-t border-dynasty-border px-6 py-4">
        <div>
          {!isFirst && (
            <button
              type="button"
              onClick={onPrevious}
              className="focus-ring flex items-center gap-1 rounded px-3 py-1.5 font-heading text-xs text-dynasty-muted transition-colors hover:text-dynasty-text"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
        </div>
        <div className="font-data text-[10px] text-dynasty-muted">
          {currentIndex + 1} / {slides.length}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="focus-ring flex items-center gap-1 rounded bg-accent-primary px-4 py-1.5 font-heading text-xs font-semibold text-white transition-colors hover:bg-accent-primary/80"
        >
          {isLast ? 'Close' : 'Next'}
          {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </>
  );
}
