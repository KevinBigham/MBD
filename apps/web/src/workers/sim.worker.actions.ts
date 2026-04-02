import {
  GameRNG,
  TEAMS,
  assignGMPersonality,
  buildRosterState,
  consumeOptionYear,
  createSeasonState,
  demotePlayer,
  determinePlayoffSeeds,
  determineRetirements,
  developAllPlayers,
  dfaPlayer,
  evaluateTradeProposal,
  executeTrade,
  generateDraftClass,
  generateLeaguePlayers,
  generateSchedule,
  generateScoutingStaff,
  getTeamById,
  initializePlayoffBracket,
  isPlayoffComplete,
  markAsRead,
  makeUserOffer,
  promotePlayer,
  recordRetirements,
  simulateDay,
  simulateMonth,
  simNextPlayoffGame,
  simPlayoffRound as simPlayoffBracketRound,
  simPlayoffSeries as simPlayoffBracketSeries,
  simulateWeek,
  generateTradeId,
  createFreeAgencyMarket,
} from '@mbd/sim-core';
import type {
  ContractOffer,
  PlayoffBracket,
  PlayoffGameResult,
  PlayoffSeriesState,
  TradeProposal,
} from '@mbd/sim-core';
import type { TradeAsset } from '@mbd/contracts';
import {
  createEmptyDraftState,
  createEmptyInternationalScoutingState,
  createEmptyMinorLeagueState,
  advanceMinorLeagueDay,
  buildOffseasonStateView,
  claimPlayerOffWaivers,
  createEmptyTradeState,
  enforceRule5RosterRestriction,
  ensurePlayersHaveRule5Eligibility,
  getTeamPlayers,
  lockUserRule5Protection,
  makeUserDraftSelection,
  makeUserRule5Selection,
  processDayInjuriesAndNews,
  requireState,
  resolveRule5OfferBackDecision,
  passUserRule5Turn,
  placePlayerOnWaivers,
  scoutUserDraftPlayer,
  scoutUserIFAPlayer,
  signUserIFAPlayer,
  signUserDraftPick,
  startDraftSession,
  setState,
  skipOffseasonPhaseWithAI,
  toggleUserDraftBigBoardPlayer,
  tradeUserIFABonusPool,
  simulateRemainingDraftSession,
  timestamp,
  toggleUserRule5Protection,
  advanceOffseasonOnce,
} from './sim.worker.helpers.js';
import type {
  FullGameState,
  OffseasonStateView,
  SimResultDTO,
} from './sim.worker.helpers.js';
import { exportGameSnapshot, importGameSnapshot } from './snapshot.js';
import {
  clearPendingTradeOffers,
  isTradeMarketOpen,
  processTradeMarketActivity,
  proposeTradePackage,
  recordAcceptedUserTrade,
  respondToTradeOffer,
} from './sim.worker.trade.js';
import {
  ensureNarrativeState,
  ensureAwardHistoryForSeason,
  finalizeSeasonHistoryRetirements,
  recordBreakoutNarratives,
  recordSeasonHistory,
  refreshNarrativeState,
} from './sim.worker.narrative.js';
import {
  applyAISigningConsequences,
  applyPostseasonConsequences,
  applyRetirementConsequences,
  applySeriesOutcomeConsequences,
  applySigningConsequences,
  applyTradeConsequences,
} from './sim.worker.consequences.js';
import {
  accrueCareerStatsForSeason,
  enrichFranchiseTimelineWithDepartures,
  processHallOfFameForRetirements,
  upsertFranchiseTimelineEntry,
} from './sim.worker.legacy.js';

