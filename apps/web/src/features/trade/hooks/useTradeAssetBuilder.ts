import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { DraftPickAsset, TradeAssetFilter } from '../components/TradeAssetSelectionGrid';
import type { TradeResultView } from '../components/TradeResultBanner';
import {
  playerMatchesAssetFilter,
  toggleDraftPickAsset,
  tradeAssetsFromSelection,
  type TradeBuilderSelection,
  type TradeFinancialTermsByPlayerId,
  type TradeFinancialTermsInput,
} from '../lib/tradeBuilderTransforms';

export interface UseTradeAssetBuilderOptions {
  yourRoster: PlayerDTO[];
  targetRoster: PlayerDTO[];
  onTradeResultChange: (result: TradeResultView | null) => void;
  season?: number;
}

export interface UseTradeAssetBuilderResult {
  offering: string[];
  requesting: string[];
  offeringPicks: DraftPickAsset[];
  requestingPicks: DraftPickAsset[];
  offeringIFAAmount: string;
  requestingIFAAmount: string;
  offeringFinancialTerms: TradeFinancialTermsByPlayerId;
  requestingFinancialTerms: TradeFinancialTermsByPlayerId;
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
  setOfferingFinancialTerm: (playerId: string, field: keyof TradeFinancialTermsInput, value: string) => void;
  setRequestingIFAAmount: (amount: string) => void;
  setRequestingFinancialTerm: (playerId: string, field: keyof TradeFinancialTermsInput, value: string) => void;
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
  season = 1,
}: UseTradeAssetBuilderOptions): UseTradeAssetBuilderResult {
  const [offering, setOffering] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<string[]>([]);
  const [offeringPicks, setOfferingPicks] = useState<DraftPickAsset[]>([]);
  const [requestingPicks, setRequestingPicks] = useState<DraftPickAsset[]>([]);
  const [offeringIFAAmount, setOfferingIFAAmountState] = useState('');
  const [requestingIFAAmount, setRequestingIFAAmountState] = useState('');
  const [offeringFinancialTerms, setOfferingFinancialTerms] = useState<TradeFinancialTermsByPlayerId>({});
  const [requestingFinancialTerms, setRequestingFinancialTerms] = useState<TradeFinancialTermsByPlayerId>({});
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
    setOffering((current) => {
      if (!current.includes(playerId)) return [...current, playerId];
      setOfferingFinancialTerms((terms) => {
        const { [playerId]: _, ...remaining } = terms;
        return remaining;
      });
      return current.filter((item) => item !== playerId);
    });
  }, [clearTradeResult]);

  const toggleRequest = useCallback((playerId: string) => {
    clearTradeResult();
    setRequesting((current) => {
      if (!current.includes(playerId)) return [...current, playerId];
      setRequestingFinancialTerms((terms) => {
        const { [playerId]: _, ...remaining } = terms;
        return remaining;
      });
      return current.filter((item) => item !== playerId);
    });
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

  const updateFinancialTerm = useCallback((
    setter: Dispatch<SetStateAction<TradeFinancialTermsByPlayerId>>,
    playerId: string,
    field: keyof TradeFinancialTermsInput,
    value: string,
  ) => {
    clearTradeResult();
    setter((current) => ({
      ...current,
      [playerId]: {
        retainedSalary: current[playerId]?.retainedSalary ?? '',
        cashConsideration: current[playerId]?.cashConsideration ?? '',
        [field]: value,
      },
    }));
  }, [clearTradeResult]);

  const setOfferingFinancialTerm = useCallback((
    playerId: string,
    field: keyof TradeFinancialTermsInput,
    value: string,
  ) => {
    updateFinancialTerm(setOfferingFinancialTerms, playerId, field, value);
  }, [updateFinancialTerm]);

  const setRequestingFinancialTerm = useCallback((
    playerId: string,
    field: keyof TradeFinancialTermsInput,
    value: string,
  ) => {
    updateFinancialTerm(setRequestingFinancialTerms, playerId, field, value);
  }, [updateFinancialTerm]);

  const resetTradeAssets = useCallback(() => {
    setOffering([]);
    setRequesting([]);
    setOfferingPicks([]);
    setRequestingPicks([]);
    setOfferingIFAAmountState('');
    setRequestingIFAAmountState('');
    setOfferingFinancialTerms({});
    setRequestingFinancialTerms({});
  }, []);

  const applyTradeBuilderSelection = useCallback((selection: TradeBuilderSelection) => {
    setOffering(selection.offeringPlayerIds);
    setRequesting(selection.requestingPlayerIds);
    setOfferingPicks(selection.offeringDraftPicks);
    setRequestingPicks(selection.requestingDraftPicks);
    setOfferingIFAAmountState(selection.offeringIFAAmount);
    setRequestingIFAAmountState(selection.requestingIFAAmount);
    setOfferingFinancialTerms(selection.offeringFinancialTerms ?? {});
    setRequestingFinancialTerms(selection.requestingFinancialTerms ?? {});
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
    () => tradeAssetsFromSelection(
      offering,
      offeringPicks,
      offeringIFAAmount,
      offeringFinancialTerms,
      yourRoster,
      season,
    ),
    [offering, offeringFinancialTerms, offeringIFAAmount, offeringPicks, season, yourRoster],
  );
  const requestingAssets = useMemo(
    () => tradeAssetsFromSelection(
      requesting,
      requestingPicks,
      requestingIFAAmount,
      requestingFinancialTerms,
      targetRoster,
      season,
    ),
    [requesting, requestingFinancialTerms, requestingIFAAmount, requestingPicks, season, targetRoster],
  );

  return {
    offering,
    requesting,
    offeringPicks,
    requestingPicks,
    offeringIFAAmount,
    requestingIFAAmount,
    offeringFinancialTerms,
    requestingFinancialTerms,
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
    setOfferingFinancialTerm,
    setRequestingIFAAmount,
    setRequestingFinancialTerm,
    setTargetAssetFilter,
    setYourAssetFilter,
    toggleOffer,
    toggleOfferingPick,
    toggleRequest,
    toggleRequestingPick,
  };
}
