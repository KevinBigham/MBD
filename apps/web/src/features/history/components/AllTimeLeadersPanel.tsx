import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';

export interface AllTimeLeaderEntry {
  playerId: string;
  playerName: string;
  value: number;
  display: string;
}

export interface AllTimeLeadersView {
  batting: {
    hits: AllTimeLeaderEntry[];
    hr: AllTimeLeaderEntry[];
    rbi: AllTimeLeaderEntry[];
  };
  pitching: {
    wins: AllTimeLeaderEntry[];
    strikeouts: AllTimeLeaderEntry[];
    era: AllTimeLeaderEntry[];
    saves: AllTimeLeaderEntry[];
  };
}

interface AllTimeLeadersPanelProps {
  allTimeLeaders: AllTimeLeadersView | null;
}

export default function AllTimeLeadersPanel({ allTimeLeaders }: AllTimeLeadersPanelProps) {
  if (!allTimeLeaders) {
    return (
      <EmptyStatePanel
        title="No career stats recorded yet"
        description="Complete a full season to start building the all-time leaderboards."
      />
    );
  }

  return (
    <div className="space-y-6">
      <DensePanel
        title="Career Batting Leaders"
        icon={<BarChart3 className="h-4 w-4 text-accent-primary" />}
        titleClassName="text-dynasty-textBright"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <AllTimeLeaderColumn title="Hits" entries={allTimeLeaders.batting.hits} />
          <AllTimeLeaderColumn title="Home Runs" entries={allTimeLeaders.batting.hr} />
          <AllTimeLeaderColumn title="RBI" entries={allTimeLeaders.batting.rbi} />
        </div>
      </DensePanel>

      <DensePanel
        title="Career Pitching Leaders"
        icon={<BarChart3 className="h-4 w-4 text-accent-info" />}
        titleClassName="text-dynasty-textBright"
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <AllTimeLeaderColumn title="Wins" entries={allTimeLeaders.pitching.wins} />
          <AllTimeLeaderColumn title="Strikeouts" entries={allTimeLeaders.pitching.strikeouts} />
          <AllTimeLeaderColumn title="ERA (min 200 IP)" entries={allTimeLeaders.pitching.era} />
          <AllTimeLeaderColumn title="Saves" entries={allTimeLeaders.pitching.saves} />
        </div>
      </DensePanel>
    </div>
  );
}

function AllTimeLeaderColumn({
  title,
  entries,
}: {
  title: string;
  entries: AllTimeLeaderEntry[];
}) {
  return (
    <div>
      <div className="mb-3 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
        {title}
      </div>
      <div className="space-y-1">
        {entries.length > 0 ? entries.map((entry, index) => (
          <div key={`${title}-${entry.playerId}`} className="flex items-center gap-3 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
            <div className="w-5 shrink-0 font-data text-xs text-dynasty-muted">{index + 1}</div>
            <Link
              className="min-w-0 flex-1 truncate font-heading text-sm text-accent-primary hover:text-accent-primary/80"
              to={`/players/${entry.playerId}`}
            >
              {entry.playerName}
            </Link>
            <div className="shrink-0 font-data text-sm text-dynasty-textBright">{entry.display}</div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3 font-heading text-sm text-dynasty-muted">
            No leaders recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
