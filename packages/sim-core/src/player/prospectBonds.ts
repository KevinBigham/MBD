import type { AwardHistoryEntry, PlayerOrigin, ProspectBond } from '@mbd/contracts';
import type { GeneratedPlayer } from './generation.js';

interface BondStatLine {
  pa?: number;
  ip?: number;
}

export interface ProspectBondSnapshot {
  season: number;
  players: GeneratedPlayer[];
  prospectBonds: ProspectBond[];
  seasonStats?: Map<string, BondStatLine>;
  awardHistory?: AwardHistoryEntry[];
  playerOrigins?: Map<string, PlayerOrigin>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatLevel(level: string): string {
  return level === 'A_PLUS' ? 'A+' : level;
}

function hasMilestone(bond: ProspectBond, milestone: string): boolean {
  return bond.milestones.includes(milestone);
}

function withMilestone(bond: ProspectBond, milestone: string): ProspectBond {
  return hasMilestone(bond, milestone)
    ? bond
    : {
      ...bond,
      milestones: [...bond.milestones, milestone],
    };
}

export function getProspectLoyaltyModifier(bond: ProspectBond): number {
  return clamp(Number((bond.bondStrength / 100).toFixed(2)), 0, 1);
}

export function createProspectBond(
  prospectId: string,
  draftedSeason: number,
  currentLevel: string,
  milestone: string,
): ProspectBond {
  const baseBond: ProspectBond = {
    prospectId,
    draftedSeason,
    debutSeason: null,
    currentLevel,
    bondStrength: 10,
    milestones: [milestone],
    loyaltyModifier: 0.1,
  };

  return {
    ...baseBond,
    loyaltyModifier: getProspectLoyaltyModifier(baseBond),
  };
}

export function updateProspectBonds(
  snapshot: ProspectBondSnapshot,
): ProspectBond[] {
  const awardHistory = snapshot.awardHistory ?? [];
  const allStarIds = new Set(
    awardHistory
      .filter((entry) => entry.season === snapshot.season && entry.award === 'All-Star')
      .map((entry) => `${entry.playerId}:${entry.teamId}`),
  );

  return snapshot.prospectBonds.map((bond) => {
    const player = snapshot.players.find((candidate) => candidate.id === bond.prospectId);
    const origin = snapshot.playerOrigins?.get(bond.prospectId);
    let nextBond: ProspectBond = {
      ...bond,
      milestones: [...bond.milestones],
      currentLevel: player?.rosterStatus ?? bond.currentLevel,
    };

    if (player && player.rosterStatus !== bond.currentLevel && player.rosterStatus !== 'MLB') {
      nextBond = withMilestone(nextBond, `Promoted to ${formatLevel(player.rosterStatus)}, ${snapshot.season}`);
    }

    if (
      player
      && player.rosterStatus !== 'MLB'
      && (!origin || player.teamId === origin.originTeamId)
    ) {
      nextBond.bondStrength += 8;
    }

    const statLine = snapshot.seasonStats?.get(bond.prospectId);
    if (
      player
      && player.rosterStatus === 'MLB'
      && nextBond.debutSeason == null
      && ((statLine?.pa ?? 0) > 0 || (statLine?.ip ?? 0) > 0)
    ) {
      nextBond.debutSeason = snapshot.season;
      nextBond.bondStrength += 15;
      nextBond = withMilestone(nextBond, `MLB Debut, ${snapshot.season}`);
    }

    if (
      player
      && origin
      && player.teamId === origin.originTeamId
      && allStarIds.has(`${player.id}:${player.teamId}`)
    ) {
      const allStarMilestone = `All-Star, ${snapshot.season}`;
      if (!hasMilestone(nextBond, allStarMilestone)) {
        nextBond.bondStrength += 10;
        nextBond = withMilestone(nextBond, allStarMilestone);
      }
    }

    nextBond.bondStrength = clamp(nextBond.bondStrength, 0, 100);
    nextBond.loyaltyModifier = getProspectLoyaltyModifier(nextBond);
    return nextBond;
  });
}
