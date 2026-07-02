import { Link } from 'react-router-dom';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { humanizeLabel } from '@/shared/lib/labels';

type ArcType = 'redemption_arc' | 'late_career_peak' | 'rookie_breakout';

export interface ArcMomentShape {
  season: number;
  day?: number;
  description: string;
  type: string;
  isPlayoff: boolean;
  relevance: number;
}

export interface PlayerArcEntryView {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  moment: ArcMomentShape;
}

interface PlayerArcOfSeasonCardBodyProps {
  entries: PlayerArcEntryView[];
  loading: boolean;
}

const ARC_LABELS: Readonly<Record<ArcType, string>> = {
  redemption_arc: 'Redemption',
  late_career_peak: 'Late-Career Peak',
  rookie_breakout: 'Rookie Breakout',
};

function arcTypeLabel(type: string): string {
  if (type === 'redemption_arc' || type === 'late_career_peak' || type === 'rookie_breakout') {
    return ARC_LABELS[type];
  }
  return humanizeLabel(type);
}

function entryKey(entry: PlayerArcEntryView): string {
  return `${entry.playerId}-${entry.moment.type}-${entry.moment.season}`;
}

export default function PlayerArcOfSeasonCardBody({
  entries,
  loading,
}: PlayerArcOfSeasonCardBodyProps) {
  if (loading) {
    return <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        No player arcs from this season yet. Check back after the season wraps.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {entries.map((entry) => (
        <ArcRow key={entryKey(entry)} entry={entry} />
      ))}
    </div>
  );
}

function ArcRow({ entry }: { entry: PlayerArcEntryView }) {
  return (
    <Link
      to={`/players/${entry.playerId}?tab=moments`}
      className="block rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 transition-colors hover:border-accent-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {entry.teamId ? <TeamLogo teamId={entry.teamId} size="xs" /> : null}
            <span className="truncate font-heading text-sm text-dynasty-textBright">{entry.playerName}</span>
            {entry.teamName ? (
              <span className="truncate font-heading text-xs text-dynasty-muted">{entry.teamName}</span>
            ) : null}
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {entry.moment.description}
          </div>
          <div className="mt-2 flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            <span className="rounded-sm border border-accent-primary/40 bg-accent-primary/10 px-1.5 py-[1px] text-accent-primary">
              {arcTypeLabel(entry.moment.type)}
            </span>
            {entry.moment.day != null ? <span>Day {entry.moment.day}</span> : null}
            {entry.moment.isPlayoff ? <span>Playoffs</span> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
