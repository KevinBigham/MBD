# TRUST-AUTOSAVE-RECOVERY-1 Source Truth

Captured: 2026-07-11 CDT, before production edits.

## Repository baseline

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch/worktree: `codex/autosave-failure-recovery-3` in the primary worktree.
- Starting commit: `56293093fe51e4f1dbe373e139a412a32cfd9005` (roadmap item 2 landed on `main`).
- Dirty state at slice start: new slice-owned goal `docs/codex/goals/15_TRUST_AUTOSAVE_RECOVERY_1.md`; user-owned modifications to `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`. The three user files remain excluded.
- Runtime/package manager: Node `v24.16.0`, repository contract Node `>=20`, `corepack pnpm` `9.15.4`, `packageManager: pnpm@9.15.4`.
- Root scripts from live `package.json`: `typecheck`, `test`, `build`, `verify`, `verify:determinism`, `e2e:reload-smoke`, quality/structure/cycle helpers.
- Web scripts: `typecheck` includes source plus E2E TypeScript; `test` is Vitest; `e2e:reload-smoke` is one serial Chromium journey after a production build.
- Save version: `CURRENT_GAME_SNAPSHOT_VERSION = 34` in `packages/contracts/src/schemas/save.ts`. This slice needs no schema change.
- Starting-commit gates were observed immediately before this branch: typecheck 9/9 tasks, tests 8/8 tasks (web 439 files passed / 1 skipped; 1,584 tests passed / 2 skipped), build 5/5 tasks, determinism 3/3, and production Playwright 1/1 in 2.8 minutes with no retry.
- Item-3 focused baseline on this branch: `activeSavePersistence`, `saveSystem`, `TopBar`, `App`, and service-worker toast suites passed 5 files / 67 tests. The service-worker test emitted its intentional registration-failure log only.

## Live persistence state machine

`apps/web/src/shared/lib/activeSavePersistence.ts` is the sole active-save snapshot coordinator.

- `PersistedSnapshotJob` already retains exactly the required fallback source: logical generation, save ID, slot identity, save name, and the one exported full snapshot.
- `SaveCoordinatorState.failedJob` retains the latest non-stale durable-write failure. Manual `retryActiveSavePersistence()` moves that exact job back to `latestJob`; it does not call the worker exporter or rerun gameplay.
- Desired/durable generations and `pendingWrites = max(0, desired - durable)` remain truthful across failure and Retry.
- A later accepted full snapshot supersedes the failed job because it contains prior accepted mutations.
- Failure classification currently distinguishes `export`, `quota`, `indexeddb`, `storage`, and `unknown`. Security/private-browsing/unavailable errors fall into generic storage and need one explicit `unavailable` category.
- No automatic retry timer, attempt budget, recovery phase, or fallback API exists.
- Manual Retry is invoked with `void retryActiveSavePersistence()` in `TopBar`; a second rejected write can currently become an unhandled promise rejection.
- While a retry is in progress, the transient status clears the original failure kind/message. Recovery presentation therefore needs separately retained failure evidence rather than treating current `saving` fields as the outage record.

## Ordering and invalidation seams

Item 2 added the exact boundaries this slice must extend rather than replace:

- `captureEpoch`, `captureBlocked`, and save/tree barriers invalidate delayed exports.
- `prepareActiveSavePersistenceForLoad()` and `activateActiveSavePersistenceMetadata()` supersede an older runtime retry when a save is explicitly loaded.
- `replaceInactiveSavePersistenceRecord()`, `retireActiveSavePersistenceForDelete()`, and `retireSaveTreePersistenceForDelete()` quiesce writes and tombstone root/child coordinators.
- The save system serializes same-ID writes, uses atomic root+leaderboard and branch parent/child transactions, and returns the exact committed `SaveData` timestamp.

An automatic retry timer must be owned per `SaveCoordinatorState`, close over the exact failed job generation/save ID and a recovery epoch, and be cleared at every load, activation, barrier, tombstone, replacement, deletion, reset, manual retry, newer capture, and durable success seam. `latestSaveId` is notification recency, not authoritative timer ownership.

The retry budget must belong to one unresolved storage episode. A newer full snapshot may replace the payload but may not reset attempts; otherwise repeated mutations while storage is unavailable create an unbounded retry storm.

## Toast and shell source

