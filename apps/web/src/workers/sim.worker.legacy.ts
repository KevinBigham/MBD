import {
  calculateDynastyScore,
  getTeamById,
  processHOFInductions,
  toDisplayRating,
  type CareerStatsLedger,
  type FranchiseTimelineEntry,
  type HallOfFameCandidate,
} from '@mbd/sim-core';
import type { GeneratedPlayer, PlayerGameStats } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import { buildAdvancedStatsIndex } from './sim.worker.stats.js';

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function qualifyingSeason(state: FullGameState, player: GeneratedPlayer): boolean {
  const stats = state.seasonState.playerSeasonStats.get(player.id);
  return player.rosterStatus === 'MLB'
    || player.teamId !== ''
    || (stats != null && (stats.pa > 0 || stats.ip > 0));
}

function uniqueStrings(values: string[], limit: number = values.length): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).slice(0, limit);
}

function ensureCareerEntry(
  careerStats: CareerStatsLedger[],
  player: GeneratedPlayer,
): CareerStatsLedger {
  const existing = careerStats.find((entry) => entry.playerId === player.id);
  if (existing) {
    return existing;
  }

  const created: CareerStatsLedger = {
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    seasonsPlayed: 0,
    teamIds: player.teamId ? [player.teamId] : [],
    peakOverall: toDisplayRating(player.overallRating),
    championshipRings: 0,
    allStarSelections: 0,
    gamesPlayed: 0,
    saves: 0,
    war: 0,
    batting: player.pitcherAttributes
      ? null
      : {
        hits: 0,
        hr: 0,
        rbi: 0,
      },
    pitching: player.pitcherAttributes
      ? {
        wins: 0,
        strikeouts: 0,
        inningsPitched: 0,
        earnedRuns: 0,
        shutouts: 0,
      }
      : null,
  };
  careerStats.push(created);
  return created;
}

function applySeasonStatsToCareer(entry: CareerStatsLedger, stats: PlayerGameStats | undefined) {
  if (!stats) {
    return;
  }

  if (entry.batting) {
    entry.batting = {
      hits: entry.batting.hits + stats.hits,
      hr: entry.batting.hr + stats.hr,
      rbi: entry.batting.rbi + stats.rbi,
    };
  }

  entry.gamesPlayed = (entry.gamesPlayed ?? 0) + (stats.gamesPlayed ?? 0);
  entry.saves = (entry.saves ?? 0) + (stats.saves ?? 0);

  if (entry.pitching) {
    entry.pitching = {
      wins: entry.pitching.wins + stats.wins,
      strikeouts: entry.pitching.strikeouts + stats.strikeouts,
      inningsPitched: entry.pitching.inningsPitched + (stats.ip / 3),
      earnedRuns: entry.pitching.earnedRuns + stats.earnedRuns,
      shutouts: entry.pitching.shutouts,
    };
  }
}

function playoffAppearance(state: FullGameState): boolean {
  return state.playoffBracket?.seeds.some((seed) => seed.teamId === state.userTeamId) ?? false;
}

function worldSeriesAppearance(state: FullGameState): boolean {
  const worldSeries = state.playoffBracket?.series.find((series) => series.round === 'WORLD_SERIES');
  return Boolean(worldSeries && (worldSeries.winnerId === state.userTeamId || worldSeries.loserId === state.userTeamId));
}

function divisionTitle(state: FullGameState): boolean {
  const team = getTeamById(state.userTeamId);
  if (!team) return false;
  const standings = state.seasonState.standings.getFullStandings()[team.division] ?? [];
  return standings[0]?.teamId === state.userTeamId;
}

function recordLabel(state: FullGameState): string {
  const record = state.seasonState.standings.getRecord(state.userTeamId);
  return `${record?.wins ?? 0}-${record?.losses ?? 0}`;
}

function playoffResultLabel(state: FullGameState): string {
  const historyEntry = state.seasonHistory.find((entry) => entry.season === state.season);
  return historyEntry?.userSeason?.playoffResult ?? 'Missed playoffs';
}

