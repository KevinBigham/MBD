import type { AwardHistoryEntry } from '@mbd/contracts';
import AwardLedgerPanel from './AwardLedgerPanel';
import HallOfFamePanel, { type HallOfFameEntryView } from './HallOfFamePanel';
import TrophyRoomPanel, { type AchievementSummary } from './TrophyRoomPanel';

interface HistoryAwardsTabPanelProps {
  achievements: AchievementSummary[];
  awardHistory: AwardHistoryEntry[];
  formatAwardLabel: (award: string) => string;
  hallOfFame: HallOfFameEntryView[];
  onSelectAchievement: (achievementId: string) => void;
  playerName: (playerId: string) => string;
  selectedAchievement: AchievementSummary | null;
  teamName: (teamId: string | null) => string;
}

export default function HistoryAwardsTabPanel({
  achievements,
  awardHistory,
  formatAwardLabel,
  hallOfFame,
  onSelectAchievement,
  playerName,
  selectedAchievement,
  teamName,
}: HistoryAwardsTabPanelProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <HallOfFamePanel hallOfFame={hallOfFame} teamName={teamName} />

      <TrophyRoomPanel
        achievements={achievements}
        onSelectAchievement={onSelectAchievement}
        selectedAchievement={selectedAchievement}
      />

      <AwardLedgerPanel
        awardHistory={awardHistory}
        formatAwardLabel={formatAwardLabel}
        playerName={playerName}
        teamName={teamName}
      />
    </div>
  );
}
