import { useCallback, useEffect, useState } from 'react';
import type {
  DecisionSpotlightItem,
  DecisionSpotlightUrgency,
  LeagueEvent,
  MonthlyPulseState,
  MonthlyReport,
} from '@mbd/contracts';
import { Badge } from '@mbd/ui';
import { createGameRNG, generateLeagueEventNarrative, REGULAR_SEASON_MONTHS } from '@mbd/sim-core';
import { Activity, AlertTriangle, ArrowRight, CheckCircle, Clock, Radio, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';

const HASH_MULTIPLIER = 31;

function getLeagueEventMonthLabel(month: number): string {
  return REGULAR_SEASON_MONTHS.find((entry) => entry.month === month)?.label ?? `Month ${month}`;
}

function hashSeedSegment(seed: number, segment: string): number {
  let nextSeed = seed;
  for (const char of segment) {
    nextSeed = ((nextSeed * HASH_MULTIPLIER) + char.charCodeAt(0)) >>> 0;
  }
  return nextSeed;
}

function createLeagueEventSeed(event: LeagueEvent): number {
  let seed = ((event.season * 1000) + event.month) >>> 0;
  seed = hashSeedSegment(seed, event.type);
  seed = hashSeedSegment(seed, event.headline);
  for (const teamId of event.teamIds) {
    seed = hashSeedSegment(seed, teamId);
  }
  for (const playerId of event.playerIds) {
    seed = hashSeedSegment(seed, playerId);
  }
  return seed || 1;
}

function urgencyTone(urgency: DecisionSpotlightUrgency): string {
  switch (urgency) {
    case 'red': return 'border-l-accent-danger';
    case 'yellow': return 'border-l-accent-warning';
    case 'blue': return 'border-l-accent-info';
  }
}

function urgencyBadgeTone(urgency: DecisionSpotlightUrgency): string {
  switch (urgency) {
    case 'red': return 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger';
    case 'yellow': return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
    case 'blue': return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
  }
}

function urgencyLabel(urgency: DecisionSpotlightUrgency): string {
  switch (urgency) {
    case 'red': return 'Critical';
    case 'yellow': return 'Watch';
    case 'blue': return 'Info';
  }
}

function MovementArrow({ movement }: { movement: number }) {
  if (movement > 0) return <TrendingUp className="h-3.5 w-3.5 text-accent-success" />;
  if (movement < 0) return <TrendingDown className="h-3.5 w-3.5 text-accent-danger" />;
  return null;
}

function MonthlyReportCard({
  report,
  onAcknowledge,
}: {
  report: MonthlyReport;
  onAcknowledge: () => void;
}) {
  return (
    <div className="rounded-lg border border-accent-primary/30 bg-dynasty-elevated p-5 ring-1 ring-accent-primary/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent-primary" />
          <h2 className="font-brand text-xl text-dynasty-textBright">{report.monthLabel} Report</h2>
        </div>
        <Badge
          className="border-dynasty-border bg-dynasty-surface text-dynasty-text"
          title={report.upcomingScheduleDifficulty.summary}
        >
          {report.upcomingScheduleDifficulty.label}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
          <div className="font-data text-[10px] text-dynasty-muted">Month Record</div>
          <div className="mt-0.5 font-data text-lg text-dynasty-textBright">
            {report.teamRecord}
          </div>
        </div>
        <div className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
          <div className="font-data text-[10px] text-dynasty-muted">Overall Record</div>
          <div className="mt-0.5 font-data text-lg text-dynasty-textBright">
            {report.overallRecord}
          </div>
        </div>
        <div className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
          <div className="font-data text-[10px] text-dynasty-muted">Division Rank</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="font-data text-lg text-dynasty-textBright">#{report.divisionRank}</span>
            <MovementArrow movement={report.divisionMovement} />
          </div>
        </div>
        {report.tradeDeadlineCountdown != null && (
          <div className="rounded-md border border-accent-warning/30 bg-accent-warning/5 p-3">
            <div className="font-data text-[10px] text-accent-warning">Trade Deadline</div>
            <div className="mt-0.5 font-data text-lg text-accent-warning">
              {report.tradeDeadlineCountdown}d
            </div>
          </div>
        )}
      </div>

      {/* Player of the Month */}
      {report.playerOfTheMonth && (
        <div className="mt-3 rounded-md border border-accent-primary/20 bg-accent-primary/5 p-3">
          <div className="font-heading text-xs text-accent-primary">Player of the Month</div>
          <div className="mt-0.5 font-data text-sm text-dynasty-textBright">
            {report.playerOfTheMonth.playerName}
          </div>
          <div className="font-data text-xs text-dynasty-muted">
            {report.playerOfTheMonth.position} · {report.playerOfTheMonth.war.toFixed(1)} WAR
          </div>
        </div>
      )}

      {/* Injuries & Returns */}
      {(report.keyInjuries.length > 0 || report.keyReturns.length > 0) && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {report.keyInjuries.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 font-heading text-xs text-accent-danger">
                <AlertTriangle className="h-3 w-3" /> Injuries
              </div>
              {report.keyInjuries.map((inj, i) => (
                <div key={i} className="font-data text-xs text-dynasty-muted">{inj}</div>
              ))}
            </div>
          )}
          {report.keyReturns.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 font-heading text-xs text-accent-success">
                <CheckCircle className="h-3 w-3" /> Returns
              </div>
              {report.keyReturns.map((ret, i) => (
                <div key={i} className="font-data text-xs text-dynasty-muted">{ret}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onAcknowledge}
        className="focus-ring mt-4 rounded-md border border-accent-primary/40 bg-accent-primary/10 px-4 py-2 font-heading text-xs text-accent-primary transition-colors hover:bg-accent-primary/20"
      >
        Mark as Read
      </button>
    </div>
  );
}

function DecisionCard({
  decision,
  onDismiss,
}: {
  decision: DecisionSpotlightItem;
  onDismiss: () => void;
}) {
  return (
    <div
      className={[
        'rounded-lg border border-dynasty-border bg-dynasty-surface p-4 border-l-4',
        urgencyTone(decision.urgency),
        decision.urgency === 'red' ? 'motion-safe:animate-pulse' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm text-dynasty-textBright">{decision.title}</span>
            <Badge className={urgencyBadgeTone(decision.urgency)}>{urgencyLabel(decision.urgency)}</Badge>
          </div>
          <p className="mt-1 font-data text-xs text-dynasty-muted">{decision.body}</p>
          <Link
            to={decision.route}
            className="mt-2 inline-flex items-center gap-1 font-heading text-xs text-accent-primary transition-colors hover:text-accent-primary/80"
          >
            {decision.actionLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="focus-ring shrink-0 rounded p-1 text-dynasty-muted transition-colors hover:text-dynasty-text"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function LeagueEventsSection({ events }: { events: LeagueEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-accent-info" />
        <h2 className="font-heading text-sm text-dynasty-textBright">
          League Events
          <span className="ml-2 font-data text-xs text-dynasty-muted">({events.length})</span>
        </h2>
      </div>
      <div className="space-y-3">
        {events.map((event) => {
          const narrative = generateLeagueEventNarrative(
            createGameRNG(createLeagueEventSeed(event)),
            event,
          );
          return (
            <article
              key={`${event.season}-${event.month}-${event.type}-${event.headline}`}
              className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-sm text-dynasty-textBright">{event.headline}</h3>
                  <p className="mt-1 font-data text-xs text-dynasty-muted">
                    {getLeagueEventMonthLabel(event.month)} {event.season}
                  </p>
                </div>
                <Badge className="border-accent-info/30 bg-accent-info/10 text-accent-info">
                  {event.type.replaceAll('_', ' ')}
                </Badge>
              </div>
              <p className="mt-3 font-data text-sm text-dynasty-text">{narrative}</p>
              {event.gameplayEffect && (
                <div className="mt-3 rounded-md border border-accent-warning/20 bg-accent-warning/5 p-3 font-data text-xs text-accent-warning">
                  {event.gameplayEffect}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function PulsePage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, season, day, phase } = useGameStore();
  const [pulse, setPulse] = useState<MonthlyPulseState | null>(null);
  const [leagueEvents, setLeagueEvents] = useState<LeagueEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const [data, currentLeagueEvents] = await Promise.all([
      worker.getMonthlyPulse(),
      worker.getCurrentLeagueEvents(),
    ]);
    setPulse((data ?? null) as MonthlyPulseState | null);
    setLeagueEvents((currentLeagueEvents ?? []) as LeagueEvent[]);
    setLoading(false);
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, season, day, phase]);

  const handleAcknowledge = useCallback(async () => {
    if (!pulse?.pendingReport) return;
    await worker.acknowledgeMonthlyReport(pulse.pendingReport.id);
    void fetchData();
  }, [fetchData, pulse, worker]);

  const handleDismiss = useCallback(async (decisionId: string) => {
    await worker.dismissDecisionSpotlight(decisionId);
    void fetchData();
  }, [fetchData, worker]);

  const hasContent = Boolean(
    (pulse && (pulse.pendingReport || pulse.decisionQueue.length > 0))
    || leagueEvents.length > 0,
  );
  const sortedDecisions = pulse?.decisionQueue
    .slice()
    .sort((a, b) => {
      const order: Record<DecisionSpotlightUrgency, number> = { red: 0, yellow: 1, blue: 2 };
      return order[a.urgency] - order[b.urgency];
    }) ?? [];

  return (
    <PageShell loading={loading}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Monthly Pulse</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            Season reports and decision spotlights
          </p>
        </div>

        {/* Content */}
        {!hasContent ? (
          <EmptyStatePanel
            icon={Activity}
            title="No pending reports"
            description="Monthly pulse reports are generated as the season progresses. Sim some games to see your first report."
          />
        ) : (
          <div className="space-y-6">
            {/* Monthly Report */}
            {pulse?.pendingReport && (
              <MonthlyReportCard
                report={pulse.pendingReport}
                onAcknowledge={handleAcknowledge}
              />
            )}

            {/* Decision Queue */}
            {sortedDecisions.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-heading text-sm text-dynasty-textBright">
                  Decision Spotlights
                  <span className="ml-2 font-data text-xs text-dynasty-muted">({sortedDecisions.length})</span>
                </h2>
                {sortedDecisions.map((d) => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    onDismiss={() => void handleDismiss(d.id)}
                  />
                ))}
              </div>
            )}

            <LeagueEventsSection events={leagueEvents} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
