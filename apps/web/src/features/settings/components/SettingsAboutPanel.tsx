import { useTour } from '@/shared/components/TourProvider';

function TutorialRestartButton() {
  const { restartTour, completed } = useTour();

  return (
    <button
      type="button"
      onClick={restartTour}
      className="focus-ring rounded border border-dynasty-border px-3 py-1.5 font-heading text-xs text-dynasty-text transition-colors hover:bg-dynasty-elevated"
    >
      {completed ? 'Replay Tutorial Tour' : 'Start Tutorial Tour'}
    </button>
  );
}

export default function SettingsAboutPanel() {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-heading text-sm text-dynasty-muted">
          Mr. Baseball Dynasty v1.0.0
        </p>
        <p className="font-data text-xs text-dynasty-muted">
          Built with TypeScript, React, Vite, Web Workers, and deterministic pure-rand simulation.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <TutorialRestartButton />
      </div>
    </div>
  );
}
