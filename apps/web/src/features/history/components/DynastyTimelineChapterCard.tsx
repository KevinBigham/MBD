import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import DynastyTimelineSeasonRow from './DynastyTimelineSeasonRow';
import type { DynastyTimelineChapter, DynastyEraState } from '../lib/buildDynastyTimelineChapters';

interface DynastyTimelineChapterCardProps {
  chapter: DynastyTimelineChapter;
  expanded: boolean;
  onToggle: () => void;
  onOpenRecap: (season: number) => void;
  canOpenRecap: (season: number) => boolean;
  playerNames?: Record<string, string>;
  teamNames?: Record<string, string>;
}

function toneClasses(state: DynastyEraState): { badge: string; panel: string } {
  switch (state) {
    case 'peak':
      return {
        badge: 'border-accent-success/30 bg-accent-success/10 text-accent-success',
        panel: 'border-accent-success/30 bg-accent-success/5',
      };
    case 'contention':
      return {
        badge: 'border-accent-info/30 bg-accent-info/10 text-accent-info',
        panel: 'border-accent-info/25 bg-accent-info/5',
      };
    case 'ascent':
      return {
        badge: 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning',
        panel: 'border-accent-warning/25 bg-accent-warning/5',
      };
    case 'reset':
      return {
        badge: 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger',
        panel: 'border-accent-danger/20 bg-accent-danger/5',
      };
    case 'rebuild':
    default:
      return {
        badge: 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted',
        panel: 'border-dynasty-border bg-dynasty-elevated',
      };
  }
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSeasonSpan(chapter: DynastyTimelineChapter): string {
  return chapter.startSeason === chapter.endSeason
    ? `Season ${chapter.startSeason}`
    : `Seasons ${chapter.startSeason}-${chapter.endSeason}`;
}

export function DynastyTimelineChapterCard({
  chapter,
  expanded,
  onToggle,
  onOpenRecap,
  canOpenRecap,
  playerNames = {},
  teamNames = {},
}: DynastyTimelineChapterCardProps) {
  const tones = toneClasses(chapter.dominantState);
  const panelId = `dynasty-chapter-panel-${chapter.id}`;

  return (
    <article className={`rounded-xl border ${tones.panel}`}>
      <button
        type="button"
        className="focus-ring flex w-full items-start justify-between gap-4 p-4 text-left"
        data-testid="dynasty-chapter-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.18em] ${tones.badge}`}>
              {chapter.dominantState}
            </span>
            <span className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
              {formatSeasonSpan(chapter)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-dynasty-textBright">{chapter.title}</h3>
            {chapter.championshipCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-success/30 bg-accent-success/10 px-2 py-0.5 font-data text-[10px] text-accent-success">
                <Sparkles className="h-3 w-3" />
                {chapter.championshipCount} title{chapter.championshipCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div>
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Playoffs</div>
              <div className="font-data text-sm text-dynasty-text">{chapter.playoffSeasonCount}</div>
            </div>
            <div>
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Best</div>
              <div className="font-data text-sm text-dynasty-text">{chapter.bestWinTotal}W</div>
            </div>
            <div>
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Avg Wins</div>
              <div className="font-data text-sm text-dynasty-text">{chapter.averageWins}</div>
            </div>
            <div>
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Dynasty Delta</div>
              <div className="font-data text-sm text-dynasty-text">{formatDelta(chapter.dynastyScoreDelta)}</div>
            </div>
          </div>
          {(chapter.keyStoryline || chapter.notableAdds.length > 0 || chapter.notableLosses.length > 0) && (
            <div className="mt-3 space-y-1">
              {chapter.keyStoryline && (
                <p className="font-data text-xs leading-relaxed text-dynasty-muted">
                  {chapter.keyStoryline}
                </p>
              )}
              {chapter.notableAdds.length > 0 && (
                <p className="font-data text-xs text-dynasty-muted">
                  Added: {chapter.notableAdds.join(' | ')}
                </p>
              )}
              {chapter.notableLosses.length > 0 && (
                <p className="font-data text-xs text-dynasty-muted">
                  Lost: {chapter.notableLosses.join(' | ')}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mt-1 text-dynasty-muted">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-dynasty-border/60 px-4 pb-4 pt-3">
          <div className="space-y-2">
            {chapter.seasons.map((season) => (
              <DynastyTimelineSeasonRow
                key={season.id}
                season={season}
                onOpenRecap={onOpenRecap}
                canOpenRecap={canOpenRecap}
                playerNames={playerNames}
                teamNames={teamNames}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
