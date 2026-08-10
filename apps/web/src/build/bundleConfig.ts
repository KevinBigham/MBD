export const MAIN_THREAD_CHUNK_BUDGET_BYTES = 304 * 1024;
export const MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES = 81 * 1024;

// Worker ceilings: see apps/web/docs/BUDGETS.md for the lift policy and per-slice rationale.
export const WORKER_CHUNK_BUDGET_BYTES = 446 * 1024;
export const WORKER_CHUNK_GZIP_BUDGET_BYTES = 143 * 1024;
// Team-building policy plus offseason DTOs, phase gates, trade deadline
// intelligence/posture/review evidence, draft decision inputs, profile
// development outcomes including role-aware mentorship, minors focus,
// timeline/rivalry/mentorship memory DTOs including playoff box-score links, and
// clubhouse intelligence DTOs live in worker helpers/trade/queries/pipeline.
// Phase 6.1 opt-in query profiling adds runtime-only diagnostics helpers, and
// Phase 3 roster contracts add runtime-only extension negotiation review evidence.
export const WORKER_STORY_CHUNK_BUDGET_BYTES = 499 * 1024;
export const WORKER_STORY_CHUNK_GZIP_BUDGET_BYTES = 150 * 1024;
export const WORKER_CORE_CHUNK_GZIP_BUDGET_BYTES = 144 * 1024;

/** Lazy-loaded chart vendor chunk (recharts + d3) gets a bigger budget. */
export const CHART_CHUNK_BUDGET_BYTES = 430 * 1024;
export const CHART_CHUNK_GZIP_BUDGET_BYTES = 120 * 1024;

export interface BundleBudget {
  rawBudget: number;
  gzipBudget: number;
}

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

export function getBudgetForBundleFile(fileName: string): BundleBudget {
  if (isWorkerBundleFile(fileName)) {
    return {
      rawBudget: /game-engine-story/i.test(fileName)
        ? WORKER_STORY_CHUNK_BUDGET_BYTES
        : WORKER_CHUNK_BUDGET_BYTES,
      gzipBudget: /game-engine-story/i.test(fileName)
        ? WORKER_STORY_CHUNK_GZIP_BUDGET_BYTES
        : /game-engine-core/i.test(fileName)
          ? WORKER_CORE_CHUNK_GZIP_BUDGET_BYTES
          : WORKER_CHUNK_GZIP_BUDGET_BYTES,
    };
  }

  if (isChartBundleFile(fileName)) {
    return {
      rawBudget: CHART_CHUNK_BUDGET_BYTES,
      gzipBudget: CHART_CHUNK_GZIP_BUDGET_BYTES,
    };
  }

  return {
    rawBudget: MAIN_THREAD_CHUNK_BUDGET_BYTES,
    gzipBudget: MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES,
  };
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
    || includesPath(normalized, '/packages/contracts/src/')
  ) {
    return 'vendor-data';
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

  // Holdout briefings are worker-side story payload only. Keep them out of
  // the engine-core chunk so the deterministic simulation core retains headroom.
  if (
    includesPath(normalized, '/packages/sim-core/src/narrative/holdoutCoverage.')
  ) {
    return 'game-engine-story';
  }

  // Wave 10 capstone prose is deterministic template payload. Keep the large
  // variant pools out of game-engine-core while leaving the live worker owners
  // in their existing chunks.
  if (
    includesPath(normalized, '/packages/sim-core/src/narrative/awardCeremonyProse.')
    || includesPath(normalized, '/packages/sim-core/src/narrative/hofProse.')
    || includesPath(normalized, '/packages/sim-core/src/narrative/retirementProse.')
    || includesPath(normalized, '/packages/sim-core/src/narrative/stableProse.')
  ) {
    return 'game-engine-capstone';
  }

  // Weekly narrative cadence is worker-only detector/prose code. Keep it out
  // of game-engine-core so the deterministic sim chunk retains headroom.
  if (
    includesPath(normalized, '/packages/sim-core/src/moments/weeklyMoments.')
    || includesPath(normalized, '/packages/sim-core/src/narrative/weeklyMomentProse.')
  ) {
    return 'game-engine-weekly';
  }

  // Keep the sim-core root barrel out of game-engine-core. It re-exports
  // onboarding modules for the app-facing API, while onboarding modules import
  // core helpers; assigning the barrel to core creates a circular chunk edge.
  if (normalized.endsWith('/packages/sim-core/src/index.ts')) {
    return 'game-engine-shell';
  }

  // Authored roster/content data is worker-owned, versioned, and isolated from
  // the deterministic engine-core chunk so content expansion cannot bloat core.
  if (includesPath(normalized, '/apps/web/src/workers/content/')) {
    return 'game-engine-content-v1';
  }

  // Compact archived box-score persistence is save-schema/history plumbing.
  // Keep it out of the already tight story chunk while preserving a scoped
  // worker-owned boundary for future archive route work.
  if (includesPath(normalized, '/apps/web/src/workers/sim.worker.archivedGames.')) {
    return 'game-engine-archives';
  }

  // The worker query facade is large but read-only. Split it from narrative
  // mutation/story modules so small query-surface additions do not consume the
  // story chunk budget.
  if (normalized.endsWith('/apps/web/src/workers/sim.worker.queries.ts')) {
    return 'game-engine-queries';
  }

  // League trade-payroll projection is a worker-only finance module. Keep its
  // operation-local implementation out of the tight deterministic core chunk.
  if (normalized.endsWith('/packages/sim-core/src/finance/tradeFinance.ts')) {
    return 'game-engine-trade-finance';
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
    if (normalized.endsWith('/workers/sim.worker.onboarding.ts')) {
      return 'game-engine-day-one';
    }
    return 'game-engine-story';
  }

  return undefined;
}
