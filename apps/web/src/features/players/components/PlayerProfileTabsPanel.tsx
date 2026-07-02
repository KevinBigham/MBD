import { Suspense, lazy } from 'react';
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@mbd/ui';
import { ArrowUpCircle, BrainCircuit, History, LineChart, ScrollText, ShieldAlert, Sparkles } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { PlayerProfileTab, PlayerProfileView } from './playerProfileShared';

const StatsTab = lazy(() => import('./StatsTab'));
const DevelopmentTab = lazy(() => import('./DevelopmentTab'));
const ScoutingTab = lazy(() => import('./ScoutingTab'));
const MomentsTab = lazy(() => import('./MomentsTab'));
const StoryArcsTab = lazy(() => import('./StoryArcsTab'));
const HistoryTab = lazy(() => import('./HistoryTab'));
const PersonalityTab = lazy(() => import('./PersonalityTab'));

interface PlayerProfileTabsPanelProps {
  activeTab: PlayerProfileTab;
  view: PlayerProfileView;
  onTabChange: (nextValue: string) => void;
}

const TAB_LABELS: Record<PlayerProfileTab, string> = {
  stats: 'Stats',
  development: 'Development',
  scouting: 'Scouting',
  moments: 'Signature Moments',
  storyArcs: 'Story Arcs',
  history: 'History',
  personality: 'Personality',
};

const TAB_ICONS: Record<PlayerProfileTab, JSX.Element> = {
  stats: <LineChart className="h-4 w-4" />,
  development: <ArrowUpCircle className="h-4 w-4" />,
  scouting: <ShieldAlert className="h-4 w-4" />,
  moments: <Sparkles className="h-4 w-4" />,
  storyArcs: <ScrollText className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
  personality: <BrainCircuit className="h-4 w-4" />,
};

const TAB_COMPONENTS = {
  stats: StatsTab,
  development: DevelopmentTab,
  scouting: ScoutingTab,
  moments: MomentsTab,
  storyArcs: StoryArcsTab,
  history: HistoryTab,
  personality: PersonalityTab,
} satisfies Record<PlayerProfileTab, typeof StatsTab>;

function TabFallback({
  title,
}: {
  title: string;
}) {
  return (
    <DensePanel title={title} bodyClassName="space-y-4">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </DensePanel>
  );
}

export default function PlayerProfileTabsPanel({
  activeTab,
  view,
  onTabChange,
}: PlayerProfileTabsPanelProps) {
  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <DensePanel title="Player Profile Sections" headerClassName="sr-only">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="flex w-full flex-wrap gap-2 border-none">
          {Object.entries(TAB_LABELS).map(([tab, label]) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-lg border border-dynasty-border bg-dynasty-elevated data-[state=active]:border-accent-primary data-[state=active]:bg-accent-primary/10"
            >
              {TAB_ICONS[tab as PlayerProfileTab]}
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} forceMount className="mt-5">
          <Suspense fallback={<TabFallback title={TAB_LABELS[activeTab]} />}>
            <ActiveTabComponent view={view} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </DensePanel>
  );
}
