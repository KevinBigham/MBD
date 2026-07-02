import { Link } from 'react-router-dom';
import { Handshake, Users } from 'lucide-react';

interface FirstDayBriefingPanelProps {
  gmName: string;
  onDismiss: () => void;
}

export default function FirstDayBriefingPanel({
  gmName,
  onDismiss,
}: FirstDayBriefingPanelProps): JSX.Element {
  return (
    <section className="rounded-xl border border-accent-info/30 bg-accent-info/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">First Day Briefing</div>
          <h2 className="mt-2 font-brand text-3xl text-dynasty-textBright">Welcome, GM {gmName}</h2>
          <p className="mt-2 max-w-3xl font-heading text-sm leading-6 text-dynasty-text">
            The dashboard is your live intelligence grid. Use the quick-start actions below to jump in, or explore at your own pace.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/roster"
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs text-accent-info transition-colors hover:bg-accent-info/20"
            >
              <Users className="h-3.5 w-3.5" />
              Check Your Roster
            </Link>
            <Link
              to="/trade"
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs text-accent-info transition-colors hover:bg-accent-info/20"
            >
              <Handshake className="h-3.5 w-3.5" />
              Explore Trades
            </Link>
          </div>
          <p className="mt-3 font-data text-[10px] text-dynasty-muted">
            Tip: Press Space to sim a day, Shift+Space for a week, or Cmd+K for the command palette.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
