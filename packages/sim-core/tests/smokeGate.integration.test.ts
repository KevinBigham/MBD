// @vitest-environment node

/**
 * smokeGate runtime note:
 * - tuned to 3 seasons
 * - local targeted runtime: 71.27s tests / 72.23s total on 2026-04-22
 */

import { GameSnapshotSchema, type GameSnapshot } from '@mbd/contracts';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TEAMS } from '../src/index.js';

const SMOKE_GATE_SEED = 2_601;
const SMOKE_GATE_YEARS = 3;
const MAX_RUNTIME_MS = 90_000;

const TEAM_IDS = new Set(TEAMS.map((team) => team.id));
const TEAM_ID_LIST_KEYS = new Set(['relatedTeamIds', 'teamIds']);
const EXPLICIT_TEAM_ID_KEYS = new Set([
  'championTeamId',
  'currentTeamId',
  'deficitTeamId',
  'higherSeedTeamId',
  'homeTeamId',
  'loserTeamId',
  'lowerSeedTeamId',
  'originTeamId',
  'runnerUpTeamId',
  'targetTeamId',
  'teamA',
  'teamB',
  'teamId',
  'userTeamId',
  'winnerTeamId',
]);

type WorkerHarness = Awaited<ReturnType<typeof loadWorkerHarness>>;

interface MonotonicPlayerLedger {
  arbitrationHistoryEntries: number;
  careerShutouts: number;
  extensionHistoryEntries: number;
  optionYearsUsed: number;
}

interface DynastyRunResult {
  finalSnapshot: GameSnapshot;
  runtimeMs: number;
}

async function loadWorkerHarness() {
  const [{ actionApi }, { queryApi }, helpers] = await Promise.all([
    import('../../../apps/web/src/workers/sim.worker.actions.ts'),
    import('../../../apps/web/src/workers/sim.worker.queries.ts'),
    import('../../../apps/web/src/workers/sim.worker.helpers.ts'),
  ]);

  return {
    actionApi,
    queryApi,
    requireState: helpers.requireState,
    setState: helpers.setState,
  };
}

function resetHarness(harness: WorkerHarness) {
  vi.restoreAllMocks();
  harness.setState(null);
}

function normalizeSnapshot(snapshot: GameSnapshot): GameSnapshot {
  const normalized = structuredClone(snapshot);
  normalized.news = [];
  normalized.narrative.briefingQueue = [];
  return normalized;
}

function standingsSort(
  left: {
    losses: number;
    pct: string;
    runDifferential: number;
    teamId: string;
    wins: number;
  },
  right: {
    losses: number;
    pct: string;
    runDifferential: number;
    teamId: string;
    wins: number;
  },
) {
  const leftPct = Number(left.pct);
  const rightPct = Number(right.pct);
  if (rightPct !== leftPct) return rightPct - leftPct;
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (left.losses !== right.losses) return left.losses - right.losses;
  if (right.runDifferential !== left.runDifferential) return right.runDifferential - left.runDifferential;
  return left.teamId.localeCompare(right.teamId);
}

function advanceEntireOffseason(harness: WorkerHarness) {
  harness.actionApi.proceedToOffseason();
  let guard = 0;

  while (!harness.requireState().offseasonState?.completed) {
    const progressed = harness.actionApi.skipOffseasonPhase() ?? harness.actionApi.advanceOffseason();
    expect(progressed, 'offseason progression must keep moving').not.toBeNull();
    guard += 1;
    if (guard > 20) {
      throw new Error('Offseason progression exceeded the expected number of phases.');
    }
  }
}

function assertKnownTeamId(teamId: string | null | undefined, path: string) {
  if (teamId == null) {
    return;
  }
  if (teamId === '') {
    return;
  }
  expect(
    TEAM_IDS.has(teamId),
    `Expected ${path} to reference a known team id, received "${teamId}".`,
  ).toBe(true);
}

function assertRequiredTeamId(teamId: string | null | undefined, path: string) {
  expect(teamId, `Expected ${path} to contain a team id`).toBeTruthy();
  assertKnownTeamId(teamId, path);
}

