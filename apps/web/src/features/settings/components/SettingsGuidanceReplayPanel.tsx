import { BookOpenCheck, HelpCircle, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTour } from '@/shared/components/TourProvider';

interface SettingsGuidanceReplayPanelProps {
  activeSaveLabel: string;
  guidanceStatus: string | null;
  onReplayAssistantGuidance: () => void;
  onReplayGuidedStartNudges: () => void;
}

function GuidanceButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-sm text-dynasty-text transition-colors hover:bg-dynasty-elevated"
    >
      <RotateCcw className="h-4 w-4 text-accent-primary" aria-hidden="true" />
      {children}
    </button>
  );
}

export default function SettingsGuidanceReplayPanel({
  activeSaveLabel,
  guidanceStatus,
  onReplayAssistantGuidance,
  onReplayGuidedStartNudges,
}: SettingsGuidanceReplayPanelProps) {
  const { completed, restartTour } = useTour();

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-panel/70 p-4">
        <div className="flex items-start gap-3">
          <BookOpenCheck className="mt-0.5 h-5 w-5 text-accent-primary" aria-hidden="true" />
          <div>
            <h3 className="font-heading text-lg text-dynasty-text">Guidance Replay</h3>
            <p className="mt-1 text-sm leading-6 text-dynasty-muted">
              Active guidance scope: {activeSaveLabel}. Replay clears local help progress only; dynasty save data stays unchanged.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <GuidanceButton onClick={onReplayAssistantGuidance}>
            Replay Assistant Help
          </GuidanceButton>
          <GuidanceButton onClick={onReplayGuidedStartNudges}>
            Replay Guided-Start Nudges
          </GuidanceButton>
          <GuidanceButton onClick={restartTour}>
            {completed ? 'Replay Tutorial / Help' : 'Start Tutorial / Help'}
          </GuidanceButton>
          <a
            href="/dashboard"
            className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-sm text-dynasty-text transition-colors hover:bg-dynasty-elevated"
          >
            <HelpCircle className="h-4 w-4 text-accent-info" aria-hidden="true" />
            Open Quickstarts
          </a>
        </div>
      </div>

      {guidanceStatus ? (
        <div className="rounded-lg border border-accent-info/35 bg-accent-info/10 px-4 py-3 font-heading text-sm text-accent-info">
          {guidanceStatus}
        </div>
      ) : null}
    </div>
  );
}
