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
import { GitBranch } from 'lucide-react';
import type { TimelineComparison } from '@mbd/contracts';
import { CHART_COLORS, chartTooltipProps } from '@/shared/components/charts/chartTheme';
import TimelineComparisonDeltaMetric, {
  formatTimelineComparisonDelta,
  timelineComparisonDeltaColor,
} from './TimelineComparisonDeltaMetric';
import TimelineComparisonRosterFlow from './TimelineComparisonRosterFlow';

interface TimelineComparisonPanelProps {
  comparison: TimelineComparison;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0])!;
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
        <div className={`font-data text-2xl font-bold ${timelineComparisonDeltaColor(recordDelta.delta)}`}>
          {formatTimelineComparisonDelta(recordDelta.delta, 'W')}
        </div>
      </div>

      {/* Delta Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TimelineComparisonDeltaMetric
          label="Record"
          parentValue={`${mainRecord} (${mainPct})`}
          branchValue={`${branchRecord} (${branchPct})`}
          delta={recordDelta.delta}
        />
        <TimelineComparisonDeltaMetric
          label="Division Rank"
          parentValue={ordinal(standingsDelta.parent.divisionRank)}
          branchValue={ordinal(standingsDelta.branch.divisionRank)}
          delta={standingsDelta.delta}
          invertColor
        />
        <TimelineComparisonDeltaMetric
          label="Championships"
          parentValue={String(championshipsDelta.parent)}
          branchValue={String(championshipsDelta.branch)}
          delta={championshipsDelta.delta}
          suffix=""
        />
        <TimelineComparisonDeltaMetric
          label="Trades Made"
          parentValue={String(tradesDelta.parent)}
          branchValue={String(tradesDelta.branch)}
          delta={tradesDelta.delta}
        />
      </div>

      {/* Bar Chart */}
      <ComparisonBarChart comparison={comparison} />

      {/* Roster Flow */}
      <TimelineComparisonRosterFlow rosterDelta={comparison.rosterDelta} />
    </div>
  );
}
