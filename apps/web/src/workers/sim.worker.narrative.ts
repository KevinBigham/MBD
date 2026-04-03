import type {
  AwardHistoryEntry,
  BriefingItem,
  BlockbusterTradeSummary,
  Rivalry,
  SeasonArchiveEntry,
  SeasonStatLeader,
  SeasonHistoryEntry,
  TradeAsset,
} from '@mbd/contracts';
import {
  calculateTeamPayroll,
  getTeamBudget,
} from '../../../../packages/sim-core/src/finance/contracts';
import { finalizeAwardResults } from '../../../../packages/sim-core/src/league/awards';
import { getTeamById, TEAMS } from '../../../../packages/sim-core/src/league/teams';
import {
  applyMoraleEvent,
  buildFrontOfficeBriefing,
  calculateTeamChemistry,
  createInitialPlayerMorale,
  createOwnerState,
  evaluateOwnerState,
  getPersonalityArchetype,
} from '../../../../packages/sim-core/src/league/narrativeState';
import { deriveRivalriesFromStandings } from '../../../../packages/sim-core/src/league/rivalries';
import { getUnreadNews } from '../../../../packages/sim-core/src/narrative/newsFeed';
import { toDisplayRating } from '../../../../packages/sim-core/src/player/attributes';
import { evaluatePlayerTradeValue } from '@mbd/sim-core';
import type { GeneratedPlayer, PlayerGameStats } from '@mbd/sim-core';
import { detectProspectBreakouts } from '../../../../packages/sim-core/src/player/breakouts';
import type { FullGameState } from './sim.worker.helpers';
import { getTeamPlayers, timestamp } from './sim.worker.helpers';

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
      budget: getTeamBudget(team.id),
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
        calculateTeamChemistry(team.id, state.players, state.playerMorale),
      );
    }

    if (!state.ownerState.has(team.id)) {
      state.ownerState.set(team.id, createOwnerState(team.id, getTeamBudget(team.id)));
    }
  }

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

  for (const team of TEAMS) {
    state.teamChemistry.set(
      team.id,
      calculateTeamChemistry(team.id, state.players, state.playerMorale),
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
      }),
    );
  }

  state.rivalries = deriveRivalriesFromStandings(
    state.rivalries,
    state.seasonState.standings.getFullStandings(),
  );

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