- `apps/web/src/app/App.tsx` owns the one global Sonner `<Toaster>`; established callers include service-worker update, boot, and worker failures.
- `apps/web/src/app/layout/TopBar.tsx` is the only active-save status subscriber/presenter. It owns the fixed, assertive failure chip and manual Retry.
- The existing Sonner service-worker toast proves the repository pattern for a stable persistent toast with an action.
- The global toaster is currently bottom-right, where mobile navigation, simulation controls, the assistant, and guided-start UI can compete. Item 2 already has 1280x720 and 375x667 geometry/screenshot proof that can be extended.
- One stable toast ID per save can update failure -> scheduled retry -> retrying -> fallback -> recovered without duplicate stacks. TopBar's assertive failure copy and the toast's recovery guidance must be distinct to avoid duplicate screen-reader announcements.

## Export and download source

- `saveSystem.exportSnapshotToJson()` produces canonical `kind: "mbd-save-export"` JSON after parsing through `GameSnapshotSchema`.
- `importSnapshotFromJson()` is the real import boundary. Existing tests prove round-trip and canonical snapshot equality.
- Settings and guided-start controls duplicate Blob/object-URL/link-click downloads. Save Recovery's raw JSON export is corruption evidence and is not an importable canonical dynasty fallback.
- No shared download helper returns an honest result or preserves cleanup when `click()` throws.
- A browser may reject an automatic/drive-by download. The truthful contract is therefore an explicit `Download backup` action after bounded retries exhaust, plus a repeatable action if the player needs it again.
- Backup creation/download is not durability. It must leave the prior `lastSavedAt`, nonzero pending depth, failed job, and manual Retry intact.

## Browser proof source

- `apps/web/e2e/reload-smoke.spec.ts` is the only test matched by Playwright config and already performs the real non-no-op development-plan mutation early in its serial dynasty.
- A Playwright-only `IDBObjectStore.put` fault shim can be installed before navigation, default disabled, then enabled only for `mbd-saves` / `saves` writes. This changes platform storage behavior, not gameplay, worker, React, or persisted state.
- The journey already captures exact player/program identity, fixed browser time, raw durable ISO/depth, hard reload, and desktop/mobile screenshots.
- Playwright's download event/stream can prove a `.json` file actually began downloading and contains the exact failed development-plan mutation.
- Recovery state is intentionally runtime-only. The browser must restore local durability before hard reload; surviving an unresolved failure through reload belongs to the write-ahead journal goal.

## Source corrections and decisions

1. Roadmap item 3 is not introducing Retry from scratch; TRUST-A already added truthful manual persistence-only Retry. This slice adds bounded automation, global recovery guidance, and a retained-snapshot fallback.
2. “Export fallback” cannot truthfully mean a timer-driven download. It means canonical fallback readiness followed by an explicit user download gesture.
3. The fallback source is the coordinator's retained `failedJob.snapshot`, not a fresh worker export and not corrupt-load raw JSON.
4. Existing `indexeddb` is the transaction/database failure category; add only `unavailable` for security/private/disabled storage instead of renaming every established failure contract.
5. Choose two automatic attempts at 1,000ms and 3,000ms for every retained storage-family failure (`quota`, `unavailable`, `indexeddb`, `storage`). This satisfies the named quota/private cases while remaining bounded and fast enough to reach fallback.
6. Preserve an episode's attempt count across newer snapshots until one durable success or an explicit activation/retirement boundary.
7. No schema, worker mutation, service worker, route, CPU, RNG, or gameplay change is required. No stop condition is active.

## Required proving matrix

- Coordinator fake-timer tests: schedule/attempt/exhaust, exact retained job, no re-export, manual override, success cancellation, newer generation, switch/load, delete, replacement, unavailable classification, and reset cleanup.
- Canonical fallback tests: real export -> real import -> exact retained snapshot equality; unavailable/exhaustion gating and invalidation.
- Download helper tests: filename/blob/click/revoke, unsupported browser, thrown click, and repeatability.
- Shell/toast tests: stable ID, storage-kind copy, scheduled/retrying/fallback/recovered transitions, action errors, no false success, switch/null cleanup, manual Retry rejection handling, and Sonner placement/accessibility config.
- Permanent browser: real development mutation under blocked IndexedDB, exact previous time + one pending, bounded attempt count, no further attempts, keyboard backup download with exact player/program, unchanged failure after download, desktop/mobile geometry/screenshots, restored storage/manual Retry/exact durable time, and hard-reload consequence.
- Full root typecheck/test/build/determinism and permanent Playwright gate.
