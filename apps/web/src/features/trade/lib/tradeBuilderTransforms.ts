import { TradeAssetSchema, type TradeAsset, type TradeCondition } from '@mbd/contracts';
import { TEAMS } from '@mbd/sim-core';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  TradeAssetView,
  TradeDeadlineStateView,
  TradeNegotiationActionResult,
  TradeOfferResponseResult,
} from '@/workers/sim.worker.trade';
import type { MultiTeamLaneState, MultiTeamRole } from '../components/MultiTeamLaneCard';
import type { DraftPickAsset, TradeAssetFilter } from '../components/TradeAssetSelectionGrid';
import type { TradeResultView } from '../components/TradeResultBanner';

export interface MultiTeamProposalPayload {
  teams: Array<{
    teamId: string;
    role: MultiTeamRole;
    sendingPlayerIds: string[];
    receivingPlayerIds: string[];
  }>;
  conditions: TradeCondition[];
}

export interface MultiTeamBuilderOpenState {
  lanes: MultiTeamLaneState[];
  rosters: Record<string, PlayerDTO[]>;
  conditions: TradeCondition[];
  conditionPlayerId: string;
  fairness: null;
  proposalResult: null;
  executionResult: null;
  message: null;
}

export interface TradeAssetSummaryItem {
  key: string;
  label: string;
}

export interface MultiTeamMovedPlayerView {
  playerId: string;
  label: string;
}

export interface TradeBuilderSelection {
  offeringPlayerIds: string[];
  requestingPlayerIds: string[];
  offeringDraftPicks: DraftPickAsset[];
  requestingDraftPicks: DraftPickAsset[];
  offeringIFAAmount: string;
  requestingIFAAmount: string;
  offeringFinancialTerms?: TradeFinancialTermsByPlayerId;
  requestingFinancialTerms?: TradeFinancialTermsByPlayerId;
}

export interface TradeFinancialTermsInput {
  retainedSalary: string;
  cashConsideration: string;
}

export type TradeFinancialTermsByPlayerId = Record<string, TradeFinancialTermsInput>;

export interface TradeSubmissionValidationInput {
  selectedTeam: string;
  offeringAssetCount: number;
  requestingAssetCount: number;
  tradeMarketOpen: boolean;
  offeringIFAAmount: string;
  requestingIFAAmount: string;
  userIFARemaining: number;
  targetIFARemaining: number;
  offeringAssets?: readonly TradeAsset[];
  requestingAssets?: readonly TradeAsset[];
}

export type TradeSubmissionValidationResult =
  | { ok: true }
  | { ok: false; result: TradeResultView | null };

type NegotiationTradeResultInput = Pick<TradeNegotiationActionResult, 'decision' | 'message' | 'review'>;

type OfferTradeResultInput = Pick<TradeOfferResponseResult, 'decision' | 'message'>;

interface MultiTeamMovedPlayerLane {
  teamId: string;
  outgoing: ReadonlyArray<{ playerId: string }>;
}

export const ALL_TEAMS = TEAMS.map((t) => ({ id: t.id, name: t.name, abbr: t.abbreviation }));

export const ALL_TEAM_OPTIONS = ALL_TEAMS.map((team) => ({
  id: team.id,
  label: `${team.abbr} - ${team.name}`,
}));

const MULTI_TEAM_ROLE_ORDER: MultiTeamRole[] = ['initiator', 'partner', 'facilitator', 'facilitator'];

export function tradeResultStatusFromNegotiationDecision(
  decision: TradeNegotiationActionResult['decision'],
): TradeResultView['status'] {
  if (decision === 'accepted') {
    return 'accepted';
  }
  if (decision === 'countered' || decision === 'pending') {
    return 'counter';
  }
  return 'rejected';
}

export function tradeResultFromNegotiationAction(
  result: NegotiationTradeResultInput,
): TradeResultView {
  return {
    status: tradeResultStatusFromNegotiationDecision(result.decision),
    message: result.message,
    review: result.review,
  };
}

