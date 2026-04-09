import type { GameRNG } from '../math/prng.js';
import { getTeamById } from '../league/teams.js';
import {
  assignGMPersonality,
  type GMPersonality,
} from './tradeAI.js';

export interface MultiTeamProposal {
  teams: TradeParticipant[];
  conditions: TradeCondition[];
}

export type TradeParticipantRole = 'initiator' | 'partner' | 'facilitator';

export interface TradeParticipant {
  teamId: string;
  sending: string[];
  receiving: string[];
  role: TradeParticipantRole;
}

export interface MultiTeamTradeResult {
  accepted: boolean;
  teams: TradeParticipant[];
  netValueByTeam: Map<string, number>;
  narrative: string;
  blockingTeamId?: string;
  blockReason?: string;
}

export interface FairnessAssessment {
  isBalanced: boolean;
  maxImbalance: number;
  mostDisadvantagedTeam: string;
  fairnessScore: number;
}

export type TradeConditionType = 'performance' | 'games_played' | 'award' | 'playoff';

export interface TradeCondition {
  type: TradeConditionType;
  threshold: number;
  playerId: string;
  deadline: number;
  description: string;
}

export interface ConditionOutcome {
  conditionMet: boolean;
  actualValue: number;
  description: string;
}

export interface CompletedTrade {
  playerIds: string[];
  fromTeamId: string;
  toTeamId: string;
  season: number;
}

export interface PendingTrade {
  id: string;
  requiredPlayerId?: string;
  triggerCondition: string;
}

export interface CascadeEvent {
  triggeredTradeId: string;
  reason: string;
  affectedTeamIds: string[];
}

export interface ConditionalContext {
  playerId?: string;
  playerAge: number;
  playerRating: number;
  contractYearsRemaining: number;
}

const STANDARD_NEGATIVE_TOLERANCE = 0.15;
const FACILITATOR_NEGATIVE_TOLERANCE = 0.08;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function getAllPlayerIds(proposal: MultiTeamProposal): string[] {
  return proposal.teams.flatMap((team) => [...team.sending, ...team.receiving]);
}

function getUniqueTradeValue(
  proposal: MultiTeamProposal,
  valuations: Map<string, number>,
): number {
  const uniqueIds = new Set(getAllPlayerIds(proposal));
  let total = 0;
  for (const playerId of uniqueIds) {
    total += valuations.get(playerId) ?? 0;
  }
  return total;
}

function computeNetValueByTeam(
  proposal: MultiTeamProposal,
  valuations: Map<string, number>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const participant of proposal.teams) {
    const sendingValue = participant.sending.reduce((sum, playerId) => sum + (valuations.get(playerId) ?? 0), 0);
    const receivingValue = participant.receiving.reduce((sum, playerId) => sum + (valuations.get(playerId) ?? 0), 0);
    result.set(participant.teamId, receivingValue - sendingValue);
  }
  return result;
}

function getRoleTolerance(
  role: TradeParticipantRole,
  totalTradeValue: number,
): number {
  return -(role === 'facilitator'
    ? totalTradeValue * FACILITATOR_NEGATIVE_TOLERANCE
    : totalTradeValue * STANDARD_NEGATIVE_TOLERANCE);
}

function getPersonalityAdjustment(
  personality: GMPersonality,
  totalTradeValue: number,
): number {
  switch (personality) {
    case 'aggressive':
      return -(totalTradeValue * 0.05);
    case 'win_now':
      return -(totalTradeValue * 0.03);
    case 'conservative':
      return totalTradeValue * 0.05;
    case 'prospect_hugger':
      return totalTradeValue * 0.03;
    case 'analytical':
    default:
      return 0;
  }
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  if (!team) {
    return teamId.toUpperCase();
  }
  return `${team.abbreviation} (${team.city})`;
}

function validateProposal(proposal: MultiTeamProposal): string | null {
  if (proposal.teams.length === 0) {
    return 'Cannot evaluate an empty three-team proposal.';
  }

  const distinctTeams = new Set(proposal.teams.map((team) => team.teamId));
  if (distinctTeams.size < 3) {
    return 'A multi-team trade needs three distinct participants.';
  }

  const allSendingIds = proposal.teams.flatMap((team) => team.sending);
  if (new Set(allSendingIds).size !== allSendingIds.length) {
    return 'Proposal reuses the same player in multiple outgoing packages.';
  }

  const allReceivingIds = proposal.teams.flatMap((team) => team.receiving);
  if (new Set(allReceivingIds).size !== allReceivingIds.length) {
    return 'Proposal reuses the same player in multiple incoming packages.';
  }

  return null;
}

export function evaluateMultiTeamFairness(
  proposal: MultiTeamProposal,
  valuations: Map<string, number>,
): FairnessAssessment {
  const totalTradeValue = Math.max(1, getUniqueTradeValue(proposal, valuations));
  const netValueByTeam = computeNetValueByTeam(proposal, valuations);
  let lowestNetValue = Number.POSITIVE_INFINITY;
  let mostDisadvantagedTeam = proposal.teams[0]?.teamId ?? 'unknown';
  let isBalanced = true;

  for (const participant of proposal.teams) {
    const netValue = netValueByTeam.get(participant.teamId) ?? 0;
    if (netValue < lowestNetValue) {
      lowestNetValue = netValue;
      mostDisadvantagedTeam = participant.teamId;
    }
    if (netValue < getRoleTolerance(participant.role, totalTradeValue)) {
      isBalanced = false;
    }
  }

  const maxImbalance = roundToTenth((Math.abs(Math.min(lowestNetValue, 0)) / totalTradeValue) * 100);
  const fairnessScore = clamp(Math.round(100 - (maxImbalance * 4)), 0, 100);

  return {
    isBalanced,
    maxImbalance,
    mostDisadvantagedTeam,
    fairnessScore,
  };
}

