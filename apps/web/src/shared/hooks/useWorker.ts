import { useMemo, useSyncExternalStore, useCallback } from 'react';
import * as Comlink from 'comlink';
import type { TradeAsset } from '@mbd/contracts';
import type { WorkerApi } from '@/workers/sim.worker';

// ---------------------------------------------------------------------------
// Singleton worker — shared across all components
// ---------------------------------------------------------------------------

let singletonApi: Comlink.Remote<WorkerApi> | null = null;
let singletonWorker: Worker | null = null;
let ready = false;
const listeners = new Set<() => void>();
const flowListeners = new Set<() => void>();

function notifyListeners() {
  for (const l of listeners) l();
}

function notifyFlowListeners() {
  for (const listener of flowListeners) listener();
}

function getOrCreateWorker(): Comlink.Remote<WorkerApi> {
  if (singletonApi) return singletonApi;

  singletonWorker = new Worker(
    new URL('../../workers/sim.worker.ts', import.meta.url),
    { type: 'module' },
  );
  singletonApi = Comlink.wrap<WorkerApi>(singletonWorker);

  singletonApi
    .ping()
    .then(() => {
      ready = true;
      notifyListeners();
    })
    .catch((err: unknown) => {
      console.error('Worker ping failed:', err);
    });

  return singletonApi;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function subscribeToFlowUpdates(cb: () => void) {
  flowListeners.add(cb);
  return () => {
    flowListeners.delete(cb);
  };
}

function getSnapshot() {
  return ready;
}

function isFlowAwareResult(value: unknown): value is { flowStateChanged?: boolean } {
  return typeof value === 'object' && value !== null && 'flowStateChanged' in value;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorker() {
  const api = useMemo(() => getOrCreateWorker(), []);
  const isReady = useSyncExternalStore(subscribe, getSnapshot);
  type ScoutIFAResult = Awaited<ReturnType<WorkerApi['scoutIFAPlayer']>>;
  type SignIFAResult = Awaited<ReturnType<WorkerApi['signIFAPlayer']>>;
  type TradeIFAPoolResult = Awaited<ReturnType<WorkerApi['tradeIFAPoolSpace']>>;

  const runMutation = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      const result = await operation();
      if (isFlowAwareResult(result) && result.flowStateChanged) {
        notifyFlowListeners();
      }
      return result;
    },
    [],
  );

  const ping = useCallback(async () => api.ping(), [api]);

  const newGame = useCallback(
    async (seed: number, userTeamId?: string) => runMutation(() => api.newGame(seed, userTeamId)),
    [api, runMutation],
  );

  const simDay = useCallback(async () => runMutation(() => api.simDay()), [api, runMutation]);
  const simWeek = useCallback(async () => runMutation(() => api.simWeek()), [api, runMutation]);
  const simMonth = useCallback(async () => runMutation(() => api.simMonth()), [api, runMutation]);
  const simToPlayoffs = useCallback(async () => runMutation(() => api.simToPlayoffs()), [api, runMutation]);
  const simPlayoffGame = useCallback(async () => runMutation(() => api.simPlayoffGame()), [api, runMutation]);
  const simPlayoffSeries = useCallback(async () => runMutation(() => api.simPlayoffSeries()), [api, runMutation]);
  const simPlayoffRound = useCallback(async () => runMutation(() => api.simPlayoffRound()), [api, runMutation]);
  const simRemainingPlayoffs = useCallback(async () => runMutation(() => api.simRemainingPlayoffs()), [api, runMutation]);
  const getState = useCallback(async () => api.getState(), [api]);
  const exportSnapshot = useCallback(async () => api.exportSnapshot(), [api]);
  const importSnapshot = useCallback(
    async (snapshot: unknown) => runMutation(() => api.importSnapshot(snapshot)),
    [api, runMutation],
  );

  const getStandings = useCallback(async () => api.getStandings(), [api]);

  const getTeamRoster = useCallback(
    async (teamId: string) => api.getTeamRoster(teamId),
    [api],
  );

  const getFullRoster = useCallback(
    async (teamId: string) => api.getFullRoster(teamId),
    [api],
  );

  const getPlayer = useCallback(
    async (playerId: string) => api.getPlayer(playerId),
    [api],
  );

  const getLeagueLeaders = useCallback(
    async (stat: string, limit?: number) => api.getLeagueLeaders(stat, limit),
    [api],
  );

  const getPlayoffBracket = useCallback(async () => api.getPlayoffBracket(), [api]);
  const getHallOfFame = useCallback(async () => api.getHallOfFame(), [api]);
  const getFranchiseTimeline = useCallback(async () => api.getFranchiseTimeline(), [api]);
  const getDynastyScore = useCallback(async () => api.getDynastyScore(), [api]);
  const getDashboardSummary = useCallback(async () => api.getDashboardSummary(), [api]);
  const getSeasonFlowState = useCallback(async () => api.getSeasonFlowState(), [api]);
  const getScoutingStaff = useCallback(async () => api.getScoutingStaff(), [api]);
  const scoutPlayerReport = useCallback(
    async (playerId: string) => api.scoutPlayerReport(playerId),
    [api],
  );
  const getIFAPool = useCallback(async () => api.getIFAPool(), [api]);
  const scoutIFAPlayer = useCallback(
    async (playerId: string): Promise<ScoutIFAResult> => {
      const result = await api.scoutIFAPlayer(playerId);
      return result as ScoutIFAResult;
    },
    [api],
  );
  const signIFAPlayer = useCallback(
    async (
      playerId: string,
      bonusAmount: number,
    ): Promise<SignIFAResult> => {
      const result = await api.signIFAPlayer(playerId, bonusAmount);
      if (isFlowAwareResult(result) && result.flowStateChanged) {
        notifyFlowListeners();
      }
      return result as SignIFAResult;
    },
    [api],
  );
  const tradeIFAPoolSpace = useCallback(
    async (
      toTeamId: string,
      amount: number,
    ): Promise<TradeIFAPoolResult> => {
      const result = await api.tradeIFAPoolSpace(toTeamId, amount);
      if (isFlowAwareResult(result) && result.flowStateChanged) {
        notifyFlowListeners();
      }
      return result as TradeIFAPoolResult;
    },
    [api],
  );
  const getDraftClass = useCallback(async () => api.getDraftClass(), [api]);
  const startDraft = useCallback(async () => runMutation(() => api.startDraft()), [api, runMutation]);
  const makeDraftPick = useCallback(
    async (prospectId: string) => runMutation(() => api.makeDraftPick(prospectId)),
    [api, runMutation],
  );
  const scoutDraftPlayer = useCallback(
    async (prospectId: string) => {
      const result = await api.scoutDraftPlayer(prospectId);
      if (isFlowAwareResult(result) && result.flowStateChanged) {
        notifyFlowListeners();
      }
      return result;
    },
    [api],
  );
  const toggleDraftBigBoard = useCallback(
    async (prospectId: string) => {
      const result = await api.toggleDraftBigBoard(prospectId);
      if (isFlowAwareResult(result) && result.flowStateChanged) {
        notifyFlowListeners();
      }
      return result;
    },
    [api],
  );
  const signDraftPick = useCallback(
    async (playerId: string, bonusAmount: number) => {
      const result = await api.signDraftPick(playerId, bonusAmount);
      if (isFlowAwareResult(result) && result.flowStateChanged) {
        notifyFlowListeners();
      }
      return result;
    },
    [api],
  );
  const simulateRemainingDraft = useCallback(
    async () => runMutation(() => api.simulateRemainingDraft()),
    [api, runMutation],
  );
  const getTradeOffers = useCallback(async () => api.getTradeOffers(), [api]);
  const getTradeHistory = useCallback(async () => api.getTradeHistory(), [api]);
  const getTradeAssetInventory = useCallback(async (teamId: string) => api.getTradeAssetInventory(teamId), [api]);
  const proposeTrade = useCallback(
    async (offeringAssets: TradeAsset[], requestingAssets: TradeAsset[], toTeamId: string) =>
      api.proposeTrade(offeringAssets, requestingAssets, toTeamId),
    [api],
  );
  const respondToTradeOffer = useCallback(
    async (
      offerId: string,
      action: 'accept' | 'decline' | 'counter',
      counterPackage?: { offeringAssets: TradeAsset[]; requestingAssets: TradeAsset[] },
    ) => api.respondToTradeOffer(offerId, action, counterPackage),
    [api],
  );
  const getNews = useCallback(async (limit?: number) => api.getNews(limit), [api]);
  const markNewsRead = useCallback(async (newsId: string) => api.markNewsRead(newsId), [api]);
  const promotePlayer = useCallback(
    async (playerId: string) => runMutation(() => api.promotePlayer(playerId)),
    [api, runMutation],
  );
  const demotePlayer = useCallback(
    async (playerId: string) => runMutation(() => api.demotePlayer(playerId)),
    [api, runMutation],
  );
  const designateForAssignment = useCallback(
    async (playerId: string) => runMutation(() => api.designateForAssignment(playerId)),
    [api, runMutation],
  );
  const claimOffWaivers = useCallback(
    async (playerId: string) => runMutation(() => api.claimOffWaivers(playerId)),
    [api, runMutation],
  );
  const getPromotionCandidates = useCallback(
    async (teamId?: string) => api.getPromotionCandidates(teamId),
    [api],
  );
  const getRosterComplianceIssues = useCallback(
    async (teamId?: string) => api.getRosterComplianceIssues(teamId),
    [api],
  );
  const getAffiliateOverview = useCallback(
    async (teamId?: string) => api.getAffiliateOverview(teamId),
    [api],
  );
  const getAffiliateBoxScore = useCallback(
    async (boxScoreId: string) => api.getAffiliateBoxScore(boxScoreId),
    [api],
  );
  const proceedToOffseason = useCallback(async () => runMutation(() => api.proceedToOffseason()), [api, runMutation]);
  const startNextSeason = useCallback(async () => runMutation(() => api.startNextSeason()), [api, runMutation]);
  const getBriefing = useCallback(async (limit?: number) => api.getBriefing(limit), [api]);
  const getPressRoomFeed = useCallback(
    async (limit?: number) => api.getPressRoomFeed(limit),
    [api],
  );
  const getTeamChemistry = useCallback(
    async (teamId?: string) => api.getTeamChemistry(teamId),
    [api],
  );
  const getOwnerState = useCallback(
    async (teamId?: string) => api.getOwnerState(teamId),
    [api],
  );
  const getPersonalityProfile = useCallback(
    async (playerId: string) => api.getPersonalityProfile(playerId),
    [api],
  );
  const getAwardRaces = useCallback(async () => api.getAwardRaces(), [api]);
  const getRivalries = useCallback(
    async (teamId?: string) => api.getRivalries(teamId),
    [api],
  );
  const getAwardHistory = useCallback(async () => api.getAwardHistory(), [api]);
  const getSeasonHistory = useCallback(async () => api.getSeasonHistory(), [api]);
  const resolveHistoryDisplayNames = useCallback(
    async (playerIds: string[], teamIds: string[]) => api.resolveHistoryDisplayNames(playerIds, teamIds),
    [api],
  );

  const searchPlayers = useCallback(
    async (query: string, limit?: number) => api.searchPlayers(query, limit),
    [api],
  );

  const advanceOffseason = useCallback(async () => runMutation(() => api.advanceOffseason()), [api, runMutation]);
  const skipOffseasonPhase = useCallback(async () => runMutation(() => api.skipOffseasonPhase()), [api, runMutation]);
  const getOffseasonState = useCallback(async () => api.getOffseasonState(), [api]);
  const toggleRule5Protection = useCallback(
    async (playerId: string) => runMutation(() => api.toggleRule5Protection(playerId)),
    [api, runMutation],
  );
  const lockRule5Protection = useCallback(
    async () => runMutation(() => api.lockRule5Protection()),
    [api, runMutation],
  );
  const makeRule5Pick = useCallback(
    async (playerId: string) => runMutation(() => api.makeRule5Pick(playerId)),
    [api, runMutation],
  );
  const passRule5Pick = useCallback(
    async () => runMutation(() => api.passRule5Pick()),
    [api, runMutation],
  );
  const resolveRule5OfferBack = useCallback(
    async (playerId: string, acceptReturn: boolean) =>
      runMutation(() => api.resolveRule5OfferBack(playerId, acceptReturn)),
    [api, runMutation],
  );

  return {
    ping, newGame, simDay, simWeek, simMonth, simToPlayoffs,
    simPlayoffGame, simPlayoffSeries, simPlayoffRound, simRemainingPlayoffs,
    getState,
    exportSnapshot, importSnapshot,
    getStandings, getTeamRoster, getFullRoster, getPlayer,
    getLeagueLeaders, getPlayoffBracket, getHallOfFame, getFranchiseTimeline, getDynastyScore, getDashboardSummary, getSeasonFlowState,
    getScoutingStaff, scoutPlayerReport, getIFAPool, scoutIFAPlayer, signIFAPlayer, tradeIFAPoolSpace,
    getDraftClass, startDraft, makeDraftPick, scoutDraftPlayer, toggleDraftBigBoard, signDraftPick, simulateRemainingDraft,
    getTradeOffers, getTradeHistory, getTradeAssetInventory, proposeTrade, respondToTradeOffer,
    getNews, markNewsRead, promotePlayer, demotePlayer, designateForAssignment, claimOffWaivers,
    getPromotionCandidates, getRosterComplianceIssues, getAffiliateOverview, getAffiliateBoxScore,
    proceedToOffseason, startNextSeason,
    getBriefing, getPressRoomFeed, getTeamChemistry, getOwnerState,
    getPersonalityProfile, getAwardRaces, getRivalries,
    getAwardHistory, getSeasonHistory, resolveHistoryDisplayNames,
    searchPlayers, advanceOffseason, skipOffseasonPhase, getOffseasonState,
    toggleRule5Protection, lockRule5Protection, makeRule5Pick, passRule5Pick, resolveRule5OfferBack,
    subscribeToFlowUpdates,
    isReady,
  };
}
