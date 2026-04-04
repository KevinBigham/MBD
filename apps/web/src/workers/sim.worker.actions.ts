import {
  applyForJob as applyForJobCareer,
  appendConsequenceWatchers,
  applyScenarioOverrides,
  autoFillMLBRoster,
  buildTradeAftermathChain,
  calculateFanSentiment,
  calculateRushingRisk,
  GameRNG,
  TEAMS,
  assignGMPersonality,
  buildRosterState,
  chemistryScoreToModifier,
  consumeOptionYear,
  createSeasonState,
  demotePlayer,
  determinePlayoffSeeds,
  determineRetirements,
  developPlayer,
  dfaPlayer,
  evaluateTradeProposal,
  executeTrade,
  createFrontOfficeState,
  createOwnerState,
  deduplicateNews,
  generateDraftClass,
  generateCoachFreeAgents,
  generateChampionshipCard,
  generateDynastyCard,
  generateCoachingStaff,
  generateNews,
  generateLeaguePlayers,
  generateSchedule,
  generateSeasonRecapCard,
  generateScoutingStaff,
  getTeamBudget,
  getRegularSeasonMonthForDay,
  getTeamById,
  getScenarioById,
  initializePlayerDevelopmentProfile,
  initializePlayoffBracket,
  isPlayoffComplete,
  markAsRead,
  makeUserOffer,
  promotePlayer,
  reconcileDevelopmentPipeline,
  recordRetirements,
  recordStarDefectionRivalry,
  rivalryGameModifier,
  runMonthlyDevelopmentCheckpoint,
  evaluateConsequenceWatchers,
  evaluateScenarioProgress,
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
  fireCoachForUserTeam,
  getTeamPlayers,
  hireCoachForUserTeam,
  issueTeamQualifyingOffer,
  lockUserRule5Protection,
  makeUserDraftSelection,
  makeUserRule5Selection,
  negotiatePlayerExtension,
  processDayInjuriesAndNews,
  requireState,
  resolveOutstandingQualifyingOffers,
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
  applyQualifyingOfferCompensationIfNeeded,
  resolvePersistedScoutConflicts,
} from './sim.worker.helpers.js';
import type {
  FullGameState,
  OffseasonStateView,
  SimResultDTO,
} from './sim.worker.helpers.js';
import { exportGameSnapshot, importGameSnapshot } from './snapshot.js';
import {
  captureSeasonAchievementFacts,
  recordDraftedHomegrownPlayer,
  recordExtensionCompleted,
  recordFreeAgentSigning,
  recordInternationalHomegrownPlayer,
  recordMonthlyDivisionLead,
  recordProspectCallup,
  syncAchievementState,
} from './sim.worker.achievements.js';
import {
  createDefaultFranchiseState,
  createEmptyAchievementState,
  createEmptyCeremonyState,
  dismissCeremonyMoment as dismissCeremonyMomentState,
  maybeQueuePlayoffClinchMoment,
  queueAwardMoments,
  queueHallOfFameMoments,
  queuePlayoffSeriesMoment,
} from './sim.worker.ceremony.js';
import {
  clearPendingTradeOffers,
  isTradeMarketOpen,
  processTradeMarketActivity,
  proposeTradePackage,
  recordAcceptedUserTrade,
  resetTradeDeadlineState,
  respondToTradeOffer,
} from './sim.worker.trade.js';
import {
  recordSeasonArchive,
  ensureNarrativeState,
  ensureAwardHistoryForSeason,
  finalizeRivalriesForSeason,
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
  syncHistoricalPlayersForRetirements,
  upsertFranchiseTimelineEntry,
} from './sim.worker.legacy.js';
import {
  acknowledgeMonthlyReport,
  captureMonthlyAdvanceContext,
  dismissDecisionSpotlight,
  generateMonthlyPulse,
} from './sim.worker.monthlyPulse.js';
import { createEmptyMonthlyPulseState } from './sim.worker.state.js';
import {
  buildNewGameState,
  getDifficultyAdjustedCompetitiveAav,
  getTeamFreeAgencyAppealScore,
  type NewGameOptions,
} from './sim.worker.setup.js';
import { syncRecordTracking } from './sim.worker.records.js';
import { refreshTickerFeed } from './sim.worker.ticker.js';
import {
  advanceMonthlyStoryArcs,
  syncSeasonStartStoryArcs,
} from './sim.worker.storyArcs.js';
import {
  applyDevelopmentSetbackCheckpoint,
  applySeasonEndProspectBondUpdates,
  getLoyaltyAdjustedAppeal,
  recordProspectBondDebuts,
} from './sim.worker.farm.js';
import {
  applyBreakoutCountdowns,
  applyDebutFlashbacks,
  applyMonthlyNarrativeHooks,
  applyOffseasonNarrativeHooks,
  applyMonthlyPressConference,
} from './sim.worker.narrativeFarm.js';
import {
  archiveOldSeasonsInState,
  buildPerformanceDiagnosticsView,
  estimateSnapshotSizeBytes,
  measureRuntimeAsync,
  measureRuntimeSync,
  normalizePerformanceDiagnostics,
  pruneStaleWorkerData,
} from './sim.worker.diagnostics.js';
import {
  createBranchSave,
  deleteSaveById,
  loadGameById,
  saveGameById,
} from '../shared/lib/saveSystem.js';

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function upsertDynastyCard(
  s: FullGameState,
  card: FullGameState['dynastyCards'][number],
) {
  const existingIndex = s.dynastyCards.findIndex((entry) => entry.id === card.id);
  if (existingIndex >= 0) {
    s.dynastyCards.splice(existingIndex, 1, card);
    return;
  }
  s.dynastyCards.unshift(card);
}

