import type {
  TradeAsset,
  TradeContractReference,
  TradeHistoryEntry,
} from '@mbd/contracts';
import type { GeneratedPlayer } from '../player/generation.js';

export interface TradePayrollAdjustment {
  retainedSalaryCharges: number;
  cashConsiderationCharges: number;
  releasedContractCharges: number;
  deadMoneyCharges: number;
  salaryCreditsByPlayerId: ReadonlyMap<string, number>;
  totalSalaryCredits: number;
  totalExternalSalaryCredits: number;
}

export interface PlayerTradeFinancialAgreement {
  id: string;
  playerId: string;
  payerTeamId: string;
  controllerTeamIdAtAgreement: string;
  contractReference: TradeContractReference;
  retainedSalary: Extract<TradeAsset, { type: 'player' }>['retainedSalary'];
  cashConsideration: Extract<TradeAsset, { type: 'player' }>['cashConsideration'];
}

export interface PlayerTradeSalaryResponsibility {
  retainedSalarySupport: number;
  cashConsiderationSupport: number;
  externalSupport: number;
  teamResponsibility: number;
  payerOffsets: Array<{
    teamId: string;
    retainedSalary: number;
    cashConsideration: number;
    total: number;
  }>;
}

export function roundTradeMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function contractReferenceForPlayer(
  player: GeneratedPlayer,
  season: number,
): TradeContractReference | null {
  if (player.contract.years <= 0 || player.contract.annualSalary <= 0) return null;
  return {
    annualSalary: roundTradeMoney(player.contract.annualSalary),
    contractEndSeasonExclusive: season + player.contract.years,
  };
}

export function guaranteedContractEndSeasonExclusive(
  player: GeneratedPlayer,
  season: number,
): number {
  return season + Math.max(
    0,
    player.contract.years - (player.contract.playerOption || player.contract.teamOption ? 1 : 0),
  );
}

export function tradeContractReferencesEqual(
  left: TradeContractReference | null | undefined,
  right: TradeContractReference | null | undefined,
): boolean {
  return Boolean(left && right
    && left.annualSalary === right.annualSalary
    && left.contractEndSeasonExclusive === right.contractEndSeasonExclusive);
}

function playerAssetsWithDirection(entry: TradeHistoryEntry) {
  return [
    ...entry.offeringAssets
      .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
      .map((asset, index) => ({
        asset,
        index,
        payerTeamId: entry.fromTeamId,
        controllerTeamIdAtAgreement: entry.toTeamId,
      })),
    ...entry.requestingAssets
      .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
      .map((asset, index) => ({
        asset,
        index,
        payerTeamId: entry.toTeamId,
        controllerTeamIdAtAgreement: entry.fromTeamId,
      })),
  ];
}

export function collectPlayerTradeFinancialAgreements(
  tradeHistory: readonly TradeHistoryEntry[],
): PlayerTradeFinancialAgreement[] {
  return tradeHistory.flatMap((entry) => playerAssetsWithDirection(entry)
    .filter(({ asset }) => asset.contractReference && (asset.retainedSalary || asset.cashConsideration))
    .map(({ asset, index, payerTeamId, controllerTeamIdAtAgreement }) => ({
      id: `${entry.id}:${payerTeamId}:${index}:${asset.playerId}`,
      playerId: asset.playerId,
      payerTeamId,
      controllerTeamIdAtAgreement,
      contractReference: asset.contractReference!,
      retainedSalary: asset.retainedSalary,
      cashConsideration: asset.cashConsideration,
    })));
}

function latestControllerForContract(
  tradeHistory: readonly TradeHistoryEntry[],
  playerId: string,
  reference: TradeContractReference,
  fallbackTeamId: string,
): string {
  for (const entry of tradeHistory) {
    for (const { asset, controllerTeamIdAtAgreement } of playerAssetsWithDirection(entry)) {
      if (asset.playerId === playerId
        && tradeContractReferencesEqual(asset.contractReference, reference)) {
        return controllerTeamIdAtAgreement;
      }
    }
  }
  return fallbackTeamId;
}

function activeAgreementAmount(
  agreement: PlayerTradeFinancialAgreement,
  targetSeason: number,
): { retained: number; cash: number } {
  const retained = agreement.retainedSalary
    && targetSeason >= agreement.retainedSalary.startSeason
    && targetSeason < agreement.retainedSalary.endSeasonExclusive
    ? agreement.retainedSalary.annualAmount
    : 0;
  const cash = agreement.cashConsideration?.season === targetSeason
    ? agreement.cashConsideration.amount
    : 0;
  return { retained: roundTradeMoney(retained), cash: roundTradeMoney(cash) };
}

