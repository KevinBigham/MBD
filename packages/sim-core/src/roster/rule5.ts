/**
 * @module rule5
 * Core Rule 5 Draft state and eligibility helpers.
 * Pure engine code — no React, no DOM, no ambient randomness.
 */

import { FORTY_MAN_LIMIT } from '../player/enums.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { RosterState } from './rosterManager.js';

export interface Rule5EligiblePlayer {
  playerId: string;
  teamId: string;
  playerName: string;
  position: string;
  age: number;
  overallRating: number;
  rosterStatus: GeneratedPlayer['rosterStatus'];
  rule5EligibleAfterSeason: number;
}

export interface Rule5Selection {
  playerId: string;
  playerName: string;
  originalTeamId: string;
  draftingTeamId: string;
  overallPick: number;
  round: number;
}

export interface Rule5Obligation {
  playerId: string;
  originalTeamId: string;
  draftingTeamId: string;
  draftedAfterSeason: number;
  status: 'active' | 'returned' | 'cleared';
}

export interface Rule5OfferBackState {
  playerId: string;
  originalTeamId: string;
  draftingTeamId: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Rule5SessionState {
  season: number;
  phase: 'protection_audit' | 'rule5_draft' | 'complete';
  draftOrder: string[];
  currentTeamIndex: number;
  consecutivePasses: number;
  protectedPlayerIdsByTeam: Record<string, string[]>;
  candidatePlayers: Rule5EligiblePlayer[];
  eligiblePlayers: Rule5EligiblePlayer[];
  selections: Rule5Selection[];
  obligations: Rule5Obligation[];
  offerBackStates: Rule5OfferBackState[];
}

export interface Rule5ActionResult {
  success: boolean;
  session: Rule5SessionState;
  error?: string;
}

export interface CreateRule5SessionArgs {
  season: number;
  draftOrder: string[];
  players: GeneratedPlayer[];
  rosterStates: Map<string, RosterState>;
}

const BACKFILL_BASE_YEARS: Record<GeneratedPlayer['rosterStatus'], number> = {
  MLB: 6,
  AAA: 4,
  AA: 3,
  A_PLUS: 2,
  A: 1,
  ROOKIE: 1,
  INTERNATIONAL: 1,
};

const BACKFILL_TYPICAL_MAX_AGE: Record<GeneratedPlayer['rosterStatus'], number> = {
  MLB: 28,
  AAA: 24,
  AA: 22,
  A_PLUS: 21,
  A: 20,
  ROOKIE: 19,
  INTERNATIONAL: 18,
};

export function calculateRule5EligibleAfterSeason(
  signingSeason: number,
  signedAge: number,
): number {
  return Math.max(1, signingSeason + (signedAge <= 18 ? 4 : 3));
}

export function estimateBackfilledRule5EligibilityAfterSeason(
  player: GeneratedPlayer,
  currentSeason: number,
): number {
  const baseYears = BACKFILL_BASE_YEARS[player.rosterStatus];
  const typicalMaxAge = BACKFILL_TYPICAL_MAX_AGE[player.rosterStatus];
  const estimatedYearsInOrg = Math.max(1, baseYears + Math.max(0, player.age - typicalMaxAge));
  const estimatedSigningSeason = currentSeason - estimatedYearsInOrg + 1;
  const estimatedSignedAge = Math.max(16, player.age - estimatedYearsInOrg + 1);
  return calculateRule5EligibleAfterSeason(estimatedSigningSeason, estimatedSignedAge);
}

function playerLabel(player: GeneratedPlayer): string {
  return `${player.firstName} ${player.lastName}`;
}

function buildEligiblePlayers(
  season: number,
  players: GeneratedPlayer[],
  protectedPlayerIdsByTeam: Record<string, string[]>,
): Rule5EligiblePlayer[] {
  return players
    .filter((player) => {
      if (!player.teamId || player.teamId === 'draft_pool') return false;
      if (player.rosterStatus === 'MLB') return false;
      if (player.rule5EligibleAfterSeason > season) return false;
      return !(protectedPlayerIdsByTeam[player.teamId] ?? []).includes(player.id);
    })
    .map((player) => ({
      playerId: player.id,
      teamId: player.teamId,
      playerName: playerLabel(player),
      position: player.position,
      age: player.age,
      overallRating: player.overallRating,
      rosterStatus: player.rosterStatus,
      rule5EligibleAfterSeason: player.rule5EligibleAfterSeason,
    }))
    .sort((left, right) => right.overallRating - left.overallRating || left.playerId.localeCompare(right.playerId));
}

function filterEligiblePlayers(
  candidates: Rule5EligiblePlayer[],
  protectedPlayerIdsByTeam: Record<string, string[]>,
): Rule5EligiblePlayer[] {
  return candidates
    .filter((player) => !(protectedPlayerIdsByTeam[player.teamId] ?? []).includes(player.playerId))
    .map((player) => ({ ...player }));
}

function cloneSession(session: Rule5SessionState): Rule5SessionState {
  return {
    ...session,
    draftOrder: [...session.draftOrder],
    protectedPlayerIdsByTeam: Object.fromEntries(
      Object.entries(session.protectedPlayerIdsByTeam).map(([teamId, protectedIds]) => [teamId, [...protectedIds]]),
    ),
    candidatePlayers: session.candidatePlayers.map((player) => ({ ...player })),
    eligiblePlayers: session.eligiblePlayers.map((player) => ({ ...player })),
    selections: session.selections.map((selection) => ({ ...selection })),
    obligations: session.obligations.map((obligation) => ({ ...obligation })),
    offerBackStates: session.offerBackStates.map((state) => ({ ...state })),
  };
}

function nextTeamIndex(session: Rule5SessionState): number {
  return (session.currentTeamIndex + 1) % Math.max(1, session.draftOrder.length);
}

export function createRule5Session(args: CreateRule5SessionArgs): Rule5SessionState {
  const protectedPlayerIdsByTeam = Object.fromEntries(
    args.draftOrder.map((teamId) => [teamId, [...(args.rosterStates.get(teamId)?.mlbRoster ?? [])]]),
  );
  const candidatePlayers = buildEligiblePlayers(args.season, args.players, {});

  return {
    season: args.season,
    phase: 'protection_audit',
    draftOrder: [...args.draftOrder],
    currentTeamIndex: 0,
    consecutivePasses: 0,
    protectedPlayerIdsByTeam,
    candidatePlayers,
    eligiblePlayers: filterEligiblePlayers(candidatePlayers, protectedPlayerIdsByTeam),
    selections: [],
    obligations: [],
    offerBackStates: [],
  };
}

export function toggleRule5Protection(
  session: Rule5SessionState,
  teamId: string,
  playerId: string,
): Rule5ActionResult {
  const nextSession = cloneSession(session);
  if (nextSession.phase !== 'protection_audit') {
    return { success: false, session: nextSession, error: 'Protection audit is no longer active.' };
  }

  const protectedIds = nextSession.protectedPlayerIdsByTeam[teamId] ?? [];
  const protectedSet = new Set(protectedIds);
  if (protectedSet.has(playerId)) {
    nextSession.protectedPlayerIdsByTeam[teamId] = protectedIds.filter((id) => id !== playerId);
  } else {
    if (protectedIds.length >= FORTY_MAN_LIMIT) {
      return { success: false, session: nextSession, error: '40-man roster is already full.' };
    }
    nextSession.protectedPlayerIdsByTeam[teamId] = [...protectedIds, playerId];
  }

  nextSession.eligiblePlayers = filterEligiblePlayers(
    nextSession.candidatePlayers,
    nextSession.protectedPlayerIdsByTeam,
  );
  return { success: true, session: nextSession };
}

export function lockRule5ProtectionAudit(session: Rule5SessionState): Rule5SessionState {
  return {
    ...cloneSession(session),
    phase: 'rule5_draft',
    currentTeamIndex: 0,
    consecutivePasses: 0,
  };
}

export function makeRule5Selection(
  session: Rule5SessionState,
  teamId: string,
  playerId: string,
): Rule5ActionResult {
  const nextSession = cloneSession(session);
  if (nextSession.phase !== 'rule5_draft') {
    return { success: false, session: nextSession, error: 'Rule 5 draft is not active.' };
  }
  if (nextSession.draftOrder[nextSession.currentTeamIndex] !== teamId) {
    return { success: false, session: nextSession, error: 'It is not this team’s turn.' };
  }

  const selectedPlayer = nextSession.eligiblePlayers.find((player) => player.playerId === playerId);
  if (!selectedPlayer) {
    return { success: false, session: nextSession, error: 'Selected player is not in the Rule 5 pool.' };
  }

  nextSession.eligiblePlayers = nextSession.eligiblePlayers.filter((player) => player.playerId !== playerId);
  nextSession.selections = [
    ...nextSession.selections,
    {
      playerId: selectedPlayer.playerId,
      playerName: selectedPlayer.playerName,
      originalTeamId: selectedPlayer.teamId,
      draftingTeamId: teamId,
      overallPick: nextSession.selections.length + 1,
      round: Math.floor(nextSession.selections.length / Math.max(1, nextSession.draftOrder.length)) + 1,
    },
  ];
  nextSession.obligations = [
    ...nextSession.obligations,
    {
      playerId: selectedPlayer.playerId,
      originalTeamId: selectedPlayer.teamId,
      draftingTeamId: teamId,
      draftedAfterSeason: nextSession.season,
      status: 'active',
    },
  ];
  nextSession.currentTeamIndex = nextTeamIndex(nextSession);
  nextSession.consecutivePasses = 0;

  return { success: true, session: nextSession };
}

export function passRule5DraftTurn(
  session: Rule5SessionState,
  teamId: string,
): Rule5ActionResult {
  const nextSession = cloneSession(session);
  if (nextSession.phase !== 'rule5_draft') {
    return { success: false, session: nextSession, error: 'Rule 5 draft is not active.' };
  }
  if (nextSession.draftOrder[nextSession.currentTeamIndex] !== teamId) {
    return { success: false, session: nextSession, error: 'It is not this team’s turn.' };
  }

  nextSession.currentTeamIndex = nextTeamIndex(nextSession);
  nextSession.consecutivePasses += 1;
  if (nextSession.consecutivePasses >= nextSession.draftOrder.length) {
    nextSession.phase = 'complete';
  }

  return { success: true, session: nextSession };
}
