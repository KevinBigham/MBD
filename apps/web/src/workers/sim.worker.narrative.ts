import type {
  AwardHistoryEntry,
  BriefingItem,
  BlockbusterTradeSummary,
  OwnerState,
  Rivalry,
  SeasonArchiveEntry,
  SeasonStatLeader,
  SeasonHistoryEntry,
  TradeAsset,
} from '@mbd/contracts';
import {
  applyMoraleEvent,
  buildFrontOfficeBriefing,
  calculateTeamChemistry,
  calculateTeamPayroll,
  countMatchingTraits,
  createFrontOfficeState,
  createInitialPlayerMorale,
  createOwnerState,
  deriveDeterministicPersonalityTraits,
  deriveRivalriesFromStandings,
  detectProspectBreakouts,
  evaluateOwnerState,
  evaluatePlayerTradeValue,
  finalizeAwardResults,
  getPersonalityArchetype,
  getTeamBudget,
  getTeamById,
  getUnreadNews,
  TEAMS,
  toDisplayRating,
  type Coach,
  type GeneratedPlayer,
  type PlayerGameStats,
  type TeamChemistryContext,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers';
import { getTeamPlayers, timestamp } from './sim.worker.helpers';
import { getDifficultyAdjustedBudget } from './sim.worker.setup.js';

export interface PersonalityProfileDTO {
  playerId: string;
  archetype: string;
  morale: ReturnType<typeof createInitialPlayerMorale>;
  personality: {
    workEthic: number;
    mentalToughness: number;
    leadership: number;
    competitiveness: number;
  };
  summary: string;
}

export interface HistoryDisplayNamesDTO {
  players: Record<string, string>;
  teams: Record<string, string>;
}

export interface SeasonComparisonDTO {
  userTeamId: string;
  left: SeasonArchiveEntry | null;
  right: SeasonArchiveEntry | null;
  deltas: {
    wins: number | null;
    payroll: number | null;
    budget: number | null;
  };
}

function dedupeBriefing(items: BriefingItem[]): BriefingItem[] {
  const seen = new Set<string>();
  const deduped: BriefingItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  const parseTimestamp = (value: string): number => {
    if (value === 'NOW') return Number.MAX_SAFE_INTEGER;
    const match = /^S(\d+)D(\d+)$/.exec(value);
    if (!match) return 0;
    return Number(match[1]) * 1000 + Number(match[2]);
  };

  return deduped
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return parseTimestamp(right.timestamp) - parseTimestamp(left.timestamp);
    })
    .slice(0, 25);
}

function setStoryFlag(state: FullGameState, key: string, flag: string) {
  const existing = state.storyFlags.get(key) ?? [];
  if (!existing.includes(flag)) {
    state.storyFlags.set(key, [...existing, flag]);
  }
}

function parseSeasonFromTimestamp(value: string): number | null {
  const match = /^S(\d+)D\d+$/.exec(value);
  return match ? Number(match[1]) : null;
}

