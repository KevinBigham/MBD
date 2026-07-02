import { ArrowRightLeft } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface OffseasonMarketDaySummaryView {
  id: string;
  day: number;
  category: 'signing' | 'trade';
  tone: 'user' | 'division_rival' | 'neutral';
  headline: string;
  detail: string;
  teamIds: string[];
  playerIds: string[];
  valueLabel?: string;
}

function rowToneClasses(tone: 'user' | 'division_rival' | 'neutral') {
  switch (tone) {
    case 'user':
      return 'border-l-2 border-accent-success bg-accent-success/10 text-accent-success';
    case 'division_rival':
      return 'border-l-2 border-accent-warning bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-l-2 border-dynasty-border bg-dynasty-elevated text-dynasty-text';
  }
}

export function OffseasonMarketDayBriefingPanel({ summaries }: { summaries: OffseasonMarketDaySummaryView[] }) {
  return (
    <DensePanel
      title="Market Day Briefing"
      icon={<ArrowRightLeft className="h-4 w-4 text-accent-primary" />}
      meta={`${summaries.length} major move${summaries.length === 1 ? '' : 's'}`}
      titleClassName="uppercase tracking-[0.18em]"
      bodyClassName="grid gap-3 p-4 lg:grid-cols-2"
    >
      {summaries.map((summary) => (
        <div key={summary.id} className={`rounded px-3 py-3 ${rowToneClasses(summary.tone)}`}>
          <div className="flex flex-wrap items-center gap-2 font-data text-[10px] uppercase tracking-[0.16em]">
            <span>{summary.category === 'signing' ? 'Signing' : 'Trade'}</span>
            <span>Day {summary.day}</span>
            {summary.valueLabel ? <span>{summary.valueLabel}</span> : null}
          </div>
          <div className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">
            {summary.headline}
          </div>
          <div className="mt-1 font-data text-xs leading-5 text-dynasty-text">
            {summary.detail}
          </div>
        </div>
      ))}
    </DensePanel>
  );
}