/**
 * Project one club's complete responsibility for an exact player contract.
 * Credits funded by that same club are added back because a return-to-payer
 * leaves the club responsible for both the roster charge and its retained
 * obligation. The result is therefore gross salary minus external support.
 */
export function derivePlayerTradeSalaryResponsibility(
  players: readonly GeneratedPlayer[],
  tradeHistory: readonly TradeHistoryEntry[],
  playerId: string,
  teamId: string,
  currentSeason: number,
  targetSeason: number = currentSeason,
): PlayerTradeSalaryResponsibility | null {
  const player = players.find((candidate) => candidate.id === playerId);
  const reference = player ? contractReferenceForPlayer(player, currentSeason) : null;
  if (!player || !reference) return null;

  const payerTotals = new Map<string, { retainedSalary: number; cashConsideration: number }>();
  let retainedSalarySupport = 0;
  let cashConsiderationSupport = 0;
  let payerCharge = 0;
  for (const agreement of collectPlayerTradeFinancialAgreements(tradeHistory)) {
    if (agreement.playerId !== playerId
      || !tradeContractReferencesEqual(agreement.contractReference, reference)) continue;
    const { retained, cash } = activeAgreementAmount(agreement, targetSeason);
    if (retained <= 0 && cash <= 0) continue;
    retainedSalarySupport = roundTradeMoney(retainedSalarySupport + retained);
    cashConsiderationSupport = roundTradeMoney(cashConsiderationSupport + cash);
    if (agreement.payerTeamId === teamId) {
      payerCharge = roundTradeMoney(payerCharge + retained + cash);
    }
    const current = payerTotals.get(agreement.payerTeamId) ?? {
      retainedSalary: 0,
      cashConsideration: 0,
    };
    payerTotals.set(agreement.payerTeamId, {
      retainedSalary: roundTradeMoney(current.retainedSalary + retained),
      cashConsideration: roundTradeMoney(current.cashConsideration + cash),
    });
  }

  const payerOffsets = Array.from(payerTotals, ([payerTeamId, amounts]) => ({
    teamId: payerTeamId,
    retainedSalary: amounts.retainedSalary,
    cashConsideration: amounts.cashConsideration,
    total: roundTradeMoney(amounts.retainedSalary + amounts.cashConsideration),
  }));
  const totalSupport = roundTradeMoney(retainedSalarySupport + cashConsiderationSupport);
  const externalSupport = roundTradeMoney(totalSupport - payerCharge);
  return {
    retainedSalarySupport,
    cashConsiderationSupport,
    externalSupport,
    teamResponsibility: roundTradeMoney(Math.max(0, player.contract.annualSalary - externalSupport)),
    payerOffsets,
  };
}

export function deriveTradePayrollAdjustment(
  teamId: string,
  players: readonly GeneratedPlayer[],
  tradeHistory: readonly TradeHistoryEntry[],
  currentSeason: number,
  targetSeason: number = currentSeason,
): TradePayrollAdjustment {
  let retainedSalaryCharges = 0;
  let cashConsiderationCharges = 0;
  let releasedContractCharges = 0;
  let totalExternalSalaryCredits = 0;
  const salaryCreditsByPlayerId = new Map<string, number>();
  const releasedCreditsByPlayerId = new Map<string, number>();
  const releasedControllerByPlayerId = new Map<string, string>();
  const playerById = new Map(players.map((player) => [player.id, player] as const));

  for (const agreement of collectPlayerTradeFinancialAgreements(tradeHistory)) {
    const player = playerById.get(agreement.playerId);
    if (!player || !tradeContractReferencesEqual(
      contractReferenceForPlayer(player, currentSeason),
      agreement.contractReference,
    )) continue;

    const { retained, cash } = activeAgreementAmount(agreement, targetSeason);
    const total = roundTradeMoney(retained + cash);
    if (total <= 0) continue;

    const controllerTeamId = player.teamId || latestControllerForContract(
      tradeHistory,
      player.id,
      agreement.contractReference,
      agreement.controllerTeamIdAtAgreement,
    );
    if (agreement.payerTeamId === teamId) {
      retainedSalaryCharges = roundTradeMoney(retainedSalaryCharges + retained);
      cashConsiderationCharges = roundTradeMoney(cashConsiderationCharges + cash);
    }
    if (!player.teamId) {
      releasedCreditsByPlayerId.set(
        player.id,
        roundTradeMoney((releasedCreditsByPlayerId.get(player.id) ?? 0) + total),
      );
      releasedControllerByPlayerId.set(player.id, controllerTeamId);
    } else if (controllerTeamId === teamId) {
      salaryCreditsByPlayerId.set(
        player.id,
        roundTradeMoney((salaryCreditsByPlayerId.get(player.id) ?? 0) + total),
      );
      if (agreement.payerTeamId !== teamId) {
        totalExternalSalaryCredits += total;
      }
    }
  }

  for (const [playerId, controllerTeamId] of releasedControllerByPlayerId) {
    if (controllerTeamId !== teamId) continue;
    const player = playerById.get(playerId);
    if (!player) continue;
    releasedContractCharges = roundTradeMoney(
      releasedContractCharges
      + Math.max(0, player.contract.annualSalary - (releasedCreditsByPlayerId.get(playerId) ?? 0)),
    );
  }

  const totalSalaryCredits = roundTradeMoney(
    Array.from(salaryCreditsByPlayerId.values()).reduce((sum, amount) => sum + amount, 0),
  );
  return {
    retainedSalaryCharges,
    cashConsiderationCharges,
    releasedContractCharges,
    deadMoneyCharges: roundTradeMoney(
      retainedSalaryCharges + cashConsiderationCharges + releasedContractCharges,
    ),
    salaryCreditsByPlayerId,
    totalSalaryCredits,
    totalExternalSalaryCredits: roundTradeMoney(totalExternalSalaryCredits),
  };
}