function teamLabel(teamId: string | null): string {
  if (!teamId) return 'Unknown team';
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function playerLabel(player: GeneratedPlayer): string {
  return `${player.firstName} ${player.lastName}`;
}

function uniqueStrings(values: string[], limit?: number): string[] {
  const deduped = values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
  return typeof limit === 'number' ? deduped.slice(0, limit) : deduped;
}

function pushNarrativeStory(
  state: FullGameState,
  item: Omit<FullGameState['news'][number], 'read'>,
  briefing?: BriefingItem,
) {
  if (!state.news.some((existing) => existing.id === item.id)) {
    state.news.unshift({
      ...item,
      read: false,
    });
  }

  if (briefing && !state.briefingQueue.some((existing) => existing.id === briefing.id)) {
    state.briefingQueue = dedupeBriefing([briefing, ...state.briefingQueue]);
  }
}

function ownerFlag(level: 'concern' | 'meeting' | 'fired', season: number): string {
  return `owner_${level}_${season}`;
}

function syncUserOwnerEscalation(
  state: FullGameState,
  previousOwner: OwnerState | null,
  nextOwner: OwnerState,
) {
  const satisfaction = nextOwner.satisfaction ?? 50;
  const previousSatisfaction = previousOwner?.satisfaction ?? 50;
  const teamFlags = state.storyFlags.get(state.userTeamId) ?? [];
  const firingSuppressed = teamFlags.includes('suppress_owner_firing');
  const meetingFlag = ownerFlag('meeting', state.season);
  let ownerMeetingActive = teamFlags.includes(meetingFlag);

  if (satisfaction < 50 && !teamFlags.includes(ownerFlag('concern', state.season))) {
    setStoryFlag(state, state.userTeamId, ownerFlag('concern', state.season));
    pushNarrativeStory(state, {
      id: `owner-concern-${state.season}-${state.day}`,
      headline: 'Owner expresses concern over the club direction',
      body: nextOwner.summary,
      priority: 2,
      category: 'performance',
      tag: 'BREAKING',
      timestamp: `S${state.season}D${state.day}`,
      relatedPlayerIds: [],
      relatedTeamIds: [state.userTeamId],
    });
  }

  if (satisfaction < 30 && !ownerMeetingActive) {
    setStoryFlag(state, state.userTeamId, meetingFlag);
    ownerMeetingActive = true;
    pushNarrativeStory(
      state,
      {
        id: `owner-meeting-${state.season}-${state.day}`,
        headline: 'Owner demands a front office meeting',
        body: 'Ownership wants immediate progress and is weighing a front office change.',
        priority: 1,
        category: 'performance',
        tag: 'BREAKING',
        timestamp: `S${state.season}D${state.day}`,
        relatedPlayerIds: [],
        relatedTeamIds: [state.userTeamId],
      },
      {
        id: `brief-owner-meeting-${state.season}`,
        priority: 1,
        category: 'owner',
        tag: 'BREAKING',
        headline: 'Owner ultimatum is live.',
        body: 'Budget discipline, wins, and clubhouse health all need to improve quickly.',
        relatedTeamIds: [state.userTeamId],
        relatedPlayerIds: [],
        timestamp: `S${state.season}D${state.day}`,
        acknowledged: false,
      },
    );
  }

  if (
    !firingSuppressed &&
    state.franchise.status !== 'fired' &&
    ownerMeetingActive &&
    satisfaction <= 15 &&
    Math.min(nextOwner.patience, nextOwner.confidence) <= 15
  ) {
    const endReason = 'Owner fired the GM after satisfaction collapsed.';
    setStoryFlag(state, state.userTeamId, ownerFlag('fired', state.season));
    state.franchise = {
      ...state.franchise,
      status: 'fired',
      endedAt: `S${state.season}D${state.day}`,
      endReason,
    };
    pushNarrativeStory(
      state,
      {
        id: `owner-fired-${state.season}-${state.day}`,
        headline: 'Owner fires the GM',
        body: endReason,
        priority: 1,
        category: 'performance',
        tag: 'BREAKING',
        timestamp: `S${state.season}D${state.day}`,
        relatedPlayerIds: [],
        relatedTeamIds: [state.userTeamId],
      },
      {
        id: `brief-owner-fired-${state.season}`,
        priority: 1,
        category: 'owner',
        tag: 'BREAKING',
        headline: 'The front office has been dismissed.',
        body: 'This dynasty is now locked in read-only mode. History remains available for review.',
        relatedTeamIds: [state.userTeamId],
        relatedPlayerIds: [],
        timestamp: `S${state.season}D${state.day}`,
        acknowledged: false,
      },
    );
  }

  if (satisfaction >= 80 && previousSatisfaction < 80 && (nextOwner.annualBudget ?? 0) > (previousOwner?.annualBudget ?? 0)) {
    pushNarrativeStory(state, {
      id: `owner-budget-bump-${state.season}-${state.day}`,
      headline: 'Owner approves a future budget increase',
      body: `Ownership approved a larger operating budget. Next payroll cap now projects at $${(nextOwner.payrollCap ?? 0).toFixed(1)}M.`,
      priority: 3,
      category: 'performance',
      tag: 'ANALYSIS',
      timestamp: `S${state.season}D${state.day}`,
      relatedPlayerIds: [],
      relatedTeamIds: [state.userTeamId],
    });
  }
}

function serviceYearsForPlayer(state: FullGameState, player: GeneratedPlayer): number {
  return (state.serviceTime.get(player.id) ?? player.serviceTimeDays) / 172;
}

function ensurePlayerPersonalityTraits(state: FullGameState) {
  for (const player of state.players) {
    if ((player.personalityTraits?.length ?? 0) > 0) continue;
    player.personalityTraits = deriveDeterministicPersonalityTraits({
      id: player.id,
      age: player.age,
      position: player.position,
      rosterStatus: player.rosterStatus,
      personality: player.personality,
    });
  }
}

function calculateRosterContinuity(state: FullGameState, teamId: string): number {
  const teamPlayers = state.players.filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB');
  if (teamPlayers.length === 0) return 50;

  const returningCore = teamPlayers.filter((player) => serviceYearsForPlayer(state, player) >= 2).length;
  const averageServiceYears = teamPlayers.reduce((sum, player) => sum + serviceYearsForPlayer(state, player), 0) / teamPlayers.length;
  return Math.max(20, Math.min(90, Math.round(35 + returningCore * 1.8 + averageServiceYears * 8)));
}

function leadershipCoachFitScore(coaches: Coach[]): number {
  if (coaches.length === 0) return 50;

  const leadershipVoices = coaches.filter((coach) => coach.specialty === 'leadership' || coach.specialty === 'mlb_prep');
  if (leadershipVoices.length === 0) return 50;

  const averageFit = leadershipVoices.reduce(
    (sum, coach) => sum + ((coach.teachingAbility * 0.6) + (coach.personalityFit * 0.4)) * 100,
    0,
  ) / leadershipVoices.length;
  return Math.max(30, Math.min(90, Math.round(averageFit)));
}

function buildChemistryContext(state: FullGameState, teamId: string): TeamChemistryContext {
  return {
    recentStreak: state.seasonState.standings.getRecord(teamId)?.streak ?? 0,
    rosterContinuity: calculateRosterContinuity(state, teamId),
    coachFit: leadershipCoachFitScore(state.coachingStaffs.get(teamId) ?? []),
  };
}

function sameMentorTrack(veteran: GeneratedPlayer, rookie: GeneratedPlayer): boolean {
  if (veteran.position === rookie.position) return true;

  const veteranPitcher = veteran.pitcherAttributes != null;
  const rookiePitcher = rookie.pitcherAttributes != null;
  return veteranPitcher && rookiePitcher;
}

function mentorCandidateScore(state: FullGameState, player: GeneratedPlayer): number {
  return player.personality.leadership
    + player.personality.workEthic * 0.35
    + serviceYearsForPlayer(state, player) * 12
    + countMatchingTraits(player.personalityTraits, ['Leader', 'Mentor', 'Team First']) * 10;
}

function isMentorCandidate(state: FullGameState, player: GeneratedPlayer): boolean {
  if (player.rosterStatus !== 'MLB') return false;
  return player.age >= 29
    || serviceYearsForPlayer(state, player) >= 4
    || mentorCandidateScore(state, player) >= 110;
}

function isRookieCandidate(state: FullGameState, player: GeneratedPlayer): boolean {
  if (player.rosterStatus !== 'MLB') return false;
  return player.age <= 23 || serviceYearsForPlayer(state, player) < 1.1;
}

function mentorRelationshipKey(veteranPlayerId: string, rookiePlayerId: string): string {
  return `${veteranPlayerId}:${rookiePlayerId}`;
}

function buildMentorSummary(veteran: GeneratedPlayer, rookie: GeneratedPlayer): string {
  return `${playerLabel(veteran)} has taken ${playerLabel(rookie)} under wing while the ${rookie.position} learns the big-league room.`;
}

function syncMentorRelationships(state: FullGameState) {
  const playersById = new Map(state.players.map((player) => [player.id, player]));
  const retained = state.mentorRelationships.filter((relationship) => {
    const veteran = playersById.get(relationship.veteranPlayerId);
    const rookie = playersById.get(relationship.rookiePlayerId);
    return veteran != null
      && rookie != null
      && veteran.teamId === relationship.teamId
      && rookie.teamId === relationship.teamId
      && veteran.rosterStatus === 'MLB'
      && rookie.rosterStatus === 'MLB';
  });
  const existingKeys = new Set(retained.map((relationship) =>
    mentorRelationshipKey(relationship.veteranPlayerId, relationship.rookiePlayerId),
  ));
  const created: typeof retained = [];

  for (const team of TEAMS) {
    const teamPlayers = state.players.filter((player) => player.teamId === team.id && player.rosterStatus === 'MLB');
    const veterans = teamPlayers
      .filter((player) => isMentorCandidate(state, player))
      .sort((left, right) => mentorCandidateScore(state, right) - mentorCandidateScore(state, left));
    const rookies = teamPlayers
      .filter((player) => isRookieCandidate(state, player))
      .sort((left, right) => left.age - right.age || serviceYearsForPlayer(state, left) - serviceYearsForPlayer(state, right));

    for (const rookie of rookies) {
      const veteran = veterans.find((candidate) =>
        candidate.id !== rookie.id
        && sameMentorTrack(candidate, rookie)
        && !existingKeys.has(mentorRelationshipKey(candidate.id, rookie.id)),
      );
      if (!veteran) continue;

      const relationship = {
        veteranPlayerId: veteran.id,
        rookiePlayerId: rookie.id,
        teamId: team.id,
        startedSeason: state.season,
        summary: buildMentorSummary(veteran, rookie),
      };
      existingKeys.add(mentorRelationshipKey(veteran.id, rookie.id));
      retained.push(relationship);
      created.push(relationship);
    }
  }

  state.mentorRelationships = retained;
  return created;
}

function publishMentorRelationshipStories(
  state: FullGameState,
  relationships: FullGameState['mentorRelationships'],
) {
  for (const relationship of relationships) {
    const veteran = state.players.find((player) => player.id === relationship.veteranPlayerId);
    const rookie = state.players.find((player) => player.id === relationship.rookiePlayerId);
    if (!veteran || !rookie) continue;

    const headline = `${veteran.lastName} takes rookie ${rookie.position} under wing`;
    pushNarrativeStory(
      state,
      {
        id: `mentor-${relationship.teamId}-${relationship.veteranPlayerId}-${relationship.rookiePlayerId}`,
        headline,
        body: relationship.summary,
        priority: 3,
        category: 'development',
        tag: 'ANALYSIS',
        timestamp: `S${state.season}D${state.day}`,
        relatedPlayerIds: [veteran.id, rookie.id],
        relatedTeamIds: [relationship.teamId],
      },
      {
        id: `brief-mentor-${relationship.veteranPlayerId}-${relationship.rookiePlayerId}`,
        priority: 3,
        category: 'development',
        tag: 'ANALYSIS',
        headline,
        body: relationship.summary,
        relatedTeamIds: [relationship.teamId],
        relatedPlayerIds: [veteran.id, rookie.id],
        timestamp: `S${state.season}D${state.day}`,
        acknowledged: false,
      },
    );
  }
}

function publishClubhouseChemistryStories(state: FullGameState) {
  const chemistry = state.teamChemistry.get(state.userTeamId);
  const record = state.seasonState.standings.getRecord(state.userTeamId);
  if (!chemistry || !record) return;

  const mlbPlayers = getTeamPlayers(state.userTeamId).filter((player) => player.rosterStatus === 'MLB');
  const volatilePersonalities = mlbPlayers.reduce(
    (sum, player) => sum + countMatchingTraits(player.personalityTraits, ['Diva', 'Hot Head', 'Moody', 'Party Animal']),
    0,
  );

  if (chemistry.score >= 80 && record.streak >= 8 && !(state.storyFlags.get(state.userTeamId) ?? []).includes('chemistry_peak_story')) {
    setStoryFlag(state, state.userTeamId, 'chemistry_peak_story');
    pushNarrativeStory(
      state,
      {
        id: `clubhouse-high-${state.season}`,
        headline: `Team chemistry at all-time high after ${record.streak}-game win streak`,
        body: 'Veteran leadership and a stable core have the room feeding off itself.',
        priority: 3,
        category: 'development',
        tag: 'ANALYSIS',
        timestamp: `S${state.season}D${state.day}`,
        relatedPlayerIds: [],
        relatedTeamIds: [state.userTeamId],
      },
    );
  }

  if (chemistry.score <= 35 && record.streak <= -5 && volatilePersonalities > 0 && !(state.storyFlags.get(state.userTeamId) ?? []).includes('clubhouse_drama_story')) {
    setStoryFlag(state, state.userTeamId, 'clubhouse_drama_story');
    pushNarrativeStory(
      state,
      {
        id: `clubhouse-low-${state.season}`,
        headline: 'Dugout argument after tough loss',
        body: 'The losing streak has started to fray a volatile room, and teammates are feeling it.',
        priority: 2,
        category: 'development',
        tag: 'BREAKING',
        timestamp: `S${state.season}D${state.day}`,
        relatedPlayerIds: [],
        relatedTeamIds: [state.userTeamId],
      },
    );
  }
}

function createLeaderEntry(
  player: GeneratedPlayer,
  value: string,
  summary: string,
): SeasonStatLeader {
  return {
    playerId: player.id,
    teamId: player.teamId,
    value,
    summary,
  };
}

function topHitterLeaders(
  state: FullGameState,
  scorer: (stats: PlayerGameStats) => number,
  valueFormatter: (stats: PlayerGameStats) => string,
  summaryFormatter: (player: GeneratedPlayer, stats: PlayerGameStats) => string,
  limit: number = 3,
): SeasonStatLeader[] {
  return Array.from(state.seasonState.playerSeasonStats.entries())
    .map(([playerId, stats]) => ({ player: state.players.find((candidate) => candidate.id === playerId), stats }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } =>
      entry.player != null && entry.stats.ab > 0 && entry.player.pitcherAttributes == null,
    )
    .sort((left, right) => scorer(right.stats) - scorer(left.stats))
    .slice(0, limit)
    .map(({ player, stats }) => createLeaderEntry(player, valueFormatter(stats), summaryFormatter(player, stats)));
}

function topPitcherLeaders(
  state: FullGameState,
  scorer: (stats: PlayerGameStats) => number,
  valueFormatter: (stats: PlayerGameStats) => string,
  summaryFormatter: (player: GeneratedPlayer, stats: PlayerGameStats) => string,
  ascending: boolean = false,
  limit: number = 3,
): SeasonStatLeader[] {
  return Array.from(state.seasonState.playerSeasonStats.entries())
    .map(([playerId, stats]) => ({ player: state.players.find((candidate) => candidate.id === playerId), stats }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } =>
      entry.player != null && entry.stats.ip > 0 && entry.player.pitcherAttributes != null,
    )
    .sort((left, right) => {
      const diff = scorer(right.stats) - scorer(left.stats);
      return ascending ? -diff : diff;
    })
    .slice(0, limit)
    .map(({ player, stats }) => createLeaderEntry(player, valueFormatter(stats), summaryFormatter(player, stats)));
}

function deriveStatLeaders(state: FullGameState, limit: number = 3): SeasonHistoryEntry['statLeaders'] {
  return {
    hr: topHitterLeaders(
      state,
      (stats) => stats.hr,
      (stats) => String(stats.hr),
      (player, stats) => `${playerLabel(player)} launched ${stats.hr} home runs.`,
      limit,
    ),
    rbi: topHitterLeaders(
      state,
      (stats) => stats.rbi,
      (stats) => String(stats.rbi),
      (player, stats) => `${playerLabel(player)} drove in ${stats.rbi} runs.`,
      limit,
    ),
    avg: topHitterLeaders(
      state,
      (stats) => stats.hits / Math.max(1, stats.ab),
      (stats) => (stats.hits / Math.max(1, stats.ab)).toFixed(3).replace(/^0/, ''),
      (player, stats) => `${playerLabel(player)} hit ${(stats.hits / Math.max(1, stats.ab)).toFixed(3).replace(/^0/, '')}.`,
      limit,
    ),
    era: topPitcherLeaders(
      state,
      (stats) => (stats.earnedRuns / Math.max(1, stats.ip / 3)) * 9,
      (stats) => ((stats.earnedRuns / Math.max(1, stats.ip / 3)) * 9).toFixed(2),
      (player, stats) => `${playerLabel(player)} posted a ${((stats.earnedRuns / Math.max(1, stats.ip / 3)) * 9).toFixed(2)} ERA.`,
      true,
      limit,
    ),
    k: topPitcherLeaders(
      state,
      (stats) => stats.strikeouts,
      (stats) => String(stats.strikeouts),
      (player, stats) => `${playerLabel(player)} punched out ${stats.strikeouts} hitters.`,
      false,
      limit,
    ),
    w: topPitcherLeaders(
      state,
      (stats) => stats.wins,
      (stats) => String(stats.wins),
      (player, stats) => `${playerLabel(player)} finished with ${stats.wins} wins.`,
      false,
      limit,
    ),
  };
}

function deriveBlockbusterTrades(state: FullGameState): BlockbusterTradeSummary[] {
  return state.news
    .filter((item) => item.category === 'trade' && parseSeasonFromTimestamp(item.timestamp) === state.season)
    .filter((item) =>
      item.relatedPlayerIds.some((playerId) => {
        const player = state.players.find((candidate) => candidate.id === playerId);
        return player != null && toDisplayRating(player.overallRating) >= 65;
      }),
    )
    .slice(0, 3)
    .map((item) => ({
      headline: item.headline,
      summary: item.body,
      playerIds: item.relatedPlayerIds,
      teamIds: item.relatedTeamIds,
    }));
}

function getArchiveForSeason(state: FullGameState, season: number): SeasonArchiveEntry | null {
  return state.seasonArchive.find((entry) => entry.season === season) ?? null;
}

function archiveStandings(state: FullGameState): SeasonArchiveEntry['standings'] {
  return Object.values(state.seasonState.standings.getFullStandings())
    .flatMap((entries) =>
      entries.map((entry, index) => ({
        teamId: entry.teamId,
        wins: entry.wins,
        losses: entry.losses,
        divisionRank: index + 1,
        gamesBack: entry.gamesBack,
      })),
    )
    .sort((left, right) => right.wins - left.wins || left.losses - right.losses || left.teamId.localeCompare(right.teamId));
}

function archivePlayoffSeries(state: FullGameState): SeasonArchiveEntry['playoffSeries'] {
  return (state.playoffBracket?.series ?? []).map((series) => ({
    round: series.round,
    winnerTeamId: series.winnerId,
    loserTeamId: series.loserId,
    result: `${series.winnerWins}-${series.loserWins}`,
  }));
}

function extractPlayerIdsFromAssets(assets: TradeAsset[]): string[] {
  return assets
    .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => asset.playerId);
}

