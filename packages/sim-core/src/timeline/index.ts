import type { GameSnapshot, TimelineComparison, WhatIfBranchMeta } from '@mbd/contracts';
import { getTeamById } from '../league/index.js';

interface TeamRecordLike {
  teamId: string;
  wins: number;
  losses: number;
}

function toPct(wins: number, losses: number): number {
  const totalGames = wins + losses;
  return totalGames > 0 ? Number((wins / totalGames).toFixed(3)) : 0;
}

function normalizeStandings(snapshot: GameSnapshot): TeamRecordLike[] {
  const rawStandings = snapshot.seasonState.standings as unknown[];
  if (!Array.isArray(rawStandings)) {
    return [];
  }

  return rawStandings.flatMap((entry) => {
    if (Array.isArray(entry)) {
      const [teamId, record] = entry as [unknown, { wins?: unknown; losses?: unknown }];
      if (typeof teamId !== 'string') {
        return [];
      }

      return [{
        teamId,
        wins: typeof record?.wins === 'number' ? record.wins : 0,
        losses: typeof record?.losses === 'number' ? record.losses : 0,
      }];
    }

    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const record = entry as { teamId?: unknown; wins?: unknown; losses?: unknown };
    if (typeof record.teamId !== 'string') {
      return [];
    }

    return [{
      teamId: record.teamId,
      wins: typeof record.wins === 'number' ? record.wins : 0,
      losses: typeof record.losses === 'number' ? record.losses : 0,
    }];
  });
}

function getUserStanding(snapshot: GameSnapshot): TeamRecordLike {
  const userTeamId = snapshot.userTeamId ?? snapshot.franchise.teamId;
  return normalizeStandings(snapshot).find((entry) => entry.teamId === userTeamId) ?? {
    teamId: userTeamId,
    wins: 0,
    losses: 0,
  };
}

function getDivisionSummary(snapshot: GameSnapshot) {
  const userTeamId = snapshot.userTeamId ?? snapshot.franchise.teamId;
  const directEntry = (snapshot.seasonState.standings as Array<{
    teamId?: string;
    divisionRank?: number;
    gamesBack?: number;
  }>).find((entry) => entry?.teamId === userTeamId);
  if (
    directEntry
    && typeof directEntry.divisionRank === 'number'
    && typeof directEntry.gamesBack === 'number'
  ) {
    return {
      divisionRank: directEntry.divisionRank,
      gamesBack: directEntry.gamesBack,
    };
  }

  const userDivision = getTeamById(userTeamId)?.division ?? snapshot.franchise.teamDivision;
  const divisionStandings = normalizeStandings(snapshot)
    .filter((entry) => {
      const teamDivision = getTeamById(entry.teamId)?.division;
      return teamDivision === userDivision;
    })
    .sort((left, right) =>
      right.wins - left.wins
      || left.losses - right.losses
      || left.teamId.localeCompare(right.teamId),
    );
  const leader = divisionStandings[0] ?? { wins: 0, losses: 0 };
  const current = divisionStandings.find((entry) => entry.teamId === userTeamId) ?? {
    teamId: userTeamId,
    wins: 0,
    losses: 0,
  };

  return {
    divisionRank: Math.max(1, divisionStandings.findIndex((entry) => entry.teamId === userTeamId) + 1 || 1),
    gamesBack: Number((((leader.wins - current.wins) + (current.losses - leader.losses)) / 2).toFixed(1)),
  };
}

function getRosterNames(snapshot: GameSnapshot): string[] {
  const userTeamId = snapshot.userTeamId ?? snapshot.franchise.teamId;
  return snapshot.players
    .filter((player) => player.teamId === userTeamId)
    .map((player) => `${player.firstName} ${player.lastName}`.trim())
    .filter((name, index, values) => name.length > 0 && values.indexOf(name) === index)
    .sort((left, right) => left.localeCompare(right));
}

function getChampionshipCount(snapshot: GameSnapshot): number {
  const userTeamId = snapshot.userTeamId ?? snapshot.franchise.teamId;
  if (snapshot.narrative.franchiseTimeline.length > 0) {
    return snapshot.narrative.franchiseTimeline.filter((entry) =>
      entry.teamId === userTeamId && entry.championship,
    ).length;
  }

  if (snapshot.narrative.archivedSeasons.length > 0) {
    return snapshot.narrative.archivedSeasons.filter((entry) =>
      entry.championshipWon && (entry.championTeamId == null || entry.championTeamId === userTeamId),
    ).length;
  }

  return snapshot.narrative.seasonHistory.filter((entry) => entry.championTeamId === userTeamId).length;
}

function getTradeCount(snapshot: GameSnapshot): number {
  return snapshot.tradeState.tradeHistory.length;
}

function rosterDifference(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

export function compareTimelines(
  parentSnapshot: GameSnapshot,
  branchSnapshot: GameSnapshot,
  branchMeta: WhatIfBranchMeta,
): TimelineComparison {
  const parentRecord = getUserStanding(parentSnapshot);
  const branchRecord = getUserStanding(branchSnapshot);
  const parentStandings = getDivisionSummary(parentSnapshot);
  const branchStandings = getDivisionSummary(branchSnapshot);
  const parentRoster = getRosterNames(parentSnapshot);
  const branchRoster = getRosterNames(branchSnapshot);
  const parentChampionships = getChampionshipCount(parentSnapshot);
  const branchChampionships = getChampionshipCount(branchSnapshot);
  const parentTrades = getTradeCount(parentSnapshot);
  const branchTrades = getTradeCount(branchSnapshot);

  return {
    branchMeta,
    recordDelta: {
      parent: {
        wins: parentRecord.wins,
        losses: parentRecord.losses,
        pct: toPct(parentRecord.wins, parentRecord.losses),
      },
      branch: {
        wins: branchRecord.wins,
        losses: branchRecord.losses,
        pct: toPct(branchRecord.wins, branchRecord.losses),
      },
      delta: branchRecord.wins - parentRecord.wins,
    },
    standingsDelta: {
      parent: parentStandings,
      branch: branchStandings,
      delta: parentStandings.divisionRank - branchStandings.divisionRank,
    },
    rosterDelta: {
      parent: parentRoster,
      branch: branchRoster,
      added: rosterDifference(branchRoster, parentRoster),
      lost: rosterDifference(parentRoster, branchRoster),
      delta: branchRoster.length - parentRoster.length,
    },
    championshipsDelta: {
      parent: parentChampionships,
      branch: branchChampionships,
      delta: branchChampionships - parentChampionships,
    },
    tradesDelta: {
      parent: parentTrades,
      branch: branchTrades,
      delta: branchTrades - parentTrades,
    },
  };
}
