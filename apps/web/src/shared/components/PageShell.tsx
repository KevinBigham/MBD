import { useEffect, useState, type ReactNode } from 'react';
import { Skeleton, cn } from '@mbd/ui';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  skeleton?: ReactNode;
}

function DefaultPageSkeleton() {
  return (
    <div className="space-y-6" data-testid="page-shell-default-skeleton">
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export function PageShell({
  children,
  className,
  loading = false,
  skeleton,
}: PageShellProps) {
  const reducedMotion = useEffectiveReducedMotion();
  const [entered, setEntered] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setEntered(true);
      return;
    }

    setEntered(false);
    const frameId = window.requestAnimationFrame(() => {
      setEntered(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [reducedMotion]);

  return (
    <div
      className={cn(
        'transition-[opacity,transform] duration-200 ease-out',
        reducedMotion ? 'opacity-100' : entered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        className,
      )}
      data-motion={reducedMotion ? 'reduced' : 'animated'}
      data-testid="page-shell"
    >
      {loading ? (skeleton ?? <DefaultPageSkeleton />) : children}
    </div>
  );
}