function estimateSeasonImpact(player: GeneratedPlayer, stats: PlayerGameStats | undefined): number {
  if (!stats) return 0;

  if (player.pitcherAttributes != null) {
    const innings = stats.ip / 3;
    const era = innings > 0 ? (stats.earnedRuns / innings) * 9 : 9;
    return (stats.wins * 1.4) + (stats.strikeouts / 32) + Math.max(0, 5 - era);
  }

  const average = stats.hits / Math.max(1, stats.ab);
  return (stats.hr * 0.9) + (stats.rbi * 0.22) + (stats.hits / 24) + (average * 18);
}

function transactionImpactScore(
  state: FullGameState,
  playerIds: string[],
  contractValue: number = 0,
  fairnessScore: number = 0,
  categoryBonus: number = 0,
): number {
  const playerImpact = playerIds.reduce((total, playerId) => {
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!player) return total;

    return total
      + (evaluatePlayerTradeValue(player).overall / 18)
      + estimateSeasonImpact(player, state.seasonState.playerSeasonStats.get(playerId));
  }, 0);

  return Number((playerImpact + categoryBonus + (contractValue / 18) + (Math.abs(fairnessScore) * 16)).toFixed(1));
}

function archiveTransactionsFromTradeHistory(state: FullGameState): SeasonArchiveEntry['transactions'] {
  return state.tradeState.tradeHistory
    .filter((entry) => parseSeasonFromTimestamp(entry.timestamp) === state.season)
    .map((entry) => {
      const playerIds = uniqueStrings([
        ...extractPlayerIdsFromAssets(entry.offeringAssets as TradeAsset[]),
        ...extractPlayerIdsFromAssets(entry.requestingAssets as TradeAsset[]),
      ]);

      return {
        headline: `${teamLabel(entry.fromTeamId)} and ${teamLabel(entry.toTeamId)} swung a deal`,
        summary: entry.summary,
        playerIds,
        teamIds: [entry.fromTeamId, entry.toTeamId],
        impactScore: transactionImpactScore(state, playerIds, 0, entry.fairnessScore, 8),
      };
    });
}

