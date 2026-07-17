import {
  applyForJob as applyForJobCareer,
  appendConsequenceWatchers,
  applyMomentEffects,
  applyScenarioOverrides,
  autoFillMLBRoster,
  buildTradeAftermathChain,
  calculateFanSentiment,
  calculateRushingRisk,
  GameRNG,
  generateInteractivePressConference,
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
  CAREER_SHUTOUT_MILESTONE,
  deduplicateNews,
  decayRelationships,
  decayMoments,
  detectComebackPlayer,
  estimatedWar,
  detectPlayoffGauntlet,
  detectMoment,
  detectRookieSensation,
  detectSeptemberHeroics,
  evaluateTeamNeeds,
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
  getMentorshipDevelopmentBonus,
  getTeamBudget,
  getRegularSeasonMonthForDay,
  getTeamById,
  getScenarioById,
  fromMentorRelationship,
  initializePlayerDevelopmentProfile,
  initializePlayoffBracket,
  isPlayoffComplete,
  MAX_MOMENTS_PER_PLAYER,
  markAsRead,
  makeUserOffer,
  promotePlayer,
  reconcileDevelopmentPipeline,
  recordRetirements,
  recordFASigning,
  recordCareerShutout,
  recordStarDefectionRivalry,
  rivalryGameModifier,
  runMonthlyDevelopmentCheckpoint,
  evaluateConsequenceWatchers,
  evaluateNicknames,
  evaluateScenarioProgress,
  simulateDay,
  simulateMonth,
  simNextPlayoffGame,
  simPlayoffRound as simPlayoffBracketRound,
  simPlayoffSeries as simPlayoffBracketSeries,
  simulateWeek,
  toDisplayRating,
  generateTradeId,
} from '@mbd/sim-core';
import type {
  ContractOffer,
  FreeAgencyOfferDecision,
  PlayerGameStats,
  PlayoffBracket,
  PlayoffGameResult,
  PlayoffSeriesState,
  TradeProposal,
} from '@mbd/sim-core';
import type {
  DayOneOpeningPlan,
  DevelopmentProgram,
  SignatureMoment as PersistedSignatureMoment,
  TradeAsset,
} from '@mbd/contracts';
import {
  createEmptyDraftState,
  createEmptyInternationalScoutingState,
  createEmptyMinorLeagueState,
  accrueMinorLeagueServiceTimeDays,
  advanceMinorLeagueDay,
  appendPlayerMoments,
  appendTeamMoments,
  buildOffseasonStateView,
  claimPlayerOffWaivers,
  createEmptyTradeState,
  deriveWorkerTeamBuildingArchetype,
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
  retirePlayerAssignment,
  resolveOutstandingQualifyingOffers,
  resolveRule5OfferBackDecision,
  updatePlayerTeamAssignment,
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
  commitQualifyingOfferCompensation,
  prepareQualifyingOfferCompensation,
  validateQualifyingOfferCompensationState,
  resolvePersistedScoutConflicts,
  hasCanonicalFreeAgencyMarket,
  getAvailableMlbSigningSlots,
} from './sim.worker.helpers.js';
import type {
  FullGameState,
  OffseasonStateView,
  SimResultDTO,
} from './sim.worker.helpers.js';
import { exportGameSnapshot, importGameSnapshot, isSaveCompatible } from './snapshot.js';
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
  queueCeremonyMoment,
  queueHallOfFameMoments,
  queuePlayoffSeriesMoment,
} from './sim.worker.ceremony.js';
import {
  advanceNegotiationSession,
  clearPendingTradeOffers,
  executeMultiTeamTradeFramework,
  proposeMultiTeamFramework,
  pruneExpiredNegotiations,
  resolveNegotiationSession,
  startNegotiation,
  isTradeMarketOpen,
  processTradeMarketActivity,
  proposeTradePackage,
  recordAcceptedUserTrade,
  resetTradeDeadlineState,
  respondToTradeOffer,
} from './sim.worker.trade.js';
import { publishDraftGradesNarrative } from './sim.worker.draft.js';
import { syncArchivedMajorGames } from './sim.worker.archivedGames.js';
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
  applyMonthlyLeagueEvents,
  captureMonthlyAdvanceContext,
  dismissDecisionSpotlight,
  generateMonthlyPulse,
} from './sim.worker.monthlyPulse.js';
import { createEmptyMonthlyPulseState } from './sim.worker.state.js';
import {
  buildNewGameState,
  type NewGameOptions,
} from './sim.worker.setup.js';
import { buildFreeAgencyDecisionContext } from './sim.worker.freeAgencyDecision.js';
import { syncRecordTracking } from './sim.worker.records.js';
import { refreshTickerFeed } from './sim.worker.ticker.js';
import {
  advanceMonthlyStoryArcs,
  syncSeasonStartStoryArcs,
} from './sim.worker.storyArcs.js';
import {
  applyDevelopmentSetbackCheckpoint,
  applySeasonEndProspectBondUpdates,
  recordProspectBondDebuts,
  syncMinorLeagueStatHistory,
} from './sim.worker.farm.js';
import {
  applyMonthlyDevelopmentIdentity,
  applyMonthlyFrontOfficeConsequences,
  applyPressToneConsequences,
  hasAnsweredInteractivePressConference,
} from './sim.worker.frontOfficeIdentity.js';
import {
  applyBreakoutCountdowns,
  applyDebutFlashbacks,
  applyMonthlyNarrativeHooks,
  applyOffseasonNarrativeHooks,
  applyMonthlyPressConference,
  applyRegularSeasonPositionGroupMoments,
  applyRegularSeasonPlayerMicroArcMoments,
  applyRegularSeasonTeamDynastyMarkers,
  applySeasonEndPlayerMicroArcMoments,
  applySeasonEndTeamDynastyMarkers,
  applySeasonEndPlayerArcMoments,
  applyWeeklyMomentsForCompletedRange,
} from './sim.worker.narrativeFarm.js';
import {
  archiveOldSeasonsInState,
  buildPerformanceDiagnosticsView,
  estimateSnapshotSizeBytes,
  measureRuntimeAsync,
  measureRuntimeSync,
  measureWorkerQuerySync,
  normalizePerformanceDiagnostics,
  pruneStaleWorkerData,
} from './sim.worker.diagnostics.js';
import {
  finishLongSaveProfileStage,
  profileLongSaveStage,
  startLongSaveProfileStage,
} from './sim.worker.longSaveProfiler.js';

