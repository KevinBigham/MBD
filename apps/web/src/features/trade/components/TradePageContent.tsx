import type { ComponentProps, ReactNode } from 'react';
import TradeActivityColumn from './TradeActivityColumn';
import TradeBuilderStack from './TradeBuilderStack';
import TradeDeadlineDashboard from './TradeDeadlineDashboard';
import TradePageHeader from './TradePageHeader';
import TradeQuickStartPanel from './TradeQuickStartPanel';

export interface TradePageContentProps {
  activityColumnProps: ComponentProps<typeof TradeActivityColumn>;
  builderStackProps: ComponentProps<typeof TradeBuilderStack>;
  deadlineDashboardProps: Omit<ComponentProps<typeof TradeDeadlineDashboard>, 'deadlineDramaSlot'>;
  deadlineDramaSlot: ReactNode;
  quickStartProps: ComponentProps<typeof TradeQuickStartPanel>;
}

export default function TradePageContent({
  activityColumnProps,
  builderStackProps,
  deadlineDashboardProps,
  deadlineDramaSlot,
  quickStartProps,
}: TradePageContentProps) {
  return (
    <div className="space-y-4">
      <TradePageHeader />

      <TradeDeadlineDashboard
        {...deadlineDashboardProps}
        deadlineDramaSlot={deadlineDramaSlot}
      />

      <TradeQuickStartPanel {...quickStartProps} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <TradeActivityColumn {...activityColumnProps} />
        <TradeBuilderStack {...builderStackProps} />
      </div>
    </div>
  );
}
