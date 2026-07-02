import {
  isSeasonStoryReelEmpty,
  SeasonStoryReelSections,
  type SeasonStoryReelView,
} from './SeasonStoryReelSections';

export type { SeasonStoryReelView } from './SeasonStoryReelSections';

interface SeasonStoryReelBodyProps {
  loading: boolean;
  errored: boolean;
  view: SeasonStoryReelView | null;
  displayedSeason: number;
}

export function SeasonStoryReelBody({
  loading,
  errored,
  view,
  displayedSeason,
}: SeasonStoryReelBodyProps) {
  if (loading) {
    return <div className="font-heading text-sm text-dynasty-muted">Loading season story...</div>;
  }

  if (errored) {
    return (
      <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/5 p-3 font-heading text-sm text-accent-danger">
        Could not load this season's story. Try again from the dashboard.
      </div>
    );
  }

  if (!view) {
    return (
      <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        No archive exists for Season {displayedSeason} yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SeasonStoryReelSections view={view} />
      {isSeasonStoryReelEmpty(view) ? (
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          Season {displayedSeason} wrapped with a quiet record — no signature beats filed yet.
        </div>
      ) : null}
    </div>
  );
}
