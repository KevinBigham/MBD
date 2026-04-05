/**
 * Standings Trend Chart — horizontal bar chart of division standings.
 * User's team highlighted in orange, others in muted blue.
 */
import { useMemo } from 'react';
import {
  CHART_COLORS,
  CHART_FONTS,
  chartTooltipProps,
} from './chartTheme';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

/* ── pure data types ──────────────────────────────────────── */

export interface StandingsBarData {
  abbreviation: string;
  teamId: string;
  wins: number;
  losses: number;
  pct: number;
  gamesBack: number;
  isUser: boolean;
}

/* ── pure transformer ─────────────────────────────────────── */

export function transformStandingsData(
  standings: Array<{
    teamId: string;
    abbreviation: string;
    wins: number;
    losses: number;
    pct: string;
    gamesBack: number;
  }> | undefined | null,
  userTeamId: string,
): StandingsBarData[] {
  if (!standings || standings.length === 0) return [];

  return standings
    .map((team) => ({
      abbreviation: team.abbreviation,
      teamId: team.teamId,
      wins: team.wins,
      losses: team.losses,
      pct: parseFloat(team.pct) || 0,
      gamesBack: team.gamesBack,
      isUser: team.teamId === userTeamId,
    }))
    .sort((a, b) => b.pct - a.pct || a.gamesBack - b.gamesBack);
}

/* ── component ────────────────────────────────────────────── */

interface StandingsTrendChartProps {
  standings: Array<{
    teamId: string;
    abbreviation: string;
    wins: number;
    losses: number;
    pct: string;
    gamesBack: number;
  }> | undefined | null;
  userTeamId: string;
}

export default function StandingsTrendChart({ standings, userTeamId }: StandingsTrendChartProps) {
  const data = useMemo(
    () => transformStandingsData(standings, userTeamId),
    [standings, userTeamId],
  );

  if (data.length === 0) return null;

  const tooltip = chartTooltipProps();

  return (
    <div className="h-48 w-full" role="img" aria-label="Division standings chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 40 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
            strokeOpacity={0.3}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tick={{ fill: CHART_COLORS.text, fontFamily: CHART_FONTS.tick, fontSize: 10 }}
            axisLine={{ stroke: CHART_COLORS.grid, strokeOpacity: 0.5 }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="abbreviation"
            tick={{ fill: CHART_COLORS.text, fontFamily: CHART_FONTS.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            {...tooltip}
            formatter={(_value, _name, props) => {
              const p = props?.payload as StandingsBarData | undefined;
              if (!p) return ['', ''];
              return [`${p.wins}-${p.losses} (${p.pct.toFixed(3)})`, 'Record'];
            }}
          />
          <Bar dataKey="wins" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={entry.teamId}
                fill={entry.isUser ? CHART_COLORS.primary : CHART_COLORS.secondary}
                fillOpacity={entry.isUser ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
