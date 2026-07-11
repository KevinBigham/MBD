# TRUST-SAVE-INDICATOR-1 Source Truth

Recorded: 2026-07-11 CDT, before production edits.

## Repository and baseline

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch/worktree: `codex/trust-save-indicator-2`, primary worktree.
- Starting commit: `0fdf9eb0289e45c52f95b7d66aaa3519f0a088b2` (`Add permanent Playwright reload-smoke gate`).
- Starting dirty state: slice-owned `docs/codex/goals/14_TRUST_SAVE_INDICATOR_1.md` is untracked. Concurrent user-owned edits to `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md` are preserved and excluded.
- Package manager/runtime: `pnpm@9.15.4`, Node `>=20`.
- Root scripts from live `package.json`: `typecheck` (`turbo typecheck`), `test` (`turbo test`), `build` (`turbo build`), `verify:determinism`, and `e2e:reload-smoke`.
- Live save version: `CURRENT_GAME_SNAPSHOT_VERSION = 34` in `packages/contracts/src/schemas/save.ts`.
- Focused baseline: active-save coordinator, TopBar, and AppBootGate — 3 files / 18 tests passed.
- Same starting commit was fully gated immediately before this branch: typecheck 9/9 tasks, tests 8/8 tasks (sim-core 1,646; web 1,546 passed / 2 skipped), build 5/5, determinism 3/3, and two clean CI-mode Playwright journeys (2.6m and 2.8m, no retry).

## Live persistence state machine

`apps/web/src/shared/lib/activeSavePersistence.ts` is the sole active autosave coordinator:

- one runtime `SaveCoordinatorState` per exact save ID;
- snapshot export occurs before a generation/job is allocated;
- each captured full snapshot increments `desiredGeneration` and replaces `latestJob`;
- the current in-flight job is serialized; queued generations coalesce to the newest full snapshot;
- successful writes advance `durableGeneration` to the completed job generation;
- a stale failure is suppressed when a newer full snapshot exists;
- failed latest jobs retain the captured snapshot for persistence-only Retry;
- callers resolve only when the latest desired generation is durable;
- different save IDs have independent maps, so a save switch cannot redirect a bound snapshot.

The exact player-facing pending depth is the logical gap:

`Math.max(0, desiredGeneration - durableGeneration)`

It counts accepted dirty generations not yet represented by durable state, not physical Dexie `put` calls. A coalesced newest full snapshot can cover multiple logical generations and take the count directly to zero. The value belongs in each cached status snapshot so `useSyncExternalStore` keeps referentially stable snapshots.

The export-before-capture interval remains outside `pendingWrites`: no persistable snapshot exists yet. An export failure remains a non-retryable `export` failure with zero pending durable jobs. This preserves the live TRUST-A state machine rather than inventing a second capture queue.

## Durable timestamp source

`SaveData.updatedAt` already exists as Dexie record metadata, outside `GameSnapshot`. `buildSaveRecordById()` creates it, `db.saves.put(record)` persists the same value, and `saveGameById()` returns the record after the write path resolves.

Current coordinator behavior is not sufficient for roadmap item 2:

- it discards the returned `SaveData`;
- it performs a second `new Date().toISOString()` after completion;
- it updates `lastSavedAt` only when the latest generation is durable, so an intermediate durable completion in a burst is invisible;
- it has no load/switch hydration API.

The coordinator must adopt the exact returned record timestamp after every durable completion, never move recency backward, and hydrate from successful load records. Missing/invalid/epoch fallback metadata is unknown and must not render as a fabricated 1970 save time.

## Root-write atomicity correction

Live `saveGameById()` currently writes the root save row and then separately writes the derived leaderboard entry. A leaderboard rejection can therefore make the coordinator report `Save failed` and retain a pending Retry after the exact save row is already durable. That contradicts this goal's recency and queue truth.

