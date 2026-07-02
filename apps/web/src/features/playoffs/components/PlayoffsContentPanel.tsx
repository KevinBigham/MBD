import type { ReactNode } from 'react';
import type { PlayoffBracket, PlayoffSeriesState } from '@mbd/sim-core';
import type { SeasonFlowPreviewSeries } from '@/app/layout/seasonFlow';
import PlayoffCurrentSeriesPanel from './PlayoffCurrentSeriesPanel';
import PlayoffPreviewGrid from './PlayoffPreviewGrid';

export interface DynastyScoreSummary {
  score: number;
  grade: string;
}

interface PlayoffsContentPanelProps {
  bracket: PlayoffBracket | null;
  busyAction: string | null;
  dynastyScore: DynastyScoreSummary | null;
  momentumSlot?: ReactNode;
  onSimNextGame: () => void;
  onSimSeries: () => void;
  onSimRound: () => void;
  onSimRemainingPlayoffs: () => void;
  playoffPreview: SeasonFlowPreviewSeries[];
}

function seriesById(bracket: PlayoffBracket | null): Map<string, PlayoffSeriesState> {
  if (!bracket) {
    return new Map();
  }

  const entries = new Map<string, PlayoffSeriesState>();
  for (const round of bracket.completedRounds) {
    for (const series of round.series) {
      entries.set(series.id, series);
    }
  }
  for (const series of bracket.currentRoundSeries) {
    entries.set(series.id, series);
  }
  return entries;
}

export function PlayoffsContentPanel({
  bracket,
  busyAction,
  dynastyScore,
  momentumSlot,
  onSimNextGame,
  onSimSeries,
  onSimRound,
  onSimRemainingPlayoffs,
  playoffPreview,
}: PlayoffsContentPanelProps) {
  const liveSeries = seriesById(bracket);
  const activeSeries = bracket?.currentRoundSeries.find((series) => series.status !== 'complete') ?? null;
  const completedSeries = Array.from(liveSeries.values())
    .filter((series) => series.status === 'complete')
    .sort((left, right) => left.id.localeCompare(right.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Playoffs</h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Every October game, series, and clincher runs through the worker-owned bracket.
          </p>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Dynasty Score</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-brand text-3xl text-accent-primary">{dynastyScore?.grade ?? 'F'}</span>
            <span className="font-data text-sm text-dynasty-muted">{dynastyScore?.score ?? 0} points</span>
          </div>
        </div>
      </div>

      {momentumSlot}

      <PlayoffPreviewGrid liveSeries={liveSeries} playoffPreview={playoffPreview} />

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PlayoffCurrentSeriesPanel
          activeSeries={activeSeries}
          busyAction={busyAction}
          champion={bracket?.champion ?? null}
          dynastyScore={dynastyScore}
          onSimNextGame={onSimNextGame}
          onSimRemainingPlayoffs={onSimRemainingPlayoffs}
          onSimRound={onSimRound}
          onSimSeries={onSimSeries}
        />

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Completed Series</div>
          <div className="mt-3 space-y-3">
            {completedSeries.length > 0 ? completedSeries.map((series) => (
              <details key={series.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <summary className="cursor-pointer list-none">
                  <div className="font-heading text-sm text-dynasty-text">{series.leaderSummary}</div>
                  <div className="mt-1 font-data text-xs text-dynasty-muted">{series.round.replace(/_/g, ' ')}</div>
                </summary>
                <div className="mt-3 space-y-2">
                  {series.games.map((game) => (
                    <div key={`${series.id}-${game.gameNumber}`} className="font-heading text-xs text-dynasty-muted">
                      Game {game.gameNumber}: {game.awayTeamId.toUpperCase()} {game.awayScore}, {game.homeTeamId.toUpperCase()} {game.homeScore}
                    </div>
                  ))}
                </div>
              </details>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                Completed matchups will stack here as the bracket unfolds.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
