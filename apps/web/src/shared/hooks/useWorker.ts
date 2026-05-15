import { useMemo, useSyncExternalStore, useCallback } from 'react';
import * as Comlink from 'comlink';
import { toast } from 'sonner';
import type { PlayMode, TradeAsset } from '@mbd/contracts';
import type { LeaderboardStatKey } from '@mbd/sim-core';
import type { WorkerApi } from '@/workers/sim.worker';
import {
  SAVE_IO_BUDGET_MS,
  SIM_MONTH_BENCHMARK_MS,
  measureAsyncOperation,
} from '@/shared/lib/performance';
import { logger } from '@/shared/lib/logger';

type WorkerMethodName = keyof WorkerApi;
type WorkerMethodParameters<K extends WorkerMethodName> =
  WorkerApi[K] extends (...args: infer Args) => unknown ? Args : never;
type WorkerMethodReturn<K extends WorkerMethodName> =
  WorkerApi[K] extends (...args: never[]) => infer Result ? Awaited<Result> : never;
type WorkerProxy = {
  [K in WorkerMethodName]:
    (...args: WorkerMethodParameters<K>) => Promise<WorkerMethodReturn<K>>;
};

// ---------------------------------------------------------------------------
// Singleton worker — shared across all components
// ---------------------------------------------------------------------------

let singletonApi: Comlink.Remote<WorkerApi> | null = null;
let singletonWorker: Worker | null = null;
let ready = false;
let workerStatus: 'idle' | 'initializing' | 'ready' | 'error' | 'restarting' = 'idle';
const listeners = new Set<() => void>();
const flowListeners = new Set<() => void>();
const mutationMethods = new Set<WorkerMethodName>([
  'newGame',
  'simDay',
  'simWeek',
  'simMonth',
  'acknowledgeMonthlyReport',
  'dismissDecisionSpotlight',
  'dismissCeremonyMoment',
  'dismissWelcomeBriefing',
  'respondToPressConference',
  'applyForJob',
  'simToPlayoffs',
  'simPlayoffGame',
  'simPlayoffSeries',
  'simPlayoffRound',
  'simRemainingPlayoffs',
  'importSnapshot',
  'createWhatIfBranch',
  'deleteWhatIfBranch',
  'archiveOldSeasons',
  'pruneStaleData',
  'scoutPlayerReport',
  'scoutIFAPlayer',
  'signIFAPlayer',
  'tradeIFAPoolSpace',
  'startDraft',
  'makeDraftPick',
  'scoutDraftPlayer',
  'toggleDraftBigBoard',
  'signDraftPick',
  'simulateRemainingDraft',
  'proposeTrade',
  'startNegotiation',
  'advanceNegotiation',
  'resolveNegotiation',
  'executeMultiTeamTrade',
  'respondToTradeOffer',
  'markNewsRead',
  'promotePlayer',
  'demotePlayer',
  'designateForAssignment',
  'claimOffWaivers',
  'makeContractOffer',
  'negotiateExtension',
  'issueQualifyingOffer',
  'resolveQualifyingOffers',
  'hireCoach',
  'fireCoach',
  'proceedToOffseason',
  'startNextSeason',
  'advanceOffseason',
  'skipOffseasonPhase',
  'toggleRule5Protection',
  'lockRule5Protection',
  'makeRule5Pick',
  'passRule5Pick',
  'resolveRule5OfferBack',
  'completeOnboarding',
  'applyStaffHires',
  'applyScoutingHire',
  'completeRevisedOnboarding',
]);

function notifyListeners() {
  for (const l of listeners) l();
}

function notifyFlowListeners() {
  for (const listener of flowListeners) listener();
}

function setWorkerStatus(nextStatus: typeof workerStatus) {
  workerStatus = nextStatus;
  notifyListeners();
}

function isFatalWorkerError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return /worker|terminated|MessagePort|postMessage|channel|closed|cannot be used|proxy is released|DataCloneError/i.test(message);
}

function invalidateWorker(nextStatus: typeof workerStatus = 'error') {
  ready = false;
  singletonApi = null;
  if (singletonWorker) {
    singletonWorker.terminate();
    singletonWorker = null;
  }
  setWorkerStatus(nextStatus);
}

async function restartWorkerInternal() {
  invalidateWorker('restarting');
  const api = getOrCreateWorker();
  await api.ping();
  ready = true;
  setWorkerStatus('ready');
  return api;
}

