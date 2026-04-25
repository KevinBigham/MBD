import { useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Compass,
  Download,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { GuidedStartNudgeId } from './nudgeState';

interface GuidedStartNudgeCopy {
  eyebrow: string;
  title: string;
  body: string;
  dismissLabel: string;
  icon: LucideIcon;
}

const NUDGE_COPY: Record<GuidedStartNudgeId, GuidedStartNudgeCopy> = {
  intro_scroll: {
    eyebrow: 'Opening Brief',
    title: 'The owner handed you the keys',
    body: 'Start with the briefing, then follow the next live baseball decision as it arrives. The front office will keep the thread moving.',
    dismissLabel: "Let's go.",
    icon: Compass,
  },
  first_draft_nudge: {
    eyebrow: 'Draft Room',
    title: 'Scouting report first',
    body: 'Open a prospect and use Scout Look before you commit the pick.',
    dismissLabel: 'Got it',
    icon: ClipboardList,
  },
  first_series_pointer: {
    eyebrow: 'Opening Series',
    title: 'First pitch is waiting',
    body: 'Use Sim Day when ready, then check the next key screen as the board changes.',
    dismissLabel: 'Got it',
    icon: CalendarDays,
  },
  first_offday_autosave_prompt: {
    eyebrow: 'Off-Day Backup',
    title: 'Grab a backup',
    body: 'Export the save before the schedule picks up again, then keep rolling.',
    dismissLabel: 'Not now',
    icon: Download,
  },
};

export interface GuidedStartNudgeCardProps {
  current: GuidedStartNudgeId | null;
  onDismiss: (id: GuidedStartNudgeId) => void;
  onExportBackup?: () => Promise<void> | void;
}

export function GuidedStartNudgeCard({
  current,
  onDismiss,
  onExportBackup,
}: GuidedStartNudgeCardProps) {
  const [exporting, setExporting] = useState(false);

  if (!current) {
    return null;
  }

  const copy = NUDGE_COPY[current];
  const Icon = copy.icon;
  const isExportPrompt = current === 'first_offday_autosave_prompt';

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExportBackup?.();
      onDismiss(current);
    } finally {
      setExporting(false);
    }
  };

  return (
    <aside
      aria-live="polite"
      data-testid={`guided-start-nudge-${current}`}
      className="fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-accent-info/35 bg-dynasty-surface p-4 shadow-2xl shadow-black/30"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-accent-info/30 bg-accent-info/10 p-2 text-accent-info">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-accent-info">
            {copy.eyebrow}
          </div>
          <h2 className="mt-1 font-heading text-base font-semibold text-dynasty-textBright">
            {copy.title}
          </h2>
          <p className="mt-2 font-heading text-sm leading-5 text-dynasty-muted">
            {copy.body}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {isExportPrompt ? (
              <button
                type="button"
                disabled={exporting || !onExportBackup}
                onClick={() => {
                  void handleExport();
                }}
                className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-3 py-2 font-heading text-xs font-semibold text-white transition-colors hover:bg-accent-primaryHover disabled:cursor-not-allowed disabled:bg-dynasty-border disabled:text-dynasty-muted"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? 'Exporting...' : 'Export backup'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onDismiss(current)}
              className="rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:bg-dynasty-elevated"
            >
              {copy.dismissLabel}
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss guided start nudge"
          onClick={() => onDismiss(current)}
          className="rounded border border-transparent p-1 text-dynasty-muted transition-colors hover:border-dynasty-border hover:text-dynasty-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