function archiveTransactionsFromNews(state: FullGameState): SeasonArchiveEntry['transactions'] {
  return state.news
    .filter((item) => parseSeasonFromTimestamp(item.timestamp) === state.season)
    .filter((item) =>
      item.category === 'trade'
      || item.category === 'extension'
      || item.category === 'signing'
      || item.category === 'qualifying_offer',
    )
    .map((item) => ({
      headline: item.headline,
      summary: item.body,
      playerIds: item.relatedPlayerIds,
      teamIds: item.relatedTeamIds,
      impactScore: transactionImpactScore(
        state,
        item.relatedPlayerIds,
        0,
        0,
        item.category === 'trade' ? 8 : item.category === 'signing' ? 10 : 6,
      ),
    }));
}

function archiveTransactionsFromOffseason(state: FullGameState): SeasonArchiveEntry['transactions'] {
  if (!state.offseasonState) {
    return [];
  }

  const signingTransactions = state.offseasonState.phaseResults.freeAgentSignings.map((entry) => {
    const player = state.players.find((candidate) => candidate.id === entry.playerId);
    const playerName = player ? playerLabel(player) : entry.playerId;

    return {
      headline: `${playerName} signed with ${teamLabel(entry.teamId)}`,
      summary: `${playerName} agreed to ${entry.years} years and $${entry.totalValue.toFixed(1)}M with ${teamLabel(entry.teamId)}.`,
      playerIds: [entry.playerId],
      teamIds: [entry.teamId],
      impactScore: transactionImpactScore(state, [entry.playerId], entry.totalValue, 0, 12),
    };
  });

  const extensionTransactions = state.offseasonState.phaseResults.extensions
    .filter((entry) => entry.status === 'accepted')
    .map((entry) => {
      const player = state.players.find((candidate) => candidate.id === entry.playerId);
      const playerName = player ? playerLabel(player) : entry.playerId;

      return {
        headline: `${playerName} stayed with ${teamLabel(entry.teamId)}`,
        summary: `${playerName} accepted a ${entry.years}-year extension worth $${entry.totalValue.toFixed(1)}M.`,
        playerIds: [entry.playerId],
        teamIds: [entry.teamId],
        impactScore: transactionImpactScore(state, [entry.playerId], entry.totalValue, 0, 9),
      };
    });

  return [...signingTransactions, ...extensionTransactions];
}

