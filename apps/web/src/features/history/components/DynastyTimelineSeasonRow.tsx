import { Film } from 'lucide-react';
import DynastyTimelineMemoryBeatRow from './DynastyTimelineMemoryBeatRow';
import type { DynastyTimelineChapter } from '../lib/buildDynastyTimelineChapters';

type DynastyTimelineSeason = DynastyTimelineChapter['seasons'][number];

interface DynastyTimelineSeasonRowProps {
  season: DynastyTimelineSeason;
  onOpenRecap: (season: number) => void;
  canOpenRecap: (season: number) => boolean;
  playerNames?: Record<string, string>;
  teamNames?: Record<string, string>;
}

export default function DynastyTimelineSeasonRow({
  season,
  onOpenRecap,
  canOpenRecap,
  playerNames = {},
  teamNames = {},
}: DynastyTimelineSeasonRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dynasty-border bg-dynasty-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid flex-1 gap-2 sm:grid-cols-[90px_90px_1fr_80px] sm:items-center">
        <div>
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Season</div>
          <div className="font-data text-sm text-dynasty-textBright">{season.season}</div>
        </div>
        <div>
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Record</div>
          <div className="font-data text-sm text-dynasty-text">{season.record}</div>
        </div>
        <div className="min-w-0">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Story Beat</div>
          <div className="truncate font-heading text-sm text-dynasty-text">
            {season.storylineHook ?? season.playoffResult}
          </div>
          {season.memoryBeats.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Timeline Memory</div>
              {season.memoryBeats.map((beat) => (
                <DynastyTimelineMemoryBeatRow
                  key={beat.id}
                  beat={beat}
                  playerNames={playerNames}
                  teamNames={teamNames}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Score</div>
          <div className="font-data text-sm text-dynasty-text">{season.dynastyScore}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-data text-xs text-dynasty-muted">{season.playoffResult}</span>
        <button
          type="button"
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text transition-colors hover:border-accent-primary hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onOpenRecap(season.season)}
          disabled={!canOpenRecap(season.season)}
        >
          <Film className="h-3.5 w-3.5" />
          Open Recap
        </button>
      </div>
    </div>
  );
}
