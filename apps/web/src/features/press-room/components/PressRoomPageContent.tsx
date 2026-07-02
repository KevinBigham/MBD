import type { PressRoomEntry } from '@/shared/types/pressRoom';
import PressRoomSourceBoard, {
  type PressRoomFeedSection,
  type PressRoomSectionKey,
} from './PressRoomSourceBoard';
import PressRoomSummaryCards from './PressRoomSummaryCards';
import PressRoomTransactionLog from './PressRoomTransactionLog';

interface PressRoomPageContentProps {
  briefingCount: number;
  categoryOptions: string[];
  feed: PressRoomEntry[];
  groupedFeed: PressRoomFeedSection[];
  isEntryPinned: (entry: PressRoomEntry) => boolean;
  isEntryUnread: (entry: PressRoomEntry) => boolean;
  onMarkAllRead: () => void;
  onSelectCategory: (category: string) => void;
  onSelectTag: (tag: 'all' | PressRoomEntry['tag']) => void;
  onSelectTeam: (teamId: string) => void;
  onTogglePinned: (entry: PressRoomEntry) => void;
  onToggleSection: (section: PressRoomSectionKey) => void;
  openSections: Record<PressRoomSectionKey, boolean>;
  pinnedFeed: PressRoomEntry[];
  scoutingCount: number;
  selectedCategory: string;
  selectedTag: 'all' | PressRoomEntry['tag'];
  selectedTeam: string;
  teamOptions: string[];
  transactionFeed: PressRoomEntry[];
  unreadCount: number;
}

export default function PressRoomPageContent({
  briefingCount,
  categoryOptions,
  feed,
  groupedFeed,
  isEntryPinned,
  isEntryUnread,
  onMarkAllRead,
  onSelectCategory,
  onSelectTag,
  onSelectTeam,
  onTogglePinned,
  onToggleSection,
  openSections,
  pinnedFeed,
  scoutingCount,
  selectedCategory,
  selectedTag,
  selectedTeam,
  teamOptions,
  transactionFeed,
  unreadCount,
}: PressRoomPageContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          Press Room
        </h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          An expanded archive of front-office signals, league analysis, rumors, and breaking headlines.
        </p>
      </div>

      <PressRoomSummaryCards
        feedCount={feed.length}
        scoutingCount={scoutingCount}
        unreadCount={unreadCount}
      />

      <PressRoomSourceBoard
        categoryOptions={categoryOptions}
        groupedFeed={groupedFeed}
        isEntryPinned={isEntryPinned}
        isEntryUnread={isEntryUnread}
        onMarkAllRead={onMarkAllRead}
        onSelectCategory={onSelectCategory}
        onSelectTag={onSelectTag}
        onSelectTeam={onSelectTeam}
        onTogglePinned={onTogglePinned}
        onToggleSection={onToggleSection}
        openSections={openSections}
        pinnedFeed={pinnedFeed}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        selectedTeam={selectedTeam}
        teamOptions={teamOptions}
      />

      <PressRoomTransactionLog transactionFeed={transactionFeed} />

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="font-heading text-sm text-dynasty-textBright">
          Briefings on file
        </div>
        <div className="mt-2 font-data text-xs uppercase tracking-[0.18em] text-dynasty-muted">
          {briefingCount} team briefings tracked for this visit window
        </div>
      </div>
    </div>
  );
}