function applyAISigningProgress(
  s: FullGameState,
  aiSignings: Array<{
    playerId: string;
    teamId: string;
    years: number;
    annualSalary: number;
    marketValue: number;
  }>,
) {
  for (const signing of aiSignings) {
    applyAISigningConsequences(
      s,
      signing.playerId,
      signing.teamId,
      signing.annualSalary,
      signing.years,
      signing.marketValue,
    );
  }
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function teamAbbreviation(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function roundLabel(round: PlayoffSeriesState['round']): string {
  switch (round) {
    case 'WILD_CARD':
      return 'Wild Card Series';
    case 'DIVISION_SERIES':
      return 'Division Series';
    case 'CHAMPIONSHIP_SERIES':
      return 'Championship Series';
    case 'WORLD_SERIES':
      return 'World Series';
  }
}

function uniqueSeriesFromBracket(bracket: PlayoffBracket): PlayoffSeriesState[] {
  const seriesById = new Map<string, PlayoffSeriesState>();
  for (const series of bracket.completedRounds.flatMap((round) => round.series)) {
    seriesById.set(series.id, series);
  }
  for (const series of bracket.currentRoundSeries) {
    seriesById.set(series.id, series);
  }
  return Array.from(seriesById.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function countBracketGames(bracket: PlayoffBracket): number {
  return uniqueSeriesFromBracket(bracket).reduce((total, series) => total + series.games.length, 0);
}

function addPlayoffCoverage(
  s: FullGameState,
  id: string,
  headline: string,
  body: string,
  relatedTeamIds: string[],
  relatedPlayerIds: string[],
  priority: 1 | 2 = 2,
) {
  if (!s.news.some((item) => item.id === id)) {
    s.news.unshift({
      id,
      headline,
      body,
      priority,
      category: 'playoff',
      timestamp: timestamp(),
      relatedPlayerIds,
      relatedTeamIds,
      read: false,
    });
  }

  const briefingId = `brief-${id}`;
  if (!s.briefingQueue.some((item) => item.id === briefingId)) {
    s.briefingQueue.unshift({
      id: briefingId,
      priority,
      category: 'news',
      headline,
      body,
      relatedTeamIds,
      relatedPlayerIds,
      timestamp: timestamp(),
      acknowledged: false,
    });
  }
}

function buildPlayoffGameCoverage(game: PlayoffGameResult, series: PlayoffSeriesState) {
  const winnerScore = game.winnerId === game.homeTeamId ? game.homeScore : game.awayScore;
  const loserScore = game.loserId === game.homeTeamId ? game.homeScore : game.awayScore;
  const winnerAbbr = teamAbbreviation(game.winnerId);
  const loserAbbr = teamAbbreviation(game.loserId);

  let headline = `${winnerAbbr} take Game ${game.gameNumber}, ${winnerScore}-${loserScore}`;
  if (game.innings > 9 && game.winnerId === game.homeTeamId) {
    headline = `${winnerAbbr} walk it off in the ${ordinal(game.innings)} to win Game ${game.gameNumber}`;
  } else if (loserScore === 0) {
    headline = `${winnerAbbr} blank ${loserAbbr} ${winnerScore}-${loserScore} in Game ${game.gameNumber}`;
  }

  const performerSummary = game.keyPerformers.length > 0
    ? game.keyPerformers.map((performer) => `${performer.playerName} (${performer.statLine})`).join('; ')
    : 'No signature lines were recorded.';

  return {
    headline,
    body: `${teamLabel(game.winnerId)} beat ${teamLabel(game.loserId)} in ${roundLabel(series.round)} Game ${game.gameNumber}. ${performerSummary}`,
    relatedTeamIds: [game.winnerId, game.loserId],
    relatedPlayerIds: game.keyPerformers.map((performer) => performer.playerId),
  };
}

function buildSeriesCoverage(series: PlayoffSeriesState) {
  const winnerId = series.winnerId ?? series.higherSeed.teamId;
  const loserId = series.loserId ?? series.lowerSeed.teamId;
  const winnerAbbr = teamAbbreviation(winnerId);
  const loserAbbr = teamAbbreviation(loserId);
  const lastGame = series.games[series.games.length - 1] ?? null;
  const clincherLine = lastGame
    ? `The clincher finished ${lastGame.winnerId === lastGame.homeTeamId ? lastGame.homeScore : lastGame.awayScore}-${lastGame.loserId === lastGame.homeTeamId ? lastGame.homeScore : lastGame.awayScore}.`
    : 'The series ended without a recorded box score.';

  return {
    headline: `${winnerAbbr} eliminate ${loserAbbr} ${Math.max(series.higherSeedWins, series.lowerSeedWins)}-${Math.min(series.higherSeedWins, series.lowerSeedWins)}`,
    body: `${teamLabel(winnerId)} closed out the ${roundLabel(series.round)} against ${teamLabel(loserId)}. ${clincherLine}`,
    relatedTeamIds: [winnerId, loserId],
    relatedPlayerIds: lastGame?.keyPerformers.map((performer) => performer.playerId) ?? [],
  };
}

function recordPlayoffProgressCoverage(
  s: FullGameState,
  before: PlayoffBracket,
  after: PlayoffBracket,
) {
  const beforeSeries = new Map(uniqueSeriesFromBracket(before).map((series) => [series.id, series]));

  for (const series of uniqueSeriesFromBracket(after)) {
    const previousSeries = beforeSeries.get(series.id);
    const previousGameCount = previousSeries?.games.length ?? 0;
    const newGames = series.games.slice(previousGameCount);

    for (const game of newGames) {
      const coverage = buildPlayoffGameCoverage(game, series);
      addPlayoffCoverage(
        s,
        `playoff-game-${s.season}-${series.id}-${game.gameNumber}`,
        coverage.headline,
        coverage.body,
        coverage.relatedTeamIds,
        coverage.relatedPlayerIds,
        game.innings > 9 || Math.min(game.homeScore, game.awayScore) === 0 ? 1 : 2,
      );
    }

    if (series.status === 'complete' && previousSeries?.status !== 'complete') {
      const coverage = buildSeriesCoverage(series);
      addPlayoffCoverage(
        s,
        `playoff-series-${s.season}-${series.id}`,
        coverage.headline,
        coverage.body,
        coverage.relatedTeamIds,
        coverage.relatedPlayerIds,
        1,
      );
      applySeriesOutcomeConsequences(s, series.winnerId ?? series.higherSeed.teamId, series.loserId ?? series.lowerSeed.teamId);
    }
  }

  if (before.currentRound !== after.currentRound && !after.champion) {
    const roundTeams = after.currentRoundSeries.flatMap((series) => [series.higherSeed.teamId, series.lowerSeed.teamId]);
    addPlayoffCoverage(
      s,
      `playoff-round-${s.season}-${after.currentRound}`,
      `${roundLabel(after.currentRound)} field is set`,
      `The postseason moves on to the ${roundLabel(after.currentRound)}.`,
      Array.from(new Set(roundTeams)),
      [],
    );
  }
}

function finalizePlayoffRunIfNeeded(s: FullGameState) {
  if (!s.playoffBracket?.champion) {
    return;
  }

  const alreadyRecorded = s.seasonHistory.some((entry) => entry.season === s.season);
  if (alreadyRecorded) {
    return;
  }

  ensureAwardHistoryForSeason(s);
  const seasonMoments = applyPostseasonConsequences(s);
  recordSeasonHistory(s, seasonMoments);
  upsertFranchiseTimelineEntry(s);
  clearPendingTradeOffers(s);
}

function ensurePlayoffBracket(s: FullGameState): boolean {
  if (s.playoffBracket) {
    return false;
  }

  s.playoffBracket = initializePlayoffBracket(s.seasonState.standings.getFullStandings(), s.rng.fork());
  return true;
}

function playoffResult(s: FullGameState, gamesPlayed: number): SimResultDTO {
  return {
    day: s.day,
    season: s.season,
    phase: s.phase,
    gamesPlayed,
    seasonComplete: s.phase !== 'regular',
    flowStateChanged: true,
  };
}

function transitionToPlayoffIntro(s: FullGameState, gamesPlayed: number, seasonComplete: boolean): SimResultDTO {
  if (seasonComplete) {
    ensureAwardHistoryForSeason(s);
    clearPendingTradeOffers(s);
    s.phase = 'playoffs';
    s.day = 1;
    s.playoffBracket = null;
  }

  return {
    day: s.day,
    season: s.season,
    phase: s.phase,
    gamesPlayed,
    seasonComplete,
    flowStateChanged: true,
  };
}

function simWeekInternal(): SimResultDTO {
  const s = requireState();
  if (s.phase !== 'regular') {
    return simDayInternal();
  }

  const previousDay = s.day;
  const { newState, result } = simulateWeek(s.rng, s.seasonState, s.schedule, s.players);
  s.seasonState = newState;
  s.day = newState.currentDay;
  processTradeMarketActivity(s, previousDay, s.day);
  processDayInjuriesAndNews(s);
  refreshNarrativeState(s, result.games);
  return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
}

function simMonthInternal(): SimResultDTO {
  const s = requireState();
  if (s.phase !== 'regular') {
    return simDayInternal();
  }

  const previousDay = s.day;
  const { newState, result } = simulateMonth(s.rng, s.seasonState, s.schedule, s.players);
  s.seasonState = newState;
  s.day = newState.currentDay;
  processTradeMarketActivity(s, previousDay, s.day);
  processDayInjuriesAndNews(s);
  refreshNarrativeState(s, result.games);
  return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
}

function finalizeOffseasonRollover(s: FullGameState): SimResultDTO {
  accrueCareerStatsForSeason(s);

  const beforePlayers = s.players;
  const developedPlayers = developAllPlayers(s.rng.fork(), s.players);
  recordBreakoutNarratives(s, beforePlayers, developedPlayers);
  s.players = developedPlayers;

  const retired = determineRetirements(s.rng.fork(), s.players);
  processHallOfFameForRetirements(s, retired);
  enrichFranchiseTimelineWithDepartures(s, retired);
  if (s.offseasonState) {
    s.offseasonState = recordRetirements(
      s.offseasonState,
      retired.map((playerId) => {
        const player = s.players.find((candidate) => candidate.id === playerId);
        const seasonsPlayed = s.serviceTime.get(playerId) ?? 0;
        const playerName = player ? `${player.firstName} ${player.lastName}` : playerId;
        return {
          playerId,
          teamId: player?.teamId ?? '',
          playerName,
          seasonsPlayed,
          summary: `${playerName} retired after ${seasonsPlayed} seasons.`,
        };
      }),
    );
  }

  applyRetirementConsequences(s, retired);
  finalizeSeasonHistoryRetirements(s, retired);
  s.players = s.players.filter((player) => !retired.includes(player.id));
  s.season++;
  s.day = 1;
  s.phase = 'preseason';
  s.playoffBracket = null;
  s.offseasonState = null;
  s.rule5Session = null;
  s.rule5Obligations = [];
  s.rule5OfferBackStates = [];
  s.draftClass = null;
  s.freeAgencyMarket = null;
  s.tradeState = createEmptyTradeState();
  s.internationalScoutingState = createEmptyInternationalScoutingState(s.season);
  s.draftState = createEmptyDraftState();
  s.minorLeagueState = createEmptyMinorLeagueState(s.season);
  const teamIds = TEAMS.map((team) => team.id);
  s.schedule = generateSchedule(s.rng.fork());
  s.seasonState = createSeasonState(s.season, teamIds);
  for (const teamId of teamIds) {
    s.rosterStates.set(teamId, buildRosterState(teamId, s.players));
  }
  ensureNarrativeState(s);
  return {
    day: 1,
    season: s.season,
    phase: 'preseason',
    gamesPlayed: 0,
    seasonComplete: false,
    flowStateChanged: true,
  };
}

function simDayInternal(): SimResultDTO {
  const s = requireState();
  if (s.phase === 'preseason') {
    s.phase = 'regular';
    s.day = 1;
  }

  if (s.phase === 'regular') {
    const previousDay = s.day;
    const { newState, result } = simulateDay(s.rng, s.seasonState, s.schedule, s.players);
    s.seasonState = newState;
    s.day = newState.currentDay;
    advanceMinorLeagueDay(s);
    processTradeMarketActivity(s, previousDay, s.day);
    processDayInjuriesAndNews(s);
    refreshNarrativeState(s, result.games);
    return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
  }

  if (s.phase === 'playoffs') {
    if (ensurePlayoffBracket(s)) {
      return playoffResult(s, 0);
    }

    if (s.playoffBracket?.champion) {
      finalizePlayoffRunIfNeeded(s);
      return playoffResult(s, 0);
    }

    const before = s.playoffBracket!;
    const gamesBefore = countBracketGames(before);
    let working = before;
    while (!isPlayoffComplete(working)) {
      working = simPlayoffBracketRound(working, s.players, s.rng.fork());
    }
    s.playoffBracket = working;
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  }

  if (s.phase === 'offseason') {
    if (s.offseasonState?.completed) {
      return {
        day: s.day,
        season: s.season,
        phase: 'offseason',
        gamesPlayed: 0,
        seasonComplete: true,
      };
    }

    const offseasonProgress = advanceOffseasonOnce(s);
    applyAISigningProgress(s, offseasonProgress.aiSignings);

    return {
      day: s.day,
      season: s.season,
      phase: 'offseason',
      gamesPlayed: 0,
      seasonComplete: true,
    };
  }

  return {
    day: s.day,
    season: s.season,
    phase: s.phase,
    gamesPlayed: 0,
    seasonComplete: false,
    flowStateChanged: true,
  };
}

export const actionApi = {
  newGame(seed: number, userTeamId: string = 'nyy') {
    const rng = new GameRNG(seed);
    const teamIds = TEAMS.map((team) => team.id);
    const players = generateLeaguePlayers(rng.fork(), teamIds);
    ensurePlayersHaveRule5Eligibility(players, 1);
    const schedule = generateSchedule(rng.fork());
    const seasonState = createSeasonState(1, teamIds);

    const serviceTime = new Map<string, number>();
    for (const player of players) {
      if (player.rosterStatus === 'MLB') {
        const yearsOfService = rng.nextInt(0, 8);
        serviceTime.set(player.id, yearsOfService);
        player.serviceTimeDays = yearsOfService * 172;
      }
    }

    const scoutingStaffs = new Map();
    const gmPersonalities = new Map();
    const rosterStates = new Map();
    for (const teamId of teamIds) {
      scoutingStaffs.set(teamId, generateScoutingStaff(rng.fork(), teamId));
      gmPersonalities.set(teamId, assignGMPersonality(rng.fork(), teamId));
      rosterStates.set(teamId, buildRosterState(teamId, players));
    }

    setState({
      rng,
      season: 1,
      day: 1,
      phase: 'preseason',
      players,
      schedule,
      seasonState,
      userTeamId,
      playoffBracket: null,
      injuries: new Map(),
      serviceTime,
      scoutingStaffs,
      gmPersonalities,
      offseasonState: null,
      rule5Session: null,
      rule5Obligations: [],
      rule5OfferBackStates: [],
      draftClass: null,
      freeAgencyMarket: null,
      news: [],
      rosterStates,
      internationalScoutingState: createEmptyInternationalScoutingState(1),
      draftState: createEmptyDraftState(),
      minorLeagueState: createEmptyMinorLeagueState(1),
      playerMorale: new Map(),
      teamChemistry: new Map(),
      ownerState: new Map(),
      briefingQueue: [],
      storyFlags: new Map(),
      rivalries: new Map(),
      awardHistory: [],
      hallOfFame: [],
      hallOfFameBallot: [],
      franchiseTimeline: [],
      careerStats: [],
      seasonHistory: [],
      tradeState: createEmptyTradeState(),
    });
    ensureNarrativeState(requireState());

    return {
      success: true as const,
      season: 1,
      day: 1,
      phase: 'preseason' as const,
      playerCount: players.length,
      teamCount: teamIds.length,
      gamesScheduled: schedule.length,
      flowStateChanged: true as const,
    };
  },

  simDay(): SimResultDTO {
    return simDayInternal();
  },

  simWeek(): SimResultDTO {
    return simWeekInternal();
  },

  simMonth(): SimResultDTO {
    return simMonthInternal();
  },

  simToPlayoffs(): SimResultDTO {
    const s = requireState();
    let result = simDayInternal();

    while (s.phase === 'regular') {
      const remainingDays = Math.max(0, 163 - s.day);
      if (remainingDays >= 30) {
        result = simMonthInternal();
      } else if (remainingDays >= 7) {
        result = simWeekInternal();
      } else {
        result = simDayInternal();
      }
    }

    return result;
  },

  simPlayoffGame(): SimResultDTO {
    const s = requireState();
    if (s.phase !== 'playoffs') {
      return playoffResult(s, 0);
    }

    ensurePlayoffBracket(s);

    if (!s.playoffBracket || isPlayoffComplete(s.playoffBracket)) {
      finalizePlayoffRunIfNeeded(s);
      return playoffResult(s, 0);
    }

    const before = s.playoffBracket;
    const gamesBefore = countBracketGames(before);
    s.playoffBracket = simNextPlayoffGame(before, s.players, s.rng.fork());
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  simPlayoffSeries(): SimResultDTO {
    const s = requireState();
    if (s.phase !== 'playoffs') {
      return playoffResult(s, 0);
    }

    ensurePlayoffBracket(s);

    if (!s.playoffBracket || isPlayoffComplete(s.playoffBracket)) {
      finalizePlayoffRunIfNeeded(s);
      return playoffResult(s, 0);
    }

    const before = s.playoffBracket;
    const gamesBefore = countBracketGames(before);
    s.playoffBracket = simPlayoffBracketSeries(before, s.players, s.rng.fork());
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  simPlayoffRound(): SimResultDTO {
    const s = requireState();
    if (s.phase !== 'playoffs') {
      return playoffResult(s, 0);
    }

    ensurePlayoffBracket(s);

    if (!s.playoffBracket || isPlayoffComplete(s.playoffBracket)) {
      finalizePlayoffRunIfNeeded(s);
      return playoffResult(s, 0);
    }

    const before = s.playoffBracket;
    const gamesBefore = countBracketGames(before);
    s.playoffBracket = simPlayoffBracketRound(before, s.players, s.rng.fork());
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  simRemainingPlayoffs(): SimResultDTO {
    const s = requireState();
    if (s.phase !== 'playoffs') {
      return playoffResult(s, 0);
    }

    ensurePlayoffBracket(s);

    if (!s.playoffBracket || isPlayoffComplete(s.playoffBracket)) {
      finalizePlayoffRunIfNeeded(s);
      return playoffResult(s, 0);
    }

    const before = s.playoffBracket;
    const gamesBefore = countBracketGames(before);
    let working = before;
    while (!isPlayoffComplete(working)) {
      working = simPlayoffBracketRound(working, s.players, s.rng.fork());
    }
    s.playoffBracket = working;
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  proceedToOffseason(): SimResultDTO {
    const s = requireState();
    if (s.phase === 'playoffs' && s.playoffBracket?.champion) {
      s.phase = 'offseason';
      s.day = 1;
    }

    return {
      day: s.day,
      season: s.season,
      phase: s.phase,
      gamesPlayed: 0,
      seasonComplete: s.phase !== 'regular',
      flowStateChanged: true,
    };
  },

  startNextSeason(): SimResultDTO {
    const s = requireState();
    if (s.phase === 'offseason' && s.offseasonState?.completed) {
      return finalizeOffseasonRollover(s);
    }

    return {
      day: s.day,
      season: s.season,
      phase: s.phase,
      gamesPlayed: 0,
      seasonComplete: s.phase !== 'regular',
      flowStateChanged: true,
    };
  },

  exportSnapshot() {
    return exportGameSnapshot(requireState());
  },

  importSnapshot(snapshot: unknown) {
    setState(importGameSnapshot(snapshot));
    const s = requireState();
    ensureNarrativeState(s);
    return {
      success: true as const,
      season: s.season,
      day: s.day,
      phase: s.phase,
      playerCount: s.players.length,
      userTeamId: s.userTeamId,
      flowStateChanged: true as const,
    };
  },

  startDraft() {
    const s = requireState();
    return {
      ...startDraftSession(s, generateDraftClass(s.rng.fork(), s.season)),
      flowStateChanged: true,
    };
  },

  makeDraftPick(prospectId: string) {
    return {
      ...makeUserDraftSelection(requireState(), prospectId),
      flowStateChanged: true,
    };
  },

  scoutDraftPlayer(prospectId: string) {
    return {
      ...scoutUserDraftPlayer(requireState(), prospectId),
      flowStateChanged: true,
    };
  },

  toggleDraftBigBoard(prospectId: string) {
    return {
      ...toggleUserDraftBigBoardPlayer(requireState(), prospectId),
      flowStateChanged: true,
    };
  },

  signDraftPick(playerId: string, bonusAmount: number) {
    return {
      ...signUserDraftPick(requireState(), playerId, bonusAmount),
      flowStateChanged: true,
    };
  },

  simulateRemainingDraft() {
    return {
      ...simulateRemainingDraftSession(requireState()),
      flowStateChanged: true,
    };
  },

  proposeTrade(offeringAssets: TradeAsset[], requestingAssets: TradeAsset[], toTeamId: string) {
    return proposeTradePackage(
      requireState(),
      offeringAssets,
      requestingAssets,
      toTeamId,
    );
  },

  respondToTradeOffer(
    offerId: string,
    action: 'accept' | 'decline' | 'counter',
    counterPackage?: { offeringAssets: TradeAsset[]; requestingAssets: TradeAsset[] },
  ) {
    return respondToTradeOffer(requireState(), offerId, action, counterPackage);
  },

  promotePlayerAction(playerId: string) {
    const s = requireState();
    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const rosterState = s.rosterStates.get(player.teamId);
    if (!rosterState) {
      return { success: false, error: 'No roster state' };
    }

    const result = promotePlayer(playerId, s.players, rosterState, timestamp());
    s.players = result.players.map((candidate) =>
      candidate.id === playerId
        ? {
          ...candidate,
          minorLeagueLevel: candidate.rosterStatus === 'MLB' ? null : candidate.rosterStatus,
        }
        : candidate,
    );
    s.rosterStates.set(player.teamId, result.rosterState);
    return { success: result.success, error: result.error };
  },

  demotePlayerAction(playerId: string) {
    const s = requireState();
    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const rosterState = s.rosterStates.get(player.teamId);
    if (!rosterState) {
      return { success: false, error: 'No roster state' };
    }

    const rule5Restriction = enforceRule5RosterRestriction(s, playerId);
    if (!rule5Restriction.success) {
      return rule5Restriction;
    }

    if (player.rosterStatus === 'MLB' && !player.isOutOfOptions) {
      const optionResult = consumeOptionYear(player, s.minorLeagueState, s.season);
      s.minorLeagueState = optionResult.state;
      s.players = s.players.map((candidate) =>
        candidate.id === playerId ? optionResult.player : candidate,
      );
    }

    const result = demotePlayer(playerId, s.players, rosterState, timestamp());
    s.players = result.players.map((candidate) =>
      candidate.id === playerId
        ? {
          ...candidate,
          minorLeagueLevel: candidate.rosterStatus === 'MLB' ? null : candidate.rosterStatus,
        }
        : candidate,
    );
    s.rosterStates.set(player.teamId, result.rosterState);
    const updatedPlayer = s.players.find((candidate) => candidate.id === playerId);
    if (updatedPlayer && player.rosterStatus === 'MLB' && updatedPlayer.isOutOfOptions) {
      placePlayerOnWaivers(s, updatedPlayer);
    }
    return { success: result.success, error: result.error };
  },

  dfaPlayerAction(playerId: string) {
    const s = requireState();
    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const rosterState = s.rosterStates.get(player.teamId);
    if (!rosterState) {
      return { success: false, error: 'No roster state' };
    }

    const rule5Restriction = enforceRule5RosterRestriction(s, playerId);
    if (!rule5Restriction.success) {
      return rule5Restriction;
    }

    const result = dfaPlayer(playerId, s.players, rosterState, timestamp());
    s.players = result.players.map((candidate) =>
      candidate.id === playerId
        ? {
          ...candidate,
          minorLeagueLevel: candidate.rosterStatus === 'MLB' ? null : candidate.rosterStatus,
        }
        : candidate,
    );
    s.rosterStates.set(player.teamId, result.rosterState);
    const updatedPlayer = s.players.find((candidate) => candidate.id === playerId);
    if (updatedPlayer) {
      placePlayerOnWaivers(s, updatedPlayer);
    }
    return { success: result.success, error: result.error };
  },

  promotePlayer(playerId: string) {
    return this.promotePlayerAction(playerId);
  },

  demotePlayer(playerId: string) {
    return this.demotePlayerAction(playerId);
  },

  designateForAssignment(playerId: string) {
    return this.dfaPlayerAction(playerId);
  },

  claimOffWaivers(playerId: string) {
    const s = requireState();
    return claimPlayerOffWaivers(s, playerId, s.userTeamId);
  },

  makeContractOffer(playerId: string, years: number, salary: number) {
    const s = requireState();
    if (!s.freeAgencyMarket) {
      s.freeAgencyMarket = createFreeAgencyMarket(s.season, s.players);
    }

    const freeAgent = s.freeAgencyMarket.freeAgents.find((candidate) => candidate.player.id === playerId);
    const offer: ContractOffer = {
      teamId: s.userTeamId,
      playerId,
      years,
      annualSalary: salary,
      totalValue: years * salary,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
      signingBonus: 0,
    };
    const result = makeUserOffer(s.freeAgencyMarket, offer);
    if (!result.accepted || !freeAgent) {
      return result;
    }

    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return result;
    }

    const previousTeamId = player.teamId;
    player.teamId = s.userTeamId;
    player.contract = {
      years,
      annualSalary: salary,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    };

    s.freeAgencyMarket.freeAgents = s.freeAgencyMarket.freeAgents.filter(
      (candidate) => candidate.player.id !== playerId,
    );
    s.freeAgencyMarket.signedPlayers.push({
      ...freeAgent,
      player,
      signedWith: s.userTeamId,
      contract: offer,
    });

    s.rosterStates.set(previousTeamId, buildRosterState(previousTeamId, s.players));
    s.rosterStates.set(s.userTeamId, buildRosterState(s.userTeamId, s.players));
    applySigningConsequences(s, playerId, salary, years, freeAgent.marketValue);
    return result;
  },

  advanceOffseason(): OffseasonStateView | null {
    const s = requireState();
    const progress = advanceOffseasonOnce(s);
    applyAISigningProgress(s, progress.aiSignings);
    const view = buildOffseasonStateView(s);
    return view ? { ...view, flowStateChanged: true } : null;
  },

  skipOffseasonPhase(): OffseasonStateView | null {
    const s = requireState();
    const progress = skipOffseasonPhaseWithAI(s);
    applyAISigningProgress(s, progress.aiSignings);
    const view = buildOffseasonStateView(s);
    return view ? { ...view, flowStateChanged: true } : null;
  },

  scoutIFAPlayer(playerId: string) {
    return scoutUserIFAPlayer(requireState(), playerId);
  },

  signIFAPlayer(playerId: string, bonusAmount: number) {
    const result = signUserIFAPlayer(requireState(), playerId, bonusAmount);
    return result.success ? { ...result, flowStateChanged: true as const } : result;
  },

  tradeIFAPoolSpace(toTeamId: string, amount: number) {
    const result = tradeUserIFABonusPool(requireState(), toTeamId, amount);
    return result.success ? { ...result, flowStateChanged: true as const } : result;
  },

  toggleRule5Protection(playerId: string) {
    const s = requireState();
    return toggleUserRule5Protection(s, playerId);
  },

  lockRule5Protection(): OffseasonStateView | null {
    const s = requireState();
    const result = lockUserRule5Protection(s);
    if (!result.success) {
      return null;
    }
    return buildOffseasonStateView(s);
  },

  makeRule5Pick(playerId: string) {
    const s = requireState();
    return makeUserRule5Selection(s, playerId);
  },

  passRule5Pick() {
    const s = requireState();
    return passUserRule5Turn(s);
  },

  resolveRule5OfferBack(playerId: string, acceptReturn: boolean) {
    return resolveRule5OfferBackDecision(requireState(), playerId, acceptReturn);
  },

  markNewsRead(newsId: string) {
    const s = requireState();
    s.news = markAsRead(s.news, newsId);
  },
};
