import type {
  BriefingItem,
  PersistentTradeOffer,
  TradeAsset,
  TradeHistoryEntry,
} from '@mbd/contracts';
import {
  applyMoraleEvent,
  buildRosterState,
  calculateTeamChemistry,
  comparePackages,
  createDefaultDraftPickOwnership,
  createInitialPlayerMorale,
  deduplicateNews,
  evaluateTradeProposal,
  executeTrade,
  generateAITradeOffers,
  generateNews,
  generateNewsId,
  getDaysUntilTradeDeadline,
  getTradeDeadlineDay,
  getRemainingIFABudget,
  getTeamById,
  isTradeDeadlineModeDay,
  recordBlockbusterTradeRivalry,
  rivalryTradePenalty,
  tradeDraftPickOwnership as tradeDraftPickOwnershipCore,
  tradeIFABonusPool as tradeIFABonusPoolCore,
} from '@mbd/sim-core';
import type { TradeProposal } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import { getTeamPlayers, timestamp } from './sim.worker.helpers.js';
import { applyTradeConsequences } from './sim.worker.consequences.js';
import { rebuildBriefing } from './sim.worker.narrative.js';
import { getDifficultyAdjustedTradeFairness } from './sim.worker.setup.js';
import { advanceTradeSagaClimax } from './sim.worker.storyArcs.js';

export const TRADE_DEADLINE_DAY = getTradeDeadlineDay();
const DEADLINE_ACTIVITY_CHECKPOINTS = [92, 97, 102, 107, 112, 117, 120, 122] as const;

export interface TradeAssetView {
  key: string;
  type: TradeAsset['type'];
  label: string;
  detail: string;
  asset: TradeAsset;
  playerId?: string;
}

export interface TradeOfferView {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamAbbreviation: string;
  toTeamId: string;
  toTeamName: string;
  toTeamAbbreviation: string;
  fairnessScore: number;
  message: string;
  createdAt: string;
  offeringAssets: TradeAssetView[];
  requestingAssets: TradeAssetView[];
}

export interface TradeHistoryView {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamAbbreviation: string;
  toTeamId: string;
  toTeamName: string;
  toTeamAbbreviation: string;
  fairnessScore: number;
  summary: string;
  timestamp: string;
  offeringAssets: TradeAssetView[];
  requestingAssets: TradeAssetView[];
}

export interface HotTradeOfferView extends TradeOfferView {
  urgencyTag: 'ACTIVE' | 'EXPIRING SOON' | 'FINAL OFFER';
  bidderCount: number;
  biddingSummary: string | null;
}

export interface TradeTickerItem {
  id: string;
  summary: string;
  timestamp: string;
}

export interface TradeDeadlineRecapItem {
  id: string;
  summary: string;
  outcome: 'completed' | 'missed';
  timestamp: string;
}

export interface TradeDeadlineRecapView {
  season: number;
  deadlineDay: number;
  analysisHeadline: string;
  analysisBody: string;
  yourTrades: TradeDeadlineRecapItem[];
  majorMoves: TradeTickerItem[];
  winners: string[];
  losers: string[];
}

export interface TradeDeadlineStateView {
  deadlineDay: number;
  daysUntilDeadline: number | null;
  deadlineMode: boolean;
  hotOffers: HotTradeOfferView[];
  ticker: TradeTickerItem[];
  recap: TradeDeadlineRecapView | null;
}

export interface TradeAssetInventoryView {
  draftPicks: Array<{
    key: string;
    label: string;
    detail: string;
    asset: Extract<TradeAsset, { type: 'draft_pick' }>;
  }>;
  ifaRemaining: number;
}

export interface TradeCounterPackage {
  offeringAssets: TradeAsset[];
  requestingAssets: TradeAsset[];
}

export interface TradeOfferResponseResult {
  success: boolean;
  decision: 'accepted' | 'declined' | 'countered' | 'rejected';
  message: string;
}

let tradeDeadlineRecapCache: TradeDeadlineRecapView | null = null;

function teamName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function teamAbbreviation(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function tradeSignature(
  fromTeamId: string,
  toTeamId: string,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
): string {
  const serializeAsset = (asset: TradeAsset): string => {
    switch (asset.type) {
      case 'player':
        return `player:${asset.playerId}`;
      case 'draft_pick':
        return `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`;
      case 'ifa_pool_space':
        return `ifa:${asset.amount.toFixed(2)}`;
    }
  };
  const offered = [...offeringAssets].map(serializeAsset).sort().join(',');
  const requested = [...requestingAssets].map(serializeAsset).sort().join(',');
  return `${fromTeamId}->${toTeamId}:${offered}|${requested}`;
}

function ensureDraftPickOwnership(state: FullGameState, season: number) {
  if (state.draftState.pickOwnership.length > 0) {
    return;
  }

  state.draftState = {
    ...state.draftState,
    pickOwnership: createDefaultDraftPickOwnership(
      Array.from(new Set(state.players.map((player) => player.teamId).filter(Boolean))),
      season,
    ),
  };
}

function assetPlayerIds(assets: TradeAsset[]): string[] {
  return assets
    .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => asset.playerId);
}

function playerAssets(playerIds: string[]): TradeAsset[] {
  return playerIds.map((playerId) => ({
    type: 'player',
    playerId,
  }));
}

function assetViewFor(state: FullGameState, asset: TradeAsset): TradeAssetView {
  switch (asset.type) {
    case 'player': {
      const player = state.players.find((candidate) => candidate.id === asset.playerId);
      return {
        key: `player:${asset.playerId}`,
        type: asset.type,
        label: player ? `${player.firstName} ${player.lastName}` : asset.playerId,
        detail: player?.position ?? 'UNK',
        asset,
        playerId: asset.playerId,
      };
    }
    case 'draft_pick':
      return {
        key: `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`,
        type: asset.type,
        label: `Round ${asset.round} Pick`,
        detail: `${asset.season} ${teamAbbreviation(asset.originalTeamId)} original`,
        asset,
      };
    case 'ifa_pool_space':
      return {
        key: `ifa:${asset.amount.toFixed(2)}`,
        type: asset.type,
        label: `IFA Pool Space`,
        detail: `$${asset.amount.toFixed(2)}M`,
        asset,
      };
  }
}

function assetValue(state: FullGameState, asset: TradeAsset): number {
  switch (asset.type) {
    case 'player': {
      const player = state.players.find((candidate) => candidate.id === asset.playerId);
      if (!player) return 0;
      const offered = state.players.filter((candidate) => candidate.id === asset.playerId);
      return comparePackages(offered, []).offerValue;
    }
    case 'draft_pick': {
      const roundWeight = Math.max(1, 22 - asset.round);
      const seasonDiscount = asset.season === state.season ? 1 : 0.85;
      return roundWeight * 3 * seasonDiscount;
    }
    case 'ifa_pool_space':
      return asset.amount * 8;
  }
}

