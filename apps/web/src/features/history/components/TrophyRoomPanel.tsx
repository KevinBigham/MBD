import { Trophy } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { categoryLabel } from '@/shared/lib/labels';

export interface AchievementSummary {
  id: string;
  category: 'dynasty' | 'development' | 'moneyball' | 'records' | 'longevity';
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
  unlockSummary: string | null;
  progress: {
    current: number;
    target: number;
    summary?: string;
  };
}

interface TrophyRoomPanelProps {
  achievements: AchievementSummary[];
  selectedAchievement: AchievementSummary | null;
  onSelectAchievement: (achievementId: string) => void;
}

export default function TrophyRoomPanel({
  achievements,
  selectedAchievement,
  onSelectAchievement,
}: TrophyRoomPanelProps) {
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <DensePanel
      title="Trophy Room"
      icon={<Trophy className="h-4 w-4 text-accent-warning" />}
      meta={`${unlockedAchievements}/${achievements.length}`}
      titleClassName="text-dynasty-textBright"
    >
      {unlockedAchievements === 0 ? (
        <div className="mb-4">
          <EmptyStatePanel
            description="Keep pushing seasons, titles, and milestones to fill the trophy room."
            title="No achievements unlocked yet"
          />
        </div>
      ) : null}
      {selectedAchievement && (
        <div className="mb-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-heading text-sm text-dynasty-textBright">{selectedAchievement.name}</div>
              <div className="mt-1 font-heading text-xs uppercase text-dynasty-muted">{categoryLabel(selectedAchievement.category)}</div>
            </div>
            <div className={`font-data text-xs ${selectedAchievement.unlocked ? 'text-accent-warning' : 'text-dynasty-muted'}`}>
              {selectedAchievement.unlocked ? (selectedAchievement.unlockedAt ?? 'Unlocked') : 'Locked'}
            </div>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">{selectedAchievement.description}</div>
          <div className="mt-3">
            <ProgressFill
              toneClassName={selectedAchievement.unlocked ? 'bg-accent-warning' : 'bg-accent-primary'}
              trackClassName="bg-dynasty-surface"
              value={Math.max(6, Math.min(100, (selectedAchievement.progress.current / Math.max(1, selectedAchievement.progress.target)) * 100))}
            />
          </div>
          <div className="mt-2 font-data text-xs text-dynasty-muted">
            {selectedAchievement.progress.current} / {selectedAchievement.progress.target}
            {selectedAchievement.progress.summary ? ` ${selectedAchievement.progress.summary}` : ''}
          </div>
          {selectedAchievement.unlockSummary && (
            <div className="mt-2 font-heading text-xs text-dynasty-muted">
              {selectedAchievement.unlockSummary}
            </div>
          )}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {achievements.map((achievement) => (
          <button
            key={achievement.id}
            className={`rounded border px-3 py-3 text-left transition-colors ${
              achievement.unlocked
                ? 'border-accent-warning/40 bg-accent-warning/10'
                : 'border-dynasty-border bg-dynasty-elevated'
            } ${selectedAchievement?.id === achievement.id ? 'ring-1 ring-accent-primary' : ''}`}
            onClick={() => onSelectAchievement(achievement.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-heading text-sm text-dynasty-text">{achievement.name}</div>
              <div className="font-data text-[10px] uppercase text-dynasty-muted">{categoryLabel(achievement.category)}</div>
            </div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">{achievement.description}</div>
            <div className="mt-3 font-data text-xs text-dynasty-muted">
              {achievement.progress.current} / {achievement.progress.target}
            </div>
          </button>
        ))}
      </div>
    </DensePanel>
  );
}
