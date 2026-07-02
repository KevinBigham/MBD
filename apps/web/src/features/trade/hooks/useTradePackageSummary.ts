import type { TradeAsset } from '@mbd/contracts';
import { useCallback, useMemo } from 'react';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
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
  yourRoster: PlayerDTO[];
}

export interface UseTradePackageSummaryResult {
  playerById: (playerId: string) => PlayerDTO | undefined;
  offeringSummary: TradeAssetSummaryItem[];
  requestingSummary: TradeAssetSummaryItem[];
  offerTotal: number;
  requestTotal: number;
}

export function useTradePackageSummary({
  offeringAssets,
  requestingAssets,
  season,
  targetRoster,
  yourRoster,
}: UseTradePackageSummaryOptions): UseTradePackageSummaryResult {
  const playerById = useCallback(
    (id: string) => yourRoster.find((player) => player.id === id) ?? targetRoster.find((player) => player.id === id),
    [targetRoster, yourRoster],
  );

  const offeringSummary = useMemo(
    () => tradeAssetSummaryItems(offeringAssets, (asset) => buildTradeAssetLabel(asset, playerById)),
    [offeringAssets, playerById],
  );

  const requestingSummary = useMemo(
    () => tradeAssetSummaryItems(requestingAssets, (asset) => buildTradeAssetLabel(asset, playerById)),
    [playerById, requestingAssets],
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
    offeringSummary,
    requestingSummary,
    offerTotal,
    requestTotal,
  };
}