function validateTeamIdTuples(
  tuples: ReadonlyArray<readonly [string, unknown]>,
  label: string,
) {
  tuples.forEach(([teamId], index) => {
    assertRequiredTeamId(teamId, `${label}[${index}][0]`);
  });
}

function walkTeamReferences(value: unknown, path: string) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walkTeamReferences(entry, `${path}[${index}]`);
    });
    return;
  }

  if (value == null || typeof value !== 'object') {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (typeof child === 'string' && (EXPLICIT_TEAM_ID_KEYS.has(key) || key.endsWith('TeamId'))) {
      assertKnownTeamId(child, nextPath);
      continue;
    }

    if (Array.isArray(child) && TEAM_ID_LIST_KEYS.has(key)) {
      child.forEach((teamId, index) => {
        if (typeof teamId === 'string') {
          assertKnownTeamId(teamId, `${nextPath}[${index}]`);
        }
      });
      continue;
    }

    walkTeamReferences(child, nextPath);
  }
}

function validateTeamReferences(snapshot: GameSnapshot) {
  assertRequiredTeamId(snapshot.userTeamId, 'snapshot.userTeamId');
  assertRequiredTeamId(snapshot.franchise.teamId, 'snapshot.franchise.teamId');

  validateTeamIdTuples(snapshot.scoutingStaffs, 'snapshot.scoutingStaffs');
  validateTeamIdTuples(snapshot.gmPersonalities, 'snapshot.gmPersonalities');
  validateTeamIdTuples(snapshot.rosterStates, 'snapshot.rosterStates');
  validateTeamIdTuples(snapshot.coachingStaffs, 'snapshot.coachingStaffs');
  validateTeamIdTuples(snapshot.internationalScoutingState.budgets, 'snapshot.internationalScoutingState.budgets');
  validateTeamIdTuples(snapshot.internationalScoutingState.scoutingHistory, 'snapshot.internationalScoutingState.scoutingHistory');
  validateTeamIdTuples(snapshot.narrative.teamChemistry, 'snapshot.narrative.teamChemistry');
  validateTeamIdTuples(snapshot.narrative.ownerState, 'snapshot.narrative.ownerState');
  validateTeamIdTuples(snapshot.narrative.teamMoments, 'snapshot.narrative.teamMoments');
  validateTeamIdTuples(snapshot.narrative.frontOfficeState, 'snapshot.narrative.frontOfficeState');

  walkTeamReferences(snapshot, 'snapshot');
}

function validateUniquePlayerIds(snapshot: GameSnapshot) {
  const ids = snapshot.players.map((player) => player.id);
  expect(new Set(ids).size, 'snapshot.players must not contain duplicate player ids').toBe(ids.length);
}

function validateRosterAssignments(snapshot: GameSnapshot) {
  const playersById = new Map(snapshot.players.map((player) => [player.id, player] as const));
  const mlbAssignments = new Map<string, string>();
  const fortyManAssignments = new Map<string, string>();

  snapshot.rosterStates.forEach(([teamId, rosterState], rosterIndex) => {
    assertKnownTeamId(teamId, `snapshot.rosterStates[${rosterIndex}][0]`);

    expect(new Set(rosterState.mlbRoster).size, `MLB roster for ${teamId} must not contain duplicates`).toBe(
      rosterState.mlbRoster.length,
    );
    expect(
      new Set(rosterState.fortyManRoster).size,
      `40-man roster for ${teamId} must not contain duplicates`,
    ).toBe(rosterState.fortyManRoster.length);

    rosterState.mlbRoster.forEach((playerId) => {
      const player = playersById.get(playerId);
      expect(player, `MLB roster player ${playerId} must exist in snapshot.players`).toBeDefined();
      expect(player?.teamId, `MLB roster player ${playerId} must belong to ${teamId}`).toBe(teamId);
      expect(mlbAssignments.get(playerId), `MLB roster player ${playerId} must not appear twice`).toBeUndefined();
      mlbAssignments.set(playerId, teamId);
    });

    rosterState.fortyManRoster.forEach((playerId) => {
      const player = playersById.get(playerId);
      expect(player, `40-man roster player ${playerId} must exist in snapshot.players`).toBeDefined();
      expect(player?.teamId, `40-man roster player ${playerId} must belong to ${teamId}`).toBe(teamId);
      expect(
        fortyManAssignments.get(playerId),
        `40-man roster player ${playerId} must not appear on multiple teams`,
      ).toBeUndefined();
      fortyManAssignments.set(playerId, teamId);
    });
  });
}