function archiveTransactions(state: FullGameState, includeOffseasonData: boolean): SeasonArchiveEntry['transactions'] {
  const entries = [
    ...archiveTransactionsFromTradeHistory(state),
    ...archiveTransactionsFromNews(state),
    ...(includeOffseasonData ? archiveTransactionsFromOffseason(state) : []),
  ];

  return entries
    .sort((left, right) => right.impactScore - left.impactScore || left.headline.localeCompare(right.headline))
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.headline === entry.headline) === index)
    .slice(0, 10);
}

function archiveDraftClass(state: FullGameState, includeOffseasonData: boolean): SeasonArchiveEntry['draftClass'] {
  if (!includeOffseasonData || !state.offseasonState) {
    return [];
  }

  return [...state.offseasonState.phaseResults.draftPicks]
    .sort((left, right) => left.pickNumber - right.pickNumber)
    .slice(0, 10)
    .map((pick) => ({
      pickNumber: pick.pickNumber,
      playerId: pick.playerId,
      playerName: pick.playerName,
      teamId: pick.teamId,
      currentStatus: state.players.find((player) => player.id === pick.playerId)?.rosterStatus ?? 'DRAFTED',
    }));
}

function archiveFinancials(state: FullGameState): SeasonArchiveEntry['financials'] {
  return TEAMS
    .map((team) => ({
      teamId: team.id,
      payroll: calculateTeamPayroll(team.id, getTeamPlayers(team.id)).totalPayroll,
      budget: getDifficultyAdjustedBudget(state, team.id),
    }))
    .sort((left, right) => right.payroll - left.payroll);
}

