import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type AttentionDeskTone = 'danger' | 'warning' | 'info' | 'success';

export interface AttentionDeskItem {
  id: string;
  title: string;
  detail: string;
  to: string;
  tone: AttentionDeskTone;
}

const attentionToneClass: Record<AttentionDeskTone, string> = {
  danger: 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger',
  warning: 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning',
  info: 'border-accent-info/40 bg-accent-info/10 text-accent-info',
  success: 'border-accent-success/40 bg-accent-success/10 text-accent-success',
};

export default function AttentionDesk({ items }: { items: AttentionDeskItem[] }): JSX.Element {
  return (
    <section className="rounded-xl border border-accent-primary/30 bg-dynasty-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-primary">Decision Desk</div>
          <h2 className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">What needs attention</h2>
        </div>
        <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          Top {items.length}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className={`group rounded-lg border p-3 transition-colors hover:border-accent-primary/50 ${attentionToneClass[item.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-sm text-dynasty-textBright">{item.title}</div>
                <div className="mt-1 font-heading text-xs leading-5 text-dynasty-muted">{item.detail}</div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
