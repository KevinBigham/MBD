import { describe, expect, it } from 'vitest';
import { resolveWorkerManualChunk } from './bundleConfig';

describe('worker manual chunking', () => {
  it('assigns phase 12 and 13 worker modules to the story chunk', () => {
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.farm.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.narrativeFarm.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.records.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.storyArcs.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.ticker.ts')).toBe('game-engine-story');
  });
});
