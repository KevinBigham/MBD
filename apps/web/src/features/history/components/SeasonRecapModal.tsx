/**
 * SeasonRecapModal — Cinematic year-in-review presentation.
 * Multi-slide walkthrough of a completed season: record, standings,
 * stat leaders, awards, key transactions, and narrative summary.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  BarChart3,
  Star,
  ArrowLeftRight,
  BookOpen,
  Target,
} from 'lucide-react';
import { getAudioEngine } from '@/shared/lib/audio';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';
import type { TeamLogo as TeamLogoType } from '@/shared/components/TeamLogo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeasonRecapData {
  season: number;
  teamName: string;
  teamId: string;
  record: string;
  winPct: string;
  divisionRank: number;
  gamesBack: number;
  playoffResult: string | null;
  isChampion: boolean;
  statLeaders: {
    hr: { name: string; value: string } | null;
    rbi: { name: string; value: string } | null;
    avg: { name: string; value: string } | null;
    era: { name: string; value: string } | null;
    k: { name: string; value: string } | null;
    w: { name: string; value: string } | null;
  };
  awards: Array<{ award: string; playerName: string }>;
  keyTransactions: Array<{ description: string }>;
  narrative: string;
  storylines: string[];
  fanSentiment: number | null;
  payroll: string | null;
}

interface SeasonRecapModalProps {
  data: SeasonRecapData;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Slide Definitions
// ---------------------------------------------------------------------------

type SlideId = 'title' | 'record' | 'leaders' | 'awards' | 'transactions' | 'narrative';

interface SlideConfig {
  id: SlideId;
  label: string;
  icon: React.ReactNode;
  shouldShow: (data: SeasonRecapData) => boolean;
}

const SLIDE_CONFIGS: SlideConfig[] = [
  {
    id: 'title',
    label: 'Season',
    icon: <Target className="h-4 w-4" />,
    shouldShow: () => true,
  },
  {
    id: 'record',
    label: 'Record',
    icon: <BarChart3 className="h-4 w-4" />,
    shouldShow: () => true,
  },
  {
    id: 'leaders',
    label: 'Leaders',
    icon: <Star className="h-4 w-4" />,
    shouldShow: (d) => Object.values(d.statLeaders).some((v) => v != null),
  },
  {
    id: 'awards',
    label: 'Awards',
    icon: <Trophy className="h-4 w-4" />,
    shouldShow: (d) => d.awards.length > 0,
  },
  {
    id: 'transactions',
    label: 'Moves',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    shouldShow: (d) => d.keyTransactions.length > 0,
  },
  {
    id: 'narrative',
    label: 'Story',
    icon: <BookOpen className="h-4 w-4" />,
    shouldShow: () => true,
  },
];

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------

function TitleSlide({ data }: { data: SeasonRecapData }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="font-data text-[11px] uppercase tracking-[0.2em] text-accent-primary">
        Year in Review
      </div>
      <h2 className="mt-3 font-brand text-5xl tracking-wide text-dynasty-textBright md:text-6xl">
        Season {data.season}
      </h2>
      <p className="mt-4 font-heading text-lg text-dynasty-text">{data.teamName}</p>
      {data.isChampion && (
        <div className="mt-4 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span className="font-heading text-sm font-semibold text-amber-400">World Series Champions</span>
        </div>
      )}
    </div>
  );
}

function RecordSlide({ data }: { data: SeasonRecapData }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Final Record</div>
        <div className="mt-2 font-brand text-6xl tracking-wide text-dynasty-textBright">{data.record}</div>
        <div className="mt-1 font-data text-lg text-accent-primary">{data.winPct} WIN%</div>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 text-center">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Division</div>
          <div className="mt-1 font-data text-2xl text-dynasty-textBright">
            {data.divisionRank === 1 ? '1st' : data.divisionRank === 2 ? '2nd' : data.divisionRank === 3 ? '3rd' : `${data.divisionRank}th`}
          </div>
          {data.gamesBack > 0 && (
            <div className="mt-0.5 font-data text-xs text-dynasty-muted">{data.gamesBack} GB</div>
          )}
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 text-center">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Postseason</div>
          <div className="mt-1 font-heading text-sm text-dynasty-textBright">
            {data.playoffResult ?? 'Did Not Qualify'}
          </div>
        </div>
      </div>

      {data.payroll && (
        <div className="text-center">
          <span className="font-data text-xs text-dynasty-muted">Payroll: </span>
          <span className="font-data text-xs text-dynasty-text">{data.payroll}</span>
        </div>
      )}
    </div>
  );
}

function LeadersSlide({ data }: { data: SeasonRecapData }) {
  const leaders = [
    { cat: 'HR', ...data.statLeaders.hr },
    { cat: 'RBI', ...data.statLeaders.rbi },
    { cat: 'AVG', ...data.statLeaders.avg },
    { cat: 'ERA', ...data.statLeaders.era },
    { cat: 'K', ...data.statLeaders.k },
    { cat: 'W', ...data.statLeaders.w },
  ].filter((l) => l.name);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Team Leaders</div>
      </div>
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
        {leaders.map((leader) => (
          <div
            key={leader.cat}
            className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3 text-center"
          >
            <div className="font-data text-[10px] uppercase tracking-[0.18em] text-accent-primary">{leader.cat}</div>
            <div className="mt-1 font-data text-xl font-bold text-dynasty-textBright">{leader.value}</div>
            <div className="mt-0.5 truncate font-heading text-xs text-dynasty-text">{leader.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AwardsSlide({ data }: { data: SeasonRecapData }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Hardware</div>
      </div>
      <div className="mx-auto max-w-md space-y-3">
        {data.awards.map((award, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="font-heading text-sm font-semibold text-dynasty-textBright">{award.award}</div>
              <div className="font-data text-xs text-dynasty-text">{award.playerName}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsSlide({ data }: { data: SeasonRecapData }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Key Moves</div>
      </div>
      <div className="mx-auto max-w-md space-y-2">
        {data.keyTransactions.slice(0, 8).map((tx, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated p-3"
          >
            <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-info" />
            <span className="font-heading text-sm leading-relaxed text-dynasty-text">{tx.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NarrativeSlide({ data }: { data: SeasonRecapData }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">The Story</div>
      <p className="mt-4 max-w-lg font-heading text-lg leading-relaxed text-dynasty-text">
        {data.narrative}
      </p>
      {data.storylines.length > 0 && (
        <div className="mt-6 space-y-2">
          {data.storylines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
              <span className="font-heading text-sm text-dynasty-muted">{line}</span>
            </div>
          ))}
        </div>
      )}
      {data.fanSentiment != null && (
        <div className="mt-6 rounded-lg border border-dynasty-border bg-dynasty-elevated px-6 py-3">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Fan Sentiment</div>
          <div className={`mt-1 font-data text-2xl font-bold ${data.fanSentiment >= 60 ? 'text-accent-success' : data.fanSentiment >= 40 ? 'text-accent-warning' : 'text-accent-danger'}`}>
            {data.fanSentiment}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------

export function SeasonRecapModal({ data, onDismiss }: SeasonRecapModalProps) {
  const reducedMotion = useEffectiveReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);

  const visibleSlides = SLIDE_CONFIGS.filter((s) => s.shouldShow(data));
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

  // Focus on mount
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Play sound on open
  useEffect(() => {
    if (data.isChampion) {
      getAudioEngine().playEffect('world_series_win');
    }
  }, [data.isChampion]);

  function renderSlide() {
    if (!currentSlide) return null;
    switch (currentSlide.id) {
      case 'title':
        return <TitleSlide data={data} />;
      case 'record':
        return <RecordSlide data={data} />;
      case 'leaders':
        return <LeadersSlide data={data} />;
      case 'awards':
        return <AwardsSlide data={data} />;
      case 'transactions':
        return <TransactionsSlide data={data} />;
      case 'narrative':
        return <NarrativeSlide data={data} />;
      default:
        return null;
    }
  }

  const animClass = reducedMotion ? '' : 'motion-safe:animate-ceremony-fade-in';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" onClick={onDismiss} />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
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

        {/* Slide indicators */}
        <div className="flex items-center justify-center gap-1 px-6 pt-4">
          {visibleSlides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => { setCurrentIndex(i); getAudioEngine().playEffect('button_click'); }}
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

        {/* Slide content */}
        <div key={currentSlide?.id} className={`min-h-[320px] px-8 py-8 ${animClass}`}>
          {renderSlide()}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between border-t border-dynasty-border px-6 py-4">
          <div>
            {!isFirst && (
              <button
                type="button"
                onClick={prev}
                className="focus-ring flex items-center gap-1 rounded px-3 py-1.5 font-heading text-xs text-dynasty-muted transition-colors hover:text-dynasty-text"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">
            {currentIndex + 1} / {visibleSlides.length}
          </div>
          <button
            type="button"
            onClick={next}
            className="focus-ring flex items-center gap-1 rounded bg-accent-primary px-4 py-1.5 font-heading text-xs font-semibold text-white transition-colors hover:bg-accent-primary/80"
          >
            {isLast ? 'Close' : 'Next'}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
