import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@mbd/ui';

export type StatCategory = 'batting' | 'pitching' | 'universal';
export type CategoryFilter = 'all' | StatCategory;

export interface StatDefinition {
  key: string;
  name: string;
  abbreviation: string;
  category: StatCategory;
  formula: string;
  description: string;
  excellent: string;
  good: string;
  average: string;
  poor: string;
  /** true = lower is better (ERA, FIP, WHIP) */
  invertedScale: boolean;
}

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All Stats' },
  { key: 'universal', label: 'Universal' },
  { key: 'batting', label: 'Batting' },
  { key: 'pitching', label: 'Pitching' },
];

interface StatsDefinitionLibraryPanelProps {
  definitions: StatDefinition[];
  filter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
}

function QualityBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-data text-[10px] ${tone}`}>
      {label}
    </span>
  );
}

function StatCard({ stat }: { stat: StatDefinition }) {
  const categoryTone =
    stat.category === 'batting'
      ? 'text-accent-success border-accent-success/30'
      : stat.category === 'pitching'
        ? 'text-accent-info border-accent-info/30'
        : 'text-accent-warning border-accent-warning/30';

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5 transition-colors hover:border-dynasty-muted">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-brand text-xl tracking-wide text-accent-primary">{stat.abbreviation}</h3>
          <p className="mt-0.5 font-heading text-sm text-dynasty-text">{stat.name}</p>
        </div>
        <Badge className={categoryTone}>{stat.category}</Badge>
      </div>

      <p className="mt-3 font-data text-xs leading-relaxed text-dynasty-muted">{stat.description}</p>

      <div className="mt-3 rounded border border-dynasty-border bg-dynasty-base/50 px-3 py-2">
        <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Formula</div>
        <div className="mt-1 font-data text-xs text-dynasty-text">{stat.formula}</div>
      </div>

      <div className="mt-3">
        <div className="font-heading text-[10px] uppercase tracking-wider text-dynasty-muted">Quality Scale</div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-2">
            {stat.invertedScale ? (
              <TrendingDown className="h-3 w-3 text-accent-success" />
            ) : (
              <TrendingUp className="h-3 w-3 text-accent-success" />
            )}
            <QualityBadge label={stat.excellent} tone="border-accent-success/40 text-accent-success bg-accent-success/5" />
            <span className="font-data text-[10px] text-dynasty-muted">Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3" />
            <QualityBadge label={stat.good} tone="border-accent-info/40 text-accent-info bg-accent-info/5" />
            <span className="font-data text-[10px] text-dynasty-muted">Good</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3" />
            <QualityBadge label={stat.average} tone="border-dynasty-muted/40 text-dynasty-muted bg-dynasty-elevated" />
            <span className="font-data text-[10px] text-dynasty-muted">Average</span>
          </div>
          <div className="flex items-center gap-2">
            {stat.invertedScale ? (
              <TrendingUp className="h-3 w-3 text-accent-danger" />
            ) : (
              <TrendingDown className="h-3 w-3 text-accent-danger" />
            )}
            <QualityBadge label={stat.poor} tone="border-accent-danger/40 text-accent-danger bg-accent-danger/5" />
            <span className="font-data text-[10px] text-dynasty-muted">Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatsDefinitionLibraryPanel({
  definitions,
  filter,
  onFilterChange,
}: StatsDefinitionLibraryPanelProps) {
  const filtered =
    filter === 'all'
      ? definitions
      : definitions.filter((stat) => stat.category === filter);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filterOption) => (
          <button
            key={filterOption.key}
            type="button"
            onClick={() => onFilterChange(filterOption.key)}
            className={[
              'focus-ring rounded-md border px-3 py-1.5 font-heading text-xs transition-colors',
              filter === filterOption.key
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-dynasty-border bg-dynasty-surface text-dynasty-muted hover:border-dynasty-muted hover:text-dynasty-text',
            ].join(' ')}
          >
            {filterOption.label}
            <span className="ml-1.5 font-data text-[10px] opacity-70">
              {filterOption.key === 'all'
                ? definitions.length
                : definitions.filter((stat) => stat.category === filterOption.key).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((stat) => (
          <StatCard key={stat.key} stat={stat} />
        ))}
      </div>
    </>
  );
}
