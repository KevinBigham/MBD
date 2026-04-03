import {
  advanceStoryArcs,
  detectNewStoryArcs,
  getTeamById,
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

function appendStoryArcTicker(state: FullGameState, entries: FullGameState['tickerFeed']) {
  if (entries.length === 0) {
    return;
  }

  state.tickerFeed = pruneTickerFeed(
    [...entries, ...state.tickerFeed],
    200,
    absoluteDay(state.season, state.day),
  );
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

export function advanceTradeSagaClimax(
  state: FullGameState,
  tradedPlayerIds: string[],
) {
  if (tradedPlayerIds.length === 0) {
    return;
  }

  const tradedSet = new Set(tradedPlayerIds);
  const newsItems: FullGameState['news'] = [];
  const tickerEntries: FullGameState['tickerFeed'] = [];
  const updated = state.playerStoryArcs.map((arc) => {
    if (arc.resolvedSeason != null || arc.arcType !== 'trade_saga' || !tradedSet.has(arc.playerId)) {
      return arc;
    }

    const player = state.players.find((candidate) => candidate.id === arc.playerId);
    if (!player || arc.phase === 'climax' || arc.phase === 'resolution') {
      return arc;
    }

    const playerName = `${player.firstName} ${player.lastName}`;
    const destinationTeam = getTeamById(player.teamId);
    const destinationLabel = destinationTeam ? `${destinationTeam.city} ${destinationTeam.name}` : player.teamId.toUpperCase();
    const milestone = `${playerName}'s trade saga hits its climax as ${destinationLabel} completes the move.`;

    newsItems.push({
      id: `trade-saga-climax-${player.id}-${state.season}-${state.day}`,
      headline: `Trade saga climax: ${playerName} is on the move`,
      body: `${milestone} The trade saga around ${playerName} finally broke into a completed deal.`,
      priority: 1,
      category: 'trade',
      tag: 'BREAKING',
      timestamp: `S${state.season}D${state.day}`,
      relatedPlayerIds: [player.id],
      relatedTeamIds: [player.teamId],
      read: false,
    });
    tickerEntries.push({
      id: `ticker-trade-saga-climax-${player.id}-${state.season}-${state.day}`,
      timestamp: `S${state.season}D${state.day}`,
      category: 'trade',
      text: milestone,
      priority: 5,
      relatedTeamIds: [player.teamId],
      relatedPlayerIds: [player.id],
      expiresDay: absoluteDay(state.season, state.day) + 30,
    });

    return {
      ...arc,
      phase: 'climax',
      milestones: [...arc.milestones, milestone],
      resolvedSeason: null,
    } satisfies PlayerStoryArc;
  });

  mergeStoryArcState(state, updated);
  appendStoryArcNews(state, newsItems);
  appendStoryArcTicker(state, tickerEntries);
}
