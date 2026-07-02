import CareerRetrospectiveAwardsShelf, {
  type CareerRetrospectiveAwardsShelfView,
} from './CareerRetrospectiveAwardsShelf';
import CareerRetrospectiveSeasonArc, {
  type CareerRetrospectiveSeasonHistoryEntry,
} from './CareerRetrospectiveSeasonArc';
import CareerRetrospectiveStoryStack, {
  type LegendArcEntry,
  type SignatureArcEntry,
  type TeamMomentEntry,
} from './CareerRetrospectiveStoryStack';
import CareerRetrospectiveTopRivalry, {
  type CareerRetrospectiveTopRivalryView,
} from './CareerRetrospectiveTopRivalry';
import CareerRetrospectiveTenureTitles, {
  type CareerRetrospectiveTenureTitlesView,
} from './CareerRetrospectiveTenureTitles';

export interface CareerRetrospectiveView extends CareerRetrospectiveTenureTitlesView {
  seasonHistory: CareerRetrospectiveSeasonHistoryEntry[];
  teamMoments: TeamMomentEntry[];
  legendArcs: LegendArcEntry[];
  signatureArcs: SignatureArcEntry[];
  awardsShelf: CareerRetrospectiveAwardsShelfView;
  topRivalry: CareerRetrospectiveTopRivalryView | null;
}

interface CareerRetrospectiveCardBodyProps {
  loading: boolean;
  view: CareerRetrospectiveView | null;
  onSelectSeason: (season: number) => void;
}

export default function CareerRetrospectiveCardBody({
  loading,
  view,
  onSelectSeason,
}: CareerRetrospectiveCardBodyProps) {
  const hasContent = view != null && (
    view.titles.worldSeries > 0
    || view.titles.pennants > 0
    || view.titles.divisionTitles > 0
    || view.titles.playoffAppearances > 0
    || view.teamMoments.length > 0
    || view.legendArcs.length > 0
    || (view.signatureArcs?.length ?? 0) > 0
    || view.awardsShelf.total > 0
    || view.topRivalry != null
    || (view.seasonHistory?.length ?? 0) >= 2
  );

  if (loading) {
    return <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>;
  }

  if (view == null) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        Career retrospective is unavailable right now.
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        Your career story is still being written. Titles, legend arcs, and rivalries will fill in as the dynasty unfolds.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <CareerRetrospectiveTenureTitles view={view} />
      {view.seasonHistory?.length >= 2 ? (
        <CareerRetrospectiveSeasonArc history={view.seasonHistory} />
      ) : null}
      {view.awardsShelf.total > 0 ? <CareerRetrospectiveAwardsShelf shelf={view.awardsShelf} /> : null}
      {view.teamMoments.length > 0 || view.legendArcs.length > 0 || (view.signatureArcs?.length ?? 0) > 0 ? (
        <CareerRetrospectiveStoryStack
          moments={view.teamMoments.slice(0, 3)}
          legendArcs={view.legendArcs.slice(0, 3)}
          signatureArcs={(view.signatureArcs ?? []).slice(0, 3)}
          onSelectSeason={onSelectSeason}
        />
      ) : null}
      {view.topRivalry ? <CareerRetrospectiveTopRivalry rivalry={view.topRivalry} /> : null}
    </div>
  );
}
