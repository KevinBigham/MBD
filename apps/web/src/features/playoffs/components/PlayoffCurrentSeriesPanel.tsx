import {
  ArrowRight,
  FastForward,
  Play,
  SkipForward,
  Trophy,
  Zap,
} from 'lucide-react';
import type { PlayoffSeriesState } from '@mbd/sim-core';

interface DynastyScoreSummary {
  score: number;
  grade: string;
}

interface PlayoffCurrentSeriesPanelProps {
  activeSeries: PlayoffSeriesState | null;
  busyAction: string | null;
  champion: string | null;
  dynastyScore: DynastyScoreSummary | null;
  onSimNextGame: () => void;
  onSimSeries: () => void;
  onSimRound: () => void;
  onSimRemainingPlayoffs: () => void;
}

export default function PlayoffCurrentSeriesPanel({
  activeSeries,
  busyAction,
  champion,
  dynastyScore,
  onSimNextGame,
  onSimSeries,
  onSimRound,
  onSimRemainingPlayoffs,
}: PlayoffCurrentSeriesPanelProps) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Current Series</div>
          <h2 className="mt-1 font-heading text-xl text-dynasty-textBright">
            {activeSeries
              ? activeSeries.leaderSummary
              : champion
                ? `${champion.toUpperCase()} lifted the trophy`
                : 'Bracket not initialized'}
          </h2>
        </div>
        {champion && (
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-success/40 bg-accent-success/10 px-3 py-1 font-data text-xs uppercase tracking-[0.18em] text-accent-success">
            <Trophy className="h-3.5 w-3.5" />
            Champion
          </div>
        )}
      </div>

      {activeSeries ? (
        <>
          <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
            <div className="font-heading text-base text-dynasty-text">
              {activeSeries.higherSeed.teamId.toUpperCase()} vs {activeSeries.lowerSeed.teamId.toUpperCase()}
            </div>
            <div className="mt-1 font-heading text-sm text-dynasty-muted">{activeSeries.leaderSummary}</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={onSimNextGame}
                disabled={busyAction !== null}
                data-mobile-critical-control="playoffs-sim-next-game"
                className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white disabled:opacity-40"
              >
                <Play className="h-4 w-4" />
                Sim Next Game
              </button>
              <button
                onClick={onSimSeries}
                disabled={busyAction !== null}
                data-mobile-critical-control="playoffs-sim-series"
                className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm font-semibold text-dynasty-text disabled:opacity-40"
              >
                <FastForward className="h-4 w-4" />
                Sim Series
              </button>
              <button
                onClick={onSimRound}
                disabled={busyAction !== null}
                data-mobile-critical-control="playoffs-sim-round"
                className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm font-semibold text-dynasty-text disabled:opacity-40"
              >
                <SkipForward className="h-4 w-4" />
                Sim Round
              </button>
              <button
                onClick={onSimRemainingPlayoffs}
                disabled={busyAction !== null}
                data-mobile-critical-control="playoffs-sim-all"
                className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm font-semibold text-dynasty-text disabled:opacity-40"
              >
                <Zap className="h-4 w-4" />
                Sim All
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {activeSeries.games.length > 0 ? activeSeries.games.map((game) => (
              <div key={`${activeSeries.id}-${game.gameNumber}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="flex items-center justify-between">
                  <div className="font-heading text-sm text-dynasty-text">
                    Game {game.gameNumber}: {game.awayTeamId.toUpperCase()} {game.awayScore}, {game.homeTeamId.toUpperCase()} {game.homeScore}
                  </div>
                  <div className="font-data text-xs text-dynasty-muted">{game.innings} innings</div>
                </div>
                <div className="mt-2 space-y-1">
                  {game.keyPerformers.map((performer) => (
                    <div key={`${game.gameNumber}-${performer.playerId}`} className="font-heading text-xs text-dynasty-muted">
                      {performer.playerName} · {performer.statLine}
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                No games logged yet. Use the controls above to start the series.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated p-6">
          {champion ? (
            <>
              <div className="font-brand text-3xl text-dynasty-textBright">{champion.toUpperCase()} won the World Series</div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">
                Dynasty grade {dynastyScore?.grade ?? 'F'} with {dynastyScore?.score ?? 0} points on the franchise ledger.
              </div>
            </>
          ) : (
            <>
              <div className="font-heading text-lg text-dynasty-text">Playoff bracket is waiting</div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">
                Initialize the postseason from the season-flow card or jump straight in here.
              </div>
              <button
                onClick={onSimNextGame}
                disabled={busyAction !== null}
                data-mobile-critical-control="playoffs-start-bracket"
                className="mobile-critical-control focus-ring mt-4 inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white disabled:opacity-40"
              >
                <ArrowRight className="h-4 w-4" />
                Start the Bracket
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
