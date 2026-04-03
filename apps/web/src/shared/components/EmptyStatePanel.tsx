import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@mbd/ui';

interface EmptyStatePanelProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyStatePanel({
  title,
  description,
  icon: Icon = Inbox,
  className,
}: EmptyStatePanelProps) {
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
    </div>
  );
}
