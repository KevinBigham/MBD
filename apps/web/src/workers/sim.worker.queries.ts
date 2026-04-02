import {
  AFFILIATE_LEVELS,
  calculateLuxuryTax,
  calculateTeamPayroll,
  createFreeAgencyMarket,
  describeInjury,
  evaluatePlayerTradeValue,
  generateAITradeOffers,
  getActiveRosterLimit,
  getTeamBudget,
  getTeamById,
  getTopFreeAgents,
  getUnreadNews,
  scoutPlayer,
} from '@mbd/sim-core';
import type {
  FreeAgent,
  GeneratedPlayer,
  PlayerGameStats,
  PlayerTradeValue,
  PlayoffBracket,
  RosterState,
  StandingsEntry,
} from '@mbd/sim-core';
import { calculateAwardRaces } from '../../../../packages/sim-core/src/league/awards';
import {
  buildIFAPoolView,
  buildSeasonFlowStateView,
  buildDraftRoomView,
  buildOffseasonStateView,
  getPromotionCandidatesForTeam,
  getRosterComplianceIssuesForTeam,
  getTeamPlayers,
  requireState,
  state,
  timestamp,
  toPlayerDTO,
} from './sim.worker.helpers.js';
import type { PlayerDTO, TeamStandingsDTO } from './sim.worker.helpers.js';
import { buildPressRoomFeed } from './sim.worker.pressRoom.js';
import { getDynastyScoreSummary } from './sim.worker.legacy.js';
import {
  getAwardHistory,
  getPersonalityProfileForPlayer,
  getRivalriesForTeam,
  getSeasonHistory,
  resolveHistoryDisplayNames as resolveNarrativeHistoryDisplayNames,
} from './sim.worker.narrative.js';
import {
  buildTradeAssetInventoryView,
  buildTradeHistoryView,
  buildTradeOffersView,
} from './sim.worker.trade.js';

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
    budget: getTeamBudget(s.userTeamId),
  };

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

  const topProspect = s.players
    .filter((player) => player.teamId === s.userTeamId && player.rosterStatus !== 'MLB')
    .sort((left, right) => right.overallRating - left.overallRating)[0];

  const pressRoomFeed = buildPressRoomFeed(s, 12);
  const briefingCount = pressRoomFeed.filter((entry) => entry.source === 'briefing').length;

  return {
    franchise: {
      teamName: teamNameFromId(s.userTeamId),
      abbreviation: getTeamById(s.userTeamId)?.abbreviation ?? s.userTeamId.toUpperCase(),
      season: s.season,
      record: userStanding ? `${userStanding.wins}-${userStanding.losses}` : '0-0',
      division: userDivision,
      divisionRank: userStanding?.divisionRank ?? 1,
      dynasty,
      owner: ownerState,
      chemistry,
    },
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
      payroll: finances.payroll,
      budget: finances.budget,
      luxuryTax: calculateLuxuryTax(finances.payroll),
    },
    intel: {
      tradeInboxCount: s.tradeState.pendingOffers.length,
      expiringContracts,
      topProspect: topProspect
        ? {
          playerId: topProspect.id,
          name: `${topProspect.firstName} ${topProspect.lastName}`,
          position: topProspect.position,
          readiness: topProspect.overallRating,
          level: topProspect.rosterStatus,
        }
        : null,
    },
    divisionStandings: divisionView,
    pressRoom: {
      feed: pressRoomFeed,
      latest: pressRoomFeed[0] ?? null,
      briefingCount,
      newsCount: pressRoomFeed.length - briefingCount,
    },
  };
}

