import type { PressRoomEntry } from '@/shared/types/pressRoom';
import PressDigestCardBody from './PressDigestCardBody';

interface PressDigestCardProps {
  feed: PressRoomEntry[];
  unreadCount: number;
}

export default function PressDigestCard({ feed, unreadCount }: PressDigestCardProps) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <PressDigestCardBody feed={feed} unreadCount={unreadCount} />
    </section>
  );
}