function syncCareerOverviewCard(s: FullGameState) {
  if (s.gmCareer.careerHistory.length < 2) {
    return;
  }

  upsertDynastyCard(
    s,
    generateDynastyCard(exportGameSnapshot(s), 'career_overview'),
  );
}

function exportSnapshotWithDiagnostics(s: FullGameState) {
  normalizePerformanceDiagnostics(s);
  let snapshot = exportGameSnapshot(s);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const snapshotSizeBytes = estimateSnapshotSizeBytes(snapshot);
    if (s.performanceDiagnostics.snapshotSizeBytes === snapshotSizeBytes) {
      return snapshot;
    }

    s.performanceDiagnostics = {
      ...s.performanceDiagnostics,
      snapshotSizeBytes,
    };
    snapshot = exportGameSnapshot(s);
  }

  return snapshot;
}

async function persistCurrentStateToSave(saveId: string) {
  const save = await loadGameById(saveId);
  if (!save) {
    throw new Error(`Save ${saveId} was not found.`);
  }

  const snapshot = exportSnapshotWithDiagnostics(requireState());
  await measureRuntimeAsync('lastSaveMs', async () => {
    await saveGameById(saveId, save.name, snapshot, {
      slotNumber: save.slotNumber,
      parentSaveId: save.parentSaveId,
      isRootSave: save.isRootSave,
      branchMeta: save.branchMeta,
    });
  });

  return buildPerformanceDiagnosticsView(requireState());
}

function queueContractReactionWatcher(
  s: FullGameState,
  playerId: string,
  playerName: string,
  annualSalary: number,
  years: number,
  marketValue: number,
) {
  s.consequenceWatchers = appendConsequenceWatchers(s.consequenceWatchers, [{
    id: `contract-reaction-${s.season}-${s.day}-${playerId}`,
    type: 'contract_reaction',
    createdSeason: s.season,
    createdDay: s.day,
    expiresSeason: s.season + 1,
    expiresDay: 1,
    resolved: false,
    context: {
      playerId,
      playerName,
      annualSalary,
      years,
      marketValue,
    },
  }]);
}

function queueProspectRiskWatcher(
  s: FullGameState,
  playerId: string,
  playerName: string,
  currentLevel: string,
  targetLevel: string,
) {
  const player = s.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return;
  }

  const risk = calculateRushingRisk(player, currentLevel, targetLevel);
  s.consequenceWatchers = appendConsequenceWatchers(s.consequenceWatchers, [{
    id: `prospect-risk-${s.season}-${s.day}-${playerId}`,
    type: 'prospect_risk',
    createdSeason: s.season,
    createdDay: s.day,
    expiresSeason: s.season + 1,
    expiresDay: 1,
    resolved: false,
    context: {
      playerId,
      playerName,
      currentLevel,
      targetLevel,
      injuryMultiplier: risk.injuryMultiplier,
      regressionChance: risk.regressionChance,
      confidenceHit: risk.confidenceHit,
    },
  }]);
}

function refreshFanSentiment(s: FullGameState) {
  const record = s.seasonState.standings.getRecord(s.userTeamId);
  s.fanSentiment = calculateFanSentiment({
    season: s.season,
    day: s.day,
    priorScore: s.fanSentiment.score,
    wins: record?.wins ?? 0,
    losses: record?.losses ?? 0,
    tradePulse: s.news.filter((item) =>
      item.category === 'trade'
      && item.relatedTeamIds.includes(s.userTeamId)
      && item.timestamp.startsWith(`S${s.season}D`),
    ).length * 2,
    signingPulse: s.news.filter((item) =>
      item.category === 'signing'
      && item.relatedTeamIds.includes(s.userTeamId)
      && item.timestamp.startsWith(`S${s.season}D`),
    ).length * 2,
    prospectDebuts: s.news.filter((item) =>
      item.category === 'development'
      && item.relatedTeamIds.includes(s.userTeamId)
      && item.timestamp.startsWith(`S${s.season}D`),
    ).length,
    championshipSeasons: s.franchiseTimeline.filter((entry) => entry.championship).map((entry) => entry.season),
  });

  const owner = s.ownerState.get(s.userTeamId);
  if (!owner) {
    return;
  }

  const modifier = clamp(Math.round((s.fanSentiment.score - 50) / 10), -5, 5);
  s.ownerState.set(s.userTeamId, {
    ...owner,
    satisfaction: clamp((owner.satisfaction ?? 50) + modifier, 0, 100),
  });
}

