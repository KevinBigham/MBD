import type { TradeAsset } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  TradeOfferView,
  TradePlayerFinancialProjectionView,
} from '@/workers/sim.worker.trade';

export interface TradeDialogueView {
  mode: 'buyer' | 'seller' | 'standing_pat';
  urgency: 'low' | 'medium' | 'high';
  headline: string;
  lines: string[];
}

export interface HotTradeOfferView extends TradeOfferView {
  urgencyTag: 'ACTIVE' | 'EXPIRING SOON' | 'FINAL OFFER';
  bidderCount: number;
  biddingSummary: string | null;
  dialogue: TradeDialogueView;
}

export function fairnessText(score: number, fromTeam: string, toTeam: string): string {
  if (Math.abs(score) <= 10) return 'Balanced';
  return score > 0 ? `Favored ${fromTeam}` : `Favored ${toTeam}`;
}

export function modeBadgeClass(mode: TradeDialogueView['mode']): string {
  switch (mode) {
    case 'buyer':
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
    case 'seller':
      return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

export function modeLabel(mode: TradeDialogueView['mode']): string {
  switch (mode) {
    case 'buyer':
      return 'Buyer';
    case 'seller':
      return 'Seller';
    default:
      return 'Standing Pat';
  }
}

export function dialogueUrgencyClass(urgency: TradeDialogueView['urgency']): string {
  switch (urgency) {
    case 'high':
      return 'border-accent-danger/30 bg-accent-danger/10';
    case 'medium':
      return 'border-accent-warning/30 bg-accent-warning/10';
    default:
      return 'border-dynasty-border bg-dynasty-elevated';
  }
}

export function buildTradeAssetLabel(
  asset: TradeAsset,
  resolvePlayer: (playerId: string) => PlayerDTO | undefined,
  resolveFinancialProjection: (playerId: string) => TradePlayerFinancialProjectionView | undefined = () => undefined,
  acquiringTeamId = '',
): string {
  switch (asset.type) {
    case 'player': {
      const player = resolvePlayer(asset.playerId);
      if (!player) {
        return asset.playerId;
      }
      const base = `${player.firstName[0]}. ${player.lastName} · ${player.position}`;
      const projection = resolveFinancialProjection(asset.playerId);
      const existingRetained = projection?.existingRetainedSalary ?? 0;
      const existingCash = projection?.existingCashConsideration ?? 0;
      if (!asset.retainedSalary && !asset.cashConsideration && existingRetained + existingCash <= 0) return base;
      const gross = player.contract.annualSalary;
      const retained = asset.retainedSalary?.annualAmount ?? 0;
      const cash = asset.cashConsideration?.amount ?? 0;
      const externalSupport = (offsets: TradePlayerFinancialProjectionView['currentPayerOffsets']) => offsets
        .filter((offset) => offset.teamId !== acquiringTeamId)
        .reduce((sum, offset) => sum + offset.total, 0);
      const currentResponsibility = Math.max(
        0,
        gross - externalSupport(projection?.currentPayerOffsets ?? []) - retained - cash,
      );
      const futureResponsibility = projection?.guaranteedFutureSeason == null
        ? null
        : Math.max(
          0,
          gross - externalSupport(projection.guaranteedFuturePayerOffsets) - retained,
        );
      const terms = [
        `$${gross.toFixed(2)}M gross`,
        existingRetained + existingCash > 0
          ? `$${(existingRetained + existingCash).toFixed(2)}M prior support`
          : null,
        asset.retainedSalary ? `$${retained.toFixed(2)}M/yr retained` : null,
        asset.cashConsideration ? `$${cash.toFixed(2)}M cash now` : null,
        `$${currentResponsibility.toFixed(2)}M buyer now`,
        futureResponsibility !== null
          ? `$${futureResponsibility.toFixed(2)}M buyer S${projection!.guaranteedFutureSeason}`
          : null,
        projection?.optionSeason !== null && projection?.optionSeason !== undefined
          ? `$${gross.toFixed(2)}M option S${projection.optionSeason} uncovered`
          : null,
      ].filter(Boolean);
      return `${base} · ${terms.join(' · ')}`;
    }
    case 'draft_pick':
      return `R${asset.round} ${asset.season} · ${asset.originalTeamId.toUpperCase()} original`;
    case 'ifa_pool_space':
      return `IFA Pool · $${asset.amount.toFixed(2)}M`;
  }
}
