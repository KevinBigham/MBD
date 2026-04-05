/**
 * Payroll Breakdown Chart — donut chart of payroll allocation.
 * Shows committed payroll vs remaining budget vs luxury tax overage.
 */
import { useMemo } from 'react';
import {
  CHART_COLORS,
  CHART_FONTS,
} from './chartTheme';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

/* ── pure data types ──────────────────────────────────────── */

export interface PayrollSlice {
  name: string;
  value: number;
  color: string;
}

/* ── pure transformer ─────────────────────────────────────── */

export function transformPayrollData(
  finances: { payroll: number; budget: number; luxuryTax: number } | undefined | null,
): PayrollSlice[] {
  if (!finances) return [];
  if (finances.budget <= 0 && finances.payroll <= 0) return [];

  const { payroll, budget, luxuryTax } = finances;
  const slices: PayrollSlice[] = [];

  // Committed payroll
  const committed = Math.max(0, payroll);
  if (committed > 0) {
    slices.push({ name: 'Committed', value: committed, color: CHART_COLORS.primary });
  }

  // Luxury tax overage (if over threshold)
  if (luxuryTax > 0) {
    slices.push({ name: 'Luxury Tax', value: luxuryTax, color: CHART_COLORS.danger });
  }

  // Remaining cap space
  const remaining = Math.max(0, budget - payroll);
  if (remaining > 0) {
    slices.push({ name: 'Available', value: remaining, color: CHART_COLORS.tertiary });
  }

  return slices;
}

/** Format salary as compact dollar string: $12.5M */
export function formatSalary(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

/* ── component ────────────────────────────────────────────── */

interface PayrollBreakdownChartProps {
  finances: { payroll: number; budget: number; luxuryTax: number } | undefined | null;
}

export default function PayrollBreakdownChart({ finances }: PayrollBreakdownChartProps) {
  const data = useMemo(() => transformPayrollData(finances), [finances]);

  if (data.length === 0) return null;

  const totalPayroll = finances?.payroll ?? 0;

  return (
    <div className="relative h-48 w-full" role="img" aria-label="Payroll breakdown chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: CHART_COLORS.tooltipBg,
              border: `1px solid ${CHART_COLORS.tooltipBorder}`,
              borderRadius: 4,
              fontFamily: CHART_FONTS.tick,
              fontSize: 11,
              color: CHART_COLORS.textBright,
            }}
            formatter={(value) => [formatSalary(Number(value ?? 0)), '']}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span
          className="text-dynasty-text"
          style={{ fontFamily: CHART_FONTS.tick, fontSize: 14, fontWeight: 600 }}
        >
          {formatSalary(totalPayroll)}
        </span>
      </div>
    </div>
  );
}
