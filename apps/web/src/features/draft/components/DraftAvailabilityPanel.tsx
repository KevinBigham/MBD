import { Users } from 'lucide-react';
import { PageHelp } from '@/shared/components/PageHelp';

interface DraftAvailabilityPanelProps {
  error: string | null;
  loading: boolean;
  onStartDraft: () => void;
  season: number;
  status: string;
  variant: 'unavailable' | 'available';
}

export function DraftAvailabilityPanel({
  error,
  loading,
  onStartDraft,
  season,
  status,
  variant,
}: DraftAvailabilityPanelProps) {
  const showStartAction = variant === 'available';

  return (
    <div className="space-y-6">
      <div className={variant === 'unavailable' ? 'flex items-start justify-between' : undefined}>
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Draft Room</h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">Season {season} Amateur Draft</p>
        </div>
        {variant === 'unavailable' ? <PageHelp pageKey="draft" /> : null}
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <Users className="h-12 w-12 text-dynasty-muted" />
          <h2 className="font-heading text-lg font-semibold text-dynasty-text">
            {showStartAction ? status : 'Draft Available During Offseason'}
          </h2>
          <p className="max-w-md font-heading text-sm text-dynasty-muted">
            {showStartAction
              ? 'Start the draft to load the class, reveal the first picks, and put your front office on the clock.'
              : 'The draft room opens after the regular season and playoffs are finished.'}
          </p>
          {showStartAction ? (
            <button
              onClick={onStartDraft}
              disabled={loading}
              className="rounded-md bg-accent-primary px-6 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:bg-dynasty-border disabled:text-dynasty-muted"
            >
              {loading ? 'Preparing Draft...' : 'Start Draft'}
            </button>
          ) : null}
          {showStartAction && error ? (
            <p className="font-data text-xs text-accent-danger">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
