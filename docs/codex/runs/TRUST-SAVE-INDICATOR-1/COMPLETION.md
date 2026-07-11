# TRUST-SAVE-INDICATOR-1 Completion

Status: complete and review-ready. No goal stop condition remains. No unresolved P0 or P1 finding remains.

Completed: 2026-07-11 03:36 CDT

## Outcome

Roadmap item 2 now gives every active dynasty one global, truthful persistence summary in the app shell:

`Last saved 7:42:03 PM · 0 pending writes`

The time is the exact `updatedAt` value returned by the durable save record, and the depth is the active coordinator's logical generation gap. The summary hydrates from the selected save after a reload, stays isolated by save ID, advances only after accepted IndexedDB work, preserves the prior durable time and outstanding depth on failure, and reaches zero only when the latest desired snapshot is durable.

The work also closes the storage races that could make that claim false. Root save and leaderboard writes are atomic, same-save writes are ordered, root autosaves preserve branch references, branch metadata mutations run in the main realm under the root executor, and delete/replacement boundaries quiesce and tombstone the complete known save tree before atomic storage changes. Retry persists the captured snapshot rather than rerunning gameplay.

The existing transient `Saving…`, `Saved`, and `Save failed` contract remains separate. Hydration cannot manufacture a fresh `Saved` announcement, and no-op/rejected actions create no dirty generation. The persistent summary remains visible at desktop and 375x667 mobile sizes without occluding the route or simulation controls.

Save schema remains v34. No snapshot field, migration, gameplay rule, CPU policy, or seeded-RNG stream changed.

## Requirement Mapping

| Goal requirement | Result and evidence |
|---|---|
| Exact durable time | `saveGameById()` returns the committed `SaveData`; the coordinator records that exact `updatedAt` after a successful write. Tests compare fixed returned ISO values, including intermediate completions and retry. |
| Exact pending depth | `pendingWrites = max(0, desiredGeneration - durableGeneration)`. Three-generation, coalesced, in-flight, failure, retry, and supersession tests prove the logical depth cannot underflow or clear early. |
| Failure and Retry truth | A failed write retains the previous durable timestamp, nonzero pending depth, failed snapshot, and Retry action. Later export/metadata failures cannot hide the retained retry job. Retry performs persistence only. |
| Latest accepted state wins | Per-save coordinator generations and the same-ID storage executor prevent stale completions or failures from moving time backward, clearing newer work, or overwriting a newer snapshot. |
| Reload hydration | App boot prepares the save-ID boundary, imports the persisted snapshot, and activates the exact record metadata without emitting transient `Saved`. The permanent browser journey requires identical raw ISO and visible summary after hard reload. |
| Save-switch isolation | Prepare/activate boundaries invalidate delayed captures and reset the selected coordinator only from the target record. Slot/branch tests prove one save's time, queue, or retry state cannot leak to another. |
| All active write lanes current | Boot, setup, revised onboarding, manual save/load, Quick Save, autosave, archive/prune, branch creation/deletion, recovery deletion, root replacement, and root deletion now reconcile through the coordinator or an explicit activation/retirement boundary. |
| Deletion/replacement safety | Root-tree barriers discover children fail-closed, quiesce accepted root/child writes, invalidate delayed exports, then atomically delete or replace rows. Real IndexedDB tests prove delayed child captures cannot resurrect old rows. |
| Branch and leaderboard atomicity | Root snapshot plus derived leaderboard writes share one Dexie transaction and timestamp. Branch child/parent and delete/parent updates share root serialization and transactions. Forced failures roll back every involved row. |
| No-op/rejected unchanged | Existing shell mutation tests plus coordinator rejection tests show no new generation, time, or saving state is created. Metadata work is rejected over failed/pending gameplay without destroying Retry. |
| Exact visible copy and accessibility | A pure formatter owns timestamp/fallback/pluralization. TopBar exposes one visible summary, a stable accessible label, raw ISO metadata, and separate live mutation status. |
| Desktop/mobile non-occlusion | Playwright verifies bounding boxes and trial interactions, then attaches screenshots at 1280x720 and 375x667. Both inspected images show the full summary and usable shell controls. |
| Schema and determinism compatibility | `CURRENT_GAME_SNAPSHOT_VERSION` remains 34; full migration/import/export tests, production build, PWA generation, and determinism verification pass. Changed source adds no `Math.random()` or simulation-truth clock/UUID. |

## Changed Files

Design and run evidence:

- `DESIGN.md`
- `docs/codex/goals/14_TRUST_SAVE_INDICATOR_1.md`
- `docs/codex/runs/TRUST-SAVE-INDICATOR-1/SOURCE_TRUTH.md`
- `docs/codex/runs/TRUST-SAVE-INDICATOR-1/PLAN.md`
- `docs/codex/runs/TRUST-SAVE-INDICATOR-1/COMPLETION.md`

Persistence ownership and storage:

