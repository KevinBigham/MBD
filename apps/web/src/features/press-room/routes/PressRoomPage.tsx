import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import PressRoomPageContent from '../components/PressRoomPageContent';
import { usePressRoomRouteData } from '../hooks/usePressRoomRouteData';

export default function PressRoomPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, day, season, phase } = useGameStore();
  const lastVisitedPressRoomAt = usePreferencesStore((state) => state.lastVisitedPressRoomAt);
  const setLastVisitedPressRoomAt = usePreferencesStore((state) => state.setLastVisitedPressRoomAt);
  const {
    briefingCount,
    categoryOptions,
    feed,
    groupedFeed,
    isEntryPinned,
    isEntryUnread,
    markAllRead,
    openSections,
    pinnedFeed,
    scoutingCount,
    selectedCategory,
    selectedTag,
    selectedTeam,
    setSelectedCategory,
    setSelectedTag,
    setSelectedTeam,
    teamOptions,
    togglePinned,
    toggleSection,
    transactionFeed,
    unreadCount,
  } = usePressRoomRouteData({
    day,
    getPressRoomFeed: worker.getPressRoomFeed,
    isInitialized,
    lastVisitedPressRoomAt,
    phase,
    season,
    setLastVisitedPressRoomAt,
    workerReady,
  });

  return (
    <PressRoomPageContent
      briefingCount={briefingCount}
      categoryOptions={categoryOptions}
      feed={feed}
      groupedFeed={groupedFeed}
      isEntryPinned={isEntryPinned}
      isEntryUnread={isEntryUnread}
      onMarkAllRead={markAllRead}
      onSelectCategory={setSelectedCategory}
      onSelectTag={setSelectedTag}
      onSelectTeam={setSelectedTeam}
      onTogglePinned={togglePinned}
      onToggleSection={toggleSection}
      openSections={openSections}
      pinnedFeed={pinnedFeed}
      scoutingCount={scoutingCount}
      selectedCategory={selectedCategory}
      selectedTag={selectedTag}
      selectedTeam={selectedTeam}
      teamOptions={teamOptions}
      transactionFeed={transactionFeed}
      unreadCount={unreadCount}
    />
  );
}