export function tradeResultStatusFromOfferDecision(
  decision: TradeOfferResponseResult['decision'],
): TradeResultView['status'] {
  if (decision === 'accepted') {
    return 'accepted';
  }
  if (decision === 'countered') {
    return 'counter';
  }
  if (decision === 'declined') {
    return 'declined';
  }
  return 'rejected';
}

export function tradeResultFromOfferResponse(
  response: OfferTradeResultInput,
): TradeResultView {
  return {
    status: tradeResultStatusFromOfferDecision(response.decision),
    message: response.message,
  };
}

export function normalizeMultiTeamRoles(lanes: MultiTeamLaneState[]): MultiTeamLaneState[] {
  return lanes.map((lane, index) => ({
    ...lane,
    role: MULTI_TEAM_ROLE_ORDER[index] ?? 'facilitator',
  }));
}

export function buildInitialMultiTeamLanes(
  userTeamId: string,
  selectedTeam: string,
): MultiTeamLaneState[] {
  const candidateTeamIds = ALL_TEAMS
    .map((team) => team.id)
    .filter((teamId) => teamId !== userTeamId);
  const secondTeamId = selectedTeam || candidateTeamIds[0] || '';
  const thirdTeamId = candidateTeamIds.find((teamId) => teamId !== secondTeamId) ?? '';

  return normalizeMultiTeamRoles([
    { laneId: 'lane-1', teamId: userTeamId, role: 'initiator', outgoing: [] },
    { laneId: 'lane-2', teamId: secondTeamId, role: 'partner', outgoing: [] },
    { laneId: 'lane-3', teamId: thirdTeamId, role: 'facilitator', outgoing: [] },
  ]);
}

export function buildOpenMultiTeamBuilderState(
  userTeamId: string,
  selectedTeam: string,
  userRoster: readonly PlayerDTO[],
  targetRoster: readonly PlayerDTO[],
): MultiTeamBuilderOpenState {
  const rosters: Record<string, PlayerDTO[]> = {
    [userTeamId]: sortPlayerList([...userRoster]),
  };

  if (selectedTeam) {
    rosters[selectedTeam] = sortPlayerList([...targetRoster]);
  }

  return {
    lanes: buildInitialMultiTeamLanes(userTeamId, selectedTeam),
    rosters,
    conditions: [],
    conditionPlayerId: '',
    fairness: null,
    proposalResult: null,
    executionResult: null,
    message: null,
  };
}

export function sortPlayerList(players: PlayerDTO[]): PlayerDTO[] {
  return [...players].sort((left, right) =>
    right.displayRating - left.displayRating
    || left.lastName.localeCompare(right.lastName)
    || left.firstName.localeCompare(right.firstName)
    || left.id.localeCompare(right.id),
  );
}

export function teamDisplayName(teamId: string): string {
  const team = ALL_TEAMS.find((candidate) => candidate.id === teamId);
  return team ? `${team.abbr} - ${team.name}` : teamId.toUpperCase();
}

export function multiTeamProposalFromLanes(
  lanes: MultiTeamLaneState[],
  conditions: TradeCondition[],
): MultiTeamProposalPayload {
  return {
    teams: lanes
      .filter((lane) => lane.teamId)
      .map((lane) => ({
        teamId: lane.teamId,
        role: lane.role,
        sendingPlayerIds: [...new Set(lane.outgoing.map((assignment) => assignment.playerId))].sort(),
        receivingPlayerIds: [...new Set(
          lanes.flatMap((candidate) =>
            candidate.outgoing
              .filter((assignment) => assignment.destinationTeamId === lane.teamId)
              .map((assignment) => assignment.playerId),
          ),
        )].sort(),
      })),
    conditions: [...conditions],
  };
}

export function buildMultiTeamMovedPlayers(
  lanes: ReadonlyArray<MultiTeamMovedPlayerLane>,
  rosters: Record<string, readonly PlayerDTO[]>,
): MultiTeamMovedPlayerView[] {
  const byPlayerId = new Map<string, MultiTeamMovedPlayerView>();
  for (const lane of lanes) {
    for (const assignment of lane.outgoing) {
      const player = rosters[lane.teamId]?.find((candidate) => candidate.id === assignment.playerId);
      byPlayerId.set(assignment.playerId, {
        playerId: assignment.playerId,
        label: player
          ? `${player.firstName} ${player.lastName} (${teamDisplayName(lane.teamId)})`
          : assignment.playerId,
      });
    }
  }
  return [...byPlayerId.values()];
}

