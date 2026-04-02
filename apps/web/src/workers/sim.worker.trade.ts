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
  getRemainingIFABudget,
  getTeamById,
  tradeDraftPickOwnership as tradeDraftPickOwnershipCore,
  tradeIFABonusPool as tradeIFABonusPoolCore,
} from '@mbd/sim-core';
import type { TradeProposal } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import { getTeamPlayers, timestamp } from './sim.worker.helpers.js';
import { applyTradeConsequences } from './sim.worker.consequences.js';
import { rebuildBriefing } from './sim.worker.narrative.js';

export const TRADE_DEADLINE_DAY = 120;

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

function compareAssetPackages(
  state: FullGameState,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
) {
  const offerValue = offeringAssets.reduce((sum, asset) => sum + assetValue(state, asset), 0);
  const requestValue = requestingAssets.reduce((sum, asset) => sum + assetValue(state, asset), 0);
  const maxValue = Math.max(offerValue, requestValue, 1);
  const fairness = Math.max(-100, Math.min(100, Math.round(((requestValue - offerValue) / maxValue) * 100)));
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
  const offered = state.players.filter((player) => proposal.playersOffered.includes(player.id));
  const requested = state.players.filter((player) => proposal.playersRequested.includes(player.id));
  return comparePackages(offered, requested).fairness;
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

export function isTradeMarketOpen(state: FullGameState): boolean {
  return state.phase === 'regular' && state.day <= TRADE_DEADLINE_DAY;
}

export function buildTradeOffersView(state: FullGameState): TradeOfferView[] {
  return buildTradeViews(state, state.tradeState.pendingOffers) as TradeOfferView[];
}

export function buildTradeHistoryView(state: FullGameState): TradeHistoryView[] {
  return buildTradeViews(state, state.tradeState.tradeHistory) as TradeHistoryView[];
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

  state.news = deduplicateNews([...items, ...state.news]);
  const userDivision = getTeamById(state.userTeamId)?.division;
  const involvesRelevantTeam = [proposal.fromTeamId, proposal.toTeamId].some((teamId) =>
    teamId === state.userTeamId || getTeamById(teamId)?.division === userDivision,
  );
  if (involvesRelevantTeam) {
    for (const item of items) {
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
  applyTradeAssets(state, proposal.fromTeamId, proposal.toTeamId, proposal.offeringAssets, proposal.requestingAssets);
  state.rosterStates.set(proposal.fromTeamId, buildRosterState(proposal.fromTeamId, state.players));
  state.rosterStates.set(proposal.toTeamId, buildRosterState(proposal.toTeamId, state.players));
  addTradeHistoryEntry(state, buildTradeHistoryEntry(state, proposal, fairnessScore));
}

function buildMonthlyTradeCandidates(state: FullGameState) {
  const userCandidates: TradeProposal[] = [];
  const aiCandidates: TradeProposal[] = [];
  const signatures = existingTradeSignatures(state);

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
    userCandidates: state.rng.shuffle(userCandidates),
    aiCandidates: state.rng.shuffle(aiCandidates),
  };
}

function generateMonthlyTradeActivity(state: FullGameState) {
  const { userCandidates, aiCandidates } = buildMonthlyTradeCandidates(state);
  const userOfferTarget = state.rng.nextInt(1, 3);

  for (const proposal of userCandidates.slice(0, userOfferTarget)) {
    const fairnessScore = fairValueForProposal(state, proposal);
    addPendingOffer(state, buildPersistentOffer(state, {
      ...proposal,
      offeringAssets: playerAssets(proposal.playersOffered),
      requestingAssets: playerAssets(proposal.playersRequested),
    }, fairnessScore));
  }

  for (const proposal of aiCandidates.slice(0, 1)) {
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
    recordLeagueTradeNews(state, proposal);
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
    clearPendingTradeOffers(state);
  }

  const previousWindow = Math.floor((Math.max(previousDay, 1) - 1) / 30);
  const currentWindow = Math.floor((Math.max(currentDay, 1) - 1) / 30);
  for (let windowIndex = previousWindow + 1; windowIndex <= currentWindow; windowIndex++) {
    const windowStartDay = windowIndex * 30 + 1;
    if (windowStartDay > TRADE_DEADLINE_DAY) continue;
    generateMonthlyTradeActivity(state);
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
    compareAssetPackages(state, proposal.offeringAssets, proposal.requestingAssets).fairness,
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

  const fairnessScore = compareAssetPackages(state, offeringAssets, requestingAssets).fairness;
  const usesNonPlayerAssets = hasNonPlayerAssets(offeringAssets) || hasNonPlayerAssets(requestingAssets);
  const result = usesNonPlayerAssets
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

  if (result.decision === 'accepted') {
    executeAcceptedTrade(state, {
      id: playerOnlyProposal.id,
      fromTeamId: state.userTeamId,
      toTeamId,
      offeringAssets,
      requestingAssets,
    }, fairnessScore);
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
  const result = usesNonPlayerAssets
    ? {
      decision: (-compareAssetPackages(state, counterPackage.offeringAssets, counterPackage.requestingAssets).fairness >= -10
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

  removePendingOffer(state, offerId);

  if (result.decision === 'accepted') {
    const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
    const preTradePartnerPlayers = getTeamPlayers(offer.fromTeamId);
    const fairnessScore = compareAssetPackages(
      state,
      counterPackage.offeringAssets,
      counterPackage.requestingAssets,
    ).fairness;
    executeAcceptedTrade(state, {
      id: counterProposal.id,
      fromTeamId: counterProposal.fromTeamId,
      toTeamId: counterProposal.toTeamId,
      offeringAssets: counterPackage.offeringAssets,
      requestingAssets: counterPackage.requestingAssets,
    }, fairnessScore);
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