async function invokeWorkerMethod<K extends WorkerMethodName>(
  methodName: K,
  args: WorkerMethodParameters<K>,
): Promise<WorkerMethodReturn<K>> {
  const call = async (api: Comlink.Remote<WorkerApi>) => {
    const methodMap = api as unknown as Record<string, ((...methodArgs: unknown[]) => Promise<unknown>) | undefined>;
    const method = methodMap[methodName as string];
    if (!method) {
      throw new Error(`Worker method ${String(methodName)} is unavailable.`);
    }
    return method(...(args as unknown[]));
  };

  try {
    const result = await call(getOrCreateWorker());
    if (mutationMethods.has(methodName) && isFlowAwareResult(result) && result.flowStateChanged) {
      notifyFlowListeners();
    }
    return result as WorkerMethodReturn<K>;
  } catch (error) {
    logger.error(`Worker ${String(methodName)} failed:`, error);
    const fatal = isFatalWorkerError(error);

    if (fatal && !mutationMethods.has(methodName)) {
      try {
        const restartedApi = await restartWorkerInternal();
        return await call(restartedApi) as WorkerMethodReturn<K>;
      } catch (retryError) {
        logger.error(`Worker ${String(methodName)} retry failed:`, retryError);
        toast.error('The simulation worker failed and could not recover.');
        throw retryError;
      }
    }

    if (fatal) {
      try {
        await restartWorkerInternal();
      } catch (restartError) {
        logger.error('Worker restart failed:', restartError);
      }
    }

    toast.error('The simulation worker failed. Please try again.');
    throw error;
  }
}

