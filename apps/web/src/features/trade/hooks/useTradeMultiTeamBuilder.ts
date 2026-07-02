import { useCallback, useMemo, useState } from 'react';
import type { TradeCondition } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  ConditionalClauseResult,
  MultiTeamFairnessResult,
  MultiTeamFairnessView,
  MultiTeamTradeExecutionResult,
  MultiTeamTradeProposalResult,
} from '@/workers/sim.worker.trade';
import type { MultiTeamLaneState } from '../components/MultiTeamLaneCard';
import type { TradeResultView } from '../components/TradeResultBanner';
import {
  addMultiTeamLane as addMultiTeamLaneTransform,
  buildMultiTeamMovedPlayers,
  buildOpenMultiTeamBuilderState,
  multiTeamProposalFromLanes,
  removeMultiTeamLane as removeMultiTeamLaneTransform,
  setMultiTeamLaneTeam as updateMultiTeamLaneTeam,
  toggleMultiTeamLanePlayer,
  updateMultiTeamLaneDestination as updateMultiTeamLanePlayerDestination,
  type MultiTeamMovedPlayerView,
  type MultiTeamProposalPayload,
} from '../lib/tradeBuilderTransforms';
import { useTradeMultiTeamRosters } from './useTradeMultiTeamRosters';

export interface UseTradeMultiTeamBuilderOptions {
  userTeamId: string;
  selectedTeam: string;
  yourRoster: PlayerDTO[];
  targetRoster: PlayerDTO[];
  isInitialized: boolean;
  workerReady: boolean;
  getTeamRoster: (teamId: string) => Promise<unknown>;
  evaluateMultiTeamFairness: (proposal: MultiTeamProposalPayload) => Promise<unknown>;
  generateConditionalClause: (playerId: string) => Promise<unknown>;
  proposeMultiTeam: (proposal: MultiTeamProposalPayload) => Promise<unknown>;
  executeMultiTeamTrade: (proposal: MultiTeamProposalPayload) => Promise<unknown>;
  refreshAfterExecution: () => Promise<void>;
  persistTradeSnapshot: () => Promise<void>;
  onTradeResultChange: (result: TradeResultView | null) => void;
}

export interface UseTradeMultiTeamBuilderResult {
  multiTeamOpen: boolean;
  multiTeamLanes: MultiTeamLaneState[];
  multiTeamConditions: TradeCondition[];
  multiTeamConditionPlayerId: string;
  multiTeamFairness: MultiTeamFairnessView | null;
  multiTeamProposalResult: MultiTeamTradeProposalResult | null;
  multiTeamExecutionResult: MultiTeamTradeExecutionResult | null;
  multiTeamMessage: string | null;
  multiTeamSubmitting: boolean;
  multiTeamProposal: MultiTeamProposalPayload;
  multiTeamRosters: Record<string, PlayerDTO[]>;
  multiTeamMovedPlayers: MultiTeamMovedPlayerView[];
  multiTeamConditionTargets: MultiTeamMovedPlayerView[];
  setMultiTeamConditionPlayerId: (playerId: string) => void;
  resetMultiTeamBuilder: () => void;
  openMultiTeamBuilder: () => void;
  setMultiTeamLaneTeam: (laneId: string, teamId: string) => void;
  toggleMultiTeamPlayer: (laneId: string, playerId: string) => void;
  updateMultiTeamDestination: (laneId: string, playerId: string, destinationTeamId: string) => void;
  addMultiTeamLane: () => void;
  removeMultiTeamLane: (laneId: string) => void;
  handleEvaluateMultiTeamFramework: () => Promise<void>;
  handleAddConditionalClause: () => Promise<void>;
  handleProposeMultiTeamFramework: () => Promise<void>;
  handleExecuteMultiTeamFramework: () => Promise<void>;
}

