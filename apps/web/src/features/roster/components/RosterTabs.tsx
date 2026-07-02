import { Tabs, TabsList, TabsTrigger } from '@mbd/ui';
import { GripVertical } from 'lucide-react';

export type RosterTab = 'mlb' | 'minors' | 'contracts' | 'lineup';

interface RosterTabsProps {
  activeTab: RosterTab;
  onChangeTab: (tab: RosterTab) => void;
}

export default function RosterTabs({ activeTab, onChangeTab }: RosterTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value: string) => onChangeTab(value as RosterTab)}>
      <TabsList>
        <TabsTrigger value="mlb" onClick={() => onChangeTab('mlb')}>MLB Control Room</TabsTrigger>
        <TabsTrigger value="minors" onClick={() => onChangeTab('minors')}>Minor Leagues</TabsTrigger>
        <TabsTrigger value="contracts" onClick={() => onChangeTab('contracts')}>Contracts</TabsTrigger>
        <TabsTrigger value="lineup" onClick={() => onChangeTab('lineup')}>
          <GripVertical className="mr-1 inline h-3 w-3" />
          Lineup Builder
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
