export const SEASON_BROWSER_TABS = ['standings', 'playoffs', 'awards', 'leaders', 'transactions', 'draft', 'financials'] as const;
export type SeasonBrowserTab = (typeof SEASON_BROWSER_TABS)[number];

const COMPACT_ARCHIVE_DISABLED_TABS = new Set<SeasonBrowserTab>([
  'transactions',
  'draft',
  'financials',
]);

interface SeasonBrowserTabsProps {
  archived: boolean;
  selectedTab: SeasonBrowserTab;
  onSelectTab: (tab: SeasonBrowserTab) => void;
}

export default function SeasonBrowserTabs({
  archived,
  selectedTab,
  onSelectTab,
}: SeasonBrowserTabsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {SEASON_BROWSER_TABS.map((tab) => {
        const disabled = archived && COMPACT_ARCHIVE_DISABLED_TABS.has(tab);

        return (
          <button
            key={tab}
            disabled={disabled}
            className={`rounded border px-3 py-2 font-heading text-[11px] uppercase tracking-[0.16em] ${
              selectedTab === tab
                ? 'border-accent-primary bg-accent-primary/10 text-dynasty-textBright'
                : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => onSelectTab(tab)}
            type="button"
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
