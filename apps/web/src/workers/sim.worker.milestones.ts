import { checkMilestones, type Moment } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

type MilestoneStats = { hr: number; hits: number; k?: number; wins?: number };

interface CareerMilestoneEvent {
  count: number;
  milestoneType: 'home runs' | 'hits' | 'strikeouts' | 'wins';
  moment: Moment;
  playerId: string;
  playerName: string;
  teamId: string;
  tickerText: string;
}

function buildCumulativeMilestoneStats(state: FullGameState): Map<string, MilestoneStats> {
  const cumulative = new Map<string, MilestoneStats>();

  for (const ledger of state.careerStats) {
    cumulative.set(ledger.playerId, {
      hr: ledger.batting?.hr ?? 0,
      hits: ledger.batting?.hits ?? 0,
      k: ledger.pitching?.strikeouts ?? 0,
      wins: ledger.pitching?.wins ?? 0,
    });
  }

  for (const [playerId, stats] of state.seasonState.playerSeasonStats.entries()) {
    const current = cumulative.get(playerId) ?? { hr: 0, hits: 0, k: 0, wins: 0 };
    cumulative.set(playerId, {
      hr: current.hr + stats.hr,
      hits: current.hits + stats.hits,
      k: (current.k ?? 0) + stats.strikeouts,
      wins: (current.wins ?? 0) + stats.wins,
    });
  }

  return cumulative;
}

function eventFromMoment(
  players: FullGameState['players'],
  cumulativeStats: ReadonlyMap<string, MilestoneStats>,
  moment: Moment,
): CareerMilestoneEvent | null {
  const playerId = moment.playerIds[0];
  if (!playerId) {
    return null;
  }

  const player = players.find((entry) => entry.id === playerId);
  const stats = cumulativeStats.get(playerId);
  if (!player || !stats) {
    return null;
  }

  const playerName = `${player.firstName} ${player.lastName}`;
  switch (moment.type) {
    case 'milestone_hr':
      return {
        count: stats.hr,
        milestoneType: 'home runs',
        moment,
        playerId,
        playerName,
        teamId: player.teamId,
        tickerText: `hits career home run #${stats.hr}`,
      };
    case 'milestone_hit':
      return {
        count: stats.hits,
        milestoneType: 'hits',
        moment,
        playerId,
        playerName,
        teamId: player.teamId,
        tickerText: `records career hit #${stats.hits}`,
      };
    case 'milestone_k':
      return {
        count: stats.k ?? 0,
        milestoneType: 'strikeouts',
        moment,
        playerId,
        playerName,
        teamId: player.teamId,
        tickerText: `records career strikeout #${stats.k ?? 0}`,
      };
    case 'milestone_win':
      return {
        count: stats.wins ?? 0,
        milestoneType: 'wins',
        moment,
        playerId,
        playerName,
        teamId: player.teamId,
        tickerText: `earns career win #${stats.wins ?? 0}`,
      };
    default:
      return null;
  }
}

export function buildCareerMilestoneEvents(state: FullGameState, simDay: number): CareerMilestoneEvent[] {
  const cumulativeStats = buildCumulativeMilestoneStats(state);
  const eligibilityProbe = checkMilestones(cumulativeStats, [], state.season, simDay);
  const qualifyingPlayerIds = new Set(eligibilityProbe.flatMap((moment) => moment.playerIds));
  if (qualifyingPlayerIds.size === 0) {
    return [];
  }

  const qualifyingPlayers = state.players.filter((player) => qualifyingPlayerIds.has(player.id));
  return checkMilestones(cumulativeStats, qualifyingPlayers, state.season, simDay)
    .map((moment) => eventFromMoment(qualifyingPlayers, cumulativeStats, moment))
    .filter((event): event is CareerMilestoneEvent => event != null && event.count > 0);
}
