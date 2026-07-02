# Current Source Truth - TRUST-A

- Repository root: `/Users/tkevinbigham/Downloads/MBD-main`
- Branch/worktree: `codex/mbd-ui-ux-ootp-overhaul`, ahead 1 / behind 25
- Commit: branch head at source pass; dirty working tree preserved
- Dirty state before work: existing modified files include app shell autosave, draft, minors, dashboard, worker, docs, and generated playtest output; existing untracked audit/reference artifacts and tests are present. These are treated as user-owned and are not reverted.
- Package manager/runtime: `pnpm@9.15.4`, Node `>=20`
- Relevant package scripts: root `typecheck`, `test`, `build`, `verify`, `verify:determinism`, `verify:quality`; package-level `test`, `typecheck`, `build` for `@mbd/web`, `@mbd/contracts`, and `@mbd/sim-core`
- Current save version: `CURRENT_GAME_SNAPSHOT_VERSION = 34` in `packages/contracts/src/schemas/save.ts`
- Existing feature flags relevant to the slice: no source-confirmed save-trust feature flag framework
- Baseline command results:
  - `npx pnpm@9.15.4 --filter @mbd/web test -- src/shared/lib/saveSystem.test.ts src/shared/lib/activeSavePersistence.test.ts src/features/draft/hooks/useDraftActionHandlers.test.tsx src/app/layout/AppLayoutShellAutosave.test.tsx src/features/minors/routes/MinorsPage.test.tsx src/features/trade/hooks/useTradeSnapshotPersistence.test.tsx src/features/news/hooks/useNewsRouteData.test.tsx`
  - Result: 7 test files, 44 tests passed. Existing React act warnings appear in `AppLayoutShellAutosave.test.tsx`.

## Real source seams

| Concern | Actual path/symbol | Current behavior | Test coverage |
|---|---|---|---|
| Active save model | `apps/web/src/shared/hooks/useGameStore.ts` | `activeSaveId` and `activeSaveSlot` are persisted shell state, not snapshot truth. | `useGameStore.test.ts`, setup boot tests |
| Snapshot export | `useWorker.exportSnapshot` -> `actionApi.exportSnapshot` -> `exportGameSnapshot(requireState())` | Full worker state snapshot is exported after route mutations. | worker snapshot/integration tests |
| IndexedDB write path | `apps/web/src/shared/lib/saveSystem.ts` | Dexie database `mbd-saves`; root saves are `save-slot-N`; branch saves use arbitrary IDs and metadata. | `saveSystem.test.ts` |
| Current active-save helper | `apps/web/src/shared/lib/activeSavePersistence.ts` | Exports a snapshot, writes root slots via `scheduleAutoSave`, and writes branch saves via `saveGameById`; no generation/status owner. | `activeSavePersistence.test.ts` |
| Autosave scheduler | `createAutoSaveScheduler` / `scheduleAutoSave` | One global coalescing root-slot queue; not per save ID and not used by branch saves. | same-slot coalescing only |
| Worker mutation surface | `apps/web/src/shared/hooks/useWorker.ts` | `mutationMethods` only controls flow notification/fatal retry behavior; no persistence semantics. | worker and route tests |
| App-shell lanes | `apps/web/src/app/layout/AppLayout.tsx` | Sim autosaves after result; monthly, decision, ceremony, and press now autosave but do not all gate on `success:false`. | dirty untracked `AppLayoutShellAutosave.test.tsx` |
| Draft lanes | `useDraftActionHandlers` | Dirty working-tree code autosaves successful draft start, pick, scout, big-board, sign, and watch; rejected/invalid paths skip autosave. | dirty modified hook tests |
| Development plan lane | `MinorsPage` / `applyDevelopmentFocusPlan` | Dirty working-tree code applies plan and autosaves only on success. | dirty modified route tests and worker tests |
| Trade lanes | `useTradeSnapshotPersistence`, `useTradeActionHandlers`, `useTradeMultiTeamBuilder` | Start/advance/resolve/counter can persist; incoming accept/decline and multi-team execution do not persist. | persistence helper tests, worker trade tests |
| News lane | `useNewsRouteData` | Duplicated direct save path after `markNewsRead`; not shared active-save helper/coordinator. | `useNewsRouteData.test.tsx` |
| Status surface | `TopBar`, `SimControls`, `AppLayout` | No global `Saving...` / `Saved` / `Save failed` shell state. | no TRUST-A status coverage |

## Handoff corrections

| Old assumption | Live finding | Effect on plan |
|---|---|---|
| Persisted `revision` may be migration-free | No `revision` exists; adding to `GameSnapshot` would be schema work. | Use runtime-only generations; no schema bump. |
| Mandatory feature flag | No existing lightweight save-trust flag framework. | Do not add a new flag or broken OFF path. |
| Worker proxy can own persistence | Existing Comlink proxy lacks success/no-op classification, save ID, snapshot capture, retry, and status. | Add a main-thread coordinator around current persistence helpers. |
| Starter Playwright reload spec exists | Starter spec files are not unpacked in this checkout. | Browser proof must use available browser tooling or a narrow harness if needed. |
| Current save version may be v33 | Live schema is v34 with v33 -> v34 migration fixtures. | Keep compatibility proof on v34; no schema work for TRUST-A. |

## Read-only subagent synthesis

- Source mapper: confirmed no central persisted-mutation executor exists; closest seam is `persistActiveSaveSnapshot` plus route handlers.
- Test mapper: found strong Vitest coverage for save helpers and lane callbacks, but no real browser IndexedDB reload harness and no stale pending-write-after-save-switch test.
- Risk reviewer: blocked broad implementation until false `Saved` state, trade accept/decline persistence, active-save ownership, duplicate write paths, and retry-without-rerun are addressed.

## Dependencies and blockers

- No stop condition yet: live source does not contradict the goal, save version is known, migration is not required, and source-compatible implementation path exists.
- Browser proof remains a high-risk validation item because no existing Playwright/Cypress script is wired.
