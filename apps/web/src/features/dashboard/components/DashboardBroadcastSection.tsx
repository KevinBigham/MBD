import type { ReactNode } from 'react';
import RecentBroadcastRecapsPanel from './RecentBroadcastRecapsPanel';
import type { GameRecapView } from './gameDayBroadcast';

interface DashboardBroadcastSectionProps {
  recaps: GameRecapView[];
  selectedGameIndex: number | null;
  onSelectGame: (gameIndex: number) => void;
  playByPlaySlot: ReactNode;
}

export default function DashboardBroadcastSection({
  recaps,
  selectedGameIndex,
  onSelectGame,
  playByPlaySlot,
}: DashboardBroadcastSectionProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <RecentBroadcastRecapsPanel
        recaps={recaps}
        selectedGameIndex={selectedGameIndex}
        onSelectGame={onSelectGame}
      />

      {playByPlaySlot}
    </section>
  );
}