export function setMultiTeamLaneTeam(
  lanes: ReadonlyArray<MultiTeamLaneState>,
  laneId: string,
  teamId: string,
): MultiTeamLaneState[] {
  const replacedTeamId = lanes.find((entry) => entry.laneId === laneId)?.teamId ?? '';
  return normalizeMultiTeamRoles(lanes.map((lane) => (
    lane.laneId === laneId
      ? {
        ...lane,
        teamId,
        outgoing: [],
      }
      : {
        ...lane,
        outgoing: lane.outgoing.filter((assignment) => assignment.destinationTeamId !== replacedTeamId),
      }
  )));
}

export function toggleMultiTeamLanePlayer(
  lanes: ReadonlyArray<MultiTeamLaneState>,
  laneId: string,
  playerId: string,
): MultiTeamLaneState[] {
  return lanes.map((lane) => {
    if (lane.laneId !== laneId) {
      return lane;
    }

    const existing = lane.outgoing.find((assignment) => assignment.playerId === playerId);
    if (existing) {
      return {
        ...lane,
        outgoing: lane.outgoing.filter((assignment) => assignment.playerId !== playerId),
      };
    }

    const destinationTeamId = lanes
      .map((candidate) => candidate.teamId)
      .find((candidateTeamId) => candidateTeamId && candidateTeamId !== lane.teamId) ?? '';

    return {
      ...lane,
      outgoing: [...lane.outgoing, { playerId, destinationTeamId }],
    };
  });
}

export function updateMultiTeamLaneDestination(
  lanes: ReadonlyArray<MultiTeamLaneState>,
  laneId: string,
  playerId: string,
  destinationTeamId: string,
): MultiTeamLaneState[] {
  return lanes.map((lane) => (
    lane.laneId === laneId
      ? {
        ...lane,
        outgoing: lane.outgoing.map((assignment) => (
          assignment.playerId === playerId
            ? { ...assignment, destinationTeamId }
            : assignment
        )),
      }
      : lane
  ));
}

export function addMultiTeamLane(
  lanes: MultiTeamLaneState[],
  userTeamId: string,
): MultiTeamLaneState[] {
  if (lanes.length >= 4) {
    return lanes;
  }
  const usedTeamIds = new Set(lanes.map((lane) => lane.teamId));
  const nextTeamId = ALL_TEAMS
    .map((team) => team.id)
    .find((teamId) => !usedTeamIds.has(teamId) && teamId !== userTeamId) ?? '';
  return normalizeMultiTeamRoles([
    ...lanes,
    {
      laneId: `lane-${lanes.length + 1}`,
      teamId: nextTeamId,
      role: 'facilitator',
      outgoing: [],
    },
  ]);
}

export function removeMultiTeamLane(
  lanes: ReadonlyArray<MultiTeamLaneState>,
  laneId: string,
): MultiTeamLaneState[] {
  const removedTeamId = lanes.find((lane) => lane.laneId === laneId)?.teamId;
  return normalizeMultiTeamRoles(
    lanes
      .filter((lane) => lane.laneId !== laneId)
      .map((lane) => ({
        ...lane,
        outgoing: lane.outgoing.filter((assignment) => assignment.destinationTeamId !== removedTeamId),
      })),
  );
}

export function estimateValue(player: PlayerDTO): number {
  const ageFactor = Math.max(0, 1 - (player.age - 24) * 0.04);
  return player.overallRating * (0.6 + ageFactor * 0.4);
}

export function fairnessRatio(offerValue: number, requestValue: number): number {
  const total = offerValue + requestValue;
  if (total === 0) return 0.5;
  return offerValue / total;
}