export function applyAISigningProgress(
  s: FullGameState,
  aiSignings: Array<{
    playerId: string;
    teamId: string;
    years: number;
    annualSalary: number;
    marketValue: number;
    decision?: FreeAgencyOfferDecision;
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
      signing.decision,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const PLATE_APPEARANCE_OUTS: Record<string, number> = {
  K: 1,
  GB_OUT: 1,
  FB_OUT: 1,
  LD_OUT: 1,
  DOUBLE_PLAY: 2,
  SAC_FLY: 1,
};

const AT_BAT_OUTCOMES = new Set([
  'SINGLE',
  'DOUBLE',
  'TRIPLE',
  'HR',
  'K',
  'GB_OUT',
  'FB_OUT',
  'LD_OUT',
  'DOUBLE_PLAY',
]);

const ROSTER_PLAN_HITTER_POSITIONS = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']);
const ROSTER_PLAN_PITCHER_POSITIONS = new Set(['SP', 'RP', 'CL']);
const PLAYABLE_DEVELOPMENT_LEVELS = new Set<string>(['AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE']);

type DevelopmentFocusCategory =
  | 'promotion_window'
  | 'recalibrate_plan'
  | 'accelerate_challenge'
  | 'protect_runway';

function defaultDevelopmentProgramForLevel(level: string | null | undefined): DevelopmentProgram {
  switch (level) {
    case 'ROOKIE':
      return 'tools';
    case 'A':
    case 'A_PLUS':
      return 'fundamentals';
    case 'AA':
      return 'refinement';
    case 'AAA':
    default:
      return 'mlb_prep';
  }
}

function developmentProgramForFocusCategory(
  category: DevelopmentFocusCategory,
  player: FullGameState['players'][number],
): DevelopmentProgram {
  switch (category) {
    case 'promotion_window':
      return 'mlb_prep';
    case 'accelerate_challenge':
      return player.pitcherAttributes ? 'velocity' : 'power';
    case 'protect_runway':
      return player.rosterStatus === 'ROOKIE' ? 'tools' : defaultDevelopmentProgramForLevel(player.rosterStatus);
    case 'recalibrate_plan':
    default:
      return defaultDevelopmentProgramForLevel(player.rosterStatus);
  }
}

function uniqueRosterPlanIds(playerIds: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const playerId of playerIds) {
    if (!playerId || seen.has(playerId)) {
      continue;
    }
    seen.add(playerId);
    ordered.push(playerId);
  }
  return ordered;
}

function playerRatingDesc(left: { overallRating: number }, right: { overallRating: number }): number {
  return right.overallRating - left.overallRating;
}

function buildDefaultRosterPlan(s: FullGameState): DayOneOpeningPlan {
  const mlbPlayers = s.players.filter((player) =>
    player.teamId === s.userTeamId && player.rosterStatus === 'MLB',
  );
  const hitters = mlbPlayers
    .filter((player) => ROSTER_PLAN_HITTER_POSITIONS.has(player.position))
    .sort(playerRatingDesc);
  const starters = mlbPlayers
    .filter((player) => player.position === 'SP')
    .sort(playerRatingDesc);
  const relievers = mlbPlayers
    .filter((player) => player.position === 'RP' || player.position === 'CL')
    .sort(playerRatingDesc);
  const closer = relievers.find((player) => player.position === 'CL') ?? relievers[0] ?? null;
  const setupIds = relievers
    .filter((player) => player.id !== closer?.id)
    .slice(0, 2)
    .map((player) => player.id);
  const longRelief = [
    ...starters.slice(5),
    ...relievers,
  ].find((player) => player.id !== closer?.id && !setupIds.includes(player.id)) ?? null;

  return {
    lineupPlayerIds: hitters.slice(0, 9).map((player) => player.id),
    rotationPlayerIds: starters.slice(0, 5).map((player) => player.id),
    bullpen: {
      closerId: closer?.id ?? null,
      setupIds,
      longReliefId: longRelief?.id ?? null,
    },
  };
}

function normalizeRosterPlan(s: FullGameState, plan: DayOneOpeningPlan): DayOneOpeningPlan {
  const defaults = buildDefaultRosterPlan(s);
  const playerById = new Map(
    s.players
      .filter((player) => player.teamId === s.userTeamId && player.rosterStatus === 'MLB')
      .map((player) => [player.id, player]),
  );
  const isHitter = (playerId: string) => {
    const player = playerById.get(playerId);
    return player != null && ROSTER_PLAN_HITTER_POSITIONS.has(player.position);
  };
  const isStarter = (playerId: string) => playerById.get(playerId)?.position === 'SP';
  const isPitcher = (playerId: string) => {
    const player = playerById.get(playerId);
    return player != null && ROSTER_PLAN_PITCHER_POSITIONS.has(player.position);
  };

  const lineupPlayerIds = uniqueRosterPlanIds([
    ...plan.lineupPlayerIds.filter(isHitter),
    ...defaults.lineupPlayerIds,
  ]).slice(0, Math.min(9, defaults.lineupPlayerIds.length || 9));

  const rotationPlayerIds = uniqueRosterPlanIds([
    ...plan.rotationPlayerIds.filter(isStarter),
    ...defaults.rotationPlayerIds,
  ]).slice(0, Math.min(5, defaults.rotationPlayerIds.length || 5));

  const candidateBullpen = plan.bullpen ?? defaults.bullpen;
  if (candidateBullpen == null) {
    return {
      lineupPlayerIds,
      rotationPlayerIds,
      bullpen: null,
    };
  }

  const closerId = uniqueRosterPlanIds([
    candidateBullpen.closerId,
    defaults.bullpen?.closerId,
  ]).find((playerId) => isPitcher(playerId) && !rotationPlayerIds.includes(playerId)) ?? null;
  const setupIds = uniqueRosterPlanIds([
    ...candidateBullpen.setupIds,
    ...(defaults.bullpen?.setupIds ?? []),
  ])
    .filter((playerId) => isPitcher(playerId) && playerId !== closerId && !rotationPlayerIds.includes(playerId))
    .slice(0, 2);
  const longReliefId = uniqueRosterPlanIds([
    candidateBullpen.longReliefId,
    defaults.bullpen?.longReliefId,
  ]).find((playerId) =>
    isPitcher(playerId)
    && playerId !== closerId
    && !setupIds.includes(playerId)
    && !rotationPlayerIds.includes(playerId),
  ) ?? null;

  return {
    lineupPlayerIds,
    rotationPlayerIds,
    bullpen: {
      closerId,
      setupIds,
      longReliefId,
    },
  };
}

function parseSimDayFromTimestamp(value: string): number | null {
  const match = /D(\d+)$/.exec(value);
  return match ? Number(match[1]) : null;
}

function compareSignatureMomentRecency(
  left: { season: number; day?: number; timestamp?: string; type: string },
  right: { season: number; day?: number; timestamp?: string; type: string },
): number {
  const leftDay = left.day ?? (left.timestamp ? parseSimDayFromTimestamp(left.timestamp) : null) ?? 0;
  const rightDay = right.day ?? (right.timestamp ? parseSimDayFromTimestamp(right.timestamp) : null) ?? 0;
  return right.season - left.season
    || rightDay - leftDay
    || right.type.localeCompare(left.type);
}

function createEmptyPlayerGameStats(playerId: string, teamId: string): PlayerGameStats {
  return {
    playerId,
    teamId,
    gamesPlayed: 0,
    gamesMissedToInjury: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    runs: 0,
    hbp: 0,
    sacFlies: 0,
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    saves: 0,
    losses: 0,
  };
}

function buildMomentPlayerStats(
  s: FullGameState,
  game: FullGameState['seasonState']['gameLog'][number],
): Map<string, PlayerGameStats> {
  const playersById = new Map(s.players.map((player) => [player.id, player]));
  const stats = new Map<string, PlayerGameStats>();

  const ensureStats = (playerId: string, teamId: string): PlayerGameStats => {
    let existing = stats.get(playerId);
    if (!existing) {
      existing = createEmptyPlayerGameStats(playerId, teamId);
      stats.set(playerId, existing);
    }
    return existing;
  };

  for (const result of game.paResults) {
    const batter = playersById.get(result.batterId);
    const pitcher = playersById.get(result.pitcherId);
    if (!batter || !pitcher) {
      continue;
    }

    const batterStats = ensureStats(batter.id, batter.teamId);
    batterStats.pa += 1;
    batterStats.rbi += result.rbiOnPlay;

    if (AT_BAT_OUTCOMES.has(result.outcome)) {
      batterStats.ab += 1;
    }

    switch (result.outcome) {
      case 'SINGLE':
        batterStats.hits += 1;
        break;
      case 'DOUBLE':
        batterStats.hits += 1;
        batterStats.doubles += 1;
        break;
      case 'TRIPLE':
        batterStats.hits += 1;
        batterStats.triples += 1;
        break;
      case 'HR':
        batterStats.hits += 1;
        batterStats.hr += 1;
        break;
      case 'BB':
        batterStats.bb += 1;
        break;
      case 'HBP':
        batterStats.hbp += 1;
        break;
      case 'K':
        batterStats.k += 1;
        break;
      case 'SAC_FLY':
        batterStats.sacFlies += 1;
        break;
    }

    const pitcherStats = ensureStats(pitcher.id, pitcher.teamId);
    pitcherStats.ip += PLATE_APPEARANCE_OUTS[result.outcome] ?? 0;

    switch (result.outcome) {
      case 'SINGLE':
      case 'DOUBLE':
      case 'TRIPLE':
        pitcherStats.hitsAllowed += 1;
        break;
      case 'HR':
        pitcherStats.hitsAllowed += 1;
        pitcherStats.homeRunsAllowed += 1;
        break;
      case 'BB':
        pitcherStats.walks += 1;
        break;
      case 'HBP':
        pitcherStats.hitBatters += 1;
        break;
      case 'K':
        pitcherStats.strikeouts += 1;
        break;
      case 'FB_OUT':
      case 'SAC_FLY':
        pitcherStats.flyBallsAllowed += 1;
        break;
    }
  }

  if (game.winningPitcherId) {
    const winningPitcher = playersById.get(game.winningPitcherId);
    if (winningPitcher) {
      ensureStats(winningPitcher.id, winningPitcher.teamId).wins += 1;
    }
  }

  if (game.losingPitcherId) {
    const losingPitcher = playersById.get(game.losingPitcherId);
    if (losingPitcher) {
      ensureStats(losingPitcher.id, losingPitcher.teamId).losses += 1;
    }
  }

  if (game.savePitcherId) {
    const savePitcher = playersById.get(game.savePitcherId);
    if (savePitcher) {
      const saveStats = ensureStats(savePitcher.id, savePitcher.teamId);
      saveStats.saves = (saveStats.saves ?? 0) + 1;
    }
  }

  return stats;
}

function buildCareerTotalsBeforeChunk(
  s: FullGameState,
): Map<string, { hr: number; hits: number; wins: number }> {
  const totals = new Map<string, { hr: number; hits: number; wins: number }>();

  for (const ledger of s.careerStats) {
    totals.set(ledger.playerId, {
      hr: ledger.batting?.hr ?? 0,
      hits: ledger.batting?.hits ?? 0,
      wins: ledger.pitching?.wins ?? 0,
    });
  }

  for (const [playerId, seasonStats] of s.seasonState.playerSeasonStats.entries()) {
    const existing = totals.get(playerId) ?? { hr: 0, hits: 0, wins: 0 };
    totals.set(playerId, {
      hr: existing.hr + seasonStats.hr,
      hits: existing.hits + seasonStats.hits,
      wins: existing.wins + seasonStats.wins,
    });
  }

  return totals;
}

function applyGameTotals(
  totals: Map<string, { hr: number; hits: number; wins: number }>,
  gameStats: ReadonlyMap<string, PlayerGameStats>,
) {
  for (const [playerId, stats] of gameStats.entries()) {
    const existing = totals.get(playerId) ?? { hr: 0, hits: 0, wins: 0 };
    totals.set(playerId, {
      hr: existing.hr + stats.hr,
      hits: existing.hits + stats.hits,
      wins: existing.wins + stats.wins,
    });
  }
}

function applySignatureMomentEffects(
  s: FullGameState,
  playerId: string,
  updatedMoments: FullGameState['playerMoments'] extends Map<string, infer TValue> ? TValue : never,
) {
  const player = s.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return;
  }

  const modifiers = applyMomentEffects(player, updatedMoments, s.season);
  player.personality.mentalToughness = clamp(
    player.personality.mentalToughness + modifiers.pressureDelta,
    0,
    100,
  );

  if (player.pitcherAttributes) {
    player.pitcherAttributes.stuff = clamp(
      player.pitcherAttributes.stuff + modifiers.pitcherAttributeDelta,
      0,
      550,
    );
  } else {
    player.hitterAttributes.power = clamp(
      player.hitterAttributes.power + modifiers.hitterAttributeDelta,
      0,
      550,
    );
  }

  const existingTraits = new Set(player.personalityTraits ?? []);
  for (const trait of modifiers.activeTraits) {
    existingTraits.add(trait);
  }
  player.personalityTraits = [...existingTraits].sort((left, right) => left.localeCompare(right));

  if (modifiers.storyFlags.length > 0) {
    const existingFlags = new Set(s.storyFlags.get(player.teamId) ?? []);
    for (const flag of modifiers.storyFlags) {
      existingFlags.add(flag);
    }
    s.storyFlags.set(player.teamId, [...existingFlags].sort((left, right) => left.localeCompare(right)));
  }
}

