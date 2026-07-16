import { useCallback } from 'react';
import type { TradeAsset } from '@mbd/contracts';
import { useGameStore } from './useGameStore';
import { releaseActiveSaveSessionOwnership } from '@/shared/lib/saveSessionOwnership';
import {
  executeExactSaveMutation,
  didFlowAwareExactMutationChange,
  getExactSaveMutationStatus,
  type ExactSaveMutationWorker,
} from '@/shared/lib/exactSaveMutationCoordinator';
import type { ExactSaveGameplayOperation } from './useExactOffseasonMutationExecutor';

type TradePackage = {
  offeringAssets: TradeAsset[];
  requestingAssets: TradeAsset[];
};

export type ExactTradeMutationOperation = Extract<
  ExactSaveGameplayOperation,
  { kind: 'startTradeNegotiation' | 'advanceTradeNegotiation' | 'resolveTradeNegotiation' | 'respondToTradeOffer' }
>;

export interface ExactTradeMutationWorker<Result>
  extends ExactSaveMutationWorker<Result, ExactSaveGameplayOperation> {}

export interface ExactTradeMutationExecutor<Result> {
  startNegotiation(
    offeringAssets: TradeAsset[],
    requestingAssets: TradeAsset[],
    toTeamId: string,
  ): Promise<Result | null>;
  advanceNegotiation(negotiationId: string, tradePackage: TradePackage): Promise<Result | null>;
  resolveNegotiation(negotiationId: string, action: 'accept' | 'reject'): Promise<Result | null>;
  respondToTradeOffer(
    offerId: string,
    response: 'accept' | 'decline' | 'counter',
    counterPackage?: TradePackage,
  ): Promise<Result | null>;
}

export function useExactTradeMutationExecutor<Result>(
  worker: ExactTradeMutationWorker<Result>,
  workerReady: boolean,
): ExactTradeMutationExecutor<Result> {
  const store = useGameStore();

  const execute = useCallback(async (operation: ExactTradeMutationOperation): Promise<Result | null> => {
    const live = useGameStore.getState();
    const capturedSaveId = store.activeSaveId;
    if (!capturedSaveId
      || live.activeSaveId !== capturedSaveId
      || !store.isInitialized
      || !live.isInitialized
      || !workerReady
      || getExactSaveMutationStatus().kind !== 'idle') {
      return null;
    }

    const outcome = await executeExactSaveMutation({
      saveId: capturedSaveId,
      gmName: store.gmName,
      teamName: store.teamName,
      season: store.season,
      operation,
      worker,
      didChange: didFlowAwareExactMutationChange,
      failClosed: async () => {
        if (useGameStore.getState().activeSaveId !== capturedSaveId) return;
        try {
          await releaseActiveSaveSessionOwnership();
        } catch (error) {
          console.error('Exact trade mutation ownership release failed:', error);
        } finally {
          if (useGameStore.getState().activeSaveId === capturedSaveId) {
            useGameStore.getState().setInitialized(false);
          }
        }
      },
    });

    if (outcome.kind !== 'durable' && outcome.kind !== 'unchanged') {
      console.error('Exact trade mutation did not reach a coherent result:', outcome.error);
      return null;
    }
    return outcome.result;
  }, [store.activeSaveId, store.gmName, store.isInitialized, store.season, store.teamName, worker, workerReady]);

  return {
    startNegotiation: useCallback((offeringAssets, requestingAssets, toTeamId) => execute({
      kind: 'startTradeNegotiation',
      offeringAssets,
      requestingAssets,
      toTeamId,
    }), [execute]),
    advanceNegotiation: useCallback((negotiationId, tradePackage) => execute({
      kind: 'advanceTradeNegotiation',
      negotiationId,
      tradePackage,
    }), [execute]),
    resolveNegotiation: useCallback((negotiationId, action) => execute({
      kind: 'resolveTradeNegotiation',
      negotiationId,
      action,
    }), [execute]),
    respondToTradeOffer: useCallback((offerId, response, counterPackage) => execute({
      kind: 'respondToTradeOffer',
      offerId,
      response,
      counterPackage,
    }), [execute]),
  };
}
