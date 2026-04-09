const GRADE_COLORS: Record<string, string> = {
  A: 'bg-accent-success/15 text-accent-success border-accent-success/30',
  'A+': 'bg-accent-success/15 text-accent-success border-accent-success/30',
  'A-': 'bg-accent-success/15 text-accent-success border-accent-success/30',
  B: 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
  'B+': 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
  'B-': 'bg-accent-primary/15 text-accent-primary border-accent-primary/30',
  C: 'bg-accent-warning/15 text-accent-warning border-accent-warning/30',
  'C+': 'bg-accent-warning/15 text-accent-warning border-accent-warning/30',
  'C-': 'bg-accent-warning/15 text-accent-warning border-accent-warning/30',
  D: 'bg-accent-danger/15 text-accent-danger border-accent-danger/30',
  'D+': 'bg-accent-danger/15 text-accent-danger border-accent-danger/30',
  'D-': 'bg-accent-danger/15 text-accent-danger border-accent-danger/30',
  F: 'bg-accent-danger/15 text-accent-danger border-accent-danger/30',
};

interface GradeBadgeProps {
  grade: string;
  className?: string;
  size?: 'sm' | 'lg';
}

export function GradeBadge({ grade, className = '', size = 'sm' }: GradeBadgeProps) {
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS['C']!;
  const sizeClass = size === 'lg'
    ? 'px-2.5 py-1 text-lg font-bold'
    : 'px-1.5 py-0.5 text-xs font-semibold';

  return (
    <span className={`inline-block rounded border font-data ${sizeClass} ${colors} ${className}`}>
      {grade}
    </span>
  );
}