function archiveTimelineEvents(
  state: FullGameState,
  awards: AwardHistoryEntry[],
  transactions: SeasonArchiveEntry['transactions'],
  draftClass: SeasonArchiveEntry['draftClass'],
): string[] {
  const seasonHistoryEntry = state.seasonHistory.find((entry) => entry.season === state.season) ?? null;
  const userAwards = awards.filter((entry) => entry.teamId === state.userTeamId);
  const hallOfFameEvents = state.hallOfFame
    .filter((entry) => entry.inductionSeason === state.season + 1)
    .map((entry) => `Hall of Fame: ${entry.playerName}`);

  return uniqueStrings([
    state.playoffBracket?.champion === state.userTeamId ? 'Won the World Series' : '',
    seasonHistoryEntry?.summary ?? '',
    seasonHistoryEntry?.userSeason?.playoffResult ?? '',
    ...userAwards.map((entry) => `${entry.league} ${entry.award.replace(/_/g, ' ')}: ${entry.playerId}`),
    ...transactions.slice(0, 3).map((entry) => entry.headline),
    ...draftClass.slice(0, 2).map((pick) => `Drafted ${pick.playerName}`),
    ...hallOfFameEvents,
  ], 8);
}

export function recordSeasonArchive(state: FullGameState, options?: { includeOffseasonData?: boolean }) {
  const includeOffseasonData = options?.includeOffseasonData ?? false;
  const awards = state.awardHistory.filter((entry) => entry.season === state.season);
  const transactions = archiveTransactions(state, includeOffseasonData);
  const draftClass = archiveDraftClass(state, includeOffseasonData);
  const entry: SeasonArchiveEntry = {
    season: state.season,
    standings: archiveStandings(state),
    playoffSeries: archivePlayoffSeries(state),
    awards,
    statLeaders: deriveStatLeaders(state, 10),
    transactions,
    draftClass,
    financials: archiveFinancials(state),
    userSummary: state.seasonHistory.find((candidate) => candidate.season === state.season)?.userSeason ?? null,
    timelineEvents: archiveTimelineEvents(state, awards, transactions, draftClass),
  };

  const existingIndex = state.seasonArchive.findIndex((candidate) => candidate.season === state.season);
  if (existingIndex >= 0) {
    state.seasonArchive.splice(existingIndex, 1, entry);
    return;
  }

  state.seasonArchive.push(entry);
}

function deriveUserPlayoffResult(state: FullGameState): string {
  if (!state.playoffBracket) return 'Missed playoffs';
  if (state.playoffBracket.champion === state.userTeamId) return 'Champion';
  const userLoss = state.playoffBracket.series.find((series) => series.loserId === state.userTeamId);
  if (!userLoss) return 'Missed playoffs';
  switch (userLoss.round) {
    case 'WORLD_SERIES':
      return 'World Series runner-up';
    case 'CHAMPIONSHIP_SERIES':
      return 'Championship Series exit';
    case 'DIVISION_SERIES':
      return 'Division Series exit';
    default:
      return 'Wild Card exit';
  }
}

function buildSeasonSummary(
  championTeamId: string | null,
  runnerUpTeamId: string | null,
  worldSeriesRecord: string | null,
): string {
  if (!championTeamId) {
    return 'Season closed without a recorded champion.';
  }
  if (runnerUpTeamId && worldSeriesRecord) {
    return `${teamLabel(championTeamId)} defeated ${teamLabel(runnerUpTeamId)} in the World Series (${worldSeriesRecord}).`;
  }
  return `${teamLabel(championTeamId)} finished the story on top.`;
}

export function rebuildBriefing(state: FullGameState) {
  const ownerState = state.ownerState.get(state.userTeamId);
  const chemistry = state.teamChemistry.get(state.userTeamId);
  if (!ownerState || !chemistry) return;

  const persistentItems = state.briefingQueue.filter(
    (item) =>
      item.category === 'breakout'
      || item.category === 'award'
      || item.category === 'news'
      || item.category === 'extension'
      || item.category === 'qualifying_offer'
      || item.category === 'coaching'
      || item.category === 'development'
      || item.category === 'rumor',
  );

  state.briefingQueue = dedupeBriefing([
    ...buildFrontOfficeBriefing({
      teamId: state.userTeamId,
      ownerState,
      chemistry,
      unreadNewsCount: getUnreadNews(state.news).length,
      rivalries: getRivalriesForTeam(state, state.userTeamId),
    }),
    ...persistentItems,
  ]);
}

export function ensureNarrativeState(state: FullGameState) {
  ensurePlayerPersonalityTraits(state);
  const activePlayerIds = new Set(state.players.map((player) => player.id));
  for (const playerId of Array.from(state.playerMorale.keys())) {
    if (!activePlayerIds.has(playerId)) {
      state.playerMorale.delete(playerId);
    }
  }

  for (const player of state.players) {
    if (!state.playerMorale.has(player.id)) {
      state.playerMorale.set(player.id, createInitialPlayerMorale(player, timestamp()));
    }
  }

  for (const team of TEAMS) {
    if (!state.teamChemistry.has(team.id)) {
      state.teamChemistry.set(
        team.id,
        calculateTeamChemistry(team.id, state.players, state.playerMorale, buildChemistryContext(state, team.id)),
      );
    }

    if (!state.ownerState.has(team.id)) {
      state.ownerState.set(team.id, createOwnerState(team.id, getTeamBudget(team.id)));
    }

    if (!state.frontOfficeState.has(team.id)) {
      state.frontOfficeState.set(team.id, createFrontOfficeState(team.id));
    }
  }

  syncMentorRelationships(state);
  rebuildBriefing(state);
}

