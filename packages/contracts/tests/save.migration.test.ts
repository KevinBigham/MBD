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
  it('migrates the v17 fixture into the additive v18 Day One shape', () => {
    const fixture = loadFixture('./fixtures/save/v17/core.json');

    const migrated = parseGameSnapshot(fixture);

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(migrated.franchise.dayOne.status).toBe('complete');
    expect(migrated.franchise.dayOne.currentStep).toBe('complete');
    expect(migrated.franchise.dayOne.selectedAGMId).toBe('marcus_chen');
    expect(migrated.franchise.dayOne.seasonGoal).toBe('playoff');
    expect(migrated.franchise.dayOne.quickStartRecapSeen).toBe(true);
  });

  it('migrates the v18 fixture into the additive v19 arbitration shape', () => {
    const fixture = loadFixture('./fixtures/save/v18/core.json');

    const migrated = parseGameSnapshot(fixture);
    const [player] = migrated.players;

    expect(migrated.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(player?.arbitrationHistory).toEqual([]);
    expect(player?.holdoutState).toBeNull();
    expect(player?.superTwoQualified).toBe(false);
  });

  it('rejects malformed legacy fixtures during migration', () => {
    const fixture = loadFixture('./fixtures/save/v18/core.json');
    fixture.players[0].id = 7;

    expect(() => parseGameSnapshot(fixture)).toThrow();
  });
});