function resolveConsequenceChains(s: FullGameState) {
  if (!s.consequenceWatchers.some((watcher) => !watcher.resolved)) {
    return;
  }

  const evaluated = evaluateConsequenceWatchers({
    rng: s.rng.fork(),
    season: s.season,
    day: s.day,
    userTeamId: s.userTeamId,
    players: s.players,
    playerStats: Array.from(s.seasonState.playerSeasonStats.entries()),
    watchers: s.consequenceWatchers,
  });

  s.consequenceWatchers = evaluated.updatedWatchers;
  if (evaluated.newsItems.length > 0) {
    s.news = deduplicateNews([...evaluated.newsItems, ...s.news]);
  }
}

function updateScenarioProgress(s: FullGameState) {
  if (!s.challengeState) {
    return;
  }

  const scenario = getScenarioById(s.challengeState.scenarioId);
  if (!scenario) {
    return;
  }

  const progress = evaluateScenarioProgress(exportGameSnapshot(s), scenario);
  const seasonsElapsed = (s.season - s.challengeState.startSeason) + 1;
  const failed = !progress.met && seasonsElapsed > s.challengeState.maxSeasons;

  s.challengeState = {
    ...s.challengeState,
    progress: progress.progress,
    completed: progress.met,
    completedSeason: progress.met ? s.season : s.challengeState.completedSeason,
    failed,
    summary: failed
      ? `${scenario.name} expired before the goal was met.`
      : progress.message,
  };

  if (progress.met) {
    upsertDynastyCard(
      s,
      generateDynastyCard(exportGameSnapshot(s), 'scenario_complete'),
    );
  }
}

function franchiseLockMessage(s: FullGameState): string {
  if (s.gmCareer.jobSearchActive) {
    return s.gmCareer.lastFiredReason ?? 'The GM has been dismissed and must accept a new job before continuing.';
  }
  return s.franchise.endReason ?? 'Owner fired the GM. This dynasty is now read-only.';
}

function syncFranchiseTerminationFromOwner(s: FullGameState): boolean {
  return s.franchise.status === 'fired' || s.gmCareer.jobSearchActive;
}

