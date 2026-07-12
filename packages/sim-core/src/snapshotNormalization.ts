import {
  GameSnapshotSchema,
  type FrontOfficeState,
  type FranchiseTimelineEntry,
  type GameSnapshot,
} from '@mbd/contracts';
import { createRelationshipMap } from './league/gmRelationships.js';
import { TEAMS } from './league/teams.js';

function parseRecord(record: string, fallbackWins: number) {
  const match = /^(\d+)-(\d+)$/.exec(record);
  if (match) {
    return { wins: Number(match[1]), losses: Number(match[2]) };
  }
  return { wins: fallbackWins, losses: Math.max(0, 162 - fallbackWins) };
}

function backfillGMCareer(snapshot: GameSnapshot): NonNullable<GameSnapshot['narrative']['gmCareer']> {
  const franchiseHistory = (snapshot.narrative.franchiseTimeline as FranchiseTimelineEntry[])
    .filter((entry) => entry.teamId === snapshot.userTeamId)
    .sort((left, right) => left.season - right.season);
  const currentRecord = snapshot.seasonState.standings.find(
    (entry) => entry.teamId === snapshot.userTeamId,
  );
  const totals = franchiseHistory.reduce((record, entry) => {
    const parsed = parseRecord(entry.record, entry.winTotal);
    return {
      wins: record.wins + parsed.wins,
      losses: record.losses + parsed.losses,
    };
  }, {
    wins: currentRecord?.wins ?? 0,
    losses: currentRecord?.losses ?? 0,
  });
  const reputation = (snapshot.narrative.frontOfficeState as [string, FrontOfficeState][])
    .find(([teamId]) => teamId === snapshot.userTeamId)?.[1]?.reputation ?? 50;
  const championships = franchiseHistory.filter((entry) => entry.championship).length;
  const hiredSeason = franchiseHistory[0]?.season
    ?? Math.max(1, snapshot.season - franchiseHistory.length);

  return {
    careerHistory: [{
      teamId: snapshot.userTeamId,
      seasons: Math.max(1, franchiseHistory.length + ((totals.wins + totals.losses) > 0 ? 1 : 0)),
      record: totals,
      championships,
      hiredSeason,
      firedSeason: null,
      firedReason: null,
      reputation,
    }],
    currentTeamId: snapshot.userTeamId,
    reputation,
    overallRecord: totals,
    championships,
    hiredSeason,
    firedSeasons: [],
    careerAchievements: championships > 0
      ? [`Won ${championships} championship${championships === 1 ? '' : 's'}.`]
      : [],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

/**
 * Materializes only the two deterministic compatibility defaults that a
 * simulation worker requires in persisted state. Contract parsing remains the
 * wire-format boundary; this function defines the idempotent worker snapshot
 * fixed point used by import, boot verification, and journal baseline sealing.
 */
export function materializeSimulationImportDefaults(snapshot: GameSnapshot): GameSnapshot {
  const gmCareer = snapshot.narrative.gmCareer ?? backfillGMCareer(snapshot);
  const gmRelationships = snapshot.narrative.gmRelationships.length > 0
    ? snapshot.narrative.gmRelationships
    : Array.from(createRelationshipMap(
      TEAMS.map((team) => team.id),
      snapshot.userTeamId,
    ).entries());

  return GameSnapshotSchema.parse({
    ...snapshot,
    narrative: {
      ...snapshot.narrative,
      gmCareer,
      gmRelationships,
    },
  });
}