function processSignatureMoments(
  s: FullGameState,
  games: readonly FullGameState['seasonState']['gameLog'][number][],
) {
  if (games.length === 0) {
    return;
  }

  const playerNames = new Map(
    s.players.map((player) => [player.id, `${player.firstName} ${player.lastName}`]),
  );
  const runningTotals = buildCareerTotalsBeforeChunk(s);
  const orderedGames = [...games].sort((left, right) =>
    left.date.localeCompare(right.date)
    || left.homeTeamId.localeCompare(right.homeTeamId)
    || left.awayTeamId.localeCompare(right.awayTeamId),
  );

  const queueCareerShutoutMilestoneContent = (
    player: FullGameState['players'][number],
    gameDate: string,
  ) => {
    const playerName = `${player.firstName} ${player.lastName}`;
    const newsId = `milestone-shutout-${player.id}-${CAREER_SHUTOUT_MILESTONE}`;
    if (!s.news.some((item) => item.id === newsId)) {
      s.news.unshift({
        id: newsId,
        headline: `${playerName} records career shutout #${CAREER_SHUTOUT_MILESTONE}`,
        body: `${playerName} reached ${CAREER_SHUTOUT_MILESTONE} career complete-game shutouts and pushed into one of baseball's smallest pitching milestones.`,
        priority: 1,
        category: 'milestone',
        timestamp: gameDate,
        relatedPlayerIds: [player.id],
        relatedTeamIds: [player.teamId],
        read: false,
      });
    }

    const milestoneDay = parseSimDayFromTimestamp(gameDate) ?? s.day;
    const tickerId = `ticker-shutout-${player.id}-${CAREER_SHUTOUT_MILESTONE}`;
    if (!s.tickerFeed.some((entry) => entry.id === tickerId)) {
      s.tickerFeed.unshift({
        id: tickerId,
        timestamp: gameDate,
        category: 'milestone',
        text: `${playerName} reaches ${CAREER_SHUTOUT_MILESTONE} career shutouts.`,
        priority: 5,
        relatedTeamIds: [player.teamId],
        relatedPlayerIds: [player.id],
        expiresDay: (s.season * 1000) + milestoneDay + 30,
      });
    }

    if (player.teamId === s.userTeamId) {
      queueCeremonyMoment(s, {
        id: `career-shutout-${player.id}-${CAREER_SHUTOUT_MILESTONE}`,
        type: 'career_milestone',
        title: `${CAREER_SHUTOUT_MILESTONE} SHUTOUTS`,
        subtitle: playerName,
        detailLines: ['A rare pitching ledger just hit triple digits.'],
        soundEffect: 'achievement_unlock',
        autoDismissMs: 5000,
        createdAt: gameDate,
        theme: 'historic',
        relatedTeamIds: [player.teamId],
        relatedPlayerIds: [player.id],
      });
    }
  };

  for (const game of orderedGames) {
    const gameStats = buildMomentPlayerStats(s, game);
    for (const [playerId, stats] of gameStats.entries()) {
      const playerIndex = s.players.findIndex((candidate) => candidate.id === playerId);
      if (playerIndex < 0) {
        continue;
      }
      const result = recordCareerShutout(s.players[playerIndex]!, game, stats);
      if (!result.recorded) {
        continue;
      }
      s.players[playerIndex] = result.player;
      if (result.crossedMilestone) {
        queueCareerShutoutMilestoneContent(result.player, game.date);
      }
    }
    const updates = detectMoment(game, gameStats, {
      currentSeason: s.season,
      existingMomentsByPlayer: s.playerMoments,
      careerTotalsBeforeGameByPlayer: runningTotals,
      round: null,
      isPlayoff: game.isPlayoff,
      isEliminationGame: false,
      worldSeriesClincher: false,
      decisiveErrorPlayerId: null,
      blownSavePitcherId: null,
      playerNameById: playerNames,
    }, s.rng.fork());

    for (const update of updates) {
      const enrichedMoments = update.updatedMoments
        .map<PersistedSignatureMoment>((moment) => ({
          ...moment,
          day: parseSimDayFromTimestamp(game.date) ?? s.day,
          timestamp: game.date,
        }))
        .sort(compareSignatureMomentRecency)
        .slice(0, MAX_MOMENTS_PER_PLAYER);
      s.playerMoments.set(update.playerId, enrichedMoments);
      applySignatureMomentEffects(s, update.playerId, enrichedMoments);
    }

    applyGameTotals(runningTotals, gameStats);
  }
}

function buildNicknameCareerStats(
  s: FullGameState,
  player: FullGameState['players'][number],
) {
  const ledger = s.careerStats.find((entry) => entry.playerId === player.id);
  const goldGloveAwards = s.awardHistory.filter((award) =>
    award.playerId === player.id && award.award.toLowerCase().includes('gold glove')).length;

  return {
    debutAge: Math.max(16, player.age - Math.max(0, ledger?.seasonsPlayed ?? 0) + 1),
    currentAge: player.age,
    currentOverall: toDisplayRating(player.overallRating),
    peakOverall: ledger?.peakOverall ?? toDisplayRating(player.overallRating),
    potentialRating: toDisplayRating(player.potentialRating ?? player.overallRating),
    leadership: player.personality.leadership,
    careerWar: ledger?.war ?? 0,
    championships: ledger?.championshipRings ?? 0,
    yearsWithCurrentTeam: ledger?.teamIds.filter((teamId) => teamId === player.teamId).length ?? 0,
    goldGloveAwards,
    captainSeasons: 0,
    careerBatting: ledger?.batting ? {
      hits: ledger.batting.hits,
      hr: ledger.batting.hr,
    } : null,
    careerPitching: ledger?.pitching ? {
      wins: ledger.pitching.wins,
      strikeouts: ledger.pitching.strikeouts,
      saves: ledger.saves ?? 0,
    } : null,
    careerPlayoffBatting: null,
  };
}

