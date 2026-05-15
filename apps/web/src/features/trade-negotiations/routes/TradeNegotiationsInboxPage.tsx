import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Handshake, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Skeleton } from '@mbd/ui';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { PageShell } from '@/shared/components/PageShell';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { logger } from '@/shared/lib/logger';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';

function TradeNegotiationsSkeleton() {
  return (
    <div className="space-y-5" data-testid="trade-negotiations-skeleton">
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-[34rem] max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-36 rounded-lg" />
      <Skeleton className="h-36 rounded-lg" />
    </div>
  );
}

function phaseLabel(phase: TradeNegotiationView['phase']): string {
  return phase.replace(/_/g, ' ');
}

function expiryLabel(expiresAtDay: number, currentDay: number): string {
  const days = expiresAtDay - currentDay;
  if (days < 0) return 'Expired';
  if (days === 0) return 'Deadline today';
  if (days === 1) return 'Expires in 1 day';
  return `Expires in ${days} days`;
}

function actionLabels(negotiation: TradeNegotiationView): string[] {
  if (negotiation.isComplete) return ['Closed'];

  const actions = [
    negotiation.canAccept ? 'Accept' : null,
    negotiation.canCounter ? 'Counter' : null,
    negotiation.canReject ? 'Reject' : null,
  ].filter((label): label is string => label != null);

  return actions.length > 0 ? actions : ['Review'];
}

function compareNegotiations(left: TradeNegotiationView, right: TradeNegotiationView): number {
  if (left.isComplete !== right.isComplete) {
    return left.isComplete ? 1 : -1;
  }

  return left.expiresAtDay - right.expiresAtDay
    || left.teamName.localeCompare(right.teamName)
    || left.id.localeCompare(right.id);
}

function latestDialogueText(negotiation: TradeNegotiationView): string {
  const latest = negotiation.dialogue.at(-1);
  return latest?.text ?? 'No dialogue has been logged for this negotiation yet.';
}

function TradeNegotiationRow({
  negotiation,
  currentDay,
}: {
  negotiation: TradeNegotiationView;
  currentDay: number;
}) {
  return (
    <Link
      to={`/trade-negotiations/${negotiation.id}`}
      className="focus-ring block rounded-lg border border-dynasty-border bg-dynasty-surface p-4 transition-colors hover:border-dynasty-muted hover:bg-dynasty-elevated/70"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold leading-6 text-dynasty-textBright">
              {negotiation.teamName}
            </h2>
            <Badge variant="outline" className="font-data text-[10px] uppercase tracking-[0.16em]">
              {negotiation.teamAbbreviation}
            </Badge>
            <Badge variant={negotiation.isComplete ? 'outline' : 'info'} className="font-data text-[10px] uppercase tracking-[0.16em]">
              {phaseLabel(negotiation.phase)}
            </Badge>
          </div>

          <p className="mt-3 flex max-w-4xl items-start gap-2 font-heading text-sm leading-6 text-dynasty-text">
            <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-dynasty-muted" />
            <span>{latestDialogueText(negotiation)}</span>
          </p>
        </div>

        <div className="grid min-w-[14rem] gap-2 text-left lg:text-right">
          <div className="font-data text-xs uppercase tracking-[0.16em] text-dynasty-muted">
            Round {Math.max(1, negotiation.roundsCompleted)}
          </div>
          <div className="font-heading text-sm text-dynasty-textBright">
            {expiryLabel(negotiation.expiresAtDay, currentDay)}
          </div>
          <div className="flex flex-wrap gap-1.5 lg:justify-end">
            {actionLabels(negotiation).map((label) => (
              <span
                key={`${negotiation.id}-${label}`}
                className={[
                  'rounded border px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em]',
                  label === 'Closed'
                    ? 'border-dynasty-border text-dynasty-muted'
                    : 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary',
                ].join(' ')}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1 font-heading text-xs text-dynasty-muted">
        View detail
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

export default function TradeNegotiationsInboxPage() {
  const worker = useWorker();
  const { isInitialized, day, season, phase } = useGameStore();
  const [negotiations, setNegotiations] = useState<TradeNegotiationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNegotiations = useCallback(async () => {
    if (!isInitialized || !worker.isReady) {
      setNegotiations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextNegotiations = await worker.getOpenNegotiations();
      setNegotiations([...(nextNegotiations ?? [])] as TradeNegotiationView[]);
    } catch (err) {
      logger.error('Failed to fetch trade negotiations:', err);
      toast.error('Trade negotiations could not be loaded.');
      setError('Trade negotiations unavailable');
    } finally {
      setLoading(false);
    }
  }, [isInitialized, worker]);

  useEffect(() => {
    void fetchNegotiations();
  }, [fetchNegotiations, season, day, phase]);

  const sortedNegotiations = useMemo(
    () => [...negotiations].sort(compareNegotiations),
    [negotiations],
  );

  const openCount = negotiations.filter((negotiation) => !negotiation.isComplete).length;
  const closedCount = negotiations.length - openCount;
  const nextExpiry = sortedNegotiations.find((negotiation) => !negotiation.isComplete);

  return (
    <PageShell loading={loading} skeleton={<TradeNegotiationsSkeleton />}>
      <div className="space-y-5">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Trade Negotiations Inbox
          </h1>
          <p className="mt-1 max-w-3xl font-heading text-sm leading-6 text-dynasty-muted">
            Active trade-room conversations ready for review before they expire.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="flex items-center gap-2 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
              <Handshake className="h-4 w-4" />
              Open
            </div>
            <div className="mt-2 font-data text-3xl text-accent-primary">{openCount}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">negotiations active</div>
          </div>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">Closed</div>
            <div className="mt-2 font-data text-3xl text-dynasty-textBright">{closedCount}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">resolved or expired</div>
          </div>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">Next Deadline</div>
            <div className="mt-2 font-heading text-xl text-dynasty-textBright">
              {nextExpiry ? expiryLabel(nextExpiry.expiresAtDay, day) : 'No deadline'}
            </div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">
              {nextExpiry ? nextExpiry.teamAbbreviation : 'start a trade call'}
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex flex-col gap-3 border-b border-dynasty-border pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
                Current Trade Calls
              </h2>
              <p className="mt-1 font-heading text-xs text-dynasty-muted">
                Open negotiations sort first, then by soonest expiration.
              </p>
            </div>
            <Link
              to="/trade"
              className="focus-ring inline-flex items-center gap-1 rounded-md border border-dynasty-border px-3 py-1.5 font-heading text-xs text-dynasty-muted transition-colors hover:border-dynasty-muted hover:text-dynasty-text"
            >
              Trade Hub
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {error ? (
            <div className="mt-4">
              <EmptyStatePanel
                icon={AlertTriangle}
                title={error}
                description="The worker did not return the trade negotiation queue. Try again after the simulation worker is ready."
                actionLabel="Retry"
                onAction={() => void fetchNegotiations()}
              />
            </div>
          ) : sortedNegotiations.length === 0 ? (
            <div className="mt-4">
              <EmptyStatePanel
                icon={Handshake}
                title="No open trade negotiations"
                description="Visit the Trade Hub to start one and track every counter here."
                actionLabel="Visit Trade Hub"
                actionHref="/trade"
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sortedNegotiations.map((negotiation) => (
                <TradeNegotiationRow
                  key={negotiation.id}
                  negotiation={negotiation}
                  currentDay={day}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