Smallest safe correction: for current-schema root saves, build the save record and leaderboard entry with the same `updatedAt`, then commit both tables in one Dexie read-write transaction. Branch/legacy paths retain their existing single-table behavior. A rejected transaction means the save row is not durable; a resolved call returns the exact committed `SaveData`.

## Hydration and direct-writer seams

Trustworthy `SaveData` is already available at these activation paths:

- hard-reload resume: `apps/web/src/app/boot/AppBootGate.tsx`;
- Save Hub root/branch continue and new-game creation: `features/setup/hooks/useSetupActionHandlers.ts`;
- Settings slot load/manual save: `features/settings/hooks/useSettingsSaveData.ts`;
- onboarding completion: `features/onboarding/hooks/useRevisedOnboardingPageController.tsx`.

Other active-record writes bypass the coordinator:

- Command Palette Quick Save;
- Settings active-slot manual save;
- worker-owned archive/prune maintenance;
- branch create/delete updates to parent record metadata.

The coordinator will gain one metadata reconciliation API accepting `Pick<SaveData, 'id' | 'name' | 'updatedAt'>` and one refresh helper for worker-owned writes. Hydration updates only durable metadata and preserves any runtime saving/failed state and generations. It must not render the transient primary state as `Saved` after reload.

Quick Save will reuse the existing active-save autosave coordinator. Direct writes that legitimately remain outside it will report or refresh their returned durable record through the same coordinator metadata API. This closes stale recency without creating a second queue.

## Shell and browser seam

`TopBar.tsx` currently renders one transient `data-testid="save-persistence-status"` for `Saving...`, `Saved`, or assertive failure/Retry. `apps/web/e2e/helpers/dynasty.ts` deliberately requires this transient locator to be absent after reload and before a mutation, preventing stale `Saved` false positives.

The durable summary must therefore be a sibling contract, not a replacement:

- transient `save-persistence-status` remains unchanged for mutation freshness;
- persistent `save-persistence-summary` renders recency plus queue depth;
- hydration leaves transient state idle/hidden while summary remains visible;
- Playwright continues to require a newly produced transient `Saved`, then checks the durable summary and reload hydration.

The current header is fixed at 48px. The full copy cannot reliably fit inline at 375px with existing controls. The smallest responsive design is desktop inline presentation plus a compact second row below the mobile/tablet top row. AppLayout's flex column naturally accounts for the added row, avoiding route/sim-control occlusion.

Time copy belongs in a pure formatter with explicit locale/time-zone options for tests. Production uses browser local time. Playwright already fixes `en-US`, UTC, and the browser clock.

## Existing proof seams

- `activeSavePersistence.test.ts`: ordered bursts, save-ID isolation/switch, retry-without-re-export, failure classification, no active save.
- `saveSystem.test.ts`: canonical v34 records, root/branch metadata, save/load/import/export.
- `AppBootGate.test.tsx`: a successful record fixture already includes fixed `updatedAt`.
- `TopBar.test.tsx`: mocked coordinator snapshots and polite/assertive state UI.
- setup/onboarding/settings hook tests: fixed save records and direct-write mocks.
- `AppLayoutShellAutosave.test.tsx`: rejected/no-op shell mutations skip persistence.
- permanent Playwright journey: real production preview, IndexedDB reload, fixed time/locale/timezone, four public mutations.

## Source corrections and non-goals

- The roadmap's feature is not a new save field; the necessary durable record metadata already exists.
- `lastSavedAt` is not missing from the coordinator type, but its live value is currently noncanonical and not hydrated.
- `pending writes` is not the legacy unused idle scheduler's `hasPending()` boolean.
- The permanent summary must not reuse the transient status locator.
- No snapshot schema/migration, simulation RNG, gameplay mutation, new route, service-worker writer, polling timer, auto-retry, checksum, multi-tab lock, storage-pressure UI, or write-ahead journal is required.

## Stop-condition result

No stop condition is met. v34 and existing Dexie metadata are sufficient. The slice must, however, reconcile every source-confirmed active-record writer it claims; leaving a known active writer stale would make “global Last saved” untruthful.