function getOrCreateWorker(): Comlink.Remote<WorkerApi> {
  if (singletonApi) return singletonApi;

  setWorkerStatus('initializing');
  singletonWorker = new Worker(
    new URL('../../workers/sim.worker.ts', import.meta.url),
    { type: 'module' },
  );
  singletonWorker.addEventListener('error', (event) => {
    // Critical init errors must be visible even in production builds
    // eslint-disable-next-line no-console
    console.error('Worker runtime error:', event.error ?? event.message);
    invalidateWorker('error');
  });
  singletonWorker.addEventListener('messageerror', (event) => {
    // eslint-disable-next-line no-console
    console.error('Worker message error:', event);
    invalidateWorker('error');
  });
  singletonApi = Comlink.wrap<WorkerApi>(singletonWorker);

  const PING_TIMEOUT_MS = 15_000;
  const pingTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Worker ping timed out after ${PING_TIMEOUT_MS}ms`)), PING_TIMEOUT_MS),
  );

  Promise.race([singletonApi.ping(), pingTimeout])
    .then(() => {
      ready = true;
      setWorkerStatus('ready');
    })
    .catch((err: unknown) => {
      // Critical — must be visible in production for debugging deploy issues
      // eslint-disable-next-line no-console
      console.error('Worker ping failed:', err);
      invalidateWorker('error');
    });

  return singletonApi;
}

// Eager init — start loading the worker as soon as this module is imported
// so that isReady becomes true before any component checks it.
getOrCreateWorker();

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

function getWorkerStatusSnapshot() {
  return workerStatus;
}

function isFlowAwareResult(value: unknown): value is { flowStateChanged?: boolean } {
  return typeof value === 'object' && value !== null && 'flowStateChanged' in value;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorker() {
  const isReady = useSyncExternalStore(subscribe, getSnapshot);
  const currentWorkerStatus = useSyncExternalStore(subscribe, getWorkerStatusSnapshot);
  const api = useMemo(
    () =>
      new Proxy({} as Comlink.Remote<WorkerApi>, {
        get(_target, property) {
          if (typeof property !== 'string') {
            return undefined;
          }

          return (...args: unknown[]) =>
            invokeWorkerMethod(
              property as WorkerMethodName,
              args as WorkerMethodParameters<WorkerMethodName>,
            );
        },
      }),
    [],
  ) as WorkerProxy;
  type ScoutIFAResult = Awaited<ReturnType<WorkerApi['scoutIFAPlayer']>>;
  type SignIFAResult = Awaited<ReturnType<WorkerApi['signIFAPlayer']>>;
  type TradeIFAPoolResult = Awaited<ReturnType<WorkerApi['tradeIFAPoolSpace']>>;
  type ExtensionOfferResult = NonNullable<Awaited<ReturnType<WorkerApi['getExtensionOffer']>>>;
  type IssueQualifyingOfferResult = Awaited<ReturnType<WorkerApi['issueQualifyingOffer']>>;
  type CoachMutationResult = Awaited<ReturnType<WorkerApi['hireCoach']>>;

  const runMutation = useCallback(
    async <T,>(operation: () => Promise<T>) => operation(),
    [],
  );

  const ping = useCallback(async () => api.ping(), [api]);
  const restartWorker = useCallback(async () => {
    await restartWorkerInternal();
  }, []);

  const newGame = useCallback(
    async (options: Parameters<typeof api.newGame>[0]) => runMutation(() => api.newGame(options)),
    [api, runMutation],
  );
  const getSetupPreview = useCallback(
    async (options: {
      seed: number;
      userTeamId: string;
      difficulty: 'easy' | 'standard' | 'hard';
    }) => api.getSetupPreview(options),
    [api],
  );

  const simDay = useCallback(async () => runMutation(() => api.simDay()), [api, runMutation]);
  const simWeek = useCallback(async () => runMutation(() => api.simWeek()), [api, runMutation]);
  const simMonth = useCallback(
    async () => runMutation(() =>
      measureAsyncOperation('worker.simMonth', () => api.simMonth(), {
        budgetMs: SIM_MONTH_BENCHMARK_MS,
      })),
    [api, runMutation],
  );
  const acknowledgeMonthlyReport = useCallback(
    async (reportId: string) => runMutation(() => api.acknowledgeMonthlyReport(reportId)),
    [api, runMutation],
  );
  const dismissDecisionSpotlight = useCallback(
    async (decisionId: string) => runMutation(() => api.dismissDecisionSpotlight(decisionId)),
    [api, runMutation],
  );
  const dismissCeremonyMoment = useCallback(
    async (momentId: string) => runMutation(() => api.dismissCeremonyMoment(momentId)),
    [api, runMutation],
  );
  const dismissWelcomeBriefing = useCallback(
    async () => runMutation(() => api.dismissWelcomeBriefing()),
    [api, runMutation],
  );
  const getInteractivePressConference = useCallback(
    async () => api.getInteractivePressConference(),
    [api],
  );
  const respondToPressConference = useCallback(
    async (conferenceId: string, responseId: string) => runMutation(() => api.respondToPressConference(conferenceId, responseId)),
    [api, runMutation],
  );
  const simToPlayoffs = useCallback(async () => runMutation(() => api.simToPlayoffs()), [api, runMutation]);
  const simPlayoffGame = useCallback(async () => runMutation(() => api.simPlayoffGame()), [api, runMutation]);
  const simPlayoffSeries = useCallback(async () => runMutation(() => api.simPlayoffSeries()), [api, runMutation]);
  const simPlayoffRound = useCallback(async () => runMutation(() => api.simPlayoffRound()), [api, runMutation]);
  const simRemainingPlayoffs = useCallback(async () => runMutation(() => api.simRemainingPlayoffs()), [api, runMutation]);
  const getState = useCallback(async () => api.getState(), [api]);
  const exportSnapshot = useCallback(
    async () => measureAsyncOperation('worker.exportSnapshot', () => api.exportSnapshot(), {
      // Full snapshot export serializes the entire worker state before any save write occurs.
      budgetMs: Math.max(SAVE_IO_BUDGET_MS, 1000),
    }),
    [api],
  );
  const importSnapshot = useCallback(
    async (snapshot: unknown) => runMutation(() =>
      measureAsyncOperation('worker.importSnapshot', () => api.importSnapshot(snapshot), {
        budgetMs: SAVE_IO_BUDGET_MS,
      })),
    [api, runMutation],
  );
  const createWhatIfBranch = useCallback(
    async (parentSaveId: string, description: string) =>
      runMutation(() => api.createWhatIfBranch(parentSaveId, description)),
    [api, runMutation],
  );
  const deleteWhatIfBranch = useCallback(
    async (branchSaveId: string) => runMutation(() => api.deleteWhatIfBranch(branchSaveId)),
    [api, runMutation],
  );
  const archiveOldSeasons = useCallback(
    async (saveId: string) => runMutation(() => api.archiveOldSeasons(saveId)),
    [api, runMutation],
  );
  const pruneStaleData = useCallback(
    async (saveId: string) => runMutation(() => api.pruneStaleData(saveId)),
    [api, runMutation],
  );

  const getStandings = useCallback(async () => api.getStandings(), [api]);
  const getScheduleView = useCallback(async () => api.getScheduleView(), [api]);

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
  const getPlayerProfileView = useCallback(
    async (playerId: string) => api.getPlayerProfileView(playerId),
    [api],
  );
  const getPlayerMoments = useCallback(
    async (playerId: string) => api.getPlayerMoments(playerId),
    [api],
  );
  const getTeamMoments = useCallback(
    async (teamId: string) => api.getTeamMoments(teamId),
    [api],
  );
  const getRecentLeagueMoments = useCallback(
    async (sinceDay: number) => api.getRecentLeagueMoments(sinceDay),
    [api],
  );
  const getRecentTeamMoments = useCallback(
    async (sinceDay: number) => api.getRecentTeamMoments(sinceDay),
    [api],
  );
  const getThisWeekInHistory = useCallback(
    async (dayWindow: number) => api.getThisWeekInHistory(dayWindow),
    [api],
  );
  const getPlayerArcsOfSeason = useCallback(
    async (season?: number) => api.getPlayerArcsOfSeason(season),
    [api],
  );
  const getNicknamesForPlayer = useCallback(
    async (playerId: string) => api.getNicknamesForPlayer(playerId),
    [api],
  );
  const getRelationships = useCallback(
    async () => api.getRelationships(),
    [api],
  );
  const getRelationshipWith = useCallback(
    async (teamId: string) => api.getRelationshipWith(teamId),
    [api],
  );
  const getPlayerStoryArcs = useCallback(
    async (playerId: string) => api.getPlayerStoryArcs(playerId),
    [api],
  );
  const getMilestoneAlerts = useCallback(
    async (playerId?: string) => api.getMilestoneAlerts(playerId),
    [api],
  );
  const getAdvancedStats = useCallback(
    async (playerId: string) => api.getAdvancedStats(playerId),
    [api],
  );

  const getLeagueLeaders = useCallback(
    async (stat: LeaderboardStatKey, limit?: number) => api.getLeagueLeaders(stat, limit),
    [api],
  );

  const getPlayoffBracket = useCallback(async () => api.getPlayoffBracket(), [api]);
  const getHallOfFame = useCallback(async () => api.getHallOfFame(), [api]);
  const getFranchiseTimeline = useCallback(async () => api.getFranchiseTimeline(), [api]);
  const getDynastyScore = useCallback(async () => api.getDynastyScore(), [api]);
  const getBranches = useCallback(async (parentSaveId: string) => api.getBranches(parentSaveId), [api]);
  const compareWithBranch = useCallback(
    async (parentSaveId: string, branchSaveId: string) => api.compareWithBranch(parentSaveId, branchSaveId),
    [api],
  );
  const getAchievements = useCallback(async () => api.getAchievements(), [api]);
  const getPerformanceDiagnostics = useCallback(async () => api.getPerformanceDiagnostics(), [api]);
  const getDashboardSummary = useCallback(async () => api.getDashboardSummary(), [api]);
  const getGamePlayByPlay = useCallback(async (gameIndex: number) => api.getGamePlayByPlay(gameIndex), [api]);
  const getRecentGameRecaps = useCallback(async (count?: number) => api.getRecentGameRecaps(count), [api]);
  const getSeasonRecap = useCallback(async (season?: number) => api.getSeasonRecap(season), [api]);
  const getOffseasonHeadline = useCallback(async (season?: number) => api.getOffseasonHeadline(season), [api]);
  const getMonthlyPulse = useCallback(async () => api.getMonthlyPulse(), [api]);
  const getCurrentLeagueEvents = useCallback(async () => api.getCurrentLeagueEvents(), [api]);
  const getLeagueEventHistory = useCallback(async () => api.getLeagueEventHistory(), [api]);
  const getCeremonyState = useCallback(async () => api.getCeremonyState(), [api]);
  const getTickerFeed = useCallback(async (limit?: number) => api.getTickerFeed(limit), [api]);
  const getSeasonFlowState = useCallback(async () => api.getSeasonFlowState(), [api]);
  const getScoutingStaff = useCallback(async () => api.getScoutingStaff(), [api]);
  const scoutPlayerReport = useCallback(
    async (playerId: string) => api.scoutPlayerReport(playerId),
    [api],
  );
  const getIFAPool = useCallback(async () => api.getIFAPool(), [api]);
  const scoutIFAPlayer = useCallback(
    async (playerId: string): Promise<ScoutIFAResult> =>
      api.scoutIFAPlayer(playerId) as Promise<ScoutIFAResult>,
    [api],
  );
  const signIFAPlayer = useCallback(
    async (
      playerId: string,
      bonusAmount: number,
    ): Promise<SignIFAResult> =>
      api.signIFAPlayer(playerId, bonusAmount) as Promise<SignIFAResult>,
    [api],
  );
  const tradeIFAPoolSpace = useCallback(
    async (
      toTeamId: string,
      amount: number,
    ): Promise<TradeIFAPoolResult> =>
      api.tradeIFAPoolSpace(toTeamId, amount) as Promise<TradeIFAPoolResult>,
    [api],
  );
  const getDraftClass = useCallback(async () => api.getDraftClass(), [api]);
  const getDraftCommentary = useCallback(async (visiblePickCount?: number) => api.getDraftCommentary(visiblePickCount), [api]);
  const getDraftProspectReaction = useCallback(async (prospectId: string) => api.getDraftProspectReaction(prospectId), [api]);
  const getDraftPostDraftGrades = useCallback(async () => api.getDraftPostDraftGrades(), [api]);
  const startDraft = useCallback(async () => runMutation(() => api.startDraft()), [api, runMutation]);
  const makeDraftPick = useCallback(
    async (prospectId: string) => runMutation(() => api.makeDraftPick(prospectId)),
    [api, runMutation],
  );
  const scoutDraftPlayer = useCallback(
    async (prospectId: string) => api.scoutDraftPlayer(prospectId),
    [api],
  );
  const toggleDraftBigBoard = useCallback(
    async (prospectId: string) => api.toggleDraftBigBoard(prospectId),
    [api],
  );
  const signDraftPick = useCallback(
    async (playerId: string, bonusAmount: number) => api.signDraftPick(playerId, bonusAmount),
    [api],
  );
  const simulateRemainingDraft = useCallback(
    async () => runMutation(() => api.simulateRemainingDraft()),
    [api, runMutation],
  );
  const getTradeOffers = useCallback(async () => api.getTradeOffers(), [api]);
  const getTradeHistory = useCallback(async () => api.getTradeHistory(), [api]);
  const getTradeDeadlineState = useCallback(async () => api.getTradeDeadlineState(), [api]);
  const getTradeDialogue = useCallback(
    async (
      teamId: string,
      offerValue: number,
      requestValue: number,
      negotiationType?: 'proposal' | 'counter' | 'offer',
    ) => api.getTradeDialogue(teamId, offerValue, requestValue, negotiationType),
    [api],
  );
  const getTradeAssetInventory = useCallback(async (teamId: string) => api.getTradeAssetInventory(teamId), [api]);
  const getNegotiation = useCallback(async (negotiationId: string) => api.getNegotiation(negotiationId), [api]);
  const getOpenNegotiations = useCallback(async () => api.getOpenNegotiations(), [api]);
  const evaluateMultiTeamFairness = useCallback(
    async (proposal: Parameters<typeof api.evaluateMultiTeamFairness>[0]) =>
      api.evaluateMultiTeamFairness(proposal),
    [api],
  );
  const generateConditionalClause = useCallback(
    async (playerId: string) => api.generateConditionalClause(playerId),
    [api],
  );
  const proposeTrade = useCallback(
    async (offeringAssets: TradeAsset[], requestingAssets: TradeAsset[], toTeamId: string) =>
      api.proposeTrade(offeringAssets, requestingAssets, toTeamId),
    [api],
  );
  const startNegotiation = useCallback(
    async (offeringAssets: TradeAsset[], requestingAssets: TradeAsset[], toTeamId: string) =>
      runMutation(() => api.startNegotiation(offeringAssets, requestingAssets, toTeamId)),
    [api, runMutation],
  );
  const advanceNegotiation = useCallback(
    async (
      negotiationId: string,
      counterPackage: { offeringAssets: TradeAsset[]; requestingAssets: TradeAsset[] },
    ) => runMutation(() => api.advanceNegotiation(negotiationId, counterPackage)),
    [api, runMutation],
  );
  const resolveNegotiation = useCallback(
    async (negotiationId: string, action: 'accept' | 'reject') =>
      runMutation(() => api.resolveNegotiation(negotiationId, action)),
    [api, runMutation],
  );
  const proposeMultiTeam = useCallback(
    async (proposal: Parameters<typeof api.proposeMultiTeam>[0]) => api.proposeMultiTeam(proposal),
    [api],
  );
  const executeMultiTeamTrade = useCallback(
    async (proposal: Parameters<typeof api.executeMultiTeamTrade>[0]) =>
      runMutation(() => api.executeMultiTeamTrade(proposal)),
    [api, runMutation],
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
  const makeContractOffer = useCallback(
    async (playerId: string, years: number, salary: number) =>
      runMutation(() => api.makeContractOffer(playerId, years, salary)),
    [api, runMutation],
  );
  const getPromotionCandidates = useCallback(
    async (teamId?: string) => api.getPromotionCandidates(teamId),
    [api],
  );
  const getProspectPipeline = useCallback(
    async (teamId?: string) => api.getProspectPipeline(teamId),
    [api],
  );
  const getExtensionCandidates = useCallback(
    async (teamId?: string) => api.getExtensionCandidates(teamId),
    [api],
  );
  const getExtensionOffer = useCallback(
    async (playerId: string, years: number) => api.getExtensionOffer(playerId, years),
    [api],
  );
  const negotiateExtension = useCallback(
    async (playerId: string, offer: ExtensionOfferResult) =>
      runMutation(() => api.negotiateExtension(playerId, offer)),
    [api, runMutation],
  );
  const getQualifyingOfferEligible = useCallback(
    async (teamId?: string) => api.getQualifyingOfferEligible(teamId),
    [api],
  );
  const getQualifyingOfferSalary = useCallback(async () => api.getQualifyingOfferSalary(), [api]);
  const issueQualifyingOffer = useCallback(
    async (playerId: string): Promise<IssueQualifyingOfferResult> => {
      return runMutation<IssueQualifyingOfferResult>(
        () => api.issueQualifyingOffer(playerId) as Promise<IssueQualifyingOfferResult>,
      );
    },
    [api, runMutation],
  );
  const resolveQualifyingOffers = useCallback(
    async () => runMutation(() => api.resolveQualifyingOffers()),
    [api, runMutation],
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
  const getCoachingStaff = useCallback(
    async (teamId?: string) => api.getCoachingStaff(teamId),
    [api],
  );
  const getCoachFreeAgents = useCallback(async () => api.getCoachFreeAgents(), [api]);
  const getCoachMarket = useCallback(async () => api.getCoachMarket(), [api]);
  const hireCoach = useCallback(
    async (coachId: string): Promise<CoachMutationResult> => {
      return runMutation<CoachMutationResult>(
        () => api.hireCoach(coachId) as Promise<CoachMutationResult>,
      );
    },
    [api, runMutation],
  );
  const fireCoach = useCallback(
    async (coachId: string): Promise<CoachMutationResult> => {
      return runMutation<CoachMutationResult>(
        () => api.fireCoach(coachId) as Promise<CoachMutationResult>,
      );
    },
    [api, runMutation],
  );
  const getDevelopmentReport = useCallback(
    async (playerId: string) => api.getDevelopmentReport(playerId),
    [api],
  );
  const getDevelopmentReports = useCallback(
    async (playerId: string) => api.getDevelopmentReports(playerId),
    [api],
  );
  const getCoachingImpact = useCallback(
    async (teamId?: string) => api.getCoachingImpact(teamId),
    [api],
  );
  const getStaffBudget = useCallback(
    async (teamId?: string) => api.getStaffBudget(teamId),
    [api],
  );
  const getDevelopmentPipeline = useCallback(
    async (teamId?: string) => api.getDevelopmentPipeline(teamId),
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
  const getFrontOfficeState = useCallback(
    async (teamId?: string) => api.getFrontOfficeState(teamId),
    [api],
  );
  const getGMCareer = useCallback(async () => api.getGMCareer(), [api]);
  const getCareerRetrospective = useCallback(async () => api.getCareerRetrospective(), [api]);
  const getSeasonStoryReel = useCallback(
    async (seasonYear: number) => api.getSeasonStoryReel(seasonYear),
    [api],
  );
  const getJobMarket = useCallback(async () => api.getJobMarket(), [api]);
  const getScoutConflicts = useCallback(
    async (teamId?: string) => api.getScoutConflicts(teamId),
    [api],
  );
  const getScoutConflict = useCallback(
    async (prospectId: string) => api.getScoutConflict(prospectId),
    [api],
  );
  const getDynastyCards = useCallback(async () => api.getDynastyCards(), [api]);
  const getDynastyLeaderboard = useCallback(async () => api.getDynastyLeaderboard(), [api]);
  const getScenarioCatalog = useCallback(async () => api.getScenarioCatalog(), [api]);
  const getScenarioProgress = useCallback(async () => api.getScenarioProgress(), [api]);
  const applyForJob = useCallback(
    async (teamId: string) => runMutation(() => api.applyForJob(teamId)),
    [api, runMutation],
  );
  const getPersonalityProfile = useCallback(
    async (playerId: string) => api.getPersonalityProfile(playerId),
    [api],
  );
  const getAwardRaces = useCallback(async () => api.getAwardRaces(), [api]);
  const getAwardRaceBoards = useCallback(async () => api.getAwardRaceBoards(), [api]);
  const getAwardRaceDetail = useCallback(async () => api.getAwardRaceDetail(), [api]);
  const getRivalries = useCallback(
    async (teamId?: string) => api.getRivalries(teamId),
    [api],
  );
  const getAwardHistory = useCallback(async () => api.getAwardHistory(), [api]);
  const getSeasonHistory = useCallback(async () => api.getSeasonHistory(), [api]);
  const getSeasonArchive = useCallback(
    async (season?: number) => api.getSeasonArchive(season),
    [api],
  );
  const compareSeasons = useCallback(
    async (leftSeason: number, rightSeason: number) => api.compareSeasons(leftSeason, rightSeason),
    [api],
  );
  const getRecordBook = useCallback(
    async (teamId?: string) => api.getRecordBook(teamId),
    [api],
  );
  const getRecordWatchList = useCallback(
    async (teamId?: string) => api.getRecordWatchList(teamId),
    [api],
  );
  const resolveHistoryDisplayNames = useCallback(
    async (playerIds: string[], teamIds: string[]) => api.resolveHistoryDisplayNames(playerIds, teamIds),
    [api],
  );
  const getAllTimeLeaders = useCallback(async () => api.getAllTimeLeaders(), [api]);

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
  const getFinanceOverview = useCallback(async () => api.getFinanceOverview(), [api]);
  const getSpringTrainingView = useCallback(async () => api.getSpringTrainingView(), [api]);

  // Round 1 API integration
  const getEnhancedPressConference = useCallback(async () => api.getEnhancedPressConference(), [api]);
  const respondToEnhancedPressConference = useCallback(
    async (confId: string, respId: string) => api.respondToEnhancedPressConference(confId, respId),
    [api],
  );
  const getCoachingChemistry = useCallback(async () => api.getCoachingChemistry(), [api]);
  const getMentorships = useCallback(async () => api.getMentorships(), [api]);
  const getScenarioObjectivesView = useCallback(
    async (scenarioId: string) => api.getScenarioObjectivesView(scenarioId),
    [api],
  );

  // Round 2 API integration
  const getTradeDeadlineDrama = useCallback(async () => api.getTradeDeadlineDrama(), [api]);
  const getMilestoneTrackerAlerts = useCallback(async () => api.getMilestoneTrackerAlerts(), [api]);
  const getChaseWatch = useCallback(async () => api.getChaseWatch(), [api]);
  const getPennantRaces = useCallback(async () => api.getPennantRaces(), [api]);
  const getPennantRaceDetail = useCallback(async () => api.getPennantRaceDetail(), [api]);
  const getFreeAgencyMarketIntelligence = useCallback(async () => api.getFreeAgencyMarketIntelligence(), [api]);

  // Round 3 API integration
  const getPlayerComparison = useCallback(
    async (playerIdA: string, playerIdB: string) => api.getPlayerComparison(playerIdA, playerIdB),
    [api],
  );
  const getSeasonProjections = useCallback(
    async (playerId: string) => api.getSeasonProjections(playerId),
    [api],
  );
  const getPlayerSimilarity = useCallback(
    async (playerId: string) => api.getPlayerSimilarity(playerId),
    [api],
  );
  const getEnhancedGamePlayByPlay = useCallback(
    async (gameIndex: number) => api.getEnhancedGamePlayByPlay(gameIndex),
    [api],
  );
  const getAwardCeremony = useCallback(
    async (season?: number) => api.getAwardCeremony(season),
    [api],
  );

  // Round 4 API integration
  const getBreakoutIntelligence = useCallback(
    async (playerId: string) => api.getBreakoutIntelligence(playerId),
    [api],
  );
  const getProspectBreakoutWatch = useCallback(async () => api.getProspectBreakoutWatch(), [api]);
  const getScoutConsensus = useCallback(
    async (playerId: string) => api.getScoutConsensus(playerId),
    [api],
  );
  const getPlayoffMomentum = useCallback(async () => api.getPlayoffMomentum(), [api]);

  // Onboarding (legacy procedural flow)
  const getOnboardingData = useCallback(async () => api.getOnboardingData(), [api]);
  const completeOnboarding = useCallback(
    async (philosophy: Parameters<typeof api.completeOnboarding>[0]) =>
      runMutation(() => api.completeOnboarding(philosophy)),
    [api, runMutation],
  );

  // Onboarding (revised "Day 1" flow with fixed AGM candidates)
  const getAGMCandidates = useCallback(async () => api.getAGMCandidates(), [api]);
  const getRevisedOnboardingData = useCallback(
    async (agmId: Parameters<typeof api.getRevisedOnboardingData>[0]) =>
      api.getRevisedOnboardingData(agmId),
    [api],
  );
  const applyStaffHires = useCallback(
    async (hires: Parameters<typeof api.applyStaffHires>[0]) =>
      runMutation(() => api.applyStaffHires(hires)),
    [api, runMutation],
  );
  const applyScoutingHire = useCallback(
    async (scoutingDirectorId: Parameters<typeof api.applyScoutingHire>[0]) =>
      runMutation(() => api.applyScoutingHire(scoutingDirectorId)),
    [api, runMutation],
  );
  const completeRevisedOnboarding = useCallback(
    async (result: Parameters<typeof api.completeRevisedOnboarding>[0]) =>
      runMutation(() => api.completeRevisedOnboarding(result)),
    [api, runMutation],
  );

  // Stabilize the return object so consumers can safely include `worker` in
  // useCallback / useEffect dep arrays. Every method above is a useCallback
  // with stable deps (`[api]` or `[api, runMutation]`, both of which are
  // initialized once with `[]` deps), so the only dynamic values are
  // `isReady` and `currentWorkerStatus`. Without this memo, useWorker()
  // returns a fresh object literal on every render and any consumer that
  // depends on `worker` infinite-loops when that consumer also calls
  // setState in a useEffect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({
    ping, newGame, getSetupPreview, simDay, simWeek, simMonth, acknowledgeMonthlyReport, dismissDecisionSpotlight, dismissCeremonyMoment, dismissWelcomeBriefing, getInteractivePressConference, respondToPressConference, simToPlayoffs,
    simPlayoffGame, simPlayoffSeries, simPlayoffRound, simRemainingPlayoffs,
    getState,
    exportSnapshot, importSnapshot, createWhatIfBranch, deleteWhatIfBranch, archiveOldSeasons, pruneStaleData,
    getStandings, getScheduleView, getTeamRoster, getFullRoster, getPlayer, getPlayerProfileView, getPlayerMoments, getTeamMoments, getRecentLeagueMoments, getRecentTeamMoments, getThisWeekInHistory, getPlayerArcsOfSeason, getNicknamesForPlayer, getRelationships, getRelationshipWith, getPlayerStoryArcs, getMilestoneAlerts, getAdvancedStats,
    getLeagueLeaders, getPlayoffBracket, getHallOfFame, getFranchiseTimeline, getDynastyScore, getBranches, compareWithBranch, getAchievements, getPerformanceDiagnostics, getDashboardSummary, getGamePlayByPlay, getRecentGameRecaps, getSeasonRecap, getOffseasonHeadline, getMonthlyPulse, getCurrentLeagueEvents, getLeagueEventHistory, getCeremonyState, getTickerFeed, getSeasonFlowState,
    getScoutingStaff, scoutPlayerReport, getIFAPool, scoutIFAPlayer, signIFAPlayer, tradeIFAPoolSpace,
    getDraftClass, getDraftCommentary, getDraftProspectReaction, getDraftPostDraftGrades, startDraft, makeDraftPick, scoutDraftPlayer, toggleDraftBigBoard, signDraftPick, simulateRemainingDraft,
    getTradeOffers, getTradeHistory, getTradeDeadlineState, getTradeDialogue, getTradeAssetInventory, getNegotiation, getOpenNegotiations, evaluateMultiTeamFairness, generateConditionalClause, proposeTrade, startNegotiation, advanceNegotiation, resolveNegotiation, proposeMultiTeam, executeMultiTeamTrade, respondToTradeOffer,
    getNews, markNewsRead, promotePlayer, demotePlayer, designateForAssignment, claimOffWaivers, makeContractOffer,
    getPromotionCandidates, getProspectPipeline, getExtensionCandidates, getExtensionOffer, negotiateExtension,
    getQualifyingOfferEligible, getQualifyingOfferSalary, issueQualifyingOffer, resolveQualifyingOffers,
    getRosterComplianceIssues, getAffiliateOverview, getAffiliateBoxScore,
    getCoachingStaff, getCoachFreeAgents, getCoachMarket, hireCoach, fireCoach,
    getDevelopmentReport, getDevelopmentReports, getCoachingImpact, getStaffBudget, getDevelopmentPipeline,
    proceedToOffseason, startNextSeason,
    getBriefing, getPressRoomFeed, getTeamChemistry, getOwnerState, getFrontOfficeState, getGMCareer, getCareerRetrospective, getSeasonStoryReel, getJobMarket, getScoutConflicts, getScoutConflict, getDynastyCards, getDynastyLeaderboard, getScenarioCatalog, getScenarioProgress, applyForJob,
    getPersonalityProfile, getAwardRaces, getAwardRaceBoards, getAwardRaceDetail, getRivalries,
    getAwardHistory, getSeasonHistory, getSeasonArchive, compareSeasons, getRecordBook, getRecordWatchList, resolveHistoryDisplayNames, getAllTimeLeaders,
    searchPlayers, advanceOffseason, skipOffseasonPhase, getOffseasonState,
    getFinanceOverview,
    getSpringTrainingView,
    toggleRule5Protection, lockRule5Protection, makeRule5Pick, passRule5Pick, resolveRule5OfferBack,
    getEnhancedPressConference, respondToEnhancedPressConference, getCoachingChemistry, getMentorships, getScenarioObjectivesView,
    getTradeDeadlineDrama, getMilestoneTrackerAlerts, getChaseWatch, getPennantRaces, getPennantRaceDetail, getFreeAgencyMarketIntelligence,
    getPlayerComparison, getSeasonProjections, getPlayerSimilarity, getEnhancedGamePlayByPlay, getAwardCeremony,
    getBreakoutIntelligence, getProspectBreakoutWatch, getScoutConsensus, getPlayoffMomentum,
    getOnboardingData, completeOnboarding,
    getAGMCandidates, getRevisedOnboardingData, applyStaffHires, applyScoutingHire, completeRevisedOnboarding,
    subscribeToFlowUpdates,
    restartWorker,
    workerStatus: currentWorkerStatus,
    isReady,
  }), [isReady, currentWorkerStatus]);
}
