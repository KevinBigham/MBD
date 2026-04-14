import { expect, vi } from 'vitest';
import type { AwardHistoryEntry, GameSnapshot } from '@mbd/contracts';
import { TEAMS, type SeasonState } from '@mbd/sim-core';

import { api } from './sim.worker';
import { requireState, setState } from './sim.worker.helpers';

export { api, requireState, setState };

export function resetIntegrationState() {
  vi.restoreAllMocks();
  setState(null);
}

export function startGame(seed: number, userTeamId: string = 'nym') {
  return api.newGame({
    seed,
    userTeamId,
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
  });
}

export function totalWinsAndLosses() {
  const standings = Object.values(requireState().seasonState.standings.getFullStandings()).flat();
  return standings.reduce(
    (summary: { wins: number; losses: number }, entry) => ({
      wins: summary.wins + entry.wins,
      losses: summary.losses + entry.losses,
    }),
    { wins: 0, losses: 0 },
  );
}

export function validateRosterIntegrity(options: { minMlb?: number; maxMlb?: number } = {}) {
  const state = requireState();
  const knownPlayers = new Set(state.players.map((player) => player.id));
  const minMlb = options.minMlb ?? 18;
  const maxMlb = options.maxMlb ?? 30;

  for (const rosterState of state.rosterStates.values()) {
    expect(rosterState.mlbRoster.length).toBeGreaterThanOrEqual(minMlb);
    expect(rosterState.mlbRoster.length).toBeLessThanOrEqual(maxMlb);
    expect(new Set(rosterState.mlbRoster).size).toBe(rosterState.mlbRoster.length);
    expect(new Set(rosterState.fortyManRoster).size).toBe(rosterState.fortyManRoster.length);
    expect(rosterState.fortyManRoster.length).toBeGreaterThanOrEqual(rosterState.mlbRoster.length);
    expect(rosterState.mlbRoster.every((playerId) => knownPlayers.has(playerId))).toBe(true);
    expect(rosterState.fortyManRoster.every((playerId) => knownPlayers.has(playerId))).toBe(true);
  }
}

export function validateStatBounds() {
  const stats = Array.from(requireState().seasonState.playerSeasonStats.values());
  const maxHomeRuns = Math.max(...stats.map((entry) => entry.hr));
  const worstEra = Math.max(
    ...stats
      .filter((entry) => entry.ip >= 81)
      .map((entry) => (entry.earnedRuns * 27) / entry.ip),
    0,
  );

  expect(maxHomeRuns).toBeLessThan(200);
  expect(worstEra).toBeLessThan(10);
}

export function advanceEntireOffseason() {
  api.proceedToOffseason();
  let guard = 0;

  while (!requireState().offseasonState?.completed) {
    const progressed = api.skipOffseasonPhase() ?? api.advanceOffseason();
    expect(progressed).not.toBeNull();
    guard += 1;
    if (guard > 20) {
      throw new Error('Offseason progression exceeded the expected number of phases.');
    }
  }
}

export function jumpToLateSeasonCheckpoint(day: number = 154) {
  const state = requireState();
  const mutableSeasonState = state.seasonState as SeasonState & {
    currentDay: number;
    completed: boolean;
  };
  state.day = day;
  state.phase = 'regular';
  mutableSeasonState.currentDay = day;
  mutableSeasonState.completed = false;
}

export function forceCompletedPlayoffBracket() {
  const state = requireState();
  if (state.phase !== 'playoffs' || !state.playoffBracket) {
    throw new Error('Expected an active playoff bracket before forcing completion.');
  }

  const fallbackChampion = state.playoffBracket.seeds[0]?.teamId ?? state.userTeamId;
  const fallbackRunnerUp = state.playoffBracket.seeds[1]?.teamId ?? state.userTeamId;
  const worldSeries = state.playoffBracket.series.find((series) => series.round === 'WORLD_SERIES');

  state.playoffBracket = {
    ...state.playoffBracket,
    champion: worldSeries?.winnerId ?? fallbackChampion,
    runnerUp: worldSeries?.loserId ?? fallbackRunnerUp,
  };
}

export function normalizeSnapshotForComparison(snapshot: GameSnapshot): GameSnapshot {
  const normalized = structuredClone(snapshot);
  normalized.news = [];
  normalized.narrative.briefingQueue = [];
  return normalized;
}

