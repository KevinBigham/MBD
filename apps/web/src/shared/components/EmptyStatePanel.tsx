import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@mbd/ui';

interface EmptyStatePanelProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyStatePanel({
  title,
  description,
  icon: Icon = Inbox,
  className,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStatePanelProps) {
  const hasAction = actionLabel && (actionHref || onAction);

  return (
    <div
      className={cn(
        'rounded-xl border border-dynasty-border bg-dynasty-elevated/80 px-4 py-6 text-center',
        className,
      )}
    >
      <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-dynasty-border bg-dynasty-surface text-dynasty-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 font-heading text-sm text-dynasty-textBright">{title}</div>
      <p className="mt-2 font-heading text-sm leading-6 text-dynasty-muted">{description}</p>
      {hasAction && (
        <div className="mt-4">
          {actionHref ? (
            <Link
              to={actionHref}
              className="focus-ring inline-flex items-center gap-1 rounded-md border border-dynasty-border px-3 py-1.5 font-heading text-xs text-dynasty-muted transition-colors hover:border-dynasty-muted hover:text-dynasty-text"
            >
              {actionLabel}
              <ChevronRight className="h-3 w-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="focus-ring inline-flex items-center gap-1 rounded-md border border-dynasty-border px-3 py-1.5 font-heading text-xs text-dynasty-muted transition-colors hover:border-dynasty-muted hover:text-dynasty-text"
            >
              {actionLabel}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
