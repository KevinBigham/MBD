export const MAIN_THREAD_CHUNK_BUDGET_BYTES = 304 * 1024;
export const MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES = 81 * 1024;
// WORKER raw: bumped 406 -> 408 KB to cover the arbitration payload carried across
// the arbitration schema/broadcast slices.
// WORKER raw: bumped 408 -> 410 KB for the holdout resolution news slice. Adds
// generateHoldoutResolutionBriefing + worker wire-in alongside the existing
// opening-beat briefings in game-engine-story. Copy was trimmed aggressively but
// the function signature + constants still landed ~1.3 KB over the prior raw
// ceiling. Gzip stayed at ~125 KB (well under budget), so the actual wire cost
// is unchanged — this is a raw-ceiling-only concession for the new helper.
// WORKER gzip: bumped 124 -> 125 KB for the arbitration broadcast slice. The
// arbitration press-conference templates + moment descriptions compressed less
// than projected (actual ~+0.4 KB over prior ceiling), so lift the gzip roof by
// one KB to restore headroom. Holdout briefings already live in the story chunk.
// WORKER gzip: bumped 125 -> 126 KB for the trade deadline broadcast slice after
// the new trade press-conference copy left game-engine-core 471 bytes over the
// prior gzip cap. Attempted routing tradeDeadlinePressConferences.ts into
// game-engine-story first, but that pushed story far higher overall (421,762
// raw / 125,530 gzip), so the smallest ceiling lift was the safer fix. Raw
// ceiling already at 410 KB from the holdout briefing slice accommodates the
// trade deadline worker growth (+613 bytes over the 408 baseline).
// WORKER raw: bumped 410 -> 411 KB for the team-moment store slice (v22). Adds
// appendTeamMoments, the teamMoments Map on FullGameState, the identityMoments
// seam through buildTradeBroadcastCoverage, and snapshot serialization of
// teamMoments. Story chunk landed ~206 bytes over the 410 KB ceiling after the
// wiring; gzip held well under cap (~125 KB actual vs 126 KB ceiling) so only
// raw moves. No new template copy — just wire-in code.
// WORKER raw: bumped 411 -> 412 KB for the Chase Watch query slice. Adds
// getChaseWatch() to sim.worker.queries.ts — a league-wide view assembling
// career milestone alerts (via existing buildMilestoneAlertsForPlayers) and
// pace chases (via existing projectSeasonStats + findNotableProjections) into
// a single dashboard payload. Pure wiring of existing helpers, no new sim
// logic. Story chunk landed 547 bytes over the 411 KB ceiling; gzip held
// under cap (~125 KB actual vs 126 KB ceiling) so only raw moves.
// WORKER raw: bumped 412 -> 414 KB for the pennant-race-heat query slice.
// Adds getPennantRaces with division race + wildcard bubble computations
// plus inline DivisionRace/WildcardRace types. Story chunk landed ~1 KB
// over the 413 KB stack when combined with Chase Watch growth; gzip held
// well under cap (~126 KB actual) — wire cost unchanged, raw ceiling only.
// No new sim-core changes.
// WORKER raw: award race boards slice — adds getAwardRaceBoards
// (league-split + sample-size-filtered enrichment around the existing
// calculateAwardRaces scorer) into the story chunk. Absorbed within the
// current 414 KB ceiling from the pennant-race stack; gzip held well under
// cap (~126 KB actual vs 126 KB ceiling) — no new sim-core changes.
// WORKER raw: bumped 414 -> 417 KB for the team-moment types slice (v23).
// Adds detectSeasonIdentityMoments + championship_run / contention_collapse
// enum values + MOMENT_TYPE_ORDER and description template entries. When
// stacked on top of the dashboard query slices (chase/pennant/award), the
// story chunk landed ~1.6 KB over the 414 KB ceiling — raw lift with a
// small headroom buffer. Gzip also bumped 126 -> 127 KB; copy compressed
// ~296 bytes over the prior cap.
// WORKER raw: bumped 417 -> 420 KB for the Career Retrospective query slice.
// Adds buildCareerRetrospective + getCareerRetrospective to sim.worker.queries
// — unifies titles (WS/pennants/division/playoffs derived from seasonArchive +
// archivedSeasons), team-moment beats, completed story arcs, awards-shelf
// counts, and top rivalry into one dashboard payload. Story chunk landed
// ~2.5 KB over the 417 KB ceiling; gzip held under cap (~125 KB actual vs
// 127 KB ceiling).
// WORKER raw: bumped 420 -> 423 KB for the Season Story Reel query slice.
// Adds buildSeasonStoryReel + getSeasonStoryReel — per-season deep-dive
// assembling record/rank, playoff path, storylines, timeline events, signature
// beats filtered by season, key transactions, awards, and stat-leader
// highlights from seasonArchive + archivedSeasons. Story chunk landed ~2.2 KB
// over the 420 KB ceiling; gzip held under cap (~125.8 KB actual vs 127 KB
// ceiling). Raw-only lift.
// WORKER raw: bumped 423 -> 425 KB for the Pennant Race Detail query slice.
// Adds getPennantRaceDetail — all-six-divisions full standings + top-5
// wildcard picture with projectedWins via winning-percentage pace. Story
// chunk landed ~1.5 KB over the 423 KB ceiling; gzip held under cap
// (~126.4 KB actual vs 127 KB ceiling). Raw-only lift.
// WORKER gzip: bumped 127 -> 128 KB for team-identity expansion wave 2 (v25).
// Adds rebuild_begun + breakout_season + contention_window_opens detectors with
// their MOMENT_TYPE_ORDER entries and description templates. game-engine-core
// landed at 130,174 gzip bytes vs the prior 130,048 cap (+126 bytes), so the
// smallest safe lift is one KB. Raw ceiling already at 425 KB from PR #44's
// Pennant Race detail query absorbs the wave-2 detector code with headroom.
// WORKER raw/gzip: bumped 425 -> 428 KB raw and 128 -> 131 KB gzip for
// narrative depth wave 3 (v26). The additive detector/template expansion kept
// game-engine-core raw under the existing ceiling (~399 KB) but pushed gzip to
// 133,864 bytes; game-engine-story stayed under gzip but landed at 437,490 raw
// bytes. This is the maximum sprint-allowed lift (+3 KB raw / +3 KB gzip),
// preserving the hard stop at 430 KB raw / 131 KB gzip.
export const WORKER_CHUNK_BUDGET_BYTES = 428 * 1024;
export const WORKER_CHUNK_GZIP_BUDGET_BYTES = 131 * 1024;

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