export function generateConditionalClause(
  rng: GameRNG,
  context: ConditionalContext,
): TradeCondition {
  const types: TradeConditionType[] = ['performance', 'games_played', 'award', 'playoff'];
  const weights = [
    context.playerRating >= 320 ? 4 : 3,
    context.playerAge >= 29 ? 4 : 2,
    context.playerRating >= 330 ? 3 : 1,
    context.contractYearsRemaining <= 2 ? 3 : 1,
  ];
  const type = rng.weightedPick(types, weights);
  const playerId = context.playerId ?? 'player-to-be-named';
  const deadline = Math.max(1, context.contractYearsRemaining);

  switch (type) {
    case 'games_played':
      return {
        type,
        threshold: context.playerAge >= 30 ? 110 : 130,
        playerId,
        deadline,
        description: `${playerId} must clear the games-played target before the clause vests.`,
      };
    case 'award':
      return {
        type,
        threshold: 1,
        playerId,
        deadline,
        description: `${playerId} must land on the award board to trigger the clause.`,
      };
    case 'playoff':
      return {
        type,
        threshold: 1,
        playerId,
        deadline,
        description: `${playerId} must help push the club into the playoffs for the clause to convert.`,
      };
    case 'performance':
    default:
      return {
        type: 'performance',
        threshold: context.playerRating >= 330 ? 5 : context.playerRating >= 290 ? 4 : 3,
        playerId,
        deadline,
        description: `${playerId} must hit the agreed performance bar before the deadline.`,
      };
  }
}

export function evaluateCondition(
  condition: TradeCondition,
  outcome: ConditionOutcome,
): boolean {
  return outcome.conditionMet && outcome.actualValue >= condition.threshold;
}

export function detectTradeCascades(
  completedTrade: CompletedTrade,
  pendingTrades: PendingTrade[],
): CascadeEvent[] {
  const movedPlayers = new Set(completedTrade.playerIds);

  return pendingTrades
    .filter((trade) => trade.requiredPlayerId != null && movedPlayers.has(trade.requiredPlayerId))
    .map((trade) => ({
      triggeredTradeId: trade.id,
      reason: `${trade.triggerCondition} failed after ${trade.requiredPlayerId} moved in season ${completedTrade.season}.`,
      affectedTeamIds: [completedTrade.fromTeamId, completedTrade.toTeamId],
    }));
}

export function generateMultiTeamTradeNarrative(
  rng: GameRNG,
  result: MultiTeamTradeResult,
): string {
  const teamSummary = result.teams.map((team) => {
    const leadPlayer = team.sending[0] ?? team.receiving[0] ?? 'player-to-be-named';
    return `${teamLabel(team.teamId)} via ${leadPlayer}`;
  }).join(', ');

  if (!result.accepted) {
    const rejectionLead = rng.weightedPick(
      ['The framework stalled.', 'The room never got all three teams over the line.'],
      [1, 1],
    );
    return `${rejectionLead} ${teamSummary}. ${result.blockReason ?? 'One club refused to sign off.'}`;
  }

  const acceptedLead = rng.weightedPick(
    ['Three front offices finally found common ground.', 'A three-club framework came together after the values settled.'],
    [1, 1],
  );
  return `${acceptedLead} ${teamSummary}.`;
}

export function proposeMultiTeamTrade(
  rng: GameRNG,
  proposal: MultiTeamProposal,
  valuations: Map<string, number>,
  gmPersonalities: Map<string, GMPersonality> = new Map(),
): MultiTeamTradeResult {
  const validationError = validateProposal(proposal);
  if (validationError) {
    const failed: MultiTeamTradeResult = {
      accepted: false,
      teams: proposal.teams,
      netValueByTeam: new Map(),
      narrative: '',
      blockReason: validationError,
    };
    return {
      ...failed,
      narrative: generateMultiTeamTradeNarrative(rng.fork(), failed),
    };
  }

  const totalTradeValue = Math.max(1, getUniqueTradeValue(proposal, valuations));
  const netValueByTeam = computeNetValueByTeam(proposal, valuations);

  for (const participant of proposal.teams) {
    const personality = gmPersonalities.get(participant.teamId) ?? assignGMPersonality(rng.fork(), participant.teamId);
    const tolerance = getRoleTolerance(participant.role, totalTradeValue) + getPersonalityAdjustment(personality, totalTradeValue);
    const netValue = netValueByTeam.get(participant.teamId) ?? 0;

    if (netValue < tolerance) {
      const blockReason = `${teamLabel(participant.teamId)} sees a ${Math.abs(netValue)}-point value gap as too steep.`;
      const rejected: MultiTeamTradeResult = {
        accepted: false,
        teams: proposal.teams,
        netValueByTeam,
        narrative: '',
        blockingTeamId: participant.teamId,
        blockReason,
      };
      return {
        ...rejected,
        narrative: generateMultiTeamTradeNarrative(rng.fork(), rejected),
      };
    }
  }

  const accepted: MultiTeamTradeResult = {
    accepted: true,
    teams: proposal.teams,
    netValueByTeam,
    narrative: '',
  };
  return {
    ...accepted,
    narrative: generateMultiTeamTradeNarrative(rng.fork(), accepted),
  };
}
