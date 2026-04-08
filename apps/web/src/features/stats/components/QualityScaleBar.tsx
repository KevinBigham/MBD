/**
 * QualityScaleBar — visual representation of where a value falls on a quality scale.
 *
 * Shows a horizontal bar with labeled zones (Excellent, Good, Average, Poor)
 * and a marker for the current value. Used in the Stats Encyclopedia.
 */

interface QualityZone {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly color: string;
}

interface QualityScaleBarProps {
  /** Current value to mark on the scale */
  readonly value?: number;
  /** Label for the value marker */
  readonly valueLabel?: string;
  /** Quality zones from best to worst */
  readonly zones: readonly QualityZone[];
  /** Whether higher values are better (true) or lower is better (false, e.g., ERA) */
  readonly higherIsBetter?: boolean;
}

export function QualityScaleBar({ value, valueLabel, zones, higherIsBetter = true }: QualityScaleBarProps) {
  if (zones.length === 0) return null;

  const allMin = Math.min(...zones.map((z) => z.min));
  const allMax = Math.max(...zones.map((z) => z.max));
  const range = allMax - allMin;

  const getPosition = (v: number) => {
    if (range === 0) return 50;
    return ((v - allMin) / range) * 100;
  };

  const sortedZones = higherIsBetter
    ? [...zones].sort((a, b) => a.min - b.min)
    : [...zones].sort((a, b) => a.min - b.min);

  return (
    <div className="space-y-1.5">
      {/* Scale bar */}
      <div className="relative h-3 w-full rounded-full overflow-hidden flex">
        {sortedZones.map((zone) => {
          const width = range > 0 ? ((zone.max - zone.min) / range) * 100 : 100 / zones.length;
          return (
            <div
              key={zone.label}
              className="h-full"
              style={{ width: `${width}%`, backgroundColor: zone.color }}
              title={`${zone.label}: ${zone.min.toFixed(3)} - ${zone.max.toFixed(3)}`}
            />
          );
        })}

        {/* Value marker */}
        {value !== undefined && range > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]"
            style={{ left: `${Math.max(0, Math.min(100, getPosition(value)))}%` }}
          />
        )}
      </div>

      {/* Zone labels */}
      <div className="flex text-[9px] font-data text-dynasty-muted">
        {sortedZones.map((zone) => {
          const width = range > 0 ? ((zone.max - zone.min) / range) * 100 : 100 / zones.length;
          return (
            <div key={zone.label} className="text-center truncate" style={{ width: `${width}%` }}>
              {zone.label}
            </div>
          );
        })}
      </div>

      {/* Value annotation */}
      {value !== undefined && (
        <div className="text-center text-[10px] font-data text-dynasty-text">
          {valueLabel ? `${valueLabel}: ` : ''}{value.toFixed(3)}
        </div>
      )}
    </div>
  );
}

/** Preset quality scales for common stats */
export const QUALITY_SCALES = {
  wOBA: [
    { label: 'Poor', min: 0.200, max: 0.290, color: '#F43F5E' },
    { label: 'Below Avg', min: 0.290, max: 0.320, color: '#F59E0B' },
    { label: 'Average', min: 0.320, max: 0.350, color: '#8A9BB5' },
    { label: 'Good', min: 0.350, max: 0.380, color: '#38BDF8' },
    { label: 'Excellent', min: 0.380, max: 0.450, color: '#22C55E' },
  ],
  OPS: [
    { label: 'Poor', min: 0.500, max: 0.650, color: '#F43F5E' },
    { label: 'Below Avg', min: 0.650, max: 0.720, color: '#F59E0B' },
    { label: 'Average', min: 0.720, max: 0.800, color: '#8A9BB5' },
    { label: 'Good', min: 0.800, max: 0.900, color: '#38BDF8' },
    { label: 'Excellent', min: 0.900, max: 1.100, color: '#22C55E' },
  ],
  ERA: [
    { label: 'Excellent', min: 2.00, max: 3.00, color: '#22C55E' },
    { label: 'Good', min: 3.00, max: 3.50, color: '#38BDF8' },
    { label: 'Average', min: 3.50, max: 4.20, color: '#8A9BB5' },
    { label: 'Below Avg', min: 4.20, max: 5.00, color: '#F59E0B' },
    { label: 'Poor', min: 5.00, max: 6.50, color: '#F43F5E' },
  ],
  FIP: [
    { label: 'Excellent', min: 2.50, max: 3.20, color: '#22C55E' },
    { label: 'Good', min: 3.20, max: 3.70, color: '#38BDF8' },
    { label: 'Average', min: 3.70, max: 4.20, color: '#8A9BB5' },
    { label: 'Below Avg', min: 4.20, max: 4.80, color: '#F59E0B' },
    { label: 'Poor', min: 4.80, max: 6.00, color: '#F43F5E' },
  ],
  AVG: [
    { label: 'Poor', min: 0.180, max: 0.230, color: '#F43F5E' },
    { label: 'Below Avg', min: 0.230, max: 0.260, color: '#F59E0B' },
    { label: 'Average', min: 0.260, max: 0.290, color: '#8A9BB5' },
    { label: 'Good', min: 0.290, max: 0.320, color: '#38BDF8' },
    { label: 'Excellent', min: 0.320, max: 0.380, color: '#22C55E' },
  ],
  WAR: [
    { label: 'Replacement', min: -1.0, max: 0.5, color: '#F43F5E' },
    { label: 'Below Avg', min: 0.5, max: 2.0, color: '#F59E0B' },
    { label: 'Average', min: 2.0, max: 3.5, color: '#8A9BB5' },
    { label: 'Good', min: 3.5, max: 5.5, color: '#38BDF8' },
    { label: 'All-Star', min: 5.5, max: 8.5, color: '#22C55E' },
  ],
} as const;
