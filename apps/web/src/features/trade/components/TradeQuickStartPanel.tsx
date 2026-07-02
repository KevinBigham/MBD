import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Search, Send } from 'lucide-react';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { RelationshipView } from './TradeBuilderContextPanel';
import type { TradePackageSummaryItem } from './TradePackageEvaluationCard';

export type TradeRouteMode = 'quick' | 'builder' | 'offers' | 'market' | 'history';

interface TeamOption {
  id: string;
  name: string;
  abbr: string;
}

interface TradeQuickStartPanelProps {
  disabledReason: string;
  filteredTargetRoster: PlayerDTO[];
  filteredYourRoster: PlayerDTO[];
  mode: TradeRouteMode;
  offerTotal: number;
  offering: string[];
  offeringSummary: TradePackageSummaryItem[];
  onSelectTeam: (teamId: string) => void;
  onSubmitTrade: () => void | Promise<void>;
  onToggleOfferingPlayer: (playerId: string) => void;
  onToggleRequestingPlayer: (playerId: string) => void;
  otherTeams: TeamOption[];
  packageFairness: { text: string; color: string };
  preselectedPlayerId: string | null;
  proposing: boolean;
  requestTotal: number;
  requesting: string[];
  requestingSummary: TradePackageSummaryItem[];
  selectedTeam: string;
  tradeMarketOpen: boolean;
}

const MODE_TABS: readonly { mode: TradeRouteMode; label: string; to: string }[] = [
  { mode: 'quick', label: 'Quick', to: '/trade?mode=quick' },
  { mode: 'builder', label: 'Builder', to: '/trade?mode=builder' },
  { mode: 'offers', label: 'Offers', to: '/trade?mode=offers' },
  { mode: 'market', label: 'Market', to: '/trade?mode=market' },
  { mode: 'history', label: 'History', to: '/trade?mode=history' },
];

function playerLabel(player: PlayerDTO): string {
  return `${player.firstName} ${player.lastName}`;
}

function playerMeta(player: PlayerDTO): string {
  return `${player.position} · ${player.displayRating ?? player.overallRating} OVR · ${player.age}`;
}

function relationshipLabel(relationship: RelationshipView | null | undefined): string {
  if (!relationship) return 'Neutral room';
  return `${relationship.tier.charAt(0).toUpperCase()}${relationship.tier.slice(1)} room`;
}

function ChecklistItem({ complete, label, detail }: { complete: boolean; label: string; detail: string }) {
  const Icon = complete ? CheckCircle2 : Circle;
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className={complete ? 'h-4 w-4 text-accent-success' : 'h-4 w-4 text-dynasty-muted'} />
        <span className="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-muted">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate font-heading text-sm text-dynasty-textBright">{detail}</p>
    </div>
  );
}

