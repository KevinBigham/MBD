import {
  detectBreakoutCountdowns,
  generateDebutFlashback,
  generatePressConference,
  pruneTickerFeed,
} from '@mbd/sim-core';
import { getTeamById } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import { queueProspectDebutMoment } from './sim.worker.ceremony.js';

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function parseTimestamp(timestamp: string): number {
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) {
    return 0;
  }
  return (Number(match[1]) * 1000) + Number(match[2]);
}

function latestMinorLevelFromBond(state: FullGameState, playerId: string): string {
  const bond = state.prospectBonds.find((entry) => entry.prospectId === playerId);
  if (!bond) {
    return 'AAA';
  }

  const milestone = [...bond.milestones]
    .reverse()
    .find((entry) => entry.startsWith('Promoted to ') && !entry.includes('MLB'));
  if (!milestone) {
    return 'AAA';
  }

  return milestone.replace(/^Promoted to /, '').split(',')[0] ?? 'AAA';
}

export function applyDebutFlashbacks(
  state: FullGameState,
  debutedPlayerIds: string[],
) {
  for (const playerId of debutedPlayerIds) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    const bond = state.prospectBonds.find((entry) => entry.prospectId === playerId);
    if (!player || !bond || state.debutFlashbacks.some((entry) => entry.playerId === playerId)) {
      continue;
    }

    const flashback = generateDebutFlashback({
      season: state.season,
      playerOrigins: state.playerOrigins,
      debutFlashbacks: state.debutFlashbacks,
    }, player, bond);
    if (flashback) {
      state.debutFlashbacks = [...state.debutFlashbacks, flashback];
    }

    if (player.teamId === state.userTeamId) {
      queueProspectDebutMoment(state, playerId, latestMinorLevelFromBond(state, playerId), flashback ?? null);
    }
  }
}

export function applyBreakoutCountdowns(
  state: FullGameState,
) {
  const countdowns = detectBreakoutCountdowns(state.rng.fork(), {
    season: state.season,
    day: state.day,
    players: state.players,
    playerOrigins: state.playerOrigins,
    playerStoryArcs: state.playerStoryArcs,
    minorLeagueStatHistory: new Map(state.minorLeagueState.minorLeagueStatHistory),
  });

  const existingActivePlayers = new Set(
    state.playerStoryArcs
      .filter((arc) => arc.resolvedSeason == null)
      .map((arc) => arc.playerId),
  );
  const openSlots = Math.max(0, 5 - existingActivePlayers.size);
  const newTickerEntries = countdowns
    .filter((countdown) => !state.tickerFeed.some((entry) => entry.id === `breakout-countdown-${countdown.playerId}-${state.season}-${state.day}`))
    .map((countdown) => ({
      id: `breakout-countdown-${countdown.playerId}-${state.season}-${state.day}`,
      timestamp: `S${state.season}D${state.day}`,
      category: 'prospect' as const,
      text: countdown.summary,
      priority: 3 as const,
      relatedTeamIds: [countdown.teamId],
      relatedPlayerIds: [countdown.playerId],
      expiresDay: absoluteDay(state.season, state.day) + 30,
    }));

  for (const countdown of countdowns.slice(0, openSlots)) {
    if (existingActivePlayers.has(countdown.playerId)) {
      continue;
    }

    state.playerStoryArcs = [
      ...state.playerStoryArcs,
      {
        playerId: countdown.playerId,
        arcType: 'prospect_rise',
        startSeason: state.season,
        startDay: state.day,
        phase: 'setup',
        milestones: [countdown.summary],
        resolvedSeason: null,
      },
    ];
    existingActivePlayers.add(countdown.playerId);
  }

  state.tickerFeed = pruneTickerFeed(
    [...newTickerEntries, ...state.tickerFeed],
    200,
    absoluteDay(state.season, state.day),
  );
}

function buildFarmStrength(state: FullGameState): { farmStrength: number; topProspectCount: number } {
  const prospects = state.players.filter((player) =>
    player.teamId === state.userTeamId
    && player.rosterStatus !== 'MLB'
    && player.rosterStatus !== 'INTERNATIONAL',
  );

  const scored = prospects.map((player) => {
    const bond = state.prospectBonds.find((entry) => entry.prospectId === player.id);
    return (
      ((player.ceiling ?? player.overallRating) / 5)
      + (bond?.bondStrength ?? 0)
    );
  });

  const farmStrength = scored.length > 0
    ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length)
    : 0;

  return {
    farmStrength,
    topProspectCount: prospects.filter((player) => (player.ceiling ?? player.overallRating) >= 340).length,
  };
}

function recentTradeHeadline(state: FullGameState): string | null {
  const recentTrade = state.tradeState.tradeHistory
    .filter((entry) => parseTimestamp(entry.timestamp ?? '') >= absoluteDay(state.season, Math.max(1, state.day - 30)))
    .find((entry) => entry.fromTeamId === state.userTeamId || entry.toTeamId === state.userTeamId);
  return recentTrade?.summary ?? null;
}

function userTeamStanding(state: FullGameState) {
  const division = getTeamById(state.userTeamId)?.division;
  const standings = division ? state.seasonState.standings.getFullStandings()[division] ?? [] : [];
  const entry = standings.find((candidate) => candidate.teamId === state.userTeamId);

  return {
    wins: entry?.wins ?? 0,
    losses: entry?.losses ?? 0,
    divisionRank: entry ? standings.indexOf(entry) + 1 : 1,
    gamesBack: Math.round(entry?.gamesBack ?? 0),
    clinched: state.phase === 'playoffs',
    eliminated: false,
  };
}

function ownerTone(state: FullGameState): 'supportive' | 'neutral' | 'impatient' {
  const owner = state.ownerState.get(state.userTeamId);
  if (!owner) {
    return 'neutral';
  }
  if ((owner.satisfaction ?? 100) <= 45 || owner.patience <= 35) {
    return 'impatient';
  }
  if ((owner.satisfaction ?? 0) >= 68 && owner.confidence >= 60) {
    return 'supportive';
  }
  return 'neutral';
}

export function applyMonthlyPressConference(state: FullGameState) {
  const farm = buildFarmStrength(state);
  const item = generatePressConference(state.rng.fork(), {
    season: state.season,
    day: state.day,
    userTeamId: state.userTeamId,
    teamRecord: userTeamStanding(state),
    ownerTone: ownerTone(state),
    recentTradeHeadline: recentTradeHeadline(state),
    farmStrength: farm.farmStrength,
    topProspectCount: farm.topProspectCount,
  });
  if (!item || state.news.some((entry) => entry.id === item.id)) {
    return;
  }

  state.news.unshift(item);
}
