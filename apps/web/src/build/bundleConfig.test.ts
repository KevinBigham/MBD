import { describe, expect, it } from 'vitest';
import { resolveAppManualChunk, resolveWorkerManualChunk } from './bundleConfig';

describe('worker manual chunking', () => {
  it('assigns phase 12 and 13 worker modules to the story chunk', () => {
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.farm.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.narrativeFarm.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.records.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.storyArcs.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.ticker.ts')).toBe('game-engine-story');
  });
});

describe('app manual chunking — phase 16 vendor splits', () => {
  it('routes recharts to vendor-charts', () => {
    expect(resolveAppManualChunk('/node_modules/recharts/es6/chart/LineChart.js')).toBe('vendor-charts');
  });

  it('routes d3 sub-packages to vendor-charts', () => {
    expect(resolveAppManualChunk('/node_modules/d3-scale/src/linear.js')).toBe('vendor-charts');
    expect(resolveAppManualChunk('/node_modules/d3-shape/src/arc.js')).toBe('vendor-charts');
  });

  it('routes @dnd-kit to vendor-ui', () => {
    expect(resolveAppManualChunk('/node_modules/@dnd-kit/core/dist/index.js')).toBe('vendor-ui');
    expect(resolveAppManualChunk('/node_modules/@dnd-kit/sortable/dist/index.js')).toBe('vendor-ui');
  });
});
