import { Newspaper } from 'lucide-react';
import type { PressRoomEntry } from '@/shared/types/pressRoom';

export interface PressDigestCardBodyProps {
  feed: PressRoomEntry[];
  unreadCount: number;
}

function tagTone(tag: PressRoomEntry['tag']): string {
  switch (tag) {
    case 'BREAKING':
      return 'border-accent-danger/50 text-accent-danger';
    case 'RUMOR':
      return 'border-accent-warning/50 text-accent-warning';
    default:
      return 'border-dynasty-border text-dynasty-muted';
  }
}

export default function PressDigestCardBody({ feed, unreadCount }: PressDigestCardBodyProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-accent-warning" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Press Digest</h2>
        </div>
        <div className="rounded-full border border-dynasty-border px-2 py-1 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
          {unreadCount} unread
        </div>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {feed.length > 0 ? feed.slice(0, 3).map((entry) => (
          <div key={entry.id} className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
            <div className="flex items-center gap-2">
              <span className={`rounded border px-2 py-0.5 font-heading text-[10px] uppercase tracking-wide ${tagTone(entry.tag)}`}>
                {entry.tag}
              </span>
              <span className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">{entry.timestamp}</span>
            </div>
            <div className="mt-2 font-heading text-sm text-dynasty-textBright">{entry.headline}</div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">{entry.body}</div>
          </div>
        )) : (
          <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
            The press room will populate as the season builds storylines.
          </div>
        )}
      </div>
    </>
  );
}
