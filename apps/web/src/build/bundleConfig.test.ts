import { describe, expect, it } from 'vitest';
import { getBudgetForBundleFile, resolveAppManualChunk, resolveWorkerManualChunk } from './bundleConfig';

describe('worker manual chunking', () => {
  it('assigns phase 12 and 13 worker modules to the story chunk', () => {
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.farm.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.narrativeFarm.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.records.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.storyArcs.ts')).toBe('game-engine-story');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.ticker.ts')).toBe('game-engine-story');
  });

  it('keeps authored worker content out of the engine core chunk', () => {
    expect(resolveWorkerManualChunk('/apps/web/src/workers/content/minorLeagueContent.ts')).toBe('game-engine-content-v1');
    expect(resolveWorkerManualChunk('/apps/web/src/workers/content/minorLeagueContentPack.v1.json')).toBe('game-engine-content-v1');
  });

  it('keeps compact archived game persistence out of the story chunk', () => {
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.archivedGames.ts')).toBe('game-engine-archives');
  });

  it('keeps the worker query facade out of the story chunk', () => {
    expect(resolveWorkerManualChunk('/apps/web/src/workers/sim.worker.queries.ts')).toBe('game-engine-queries');
  });

  it('keeps trade finance out of the engine core chunk', () => {
    expect(resolveWorkerManualChunk('/packages/sim-core/src/finance/tradeFinance.ts')).toBe('game-engine-trade-finance');
  });

  it('keeps worker budget lifts scoped to the oversized chunks', () => {
    expect(getBudgetForBundleFile('game-engine-story-D0fw_gN6.js')).toMatchObject({
      rawBudget: 499 * 1024,
      gzipBudget: 150 * 1024,
    });
    expect(getBudgetForBundleFile('game-engine-core-BfRj55UX.js')).toMatchObject({
      rawBudget: 446 * 1024,
      gzipBudget: 144 * 1024,
    });
    expect(getBudgetForBundleFile('game-engine-day-one-Co2_8WtX.js')).toMatchObject({
      rawBudget: 446 * 1024,
      gzipBudget: 143 * 1024,
    });
    expect(getBudgetForBundleFile('game-engine-content-v1-D2dth32s.js')).toMatchObject({
      rawBudget: 446 * 1024,
      gzipBudget: 143 * 1024,
    });
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