function captureMonotonicLedger(snapshot: GameSnapshot) {
  return new Map(
    snapshot.players.map((player) => [
      player.id,
      {
        arbitrationHistoryEntries: player.arbitrationHistory.length,
        careerShutouts: player.careerShutouts,
        extensionHistoryEntries: player.extensionHistory.length,
        optionYearsUsed: player.optionYearsUsed,
      } satisfies MonotonicPlayerLedger,
    ] as const),
  );
}

function validateMonotonicLedgers(
  previous: Map<string, MonotonicPlayerLedger> | null,
  snapshot: GameSnapshot,
  season: number,
) {
  if (previous == null) {
    return;
  }

  snapshot.players.forEach((player) => {
    const prior = previous.get(player.id);
    if (!prior) {
      return;
    }

    expect(
      player.optionYearsUsed,
      `optionYearsUsed regressed for ${player.id} at season ${season}`,
    ).toBeGreaterThanOrEqual(prior.optionYearsUsed);
    expect(
      player.careerShutouts,
      `careerShutouts regressed for ${player.id} at season ${season}`,
    ).toBeGreaterThanOrEqual(prior.careerShutouts);
    expect(
      player.arbitrationHistory.length,
      `arbitrationHistory length regressed for ${player.id} at season ${season}`,
    ).toBeGreaterThanOrEqual(prior.arbitrationHistoryEntries);
    expect(
      player.extensionHistory.length,
      `extensionHistory length regressed for ${player.id} at season ${season}`,
    ).toBeGreaterThanOrEqual(prior.extensionHistoryEntries);
  });
}

function validateYearBoundarySnapshot(
  harness: WorkerHarness,
  snapshot: GameSnapshot,
  season: number,
  previousHallOfFameCount: number,
  previousLedger: Map<string, MonotonicPlayerLedger> | null,
) {
  const standingsView = harness.queryApi.getStandings();
  expect(standingsView, `season ${season} must expose standings through queryApi`).not.toBeNull();

  const standings = standingsView?.divisions ?? {};
  expect(Object.keys(standings).length, `season ${season} must expose all six divisions`).toBe(6);

  let totalWins = 0;
  let totalLosses = 0;
  for (const [division, entries] of Object.entries(standings)) {
    expect(entries.length, `${division} must have at least one standings entry`).toBeGreaterThan(0);
    for (let index = 0; index < entries.length - 1; index += 1) {
      const current = entries[index]!;
      const next = entries[index + 1]!;
      expect(
        standingsSort(current, next),
        `${division} standings must stay sorted at season ${season}`,
      ).toBeLessThanOrEqual(0);
    }

    entries.forEach((entry) => {
      totalWins += entry.wins;
      totalLosses += entry.losses;
      assertKnownTeamId(entry.teamId, `queryApi.getStandings().divisions.${division}.${entry.teamId}`);
    });
  }

  expect(totalWins, `season ${season} total wins must equal total losses`).toBe(totalLosses);

  const playoffBracket = harness.queryApi.getPlayoffBracket();
  expect(playoffBracket, `season ${season} must have a playoff bracket`).not.toBeNull();
  expect(playoffBracket?.seeds.length, `season ${season} playoff bracket must seed 12 teams`).toBe(12);
  expect(playoffBracket?.champion, `season ${season} playoff bracket must resolve a champion`).toBeTruthy();

  validateUniquePlayerIds(snapshot);
  validateRosterAssignments(snapshot);
  validateTeamReferences(snapshot);

  const hallOfFameCount = harness.queryApi.getHallOfFame().length;
  expect(
    hallOfFameCount,
    `Hall of Fame count must not decrease at season ${season}`,
  ).toBeGreaterThanOrEqual(previousHallOfFameCount);

  validateMonotonicLedgers(previousLedger, snapshot, season);
}

