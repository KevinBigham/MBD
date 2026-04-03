import { cn } from '@mbd/ui';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';

interface ProgressFillProps {
  value: number;
  toneClassName?: string;
  trackClassName?: string;
  barClassName?: string;
}

export function ProgressFill({
  value,
  toneClassName = 'bg-accent-primary',
  trackClassName,
  barClassName,
}: ProgressFillProps) {
  const reducedMotion = useEffectiveReducedMotion();
  const width = `${Math.max(0, Math.min(100, value))}%`;

  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-dynasty-border', trackClassName)}>
      <div
        className={cn(
          'h-full rounded-full',
          toneClassName,
          reducedMotion ? '' : 'transition-[width] duration-500 ease-out',
          barClassName,
        )}
        style={{ width }}
      />
    </div>
  );
}
