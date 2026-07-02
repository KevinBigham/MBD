import { History } from 'lucide-react';
import type { TimelineComparison } from '@mbd/contracts';
import { DensePanel } from '@/shared/components/DensePanel';
import { DynastyTimelineChapterCard } from './DynastyTimelineChapterCard';
import { TimelineComparisonPanel } from './TimelineComparisonPanel';
import type { DynastyTimelineChapter } from '../lib/buildDynastyTimelineChapters';

interface TimelinePanelProps {
  timelineComparisons: TimelineComparison[];
  dynastyTimelineChapters: DynastyTimelineChapter[];
  expandedTimelineChapterId: string | null;
  onToggleChapter: (chapterId: string) => void;
  onOpenRecap: (season: number) => void;
  canOpenRecap: (season: number) => boolean;
  playerNames: Record<string, string>;
  teamNames?: Record<string, string>;
}

export default function TimelinePanel({
  timelineComparisons,
  dynastyTimelineChapters,
  expandedTimelineChapterId,
  onToggleChapter,
  onOpenRecap,
  canOpenRecap,
  playerNames,
  teamNames = {},
}: TimelinePanelProps) {
  return (
    <div className="space-y-6">
      <DensePanel
        title="What-If Timeline Branches"
        icon={<History className="h-4 w-4 text-accent-success" />}
        titleClassName="text-dynasty-textBright"
        bodyClassName="space-y-4"
      >
        {timelineComparisons.length > 0 ? timelineComparisons.map((comparison) => (
          <TimelineComparisonPanel key={comparison.branchMeta.id} comparison={comparison} />
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
            No what-if branches are available for this save.
          </div>
        )}
      </DensePanel>

      <DensePanel
        title="Franchise Timeline"
        icon={<History className="h-4 w-4 text-accent-success" />}
        titleClassName="text-dynasty-textBright"
        bodyClassName="space-y-3"
      >
        {dynastyTimelineChapters.length > 0 ? dynastyTimelineChapters.map((chapter) => (
          <DynastyTimelineChapterCard
            key={chapter.id}
            chapter={chapter}
            expanded={expandedTimelineChapterId === chapter.id}
            onToggle={() => onToggleChapter(chapter.id)}
            onOpenRecap={onOpenRecap}
            canOpenRecap={canOpenRecap}
            playerNames={playerNames}
            teamNames={teamNames}
          />
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
            The franchise timeline starts once the first season closes.
          </div>
        )}
      </DensePanel>
    </div>
  );
}
