/**
 * @module leagueEvents
 * Deterministic league-wide narrative events for the Living League system.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { toDisplayRating } from '../player/attributes.js';
import { getTeamById } from '../league/teams.js';
import type { GMRelationship } from '../league/gmRelationships.js';
import { assignGMPersonality, type GMPersonality } from '../trade/tradeAI.js';
import {
  pickDebutPressLine,
  pickFarewellTourLine,
  resolveDebutPressBranch,
  resolveFarewellTourBranch,
} from './retirementProse.js';

export const EVENTS_PER_MONTH_MIN = 0;
export const EVENTS_PER_MONTH_MAX = 2;
export const MAX_EVENT_TEAMS = 3;
export const MAX_EVENT_PLAYERS = 2;
export const TRADE_DEADLINE_MONTH_START = 4;
export const TRADE_DEADLINE_MONTH_END = 5;
export const EARLY_SEASON_MONTH_END = 2;
export const LATE_SEASON_MONTH_START = 6;
export const BLOCKBUSTER_DEADLINE_BONUS = 16;
export const INJURY_DEADLINE_BONUS = 4;
export const GM_FIRING_DEADLINE_BONUS = 3;
export const PHENOM_DEBUT_EARLY_BONUS = 5;
export const RECORD_CHASE_LATE_BONUS = 6;
export const RETIREMENT_TOUR_LATE_BONUS = 3;
export const DEFAULT_TRADE_MARKET_SHIFT = 14;
export const DEFAULT_PROSPECT_MARKET_SHIFT = 12;
export const DEFAULT_SELLER_SIGNAL = 18;
export const DEFAULT_BUDGET_SHIFT = 20;
export const DEFAULT_REVENUE_SHIFT = 6;
export const DEFAULT_RETIREMENT_REVENUE_SHIFT = 8;
export const DEFAULT_IFA_INFLATION_SHIFT = 12;
export const DEFAULT_SCANDAL_PICKS_LOST = 2;
export const DEFAULT_EXPANSION_UNCERTAINTY = 10;
export const MONTHLY_EVENT_COUNT_WEIGHTS: Record<number, readonly number[]> = {
  1: [35, 45, 20],
  2: [30, 45, 25],
  3: [28, 47, 25],
  4: [24, 46, 30],
  5: [18, 47, 35],
  6: [22, 46, 32],
  7: [24, 48, 28],
};

export type LeagueEventType =
  | 'blockbuster_trade'
  | 'phenom_debut'
  | 'gm_firing'
  | 'injury_cascade'
  | 'ownership_change'
  | 'record_chase'
  | 'ifa_frenzy'
  | 'retirement_tour'
  | 'scandal'
  | 'expansion_rumors';

export interface LeagueEventTeamSnapshot {
  teamId: string;
  wins: number;
  losses: number;
  avgRating: number;
  starPlayerIds: string[];
  prospectPlayerIds: string[];
  agingStarPlayerIds: string[];
}

export interface LeagueEventContext {
  season: number;
  month: number;
  allTeams: LeagueEventTeamSnapshot[];
  playerPool: GeneratedPlayer[];
  userTeamId: string;
  currentRelationships: Map<string, GMRelationship>;
}

export interface TradeMarketShiftEffectData {
  kind: 'trade_market_shift';
  magnitude: number;
  positionGroup: GeneratedPlayer['position'];
}

export interface ProspectMarketShiftEffectData {
  kind: 'prospect_market_shift';
  magnitude: number;
}

export interface GMResetEffectData {
  kind: 'gm_reset';
  magnitude: number;
  newPersonality: GMPersonality;
}

export interface SellerSignalEffectData {
  kind: 'seller_signal';
  magnitude: number;
}

export interface BudgetShiftEffectData {
  kind: 'budget_shift';
  magnitude: number;
  budgetDeltaPct: number;
}

export interface RevenueShiftEffectData {
  kind: 'revenue_shift';
  magnitude: number;
  revenuePct: number;
}

export interface InternationalMarketShiftEffectData {
  kind: 'international_market_shift';
  magnitude: number;
  inflationPct: number;
}

export interface DraftPickPenaltyEffectData {
  kind: 'draft_pick_penalty';
  magnitude: number;
  picksLost: number;
}

export interface ExpansionUncertaintyEffectData {
  kind: 'expansion_uncertainty';
  magnitude: number;
  uncertaintyScore: number;
}

export type LeagueEventEffectData =
  | TradeMarketShiftEffectData
  | ProspectMarketShiftEffectData
  | GMResetEffectData
  | SellerSignalEffectData
  | BudgetShiftEffectData
  | RevenueShiftEffectData
  | InternationalMarketShiftEffectData
  | DraftPickPenaltyEffectData
  | ExpansionUncertaintyEffectData;

export interface LeagueEvent {
  type: LeagueEventType;
  season: number;
  month: number;
  teamIds: string[];
  playerIds: string[];
  headline: string;
  description: string;
  gameplayEffect: string | null;
  effectData: LeagueEventEffectData;
}

interface BaseRippleEffect {
  magnitude: number;
  description: string;
}

export interface TradeMarketShiftRippleEffect extends BaseRippleEffect {
  type: 'trade_market_shift';
  teamIds: string[];
  positionGroup: GeneratedPlayer['position'];
}

export interface ProspectMarketShiftRippleEffect extends BaseRippleEffect {
  type: 'prospect_market_shift';
  teamId: string;
  playerIds: string[];
}

export interface GMResetRippleEffect extends BaseRippleEffect {
  type: 'gm_reset';
  teamId: string;
  resetRelationshipScore: number;
  newPersonality: GMPersonality;
}

export interface SellerSignalRippleEffect extends BaseRippleEffect {
  type: 'seller_signal';
  teamId: string;
  playerIds: string[];
}

export interface BudgetShiftRippleEffect extends BaseRippleEffect {
  type: 'budget_shift';
  teamId: string;
  budgetDeltaPct: number;
}

export interface DraftPickPenaltyRippleEffect extends BaseRippleEffect {
  type: 'draft_pick_penalty';
  teamId: string;
  picksLost: number;
}

export interface InternationalMarketShiftRippleEffect extends BaseRippleEffect {
  type: 'international_market_shift';
  teamIds: string[];
  inflationPct: number;
}

export interface RevenueShiftRippleEffect extends BaseRippleEffect {
  type: 'revenue_shift';
  teamId: string;
  revenuePct: number;
  userTeamId: string;
}

export interface ExpansionUncertaintyRippleEffect extends BaseRippleEffect {
  type: 'expansion_uncertainty';
  teamIds: string[];
  uncertaintyScore: number;
}

export type RippleEffect =
  | TradeMarketShiftRippleEffect
  | ProspectMarketShiftRippleEffect
  | GMResetRippleEffect
  | SellerSignalRippleEffect
  | BudgetShiftRippleEffect
  | DraftPickPenaltyRippleEffect
  | InternationalMarketShiftRippleEffect
  | RevenueShiftRippleEffect
  | ExpansionUncertaintyRippleEffect;

export const EVENT_WEIGHTS: Record<LeagueEventType, number> = {
  blockbuster_trade: 8,
  phenom_debut: 7,
  gm_firing: 4,
  injury_cascade: 6,
  ownership_change: 3,
  record_chase: 6,
  ifa_frenzy: 4,
  retirement_tour: 3,
  scandal: 2,
  expansion_rumors: 1,
};

function getTeamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function getTeamCity(teamId: string): string {
  return getTeamById(teamId)?.city ?? teamId.toUpperCase();
}

function getTeamNickname(teamId: string): string {
  return getTeamById(teamId)?.name ?? teamId.toUpperCase();
}

function getEventCountWeights(month: number): readonly number[] {
  return MONTHLY_EVENT_COUNT_WEIGHTS[month] ?? MONTHLY_EVENT_COUNT_WEIGHTS[4]!;
}

function getAdjustedEventWeights(month: number): Record<LeagueEventType, number> {
  const adjusted = { ...EVENT_WEIGHTS };

  if (month <= EARLY_SEASON_MONTH_END) {
    adjusted.phenom_debut += PHENOM_DEBUT_EARLY_BONUS;
  }

  if (month >= TRADE_DEADLINE_MONTH_START && month <= TRADE_DEADLINE_MONTH_END) {
    adjusted.blockbuster_trade += BLOCKBUSTER_DEADLINE_BONUS;
    adjusted.injury_cascade += INJURY_DEADLINE_BONUS;
    adjusted.gm_firing += GM_FIRING_DEADLINE_BONUS;
  }

  if (month >= LATE_SEASON_MONTH_START) {
    adjusted.record_chase += RECORD_CHASE_LATE_BONUS;
    adjusted.retirement_tour += RETIREMENT_TOUR_LATE_BONUS;
  }

  return adjusted;
}

function buildPlayerMap(players: readonly GeneratedPlayer[]): Map<string, GeneratedPlayer> {
  return new Map(players.map((player) => [player.id, player]));
}

function getPlayerById(playerMap: Map<string, GeneratedPlayer>, playerId: string): GeneratedPlayer | undefined {
  return playerMap.get(playerId);
}

function playerFullName(player: GeneratedPlayer): string {
  return `${player.firstName} ${player.lastName}`;
}

function pickRandomTeam(
  rng: GameRNG,
  teams: readonly LeagueEventTeamSnapshot[],
  excludedTeamIds: ReadonlySet<string>,
): LeagueEventTeamSnapshot | null {
  const candidates = teams.filter((team) => !excludedTeamIds.has(team.teamId));
  if (candidates.length === 0) {
    return null;
  }
  return candidates[rng.nextInt(0, candidates.length - 1)] ?? null;
}

function pickTeams(
  rng: GameRNG,
  teams: readonly LeagueEventTeamSnapshot[],
  count: number,
  excludedTeamIds: ReadonlySet<string>,
): LeagueEventTeamSnapshot[] {
  const candidates = rng.shuffle(teams.filter((team) => !excludedTeamIds.has(team.teamId)));
  return candidates.slice(0, Math.min(count, MAX_EVENT_TEAMS));
}

function getTeamPlayers(playerPool: readonly GeneratedPlayer[], teamId: string): GeneratedPlayer[] {
  return playerPool.filter((player) => player.teamId === teamId);
}

function pickPlayerByIds(
  rng: GameRNG,
  playerIds: readonly string[],
  playerMap: Map<string, GeneratedPlayer>,
): GeneratedPlayer | null {
  const players = playerIds
    .map((playerId) => getPlayerById(playerMap, playerId))
    .filter((player): player is GeneratedPlayer => player !== undefined);

  if (players.length === 0) {
    return null;
  }

  return players[rng.nextInt(0, players.length - 1)] ?? null;
}

function pickHighestRatedPlayer(
  playerIds: readonly string[],
  playerMap: Map<string, GeneratedPlayer>,
): GeneratedPlayer | null {
  const players = playerIds
    .map((playerId) => getPlayerById(playerMap, playerId))
    .filter((player): player is GeneratedPlayer => player !== undefined)
    .sort((left, right) => right.overallRating - left.overallRating || left.id.localeCompare(right.id));

  return players[0] ?? null;
}

function pickFallbackStar(
  rng: GameRNG,
  snapshot: LeagueEventTeamSnapshot,
  playerPool: readonly GeneratedPlayer[],
): GeneratedPlayer | null {
  const teamPlayers = getTeamPlayers(playerPool, snapshot.teamId)
    .filter((player) => player.rosterStatus === 'MLB')
    .sort((left, right) => right.overallRating - left.overallRating || left.id.localeCompare(right.id));

  if (teamPlayers.length === 0) {
    return null;
  }

  return teamPlayers[Math.min(rng.nextInt(0, Math.min(teamPlayers.length, MAX_EVENT_PLAYERS) - 1), teamPlayers.length - 1)] ?? null;
}

function pickProspect(
  snapshot: LeagueEventTeamSnapshot,
  playerMap: Map<string, GeneratedPlayer>,
): GeneratedPlayer | null {
  const prospect = pickHighestRatedPlayer(snapshot.prospectPlayerIds, playerMap);
  if (prospect) {
    return prospect;
  }

  const fallback = Array.from(playerMap.values())
    .filter((player) => player.teamId === snapshot.teamId && player.rosterStatus !== 'MLB')
    .sort((left, right) => {
      const leftPotential = left.potentialRating ?? left.ceiling ?? left.overallRating;
      const rightPotential = right.potentialRating ?? right.ceiling ?? right.overallRating;
      return rightPotential - leftPotential || left.id.localeCompare(right.id);
    });

  return fallback[0] ?? null;
}

function pickWeightedTeamByScore(
  rng: GameRNG,
  teams: readonly LeagueEventTeamSnapshot[],
  score: (team: LeagueEventTeamSnapshot) => number,
): LeagueEventTeamSnapshot | null {
  if (teams.length === 0) {
    return null;
  }

  const weights = teams.map((team) => Math.max(1, score(team)));
  return rng.weightedPick(teams, weights);
}

function pickAgingStar(
  snapshot: LeagueEventTeamSnapshot,
  playerMap: Map<string, GeneratedPlayer>,
): GeneratedPlayer | null {
  const agingStar = pickHighestRatedPlayer(snapshot.agingStarPlayerIds, playerMap);
  if (agingStar) {
    return agingStar;
  }

  const fallback = Array.from(playerMap.values())
    .filter((player) => player.teamId === snapshot.teamId && player.rosterStatus === 'MLB' && player.age >= 35)
    .sort((left, right) => right.overallRating - left.overallRating || left.id.localeCompare(right.id));

  return fallback[0] ?? null;
}

function getEventHeadline(type: LeagueEventType, teamIds: readonly string[]): string {
  const primaryTeam = getTeamDisplayName(teamIds[0] ?? '???');
  const secondaryTeam = getTeamDisplayName(teamIds[1] ?? teamIds[0] ?? '???');

  switch (type) {
    case 'blockbuster_trade':
      return `${primaryTeam} and ${secondaryTeam} detonate the market`;
    case 'phenom_debut':
      return `${primaryTeam} fast-tracks a phenom`;
    case 'gm_firing':
      return `${primaryTeam} resets the front office`;
    case 'injury_cascade':
      return `${primaryTeam} loses a cornerstone piece`;
    case 'ownership_change':
      return `${primaryTeam} changes ownership hands`;
    case 'record_chase':
      return `${primaryTeam} has a player chasing history`;
    case 'ifa_frenzy':
      return `${primaryTeam} helps ignite an IFA frenzy`;
    case 'retirement_tour':
      return `${primaryTeam} begins a retirement tour`;
    case 'scandal':
      return `${primaryTeam} is dragged into scandal`;
    case 'expansion_rumors':
      return `${primaryTeam} is pulled into expansion rumors`;
  }
}

function getEventGameplayEffect(eventType: LeagueEventType, teamIds: readonly string[]): string {
  const primaryCity = getTeamCity(teamIds[0] ?? '???');

  switch (eventType) {
    case 'blockbuster_trade':
      return 'Star availability at that position just tightened across the league.';
    case 'phenom_debut':
      return 'Comparable prospects just got more expensive in trade talks.';
    case 'gm_firing':
      return `${primaryCity}'s relationship slate is effectively reset with a new GM in place.`;
    case 'injury_cascade':
      return `${primaryCity} is far more likely to behave like a deadline seller.`;
    case 'ownership_change':
      return 'Budget assumptions changed for the next free-agent cycle.';
    case 'record_chase':
      return 'League attention and gate pressure are rising around the chase.';
    case 'ifa_frenzy':
      return 'International signing prices are climbing across the market.';
    case 'retirement_tour':
      return 'Road revenue gets a bump whenever the tour comes to town.';
    case 'scandal':
      return 'Future draft capital and competitive balance are shifting.';
    case 'expansion_rumors':
      return 'Long-term market planning just became noisier for everyone.';
  }
}

function describeTradeEvent(teamIds: readonly string[], playerIds: readonly string[], playerMap: Map<string, GeneratedPlayer>): string {
  const leftTeam = getTeamDisplayName(teamIds[0] ?? '???');
  const rightTeam = getTeamDisplayName(teamIds[1] ?? '???');
  const leftPlayer = getPlayerById(playerMap, playerIds[0] ?? '');
  const rightPlayer = getPlayerById(playerMap, playerIds[1] ?? '');
  const leftName = leftPlayer ? `${leftPlayer.firstName} ${leftPlayer.lastName}` : 'a star shortstop';
  const rightName = rightPlayer ? `${rightPlayer.firstName} ${rightPlayer.lastName}` : 'another headliner';

  return `${leftTeam} and ${rightTeam} swapped ${leftName} for ${rightName}, thinning the deadline board in a hurry.`;
}

function buildEventDescription(eventType: LeagueEventType, teamIds: readonly string[], playerIds: readonly string[], playerMap: Map<string, GeneratedPlayer>): string {
  const primaryTeam = getTeamDisplayName(teamIds[0] ?? '???');
  const secondaryTeam = getTeamDisplayName(teamIds[1] ?? teamIds[0] ?? '???');
  const firstPlayer = getPlayerById(playerMap, playerIds[0] ?? '');
  const fullName = firstPlayer ? `${firstPlayer.firstName} ${firstPlayer.lastName}` : 'their headliner';

  switch (eventType) {
    case 'blockbuster_trade':
      return describeTradeEvent(teamIds, playerIds, playerMap);
    case 'phenom_debut':
      return `${primaryTeam} promoted ${fullName} ahead of schedule, and rival GMs immediately started pricing up similar prospects.`;
    case 'gm_firing':
      return `${primaryTeam} pulled the plug on its front office after a bad stretch, clearing the table for a new negotiating style.`;
    case 'injury_cascade':
      return `${primaryTeam} lost ${fullName} to a major injury, and the rest of the league is already reading the club as a possible seller.`;
    case 'ownership_change':
      return `${primaryTeam} has a new ownership mandate, which could swing spending habits and roster aggression in either direction.`;
    case 'record_chase':
      return `${fullName} has ${primaryTeam} in the middle of a record chase, turning every series into a league-wide watch.`;
    case 'ifa_frenzy':
      return `${primaryTeam}, ${secondaryTeam}, and other clubs pushed the international market into a more expensive tier overnight.`;
    case 'retirement_tour':
      return `${fullName} announced one final lap with ${primaryTeam}, creating a clear gate and atmosphere bump wherever the club travels.`;
    case 'scandal':
      return `${primaryTeam} was hit by a cheating scandal severe enough to cloud its draft outlook and competitive standing.`;
    case 'expansion_rumors':
      return `${primaryTeam} and ${secondaryTeam} are at the center of new expansion noise, raising questions about long-term market planning.`;
  }
}

function buildPhenomDebutDescription(context: LeagueEventContext, selectedTeam: LeagueEventTeamSnapshot, prospect: GeneratedPlayer): string {
  const teamName = getTeamDisplayName(selectedTeam.teamId);
  const branch = resolveDebutPressBranch({
    age: prospect.age,
    previousLevel: prospect.rosterStatus,
    topProspect: (prospect.potentialRating ?? prospect.ceiling ?? prospect.overallRating) >= 260,
  });

  return pickDebutPressLine({
    playerId: prospect.id,
    playerName: playerFullName(prospect),
    teamName,
    season: context.season,
    branch,
    age: prospect.age,
    previousLevel: prospect.rosterStatus,
    topProspect: (prospect.potentialRating ?? prospect.ceiling ?? prospect.overallRating) >= 260,
  });
}

function buildRetirementTourDescription(context: LeagueEventContext, selectedTeam: LeagueEventTeamSnapshot, legend: GeneratedPlayer): string {
  const teamName = getTeamDisplayName(selectedTeam.teamId);
  const overallRating = toDisplayRating(legend.overallRating);
  const branch = resolveFarewellTourBranch({
    wins: selectedTeam.wins,
    losses: selectedTeam.losses,
    leadership: legend.personality.leadership,
    overallRating,
  });

  return pickFarewellTourLine({
    playerId: legend.id,
    playerName: playerFullName(legend),
    teamName,
    season: context.season,
    branch,
    wins: selectedTeam.wins,
    losses: selectedTeam.losses,
    leadership: legend.personality.leadership,
    overallRating,
  });
}

function rollEventCount(rng: GameRNG, month: number): number {
  const options = [EVENTS_PER_MONTH_MIN, 1, EVENTS_PER_MONTH_MAX] as const;
  return rng.weightedPick(options, getEventCountWeights(month));
}

function getWeightedEventType(
  rng: GameRNG,
  month: number,
  excludedTypes: ReadonlySet<LeagueEventType>,
): LeagueEventType {
  const adjusted = getAdjustedEventWeights(month);
  const availableTypes = (Object.keys(adjusted) as LeagueEventType[])
    .filter((type) => !excludedTypes.has(type));
  const weights = availableTypes.map((type) => adjusted[type]);
  return rng.weightedPick(availableTypes, weights);
}

function createTradeEvent(rng: GameRNG, context: LeagueEventContext, playerMap: Map<string, GeneratedPlayer>): LeagueEvent | null {
  const teams = context.allTeams.filter((team) => team.teamId !== context.userTeamId);
  const candidateTeams = teams.filter((team) => team.starPlayerIds.length > 0 || getTeamPlayers(context.playerPool, team.teamId).length > 0);
  if (candidateTeams.length < 2) {
    return null;
  }

  const selectedTeams = pickTeams(rng, candidateTeams, 2, new Set());
  if (selectedTeams.length < 2) {
    return null;
  }

  const leftTeam = selectedTeams[0];
  const rightTeam = selectedTeams[1];
  if (!leftTeam || !rightTeam) {
    return null;
  }

  const leftPlayer = pickPlayerByIds(rng, leftTeam.starPlayerIds, playerMap)
    ?? pickFallbackStar(rng, leftTeam, context.playerPool);
  const rightPlayer = pickPlayerByIds(rng, rightTeam.starPlayerIds, playerMap)
    ?? pickFallbackStar(rng, rightTeam, context.playerPool);
  if (!leftPlayer || !rightPlayer) {
    return null;
  }

  const positionGroup = leftPlayer.position;
  const teamIds = [leftTeam.teamId, rightTeam.teamId];
  return {
    type: 'blockbuster_trade',
    season: context.season,
    month: context.month,
    teamIds,
    playerIds: [leftPlayer.id, rightPlayer.id],
    headline: getEventHeadline('blockbuster_trade', teamIds),
    description: buildEventDescription('blockbuster_trade', teamIds, [leftPlayer.id, rightPlayer.id], playerMap),
    gameplayEffect: getEventGameplayEffect('blockbuster_trade', teamIds),
    effectData: {
      kind: 'trade_market_shift',
      magnitude: DEFAULT_TRADE_MARKET_SHIFT,
      positionGroup,
    },
  };
}

function createPhenomDebutEvent(rng: GameRNG, context: LeagueEventContext, playerMap: Map<string, GeneratedPlayer>): LeagueEvent | null {
  const candidateTeams = context.allTeams.filter(
    (team) => team.teamId !== context.userTeamId && team.prospectPlayerIds.length > 0,
  );
  const selectedTeam = pickWeightedTeamByScore(
    rng,
    candidateTeams,
    (team) => team.prospectPlayerIds.length * DEFAULT_PROSPECT_MARKET_SHIFT + team.avgRating,
  );
  if (!selectedTeam) {
    return null;
  }

  const prospect = pickProspect(selectedTeam, playerMap);
  if (!prospect) {
    return null;
  }

  return {
    type: 'phenom_debut',
    season: context.season,
    month: context.month,
    teamIds: [selectedTeam.teamId],
    playerIds: [prospect.id],
    headline: getEventHeadline('phenom_debut', [selectedTeam.teamId]),
    description: buildPhenomDebutDescription(context, selectedTeam, prospect),
    gameplayEffect: getEventGameplayEffect('phenom_debut', [selectedTeam.teamId]),
    effectData: {
      kind: 'prospect_market_shift',
      magnitude: DEFAULT_PROSPECT_MARKET_SHIFT,
    },
  };
}

function createGMFiringEvent(rng: GameRNG, context: LeagueEventContext): LeagueEvent | null {
  const candidateTeams = context.allTeams.filter((team) => team.teamId !== context.userTeamId);
  const selectedTeam = pickWeightedTeamByScore(
    rng,
    candidateTeams,
    (team) => team.losses - team.wins + Math.max(0, 90 - team.avgRating),
  );

  if (!selectedTeam) {
    return null;
  }

  return {
    type: 'gm_firing',
    season: context.season,
    month: context.month,
    teamIds: [selectedTeam.teamId],
    playerIds: [],
    headline: getEventHeadline('gm_firing', [selectedTeam.teamId]),
    description: buildEventDescription('gm_firing', [selectedTeam.teamId], [], new Map()),
    gameplayEffect: getEventGameplayEffect('gm_firing', [selectedTeam.teamId]),
    effectData: {
      kind: 'gm_reset',
      magnitude: 0,
      newPersonality: assignGMPersonality(rng.fork(), selectedTeam.teamId),
    },
  };
}

function createInjuryCascadeEvent(rng: GameRNG, context: LeagueEventContext, playerMap: Map<string, GeneratedPlayer>): LeagueEvent | null {
  const selectedTeam = pickRandomTeam(
    rng,
    context.allTeams.filter((team) => team.teamId !== context.userTeamId && team.starPlayerIds.length > 0),
    new Set(),
  );
  if (!selectedTeam) {
    return null;
  }

  const injuredPlayer = pickPlayerByIds(rng, selectedTeam.starPlayerIds, playerMap);
  if (!injuredPlayer) {
    return null;
  }

  return {
    type: 'injury_cascade',
    season: context.season,
    month: context.month,
    teamIds: [selectedTeam.teamId],
    playerIds: [injuredPlayer.id],
    headline: getEventHeadline('injury_cascade', [selectedTeam.teamId]),
    description: buildEventDescription('injury_cascade', [selectedTeam.teamId], [injuredPlayer.id], playerMap),
    gameplayEffect: getEventGameplayEffect('injury_cascade', [selectedTeam.teamId]),
    effectData: {
      kind: 'seller_signal',
      magnitude: DEFAULT_SELLER_SIGNAL,
    },
  };
}

function createOwnershipChangeEvent(rng: GameRNG, context: LeagueEventContext): LeagueEvent | null {
  const selectedTeam = pickRandomTeam(
    rng,
    context.allTeams.filter((team) => team.teamId !== context.userTeamId),
    new Set(),
  );
  if (!selectedTeam) {
    return null;
  }

  const direction = rng.nextInt(0, 1) === 0 ? -1 : 1;
  const budgetDeltaPct = direction * rng.nextInt(15, 30);
  return {
    type: 'ownership_change',
    season: context.season,
    month: context.month,
    teamIds: [selectedTeam.teamId],
    playerIds: [],
    headline: getEventHeadline('ownership_change', [selectedTeam.teamId]),
    description: buildEventDescription('ownership_change', [selectedTeam.teamId], [], new Map()),
    gameplayEffect: getEventGameplayEffect('ownership_change', [selectedTeam.teamId]),
    effectData: {
      kind: 'budget_shift',
      magnitude: Math.abs(budgetDeltaPct),
      budgetDeltaPct,
    },
  };
}

function createRecordChaseEvent(rng: GameRNG, context: LeagueEventContext, playerMap: Map<string, GeneratedPlayer>): LeagueEvent | null {
  const selectedTeam = pickRandomTeam(
    rng,
    context.allTeams.filter((team) => team.teamId !== context.userTeamId && team.starPlayerIds.length > 0),
    new Set(),
  );
  if (!selectedTeam) {
    return null;
  }

  const chasingPlayer = pickHighestRatedPlayer(selectedTeam.starPlayerIds, playerMap);
  if (!chasingPlayer) {
    return null;
  }

  return {
    type: 'record_chase',
    season: context.season,
    month: context.month,
    teamIds: [selectedTeam.teamId],
    playerIds: [chasingPlayer.id],
    headline: getEventHeadline('record_chase', [selectedTeam.teamId]),
    description: buildEventDescription('record_chase', [selectedTeam.teamId], [chasingPlayer.id], playerMap),
    gameplayEffect: getEventGameplayEffect('record_chase', [selectedTeam.teamId]),
    effectData: {
      kind: 'revenue_shift',
      magnitude: DEFAULT_REVENUE_SHIFT,
      revenuePct: DEFAULT_REVENUE_SHIFT,
    },
  };
}

function createIFAFrenzyEvent(rng: GameRNG, context: LeagueEventContext): LeagueEvent | null {
  const selectedTeams = pickTeams(
    rng,
    context.allTeams.filter((team) => team.teamId !== context.userTeamId),
    3,
    new Set(),
  );
  if (selectedTeams.length < 2) {
    return null;
  }

  const teamIds = selectedTeams.map((team) => team.teamId);
  return {
    type: 'ifa_frenzy',
    season: context.season,
    month: context.month,
    teamIds,
    playerIds: [],
    headline: getEventHeadline('ifa_frenzy', teamIds),
    description: buildEventDescription('ifa_frenzy', teamIds, [], new Map()),
    gameplayEffect: getEventGameplayEffect('ifa_frenzy', teamIds),
    effectData: {
      kind: 'international_market_shift',
      magnitude: DEFAULT_IFA_INFLATION_SHIFT,
      inflationPct: DEFAULT_IFA_INFLATION_SHIFT,
    },
  };
}

function createRetirementTourEvent(rng: GameRNG, context: LeagueEventContext, playerMap: Map<string, GeneratedPlayer>): LeagueEvent | null {
  const candidateTeams = context.allTeams.filter(
    (team) => team.teamId !== context.userTeamId && team.agingStarPlayerIds.length > 0,
  );
  const selectedTeam = pickWeightedTeamByScore(
    rng,
    candidateTeams,
    (team) => team.agingStarPlayerIds.length * DEFAULT_RETIREMENT_REVENUE_SHIFT + team.avgRating,
  );
  if (!selectedTeam) {
    return null;
  }

  const legend = pickAgingStar(selectedTeam, playerMap);
  if (!legend) {
    return null;
  }

  return {
    type: 'retirement_tour',
    season: context.season,
    month: context.month,
    teamIds: [selectedTeam.teamId],
    playerIds: [legend.id],
    headline: getEventHeadline('retirement_tour', [selectedTeam.teamId]),
    description: buildRetirementTourDescription(context, selectedTeam, legend),
    gameplayEffect: getEventGameplayEffect('retirement_tour', [selectedTeam.teamId]),
    effectData: {
      kind: 'revenue_shift',
      magnitude: DEFAULT_RETIREMENT_REVENUE_SHIFT,
      revenuePct: DEFAULT_RETIREMENT_REVENUE_SHIFT,
    },
  };
}

function createScandalEvent(rng: GameRNG, context: LeagueEventContext): LeagueEvent | null {
  const selectedTeam = pickRandomTeam(
    rng,
    context.allTeams.filter((team) => team.teamId !== context.userTeamId),
    new Set(),
  );
  if (!selectedTeam) {
    return null;
  }

  return {
    type: 'scandal',
    season: context.season,
    month: context.month,
    teamIds: [selectedTeam.teamId],
    playerIds: [],
    headline: getEventHeadline('scandal', [selectedTeam.teamId]),
    description: buildEventDescription('scandal', [selectedTeam.teamId], [], new Map()),
    gameplayEffect: getEventGameplayEffect('scandal', [selectedTeam.teamId]),
    effectData: {
      kind: 'draft_pick_penalty',
      magnitude: DEFAULT_SCANDAL_PICKS_LOST,
      picksLost: DEFAULT_SCANDAL_PICKS_LOST,
    },
  };
}

function createExpansionRumorEvent(rng: GameRNG, context: LeagueEventContext): LeagueEvent | null {
  const selectedTeams = pickTeams(
    rng,
    context.allTeams.filter((team) => team.teamId !== context.userTeamId),
    2,
    new Set(),
  );
  if (selectedTeams.length < 2) {
    return null;
  }

  const teamIds = selectedTeams.map((team) => team.teamId);
  return {
    type: 'expansion_rumors',
    season: context.season,
    month: context.month,
    teamIds,
    playerIds: [],
    headline: getEventHeadline('expansion_rumors', teamIds),
    description: buildEventDescription('expansion_rumors', teamIds, [], new Map()),
    gameplayEffect: getEventGameplayEffect('expansion_rumors', teamIds),
    effectData: {
      kind: 'expansion_uncertainty',
      magnitude: DEFAULT_EXPANSION_UNCERTAINTY,
      uncertaintyScore: DEFAULT_EXPANSION_UNCERTAINTY,
    },
  };
}

function createEventByType(
  rng: GameRNG,
  type: LeagueEventType,
  context: LeagueEventContext,
  playerMap: Map<string, GeneratedPlayer>,
): LeagueEvent | null {
  switch (type) {
    case 'blockbuster_trade':
      return createTradeEvent(rng, context, playerMap);
    case 'phenom_debut':
      return createPhenomDebutEvent(rng, context, playerMap);
    case 'gm_firing':
      return createGMFiringEvent(rng, context);
    case 'injury_cascade':
      return createInjuryCascadeEvent(rng, context, playerMap);
    case 'ownership_change':
      return createOwnershipChangeEvent(rng, context);
    case 'record_chase':
      return createRecordChaseEvent(rng, context, playerMap);
    case 'ifa_frenzy':
      return createIFAFrenzyEvent(rng, context);
    case 'retirement_tour':
      return createRetirementTourEvent(rng, context, playerMap);
    case 'scandal':
      return createScandalEvent(rng, context);
    case 'expansion_rumors':
      return createExpansionRumorEvent(rng, context);
  }
}

export function generateMonthlyLeagueEvents(rng: GameRNG, context: LeagueEventContext): LeagueEvent[] {
  const eventCount = rollEventCount(rng, context.month);
  const playerMap = buildPlayerMap(context.playerPool);
  const selectedTypes = new Set<LeagueEventType>();
  const events: LeagueEvent[] = [];

  while (events.length < eventCount && selectedTypes.size < Object.keys(EVENT_WEIGHTS).length) {
    const eventType = getWeightedEventType(rng, context.month, selectedTypes);
    selectedTypes.add(eventType);
    const event = createEventByType(rng, eventType, context, playerMap);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

export function evaluateEventRippleEffects(event: LeagueEvent, userTeamId: string): RippleEffect[] {
  const primaryTeamId = event.teamIds[0] ?? '???';
  const primaryTeamName = getTeamDisplayName(primaryTeamId);

  switch (event.effectData.kind) {
    case 'trade_market_shift':
      return [{
        type: 'trade_market_shift',
        teamIds: event.teamIds,
        positionGroup: event.effectData.positionGroup,
        magnitude: event.effectData.magnitude,
        description: `${primaryTeamName}'s blockbuster tightened the ${event.effectData.positionGroup} market for everyone else.`,
      }];
    case 'prospect_market_shift':
      return [{
        type: 'prospect_market_shift',
        teamId: primaryTeamId,
        playerIds: event.playerIds,
        magnitude: event.effectData.magnitude,
        description: `${primaryTeamName}'s promotion raised the asking price on comparable prospects.`,
      }];
    case 'gm_reset':
      return [{
        type: 'gm_reset',
        teamId: primaryTeamId,
        resetRelationshipScore: 0,
        newPersonality: event.effectData.newPersonality,
        magnitude: event.effectData.magnitude,
        description: `${primaryTeamName} has a new GM and a reset relationship baseline.`,
      }];
    case 'seller_signal':
      return [{
        type: 'seller_signal',
        teamId: primaryTeamId,
        playerIds: event.playerIds,
        magnitude: event.effectData.magnitude,
        description: `${primaryTeamName} now looks far more likely to sell before the deadline.`,
      }];
    case 'budget_shift':
      return [{
        type: 'budget_shift',
        teamId: primaryTeamId,
        budgetDeltaPct: event.effectData.budgetDeltaPct,
        magnitude: event.effectData.magnitude,
        description: `${primaryTeamName}'s budget outlook shifted by ${event.effectData.budgetDeltaPct}% after the ownership change.`,
      }];
    case 'revenue_shift':
      return [{
        type: 'revenue_shift',
        teamId: primaryTeamId,
        revenuePct: event.effectData.revenuePct,
        userTeamId,
        magnitude: event.effectData.magnitude,
        description: `${primaryTeamName}'s storyline should move gate interest by ${event.effectData.revenuePct}% when it intersects with ${getTeamNickname(userTeamId)} business.`,
      }];
    case 'international_market_shift':
      return [{
        type: 'international_market_shift',
        teamIds: event.teamIds,
        inflationPct: event.effectData.inflationPct,
        magnitude: event.effectData.magnitude,
        description: `International prices are up ${event.effectData.inflationPct}% after aggressive spending from ${primaryTeamName} and others.`,
      }];
    case 'draft_pick_penalty':
      return [{
        type: 'draft_pick_penalty',
        teamId: primaryTeamId,
        picksLost: event.effectData.picksLost,
        magnitude: event.effectData.magnitude,
        description: `${primaryTeamName} lost ${event.effectData.picksLost} draft picks, which will ripple through future talent distribution.`,
      }];
    case 'expansion_uncertainty':
      return [{
        type: 'expansion_uncertainty',
        teamIds: event.teamIds,
        uncertaintyScore: event.effectData.uncertaintyScore,
        magnitude: event.effectData.magnitude,
        description: `Expansion chatter tied to ${primaryTeamName} raised long-term uncertainty across the league.`,
      }];
  }
}

export function generateLeagueEventNarrative(rng: GameRNG, event: LeagueEvent): string {
  const teamNames = event.teamIds.map((teamId) => getTeamDisplayName(teamId));
  const leadTeam = teamNames[0] ?? 'the league';
  const supportTeam = teamNames[1] ?? leadTeam;
  const flavorIndex = rng.nextInt(0, 1);

  switch (event.type) {
    case 'blockbuster_trade':
      return flavorIndex === 0
        ? `${leadTeam} and ${supportTeam} just changed the board. ${event.description}`
        : `${event.headline}. ${leadTeam} forced the rest of the league to rethink the market overnight.`;
    case 'phenom_debut':
      return flavorIndex === 0
        ? `${leadTeam} made the call. ${event.description}`
        : `${event.headline}. ${event.description}`;
    case 'gm_firing':
      return flavorIndex === 0
        ? `${event.headline}. ${leadTeam} is starting over and every relationship with that front office just got less certain.`
        : `${leadTeam} cleaned out the front office. ${event.description}`;
    case 'injury_cascade':
      return flavorIndex === 0
        ? `${event.headline}. ${event.description}`
        : `${leadTeam} took the kind of hit that changes deadline plans fast. ${event.description}`;
    case 'ownership_change':
      return flavorIndex === 0
        ? `${event.headline}. ${event.description}`
        : `${leadTeam} now answers to a different ownership mandate, and the rest of the market will feel it.`;
    case 'record_chase':
      return flavorIndex === 0
        ? `${event.headline}. ${event.description}`
        : `${leadTeam} is suddenly carrying a league-wide record watch. ${event.description}`;
    case 'ifa_frenzy':
      return flavorIndex === 0
        ? `${event.headline}. ${event.description}`
        : `${leadTeam} helped turn the international market into a bidding sprint. ${event.description}`;
    case 'retirement_tour':
      return flavorIndex === 0
        ? `${event.headline}. ${event.description}`
        : `${leadTeam} gets one last tour with a franchise icon. ${event.description}`;
    case 'scandal':
      return flavorIndex === 0
        ? `${event.headline}. ${event.description}`
        : `${leadTeam} is dealing with fallout that will reach well beyond this season. ${event.description}`;
    case 'expansion_rumors':
      return flavorIndex === 0
        ? `${event.headline}. ${event.description}`
        : `${leadTeam} and ${supportTeam} are back in the expansion rumor cycle, and nobody is sure where it ends.`;
  }
}