function updateEarnedNicknamesForSeason(s: FullGameState) {
  for (const player of s.players) {
    const seasonStats = s.seasonState.playerSeasonStats.get(player.id);
    const existingState = s.playerNicknames.get(player.id) ?? {
      seasonHistory: [],
      earnedNicknames: [],
      primaryNickname: null,
      badgeNicknames: [],
    };
    const seasonHistory = existingState.seasonHistory.filter((entry) => entry.season !== s.season);
    seasonHistory.push({
      season: s.season,
      age: player.age,
      teamId: player.teamId,
      gamesPlayed: seasonStats?.gamesPlayed ?? 0,
      pa: seasonStats?.pa ?? 0,
      hits: seasonStats?.hits ?? 0,
      hr: seasonStats?.hr ?? 0,
      battingWalks: seasonStats?.bb ?? 0,
      battingStrikeouts: seasonStats?.k ?? 0,
      stolenBases: 0,
      saves: seasonStats?.saves ?? 0,
      blownSaves: 0,
      wins: seasonStats?.wins ?? 0,
      era: seasonStats?.ip ? (seasonStats.earnedRuns * 27) / Math.max(1, seasonStats.ip) : 0,
      pitchingStrikeouts: seasonStats?.strikeouts ?? 0,
      injuryCount: 0,
      overallStart: toDisplayRating(player.overallRating),
      overallEnd: toDisplayRating(player.overallRating),
      wasOnMlbRoster: player.rosterStatus === 'MLB',
      ledLeagueInStolenBases: false,
    });
    seasonHistory.sort((left, right) => left.season - right.season);

    const evaluation = evaluateNicknames(
      player,
      buildNicknameCareerStats(s, player),
      seasonHistory,
    );

    s.playerNicknames.set(player.id, {
      seasonHistory,
      earnedNicknames: evaluation.earnedNicknames,
      primaryNickname: evaluation.primaryNickname,
      badgeNicknames: evaluation.badgeNicknames,
    });
  }
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
      s.playoffSeriesHistory.push({
        season: s.season,
        round: series.round,
        higherSeedTeamId: series.higherSeed.teamId,
        lowerSeedTeamId: series.lowerSeed.teamId,
        bestOf: series.bestOf,
        deficitReached: series.deficitReached,
        deficitTeamId: series.deficitTeamId,
        winnerTeamId: series.winnerId ?? series.higherSeed.teamId,
      });
      const gauntlet = detectPlayoffGauntlet(
        s.playoffSeriesHistory[s.playoffSeriesHistory.length - 1]!,
        s.day,
      );
      if (gauntlet) {
        const existing = s.teamMoments.get(gauntlet.teamId) ?? [];
        if (!existing.some((moment) =>
          moment.type === gauntlet.moment.type
          && moment.season === gauntlet.moment.season
          && moment.description === gauntlet.moment.description
        )) {
          appendTeamMoments(s, gauntlet.teamId, [gauntlet.moment]);
        }
      }
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
  syncArchivedMajorGames(s);
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

function applyWave4PlayoffIntroMoments(s: FullGameState) {
  const playoffTeamIds = new Set(
    determinePlayoffSeeds(s.seasonState.standings.getFullStandings()).map((seed) => seed.teamId),
  );

  for (const entry of s.seasonState.standings.getLeagueStandings()) {
    if (!playoffTeamIds.has(entry.teamId)) {
      continue;
    }

    const septemberHeroics = detectSeptemberHeroics({
      teamId: entry.teamId,
      wins: entry.wins,
      losses: entry.losses,
      madePlayoffs: true,
      isChampion: false,
    }, {
      season: s.season,
      day: s.day,
      teams: [],
      monthlyRecordSplits: s.seasonState.monthlyRecordSplits,
      teamMoments: s.teamMoments,
    });

    if (septemberHeroics) {
      appendTeamMoments(s, septemberHeroics.teamId, [septemberHeroics.moment]);
    }
  }

  for (const player of s.players) {
    if (player.teamId !== s.userTeamId || player.rosterStatus !== 'MLB') {
      continue;
    }

    const comebackPlayer = detectComebackPlayer(
      player,
      s.seasonState.playerSeasonStats.get(player.id),
      s.season,
      s.day,
      s.playerMoments,
    );
    if (comebackPlayer) {
      appendPlayerMoments(s, comebackPlayer.playerId, [comebackPlayer.moment]);
    }
  }

  for (const rookieMoment of detectRookieSensation(
    s.userTeamId,
    s.players,
    s.rookieOfTheYearVoting,
    s.season,
    s.day,
    s.playerMoments,
  )) {
    appendPlayerMoments(s, rookieMoment.playerId, [rookieMoment.moment]);
  }
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
    applySeasonEndPlayerMicroArcMoments(s);
    s.phase = 'playoffs';
    s.day = 1;
    s.playoffBracket = null;
    applyWave4PlayoffIntroMoments(s);
    applyRegularSeasonTeamDynastyMarkers(s);
    applyRegularSeasonPositionGroupMoments(s);
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

function getCrossedRegularSeasonMonths(previousDay: number, currentDay: number): number[] {
  const previousMonth = monthFromDay(previousDay);
  const currentMonth = monthFromDay(currentDay);
  if (currentMonth <= previousMonth) {
    return [];
  }

  const crossedMonths: number[] = [];
  for (let month = previousMonth + 1; month <= currentMonth; month += 1) {
    crossedMonths.push(month);
  }
  return crossedMonths;
}

function publishMonthlyNarrativeHooks(s: FullGameState, crossedMonths: readonly number[]) {
  for (const month of crossedMonths) {
    applyMonthlyNarrativeHooks(s, month);
  }
}

function buildMentorshipDevelopmentBonusMap(s: FullGameState): Map<string, number> {
  const pairings = s.mentorRelationships.map((relationship) => fromMentorRelationship(relationship));
  const protegeeIds = new Set(pairings.map((pairing) => pairing.protegeeId));
  return new Map([...protegeeIds].map((playerId) => [
    playerId,
    getMentorshipDevelopmentBonus(pairings, playerId),
  ]));
}

function applyMonthlyDevelopmentCheckpoints(
  s: FullGameState,
  previousDay: number,
  currentDay: number,
) {
  const crossedMonths = getCrossedRegularSeasonMonths(previousDay, currentDay);
  const mentorshipBonuses = buildMentorshipDevelopmentBonusMap(s);
  for (const month of crossedMonths) {
    const monthView = getRegularSeasonMonthForDay(Math.min(currentDay, (month * 30) - 1));
    const checkpoint = runMonthlyDevelopmentCheckpoint(
      s.rng.fork(),
      s.season,
      month,
      s.players,
      s.coachingStaffs,
      s.minorLeagueState,
      mentorshipBonuses,
    );
    s.players = checkpoint.players;
    s.minorLeagueState = checkpoint.state;
    applyMonthlyDevelopmentIdentity(s, month);
    applyDevelopmentSetbackCheckpoint(s, month);
    applyMonthlyFrontOfficeConsequences(s, { month });
    advanceMonthlyStoryArcs(s, s.season, currentDay);
    applyBreakoutCountdowns(s);
    applyMonthlyPressConference(s);
    applyMonthlyLeagueEvents(s, monthView);
  }

  return crossedMonths;
}

function simWeekInternal(): SimResultDTO {
  const stage = startLongSaveProfileStage('regularSeason.week');
  try {
    return simWeekOperation();
  } finally {
    finishLongSaveProfileStage(stage);
  }
}

function simWeekOperation(): SimResultDTO {
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
  const mlbStage = startLongSaveProfileStage('regularSeason.mlbSimulation');
  let simulation!: ReturnType<typeof simulateWeek>;
  try {
    incrementGamesMissedToInjury(s, s.day, Math.min(s.day + 7, 187));
    simulation = simulateWeek(
      s.rng,
      s.seasonState,
      s.schedule,
      s.players,
      buildSeasonSimulationOptions(s),
    );
  } finally {
    finishLongSaveProfileStage(mlbStage);
  }
  const { newState, result } = simulation;
  s.seasonState = newState;
  s.day = newState.currentDay;
  const affiliateStage = startLongSaveProfileStage('regularSeason.affiliateDays');
  try {
    advanceMinorLeagueDays(s, previousDay, s.day);
  } finally {
    finishLongSaveProfileStage(affiliateStage);
  }
  const developmentStage = startLongSaveProfileStage('regularSeason.monthlyDevelopment');
  let crossedMonths!: ReturnType<typeof applyMonthlyDevelopmentCheckpoints>;
  try {
    crossedMonths = applyMonthlyDevelopmentCheckpoints(s, previousDay, s.day);
  } finally {
    finishLongSaveProfileStage(developmentStage);
  }
  const tradeStage = startLongSaveProfileStage('regularSeason.tradeMarket');
  try {
    processTradeMarketActivity(s, previousDay, s.day);
  } finally {
    finishLongSaveProfileStage(tradeStage);
  }
  const injuryStage = startLongSaveProfileStage('regularSeason.injuryNews');
  try {
    processDayInjuriesAndNews(s);
  } finally {
    finishLongSaveProfileStage(injuryStage);
  }
  const rosterStage = startLongSaveProfileStage('regularSeason.rosterNormalization');
  try {
    normalizeLeagueActiveRosters(s);
  } finally {
    finishLongSaveProfileStage(rosterStage);
  }
  const momentStage = startLongSaveProfileStage('regularSeason.signatureWeeklyMicroArc');
  try {
    processSignatureMoments(s, result.games);
    applyWeeklyMomentsForCompletedRange(s, previousDay, s.day, result.seasonComplete);
    applyRegularSeasonPlayerMicroArcMoments(s);
  } finally {
    finishLongSaveProfileStage(momentStage);
  }
  const narrativeStage = startLongSaveProfileStage('regularSeason.narrative');
  try {
    refreshNarrativeState(s, result.games);
  } finally {
    finishLongSaveProfileStage(narrativeStage);
  }
  const consequenceStage = startLongSaveProfileStage('regularSeason.tickerDebutConsequences');
  try {
    refreshTickerFeed(s, {
      simDay: Math.max(previousDay, s.day - 1),
      games: result.games,
      previousStandings,
      previousInjuryIds,
      previousTradeCount,
    });
    applyDebutFlashbacks(s, recordProspectBondDebuts(s));
    resolveConsequenceChains(s);
  } finally {
    finishLongSaveProfileStage(consequenceStage);
  }
  const recordStage = startLongSaveProfileStage('regularSeason.recordTracking');
  try {
    syncRecordTracking(s);
  } finally {
    finishLongSaveProfileStage(recordStage);
  }
  const hookStage = startLongSaveProfileStage('regularSeason.monthlyHooksPulseAchievementsScenario');
  try {
    publishMonthlyNarrativeHooks(s, crossedMonths);
    updateScenarioProgress(s);
    return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
  } finally {
    finishLongSaveProfileStage(hookStage);
  }
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

function buildSeasonSimulationOptions(s: FullGameState) {
  return {
    teamModifiers: buildTeamPerformanceModifiers(s),
    unavailablePlayerIds: buildUnavailablePlayerIds(s),
    openingDayPlans: s.franchise.dayOne.openingDayPlan == null
      ? undefined
      : new Map([[s.userTeamId, s.franchise.dayOne.openingDayPlan]]),
  };
}

function advanceMinorLeagueDays(
  s: FullGameState,
  startDayInclusive: number,
  endDayExclusive: number,
) {
  const days = Math.max(0, endDayExclusive - startDayInclusive);
  if (days === 0) {
    return;
  }

  accrueMinorLeagueServiceTimeDays(s, days);
  let advanced = false;
  for (let day = startDayInclusive; day < endDayExclusive; day += 1) {
    advanceMinorLeagueDay(s, day, {
      accrueServiceTime: false,
      syncStatHistory: false,
    });
    advanced = true;
  }
  syncMinorLeagueStatHistory(s);
}

function buildUnavailablePlayerIds(s: FullGameState): Set<string> {
  return new Set(
    Array.from(s.injuries.entries())
      .filter(([, injury]) => injury.daysRemaining > 0)
      .map(([playerId]) => playerId),
  );
}

function hasCurrentSeasonOptionUsage(s: FullGameState, playerId: string): boolean {
  return s.minorLeagueState.optionUsage.some(
    ([usagePlayerId, seasons]) => usagePlayerId === playerId && seasons.includes(s.season),
  );
}

function prepareMlbDemotionOptionLedger(s: FullGameState, playerId: string): boolean {
  const player = s.players.find((candidate) => candidate.id === playerId);
  if (!player || player.rosterStatus !== 'MLB') {
    return false;
  }

  const currentSeasonOptionActive = hasCurrentSeasonOptionUsage(s, playerId);
  const requiresWaivers = !currentSeasonOptionActive
    && (player.isOutOfOptions || player.optionYearsUsed >= 3);

  if (!currentSeasonOptionActive && !requiresWaivers) {
    const optionResult = consumeOptionYear(player, s.minorLeagueState, s.season);
    s.minorLeagueState = optionResult.state;
    s.players = s.players.map((candidate) =>
      candidate.id === playerId ? optionResult.player : candidate,
    );
  }

  return requiresWaivers;
}

function incrementGamesMissedToInjury(
  s: FullGameState,
  startDayInclusive: number,
  endDayExclusive: number,
) {
  const unavailablePlayerIds = buildUnavailablePlayerIds(s);
  if (unavailablePlayerIds.size === 0) {
    return;
  }

  const scheduledGamesByTeamId = new Map<string, number>();
  for (const game of s.schedule) {
    if (game.day < startDayInclusive || game.day >= endDayExclusive) {
      continue;
    }
    scheduledGamesByTeamId.set(game.homeTeamId, (scheduledGamesByTeamId.get(game.homeTeamId) ?? 0) + 1);
    scheduledGamesByTeamId.set(game.awayTeamId, (scheduledGamesByTeamId.get(game.awayTeamId) ?? 0) + 1);
  }

  for (const player of s.players) {
    if (
      !unavailablePlayerIds.has(player.id)
      || player.rosterStatus !== 'MLB'
      || !player.teamId
    ) {
      continue;
    }

    const scheduledGames = scheduledGamesByTeamId.get(player.teamId) ?? 0;
    if (scheduledGames <= 0) {
      continue;
    }

    const currentStats = s.seasonState.playerSeasonStats.get(player.id)
      ?? createEmptyPlayerGameStats(player.id, player.teamId);
    currentStats.gamesMissedToInjury = (currentStats.gamesMissedToInjury ?? 0) + scheduledGames;
    s.seasonState.playerSeasonStats.set(player.id, currentStats);
  }
}

function normalizeLeagueActiveRosters(s: FullGameState) {
  for (const team of TEAMS) {
    const activeRule5PlayerIds = new Set(
      s.rule5Obligations
        .filter((obligation) => obligation.status === 'active' && obligation.draftingTeamId === team.id)
        .map((obligation) => obligation.playerId),
    );
    const mlbPlayers = s.players
      .filter((player) => player.teamId === team.id && player.rosterStatus === 'MLB')
      .sort((left, right) => {
        const leftProtected = activeRule5PlayerIds.has(left.id) ? 1 : 0;
        const rightProtected = activeRule5PlayerIds.has(right.id) ? 1 : 0;
        if (leftProtected !== rightProtected) return leftProtected - rightProtected;
        return left.overallRating - right.overallRating || left.id.localeCompare(right.id);
      });

    while (mlbPlayers.length > 30) {
      const overflowIndex = mlbPlayers.findIndex((player) => !activeRule5PlayerIds.has(player.id));
      if (overflowIndex === -1) {
        break;
      }
      const [overflow] = mlbPlayers.splice(overflowIndex, 1);
      if (!overflow) {
        break;
      }
      const requiresWaivers = prepareMlbDemotionOptionLedger(s, overflow.id);
      const demotedPlayer = s.players.find((player) => player.id === overflow.id);
      if (!demotedPlayer) {
        continue;
      }
      demotedPlayer.rosterStatus = 'AAA';
      demotedPlayer.minorLeagueLevel = 'AAA';
      if (requiresWaivers) {
        placePlayerOnWaivers(s, demotedPlayer);
      }
    }

    const rosterState = buildRosterState(team.id, s.players);
    const filledRoster = autoFillMLBRoster(team.id, s.players, rosterState, {
      teamBuildingArchetype: deriveWorkerTeamBuildingArchetype(s, team.id),
      protectServiceTimeProspects: true,
    });
    s.players = filledRoster.players;
    s.rosterStates.set(team.id, filledRoster.rosterState);
  }
}

function simMonthInternal(): SimResultDTO {
  return profileLongSaveStage('regularSeason.month', simMonthOperation);
}

function simMonthOperation(): SimResultDTO {
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
  const { newState, result } = profileLongSaveStage('regularSeason.mlbSimulation', () => {
    incrementGamesMissedToInjury(s, s.day, getRegularSeasonMonthForDay(s.day).endDay + 1);
    return simulateMonth(
      s.rng,
      s.seasonState,
      s.schedule,
      s.players,
      buildSeasonSimulationOptions(s),
    );
  });
  s.seasonState = newState;
  s.day = newState.currentDay;
  profileLongSaveStage('regularSeason.affiliateDays', () => {
    advanceMinorLeagueDays(s, previousDay, s.day);
  });
  const crossedMonths = profileLongSaveStage('regularSeason.monthlyDevelopment', () =>
    applyMonthlyDevelopmentCheckpoints(s, previousDay, s.day));
  profileLongSaveStage('regularSeason.tradeMarket', () => {
    processTradeMarketActivity(s, previousDay, s.day);
  });
  profileLongSaveStage('regularSeason.injuryNews', () => {
    processDayInjuriesAndNews(s);
  });
  profileLongSaveStage('regularSeason.rosterNormalization', () => {
    normalizeLeagueActiveRosters(s);
  });
  profileLongSaveStage('regularSeason.signatureWeeklyMicroArc', () => {
    processSignatureMoments(s, result.games);
    applyWeeklyMomentsForCompletedRange(s, previousDay, s.day, result.seasonComplete);
    applyRegularSeasonPlayerMicroArcMoments(s);
  });
  profileLongSaveStage('regularSeason.narrative', () => {
    refreshNarrativeState(s, result.games);
  });
  profileLongSaveStage('regularSeason.tickerDebutConsequences', () => {
    refreshTickerFeed(s, {
      simDay: Math.max(previousDay, s.day - 1),
      games: result.games,
      previousStandings,
      previousInjuryIds,
      previousTradeCount,
    });
    applyDebutFlashbacks(s, recordProspectBondDebuts(s));
    resolveConsequenceChains(s);
  });
  profileLongSaveStage('regularSeason.fanSentiment', () => {
    refreshFanSentiment(s);
  });
  profileLongSaveStage('regularSeason.recordTracking', () => {
    syncRecordTracking(s, { publishWatchStories: true, publishBrokenRecords: true });
  });
  return profileLongSaveStage('regularSeason.monthlyHooksPulseAchievementsScenario', () => {
    publishMonthlyNarrativeHooks(s, crossedMonths);
    s.monthlyPulse = generateMonthlyPulse(s, monthlyContext);
    recordMonthlyDivisionLead(s);
    syncAchievementState(s);
    updateScenarioProgress(s);
    return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
  });
}

function finalizeOffseasonRollover(s: FullGameState): SimResultDTO {
  applySeasonEndPlayerArcMoments(s);
  applySeasonEndTeamDynastyMarkers(s);
  accrueCareerStatsForSeason(s);
  for (const player of s.players) {
    const seasonStats = s.seasonState.playerSeasonStats.get(player.id);
    player.priorSeasonGamesMissed = seasonStats?.gamesMissedToInjury ?? 0;
    player.priorSeasonEstimatedWar = seasonStats != null && (seasonStats.pa > 0 || seasonStats.ip > 0)
      ? estimatedWar(seasonStats)
      : player.rosterStatus === 'MLB'
        ? 0
        : null;
  }
  syncRecordTracking(s, {
    includeCurrentSeasonPlayoffAppearance: true,
    clearWatches: true,
    publishBrokenRecords: true,
  });

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
  for (const playerId of retired) {
    const player = s.players.find((candidate) => candidate.id === playerId);
    if (player) {
      retirePlayerAssignment(player, s.season);
    }
  }
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
  applyOffseasonNarrativeHooks(s);
  updateEarnedNicknamesForSeason(s);
  s.playerMoments = new Map(
    [...s.playerMoments.entries()].map(([playerId, moments]) => [playerId, decayMoments(moments)]),
  );
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
  s.tradeState = {
    ...createEmptyTradeState(),
    // Accepted trade history is durable simulation truth. In v35 it is also
    // the immutable source for multi-season retained-salary obligations, so a
    // season reset may clear offers/negotiations but must never erase history.
    tradeHistory: s.tradeState.tradeHistory,
  };
  s.internationalScoutingState = createEmptyInternationalScoutingState(s.season);
  s.draftState = createEmptyDraftState();
  s.minorLeagueState = createEmptyMinorLeagueState(s.season);
  s.monthlyPulse = createEmptyMonthlyPulseState();
  const teamIds = TEAMS.map((team) => team.id);
  s.schedule = generateSchedule(s.rng.fork());
  s.seasonState = createSeasonState(s.season, teamIds);
  for (const teamId of teamIds) {
    const rosterState = buildRosterState(teamId, s.players);
    const filledRoster = autoFillMLBRoster(teamId, s.players, rosterState, {
      teamBuildingArchetype: deriveWorkerTeamBuildingArchetype(s, teamId),
      protectServiceTimeProspects: true,
    });
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
  return profileLongSaveStage('regularSeason.day', simDayOperation);
}

function simDayOperation(): SimResultDTO {
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
      const { newState, result } = profileLongSaveStage('regularSeason.mlbSimulation', () => {
        incrementGamesMissedToInjury(s, s.day, s.day + 1);
        return simulateDay(
          s.rng,
          s.seasonState,
          s.schedule,
          s.players,
          buildSeasonSimulationOptions(s),
        );
      });
      s.seasonState = newState;
      s.day = newState.currentDay;
      s.gmRelationships = decayRelationships(s.gmRelationships, s.season);
      profileLongSaveStage('regularSeason.affiliateDays', () => {
        advanceMinorLeagueDay(s);
      });
      const crossedMonths = profileLongSaveStage('regularSeason.monthlyDevelopment', () =>
        applyMonthlyDevelopmentCheckpoints(s, previousDay, s.day));
      profileLongSaveStage('regularSeason.tradeMarket', () => {
        processTradeMarketActivity(s, previousDay, s.day);
      });
      profileLongSaveStage('regularSeason.injuryNews', () => {
        processDayInjuriesAndNews(s);
      });
      profileLongSaveStage('regularSeason.signatureWeeklyMicroArc', () => {
        processSignatureMoments(s, result.games);
        applyWeeklyMomentsForCompletedRange(s, previousDay, s.day, result.seasonComplete);
        applyRegularSeasonPlayerMicroArcMoments(s);
      });
      profileLongSaveStage('regularSeason.narrative', () => {
        refreshNarrativeState(s, result.games);
      });
      profileLongSaveStage('regularSeason.tickerDebutConsequences', () => {
        refreshTickerFeed(s, {
          simDay: previousDay,
          games: result.games,
          previousStandings,
          previousInjuryIds,
          previousTradeCount,
        });
        applyDebutFlashbacks(s, recordProspectBondDebuts(s));
        resolveConsequenceChains(s);
      });
      profileLongSaveStage('regularSeason.recordTracking', () => {
        syncRecordTracking(s);
      });
      return profileLongSaveStage('regularSeason.monthlyHooksPulseAchievementsScenario', () => {
        publishMonthlyNarrativeHooks(s, crossedMonths);
        updateScenarioProgress(s);
        return transitionToPlayoffIntro(s, result.games.length, result.seasonComplete);
      });
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
          unavailablePlayerIds: buildUnavailablePlayerIds(s),
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

  simLegacyAdvance(operation: 'simDay' | 'simWeek' | 'simMonth', expectedPhase: 'playoffs' | 'offseason'): SimResultDTO {
    const state = requireState();
    if ((operation !== 'simDay' && operation !== 'simWeek' && operation !== 'simMonth')
      || (expectedPhase !== 'playoffs' && expectedPhase !== 'offseason')
      || state.phase !== expectedPhase) {
      throw new Error('Legacy simulation phase authorization failed before mutation.');
    }
    switch (operation) {
      case 'simDay': return simDayInternal();
      case 'simWeek': return simWeekInternal();
      case 'simMonth': return simMonthInternal();
    }
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
      return { success: true as const, flowStateChanged: false as const };
    }

    s.franchise = {
      ...s.franchise,
      onboarding: {
        ...s.franchise.onboarding,
        welcomeBriefingSeen: true,
      },
    };
    return { success: true as const, flowStateChanged: true as const };
  },

  dismissCeremonyMoment(momentId: string) {
    return dismissCeremonyMomentState(requireState(), momentId);
  },

  respondToPressConference(conferenceId: string, responseId: string) {
    const s = requireState();
    if (hasAnsweredInteractivePressConference(s)) {
      return { success: false as const, error: 'Press conference already answered.' };
    }

    // Regenerate the conference to validate the response
    const pcStandings = s.seasonState.standings.getFullStandings();
    const pcUserStanding = Object.values(pcStandings).flat().find((e) => e.teamId === s.userTeamId);
    if (!pcUserStanding) return { success: false as const, error: 'No standings.' };

    const pcOwner = s.ownerState.get(s.userTeamId);
    const pcOwnerTone: 'supportive' | 'neutral' | 'impatient' =
      pcOwner && pcOwner.patience < 30 ? 'impatient'
        : pcOwner && pcOwner.patience > 70 ? 'supportive'
          : 'neutral';
    const pcProspects = s.players.filter(
      (p) => p.teamId === s.userTeamId && p.rosterStatus !== 'MLB' && (p.ceiling ?? p.overallRating) >= 350,
    );
    const pcTrade = s.tradeState.tradeHistory
      .filter((t) => t.fromTeamId === s.userTeamId || t.toTeamId === s.userTeamId)
      .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))[0];
    const pcDivRank = pcUserStanding.gamesBack === 0 ? 1 : Math.ceil(pcUserStanding.gamesBack / 3) + 1;

    const conf = generateInteractivePressConference({
      season: s.season, day: s.day, userTeamId: s.userTeamId,
      teamRecord: { wins: pcUserStanding.wins, losses: pcUserStanding.losses, divisionRank: pcDivRank, gamesBack: pcUserStanding.gamesBack },
      ownerTone: pcOwnerTone,
      recentTradeHeadline: pcTrade?.summary ?? null,
      farmStrength: Math.min(100, pcProspects.length * 20),
      topProspectCount: pcProspects.length,
    });
    if (!conf || conf.id !== conferenceId) {
      return { success: false as const, error: 'Press conference expired.' };
    }

    const response = conf.responses.find((r) => r.id === responseId);
    if (!response) {
      return { success: false as const, error: 'Invalid response.' };
    }

    // Apply morale delta to all players on the user's team
    // playerMorale is Map<playerId, { playerId, score, trend, summary, lastUpdated }>
    for (const player of s.players) {
      if (player.teamId !== s.userTeamId) continue;
      const morale = s.playerMorale.get(player.id);
      if (morale) {
        morale.score = Math.max(0, Math.min(100, morale.score + response.moraleDelta));
      }
    }

    // Apply owner satisfaction delta
    const pcOwnerForUpdate = s.ownerState.get(s.userTeamId);
    if (pcOwnerForUpdate) {
      s.ownerState.set(s.userTeamId, {
        ...pcOwnerForUpdate,
        patience: Math.max(0, Math.min(100, pcOwnerForUpdate.patience + response.ownerDelta)),
      });
    }

    // Generate news story if the response warrants it
    if (response.generatesNews) {
      const toneLabel = response.tone === 'confident' ? 'bold' : response.tone === 'deflect' ? 'evasive' : 'measured';
      s.news.unshift({
        id: `press-response-${conferenceId}-${response.tone}`,
        headline: `GM takes ${toneLabel} stance in press conference`,
        body: `"${response.quote}" — the GM's response drew ${response.tone === 'confident' ? 'applause from the fanbase' : 'mixed reactions from the media'}.`,
        priority: 3,
        category: 'press_conference',
        tag: 'ANALYSIS',
        timestamp: `S${s.season}D${s.day}`,
        relatedPlayerIds: [],
        relatedTeamIds: [s.userTeamId],
        read: false,
      });
    }

    applyPressToneConsequences(s, conferenceId, response);

    return {
      success: true as const,
      tone: response.tone,
      moraleDelta: response.moraleDelta,
      ownerDelta: response.ownerDelta,
      fanSentimentDelta: response.fanSentimentDelta,
    };
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
    if (!s.ownerState.has(teamId)) {
      s.ownerState.set(teamId, createOwnerState(teamId, getTeamBudget(teamId)));
    }
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
      return profileLongSaveStage('regularSeason.total', () => {
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
      });
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
      unavailablePlayerIds: buildUnavailablePlayerIds(s),
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
      unavailablePlayerIds: buildUnavailablePlayerIds(s),
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
      unavailablePlayerIds: buildUnavailablePlayerIds(s),
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
        unavailablePlayerIds: buildUnavailablePlayerIds(s),
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

  getRosterPlan() {
    const s = requireState();
    const plan = s.franchise.dayOne.openingDayPlan ?? buildDefaultRosterPlan(s);
    return normalizeRosterPlan(s, plan);
  },

  updateRosterPlan(patch: Partial<DayOneOpeningPlan>) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return {
        success: false as const,
        error: franchiseLockMessage(s),
        plan: normalizeRosterPlan(s, s.franchise.dayOne.openingDayPlan ?? buildDefaultRosterPlan(s)),
      };
    }
    const current = s.franchise.dayOne.openingDayPlan ?? buildDefaultRosterPlan(s);
    const next = normalizeRosterPlan(s, {
      lineupPlayerIds: patch.lineupPlayerIds ?? current.lineupPlayerIds,
      rotationPlayerIds: patch.rotationPlayerIds ?? current.rotationPlayerIds,
      bullpen: patch.bullpen === undefined ? current.bullpen : patch.bullpen,
    });
    s.franchise.dayOne = {
      ...s.franchise.dayOne,
      openingDayPlan: next,
    };
    return { success: true as const, plan: next };
  },

  exportSnapshot() {
    return measureWorkerQuerySync('exportSnapshot', () => exportGameSnapshot(requireState()));
  },

  importSnapshot(snapshot: unknown) {
    return measureRuntimeSync('lastLoadMs', () => {
      const compat = isSaveCompatible(snapshot);
      if (!compat.compatible) {
        return { success: false as const, error: compat.reason ?? 'Incompatible save.' };
      }
      resetTradeDeadlineState();
      // Import is a trust boundary, not a gameplay mutation. The snapshot has
      // already been migrated to canonical v34 by importGameSnapshot; running
      // narrative or achievement synchronizers here would make the singleton
      // worker disagree with the exact durable bytes before any accepted
      // mutation could persist those changes.
      setState(importGameSnapshot(snapshot));
      const s = requireState();
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

  async archiveOldSeasons() {
    const s = requireState();
    const archivedCount = archiveOldSeasonsInState(s);
    return {
      success: true as const,
      archivedCount,
      diagnostics: buildPerformanceDiagnosticsView(s),
    };
  },

  async pruneStaleData() {
    const s = requireState();
    const prunedCount = pruneStaleWorkerData(s);
    return {
      success: true as const,
      prunedCount,
      diagnostics: buildPerformanceDiagnosticsView(s),
    };
  },

  startDraft() {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
      return {
        success: false as const,
        draft: null,
        newPicks: [],
        error: 'Draft actions are available only during the draft phase.',
        flowStateChanged: false as const,
      };
    }
    const compensationError = validateQualifyingOfferCompensationState(s);
    if (compensationError) {
      return {
        success: false as const,
        draft: null,
        newPicks: [],
        error: compensationError,
        flowStateChanged: false as const,
      };
    }
    const result = s.draftClass
      ? startDraftSession(s)
      : startDraftSession(s, generateDraftClass(s.rng.fork(), s.season));
    return {
      ...result,
      flowStateChanged: result.flowStateChanged ?? result.success,
    };
  },

  makeDraftPick(prospectId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
      return { success: false as const, draft: null, newPicks: [], error: 'Draft actions are available only during the draft phase.', flowStateChanged: false as const };
    }
    const result = makeUserDraftSelection(s, prospectId);
    if (result.success && result.draft?.status === 'complete') {
      publishDraftGradesNarrative(s);
    }
    return {
      ...result,
      flowStateChanged: result.success,
    };
  },

  scoutDraftPlayer(prospectId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
      return { success: false as const, error: 'Draft actions are available only during the draft phase.', flowStateChanged: false as const };
    }
    const result = scoutUserDraftPlayer(s, prospectId);
    return {
      ...result,
      flowStateChanged: result.success,
    };
  },

  toggleDraftBigBoard(prospectId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
      return { success: false as const, error: 'Draft actions are available only during the draft phase.', flowStateChanged: false as const };
    }
    const result = toggleUserDraftBigBoardPlayer(s, prospectId);
    return {
      ...result,
      flowStateChanged: result.success,
    };
  },

  signDraftPick(playerId: string, bonusAmount: number) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
      return { success: false as const, error: 'Draft actions are available only during the draft phase.', flowStateChanged: false as const };
    }
    const result = signUserDraftPick(s, playerId, bonusAmount);
    if (result.success && result.signed) {
      const player = s.players.find((candidate) => candidate.id === playerId);
      recordDraftedHomegrownPlayer(s, playerId, player?.rosterStatus ?? 'ROOKIE');
      syncAchievementState(s);
    }
    return {
      ...result,
      flowStateChanged: result.success,
    };
  },

  simulateRemainingDraft() {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false as const, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'draft') {
      return { success: false as const, draft: null, newPicks: [], error: 'Draft actions are available only during the draft phase.', flowStateChanged: false as const };
    }
    const result = simulateRemainingDraftSession(s);
    if (result.success && result.flowStateChanged !== false && result.draft?.status === 'complete') {
      publishDraftGradesNarrative(s);
    }
    return {
      ...result,
      flowStateChanged: result.flowStateChanged ?? result.success,
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

  startNegotiation(offeringAssets: TradeAsset[], requestingAssets: TradeAsset[], toTeamId: string) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return {
        success: false,
        decision: 'rejected' as const,
        message: franchiseLockMessage(s),
        negotiation: null,
        tradeExecuted: false,
        review: null,
        flowStateChanged: false,
      };
    }
    const pruned = pruneExpiredNegotiations(s);
    const result = startNegotiation(
      s,
      offeringAssets,
      requestingAssets,
      toTeamId,
    );
    if (result.tradeExecuted) {
      syncAchievementState(s);
    }
    return { ...result, flowStateChanged: pruned || result.flowStateChanged };
  },

  advanceNegotiation(negotiationId: string, counterPackage: { offeringAssets: TradeAsset[]; requestingAssets: TradeAsset[] }) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return {
        success: false,
        decision: 'rejected' as const,
        message: franchiseLockMessage(s),
        negotiation: null,
        tradeExecuted: false,
        review: null,
        flowStateChanged: false,
      };
    }
    const pruned = pruneExpiredNegotiations(s);
    const result = advanceNegotiationSession(s, negotiationId, counterPackage);
    return { ...result, flowStateChanged: pruned || result.flowStateChanged };
  },

  resolveNegotiation(negotiationId: string, action: 'accept' | 'reject') {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return {
        success: false,
        decision: 'rejected' as const,
        message: franchiseLockMessage(s),
        negotiation: null,
        tradeExecuted: false,
        review: null,
        flowStateChanged: false,
      };
    }
    const pruned = pruneExpiredNegotiations(s);
    const result = resolveNegotiationSession(s, negotiationId, action);
    if (result.tradeExecuted) {
      syncAchievementState(s);
    }
    return { ...result, flowStateChanged: pruned || result.flowStateChanged };
  },

  proposeMultiTeam(proposal: Parameters<typeof proposeMultiTeamFramework>[1]) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return {
        success: false,
        accepted: false,
        message: franchiseLockMessage(s),
        narrative: franchiseLockMessage(s),
        fairness: null,
      };
    }
    return proposeMultiTeamFramework(s, proposal);
  },

  executeMultiTeamTrade(proposal: Parameters<typeof executeMultiTeamTradeFramework>[1]) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return {
        success: false,
        accepted: false,
        message: franchiseLockMessage(s),
        narrative: franchiseLockMessage(s),
        fairness: null,
        cascadeEvents: [],
        pendingTrades: [],
      };
    }
    const result = executeMultiTeamTradeFramework(s, proposal);
    if (result.success && result.accepted) {
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
      return {
        success: false,
        decision: 'rejected' as const,
        message: franchiseLockMessage(s),
        flowStateChanged: false,
      };
    }
    const result = respondToTradeOffer(s, offerId, action, counterPackage);
    if (result.success && result.decision === 'accepted') {
      syncAchievementState(s);
    }
    return result;
  },

  applyDevelopmentFocusPlan(playerId: string, category: DevelopmentFocusCategory) {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return { success: false, error: franchiseLockMessage(s), flowStateChanged: false as const };
    }

    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    if (player.teamId !== s.userTeamId) {
      return { success: false, error: 'Player is not controlled by the user team' };
    }
    if (!PLAYABLE_DEVELOPMENT_LEVELS.has(player.rosterStatus)) {
      return { success: false, error: 'Development plans can only be applied to playable affiliates' };
    }

    const developmentProgram = developmentProgramForFocusCategory(category, player);
    s.players = s.players.map((candidate) =>
      candidate.id === playerId
        ? { ...candidate, developmentProgram }
        : candidate,
    );
    return { success: true, developmentProgram };
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
    if (!result.success) {
      return { success: false, error: result.error };
    }
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
          streak: 'call',
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

    const previousPlayers = s.players;
    const previousMinorLeagueState = s.minorLeagueState;
    const previousRosterStates = new Map(s.rosterStates);
    const requiresWaivers = prepareMlbDemotionOptionLedger(s, playerId);
    const result = demotePlayer(playerId, s.players, rosterState, timestamp());
    if (!result.success) {
      s.players = previousPlayers;
      s.minorLeagueState = previousMinorLeagueState;
      s.rosterStates = previousRosterStates;
      return { success: false, error: result.error };
    }
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
    if (result.success && updatedPlayer && requiresWaivers) {
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
    if (!result.success) {
      return { success: false, error: result.error };
    }
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
    if (s.phase !== 'offseason' || s.offseasonState?.currentPhase !== 'free_agency') {
      return { accepted: false, reason: 'Contract offers are available only during free agency.' };
    }
    const market = s.freeAgencyMarket;
    if (!market || !hasCanonicalFreeAgencyMarket(s)) {
      return { accepted: false, reason: 'Free agency has not opened yet.' };
    }
    if (getAvailableMlbSigningSlots(s, s.userTeamId) <= 0) {
      return { accepted: false, reason: 'No active roster slots are available.' };
    }

    const freeAgent = market.freeAgents.find((candidate) => candidate.player.id === playerId);
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
    const userNeeds = evaluateTeamNeeds(s.players.filter((candidate) => (
      candidate.teamId === s.userTeamId
      && candidate.rosterStatus === 'MLB'
      && candidate.id !== playerId
    )));
    const result = makeUserOffer(
      market,
      offer,
      freeAgent
        ? buildFreeAgencyDecisionContext(
          s,
          s.userTeamId,
          freeAgent.player,
          userNeeds.get(freeAgent.player.position) ?? 50,
        )
        : 0,
    );
    if (!result.accepted || !freeAgent) {
      return result;
    }

    const compensationPlan = prepareQualifyingOfferCompensation(
      s,
      playerId,
      s.userTeamId,
      offer,
    );
    if (compensationPlan.kind === 'blocked') {
      return { accepted: false, reason: compensationPlan.reason };
    }

    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return result;
    }
    s.freeAgencyMarket = market;

    const previousTeamId = player.teamId;
    updatePlayerTeamAssignment(player, s.userTeamId, s.season);
    player.rosterStatus = 'MLB';
    player.minorLeagueLevel = null;
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

    market.freeAgents = market.freeAgents.filter(
      (candidate) => candidate.player.id !== playerId,
    );
    market.signedPlayers.push({
      ...freeAgent,
      player,
      signedWith: s.userTeamId,
      contract: offer,
    });
    if (s.offseasonState) {
      s.offseasonState = recordFASigning(s.offseasonState, {
        playerId: player.id,
        teamId: s.userTeamId,
        years,
        annualSalary: salary,
        totalValue: offer.totalValue,
      });
    }

    if (previousTeamId) {
      s.rosterStates.set(previousTeamId, buildRosterState(previousTeamId, s.players));
      s.rivalries = recordStarDefectionRivalry(s.rivalries, {
        season: s.season,
        fromTeamId: previousTeamId,
        toTeamId: s.userTeamId,
        playerName: `${player.firstName} ${player.lastName}`,
        starScore: player.overallRating,
      });
    }
    s.rosterStates.set(s.userTeamId, buildRosterState(s.userTeamId, s.players));
    commitQualifyingOfferCompensation(s, playerId, s.userTeamId, compensationPlan);
    applySigningConsequences(
      s,
      playerId,
      salary,
      years,
      freeAgent.marketValue,
      result.decision,
    );
    recordFreeAgentSigning(s, playerId, salary);
    syncAchievementState(s);
    return {
      ...result,
      qualifyingOfferCompensation: compensationPlan.kind === 'compensate'
        ? {
          tier: compensationPlan.priorityGroup,
          forfeitedRound: compensationPlan.forfeitedPick.round,
          forfeitedOriginalTeamId: compensationPlan.forfeitedPick.originalTeamId,
        }
        : null,
    };
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
      return { resolved: [], error: franchiseLockMessage(s), flowStateChanged: false as const };
    }
    if (
      s.phase !== 'offseason'
      || s.offseasonState?.currentPhase !== 'qualifying_offers'
      || s.offseasonState.completed === true
    ) {
      return { resolved: [], error: 'Qualifying offers phase is not active.', flowStateChanged: false as const };
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
    if (s.phase !== 'offseason') {
      return null;
    }
    const progress = advanceOffseasonOnce(s);
    applyAISigningProgress(s, progress.aiSignings);
    const view = buildOffseasonStateView(s);
    return view ? {
      ...view,
      flowStateChanged: progress.flowStateChanged !== false && progress.error == null,
      ...(progress.error ? { error: progress.error } : {}),
    } : null;
  },

  skipOffseasonPhase(): OffseasonStateView | null {
    const s = requireState();
    if (syncFranchiseTerminationFromOwner(s)) {
      return null;
    }
    if (s.phase !== 'offseason') {
      return null;
    }
    const progress = skipOffseasonPhaseWithAI(s);
    applyAISigningProgress(s, progress.aiSignings);
    const view = buildOffseasonStateView(s);
    return view ? {
      ...view,
      flowStateChanged: progress.flowStateChanged !== false && progress.error == null,
      ...(progress.error ? { error: progress.error } : {}),
    } : null;
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
