import type { TradeAsset, TradeContractReference } from '@mbd/contracts';
import {
  activeRetainedContractCountForTeam,
  calculateTeamPayroll,
  contractReferenceForPlayer,
  derivePlayerTradeSalaryResponsibility,
  deriveTradePayrollAdjustment,
  guaranteedContractEndSeasonExclusive,
  retainedSalaryForContract,
  retainingTeamsForContract,
  roundTradeMoney,
  tradeContractReferencesEqual,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

export const MAX_RETAINED_CONTRACTS_PER_TEAM = 3;
export const MAX_RETAINING_TEAMS_PER_CONTRACT = 2;
export const MAX_PLAYER_FINANCIAL_SUPPORT_RATE = 0.5;

type PlayerTradeAsset = Extract<TradeAsset, { type: 'player' }>;

export function stateTradeFinanceSeason(state: FullGameState): number {
  return state.season + (state.phase === 'offseason' && state.offseasonState ? 1 : 0);
}

export function calculateStateTeamPayroll(state: FullGameState, teamId: string) {
  const financeSeason = stateTradeFinanceSeason(state);
  return calculateTeamPayroll(teamId, state.players, {
    season: financeSeason,
    tradeHistory: state.tradeState.tradeHistory,
    allPlayers: state.players,
  });
}

export function stateTradePayrollAdjustment(state: FullGameState, teamId: string) {
  const financeSeason = stateTradeFinanceSeason(state);
  return deriveTradePayrollAdjustment(
    teamId,
    state.players,
    state.tradeState.tradeHistory,
    financeSeason,
  );
}

export function exactTradeContractReference(
  state: FullGameState,
  playerId: string,
): TradeContractReference | null {
  const player = state.players.find((candidate) => candidate.id === playerId);
  return player ? contractReferenceForPlayer(player, stateTradeFinanceSeason(state)) : null;
}

export function materializeTradeAssetContractReferences(
  state: FullGameState,
  assets: TradeAsset[],
): TradeAsset[] {
  return assets.map((asset) => {
    if (asset.type !== 'player') return asset;
    const reference = exactTradeContractReference(state, asset.playerId);
    return reference ? { ...asset, contractReference: reference } : asset;
  });
}

export function existingPlayerSalarySupport(
  state: FullGameState,
  playerId: string,
): number {
  const financeSeason = stateTradeFinanceSeason(state);
  const responsibility = derivePlayerTradeSalaryResponsibility(
    state.players,
    state.tradeState.tradeHistory,
    playerId,
    '',
    financeSeason,
  );
  return roundTradeMoney(
    (responsibility?.retainedSalarySupport ?? 0)
      + (responsibility?.cashConsiderationSupport ?? 0),
  );
}

export function proposedPlayerSalarySupport(asset: PlayerTradeAsset): number {
  return roundTradeMoney(
    (asset.retainedSalary?.annualAmount ?? 0) + (asset.cashConsideration?.amount ?? 0),
  );
}

export function effectiveAcquiringSalary(
  state: FullGameState,
  asset: PlayerTradeAsset,
  acquiringTeamId: string,
): number | null {
  const player = state.players.find((candidate) => candidate.id === asset.playerId);
  if (!player) return null;
  const financeSeason = stateTradeFinanceSeason(state);
  const responsibility = derivePlayerTradeSalaryResponsibility(
    state.players,
    state.tradeState.tradeHistory,
    player.id,
    acquiringTeamId,
    financeSeason,
  );
  return roundTradeMoney(Math.max(
    0,
    (responsibility?.teamResponsibility ?? player.contract.annualSalary)
      - proposedPlayerSalarySupport(asset),
  ));
}

function validatePlayerFinancialAsset(
  state: FullGameState,
  teamId: string,
  asset: PlayerTradeAsset,
): string | null {
  if (!asset.retainedSalary && !asset.cashConsideration) return null;
  const player = state.players.find((candidate) => candidate.id === asset.playerId);
  if (!player || player.teamId !== teamId) {
    return 'Financial support can only be attached by the team controlling that player.';
  }
  if (player.rosterStatus !== 'MLB' || player.contract.years <= 0 || player.contract.annualSalary <= 0) {
    return 'Financial support requires an MLB player under a positive guaranteed contract.';
  }
  const financeSeason = stateTradeFinanceSeason(state);
  const reference = contractReferenceForPlayer(player, financeSeason);
  if (!reference || !tradeContractReferencesEqual(asset.contractReference, reference)) {
    return 'The player contract changed after these financial terms were prepared.';
  }
  const guaranteedEnd = guaranteedContractEndSeasonExclusive(player, financeSeason);
  if (asset.retainedSalary) {
    if (guaranteedEnd <= financeSeason
      || asset.retainedSalary.startSeason !== financeSeason
      || asset.retainedSalary.endSeasonExclusive !== guaranteedEnd) {
      return 'Retained salary must match the player’s remaining guaranteed contract seasons.';
    }
    const existingRetention = retainedSalaryForContract(
      state.tradeState.tradeHistory,
      player.id,
      reference,
      financeSeason,
    );
    const retainingTeams = retainingTeamsForContract(
      state.tradeState.tradeHistory,
      player.id,
      reference,
      financeSeason,
    );
    if (retainingTeams.includes(teamId)) {
      return 'A team cannot retain the same player contract twice.';
    }
    if (retainingTeams.length >= MAX_RETAINING_TEAMS_PER_CONTRACT) {
      return 'This contract already has the maximum number of retaining teams.';
    }
    if (activeRetainedContractCountForTeam(
      state.tradeState.tradeHistory,
      teamId,
      financeSeason,
      state.players,
      financeSeason,
    ) >= MAX_RETAINED_CONTRACTS_PER_TEAM) {
      return 'This team already carries the maximum number of retained contracts.';
    }
    if (roundTradeMoney(existingRetention + asset.retainedSalary.annualAmount)
      > roundTradeMoney(reference.annualSalary * MAX_PLAYER_FINANCIAL_SUPPORT_RATE)) {
      return 'Cumulative retained salary cannot exceed 50% of the gross annual salary.';
    }
  }
  if (asset.cashConsideration?.season !== undefined
    && asset.cashConsideration.season !== financeSeason) {
    return 'Cash consideration must apply to the current trade season.';
  }
  const existingSupport = existingPlayerSalarySupport(state, player.id);
  if (roundTradeMoney(existingSupport + proposedPlayerSalarySupport(asset))
    > roundTradeMoney(reference.annualSalary * MAX_PLAYER_FINANCIAL_SUPPORT_RATE)) {
    return 'Retained salary plus cash consideration cannot exceed 50% of gross salary.';
  }
  return null;
}

export function validateTradeFinancialTerms(
  state: FullGameState,
  fromTeamId: string,
  toTeamId: string,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
): string | null {
  const allPlayerIds = [
    ...offeringAssets.filter((asset): asset is PlayerTradeAsset => asset.type === 'player').map((asset) => asset.playerId),
    ...requestingAssets.filter((asset): asset is PlayerTradeAsset => asset.type === 'player').map((asset) => asset.playerId),
  ];
  if (new Set(allPlayerIds).size !== allPlayerIds.length) {
    return 'A player may appear only once in a trade package.';
  }
  const offeringCashCount = offeringAssets.filter(
    (asset) => asset.type === 'player' && asset.cashConsideration,
  ).length;
  const requestingCashCount = requestingAssets.filter(
    (asset) => asset.type === 'player' && asset.cashConsideration,
  ).length;
  if (offeringCashCount > 1 || requestingCashCount > 1) {
    return 'Each team may attach at most one cash consideration to a trade.';
  }
  if (offeringCashCount > 0 && requestingCashCount > 0) {
    return 'Both teams cannot send offsetting cash considerations.';
  }
  const retainedLimitIssue = (
    teamId: string,
    assets: TradeAsset[],
  ): string | null => {
    const financeSeason = stateTradeFinanceSeason(state);
    const proposedRetainedContracts = assets.filter(
      (asset): asset is PlayerTradeAsset => asset.type === 'player' && Boolean(asset.retainedSalary),
    ).length;
    if (proposedRetainedContracts === 0) return null;
    const activeCount = activeRetainedContractCountForTeam(
      state.tradeState.tradeHistory,
      teamId,
      financeSeason,
      state.players,
      financeSeason,
    );
    return activeCount + proposedRetainedContracts > MAX_RETAINED_CONTRACTS_PER_TEAM
      ? 'This team would exceed the maximum number of retained contracts.'
      : null;
  };
  const retainedCountIssue = retainedLimitIssue(fromTeamId, offeringAssets)
    ?? retainedLimitIssue(toTeamId, requestingAssets);
  if (retainedCountIssue) return retainedCountIssue;
  for (const asset of offeringAssets) {
    if (asset.type !== 'player') continue;
    const issue = validatePlayerFinancialAsset(state, fromTeamId, asset);
    if (issue) return issue;
  }
  for (const asset of requestingAssets) {
    if (asset.type !== 'player') continue;
    const issue = validatePlayerFinancialAsset(state, toTeamId, asset);
    if (issue) return issue;
  }
  return null;
}