function playerRatingsForAssets(state: FullGameState, assets: TradeAsset[]): number[] {
  return assets
    .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => state.players.find((candidate) => candidate.id === asset.playerId)?.overallRating ?? 0)
    .filter((rating) => rating > 0);
}

function compareAssetPackages(
  state: FullGameState,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
  fromTeamId: string = state.userTeamId,
  toTeamId: string = '',
) {
  const offerValue = offeringAssets.reduce((sum, asset) => sum + assetValue(state, asset), 0);
  const requestValue = requestingAssets.reduce((sum, asset) => sum + assetValue(state, asset), 0);
  const maxValue = Math.max(offerValue, requestValue, 1);
  const rivalryPenalty = rivalryTradePenalty(
    state.rivalries,
    fromTeamId,
    toTeamId,
    playerRatingsForAssets(state, requestingAssets),
  );
  const fairness = getDifficultyAdjustedTradeFairness(
    state,
    Math.max(-100, Math.min(100, Math.round((((requestValue - offerValue) / maxValue) * 100) + rivalryPenalty))),
    fromTeamId,
    toTeamId,
  );
  return { fairness, offerValue, requestValue };
}

function applyTradeAssets(
  state: FullGameState,
  fromTeamId: string,
  toTeamId: string,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
) {
  const proposal: TradeProposal = {
    id: 'asset-trade',
    fromTeamId,
    toTeamId,
    playersOffered: assetPlayerIds(offeringAssets),
    playersRequested: assetPlayerIds(requestingAssets),
    status: 'accepted',
    reason: 'asset trade',
  };

  if (proposal.playersOffered.length > 0 || proposal.playersRequested.length > 0) {
    executeTrade(proposal, state.players);
  }

  ensureDraftPickOwnership(state, state.season);
  let pickOwnership = state.draftState.pickOwnership;

  for (const asset of offeringAssets) {
    if (asset.type === 'draft_pick') {
      pickOwnership = tradeDraftPickOwnershipCore(pickOwnership, asset, toTeamId);
    } else if (asset.type === 'ifa_pool_space') {
      state.internationalScoutingState = tradeIFABonusPoolCore(
        state.internationalScoutingState,
        fromTeamId,
        toTeamId,
        asset.amount,
      );
    }
  }

  for (const asset of requestingAssets) {
    if (asset.type === 'draft_pick') {
      pickOwnership = tradeDraftPickOwnershipCore(pickOwnership, asset, fromTeamId);
    } else if (asset.type === 'ifa_pool_space') {
      state.internationalScoutingState = tradeIFABonusPoolCore(
        state.internationalScoutingState,
        toTeamId,
        fromTeamId,
        asset.amount,
      );
    }
  }

  state.draftState = {
    ...state.draftState,
    pickOwnership,
  };
}

function createBriefingItem(headline: string, body: string, relatedPlayerIds: string[], relatedTeamIds: string[]): BriefingItem {
  return {
    id: `brief-${headline.replace(/\s+/g, '-').toLowerCase()}`,
    priority: 2,
    category: 'news',
    headline,
    body,
    relatedPlayerIds,
    relatedTeamIds,
    timestamp: '',
    acknowledged: false,
  };
}

function pushBriefing(state: FullGameState, item: BriefingItem) {
  const stamped = { ...item, timestamp: timestamp() };
  state.briefingQueue = [stamped, ...state.briefingQueue];
  rebuildBriefing(state);
}

function pushNewsAndBriefing(
  state: FullGameState,
  headline: string,
  body: string,
  relatedPlayerIds: string[],
  relatedTeamIds: string[],
) {
  const newsItem = {
    id: generateNewsId(state.rng.fork()),
    headline,
    body,
    priority: 2 as const,
    category: 'trade' as const,
    timestamp: timestamp(),
    relatedPlayerIds,
    relatedTeamIds,
    read: false,
  };
  state.news = deduplicateNews([newsItem, ...state.news]);
  pushBriefing(
    state,
    createBriefingItem(headline, body, relatedPlayerIds, relatedTeamIds),
  );
}

function applyDeclineMorale(state: FullGameState, playerIds: string[]) {
  for (const playerId of playerIds) {
    const player = state.players.find((candidate) => candidate.id === playerId && candidate.teamId === state.userTeamId);
    if (!player) continue;
    const current = state.playerMorale.get(player.id)
      ?? createInitialPlayerMorale(player, timestamp());
    state.playerMorale.set(player.id, applyMoraleEvent(player, current, {
      type: 'trade',
      impact: 3,
      summary: 'Front office turned away trade talks and kept the room intact.',
      timestamp: timestamp(),
    }));
  }

  state.teamChemistry.set(
    state.userTeamId,
    calculateTeamChemistry(state.userTeamId, state.players, state.playerMorale),
  );
}

function playersStillMatchProposal(state: FullGameState, proposal: TradeProposal): boolean {
  return proposal.playersOffered.every((playerId) =>
    state.players.some((player) => player.id === playerId && player.teamId === proposal.fromTeamId),
  ) && proposal.playersRequested.every((playerId) =>
    state.players.some((player) => player.id === playerId && player.teamId === proposal.toTeamId),
  );
}

function fairValueForProposal(state: FullGameState, proposal: TradeProposal): number {
  return compareAssetPackages(
    state,
    playerAssets(proposal.playersOffered),
    playerAssets(proposal.playersRequested),
    proposal.fromTeamId,
    proposal.toTeamId,
  ).fairness;
}

function applyUserFrontOfficeTradeOverride(
  result: ReturnType<typeof evaluateTradeProposal>,
  fairnessScore: number,
) {
  if (result.decision !== 'accepted' && fairnessScore >= -6) {
    return {
      decision: 'accepted' as const,
      reason: 'The value is close enough for a front office we respect.',
      counter: undefined,
    };
  }

  return result;
}

function buildAssetSummary(state: FullGameState, assets: TradeAsset[]): string {
  return assets
    .map((asset) => assetViewFor(state, asset).label)
    .slice(0, 2)
    .join(', ');
}

