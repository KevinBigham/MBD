import {
  generateOffseasonHeadline,
  generateSeasonRecapNarrative,
} from '@mbd/sim-core';
import type { SeasonArchiveEntry, SeasonHistoryEntry } from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers';

export interface SeasonRecapView {
  season: number;
  recap: string;
  storylines: string[];
}

export interface OffseasonHeadlineView {
  season: number;
  headline: string;
}

function unique(values: Array<string | null | undefined>, limit?: number): string[] {
  const deduped = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .filter((value, index, array) => array.indexOf(value) === index);
  return typeof limit === 'number' ? deduped.slice(0, limit) : deduped;
}

function resolveSeasonNarrativeState(
  state: FullGameState,
  season?: number,
): {
  season: number;
  seasonHistory: SeasonHistoryEntry;
  seasonArchive: SeasonArchiveEntry | null;
} | null {
  const targetSeason = season ?? state.season;
  const seasonHistory = state.seasonHistory.find((entry) => entry.season === targetSeason) ?? null;
  if (!seasonHistory) {
    return null;
  }

  return {
    season: targetSeason,
    seasonHistory,
    seasonArchive: state.seasonArchive.find((entry) => entry.season === targetSeason) ?? null,
  };
}

function buildStorylines(
  seasonHistory: SeasonHistoryEntry,
  seasonArchive: SeasonArchiveEntry | null,
): string[] {
  return unique([
    ...(seasonHistory.userSeason?.storylines ?? []),
    ...seasonHistory.keyMoments,
    ...(seasonArchive?.timelineEvents ?? []),
    ...(seasonArchive?.transactions ?? []).map((entry) => entry.headline),
  ], 4);
}

export function buildSeasonRecapView(
  state: FullGameState,
  season?: number,
): SeasonRecapView | null {
  const narrativeState = resolveSeasonNarrativeState(state, season);
  if (!narrativeState) {
    return null;
  }

  return {
    season: narrativeState.season,
    recap: generateSeasonRecapNarrative(
      narrativeState.seasonHistory,
      narrativeState.seasonArchive,
    ),
    storylines: buildStorylines(
      narrativeState.seasonHistory,
      narrativeState.seasonArchive,
    ),
  };
}

export function buildOffseasonHeadlineView(
  state: FullGameState,
  season?: number,
): OffseasonHeadlineView | null {
  const narrativeState = resolveSeasonNarrativeState(state, season);
  if (!narrativeState) {
    return null;
  }

  return {
    season: narrativeState.season,
    headline: generateOffseasonHeadline(
      narrativeState.seasonHistory,
      narrativeState.seasonArchive,
    ),
  };
}
