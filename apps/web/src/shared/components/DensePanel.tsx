import { useId, type ReactNode } from 'react';
import { cn } from '@mbd/ui';

interface DensePanelProps {
  title: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
  headerClassName?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  subtitle?: ReactNode;
  subtitleClassName?: string;
  titleClassName?: string;
}

export function DensePanel({
  title,
  children,
  bodyClassName,
  className,
  headerClassName,
  icon,
  meta,
  subtitle,
  subtitleClassName,
  titleClassName,
}: DensePanelProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn('rounded-lg border border-dynasty-border bg-dynasty-surface', className)}
    >
      <div
        className={cn(
          'flex flex-col gap-2 border-b border-dynasty-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
          headerClassName,
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2
              id={titleId}
              className={cn('font-heading text-sm font-semibold text-dynasty-text', titleClassName)}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                className={cn(
                  'mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted',
                  subtitleClassName,
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {meta ? <div className="font-data text-xs text-dynasty-muted">{meta}</div> : null}
      </div>
      <div className={cn('p-4', bodyClassName)} data-testid="dense-panel-body">
        {children}
      </div>
    </section>
  );
}