function teamNameFromId(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
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

    return state.players
      .filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB')
      .sort((left, right) => right.overallRating - left.overallRating)
      .map((player) => toPlayerDTO(player));
  },

  getFullRoster(teamId: string): { mlb: PlayerDTO[]; minors: Record<string, PlayerDTO[]> } {
    if (!state) {
      return { mlb: [], minors: {} };
    }

    const teamPlayers = state.players.filter((player) => player.teamId === teamId);
    const mlb = teamPlayers
      .filter((player) => player.rosterStatus === 'MLB')
      .sort((left, right) => right.overallRating - left.overallRating)
      .map((player) => toPlayerDTO(player));

    const minors: Record<string, PlayerDTO[]> = {};
    for (const level of ['AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE', 'INTERNATIONAL']) {
      minors[level] = teamPlayers
        .filter((player) => player.rosterStatus === level)
        .sort((left, right) => right.overallRating - left.overallRating)
        .map((player) => toPlayerDTO(player));
    }
    return { mlb, minors };
  },

  getPlayer(playerId: string): PlayerDTO | null {
    if (!state) {
      return null;
    }

    const player = state.players.find((candidate) => candidate.id === playerId);
    return player ? toPlayerDTO(player) : null;
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

  getAffiliateBoxScore(boxScoreId: string) {
    return getAffiliateBoxScoreView(boxScoreId);
  },

  getLeagueLeaders(stat: string, limit: number = 20): PlayerDTO[] {
    const s = state;
    if (!s) {
      return [];
    }

    const withStats = s.players
      .filter((player) => player.rosterStatus === 'MLB')
      .map((player) => ({ player, stats: s.seasonState.playerSeasonStats.get(player.id) }))
      .filter((item): item is { player: GeneratedPlayer; stats: PlayerGameStats } =>
        item.stats != null && item.stats.pa > 0,
      );

    const sorted = [...withStats].sort((left, right) => {
      switch (stat) {
        case 'hr':
          return right.stats.hr - left.stats.hr;
        case 'rbi':
          return right.stats.rbi - left.stats.rbi;
        case 'hits':
          return right.stats.hits - left.stats.hits;
        case 'avg':
          return (right.stats.ab > 0 ? right.stats.hits / right.stats.ab : 0)
            - (left.stats.ab > 0 ? left.stats.hits / left.stats.ab : 0);
        case 'k':
          return right.stats.strikeouts - left.stats.strikeouts;
        case 'era':
          return (left.stats.ip > 0 ? (left.stats.earnedRuns / (left.stats.ip / 3)) * 9 : 99)
            - (right.stats.ip > 0 ? (right.stats.earnedRuns / (right.stats.ip / 3)) * 9 : 99);
        default:
          return right.stats.hr - left.stats.hr;
      }
    });

    return sorted.slice(0, limit).map((item) => toPlayerDTO(item.player, item.stats));
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

  getDashboardSummary() {
    return state ? buildDashboardSummary(state) : null;
  },

  getSeasonFlowState() {
    return buildSeasonFlowStateView(requireState());
  },

  getUserTeamId(): string {
    return state?.userTeamId ?? 'nyy';
  },

  searchPlayers(query: string, limit: number = 20): PlayerDTO[] {
    if (!state || !query) {
      return [];
    }

    const normalized = query.toLowerCase();
    return state.players
      .filter((player) =>
        player.firstName.toLowerCase().includes(normalized)
        || player.lastName.toLowerCase().includes(normalized)
        || `${player.firstName} ${player.lastName}`.toLowerCase().includes(normalized),
      )
      .slice(0, limit)
      .map((player) => toPlayerDTO(player));
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

    const staff = s.scoutingStaffs.get(s.userTeamId);
    if (!staff || staff.length === 0) {
      return null;
    }

    const report = scoutPlayer(s.rng.fork(), staff[0]!, player, timestamp());
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
  },

  getScoutingStaff() {
    const s = requireState();
    return s.scoutingStaffs.get(s.userTeamId) ?? [];
  },

  getIFAPool() {
    return buildIFAPoolView(requireState());
  },

  getDraftClass() {
    return buildDraftRoomView(requireState());
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

  getNews(limit: number = 50) {
    return getUnreadNews(requireState().news).slice(0, limit);
  },

  getBriefing(limit: number = 5) {
    return requireState().briefingQueue.slice(0, limit);
  },

  getPressRoomFeed(limit: number = 100) {
    return buildPressRoomFeed(requireState(), limit);
  },

  getTeamChemistry(teamId?: string) {
    const s = requireState();
    return s.teamChemistry.get(teamId ?? s.userTeamId) ?? null;
  },

  getOwnerState(teamId?: string) {
    const s = requireState();
    return s.ownerState.get(teamId ?? s.userTeamId) ?? null;
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

  resolveHistoryDisplayNames(playerIds: string[], teamIds: string[]) {
    return resolveNarrativeHistoryDisplayNames(requireState(), playerIds, teamIds);
  },

  getTeamFinances(teamId: string) {
    const payroll = calculateTeamPayroll(teamId, getTeamPlayers(teamId)).totalPayroll;
    const budget = getTeamBudget(teamId);
    const luxuryTax = calculateLuxuryTax(payroll);
    return {
      payroll,
      budget,
      luxuryTax,
      capSpace: budget - payroll,
    };
  },
};
