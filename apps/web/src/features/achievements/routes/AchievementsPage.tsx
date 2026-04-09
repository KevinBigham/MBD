import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Badge } from '@mbd/ui';
import { Award, Lock, Trophy } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';

const AwardCeremonyModal = lazy(() => import('../components/AwardCeremonyModal'));

interface AchievementView {
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
type Category = typeof CATEGORIES[number];

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

function AchievementCard({ a }: { a: AchievementView }) {
  if (a.unlocked) {
    return (
      <div className="rounded-lg border border-accent-warning/30 bg-dynasty-elevated p-4 ring-1 ring-accent-warning/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-warning/20 text-accent-warning">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading text-sm text-dynasty-textBright">{a.name}</div>
            <p className="mt-0.5 font-data text-xs text-dynasty-muted">{a.description}</p>
            {a.unlockSummary && (
              <p className="mt-1.5 font-data text-xs italic text-accent-warning/80">{a.unlockSummary}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge className={categoryTone(a.category)}>{a.category}</Badge>
              {a.unlockedAt != null && (
                <span className="font-data text-[10px] text-dynasty-muted">Season {a.unlockedAt}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pct = a.progress ? Math.round((a.progress.current / Math.max(1, a.progress.target)) * 100) : 0;

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/50 p-4 opacity-70">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dynasty-border/50 text-dynasty-muted">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-sm text-dynasty-muted">{a.name}</div>
          <p className="mt-0.5 font-data text-xs text-dynasty-muted/70">{a.description}</p>
          {a.progress && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between font-data text-[10px] text-dynasty-muted">
                <span>{a.progress.summary}</span>
                <span>{pct}%</span>
              </div>
              <ProgressFill value={pct} toneClassName="bg-dynasty-muted/50" />
            </div>
          )}
          <div className="mt-2">
            <Badge className={categoryTone(a.category)}>{a.category}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CeremonyScript {
  season: number;
  awards: Array<{
    awardId: string;
    awardName: string;
    winnerId: string;
    winnerName: string;
    headline: string;
    votingSummary: string;
    historicalContext: string;
    reactionQuote: string;
    runnerUpNames: string[];
  }>;
  openingRemarks: string;
  closingRemarks: string;
}

export default function AchievementsPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [filter, setFilter] = useState<Category>('all');
  const [loading, setLoading] = useState(true);
  const [ceremony, setCeremony] = useState<CeremonyScript | null>(null);
  const [ceremonyLoading, setCeremonyLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const data = await worker.getAchievements();
    setAchievements((data ?? []) as AchievementView[]);
    setLoading(false);
  }, [isInitialized, worker, workerReady]);

  const openCeremony = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setCeremonyLoading(true);
    const script = await worker.getAwardCeremony();
    if (script) {
      setCeremony(script as CeremonyScript);
    }
    setCeremonyLoading(false);
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  const filtered = filter === 'all' ? achievements : achievements.filter((a) => a.category === filter);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  const categoryCounts = CATEGORIES.reduce<Record<string, { total: number; unlocked: number }>>((acc, cat) => {
    if (cat === 'all') {
      acc[cat] = { total: totalCount, unlocked: unlockedCount };
    } else {
      const catItems = achievements.filter((a) => a.category === cat);
      acc[cat] = { total: catItems.length, unlocked: catItems.filter((a) => a.unlocked).length };
    }
    return acc;
  }, {});

  return (
    <PageShell loading={loading}>
      <div className="space-y-6">
        {/* Header */}
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
            onClick={() => void openCeremony()}
            disabled={ceremonyLoading}
            className="flex items-center gap-2 rounded-lg border border-accent-warning/30 bg-accent-warning/10 px-4 py-2 font-heading text-sm text-accent-warning transition-colors hover:bg-accent-warning/20 disabled:opacity-50"
          >
            <Award className="h-4 w-4" />
            {ceremonyLoading ? 'Loading...' : 'Awards Ceremony'}
          </button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = filter === cat;
            const counts = categoryCounts[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
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

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyStatePanel
            icon={Trophy}
            title="No achievements yet"
            description="Keep playing to unlock achievements in this category."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* Unlocked first, then locked */}
            {[...filtered].sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1)).map((a) => (
              <AchievementCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>

      {ceremony && (
        <Suspense fallback={null}>
          <AwardCeremonyModal
            ceremony={ceremony}
            onClose={() => setCeremony(null)}
          />
        </Suspense>
      )}
    </PageShell>
  );
}
