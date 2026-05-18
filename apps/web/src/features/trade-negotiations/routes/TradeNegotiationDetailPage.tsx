import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertTriangle, Handshake } from 'lucide-react';
import type { TradeAsset } from '@mbd/contracts';
import { Badge, Skeleton } from '@mbd/ui';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { PageShell } from '@/shared/components/PageShell';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { logger } from '@/shared/lib/logger';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeCounterPackage, TradeNegotiationView } from '@/workers/sim.worker.trade';

type PlayerLookup = Map<string, Pick<PlayerDTO, 'id' | 'firstName' | 'lastName' | 'position'>>;

function TradeNegotiationDetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="trade-negotiation-detail-skeleton">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  );
}

function phaseLabel(phase: TradeNegotiationView['phase']): string {
  return phase.replace(/_/g, ' ');
}

function collectPlayerIds(...packages: Array<TradeCounterPackage | null | undefined>): string[] {
  const ids = new Set<string>();
  for (const tradePackage of packages) {
    if (!tradePackage) continue;
    for (const asset of [...tradePackage.offeringAssets, ...tradePackage.requestingAssets]) {
      if (asset.type === 'player') {
        ids.add(asset.playerId);
      }
    }
  }
  return [...ids].sort();
}

function assetKey(asset: TradeAsset, index: number): string {
  switch (asset.type) {
    case 'player':
      return `player-${asset.playerId}`;
    case 'draft_pick':
      return `pick-${asset.season}-${asset.round}-${asset.originalTeamId}`;
    case 'ifa_pool_space':
      return `ifa-${asset.amount}-${index}`;
  }
}

function PlayerAssetLink({
  playerId,
  players,
}: {
  playerId: string;
  players: PlayerLookup;
}) {
  const player = players.get(playerId);
  const name = player ? `${player.firstName} ${player.lastName}` : playerId;
  return (
    <Link
      to={`/players/${playerId}`}
      className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
    >
      {name}
      {player ? <span className="ml-2 font-data text-[11px] text-dynasty-muted">{player.position}</span> : null}
    </Link>
  );
}

function TradeAssetLine({
  asset,
  players,
}: {
  asset: TradeAsset;
  players: PlayerLookup;
}) {
  if (asset.type === 'player') {
    return <PlayerAssetLink playerId={asset.playerId} players={players} />;
  }

  if (asset.type === 'draft_pick') {
    return (
      <span className="font-heading text-sm text-dynasty-text">
        R{asset.round} {asset.season}
        <span className="ml-2 font-data text-[11px] text-dynasty-muted">
          {asset.originalTeamId.toUpperCase()} original
        </span>
      </span>
    );
  }

  return (
    <span className="font-heading text-sm text-dynasty-text">
      IFA Pool ${asset.amount.toFixed(2)}M
    </span>
  );
}

