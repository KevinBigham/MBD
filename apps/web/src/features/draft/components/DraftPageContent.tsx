import type { ComponentProps, ReactNode } from 'react';
import { DraftAvailabilityPanel } from './DraftAvailabilityPanel';
import { DraftBoard } from './DraftBoard';
import { DraftCurrentPickPanel } from './DraftCurrentPickPanel';
import { DraftPostDraftGradesPanel } from './DraftPostDraftGradesPanel';
import { DraftProspectsPanel } from './DraftProspectsPanel';
import { DraftRoomHeaderPanel } from './DraftRoomHeaderPanel';
import { DraftSummaryPanel } from './DraftSummaryPanel';
import { DraftTicker } from './DraftTicker';
import { DraftWarRoomPanel } from './DraftWarRoomPanel';

interface DraftRoomContentProps {
  boardProps: ComponentProps<typeof DraftBoard>;
  currentPickPanelProps: ComponentProps<typeof DraftCurrentPickPanel>;
  error: string | null;
  postDraftGradesPanelProps: ComponentProps<typeof DraftPostDraftGradesPanel>;
  prospectsPanelProps: ComponentProps<typeof DraftProspectsPanel>;
  roomHeaderPanelProps: ComponentProps<typeof DraftRoomHeaderPanel>;
  summaryPanelProps: ComponentProps<typeof DraftSummaryPanel>;
  tickerProps: ComponentProps<typeof DraftTicker>;
  warRoomPanelProps: ComponentProps<typeof DraftWarRoomPanel>;
}

export interface DraftPageContentProps {
  availabilityPanelProps: ComponentProps<typeof DraftAvailabilityPanel> | null;
  nudgeCard: ReactNode;
  roomContentProps: DraftRoomContentProps | null;
}

export default function DraftPageContent({
  availabilityPanelProps,
  nudgeCard,
  roomContentProps,
}: DraftPageContentProps) {
  if (availabilityPanelProps) {
    return (
      <>
        <DraftAvailabilityPanel {...availabilityPanelProps} />
        {nudgeCard}
      </>
    );
  }

  if (!roomContentProps) {
    return <>{nudgeCard}</>;
  }

  return (
    <>
      <div className="space-y-4">
        <DraftRoomHeaderPanel {...roomContentProps.roomHeaderPanelProps} />

        {roomContentProps.error && (
          <div className="rounded border border-accent-danger/30 bg-accent-danger/10 px-4 py-2 font-data text-xs text-accent-danger">
            {roomContentProps.error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <DraftProspectsPanel {...roomContentProps.prospectsPanelProps} />
          </div>
          <div className="xl:col-span-3">
            <DraftCurrentPickPanel {...roomContentProps.currentPickPanelProps} />
          </div>
          <div className="xl:col-span-4">
            <DraftWarRoomPanel {...roomContentProps.warRoomPanelProps} />
          </div>
        </div>

        <DraftTicker {...roomContentProps.tickerProps} />
        <DraftBoard {...roomContentProps.boardProps} />
        <DraftPostDraftGradesPanel {...roomContentProps.postDraftGradesPanelProps} />
        <DraftSummaryPanel {...roomContentProps.summaryPanelProps} />
      </div>
      {nudgeCard}
    </>
  );
}