function seasonAwardWinnerCount(state: FullGameState): number {
  return state.awardHistory.filter((entry) => entry.season === state.season && entry.teamId === state.userTeamId).length;
}

function keyAcquisitionHeadlines(state: FullGameState): string[] {
  return uniqueStrings(
    state.news
      .filter((item) =>
        item.relatedTeamIds.includes(state.userTeamId)
        && item.timestamp.startsWith(`S${state.season}D`)
        && (item.category === 'trade' || item.category === 'signing'),
      )
      .map((item) => item.headline),
    3,
  );
}

function updateTimelineScores(entries: FranchiseTimelineEntry[]) {
  const ordered = [...entries].sort((left, right) => left.season - right.season);
  for (const entry of ordered) {
    const summary = calculateDynastyScore(ordered.filter((candidate) => candidate.season <= entry.season));
    const target = entries.find((candidate) => candidate.season === entry.season && candidate.teamId === entry.teamId);
    if (target) {
      target.dynastyScore = summary.score;
    }
  }
}

export function accrueCareerStatsForSeason(state: FullGameState) {
  const championId = state.playoffBracket?.champion ?? null;
  const advancedIndex = buildAdvancedStatsIndex(state);

  for (const player of state.players) {
    if (!qualifyingSeason(state, player)) {
      continue;
    }

    const entry = ensureCareerEntry(state.careerStats, player);
    entry.playerName = `${player.firstName} ${player.lastName}`;
    entry.position = player.position;
    entry.seasonsPlayed = Math.max(
      entry.seasonsPlayed,
      (state.serviceTime.get(player.id) ?? 0) + 1,
    );
    entry.peakOverall = Math.max(entry.peakOverall, toDisplayRating(player.overallRating));
    entry.teamIds = uniqueStrings([...entry.teamIds, player.teamId].filter((teamId) => teamId.length > 0));
    if (championId && player.teamId === championId && player.rosterStatus === 'MLB') {
      entry.championshipRings += 1;
    }
    applySeasonStatsToCareer(entry, state.seasonState.playerSeasonStats.get(player.id));
    if (entry.pitching) {
      entry.pitching.shutouts = player.careerShutouts;
    }
    entry.war = Number(((entry.war ?? 0) + (advancedIndex.get(player.id)?.war ?? 0)).toFixed(1));
  }
}

export function syncHistoricalPlayersForRetirements(state: FullGameState, retiredPlayerIds: string[]) {
  const byId = new Map(state.historicalPlayers.map((player) => [player.playerId, player]));

  for (const playerId of retiredPlayerIds) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      continue;
    }

    const ledger = state.careerStats.find((entry) => entry.playerId === playerId);
    byId.set(playerId, {
      playerId,
      fullName: `${player.firstName} ${player.lastName}`,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      lastKnownTeamId: player.teamId,
      active: false,
      retiredSeason: state.season,
      seasonsPlayed: ledger?.seasonsPlayed ?? Math.round(player.serviceTimeDays / 172),
      peakOverall: ledger?.peakOverall ?? toDisplayRating(player.overallRating),
      personalityTraits: [...(player.personalityTraits ?? [])],
    });
  }

  state.historicalPlayers = Array.from(byId.values()).sort((left, right) =>
    left.fullName.localeCompare(right.fullName),
  );
}

export function upsertFranchiseTimelineEntry(state: FullGameState) {
  const record = state.seasonState.standings.getRecord(state.userTeamId);
  const current: FranchiseTimelineEntry = {
    season: state.season,
    teamId: state.userTeamId,
    record: recordLabel(state),
    winTotal: record?.wins ?? 0,
    playoffResult: playoffResultLabel(state),
    championship: state.playoffBracket?.champion === state.userTeamId,
    worldSeriesAppearance: worldSeriesAppearance(state),
    playoffAppearance: playoffAppearance(state),
    divisionTitle: divisionTitle(state),
    awardWinnerCount: seasonAwardWinnerCount(state),
    keyAcquisitions: keyAcquisitionHeadlines(state),
    keyDepartures: state.franchiseTimeline.find((entry) => entry.season === state.season)?.keyDepartures ?? [],
    dynastyScore: 0,
  };

  const existingIndex = state.franchiseTimeline.findIndex((entry) => entry.season === state.season);
  if (existingIndex >= 0) {
    state.franchiseTimeline.splice(existingIndex, 1, {
      ...state.franchiseTimeline[existingIndex]!,
      ...current,
    });
  } else {
    state.franchiseTimeline.push(current);
  }

  updateTimelineScores(state.franchiseTimeline);
}

