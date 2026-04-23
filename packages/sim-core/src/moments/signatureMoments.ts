import type { RookieOfTheYearVotingEntry } from '@mbd/contracts';
import {
  pickStablePlayerArcBody,
  pickStablePlayerArcHeadline,
  type PlayerArcRenderContext,
  type PlayerArcTopicId,
} from '../narrative/playerArcProse.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { getTeamById } from '../league/teams.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';
import type { Moment } from './momentDetector.js';

export const COMEBACK_PLAYER_IMPACT = 58;
export const COMEBACK_PLAYER_RELEVANCE = 0.9;
export const COMEBACK_PLAYER_MISSED_GAMES_THRESHOLD = 50;
export const COMEBACK_PLAYER_WAR_THRESHOLD = 3.5;
export const ROOKIE_SENSATION_IMPACT = 52;
export const ROOKIE_SENSATION_RELEVANCE = 0.82;
export const REDEMPTION_ARC_IMPACT = 56;
export const REDEMPTION_ARC_RELEVANCE = 0.88;
export const REDEMPTION_ARC_PRIOR_WAR_MAX = 1.0;
export const REDEMPTION_ARC_CURRENT_WAR_MIN = 3.0;
export const LATE_CAREER_PEAK_IMPACT = 54;
export const LATE_CAREER_PEAK_RELEVANCE = 0.86;
export const LATE_CAREER_PEAK_AGE_MIN = 36;
export const LATE_CAREER_PEAK_CAREER_WAR_MIN = 40.0;
export const LATE_CAREER_PEAK_CURRENT_WAR_MIN = 3.0;
export const ROOKIE_BREAKOUT_IMPACT = 55;
export const ROOKIE_BREAKOUT_RELEVANCE = 0.84;
export const ROOKIE_BREAKOUT_SERVICE_TIME_MAX = 172;
export const ROOKIE_BREAKOUT_CURRENT_WAR_MIN = 3.0;

export interface SignatureMomentDetectionResult {
  readonly playerId: string;
  readonly moment: Moment & { readonly day: number; readonly timestamp: string };
}

function createMoment(
  season: number,
  day: number,
  type: Moment['type'],
  description: string,
  impact: number,
  relevance: number,
): SignatureMomentDetectionResult['moment'] {
  return {
    season,
    day,
    timestamp: `S${season}D${day}`,
    type,
    description,
    impact,
    relevance,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null,
  };
}

export function estimatedWar(stats: PlayerGameStats): number {
  if (stats.ip > 0 && stats.pa < 30) {
    const innings = stats.ip / 3;
    const era = innings > 0 ? (stats.earnedRuns * 9) / innings : 9;
    return Number(((stats.wins * 0.28) + (stats.strikeouts / 52) + Math.max(0, 4.5 - era)).toFixed(2));
  }

  const average = stats.hits / Math.max(1, stats.ab);
  return Number(((stats.hr * 0.12) + (stats.rbi * 0.028) + (stats.runs * 0.02) + (stats.bb * 0.015) + (average * 1.8)).toFixed(2));
}

function playerAlreadyHasMoment(
  playerMoments: ReadonlyMap<string, readonly Moment[]>,
  playerId: string,
  type: Moment['type'],
  season: number,
): boolean {
  return playerMoments.get(playerId)?.some((moment) => moment.type === type && moment.season === season) ?? false;
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function roundToTenth(value: number): number {
  return Number(value.toFixed(1));
}

function buildPlayerArcDescription(
  topicId: PlayerArcTopicId,
  renderContext: PlayerArcRenderContext,
  playerId: string,
  season: number,
): string {
  const headline = pickStablePlayerArcHeadline(topicId, renderContext, playerId, season);
  const body = pickStablePlayerArcBody(topicId, renderContext, playerId, season);
  return `${headline} ${body}`;
}

export function detectComebackPlayer(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats) {
    return null;
  }
  if (player.priorSeasonGamesMissed < COMEBACK_PLAYER_MISSED_GAMES_THRESHOLD) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'comeback_player', season)) {
    return null;
  }
  if (estimatedWar(stats) < COMEBACK_PLAYER_WAR_THRESHOLD) {
    return null;
  }

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'comeback_player',
      `${player.firstName} ${player.lastName} came back from a lost year and turned ${player.priorSeasonGamesMissed} missed games into an impact season.`,
      COMEBACK_PLAYER_IMPACT,
      COMEBACK_PLAYER_RELEVANCE,
    ),
  };
}