function buildTradeHistoryEntry(
  state: FullGameState,
  proposal: Pick<TradeProposal, 'id' | 'fromTeamId' | 'toTeamId'> & {
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
  fairnessScore: number,
): TradeHistoryEntry {
  const offeringNames = buildAssetSummary(state, proposal.offeringAssets);
  const requestingNames = buildAssetSummary(state, proposal.requestingAssets);

  return {
    id: proposal.id,
    fromTeamId: proposal.fromTeamId,
    toTeamId: proposal.toTeamId,
    offeringAssets: proposal.offeringAssets,
    requestingAssets: proposal.requestingAssets,
    fairnessScore,
    summary: `${teamName(proposal.fromTeamId)} sent ${offeringNames || 'assets'} to ${teamName(proposal.toTeamId)} for ${requestingNames || 'assets'}.`,
    timestamp: timestamp(),
  };
}

function addTradeHistoryEntry(state: FullGameState, entry: TradeHistoryEntry) {
  const next = [
    entry,
    ...state.tradeState.tradeHistory.filter((existing) => existing.id !== entry.id),
  ];
  state.tradeState = {
    ...state.tradeState,
    tradeHistory: next,
  };
}

function addPendingOffer(state: FullGameState, offer: PersistentTradeOffer) {
  const next = [
    offer,
    ...state.tradeState.pendingOffers.filter((existing) => existing.id !== offer.id),
  ];
  state.tradeState = {
    ...state.tradeState,
    pendingOffers: next,
  };
}

function removePendingOffer(state: FullGameState, offerId: string) {
  state.tradeState = {
    ...state.tradeState,
    pendingOffers: state.tradeState.pendingOffers.filter((offer) => offer.id !== offerId),
  };
}

function existingTradeSignatures(state: FullGameState): Set<string> {
  const signatures = new Set<string>();
  for (const offer of state.tradeState.pendingOffers) {
    signatures.add(tradeSignature(
      offer.fromTeamId,
      offer.toTeamId,
      offer.offeringAssets,
      offer.requestingAssets,
    ));
  }
  for (const history of state.tradeState.tradeHistory) {
    signatures.add(tradeSignature(
      history.fromTeamId,
      history.toTeamId,
      history.offeringAssets,
      history.requestingAssets,
    ));
  }
  return signatures;
}

function isContender(state: FullGameState, teamId: string): boolean {
  const record = state.seasonState.standings.getRecord(teamId);
  if (!record) return false;
  return record.wins >= record.losses;
}

function buildPersistentOffer(
  state: FullGameState,
  proposal: Pick<TradeProposal, 'id' | 'fromTeamId' | 'toTeamId' | 'reason'> & {
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
  fairnessScore: number,
): PersistentTradeOffer {
  return {
    id: proposal.id,
    fromTeamId: proposal.fromTeamId,
    toTeamId: proposal.toTeamId,
    offeringAssets: proposal.offeringAssets,
    requestingAssets: proposal.requestingAssets,
    fairnessScore,
    message: `The ${teamName(proposal.fromTeamId)} want to discuss a trade. ${proposal.reason}`,
    createdAt: timestamp(),
  };
}

function buildTradeViews<T extends PersistentTradeOffer | TradeHistoryEntry>(
  state: FullGameState,
  trades: T[],
) {
  return trades.map((trade) => ({
    ...trade,
    fromTeamName: teamName(trade.fromTeamId),
    fromTeamAbbreviation: teamAbbreviation(trade.fromTeamId),
    toTeamName: teamName(trade.toTeamId),
    toTeamAbbreviation: teamAbbreviation(trade.toTeamId),
    offeringAssets: trade.offeringAssets.map((asset) => assetViewFor(state, asset)),
    requestingAssets: trade.requestingAssets.map((asset) => assetViewFor(state, asset)),
  }));
}

function parseTimestampDay(stamp: string | undefined): number | null {
  if (!stamp) {
    return null;
  }

  const match = /^S(\d+)D(\d+)$/.exec(stamp);
  if (!match) {
    return null;
  }

  return Number(match[2]);
}

function tradeUrgencyTag(state: FullGameState, offer: PersistentTradeOffer): HotTradeOfferView['urgencyTag'] {
  const daysUntilDeadline = getDaysUntilTradeDeadline(state.day);
  const createdAtDay = parseTimestampDay(offer.createdAt);

  if (daysUntilDeadline <= 2) {
    return 'FINAL OFFER';
  }

  if (daysUntilDeadline <= 7 || (createdAtDay != null && state.day - createdAtDay >= 14)) {
    return 'EXPIRING SOON';
  }

  return 'ACTIVE';
}

function offerBidderCount(state: FullGameState, offer: PersistentTradeOffer): number {
  const requestedPlayers = offer.requestingAssets
    .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => asset.playerId);

  if (requestedPlayers.length === 0) {
    return 1;
  }

  let highestCount = 1;
  for (const playerId of requestedPlayers) {
    const directCompetition = state.tradeState.pendingOffers.filter((candidate) =>
      candidate.id !== offer.id
      && candidate.requestingAssets.some((asset) => asset.type === 'player' && asset.playerId === playerId),
    ).length;
    const player = state.players.find((candidate) => candidate.id === playerId);
    const contenderInterest = player
      && player.teamId === state.userTeamId
      && isTradeDeadlineModeDay(state.day)
      && player.contract.years <= 1
      ? Array.from(new Set(state.players.map((candidate) => candidate.teamId)))
        .filter((teamId): teamId is string => Boolean(teamId) && teamId !== state.userTeamId && isContender(state, teamId))
        .length
      : 0;

    highestCount = Math.max(
      highestCount,
      1 + directCompetition + Math.min(2, contenderInterest > 3 ? 2 : contenderInterest > 0 ? 1 : 0),
    );
  }

  return Math.min(highestCount, 5);
}

function offerBiddingSummary(state: FullGameState, offer: PersistentTradeOffer, bidderCount: number): string | null {
  if (bidderCount <= 1) {
    return null;
  }

  const primaryTarget = buildAssetSummary(state, offer.requestingAssets);
  return `${bidderCount} clubs are in on ${primaryTarget || 'this player'}.`;
}

function buildTickerItems(trades: TradeHistoryEntry[]): TradeTickerItem[] {
  return [...trades]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 8)
    .map((trade) => ({
      id: trade.id,
      summary: trade.summary,
      timestamp: trade.timestamp,
    }));
}

function isDeadlineTradeEntry(entry: TradeHistoryEntry, season: number): boolean {
  const match = /^S(\d+)D(\d+)$/.exec(entry.timestamp);
  if (!match) {
    return false;
  }

  const [, entrySeason, entryDay] = match;
  return Number(entrySeason) === season && Number(entryDay) >= 92 && Number(entryDay) <= TRADE_DEADLINE_DAY;
}

