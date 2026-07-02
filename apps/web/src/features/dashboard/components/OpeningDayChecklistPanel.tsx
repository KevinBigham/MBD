import { Link } from 'react-router-dom';
import { DensePanel } from '@/shared/components/DensePanel';

interface OpeningDayChecklistPanelProps {
  activeTradeOffers: number;
  pressUnreadCount: number;
  topProspectName: string | null;
}

export default function OpeningDayChecklistPanel({
  activeTradeOffers,
  pressUnreadCount,
  topProspectName,
}: OpeningDayChecklistPanelProps): JSX.Element {
  const checklist = [
    {
      id: 'roster',
      label: 'Roster compliance',
      detail: 'Confirm 26-man and 40-man limits before the first sim.',
      to: '/roster',
    },
    {
      id: 'lineup',
      label: 'Lineup and rotation',
      detail: 'Review roles, fatigue, injuries, and depth before Opening Day.',
      to: '/roster',
    },
    {
      id: 'staff-finance',
      label: 'Staff, scouting, finance',
      detail: topProspectName
        ? `${topProspectName} is the first pipeline name to keep on your radar.`
        : 'Check staff fit and budget posture before the calendar starts moving.',
      to: '/staff',
    },
    {
      id: 'trade',
      label: 'Trade posture',
      detail: activeTradeOffers > 0
        ? `${activeTradeOffers} live offer${activeTradeOffers === 1 ? '' : 's'} need a verdict.`
        : 'Set the tone before the market starts calling.',
      to: '/trade',
    },
    {
      id: 'press',
      label: 'Press room',
      detail: pressUnreadCount > 0
        ? `${pressUnreadCount} unread item${pressUnreadCount === 1 ? '' : 's'} before the first pitch.`
        : 'Scan the public narrative before the first pitch.',
      to: '/press-room',
    },
    {
      id: 'sim',
      label: 'First sim',
      detail: 'When the desk is clean, run Sim Day from the dashboard controls.',
      to: '/dashboard',
    },
  ];

  return (
    <DensePanel
      title="Six checks before first pitch"
      subtitle="Opening Day Checklist"
      subtitleClassName="text-accent-info"
      titleClassName="text-dynasty-textBright"
      meta={
        <span className="rounded-full border border-accent-success/40 bg-accent-success/10 px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-accent-success">
          Demo desk ready
        </span>
      }
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {checklist.map((item, index) => (
          <Link
            key={item.id}
            to={item.to}
            className="rounded-lg border border-dynasty-border/70 bg-dynasty-elevated p-3 transition-colors hover:border-accent-info/50 hover:bg-dynasty-surface"
          >
            <div className="flex items-center gap-2">
              <span className="font-data text-[11px] text-accent-info">{String(index + 1).padStart(2, '0')}</span>
              <span className="font-heading text-sm text-dynasty-textBright">{item.label}</span>
            </div>
            <div className="mt-2 font-heading text-xs leading-5 text-dynasty-muted">{item.detail}</div>
          </Link>
        ))}
      </div>
    </DensePanel>
  );
}