function AssetColumn({
  title,
  assets,
  players,
}: {
  title: string;
  assets: TradeAsset[];
  players: PlayerLookup;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/50 p-3">
      <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">{title}</div>
      <div className="mt-3 space-y-2">
        {assets.length === 0 ? (
          <div className="font-heading text-sm text-dynasty-muted">No assets listed</div>
        ) : (
          assets.map((asset, index) => (
            <div
              key={assetKey(asset, index)}
              className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2"
            >
              <TradeAssetLine asset={asset} players={players} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TradePackagePanel({
  title,
  tradePackage,
  players,
  emptyLabel,
}: {
  title: string;
  tradePackage: TradeCounterPackage | null;
  players: PlayerLookup;
  emptyLabel?: string;
}) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">{title}</h2>
      {tradePackage ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AssetColumn title="You Send" assets={tradePackage.offeringAssets} players={players} />
          <AssetColumn title="You Receive" assets={tradePackage.requestingAssets} players={players} />
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
          {emptyLabel ?? 'No package is available.'}
        </div>
      )}
    </section>
  );
}

function DialogueThread({
  negotiation,
}: {
  negotiation: TradeNegotiationView;
}) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Dialogue Thread</h2>
      <div className="mt-4 space-y-3">
        {negotiation.dialogue.length === 0 ? (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
            No dialogue has been logged for this negotiation yet.
          </div>
        ) : (
          negotiation.dialogue.map((entry, index) => (
            <div
              key={`${entry.speaker}-${index}`}
              className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-3"
            >
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                {entry.speaker === 'rival_gm' ? negotiation.teamAbbreviation : 'AGM Advisor'}
              </div>
              <p className="mt-2 font-heading text-sm leading-6 text-dynasty-text">{entry.text}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function TradeNegotiationDetailPage() {
  const { negotiationId } = useParams<{ negotiationId: string }>();
  const worker = useWorker();
  const { isInitialized, day, season, phase } = useGameStore();
  const [negotiation, setNegotiation] = useState<TradeNegotiationView | null>(null);
  const [players, setPlayers] = useState<PlayerLookup>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNegotiation = useCallback(async () => {
    if (!isInitialized || !worker.isReady || !negotiationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextNegotiation = (await worker.getNegotiation(negotiationId)) as TradeNegotiationView | null;
      setNegotiation(nextNegotiation);

      const playerIds = collectPlayerIds(nextNegotiation?.proposal, nextNegotiation?.counterOffer);
      const resolvedPlayers = await Promise.all(playerIds.map(async (playerId) => worker.getPlayer(playerId) as Promise<PlayerDTO | null>));
      setPlayers(new Map(resolvedPlayers
        .filter((player): player is PlayerDTO => player != null)
        .map((player) => [player.id, player])));
    } catch (err) {
      logger.error('Failed to fetch trade negotiation detail:', err);
      setError('Trade negotiation unavailable');
    } finally {
      setLoading(false);
    }
  }, [isInitialized, negotiationId, worker]);

  useEffect(() => {
    void fetchNegotiation();
  }, [fetchNegotiation, day, season, phase]);

  const statusLabels = useMemo(() => {
    if (!negotiation) return [];
    if (negotiation.isComplete) return ['Closed'];
    return [
      negotiation.canAccept ? 'Accept available' : null,
      negotiation.canCounter ? 'Counter available' : null,
      negotiation.canReject ? 'Reject available' : null,
    ].filter((label): label is string => label != null);
  }, [negotiation]);

  if (!loading && (error || !negotiation)) {
    return (
      <PageShell>
        <div className="space-y-6">
          <Link
            to="/trade-negotiations"
            className="inline-flex items-center gap-1.5 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Link>

          <EmptyStatePanel
            icon={error ? AlertTriangle : Handshake}
            title={error ?? 'Trade negotiation not found'}
            description={error
              ? 'The worker did not return this trade negotiation. Try again after the simulation worker is ready.'
              : 'This negotiation is unavailable in the current save or has already been removed.'}
            actionLabel={error ? 'Retry' : 'Back to Inbox'}
            actionHref={error ? undefined : '/trade-negotiations'}
            onAction={error ? () => void fetchNegotiation() : undefined}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell loading={loading || negotiation == null} skeleton={<TradeNegotiationDetailSkeleton />}>
      {negotiation ? (
        <div className="space-y-6">
          <Link
            to="/trade-negotiations"
            className="inline-flex items-center gap-1.5 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Link>

          <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Trade Negotiation
                </div>
                <h1 className="mt-2 font-brand text-4xl tracking-wide text-dynasty-textBright">
                  {negotiation.teamName}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-data text-[10px] uppercase tracking-[0.16em]">
                    {negotiation.teamAbbreviation}
                  </Badge>
                  <Badge variant={negotiation.isComplete ? 'outline' : 'info'} className="font-data text-[10px] uppercase tracking-[0.16em]">
                    {phaseLabel(negotiation.phase)}
                  </Badge>
                  <Badge variant="outline" className="font-data text-[10px] uppercase tracking-[0.16em]">
                    Round {Math.max(1, negotiation.roundsCompleted)}
                  </Badge>
                  <Badge variant="outline" className="font-data text-[10px] uppercase tracking-[0.16em]">
                    Expires Day {negotiation.expiresAtDay}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-2 lg:min-w-[18rem] lg:text-right">
                <div className="font-heading text-sm text-dynasty-textBright">
                  {negotiation.isComplete ? 'This negotiation is closed.' : 'This negotiation is active.'}
                </div>
                <div className="flex flex-wrap gap-1.5 lg:justify-end">
                  {statusLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded border border-accent-primary/40 bg-accent-primary/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-accent-primary"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <TradePackagePanel title="Proposal" tradePackage={negotiation.proposal} players={players} />
            <TradePackagePanel
              title="Counter-Offer"
              tradePackage={negotiation.counterOffer}
              players={players}
              emptyLabel="Awaiting counter"
            />
          </div>

          <DialogueThread negotiation={negotiation} />

          <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            {negotiation.isComplete ? (
              <div className="font-heading text-sm text-dynasty-muted">This negotiation is closed.</div>
            ) : (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Action Area</h2>
                  <p className="mt-1 font-heading text-xs text-dynasty-muted">
                    The Inbox stays read-only. Use the Trade Builder to accept, counter, or reject.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/trade?negotiationId=${negotiation.id}`}
                    className="focus-ring inline-flex items-center gap-2 rounded-md border border-accent-primary/40 bg-accent-primary/10 px-3 py-2 font-heading text-xs text-accent-primary transition-colors hover:bg-accent-primary/20"
                  >
                    Open in Trade Builder
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  {(['Accept', 'Counter', 'Reject'] as const).map((label) => (
                    <button
                      key={label}
                      type="button"
                      disabled
                      title="Use the Trade Builder to act on this negotiation."
                      className="cursor-not-allowed rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs text-dynasty-muted opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}
