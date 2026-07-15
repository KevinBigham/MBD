import { DRAFT_ROUNDS } from './draftPool.js';

export const PROTECTED_TOP_TEN_PICK_COUNT = 10;

export interface DraftPickOwnership {
  season: number;
  round: number;
  originalTeamId: string;
  currentTeamId: string;
  forfeited: boolean;
}

export interface DraftPickDescriptor {
  season: number;
  round: number;
  originalTeamId: string;
}

export interface DraftCompensatoryPick {
  id: string;
  season: number;
  awardedToTeamId: string;
  compensationForPlayerId: string;
  compensationFromTeamId: string;
  order: number;
}

export interface DraftCompensatoryPickAward {
  season: number;
  awardedToTeamId: string;
  compensationForPlayerId: string;
  compensationFromTeamId: string;
  order?: number;
  priorityGroup?: 'premium' | 'standard';
}

export type DraftCompensationPlan =
  | {
    success: true;
    compensatoryPicks: DraftCompensatoryPick[];
    pickOwnership: DraftPickOwnership[];
    awardedPick: DraftCompensatoryPick;
    forfeitedPick: DraftPickOwnership;
  }
  | {
    success: false;
    reason: 'existing_compensation' | 'no_eligible_pick';
  };

export interface DraftPickSlot {
  slotId: string;
  season: number;
  round: number;
  pickNumber: number;
  teamId: string;
  originalTeamId: string | null;
  kind: 'standard' | 'compensatory';
  compensationForPlayerId: string | null;
  compensationFromTeamId: string | null;
  compensationPriority: 'premium' | 'standard' | null;
}

function sortByDraftPriority(standingsOrder: string[], left: DraftPickOwnership, right: DraftPickOwnership): number {
  if (left.round !== right.round) {
    return left.round - right.round;
  }
  return standingsOrder.indexOf(left.originalTeamId) - standingsOrder.indexOf(right.originalTeamId);
}

export function createDefaultDraftPickOwnership(teamIds: string[], season: number): DraftPickOwnership[] {
  const ownership: DraftPickOwnership[] = [];
  for (const currentSeason of [season, season + 1]) {
    for (let round = 1; round <= DRAFT_ROUNDS; round++) {
      for (const teamId of teamIds) {
        ownership.push({
          season: currentSeason,
          round,
          originalTeamId: teamId,
          currentTeamId: teamId,
          forfeited: false,
        });
      }
    }
  }
  return ownership;
}

export function tradeDraftPickOwnership(
  pickOwnership: DraftPickOwnership[],
  descriptor: DraftPickDescriptor,
  toTeamId: string,
): DraftPickOwnership[] {
  let found = false;
  const next = pickOwnership.map((pick) => {
    if (
      pick.season === descriptor.season &&
      pick.round === descriptor.round &&
      pick.originalTeamId === descriptor.originalTeamId
    ) {
      found = true;
      return {
        ...pick,
        currentTeamId: toTeamId,
      };
    }
    return pick;
  });

  if (!found) {
    throw new Error('Draft pick not found.');
  }

  return next;
}

export function awardCompensatoryPick(
  compPicks: DraftCompensatoryPick[],
  award: DraftCompensatoryPickAward,
): DraftCompensatoryPick[] {
  const nextOrder = (() => {
    if (award.order != null) {
      return award.order;
    }

    const seasonPicks = compPicks.filter((pick) => pick.season === award.season);
    if (award.priorityGroup === 'premium') {
      const latestPremiumOrder = seasonPicks
        .filter((pick) => pick.order < 100)
        .reduce((max, pick) => Math.max(max, pick.order), 0);
      return latestPremiumOrder + 1;
    }

    const latestStandardOrder = seasonPicks
      .filter((pick) => pick.order >= 100)
      .reduce((max, pick) => Math.max(max, pick.order), 99);
    return latestStandardOrder + 1;
  })();
  const nextPick: DraftCompensatoryPick = {
    season: award.season,
    awardedToTeamId: award.awardedToTeamId,
    compensationForPlayerId: award.compensationForPlayerId,
    compensationFromTeamId: award.compensationFromTeamId,
    order: nextOrder,
    id: `comp-${award.season}-${award.awardedToTeamId}-${award.compensationForPlayerId}-${nextOrder}`,
  };

  return [...compPicks, nextPick].sort((left, right) =>
    left.season - right.season
    || left.order - right.order
    || left.awardedToTeamId.localeCompare(right.awardedToTeamId),
  );
}