export function refreshNarrativeState(
  state: FullGameState,
  gameResults: Array<{ homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number }>,
) {
  ensureNarrativeState(state);

  for (const game of gameResults) {
    const winnerId = game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
    const loserId = winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;

    for (const player of state.players) {
      if (player.rosterStatus !== 'MLB') continue;
      if (player.teamId !== winnerId && player.teamId !== loserId) continue;

      const current = state.playerMorale.get(player.id) ?? createInitialPlayerMorale(player, timestamp());
      state.playerMorale.set(
        player.id,
        applyMoraleEvent(player, current, {
          type: player.teamId === winnerId ? 'win' : 'loss',
          impact: player.teamId === winnerId ? 4 : -4,
          summary: player.teamId === winnerId
            ? `Clubhouse bump after beating ${loserId.toUpperCase()}.`
            : `Loss to ${winnerId.toUpperCase()} put pressure on the room.`,
          timestamp: timestamp(),
        }),
      );
    }
  }

  const previousUserOwner = state.ownerState.get(state.userTeamId) ?? null;
  for (const team of TEAMS) {
    state.teamChemistry.set(
      team.id,
      calculateTeamChemistry(team.id, state.players, state.playerMorale, buildChemistryContext(state, team.id)),
    );

    const record = state.seasonState.standings.getRecord(team.id);
    const currentOwner = state.ownerState.get(team.id) ?? createOwnerState(team.id, getTeamBudget(team.id));
    const payroll = calculateTeamPayroll(team.id, getTeamPlayers(team.id)).totalPayroll;
    const chemistryScore = state.teamChemistry.get(team.id)?.score ?? 50;

    state.ownerState.set(
      team.id,
      evaluateOwnerState(currentOwner, {
        wins: record?.wins ?? 0,
        losses: record?.losses ?? 0,
        payroll,
        chemistryScore,
        recentDecisionScore: 0,
        madePlayoffs: Boolean(state.playoffBracket?.seeds.some((seed) => seed.teamId === team.id)),
      }),
    );
  }
  const nextUserOwner = state.ownerState.get(state.userTeamId);
  if (nextUserOwner) {
    syncUserOwnerEscalation(state, previousUserOwner, nextUserOwner);
  }

  state.rivalries = deriveRivalriesFromStandings(
    state.rivalries,
    state.seasonState.standings.getFullStandings(),
  );
  const newMentorRelationships = syncMentorRelationships(state);
  publishMentorRelationshipStories(state, newMentorRelationships);
  publishClubhouseChemistryStories(state);

  const userOwner = state.ownerState.get(state.userTeamId);
  const userChemistry = state.teamChemistry.get(state.userTeamId);
  if (userOwner?.hotSeat) setStoryFlag(state, state.userTeamId, 'owner_hot_seat');
  if ((userChemistry?.score ?? 100) < 45) setStoryFlag(state, state.userTeamId, 'clubhouse_tension');
  if (Array.from(getRivalriesForTeam(state, state.userTeamId).values()).some((rivalry) => rivalry.intensity >= 55)) {
    setStoryFlag(state, state.userTeamId, 'heated_rivalry');
  }

  rebuildBriefing(state);
}

export function ensureAwardHistoryForSeason(state: FullGameState) {
  if (state.awardHistory.some((entry) => entry.season === state.season)) return;
  const winners = finalizeAwardResults(state.season, state.players, state.seasonState.playerSeasonStats);
  state.awardHistory.push(...winners);
  state.briefingQueue = dedupeBriefing([
    ...state.briefingQueue,
    ...winners.map((winner) => ({
      id: `award-${winner.season}-${winner.league}-${winner.award}`,
      priority: 2 as const,
      category: 'award' as const,
      tag: 'ANALYSIS' as const,
      headline: `${winner.league} ${winner.award} winner recorded.`,
      body: winner.summary,
      relatedTeamIds: [winner.teamId],
      relatedPlayerIds: [winner.playerId],
      timestamp: `S${winner.season}D${state.day}`,
      acknowledged: false,
    })),
  ]);
}

export function recordSeasonHistory(state: FullGameState, consequenceMoments: string[] = []) {
  const awards = state.awardHistory.filter((entry) => entry.season === state.season);
  const worldSeries = state.playoffBracket?.series.find((series) => series.round === 'WORLD_SERIES') ?? null;
  const championTeamId = state.playoffBracket?.champion ?? null;
  const runnerUpTeamId = worldSeries?.loserId ?? null;
  const worldSeriesRecord = worldSeries ? `${worldSeries.winnerWins}-${worldSeries.loserWins}` : null;
  const userRecord = state.seasonState.standings.getRecord(state.userTeamId);
  const userStorylines = uniqueStrings([
    ...consequenceMoments,
    ...state.news
      .filter((item) => item.relatedTeamIds.includes(state.userTeamId) && parseSeasonFromTimestamp(item.timestamp) === state.season)
      .map((item) => item.headline),
  ], 4);
  const keyMoments = uniqueStrings([
    ...consequenceMoments,
    ...state.news
      .filter((item) => parseSeasonFromTimestamp(item.timestamp) === state.season)
      .map((item) => item.headline),
  ], 6);

  const entry: SeasonHistoryEntry = {
    season: state.season,
    championTeamId,
    runnerUpTeamId,
    worldSeriesRecord,
    summary: buildSeasonSummary(championTeamId, runnerUpTeamId, worldSeriesRecord),
    awards,
    keyMoments,
    statLeaders: deriveStatLeaders(state),
    notableRetirements: state.seasonHistory.find((candidate) => candidate.season === state.season)?.notableRetirements ?? [],
    blockbusterTrades: deriveBlockbusterTrades(state),
    userSeason: {
      teamId: state.userTeamId,
      record: `${userRecord?.wins ?? 0}-${userRecord?.losses ?? 0}`,
      playoffResult: deriveUserPlayoffResult(state),
      storylines: userStorylines,
    },
  };

  const existingIndex = state.seasonHistory.findIndex((candidate) => candidate.season === state.season);
  if (existingIndex >= 0) {
    state.seasonHistory.splice(existingIndex, 1, entry);
    return;
  }

  state.seasonHistory.push(entry);
}