export function runFullSeasonCycle(seed: number) {
  startGame(seed);
  const regularSeason = api.simToPlayoffs();
  expect(regularSeason.phase).toBe('playoffs');
  validateRosterIntegrity({ minMlb: 26, maxMlb: 30 });
  const totals = totalWinsAndLosses();
  expect(totals.wins).toBeGreaterThan(0);
  expect(totals.wins).toBe(totals.losses);
  validateStatBounds();

  const playoffResult = api.simRemainingPlayoffs();
  expect(playoffResult.phase).toBe('playoffs');
  expect(requireState().playoffBracket?.champion).toBeTruthy();

  const exported = api.exportSnapshot();
  const imported = api.importSnapshot(exported);
  expect(imported.season).toBe(exported.season);
  expect(normalizeSnapshotForComparison(api.exportSnapshot() as GameSnapshot)).toEqual(
    normalizeSnapshotForComparison(exported as GameSnapshot),
  );

  advanceEntireOffseason();
  const preseason = api.startNextSeason();
  expect(preseason.season).toBe(2);
  expect(preseason.phase).toBe('preseason');

  return api.exportSnapshot();
}

export function createLegacyV8Snapshot(seed: number): GameSnapshot {
  startGame(seed);
  const snapshot = api.exportSnapshot() as GameSnapshot;
  const legacySnapshot = structuredClone(snapshot) as Record<string, unknown> & GameSnapshot & {
    monthlyPulse?: unknown;
    franchise?: unknown;
    ceremony?: unknown;
    achievements?: unknown;
  };

  (legacySnapshot as Record<string, unknown>).schemaVersion = 8;
  legacySnapshot.seasonState.playerSeasonStats = legacySnapshot.seasonState.playerSeasonStats.map(
    ([playerId, stats]) => [
      playerId,
      {
        pa: stats.pa,
        ab: stats.ab,
        hits: stats.hits,
        doubles: stats.doubles,
        triples: stats.triples,
        hr: stats.hr,
        rbi: stats.rbi,
        bb: stats.bb,
        k: stats.k,
        runs: stats.runs,
        ip: stats.ip,
        earnedRuns: stats.earnedRuns,
        strikeouts: stats.strikeouts,
        walks: stats.walks,
        hitsAllowed: stats.hitsAllowed,
        wins: stats.wins,
        losses: stats.losses,
      },
    ],
  ) as GameSnapshot['seasonState']['playerSeasonStats'];

  delete (legacySnapshot as { monthlyPulse?: unknown }).monthlyPulse;
  delete (legacySnapshot as { franchise?: unknown }).franchise;
  delete (legacySnapshot as { ceremony?: unknown }).ceremony;
  delete (legacySnapshot as { achievements?: unknown }).achievements;

  return legacySnapshot as GameSnapshot;
}

export function seedRetiringHallOfFamer() {
  const state = requireState();
  const icon = state.players.find(
    (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
  );

  if (!icon) {
    throw new Error('Expected to find a user-team hitter to convert into a legacy icon.');
  }

  icon.firstName = 'Victor';
  icon.lastName = 'Legacy';
  icon.age = 44;
  icon.overallRating = 475;
  icon.contract.years = 1;
  state.serviceTime.set(icon.id, 20);
  state.careerStats = state.careerStats.filter((entry) => entry.playerId !== icon.id);
  state.careerStats.push({
    playerId: icon.id,
    playerName: 'Victor Legacy',
    position: icon.position,
    seasonsPlayed: 20,
    teamIds: ['nym'],
    peakOverall: 99,
    championshipRings: 3,
    allStarSelections: 10,
    batting: {
      hits: 3_245,
      hr: 541,
      rbi: 1_732,
    },
    pitching: null,
  });

  const awards: AwardHistoryEntry[] = [
    {
      season: 1,
      award: 'MVP',
      league: 'MLB',
      playerId: icon.id,
      teamId: 'nym',
      summary: 'Won the MVP award.',
    },
    {
      season: 2,
      award: 'Silver Slugger',
      league: 'MLB',
      playerId: icon.id,
      teamId: 'nym',
      summary: 'Anchored the middle of the order.',
    },
  ];
  state.awardHistory = [
    ...state.awardHistory.filter((entry) => entry.playerId !== icon.id),
    ...awards,
  ];

  return icon.id;
}

export { TEAMS };
