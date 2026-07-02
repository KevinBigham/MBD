import {
  Eye,
  Globe2,
  Scale,
} from 'lucide-react';

export type ScoutingView = 'pro' | 'international' | 'conflicts';

interface ScoutingViewTab {
  view: ScoutingView;
  title: string;
  description: string;
  icon: typeof Globe2;
  iconClassName: string;
}

const SCOUTING_VIEW_TABS: ScoutingViewTab[] = [
  {
    view: 'international',
    title: 'International',
    description: 'Scout the IFA class, monitor pool space, and sign rookies into the pipeline.',
    icon: Globe2,
    iconClassName: 'text-accent-warning',
  },
  {
    view: 'pro',
    title: 'Pro Reports',
    description: 'Search major and minor league players and build your live report board.',
    icon: Eye,
    iconClassName: 'text-accent-info',
  },
  {
    view: 'conflicts',
    title: 'Scout Conflicts',
    description: 'When scouts disagree, review the war board and see who was right.',
    icon: Scale,
    iconClassName: 'text-accent-danger',
  },
];

interface ScoutingViewTabsProps {
  activeView: ScoutingView;
  onChangeView: (view: ScoutingView) => void;
}

export default function ScoutingViewTabs({ activeView, onChangeView }: ScoutingViewTabsProps) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-2">
      <div className="grid gap-2 sm:grid-cols-3">
        {SCOUTING_VIEW_TABS.map(({ view, title, description, icon: Icon, iconClassName }) => (
          <button
            key={view}
            type="button"
            data-mobile-critical-control="scouting-view-tab"
            onClick={() => onChangeView(view)}
            className={`focus-ring mobile-critical-control rounded-md px-4 py-3 text-left ${activeView === view ? 'bg-dynasty-elevated text-dynasty-textBright' : 'text-dynasty-muted hover:bg-dynasty-elevated/60'}`}
          >
            <div className="flex items-center gap-2 font-heading text-sm font-semibold">
              <Icon className={`h-4 w-4 ${iconClassName}`} />
              {title}
            </div>
            <p className="mt-1 font-heading text-xs">{description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