export function fairnessLabel(ratio: number): { text: string; color: string } {
  if (ratio < 0.3) return { text: 'Heavily favors you', color: 'text-accent-danger' };
  if (ratio < 0.45) return { text: 'Slightly favors you', color: 'text-accent-warning' };
  if (ratio <= 0.55) return { text: 'Fair trade', color: 'text-accent-success' };
  if (ratio <= 0.7) return { text: 'Slightly favors them', color: 'text-accent-warning' };
  return { text: 'Heavily favors them', color: 'text-accent-danger' };
}

export function playerMatchesAssetFilter(player: PlayerDTO, filter: TradeAssetFilter, selectedIds: string[]): boolean {
  switch (filter) {
    case 'mlb':
      return player.rosterStatus === 'MLB';
    case 'prospects':
      return player.age <= 25 || ((player.ceiling ?? player.displayRating) - player.displayRating >= 8);
    case 'pitchers':
      return player.position === 'SP' || player.position === 'RP' || player.position === 'CL';
    case 'hitters':
      return player.position !== 'SP' && player.position !== 'RP' && player.position !== 'CL';
    case 'selected':
      return selectedIds.includes(player.id);
    case 'all':
      return true;
  }
}

export function buildMarketPhaseCopy(
  currentPhase: string,
  deadlineState: TradeDeadlineStateView | null,
  tradeMarketOpen: boolean,
): { headline: string; detail: string; disabledReason: string } {
  if (tradeMarketOpen) {
    const days = deadlineState?.daysUntilDeadline ?? 0;
    return {
      headline: `${days} days until trade deadline`,
      detail: deadlineState?.deadlineMode
        ? 'Phones are hot. Formal proposals, counters, and multi-team frameworks are available.'
        : 'Regular-season trade calls are open. Shape a package or resume an active talk.',
      disabledReason: '',
    };
  }

  if (currentPhase === 'spring_training') {
    return {
      headline: 'Spring Training trade desk',
      detail: 'Clubs are listening and scouting fits. Formal trade proposals unlock on Opening Day.',
      disabledReason: 'Formal offers unlock on Opening Day.',
    };
  }

  if (currentPhase === 'offseason') {
    return {
      headline: 'Offseason roster market',
      detail: 'Use free agency and offseason tools now. Regular-season trade calls open after camp.',
      disabledReason: 'Use offseason roster tools until the regular-season trade market opens.',
    };
  }

  if (currentPhase === 'playoffs') {
    return {
      headline: 'Postseason roster freeze',
      detail: 'The postseason locks trade activity. Review history and prepare offseason targets.',
      disabledReason: 'Postseason trade activity is frozen.',
    };
  }

  return {
    headline: 'Deadline has passed',
    detail: 'The regular-season trade deadline has passed. Talks reopen after the season.',
    disabledReason: 'The trade deadline has passed.',
  };
}

export function playerAsset(playerId: string): TradeAsset {
  return {
    type: 'player',
    playerId,
  };
}

export function draftPickValue(asset: DraftPickAsset, currentSeason: number): number {
  return Math.max(2, 24 - asset.round) * (asset.season === currentSeason ? 3 : 2.5);
}

export function draftPickKey(asset: DraftPickAsset): string {
  return `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`;
}

export function parsePoolAmount(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return amount;
}

export function validateTradeSubmission(
  input: TradeSubmissionValidationInput,
): TradeSubmissionValidationResult {
  if (
    !input.selectedTeam
    || input.offeringAssetCount === 0
    || input.requestingAssetCount === 0
    || !input.tradeMarketOpen
  ) {
    return { ok: false, result: null };
  }

  const offeredPoolAmount = parsePoolAmount(input.offeringIFAAmount);
  const requestedPoolAmount = parsePoolAmount(input.requestingIFAAmount);

  for (const asset of [...(input.offeringAssets ?? []), ...(input.requestingAssets ?? [])]) {
    const parsed = TradeAssetSchema.safeParse(asset);
    if (!parsed.success) {
      return {
        ok: false,
        result: {
          status: 'rejected',
          message: parsed.error.issues[0]?.message ?? 'Trade terms are malformed.',
        },
      };
    }
  }

  if (offeredPoolAmount > input.userIFARemaining + 0.001) {
    return {
      ok: false,
      result: {
        status: 'rejected',
        message: 'You cannot offer more international pool space than you have remaining.',
      },
    };
  }

  if (requestedPoolAmount > input.targetIFARemaining + 0.001) {
    return {
      ok: false,
      result: {
        status: 'rejected',
        message: 'The target club does not have that much international pool space available.',
      },
    };
  }

  return { ok: true };
}