/**
 * Derive exact trade-payroll adjustments for a bounded league projection.
 *
 * This is deliberately an operation-local calculation: callers provide the
 * exact teams, player array, history, finance season, and target seasons for
 * one coherent read. Nothing is retained after this function returns.
 */
export function deriveLeagueTradePayrollAdjustments(
  teamIds: readonly string[],
  players: readonly GeneratedPlayer[],
  tradeHistory: readonly TradeHistoryEntry[],
  currentSeason: number,
  targetSeasons: readonly number[],
): ReadonlyMap<string, ReadonlyMap<number, TradePayrollAdjustment>> {
  const requestedTeamIds = Array.from(new Set(teamIds));
  const requestedTargetSeasons = Array.from(new Set(targetSeasons));
  const adjustments = new Map<string, Map<number, {
    retainedSalaryCharges: number;
    cashConsiderationCharges: number;
    releasedContractCharges: number;
    totalExternalSalaryCredits: number;
    salaryCreditsByPlayerId: Map<string, number>;
  }>>();
  const playerById = new Map(players.map((player) => [player.id, player] as const));
  const agreements = collectPlayerTradeFinancialAgreements(tradeHistory);

  for (const teamId of requestedTeamIds) {
    adjustments.set(teamId, new Map(requestedTargetSeasons.map((targetSeason) => [
      targetSeason,
      {
        retainedSalaryCharges: 0,
        cashConsiderationCharges: 0,
        releasedContractCharges: 0,
        totalExternalSalaryCredits: 0,
        salaryCreditsByPlayerId: new Map<string, number>(),
      },
    ])));
  }

  for (const targetSeason of requestedTargetSeasons) {
    const releasedCreditsByPlayerId = new Map<string, number>();
    const releasedControllerByPlayerId = new Map<string, string>();

    for (const agreement of agreements) {
      const player = playerById.get(agreement.playerId);
      if (!player || !tradeContractReferencesEqual(
        contractReferenceForPlayer(player, currentSeason),
        agreement.contractReference,
      )) continue;

      const { retained, cash } = activeAgreementAmount(agreement, targetSeason);
      const total = roundTradeMoney(retained + cash);
      if (total <= 0) continue;

      const controllerTeamId = player.teamId || latestControllerForContract(
        tradeHistory,
        player.id,
        agreement.contractReference,
        agreement.controllerTeamIdAtAgreement,
      );
      const payerAdjustment = adjustments.get(agreement.payerTeamId)?.get(targetSeason);
      if (payerAdjustment) {
        payerAdjustment.retainedSalaryCharges = roundTradeMoney(
          payerAdjustment.retainedSalaryCharges + retained,
        );
        payerAdjustment.cashConsiderationCharges = roundTradeMoney(
          payerAdjustment.cashConsiderationCharges + cash,
        );
      }

      if (!player.teamId) {
        releasedCreditsByPlayerId.set(
          player.id,
          roundTradeMoney((releasedCreditsByPlayerId.get(player.id) ?? 0) + total),
        );
        releasedControllerByPlayerId.set(player.id, controllerTeamId);
        continue;
      }

      const controllerAdjustment = adjustments.get(controllerTeamId)?.get(targetSeason);
      if (!controllerAdjustment) continue;
      controllerAdjustment.salaryCreditsByPlayerId.set(
        player.id,
        roundTradeMoney((controllerAdjustment.salaryCreditsByPlayerId.get(player.id) ?? 0) + total),
      );
      if (agreement.payerTeamId !== controllerTeamId) {
        controllerAdjustment.totalExternalSalaryCredits += total;
      }
    }

    for (const [playerId, controllerTeamId] of releasedControllerByPlayerId) {
      const adjustment = adjustments.get(controllerTeamId)?.get(targetSeason);
      const player = playerById.get(playerId);
      if (!adjustment || !player) continue;
      adjustment.releasedContractCharges = roundTradeMoney(
        adjustment.releasedContractCharges
        + Math.max(0, player.contract.annualSalary - (releasedCreditsByPlayerId.get(playerId) ?? 0)),
      );
    }
  }

  return new Map(requestedTeamIds.map((teamId) => [
    teamId,
    new Map(requestedTargetSeasons.map((targetSeason) => {
      const adjustment = adjustments.get(teamId)?.get(targetSeason)!;
      const totalSalaryCredits = roundTradeMoney(
        Array.from(adjustment.salaryCreditsByPlayerId.values()).reduce(
          (sum, amount) => sum + amount,
          0,
        ),
      );
      return [targetSeason, {
        retainedSalaryCharges: adjustment.retainedSalaryCharges,
        cashConsiderationCharges: adjustment.cashConsiderationCharges,
        releasedContractCharges: adjustment.releasedContractCharges,
        deadMoneyCharges: roundTradeMoney(
          adjustment.retainedSalaryCharges
          + adjustment.cashConsiderationCharges
          + adjustment.releasedContractCharges,
        ),
        salaryCreditsByPlayerId: adjustment.salaryCreditsByPlayerId,
        totalSalaryCredits,
        totalExternalSalaryCredits: roundTradeMoney(adjustment.totalExternalSalaryCredits),
      } satisfies TradePayrollAdjustment];
    })),
  ]));
}