export function forfeitHighestEligiblePick(
  pickOwnership: DraftPickOwnership[],
  standingsOrder: string[],
  teamId: string,
  season: number,
): { pickOwnership: DraftPickOwnership[]; forfeitedPick: DraftPickOwnership | null } {
  const protectedOriginalTeams = new Set(standingsOrder.slice(0, PROTECTED_TOP_TEN_PICK_COUNT));
  const candidate = [...pickOwnership]
    .filter((pick) =>
      pick.season === season
      && pick.currentTeamId === teamId
      && !pick.forfeited
      && !(pick.round === 1 && protectedOriginalTeams.has(pick.originalTeamId)),
    )
    .sort((left, right) => sortByDraftPriority(standingsOrder, left, right))[0] ?? null;

  if (!candidate) {
    return { pickOwnership, forfeitedPick: null };
  }

  return {
    pickOwnership: pickOwnership.map((pick) => (
      pick.season === candidate.season
      && pick.round === candidate.round
      && pick.originalTeamId === candidate.originalTeamId
        ? { ...pick, forfeited: true }
        : pick
    )),
    forfeitedPick: candidate,
  };
}

export function planDraftPickCompensation(
  compPicks: DraftCompensatoryPick[],
  pickOwnership: DraftPickOwnership[],
  standingsOrder: string[],
  award: DraftCompensatoryPickAward,
): DraftCompensationPlan {
  const existing = compPicks.find((pick) =>
    pick.season === award.season
    && pick.compensationForPlayerId === award.compensationForPlayerId,
  );
  if (existing) {
    return { success: false, reason: 'existing_compensation' };
  }

  const forfeiture = forfeitHighestEligiblePick(
    pickOwnership,
    standingsOrder,
    award.compensationFromTeamId,
    award.season,
  );
  if (!forfeiture.forfeitedPick) {
    return { success: false, reason: 'no_eligible_pick' };
  }

  const compensatoryPicks = awardCompensatoryPick(compPicks, award);
  const awardedPick = compensatoryPicks.find((pick) =>
    pick.season === award.season
    && pick.compensationForPlayerId === award.compensationForPlayerId
    && pick.awardedToTeamId === award.awardedToTeamId
    && pick.compensationFromTeamId === award.compensationFromTeamId,
  );
  if (!awardedPick) {
    throw new Error('Qualifying-offer compensation award was not created.');
  }

  return {
    success: true,
    compensatoryPicks,
    pickOwnership: forfeiture.pickOwnership,
    awardedPick,
    forfeitedPick: forfeiture.forfeitedPick,
  };
}

export function buildDraftPickSlots(
  standingsOrder: string[],
  pickOwnership: DraftPickOwnership[],
  compensatoryPicks: DraftCompensatoryPick[],
  season: number,
): DraftPickSlot[] {
  const seasonOwnership = pickOwnership.filter((pick) => pick.season === season);
  let pickNumber = 0;
  const slots: DraftPickSlot[] = [];

  const pushStandardRound = (round: number) => {
    for (const originalTeamId of standingsOrder) {
      const pick = seasonOwnership.find((entry) =>
        entry.round === round && entry.originalTeamId === originalTeamId,
      );
      if (!pick || pick.forfeited) {
        continue;
      }

      pickNumber += 1;
      slots.push({
        slotId: `std-${season}-${round}-${originalTeamId}`,
        season,
        round,
        pickNumber,
        teamId: pick.currentTeamId,
        originalTeamId,
        kind: 'standard',
        compensationForPlayerId: null,
        compensationFromTeamId: null,
        compensationPriority: null,
      });
    }
  };

  pushStandardRound(1);

  for (const compPick of compensatoryPicks
    .filter((pick) => pick.season === season)
    .sort((left, right) => left.order - right.order || left.awardedToTeamId.localeCompare(right.awardedToTeamId))) {
    pickNumber += 1;
    slots.push({
      slotId: compPick.id,
      season,
      round: 1,
      pickNumber,
      teamId: compPick.awardedToTeamId,
      originalTeamId: null,
      kind: 'compensatory',
      compensationForPlayerId: compPick.compensationForPlayerId,
      compensationFromTeamId: compPick.compensationFromTeamId,
      compensationPriority: compPick.order < 100 ? 'premium' : 'standard',
    });
  }

  for (let round = 2; round <= DRAFT_ROUNDS; round++) {
    pushStandardRound(round);
  }

  return slots;
}
