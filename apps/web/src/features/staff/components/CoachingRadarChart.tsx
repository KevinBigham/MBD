import { type FC } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Target } from 'lucide-react';

interface CoachRadarData {
  name: string;
  teaching: number;
  impact: number;
  fit: number;
  role: string;
}

interface CoachingRadarChartProps {
  coaches: CoachRadarData[];
}

const COACH_COLORS = [
  '#f97316',
  '#38BDF8',
  '#22C55E',
  '#F59E0B',
  '#F43F5E',
  '#a855f7',
] as const;

const CoachingRadarChart: FC<CoachingRadarChartProps> = ({ coaches }) => {
  if (coaches.length === 0) {
    return (
      <div className="rounded-lg bg-dynasty-elevated border border-dynasty-muted/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-dynasty-muted" />
          <h3 className="text-dynasty-light font-heading font-semibold text-sm">
            Staff Radar
          </h3>
        </div>
        <div className="flex items-center justify-center h-[280px] text-dynasty-muted text-sm">
          No coaching staff data
        </div>
      </div>
    );
  }

  const radarData = [
    {
      axis: 'Teaching',
      ...Object.fromEntries(
        coaches.map((c, i) => [`coach${i}`, c.teaching]),
      ),
    },
    {
      axis: 'Impact',
      ...Object.fromEntries(
        coaches.map((c, i) => [`coach${i}`, c.impact]),
      ),
    },
    {
      axis: 'Fit',
      ...Object.fromEntries(
        coaches.map((c, i) => [`coach${i}`, c.fit]),
      ),
    },
  ];

  return (
    <div className="rounded-lg bg-dynasty-elevated border border-dynasty-muted/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-dynasty-muted" />
        <h3 className="text-dynasty-light font-heading font-semibold text-sm">
          Staff Radar
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#1E3A6E" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#8A9BB5', fontSize: 11 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} />
          {coaches.map((coach, i) => (
            <Radar
              key={coach.name}
              name={coach.name}
              dataKey={`coach${i}`}
              stroke={COACH_COLORS[i % COACH_COLORS.length]}
              fill={COACH_COLORS[i % COACH_COLORS.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F1923',
              border: '1px solid #1E3A6E',
              borderRadius: '0.375rem',
              color: '#C9D6E8',
              fontSize: '12px',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-3 px-1">
        {coaches.map((coach, i) => (
          <div key={coach.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: COACH_COLORS[i % COACH_COLORS.length],
              }}
            />
            <span className="text-dynasty-muted text-xs">{coach.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoachingRadarChart;
