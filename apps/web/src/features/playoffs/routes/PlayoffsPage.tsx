import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Play,
  FastForward,
  SkipForward,
  Trophy,
  Zap,
} from 'lucide-react';

const MomentumPanel = lazy(() => import('../components/MomentumPanel'));
import type { PlayoffBracket, PlayoffSeriesState } from '@mbd/sim-core';
import { TeamLogo } from '@/shared/components/TeamLogo';
import type { SeasonFlowPreviewSeries } from '@/app/layout/seasonFlow';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface DynastyScoreSummary {
  score: number;
  grade: string;
}

const ROUND_LABELS: Array<{ key: string; label: string }> = [
  { key: 'Wild Card', label: 'Wild Card' },
  { key: 'Division Series', label: 'Division Series' },
  { key: 'Championship Series', label: 'Championship Series' },
  { key: 'World Series', label: 'World Series' },
];

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

function teamName(teamId: string | null, fallback: string): string {
  return teamId ? teamId.toUpperCase() : fallback;
}

export default function PlayoffsPage() {
  const worker = useWorker();
  const { isInitialized, season, day, phase, updateFromSim } = useGameStore();
  const [bracket, setBracket] = useState<PlayoffBracket | null>(null);
  const [playoffPreview, setPlayoffPreview] = useState<SeasonFlowPreviewSeries[]>([]);
  const [dynastyScore, setDynastyScore] = useState<DynastyScoreSummary | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const fetchPlayoffs = useCallback(async () => {
    if (!worker.isReady || !isInitialized) return;
    const [nextBracket, nextFlow, nextDynasty] = await Promise.all([
      worker.getPlayoffBracket(),
      worker.getSeasonFlowState(),
      worker.getDynastyScore(),
    ]);
    setBracket((nextBracket ?? null) as PlayoffBracket | null);
    setPlayoffPreview((nextFlow?.playoffPreview ?? []) as SeasonFlowPreviewSeries[]);
    setDynastyScore((nextDynasty ?? null) as DynastyScoreSummary | null);
  }, [isInitialized, worker]);

  useEffect(() => {
    void fetchPlayoffs();
  }, [fetchPlayoffs, season, day, phase]);

  const runMutation = useCallback(async (
    key: string,
    action: () => Promise<{ season: number; day: number; phase: string; gamesPlayed: number }>,
  ) => {
    setBusyAction(key);
    try {
      const result = await action();
      updateFromSim(result);
      await fetchPlayoffs();
    } finally {
      setBusyAction(null);
    }
  }, [fetchPlayoffs, updateFromSim]);

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

      <Suspense fallback={null}>
        <MomentumPanel />
      </Suspense>

      <section className="grid gap-4 xl:grid-cols-4">
        {ROUND_LABELS.map((round) => {
          const cards = playoffPreview.filter((entry) => entry.round === round.key);
          return (
            <div key={round.key} className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">{round.label}</div>
              <div className="mt-3 space-y-3">
                {cards.length > 0 ? cards.map((card) => {
                  const live = liveSeries.get(card.id);
                  return (
                    <div key={card.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                      <div className="flex items-center justify-between font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                        <span>{card.id}</span>
                        <span>Best of {card.bestOf}</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 font-heading text-sm text-dynasty-text">
                          {live?.higherSeed.teamId && <TeamLogo teamId={live.higherSeed.teamId} size="xs" />}
                          {live ? `${live.higherSeed.seed} ${teamName(live.higherSeed.teamId, card.home.teamName)}` : `${card.home.seed ?? ''} ${card.home.teamName}`.trim()}
                        </div>
                        <div className="flex items-center gap-2 font-heading text-sm text-dynasty-text">
                          {live?.lowerSeed.teamId && <TeamLogo teamId={live.lowerSeed.teamId} size="xs" />}
                          {live ? `${live.lowerSeed.seed} ${teamName(live.lowerSeed.teamId, card.away.teamName)}` : `${card.away.seed ?? ''} ${card.away.teamName}`.trim()}
                        </div>
                      </div>
                      <div className="mt-3 font-data text-xs text-dynasty-muted">
                        {live ? live.leaderSummary : 'Awaiting matchup'}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                    Round will populate once the bracket is set.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Current Series</div>
              <h2 className="mt-1 font-heading text-xl text-dynasty-textBright">
                {activeSeries
                  ? activeSeries.leaderSummary
                  : bracket?.champion
                    ? `${bracket.champion.toUpperCase()} lifted the trophy`
                    : 'Bracket not initialized'}
              </h2>
            </div>
            {bracket?.champion && (
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
                    onClick={() => void runMutation('game', () => worker.simPlayoffGame())}
                    disabled={busyAction !== null}
                    className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" />
                    Sim Next Game
                  </button>
                  <button
                    onClick={() => void runMutation('series', () => worker.simPlayoffSeries())}
                    disabled={busyAction !== null}
                    className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm font-semibold text-dynasty-text disabled:opacity-40"
                  >
                    <FastForward className="h-4 w-4" />
                    Sim Series
                  </button>
                  <button
                    onClick={() => void runMutation('round', () => worker.simPlayoffRound())}
                    disabled={busyAction !== null}
                    className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm font-semibold text-dynasty-text disabled:opacity-40"
                  >
                    <SkipForward className="h-4 w-4" />
                    Sim Round
                  </button>
                  <button
                    onClick={() => void runMutation('all', () => worker.simRemainingPlayoffs())}
                    disabled={busyAction !== null}
                    className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm font-semibold text-dynasty-text disabled:opacity-40"
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
              {bracket?.champion ? (
                <>
                  <div className="font-brand text-3xl text-dynasty-textBright">{bracket.champion.toUpperCase()} won the World Series</div>
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
                    onClick={() => void runMutation('game', () => worker.simPlayoffGame())}
                    disabled={busyAction !== null}
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white disabled:opacity-40"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Start the Bracket
                  </button>
                </>
              )}
            </div>
          )}
        </div>

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