export function finalizeSeasonHistoryRetirements(state: FullGameState, retiredPlayerIds: string[]) {
  if (retiredPlayerIds.length === 0) return;

  const entry = state.seasonHistory.find((candidate) => candidate.season === state.season);
  if (!entry) return;

  const retiredPlayers = retiredPlayerIds
    .map((playerId) => state.players.find((candidate) => candidate.id === playerId))
    .filter((player): player is GeneratedPlayer => player != null);

  const toRetirementSummary = (player: GeneratedPlayer) => ({
    playerId: player.id,
    teamId: player.teamId,
    seasonsPlayed: state.serviceTime.get(player.id) ?? 0,
    overallRating: toDisplayRating(player.overallRating),
    summary: `${playerLabel(player)} retired after ${state.serviceTime.get(player.id) ?? 0} seasons with ${toDisplayRating(player.overallRating)} overall talent.`,
  });

  const notableRetirements = retiredPlayers
    .filter((player) => (state.serviceTime.get(player.id) ?? 0) >= 10 || toDisplayRating(player.overallRating) >= 70)
    .map((player) => toRetirementSummary(player))
    .sort((left, right) => right.seasonsPlayed - left.seasonsPlayed || right.overallRating - left.overallRating);

  const fallbackRetirements = retiredPlayers
    .sort((left, right) =>
      (state.serviceTime.get(right.id) ?? 0) - (state.serviceTime.get(left.id) ?? 0)
      || right.overallRating - left.overallRating,
    )
    .slice(0, 3)
    .map((player) => toRetirementSummary(player));

  entry.notableRetirements = notableRetirements.length > 0
    ? notableRetirements
    : fallbackRetirements;
  entry.keyMoments = uniqueStrings([
    ...entry.keyMoments,
    ...entry.notableRetirements.map((retirement) => retirement.summary),
  ], 6);
}

export function recordBreakoutNarratives(
  state: FullGameState,
  beforePlayers: typeof state.players,
  afterPlayers: typeof state.players,
) {
  const breakouts = detectProspectBreakouts(beforePlayers, afterPlayers, `S${state.season + 1}D1`);
  if (breakouts.length === 0) return;

  const breakoutBriefings: BriefingItem[] = [];
  for (const breakout of breakouts) {
    const player = afterPlayers.find((candidate) => candidate.id === breakout.playerId);
    if (!player) continue;
    const headline = `${player.firstName} ${player.lastName} is trending up.`;
    state.news.unshift({
      id: `breakout-${state.season + 1}-${player.id}`,
      headline,
      body: breakout.summary,
      priority: 2,
      category: 'performance',
      timestamp: breakout.timestamp,
      relatedPlayerIds: [player.id],
      relatedTeamIds: [player.teamId],
      read: false,
    });
    breakoutBriefings.push({
      id: `brief-breakout-${player.id}`,
      priority: 2,
      category: 'breakout',
      headline,
      body: breakout.summary,
      relatedTeamIds: [player.teamId],
      relatedPlayerIds: [player.id],
      timestamp: breakout.timestamp,
      acknowledged: false,
    });
    setStoryFlag(state, player.teamId, 'prospect_breakout');
  }

  state.briefingQueue = dedupeBriefing([...breakoutBriefings, ...state.briefingQueue]);
}

export function getPersonalityProfileForPlayer(
  state: FullGameState,
  playerId: string,
): PersonalityProfileDTO | null {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return null;

  const morale = state.playerMorale.get(player.id) ?? createInitialPlayerMorale(player, timestamp());
  return {
    playerId: player.id,
    archetype: getPersonalityArchetype(player),
    morale,
    personality: player.personality,
    summary: `${player.firstName} ${player.lastName} profiles as a ${getPersonalityArchetype(player)} with ${morale.score} morale.`,
  };
}

export function getRivalriesForTeam(state: FullGameState, teamId: string): Map<string, Rivalry> {
  return new Map(
    Array.from(state.rivalries.entries()).filter(([, rivalry]) =>
      rivalry.teamA === teamId || rivalry.teamB === teamId,
    ),
  );
}

export function getAwardHistory(state: FullGameState): AwardHistoryEntry[] {
  return [...state.awardHistory].sort((a, b) => b.season - a.season);
}

export function getSeasonHistory(state: FullGameState): SeasonHistoryEntry[] {
  return [...state.seasonHistory].sort((a, b) => b.season - a.season);
}

export function getSeasonArchive(state: FullGameState, season?: number): SeasonArchiveEntry | null {
  const targetSeason = season ?? Math.max(0, ...state.seasonArchive.map((entry) => entry.season));
  if (targetSeason === 0) {
    return null;
  }

  return getArchiveForSeason(state, targetSeason);
}

export function compareSeasons(
  state: FullGameState,
  leftSeason: number,
  rightSeason: number,
): SeasonComparisonDTO | null {
  const left = getArchiveForSeason(state, leftSeason);
  const right = getArchiveForSeason(state, rightSeason);
  if (!left || !right) {
    return null;
  }

  const leftStanding = left.standings.find((entry) => entry.teamId === state.userTeamId) ?? null;
  const rightStanding = right.standings.find((entry) => entry.teamId === state.userTeamId) ?? null;
  const leftFinancial = left.financials.find((entry) => entry.teamId === state.userTeamId) ?? null;
  const rightFinancial = right.financials.find((entry) => entry.teamId === state.userTeamId) ?? null;

  return {
    userTeamId: state.userTeamId,
    left,
    right,
    deltas: {
      wins: leftStanding && rightStanding ? rightStanding.wins - leftStanding.wins : null,
      payroll: leftFinancial && rightFinancial ? Number((rightFinancial.payroll - leftFinancial.payroll).toFixed(1)) : null,
      budget: leftFinancial && rightFinancial ? Number((rightFinancial.budget - leftFinancial.budget).toFixed(1)) : null,
    },
  };
}

export function resolveHistoryDisplayNames(
  state: FullGameState,
  playerIds: string[],
  teamIds: string[],
): HistoryDisplayNamesDTO {
  const players = Object.fromEntries(
    uniqueStrings(playerIds)
      .map((playerId) => {
        const player = state.players.find((candidate) => candidate.id === playerId);
        if (player) {
          return [playerId, playerLabel(player)];
        }

        const historicalPlayer = state.historicalPlayers.find((candidate) => candidate.playerId === playerId);
        return historicalPlayer ? [playerId, historicalPlayer.fullName] : [playerId, playerId];
      }),
  );
  const teams = Object.fromEntries(
    uniqueStrings(teamIds)
      .map((teamId) => [teamId, teamLabel(teamId)]),
  );

  return { players, teams };
}
