export const MAIN_THREAD_CHUNK_BUDGET_BYTES = 250 * 1024;
export const MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES = 80 * 1024;
export const WORKER_CHUNK_BUDGET_BYTES = 360 * 1024;
export const WORKER_CHUNK_GZIP_BUDGET_BYTES = 110 * 1024;

function normalizePath(id: string): string {
  return id.replaceAll('\\', '/');
}

function includesPackage(id: string, packageName: string): boolean {
  const normalized = normalizePath(id);
  return normalized.includes(`/node_modules/${packageName}/`);
}

function includesPath(id: string, pathFragment: string): boolean {
  return normalizePath(id).includes(pathFragment);
}

export function isWorkerBundleFile(fileName: string): boolean {
  return /sim\.worker|game-engine|worker/i.test(fileName);
}

export function resolveAppManualChunk(id: string): string | undefined {
  const normalized = normalizePath(id);

  if (
    includesPackage(normalized, 'react')
    || includesPackage(normalized, 'scheduler')
  ) {
    return 'vendor-react';
  }

  if (includesPackage(normalized, 'react-dom')) {
    return 'vendor-renderer';
  }

  if (
    includesPackage(normalized, 'react-router')
    || includesPackage(normalized, 'react-router-dom')
  ) {
    return 'vendor-router';
  }

  if (
    includesPackage(normalized, '@radix-ui')
    || includesPackage(normalized, 'lucide-react')
    || includesPackage(normalized, 'class-variance-authority')
    || includesPackage(normalized, 'tailwind-merge')
    || includesPackage(normalized, 'cmdk')
  ) {
    return 'vendor-ui';
  }

  if (
    includesPackage(normalized, 'dexie')
    || includesPackage(normalized, 'pako')
    || includesPackage(normalized, 'zustand')
    || includesPackage(normalized, 'comlink')
  ) {
    return 'vendor-data';
  }

  if (
    includesPackage(normalized, '@tanstack/react-table')
    || includesPackage(normalized, '@tanstack/react-virtual')
  ) {
    return 'vendor-table';
  }

  return undefined;
}

export function resolveWorkerManualChunk(id: string): string | undefined {
  const normalized = normalizePath(id);

  if (
    includesPackage(normalized, 'pure-rand')
    || includesPackage(normalized, 'comlink')
  ) {
    return 'game-engine-vendor';
  }

  if (
    includesPath(normalized, '/apps/web/src/workers/sim.worker.helpers.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.setup.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.narrative.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.queries.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.pressRoom.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.monthlyPulse.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.legacy.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.consequences.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.achievements.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.ceremony.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.trade.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.stats.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.farm.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.narrativeFarm.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.records.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.storyArcs.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.ticker.ts')
    || includesPath(normalized, '/apps/web/src/workers/snapshot.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.state.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.actions.ts')
    || includesPath(normalized, '/apps/web/src/workers/sim.worker.diagnostics.ts')
  ) {
    return 'game-engine-story';
  }

  if (includesPath(normalized, '/packages/sim-core/src/')) {
    return 'game-engine-core';
  }

  if (includesPath(normalized, '/packages/contracts/src/')) {
    return 'game-engine-contracts';
  }

  if (
    includesPath(normalized, '/apps/web/src/workers/')
    || includesPath(normalized, '/packages/sim-worker/src/')
  ) {
    return 'game-engine-shell';
  }

  return undefined;
}
