import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import {
  StatsDefinitionLibraryPanel,
  type CategoryFilter,
  type StatDefinition,
} from './StatsDefinitionLibraryPanel';
import type { LeagueContextView } from '../hooks/useStatsEncyclopediaRouteData';

export interface StatsEncyclopediaContentProps {
  definitions: StatDefinition[];
  filter: CategoryFilter;
  leagueContext: LeagueContextView | null;
  onFilterChange: (filter: CategoryFilter) => void;
}

function LeagueContextPanel({ context }: { context: LeagueContextView | null }) {
  if (!context) {
    return (
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 text-center font-data text-sm text-dynasty-muted">
        Sim games to generate league context data.
      </div>
    );
  }

  const items = [
    { label: 'League wOBA', value: context.leagueWoba.toFixed(3) },
    { label: 'League OPS', value: context.leagueOps.toFixed(3) },
    { label: 'League ERA', value: context.leagueEra.toFixed(2) },
    { label: 'League FIP', value: context.leagueFip.toFixed(2) },
    { label: 'Runs/Win', value: context.runsPerWin.toFixed(1) },
  ];

  return (
    <div className="rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-4">
      <div className="font-heading text-xs uppercase tracking-wider text-dynasty-muted">
        Current League Environment
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="font-data text-lg font-bold text-accent-primary">{item.value}</div>
            <div className="font-data text-[10px] text-dynasty-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsEncyclopediaContent({
  definitions,
  filter,
  leagueContext,
  onFilterChange,
}: StatsEncyclopediaContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Stats Encyclopedia</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            Advanced sabermetric reference &mdash; how every stat works and what&apos;s &ldquo;good&rdquo;
          </p>
        </div>
        <Link
          to="/league/leaders"
          className="flex items-center gap-2 rounded-md border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary"
        >
          <BarChart3 className="h-4 w-4" />
          Leaderboards
        </Link>
      </div>

      <LeagueContextPanel context={leagueContext} />

      <StatsDefinitionLibraryPanel
        definitions={definitions}
        filter={filter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}
