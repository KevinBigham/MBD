/**
 * TimelineComparisonPanel — Enhanced visual comparison between the main
 * timeline and a what-if branch. Shows bar chart deltas, roster flow,
 * and key divergence metrics.
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GitBranch, TrendingUp, TrendingDown, Minus, Trophy, ArrowLeftRight, Users } from 'lucide-react';
import type { TimelineComparison } from '@mbd/contracts';
import { CHART_COLORS, chartTooltipProps } from '@/shared/components/charts/chartTheme';

interface TimelineComparisonPanelProps {
  comparison: TimelineComparison;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-accent-success';
  if (delta < 0) return 'text-accent-danger';
  return 'text-dynasty-muted';
}

function deltaIcon(delta: number) {
  if (delta > 0) return <TrendingUp className="h-4 w-4 text-accent-success" />;
  if (delta < 0) return <TrendingDown className="h-4 w-4 text-accent-danger" />;
  return <Minus className="h-4 w-4 text-dynasty-muted" />;
}

function formatDelta(delta: number, suffix = ''): string {
  if (delta > 0) return `+${delta}${suffix}`;
  return `${delta}${suffix}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0])!;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DeltaMetric({
  label,
  parentValue,
  branchValue,
  delta,
  suffix,
  invertColor,
}: {
  label: string;
  parentValue: string;
  branchValue: string;
  delta: number;
  suffix?: string;
  invertColor?: boolean;
}) {
  const effectiveDelta = invertColor ? -delta : delta;
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center justify-between">
        <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</span>
        {deltaIcon(effectiveDelta)}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-data text-[10px] text-dynasty-muted">Main</div>
          <div className="font-data text-lg text-dynasty-text">{parentValue}</div>
        </div>
        <div className={`font-data text-2xl font-bold ${deltaColor(effectiveDelta)}`}>
          {formatDelta(effectiveDelta, suffix)}
        </div>
        <div className="text-right">
          <div className="font-data text-[10px] text-dynasty-muted">Branch</div>
          <div className="font-data text-lg text-accent-info">{branchValue}</div>
        </div>
      </div>
    </div>
  );
}

function ComparisonBarChart({ comparison }: { comparison: TimelineComparison }) {
  const data = useMemo(
    () => [
      {
        name: 'Wins',
        main: comparison.recordDelta.parent.wins,
        branch: comparison.recordDelta.branch.wins,
      },
      {
        name: 'Losses',
        main: comparison.recordDelta.parent.losses,
        branch: comparison.recordDelta.branch.losses,
      },
      {
        name: 'Titles',
        main: comparison.championshipsDelta.parent,
        branch: comparison.championshipsDelta.branch,
      },
      {
        name: 'Trades',
        main: comparison.tradesDelta.parent,
        branch: comparison.tradesDelta.branch,
      },
    ],
    [comparison],
  );

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-accent-primary" />
          <span className="font-data text-[10px] text-dynasty-muted">Main Timeline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-accent-info" />
          <span className="font-data text-[10px] text-dynasty-muted">Branch</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_COLORS.text, fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: CHART_COLORS.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.text, fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            {...chartTooltipProps()}
            formatter={(value, name) => [String(value), name === 'main' ? 'Main' : 'Branch']}
          />
          <Bar dataKey="main" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} maxBarSize={32} />
          <Bar dataKey="branch" fill={CHART_COLORS.secondary} radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RosterFlow({ comparison }: { comparison: TimelineComparison }) {
  const { added, lost } = comparison.rosterDelta;
  if (added.length === 0 && lost.length === 0) {
    return (
      <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-dynasty-muted" />
          <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Roster Changes</span>
        </div>
        <p className="mt-2 font-heading text-sm text-dynasty-muted">No roster divergence between timelines.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-dynasty-muted" />
        <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Roster Divergence</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {added.length > 0 && (
          <div>
            <div className="font-data text-[10px] text-accent-success">
              +{added.length} Acquired in Branch
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {added.map((name) => (
                <span
                  key={name}
                  className="rounded border border-accent-success/30 bg-accent-success/10 px-2 py-0.5 font-data text-[11px] text-accent-success"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
        {lost.length > 0 && (
          <div>
            <div className="font-data text-[10px] text-accent-danger">
              -{lost.length} Lost in Branch
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {lost.map((name) => (
                <span
                  key={name}
                  className="rounded border border-accent-danger/30 bg-accent-danger/10 px-2 py-0.5 font-data text-[11px] text-accent-danger"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TimelineComparisonPanel({ comparison }: TimelineComparisonPanelProps) {
  const { branchMeta, recordDelta, standingsDelta, championshipsDelta, tradesDelta } = comparison;

  const mainRecord = `${recordDelta.parent.wins}-${recordDelta.parent.losses}`;
  const branchRecord = `${recordDelta.branch.wins}-${recordDelta.branch.losses}`;
  const mainPct = recordDelta.parent.pct.toFixed(3);
  const branchPct = recordDelta.branch.pct.toFixed(3);

  return (
    <div className="space-y-4 rounded-xl border border-dynasty-border bg-dynasty-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-info/10">
            <GitBranch className="h-5 w-5 text-accent-info" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-dynasty-textBright">
              {branchMeta.description || 'Unnamed Branch'}
            </h3>
            <p className="font-data text-[11px] text-dynasty-muted">
              Forked at Season {branchMeta.branchedAtSeason}, Day {branchMeta.branchedAtDay}
            </p>
          </div>
        </div>
        <div className={`font-data text-2xl font-bold ${deltaColor(recordDelta.delta)}`}>
          {formatDelta(recordDelta.delta, 'W')}
        </div>
      </div>

      {/* Delta Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DeltaMetric
          label="Record"
          parentValue={`${mainRecord} (${mainPct})`}
          branchValue={`${branchRecord} (${branchPct})`}
          delta={recordDelta.delta}
        />
        <DeltaMetric
          label="Division Rank"
          parentValue={ordinal(standingsDelta.parent.divisionRank)}
          branchValue={ordinal(standingsDelta.branch.divisionRank)}
          delta={standingsDelta.delta}
          invertColor
        />
        <DeltaMetric
          label="Championships"
          parentValue={String(championshipsDelta.parent)}
          branchValue={String(championshipsDelta.branch)}
          delta={championshipsDelta.delta}
          suffix=""
        />
        <DeltaMetric
          label="Trades Made"
          parentValue={String(tradesDelta.parent)}
          branchValue={String(tradesDelta.branch)}
          delta={tradesDelta.delta}
        />
      </div>

      {/* Bar Chart */}
      <ComparisonBarChart comparison={comparison} />

      {/* Roster Flow */}
      <RosterFlow comparison={comparison} />
    </div>
  );
}
