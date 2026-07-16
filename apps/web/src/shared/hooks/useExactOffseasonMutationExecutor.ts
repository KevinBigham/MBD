import { useCallback } from 'react';
import { useGameStore } from './useGameStore';
import { releaseActiveSaveSessionOwnership } from '@/shared/lib/saveSessionOwnership';
import {
  executeExactSaveMutation,
  didFlowAwareExactMutationChange,
  getExactSaveMutationStatus,
  type ExactSaveMutationWorker,
} from '@/shared/lib/exactSaveMutationCoordinator';

type OffseasonOperation = 'advanceOffseason' | 'skipOffseasonPhase';

export type ExactSaveGameplayOperation = OffseasonOperation
  | { kind: 'issueQualifyingOffer'; playerId: string }
  | { kind: 'resolveQualifyingOffers' }
  | { kind: 'makeContractOffer'; playerId: string; years: number; salary: number }
  | { kind: 'startDraft' }
  | { kind: 'makeDraftPick'; prospectId: string }
  | { kind: 'signDraftPick'; playerId: string; bonusAmount: number }
  | { kind: 'simulateRemainingDraft' }
  | {
    kind: 'startTradeNegotiation';
    offeringAssets: import('@mbd/contracts').TradeAsset[];
    requestingAssets: import('@mbd/contracts').TradeAsset[];
    toTeamId: string;
  }
  | {
    kind: 'advanceTradeNegotiation';
    negotiationId: string;
    tradePackage: {
      offeringAssets: import('@mbd/contracts').TradeAsset[];
      requestingAssets: import('@mbd/contracts').TradeAsset[];
    };
  }
  | {
    kind: 'resolveTradeNegotiation';
    negotiationId: string;
    action: 'accept' | 'reject';
  }
  | {
    kind: 'respondToTradeOffer';
    offerId: string;
    response: 'accept' | 'decline' | 'counter';
    counterPackage?: {
      offeringAssets: import('@mbd/contracts').TradeAsset[];
      requestingAssets: import('@mbd/contracts').TradeAsset[];
    };
  };

export interface ExactOffseasonMutationWorker<Result>
  extends ExactSaveMutationWorker<Result, ExactSaveGameplayOperation> {}

export function didExactSaveGameplayResultChange(result: unknown): boolean {
  return didFlowAwareExactMutationChange(result);
}

export function useExactSaveMutationExecutor<Result>(
  worker: ExactOffseasonMutationWorker<Result>,
  workerReady: boolean,
  didChange?: (result: Result) => boolean,
) {
  const store = useGameStore();

  return useCallback(async (operation: ExactSaveGameplayOperation): Promise<Result | null> => {
    const live = useGameStore.getState();
    const capturedSaveId = store.activeSaveId;
    if (!capturedSaveId
      || live.activeSaveId !== capturedSaveId
      || !store.isInitialized
      || !live.isInitialized
      || store.phase !== 'offseason'
      || live.phase !== 'offseason'
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
      didChange,
      failClosed: async () => {
        if (useGameStore.getState().activeSaveId !== capturedSaveId) return;
        try {
          await releaseActiveSaveSessionOwnership();
        } catch (error) {
          console.error('Exact offseason mutation ownership release failed:', error);
        } finally {
          if (useGameStore.getState().activeSaveId === capturedSaveId) {
            useGameStore.getState().setInitialized(false);
          }
        }
      },
    });

    if (outcome.kind !== 'durable' && outcome.kind !== 'unchanged') {
      console.error('Exact offseason mutation did not reach a coherent result:', outcome.error);
      return null;
    }
    return outcome.result;
  }, [didChange, store.activeSaveId, store.gmName, store.isInitialized, store.phase, store.season, store.teamName, worker, workerReady]);
}

export function useExactOffseasonMutationExecutor<Result>(
  worker: ExactOffseasonMutationWorker<Result>,
  workerReady: boolean,
) {
  const execute = useExactSaveMutationExecutor(worker, workerReady, didExactSaveGameplayResultChange);
  return useCallback((operation: OffseasonOperation) => execute(operation), [execute]);
}
