import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Flame,
  History,
  Newspaper,
  Play,
} from 'lucide-react';
import { Skeleton } from '@mbd/ui';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { PageShell } from '@/shared/components/PageShell';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { SeasonNarrativePanel } from '@/shared/components/SeasonNarrativePanel';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import type { GamePlayByPlayView, GameRecapView } from '../components/gameDayBroadcast';

const StandingsCard = lazy(() => import('../components/StandingsCard'));
const RosterHealthCard = lazy(() => import('../components/RosterHealthCard'));
const TradeIntelCard = lazy(() => import('../components/TradeIntelCard'));
const FarmReportCard = lazy(() => import('../components/FarmReportCard'));
const FinancialCard = lazy(() => import('../components/FinancialCard'));
const PressDigestCard = lazy(() => import('../components/PressDigestCard'));
const GameRecapCard = lazy(() => import('../components/GameRecapCard'));
const PlayByPlayPanel = lazy(() => import('../components/PlayByPlayPanel'));

interface DashboardSummary {
  franchise: {
    teamName: string;
    abbreviation: string;
    gmName: string;
    difficulty: 'easy' | 'standard' | 'hard';
    welcomeBriefingPending: boolean;
    season: number;
    record: string;
    division: string;
    divisionRank: number;
    dynasty: { score: number; grade: string };
    status: 'active' | 'fired';
    endReason: string | null;
    owner: {
      hotSeat: boolean;
      patience: number;
      confidence: number;
      summary: string;
      satisfaction?: number;
      annualBudget?: number;
      payrollCap?: number;
    } | null;
    chemistry: { score: number; tier: string; summary: string } | null;
    frontOffice: { reputation: number; summary: string } | null;
  };
  fanSentiment: {
    score: number;
    trend: 'rising' | 'stable' | 'falling';
    summary: string;
  };
  challenge: {
    scenarioId: string;
    name: string;
    progress: number;
    completed: boolean;
    failed: boolean;
    summary: string;
  } | null;
  momentum: {
    last10: string;
    streak: string;
    runDifferential: number;
    seasonRunDiffPerGame: number;
    last30RunDiffPerGame: number;
    playoffProbability: number;
  };
  roster: {
    topPerformers: Array<{
      playerId: string;
      name: string;
      position: string;
      label: string;
      sparklineValues: number[];
      statLine: string;
    }>;
    injuredCount: number;
    nextReturnDays: number | null;
    fatigueWarnings: Array<{
      playerId: string;
      name: string;
      position: string;
      fatigueScore: number;
      summary: string;
    }>;
    payroll: number;
    budget: number;
    luxuryTax: number;
  };
  intel: {
    tradeInboxCount: number;
    expiringContracts: Array<{
      playerId: string;
      name: string;
      position: string;
      salary: number;
    }>;
    topProspect: {
      playerId: string;
      name: string;
      position: string;
      readiness: number;
      level: string;
    } | null;
    rivalries: Array<{
      id: string;
      opponentTeamId: string;
      intensity: number;
      summary: string;
      currentSeasonRecord: string;
      historicalRecord: string;
    }>;
  };
  tradeIntel: {
    daysUntilDeadline: number | null;
    deadlineMode: boolean;
    activeTradeOffers: number;
    recentSummary: string | null;
    recentTrades: Array<{
      id: string;
      summary: string;
      timestamp: string;
    }>;
  };
  farmIntel: {
    topProspects: Array<{
      playerId: string;
      name: string;
      position: string;
      level: string;
      readiness: number;
      trend: 'up' | 'steady' | 'down';
      latestLineSummary: string | null;
    }>;
    recentMoves: Array<{
      id: string;
      headline: string;
      timestamp: string;
    }>;
  };
  storylinesToWatch: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    arcType: string;
    phase: 'setup' | 'rising' | 'climax' | 'resolution';
    latestMilestone: string | null;
  }>;
  divisionStandings: Array<{
    teamId: string;
    teamName: string;
    abbreviation: string;
    wins: number;
    losses: number;
    pct: string;
    gamesBack: number;
    streak: string;
    runDifferential: number;
    divisionRank: number;
  }>;
  pressRoom: {
    feed: PressRoomEntry[];
    latest: PressRoomEntry | null;
    briefingCount: number;
    newsCount: number;
    unreadCount: number;
  };
  thisDayInHistory: {
    season: number;
    headline: string;
    summary: string;
  } | null;
}

