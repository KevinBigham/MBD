import { getDaysUntilTradeDeadline, getTradeDeadlineDay, getTeamById, isTradeDeadlineModeDay } from '@mbd/sim-core';
import type { PressRoomEntry, PressRoomSource } from '../shared/types/pressRoom.js';
import type { FullGameState } from './sim.worker.helpers.js';

function parseTimestamp(timestamp: string): number {
  if (timestamp === 'NOW') return Number.MAX_SAFE_INTEGER;
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return 0;
  return Number(match[1]) * 1000 + Number(match[2]);
}

function compareSource(left: PressRoomSource, right: PressRoomSource): number {
  if (left === right) return 0;
  return left === 'briefing' ? -1 : 1;
}

function deriveTag(entry: {
  category: string;
  priority: number;
  tag?: string;
}): PressRoomEntry['tag'] {
  if (entry.tag === 'BREAKING' || entry.tag === 'ANALYSIS' || entry.tag === 'RECAP' || entry.tag === 'RUMOR') {
    return entry.tag;
  }
  if (entry.category === 'rumor') return 'RUMOR';
  if (entry.priority <= 1) return 'BREAKING';
  if (['extension', 'qualifying_offer', 'coaching', 'development', 'rivalry', 'owner', 'chemistry'].includes(entry.category)) {
    return 'ANALYSIS';
  }
  return 'RECAP';
}

function buildSyntheticEntries(state: FullGameState): PressRoomEntry[] {
  const entries: PressRoomEntry[] = [];
  const timestamp = `S${state.season}D${state.day}`;
  const userTeam = getTeamById(state.userTeamId);
  const userTeamName = userTeam ? `${userTeam.city} ${userTeam.name}` : state.userTeamId.toUpperCase();
  const deadlineDays = state.day <= getTradeDeadlineDay() ? getDaysUntilTradeDeadline(state.day) : 0;

  if (isTradeDeadlineModeDay(state.day) && state.tradeState.pendingOffers.length > 0) {
    entries.push({
      id: `synthetic-rumor-${state.season}-${state.day}`,
      source: 'news',
      category: 'rumor',
      tag: 'RUMOR',
      priority: 2,
      headline: `Deadline buzz: ${userTeamName} drawing calls with ${deadlineDays} days left`,
      body: `${state.tradeState.pendingOffers.length} active trade thread${state.tradeState.pendingOffers.length === 1 ? '' : 's'} keep ${userTeamName} in the rumor mill as the market tightens.`,
      timestamp,
      relatedTeamIds: [state.userTeamId],
      relatedPlayerIds: [],
    });
  }

  const hotStoveCandidate = state.freeAgencyMarket?.freeAgents
    .filter((entry) =>
      entry.signedWith == null
      && entry.interestedTeams.length >= 2
      && (entry.demandLevel === 'elite' || entry.demandLevel === 'high'),
    )
    .sort((left, right) => right.marketValue - left.marketValue)[0];
  if (hotStoveCandidate) {
    const playerName = `${hotStoveCandidate.player.firstName} ${hotStoveCandidate.player.lastName}`;
    const clubLabels = hotStoveCandidate.interestedTeams
      .slice(0, 3)
      .map((teamId) => getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase())
      .join(', ');
    entries.push({
      id: `synthetic-fa-rumor-${hotStoveCandidate.player.id}-${state.season}-${state.day}`,
      source: 'news',
      category: 'rumor',
      tag: 'RUMOR',
      priority: 2,
      headline: `Hot stove: ${playerName} drawing interest from ${clubLabels}`,
      body: `${playerName} still has ${hotStoveCandidate.interestedTeams.length} clubs circling as free agency moves through the top tier.`,
      timestamp,
      relatedTeamIds: hotStoveCandidate.interestedTeams.slice(0, 3),
      relatedPlayerIds: [hotStoveCandidate.player.id],
    });
  }

  const latestDevelopment = [...state.minorLeagueState.developmentReports]
    .sort((left, right) => right.season - left.season || right.month - left.month)[0];
  if (latestDevelopment) {
    const developmentPlayer = state.players.find((player) => player.id === latestDevelopment.playerId);
    const developmentPlayerName = developmentPlayer
      ? `${developmentPlayer.firstName} ${developmentPlayer.lastName}`
      : 'Prospect';
    entries.push({
      id: `synthetic-development-${latestDevelopment.playerId}-${latestDevelopment.season}-${latestDevelopment.month}`,
      source: 'briefing',
      category: 'development',
      tag: 'ANALYSIS',
      priority: 3,
      headline: `${developmentPlayerName} is building real momentum in player development`,
      body: latestDevelopment.summary,
      timestamp,
      relatedTeamIds: [latestDevelopment.teamId],
      relatedPlayerIds: [latestDevelopment.playerId],
    });
  }

  const topRivalry = [...state.rivalries.values()].sort((left, right) => right.intensity - left.intensity)[0];
  if (topRivalry && topRivalry.intensity >= 55) {
    const teamA = getTeamById(topRivalry.teamA);
    const teamB = getTeamById(topRivalry.teamB);
    entries.push({
      id: `synthetic-rivalry-${topRivalry.id}-${state.season}-${state.day}`,
      source: 'news',
      category: 'rivalry',
      tag: 'ANALYSIS',
      priority: 3,
      headline: `Rivalry watch: ${(teamA?.abbreviation ?? topRivalry.teamA.toUpperCase())} vs ${(teamB?.abbreviation ?? topRivalry.teamB.toUpperCase())}`,
      body: topRivalry.summary,
      timestamp,
      relatedTeamIds: [topRivalry.teamA, topRivalry.teamB],
      relatedPlayerIds: [],
    });
  }

  return entries;
}

export function buildPressRoomFeed(
  state: FullGameState,
  limit: number = 100,
): PressRoomEntry[] {
  const duplicateBriefingIds = new Set(state.news.map((item) => `brief-${item.id}`));

  const briefingEntries: PressRoomEntry[] = state.briefingQueue
    .filter((item) => !duplicateBriefingIds.has(item.id))
    .map((item) => ({
      id: item.id,
      source: 'briefing',
      category: item.category,
      tag: deriveTag(item),
      priority: item.priority,
      headline: item.headline,
      body: item.body,
      timestamp: item.timestamp,
      relatedTeamIds: item.relatedTeamIds,
      relatedPlayerIds: item.relatedPlayerIds,
    }));

  const newsEntries: PressRoomEntry[] = state.news.map((item) => ({
    id: item.id,
    source: 'news',
    category: item.category,
    tag: deriveTag(item),
    priority: item.priority,
    headline: item.headline,
    body: item.body,
    timestamp: item.timestamp,
    relatedTeamIds: item.relatedTeamIds,
    relatedPlayerIds: item.relatedPlayerIds,
  }));

  const syntheticEntries = buildSyntheticEntries(state).filter((entry) =>
    !briefingEntries.some((candidate) => candidate.id === entry.id)
    && !newsEntries.some((candidate) => candidate.id === entry.id),
  );

  return [...syntheticEntries, ...briefingEntries, ...newsEntries]
    .sort((left, right) => {
      const timestampDelta = parseTimestamp(right.timestamp) - parseTimestamp(left.timestamp);
      if (timestampDelta !== 0) return timestampDelta;
      if (left.priority !== right.priority) return left.priority - right.priority;
      const sourceDelta = compareSource(left.source, right.source);
      if (sourceDelta !== 0) return sourceDelta;
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}