export function detectRookieSensation(
  userTeamId: string,
  players: readonly GeneratedPlayer[],
  rookieOfTheYearVoting: readonly RookieOfTheYearVotingEntry[],
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const detected: SignatureMomentDetectionResult[] = [];

  for (const ballot of rookieOfTheYearVoting) {
    if (ballot.season !== season) {
      continue;
    }

    for (const placement of ballot.placements) {
      if (placement.rank > 3) {
        continue;
      }

      const player = playersById.get(placement.playerId);
      if (!player || player.teamId !== userTeamId) {
        continue;
      }
      if (playerAlreadyHasMoment(playerMoments, player.id, 'rookie_sensation', season)) {
        continue;
      }

      detected.push({
        playerId: player.id,
        moment: createMoment(
          season,
          day,
          'rookie_sensation',
          `${player.firstName} ${player.lastName} finished ${placement.rank}${placement.rank === 1 ? 'st' : placement.rank === 2 ? 'nd' : 'rd'} in ${ballot.leagueId} Rookie of the Year voting and forced the league to notice.`,
          ROOKIE_SENSATION_IMPACT,
          ROOKIE_SENSATION_RELEVANCE,
        ),
      });
    }
  }

  return detected.sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export function detectRedemptionArc(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats || player.priorSeasonEstimatedWar == null) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'redemption_arc', season)) {
    return null;
  }

  const currentWar = estimatedWar(stats);
  if (player.priorSeasonEstimatedWar >= REDEMPTION_ARC_PRIOR_WAR_MAX || currentWar < REDEMPTION_ARC_CURRENT_WAR_MIN) {
    return null;
  }

  const description = buildPlayerArcDescription(
    'redemption_arc',
    {
      playerName: playerName(player),
      teamLabel: teamLabel(player.teamId),
      priorWar: roundToTenth(player.priorSeasonEstimatedWar),
      currentWar: roundToTenth(currentWar),
    },
    player.id,
    season,
  );

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'redemption_arc',
      description,
      REDEMPTION_ARC_IMPACT,
      REDEMPTION_ARC_RELEVANCE,
    ),
  };
}

export function detectLateCareerPeak(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  careerWarBeforeSeason: number,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats || player.age < LATE_CAREER_PEAK_AGE_MIN) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'late_career_peak', season)) {
    return null;
  }

  const currentWar = estimatedWar(stats);
  if (careerWarBeforeSeason < LATE_CAREER_PEAK_CAREER_WAR_MIN || currentWar < LATE_CAREER_PEAK_CURRENT_WAR_MIN) {
    return null;
  }

  const description = buildPlayerArcDescription(
    'late_career_peak',
    {
      playerName: playerName(player),
      teamLabel: teamLabel(player.teamId),
      age: player.age,
      careerWar: roundToTenth(careerWarBeforeSeason),
      currentWar: roundToTenth(currentWar),
    },
    player.id,
    season,
  );

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'late_career_peak',
      description,
      LATE_CAREER_PEAK_IMPACT,
      LATE_CAREER_PEAK_RELEVANCE,
    ),
  };
}

export function detectRookieBreakout(
  player: GeneratedPlayer,
  stats: PlayerGameStats | undefined,
  season: number,
  day: number,
  playerMoments: ReadonlyMap<string, readonly Moment[]> = new Map(),
): SignatureMomentDetectionResult | null {
  if (!stats || player.serviceTimeDays >= ROOKIE_BREAKOUT_SERVICE_TIME_MAX) {
    return null;
  }
  if (playerAlreadyHasMoment(playerMoments, player.id, 'rookie_breakout', season)) {
    return null;
  }

  const currentWar = estimatedWar(stats);
  if (currentWar < ROOKIE_BREAKOUT_CURRENT_WAR_MIN) {
    return null;
  }

  const description = buildPlayerArcDescription(
    'rookie_breakout',
    {
      playerName: playerName(player),
      teamLabel: teamLabel(player.teamId),
      currentWar: roundToTenth(currentWar),
    },
    player.id,
    season,
  );

  return {
    playerId: player.id,
    moment: createMoment(
      season,
      day,
      'rookie_breakout',
      description,
      ROOKIE_BREAKOUT_IMPACT,
      ROOKIE_BREAKOUT_RELEVANCE,
    ),
  };
}
