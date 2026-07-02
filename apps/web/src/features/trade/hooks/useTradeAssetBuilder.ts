import { useCallback, useMemo, useState } from 'react';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { DraftPickAsset, TradeAssetFilter } from '../components/TradeAssetSelectionGrid';
import type { TradeResultView } from '../components/TradeResultBanner';
import {
  playerMatchesAssetFilter,
  toggleDraftPickAsset,
  tradeAssetsFromSelection,
  type TradeBuilderSelection,
} from '../lib/tradeBuilderTransforms';

export interface UseTradeAssetBuilderOptions {
  yourRoster: PlayerDTO[];
  targetRoster: PlayerDTO[];
  onTradeResultChange: (result: TradeResultView | null) => void;
}

export interface UseTradeAssetBuilderResult {
  offering: string[];
  requesting: string[];
  offeringPicks: DraftPickAsset[];
  requestingPicks: DraftPickAsset[];
  offeringIFAAmount: string;
  requestingIFAAmount: string;
  yourAssetFilter: TradeAssetFilter;
  targetAssetFilter: TradeAssetFilter;
  filteredYourRoster: PlayerDTO[];
  filteredTargetRoster: PlayerDTO[];
  offeringAssets: ReturnType<typeof tradeAssetsFromSelection>;
  requestingAssets: ReturnType<typeof tradeAssetsFromSelection>;
  addOfferingPlayer: (playerId: string) => void;
  applyTradeBuilderSelection: (selection: TradeBuilderSelection) => void;
  resetTradeAssets: () => void;
  setOfferingIFAAmount: (amount: string) => void;
  setRequestingIFAAmount: (amount: string) => void;
  setTargetAssetFilter: (filter: TradeAssetFilter) => void;
  setYourAssetFilter: (filter: TradeAssetFilter) => void;
  toggleOffer: (playerId: string) => void;
  toggleOfferingPick: (asset: DraftPickAsset) => void;
  toggleRequest: (playerId: string) => void;
  toggleRequestingPick: (asset: DraftPickAsset) => void;
}

export function useTradeAssetBuilder({
  yourRoster,
  targetRoster,
  onTradeResultChange,
}: UseTradeAssetBuilderOptions): UseTradeAssetBuilderResult {
  const [offering, setOffering] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<string[]>([]);
  const [offeringPicks, setOfferingPicks] = useState<DraftPickAsset[]>([]);
  const [requestingPicks, setRequestingPicks] = useState<DraftPickAsset[]>([]);
  const [offeringIFAAmount, setOfferingIFAAmountState] = useState('');
  const [requestingIFAAmount, setRequestingIFAAmountState] = useState('');
  const [yourAssetFilter, setYourAssetFilter] = useState<TradeAssetFilter>('all');
  const [targetAssetFilter, setTargetAssetFilter] = useState<TradeAssetFilter>('all');

  const clearTradeResult = useCallback(() => {
    onTradeResultChange(null);
  }, [onTradeResultChange]);

  const addOfferingPlayer = useCallback((playerId: string) => {
    setOffering((current) => (
      current.includes(playerId) ? current : [playerId, ...current]
    ));
  }, []);

  const toggleOffer = useCallback((playerId: string) => {
    clearTradeResult();
    setOffering((current) => (
      current.includes(playerId)
        ? current.filter((item) => item !== playerId)
        : [...current, playerId]
    ));
  }, [clearTradeResult]);

  const toggleRequest = useCallback((playerId: string) => {
    clearTradeResult();
    setRequesting((current) => (
      current.includes(playerId)
        ? current.filter((item) => item !== playerId)
        : [...current, playerId]
    ));
  }, [clearTradeResult]);

  const toggleOfferingPick = useCallback((asset: DraftPickAsset) => {
    clearTradeResult();
    setOfferingPicks((current) => toggleDraftPickAsset(current, asset));
  }, [clearTradeResult]);

  const toggleRequestingPick = useCallback((asset: DraftPickAsset) => {
    clearTradeResult();
    setRequestingPicks((current) => toggleDraftPickAsset(current, asset));
  }, [clearTradeResult]);

  const setOfferingIFAAmount = useCallback((amount: string) => {
    clearTradeResult();
    setOfferingIFAAmountState(amount);
  }, [clearTradeResult]);

  const setRequestingIFAAmount = useCallback((amount: string) => {
    clearTradeResult();
    setRequestingIFAAmountState(amount);
  }, [clearTradeResult]);

  const resetTradeAssets = useCallback(() => {
    setOffering([]);
    setRequesting([]);
    setOfferingPicks([]);
    setRequestingPicks([]);
    setOfferingIFAAmountState('');
    setRequestingIFAAmountState('');
  }, []);

  const applyTradeBuilderSelection = useCallback((selection: TradeBuilderSelection) => {
    setOffering(selection.offeringPlayerIds);
    setRequesting(selection.requestingPlayerIds);
    setOfferingPicks(selection.offeringDraftPicks);
    setRequestingPicks(selection.requestingDraftPicks);
    setOfferingIFAAmountState(selection.offeringIFAAmount);
    setRequestingIFAAmountState(selection.requestingIFAAmount);
  }, []);

  const filteredYourRoster = useMemo(
    () => yourRoster.filter((player) => playerMatchesAssetFilter(player, yourAssetFilter, offering)),
    [offering, yourAssetFilter, yourRoster],
  );
  const filteredTargetRoster = useMemo(
    () => targetRoster.filter((player) => playerMatchesAssetFilter(player, targetAssetFilter, requesting)),
    [requesting, targetAssetFilter, targetRoster],
  );
  const offeringAssets = useMemo(
    () => tradeAssetsFromSelection(offering, offeringPicks, offeringIFAAmount),
    [offering, offeringIFAAmount, offeringPicks],
  );
  const requestingAssets = useMemo(
    () => tradeAssetsFromSelection(requesting, requestingPicks, requestingIFAAmount),
    [requesting, requestingIFAAmount, requestingPicks],
  );

  return {
    offering,
    requesting,
    offeringPicks,
    requestingPicks,
    offeringIFAAmount,
    requestingIFAAmount,
    yourAssetFilter,
    targetAssetFilter,
    filteredYourRoster,
    filteredTargetRoster,
    offeringAssets,
    requestingAssets,
    addOfferingPlayer,
    applyTradeBuilderSelection,
    resetTradeAssets,
    setOfferingIFAAmount,
    setRequestingIFAAmount,
    setTargetAssetFilter,
    setYourAssetFilter,
    toggleOffer,
    toggleOfferingPick,
    toggleRequest,
    toggleRequestingPick,
  };
}