export default function TradeQuickStartPanel({
  disabledReason,
  filteredTargetRoster,
  filteredYourRoster,
  mode,
  offerTotal,
  offering,
  offeringSummary,
  onSelectTeam,
  onSubmitTrade,
  onToggleOfferingPlayer,
  onToggleRequestingPlayer,
  otherTeams,
  packageFairness,
  preselectedPlayerId,
  proposing,
  requestTotal,
  requesting,
  requestingSummary,
  selectedTeam,
  tradeMarketOpen,
}: TradeQuickStartPanelProps) {
  const shoppedPlayer = preselectedPlayerId
    ? filteredYourRoster.find((player) => player.id === preselectedPlayerId) ?? null
    : null;
  const selectedTeamOption = otherTeams.find((team) => team.id === selectedTeam) ?? null;
  const partnerOptions = otherTeams
    .slice()
    .sort((left, right) =>
      Number(right.id === selectedTeam) - Number(left.id === selectedTeam)
      || left.abbr.localeCompare(right.abbr),
    )
    .slice(0, 6);
  const myAssetOptions = filteredYourRoster.slice(0, 6);
  const targetAssetOptions = selectedTeam ? filteredTargetRoster.slice(0, 6) : [];
  const hasPartner = Boolean(selectedTeam);
  const hasMyAsset = offering.length > 0;
  const hasTargetAsset = requesting.length > 0;
  const submitDisabled = !tradeMarketOpen || !hasPartner || !hasMyAsset || !hasTargetAsset || proposing;
  const submitTitle = !tradeMarketOpen
    ? disabledReason
    : !hasPartner
      ? 'Choose a partner before sending.'
      : !hasMyAsset
        ? 'Choose one of your assets before sending.'
        : !hasTargetAsset
          ? 'Choose one target asset before sending.'
          : 'Send this quick trade through the existing negotiation room.';

  return (
    <section className="rounded-lg border border-accent-primary/35 bg-dynasty-surface p-4" aria-label="Quick Trade">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">Quick Trade</h2>
            {shoppedPlayer ? (
              <span className="rounded border border-accent-primary/35 bg-accent-primary/10 px-2 py-1 font-data text-[11px] uppercase tracking-[0.16em] text-accent-primary">
                Shopping {playerLabel(shoppedPlayer)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-3xl font-heading text-sm text-dynasty-muted">
            Pick one partner, one asset from your club, and one target. The advanced builder below keeps every selection.
          </p>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Trade modes">
          {MODE_TABS.map((tab) => (
            <Link
              key={tab.mode}
              to={tab.to}
              className={[
                'rounded border px-2.5 py-1.5 font-heading text-xs transition-colors',
                mode === tab.mode
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-dynasty-border text-dynasty-muted hover:text-dynasty-text',
              ].join(' ')}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        <ChecklistItem complete={hasPartner} label="Partner" detail={selectedTeamOption?.abbr ?? 'Choose club'} />
        <ChecklistItem complete={hasMyAsset} label="My asset" detail={offeringSummary[0]?.label ?? 'Choose player'} />
        <ChecklistItem complete={hasTargetAsset} label="Target asset" detail={requestingSummary[0]?.label ?? 'Choose return'} />
        <ChecklistItem complete={hasMyAsset && hasTargetAsset} label="Fairness" detail={`${packageFairness.text} (${offerTotal.toFixed(0)} / ${requestTotal.toFixed(0)})`} />
        <ChecklistItem complete={!submitDisabled} label="Send" detail={submitDisabled ? 'Not ready' : 'Ready'} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-muted">
            <Search className="h-3.5 w-3.5" />
            Partner fit
          </div>
          <div className="grid gap-2">
            {partnerOptions.map((team) => (
              <button
                key={team.id}
                type="button"
                data-testid={`quick-trade-partner-${team.id}`}
                onClick={() => onSelectTeam(team.id)}
                className={[
                  'focus-ring rounded border px-3 py-2 text-left transition-colors',
                  selectedTeam === team.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-dynasty-border bg-dynasty-elevated hover:border-accent-primary/40',
                ].join(' ')}
              >
                <span className="font-heading text-sm text-dynasty-textBright">{team.abbr} · {team.name}</span>
                <span className="mt-1 block font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                  {relationshipLabel(undefined)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-muted">My asset</div>
          <div className="grid gap-2">
            {myAssetOptions.map((player) => (
              <button
                key={player.id}
                type="button"
                data-testid="quick-trade-my-asset"
                onClick={() => onToggleOfferingPlayer(player.id)}
                className={[
                  'focus-ring rounded border px-3 py-2 text-left transition-colors',
                  offering.includes(player.id)
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-dynasty-border bg-dynasty-elevated hover:border-accent-primary/40',
                ].join(' ')}
              >
                <span className="font-heading text-sm text-dynasty-textBright">{playerLabel(player)}</span>
                <span className="mt-1 block font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                  {playerMeta(player)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-muted">Target asset</div>
          <div className="grid gap-2">
            {targetAssetOptions.length === 0 ? (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                Choose a partner to load target assets.
              </div>
            ) : (
              targetAssetOptions.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  data-testid="quick-trade-target-asset"
                  onClick={() => onToggleRequestingPlayer(player.id)}
                  className={[
                    'focus-ring rounded border px-3 py-2 text-left transition-colors',
                    requesting.includes(player.id)
                      ? 'border-accent-info bg-accent-info/10'
                      : 'border-dynasty-border bg-dynasty-elevated hover:border-accent-info/40',
                  ].join(' ')}
                >
                  <span className="font-heading text-sm text-dynasty-textBright">{playerLabel(player)}</span>
                  <span className="mt-1 block font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    {playerMeta(player)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
        <div className="font-heading text-sm text-dynasty-muted">
          Fairness: <span className={packageFairness.color}>{packageFairness.text}</span>
        </div>
        <button
          type="button"
          onClick={() => void onSubmitTrade()}
          disabled={submitDisabled}
          title={submitTitle}
          className="mobile-critical-control inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          Send Quick Trade
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