export function poolAsset(amount: number): Extract<TradeAsset, { type: 'ifa_pool_space' }> {
  return {
    type: 'ifa_pool_space',
    amount,
  };
}

export function toggleDraftPickAsset(current: DraftPickAsset[], asset: DraftPickAsset): DraftPickAsset[] {
  const key = draftPickKey(asset);
  if (current.some((candidate) => draftPickKey(candidate) === key)) {
    return current.filter((candidate) => draftPickKey(candidate) !== key);
  }
  return [...current, asset];
}

export function tradeAssetsFromSelection(
  playerIds: readonly string[],
  draftPicks: readonly DraftPickAsset[],
  ifaAmount: string,
  financialTerms: TradeFinancialTermsByPlayerId = {},
  roster: readonly PlayerDTO[] = [],
  season = 1,
): TradeAsset[] {
  const playerById = new Map(roster.map((player) => [player.id, player] as const));
  const assets: TradeAsset[] = [
    ...playerIds.map((playerId): TradeAsset => {
      const player = playerById.get(playerId);
      const terms = financialTerms[playerId];
      const retainedAmount = parsePoolAmount(terms?.retainedSalary ?? '');
      const cashAmount = parsePoolAmount(terms?.cashConsideration ?? '');
      if (!player || (retainedAmount <= 0 && cashAmount <= 0)) return playerAsset(playerId);

      const contractEndSeasonExclusive = season + player.contract.years;
      const guaranteedEndSeasonExclusive = contractEndSeasonExclusive
        - (player.contract.playerOption || player.contract.teamOption ? 1 : 0);
      const asset: Extract<TradeAsset, { type: 'player' }> = {
        type: 'player',
        playerId,
        contractReference: {
          annualSalary: Number(player.contract.annualSalary.toFixed(2)),
          contractEndSeasonExclusive,
        },
      };
      if (retainedAmount > 0 && guaranteedEndSeasonExclusive > season) {
        asset.retainedSalary = {
          annualAmount: retainedAmount,
          startSeason: season,
          endSeasonExclusive: guaranteedEndSeasonExclusive,
        };
      }
      if (cashAmount > 0) {
        asset.cashConsideration = { amount: cashAmount, season };
      }
      return asset;
    }),
    ...draftPicks,
  ];
  const poolAmount = parsePoolAmount(ifaAmount);
  if (poolAmount > 0) {
    assets.push(poolAsset(poolAmount));
  }
  return assets;
}

function financialTermsFromAssets(
  assets: readonly TradeAsset[],
): TradeFinancialTermsByPlayerId {
  return Object.fromEntries(assets.flatMap((asset) => {
    if (asset.type !== 'player' || (!asset.retainedSalary && !asset.cashConsideration)) return [];
    return [[asset.playerId, {
      retainedSalary: asset.retainedSalary?.annualAmount.toString() ?? '',
      cashConsideration: asset.cashConsideration?.amount.toString() ?? '',
    }]];
  }));
}

function financialTermsFromAssetViews(
  assets: readonly TradeAssetView[],
): TradeFinancialTermsByPlayerId {
  return financialTermsFromAssets(assets.map((view) => view.asset));
}

export function tradeAssetSummaryItems(
  assets: readonly TradeAsset[],
  labelForAsset: (asset: TradeAsset) => string,
): TradeAssetSummaryItem[] {
  return assets.map((asset) => ({
    key:
      asset.type === 'player'
        ? `player:${asset.playerId}`
        : asset.type === 'draft_pick'
          ? draftPickKey(asset)
          : `ifa:${asset.amount.toFixed(2)}`,
    label: labelForAsset(asset),
  }));
}

