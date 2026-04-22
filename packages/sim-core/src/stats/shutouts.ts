import type { GameBoxScore, PlayerGameStats } from '../sim/gameSimulator.js';
import type { GeneratedPlayer } from '../player/generation.js';

export const COMPLETE_GAME_OUTS = 27;
export const CAREER_SHUTOUT_MILESTONE = 100;

function opponentRunsAllowed(
  game: GameBoxScore,
  teamId: string,
): number | null {
  if (teamId === game.homeTeamId) {
    return game.awayScore;
  }
  if (teamId === game.awayTeamId) {
    return game.homeScore;
  }
  return null;
}

export function isCompleteGameShutout(
  game: GameBoxScore,
  stats: PlayerGameStats,
): boolean {
  const opponentRuns = opponentRunsAllowed(game, stats.teamId);
  if (opponentRuns == null) {
    return false;
  }

  return opponentRuns === 0
    && stats.ip >= COMPLETE_GAME_OUTS
    && stats.earnedRuns === 0;
}

export function recordCareerShutout(
  player: GeneratedPlayer,
  game: GameBoxScore,
  stats: PlayerGameStats,
): { player: GeneratedPlayer; recorded: boolean; crossedMilestone: boolean } {
  if (!player.pitcherAttributes || !isCompleteGameShutout(game, stats)) {
    return {
      player,
      recorded: false,
      crossedMilestone: false,
    };
  }

  const nextPlayer: GeneratedPlayer = {
    ...player,
    careerShutouts: player.careerShutouts + 1,
  };

  return {
    player: nextPlayer,
    recorded: true,
    crossedMilestone:
      player.careerShutouts < CAREER_SHUTOUT_MILESTONE
      && nextPlayer.careerShutouts >= CAREER_SHUTOUT_MILESTONE,
  };
}
