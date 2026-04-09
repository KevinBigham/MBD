import {
  AFFILIATE_LEVELS,
  calculateAwardRaces,
  calculateDynastyLeaderboardScore,
  calculateCoachingPayroll,
  calculateLuxuryTax,
  calculateQualifyingOfferSalary,
  calculateTeamPayroll,
  compareTimelines,
  createFreeAgencyMarket,
  describeInjury,
  evaluatePlayerTradeValue,
  generateGameHighlights,
  generateGameRecap,
  generatePlayByPlay,
  generateAITradeOffers,
  getScenarioById,
  getActiveRosterLimit,
  getTeamById,
  getTopFreeAgents,
  getUnreadNews,
  generateInteractivePressConference,
  SCENARIO_LIBRARY,
  scoutPlayer,
  toInternalRating,
  toLetterGrade,
  // Round 1 APIs
  selectPressConferenceTopic,
  generateEnhancedPressConference,
  evaluatePressConferenceResponse,
  // Round 2 APIs
  generateDeadlineTimeline,
  getDeadlineEventsForDay,
  generateBiddingWar,
  getMilestoneAlerts,
  generateMarketReport,
  generateMarketSummary,
  calculateCoachSynergy,
  calculateCoachPlayerAffinity,
  calculateStaffHarmony,
  getCoachDevelopmentBonus,
  identifyChemistryIssues,
  findMentorCandidates,
  findProtegeeCandidates,
  pairMentors,
  advanceMentorship,
  getMentorshipDevelopmentBonus,
  getScenarioObjectives,
  evaluateObjectiveProgress,
  // Round 3 APIs — unwired modules
  comparePlayersHead2Head,
  comparePlayerStats,
  generateComparisonSummary,
  rankPlayerAttributes,
  projectSeasonStats,
  findNotableProjections,
  SEASON_GAMES,
  findSimilarPlayers,
  getPlayerArchetype,
  generateEnhancedPlayByPlay,
  generateAwardCeremony,
  // Round 4 APIs — foundation intelligence
  calculateBreakoutProbability,
  classifyDevelopmentTrajectory,
  detectRegressionRisk,
  predictProspectCeiling,
  generateBreakoutScoutReport,
  buildMultiScoutConsensus,
  estimateAttributeWithUncertainty,
  buildPlayoffGameModifiers,
  generateMomentumNarrative,
} from '@mbd/sim-core';
import type { CareerStatsLedger, HistoricalPlayer, ScoutConflict } from '@mbd/contracts';
import type {
  FreeAgent,
  GameBoxScore,
  GeneratedPlayer,
  LeaderboardStatKey,
  PlayerGameStats,
  PlayerTradeValue,
  PlayoffBracket,
  RosterState,
  StandingsEntry,
} from '@mbd/sim-core';
import {
  buildIFAPoolView,
  buildSeasonFlowStateView,
  buildDraftRoomView,
  buildOffseasonStateView,
  getExtensionCandidatesForTeam,
  getExtensionOfferForPlayer,
  getPromotionCandidatesForTeam,
  getQualifyingOfferEligibleForTeam,
  getRosterComplianceIssuesForTeam,
  getTeamPlayers,
  createStableWorkerRng,
  requireState,
  state,
  timestamp,
  toPlayerDTO,
} from './sim.worker.helpers.js';
import type { PlayerDTO, TeamStandingsDTO } from './sim.worker.helpers.js';
import { buildPressRoomFeed } from './sim.worker.pressRoom.js';
import { buildPerformanceDiagnosticsView, estimateSnapshotSizeBytes } from './sim.worker.diagnostics.js';
import { buildAchievementView } from './sim.worker.achievements.js';
import { getCeremonyStateView } from './sim.worker.ceremony.js';
import { getMonthlyPulse } from './sim.worker.monthlyPulse.js';
import { getDynastyScoreSummary } from './sim.worker.legacy.js';
import { buildSetupPreview, getDifficultyAdjustedBudget, getTeamStaffBudget } from './sim.worker.setup.js';
import {
  compareSeasons,
  getAwardHistory,
  getHistoryOverview,
  getPersonalityProfileForPlayer,
  getRivalriesForTeam,
  getSeasonArchive,
  getSeasonHistoryView,
  getSeasonHistory,
  resolveHistoryDisplayNames as resolveNarrativeHistoryDisplayNames,
} from './sim.worker.narrative.js';
import {
  buildTradeAssetInventoryView,
  buildTradeDeadlineStateView,
  buildTradeDialogueView,
  buildTradeHistoryView,
  buildTradeOffersView,
} from './sim.worker.trade.js';
import {
  buildSeasonRecapView,
  buildOffseasonHeadlineView,
} from './sim.worker.seasonNarrative.js';
import {
  buildProspectPipelineView,
} from './sim.worker.pipeline.js';
import {
  buildDraftCommentaryView,
  buildDraftPostDraftGradesView,
  buildDraftProspectReactionView,
} from './sim.worker.draft.js';
import {
  buildAdvancedStatsIndex,
  buildLeagueLeaderEntries,
  getAdvancedStatsForPlayer,
} from './sim.worker.stats.js';
import {
  getActiveDevelopmentSetbackView,
  getMinorLeagueProgressionView,
  getProspectBondView,
} from './sim.worker.farm.js';
import { exportGameSnapshot } from './snapshot.js';
import {
  listBranches,
  loadGameById,
} from '../shared/lib/saveSystem.js';

function pctFromRecord(wins: number, losses: number): number {
  const total = wins + losses;
  return total > 0 ? wins / total : 0;
}

function calculateOps(stats: PlayerGameStats): number {
  if (stats.pa === 0) {
    return 0;
  }

  const singles = stats.hits - stats.doubles - stats.triples - stats.hr;
  const onBase = (stats.hits + stats.bb) / Math.max(1, stats.ab + stats.bb);
  const slugging = (singles + (stats.doubles * 2) + (stats.triples * 3) + (stats.hr * 4)) / Math.max(1, stats.ab);
  return onBase + slugging;
}

function calculateEra(stats: PlayerGameStats): number {
  if (stats.ip === 0) {
    return 99;
  }
  return (stats.earnedRuns / (stats.ip / 3)) * 9;
}

function buildDevelopmentReportsView(
  s: NonNullable<typeof state>,
  playerId: string,
) {
  const recommendations = s.minorLeagueState.conversionRecommendations
    .filter((entry) => entry.playerId === playerId);
  const reports = s.minorLeagueState.developmentReports
    .filter((entry) => entry.playerId === playerId)
    .sort((left, right) => left.season - right.season || left.month - right.month);
  const minorLeagueProgression = getMinorLeagueProgressionView(s, playerId);
  const prospectBond = getProspectBondView(s, playerId);
  const activeSetback = getActiveDevelopmentSetbackView(s, playerId);
  const debutFlashback = s.debutFlashbacks.find((entry) => entry.playerId === playerId) ?? null;

  if (
    reports.length === 0
    && recommendations.length === 0
    && minorLeagueProgression.length === 0
    && !prospectBond
    && !activeSetback
    && !debutFlashback
  ) {
    return null;
  }

  return {
    playerId,
    history: reports.map((entry) => ({
      season: entry.season,
      month: entry.month,
      trajectory: entry.trajectory,
      summary: entry.summary,
      overallRating: entry.overallRating,
    })),
    recommendations,
    minorLeagueProgression,
    prospectBond,
    activeSetback,
    debutFlashback,
  };
}

function buildStableScoutReportView(
  s: NonNullable<typeof state>,
  player: GeneratedPlayer,
  scope: string,
) {
  const staff = s.scoutingStaffs.get(s.userTeamId);
  if (!staff || staff.length === 0) {
    return null;
  }

  const report = scoutPlayer(
    createStableWorkerRng(s, scope),
    staff[0]!,
    player,
    timestamp(),
  );
  const team = getTeamById(player.teamId);

  return {
    playerId: report.playerId,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    age: player.age,
    teamName: team?.abbreviation ?? player.teamId.toUpperCase(),
    isPitcher: player.pitcherAttributes != null,
    grades: report.observedRatings,
    confidence: report.confidence,
    overall: report.overallGrade,
    ceiling: report.ceiling,
    floor: report.floor,
    notes: report.notes,
    scoutName: staff[0]!.name,
    date: report.reportDate,
    reliability: Math.max(1, Math.min(5, Math.round(report.reliability * 5))),
  };
}

function getCareerStatsForPlayer(
  s: NonNullable<typeof state>,
  playerId: string,
): CareerStatsLedger | null {
  return s.careerStats.find((entry) => entry.playerId === playerId) ?? null;
}

function getScoutConflictForPlayer(
  s: NonNullable<typeof state>,
  playerId: string,
): ScoutConflict | null {
  return s.scoutConflicts.find((entry) => entry.prospectId === playerId) ?? null;
}

