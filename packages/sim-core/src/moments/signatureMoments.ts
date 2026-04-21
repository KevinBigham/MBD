import type { RookieOfTheYearVotingEntry } from '@mbd/contracts';
import type { GeneratedPlayer } from '../player/generation.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';
import type { Moment } from './momentDetector.js';

export const COMEBACK_PLAYER_IMPACT = 58;
export const COMEBACK_PLAYER_RELEVANCE = 0.9;
export const COMEBACK_PLAYER_MISSED_GAMES_THRESHOLD = 50;
export const COMEBACK_PLAYER_WAR_THRESHOLD = 3.5;
export const ROOKIE_SENSATION_IMPACT = 52;
export const ROOKIE_SENSATION_RELEVANCE = 0.82;

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

function estimatedWar(stats: PlayerGameStats): number {
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
