import { Link } from 'react-router-dom';
import { Flame, History, TrendingUp, Trophy } from 'lucide-react';
import { Badge } from '@mbd/ui';
import type { RecordBookEntry, RecordWatchEntry } from '@mbd/contracts';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { categoryLabel } from '@/shared/lib/labels';
import type { RecordBookGroups } from '../hooks/useRecordWatchRouteData';

export type RecordWatchViewMode = 'watch' | 'franchise' | 'league';

interface RecordWatchContentPanelProps {
  recordBook: RecordBookGroups;
  season: number;
  viewMode: RecordWatchViewMode;
  watchList: readonly RecordWatchEntry[];
  onViewModeChange: (viewMode: RecordWatchViewMode) => void;
}

function paceColor(ratio: number): string {
  if (ratio >= 0.9) return 'text-accent-danger';
  if (ratio >= 0.7) return 'text-accent-warning';
  if (ratio >= 0.5) return 'text-accent-info';
  return 'text-dynasty-muted';
}

function paceTone(ratio: number): string {
  if (ratio >= 0.9) return 'bg-accent-danger';
  if (ratio >= 0.7) return 'bg-accent-warning';
  if (ratio >= 0.5) return 'bg-accent-info';
  return 'bg-dynasty-muted/50';
}

function categoryColor(cat: string): string {
  switch (cat) {
    case 'batting': return 'text-accent-success border-accent-success/30';
    case 'pitching': return 'text-accent-info border-accent-info/30';
    case 'team': return 'text-accent-warning border-accent-warning/30';
    default: return 'text-dynasty-muted border-dynasty-border';
  }
}

function formatRecordValue(value: number | null | undefined, digitsForDecimal: number): string {
  if (typeof value !== 'number') {
    return '-';
  }

  return value.toFixed(value % 1 === 0 ? 0 : digitsForDecimal);
}

function WatchCard({ entry }: { entry: RecordWatchEntry }) {
  const pct = Math.round(entry.progressRatio * 100);
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 transition-colors hover:border-accent-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/players/${entry.playerId}`}
            className="font-heading text-sm font-medium text-dynasty-text hover:text-accent-primary"
          >
            {entry.playerName}
          </Link>
          <p className="mt-0.5 font-data text-[10px] uppercase tracking-wider text-dynasty-muted">
            {entry.teamId.toUpperCase()} &middot; {entry.recordLabel}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-data text-lg font-bold ${paceColor(entry.progressRatio)}`}>
            {pct}%
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">pace</div>
        </div>
      </div>

      <div className="mt-3">
        <ProgressFill value={pct} toneClassName={paceTone(entry.progressRatio)} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-data text-sm font-bold text-dynasty-text">
            {formatRecordValue(entry.currentValue, 2)}
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">Current</div>
        </div>
        <div>
          <div className="font-data text-sm font-bold text-accent-primary">
            {formatRecordValue(entry.projectedValue, 1)}
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">Projected</div>
        </div>
        <div>
          <div className="font-data text-sm font-bold text-accent-warning">
            {formatRecordValue(entry.holderValue, 2)}
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">Record</div>
        </div>
      </div>

      <p className="mt-2 font-data text-xs italic text-dynasty-muted">{entry.summary}</p>
    </div>
  );
}

function RecordBookTable({ entries, scope }: { entries: readonly RecordBookEntry[]; scope: string }) {
  if (entries.length === 0) {
    return (
      <EmptyStatePanel
        icon={Trophy}
        title={`No ${scope} records yet`}
        description="Records populate as seasons are played."
      />
    );
  }

  const grouped = entries.reduce<Record<string, RecordBookEntry[]>>((acc, entry) => {
    const cat = entry.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, records]) => (
        <div key={category}>
          <h3 className="mb-3 font-heading text-xs uppercase tracking-wider text-dynasty-muted">
            {categoryLabel(category)}
          </h3>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dynasty-border text-[10px] uppercase tracking-wider text-dynasty-muted">
                  <th className="px-4 py-2 text-left font-heading">Record</th>
                  <th className="px-3 py-2 text-right font-heading">Value</th>
                  <th className="px-3 py-2 text-left font-heading">Holder</th>
                  <th className="px-4 py-2 text-right font-heading">Season</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const holder = record.holders[0];
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated"
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Badge className={categoryColor(record.category)}>{categoryLabel(record.category)}</Badge>
                          <span className="font-heading text-sm text-dynasty-text">{record.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-data font-bold text-accent-primary">
                        {holder?.displayValue ?? '-'}
                      </td>
                      <td className="px-3 py-2">
                        {holder?.playerId != null ? (
                          <Link
                            to={`/players/${holder.playerId}`}
                            className="font-heading text-sm text-dynasty-text hover:text-accent-primary"
                          >
                            {holder.playerName ?? holder.teamId?.toUpperCase() ?? '-'}
                          </Link>
                        ) : (
                          <span className="font-heading text-sm text-dynasty-muted">
                            {holder?.playerName ?? holder?.teamId?.toUpperCase() ?? '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-data text-dynasty-muted">
                        {holder?.season ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

const VIEW_TABS: { key: RecordWatchViewMode; label: string; icon: typeof Flame }[] = [
  { key: 'watch', label: 'Record Watch', icon: TrendingUp },
  { key: 'franchise', label: 'Franchise Records', icon: Trophy },
  { key: 'league', label: 'League Records', icon: History },
];

export function RecordWatchContentPanel({
  recordBook,
  season,
  viewMode,
  watchList,
  onViewModeChange,
}: RecordWatchContentPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Record Watch</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            Season {season} &mdash; tracking {watchList.length} active record chases
          </p>
        </div>
        <Link
          to="/stats"
          className="flex items-center gap-2 rounded-md border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary"
        >
          <Flame className="h-4 w-4" />
          Stats Reference
        </Link>
      </div>

      <div className="flex gap-2">
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onViewModeChange(tab.key)}
              className={[
                'focus-ring flex items-center gap-2 rounded-md border px-4 py-2 font-heading text-xs transition-colors',
                viewMode === tab.key
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border bg-dynasty-surface text-dynasty-muted hover:border-dynasty-muted hover:text-dynasty-text',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === 'watch' && watchList.length > 0 && (
                <span className="ml-1 rounded-full bg-accent-primary/20 px-1.5 py-0.5 font-data text-[10px] text-accent-primary">
                  {watchList.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {viewMode === 'watch' && (
        <>
          {watchList.length === 0 ? (
            <EmptyStatePanel
              icon={TrendingUp}
              title="No active record chases"
              description="As the season progresses, players approaching records will appear here with pace projections."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {watchList.map((entry) => (
                <WatchCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'franchise' && (
        <RecordBookTable entries={recordBook.franchise} scope="franchise" />
      )}

      {viewMode === 'league' && (
        <RecordBookTable entries={recordBook.league} scope="league" />
      )}
    </div>
  );
}
