// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameSnapshot } from '@mbd/contracts';

vi.mock('comlink', () => ({
  expose: () => {},
}));

import {
  api,
  createLegacyV8Snapshot,
  normalizeSnapshotForComparison,
  resetIntegrationState,
  runFullSeasonCycle,
  setState,
  startGame,
  validateRosterIntegrity,
} from './sim.worker.integration.helpers';

describe('worker lifecycle integration', () => {
  afterEach(() => {
    resetIntegrationState();
  });

  it('simulates setup through season two with a clean save/load round-trip', () => {
    const snapshot = runFullSeasonCycle(3_101);

    expect(snapshot.schemaVersion).toBe(18);
    expect(snapshot.season).toBe(2);
    expect(snapshot.phase).toBe('preseason');

    const continued = api.simMonth();
    expect(continued.season).toBe(2);
    validateRosterIntegrity();
  }, 120_000);

  it('replays the same seeded first month identically', () => {
    startGame(3_102);
    api.simMonth();
    const first = {
      snapshot: normalizeSnapshotForComparison(api.exportSnapshot() as GameSnapshot),
      achievements: api.getAchievements(),
      history: api.getSeasonHistory(),
    };

    setState(null);

    startGame(3_102);
    api.simMonth();
    const second = {
      snapshot: normalizeSnapshotForComparison(api.exportSnapshot() as GameSnapshot),
      achievements: api.getAchievements(),
      history: api.getSeasonHistory(),
    };

    expect(first).toEqual(second);
  }, 30_000);

  it('migrates a v8 snapshot to v18 and continues simming from the repaired state', () => {
    const legacySnapshot = createLegacyV8Snapshot(3_103);
    setState(null);

    const imported = api.importSnapshot(legacySnapshot);
    const repaired = api.exportSnapshot();

    expect(imported.success).toBe(true);
    expect(repaired.schemaVersion).toBe(18);
    expect(repaired.franchise.gmName).toBe('General Manager');
    expect(repaired.monthlyPulse).toBeDefined();
    expect(repaired.achievements).toBeDefined();

    const nextMonth = api.simMonth();
    expect(nextMonth.season).toBe(1);
  }, 30_000);
});
