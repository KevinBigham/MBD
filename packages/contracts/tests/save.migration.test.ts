import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  parseGameSnapshot,
} from '../src/index.js';

function loadFixture(pathname: string) {
  return JSON.parse(readFileSync(new URL(pathname, import.meta.url), 'utf8'));
}

describe('save schema migration', () => {
  it('tracks the current additive save schema as v29', () => {
    expect(CURRENT_GAME_SNAPSHOT_VERSION).toBe(29);
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

  it('rejects malformed legacy fixtures during migration', () => {
    const fixture = loadFixture('./fixtures/save/v18/core.json');
    fixture.players[0].id = 7;

    expect(() => parseGameSnapshot(fixture)).toThrow();
  });
});