function buildDeadlineRecap(
  state: FullGameState,
  expiredOffers: PersistentTradeOffer[],
): TradeDeadlineRecapView | null {
  const deadlineTrades = state.tradeState.tradeHistory.filter((entry) => isDeadlineTradeEntry(entry, state.season));
  const yourTrades: TradeDeadlineRecapItem[] = [
    ...deadlineTrades
      .filter((entry) => entry.fromTeamId === state.userTeamId || entry.toTeamId === state.userTeamId)
      .map((entry) => ({
        id: entry.id,
        summary: entry.summary,
        outcome: 'completed' as const,
        timestamp: entry.timestamp,
      })),
    ...expiredOffers
      .filter((offer) => offer.toTeamId === state.userTeamId || offer.fromTeamId === state.userTeamId)
      .map((offer) => ({
        id: `missed-${offer.id}`,
        summary: `${teamName(offer.fromTeamId)} offer for ${buildAssetSummary(state, offer.requestingAssets) || 'assets'} expired at the deadline.`,
        outcome: 'missed' as const,
        timestamp: timestamp(),
      })),
  ];

  if (deadlineTrades.length === 0 && yourTrades.length === 0) {
    return null;
  }

  const scoreByTeam = new Map<string, number>();
  for (const trade of deadlineTrades) {
    scoreByTeam.set(trade.fromTeamId, (scoreByTeam.get(trade.fromTeamId) ?? 0) + trade.fairnessScore);
    scoreByTeam.set(trade.toTeamId, (scoreByTeam.get(trade.toTeamId) ?? 0) - trade.fairnessScore);
  }

  const rankedTeams = [...scoreByTeam.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const winners = rankedTeams
    .filter(([, score]) => score > 0)
    .slice(0, 2)
    .map(([teamId]) => teamName(teamId));
  const losers = [...rankedTeams]
    .reverse()
    .filter(([, score]) => score < 0)
    .slice(0, 2)
    .map(([teamId]) => teamName(teamId));
  const analysisHeadline = 'Deadline winners and losers';
  const analysisBody = [
    winners.length > 0 ? `Winners: ${winners.join(', ')} pushed the market hardest.` : 'No clear league-wide winner emerged.',
    losers.length > 0 ? `Losers: ${losers.join(', ')} paid a steeper price or stood still.` : 'No obvious loser separated from the pack.',
    yourTrades.length > 0
      ? `${yourTrades.filter((trade) => trade.outcome === 'completed').length} completed move${yourTrades.filter((trade) => trade.outcome === 'completed').length === 1 ? '' : 's'} and ${yourTrades.filter((trade) => trade.outcome === 'missed').length} missed thread${yourTrades.filter((trade) => trade.outcome === 'missed').length === 1 ? '' : 's'} shaped your day.`
      : 'Your club stayed quiet as the deadline passed.',
  ].join(' ');

  return {
    season: state.season,
    deadlineDay: TRADE_DEADLINE_DAY,
    analysisHeadline,
    analysisBody,
    yourTrades,
    majorMoves: buildTickerItems(deadlineTrades).slice(0, 5),
    winners,
    losers,
  };
}

function publishDeadlineAnalysis(state: FullGameState, recap: TradeDeadlineRecapView) {
  const analysisItem = {
    id: `deadline-analysis-${state.season}`,
    headline: recap.analysisHeadline,
    body: recap.analysisBody,
    priority: 2 as const,
    category: 'trade' as const,
    tag: 'ANALYSIS' as const,
    timestamp: timestamp(),
    relatedPlayerIds: [],
    relatedTeamIds: [state.userTeamId],
    read: false,
  };

  state.news = deduplicateNews([analysisItem, ...state.news]);
  pushBriefing(
    state,
    createBriefingItem(recap.analysisHeadline, recap.analysisBody, [], [state.userTeamId]),
  );
}

function positionNeedLabel(position: string): string {
  switch (position) {
    case 'SP':
      return 'rotation help';
    case 'RP':
    case 'CL':
      return 'bullpen depth';
    case 'SS':
      return 'middle-infield help';
    case 'CF':
      return 'center-field help';
    case 'depth':
      return 'depth';
    default:
      return `${position.toLowerCase()} depth`;
  }
}

function recordTradeRumor(state: FullGameState, proposal: TradeProposal) {
  const targetPlayer = state.players.find((player) => player.id === proposal.playersRequested[0]);
  const rumorItems = generateNews(
    state.rng.fork(),
    {
      type: 'rumor',
      season: state.season,
      day: state.day,
      data: {
        teamId: proposal.fromTeamId,
        teamName: teamName(proposal.fromTeamId),
        targetPlayerId: proposal.playersRequested[0],
        targetName: targetPlayer ? `${targetPlayer.firstName} ${targetPlayer.lastName}` : 'a league target',
        need: positionNeedLabel(targetPlayer?.position ?? 'depth'),
        daysToDeadline: getDaysUntilTradeDeadline(state.day),
      },
    },
    state.players,
    state.season,
    state.day,
  );

  if (rumorItems.length === 0) {
    return;
  }

  state.news = deduplicateNews([...rumorItems, ...state.news]);
}

export function isTradeMarketOpen(state: FullGameState): boolean {
  return state.phase === 'regular' && state.day <= TRADE_DEADLINE_DAY;
}

export function buildTradeOffersView(state: FullGameState): TradeOfferView[] {
  return buildTradeViews(state, state.tradeState.pendingOffers) as TradeOfferView[];
}

export function buildTradeHistoryView(state: FullGameState): TradeHistoryView[] {
  return buildTradeViews(state, state.tradeState.tradeHistory) as TradeHistoryView[];
}

function buildHotTradeOfferView(state: FullGameState, offer: PersistentTradeOffer): HotTradeOfferView {
  const bidderCount = offerBidderCount(state, offer);
  return {
    ...(buildTradeViews(state, [offer])[0] as TradeOfferView),
    urgencyTag: tradeUrgencyTag(state, offer),
    bidderCount,
    biddingSummary: offerBiddingSummary(state, offer, bidderCount),
  };
}

function deriveTradeDeadlineRecap(state: FullGameState): TradeDeadlineRecapView | null {
  if (tradeDeadlineRecapCache?.season === state.season) {
    return tradeDeadlineRecapCache;
  }

  if (state.day <= TRADE_DEADLINE_DAY) {
    return null;
  }

  return buildDeadlineRecap(state, []);
}

export function buildTradeDeadlineStateView(state: FullGameState): TradeDeadlineStateView {
  return {
    deadlineDay: TRADE_DEADLINE_DAY,
    daysUntilDeadline:
      state.phase === 'regular' && state.day <= TRADE_DEADLINE_DAY
        ? getDaysUntilTradeDeadline(state.day)
        : null,
    deadlineMode: state.phase === 'regular' && isTradeDeadlineModeDay(state.day),
    hotOffers: state.tradeState.pendingOffers.map((offer) => buildHotTradeOfferView(state, offer)),
    ticker: buildTickerItems(state.tradeState.tradeHistory),
    recap: deriveTradeDeadlineRecap(state),
  };
}

export function buildTradeAssetInventoryView(state: FullGameState, teamId: string): TradeAssetInventoryView {
  ensureDraftPickOwnership(state, state.season);
  const draftPicks = state.draftState.pickOwnership
    .filter((pick) =>
      pick.currentTeamId === teamId
      && !pick.forfeited
      && (pick.season === state.season || pick.season === state.season + 1),
    )
    .sort((left, right) => left.season - right.season || left.round - right.round || left.originalTeamId.localeCompare(right.originalTeamId))
    .map((pick) => {
      const asset = {
        type: 'draft_pick' as const,
        season: pick.season,
        round: pick.round,
        originalTeamId: pick.originalTeamId,
      };
      return {
        key: `draft:${pick.season}:${pick.round}:${pick.originalTeamId}`,
        label: `R${pick.round} ${pick.season}`,
        detail: `${teamAbbreviation(pick.originalTeamId)} original`,
        asset,
      };
    });

  const budget = state.internationalScoutingState.budgets.get(teamId);
  return {
    draftPicks,
    ifaRemaining: budget ? getRemainingIFABudget(budget) : 0,
  };
}

export function clearPendingTradeOffers(state: FullGameState) {
  if (state.tradeState.pendingOffers.length === 0) return;
  state.tradeState = {
    ...state.tradeState,
    pendingOffers: [],
  };
}

export function resetTradeDeadlineState() {
  tradeDeadlineRecapCache = null;
}

function recordLeagueTradeNews(state: FullGameState, proposal: TradeProposal) {
  const players = state.players.filter((player) =>
    proposal.playersOffered.includes(player.id) || proposal.playersRequested.includes(player.id),
  );
  const items = generateNews(
    state.rng.fork(),
    {
      type: 'trade',
      season: state.season,
      day: state.day,
      data: {
        player1Id: proposal.playersOffered[0],
        player2Id: proposal.playersRequested[0],
        team1Id: proposal.fromTeamId,
        team2Id: proposal.toTeamId,
        team1Name: teamName(proposal.fromTeamId),
        team2Name: teamName(proposal.toTeamId),
      },
    },
    players,
    state.season,
    state.day,
  );

  if (items.length === 0) return;

  const taggedItems = isTradeDeadlineModeDay(state.day)
    ? items.map((item) => ({
      ...item,
      tag: 'BREAKING' as const,
    }))
    : items;

  state.news = deduplicateNews([...taggedItems, ...state.news]);
  const userDivision = getTeamById(state.userTeamId)?.division;
  const involvesRelevantTeam = [proposal.fromTeamId, proposal.toTeamId].some((teamId) =>
    teamId === state.userTeamId || getTeamById(teamId)?.division === userDivision,
  );
  if (involvesRelevantTeam) {
    for (const item of taggedItems) {
      pushBriefing(state, createBriefingItem(item.headline, item.body, item.relatedPlayerIds, item.relatedTeamIds));
    }
  }
}

function executeAcceptedTrade(
  state: FullGameState,
  proposal: Pick<TradeProposal, 'id' | 'fromTeamId' | 'toTeamId'> & {
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
  fairnessScore: number,
) {
  const tradePackageValue = compareAssetPackages(
    state,
    proposal.offeringAssets,
    proposal.requestingAssets,
    proposal.fromTeamId,
    proposal.toTeamId,
  );
  const tradeImpactScore = Math.max(tradePackageValue.offerValue, tradePackageValue.requestValue);
  applyTradeAssets(state, proposal.fromTeamId, proposal.toTeamId, proposal.offeringAssets, proposal.requestingAssets);
  state.rosterStates.set(proposal.fromTeamId, buildRosterState(proposal.fromTeamId, state.players));
  state.rosterStates.set(proposal.toTeamId, buildRosterState(proposal.toTeamId, state.players));
  addTradeHistoryEntry(state, buildTradeHistoryEntry(state, proposal, fairnessScore));
  state.rivalries = recordBlockbusterTradeRivalry(state.rivalries, {
    season: state.season,
    fromTeamId: proposal.fromTeamId,
    toTeamId: proposal.toTeamId,
    impactScore: tradeImpactScore,
    summary: 'Blockbuster trade changed the tone of the matchup',
  });
}

function buildMonthlyTradeCandidates(state: FullGameState) {
  const userCandidates: TradeProposal[] = [];
  const aiCandidates: TradeProposal[] = [];
  const signatures = existingTradeSignatures(state);
  const contenderTeamIds = Array.from(
    new Set(
      state.players
        .map((player) => player.teamId)
        .filter((teamId): teamId is string => Boolean(teamId) && isContender(state, teamId)),
    ),
  );

  for (const team of Array.from(new Set(state.players.map((player) => player.teamId))).filter((teamId) => teamId && teamId !== state.userTeamId)) {
    const gm = state.gmPersonalities.get(team);
    if (!gm) continue;

    const proposals = generateAITradeOffers(
      state.rng.fork(),
      team,
      getTeamPlayers(team),
      state.players,
      gm,
      isContender(state, team),
      {
        currentDay: state.day,
        contenderTeamIds,
      },
    );

    for (const proposal of proposals) {
      if (!playersStillMatchProposal(state, proposal)) continue;

      const signature = tradeSignature(
        proposal.fromTeamId,
        proposal.toTeamId,
        playerAssets(proposal.playersOffered),
        playerAssets(proposal.playersRequested),
      );
      if (signatures.has(signature)) continue;
      signatures.add(signature);

      if (proposal.toTeamId === state.userTeamId) {
        userCandidates.push(proposal);
      } else if (proposal.fromTeamId !== state.userTeamId) {
        aiCandidates.push(proposal);
      }
    }
  }

  return {
    userCandidates: state.rng
      .shuffle(userCandidates)
      .sort((left, right) => fairValueForProposal(state, right) - fairValueForProposal(state, left)),
    aiCandidates: state.rng.shuffle(aiCandidates),
  };
}

function rankedDeadlineTeams(state: FullGameState, excludeTeamIds: string[] = []): string[] {
  const excluded = new Set(excludeTeamIds);
  return Array.from(new Set(state.players.map((player) => player.teamId).filter(Boolean)))
    .filter((teamId): teamId is string => Boolean(teamId) && !excluded.has(teamId))
    .sort((left, right) => {
      const leftAggressive = state.gmPersonalities.get(left) === 'aggressive' ? 1 : 0;
      const rightAggressive = state.gmPersonalities.get(right) === 'aggressive' ? 1 : 0;
      if (rightAggressive !== leftAggressive) {
        return rightAggressive - leftAggressive;
      }
      const leftContender = isContender(state, left) ? 1 : 0;
      const rightContender = isContender(state, right) ? 1 : 0;
      if (rightContender !== leftContender) {
        return rightContender - leftContender;
      }
      return left.localeCompare(right);
    });
}

function pickFallbackTradeChip(
  state: FullGameState,
  teamId: string,
  direction: 'offer' | 'target',
) {
  const players = state.players
    .filter((player) =>
      player.teamId === teamId
      && player.rosterStatus === 'MLB'
      && player.pitcherAttributes == null,
    )
    .sort((left, right) => {
      if (direction === 'target') {
        if (left.contract.years !== right.contract.years) {
          return left.contract.years - right.contract.years;
        }
      }
      if (right.overallRating !== left.overallRating) {
        return right.overallRating - left.overallRating;
      }
      return left.id.localeCompare(right.id);
    });

  return players[0] ?? null;
}

function buildFallbackTradePackage(
  state: FullGameState,
  fromTeamId: string,
  toTeamId: string,
) {
  const offered = pickFallbackTradeChip(state, fromTeamId, 'offer');
  const requested = pickFallbackTradeChip(state, toTeamId, 'target');
  if (!offered || !requested || offered.id === requested.id) {
    return null;
  }

  const offeringAssets = playerAssets([offered.id]);
  const requestingAssets = playerAssets([requested.id]);
  return {
    offeringAssets,
    requestingAssets,
    fairnessScore: compareAssetPackages(state, offeringAssets, requestingAssets, fromTeamId, toTeamId).fairness,
  };
}

function createFallbackUserDeadlineOffer(state: FullGameState): boolean {
  const signatures = existingTradeSignatures(state);

  for (const fromTeamId of rankedDeadlineTeams(state, [state.userTeamId])) {
    const fallback = buildFallbackTradePackage(state, fromTeamId, state.userTeamId);
    if (!fallback) {
      continue;
    }

    const signature = tradeSignature(
      fromTeamId,
      state.userTeamId,
      fallback.offeringAssets,
      fallback.requestingAssets,
    );
    if (signatures.has(signature)) {
      continue;
    }

    addPendingOffer(state, {
      id: `deadline-fallback-offer-${state.season}-${state.day}-${fromTeamId}`,
      fromTeamId,
      toTeamId: state.userTeamId,
      offeringAssets: fallback.offeringAssets,
      requestingAssets: fallback.requestingAssets,
      fairnessScore: fallback.fairnessScore,
      message: `The ${teamName(fromTeamId)} are making one more push before the deadline.`,
      createdAt: timestamp(),
    });
    return true;
  }

  return false;
}

function createFallbackLeagueDeadlineTrade(state: FullGameState): boolean {
  const signatures = existingTradeSignatures(state);
  const rankedTeams = rankedDeadlineTeams(state, [state.userTeamId]);

  for (const fromTeamId of rankedTeams) {
    for (const toTeamId of rankedTeams) {
      if (fromTeamId === toTeamId) {
        continue;
      }

      const fallback = buildFallbackTradePackage(state, fromTeamId, toTeamId);
      if (!fallback) {
        continue;
      }

      const signature = tradeSignature(
        fromTeamId,
        toTeamId,
        fallback.offeringAssets,
        fallback.requestingAssets,
      );
      if (signatures.has(signature)) {
        continue;
      }

      executeAcceptedTrade(state, {
        id: `deadline-fallback-trade-${state.season}-${state.day}-${fromTeamId}-${toTeamId}`,
        fromTeamId,
        toTeamId,
        offeringAssets: fallback.offeringAssets,
        requestingAssets: fallback.requestingAssets,
      }, fallback.fairnessScore);
      advanceTradeSagaClimax(
        state,
        [...assetPlayerIds(fallback.offeringAssets), ...assetPlayerIds(fallback.requestingAssets)],
      );
      recordLeagueTradeNews(state, {
        id: `deadline-fallback-trade-${state.season}-${state.day}-${fromTeamId}-${toTeamId}`,
        fromTeamId,
        toTeamId,
        playersOffered: assetPlayerIds(fallback.offeringAssets),
        playersRequested: assetPlayerIds(fallback.requestingAssets),
        status: 'accepted',
        reason: 'deadline fallback',
      });
      return true;
    }
  }

  return false;
}

function generateMonthlyTradeActivity(
  state: FullGameState,
  options: {
    userOfferRange?: readonly [number, number];
    aiTradeRange?: readonly [number, number];
    rumorRepeats?: number;
  } = {},
) {
  const { userCandidates, aiCandidates } = buildMonthlyTradeCandidates(state);
  const [userOfferMin, userOfferMax] = options.userOfferRange ?? [2, 4];
  const [aiTradeMin, aiTradeMax] = options.aiTradeRange ?? [1, 2];
  const rumorRepeats = options.rumorRepeats ?? 1;
  const userOfferTarget = state.rng.nextInt(userOfferMin, Math.max(userOfferMin, userOfferMax));

  for (const proposal of userCandidates.slice(0, userOfferTarget)) {
    for (let repeat = 0; repeat < rumorRepeats; repeat++) {
      recordTradeRumor(state, proposal);
    }
    const fairnessScore = fairValueForProposal(state, proposal);
    addPendingOffer(state, buildPersistentOffer(state, {
      ...proposal,
      offeringAssets: playerAssets(proposal.playersOffered),
      requestingAssets: playerAssets(proposal.playersRequested),
    }, fairnessScore));
  }

  const aiTradeTarget = state.rng.nextInt(aiTradeMin, Math.max(aiTradeMin, aiTradeMax));
  for (const proposal of aiCandidates.slice(0, aiTradeTarget)) {
    for (let repeat = 0; repeat < rumorRepeats; repeat++) {
      recordTradeRumor(state, proposal);
    }
    const gm = state.gmPersonalities.get(proposal.toTeamId);
    if (!gm || !playersStillMatchProposal(state, proposal)) continue;
    const result = evaluateTradeProposal(
      state.rng.fork(),
      proposal,
      getTeamPlayers(proposal.fromTeamId),
      getTeamPlayers(proposal.toTeamId),
      gm,
      isContender(state, proposal.toTeamId),
    );
    if (result.decision !== 'accepted') continue;

    const fairnessScore = fairValueForProposal(state, proposal);
    executeAcceptedTrade(state, {
      ...proposal,
      offeringAssets: playerAssets(proposal.playersOffered),
      requestingAssets: playerAssets(proposal.playersRequested),
    }, fairnessScore);
    advanceTradeSagaClimax(
      state,
      [...proposal.playersOffered, ...proposal.playersRequested],
    );
    recordLeagueTradeNews(state, proposal);
  }
}

function generateDeadlineTradeBurst(state: FullGameState) {
  const pendingOffersBefore = state.tradeState.pendingOffers.length;
  const tradeHistoryBefore = state.tradeState.tradeHistory.length;
  generateMonthlyTradeActivity(state, {
    userOfferRange: [3, 5],
    aiTradeRange: [3, 5],
    rumorRepeats: 4,
  });

  if (state.tradeState.pendingOffers.length === pendingOffersBefore) {
    createFallbackUserDeadlineOffer(state);
  }

  let fallbackTradesCreated = 0;
  while (
    state.tradeState.tradeHistory.length < tradeHistoryBefore + 3
    && fallbackTradesCreated < 3
  ) {
    if (!createFallbackLeagueDeadlineTrade(state)) {
      break;
    }
    fallbackTradesCreated += 1;
  }
}

export function processTradeMarketActivity(
  state: FullGameState,
  previousDay: number,
  currentDay: number,
) {
  if (state.phase !== 'regular' || currentDay <= previousDay) {
    return;
  }

  if (previousDay <= TRADE_DEADLINE_DAY && currentDay > TRADE_DEADLINE_DAY) {
    const expiredOffers = [...state.tradeState.pendingOffers];
    tradeDeadlineRecapCache = buildDeadlineRecap(state, expiredOffers);
    if (tradeDeadlineRecapCache) {
      publishDeadlineAnalysis(state, tradeDeadlineRecapCache);
    }
    clearPendingTradeOffers(state);
  }

  const previousWindow = Math.floor((Math.max(previousDay, 1) - 1) / 30);
  const currentWindow = Math.floor((Math.max(currentDay, 1) - 1) / 30);
  for (let windowIndex = previousWindow + 1; windowIndex <= currentWindow; windowIndex++) {
    const windowStartDay = windowIndex * 30 + 1;
    if (windowStartDay > TRADE_DEADLINE_DAY) continue;
    generateMonthlyTradeActivity(state);
  }

  for (const checkpointDay of DEADLINE_ACTIVITY_CHECKPOINTS) {
    if (previousDay < checkpointDay && checkpointDay <= currentDay && checkpointDay <= TRADE_DEADLINE_DAY) {
      generateDeadlineTradeBurst(state);
    }
  }
}

export function recordAcceptedUserTrade(
  state: FullGameState,
  proposal: {
    id: string;
    fromTeamId: string;
    toTeamId: string;
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
) {
  addTradeHistoryEntry(state, buildTradeHistoryEntry(
    state,
    proposal,
    compareAssetPackages(state, proposal.offeringAssets, proposal.requestingAssets, proposal.fromTeamId, proposal.toTeamId).fairness,
  ));
}

function validateTradeAssetsForTeam(
  state: FullGameState,
  teamId: string,
  assets: TradeAsset[],
): string | null {
  ensureDraftPickOwnership(state, state.season);

  for (const asset of assets) {
    if (asset.type === 'player') {
      const player = state.players.find((candidate) => candidate.id === asset.playerId);
      if (!player || player.teamId !== teamId) {
        return 'Trade package includes a player not controlled by that team.';
      }
      continue;
    }

    if (asset.type === 'draft_pick') {
      const pick = state.draftState.pickOwnership.find((entry) =>
        entry.season === asset.season
        && entry.round === asset.round
        && entry.originalTeamId === asset.originalTeamId,
      );
      if (!pick || pick.currentTeamId !== teamId || pick.forfeited) {
        return 'Trade package includes a draft pick not owned by that team.';
      }
      continue;
    }

    const budget = state.internationalScoutingState.budgets.get(teamId);
    if (!budget || getRemainingIFABudget(budget) < asset.amount) {
      return 'Trade package includes IFA pool space that exceeds the available balance.';
    }
  }

  return null;
}

function hasNonPlayerAssets(assets: TradeAsset[]): boolean {
  return assets.some((asset) => asset.type !== 'player');
}

export function proposeTradePackage(
  state: FullGameState,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
  toTeamId: string,
) {
  if (!isTradeMarketOpen(state)) {
    return { decision: 'rejected', reason: 'Trade market closed — reopens in offseason' };
  }

  const gm = state.gmPersonalities.get(toTeamId);
  if (!gm) {
    return { decision: 'rejected', reason: 'Unknown team' };
  }

  const offeredValidation = validateTradeAssetsForTeam(state, state.userTeamId, offeringAssets);
  if (offeredValidation) {
    return { decision: 'rejected', reason: offeredValidation };
  }

  const requestedValidation = validateTradeAssetsForTeam(state, toTeamId, requestingAssets);
  if (requestedValidation) {
    return { decision: 'rejected', reason: requestedValidation };
  }

  const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
  const preTradePartnerPlayers = getTeamPlayers(toTeamId);
  const playerOnlyProposal: TradeProposal = {
    id: `user-${timestamp()}`,
    fromTeamId: state.userTeamId,
    toTeamId,
    playersOffered: assetPlayerIds(offeringAssets),
    playersRequested: assetPlayerIds(requestingAssets),
    status: 'proposed',
    reason: '',
  };

  const fairnessScore = compareAssetPackages(state, offeringAssets, requestingAssets, state.userTeamId, toTeamId).fairness;
  const usesNonPlayerAssets = hasNonPlayerAssets(offeringAssets) || hasNonPlayerAssets(requestingAssets);
  const evaluation = usesNonPlayerAssets
    ? {
      decision: (-fairnessScore >= -10 ? 'accepted' : 'rejected') as 'accepted' | 'rejected',
      reason: -fairnessScore >= -10 ? 'The value framework works for us.' : 'The value gap is too wide for us.',
      counter: undefined,
    }
    : evaluateTradeProposal(
      state.rng.fork(),
      playerOnlyProposal,
      preTradeUserPlayers,
      preTradePartnerPlayers,
      gm,
      false,
    );
  const result = applyUserFrontOfficeTradeOverride(evaluation, fairnessScore);

  if (result.decision === 'accepted') {
    executeAcceptedTrade(state, {
      id: playerOnlyProposal.id,
      fromTeamId: state.userTeamId,
      toTeamId,
      offeringAssets,
      requestingAssets,
    }, fairnessScore);
    advanceTradeSagaClimax(
      state,
      [...assetPlayerIds(offeringAssets), ...assetPlayerIds(requestingAssets)],
    );
    applyTradeConsequences(
      state,
      assetPlayerIds(offeringAssets),
      assetPlayerIds(requestingAssets),
      toTeamId,
      preTradeUserPlayers,
      preTradePartnerPlayers,
    );
  }

  return {
    decision: result.decision,
    reason: result.reason,
    counter: result.counter
      ? {
        ...result.counter,
        offeringAssets: playerAssets(result.counter.playersOffered),
        requestingAssets: playerAssets(result.counter.playersRequested),
      }
      : undefined,
  };
}

export function respondToTradeOffer(
  state: FullGameState,
  offerId: string,
  action: 'accept' | 'decline' | 'counter',
  counterPackage?: TradeCounterPackage,
): TradeOfferResponseResult {
  const offer = state.tradeState.pendingOffers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    return { success: false, decision: 'rejected', message: 'Trade offer no longer exists.' };
  }

  const proposal: TradeProposal = {
    id: offer.id,
    fromTeamId: offer.fromTeamId,
    toTeamId: offer.toTeamId,
    playersOffered: assetPlayerIds(offer.offeringAssets),
    playersRequested: assetPlayerIds(offer.requestingAssets),
    status: 'proposed',
    reason: offer.message,
  };
  const offerPlayerIds = assetPlayerIds(offer.offeringAssets);
  const requestedPlayerIds = assetPlayerIds(offer.requestingAssets);

  if (action === 'decline') {
    removePendingOffer(state, offerId);
    applyDeclineMorale(state, requestedPlayerIds);
    pushNewsAndBriefing(
      state,
      `${teamName(offer.fromTeamId)} offer declined`,
      `${teamName(state.userTeamId)} declined a trade proposal involving ${assetViewFor(state, offer.requestingAssets[0] ?? { type: 'ifa_pool_space', amount: 0.01 }).label}.`,
      [...offerPlayerIds, ...requestedPlayerIds],
      [offer.fromTeamId, offer.toTeamId],
    );
    return {
      success: true,
      decision: 'declined',
      message: 'Offer declined and the room took note.',
    };
  }

  if (action === 'accept') {
    if (!isTradeMarketOpen(state) || !playersStillMatchProposal(state, proposal)) {
      removePendingOffer(state, offerId);
      return {
        success: false,
        decision: 'rejected',
        message: 'That offer is no longer actionable.',
      };
    }

    const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
    const preTradePartnerPlayers = getTeamPlayers(offer.fromTeamId);
    executeAcceptedTrade(state, {
      id: proposal.id,
      fromTeamId: proposal.fromTeamId,
      toTeamId: proposal.toTeamId,
      offeringAssets: offer.offeringAssets,
      requestingAssets: offer.requestingAssets,
    }, offer.fairnessScore);
    removePendingOffer(state, offerId);
    advanceTradeSagaClimax(
      state,
      [...requestedPlayerIds, ...offerPlayerIds],
    );
    applyTradeConsequences(
      state,
      requestedPlayerIds,
      offerPlayerIds,
      offer.fromTeamId,
      preTradeUserPlayers,
      preTradePartnerPlayers,
    );
    return {
      success: true,
      decision: 'accepted',
      message: 'Trade accepted.',
    };
  }

  if (!counterPackage || !isTradeMarketOpen(state)) {
    return {
      success: false,
      decision: 'rejected',
      message: 'Counter-offer could not be sent.',
    };
  }

  const counterProposal: TradeProposal = {
    id: offer.id,
    fromTeamId: state.userTeamId,
    toTeamId: offer.fromTeamId,
    playersOffered: assetPlayerIds(counterPackage.offeringAssets),
    playersRequested: assetPlayerIds(counterPackage.requestingAssets),
    status: 'proposed',
    reason: 'Counter-offer from user GM',
  };

  const gm = state.gmPersonalities.get(offer.fromTeamId);
  if (!gm) {
    return { success: false, decision: 'rejected', message: 'Unable to reach the other front office.' };
  }

  const usesNonPlayerAssets = hasNonPlayerAssets(counterPackage.offeringAssets) || hasNonPlayerAssets(counterPackage.requestingAssets);
  const counterFairness = compareAssetPackages(
    state,
    counterPackage.offeringAssets,
    counterPackage.requestingAssets,
    state.userTeamId,
    offer.fromTeamId,
  ).fairness;
  const evaluation = usesNonPlayerAssets
    ? {
      decision: (-counterFairness >= -10
        ? 'accepted'
        : 'rejected') as 'accepted' | 'rejected',
      reason: 'Counter framework evaluated.',
      counter: undefined,
    }
    : evaluateTradeProposal(
      state.rng.fork(),
      counterProposal,
      getTeamPlayers(state.userTeamId),
      getTeamPlayers(offer.fromTeamId),
      gm,
      isContender(state, offer.fromTeamId),
    );
  const result = applyUserFrontOfficeTradeOverride(evaluation, counterFairness);

  removePendingOffer(state, offerId);

  if (result.decision === 'accepted') {
    const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
    const preTradePartnerPlayers = getTeamPlayers(offer.fromTeamId);
    const fairnessScore = compareAssetPackages(
      state,
      counterPackage.offeringAssets,
      counterPackage.requestingAssets,
      state.userTeamId,
      offer.fromTeamId,
    ).fairness;
    executeAcceptedTrade(state, {
      id: counterProposal.id,
      fromTeamId: counterProposal.fromTeamId,
      toTeamId: counterProposal.toTeamId,
      offeringAssets: counterPackage.offeringAssets,
      requestingAssets: counterPackage.requestingAssets,
    }, fairnessScore);
    advanceTradeSagaClimax(
      state,
      [...counterProposal.playersOffered, ...counterProposal.playersRequested],
    );
    applyTradeConsequences(
      state,
      counterProposal.playersOffered,
      counterProposal.playersRequested,
      counterProposal.toTeamId,
      preTradeUserPlayers,
      preTradePartnerPlayers,
    );
    return {
      success: true,
      decision: 'accepted',
      message: 'Counter-offer accepted.',
    };
  }

  if (result.decision === 'countered' && result.counter) {
    const fairnessScore = fairValueForProposal(state, result.counter);
    addPendingOffer(state, buildPersistentOffer(state, {
      ...result.counter,
      offeringAssets: playerAssets(result.counter.playersOffered),
      requestingAssets: playerAssets(result.counter.playersRequested),
    }, fairnessScore));
    pushNewsAndBriefing(
      state,
      `${teamName(offer.fromTeamId)} countered back`,
      `${teamName(offer.fromTeamId)} sent a revised trade framework back to ${teamName(state.userTeamId)}.`,
      [...result.counter.playersOffered, ...result.counter.playersRequested],
      [result.counter.fromTeamId, result.counter.toTeamId],
    );
    return {
      success: true,
      decision: 'countered',
      message: 'The other GM sent a revised proposal.',
    };
  }

  pushNewsAndBriefing(
    state,
    `${teamName(offer.fromTeamId)} walked away from talks`,
    `${teamName(offer.fromTeamId)} rejected the counter-offer.`,
    [...counterProposal.playersOffered, ...counterProposal.playersRequested],
    [offer.fromTeamId, state.userTeamId],
  );
  return {
    success: true,
    decision: 'rejected',
    message: result.reason,
  };
}