export function enrichFranchiseTimelineWithDepartures(state: FullGameState, retiredPlayerIds: string[]) {
  const entry = state.franchiseTimeline.find((candidate) => candidate.season === state.season);
  if (!entry) {
    return;
  }

  const departures = retiredPlayerIds
    .map((playerId) => state.players.find((player) => player.id === playerId))
    .filter((player): player is GeneratedPlayer => player != null && player.teamId === state.userTeamId)
    .map((player) => `${player.firstName} ${player.lastName} retired`);

  entry.keyDepartures = uniqueStrings([...entry.keyDepartures, ...departures], 4);
  updateTimelineScores(state.franchiseTimeline);
}

function candidateFromPlayer(state: FullGameState, player: GeneratedPlayer): HallOfFameCandidate | null {
  const careerStats = state.careerStats.find((entry) => entry.playerId === player.id);
  if (!careerStats) {
    return null;
  }

  return {
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    seasonsPlayed: careerStats.seasonsPlayed,
    peakOverall: careerStats.peakOverall,
    currentOverall: toDisplayRating(player.overallRating),
    teamIds: careerStats.teamIds,
    championshipRings: careerStats.championshipRings,
    allStarSelections: careerStats.allStarSelections,
    careerStats,
  };
}

export function processHallOfFameForRetirements(state: FullGameState, retiredPlayerIds: string[]) {
  const retiredCandidates = retiredPlayerIds
    .map((playerId) => state.players.find((player) => player.id === playerId))
    .filter((player): player is GeneratedPlayer => player != null)
    .map((player) => candidateFromPlayer(state, player))
    .filter((candidate): candidate is HallOfFameCandidate => candidate != null);

  const result = processHOFInductions({
    retiredPlayers: retiredCandidates,
    awardHistory: state.awardHistory,
    existingHallOfFame: state.hallOfFame,
    ballotEntries: state.hallOfFameBallot,
    currentSeason: state.season + 1,
    rng: state.rng.fork(),
  });

  state.hallOfFame = result.hallOfFame;
  state.hallOfFameBallot = result.ballotEntries;

  for (const inductee of result.inductees) {
    const headline = `${inductee.playerName} enters the Hall of Fame`;
    const body = inductee.summary;
    if (!state.news.some((item) => item.id === `hof-${inductee.playerId}-${inductee.inductionSeason}`)) {
      state.news.unshift({
        id: `hof-${inductee.playerId}-${inductee.inductionSeason}`,
        headline,
        body,
        priority: 1,
        category: 'award',
        timestamp: `S${state.season}D${state.day}`,
        relatedPlayerIds: [inductee.playerId],
        relatedTeamIds: inductee.teamIds,
        read: false,
      });
    }

    const briefingId = `brief-hof-${inductee.playerId}-${inductee.inductionSeason}`;
    if (!state.briefingQueue.some((item) => item.id === briefingId)) {
      state.briefingQueue.unshift({
        id: briefingId,
        priority: 1,
        category: 'award',
        headline,
        body,
        relatedTeamIds: inductee.teamIds,
        relatedPlayerIds: [inductee.playerId],
        timestamp: `S${state.season}D${state.day}`,
        acknowledged: false,
      });
    }
  }

  return result.inductees;
}

export function getDynastyScoreSummary(state: FullGameState) {
  return calculateDynastyScore(state.franchiseTimeline);
}

export function hallOfFameTeamSummary(player: CareerStatsLedger): string {
  return player.teamIds.map((teamId) => teamLabel(teamId)).join(', ');
}
