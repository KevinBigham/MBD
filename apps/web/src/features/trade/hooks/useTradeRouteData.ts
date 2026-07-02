import { useCallback, useEffect, useState } from 'react';
import type { HotTradeOfferView } from '../components/TradeActivityColumn';
import type { RelationshipView } from '../components/TradeBuilderContextPanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  TradeAssetInventoryView,
  TradeDeadlineStateView,
  TradeHistoryView,
  TradeNegotiationView,
} from '@/workers/sim.worker.trade';

const EMPTY_TRADE_ASSET_INVENTORY: TradeAssetInventoryView = {
  draftPicks: [],
  ifaRemaining: 0,
};

interface UseTradeRouteDataOptions {
  day: number;
  getOpenNegotiations: () => Promise<unknown>;
  getRelationships: () => Promise<unknown>;
  getSeasonFlowState?: () => Promise<unknown>;
  getTeamRoster: (teamId: string) => Promise<unknown>;
  getTradeAssetInventory: (teamId: string) => Promise<unknown>;
  getTradeDeadlineState: () => Promise<unknown>;
  getTradeHistory: () => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  season: number;
  selectedTeam: string;
  userTeamId: string;
  workerReady: boolean;
}

interface UseTradeRouteDataResult {
  deadlineState: TradeDeadlineStateView | null;
  incomingOffers: HotTradeOfferView[];
  loadOpenNegotiations: () => Promise<void>;
  loadRelationshipData: () => Promise<void>;
  loadTargetInventory: () => Promise<void>;
  loadTargetRoster: () => Promise<void>;
  loadTradeActivity: () => Promise<void>;
  loadUserInventory: () => Promise<void>;
  loadUserRoster: () => Promise<void>;
  loading: boolean;
  openNegotiations: TradeNegotiationView[];
  openNegotiationsLoading: boolean;
  relationships: RelationshipView[];
  seasonFlowStatus: string | null;
  targetInventory: TradeAssetInventoryView;
  targetRoster: PlayerDTO[];
  tradeHistory: TradeHistoryView[];
  yourInventory: TradeAssetInventoryView;
  yourRoster: PlayerDTO[];
}

export function useTradeRouteData({
  day,
  getOpenNegotiations,
  getRelationships,
  getSeasonFlowState,
  getTeamRoster,
  getTradeAssetInventory,
  getTradeDeadlineState,
  getTradeHistory,
  isInitialized,
  phase,
  season,
  selectedTeam,
  userTeamId,
  workerReady,
}: UseTradeRouteDataOptions): UseTradeRouteDataResult {
  const [yourRoster, setYourRoster] = useState<PlayerDTO[]>([]);
  const [targetRoster, setTargetRoster] = useState<PlayerDTO[]>([]);
  const [yourInventory, setYourInventory] = useState<TradeAssetInventoryView>(EMPTY_TRADE_ASSET_INVENTORY);
  const [targetInventory, setTargetInventory] = useState<TradeAssetInventoryView>(EMPTY_TRADE_ASSET_INVENTORY);
  const [incomingOffers, setIncomingOffers] = useState<HotTradeOfferView[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryView[]>([]);
  const [openNegotiations, setOpenNegotiations] = useState<TradeNegotiationView[]>([]);
  const [openNegotiationsLoading, setOpenNegotiationsLoading] = useState(false);
  const [deadlineState, setDeadlineState] = useState<TradeDeadlineStateView | null>(null);
  const [seasonFlowStatus, setSeasonFlowStatus] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<RelationshipView[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserRoster = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getTeamRoster(userTeamId);
    setYourRoster((data as PlayerDTO[]) ?? []);
  }, [getTeamRoster, isInitialized, userTeamId, workerReady]);

  const loadUserInventory = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getTradeAssetInventory(userTeamId);
    setYourInventory((data as TradeAssetInventoryView) ?? EMPTY_TRADE_ASSET_INVENTORY);
  }, [getTradeAssetInventory, isInitialized, userTeamId, workerReady]);

  const loadTargetRoster = useCallback(async () => {
    if (!selectedTeam || !isInitialized || !workerReady) {
      setTargetRoster([]);
      return;
    }
    const data = await getTeamRoster(selectedTeam);
    setTargetRoster((data as PlayerDTO[]) ?? []);
  }, [getTeamRoster, isInitialized, selectedTeam, workerReady]);

  const loadTargetInventory = useCallback(async () => {
    if (!selectedTeam || !isInitialized || !workerReady) {
      setTargetInventory(EMPTY_TRADE_ASSET_INVENTORY);
      return;
    }
    const data = await getTradeAssetInventory(selectedTeam);
    setTargetInventory((data as TradeAssetInventoryView) ?? EMPTY_TRADE_ASSET_INVENTORY);
  }, [getTradeAssetInventory, isInitialized, selectedTeam, workerReady]);

  const loadTradeActivity = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    try {
      const [history, deadline, flow] = await Promise.all([
        getTradeHistory(),
        getTradeDeadlineState(),
        getSeasonFlowState?.() ?? Promise.resolve(null),
      ]);
      setTradeHistory((history as TradeHistoryView[]) ?? []);
      setDeadlineState((deadline as TradeDeadlineStateView) ?? null);
      setSeasonFlowStatus((flow as { status?: string } | null)?.status ?? null);
      setIncomingOffers(((deadline as TradeDeadlineStateView | null)?.hotOffers ?? []) as HotTradeOfferView[]);
    } finally {
      setLoading(false);
    }
  }, [getSeasonFlowState, getTradeDeadlineState, getTradeHistory, isInitialized, workerReady]);

  const loadRelationshipData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getRelationships();
    setRelationships((data as RelationshipView[]) ?? []);
  }, [getRelationships, isInitialized, workerReady]);

  const loadOpenNegotiations = useCallback(async () => {
    if (!isInitialized || !workerReady) {
      setOpenNegotiations([]);
      return;
    }
    setOpenNegotiationsLoading(true);
    try {
      const data = await getOpenNegotiations();
      setOpenNegotiations((data as TradeNegotiationView[]) ?? []);
    } finally {
      setOpenNegotiationsLoading(false);
    }
  }, [getOpenNegotiations, isInitialized, workerReady]);

  useEffect(() => {
    void loadUserRoster();
  }, [loadUserRoster, day, season, phase]);

  useEffect(() => {
    void loadUserInventory();
  }, [loadUserInventory, day, season, phase]);

  useEffect(() => {
    void loadTargetRoster();
  }, [loadTargetRoster, day, season, phase]);

  useEffect(() => {
    void loadTargetInventory();
  }, [loadTargetInventory, day, season, phase]);

  useEffect(() => {
    void loadTradeActivity();
  }, [loadTradeActivity, day, season, phase]);

  useEffect(() => {
    void loadRelationshipData();
  }, [loadRelationshipData, day, season, phase]);

  useEffect(() => {
    void loadOpenNegotiations();
  }, [loadOpenNegotiations, day, season, phase]);

  return {
    deadlineState,
    incomingOffers,
    loadOpenNegotiations,
    loadRelationshipData,
    loadTargetInventory,
    loadTargetRoster,
    loadTradeActivity,
    loadUserInventory,
    loadUserRoster,
    loading,
    openNegotiations,
    openNegotiationsLoading,
    relationships,
    seasonFlowStatus,
    targetInventory,
    targetRoster,
    tradeHistory,
    yourInventory,
    yourRoster,
  };
}
