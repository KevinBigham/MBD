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

export interface DraftPickSlot {
  slotId: string;
  season: number;
  round: number;
  pickNumber: number;
  teamId: string;
  originalTeamId: string | null;
  kind: 'standard' | 'compensatory';
  compensationForPlayerId: string | null;
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
  award: Omit<DraftCompensatoryPick, 'id'>,
): DraftCompensatoryPick[] {
  const nextPick: DraftCompensatoryPick = {
    ...award,
    id: `comp-${award.season}-${award.awardedToTeamId}-${award.compensationForPlayerId}-${award.order}`,
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
    });
  }

  for (let round = 2; round <= DRAFT_ROUNDS; round++) {
    pushStandardRound(round);
  }

  return slots;
}
