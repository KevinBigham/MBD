import type { HistoryTab } from '../lib/historyPageTransforms';

interface HistoryMainTabsProps {
  onSelectTab: (tab: HistoryTab) => void;
  selectedTab: HistoryTab;
  tabs: readonly HistoryTab[];
}

function labelForHistoryTab(tab: HistoryTab): string {
  if (tab === 'awards') return 'Awards / HOF';
  if (tab === 'legacy') return 'Legacy';
  if (tab === 'leaders') return 'All-Time Leaders';
  return tab;
}

export default function HistoryMainTabs({
  onSelectTab,
  selectedTab,
  tabs,
}: HistoryMainTabsProps) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            data-mobile-critical-control="history-main-tab"
            className={`mobile-critical-control rounded border px-3 py-2 font-heading text-xs uppercase tracking-[0.16em] ${
              selectedTab === tab
                ? 'border-accent-primary bg-accent-primary/10 text-dynasty-textBright'
                : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted'
            }`}
            onClick={() => onSelectTab(tab)}
            type="button"
          >
            {labelForHistoryTab(tab)}
          </button>
        ))}
      </div>
    </section>
  );
}
