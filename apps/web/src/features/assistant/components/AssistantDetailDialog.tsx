import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeHelp,
  CheckCircle2,
  ChevronDown,
  Gauge,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  AssistantAction,
  AssistantGuidance,
  AssistantStoryCallback,
} from '../data/assistantGuidance';
import type { AssistantMode } from '../lib/assistantState';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

export interface AssistantDetailDialogProps {
  avatar: ReactNode;
  guidance: AssistantGuidance;
  nextAction: AssistantAction;
  story: AssistantStoryCallback | null;
  mode: AssistantMode;
  ratingsOpen: boolean;
  strategyOpen: boolean;
  onClose: (restoreFocus?: boolean) => void;
  onComplete: () => void;
  onReplay: () => void;
  onToggleMode: () => void;
  onToggleRatings: () => void;
  onToggleStrategy: () => void;
}

function storyToneClasses(story: AssistantStoryCallback | null): string {
  if (!story) return 'border-dynasty-border bg-dynasty-elevated/70 text-dynasty-muted';
  if (story.tone === 'warning') return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
  if (story.tone === 'success') return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
  if (story.tone === 'excited') return 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary';
  return 'border-dynasty-border bg-dynasty-elevated/70 text-dynasty-muted';
}

export function AssistantDetailDialog({
  avatar,
  guidance,
  nextAction,
  story,
  mode,
  ratingsOpen,
  strategyOpen,
  onClose,
  onComplete,
  onReplay,
  onToggleMode,
  onToggleRatings,
  onToggleStrategy,
}: AssistantDetailDialogProps) {
  const trapRef = useFocusTrap<HTMLElement>(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Mack Mercer Assistant"
      tabIndex={-1}
      className="max-h-[72vh] overflow-y-auto rounded-lg border border-accent-info/35 bg-dynasty-surface shadow-2xl"
    >
      <div className="flex items-start gap-3 border-b border-dynasty-border p-4">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Mack Mercer</h2>
            <span className="rounded border border-dynasty-border px-1.5 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              Assistant GM
            </span>
          </div>
          <p className="mt-1 font-data text-xs text-dynasty-muted">
            {guidance.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClose()}
          className="flex min-h-11 min-w-11 items-center justify-center rounded text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text"
          aria-label="Close Assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        {story ? (
          <div className={`rounded-md border p-3 ${storyToneClasses(story)}`} aria-live="polite">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em]">{story.title}</div>
                <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{story.body}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="font-heading text-base font-semibold text-dynasty-textBright">{guidance.title}</h3>
          <p className="mt-2 font-heading text-sm leading-relaxed text-dynasty-text">{guidance.pagePurpose}</p>
          <p className="mt-2 font-data text-xs leading-relaxed text-dynasty-muted">{guidance.whenToUse}</p>
        </div>

        <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
          <div className="flex items-start gap-2">
            <BadgeHelp className="mt-0.5 h-4 w-4 shrink-0 text-accent-info" />
            <div>
              <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Decision</div>
              <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.decision}</p>
            </div>
          </div>
        </div>

        <Link
          to={nextAction.route}
          onClick={() => onClose(false)}
          className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-accent-primary/40 bg-accent-primary/10 px-3 py-2 font-heading text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/15"
        >
          <span>
            <span className="block">{nextAction.label}</span>
            <span className="mt-1 block font-data text-[11px] font-normal text-dynasty-muted">{nextAction.reason}</span>
          </span>
          <ChevronDown className="-rotate-90 h-4 w-4 shrink-0" />
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleRatings}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
          >
            <Gauge className="h-4 w-4" />
            Explain ratings
          </button>
          <button
            type="button"
            onClick={onToggleStrategy}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
          >
            <Sparkles className="h-4 w-4" />
            Deeper strategy
          </button>
        </div>

        {ratingsOpen ? (
          <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
            <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Ratings read</div>
            <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.ratingsFocus}</p>
          </div>
        ) : null}

        {strategyOpen ? (
          <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
            <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Bench coach note</div>
            <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.deeperStrategy}</p>
          </div>
        ) : null}

        <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/50 p-3 font-data text-[11px] leading-relaxed text-dynasty-muted">
          {guidance.mobileTip}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-dynasty-border pt-3">
          <button
            type="button"
            onClick={onComplete}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent-primary px-3 py-2 font-heading text-xs font-semibold text-white transition-colors hover:bg-accent-primary/80"
          >
            <CheckCircle2 className="h-4 w-4" />
            Got it
          </button>
          <button
            type="button"
            onClick={onReplay}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
          >
            <RotateCcw className="h-4 w-4" />
            Replay
          </button>
          <button
            type="button"
            onClick={onToggleMode}
            className="min-h-11 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
          >
            {mode === 'newcomer' ? 'Hardcore mode' : 'Newcomer mode'}
          </button>
        </div>
      </div>
    </section>
  );
}