function blockedSimResult(s: FullGameState): SimResultDTO {
  return {
    day: s.day,
    season: s.season,
    phase: s.phase,
    gamesPlayed: 0,
    seasonComplete: true,
  };
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
      queuePlayoffSeriesMoment(s, series);
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

  finalizeRivalriesForSeason(s);
  ensureAwardHistoryForSeason(s);
  queueAwardMoments(s, s.awardHistory.filter((entry) => entry.season === s.season));
  const seasonMoments = applyPostseasonConsequences(s);
  recordSeasonHistory(s, seasonMoments);
  recordSeasonArchive(s);
  upsertFranchiseTimelineEntry(s);
  if (s.playoffBracket.champion === s.userTeamId) {
    upsertDynastyCard(s, generateChampionshipCard(exportGameSnapshot(s), s.season));
  }
  syncCareerOverviewCard(s);
  updateScenarioProgress(s);
  captureSeasonAchievementFacts(s);
  syncAchievementState(s);
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
    queueAwardMoments(s, s.awardHistory.filter((entry) => entry.season === s.season));
    maybeQueuePlayoffClinchMoment(s);
    syncRecordTracking(s, {
      includeCurrentSeasonPlayoffAppearance: true,
      clearWatches: true,
      publishBrokenRecords: true,
    });
    captureSeasonAchievementFacts(s);
    syncAchievementState(s);
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

function monthFromDay(day: number): number {
  return getRegularSeasonMonthForDay(day).month;
}

function applyMonthlyDevelopmentCheckpoints(
  s: FullGameState,
  previousDay: number,
  currentDay: number,
) {
  const previousMonth = monthFromDay(previousDay);
  const currentMonth = monthFromDay(currentDay);
  if (currentMonth <= previousMonth) {
    return;
  }

  for (let month = previousMonth + 1; month <= currentMonth; month += 1) {
    const checkpoint = runMonthlyDevelopmentCheckpoint(
      s.rng.fork(),
      s.season,
      month,
      s.players,
      s.coachingStaffs,
      s.minorLeagueState,
    );
    s.players = checkpoint.players;
    s.minorLeagueState = checkpoint.state;
    applyDevelopmentSetbackCheckpoint(s, month);
    advanceMonthlyStoryArcs(s, s.season, currentDay);
    applyBreakoutCountdowns(s);
    applyMonthlyPressConference(s);
    applyMonthlyNarrativeHooks(s, month);
  }
}

function simWeekInternal(): SimResultDTO {
  const s = requireState();
  if (syncFranchiseTerminationFromOwner(s)) {
    return blockedSimResult(s);
  }
  if (s.phase === 'preseason') {
    s.phase = 'regular';
    s.day = 1;
  } else if (s.phase !== 'regular') {
    return simDayInternal();
  }

  const previousDay = s.day;
  const previousStandings = s.seasonState.standings.serialize();
  const previousInjuryIds = new Set(s.injuries.keys());
  const previousTradeCount = s.tradeState.tradeHistory.length;
  const { newState, result } = simulateWeek(
    s.rng,
    s.seasonState,
    s.schedule,
    s.players,
    { teamModifiers: buildTeamPerformanceModifiers(s) },
  );
  s.seasonState = newState;
  s.day = newState.currentDay;
  applyMonthlyDevelopmentCheckpoints(s, previousDay, s.day);
  processTradeMarketActivity(s, previousDay, s.day);
  processDayInjuriesAndNews(s);
  normalizeLeagueActiveRosters(s);
  refreshNarrativeState(s, result.games);
  refreshTickerFeed(s, {
    simDay: Math.max(previousDay, s.day - 1),
    games: result.games,
    previousStandings,
    previousInjuryIds,
    previousTradeCount,
  });
  applyDebutFlashbacks(s, recordProspectBondDebuts(s));
  resolveConsequenceChains(s);
  syncRecordTracking(s);
  updateScenarioProgress(s);
  return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
}

function buildTeamPerformanceModifiers(s: FullGameState): Map<string, number> {
  const modifiers = new Map(
    TEAMS.map((team) => [
      team.id,
      chemistryScoreToModifier(s.teamChemistry.get(team.id)?.score ?? 50),
    ] as const),
  );
  const todayGames = s.schedule.filter((game) => game.day === s.day);

  for (const game of todayGames) {
    const homeChemistry = s.teamChemistry.get(game.homeTeamId)?.score ?? 50;
    const awayChemistry = s.teamChemistry.get(game.awayTeamId)?.score ?? 50;
    modifiers.set(
      game.homeTeamId,
      Number(((modifiers.get(game.homeTeamId) ?? 1) + rivalryGameModifier(s.rivalries, game.homeTeamId, game.awayTeamId, homeChemistry)).toFixed(4)),
    );
    modifiers.set(
      game.awayTeamId,
      Number(((modifiers.get(game.awayTeamId) ?? 1) + rivalryGameModifier(s.rivalries, game.awayTeamId, game.homeTeamId, awayChemistry)).toFixed(4)),
    );
  }

  return modifiers;
}

function normalizeLeagueActiveRosters(s: FullGameState) {
  for (const team of TEAMS) {
    const mlbPlayers = s.players
      .filter((player) => player.teamId === team.id && player.rosterStatus === 'MLB')
      .sort((left, right) => left.overallRating - right.overallRating || left.id.localeCompare(right.id));

    while (mlbPlayers.length > 30) {
      const overflow = mlbPlayers.shift();
      if (!overflow) {
        break;
      }
      overflow.rosterStatus = 'AAA';
      overflow.minorLeagueLevel = 'AAA';
    }

    const rosterState = buildRosterState(team.id, s.players);
    const filledRoster = autoFillMLBRoster(team.id, s.players, rosterState);
    s.players = filledRoster.players;
    s.rosterStates.set(team.id, filledRoster.rosterState);
  }
}

function simMonthInternal(): SimResultDTO {
  const s = requireState();
  if (syncFranchiseTerminationFromOwner(s)) {
    return blockedSimResult(s);
  }
  const owner = s.ownerState.get(s.userTeamId);
  if (
    owner?.hotSeat
    && (
      (owner.satisfaction ?? 100) < 45
      || owner.patience < 35
      || owner.confidence < 35
    )
  ) {
    const existingFlags = s.storyFlags.get(s.userTeamId) ?? [];
    const flag = `owner_meeting_${s.season}`;
    if (!existingFlags.includes(flag)) {
      s.storyFlags.set(s.userTeamId, [...existingFlags, flag]);
    }
  }
  if (s.phase === 'preseason') {
    s.phase = 'regular';
    s.day = 1;
  } else if (s.phase !== 'regular') {
    return simDayInternal();
  }

  const monthlyContext = captureMonthlyAdvanceContext(s);
  const previousDay = s.day;
  const previousStandings = s.seasonState.standings.serialize();
  const previousInjuryIds = new Set(s.injuries.keys());
  const previousTradeCount = s.tradeState.tradeHistory.length;
  const { newState, result } = simulateMonth(
    s.rng,
    s.seasonState,
    s.schedule,
    s.players,
    { teamModifiers: buildTeamPerformanceModifiers(s) },
  );
  s.seasonState = newState;
  s.day = newState.currentDay;
  applyMonthlyDevelopmentCheckpoints(s, previousDay, s.day);
  processTradeMarketActivity(s, previousDay, s.day);
  processDayInjuriesAndNews(s);
  normalizeLeagueActiveRosters(s);
  refreshNarrativeState(s, result.games);
  refreshTickerFeed(s, {
    simDay: Math.max(previousDay, s.day - 1),
    games: result.games,
    previousStandings,
    previousInjuryIds,
    previousTradeCount,
  });
  applyDebutFlashbacks(s, recordProspectBondDebuts(s));
  resolveConsequenceChains(s);
  refreshFanSentiment(s);
  syncRecordTracking(s, { publishWatchStories: true, publishBrokenRecords: true });
  s.monthlyPulse = generateMonthlyPulse(s, monthlyContext);
  recordMonthlyDivisionLead(s);
  syncAchievementState(s);
  updateScenarioProgress(s);
  return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
}

function finalizeOffseasonRollover(s: FullGameState): SimResultDTO {
  accrueCareerStatsForSeason(s);
  syncRecordTracking(s, {
    includeCurrentSeasonPlayoffAppearance: true,
    clearWatches: true,
    publishBrokenRecords: true,
  });
  applyOffseasonNarrativeHooks(s);

  const beforePlayers = s.players;
  const kernelPlayers = s.players.map((player) => developPlayer(s.rng.fork(), player));
  const developedPlayers = reconcileDevelopmentPipeline(
    s.rng.fork(),
    kernelPlayers,
    s.coachingStaffs,
    s.minorLeagueState,
  );
  recordBreakoutNarratives(s, beforePlayers, developedPlayers);
  s.players = developedPlayers;
  applySeasonEndProspectBondUpdates(s);

  const retired = determineRetirements(s.rng.fork(), s.players);
  syncHistoricalPlayersForRetirements(s, retired);
  const inductees = processHallOfFameForRetirements(s, retired);
  queueHallOfFameMoments(s, inductees);
  syncAchievementState(s);
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
  recordSeasonArchive(s, { includeOffseasonData: true });
  upsertDynastyCard(s, generateSeasonRecapCard(exportGameSnapshot(s), s.season));
  resolvePersistedScoutConflicts(s);
  syncCareerOverviewCard(s);
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
  s.monthlyPulse = createEmptyMonthlyPulseState();
  const teamIds = TEAMS.map((team) => team.id);
  s.schedule = generateSchedule(s.rng.fork());
  s.seasonState = createSeasonState(s.season, teamIds);
  for (const teamId of teamIds) {
    const rosterState = buildRosterState(teamId, s.players);
    const filledRoster = autoFillMLBRoster(teamId, s.players, rosterState);
    s.players = filledRoster.players;
    s.rosterStates.set(teamId, filledRoster.rosterState);
  }
  ensureNarrativeState(s);
  syncSeasonStartStoryArcs(s);
  updateScenarioProgress(s);
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
  return measureRuntimeSync('lastSimDayMs', () => {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
    if (s.phase === 'preseason') {
      s.phase = 'regular';
      s.day = 1;
    }

    if (s.phase === 'regular') {
      const previousDay = s.day;
      const previousStandings = s.seasonState.standings.serialize();
      const previousInjuryIds = new Set(s.injuries.keys());
      const previousTradeCount = s.tradeState.tradeHistory.length;
      const { newState, result } = simulateDay(
        s.rng,
        s.seasonState,
        s.schedule,
        s.players,
        { teamModifiers: buildTeamPerformanceModifiers(s) },
      );
      s.seasonState = newState;
      s.day = newState.currentDay;
      advanceMinorLeagueDay(s);
      applyMonthlyDevelopmentCheckpoints(s, previousDay, s.day);
      processTradeMarketActivity(s, previousDay, s.day);
      processDayInjuriesAndNews(s);
      refreshNarrativeState(s, result.games);
      refreshTickerFeed(s, {
        simDay: previousDay,
        games: result.games,
        previousStandings,
        previousInjuryIds,
        previousTradeCount,
      });
      applyDebutFlashbacks(s, recordProspectBondDebuts(s));
      resolveConsequenceChains(s);
      syncRecordTracking(s);
      updateScenarioProgress(s);
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
        working = simPlayoffBracketRound(working, s.players, s.rng.fork(), {
          teamModifiers: buildTeamPerformanceModifiers(s),
        });
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
      resolveConsequenceChains(s);
      updateScenarioProgress(s);

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
  });
}

export const actionApi = {
  newGame(options: NewGameOptions) {
    resetTradeDeadlineState();
    const initialState = buildNewGameState(options);
    let nextState = initialState;
    if (options.scenarioId) {
      const scenario = getScenarioById(options.scenarioId);
      if (scenario) {
        nextState = importGameSnapshot(
          applyScenarioOverrides(
            new GameRNG(options.seed + 50_001),
            exportGameSnapshot(initialState),
            scenario,
          ),
        );
        nextState.franchise = {
          ...nextState.franchise,
          playMode: scenario.requiresCareerMode ? 'career' : (options.playMode ?? 'standard'),
        };
      }
    }
    setState(nextState);
    ensureNarrativeState(requireState());
    syncSeasonStartStoryArcs(requireState());

    return {
      success: true as const,
      season: 1,
      day: 1,
      phase: 'preseason' as const,
      userTeamId: nextState.userTeamId,
      teamName: nextState.franchise.teamName,
      gmName: nextState.franchise.gmName,
      difficulty: nextState.franchise.difficulty,
      playerCount: nextState.players.length,
      teamCount: TEAMS.length,
      gamesScheduled: nextState.schedule.length,
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

  acknowledgeMonthlyReport(reportId: string) {
    return acknowledgeMonthlyReport(requireState(), reportId);
  },

  dismissDecisionSpotlight(decisionId: string) {
    return dismissDecisionSpotlight(requireState(), decisionId);
  },

  dismissWelcomeBriefing() {
    const s = requireState();
    if (s.franchise.onboarding.welcomeBriefingSeen) {
      return { success: true as const };
    }

    s.franchise = {
      ...s.franchise,
      onboarding: {
        ...s.franchise.onboarding,
        welcomeBriefingSeen: true,
      },
    };
    return { success: true as const };
  },

  dismissCeremonyMoment(momentId: string) {
    return dismissCeremonyMomentState(requireState(), momentId);
  },

  applyForJob(teamId: string) {
    const s = requireState();
    if (!s.gmCareer.jobSearchActive) {
      return { success: false as const, error: 'No active job search.' };
    }

    if (!s.jobMarket.availableJobs.some((job) => job.teamId === teamId)) {
      return { success: false as const, error: 'Job opening not available.' };
    }

    s.gmCareer = applyForJobCareer(s.gmCareer, teamId, s.season);
    s.userTeamId = teamId;
    s.jobMarket = {
      availableJobs: [],
      applicationDeadlineSeason: null,
    };
    s.franchise = createDefaultFranchiseState(teamId, s.season, s.day, {
      gmName: s.franchise.gmName,
      difficulty: s.franchise.difficulty,
      playMode: s.franchise.playMode,
      createdAt: s.franchise.createdAt,
      onboarding: s.franchise.onboarding,
    });
    s.ownerState.set(teamId, createOwnerState(teamId, getTeamBudget(teamId)));
    s.frontOfficeState.set(teamId, createFrontOfficeState(teamId));

    return {
      success: true as const,
      teamId,
      teamName: s.franchise.teamName,
    };
  },

  simToPlayoffs(): SimResultDTO {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
    const userFlags = s.storyFlags.get(s.userTeamId) ?? [];
    if (!userFlags.includes('suppress_owner_firing')) {
      s.storyFlags.set(s.userTeamId, [...userFlags, 'suppress_owner_firing']);
    }
    try {
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
    } finally {
      const nextFlags = (s.storyFlags.get(s.userTeamId) ?? []).filter((flag) => flag !== 'suppress_owner_firing');
      s.storyFlags.set(s.userTeamId, nextFlags);
    }
  },

  simPlayoffGame(): SimResultDTO {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
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
    s.playoffBracket = simNextPlayoffGame(before, s.players, s.rng.fork(), {
      teamModifiers: buildTeamPerformanceModifiers(s),
    });
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  simPlayoffSeries(): SimResultDTO {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
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
    s.playoffBracket = simPlayoffBracketSeries(before, s.players, s.rng.fork(), {
      teamModifiers: buildTeamPerformanceModifiers(s),
    });
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  simPlayoffRound(): SimResultDTO {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
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
    s.playoffBracket = simPlayoffBracketRound(before, s.players, s.rng.fork(), {
      teamModifiers: buildTeamPerformanceModifiers(s),
    });
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  simRemainingPlayoffs(): SimResultDTO {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
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
      working = simPlayoffBracketRound(working, s.players, s.rng.fork(), {
        teamModifiers: buildTeamPerformanceModifiers(s),
      });
    }
    s.playoffBracket = working;
    recordPlayoffProgressCoverage(s, before, s.playoffBracket);
    finalizePlayoffRunIfNeeded(s);
    return playoffResult(s, countBracketGames(s.playoffBracket) - gamesBefore);
  },

  proceedToOffseason(): SimResultDTO {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
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
    if (syncFranchiseTerminationFromOwner(s)) {
      return blockedSimResult(s);
    }
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
    return measureRuntimeSync('lastLoadMs', () => {
      resetTradeDeadlineState();
      setState(importGameSnapshot(snapshot));
      const s = requireState();
      ensureNarrativeState(s);
      syncAchievementState(s, { publish: false });
      return {
        success: true as const,
        season: s.season,
        day: s.day,
        phase: s.phase,
        playerCount: s.players.length,
        userTeamId: s.userTeamId,
        teamName: s.franchise.teamName,
        gmName: s.franchise.gmName,
        difficulty: s.franchise.difficulty,
        flowStateChanged: true as const,
      };
    });
  },

  async createWhatIfBranch(parentSaveId: string, description: string) {
    return measureRuntimeAsync('lastSaveMs', async () => createBranchSave(
      parentSaveId,
      exportSnapshotWithDiagnostics(requireState()),
      description.trim() || 'What If Branch',
    ));
  },

  async deleteWhatIfBranch(branchSaveId: string) {
    await deleteSaveById(branchSaveId);
    return { success: true as const };
  },

  async archiveOldSeasons(saveId: string) {
    const s = requireState();
    const archivedCount = archiveOldSeasonsInState(s);
    const diagnostics = await persistCurrentStateToSave(saveId);
    return {
      success: true as const,
      archivedCount,
      diagnostics,
    };
  },

  async pruneStaleData(saveId: string) {
    const s = requireState();
    const prunedCount = pruneStaleWorkerData(s);
    const diagnostics = await persistCurrentStateToSave(saveId);
    return {
      success: true as const,
      prunedCount,
      diagnostics,
    };
  },

  startDraft() {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    return {
      ...startDraftSession(s, generateDraftClass(s.rng.fork(), s.season)),
      flowStateChanged: true,
    };
  },

  makeDraftPick(prospectId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    return {
      ...makeUserDraftSelection(s, prospectId),
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
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    const result = signUserDraftPick(s, playerId, bonusAmount);
    if (result.success && result.signed) {
      const player = s.players.find((candidate) => candidate.id === playerId);
      recordDraftedHomegrownPlayer(s, playerId, player?.rosterStatus ?? 'ROOKIE');
      syncAchievementState(s);
    }
    return {
      ...result,
      flowStateChanged: true,
    };
  },

  simulateRemainingDraft() {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    return {
      ...simulateRemainingDraftSession(s),
      flowStateChanged: true,
    };
  },

  proposeTrade(offeringAssets: TradeAsset[], requestingAssets: TradeAsset[], toTeamId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { decision: 'rejected' as const, reason: franchiseLockMessage(s) };
    }
    const result = proposeTradePackage(
      s,
      offeringAssets,
      requestingAssets,
      toTeamId,
    );
    if (result.decision === 'accepted') {
      syncAchievementState(s);
    }
    return result;
  },

  respondToTradeOffer(
    offerId: string,
    action: 'accept' | 'decline' | 'counter',
    counterPackage?: { offeringAssets: TradeAsset[]; requestingAssets: TradeAsset[] },
  ) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, decision: 'rejected' as const, message: franchiseLockMessage(s) };
    }
    const result = respondToTradeOffer(s, offerId, action, counterPackage);
    if (result.success && result.decision === 'accepted') {
      syncAchievementState(s);
    }
    return result;
  },

  promotePlayerAction(playerId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
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
    const promotedPlayer = s.players.find((candidate) => candidate.id === playerId);
    if (promotedPlayer && player.rosterStatus !== 'MLB' && promotedPlayer.rosterStatus === 'MLB') {
      queueProspectRiskWatcher(
        s,
        promotedPlayer.id,
        `${promotedPlayer.firstName} ${promotedPlayer.lastName}`,
        player.rosterStatus,
        promotedPlayer.rosterStatus,
      );
      s.news.unshift(...generateNews(s.rng.fork(), {
        type: 'development',
        season: s.season,
        day: s.day,
        data: {
          playerId: promotedPlayer.id,
          playerName: `${promotedPlayer.firstName} ${promotedPlayer.lastName}`,
          teamId: promotedPlayer.teamId,
          teamName: teamLabel(promotedPlayer.teamId),
          level: player.rosterStatus,
          streak: 'call-up watch',
        },
      }, s.players, s.season, s.day));
      recordProspectCallup(s, promotedPlayer.id);
      syncAchievementState(s);
    }
    return { success: result.success, error: result.error };
  },

  demotePlayerAction(playerId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
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
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
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
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return claimPlayerOffWaivers(s, playerId, s.userTeamId);
  },

  makeContractOffer(playerId: string, years: number, salary: number) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { accepted: false, reason: franchiseLockMessage(s) };
    }
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
    const result = makeUserOffer(s.freeAgencyMarket, {
      ...offer,
      annualSalary: getDifficultyAdjustedCompetitiveAav(s, offer.annualSalary),
    }, getLoyaltyAdjustedAppeal(
      s,
      s.userTeamId,
      playerId,
      getTeamFreeAgencyAppealScore(s, s.userTeamId),
    ));
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
      totalValue: offer.totalValue,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
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
    s.rivalries = recordStarDefectionRivalry(s.rivalries, {
      season: s.season,
      fromTeamId: previousTeamId,
      toTeamId: s.userTeamId,
      playerName: `${player.firstName} ${player.lastName}`,
      starScore: player.overallRating,
    });
    s.rosterStates.set(s.userTeamId, buildRosterState(s.userTeamId, s.players));
    if (result.reason.toLowerCase().includes('clubhouse fit feels right')) {
      s.news.unshift({
        id: `clubhouse-signing-${s.season}-${playerId}`,
        headline: 'FA cites great clubhouse as reason for signing discount',
        body: `${player.firstName} ${player.lastName} accepted less than full market value because the room felt like the right fit.`,
        priority: 3,
        category: 'signing',
        tag: 'ANALYSIS',
        timestamp: `S${s.season}D${s.day}`,
        relatedPlayerIds: [player.id],
        relatedTeamIds: [s.userTeamId],
        read: false,
      });
    }
    applyQualifyingOfferCompensationIfNeeded(s, playerId, s.userTeamId);
    applySigningConsequences(s, playerId, salary, years, freeAgent.marketValue);
    recordFreeAgentSigning(s, playerId, salary);
    syncAchievementState(s);
    return result;
  },

  negotiateExtension(playerId: string, offer: Parameters<typeof negotiatePlayerExtension>[2]) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { status: 'rejected' as const, rounds: [], reason: franchiseLockMessage(s) };
    }
    const result = negotiatePlayerExtension(s, playerId, offer);
    if (result?.status === 'accepted') {
      recordExtensionCompleted(s);
      syncAchievementState(s);
    }
    return result;
  },

  issueQualifyingOffer(playerId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return issueTeamQualifyingOffer(s, playerId);
  },

  resolveQualifyingOffers() {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { resolved: [], error: franchiseLockMessage(s) };
    }
    return resolveOutstandingQualifyingOffers(s);
  },

  hireCoach(coachId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return hireCoachForUserTeam(s, coachId);
  },

  fireCoach(coachId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return fireCoachForUserTeam(s, coachId);
  },

  advanceOffseason(): OffseasonStateView | null {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return null;
    }
    const progress = advanceOffseasonOnce(s);
    applyAISigningProgress(s, progress.aiSignings);
    const view = buildOffseasonStateView(s);
    return view ? { ...view, flowStateChanged: true } : null;
  },

  skipOffseasonPhase(): OffseasonStateView | null {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return null;
    }
    const progress = skipOffseasonPhaseWithAI(s);
    applyAISigningProgress(s, progress.aiSignings);
    const view = buildOffseasonStateView(s);
    return view ? { ...view, flowStateChanged: true } : null;
  },

  scoutIFAPlayer(playerId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return scoutUserIFAPlayer(s, playerId);
  },

  signIFAPlayer(playerId: string, bonusAmount: number) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    const result = signUserIFAPlayer(s, playerId, bonusAmount);
    if (result.success) {
      const player = s.players.find((candidate) => candidate.id === playerId);
      recordInternationalHomegrownPlayer(s, playerId, player?.rosterStatus ?? 'INTERNATIONAL');
      syncAchievementState(s);
    }
    return result.success ? { ...result, flowStateChanged: true as const } : result;
  },

  tradeIFAPoolSpace(toTeamId: string, amount: number) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    const result = tradeUserIFABonusPool(s, toTeamId, amount);
    return result.success ? { ...result, flowStateChanged: true as const } : result;
  },

  toggleRule5Protection(playerId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return toggleUserRule5Protection(s, playerId);
  },

  lockRule5Protection(): OffseasonStateView | null {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return null;
    }
    const result = lockUserRule5Protection(s);
    if (!result.success) {
      return null;
    }
    return buildOffseasonStateView(s);
  },

  makeRule5Pick(playerId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return makeUserRule5Selection(s, playerId);
  },

  passRule5Pick() {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return passUserRule5Turn(s);
  },

  resolveRule5OfferBack(playerId: string, acceptReturn: boolean) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s) };
    }
    return resolveRule5OfferBackDecision(s, playerId, acceptReturn);
  },

  markNewsRead(newsId: string) {
    const s = requireState();
    s.news = markAsRead(s.news, newsId);
  },
};