interface GMCareerView {
  currentTeamId: string;
  reputation: number;
  overallRecord: { wins: number; losses: number };
  careerHistory: Array<{ teamId: string; firedSeason: number | null }>;
  jobSearchActive: boolean;
  lastFiredReason: string | null;
}

interface JobMarketView {
  availableJobs: Array<{
    teamId: string;
    budget: string;
    expectations: string;
    difficulty: string;
    attractiveness: number;
  }>;
}

interface SeasonRecapView {
  season: number;
  recap: string;
  storylines: string[];
}

interface OffseasonHeadlineView {
  season: number;
  headline: string;
}

type SimAction = 'day' | 'week' | 'month' | null;

function ownerTone(value: number | undefined): string {
  if (value == null) return 'bg-dynasty-border';
  if (value >= 65) return 'bg-accent-success';
  if (value >= 40) return 'bg-accent-warning';
  return 'bg-accent-danger';
}

function fanTrendTone(trend: DashboardSummary['fanSentiment']['trend'] | undefined): string {
  switch (trend) {
    case 'rising':
      return 'text-accent-success';
    case 'falling':
      return 'text-accent-danger';
    default:
      return 'text-dynasty-textBright';
  }
}

function labelize(value: string): string {
  return value.replaceAll('_', ' ');
}

function storyPhaseTone(phase: DashboardSummary['storylinesToWatch'][number]['phase']): string {
  switch (phase) {
    case 'climax':
      return 'border-accent-warning/50 text-accent-warning';
    case 'rising':
      return 'border-accent-info/50 text-accent-info';
    case 'resolution':
      return 'border-accent-success/50 text-accent-success';
    default:
      return 'border-dynasty-border text-dynasty-muted';
  }
}

function storyPhaseProgress(phase: DashboardSummary['storylinesToWatch'][number]['phase']): number {
  switch (phase) {
    case 'setup':
      return 25;
    case 'rising':
      return 50;
    case 'climax':
      return 80;
    case 'resolution':
      return 100;
  }
}