export function tradeAssetValue(
  asset: TradeAsset,
  currentSeason: number,
  resolvePlayer: (playerId: string) => PlayerDTO | undefined,
): number {
  switch (asset.type) {
    case 'player': {
      const player = resolvePlayer(asset.playerId);
      return player ? estimateValue(player) : 0;
    }
    case 'draft_pick':
      return draftPickValue(asset, currentSeason);
    case 'ifa_pool_space':
      return asset.amount * 8;
  }
}

export function playerIdsFromAssetViews(assets: readonly TradeAssetView[]): string[] {
  return assets.flatMap((asset) =>
    asset.asset.type === 'player' ? [asset.asset.playerId] : [],
  );
}

export function draftPickAssetsFromViews(assets: readonly TradeAssetView[]): DraftPickAsset[] {
  return assets.flatMap((asset) =>
    asset.asset.type === 'draft_pick' ? [asset.asset] : [],
  );
}

export function ifaAmountFromViews(assets: readonly TradeAssetView[]): string {
  const amount = assets.reduce(
    (sum, asset) => sum + (asset.asset.type === 'ifa_pool_space' ? asset.asset.amount : 0),
    0,
  );
  return amount > 0 ? amount.toFixed(2) : '';
}

export function playerIdsFromAssets(assets: readonly TradeAsset[]): string[] {
  return assets.flatMap((asset) => asset.type === 'player' ? [asset.playerId] : []);
}

export function draftPickAssetsFromAssets(assets: readonly TradeAsset[]): DraftPickAsset[] {
  return assets.flatMap((asset) => asset.type === 'draft_pick' ? [asset] : []);
}

export function ifaAmountFromAssets(assets: readonly TradeAsset[]): string {
  const amount = assets.reduce(
    (sum, asset) => sum + (asset.type === 'ifa_pool_space' ? asset.amount : 0),
    0,
  );
  return amount > 0 ? amount.toFixed(2) : '';
}

export function tradeBuilderSelectionFromAssets(
  offeringAssets: readonly TradeAsset[],
  requestingAssets: readonly TradeAsset[],
): TradeBuilderSelection {
  const offeringFinancialTerms = financialTermsFromAssets(offeringAssets);
  const requestingFinancialTerms = financialTermsFromAssets(requestingAssets);
  return {
    offeringPlayerIds: playerIdsFromAssets(offeringAssets),
    requestingPlayerIds: playerIdsFromAssets(requestingAssets),
    offeringDraftPicks: draftPickAssetsFromAssets(offeringAssets),
    requestingDraftPicks: draftPickAssetsFromAssets(requestingAssets),
    offeringIFAAmount: ifaAmountFromAssets(offeringAssets),
    requestingIFAAmount: ifaAmountFromAssets(requestingAssets),
    ...(Object.keys(offeringFinancialTerms).length > 0 ? { offeringFinancialTerms } : {}),
    ...(Object.keys(requestingFinancialTerms).length > 0 ? { requestingFinancialTerms } : {}),
  };
}

export function tradeBuilderSelectionFromAssetViews(
  offeringAssets: readonly TradeAssetView[],
  requestingAssets: readonly TradeAssetView[],
): TradeBuilderSelection {
  const offeringFinancialTerms = financialTermsFromAssetViews(offeringAssets);
  const requestingFinancialTerms = financialTermsFromAssetViews(requestingAssets);
  return {
    offeringPlayerIds: playerIdsFromAssetViews(offeringAssets),
    requestingPlayerIds: playerIdsFromAssetViews(requestingAssets),
    offeringDraftPicks: draftPickAssetsFromViews(offeringAssets),
    requestingDraftPicks: draftPickAssetsFromViews(requestingAssets),
    offeringIFAAmount: ifaAmountFromViews(offeringAssets),
    requestingIFAAmount: ifaAmountFromViews(requestingAssets),
    ...(Object.keys(offeringFinancialTerms).length > 0 ? { offeringFinancialTerms } : {}),
    ...(Object.keys(requestingFinancialTerms).length > 0 ? { requestingFinancialTerms } : {}),
  };
}
