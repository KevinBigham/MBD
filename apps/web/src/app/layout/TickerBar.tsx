import type { TickerEntry } from '@mbd/contracts';
import { Newspaper } from 'lucide-react';
import { useState } from 'react';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';

interface TickerBarProps {
  entries: TickerEntry[];
  onSelectEntry: (entry: TickerEntry) => void;
}

function priorityClass(priority: TickerEntry['priority']) {
  if (priority === 5) {
    return 'text-amber-300';
  }
  if (priority === 4) {
    return 'text-sky-300';
  }
  if (priority === 3) {
    return 'text-dynasty-text';
  }
  if (priority === 2) {
    return 'text-slate-300';
  }
  return 'text-slate-500';
}

export function TickerBar({ entries, onSelectEntry }: TickerBarProps) {
  const [paused, setPaused] = useState(false);
  const reducedMotion = useEffectiveReducedMotion();

  if (entries.length === 0) {
    return null;
  }

  const topHeadline = entries[0]?.text ?? '';
  const srSummary = entries.slice(0, 3).map((entry) => entry.text).join(' | ');
  const shouldAnimate = entries.length > 1 && !reducedMotion;
  const marqueeEntries = shouldAnimate ? [...entries, ...entries] : entries;

  return (
    <div
      className="border-t border-dynasty-border bg-dynasty-surface/95"
      role="complementary"
      aria-label="League news ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Screen reader summary — hidden visually, read by assistive tech */}
      <div className="sr-only" aria-live="polite">
        {entries.length} league updates. Latest: {topHeadline}. Summary: {srSummary}
      </div>
      <style>{`
        @keyframes mbd-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="flex items-center gap-3 overflow-hidden px-3 py-2">
        <div className="flex items-center gap-2 whitespace-nowrap border-r border-dynasty-border pr-3 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted" aria-hidden="true">
          <Newspaper className="h-3.5 w-3.5" />
          League Wire
        </div>
        <div className="overflow-hidden" role="list" aria-label="League headlines">
          <div
            className="flex min-w-max items-center gap-3"
            style={shouldAnimate
              ? {
                animation: 'mbd-ticker-scroll 28s linear infinite',
                animationPlayState: paused ? 'paused' : 'running',
              }
              : undefined}
          >
            {marqueeEntries.map((entry, index) => (
              <button
                key={`${entry.id}-${index}`}
                type="button"
                role="listitem"
                onClick={() => onSelectEntry(entry)}
                className={`font-heading text-sm transition hover:text-accent-primary ${priorityClass(entry.priority)}`}
              >
                <span>{entry.text}</span>
                <span className="ml-3 text-dynasty-muted" aria-hidden="true">•</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
