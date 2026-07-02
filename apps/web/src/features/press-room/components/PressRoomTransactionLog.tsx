import { categoryLabel } from '@/shared/lib/labels';
import type { PressRoomEntry } from '@/shared/types/pressRoom';

interface PressRoomTransactionLogProps {
  transactionFeed: PressRoomEntry[];
}

function tagTone(tag: PressRoomEntry['tag']): string {
  switch (tag) {
    case 'BREAKING':
      return 'border-accent-danger/50 bg-accent-danger/10 text-accent-danger';
    case 'RUMOR':
      return 'border-accent-warning/50 bg-accent-warning/10 text-accent-warning';
    case 'WATCH':
      return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
    case 'DEBATE':
      return 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary';
    case 'ANALYSIS':
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function formatTimestampLabel(timestamp: string): string {
  if (timestamp === 'NOW') return 'Now';
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return timestamp;
  return `Season ${match[1]} • Day ${match[2]}`;
}

export default function PressRoomTransactionLog({
  transactionFeed,
}: PressRoomTransactionLogProps): JSX.Element {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="mb-4 flex items-center justify-between border-b border-dynasty-border pb-4">
        <div>
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            Transaction Log
          </h2>
          <p className="mt-1 font-heading text-xs text-dynasty-muted">
            League moves pulled from trade, signing, extension, qualifying-offer, coaching, and roster activity.
          </p>
        </div>
        <div className="rounded border border-dynasty-border px-3 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
          {transactionFeed.length} entries
        </div>
      </div>

      <div className="space-y-3">
        {transactionFeed.length > 0 ? transactionFeed.map((entry) => (
          <div
            key={`transaction-${entry.source}-${entry.id}`}
            className="flex flex-col gap-2 rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${tagTone(entry.tag)}`}>
                  {entry.tag}
                </span>
                <span className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
                  {categoryLabel(entry.category)}
                </span>
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-textBright">{entry.headline}</div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">{entry.body}</div>
            </div>
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {formatTimestampLabel(entry.timestamp)}
            </div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-6 text-center">
            <div className="font-heading text-sm text-dynasty-text">No league transactions match the current filters.</div>
          </div>
        )}
      </div>
    </section>
  );
}
