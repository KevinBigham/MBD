import type {
  AchievementState,
  AwardHistoryEntry,
  CeremonyMoment,
  CeremonyState,
  FranchiseState,
  HallOfFameEntry,
} from '@mbd/contracts';
import {
  checkMilestones,
  determinePlayoffSeeds,
  getTeamById,
  toDisplayRating,
  type PlayoffSeriesState,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function teamAbbreviation(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function currentTimestamp(state: FullGameState): string {
  return `S${state.season}D${state.day}`;
}

export function createDefaultFranchiseState(
  userTeamId: string,
  season: number,
  day: number,
): FranchiseState {
  const team = getTeamById(userTeamId);
  return {
    gmName: 'General Manager',
    difficulty: 'standard',
    createdAt: `S${season}D${day}`,
    teamId: userTeamId,
    teamName: team ? `${team.city} ${team.name}` : userTeamId.toUpperCase(),
    teamAbbreviation: team?.abbreviation ?? userTeamId.toUpperCase(),
    teamDivision: team?.division ?? 'UNKNOWN',
    onboarding: {
      welcomeBriefingSeen: true,
      firstMonthlyPulseSeen: true,
    },
  };
}

export function createEmptyCeremonyState(): CeremonyState {
  return {
    pendingMoments: [],
    seenMomentIds: [],
  };
}

export function createEmptyAchievementState(): AchievementState {
  return {
    unlocked: [],
    progress: [],
    counters: [],
    ledgers: [],
  };
}

export function getCeremonyStateView(state: FullGameState) {
  return {
    activeMoment: state.ceremony.pendingMoments[0] ?? null,
    queueLength: state.ceremony.pendingMoments.length,
  };
}

function hasSeenMoment(state: FullGameState, momentId: string): boolean {
  return state.ceremony.seenMomentIds.includes(momentId)
    || state.ceremony.pendingMoments.some((moment) => moment.id === momentId);
}

export function queueCeremonyMoment(state: FullGameState, moment: CeremonyMoment): boolean {
  if (hasSeenMoment(state, moment.id)) {
    return false;
  }

  state.ceremony.pendingMoments = [...state.ceremony.pendingMoments, moment];
  return true;
}

export function dismissCeremonyMoment(state: FullGameState, momentId: string) {
  const exists = state.ceremony.pendingMoments.some((moment) => moment.id === momentId);
  if (!exists) {
    return { success: false };
  }

  state.ceremony.pendingMoments = state.ceremony.pendingMoments.filter((moment) => moment.id !== momentId);
  if (!state.ceremony.seenMomentIds.includes(momentId)) {
    state.ceremony.seenMomentIds = [...state.ceremony.seenMomentIds, momentId];
  }
  return { success: true };
}

function buildPlayoffClinchMoment(state: FullGameState): CeremonyMoment | null {
  const seeds = determinePlayoffSeeds(state.seasonState.standings.getFullStandings());
  const seed = seeds.find((entry) => entry.teamId === state.userTeamId);
  if (!seed) {
    return null;
  }

  const record = state.seasonState.standings.getRecord(state.userTeamId);
  const detailLines = [
    `Clinched on day ${state.day}.`,
    `Final record ${record?.wins ?? 0}-${record?.losses ?? 0}.`,
    `${teamAbbreviation(state.userTeamId)} enter October as the ${seed.seed}${seed.seed === 1 ? 'st' : seed.seed === 2 ? 'nd' : seed.seed === 3 ? 'rd' : 'th'} seed.`,
  ];

  return {
    id: `playoff-clinch-${state.season}-${state.userTeamId}`,
    type: 'playoff_clinch',
    title: 'POSTSEASON BOUND',
    subtitle: teamLabel(state.userTeamId),
    detailLines,
    soundEffect: 'playoff_clinch',
    autoDismissMs: 5000,
    createdAt: currentTimestamp(state),
    theme: 'celebration',
    relatedTeamIds: [state.userTeamId],
    relatedPlayerIds: [],
  };
}

export function maybeQueuePlayoffClinchMoment(state: FullGameState) {
  const moment = buildPlayoffClinchMoment(state);
  if (moment) {
    queueCeremonyMoment(state, moment);
  }
}

function clincherPerformerLine(series: PlayoffSeriesState): string | null {
  const lastGame = series.games[series.games.length - 1];
  const hero = lastGame?.keyPerformers[0];
  return hero ? `${hero.playerName} set the tone with ${hero.statLine}.` : null;
}

export function queuePlayoffSeriesMoment(state: FullGameState, series: PlayoffSeriesState) {
  const winnerId = series.winnerId ?? series.higherSeed.teamId;
  if (winnerId !== state.userTeamId) {
    return;
  }

  const loserId = series.loserId ?? series.lowerSeed.teamId;
  const wins = Math.max(series.higherSeedWins, series.lowerSeedWins);
  const losses = Math.min(series.higherSeedWins, series.lowerSeedWins);
  const detailLines = [
    `${teamLabel(state.userTeamId)} beat ${teamLabel(loserId)} ${wins}-${losses}.`,
  ];
  const heroLine = clincherPerformerLine(series);
  if (heroLine) {
    detailLines.push(heroLine);
  }

  const isWorldSeries = series.round === 'WORLD_SERIES';
  queueCeremonyMoment(state, {
    id: `${isWorldSeries ? 'world-series' : 'series-win'}-${state.season}-${series.id}-${state.userTeamId}`,
    type: isWorldSeries ? 'world_series_win' : 'series_win',
    title: isWorldSeries ? 'WORLD CHAMPIONS' : 'ADVANCING',
    subtitle: teamLabel(state.userTeamId),
    detailLines,
    soundEffect: isWorldSeries ? 'world_series_win' : 'win',
    autoDismissMs: isWorldSeries ? 6500 : 5000,
    createdAt: currentTimestamp(state),
    theme: 'celebration',
    relatedTeamIds: [winnerId, loserId],
    relatedPlayerIds: series.games[series.games.length - 1]?.keyPerformers.map((performer) => performer.playerId) ?? [],
  });
}

export function queueAwardMoments(state: FullGameState, awards: AwardHistoryEntry[]) {
  for (const award of awards) {
    if (award.teamId !== state.userTeamId) {
      continue;
    }

    queueCeremonyMoment(state, {
      id: `award-moment-${award.season}-${award.league}-${award.award}-${award.playerId}`,
      type: 'award',
      title: award.award.toUpperCase(),
      subtitle: award.summary.split(' ')[0] ?? teamLabel(award.teamId),
      detailLines: [award.summary],
      soundEffect: 'achievement_unlock',
      autoDismissMs: 5000,
      createdAt: currentTimestamp(state),
      theme: 'historic',
      relatedTeamIds: [award.teamId],
      relatedPlayerIds: [award.playerId],
    });
  }
}

export function queueHallOfFameMoments(state: FullGameState, inductees: HallOfFameEntry[]) {
  for (const inductee of inductees) {
    if (!inductee.teamIds.includes(state.userTeamId)) {
      continue;
    }

    queueCeremonyMoment(state, {
      id: `hall-of-fame-${inductee.playerId}-${inductee.inductionSeason}`,
      type: 'hall_of_fame',
      title: 'HALL OF FAME',
      subtitle: inductee.playerName,
      detailLines: [inductee.summary],
      soundEffect: 'achievement_unlock',
      autoDismissMs: 5000,
      createdAt: currentTimestamp(state),
      theme: 'historic',
      relatedTeamIds: inductee.teamIds,
      relatedPlayerIds: [inductee.playerId],
    });
  }
}

function buildCumulativeMilestoneStats(state: FullGameState) {
  const cumulative = new Map<string, { hr: number; hits: number; k?: number; wins?: number }>();

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

export function queueCareerMilestoneMoments(state: FullGameState) {
  const cumulativeStats = buildCumulativeMilestoneStats(state);
  const moments = checkMilestones(cumulativeStats, state.players, state.season, state.day);

  for (const moment of moments) {
    const player = state.players.find((candidate) => candidate.id === moment.playerIds[0]);
    if (!player || player.teamId !== state.userTeamId) {
      continue;
    }

    queueCeremonyMoment(state, {
      id: `career-milestone-${moment.type}-${moment.playerIds[0]}-${moment.headline}`,
      type: 'career_milestone',
      title: moment.headline.replace(/^.*?(#|\s)(\d+)/, '$2').toUpperCase(),
      subtitle: `${player.firstName} ${player.lastName}`,
      detailLines: [moment.description],
      soundEffect: 'achievement_unlock',
      autoDismissMs: 5000,
      createdAt: currentTimestamp(state),
      theme: 'historic',
      relatedTeamIds: [state.userTeamId],
      relatedPlayerIds: moment.playerIds,
    });
  }
}

export function queueProspectDebutMoment(
  state: FullGameState,
  playerId: string,
  previousLevel: string,
) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.teamId !== state.userTeamId || player.rosterStatus !== 'MLB') {
    return;
  }

  queueCeremonyMoment(state, {
    id: `prospect-debut-${state.season}-${playerId}`,
    type: 'prospect_debut',
    title: 'THE FUTURE IS NOW',
    subtitle: `${player.firstName} ${player.lastName}`,
    detailLines: [
      `${previousLevel} to MLB.`,
      `${player.position} · ${toDisplayRating(player.overallRating)} OVR`,
    ],
    soundEffect: 'prospect_callup',
    autoDismissMs: 5000,
    createdAt: currentTimestamp(state),
    theme: 'future',
    relatedTeamIds: [player.teamId],
    relatedPlayerIds: [player.id],
  });
}
