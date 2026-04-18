export const MAIN_THREAD_CHUNK_BUDGET_BYTES = 300 * 1024;
export const MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES = 80 * 1024;
export const WORKER_CHUNK_BUDGET_BYTES = 408 * 1024;
export const WORKER_CHUNK_GZIP_BUDGET_BYTES = 122 * 1024;

/** Lazy-loaded chart vendor chunk (recharts + d3) gets a bigger budget. */
export const CHART_CHUNK_BUDGET_BYTES = 430 * 1024;
export const CHART_CHUNK_GZIP_BUDGET_BYTES = 120 * 1024;

/** Returns true if the chunk file is the lazy-loaded chart vendor bundle. */
export function isChartBundleFile(fileName: string): boolean {
  return /vendor-charts/i.test(fileName);
}

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
    includesPackage(normalized, 'recharts')
    || normalized.includes('/node_modules/d3-')
    || includesPackage(normalized, 'victory-vendor')
  ) {
    return 'vendor-charts';
  }

  if (
    includesPackage(normalized, '@radix-ui')
    || includesPackage(normalized, 'lucide-react')
    || includesPackage(normalized, 'class-variance-authority')
    || includesPackage(normalized, 'tailwind-merge')
    || includesPackage(normalized, 'cmdk')
    || includesPackage(normalized, '@dnd-kit')
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

  // Onboarding modules are only loaded during the Day 1 flow. Split them
  // into their own chunk so the engine-core bundle stays under budget.
  if (includesPath(normalized, '/packages/sim-core/src/onboarding/')) {
    return 'game-engine-onboarding';
  }

  if (includesPath(normalized, '/packages/sim-core/src/')) {
    return 'game-engine-core';
  }

  if (includesPath(normalized, '/packages/contracts/src/')) {
    return 'game-engine-contracts';
  }

  // All worker modules go into game-engine-story. Only the Comlink entry
  // point (sim.worker.ts, NOT sim.worker.*.ts) stays in the shell chunk
  // so that new worker files never reintroduce circular dependencies.
  if (includesPath(normalized, '/apps/web/src/workers/')) {
    if (normalized.endsWith('/workers/sim.worker.ts')) {
      return 'game-engine-shell';
    }
    return 'game-engine-story';
  }

  return undefined;
}
