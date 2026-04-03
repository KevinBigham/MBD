import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  Briefcase,
  ChevronRight,
  DollarSign,
  HeartPulse,
  Newspaper,
  Radar,
  Trophy,
  Users,
} from 'lucide-react';
import { Skeleton } from '@mbd/ui';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { PageShell } from '@/shared/components/PageShell';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import type { PressRoomEntry } from '@/shared/types/pressRoom';

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
  };
}

interface TradeDeadlineStateView {
  daysUntilDeadline: number | null;
  ticker: Array<{
    id: string;
    summary: string;
    timestamp: string;
  }>;
}

function ownerTone(patience: number | undefined): string {
  if (patience == null) return 'bg-dynasty-border';
  if (patience >= 65) return 'bg-accent-success';
  if (patience >= 40) return 'bg-accent-warning';
  return 'bg-accent-danger';
}

function chemistryTone(tier: string | undefined): string {
  switch (tier) {
    case 'electric':
      return 'text-accent-success';
    case 'connected':
      return 'text-accent-info';
    case 'tense':
      return 'text-accent-warning';
    case 'fractured':
      return 'text-accent-danger';
    default:
      return 'text-dynasty-text';
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-loading">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-16 w-52 rounded-lg" />
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function DashboardPage() {
  const worker = useWorker();
  const { isInitialized, userTeamId, season, day, phase } = useGameStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [deadlineState, setDeadlineState] = useState<TradeDeadlineStateView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    setLoading(true);
    try {
      const [nextSummary, nextDeadlineState] = await Promise.all([
        worker.getDashboardSummary(),
        worker.getTradeDeadlineState(),
      ]);
      setSummary((nextSummary ?? null) as DashboardSummary | null);
      setDeadlineState((nextDeadlineState ?? null) as TradeDeadlineStateView | null);
    } catch (err) {
      console.error('Failed to fetch dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, worker]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, day, season, phase]);

  const latestPressItem = summary?.pressRoom.latest ?? null;
  const headlineFeed = summary?.pressRoom.feed.slice(0, 4) ?? [];
  const ownerMeterValue = summary?.franchise.owner?.satisfaction ?? summary?.franchise.owner?.patience ?? 0;
  const topRivalry = summary?.intel.rivalries?.[0] ?? null;

  return (
    <PageShell loading={loading && summary == null} skeleton={<DashboardSkeleton />}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">Front Office</h1>
          <p className="font-data text-sm text-dynasty-muted">
            Season {season} | Day {day} | {phase.toUpperCase()}
          </p>
        </div>
        <div className="inline-flex items-center gap-3 rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3">
          <span className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Dynasty Score</span>
          <span className="font-brand text-3xl text-accent-primary">{summary?.franchise.dynasty.grade ?? 'F'}</span>
          <span className="font-data text-sm text-dynasty-muted">
            <AnimatedNumber value={summary?.franchise.dynasty.score ?? 0} formatter={(value) => `${Math.round(value)} pts`} />
          </span>
        </div>
      </div>

      {phase === 'regular' && deadlineState?.daysUntilDeadline != null ? (
        <section className="rounded-lg border border-accent-warning/30 bg-accent-warning/10 p-4">
          <div className="font-heading text-sm text-accent-warning">
            {deadlineState.daysUntilDeadline} days until trade deadline
          </div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            The market is tightening. Monitor hot offers and the league wire from Trade Center.
          </div>
        </section>
      ) : null}

      {summary?.franchise.welcomeBriefingPending ? (
        <section className="rounded-lg border border-accent-info/30 bg-accent-info/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">First Day Briefing</div>
              <h2 className="mt-2 font-brand text-3xl text-dynasty-textBright">
                Welcome, GM {summary.franchise.gmName}
              </h2>
              <p className="mt-2 max-w-3xl font-heading text-sm leading-6 text-dynasty-text">
                Your roster hub is the fastest way to check the 26-man group, standings tracks the division race, and the draft room becomes live when June arrives. Difficulty is set to {summary.franchise.difficulty}.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/roster" className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated">
                  Go to Roster
                </Link>
                <Link to="/league/standings" className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated">
                  Check Standings
                </Link>
                <Link to="/draft" className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-text hover:bg-dynasty-elevated">
                  Open Draft Room
                </Link>
              </div>
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

      {summary?.franchise.status === 'fired' ? (
        <section className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-4">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-danger">Dynasty Ended</div>
          <div className="mt-2 font-heading text-sm text-dynasty-textBright">
            {summary.franchise.endReason ?? 'Ownership ended this front office run.'}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">Franchise Header</div>
              <h2 className="mt-2 font-brand text-4xl text-dynasty-textBright">{summary?.franchise.teamName ?? 'Franchise'}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 font-data text-sm text-dynasty-muted">
                <span>{summary?.franchise.record ?? '0-0'}</span>
                <span>{summary ? `${summary.franchise.divisionRank}${summary.franchise.divisionRank === 1 ? 'st' : 'th'} place` : 'Division race'}</span>
                <span>{summary?.franchise.division ?? 'Division'}</span>
              </div>
            </div>
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Owner Satisfaction</div>
              <div className="mt-2 w-40">
                <ProgressFill
                  toneClassName={ownerTone(ownerMeterValue)}
                  value={ownerMeterValue}
                />
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">
                {summary?.franchise.owner?.summary ?? 'Owner state unavailable.'}
              </div>
              <div className="mt-2 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                GM Reputation {summary?.franchise.frontOffice?.reputation ?? 0}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Clubhouse Chemistry</div>
              <div className={`mt-2 font-data text-3xl ${chemistryTone(summary?.franchise.chemistry?.tier)}`}>
                <AnimatedNumber value={summary?.franchise.chemistry?.score ?? 0} formatter={(value) => `${Math.round(value)}`} />
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">
                {summary?.franchise.chemistry?.summary ?? 'Chemistry has not formed yet.'}
              </div>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Playoff Odds</div>
              <div className="mt-2 font-data text-3xl text-accent-primary">
                <AnimatedNumber value={summary?.momentum.playoffProbability ?? 0} formatter={(value) => `${Math.round(value)}%`} />
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">
                Pace-based estimate against the current league cutoff.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5">
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">Season Momentum</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MomentumStat icon={<Activity className="h-4 w-4" />} label="Last 10" value={summary?.momentum.last10 ?? '0-0'} />
            <MomentumStat icon={<Radar className="h-4 w-4" />} label="Streak" value={summary?.momentum.streak ?? 'W0'} />
            <MomentumStat icon={<Trophy className="h-4 w-4" />} label="Run Diff" value={`${(summary?.momentum.runDifferential ?? 0) >= 0 ? '+' : ''}${summary?.momentum.runDifferential ?? 0}`} />
            <MomentumStat icon={<Users className="h-4 w-4" />} label="Trend" value={`${summary?.momentum.last30RunDiffPerGame ?? 0}/g`} />
          </div>
          <div className="mt-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
            <div className="font-heading text-sm text-dynasty-text">
              Last 30 estimate: {summary?.momentum.last30RunDiffPerGame ?? 0}/g vs season {summary?.momentum.seasonRunDiffPerGame ?? 0}/g
            </div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">
              Positive delta usually means the club is playing over its baseline.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-text">
              <Users className="h-4 w-4 text-accent-success" />
              Roster Snapshot
            </h2>
            <Link to="/roster" className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary">
              Full roster <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3">
            {(summary?.roster.topPerformers ?? []).map((performer) => (
              <div key={performer.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-heading text-sm text-dynasty-text">{performer.name}</div>
                    <div className="font-data text-xs text-dynasty-muted">{performer.position} · {performer.label}</div>
                  </div>
                  <div className="flex h-8 items-end gap-1">
                    {performer.sparklineValues.map((value, index) => (
                      <span
                        key={`${performer.playerId}-${index}`}
                        className="w-3 rounded-sm bg-accent-primary/70"
                        style={{ height: `${Math.max(8, Math.min(32, value * 20))}px` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-muted">{performer.statLine}</div>
              </div>
            ))}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  <HeartPulse className="h-4 w-4 text-accent-danger" />
                  Injuries
                </div>
                <div className="mt-2 font-data text-3xl text-dynasty-textBright">{summary?.roster.injuredCount ?? 0}</div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  {summary?.roster.nextReturnDays != null ? `${summary.roster.nextReturnDays} days until next return` : 'No active injuries'}
                </div>
              </div>
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  <DollarSign className="h-4 w-4 text-accent-warning" />
                  Payroll
                </div>
                <div className="mt-2 font-data text-3xl text-dynasty-textBright">${summary?.roster.payroll.toFixed(1) ?? '0.0'}M</div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  Budget ${summary?.roster.budget.toFixed(1) ?? '0.0'}M · Luxury tax ${summary?.roster.luxuryTax.toFixed(1) ?? '0.0'}M
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-text">
              <Briefcase className="h-4 w-4 text-accent-info" />
              Front Office Intel
            </h2>
            <Link to="/trade" className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary">
              Trade Center <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3">
            <IntelCard
              icon={<ArrowLeftRight className="h-4 w-4 text-accent-info" />}
              label="Trade Inbox"
              value={String(summary?.intel.tradeInboxCount ?? 0)}
              body={`${summary?.intel.tradeInboxCount ?? 0} pending offers waiting for a decision.`}
            />
            <IntelCard
              icon={<DollarSign className="h-4 w-4 text-accent-warning" />}
              label="Expiring Deals"
              value={String(summary?.intel.expiringContracts.length ?? 0)}
              body={(summary?.intel.expiringContracts ?? []).map((player) => `${player.name} (${player.position})`).join(', ') || 'No major expirations.'}
            />
            <IntelCard
              icon={<Users className="h-4 w-4 text-accent-success" />}
              label="Top Prospect"
              value={summary?.intel.topProspect?.position ?? '--'}
              body={summary?.intel.topProspect ? `${summary.intel.topProspect.name} at ${summary.intel.topProspect.level}` : 'System is light on near-ready talent.'}
            />
            <IntelCard
              icon={<Briefcase className="h-4 w-4 text-accent-warning" />}
              label="GM Reputation"
              value={String(summary?.franchise.frontOffice?.reputation ?? 0)}
              body={summary?.franchise.frontOffice?.summary ?? 'Front office reputation is still forming.'}
            />
            <IntelCard
              icon={<Newspaper className="h-4 w-4 text-accent-danger" />}
              label="Top Rivalry"
              value={topRivalry ? `${topRivalry.intensity}` : '--'}
              body={topRivalry
                ? `${topRivalry.summary} ${topRivalry.currentSeasonRecord}`
                : 'No rivalry has turned into a front-burner story yet.'}
            />
            {(summary?.intel.rivalries ?? []).length > 0 ? (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Rivalry Board</div>
                <div className="mt-3 space-y-3">
                  {(summary?.intel.rivalries ?? []).map((rivalry) => (
                    <div key={rivalry.id} className="rounded border border-dynasty-border/70 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-heading text-sm text-dynasty-text">
                          {summary?.franchise.abbreviation} vs {rivalry.opponentTeamId.toUpperCase()}
                        </div>
                        <div className="w-24">
                          <ProgressFill toneClassName="bg-accent-warning" value={rivalry.intensity} />
                        </div>
                      </div>
                      <div className="mt-2 font-heading text-xs text-dynasty-muted">{rivalry.currentSeasonRecord}</div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">{rivalry.historicalRecord}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
          <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-text">
              <ArrowLeftRight className="h-4 w-4 text-accent-warning" />
              League Trade Ticker
            </h2>
            <Link to="/trade" className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary">
              Trade Center <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3 p-4">
            {(deadlineState?.ticker ?? []).length > 0 ? deadlineState?.ticker.map((item) => (
              <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">{item.timestamp}</div>
                <div className="mt-2 font-heading text-sm text-dynasty-text">{item.summary}</div>
              </div>
            )) : (
              <EmptyStatePanel
                description="When rivals start moving pieces, the league wire will light up here."
                title="No completed trades on the wire yet"
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
          <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
            <h2 className="font-heading text-sm font-semibold text-dynasty-text">Division Standings</h2>
            <Link to="/standings" className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary">
              Full standings <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                <th className="px-4 py-2 text-left font-heading">Team</th>
                <th className="px-2 py-2 text-right font-data">W</th>
                <th className="px-2 py-2 text-right font-data">L</th>
                <th className="px-2 py-2 text-right font-data">PCT</th>
                <th className="px-2 py-2 text-right font-data">GB</th>
                <th className="px-2 py-2 text-right font-data">STRK</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.divisionStandings ?? []).map((team) => (
                <tr key={team.teamId} className={`border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated ${team.teamId === userTeamId ? 'bg-accent-primary/10' : ''}`}>
                  <td className="px-4 py-2 font-heading font-medium text-dynasty-text">{team.abbreviation}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-text">{team.wins}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-text">{team.losses}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-muted">{team.pct}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-muted">{team.gamesBack === 0 ? '-' : team.gamesBack.toFixed(1)}</td>
                  <td className={`px-2 py-2 text-right font-data ${team.streak.startsWith('W') ? 'text-accent-success' : 'text-accent-danger'}`}>{team.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
          <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-text">
              <Newspaper className="h-4 w-4 text-accent-warning" />
              Press Room
            </h2>
            <Link to="/press-room" className="flex items-center gap-1 font-heading text-xs text-accent-info hover:text-accent-primary">
              Open archive <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-4 p-4">
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${
                  latestPressItem?.tag === 'BREAKING'
                    ? 'border-accent-danger/50 bg-accent-danger/10 text-accent-danger'
                    : latestPressItem?.tag === 'RUMOR'
                      ? 'border-accent-warning/50 bg-accent-warning/10 text-accent-warning'
                      : 'border-accent-info/40 bg-accent-info/10 text-accent-info'
                }`}>
                  {latestPressItem?.tag ?? 'RECAP'}
                </span>
                {latestPressItem && (
                  <span className="font-data text-[11px] uppercase text-dynasty-muted">
                    {latestPressItem.category.replace('_', ' ')}
                  </span>
                )}
              </div>
              <div className="mt-3 font-heading text-lg text-dynasty-textBright">{latestPressItem?.headline ?? 'No archived items yet'}</div>
              <div className="mt-2 font-heading text-sm text-dynasty-muted">{latestPressItem?.body ?? 'The Press Room will populate as the season creates storylines.'}</div>
              {latestPressItem && (
                <div className="mt-3 font-data text-[11px] uppercase text-dynasty-muted">
                  {latestPressItem.source} · {latestPressItem.category.replace('_', ' ')} · {latestPressItem.timestamp}
                </div>
              )}
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-heading text-sm text-dynasty-text">Today&apos;s Headlines</div>
                <Link to="/press-room" className="font-heading text-xs text-accent-info hover:text-accent-primary">
                  Read more
                </Link>
              </div>
              <div className="mt-3 space-y-3">
                {headlineFeed.length > 0 ? headlineFeed.map((entry) => (
                  <Link
                    key={entry.id}
                    to="/press-room"
                    className="block rounded border border-dynasty-border/60 px-3 py-2 transition-colors hover:border-accent-primary/40 hover:bg-dynasty-surface"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 font-heading text-[10px] uppercase tracking-wide ${
                        entry.tag === 'BREAKING'
                          ? 'border-accent-danger/50 text-accent-danger'
                          : entry.tag === 'RUMOR'
                            ? 'border-accent-warning/50 text-accent-warning'
                            : 'border-dynasty-border text-dynasty-muted'
                      }`}>
                        {entry.tag}
                      </span>
                      <span className="font-data text-[11px] uppercase text-dynasty-muted">{entry.timestamp}</span>
                    </div>
                    <div className="mt-1 font-heading text-sm text-dynasty-text">{entry.headline}</div>
                  </Link>
                )) : (
                  <EmptyStatePanel
                    className="border-dynasty-border/60 bg-dynasty-surface"
                    description="Advance the sim to generate the next cycle of headlines and briefing notes."
                    title="No headlines yet"
                  />
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <IntelCard
                icon={<Briefcase className="h-4 w-4 text-accent-info" />}
                label="Briefing Desk"
                value={String(summary?.pressRoom.briefingCount ?? 0)}
                body="Front-office items in the archive."
              />
              <IntelCard
                icon={<Newspaper className="h-4 w-4 text-accent-warning" />}
                label="News Wire"
                value={String(summary?.pressRoom.newsCount ?? 0)}
                body="League headlines available right now."
              />
            </div>
          </div>
        </div>
      </section>
      </div>
    </PageShell>
  );
}

function MomentumStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-data text-3xl text-dynasty-textBright">{value}</div>
    </div>
  );
}

function IntelCard({
  icon,
  label,
  value,
  body,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  body: string;
}) {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-data text-3xl text-dynasty-textBright">{value}</div>
      <div className="mt-2 font-heading text-xs text-dynasty-muted">{body}</div>
    </div>
  );
}
