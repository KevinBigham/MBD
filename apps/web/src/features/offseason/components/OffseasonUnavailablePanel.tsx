import { Calendar } from 'lucide-react';

export function OffseasonUnavailablePanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          Offseason
        </h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          The offseason begins after the playoffs conclude.
        </p>
      </div>
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <Calendar className="h-12 w-12 text-dynasty-muted" />
          <h2 className="font-heading text-lg font-semibold text-dynasty-text">
            Season In Progress
          </h2>
          <p className="max-w-md font-heading text-sm text-dynasty-muted">
            The offseason wizard will guide you through arbitration, free agency,
            the amateur draft, and roster decisions after the season ends.
          </p>
        </div>
      </div>
    </div>
  );
}
