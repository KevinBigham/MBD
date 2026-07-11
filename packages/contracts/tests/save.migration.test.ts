import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  parseGameSnapshot,
} from '../src/index.js';

function loadFixture(pathname: string) {
  return JSON.parse(readFileSync(new URL(pathname, import.meta.url), 'utf8'));
}

function pick<T extends Record<string, unknown>>(source: T, keys: readonly string[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

describe('save schema migration', () => {
  it('tracks the current additive save schema as v34', () => {
    expect(CURRENT_GAME_SNAPSHOT_VERSION).toBe(34);
  });

  it('parses an authentic v3 eight-lane narrative and preserves it through v34 migration', () => {
    // The repository has no checked-in v3 JSON fixture.  This is deliberately
    // projected from the archived v16 contract fixture using the exact v3 root
    // and NarrativeSnapshotV4 lane sets, rather than relabeling a v34 object.
    const laterFixture = loadFixture('./fixtures/save/v16/core.json');
    const v3RootKeys = [
      'rng', 'season', 'day', 'phase', 'userTeamId', 'players', 'schedule', 'seasonState',
      'playoffBracket', 'injuries', 'serviceTime', 'scoutingStaffs', 'gmPersonalities',
      'offseasonState', 'draftClass', 'freeAgencyMarket', 'news', 'rosterStates',
    ];
    const narrativeKeys = [
      'playerMorale', 'teamChemistry', 'ownerState', 'briefingQueue', 'storyFlags', 'rivalries',
      'awardHistory', 'seasonHistory',
    ];
    const rawV3 = {
      schemaVersion: 3,
      ...pick(laterFixture, v3RootKeys),
      narrative: pick(laterFixture.narrative, narrativeKeys),
    };

    expect(Object.keys(rawV3.narrative).sort()).toEqual([...narrativeKeys].sort());
    const migrated = parseGameSnapshot(rawV3);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.narrative.playerMorale).toEqual(rawV3.narrative.playerMorale);
    expect(migrated.narrative.teamChemistry).toEqual(rawV3.narrative.teamChemistry);
    expect(migrated.narrative.ownerState).toEqual(rawV3.narrative.ownerState);
    expect(migrated.narrative.briefingQueue).toEqual(rawV3.narrative.briefingQueue);
    expect(migrated.narrative.storyFlags).toEqual(rawV3.narrative.storyFlags);
    expect(migrated.narrative.rivalries).toEqual(rawV3.narrative.rivalries);
    expect(migrated.narrative.awardHistory).toEqual(rawV3.narrative.awardHistory);
    expect(migrated.narrative.seasonHistory).toEqual(rawV3.narrative.seasonHistory);
    expect(migrated.narrative.hallOfFame).toEqual([]);
    expect(migrated.tradeState).toEqual({ pendingOffers: [], tradeHistory: [], negotiations: [], multiTeamPendingTrades: [] });
    expect(migrated.narrative.playerMoments).toEqual([]);
  });

  it('keeps v8-and-current draft schemas strict while v7 owns the compatibility default', () => {
    const current = loadFixture('./fixtures/save/v34/core.json');
    const missingQualifyingOffers = {
      ...current,
      draftState: { ...current.draftState },
    };
    delete missingQualifyingOffers.draftState.qualifyingOffers;
    const missingSigningDecisions = {
      ...current,
      draftState: { ...current.draftState },
    };
    delete missingSigningDecisions.draftState.signingDecisions;

    expect(() => parseGameSnapshot(missingQualifyingOffers)).toThrow();
    expect(() => parseGameSnapshot(missingSigningDecisions)).toThrow();
    expect(() => parseGameSnapshot({ ...missingQualifyingOffers, schemaVersion: 8 })).toThrow();
  });

  it('migrates the v17 fixture into the additive v25 shape', () => {
    const fixture = loadFixture('./fixtures/save/v17/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.franchise.dayOne.status).toBe('complete');
    expect(migrated.franchise.dayOne.currentStep).toBe('complete');
    expect(migrated.franchise.dayOne.selectedAGMId).toBe('marcus_chen');
    expect(migrated.franchise.dayOne.seasonGoal).toBe('playoff');
    expect(migrated.franchise.dayOne.quickStartRecapSeen).toBe(true);
    expect(migrated.narrative.teamMoments).toEqual([]);
  });

  it('migrates the v18 fixture into the additive v25 arbitration shape', () => {
    const fixture = loadFixture('./fixtures/save/v18/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.arbitrationHistory).toEqual([]);
    expect(player?.holdoutState).toBeNull();
    expect(player?.superTwoQualified).toBe(false);
    expect(migrated.narrative.teamMoments).toEqual([]);
  });

  it('migrates the v19 fixture into the additive v25 broadcast shape', () => {
    const fixture = loadFixture('./fixtures/save/v19/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.arbitrationHistory).toEqual([]);
    expect(player?.holdoutState).toBeNull();
    expect(player?.superTwoQualified).toBe(false);
    expect(migrated.narrative.teamMoments).toEqual([]);
  });

  it('migrates the v20 fixture into the additive v25 trade-deadline shape', () => {
    const fixture = loadFixture('./fixtures/save/v20/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.arbitrationHistory).toEqual([]);
    expect(player?.holdoutState).toBeNull();
    expect(player?.superTwoQualified).toBe(false);
    expect(migrated.narrative.teamMoments).toEqual([]);
  });

  it('migrates the v21 fixture into the additive v25 team-moments shape', () => {
    const fixture = loadFixture('./fixtures/save/v21/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.arbitrationHistory).toEqual([]);
    expect(player?.holdoutState).toBeNull();
    expect(player?.superTwoQualified).toBe(false);
    expect(migrated.narrative.teamMoments).toEqual([]);
  });

  it('migrates the v22 fixture into the additive v25 season-identity enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v22/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.narrative.teamMoments).toEqual([]);
  });

  it('migrates the v23 fixture into the additive v25 season-identity enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v23/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.narrative.teamMoments).toEqual([]);
  });

  it('migrates the v24 fixture into the additive v25 season-identity enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v24/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('division titles'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v25 fixture into the additive v26 wave-3 enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v25/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('division titles'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v26 fixture into the additive v27 persisted-fidelity shape', () => {
    const fixture = loadFixture('./fixtures/save/v26/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;
    const [playerSeasonStats] = migrated.seasonState.playerSeasonStats;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player).toMatchObject({
      teamTenures: [],
      priorSeasonGamesMissed: 0,
      careerShutouts: 0,
    });
    expect(playerSeasonStats?.[1]).toMatchObject({
      gamesMissedToInjury: 0,
    });
    expect(migrated.seasonState.monthlyRecordSplits).toEqual({});
    expect(migrated.narrative.playoffSeriesHistory).toEqual([]);
    expect(migrated.narrative.rookieOfTheYearVoting).toEqual([]);
  });

  it('migrates the v27 fixture into the additive v28 rivalry-renewed enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v27/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('franchise identity'),
          }),
          expect.objectContaining({
            type: 'rivalry_renewed',
            description: expect.stringContaining('rivalry'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v28 fixture into the additive v29 player-arc carryover shape', () => {
    const fixture = loadFixture('./fixtures/save/v28/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.priorSeasonEstimatedWar).toBeNull();
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('franchise identity'),
          }),
          expect.objectContaining({
            type: 'rivalry_renewed',
            description: expect.stringContaining('rivalry'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v29 fixture into the additive v30 dynasty-marker enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v29/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.priorSeasonEstimatedWar).toBeNull();
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('franchise identity'),
          }),
          expect.objectContaining({
            type: 'rivalry_renewed',
            description: expect.stringContaining('rivalry'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v30 fixture into the additive v31 position-group enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v30/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.priorSeasonEstimatedWar).toBeNull();
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('franchise identity'),
          }),
          expect.objectContaining({
            type: 'rivalry_renewed',
            description: expect.stringContaining('rivalry'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v31 fixture into the additive v32 player micro-arc enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v31/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.priorSeasonEstimatedWar).toBeNull();
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('franchise identity'),
          }),
          expect.objectContaining({
            type: 'rivalry_renewed',
            description: expect.stringContaining('rivalry'),
          }),
        ],
      ],
    ]);
    expect(migrated.narrative.playerMoments).toEqual([
      [
        '11111111-1111-4111-8111-111111111111',
        [
          expect.objectContaining({
            type: 'redemption_arc',
            description: expect.stringContaining('rebound'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v32 fixture into the additive v33 weekly moment enum shape', () => {
    const fixture = loadFixture('./fixtures/save/v32/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.priorSeasonEstimatedWar).toBeNull();
    expect(migrated.narrative.teamMoments).toEqual([
      [
        'nym',
        [
          expect.objectContaining({
            type: 'first_dynasty_peak',
            description: expect.stringContaining('franchise identity'),
          }),
          expect.objectContaining({
            type: 'rivalry_renewed',
            description: expect.stringContaining('rivalry'),
          }),
        ],
      ],
    ]);
    expect(migrated.narrative.playerMoments).toEqual([
      [
        '11111111-1111-4111-8111-111111111111',
        [
          expect.objectContaining({
            type: 'redemption_arc',
            description: expect.stringContaining('rebound'),
          }),
        ],
      ],
    ]);
  });

  it('migrates the v33 fixture into the additive v34 archived-game shape', () => {
    const fixture = loadFixture('./fixtures/save/v33/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(fixture.schemaVersion).toBe(33);
    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.narrative.archivedGames).toEqual([]);
  });

  it('migrates an explicit Season 10 v33 save without fabricating archived games', () => {
    const fixture = loadFixture('./fixtures/save/v33/season10.json');

    const migrated = parseGameSnapshot(fixture);

    expect(fixture.schemaVersion).toBe(33);
    expect(fixture.season).toBe(10);
    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.season).toBe(10);
    expect(migrated.narrative.archivedGames).toEqual([]);
  });

  it('parses a current-schema v34 fixture without applying a migration', () => {
    const fixture = loadFixture('./fixtures/save/v34/core.json');

    const parsed = parseGameSnapshot(fixture);

    expect(parsed.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(fixture.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
  });

  it('round-trips a current-schema snapshot through JSON without drift', () => {
    const fixture = loadFixture('./fixtures/save/v34/core.json');

    const first = parseGameSnapshot(fixture);
    const second = parseGameSnapshot(JSON.parse(JSON.stringify(first)));

    expect(second).toEqual(first);
  });

  it('rejects malformed legacy fixtures during migration', () => {
    const fixture = loadFixture('./fixtures/save/v18/core.json');
    fixture.players[0].id = 7;

    expect(() => parseGameSnapshot(fixture)).toThrow();
  });
});