async function runDynasty(
  seed: number,
  seasons: number,
  options: {
    roundTripAtEnd: boolean;
    validateInvariants: boolean;
  },
): Promise<DynastyRunResult> {
  vi.resetModules();
  const harness = await loadWorkerHarness();
  let previousHallOfFameCount = 0;
  let previousLedger: Map<string, MonotonicPlayerLedger> | null = null;

  try {
    resetHarness(harness);

    harness.actionApi.newGame({
      seed,
      userTeamId: 'nym',
      gmName: 'General Manager',
      difficulty: 'standard',
      saveSlot: 1,
    });

    const startedAt = process.hrtime.bigint();

    for (let seasonIndex = 0; seasonIndex < seasons; seasonIndex += 1) {
      const currentSeason = harness.requireState().season;

      const regularSeason = harness.actionApi.simToPlayoffs();
      expect(regularSeason.phase, `season ${currentSeason} must advance into playoffs`).toBe('playoffs');

      const playoffs = harness.actionApi.simRemainingPlayoffs();
      expect(playoffs.phase, `season ${currentSeason} must remain in playoff phase after postseason sim`).toBe(
        'playoffs',
      );

      const exported = GameSnapshotSchema.parse(harness.actionApi.exportSnapshot());
      const seasonBoundarySnapshot = normalizeSnapshot(exported);

      if (options.validateInvariants) {
        validateYearBoundarySnapshot(
          harness,
          seasonBoundarySnapshot,
          currentSeason,
          previousHallOfFameCount,
          previousLedger,
        );
        previousHallOfFameCount = harness.queryApi.getHallOfFame().length;
        previousLedger = captureMonotonicLedger(seasonBoundarySnapshot);
      }

      if (seasonIndex < seasons - 1) {
        advanceEntireOffseason(harness);
        const preseason = harness.actionApi.startNextSeason();
        expect(preseason.season, `season rollover must increment after season ${currentSeason}`).toBe(
          currentSeason + 1,
        );
        expect(preseason.phase, `season rollover must land in preseason after season ${currentSeason}`).toBe(
          'preseason',
        );
      }
    }

    const runtimeMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    expect(runtimeMs, 'smokeGate runtime must stay under the hard stop').toBeLessThan(MAX_RUNTIME_MS);

    const finalExported = GameSnapshotSchema.parse(harness.actionApi.exportSnapshot());
    let finalSnapshot = normalizeSnapshot(finalExported);

    if (options.roundTripAtEnd) {
      const imported = harness.actionApi.importSnapshot(finalExported);
      expect(imported.success, 'final smokeGate save/load round-trip must succeed').toBe(true);

      finalSnapshot = normalizeSnapshot(GameSnapshotSchema.parse(harness.actionApi.exportSnapshot()));
      expect(
        finalSnapshot,
        'final smokeGate snapshot must survive the end-to-end save/load round-trip',
      ).toEqual(normalizeSnapshot(finalExported));
    }

    return {
      finalSnapshot,
      runtimeMs,
    };
  } finally {
    resetHarness(harness);
  }
}

describe('smokeGate integration', () => {
  let baseline: DynastyRunResult;

  beforeAll(async () => {
    baseline = await runDynasty(SMOKE_GATE_SEED, SMOKE_GATE_YEARS, {
      roundTripAtEnd: true,
      validateInvariants: true,
    });
  }, 180_000);

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('drives a multi-year dynasty with year-boundary invariants, end-to-end save/load, and deterministic replay', async () => {
    expect(baseline.finalSnapshot.schemaVersion).toBe(27);
    expect(baseline.finalSnapshot.season).toBe(SMOKE_GATE_YEARS);
    expect(baseline.finalSnapshot.phase).toBe('playoffs');
    expect(baseline.runtimeMs).toBeLessThan(MAX_RUNTIME_MS);
    const replay = await runDynasty(SMOKE_GATE_SEED, SMOKE_GATE_YEARS, {
      roundTripAtEnd: false,
      validateInvariants: false,
    });

    expect(JSON.stringify(replay.finalSnapshot)).toBe(JSON.stringify(baseline.finalSnapshot));
  }, 180_000);
});
