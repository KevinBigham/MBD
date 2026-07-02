import { Badge } from '@mbd/ui';
import { Award, Lock, Trophy } from 'lucide-react';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { categoryLabel } from '@/shared/lib/labels';

export interface AchievementView {
  id: string;
  category: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: number | null;
  unlockSummary: string | null;
  progress: { current: number; target: number; summary: string } | null;
}

const CATEGORIES = ['all', 'dynasty', 'development', 'moneyball', 'records', 'longevity'] as const;
export type AchievementCategoryFilter = typeof CATEGORIES[number];

function categoryTone(cat: string): string {
  switch (cat) {
    case 'dynasty': return 'text-accent-warning bg-accent-warning/10 border-accent-warning/30';
    case 'development': return 'text-accent-success bg-accent-success/10 border-accent-success/30';
    case 'moneyball': return 'text-accent-info bg-accent-info/10 border-accent-info/30';
    case 'records': return 'text-accent-primary bg-accent-primary/10 border-accent-primary/30';
    case 'longevity': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
    default: return 'text-dynasty-muted bg-dynasty-elevated border-dynasty-border';
  }
}

function AchievementCard({ achievement }: { achievement: AchievementView }) {
  if (achievement.unlocked) {
    return (
      <div className="rounded-lg border border-accent-warning/30 bg-dynasty-elevated p-4 ring-1 ring-accent-warning/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-warning/20 text-accent-warning">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading text-sm text-dynasty-textBright">{achievement.name}</div>
            <p className="mt-0.5 font-data text-xs text-dynasty-muted">{achievement.description}</p>
            {achievement.unlockSummary && (
              <p className="mt-1.5 font-data text-xs italic text-accent-warning/80">{achievement.unlockSummary}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge className={categoryTone(achievement.category)}>{categoryLabel(achievement.category)}</Badge>
              {achievement.unlockedAt != null && (
                <span className="font-data text-[10px] text-dynasty-muted">Season {achievement.unlockedAt}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pct = achievement.progress
    ? Math.round((achievement.progress.current / Math.max(1, achievement.progress.target)) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/50 p-4 opacity-70">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dynasty-border/50 text-dynasty-muted">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-sm text-dynasty-muted">{achievement.name}</div>
          <p className="mt-0.5 font-data text-xs text-dynasty-muted/70">{achievement.description}</p>
          {achievement.progress && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between font-data text-[10px] text-dynasty-muted">
                <span>{achievement.progress.summary}</span>
                <span>{pct}%</span>
              </div>
              <ProgressFill value={pct} toneClassName="bg-dynasty-muted/50" />
            </div>
          )}
          <div className="mt-2">
            <Badge className={categoryTone(achievement.category)}>{categoryLabel(achievement.category)}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AchievementsContentPanelProps {
  achievements: AchievementView[];
  ceremonyLoading: boolean;
  filter: AchievementCategoryFilter;
  onChangeFilter: (filter: AchievementCategoryFilter) => void;
  onOpenCeremony: () => void;
}

export default function AchievementsContentPanel({
  achievements,
  ceremonyLoading,
  filter,
  onChangeFilter,
  onOpenCeremony,
}: AchievementsContentPanelProps) {
  const filtered = filter === 'all' ? achievements : achievements.filter((achievement) => achievement.category === filter);
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const totalCount = achievements.length;

  const categoryCounts = CATEGORIES.reduce<Record<string, { total: number; unlocked: number }>>((acc, cat) => {
    if (cat === 'all') {
      acc[cat] = { total: totalCount, unlocked: unlockedCount };
    } else {
      const catItems = achievements.filter((achievement) => achievement.category === cat);
      acc[cat] = { total: catItems.length, unlocked: catItems.filter((achievement) => achievement.unlocked).length };
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Trophy Room</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            <span className="text-accent-warning">{unlockedCount}</span>
            <span> / {totalCount} unlocked</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCeremony}
          disabled={ceremonyLoading}
          className="flex items-center gap-2 rounded-lg border border-accent-warning/30 bg-accent-warning/10 px-4 py-2 font-heading text-sm text-accent-warning transition-colors hover:bg-accent-warning/20 disabled:opacity-50"
        >
          <Award className="h-4 w-4" />
          {ceremonyLoading ? 'Loading...' : 'Awards Ceremony'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = filter === cat;
          const counts = categoryCounts[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChangeFilter(cat)}
              className={[
                'focus-ring rounded-md border px-3 py-1.5 font-heading text-xs capitalize transition-colors',
                isActive
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border bg-dynasty-surface text-dynasty-muted hover:border-dynasty-muted hover:text-dynasty-text',
              ].join(' ')}
            >
              {cat}
              {counts && (
                <span className="ml-1.5 font-data text-[10px] opacity-70">
                  {counts.unlocked}/{counts.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyStatePanel
          icon={Trophy}
          title="No achievements yet"
          description="Keep playing to unlock achievements in this category."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...filtered]
            .sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1))
            .map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
        </div>
      )}
    </div>
  );
}
