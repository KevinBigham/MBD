import {
  getFreeAgencyCareerStage,
  getFreeAgencyCareerStageWeights,
  getLongestTeamTenureSeasons,
  getProspectLoyaltyModifier,
  evaluateTeamNeeds,
  frontOfficeFreeAgencyAppeal,
  normalizeFreeAgencyDecisionContext,
  type FreeAgencyContenderStatus,
  type FreeAgencyDecisionContext,
  type FreeAgencyDecisionFactor,
  type GeneratedPlayer,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

export interface FreeAgencyPreferencePreview {
  careerStage: ReturnType<typeof getFreeAgencyCareerStage>;
  priorityOrder: FreeAgencyDecisionFactor[];
  projectedOpportunity: ReturnType<typeof normalizeFreeAgencyDecisionContext>['projectedOpportunity'];
  contenderStatus: FreeAgencyContenderStatus;
  loyaltySource: ReturnType<typeof normalizeFreeAgencyDecisionContext>['loyaltySource'];
  tenureSeasons: number;
  homegrownBond: number;
  clubhouseScore: number;
}

/**
 * Apply an accepted signing to the in-day virtual MLB roster immediately.
 * The canonical player assignment is committed after the market simulation,
 * but later players on the same day must see the roster opportunity that the
 * earlier acceptance already consumed.
 */
export function applyVirtualFreeAgencySigning(
  virtualMlbRosters: Map<string, GeneratedPlayer[]>,
  teamNeeds: Map<string, Map<string, number>>,
  teamId: string,
  player: GeneratedPlayer,
): void {
  const roster = virtualMlbRosters.get(teamId) ?? [];
  if (roster.some((candidate) => candidate.id === player.id)) return;
  const updatedRoster = [...roster, player];
  virtualMlbRosters.set(teamId, updatedRoster);
  teamNeeds.set(teamId, evaluateTeamNeeds(updatedRoster));
}

function completedStandingsRecord(
  state: Pick<FullGameState, 'seasonState'>,
  teamId: string,
): { wins: number; losses: number } | null {
  const record = Object.values(state.seasonState.standings.getFullStandings())
    .flat()
    .find((entry) => entry.teamId === teamId);
  if (!record || record.wins + record.losses < 162) {
    return null;
  }
  return { wins: record.wins, losses: record.losses };
}

export function deriveFreeAgencyContenderStatus(
  state: Pick<FullGameState, 'seasonState' | 'playoffBracket'>,
  teamId: string,
): FreeAgencyContenderStatus {
  const record = completedStandingsRecord(state, teamId);
  if (!record) return 'unknown';

  if (state.playoffBracket?.champion === teamId) return 'champion';
  if (state.playoffBracket?.seeds.some((seed) => seed.teamId === teamId)) return 'playoff';
  if (record.wins >= 90) return 'contender';
  if (record.wins >= record.losses) return 'competitive';
  return 'developing';
}

export function buildFreeAgencyDecisionContext(
  state: Pick<
    FullGameState,
    | 'season'
    | 'seasonState'
    | 'playoffBracket'
    | 'prospectBonds'
    | 'playerOrigins'
    | 'teamChemistry'
    | 'frontOfficeState'
  >,
  teamId: string,
  player: Pick<GeneratedPlayer, 'id' | 'teamTenures'>,
  teamNeed: number,
): FreeAgencyDecisionContext {
  const origin = state.playerOrigins.get(player.id);
  const bond = origin?.originTeamId === teamId
    ? state.prospectBonds.find((entry) => entry.prospectId === player.id)
    : null;
  const chemistryScore = state.teamChemistry.get(teamId)?.score ?? 50;
  const reputationAppeal = frontOfficeFreeAgencyAppeal(
    state.frontOfficeState.get(teamId)?.reputation ?? 50,
  );

  return {
    teamNeed,
    contenderStatus: deriveFreeAgencyContenderStatus(state, teamId),
    tenureSeasons: getLongestTeamTenureSeasons(player, teamId, state.season),
    homegrownBond: bond ? getProspectLoyaltyModifier(bond) : 0,
    // The player decision sees only symmetric clubhouse facts. The existing
    // product-facing appeal score still owns user fan/spending presentation.
    clubhouseScore: Math.max(0, Math.min(100, Math.round(
      (chemistryScore * 0.7) + (reputationAppeal * 0.3),
    ))),
  };
}

export function buildFreeAgencyPreferencePreview(
  player: Pick<GeneratedPlayer, 'age'>,
  context: FreeAgencyDecisionContext,
): FreeAgencyPreferencePreview {
  const careerStage = getFreeAgencyCareerStage(player.age);
  const weights = getFreeAgencyCareerStageWeights(player.age);
  const normalized = normalizeFreeAgencyDecisionContext(context);
  const fixedOrder: readonly FreeAgencyDecisionFactor[] = [
    'term_security',
    'projected_opportunity',
    'contender_status',
    'loyalty',
    'clubhouse',
  ];
  const priorityOrder = [...fixedOrder].sort((left, right) => (
    weights[right] - weights[left]
    || fixedOrder.indexOf(left) - fixedOrder.indexOf(right)
  ));

  return {
    careerStage,
    priorityOrder,
    projectedOpportunity: normalized.projectedOpportunity,
    contenderStatus: normalized.contenderStatus,
    loyaltySource: normalized.loyaltySource,
    tenureSeasons: normalized.tenureSeasons,
    homegrownBond: normalized.homegrownBond,
    clubhouseScore: normalized.clubhouseScore,
  };
}
