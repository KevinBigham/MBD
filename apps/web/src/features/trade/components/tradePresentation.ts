import type { TradeAsset } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeOfferView } from '@/workers/sim.worker.trade';

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
): string {
  switch (asset.type) {
    case 'player': {
      const player = resolvePlayer(asset.playerId);
      if (!player) {
        return asset.playerId;
      }
      return `${player.firstName[0]}. ${player.lastName} · ${player.position}`;
    }
    case 'draft_pick':
      return `R${asset.round} ${asset.season} · ${asset.originalTeamId.toUpperCase()} original`;
    case 'ifa_pool_space':
      return `IFA Pool · $${asset.amount.toFixed(2)}M`;
  }
}