export function retainedSalaryForContract(
  tradeHistory: readonly TradeHistoryEntry[],
  playerId: string,
  reference: TradeContractReference,
  season: number,
): number {
  return roundTradeMoney(collectPlayerTradeFinancialAgreements(tradeHistory)
    .filter((agreement) => agreement.playerId === playerId
      && tradeContractReferencesEqual(agreement.contractReference, reference))
    .reduce((sum, agreement) => sum + activeAgreementAmount(agreement, season).retained, 0));
}

export function retainingTeamsForContract(
  tradeHistory: readonly TradeHistoryEntry[],
  playerId: string,
  reference: TradeContractReference,
  season: number,
): string[] {
  return Array.from(new Set(collectPlayerTradeFinancialAgreements(tradeHistory)
    .filter((agreement) => agreement.playerId === playerId
      && tradeContractReferencesEqual(agreement.contractReference, reference)
      && activeAgreementAmount(agreement, season).retained > 0)
    .map((agreement) => agreement.payerTeamId))).sort();
}

export function activeRetainedContractCountForTeam(
  tradeHistory: readonly TradeHistoryEntry[],
  teamId: string,
  season: number,
  players?: readonly GeneratedPlayer[],
  currentSeason: number = season,
): number {
  const playerById = players ? new Map(players.map((player) => [player.id, player] as const)) : null;
  return new Set(collectPlayerTradeFinancialAgreements(tradeHistory)
    .filter((agreement) => agreement.payerTeamId === teamId
      && activeAgreementAmount(agreement, season).retained > 0
      && (!playerById || (() => {
        const player = playerById.get(agreement.playerId);
        return Boolean(player && tradeContractReferencesEqual(
          contractReferenceForPlayer(player, currentSeason),
          agreement.contractReference,
        ));
      })()))
    .map((agreement) => `${agreement.playerId}:${agreement.contractReference.annualSalary}:${agreement.contractReference.contractEndSeasonExclusive}`)).size;
}

export function hasActiveTradeFinancialObligationForPlayer(
  players: readonly GeneratedPlayer[],
  tradeHistory: readonly TradeHistoryEntry[],
  playerId: string,
  currentSeason: number,
): boolean {
  const player = players.find((candidate) => candidate.id === playerId);
  const reference = player ? contractReferenceForPlayer(player, currentSeason) : null;
  if (!reference) return false;
  return collectPlayerTradeFinancialAgreements(tradeHistory).some((agreement) => {
    if (agreement.playerId !== playerId
      || !tradeContractReferencesEqual(agreement.contractReference, reference)) return false;
    const amounts = activeAgreementAmount(agreement, currentSeason);
    return amounts.retained > 0 || amounts.cash > 0;
  });
}
