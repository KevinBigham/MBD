import {
  advanceStoryArcs,
  detectNewStoryArcs,
  pruneTickerFeed,
  type StoryArcSnapshot,
} from '@mbd/sim-core';
import type { PlayerStoryArc } from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers.js';

const PHASE_PRIORITY: Record<PlayerStoryArc['phase'], number> = {
  setup: 0,
  rising: 1,
  climax: 2,
  resolution: 3,
};

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function buildStandingsMap(state: FullGameState): StoryArcSnapshot['standings'] {
  return new Map(
    state.seasonState.standings
      .getLeagueStandings()
      .map((entry) => [entry.teamId, { wins: entry.wins, losses: entry.losses }] as const),
  );
}

function buildStoryArcSnapshot(
  state: FullGameState,
  season: number = state.season,
  day: number = state.day,
): StoryArcSnapshot {
  return {
    season,
    day,
    userTeamId: state.userTeamId,
    players: state.players,
    playerStoryArcs: state.playerStoryArcs,
    seasonStats: state.seasonState.playerSeasonStats,
    standings: buildStandingsMap(state),
    awardHistory: state.awardHistory,
    playerOrigins: state.playerOrigins,
  };
}

function sortArcs(state: FullGameState, arcs: PlayerStoryArc[]): PlayerStoryArc[] {
  return [...arcs].sort((left, right) =>
    PHASE_PRIORITY[right.phase] - PHASE_PRIORITY[left.phase]
    || right.startSeason - left.startSeason
    || right.startDay - left.startDay
    || (
      (state.players.find((player) => player.id === right.playerId)?.teamId === state.userTeamId ? 1 : 0)
      - (state.players.find((player) => player.id === left.playerId)?.teamId === state.userTeamId ? 1 : 0)
    )
    || left.playerId.localeCompare(right.playerId),
  );
}

function mergeStoryArcState(
  state: FullGameState,
  arcs: PlayerStoryArc[],
) {
  state.playerStoryArcs = sortArcs(state, arcs);
}

function appendStoryArcNews(state: FullGameState, items: FullGameState['news']) {
  for (const item of items) {
    if (!state.news.some((existing) => existing.id === item.id)) {
      state.news.unshift(item);
    }
  }
}

export function syncSeasonStartStoryArcs(state: FullGameState) {
  const newArcs = detectNewStoryArcs(state.rng, buildStoryArcSnapshot(state));
  if (newArcs.length === 0) {
    return;
  }

  mergeStoryArcState(state, [...state.playerStoryArcs, ...newArcs]);
}

export function advanceMonthlyStoryArcs(
  state: FullGameState,
  season: number = state.season,
  day: number = state.day,
) {
  const snapshot = buildStoryArcSnapshot(state, season, day);
  const advanced = advanceStoryArcs(state.rng, snapshot);
  mergeStoryArcState(state, advanced.updatedArcs);
  appendStoryArcNews(state, advanced.newsItems);
  state.tickerFeed = pruneTickerFeed(
    [...advanced.tickerEntries, ...state.tickerFeed],
    200,
    absoluteDay(season, day),
  );

  const newArcs = detectNewStoryArcs(state.rng, buildStoryArcSnapshot(state, season, day));
  if (newArcs.length > 0) {
    mergeStoryArcState(state, [...state.playerStoryArcs, ...newArcs]);
  }
}