- `apps/web/src/shared/lib/activeSavePersistence.ts`
- `apps/web/src/shared/lib/activeSavePersistence.test.ts`
- `apps/web/src/shared/lib/saveSystem.ts`
- `apps/web/src/shared/lib/saveSystem.test.ts`
- `apps/web/src/shared/lib/saveSystem.transaction.test.ts`
- `apps/web/src/shared/hooks/useActiveSaveAutosave.ts`
- `apps/web/src/shared/hooks/useWorker.ts`
- `apps/web/src/workers/sim.worker.actions.ts`
- `apps/web/src/workers/sim.worker.test.ts`
- `apps/web/src/workers/sim.worker.archivedGames.test.ts`
- `apps/web/src/workers/sim.worker.frontOfficeIdentity.test.ts`
- `apps/web/src/workers/sim.worker.onboarding.test.ts`
- `apps/web/src/workers/sim.worker.onboardingBalance.test.ts`
- `apps/web/src/workers/sim.worker.queries.test.ts`

Activation and direct-write callers:

- `apps/web/src/app/boot/AppBootGate.tsx`
- `apps/web/src/app/boot/AppBootGate.test.tsx`
- `apps/web/src/app/layout/CommandPalette.tsx`
- `apps/web/src/app/layout/CommandPalette.test.tsx`
- `apps/web/src/features/onboarding/hooks/useRevisedOnboardingPageController.tsx`
- `apps/web/src/features/onboarding/hooks/useRevisedOnboardingPageController.test.tsx`
- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.test.tsx`
- `apps/web/src/features/save-recovery/SaveRecoveryProvider.tsx`
- `apps/web/src/features/save-recovery/__tests__/SaveRecoveryProvider.test.tsx`
- `apps/web/src/features/settings/components/SettingsSaveDataPanel.tsx`
- `apps/web/src/features/settings/hooks/useSettingsDiagnosticsData.ts`
- `apps/web/src/features/settings/hooks/useSettingsDiagnosticsData.test.tsx`
- `apps/web/src/features/settings/hooks/useSettingsSaveData.ts`
- `apps/web/src/features/settings/hooks/useSettingsSaveData.test.tsx`
- `apps/web/src/features/settings/routes/SettingsPage.tsx`
- `apps/web/src/features/settings/routes/SettingsPage.test.tsx`
- `apps/web/src/features/setup/hooks/useSetupActionHandlers.ts`
- `apps/web/src/features/setup/hooks/useSetupActionHandlers.test.tsx`
- `apps/web/src/features/setup/hooks/useSetupPageController.ts`
- `apps/web/src/features/setup/hooks/useSetupPageController.test.tsx`
- `apps/web/src/features/setup/routes/SetupPage.tsx`
- `apps/web/src/features/setup/routes/SetupPage.test.tsx`

Global shell and supporting caller mocks:

- `apps/web/src/app/layout/savePersistenceSummary.ts`
- `apps/web/src/app/layout/savePersistenceSummary.test.ts`
- `apps/web/src/app/layout/TopBar.tsx`
- `apps/web/src/app/layout/TopBar.test.tsx`
- `apps/web/src/app/layout/AppLayout.test.tsx`
- `apps/web/src/features/dashboard/routes/DashboardPage.test.tsx`
- `apps/web/src/features/news/routes/NewsPage.test.tsx`
- `apps/web/src/features/trade/routes/TradePage.test.tsx`

Permanent browser proof and test infrastructure:

- `apps/web/e2e/helpers/dynasty.ts`
- `apps/web/e2e/reload-smoke.spec.ts`
- `apps/web/src/test/setup.ts`
- `apps/web/package.json`
- `pnpm-lock.yaml`

`fake-indexeddb@6.2.5` is a dev-only test dependency. The node-only test setup installs explicit named backend objects before Dexie loads; jsdom browser globals remain unchanged. Pure interaction tests explicitly exercise the unsupported-storage path, while the transaction suite owns real rollback/database cleanup.

## Verification

| Command/check | Observed result |
|---|---|
| Baseline focused coordinator/TopBar/AppBootGate tests | 3 files, 18 tests passed before implementation. |
| Final mixed storage/UI regression (`saveSystem.test`, `saveSystem.transaction.test`, `HistoryPage.test`) | 3 files, 39 tests passed. |
| Final focused persistence/settings/setup/recovery matrix | 71 tests passed; independent persistence review ran an expanded 75-test matrix. |
| `CI=true corepack pnpm typecheck` | 9/9 workspace tasks successful; final fresh web task included source and E2E TypeScript. |
| `CI=true corepack pnpm test` | 8/8 tasks successful. Contracts 22, sim-core 1,646, UI 1; web 439 files passed / 1 skipped and 1,584 tests passed / 2 skipped. |
| `CI=true corepack pnpm build` | 5/5 tasks successful; web transformed 3,011 modules and PWA generated 157 precache entries. |
| `CI=true corepack pnpm verify:determinism` | 1 file, 3/3 tests passed. |
| `CI=true corepack pnpm --filter @mbd/web run e2e:reload-smoke` | Fresh production build, 1/1 Chromium test passed in 2.8 minutes, no retry. |
| Final E2E production build | 3,011 modules transformed in 7.38s; PWA generated 157 precache entries. |
| Desktop screenshot inspection | `save-persistence-summary-desktop.png`, 1280x720: exact summary visible inline; route, help, news, settings, sidebar, assistant, and sim controls remain non-occluded. |
| Mobile screenshot inspection | `save-persistence-summary-mobile.png`, 375x667: exact summary visible in the second shell row; top controls, draft action, assistant, sim control, and bottom navigation remain usable. |
| Changed-source randomness scan | No added `Math.random()`, `crypto.randomUUID()`, or simulation-truth wall-clock use. |
| Save-version inspection | `CURRENT_GAME_SNAPSHOT_VERSION = 34`; no contract/schema diff. |
| `git diff --check` | Passed. |
| Generated-artifact check | Playwright report/results and production `dist` remain ignored/untracked. |

The final full web run emitted only existing warning classes: Recharts zero-size messages, React `act(...)` notices, and intentional service-worker failure logging. No test failed.

Diagnostic failures were not counted as passes. Earlier completed full runs exposed, in order: two stale mocks plus test-backend leakage; a cached Dexie dependency that left 15 storage tests without IndexedDB; and an unconditional fake backend that changed three jsdom History boot tests. Each failure was corrected at the test ownership boundary. The final node-only setup passed the 39-test mixed regression, independent review, and the clean 1,584-test web gate.

## Browser Proof

The permanent journey still creates state only through public application controls. It applies a development plan, accepts a trade, delivers its press response, and makes a draft pick. For this slice it additionally:

1. rejects stale/hydrated transient `Saved` before each mutation;
2. requires a newly accepted mutation to reach durable zero-depth state;
3. captures the exact raw durable ISO (`2026-04-02T19:42:03.000Z`) and visible text (`Last saved 7:42:03 PM · 0 pending writes`) after the accepted trade;
4. hard reloads and requires the raw ISO and visible text to remain identical while transient `Saved` is absent;
5. proves later high-emotion mutations still advance and persist normally;
6. checks desktop and mobile summary/control bounds with trial interactions; and
7. attaches both viewport screenshots to the Playwright report.

The overlay helper now tracks one fixed element handle and accepts only a publicly actionable dismissal or a genuinely advanced/vanished overlay. This removes locator retargeting and auto-dismiss races without adding arbitrary waits or private state access.

## Adversarial Review

Initial reviews returned `FIX_AND_REVIEW` for truthful-scope defects rather than presentation polish:

- direct worker/onboarding/manual/maintenance writes could bypass coordinator recency;
- load activation could leak pending state across save IDs;
- root/leaderboard writes could partially commit;
- worker-owned branch storage used a separate executor;
- delayed exports could resurrect deleted or replaced saves;
- replacement could retain foreign branch references/rows;
- metadata success could supersede failed gameplay and destroy Retry;
- the browser helper could retarget a later overlay after an auto-dismiss race; and
- root delete/replacement barriers initially covered only the root coordinator, not delayed child captures.

All were resolved with source-level invariants and hostile regression tests. Final independent browser, persistence, scope/determinism, integrity, and test-harness reviews returned `MERGE_READY`.

P0 findings: none. Unresolved P1 findings: none.

## Compatibility, Risks, and Rollback

Compatibility:

- Save schema remains v34; there is no migration or fixture rewrite.
- Existing old/deep-save migrations, import/export round trips, PWA build, and hard reload remain green.
- Wall-clock values are restricted to save/UI metadata. Simulation truth and deterministic event IDs are unchanged.
- CPU organizations, scouting truth, budgets, ratings, and decision policy are unchanged.
- Existing save rows remain readable; root autosaves preserve branch metadata unless the caller explicitly replaces the dynasty.

Residual risks and adjacent work:

- Automatic retry/export fallback is intentionally deferred to its own roadmap item. This slice preserves a truthful manual Retry state.
- Multi-tab locking, checksums, quota/private-mode guidance, storage-size UI, journaling, and pending-sim-day recovery remain later independent goals.
- Clear All is deliberately blocked while a dynasty is active. A product-level close/deactivate flow should replace that guard in adjacent work; silently broadening deletion authority here would violate the slice cut line.
- Browser screenshots are Playwright report attachments and remain ignored locally; CI retains failure artifacts under the established permanent gate.

Rollback:

1. Revert this slice's coordinator status/activation/metadata/retirement APIs and restore the former autosave callers.
2. Revert the save-system ordered executor and atomic root/branch/delete transaction boundaries together; do not split their callers from the storage implementation.
3. Remove the formatter/TopBar summary and E2E summary assertions.
4. Remove the real IndexedDB transaction suite, node-only test setup, dev dependency, and lockfile entry.
5. No save data rollback or migration is required because persisted snapshot shape/version never changed.

Unrelated dirty files present throughout the run—`.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`—were preserved and are not claimed or included in this slice.

Roadmap item 3 is the next independent slice.