function buildFatigueWarnings(
  s: NonNullable<typeof state>,
  mlbPlayers: GeneratedPlayer[],
) {
  return mlbPlayers
    .filter((player) => player.position === 'SP')
    .map((player) => {
      if (player.pitcherAttributes == null) {
        return null;
      }
      const stats = s.seasonState.playerSeasonStats.get(player.id);
      if (!stats || stats.ip <= 0) {
        return null;
      }

      const inningsPitched = stats.ip / 3;
      const fatigueScore = Number((inningsPitched / Math.max(12, player.pitcherAttributes.stamina / 10)).toFixed(1));
      return {
        playerId: player.id,
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        fatigueScore,
        summary: `${inningsPitched.toFixed(1)} IP against ${player.pitcherAttributes.stamina} stamina.`,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .sort((left, right) => right.fatigueScore - left.fatigueScore || left.name.localeCompare(right.name))
    .slice(0, 3);
}

function mapProspectTrend(
  trajectory: 'ahead_of_curve' | 'on_track' | 'below_expectations' | 'bust_risk' | undefined,
): 'up' | 'steady' | 'down' {
  switch (trajectory) {
    case 'ahead_of_curve':
      return 'up';
    case 'below_expectations':
    case 'bust_risk':
      return 'down';
    default:
      return 'steady';
  }
}

function buildRecentFarmMoves(
  s: NonNullable<typeof state>,
  pressRoomFeed: ReturnType<typeof buildPressRoomFeed>,
) {
  return pressRoomFeed
    .filter((entry) =>
      entry.relatedTeamIds.includes(s.userTeamId)
      && (entry.category === 'development' || entry.category === 'roster_move')
    )
    .slice(0, 3)
    .map((entry) => ({
      id: entry.id,
      headline: entry.headline,
      timestamp: entry.timestamp,
    }));
}

function buildThisDayInHistory(s: NonNullable<typeof state>) {
  const archives = [...s.seasonArchive, ...s.archivedSeasons]
    .sort((left, right) => right.season - left.season);
  if (archives.length === 0) {
    return null;
  }

  const archive = archives[(Math.max(1, s.day) - 1) % archives.length]!;
  if ('userSummary' in archive) {
    return {
      season: archive.season,
      headline: archive.userSummary?.playoffResult ?? `Season ${archive.season} checkpoint`,
      summary: archive.userSummary?.storylines?.[0]
        ?? `${archive.userSummary?.record ?? 'Unknown record'} · ${archive.userSummary?.playoffResult ?? 'Archived season'}`,
    };
  }

  return {
    season: archive.season,
    headline: archive.championshipWon ? 'Won the World Series' : (archive.playoffResult ?? `Season ${archive.season} archive`),
    summary: archive.userRecord
      ? `${archive.userRecord.wins}-${archive.userRecord.losses}${archive.championshipWon ? ' · Title season' : ''}`
      : 'Archived season summary.',
  };
}

function buildPlayerNameMap(s: NonNullable<typeof state>) {
  const names = new Map<string, string>();
  for (const player of s.players) {
    names.set(player.id, `${player.firstName} ${player.lastName}`);
  }
  return names;
}

function buildTeamNameMap(boxScore: GameBoxScore) {
  return new Map<string, string>([
    [boxScore.awayTeamId, teamNameFromId(boxScore.awayTeamId)],
    [boxScore.homeTeamId, teamNameFromId(boxScore.homeTeamId)],
  ]);
}

function buildGamePlayByPlayView(
  s: NonNullable<typeof state>,
  gameIndex: number,
) {
  const boxScore = s.seasonState.gameLog[gameIndex];
  if (!boxScore) {
    return null;
  }

  const playerNames = buildPlayerNameMap(s);
  const teamNames = buildTeamNameMap(boxScore);
  const highlights = generateGameHighlights(boxScore, playerNames, teamNames);
  const highlightKeys = new Set(
    highlights.map((highlight) => `${highlight.inning}:${highlight.halfInning}:${highlight.text}`),
  );
  const plays = boxScore.paResults.map((pa) => {
    const text = generatePlayByPlay(
      pa,
      playerNames.get(pa.batterId) ?? pa.batterId,
      playerNames.get(pa.pitcherId) ?? pa.pitcherId,
      teamNames.get(boxScore.awayTeamId) ?? boxScore.awayTeamId.toUpperCase(),
      teamNames.get(boxScore.homeTeamId) ?? boxScore.homeTeamId.toUpperCase(),
    );

    return {
      inning: pa.inning,
      halfInning: pa.halfInning,
      text,
      isHighlight: highlightKeys.has(`${pa.inning}:${pa.halfInning}:${text}`),
    };
  });

  return {
    gameIndex,
    recap: generateGameRecap(boxScore, highlights, playerNames, teamNames),
    highlights,
    plays,
    boxScore,
  };
}

function buildRecentGameRecapViews(
  s: NonNullable<typeof state>,
  count: number,
) {
  return s.seasonState.gameLog
    .map((boxScore, gameIndex) => ({ boxScore, gameIndex }))
    .filter(({ boxScore }) => boxScore.homeTeamId === s.userTeamId || boxScore.awayTeamId === s.userTeamId)
    .reverse()
    .slice(0, Math.max(1, count))
    .map(({ gameIndex }) => {
      const detail = buildGamePlayByPlayView(s, gameIndex);
      if (!detail) {
        return null;
      }

      return {
        gameIndex,
        recap: detail.recap,
        highlights: detail.highlights,
        playByPlay: detail.plays,
        boxScore: detail.boxScore,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
}

function buildDashboardSummary(s: NonNullable<typeof state>) {
  const fullStandings = s.seasonState.standings.getFullStandings();
  const userDivision = getTeamById(s.userTeamId)?.division ?? 'AL_EAST';
  const userLeaguePrefix = userDivision.startsWith('AL') ? 'AL' : 'NL';
  const divisionStandings = Object.values(fullStandings)
    .find((entries) => entries.some((entry) => entry.teamId === s.userTeamId)) ?? [];
  const rawUserStanding = divisionStandings.find((entry) => entry.teamId === s.userTeamId) ?? null;
  const divisionView = divisionStandings.map((entry, index) => {
    const team = getTeamById(entry.teamId);
    return {
      teamId: entry.teamId,
      teamName: team ? `${team.city} ${team.name}` : entry.teamId.toUpperCase(),
      abbreviation: team?.abbreviation ?? entry.teamId.toUpperCase(),
      wins: entry.wins,
      losses: entry.losses,
      pct: entry.pct.toFixed(3).replace(/^0/, ''),
      gamesBack: entry.gamesBack,
      streak: entry.streak,
      runDifferential: entry.runDifferential,
      divisionRank: index + 1,
    };
  });

  const userStanding = divisionView.find((entry) => entry.teamId === s.userTeamId) ?? null;
  const ownerState = s.ownerState.get(s.userTeamId) ?? null;
  const chemistry = s.teamChemistry.get(s.userTeamId) ?? null;
  const dynasty = getDynastyScoreSummary(s);
  const userRecord = s.seasonState.standings.getRecord(s.userTeamId);
  const seasonPct = pctFromRecord(userRecord?.wins ?? 0, userRecord?.losses ?? 0);
  const last10Wins = rawUserStanding?.last10Wins ?? 0;
  const last10Losses = rawUserStanding?.last10Losses ?? 0;
  const last10Pct = pctFromRecord(last10Wins, last10Losses);
  const seasonRunDiffPerGame = (userStanding?.runDifferential ?? 0) / Math.max(1, (userStanding?.wins ?? 0) + (userStanding?.losses ?? 0));
  const estimatedLast30RunDiffPerGame = seasonRunDiffPerGame * (1 + ((last10Pct - seasonPct) * 2));
  const leagueStandings = Object.values(fullStandings)
    .flatMap((entries) => entries)
    .filter((entry) => getTeamById(entry.teamId)?.division.startsWith(userLeaguePrefix))
    .sort((left, right) => {
      if (right.wins !== left.wins) return right.wins - left.wins;
      return left.losses - right.losses;
    });
  const projectedWins = Math.round(seasonPct * 162);
  const playoffCutoff = leagueStandings[5]?.wins ?? 84;
  const playoffProbability = Math.max(5, Math.min(95, Math.round(50 + ((projectedWins - playoffCutoff) * 6) + ((userStanding?.divisionRank === 1 ? 8 : 0)))));

  const mlbPlayers = s.players.filter((player) => player.teamId === s.userTeamId && player.rosterStatus === 'MLB');
  const hitters = mlbPlayers
    .filter((player) => player.pitcherAttributes == null)
    .map((player) => ({
      player,
      stats: s.seasonState.playerSeasonStats.get(player.id),
    }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } => entry.stats != null)
    .sort((left, right) => calculateOps(right.stats) - calculateOps(left.stats))
    .slice(0, 2)
    .map(({ player, stats }) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      label: `${calculateOps(stats).toFixed(3)} OPS`,
      sparklineValues: [
        Number((stats.hits / Math.max(1, stats.ab)).toFixed(3)),
        Number((((stats.hits + stats.bb) / Math.max(1, stats.ab + stats.bb)).toFixed(3))),
        Number(calculateOps(stats).toFixed(3)),
      ],
      statLine: `${stats.hits} H · ${stats.hr} HR · ${stats.rbi} RBI`,
    }));
  const pitchers = mlbPlayers
    .filter((player) => player.pitcherAttributes != null)
    .map((player) => ({
      player,
      stats: s.seasonState.playerSeasonStats.get(player.id),
    }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } => entry.stats != null && entry.stats.ip > 0)
    .sort((left, right) => calculateEra(left.stats) - calculateEra(right.stats))
    .slice(0, 1)
    .map(({ player, stats }) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      label: `${calculateEra(stats).toFixed(2)} ERA`,
      sparklineValues: [
        Number(calculateEra(stats).toFixed(2)),
        Number(((stats.strikeouts / Math.max(1, stats.ip / 3)) * 9).toFixed(1)),
        stats.wins,
      ],
      statLine: `${stats.wins} W · ${stats.strikeouts} K`,
    }));

  const injuredPlayers = Array.from(s.injuries.entries())
    .map(([playerId, injury]) => ({
      playerId,
      player: s.players.find((candidate) => candidate.id === playerId),
      daysRemaining: injury.daysRemaining,
    }))
    .filter((entry) => entry.player?.teamId === s.userTeamId)
    .sort((left, right) => left.daysRemaining - right.daysRemaining);

  const finances = {
    payroll: calculateTeamPayroll(s.userTeamId, getTeamPlayers(s.userTeamId)).totalPayroll,
    budget: getDifficultyAdjustedBudget(s, s.userTeamId),
  };
  const fatigueWarnings = buildFatigueWarnings(s, mlbPlayers);
  const tradeDeadlineState = buildTradeDeadlineStateView(s);
  const farmReport = buildFarmReport(s.userTeamId);

  const expiringContracts = mlbPlayers
    .filter((player) => player.contract.years <= 1)
    .sort((left, right) => right.overallRating - left.overallRating)
    .slice(0, 4)
    .map((player) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      salary: player.contract.annualSalary,
    }));

  const pressRoomFeed = buildPressRoomFeed(s, 12);
  const briefingCount = pressRoomFeed.filter((entry) => entry.source === 'briefing').length;
  const recentFarmMoves = buildRecentFarmMoves(s, pressRoomFeed);
  const rivalries = Array.from(getRivalriesForTeam(s, s.userTeamId).values())
    .sort((left, right) => right.intensity - left.intensity)
    .slice(0, 3)
    .map((rivalry) => ({
      id: rivalry.id,
      opponentTeamId: rivalry.teamA === s.userTeamId ? rivalry.teamB : rivalry.teamA,
      intensity: rivalry.intensity,
      summary: rivalry.summary,
      currentSeasonRecord: `${getTeamById(rivalry.teamA)?.abbreviation ?? rivalry.teamA.toUpperCase()} ${rivalry.currentSeasonWinsA ?? 0}-${rivalry.currentSeasonWinsB ?? 0} ${getTeamById(rivalry.teamB)?.abbreviation ?? rivalry.teamB.toUpperCase()}`,
      historicalRecord: `${getTeamById(rivalry.teamA)?.abbreviation ?? rivalry.teamA.toUpperCase()} ${rivalry.historicalWinsA ?? 0}-${rivalry.historicalWinsB ?? 0} ${getTeamById(rivalry.teamB)?.abbreviation ?? rivalry.teamB.toUpperCase()}`,
    }));
  const phasePriority: Record<'setup' | 'rising' | 'climax' | 'resolution', number> = {
    setup: 0,
    rising: 1,
    climax: 2,
    resolution: 3,
  };
  const storylinesToWatch = s.playerStoryArcs
    .filter((arc) => arc.resolvedSeason == null)
    .map((arc) => {
      const player = s.players.find((candidate) => candidate.id === arc.playerId);
      if (!player) {
        return null;
      }
      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        teamId: player.teamId,
        teamName: teamNameFromId(player.teamId),
        arcType: arc.arcType,
        phase: arc.phase,
        latestMilestone: arc.milestones.at(-1) ?? null,
        sortUserTeam: player.teamId === s.userTeamId ? 1 : 0,
        sortPhase: phasePriority[arc.phase],
        startSeason: arc.startSeason,
        startDay: arc.startDay,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .sort((left, right) =>
      right.sortUserTeam - left.sortUserTeam
      || right.sortPhase - left.sortPhase
      || right.startSeason - left.startSeason
      || right.startDay - left.startDay
      || left.playerName.localeCompare(right.playerName),
    )
    .slice(0, 3)
    .map(({
      sortUserTeam: _sortUserTeam,
      sortPhase: _sortPhase,
      startSeason: _startSeason,
      startDay: _startDay,
      ...entry
    }) => entry);

  return {
    franchise: {
      teamName: teamNameFromId(s.userTeamId),
      abbreviation: getTeamById(s.userTeamId)?.abbreviation ?? s.userTeamId.toUpperCase(),
      gmName: s.franchise.gmName,
      difficulty: s.franchise.difficulty,
      welcomeBriefingPending: !s.franchise.onboarding.welcomeBriefingSeen,
      season: s.season,
      record: userStanding ? `${userStanding.wins}-${userStanding.losses}` : '0-0',
      division: userDivision,
      divisionRank: userStanding?.divisionRank ?? 1,
      achievementCount: s.achievements.unlocked.length,
      dynasty,
      status: s.franchise.status ?? 'active',
      endReason: s.franchise.endReason ?? null,
      owner: ownerState,
      chemistry,
      frontOffice: s.frontOfficeState.get(s.userTeamId) ?? null,
    },
    fanSentiment: s.fanSentiment,
    challenge: s.challengeState
      ? {
          ...s.challengeState,
          name: getScenarioById(s.challengeState.scenarioId)?.name ?? s.challengeState.scenarioId,
        }
      : null,
    momentum: {
      last10: `${last10Wins}-${last10Losses}`,
      streak: userStanding?.streak ?? 'W0',
      runDifferential: userStanding?.runDifferential ?? 0,
      seasonRunDiffPerGame: Number(seasonRunDiffPerGame.toFixed(2)),
      last30RunDiffPerGame: Number(estimatedLast30RunDiffPerGame.toFixed(2)),
      playoffProbability,
    },
    roster: {
      topPerformers: [...hitters, ...pitchers],
      injuredCount: injuredPlayers.length,
      nextReturnDays: injuredPlayers[0]?.daysRemaining ?? null,
      fatigueWarnings,
      payroll: finances.payroll,
      budget: finances.budget,
      luxuryTax: calculateLuxuryTax(finances.payroll),
    },
    intel: {
      tradeInboxCount: s.tradeState.pendingOffers.length,
      expiringContracts,
      topProspect: farmReport.topProspects[0]
        ? {
          playerId: farmReport.topProspects[0].playerId,
          name: farmReport.topProspects[0].playerName,
          position: farmReport.topProspects[0].position,
          readiness: farmReport.topProspects[0].overallRating,
          level: farmReport.topProspects[0].level,
        }
        : null,
      rivalries,
    },
    tradeIntel: {
      daysUntilDeadline: tradeDeadlineState.daysUntilDeadline,
      deadlineMode: tradeDeadlineState.deadlineMode,
      activeTradeOffers: s.tradeState.pendingOffers.length,
      recentSummary: tradeDeadlineState.recap?.analysisHeadline ?? tradeDeadlineState.ticker[0]?.summary ?? null,
      recentTrades: tradeDeadlineState.ticker.slice(0, 3),
    },
    farmIntel: {
      topProspects: farmReport.topProspects.slice(0, 3).map((prospect) => {
        const latestReport = s.minorLeagueState.developmentReports
          .filter((entry) => entry.playerId === prospect.playerId)
          .sort((left, right) => right.season - left.season || right.month - left.month)[0];

        return {
          playerId: prospect.playerId,
          name: prospect.playerName,
          position: prospect.position,
          level: prospect.levelLabel,
          readiness: prospect.overallRating,
          trend: mapProspectTrend(latestReport?.trajectory),
          latestLineSummary: prospect.latestLineSummary,
        };
      }),
      recentMoves: recentFarmMoves,
    },
    storylinesToWatch,
    divisionStandings: divisionView,
    pressRoom: {
      feed: pressRoomFeed,
      latest: pressRoomFeed[0] ?? null,
      briefingCount,
      newsCount: pressRoomFeed.length - briefingCount,
      unreadCount: pressRoomFeed.length,
    },
    thisDayInHistory: buildThisDayInHistory(s),
  };
}

function teamNameFromId(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function buildHistoricalSummary(player: HistoricalPlayer) {
  return {
    playerId: player.playerId,
    fullName: player.fullName,
    position: player.position,
    lastKnownTeamId: player.lastKnownTeamId,
    active: player.active,
    retiredSeason: player.retiredSeason,
    seasonsPlayed: player.seasonsPlayed,
    personalityTraits: [...player.personalityTraits],
  };
}

function buildHistoricalPlayerDTO(player: HistoricalPlayer): PlayerDTO {
  const storyArcs = (state?.playerStoryArcs ?? [])
    .filter((arc) => arc.playerId === player.playerId)
    .sort((left, right) =>
      Number(right.resolvedSeason == null) - Number(left.resolvedSeason == null)
      || (right.resolvedSeason ?? 0) - (left.resolvedSeason ?? 0)
      || right.startSeason - left.startSeason
      || right.startDay - left.startDay,
    );
  const activeStory = storyArcs.find((arc) => arc.resolvedSeason == null) ?? null;
  const displayRating = player.peakOverall ?? 50;
  const overallRating = toInternalRating(displayRating);

  return {
    id: player.playerId,
    firstName: player.firstName,
    lastName: player.lastName,
    age: 0,
    position: player.position,
    overallRating,
    displayRating,
    letterGrade: toLetterGrade(overallRating),
    rosterStatus: player.active ? 'MLB' : 'RETIRED',
    teamId: player.lastKnownTeamId,
    serviceTimeDays: player.seasonsPlayed * 172,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    contract: {
      years: 0,
      annualSalary: 0,
      totalValue: 0,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: null,
    floor: null,
    developmentProgram: null,
    developmentTrajectory: 'on_track',
    personalityTraits: [...player.personalityTraits],
    extensionHistory: [],
    stats: null,
    advanced: null,
    historical: true,
    historicalSummary: buildHistoricalSummary(player),
    activeStory: activeStory
      ? {
        arcType: activeStory.arcType,
        phase: activeStory.phase,
        startSeason: activeStory.startSeason,
        startDay: activeStory.startDay,
        latestMilestone: activeStory.milestones.at(-1) ?? null,
      }
      : null,
    storyHistory: storyArcs
      .filter((arc) => arc.resolvedSeason != null)
      .map((arc) => ({
        arcType: arc.arcType,
        phase: arc.phase,
        startSeason: arc.startSeason,
        startDay: arc.startDay,
        resolvedSeason: arc.resolvedSeason,
        milestones: [...arc.milestones],
      })),
  };
}

function decorateHistoricalPlayer(playerView: PlayerDTO, historicalPlayer: HistoricalPlayer | null): PlayerDTO {
  if (!historicalPlayer) {
    return playerView;
  }

  return {
    ...playerView,
    personalityTraits: playerView.personalityTraits ?? [...historicalPlayer.personalityTraits],
    historical: !historicalPlayer.active || playerView.rosterStatus === 'RETIRED',
    historicalSummary: buildHistoricalSummary(historicalPlayer),
  };
}

function matchesPlayerQuery(
  player: Pick<HistoricalPlayer, 'firstName' | 'lastName' | 'fullName'>,
  normalizedQuery: string,
): boolean {
  return player.firstName.toLowerCase().includes(normalizedQuery)
    || player.lastName.toLowerCase().includes(normalizedQuery)
    || player.fullName.toLowerCase().includes(normalizedQuery);
}

function formatMinorLevel(level: string): string {
  switch (level) {
    case 'A_PLUS':
      return 'A+';
    case 'ROOKIE':
      return 'Rookie';
    default:
      return level;
  }
}

function buildDFARecommendations(teamId: string) {
  const s = requireState();
  const rosterState = s.rosterStates.get(teamId);
  if (!rosterState) {
    return [];
  }

  const fortyManSet = new Set(rosterState.fortyManRoster);
  return s.players
    .filter((player) => player.teamId === teamId && fortyManSet.has(player.id))
    .map((player) => {
      const tradeValue = evaluatePlayerTradeValue(player);
      const score = Math.round(
        Math.max(0, 82 - player.overallRating)
        + Math.max(0, player.age - 26) * 4
        + (player.contract.annualSalary * 3)
        + (player.rosterStatus === 'MLB' ? -10 : 10)
        + Math.max(0, 55 - tradeValue.overall),
      );
      const levelLabel = player.rosterStatus === 'MLB' ? 'MLB fringe role' : `${formatMinorLevel(player.rosterStatus)} depth role`;
      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: player.age,
        salary: Number(player.contract.annualSalary.toFixed(1)),
        score,
        reason: `${levelLabel} with age ${player.age} and $${player.contract.annualSalary.toFixed(1)}M salary pressure.`,
      };
    })
    .sort((left, right) => right.score - left.score || left.playerName.localeCompare(right.playerName))
    .slice(0, 5);
}

function buildMinorLeagueLineSummary(
  player: GeneratedPlayer,
  line: {
    avg: number;
    hits: number;
    hr: number;
    rbi: number;
    ip: number;
    era: number;
    k: number;
  } | null,
): string | null {
  if (!line) {
    return null;
  }

  if (player.pitcherAttributes) {
    return `${line.ip.toFixed(1)} IP · ${line.era.toFixed(2)} ERA · ${line.k} K`;
  }

  return `${line.avg.toFixed(3).replace(/^0/, '')} AVG · ${line.hits} H · ${line.hr} HR · ${line.rbi} RBI`;
}

function buildFarmReport(teamId: string) {
  const s = requireState();
  const breakoutCandidates = s.playerStoryArcs
    .filter((arc) => arc.resolvedSeason == null && arc.arcType === 'prospect_rise')
    .map((arc) => {
      const player = s.players.find((candidate) => candidate.id === arc.playerId && candidate.teamId === teamId);
      if (!player) {
        return null;
      }

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        summary: arc.milestones.at(-1) ?? `${player.firstName} ${player.lastName} is on the rise.`,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .slice(0, 3);
  const prospects = s.players
    .filter((player) =>
      player.teamId === teamId
      && player.rosterStatus !== 'MLB'
      && player.rosterStatus !== 'INTERNATIONAL',
    )
    .map((player) => {
      const prospectBond = getProspectBondView(s, player.id);
      const activeSetback = getActiveDevelopmentSetbackView(s, player.id);
      const progression = getMinorLeagueProgressionView(s, player.id);
      const latestLine = progression.at(-1) ?? null;

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        level: player.rosterStatus,
        levelLabel: formatMinorLevel(player.rosterStatus),
        overallRating: player.overallRating,
        ceiling: player.ceiling ?? player.overallRating,
        bondStrength: prospectBond?.bondStrength ?? 0,
        loyaltyModifier: prospectBond?.loyaltyModifier ?? 0,
        milestones: prospectBond?.milestones.slice(-2) ?? [],
        latestLineSummary: buildMinorLeagueLineSummary(player, latestLine),
        activeSetback: activeSetback
          ? {
            type: activeSetback.type,
            summary: activeSetback.summary,
            endMonth: activeSetback.endMonth,
            endSeason: activeSetback.endSeason,
          }
          : null,
      };
    })
    .sort((left, right) =>
      right.ceiling - left.ceiling
      || right.bondStrength - left.bondStrength
      || left.playerName.localeCompare(right.playerName),
    );

  return {
    bondedProspects: prospects.filter((player) => player.bondStrength > 0).length,
    activeSetbackCount: prospects.filter((player) => player.activeSetback != null).length,
    breakoutCandidates,
    topProspects: prospects.slice(0, 5),
  };
}

function buildAffiliateOverview(teamId: string) {
  const s = requireState();
  const playerMap = new Map(s.players.map((player) => [player.id, player]));

  const affiliates = s.minorLeagueState.affiliateStates
    .filter((affiliate) => affiliate.teamId === teamId)
    .sort((left, right) => AFFILIATE_LEVELS.indexOf(left.level) - AFFILIATE_LEVELS.indexOf(right.level))
    .map((affiliate) => {
      const topPlayerEntry = [...affiliate.playerStats].sort((left, right) => {
        const leftScore = left[1].hits + (left[1].hr * 2) + left[1].strikeouts;
        const rightScore = right[1].hits + (right[1].hr * 2) + right[1].strikeouts;
        return rightScore - leftScore;
      })[0];
      const topPlayer = topPlayerEntry ? playerMap.get(topPlayerEntry[0]) : null;
      const topStats = topPlayerEntry?.[1] ?? null;

      return {
        level: affiliate.level,
        label: formatMinorLevel(affiliate.level),
        wins: affiliate.wins,
        losses: affiliate.losses,
        gamesPlayed: affiliate.gamesPlayed,
        runDifferential: affiliate.runsScored - affiliate.runsAllowed,
        topPerformer: topPlayer && topStats
          ? {
            playerId: topPlayer.id,
            playerName: `${topPlayer.firstName} ${topPlayer.lastName}`,
            statLine: topPlayer.pitcherAttributes
              ? `${topStats.strikeouts} K · ${topStats.wins}-${topStats.losses}`
              : `${topStats.hits} H · ${topStats.hr} HR`,
          }
          : null,
      };
    });

  const recentBoxScores = s.minorLeagueState.affiliateBoxScores
    .filter((boxScore) => boxScore.homeTeamId === teamId || boxScore.awayTeamId === teamId)
    .sort((left, right) => right.day - left.day || right.id.localeCompare(left.id))
    .slice(0, 15)
    .map((boxScore) => {
      const home = boxScore.homeTeamId === teamId;
      const teamScore = home ? boxScore.homeScore : boxScore.awayScore;
      const opponentScore = home ? boxScore.awayScore : boxScore.homeScore;
      const opponentId = home ? boxScore.awayTeamId : boxScore.homeTeamId;
      return {
        id: boxScore.id,
        day: boxScore.day,
        level: boxScore.level,
        label: formatMinorLevel(boxScore.level),
        result: teamScore > opponentScore ? 'W' : 'L',
        scoreline: `${teamScore}-${opponentScore} ${home ? 'vs' : 'at'} ${getTeamById(opponentId)?.abbreviation ?? opponentId.toUpperCase()}`,
        summary: boxScore.summary,
      };
    });

  const waiverClaims = s.minorLeagueState.waiverClaims
    .filter((claim) => claim.status === 'pending' || claim.fromTeamId === teamId || claim.toTeamId === teamId)
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === 'pending' ? -1 : 1;
      }
      return right.day - left.day || left.playerId.localeCompare(right.playerId);
    })
    .map((claim) => {
      const player = playerMap.get(claim.playerId);
      const priorityIndex = claim.priorityTeamIds.indexOf(teamId);
      return {
        playerId: claim.playerId,
        playerName: player ? `${player.firstName} ${player.lastName}` : claim.playerId,
        fromTeamName: teamNameFromId(claim.fromTeamId),
        toTeamName: claim.toTeamId ? teamNameFromId(claim.toTeamId) : null,
        status: claim.status,
        salary: Number(claim.salary.toFixed(1)),
        priorityIndex: priorityIndex >= 0 ? priorityIndex + 1 : null,
      };
    });

  return {
    teamId,
    affiliates,
    recentBoxScores,
    waiverClaims,
    farmReport: buildFarmReport(teamId),
  };
}

function getAffiliateBoxScoreView(boxScoreId: string) {
  const s = requireState();
  const boxScore = s.minorLeagueState.affiliateBoxScores.find((entry) => entry.id === boxScoreId);
  if (!boxScore) {
    return null;
  }

  return {
    id: boxScore.id,
    season: boxScore.season,
    day: boxScore.day,
    level: boxScore.level,
    label: formatMinorLevel(boxScore.level),
    homeTeamId: boxScore.homeTeamId,
    homeTeamName: teamNameFromId(boxScore.homeTeamId),
    awayTeamId: boxScore.awayTeamId,
    awayTeamName: teamNameFromId(boxScore.awayTeamId),
    homeScore: boxScore.homeScore,
    awayScore: boxScore.awayScore,
    summary: boxScore.summary,
    notablePlayers: boxScore.notablePlayerIds.flatMap((playerId) => {
        const player = s.players.find((candidate) => candidate.id === playerId);
        return player
          ? [{
            playerId,
            playerName: `${player.firstName} ${player.lastName}`,
            position: player.position,
          }]
          : [];
      }),
  };
}

export const queryApi = {
  getSetupPreview(options: {
    seed: number;
    userTeamId: string;
    difficulty: 'easy' | 'standard' | 'hard';
  }) {
    return buildSetupPreview(options);
  },

  getState() {
    if (!state) {
      return null;
    }
    return {
      season: state.season,
      day: state.day,
      phase: state.phase,
      userTeamId: state.userTeamId,
      playerCount: state.players.length,
    };
  },

  getStandings(): { divisions: Record<string, TeamStandingsDTO[]> } | null {
    if (!state) {
      return null;
    }

    const fullStandings = state.seasonState.standings.getFullStandings();
    const divisions: Record<string, TeamStandingsDTO[]> = {};
    for (const [division, entries] of Object.entries(fullStandings)) {
      divisions[division] = entries.map((entry: StandingsEntry) => {
        const team = getTeamById(entry.teamId);
        return {
          teamId: entry.teamId,
          teamName: team?.name ?? entry.teamId,
          city: team?.city ?? '',
          abbreviation: team?.abbreviation ?? '',
          division,
          wins: entry.wins,
          losses: entry.losses,
          pct: entry.pct.toFixed(3).replace(/^0/, ''),
          gamesBack: entry.gamesBack,
          streak: entry.streak,
          runDifferential: entry.runDifferential,
        };
      });
    }
    return { divisions };
  },

  getTeamRoster(teamId: string): PlayerDTO[] {
    if (!state) {
      return [];
    }

    const roster = state.players
      .filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB')
      .sort((left, right) => right.overallRating - left.overallRating);
    const advancedIndex = buildAdvancedStatsIndex(state, roster);

    return roster.map((player) => toPlayerDTO(player, undefined, advancedIndex.get(player.id) ?? null));
  },

  getFullRoster(teamId: string): { mlb: PlayerDTO[]; minors: Record<string, PlayerDTO[]> } {
    if (!state) {
      return { mlb: [], minors: {} };
    }

    const teamPlayers = state.players.filter((player) => player.teamId === teamId);
    const advancedIndex = buildAdvancedStatsIndex(state, teamPlayers);
    const mlb = teamPlayers
      .filter((player) => player.rosterStatus === 'MLB')
      .sort((left, right) => right.overallRating - left.overallRating)
      .map((player) => toPlayerDTO(player, undefined, advancedIndex.get(player.id) ?? null));

    const minors: Record<string, PlayerDTO[]> = {};
    for (const level of ['AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE', 'INTERNATIONAL']) {
      minors[level] = teamPlayers
        .filter((player) => player.rosterStatus === level)
        .sort((left, right) => right.overallRating - left.overallRating)
        .map((player) => toPlayerDTO(player, undefined, advancedIndex.get(player.id) ?? null));
    }
    return { mlb, minors };
  },

  getPlayer(playerId: string): PlayerDTO | null {
    if (!state) {
      return null;
    }

    const player = state.players.find((candidate) => candidate.id === playerId);
    const historicalPlayer = state.historicalPlayers.find((candidate) => candidate.playerId === playerId) ?? null;
    const advanced = player ? getAdvancedStatsForPlayer(state, player.id) : null;
    if (player) {
      return decorateHistoricalPlayer(toPlayerDTO(player, undefined, advanced), historicalPlayer);
    }

    return historicalPlayer ? buildHistoricalPlayerDTO(historicalPlayer) : null;
  },

  getPlayerProfileView(playerId: string) {
    const s = requireState();
    const player = s.players.find((candidate) => candidate.id === playerId) ?? null;
    const historicalPlayer = s.historicalPlayers.find((candidate) => candidate.playerId === playerId) ?? null;
    const advanced = player ? getAdvancedStatsForPlayer(s, player.id) : null;
    const playerView = player
      ? decorateHistoricalPlayer(toPlayerDTO(player, undefined, advanced), historicalPlayer)
      : historicalPlayer
        ? buildHistoricalPlayerDTO(historicalPlayer)
        : null;
    if (!playerView) {
      return null;
    }

    const scoutConflict = getScoutConflictForPlayer(s, playerId);

    return {
      player: playerView,
      personalityProfile: playerView.historical ? null : getPersonalityProfileForPlayer(s, playerId),
      developmentReports: playerView.historical ? null : buildDevelopmentReportsView(s, playerId),
      careerStats: getCareerStatsForPlayer(s, playerId),
      scoutConflict,
      scoutingReport: player && !playerView.historical && !scoutConflict
        ? buildStableScoutReportView(s, player, `player-profile:${player.id}`)
        : null,
      scoutingHistoryNote: 'Scouting report history is not tracked in v15.',
    };
  },

  getAdvancedStats(playerId: string) {
    if (!state) {
      return null;
    }

    return getAdvancedStatsForPlayer(state, playerId);
  },

  getPromotionCandidates(teamId?: string) {
    const s = requireState();
    const resolvedTeamId = teamId ?? s.userTeamId;
    return getPromotionCandidatesForTeam(s, resolvedTeamId).map((candidate) => {
      const player = s.players.find((entry) => entry.id === candidate.playerId);
      return {
        ...candidate,
        playerName: player ? `${player.firstName} ${player.lastName}` : candidate.playerId,
        position: player?.position ?? 'UTIL',
        age: player?.age ?? 0,
      };
    });
  },

  getRosterComplianceIssues(teamId?: string) {
    const s = requireState();
    const resolvedTeamId = teamId ?? s.userTeamId;
    const rosterState = s.rosterStates.get(resolvedTeamId);
    const issues = getRosterComplianceIssuesForTeam(s, resolvedTeamId);

    return {
      teamId: resolvedTeamId,
      activeRosterCount: rosterState?.mlbRoster.length ?? 0,
      activeRosterLimit: getActiveRosterLimit(s.day),
      fortyManCount: rosterState?.fortyManRoster.length ?? 0,
      issues,
      dfaRecommendations: buildDFARecommendations(resolvedTeamId),
    };
  },

  getAffiliateOverview(teamId?: string) {
    const s = requireState();
    return buildAffiliateOverview(teamId ?? s.userTeamId);
  },

  getProspectPipeline(teamId?: string) {
    const s = requireState();
    return buildProspectPipelineView(s, teamId ?? s.userTeamId);
  },

  getAffiliateBoxScore(boxScoreId: string) {
    return getAffiliateBoxScoreView(boxScoreId);
  },

  getLeagueLeaders(stat: LeaderboardStatKey, limit: number = 20): PlayerDTO[] {
    const s = state;
    if (!s) {
      return [];
    }

    const sorted = buildLeagueLeaderEntries(s, stat);

    return sorted
      .slice(0, limit)
      .map((entry) => toPlayerDTO(entry.player, entry.stats, entry.advanced));
  },

  getPlayoffBracket(): PlayoffBracket | null {
    return state?.playoffBracket ?? null;
  },

  getHallOfFame() {
    return [...(state?.hallOfFame ?? [])].sort((left, right) => {
      if (right.inductionSeason !== left.inductionSeason) {
        return right.inductionSeason - left.inductionSeason;
      }
      return left.playerName.localeCompare(right.playerName);
    });
  },

  getFranchiseTimeline() {
    return [...(state?.franchiseTimeline ?? [])].sort((left, right) => right.season - left.season);
  },

  getDynastyScore() {
    return state ? getDynastyScoreSummary(state) : null;
  },

  async getBranches(parentSaveId: string) {
    return listBranches(parentSaveId);
  },

  async compareWithBranch(parentSaveId: string, branchSaveId: string) {
    const [parentSave, branchSave] = await Promise.all([
      loadGameById(parentSaveId),
      loadGameById(branchSaveId),
    ]);
    if (
      !parentSave?.snapshot
      || !branchSave?.snapshot
      || branchSave.isRootSave
      || branchSave.parentSaveId !== parentSaveId
      || !branchSave.branchMeta
    ) {
      return null;
    }

    return compareTimelines(parentSave.snapshot, branchSave.snapshot, branchSave.branchMeta);
  },

  getAchievements() {
    return state ? buildAchievementView(state) : [];
  },

  getPerformanceDiagnostics() {
    if (!state) {
      return null;
    }

    const diagnostics = buildPerformanceDiagnosticsView(state);
    if (diagnostics.totals.snapshotSizeBytes > 0) {
      return diagnostics;
    }

    return {
      ...diagnostics,
      totals: {
        ...diagnostics.totals,
        snapshotSizeBytes: estimateSnapshotSizeBytes(exportGameSnapshot(state)),
      },
    };
  },

  getDashboardSummary() {
    return state ? buildDashboardSummary(state) : null;
  },

  getGamePlayByPlay(gameIndex: number) {
    return state ? buildGamePlayByPlayView(state, gameIndex) : null;
  },

  getRecentGameRecaps(count: number = 3) {
    return state ? buildRecentGameRecapViews(state, count) : [];
  },

  getMonthlyPulse() {
    return state ? getMonthlyPulse(state) : null;
  },

  getCeremonyState() {
    return state ? getCeremonyStateView(state) : { activeMoment: null, queueLength: 0 };
  },

  getSeasonFlowState() {
    return buildSeasonFlowStateView(requireState());
  },

  getUserTeamId(): string {
    return state?.userTeamId ?? 'nym';
  },

  searchPlayers(query: string, limit: number = 20): PlayerDTO[] {
    if (!state || !query) {
      return [];
    }

    const s = state;
    const normalized = query.toLowerCase();
    const liveResults = s.players
      .filter((player) =>
        player.firstName.toLowerCase().includes(normalized)
        || player.lastName.toLowerCase().includes(normalized)
        || `${player.firstName} ${player.lastName}`.toLowerCase().includes(normalized),
      )
      .map((player) => {
        const historicalPlayer = s.historicalPlayers.find((candidate) => candidate.playerId === player.id) ?? null;
        return decorateHistoricalPlayer(toPlayerDTO(player), historicalPlayer);
      });

    const seenIds = new Set(liveResults.map((player) => player.id));
    const historicalResults = s.historicalPlayers
      .filter((player) => !seenIds.has(player.playerId) && matchesPlayerQuery(player, normalized))
      .map(buildHistoricalPlayerDTO);

    return [...liveResults, ...historicalResults].slice(0, limit);
  },

  getInjuries(teamId: string) {
    const s = requireState();
    const results: { playerId: string; playerName: string; injury: string; daysRemaining: number }[] = [];

    for (const [playerId, injury] of s.injuries) {
      const player = s.players.find((candidate) => candidate.id === playerId);
      if (player && player.teamId === teamId) {
        results.push({
          playerId,
          playerName: `${player.firstName} ${player.lastName}`,
          injury: describeInjury(injury),
          daysRemaining: injury.daysRemaining,
        });
      }
    }

    return results;
  },

  scoutPlayerReport(playerId: string) {
    const s = requireState();
    const player = s.players.find((candidate) => candidate.id === playerId);
    if (!player) {
      return null;
    }

    return buildStableScoutReportView(s, player, `scouting-page:${player.id}`);
  },

  getScoutingStaff() {
    const s = requireState();
    return s.scoutingStaffs.get(s.userTeamId) ?? [];
  },

  getCoachingStaff(teamId?: string) {
    const s = requireState();
    return s.coachingStaffs.get(teamId ?? s.userTeamId) ?? [];
  },

  getCoachFreeAgents() {
    return [...requireState().coachFreeAgentPool];
  },

  getCoachMarket() {
    return [...requireState().coachFreeAgentPool];
  },

  getDevelopmentReport(playerId: string) {
    const recommendations = requireState().minorLeagueState.conversionRecommendations
      .filter((entry) => entry.playerId === playerId);
    const reports = requireState().minorLeagueState.developmentReports
      .filter((entry) => entry.playerId === playerId)
      .sort((left, right) => left.season - right.season || left.month - right.month);
    if (reports.length === 0) {
      return null;
    }

    return {
      playerId,
      history: reports.map((entry) => ({
        season: entry.season,
        month: entry.month,
        trajectory: entry.trajectory,
        summary: entry.summary,
        overallRating: entry.overallRating,
      })),
      recommendations,
    };
  },

  getDevelopmentReports(playerId: string) {
    return buildDevelopmentReportsView(requireState(), playerId);
  },

  getCoachingImpact(teamId?: string) {
    const s = requireState();
    const resolvedTeamId = teamId ?? s.userTeamId;
    return (s.coachingStaffs.get(resolvedTeamId) ?? []).map((coach) => ({
      id: coach.id,
      role: coach.role,
      name: `${coach.firstName} ${coach.lastName}`,
      specialty: coach.specialty,
      teachingAbility: coach.teachingAbility,
      developmentBonus: coach.developmentBonus,
      personalityFit: coach.personalityFit,
    }));
  },

  getStaffBudget(teamId?: string) {
    const s = requireState();
    const resolvedTeamId = teamId ?? s.userTeamId;
    const payroll = calculateCoachingPayroll(s.coachingStaffs.get(resolvedTeamId) ?? []);
    const budget = getTeamStaffBudget(s, resolvedTeamId);
    return {
      payroll,
      budget,
      remaining: Math.round((budget - payroll) * 100) / 100,
    };
  },

  getDevelopmentPipeline(teamId?: string) {
    const s = requireState();
    const resolvedTeamId = teamId ?? s.userTeamId;
    return AFFILIATE_LEVELS.map((level) => ({
      level,
      players: s.players
        .filter((player) => player.teamId === resolvedTeamId && player.rosterStatus === level)
        .sort((left, right) => (right.ceiling ?? right.overallRating) - (left.ceiling ?? left.overallRating))
        .map((player) => ({
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          position: player.position,
          age: player.age,
          overallRating: player.overallRating,
          ceiling: player.ceiling ?? player.overallRating,
          floor: player.floor ?? player.overallRating,
          developmentProgram: player.developmentProgram ?? null,
          developmentTrajectory: player.developmentTrajectory ?? 'on_track',
        })),
    }));
  },

  getExtensionCandidates(teamId?: string) {
    return getExtensionCandidatesForTeam(requireState(), teamId);
  },

  getExtensionOffer(playerId: string, years: number) {
    return getExtensionOfferForPlayer(requireState(), playerId, years);
  },

  getQualifyingOfferEligible(teamId?: string) {
    return getQualifyingOfferEligibleForTeam(requireState(), teamId);
  },

  getQualifyingOfferSalary() {
    return calculateQualifyingOfferSalary(requireState().players);
  },

  getIFAPool() {
    return buildIFAPoolView(requireState());
  },

  getDraftClass() {
    return buildDraftRoomView(requireState());
  },

  getDraftCommentary(visiblePickCount?: number) {
    return buildDraftCommentaryView(requireState(), visiblePickCount);
  },

  getDraftProspectReaction(prospectId: string) {
    return buildDraftProspectReactionView(requireState(), prospectId);
  },

  getDraftPostDraftGrades() {
    return buildDraftPostDraftGradesView(requireState());
  },

  getPlayerTradeValue(playerId: string): PlayerTradeValue | null {
    const player = requireState().players.find((candidate) => candidate.id === playerId);
    return player ? evaluatePlayerTradeValue(player) : null;
  },

  getTradeOffers() {
    return buildTradeOffersView(requireState());
  },

  getTradeHistory() {
    return buildTradeHistoryView(requireState());
  },

  getTradeDeadlineState() {
    return buildTradeDeadlineStateView(requireState());
  },

  getTradeDialogue(
    teamId: string,
    offerValue: number,
    requestValue: number,
    negotiationType: 'proposal' | 'counter' | 'offer' = 'proposal',
  ) {
    return buildTradeDialogueView(requireState(), teamId, offerValue, requestValue, negotiationType);
  },

  getTradeAssetInventory(teamId: string) {
    return buildTradeAssetInventoryView(requireState(), teamId);
  },

  getRosterState(teamId: string): RosterState | null {
    return requireState().rosterStates.get(teamId) ?? null;
  },

  getFreeAgents(limit: number = 25): FreeAgent[] {
    const s = requireState();
    if (!s.freeAgencyMarket) {
      s.freeAgencyMarket = createFreeAgencyMarket(s.season, s.players);
    }
    return getTopFreeAgents(s.freeAgencyMarket, undefined, limit);
  },

  getOffseasonState() {
    return buildOffseasonStateView(requireState());
  },

  getSpringTrainingView() {
    const s = requireState();
    const teamId = s.userTeamId;
    const rosterState = s.rosterStates.get(teamId);
    const rosterIssues = getRosterComplianceIssuesForTeam(s, teamId);
    const rawCandidates = getPromotionCandidatesForTeam(s, teamId);
    const promotionCandidates = rawCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((candidate) => {
        const player = s.players.find((p) => p.id === candidate.playerId);
        return {
          playerId: candidate.playerId,
          playerName: player ? `${player.firstName} ${player.lastName}` : candidate.playerId,
          position: player?.position ?? 'UTIL',
          overallRating: player?.overallRating ?? 0,
          currentLevel: candidate.currentLevel,
          score: candidate.score,
          reason: candidate.reason,
        };
      });

    return {
      rosterIssues,
      promotionCandidates,
      currentRosterSize: rosterState?.mlbRoster.length ?? 0,
      rosterLimit: getActiveRosterLimit(s.day),
    };
  },

  getSeasonRecap(season?: number) {
    return buildSeasonRecapView(requireState(), season);
  },

  getOffseasonHeadline(season?: number) {
    return buildOffseasonHeadlineView(requireState(), season);
  },

  getNews(limit: number = 50) {
    return getUnreadNews(requireState().news).slice(0, limit);
  },

  getBriefing(limit: number = 5) {
    return requireState().briefingQueue.slice(0, limit);
  },

  getPressRoomFeed(limit: number = 100) {
    return buildPressRoomFeed(requireState(), limit);
  },

  getInteractivePressConference() {
    const s = requireState();
    const standings = s.seasonState.standings.getFullStandings();
    const userStanding = Object.values(standings)
      .flat()
      .find((entry) => entry.teamId === s.userTeamId);
    if (!userStanding) return null;

    const pcOwnerState = s.ownerState.get(s.userTeamId);
    const ownerTone: 'supportive' | 'neutral' | 'impatient' =
      pcOwnerState && pcOwnerState.patience < 30 ? 'impatient'
        : pcOwnerState && pcOwnerState.patience > 70 ? 'supportive'
          : 'neutral';

    const recentTrade = s.tradeState.tradeHistory
      .filter((trade) => trade.fromTeamId === s.userTeamId || trade.toTeamId === s.userTeamId)
      .sort((a, b) => {
        const aTime = typeof a.timestamp === 'string' ? a.timestamp : '';
        const bTime = typeof b.timestamp === 'string' ? b.timestamp : '';
        return bTime.localeCompare(aTime);
      })[0];

    const topProspects = s.players.filter(
      (p) => p.teamId === s.userTeamId && p.rosterStatus !== 'MLB' && (p.ceiling ?? p.overallRating) >= 350,
    );

    // Derive division rank from gamesBack (0 = first place)
    const divisionRank = userStanding.gamesBack === 0 ? 1 : Math.ceil(userStanding.gamesBack / 3) + 1;

    return generateInteractivePressConference({
      season: s.season,
      day: s.day,
      userTeamId: s.userTeamId,
      teamRecord: {
        wins: userStanding.wins,
        losses: userStanding.losses,
        divisionRank,
        gamesBack: userStanding.gamesBack,
      },
      ownerTone,
      recentTradeHeadline: recentTrade ? (recentTrade.summary ?? null) : null,
      farmStrength: Math.min(100, topProspects.length * 20),
      topProspectCount: topProspects.length,
    });
  },

  getTeamChemistry(teamId?: string) {
    const s = requireState();
    return s.teamChemistry.get(teamId ?? s.userTeamId) ?? null;
  },

  getOwnerState(teamId?: string) {
    const s = requireState();
    return s.ownerState.get(teamId ?? s.userTeamId) ?? null;
  },

  getFrontOfficeState(teamId?: string) {
    const s = requireState();
    return s.frontOfficeState.get(teamId ?? s.userTeamId) ?? null;
  },

  getGMCareer() {
    return requireState().gmCareer;
  },

  getJobMarket() {
    return requireState().jobMarket;
  },

  getScoutConflicts(teamId?: string) {
    const s = requireState();
    return s.scoutConflicts
      .filter((entry) => teamId == null || entry.teamId === teamId)
      .sort((left, right) => right.createdSeason - left.createdSeason || right.divergence - left.divergence);
  },

  getScoutConflict(prospectId: string) {
    return requireState().scoutConflicts.find((entry) => entry.prospectId === prospectId) ?? null;
  },

  getDynastyCards() {
    return requireState().dynastyCards;
  },

  getDynastyLeaderboard() {
    const s = requireState();
    const record = s.seasonState.standings.getRecord(s.userTeamId);
    return [{
      id: 'current-save',
      slotNumber: 0,
      scenarioId: s.challengeState?.scenarioId ?? null,
      gmName: s.franchise.gmName,
      teamId: s.franchise.teamId,
      teamName: s.franchise.teamName,
      season: s.season,
      score: calculateDynastyLeaderboardScore(exportGameSnapshot(s)),
      record: record ? `${record.wins}-${record.losses}` : '0-0',
      championships: s.gmCareer.championships,
      summary: s.dynastyCards[0]?.textSummary ?? `${s.franchise.gmName} · Season ${s.season}`,
      updatedAt: timestamp(),
    }];
  },

  getScenarioCatalog() {
    return SCENARIO_LIBRARY;
  },

  getScenarioProgress() {
    const s = requireState();
    if (!s.challengeState) {
      return null;
    }

    const scenario = getScenarioById(s.challengeState.scenarioId);
    return {
      ...s.challengeState,
      name: scenario?.name ?? s.challengeState.scenarioId,
      description: scenario?.description ?? s.challengeState.summary,
      requiresCareerMode: scenario?.requiresCareerMode ?? false,
    };
  },

  getPersonalityProfile(playerId: string) {
    return getPersonalityProfileForPlayer(requireState(), playerId);
  },

  getAwardRaces() {
    const s = requireState();
    return calculateAwardRaces(s.players, s.seasonState.playerSeasonStats);
  },

  getRivalries(teamId?: string) {
    const s = requireState();
    return Array.from(getRivalriesForTeam(s, teamId ?? s.userTeamId).values())
      .sort((left, right) => right.intensity - left.intensity);
  },

  getAwardHistory() {
    return getAwardHistory(requireState());
  },

  getSeasonHistory() {
    return getSeasonHistory(requireState());
  },

  getHistoryOverview() {
    return getHistoryOverview(requireState());
  },

  getSeasonHistoryView(season?: number) {
    return getSeasonHistoryView(requireState(), season);
  },

  getSeasonArchive(season?: number) {
    return getSeasonArchive(requireState(), season);
  },

  compareSeasons(leftSeason: number, rightSeason: number) {
    return compareSeasons(requireState(), leftSeason, rightSeason);
  },

  getRecordBook(teamId?: string) {
    const s = requireState();
    const resolvedTeamId = teamId ?? s.userTeamId;
    const sortEntries = (left: { category: string; label: string }, right: { category: string; label: string }) =>
      left.category.localeCompare(right.category) || left.label.localeCompare(right.label);

    return {
      franchise: s.recordBook
        .filter((entry) => entry.scope === 'franchise' && entry.teamId === resolvedTeamId)
        .sort(sortEntries),
      league: s.recordBook
        .filter((entry) => entry.scope === 'league')
        .sort(sortEntries),
    };
  },

  getRecordWatchList(teamId?: string) {
    const s = requireState();
    const resolvedTeamId = teamId ?? s.userTeamId;
    return s.recordWatch
      .filter((entry) => entry.teamId === resolvedTeamId)
      .sort((left, right) => right.progressRatio - left.progressRatio || right.projectedValue - left.projectedValue);
  },

  resolveHistoryDisplayNames(playerIds: string[], teamIds: string[]) {
    return resolveNarrativeHistoryDisplayNames(requireState(), playerIds, teamIds);
  },

  getTeamFinances(teamId: string) {
    const payroll = calculateTeamPayroll(teamId, getTeamPlayers(teamId)).totalPayroll;
    const budget = getDifficultyAdjustedBudget(requireState(), teamId);
    const luxuryTax = calculateLuxuryTax(payroll);
    return {
      payroll,
      budget,
      luxuryTax,
      capSpace: Math.max(0, budget - payroll),
    };
  },

  getTickerFeed(limit = 25) {
    return requireState().tickerFeed.slice(0, Math.max(1, limit));
  },

  getScheduleView() {
    if (!state) return null;

    const s = state;
    const userTeamId = s.userTeamId;

    // Build lookup: "homeTeamId:awayTeamId:date" -> { gameIndex, boxScore }
    const gameLogLookup = new Map<string, { gameIndex: number; boxScore: GameBoxScore }>();
    for (let i = 0; i < s.seasonState.gameLog.length; i++) {
      const bs = s.seasonState.gameLog[i];
      if (!bs) continue;
      const key = `${bs.homeTeamId}:${bs.awayTeamId}:${bs.date}`;
      gameLogLookup.set(key, { gameIndex: i, boxScore: bs });
    }

    const entries: {
      day: number;
      opponentId: string;
      opponentName: string;
      opponentAbbr: string;
      isHome: boolean;
      isCompleted: boolean;
      userScore?: number;
      opponentScore?: number;
      result?: 'W' | 'L';
      gameIndex?: number;
    }[] = [];

    for (const game of s.schedule) {
      const isHome = game.homeTeamId === userTeamId;
      const isAway = game.awayTeamId === userTeamId;
      if (!isHome && !isAway) continue;

      const opponentId = isHome ? game.awayTeamId : game.homeTeamId;
      const opponentTeam = getTeamById(opponentId);
      const opponentName = opponentTeam ? `${opponentTeam.city} ${opponentTeam.name}` : opponentId;
      const opponentAbbr = opponentTeam?.abbreviation ?? opponentId.toUpperCase();

      const dateKey = `S${s.season}D${game.day}`;
      const lookupKey = `${game.homeTeamId}:${game.awayTeamId}:${dateKey}`;
      const match = gameLogLookup.get(lookupKey);

      if (match) {
        const userScore = isHome ? match.boxScore.homeScore : match.boxScore.awayScore;
        const oppScore = isHome ? match.boxScore.awayScore : match.boxScore.homeScore;
        entries.push({
          day: game.day,
          opponentId,
          opponentName,
          opponentAbbr,
          isHome,
          isCompleted: true,
          userScore,
          opponentScore: oppScore,
          result: userScore > oppScore ? 'W' : 'L',
          gameIndex: match.gameIndex,
        });
      } else {
        entries.push({
          day: game.day,
          opponentId,
          opponentName,
          opponentAbbr,
          isHome,
          isCompleted: false,
        });
      }
    }

    return entries;
  },

  getAllTimeLeaders() {
    const s = requireState();
    const LEADER_LIMIT = 10;
    const MIN_PA_FOR_AVG = 500;
    const MIN_IP_FOR_ERA = 200;

    type LeaderEntry = {
      playerId: string;
      playerName: string;
      value: number;
      display: string;
    };

    function resolvePlayerName(playerId: string): string {
      const active = s.players.find((p) => p.id === playerId);
      if (active) return `${active.firstName} ${active.lastName}`;
      const historical = s.historicalPlayers.find((h) => h.playerId === playerId);
      if (historical) return historical.fullName;
      return playerId;
    }

    function topN(
      entries: { playerId: string; value: number; display: string }[],
      ascending = false,
    ): LeaderEntry[] {
      const sorted = [...entries].sort((a, b) =>
        ascending ? a.value - b.value : b.value - a.value,
      );
      return sorted.slice(0, LEADER_LIMIT).map((e) => ({
        playerId: e.playerId,
        playerName: resolvePlayerName(e.playerId),
        value: e.value,
        display: e.display,
      }));
    }

    // Batting categories
    const hitsEntries: { playerId: string; value: number; display: string }[] = [];
    const hrEntries: { playerId: string; value: number; display: string }[] = [];
    const rbiEntries: { playerId: string; value: number; display: string }[] = [];

    // Pitching categories
    const winsEntries: { playerId: string; value: number; display: string }[] = [];
    const strikeoutEntries: { playerId: string; value: number; display: string }[] = [];
    const eraEntries: { playerId: string; value: number; display: string }[] = [];
    const savesEntries: { playerId: string; value: number; display: string }[] = [];

    for (const ledger of s.careerStats) {
      if (ledger.batting) {
        hitsEntries.push({ playerId: ledger.playerId, value: ledger.batting.hits, display: String(ledger.batting.hits) });
        hrEntries.push({ playerId: ledger.playerId, value: ledger.batting.hr, display: String(ledger.batting.hr) });
        rbiEntries.push({ playerId: ledger.playerId, value: ledger.batting.rbi, display: String(ledger.batting.rbi) });
      }
      if (ledger.pitching) {
        winsEntries.push({ playerId: ledger.playerId, value: ledger.pitching.wins, display: String(ledger.pitching.wins) });
        strikeoutEntries.push({ playerId: ledger.playerId, value: ledger.pitching.strikeouts, display: String(ledger.pitching.strikeouts) });
        if (ledger.pitching.inningsPitched >= MIN_IP_FOR_ERA) {
          const era = ledger.pitching.inningsPitched > 0
            ? (ledger.pitching.earnedRuns / ledger.pitching.inningsPitched) * 9
            : 0;
          eraEntries.push({ playerId: ledger.playerId, value: era, display: era.toFixed(2) });
        }
        const saves = ledger.saves ?? 0;
        if (saves > 0) {
          savesEntries.push({ playerId: ledger.playerId, value: saves, display: String(saves) });
        }
      }
    }

    return {
      batting: {
        hits: topN(hitsEntries),
        hr: topN(hrEntries),
        rbi: topN(rbiEntries),
      },
      pitching: {
        wins: topN(winsEntries),
        strikeouts: topN(strikeoutEntries),
        era: topN(eraEntries, true),
        saves: topN(savesEntries),
      },
    };
  },

  getFinanceOverview() {
    const s = requireState();
    const teamPlayers = s.players.filter((p) => p.teamId === s.userTeamId);
    const payroll = calculateTeamPayroll(s.userTeamId, s.players);
    const luxuryTax = calculateLuxuryTax(payroll.luxuryTaxPayroll);
    const budget = getDifficultyAdjustedBudget(s, s.userTeamId);
    const coachingStaff = s.coachingStaffs.get(s.userTeamId) ?? [];
    const coachingPayroll = calculateCoachingPayroll(coachingStaff);

    const contracts = teamPlayers
      .filter((p) => p.contract.annualSalary > 0)
      .sort((a, b) => b.contract.annualSalary - a.contract.annualSalary)
      .map((p) => ({
        playerId: p.id,
        name: `${p.firstName} ${p.lastName}`,
        position: p.position,
        rosterStatus: p.rosterStatus,
        annualSalary: p.contract.annualSalary,
        yearsRemaining: p.contract.years,
        noTradeClause: p.contract.noTradeClause,
        playerOption: p.contract.playerOption,
      }));

    return {
      totalPayroll: payroll.totalPayroll,
      mlbPayroll: payroll.mlbPayroll,
      minorsPayroll: payroll.minorsPayroll,
      luxuryTaxPayroll: payroll.luxuryTaxPayroll,
      luxuryTax,
      budget,
      capSpace: payroll.capSpace,
      futureCommitments: payroll.futureCommitments,
      coachingPayroll,
      contracts,
    };
  },

  // ---------------------------------------------------------------------------
  // Round 1 API Integration: Press Conferences, Coaching, Mentorship, Scenarios
  // ---------------------------------------------------------------------------

  getEnhancedPressConference() {
    const s = requireState();
    const rng = createStableWorkerRng(s, 'enhanced-press-conference');
    const teamPlayers = getTeamPlayers(s.userTeamId);
    const standingsTracker = s.seasonState.standings;
    const userRecord = standingsTracker.getRecord(s.userTeamId);
    const userOwner = s.ownerState.get(s.userTeamId);
    const injuredStarIds = [...s.injuries.keys()];
    const hasInjuredStar = teamPlayers.some(p =>
      injuredStarIds.includes(p.id) && p.overallRating > 350 && p.rosterStatus === 'MLB',
    );

    const context = {
      season: s.season,
      day: s.day,
      teamId: s.userTeamId,
      teamRecord: { wins: userRecord?.wins ?? 0, losses: userRecord?.losses ?? 0 },
      recentResults: [] as Array<'W' | 'L'>,
      ownerTone: (userOwner?.hotSeat ? 'impatient' : 'neutral') as 'supportive' | 'neutral' | 'impatient',
      hasInjuredStar,
      hasRecentTrade: false,
      hasRecentCallup: false,
      isPlayoffContender: (userRecord?.wins ?? 0) > (userRecord?.losses ?? 1),
      divisionRank: 3,
      gamesBack: 0,
      isOffseason: s.phase === 'offseason',
    };

    const topic = selectPressConferenceTopic(rng, context);
    if (!topic) return null;

    return generateEnhancedPressConference(rng, context);
  },

  respondToEnhancedPressConference(conferenceId: string, responseId: string) {
    return evaluatePressConferenceResponse(conferenceId, responseId);
  },

  getCoachingChemistry() {
    const s = requireState();
    const coaches = s.coachingStaffs.get(s.userTeamId) ?? [];
    const teamPlayers = getTeamPlayers(s.userTeamId).filter(p => p.rosterStatus === 'MLB');

    const harmony = calculateStaffHarmony(coaches);
    const issues = identifyChemistryIssues(coaches, teamPlayers);

    const playerAffinities = teamPlayers.slice(0, 15).map(p => {
      const affinities = coaches.map(c => {
        const affinity = calculateCoachPlayerAffinity(c, p);
        return {
          coachId: affinity.coachId,
          coachName: `${c.firstName} ${c.lastName}`,
          playerId: affinity.playerId,
          affinityScore: affinity.affinityScore,
          factors: affinity.factors,
          developmentBonus: getCoachDevelopmentBonus(c, p),
        };
      });
      return {
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        position: p.position,
        bestCoach: affinities.sort((a, b) => b.affinityScore - a.affinityScore)[0] ?? null,
        affinities,
      };
    });

    return {
      harmony,
      issues,
      playerAffinities,
      coaches: coaches.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        role: c.role,
        specialty: c.specialty,
        teaching: Math.round(c.teachingAbility * 100),
        impact: Math.round(c.developmentBonus * 100 / 0.3),
        fit: Math.round(c.personalityFit * 100),
        salary: c.annualSalary,
      })),
    };
  },

  getMentorships() {
    const s = requireState();
    const teamPlayers = getTeamPlayers(s.userTeamId);
    const rng = createStableWorkerRng(s, 'mentorship');
    const mentors = findMentorCandidates(teamPlayers);
    const protegees = findProtegeeCandidates(teamPlayers);
    const pairings = pairMentors(rng, mentors, protegees);

    return {
      mentorCount: mentors.length,
      protegeeCount: protegees.length,
      pairings: pairings.map(p => {
        const mentor = teamPlayers.find(pl => pl.id === p.mentorId);
        const protegee = teamPlayers.find(pl => pl.id === p.protegeeId);
        return {
          ...p,
          mentorName: mentor ? `${mentor.firstName} ${mentor.lastName}` : 'Unknown',
          protegeeName: protegee ? `${protegee.firstName} ${protegee.lastName}` : 'Unknown',
        };
      }),
    };
  },

  getScenarioObjectivesView(scenarioId: string) {
    const s = requireState();
    const objectiveSet = getScenarioObjectives(scenarioId);
    if (!objectiveSet) return null;

    // Scope to challenge start season — only count history DURING the challenge
    const challengeStartSeason = s.challengeState?.startSeason ?? 1;
    const fullHistory = s.seasonHistory ?? [];
    const history = fullHistory.filter(sh => sh.season >= challengeStartSeason);

    // Parse wins from "W-L" record strings in userSeason
    const parseWins = (record: string | undefined): number => {
      if (!record) return 0;
      const parts = record.split('-');
      return parseInt(parts[0] ?? '0', 10) || 0;
    };

    const championships = history.filter(sh => sh.championTeamId === s.userTeamId).length;
    const playoffAppearances = history.filter(sh =>
      sh.userSeason?.playoffResult && sh.userSeason.playoffResult !== 'Missed Playoffs',
    ).length;

    // Count developed prospects: MLB players age <= 25 with overall > 350 on user's team
    const teamPlayers = getTeamPlayers(s.userTeamId);
    const topProspectsDeveloped = teamPlayers.filter(p =>
      p.rosterStatus === 'MLB' && p.age <= 25 && p.overallRating > 350,
    ).length;

    // Payroll history — not tracked in archived standings; omit rather than
    // zero-fill so scenario objectives that check payroll thresholds (e.g.
    // Moneyball's $125M cap) don't see false positives from placeholder zeros.
    const payrollHistory: number[] = [];

    // Count All-Star selections only (not MVP/Cy Young/etc.) from award history
    const allStarAwards = (s.awardHistory ?? []).filter(
      a => a.season >= challengeStartSeason && a.teamId === s.userTeamId && a.award === 'All-Star',
    );
    // Group by season and count unique seasons with all-star selections
    const allStarsBySeason = new Map<number, number>();
    for (const a of allStarAwards) {
      allStarsBySeason.set(a.season, (allStarsBySeason.get(a.season) ?? 0) + 1);
    }
    const allStarCounts = history.map(sh => allStarsBySeason.get(sh.season) ?? 0);

    const seasonsInChallenge = Math.max(0, s.season - challengeStartSeason);

    const context = {
      seasonsPlayed: seasonsInChallenge,
      winsBySeason: history.map(sh => parseWins(sh.userSeason?.record)),
      playoffAppearances,
      championships,
      topProspectsDeveloped,
      payrollHistory,
      allStarCounts,
      tradeCount: s.tradeState.tradeHistory.length,
      recordBookEntries: s.recordBook.length,
    };

    return evaluateObjectiveProgress(scenarioId, context);
  },

  // ---------------------------------------------------------------------------
  // Round 2 API Integration: Trade Deadline, Milestones, FA Market Intelligence
  // ---------------------------------------------------------------------------

  getTradeDeadlineDrama() {
    const s = requireState();
    if (s.phase !== 'regular') return null;
    const rng = createStableWorkerRng(s, 'deadline-drama');
    const standings = s.seasonState.standings;
    const allEntries = standings.getLeagueStandings();

    // Identify contenders (top half by winning pct) and sellers (bottom third)
    const contenderIds = allEntries.slice(0, 12).map(e => e.teamId);
    const sellerIds = allEntries.slice(22).map(e => e.teamId);

    // Top trade targets: highest-rated players on seller teams
    const sellerPlayers = s.players
      .filter(p => sellerIds.includes(p.teamId) && p.rosterStatus === 'MLB')
      .sort((a, b) => b.overallRating - a.overallRating);
    const topTargetIds = sellerPlayers.slice(0, 8).map(p => p.id);

    const context = {
      season: s.season,
      day: s.day,
      standings: allEntries.map(e => ({ teamId: e.teamId, wins: e.wins, losses: e.losses })),
      contenderTeamIds: contenderIds,
      sellerTeamIds: sellerIds,
      topTargetPlayerIds: topTargetIds,
    };

    const timeline = generateDeadlineTimeline(rng, context);
    const todayEvents = getDeadlineEventsForDay(timeline, s.day);

    // Generate a bidding war if there are contenders and targets
    let activeBiddingWar = null;
    if (topTargetIds.length > 0 && contenderIds.length >= 2) {
      activeBiddingWar = generateBiddingWar(rng, topTargetIds[0]!, contenderIds.slice(0, 3));
    }

    // Resolve player names for display
    const resolvePlayerName = (id: string) => {
      const p = s.players.find(pl => pl.id === id);
      return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
    };

    return {
      season: s.season,
      day: s.day,
      deadlineDay: 100,
      daysUntilDeadline: Math.max(0, 100 - s.day),
      isPastDeadline: s.day > 100,
      todayEvents,
      fullTimeline: timeline,
      activeBiddingWar: activeBiddingWar ? {
        ...activeBiddingWar,
        targetPlayerName: resolvePlayerName(activeBiddingWar.targetPlayerId),
      } : null,
      contenderCount: contenderIds.length,
      sellerCount: sellerIds.length,
    };
  },

  getMilestoneTrackerAlerts() {
    const s = requireState();
    const teamPlayers = getTeamPlayers(s.userTeamId).filter(p => p.rosterStatus === 'MLB');

    // Build career stat totals from careerStats ledger
    const playerData = teamPlayers.map(p => {
      const career = s.careerStats.find(
        (cs: { playerId: string }) => cs.playerId === p.id,
      );
      const isPitcher = p.position === 'SP' || p.position === 'RP' || p.position === 'CL';
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        careerStats: {
          hits: career?.batting?.hits ?? 0,
          hr: career?.batting?.hr ?? 0,
          rbi: career?.batting?.rbi ?? 0,
          sb: 0,
          strikeouts: career?.pitching?.strikeouts ?? 0,
          wins: career?.pitching?.wins ?? 0,
          saves: career?.saves ?? 0,
          isPitcher,
          seasonsPlayed: Math.max(1, Math.floor(p.serviceTimeDays / 180)),
        },
        seasonsPlayed: Math.max(1, Math.floor(p.serviceTimeDays / 180)),
      };
    });

    return getMilestoneAlerts(playerData);
  },

  // ---------------------------------------------------------------------------
  // Round 3 API Integration: Comparison, Projections, Similarity, Enhanced PBP, Awards
  // ---------------------------------------------------------------------------

  getPlayerComparison(playerIdA: string, playerIdB: string) {
    const s = requireState();
    const playerA = s.players.find(p => p.id === playerIdA);
    const playerB = s.players.find(p => p.id === playerIdB);
    if (!playerA || !playerB) return null;

    const comparison = comparePlayersHead2Head(playerA, playerB);
    const statsA = s.seasonState.playerSeasonStats.get(playerIdA);
    const statsB = s.seasonState.playerSeasonStats.get(playerIdB);
    const statComparison = statsA && statsB ? comparePlayerStats(statsA, statsB) : [];
    const summary = generateComparisonSummary(comparison);
    const rankedA = rankPlayerAttributes(playerA);
    const rankedB = rankPlayerAttributes(playerB);

    return {
      comparison,
      statComparison,
      summary,
      rankedA,
      rankedB,
      playerA: {
        id: playerA.id,
        name: `${playerA.firstName} ${playerA.lastName}`,
        position: playerA.position,
        age: playerA.age,
        teamId: playerA.teamId,
      },
      playerB: {
        id: playerB.id,
        name: `${playerB.firstName} ${playerB.lastName}`,
        position: playerB.position,
        age: playerB.age,
        teamId: playerB.teamId,
      },
    };
  },

  getSeasonProjections(playerId: string) {
    const s = requireState();
    const player = s.players.find(p => p.id === playerId);
    if (!player) return null;

    const stats = s.seasonState.playerSeasonStats.get(playerId);
    if (!stats) return null;

    const gamesPlayed = stats.gamesPlayed ?? 0;
    const projection = projectSeasonStats(stats, gamesPlayed, SEASON_GAMES);
    if (!projection) return null;

    const allProjections = s.players
      .filter(p => p.teamId === s.userTeamId && p.rosterStatus === 'MLB')
      .map(p => {
        const pStats = s.seasonState.playerSeasonStats.get(p.id);
        if (!pStats) return null;
        return projectSeasonStats(pStats, pStats.gamesPlayed ?? 0, SEASON_GAMES);
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const notable = findNotableProjections(allProjections);
    const playerNotable = notable.filter(n => n.playerId === playerId);

    return {
      projection,
      notableProjections: playerNotable,
      teamNotableCount: notable.length,
    };
  },

  getPlayerSimilarity(playerId: string) {
    const s = requireState();
    const target = s.players.find(p => p.id === playerId);
    if (!target) return null;

    const candidates = s.players.filter(p =>
      p.id !== playerId && p.rosterStatus === 'MLB',
    );

    const archetype = getPlayerArchetype(target);
    const similar = findSimilarPlayers(target, candidates, 5);

    return {
      archetype,
      similarPlayers: similar.comparisons.map(sp => {
        const p = s.players.find(pl => pl.id === sp.playerId);
        return {
          ...sp,
          position: p?.position ?? 'UTIL',
          teamId: p?.teamId ?? '',
          age: p?.age ?? 0,
        };
      }),
    };
  },

  getEnhancedGamePlayByPlay(gameIndex: number) {
    const s = requireState();
    const boxScore = s.seasonState.gameLog[gameIndex];
    if (!boxScore) return null;

    const rng = createStableWorkerRng(s, `enhanced-pbp-${gameIndex}`);
    const playerNames = new Map<string, string>();
    for (const p of s.players) {
      playerNames.set(p.id, `${p.firstName} ${p.lastName}`);
    }
    for (const hp of s.historicalPlayers) {
      if (!playerNames.has(hp.playerId)) {
        playerNames.set(hp.playerId, hp.fullName);
      }
    }

    const gameImportance: 'regular' | 'playoff' | 'world_series' = boxScore.isPlayoff
      ? 'world_series'
      : 'regular';

    const entries = boxScore.paResults.map(pa => {
      const scoreDiff = pa.halfInning === 'bottom'
        ? pa.scoreBefore[0] - pa.scoreBefore[1]
        : pa.scoreBefore[1] - pa.scoreBefore[0];

      const context = {
        inning: pa.inning,
        outs: pa.outs,
        runnersOn: pa.runnersOn,
        scoreDifferential: scoreDiff,
        isHomeTeam: pa.halfInning === 'bottom',
        batterName: playerNames.get(pa.batterId) ?? pa.batterId,
        pitcherName: playerNames.get(pa.pitcherId) ?? pa.pitcherId,
        gameImportance,
      };

      return generateEnhancedPlayByPlay(rng, pa, context);
    });

    return {
      gameIndex,
      homeTeamId: boxScore.homeTeamId,
      awayTeamId: boxScore.awayTeamId,
      entries,
      highlightCount: entries.filter(e => e.isHighlight).length,
      maxExcitement: entries.reduce((max, e) => Math.max(max, e.excitement), 1 as number),
    };
  },

  getAwardCeremony(season?: number) {
    const s = requireState();
    const targetSeason = season ?? s.season;
    const seasonAwards = s.awardHistory.filter(a => a.season === targetSeason);
    if (seasonAwards.length === 0) return null;

    const rng = createStableWorkerRng(s, `award-ceremony-${targetSeason}`);

    // Map award IDs to their canonical keys
    const awardKeyMap: Record<string, string> = {
      MVP: 'MVP',
      'Cy Young': 'CY_YOUNG',
      'Rookie of the Year': 'ROY',
      'Gold Glove': 'GOLD_GLOVE',
      'Silver Slugger': 'SILVER_SLUGGER',
      'Reliever of the Year': 'RELIEVER_OF_YEAR',
    };

    const contexts = seasonAwards.map(entry => {
      const player = s.players.find(p => p.id === entry.playerId);
      const stats = s.seasonState.playerSeasonStats.get(entry.playerId);
      const leaguePrefix = entry.league === 'AL' ? '_AL' : entry.league === 'NL' ? '_NL' : '';
      const baseKey = awardKeyMap[entry.award] ?? entry.award.toUpperCase().replace(/\s+/g, '_');
      const awardId = `${baseKey}${leaguePrefix}`;

      // Count previous awards for repeat detection
      const previousWins = s.awardHistory.filter(
        a => a.playerId === entry.playerId && a.season < targetSeason,
      ).length;

      // Get team record from standings
      const standings = s.seasonState.standings.getLeagueStandings();
      const teamEntry = standings.find(e => e.teamId === entry.teamId);
      const wins = teamEntry?.wins ?? 81;
      const losses = teamEntry?.losses ?? 81;

      // Pick reaction tone based on player personality if available
      const tones: Array<'confident' | 'humble' | 'measured'> = ['confident', 'humble', 'measured'];
      const toneIndex = (entry.playerId.charCodeAt(0) + targetSeason) % 3;

      return {
        awardId,
        winnerId: entry.playerId,
        winnerName: player ? `${player.firstName} ${player.lastName}` : entry.playerId,
        winnerTeamId: entry.teamId,
        winnerStatLine: entry.summary || stats?.toString() || 'N/A',
        runnerUpNames: [] as string[],
        winnerAge: player?.age ?? 28,
        isFirstAward: previousWins === 0,
        isRepeatWinner: previousWins > 0,
        reactionTone: tones[toneIndex]!,
        teamRecord: { wins, losses },
      };
    });

    return generateAwardCeremony(rng, contexts, targetSeason);
  },

  // ---------------------------------------------------------------------------
  // Round 4 API Integration: Breakout Intelligence, Scout Consensus, Playoff Momentum
  // ---------------------------------------------------------------------------

  getBreakoutIntelligence(playerId: string) {
    const s = requireState();
    const player = s.players.find(p => p.id === playerId);
    if (!player) return null;

    const coaches = s.coachingStaffs.get(player.teamId) ?? [];

    // Build season history from development reports if available
    const history: Array<{ prevRating: number; currRating: number }> = [];
    // Use development checkpoint data if stored — fall back to empty
    // The breakout engine handles empty history gracefully (neutral score)

    const assessment = calculateBreakoutProbability(player, history, coaches);
    const rng = createStableWorkerRng(s, `breakout-${playerId}`);
    const ceiling = predictProspectCeiling(rng, player);
    const deltas = history.map(h => h.currRating - h.prevRating);
    const regression = detectRegressionRisk(player, deltas);
    const trajectory = classifyDevelopmentTrajectory(deltas);
    const scoutReport = generateBreakoutScoutReport(rng, player, assessment);

    return {
      assessment,
      ceiling,
      regression,
      trajectory,
      scoutReport,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      age: player.age,
      developmentPhase: player.developmentPhase,
    };
  },

  getProspectBreakoutWatch() {
    const s = requireState();
    const prospects = getTeamPlayers(s.userTeamId).filter(p =>
      p.rosterStatus !== 'MLB'
      && (p.developmentPhase === 'Prospect' || p.developmentPhase === 'Ascent' || p.developmentPhase === 'Prime'),
    );

    const coaches = s.coachingStaffs.get(s.userTeamId) ?? [];

    const watchList = prospects.map(p => {
      const assessment = calculateBreakoutProbability(p, [], coaches);
      const deltas: number[] = [];
      const trajectory = classifyDevelopmentTrajectory(deltas);

      return {
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        position: p.position,
        age: p.age,
        level: p.minorLeagueLevel ?? p.rosterStatus,
        probability: assessment.probability,
        riskLevel: assessment.riskLevel,
        narrativeHook: assessment.narrativeHook,
        trajectory,
        topFactor: assessment.factors[0]?.name ?? 'Overall profile',
      };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);

    return { watchList };
  },

  getScoutConsensus(playerId: string) {
    const s = requireState();
    const player = s.players.find(p => p.id === playerId);
    if (!player) return null;

    // Use coaching staff as evaluators (farm director, coordinators, and coaches all observe players)
    const staff = s.coachingStaffs.get(s.userTeamId) ?? [];
    if (staff.length === 0) return null;

    // Pick the 3-5 most relevant staff members as "scouts"
    const evaluators = staff.slice(0, 5);
    const rng = createStableWorkerRng(s, `scout-consensus-${playerId}`);

    // Build observations from staff evaluators
    const observations = evaluators.map((scout, idx) => {
      const scoutSkill = Math.round(scout.teachingAbility * 100);
      const estimate = estimateAttributeWithUncertainty(
        rng, player.overallRating, scoutSkill, 3 + idx,
      );
      return {
        scoutId: scout.id,
        playerId: player.id,
        observedRating: estimate.pointEstimate,
        confidence: estimate.confidence,
        timestamp: `S${s.season}D${s.day}`,
        scoutSkill,
      };
    });

    const consensus = buildMultiScoutConsensus(observations);

    // Build attribute estimates for key attributes
    const isPitcher = player.pitcherAttributes !== null;
    const attrKeys = isPitcher
      ? ['stuff', 'control', 'stamina', 'velocity', 'movement'] as const
      : ['contact', 'power', 'eye', 'speed', 'defense'] as const;

    const bestEvaluator = evaluators.reduce((best, sc) =>
      (sc.teachingAbility > (best?.teachingAbility ?? 0)) ? sc : best, evaluators[0]!);

    const attributeEstimates = attrKeys.map(key => {
      let trueValue = 0;
      if (isPitcher && player.pitcherAttributes) {
        trueValue = player.pitcherAttributes[key as keyof NonNullable<typeof player.pitcherAttributes>] as number ?? 0;
      } else {
        trueValue = player.hitterAttributes[key as keyof typeof player.hitterAttributes] as number ?? 0;
      }
      const estimate = estimateAttributeWithUncertainty(
        rng, trueValue, Math.round(bestEvaluator.teachingAbility * 100), 4,
      );
      return { attribute: key, ...estimate };
    });

    return {
      consensus,
      attributeEstimates,
      scoutCount: evaluators.length,
      observations: observations.map(o => {
        const scout = evaluators.find(sc => sc.id === o.scoutId);
        return {
          scoutId: o.scoutId,
          scoutName: scout ? `${scout.firstName} ${scout.lastName}` : 'Unknown',
          observedRating: o.observedRating,
          confidence: o.confidence,
        };
      }),
    };
  },

  getPlayoffMomentum() {
    const s = requireState();
    if (s.phase !== 'playoffs' || !s.playoffBracket) return null;

    const rng = createStableWorkerRng(s, 'playoff-momentum');

    // Use currentRoundSeries which has PlayoffSeriesState with status, higherSeed, lowerSeed
    const activeSeries = s.playoffBracket.currentRoundSeries.find(
      series => series.status !== 'complete',
    );
    if (!activeSeries) return null;

    const homeTeamId = activeSeries.higherSeed.teamId;
    const awayTeamId = activeSeries.lowerSeed.teamId;

    const standings = s.seasonState.standings.getLeagueStandings();
    const homeStanding = standings.find(e => e.teamId === homeTeamId);
    const awayStanding = standings.find(e => e.teamId === awayTeamId);

    const roundMap: Record<string, 'WC' | 'DS' | 'CS' | 'WS'> = {
      WILD_CARD: 'WC', DIVISION_SERIES: 'DS',
      CHAMPIONSHIP_SERIES: 'CS', WORLD_SERIES: 'WS',
    };

    const seriesHomeWins = activeSeries.higherSeedWins;
    const seriesAwayWins = activeSeries.lowerSeedWins;
    const bestOf = activeSeries.bestOf;
    const winsToAdvance = Math.ceil(bestOf / 2);
    const isElimination = seriesHomeWins === winsToAdvance - 1 || seriesAwayWins === winsToAdvance - 1;

    const context = {
      homeTeamWins: homeStanding?.wins ?? 81,
      homeTeamLosses: homeStanding?.losses ?? 81,
      awayTeamWins: awayStanding?.wins ?? 81,
      awayTeamLosses: awayStanding?.losses ?? 81,
      seriesHomeWins,
      seriesAwayWins,
      homeStarterGamesInSeries: 1,
      awayStarterGamesInSeries: 1,
      homeStarterDaysSinceStart: 5,
      awayStarterDaysSinceStart: 5,
      homeStarterStamina: 350,
      awayStarterStamina: 350,
      homeRecentResults: [] as boolean[],
      awayRecentResults: [] as boolean[],
      isElimination,
      round: roundMap[activeSeries.round] ?? ('DS' as const),
    };

    const modifiers = buildPlayoffGameModifiers(context);
    const narrative = generateMomentumNarrative(rng, modifiers);

    return {
      homeTeamId,
      awayTeamId,
      seriesHomeWins,
      seriesAwayWins,
      round: context.round,
      isElimination,
      modifiers,
      narrative,
    };
  },

  getFreeAgencyMarketIntelligence() {
    const s = requireState();
    if (!s.freeAgencyMarket) return null;
    const rng = createStableWorkerRng(s, 'market-intel');

    // Build team budget info
    const teams = s.seasonState.standings.getLeagueStandings().map(e => {
      const budget = 80 + (e.wins > e.losses ? 20 : 0);
      const teamPlayers = s.players.filter(p => p.teamId === e.teamId && p.rosterStatus === 'MLB');
      const payroll = teamPlayers.reduce((sum, p) => sum + (p.contract?.annualSalary ?? 0), 0);
      return {
        teamId: e.teamId,
        budgetRemaining: Math.max(0, budget - payroll),
        needsPosition: true,
      };
    });

    // Get top free agents and generate reports
    const freeAgents = s.freeAgencyMarket.freeAgents?.slice(0, 15) ?? [];
    const reports = freeAgents.map(fa => {
      const player = fa.player;
      return generateMarketReport(rng, {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: player.age,
        overallRating: player.overallRating,
        warProjection: player.overallRating / 100,
        historicalSignings: [],
        teams,
      });
    });

    const summary = generateMarketSummary(reports);

    return {
      reports: reports.slice(0, 10),
      summary,
      totalFreeAgents: freeAgents.length,
    };
  },
};