function quickActionLabel(action: Exclude<SimAction, null>): string {
  switch (action) {
    case 'day':
      return 'Sim Day';
    case 'week':
      return 'Sim Week';
    case 'month':
      return 'Sim Month';
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-loading">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-72 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-72 rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function CardFallback({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="font-heading text-sm text-dynasty-textBright">{title}</div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const worker = useWorker();
  const {
    isInitialized,
    userTeamId,
    season,
    day,
    phase,
    playerCount,
    activeSaveId,
    activeSaveSlot,
    initializeGame,
    updateFromSim,
  } = useGameStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [career, setCareer] = useState<GMCareerView | null>(null);
  const [jobMarket, setJobMarket] = useState<JobMarketView | null>(null);
  const [seasonRecap, setSeasonRecap] = useState<SeasonRecapView | null>(null);
  const [offseasonHeadline, setOffseasonHeadline] = useState<OffseasonHeadlineView | null>(null);
  const [recentRecaps, setRecentRecaps] = useState<GameRecapView[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null);
  const [selectedGameDetail, setSelectedGameDetail] = useState<GamePlayByPlayView | null>(null);
  const [playByPlayLoading, setPlayByPlayLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applyingTeamId, setApplyingTeamId] = useState<string | null>(null);
  const [simAction, setSimAction] = useState<SimAction>(null);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    setLoading(true);
    try {
      const [nextSummary, nextCareer, nextJobMarket, nextRecaps, nextSeasonRecap, nextOffseasonHeadline] = await Promise.all([
        worker.getDashboardSummary(),
        worker.getGMCareer(),
        worker.getJobMarket(),
        worker.getRecentGameRecaps(3),
        phase === 'offseason' ? worker.getSeasonRecap(season) : Promise.resolve(null),
        phase === 'offseason' ? worker.getOffseasonHeadline(season) : Promise.resolve(null),
      ]);
      setSummary((nextSummary ?? null) as DashboardSummary | null);
      setCareer((nextCareer ?? null) as GMCareerView | null);
      setJobMarket((nextJobMarket ?? null) as JobMarketView | null);
      setSeasonRecap((nextSeasonRecap ?? null) as SeasonRecapView | null);
      setOffseasonHeadline((nextOffseasonHeadline ?? null) as OffseasonHeadlineView | null);
      const recapViews = (nextRecaps ?? []) as GameRecapView[];
      setRecentRecaps(recapViews);
      setSelectedGameIndex((currentValue) => {
        if (recapViews.length === 0) {
          return null;
        }
        if (currentValue != null && recapViews.some((recap) => recap.gameIndex === currentValue)) {
          return currentValue;
        }
        return recapViews[0]?.gameIndex ?? null;
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, phase, season, worker]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, day, season, phase]);

  useEffect(() => {
    if (!isInitialized || !worker.isReady || selectedGameIndex == null) {
      setSelectedGameDetail(null);
      setPlayByPlayLoading(false);
      return;
    }

    let active = true;
    setPlayByPlayLoading(true);
    void worker.getGamePlayByPlay(selectedGameIndex)
      .then((detail) => {
        if (!active) {
          return;
        }
        setSelectedGameDetail((detail ?? null) as GamePlayByPlayView | null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        console.error('Failed to fetch game play-by-play:', error);
        setSelectedGameDetail(null);
      })
      .finally(() => {
        if (active) {
          setPlayByPlayLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isInitialized, selectedGameIndex, worker]);

  const handleApplyForJob = useCallback(async (teamId: string) => {
    setApplyingTeamId(teamId);
    try {
      const result = await worker.applyForJob(teamId);
      if (result?.success) {
        initializeGame({
          season,
          day,
          phase,
          playerCount,
          userTeamId: result.teamId ?? teamId,
          teamName: result.teamName ?? summary?.franchise.teamName ?? 'Franchise',
          gmName: summary?.franchise.gmName ?? 'General Manager',
          difficulty: summary?.franchise.difficulty ?? 'standard',
          activeSaveId,
          activeSaveSlot,
        });
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to apply for job:', error);
    } finally {
      setApplyingTeamId(null);
    }
  }, [activeSaveId, activeSaveSlot, day, fetchData, initializeGame, phase, playerCount, season, summary, worker]);

  const handleSim = useCallback(async (
    action: Exclude<SimAction, null>,
    run: () => Promise<{ season: number; day: number; phase: string; gamesPlayed?: number }>,
  ) => {
    setSimAction(action);
    try {
      const result = await run();
      updateFromSim(result);
      await fetchData();
    } catch (error) {
      console.error(`Failed to ${quickActionLabel(action).toLowerCase()}:`, error);
    } finally {
      setSimAction(null);
    }
  }, [fetchData, updateFromSim]);

  const ownerMeterValue = summary?.franchise.owner?.satisfaction ?? summary?.franchise.owner?.patience ?? 0;
  const topRivalry = summary?.intel.rivalries?.[0] ?? null;

  return (
    <PageShell loading={loading && summary == null} skeleton={<DashboardSkeleton />}>
      <div className="space-y-6">
        <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.2em] text-accent-info">Franchise Identity</div>
              <h1 className="mt-3 font-brand text-4xl text-dynasty-textBright">{summary?.franchise.teamName ?? 'Front Office'}</h1>
              <div className="mt-3 flex flex-wrap gap-3 font-heading text-sm text-dynasty-muted">
                <span>GM {summary?.franchise.gmName ?? 'General Manager'}</span>
                <span>Season {season}</span>
                <span>{summary?.franchise.record ?? '0-0'}</span>
                <span>{summary?.franchise.division ?? 'Division'} · {summary?.franchise.divisionRank ?? 1} place</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricPill label="Dynasty" value={summary?.franchise.dynasty.grade ?? 'F'} detail={`${summary?.franchise.dynasty.score ?? 0} pts`} />
              <MetricPill label="Fan Mood" value={`${Math.round(summary?.fanSentiment.score ?? 50)}`} detail={summary?.fanSentiment.summary ?? 'Stable'} toneClassName={fanTrendTone(summary?.fanSentiment.trend)} />
              <MetricPill label="Owner Heat" value={`${Math.round(ownerMeterValue)}`} detail={summary?.franchise.owner?.summary ?? 'Owner state unavailable'} progressToneClassName={ownerTone(ownerMeterValue)} progressValue={ownerMeterValue} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <QuickActionButton
                busy={simAction === 'day'}
                label="Sim Day"
                onClick={() => void handleSim('day', () => worker.simDay())}
              />
              <QuickActionButton
                busy={simAction === 'week'}
                label="Sim Week"
                onClick={() => void handleSim('week', () => worker.simWeek())}
              />
              <QuickActionButton
                busy={simAction === 'month'}
                label="Sim Month"
                onClick={() => void handleSim('month', () => worker.simMonth())}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                {summary?.storylinesToWatch.length ?? 0} active story arcs
              </span>
              {summary?.challenge ? (
                <span className="rounded-full border border-accent-warning/40 bg-accent-warning/10 px-3 py-1 font-data text-[11px] uppercase tracking-[0.16em] text-accent-warning">
                  {summary.challenge.name}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {summary?.franchise.welcomeBriefingPending ? (
          <section className="rounded-xl border border-accent-info/30 bg-accent-info/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">First Day Briefing</div>
                <h2 className="mt-2 font-brand text-3xl text-dynasty-textBright">Welcome, GM {summary.franchise.gmName}</h2>
                <p className="mt-2 max-w-3xl font-heading text-sm leading-6 text-dynasty-text">
                  The dashboard is now your live intelligence grid: standings, health, trade market, farm pulse, finance, and press coverage in one pass.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void worker.dismissWelcomeBriefing().then(() => fetchData());
                }}
                className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated"
              >
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        {career?.jobSearchActive && (jobMarket?.availableJobs.length ?? 0) > 0 ? (
          <section className="rounded-xl border border-accent-warning/40 bg-accent-warning/10 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">Career Crossroads</div>
                <h2 className="mt-2 font-brand text-3xl text-dynasty-textBright">Ownership made a change</h2>
                <p className="mt-2 max-w-3xl font-heading text-sm leading-6 text-dynasty-text">
                  {career.lastFiredReason ?? 'Your last club moved on.'} Career mode keeps the dynasty alive, but you need a new front office to continue.
                </p>
              </div>
              <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3 font-heading text-sm text-dynasty-muted">
                Choose one opening to take over immediately.
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {jobMarket?.availableJobs.map((job) => (
                <div key={job.teamId} className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-base text-dynasty-textBright">{job.teamId.toUpperCase()}</div>
                      <div className="mt-1 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
                        {job.budget} · {job.expectations}
                      </div>
                    </div>
                    <div className="font-data text-lg text-accent-primary">{job.attractiveness}</div>
                  </div>
                  <div className="mt-3 font-heading text-sm text-dynasty-muted">{job.difficulty}</div>
                  <button
                    type="button"
                    disabled={applyingTeamId != null}
                    onClick={() => {
                      void handleApplyForJob(job.teamId);
                    }}
                    className="mt-4 rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
                  >
                    {applyingTeamId === job.teamId ? 'Applying...' : `Take Over ${job.teamId.toUpperCase()}`}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {summary?.franchise.status === 'fired' ? (
          <section className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-4">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-danger">Dynasty Ended</div>
            <div className="mt-2 font-heading text-sm text-dynasty-textBright">
              {summary.franchise.endReason ?? 'Ownership ended this front office run.'}
            </div>
          </section>
        ) : null}

        {phase === 'offseason' && seasonRecap && offseasonHeadline ? (
          <SeasonNarrativePanel
            season={seasonRecap.season}
            title="Offseason Outlook"
            headline={offseasonHeadline.headline}
            recap={seasonRecap.recap}
            storylines={seasonRecap.storylines}
          />
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">Game Day</div>
                <h2 className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">Recent Broadcast Recaps</h2>
              </div>
              <span className="rounded-full border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                Last {recentRecaps.length}
              </span>
            </div>

            {recentRecaps.length > 0 ? (
              <div className="grid gap-3">
                {recentRecaps.map((recap) => (
                  <Suspense key={recap.gameIndex} fallback={<CardFallback title="Game Recap" />}>
                    <GameRecapCard
                      recap={recap}
                      selected={recap.gameIndex === selectedGameIndex}
                      onSelect={setSelectedGameIndex}
                    />
                  </Suspense>
                ))}
              </div>
            ) : (
              <EmptyStatePanel
                className="border-dynasty-border/60 bg-dynasty-elevated"
                title="No recent user-team games"
                description="Sim a few regular-season days and the broadcast booth will start collecting fresh recaps and highlight reels."
              />
            )}
          </section>

          <Suspense fallback={<CardFallback title="Broadcast Booth" />}>
            <PlayByPlayPanel detail={selectedGameDetail} loading={playByPlayLoading} />
          </Suspense>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Suspense fallback={<CardFallback title="Standings" />}>
            <StandingsCard standings={summary?.divisionStandings ?? []} userTeamId={userTeamId} />
          </Suspense>
          <Suspense fallback={<CardFallback title="Roster Health" />}>
            <RosterHealthCard
              injuredCount={summary?.roster.injuredCount ?? 0}
              nextReturnDays={summary?.roster.nextReturnDays ?? null}
              fatigueWarnings={summary?.roster.fatigueWarnings ?? []}
            />
          </Suspense>
          <Suspense fallback={<CardFallback title="Trade Intel" />}>
            <TradeIntelCard
              daysUntilDeadline={summary?.tradeIntel.daysUntilDeadline ?? null}
              activeTradeOffers={summary?.tradeIntel.activeTradeOffers ?? 0}
              recentSummary={summary?.tradeIntel.recentSummary ?? null}
              recentTrades={summary?.tradeIntel.recentTrades ?? []}
            />
          </Suspense>
          <Suspense fallback={<CardFallback title="Farm Report" />}>
            <FarmReportCard
              prospects={summary?.farmIntel.topProspects ?? []}
              recentMoves={summary?.farmIntel.recentMoves ?? []}
            />
          </Suspense>
          <Suspense fallback={<CardFallback title="Financials" />}>
            <FinancialCard
              payroll={summary?.roster.payroll ?? 0}
              budget={summary?.roster.budget ?? 0}
              luxuryTax={summary?.roster.luxuryTax ?? 0}
              annualBudget={summary?.franchise.owner?.annualBudget}
              payrollCap={summary?.franchise.owner?.payrollCap}
            />
          </Suspense>
          <Suspense fallback={<CardFallback title="Press Digest" />}>
            <PressDigestCard
              feed={summary?.pressRoom.feed ?? []}
              unreadCount={summary?.pressRoom.unreadCount ?? 0}
            />
          </Suspense>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-accent-warning" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Active Storylines</h2>
              </div>
              <Link to="/press-room" className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary">
                Press Room <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {(summary?.storylinesToWatch ?? []).length > 0 ? (
              <div className="space-y-3">
                {(summary?.storylinesToWatch ?? []).map((storyline) => (
                  <Link
                    key={`${storyline.playerId}-${storyline.arcType}`}
                    to={`/players/${storyline.playerId}`}
                    className="block rounded-lg border border-dynasty-border/70 bg-dynasty-elevated p-4 transition-colors hover:border-accent-primary/40 hover:bg-dynasty-surface"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-heading text-sm text-dynasty-textBright">{storyline.playerName}</div>
                      <span className={`rounded border px-2 py-0.5 font-heading text-[10px] uppercase tracking-wide ${storyPhaseTone(storyline.phase)}`}>
                        {storyline.phase}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                      <span>{labelize(storyline.arcType)}</span>
                      <span>{storyline.teamId.toUpperCase()}</span>
                    </div>
                    <div className="mt-3">
                      <ProgressFill toneClassName="bg-accent-primary" value={storyPhaseProgress(storyline.phase)} />
                    </div>
                    <div className="mt-3 font-heading text-sm text-dynasty-muted">
                      {storyline.latestMilestone ?? `${storyline.playerName} is building a new arc.`}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyStatePanel
                className="border-dynasty-border/60 bg-dynasty-elevated"
                description="Advance a few checkpoints and the dynasty will start generating real narrative momentum."
                title="No active story arcs yet"
              />
            )}
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent-danger" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Rivalry Watch</h2>
              </div>

              {topRivalry ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="font-heading text-base text-dynasty-textBright">
                      {summary?.franchise.abbreviation} vs {topRivalry.opponentTeamId.toUpperCase()}
                    </div>
                    <div className="mt-1 font-heading text-sm text-dynasty-muted">{topRivalry.summary}</div>
                  </div>
                  <ProgressFill toneClassName="bg-accent-warning" value={topRivalry.intensity} />
                  <div className="font-heading text-xs text-dynasty-muted">{topRivalry.currentSeasonRecord}</div>
                  <div className="font-heading text-xs text-dynasty-muted">{topRivalry.historicalRecord}</div>
                </div>
              ) : (
                <div className="mt-4 font-heading text-sm text-dynasty-muted">
                  No rivalry has reached the front-burner tier yet.
                </div>
              )}
            </section>

            <section className="rounded-xl border border-dynasty-border bg-dynasty-surface p-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-accent-info" />
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">This Day in History</h2>
              </div>

              {summary?.thisDayInHistory ? (
                <div className="mt-4">
                  <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Season {summary.thisDayInHistory.season}</div>
                  <div className="mt-2 font-heading text-base text-dynasty-textBright">{summary.thisDayInHistory.headline}</div>
                  <div className="mt-2 font-heading text-sm text-dynasty-muted">{summary.thisDayInHistory.summary}</div>
                </div>
              ) : (
                <div className="mt-4 font-heading text-sm text-dynasty-muted">
                  Archived season history will appear here once the dynasty has real mileage.
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function MetricPill({
  label,
  value,
  detail,
  toneClassName = 'text-dynasty-textBright',
  progressToneClassName,
  progressValue,
}: {
  label: string;
  value: string;
  detail: string;
  toneClassName?: string;
  progressToneClassName?: string;
  progressValue?: number;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3">
      <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">{label}</div>
      <div className={`mt-2 font-data text-2xl ${toneClassName}`}>{value}</div>
      {progressToneClassName && progressValue != null ? (
        <div className="mt-2">
          <ProgressFill toneClassName={progressToneClassName} value={progressValue} />
        </div>
      ) : null}
      <div className="mt-2 font-heading text-xs text-dynasty-muted">{detail}</div>
    </div>
  );
}

function QuickActionButton({
  busy,
  label,
  onClick,
}: {
  busy: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Play className="h-3.5 w-3.5" />
      {busy ? `${label}...` : label}
    </button>
  );
}
