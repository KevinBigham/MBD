import {
  Award,
  Flame,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';

export interface CareerRetrospectiveAwardsShelfView {
  mvp: number;
  cyYoung: number;
  rookieOfTheYear: number;
  goldGlove: number;
  silverSlugger: number;
  allStar: number;
  other: number;
  total: number;
}

export default function CareerRetrospectiveAwardsShelf({
  shelf,
}: {
  shelf: CareerRetrospectiveAwardsShelfView;
}) {
  const items: Array<{ key: string; label: string; count: number; icon: typeof Award }> = [
    { key: 'mvp', label: 'MVP', count: shelf.mvp, icon: Trophy },
    { key: 'cyYoung', label: 'Cy Young', count: shelf.cyYoung, icon: Flame },
    { key: 'roy', label: 'ROY', count: shelf.rookieOfTheYear, icon: Sparkles },
    { key: 'gg', label: 'Gold Glove', count: shelf.goldGlove, icon: Star },
    { key: 'ss', label: 'Silver Slugger', count: shelf.silverSlugger, icon: Award },
    { key: 'allStar', label: 'All-Star', count: shelf.allStar, icon: Star },
  ];

  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-accent-warning" />
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Awards Shelf</div>
        </div>
        <div className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
          Total <span className="text-dynasty-textBright">{shelf.total}</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 md:grid-cols-6">
        {items.map(({ key, label, count, icon: Icon }) => (
          <div
            key={key}
            className="rounded border border-dynasty-border/60 bg-dynasty-elevated/70 px-2 py-1.5"
          >
            <div className="flex items-center gap-1">
              <Icon className="h-3 w-3 text-dynasty-muted" />
              <span className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">{label}</span>
            </div>
            <div className={`mt-0.5 font-heading text-base font-semibold ${count > 0 ? 'text-dynasty-textBright' : 'text-dynasty-muted'}`}>
              {count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
