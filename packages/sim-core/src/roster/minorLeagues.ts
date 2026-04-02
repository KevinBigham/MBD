/**
 * @module minorLeagues
 * Deterministic minor-league service-time, options, waivers, affiliate stats,
 * and promotion recommendation helpers.
 */

import type { GameRNG } from '../math/index.js';
import type { GeneratedPlayer, RosterLevel } from '../player/generation.js';
import { PITCHER_POSITIONS } from '../player/generation.js';
import type { RosterState } from './rosterManager.js';

export const EXPANDED_MLB_ROSTER_LIMIT = 28;
export const SEPTEMBER_EXPANDED_ROSTER_DAYS = 30;
export const ROOKIE_AFFILIATE_START_DAY = 45;

export const AFFILIATE_LEVELS = ['AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE'] as const;
export type AffiliateLevel = (typeof AFFILIATE_LEVELS)[number];

export const AFFILIATE_SCHEDULE_LENGTHS: Record<AffiliateLevel, number> = {
  AAA: 150,
  AA: 138,
  A_PLUS: 132,
  A: 132,
  ROOKIE: 72,
};

export interface AffiliatePlayerStats {
  playerId: string;
  games: number;
  pa: number;
  hits: number;
  hr: number;
  rbi: number;
  bb: number;
  k: number;
  ipOuts: number;
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  wins: number;
  losses: number;
}

export interface AffiliateState {
  teamId: string;
  level: AffiliateLevel;
  season: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  playerStats: Array<[string, AffiliatePlayerStats]>;
}

export interface WaiverClaim {
  playerId: string;
  fromTeamId: string;
  toTeamId: string | null;
  season: number;
  day: number;
  priorityTeamIds: string[];
  status: 'pending' | 'claimed' | 'cleared';
  salary: number;
}

export interface AffiliateBoxScore {
  id: string;
  season: number;
  day: number;
  level: AffiliateLevel;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  summary: string;
  notablePlayerIds: string[];
}

export interface MinorLeagueState {
  serviceTimeLedger: Array<[string, number]>;
  optionUsage: Array<[string, number[]]>;
  waiverClaims: WaiverClaim[];
  affiliateStates: AffiliateState[];
  affiliateBoxScores: AffiliateBoxScore[];
}

export interface MinorLeagueMutationResult {
  players: GeneratedPlayer[];
  state: MinorLeagueState;
}

export interface WaiverClaimResult extends MinorLeagueMutationResult {
  success: boolean;
  error?: string;
}

export interface RosterComplianceIssue {
  code:
    | 'active_roster_over_limit'
    | 'active_roster_under_limit'
    | 'forty_man_over_limit'
    | 'mlb_not_on_40_man';
  severity: 'error' | 'warning';
  message: string;
  playerId?: string;
}

export interface PromotionCandidate {
  playerId: string;
  teamId: string;
  currentLevel: AffiliateLevel;
  targetLevel: RosterLevel;
  score: number;
  reason: string;
}

function affiliateStateKey(teamId: string, level: AffiliateLevel): string {
  return `${teamId}:${level}`;
}

function cloneStats(stats: AffiliatePlayerStats): AffiliatePlayerStats {
  return {
    ...stats,
  };
}

function emptyAffiliatePlayerStats(playerId: string): AffiliatePlayerStats {
  return {
    playerId,
    games: 0,
    pa: 0,
    hits: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    ipOuts: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    wins: 0,
    losses: 0,
  };
}

function isPitcher(player: GeneratedPlayer): boolean {
  return (PITCHER_POSITIONS as readonly string[]).includes(player.position);
}

function sortTupleNumbers(entries: Array<[string, number]>): Array<[string, number]> {
  return [...entries].sort((left, right) => left[0].localeCompare(right[0]));
}