export function useTradeMultiTeamBuilder({
  userTeamId,
  selectedTeam,
  yourRoster,
  targetRoster,
  isInitialized,
  workerReady,
  getTeamRoster,
  evaluateMultiTeamFairness,
  generateConditionalClause,
  proposeMultiTeam,
  executeMultiTeamTrade,
  refreshAfterExecution,
  persistTradeSnapshot,
  onTradeResultChange,
}: UseTradeMultiTeamBuilderOptions): UseTradeMultiTeamBuilderResult {
  const [multiTeamOpen, setMultiTeamOpen] = useState(false);
  const [multiTeamLanes, setMultiTeamLanes] = useState<MultiTeamLaneState[]>([]);
  const [multiTeamConditions, setMultiTeamConditions] = useState<TradeCondition[]>([]);
  const [multiTeamConditionPlayerId, setMultiTeamConditionPlayerId] = useState('');
  const [multiTeamFairness, setMultiTeamFairness] = useState<MultiTeamFairnessView | null>(null);
  const [multiTeamProposalResult, setMultiTeamProposalResult] = useState<MultiTeamTradeProposalResult | null>(null);
  const [multiTeamExecutionResult, setMultiTeamExecutionResult] = useState<MultiTeamTradeExecutionResult | null>(null);
  const [multiTeamMessage, setMultiTeamMessage] = useState<string | null>(null);
  const [multiTeamSubmitting, setMultiTeamSubmitting] = useState(false);

  const multiTeamProposal = useMemo(
    () => multiTeamProposalFromLanes(multiTeamLanes, multiTeamConditions),
    [multiTeamConditions, multiTeamLanes],
  );
  const {
    multiTeamRosters,
    setMultiTeamRosters,
  } = useTradeMultiTeamRosters({
    isOpen: multiTeamOpen,
    isInitialized,
    workerReady,
    lanes: multiTeamLanes,
    getTeamRoster,
  });
  const multiTeamMovedPlayers = useMemo(
    () => buildMultiTeamMovedPlayers(multiTeamLanes, multiTeamRosters),
    [multiTeamLanes, multiTeamRosters],
  );
  const multiTeamConditionTargets = useMemo(
    () => [...multiTeamMovedPlayers].sort((left, right) =>
      left.label.localeCompare(right.label) || left.playerId.localeCompare(right.playerId),
    ),
    [multiTeamMovedPlayers],
  );

  const resetMultiTeamFeedback = useCallback(() => {
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
  }, []);

  const resetMultiTeamBuilder = useCallback(() => {
    setMultiTeamOpen(false);
    setMultiTeamConditions([]);
    setMultiTeamConditionPlayerId('');
    resetMultiTeamFeedback();
    setMultiTeamSubmitting(false);
    setMultiTeamLanes([]);
    setMultiTeamRosters({});
  }, [resetMultiTeamFeedback, setMultiTeamRosters]);

  const openMultiTeamBuilder = useCallback(() => {
    const nextState = buildOpenMultiTeamBuilderState(userTeamId, selectedTeam, yourRoster, targetRoster);

    setMultiTeamLanes(nextState.lanes);
    setMultiTeamRosters(nextState.rosters);
    setMultiTeamConditions(nextState.conditions);
    setMultiTeamConditionPlayerId(nextState.conditionPlayerId);
    setMultiTeamFairness(nextState.fairness);
    setMultiTeamProposalResult(nextState.proposalResult);
    setMultiTeamExecutionResult(nextState.executionResult);
    setMultiTeamMessage(nextState.message);
    setMultiTeamOpen(true);
  }, [selectedTeam, setMultiTeamRosters, targetRoster, userTeamId, yourRoster]);

  const setMultiTeamLaneTeam = useCallback((laneId: string, teamId: string) => {
    resetMultiTeamFeedback();
    setMultiTeamLanes((current) => updateMultiTeamLaneTeam(current, laneId, teamId));
  }, [resetMultiTeamFeedback]);

  const toggleMultiTeamPlayer = useCallback((laneId: string, playerId: string) => {
    resetMultiTeamFeedback();
    setMultiTeamLanes((current) => toggleMultiTeamLanePlayer(current, laneId, playerId));
  }, [resetMultiTeamFeedback]);

  const updateMultiTeamDestination = useCallback((laneId: string, playerId: string, destinationTeamId: string) => {
    resetMultiTeamFeedback();
    setMultiTeamLanes((current) => updateMultiTeamLanePlayerDestination(current, laneId, playerId, destinationTeamId));
  }, [resetMultiTeamFeedback]);

  const addMultiTeamLane = useCallback(() => {
    resetMultiTeamFeedback();
    setMultiTeamLanes((current) => addMultiTeamLaneTransform(current, userTeamId));
  }, [resetMultiTeamFeedback, userTeamId]);

  const removeMultiTeamLane = useCallback((laneId: string) => {
    resetMultiTeamFeedback();
    setMultiTeamLanes((current) => removeMultiTeamLaneTransform(current, laneId));
  }, [resetMultiTeamFeedback]);

  const handleEvaluateMultiTeamFramework = useCallback(async () => {
    setMultiTeamSubmitting(true);
    try {
      const result = await evaluateMultiTeamFairness(multiTeamProposal) as MultiTeamFairnessResult;
      setMultiTeamFairness(result.fairness ?? null);
      setMultiTeamMessage(result.message);
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [evaluateMultiTeamFairness, multiTeamProposal]);

  const handleAddConditionalClause = useCallback(async () => {
    const targetPlayerId = multiTeamConditionPlayerId || multiTeamMovedPlayers[0]?.playerId;
    if (!targetPlayerId) {
      setMultiTeamMessage('Select at least one moved player before adding a condition.');
      return;
    }

    setMultiTeamSubmitting(true);
    try {
      const result = await generateConditionalClause(targetPlayerId) as ConditionalClauseResult;
      setMultiTeamMessage(result.message);
      if (result.success && result.condition) {
        setMultiTeamConditions((current) => [...current, result.condition!]);
        setMultiTeamConditionPlayerId(result.condition.playerId);
      }
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [generateConditionalClause, multiTeamConditionPlayerId, multiTeamMovedPlayers]);

  const handleProposeMultiTeamFramework = useCallback(async () => {
    setMultiTeamSubmitting(true);
    try {
      const result = await proposeMultiTeam(multiTeamProposal) as MultiTeamTradeProposalResult;
      setMultiTeamProposalResult(result);
      setMultiTeamFairness(result.fairness ?? null);
      setMultiTeamMessage(result.message);
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [multiTeamProposal, proposeMultiTeam]);

  const handleExecuteMultiTeamFramework = useCallback(async () => {
    setMultiTeamSubmitting(true);
    try {
      const result = await executeMultiTeamTrade(multiTeamProposal) as MultiTeamTradeExecutionResult;
      setMultiTeamExecutionResult(result);
      setMultiTeamFairness(result.fairness ?? null);
      setMultiTeamMessage(result.message);
      onTradeResultChange({
        status: result.accepted ? 'accepted' : 'rejected',
        message: result.message,
      });

      if (result.success && result.accepted) {
        // Persist the executed framework before refreshing the UI so a refresh
        // failure cannot drop the durable post-trade snapshot.
        await persistTradeSnapshot();
        setMultiTeamOpen(false);
      }

      try {
        await refreshAfterExecution();
      } catch {
        // The post-execution refresh is display-only; the trade is already persisted.
      }
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [executeMultiTeamTrade, multiTeamProposal, onTradeResultChange, persistTradeSnapshot, refreshAfterExecution]);

  return {
    multiTeamOpen,
    multiTeamLanes,
    multiTeamConditions,
    multiTeamConditionPlayerId,
    multiTeamFairness,
    multiTeamProposalResult,
    multiTeamExecutionResult,
    multiTeamMessage,
    multiTeamSubmitting,
    multiTeamProposal,
    multiTeamRosters,
    multiTeamMovedPlayers,
    multiTeamConditionTargets,
    setMultiTeamConditionPlayerId,
    resetMultiTeamBuilder,
    openMultiTeamBuilder,
    setMultiTeamLaneTeam,
    toggleMultiTeamPlayer,
    updateMultiTeamDestination,
    addMultiTeamLane,
    removeMultiTeamLane,
    handleEvaluateMultiTeamFramework,
    handleAddConditionalClause,
    handleProposeMultiTeamFramework,
    handleExecuteMultiTeamFramework,
  };
}
