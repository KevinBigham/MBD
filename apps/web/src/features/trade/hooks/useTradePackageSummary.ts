import type { TradeAsset } from '@mbd/contracts';
import { useCallback, useMemo } from 'react';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradePlayerFinancialProjectionView } from '@/workers/sim.worker.trade';
import { buildTradeAssetLabel } from '../components/tradePresentation';
import {
  tradeAssetSummaryItems,
  tradeAssetValue,
  type TradeAssetSummaryItem,
} from '../lib/tradeBuilderTransforms';

export interface UseTradePackageSummaryOptions {
  offeringAssets: readonly TradeAsset[];
  requestingAssets: readonly TradeAsset[];
  season: number;
  targetRoster: PlayerDTO[];
  targetFinancials?: Record<string, TradePlayerFinancialProjectionView>;
  targetTeamId?: string;
  yourRoster: PlayerDTO[];
  yourFinancials?: Record<string, TradePlayerFinancialProjectionView>;
  userTeamId?: string;
}

export interface UseTradePackageSummaryResult {
  playerById: (playerId: string) => PlayerDTO | undefined;
  financialProjectionByPlayerId: (playerId: string) => TradePlayerFinancialProjectionView | undefined;
  offeringSummary: TradeAssetSummaryItem[];
  requestingSummary: TradeAssetSummaryItem[];
  offerTotal: number;
  requestTotal: number;
}

export function useTradePackageSummary({
  offeringAssets,
  requestingAssets,
  season,
  targetFinancials = {},
  targetRoster,
  targetTeamId = '',
  userTeamId = '',
  yourFinancials = {},
  yourRoster,
}: UseTradePackageSummaryOptions): UseTradePackageSummaryResult {
  const playerById = useCallback(
    (id: string) => yourRoster.find((player) => player.id === id) ?? targetRoster.find((player) => player.id === id),
    [targetRoster, yourRoster],
  );
  const financialProjectionByPlayerId = useCallback(
    (id: string) => yourFinancials[id] ?? targetFinancials[id],
    [targetFinancials, yourFinancials],
  );

  const offeringSummary = useMemo(
    () => tradeAssetSummaryItems(offeringAssets, (asset) => buildTradeAssetLabel(
      asset,
      playerById,
      (playerId) => yourFinancials[playerId],
      targetTeamId,
    )),
    [offeringAssets, playerById, targetTeamId, yourFinancials],
  );

  const requestingSummary = useMemo(
    () => tradeAssetSummaryItems(requestingAssets, (asset) => buildTradeAssetLabel(
      asset,
      playerById,
      (playerId) => targetFinancials[playerId],
      userTeamId,
    )),
    [playerById, requestingAssets, targetFinancials, userTeamId],
  );

  const offerTotal = useMemo(
    () => offeringAssets.reduce(
      (sum, asset) => sum + tradeAssetValue(asset, season, playerById),
      0,
    ),
    [offeringAssets, playerById, season],
  );

  const requestTotal = useMemo(
    () => requestingAssets.reduce(
      (sum, asset) => sum + tradeAssetValue(asset, season, playerById),
      0,
    ),
    [playerById, requestingAssets, season],
  );

  return {
    playerById,
    financialProjectionByPlayerId,
    offeringSummary,
    requestingSummary,
    offerTotal,
    requestTotal,
  };
}
