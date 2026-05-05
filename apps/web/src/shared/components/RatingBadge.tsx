import { gradeBadgeColor } from '@/shared/lib/grade';

export interface RatingBadgeProps {
  label?: string;
  value: number | string;
  grade?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function toneClass(value: number | string): string {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return 'border-dynasty-border bg-dynasty-elevated text-dynasty-text';
  }
  if (numericValue >= 70) {
    return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
  }
  if (numericValue >= 60) {
    return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
  }
  if (numericValue >= 50) {
    return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
  }
  return 'border-dynasty-border bg-dynasty-elevated text-dynasty-text';
}

function sizeClass(size: RatingBadgeProps['size']): string {
  if (size === 'lg') return 'px-4 py-3';
  if (size === 'sm') return 'px-2 py-1';
  return 'px-3 py-2';
}

function valueClass(size: RatingBadgeProps['size']): string {
  if (size === 'lg') return 'text-3xl';
  if (size === 'sm') return 'text-sm';
  return 'text-xl';
}

export function RatingBadge({
  label = 'OVR',
  value,
  grade = null,
  size = 'md',
  className = '',
}: RatingBadgeProps) {
  const ariaLabel = grade ? `${label} ${value}, grade ${grade}` : `${label} ${value}`;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-md border font-data font-bold ${toneClass(value)} ${sizeClass(size)} ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="text-[10px] uppercase tracking-[0.16em] opacity-75">{label}</span>
      <span className={valueClass(size)}>{value}</span>
      {grade ? (
        <span className={`rounded px-1.5 py-0.5 text-xs ${gradeBadgeColor(grade)}`}>{grade}</span>
      ) : null}
    </span>
  );
}
