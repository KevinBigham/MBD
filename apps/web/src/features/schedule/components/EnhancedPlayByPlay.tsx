import { useState } from 'react';
import { Star, Flame, Zap } from 'lucide-react';
import { Badge } from '@mbd/ui';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useEnhancedPlayByPlayData } from '../hooks/useEnhancedPlayByPlayData';

const SITUATION_LABELS: Record<string, string> = {
  walk_off: 'Walk-Off',
  bases_loaded: 'Bases Loaded',
  two_outs_runners_on: '2 Out, RISP',
  extra_innings: 'Extra Innings',
  ninth_inning: '9th Inning',
  tie_game_late: 'Tie Game',
  blowout: 'Blowout',
  first_inning: 'Opening',
  standard: '',
};

function excitementIcon(level: number) {
  if (level >= 5) return <Flame className="h-3.5 w-3.5 text-accent-danger" />;
  if (level >= 4) return <Zap className="h-3.5 w-3.5 text-accent-warning" />;
  if (level >= 3) return <Star className="h-3.5 w-3.5 text-accent-primary" />;
  return null;
}

function excitementBorder(level: number): string {
  if (level >= 5) return 'border-l-accent-danger bg-accent-danger/5';
  if (level >= 4) return 'border-l-accent-warning bg-accent-warning/5';
  if (level >= 3) return 'border-l-accent-primary bg-accent-primary/5';
  return '';
}

export default function EnhancedPlayByPlay({ gameIndex }: { gameIndex: number }) {
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const [showAll, setShowAll] = useState(false);
  const { data, loading } = useEnhancedPlayByPlayData({
    gameIndex,
    getEnhancedGamePlayByPlay: worker.getEnhancedGamePlayByPlay,
    isInitialized,
    workerReady: worker.isReady,
  });

  if (loading || !data) return null;

  const entries = showAll
    ? data.entries
    : data.entries.filter((e) => e.isHighlight || e.excitement >= 3);

  const displayEntries = entries.length > 0 ? entries : data.entries.slice(0, 10);

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent-primary" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-text">Enhanced Play-by-Play</h2>
          <Badge variant="outline" className="font-data text-[10px]">
            {data.highlightCount} highlights
          </Badge>
        </div>
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="font-heading text-xs text-accent-primary hover:underline"
        >
          {showAll ? 'Show highlights' : 'Show all plays'}
        </button>
      </div>
      <div className="max-h-[50vh] overflow-y-auto">
        {displayEntries.map((entry, idx) => {
          const situationLabel = SITUATION_LABELS[entry.situation] ?? '';
          const isHigh = entry.excitement >= 3;
          return (
            <div
              key={idx}
              className={[
                'flex items-start gap-3 border-b border-dynasty-border/30 px-4 py-3',
                isHigh ? `border-l-2 ${excitementBorder(entry.excitement)}` : '',
              ].join(' ')}
            >
              <div className="mt-0.5 flex w-5 shrink-0 justify-center">
                {excitementIcon(entry.excitement)}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-heading text-sm ${entry.isHighlight ? 'text-dynasty-textBright' : 'text-dynasty-muted'}`}>
                  {entry.text}
                </p>
                {situationLabel && (
                  <Badge variant="outline" className="mt-1 font-data text-[10px]">
                    {situationLabel}
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {Array.from({ length: entry.excitement }, (_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      entry.excitement >= 4 ? 'bg-accent-warning' : 'bg-accent-info/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
