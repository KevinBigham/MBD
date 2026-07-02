import {
  Newspaper,
  Search,
  ShieldAlert,
} from 'lucide-react';

interface PressRoomSummaryCardsProps {
  feedCount: number;
  scoutingCount: number;
  unreadCount: number;
}

export default function PressRoomSummaryCards({
  feedCount,
  scoutingCount,
  unreadCount,
}: PressRoomSummaryCardsProps): JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-2 font-heading text-xs uppercase text-dynasty-muted">
          <Newspaper className="h-4 w-4" />
          Archive Size
        </div>
        <div className="mt-2 font-data text-3xl text-dynasty-textBright">{feedCount}</div>
        <div className="mt-1 font-heading text-xs text-dynasty-muted">
          tagged stories on file
        </div>
      </div>
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-2 font-heading text-xs uppercase text-dynasty-muted">
          <ShieldAlert className="h-4 w-4" />
          Unread Queue
        </div>
        <div className="mt-2 font-data text-3xl text-accent-info">{unreadCount}</div>
        <div className="mt-1 font-heading text-xs text-dynasty-muted">
          items newer than your last visit
        </div>
      </div>
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-2 font-heading text-xs uppercase text-dynasty-muted">
          <Search className="h-4 w-4" />
          Scouting Desk
        </div>
        <div className="mt-2 font-data text-3xl text-accent-success">{scoutingCount}</div>
        <div className="mt-1 font-heading text-xs text-dynasty-muted">
          player development items
        </div>
      </div>
    </div>
  );
}
