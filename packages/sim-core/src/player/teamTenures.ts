import type { TeamTenureEntry } from '@mbd/contracts';
import type { GeneratedPlayer } from './generation.js';

function cloneTenures(player: Pick<GeneratedPlayer, 'teamTenures'>): TeamTenureEntry[] {
  return [...(player.teamTenures ?? [])];
}

function activeTenureIndex(tenures: readonly TeamTenureEntry[]): number {
  return tenures.findIndex((tenure) => tenure.endSeason == null);
}

export function getTenureSeasonCount(
  tenure: TeamTenureEntry,
  currentSeason: number,
): number {
  const endSeason = tenure.endSeason ?? currentSeason;
  if (endSeason < tenure.startSeason) {
    return 0;
  }
  return (endSeason - tenure.startSeason) + 1;
}

export function getLongestTeamTenureSeasons(
  player: Pick<GeneratedPlayer, 'teamTenures'>,
  teamId: string,
  currentSeason: number,
): number {
  return cloneTenures(player)
    .filter((tenure) => tenure.teamId === teamId)
    .reduce((longest, tenure) => Math.max(longest, getTenureSeasonCount(tenure, currentSeason)), 0);
}

export function seedInitialTeamTenure(
  player: GeneratedPlayer,
  season: number,
): GeneratedPlayer {
  if (!player.teamId || (player.teamTenures?.length ?? 0) > 0) {
    return player;
  }

  return {
    ...player,
    teamTenures: [{
      teamId: player.teamId,
      startSeason: season,
      endSeason: null,
    }],
  };
}

export function assignPlayerToTeam(
  player: GeneratedPlayer,
  teamId: string,
  season: number,
): GeneratedPlayer {
  const tenures = cloneTenures(player);
  const currentIndex = activeTenureIndex(tenures);
  const currentTenure = currentIndex >= 0 ? tenures[currentIndex] : null;

  if (currentTenure?.teamId === teamId && player.teamId === teamId) {
    return {
      ...player,
      teamTenures: tenures,
    };
  }

  if (currentTenure && currentTenure.endSeason == null) {
    tenures[currentIndex] = {
      ...currentTenure,
      endSeason: season,
    };
  }

  if (teamId) {
    tenures.push({
      teamId,
      startSeason: season,
      endSeason: null,
    });
  }

  return {
    ...player,
    teamId,
    teamTenures: tenures,
  };
}

export function releasePlayerFromTeam(
  player: GeneratedPlayer,
  season: number,
): GeneratedPlayer {
  return assignPlayerToTeam(player, '', season);
}

export function retirePlayerFromTeam(
  player: GeneratedPlayer,
  season: number,
): GeneratedPlayer {
  const tenures = cloneTenures(player);
  const currentIndex = activeTenureIndex(tenures);
  if (currentIndex >= 0) {
    tenures[currentIndex] = {
      ...tenures[currentIndex]!,
      endSeason: season,
    };
  }

  return {
    ...player,
    teamTenures: tenures,
  };
}
