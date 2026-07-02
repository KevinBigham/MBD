import { useMemo } from 'react';
import type { TradeDeadlineStateView } from '@/workers/sim.worker.trade';
import type { RelationshipView } from '../components/TradeBuilderContextPanel';
import {
  ALL_TEAMS,
  buildMarketPhaseCopy,
} from '../lib/tradeBuilderTransforms';

export interface UseTradeMarketContextOptions {
  deadlineState: TradeDeadlineStateView | null;
  phase: string;
  relationships: RelationshipView[];
  seasonFlowStatus: string | null;
  selectedTeam: string;
  userTeamId: string;
}

export interface UseTradeMarketContextResult {
  effectivePhase: string;
  marketCopy: ReturnType<typeof buildMarketPhaseCopy>;
  otherTeams: typeof ALL_TEAMS;
  relationshipsByTeamId: Map<string, RelationshipView>;
  selectedRelationship: RelationshipView | null;
  tradeMarketOpen: boolean;
}

export function useTradeMarketContext({
  deadlineState,
  phase,
  relationships,
  seasonFlowStatus,
  selectedTeam,
  userTeamId,
}: UseTradeMarketContextOptions): UseTradeMarketContextResult {
  const otherTeams = useMemo(
    () => ALL_TEAMS.filter((team) => team.id !== userTeamId),
    [userTeamId],
  );
  const effectivePhase = seasonFlowStatus === 'preseason'
    ? 'spring_training'
    : (deadlineState?.currentPhase ?? phase);
  const tradeMarketOpen = effectivePhase === 'regular' && (
    (deadlineState?.deadlineMode ?? false) || ((deadlineState?.daysUntilDeadline ?? -1) > 0)
  );
  const marketCopy = useMemo(
    () => buildMarketPhaseCopy(effectivePhase, deadlineState, tradeMarketOpen),
    [deadlineState, effectivePhase, tradeMarketOpen],
  );
  const relationshipsByTeamId = useMemo(
    () => new Map(relationships.map((relationship) => [relationship.teamId, relationship])),
    [relationships],
  );
  const selectedRelationship = selectedTeam ? (relationshipsByTeamId.get(selectedTeam) ?? null) : null;

  return {
    effectivePhase,
    marketCopy,
    otherTeams,
    relationshipsByTeamId,
    selectedRelationship,
    tradeMarketOpen,
  };
}