function sortTupleSeasons(entries: Array<[string, number[]]>): Array<[string, number[]]> {
  return [...entries]
    .map(([playerId, seasons]) => [playerId, [...seasons].sort((left, right) => left - right)] as [string, number[]])
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function sortAffiliateStates(states: AffiliateState[]): AffiliateState[] {
  return [...states].sort((left, right) =>
    left.teamId.localeCompare(right.teamId) || AFFILIATE_LEVELS.indexOf(left.level) - AFFILIATE_LEVELS.indexOf(right.level),
  );
}

function getPlayerStatsMap(affiliateState: AffiliateState): Map<string, AffiliatePlayerStats> {
  return new Map(
    affiliateState.playerStats.map(([playerId, stats]) => [playerId, cloneStats(stats)]),
  );
}

function replaceAffiliateState(
  affiliateStates: AffiliateState[],
  updated: AffiliateState,
): AffiliateState[] {
  return sortAffiliateStates(
    affiliateStates.map((state) =>
      state.teamId === updated.teamId && state.level === updated.level ? updated : state,
    ),
  );
}

function upsertPlayerStats(
  affiliateState: AffiliateState,
  playerId: string,
  updater: (current: AffiliatePlayerStats) => AffiliatePlayerStats,
): AffiliateState {
  const statsMap = getPlayerStatsMap(affiliateState);
  const current = statsMap.get(playerId) ?? emptyAffiliatePlayerStats(playerId);
  statsMap.set(playerId, updater(current));
  return {
    ...affiliateState,
    playerStats: Array.from(statsMap.entries()).sort((left, right) => left[0].localeCompare(right[0])),
  };
}

function affiliateStartDay(level: AffiliateLevel): number {
  return level === 'ROOKIE' ? ROOKIE_AFFILIATE_START_DAY : 1;
}

function activeAffiliateDayCount(level: AffiliateLevel, day: number): number {
  return day - affiliateStartDay(level) + 1;
}

function promotionTarget(level: AffiliateLevel): RosterLevel {
  switch (level) {
    case 'AAA':
      return 'MLB';
    case 'AA':
      return 'AAA';
    case 'A_PLUS':
      return 'AA';
    case 'A':
      return 'A_PLUS';
    case 'ROOKIE':
      return 'A';
  }
}

function levelAgeTarget(level: AffiliateLevel): number {
  switch (level) {
    case 'AAA':
      return 24;
    case 'AA':
      return 23;
    case 'A_PLUS':
      return 22;
    case 'A':
      return 21;
    case 'ROOKIE':
      return 20;
  }
}

function boxScoreRetentionFloor(day: number): number {
  return Math.max(1, day - 30);
}

function buildDailyMatchups(teamIds: string[], day: number, level: AffiliateLevel): Array<[string, string]> {
  const ordered = [...teamIds].sort();
  if (ordered.length < 2 || ordered.length % 2 !== 0) {
    return [];
  }

  const offset = (day + AFFILIATE_LEVELS.indexOf(level)) % ordered.length;
  const rotated = ordered.slice(offset).concat(ordered.slice(0, offset));
  const half = rotated.length / 2;
  const pairs: Array<[string, string]> = [];
  for (let index = 0; index < half; index += 1) {
    pairs.push([rotated[index]!, rotated[half + index]!]);
  }
  return pairs;
}

function teamStrength(players: GeneratedPlayer[]): number {
  if (players.length === 0) {
    return 240;
  }
  const total = players.reduce((sum, player) => sum + player.overallRating, 0);
  return total / players.length;
}

function ensureAffiliateStates(
  state: MinorLeagueState,
  teamIds: string[],
  season: number,
): MinorLeagueState {
  if (state.affiliateStates.length >= teamIds.length * AFFILIATE_LEVELS.length) {
    return state;
  }

  const existingKeys = new Set(state.affiliateStates.map((entry) => affiliateStateKey(entry.teamId, entry.level)));
  const nextStates = [...state.affiliateStates];
  for (const teamId of [...teamIds].sort()) {
    for (const level of AFFILIATE_LEVELS) {
      const key = affiliateStateKey(teamId, level);
      if (existingKeys.has(key)) continue;
      nextStates.push({
        teamId,
        level,
        season,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        runsScored: 0,
        runsAllowed: 0,
        playerStats: [],
      });
    }
  }

  return {
    ...state,
    affiliateStates: sortAffiliateStates(nextStates),
  };
}

function simulateHitterGame(
  rng: GameRNG,
  player: GeneratedPlayer,
  starter: boolean,
): Pick<AffiliatePlayerStats, 'games' | 'pa' | 'hits' | 'hr' | 'rbi' | 'bb' | 'k'> {
  const pa = starter ? 4 : 1;
  let hits = 0;
  let walks = 0;
  let strikeouts = 0;
  let homeRuns = 0;
  const hitChance = Math.max(0.16, Math.min(0.42, (player.overallRating / 1000) + 0.12));
  const walkChance = Math.max(0.04, Math.min(0.16, (player.hitterAttributes.eye / 1000) + 0.02));
  const strikeoutChance = Math.max(0.12, Math.min(0.34, 0.30 - (player.hitterAttributes.contact / 1200)));
  const homeRunChance = Math.max(0.01, Math.min(0.11, (player.hitterAttributes.power / 1400)));

  for (let attempt = 0; attempt < pa; attempt += 1) {
    if (rng.nextFloat() < walkChance) {
      walks += 1;
      continue;
    }
    if (rng.nextFloat() < hitChance) {
      hits += 1;
      if (rng.nextFloat() < homeRunChance) {
        homeRuns += 1;
      }
      continue;
    }
    if (rng.nextFloat() < strikeoutChance) {
      strikeouts += 1;
    }
  }

  const rbi = Math.min(hits + homeRuns, Math.max(0, 1 + rng.nextInt(0, 2) + (starter ? 1 : 0)));
  return {
    games: 1,
    pa,
    hits,
    hr: homeRuns,
    rbi,
    bb: walks,
    k: strikeouts,
  };
}

function simulatePitcherGame(
  rng: GameRNG,
  player: GeneratedPlayer,
  role: 'starter' | 'reliever',
  runsAllowed: number,
): Pick<AffiliatePlayerStats, 'games' | 'ipOuts' | 'earnedRuns' | 'strikeouts' | 'walks' | 'wins' | 'losses'> {
  const ipOuts = role === 'starter' ? 15 + rng.nextInt(0, 6) : 3 + rng.nextInt(0, 3);
  const strikeouts = Math.max(0, Math.round((ipOuts / 3) * ((player.overallRating / 140) + 0.8)));
  const walks = Math.max(0, Math.round((ipOuts / 9) * (1.4 - (player.overallRating / 500))));
  const earnedRuns = Math.max(0, Math.min(runsAllowed, role === 'starter' ? Math.round(runsAllowed * 0.6) : Math.round(runsAllowed * 0.25)));
  return {
    games: 1,
    ipOuts,
    earnedRuns,
    strikeouts,
    walks,
    wins: 0,
    losses: 0,
  };
}

export function createMinorLeagueState(teamIds: string[], season: number): MinorLeagueState {
  const affiliateStates: AffiliateState[] = [];
  for (const teamId of [...teamIds].sort()) {
    for (const level of AFFILIATE_LEVELS) {
      affiliateStates.push({
        teamId,
        level,
        season,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        runsScored: 0,
        runsAllowed: 0,
        playerStats: [],
      });
    }
  }

  return {
    serviceTimeLedger: [],
    optionUsage: [],
    waiverClaims: [],
    affiliateStates,
    affiliateBoxScores: [],
  };
}

export function accrueServiceTimeDay(
  players: GeneratedPlayer[],
  state: MinorLeagueState,
): MinorLeagueMutationResult {
  const ledger = new Map(state.serviceTimeLedger);
  const updatedPlayers = players.map((player) => {
    if (player.rosterStatus !== 'MLB') {
      return player;
    }
    ledger.set(player.id, (ledger.get(player.id) ?? 0) + 1);
    return {
      ...player,
      serviceTimeDays: player.serviceTimeDays + 1,
    };
  });

  return {
    players: updatedPlayers,
    state: {
      ...state,
      serviceTimeLedger: sortTupleNumbers(Array.from(ledger.entries())),
    },
  };
}

export function consumeOptionYear(
  player: GeneratedPlayer,
  state: MinorLeagueState,
  season: number,
): { player: GeneratedPlayer; state: MinorLeagueState } {
  const optionUsage = new Map<string, number[]>(state.optionUsage.map(([playerId, seasons]) => [playerId, [...seasons]]));
  const usedSeasons = optionUsage.get(player.id) ?? [];

  if (!usedSeasons.includes(season)) {
    usedSeasons.push(season);
    optionUsage.set(player.id, usedSeasons);
  }

  const optionYearsUsed = usedSeasons.length;
  return {
    player: {
      ...player,
      optionYearsUsed,
      isOutOfOptions: optionYearsUsed >= 3,
    },
    state: {
      ...state,
      optionUsage: sortTupleSeasons(Array.from(optionUsage.entries())),
    },
  };
}

export function buildWaiverPriority(records: Array<{ teamId: string; wins: number; losses: number }>): string[] {
  return [...records]
    .sort((left, right) => {
      const leftPct = left.wins / Math.max(1, left.wins + left.losses);
      const rightPct = right.wins / Math.max(1, right.wins + right.losses);
      if (leftPct !== rightPct) return leftPct - rightPct;
      if (left.wins !== right.wins) return left.wins - right.wins;
      return left.teamId.localeCompare(right.teamId);
    })
    .map((record) => record.teamId);
}

export function placeOnWaivers(
  state: MinorLeagueState,
  player: GeneratedPlayer,
  priorityTeamIds: string[],
  season: number,
  day: number,
): MinorLeagueState {
  return {
    ...state,
    waiverClaims: [
      ...state.waiverClaims.filter((claim) => claim.playerId !== player.id),
      {
        playerId: player.id,
        fromTeamId: player.teamId,
        toTeamId: null,
        season,
        day,
        priorityTeamIds: [...priorityTeamIds],
        status: 'pending' as const,
        salary: player.contract.annualSalary,
      },
    ].sort((left, right) => left.playerId.localeCompare(right.playerId)),
  };
}

export function claimOffWaivers(
  players: GeneratedPlayer[],
  state: MinorLeagueState,
  playerId: string,
  claimingTeamId: string,
): WaiverClaimResult {
  const claim = state.waiverClaims.find((candidate) => candidate.playerId === playerId && candidate.status === 'pending');
  if (!claim) {
    return { players, state, success: false, error: 'Player is not currently on waivers.' };
  }

  if (claim.priorityTeamIds[0] !== claimingTeamId) {
    return { players, state, success: false, error: 'Claiming team does not hold current waiver priority.' };
  }

  const updatedPlayers = players.map((player) =>
    player.id === playerId
      ? {
        ...player,
        teamId: claimingTeamId,
        rosterStatus: 'AAA' as const,
        minorLeagueLevel: 'AAA' as const,
      }
      : player,
  );

  return {
    players: updatedPlayers,
    state: {
      ...state,
      waiverClaims: state.waiverClaims.map((candidate) =>
        candidate.playerId === playerId
          ? {
            ...candidate,
            toTeamId: claimingTeamId,
            status: 'claimed' as const,
          }
          : candidate,
      ),
    },
    success: true,
  };
}

export function isExpandedRosterWindow(day: number, regularSeasonDays = 162): boolean {
  return day > regularSeasonDays - SEPTEMBER_EXPANDED_ROSTER_DAYS;
}

export function getActiveRosterLimit(day: number, regularSeasonDays = 162): number {
  return isExpandedRosterWindow(day, regularSeasonDays) ? EXPANDED_MLB_ROSTER_LIMIT : 26;
}

export function getRosterComplianceIssues(
  players: GeneratedPlayer[],
  rosterState: RosterState,
  day: number,
  regularSeasonDays = 162,
): RosterComplianceIssue[] {
  const issues: RosterComplianceIssue[] = [];
  const activeRosterLimit = getActiveRosterLimit(day, regularSeasonDays);

  if (rosterState.mlbRoster.length > activeRosterLimit) {
    issues.push({
      code: 'active_roster_over_limit',
      severity: 'error',
      message: `Active roster has ${rosterState.mlbRoster.length} players (limit ${activeRosterLimit}).`,
    });
  } else if (rosterState.mlbRoster.length < activeRosterLimit) {
    issues.push({
      code: 'active_roster_under_limit',
      severity: 'warning',
      message: `Active roster has ${rosterState.mlbRoster.length} players (target ${activeRosterLimit}).`,
    });
  }

  if (rosterState.fortyManRoster.length > 40) {
    issues.push({
      code: 'forty_man_over_limit',
      severity: 'error',
      message: `40-man roster has ${rosterState.fortyManRoster.length} players (limit 40).`,
    });
  }

  const fortyManSet = new Set(rosterState.fortyManRoster);
  for (const playerId of rosterState.mlbRoster) {
    if (!fortyManSet.has(playerId)) {
      issues.push({
        code: 'mlb_not_on_40_man',
        severity: 'error',
        message: `MLB player ${playerId} is missing from the 40-man roster.`,
        playerId,
      });
    }
  }

  return issues;
}

export function getPromotionCandidates(
  players: GeneratedPlayer[],
  state: MinorLeagueState,
  teamId: string,
): PromotionCandidate[] {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const candidates: PromotionCandidate[] = [];

  for (const affiliateState of state.affiliateStates) {
    if (affiliateState.teamId !== teamId) continue;

    for (const [playerId, stats] of affiliateState.playerStats) {
      const player = playerMap.get(playerId);
      if (!player || player.teamId !== teamId || !player.minorLeagueLevel || player.rosterStatus === 'MLB') {
        continue;
      }

      const currentLevel = player.minorLeagueLevel as AffiliateLevel;
      const targetLevel = promotionTarget(currentLevel);
      const ageBonus = player.age <= levelAgeTarget(currentLevel) ? 8 : 0;
      let score = 0;
      let productionHit = false;

      if (isPitcher(player)) {
        const innings = stats.ipOuts / 3;
        const era = innings > 0 ? (stats.earnedRuns * 9) / innings : 99;
        if (stats.ipOuts >= 90 && era <= 3.4) {
          score += 28;
          productionHit = true;
        }
        if (stats.strikeouts >= 30) {
          score += 12;
          productionHit = true;
        }
      } else {
        const average = stats.pa > 0 ? stats.hits / stats.pa : 0;
        if (stats.pa >= 100 && average >= 0.3) {
          score += 28;
          productionHit = true;
        }
        if (stats.hr >= 6) {
          score += 10;
          productionHit = true;
        }
      }

      score += Math.round(player.overallRating / 18) + ageBonus;
      if (!productionHit || score < 36) continue;

      candidates.push({
        playerId,
        teamId,
        currentLevel,
        targetLevel,
        score,
        reason: `${currentLevel} production and overall rating merit a look at ${targetLevel}.`,
      });
    }
  }

  return candidates.sort((left, right) => right.score - left.score || left.playerId.localeCompare(right.playerId));
}

export function simulateAffiliateDay(
  rng: GameRNG,
  state: MinorLeagueState,
  players: GeneratedPlayer[],
  day: number,
  season: number,
  teamIds: string[],
): MinorLeagueState {
  let nextState = ensureAffiliateStates(state, teamIds, season);
  let affiliateStates = nextState.affiliateStates;
  const nextBoxScores = [...nextState.affiliateBoxScores];

  for (const level of AFFILIATE_LEVELS) {
    const dayCount = activeAffiliateDayCount(level, day);
    if (dayCount < 1 || dayCount > AFFILIATE_SCHEDULE_LENGTHS[level]) {
      continue;
    }

    const matchups = buildDailyMatchups(teamIds, day, level);
    for (const [homeTeamId, awayTeamId] of matchups) {
      const homeState = affiliateStates.find((entry) => entry.teamId === homeTeamId && entry.level === level);
      const awayState = affiliateStates.find((entry) => entry.teamId === awayTeamId && entry.level === level);
      if (!homeState || !awayState) continue;
      if (homeState.gamesPlayed >= AFFILIATE_SCHEDULE_LENGTHS[level] || awayState.gamesPlayed >= AFFILIATE_SCHEDULE_LENGTHS[level]) {
        continue;
      }

      const homePlayers = players.filter((player) => player.teamId === homeTeamId && player.rosterStatus === level);
      const awayPlayers = players.filter((player) => player.teamId === awayTeamId && player.rosterStatus === level);
      const homeStrength = teamStrength(homePlayers);
      const awayStrength = teamStrength(awayPlayers);
      let homeScore = Math.max(0, 2 + Math.round(homeStrength / 140) + rng.nextInt(0, 4) - 1);
      let awayScore = Math.max(0, 2 + Math.round(awayStrength / 145) + rng.nextInt(0, 4) - 1);

      if (homeScore === awayScore) {
        if (homeStrength >= awayStrength) {
          homeScore += 1;
        } else {
          awayScore += 1;
        }
      }

      let updatedHomeState: AffiliateState = {
        ...homeState,
        gamesPlayed: homeState.gamesPlayed + 1,
        wins: homeState.wins + (homeScore > awayScore ? 1 : 0),
        losses: homeState.losses + (homeScore > awayScore ? 0 : 1),
        runsScored: homeState.runsScored + homeScore,
        runsAllowed: homeState.runsAllowed + awayScore,
      };
      let updatedAwayState: AffiliateState = {
        ...awayState,
        gamesPlayed: awayState.gamesPlayed + 1,
        wins: awayState.wins + (awayScore > homeScore ? 1 : 0),
        losses: awayState.losses + (awayScore > homeScore ? 0 : 1),
        runsScored: awayState.runsScored + awayScore,
        runsAllowed: awayState.runsAllowed + homeScore,
      };

      const homeHitters = homePlayers.filter((player) => !isPitcher(player)).slice(0, 9);
      const awayHitters = awayPlayers.filter((player) => !isPitcher(player)).slice(0, 9);
      for (const hitter of homeHitters) {
        const line = simulateHitterGame(rng, hitter, true);
        updatedHomeState = upsertPlayerStats(updatedHomeState, hitter.id, (current) => ({
          ...current,
          games: current.games + line.games,
          pa: current.pa + line.pa,
          hits: current.hits + line.hits,
          hr: current.hr + line.hr,
          rbi: current.rbi + line.rbi,
          bb: current.bb + line.bb,
          k: current.k + line.k,
        }));
      }
      for (const hitter of awayHitters) {
        const line = simulateHitterGame(rng, hitter, true);
        updatedAwayState = upsertPlayerStats(updatedAwayState, hitter.id, (current) => ({
          ...current,
          games: current.games + line.games,
          pa: current.pa + line.pa,
          hits: current.hits + line.hits,
          hr: current.hr + line.hr,
          rbi: current.rbi + line.rbi,
          bb: current.bb + line.bb,
          k: current.k + line.k,
        }));
      }

      const homePitchers = homePlayers.filter(isPitcher);
      const awayPitchers = awayPlayers.filter(isPitcher);
      if (homePitchers[0]) {
        const line = simulatePitcherGame(rng, homePitchers[0], 'starter', awayScore);
        updatedHomeState = upsertPlayerStats(updatedHomeState, homePitchers[0].id, (current) => ({
          ...current,
          games: current.games + line.games,
          ipOuts: current.ipOuts + line.ipOuts,
          earnedRuns: current.earnedRuns + line.earnedRuns,
          strikeouts: current.strikeouts + line.strikeouts,
          walks: current.walks + line.walks,
          wins: current.wins + (homeScore > awayScore ? 1 : 0),
          losses: current.losses + (homeScore > awayScore ? 0 : 1),
        }));
      }
      if (awayPitchers[0]) {
        const line = simulatePitcherGame(rng, awayPitchers[0], 'starter', homeScore);
        updatedAwayState = upsertPlayerStats(updatedAwayState, awayPitchers[0].id, (current) => ({
          ...current,
          games: current.games + line.games,
          ipOuts: current.ipOuts + line.ipOuts,
          earnedRuns: current.earnedRuns + line.earnedRuns,
          strikeouts: current.strikeouts + line.strikeouts,
          walks: current.walks + line.walks,
          wins: current.wins + (awayScore > homeScore ? 1 : 0),
          losses: current.losses + (awayScore > homeScore ? 0 : 1),
        }));
      }

      affiliateStates = replaceAffiliateState(affiliateStates, updatedHomeState);
      affiliateStates = replaceAffiliateState(affiliateStates, updatedAwayState);

      const notablePlayerIds = [
        homeHitters[0]?.id,
        awayHitters[0]?.id,
        homePitchers[0]?.id ?? awayPitchers[0]?.id,
      ].filter((value): value is string => value != null);
      nextBoxScores.push({
        id: `${season}:${day}:${level}:${homeTeamId}:${awayTeamId}`,
        season,
        day,
        level,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
        summary: `${level}: ${homeTeamId.toUpperCase()} ${homeScore}, ${awayTeamId.toUpperCase()} ${awayScore}`,
        notablePlayerIds,
      });
    }
  }

  nextState = {
    ...nextState,
    affiliateStates,
    affiliateBoxScores: nextBoxScores
      .filter((boxScore) => boxScore.day >= boxScoreRetentionFloor(day))
      .sort((left, right) => left.day - right.day || left.id.localeCompare(right.id)),
  };

  return nextState;
}
