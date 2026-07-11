# TRUST-STORAGE-PRESSURE-1 — Living Plan

## 1. Objective and player outcome

Implement [Goal 19](../../goals/19_TRUST_STORAGE_PRESSURE_1.md): show protected
dynasty-tree size honestly, warn from approximate origin-wide quota evidence,
disable lossy season compaction, and offer only the existing narrow exact-active
stale-data prune behind durable and accessible trust boundaries.

## 2. Live source truth

See [SOURCE_TRUTH.md](./SOURCE_TRUTH.md).

- Branch: `codex/storage-pressure-7`; start and local `main`:
  `c77ecbc0bbd74fb264ac74322c3d0389b25b77d5`.
- Preserve and never stage the three protected dirty files and exact hashes listed
  in Source Truth.
- Package: `pnpm@9.15.4`; observed Node `v24.16.0`, pnpm `11.7.0`.
- Save truth: GameSnapshot v34; Dexie v5; current write = sealed primary + exact
  shadow + root leaderboard update.
- Baselines: coordinator-focused 5 web files / 107 tests; sim-core performance
  4/4; independent broader map 14 files / 190 tests plus worker maintenance 1/1.
- Current defect: worker snapshot JSON size is stale-prone and is neither durable
  record size nor quota. No origin estimate exists. Diagnostics reads mutate
  `performanceDiagnostics`; maintenance has no confirmation or shared Settings
  operation latch.

## 3. Scope and non-goals

Allowed production areas:

- a pure/read-only storage-report model plus one consistent Dexie capture across
  `saves`, `saveIntegrityBackups`, and `leaderboard`;
- an optional origin-estimate adapter and pure pressure classification;
- read-only diagnostics DTO counts and removal of diagnostics read mutation;
- Save Hub and Settings display on existing routes;
- one shared Settings operation latch and exact-active prune confirmation,
  persistence, refresh, and failure truth;
- focused tests and one dedicated serial production Playwright journey;
- goal/run/ledger documentation.

Hard cut line: no save/branch/shadow deletion as maintenance; no broader sim-core
prune helper; no automatic history compaction; no new archive store, backup
history, export-before-delete workflow, storage permission request, cache clearing,
cloud/sync/backend, GameSnapshot v35, Dexie v6, dependency, gameplay/CPU/RNG,
item-8 journal, new route, or generic UI cleanup.

## 4. Behavioral invariants

- Worker remains canonical; Zustand remains a UI mirror.
- The three size truths—current snapshot JSON, estimated serialized local MBD
  records, and approximate origin usage/quota—are never equated.
- Raw storage measurement is read-only and consistent; it never normalizes,
  repairs, hashes, reseals, updates timestamps, or trusts corrupt topology.
- Actual rows are counted. A missing shadow is not inferred; an orphan/corrupt row
  is not dropped from the all-MBD total; partial evidence never becomes zero.
- Pressure thresholds are UI policy only: `<80` normal, `80–<90` warning, `>=90`
  critical; a real quota failure overrides the estimate.
- Prune is exact-active-save only. Root and branches share tree authority,
  but an active branch mutation changes only its own worker snapshot/pair.
- One Settings latch covers save-data and maintenance controls through mutation,
  exact persistence, telemetry refresh, and final status.
- Cancel/Escape/stale confirmation/ownership failure means no Comlink call,
  export, persistence, refresh, or success status.
- The lossy archive action is not player reachable. Its detailed-history loss is
  not proven redundant. Prune removes only stale ticker and consequence-watcher
  entries.
- Persistence failure never claims reclaimed durable bytes. Retry persists the
  captured exact snapshot only; capture failure has no fake Retry and reloads the
  prior durable state.
- v34, Dexie v5, primary/shadow integrity, old/deep imports, deterministic RNG,
  PWA behavior, CPU fairness, and item-1–6 trust semantics remain unchanged.

## 5. Design decision

### Storage report

Capture all raw values from the three Dexie stores inside one read-only
transaction. After the transaction closes, encode each `JSON.stringify` result
with `TextEncoder`. Return explicit row kind/ID/byte/status evidence, exact-save
primary/shadow totals, trusted root-tree totals, per-slot leaderboard bytes, and
an all-MBD total with unattributed/incomplete evidence. Reuse the live trusted
tree rules; do not add size to `SaveData` or its checksum projection.

Render per-root protected-tree estimates in Save Hub and Settings Data/Install.
Settings Diagnostics separately renders current snapshot JSON size, exact active
pair/tree estimate, all-MBD logical record total, and origin-wide approximate
usage/quota. Copy states the exclusions and partial/unavailable states.

### Origin pressure

Use `navigator.storage?.estimate()` only. Normalize the response through a pure
classifier. Do not request persistence permission. Missing/rejected/malformed
values show unavailable; valid values use the 80/90 policy. Feed the actual active
persistence failure kind into the display so `quota` cannot be masked by an
optimistic estimate.

### Maintenance and history

Make diagnostics views pure and expose exact read-only counts for stale ticker/
watcher entries. Remove the archive dispatch from player UI and render protected-
history guidance instead; focused tests must prove its worker method is never
called. Use an accessible controlled alert dialog for prune, not immediate
dispatch. Bind the preview to `{activeSaveId, action: 'prune', counts}` and
revalidate exact ownership/identity before Comlink. Confirmation names only the
narrow web worker lanes.

Share one Settings operation owner across save-data and diagnostics. On Confirm:
acquire -> revalidate -> mutate once -> capture/persist exact active snapshot ->
refresh durable report and origin estimate -> report success. Keep the previous
durable report on any failure. Read actual coordinator recovery state before
offering Retry. Never call maintenance again during persistence recovery.

### Browser proof

Add `storage-pressure.spec.ts` to the existing serial Playwright config. Use a
public UI path and a checked-in current v34 long-save fixture if needed; no
production backdoor. Install an 85% `navigator.storage.estimate()` shim through
Playwright before boot. Page A owns the tree; Page B is a real same-origin
contender. Prove distinct metrics, cancel+reload unchanged, confirmed narrow
maintenance, quota-failure truth, Retry without mutation rerun, exact pair update,
hard reload, owner close/successor acquire, and desktop/375x667 behavior.

## 6. Milestones, relay, and Terra brief

| Milestone | Deliverable | Proof | Status |
| --- | --- | --- | --- |
| M0 | Goal 19, Source Truth, living plan, ledger | source/test/risk maps; baselines; protected hashes | Complete |
| M1 | raw record/tree report + origin classifier | `saveSystem.storagePressure.test.ts` (primary/shadow/branch/leaderboard, Unicode, orphan/legacy) and `storagePressure.test.ts` (unavailable, boundaries, overrun, quota) | Complete — focused 5/5 |
| M2 | pure diagnostics + exact eligibility DTO | worker view no longer writes diagnostics, current snapshot estimate is freshly exported, no-op prune returns before assignments | Complete — expanded focused matrix green |
| M3 | remount-safe Settings owner + exact receipt confirmation | opaque operation token survives route remount; accepted snapshot receipt, factual dialog, stale-callback fencing | Complete — P0 alias and remount regressions green |
| M4 | Save Hub/Settings truthful UX | distinct Current Snapshot, Local MBD Records, Origin Storage labels; protected-history copy and alertdialog | Complete — independent worker/local/origin failure states and threshold boundaries green |
| M5 | production browser proof | owner+contender, 85%, cancel, quota fault, receipt-backed retry, pair, reload, successor, mobile | Complete — fresh zero-retry 1/1 plus 2/2 |
| M6 | negative control, full gates, review, closeout | restored control; full commands; Sol zero P0–P2; Luna scoped landing | Complete — final receipts green; closeout artifacts and landing recorded below |

### Relay route

| Phase | Task title | Model | Effort | Deliverable | Gate |
| --- | --- | --- | --- | --- | --- |
| Reconstruct/plan | `GOAT-7 Storage Pressure — Sol Plan` | `gpt-5.6-sol` | xhigh | Goal 19 + Source Truth + Plan + ledger | `PLAN_READY` |
| Implement | `GOAT-7 Storage Pressure — Terra Implementation` | `gpt-5.6-terra` | high; escalate only with concrete repeated correction evidence | live working-tree implementation + focused receipts + negative control + updated plan | `IMPLEMENTATION_READY` |
| Review | persistent item-7 Sol task | `gpt-5.6-sol` | xhigh | line-level goal/diff/source/history/persistence/browser review; corrections to same Terra task | `MERGE_READY` only at zero P0–P2 |
| Closeout | `GOAT-7 Storage Pressure — Luna Closeout` | `gpt-5.6-luna` | medium | completion/changelog/ledger, full gates, scoped commit, local-main FF | `LANDED_ON_MAIN` |

Actual route adaptation: Sol plan/review remains the persistent
`019f51c7-4ff9-7b13-8b14-d0120e47225c` xhigh task. Terra
`019f529d-211d-7590-b834-3014f5a3a102` ran high→xhigh through the first
implementation and correction artifact, but its archived rollout file became
unavailable before the second-review corrections could be returned. Per the
explicit relay fallback rule, the coordinator announced and used a manual
relay-pattern writer pass in this thread for those corrections. Read-only adjunct
audits ran in parallel; they did not write. Luna closeout was the sole
checkout-writing phase and landed item 7 on local `main` after the final gates.

### Terra implementation brief

**Role:** Sole item-7 implementation writer, `gpt-5.6-terra` high, using the
repo-local MBD implementation workflow. Same task owns all corrections.

**Outcome:** Implement Goal 19 only, keep this plan living, and return an actual
working-tree artifact with focused proof. Do not commit or start item 8.

**Inputs:** branch `codex/storage-pressure-7`; base `c77ecbc...`; Goal 19; this run
directory; roadmap item 7; prior Goals/Runs 15–18; live files named in Source
Truth; three protected dirty files/hashes.

**Constraints:** read live source/diff first; one writer; preserve v34/v5,
determinism, exact worker/save authority, primary/shadow repair, roots/branches,
no broader prune, no player-reachable/automatic archive, no schema/dependency/new route, and no
item 8. Use `apply_patch`. Update plan after each checkpoint. Never stage protected
files. No push/deploy/tag/release.

**Acceptance:** complete M1–M5; run the focused matrix; demonstrate one deliberate
failure by temporarily bypassing exact-save ownership for prune or by
treating `{saved:false}` as success, then restore exactly and rerun green; run
relevant typechecks/build and the dedicated production browser proof; inspect
desktop/375x667; verify source scans, index, and protected hashes. History copy and
runtime must match exactly.

**Return:** `IMPLEMENTATION_READY` or precise blocker; changed files; requirement
mapping; exact commands/counts; negative-control failure/restoration; browser
artifacts; source/diff self-review; remaining risks; protected hash/index proof.

## 7. Acceptance matrix

| Requirement | Implementation seam | Unit/integration proof | Browser proof | Status |
| --- | --- | --- | --- | --- |
| Actual raw MBD bytes | save-system read-only report | Unicode JSON bytes; actual primary/shadow; legacy no-shadow | displayed pair/tree matches inspected DB | Complete |
| Complete DB/tree accounting | captured rows + trusted topology | branches, all slot leaderboards, corrupt/orphan/unassigned, partial not zero | root tree distinct from all-MBD total | Complete |
| Pure snapshot diagnostic | worker diagnostics | positive stale field cannot masquerade; read/no-op changes nothing | snapshot label distinct | Complete |
| Approximate origin estimate | adapter/classifier | unavailable/reject/malformed/0/nonfinite; threshold-safe 79.99/80/89.99/90/over | 85% origin warning | Complete |
| Quota override | persistence status + pressure model | quota failure beats optimistic/unavailable estimate without cancelling full telemetry | injected quota remains critical | Complete |
| Factual eligibility | diagnostics DTO | exact stale ticker/watcher counts; no broader lanes | confirmation shows count | Complete |
| Protected season history | archive UI removal/guidance | archive worker method never called; no automatic path; discarded facts not called redundant | Save Hub/Settings expose no archive action | Complete |
| Narrow prune | alertdialog + `pruneStaleWorkerData` | active entries and broader sim-core lanes preserved | confirmed count reduction/reload | Complete |
| One Settings operation owner | shared external token coordinator | duplicate/stale/remount owners fail; exact token releases only after telemetry | controls locked through durability | Complete |
| Exact root/branch authority | worker gate + active persistence | forced ownership failure means no Comlink/persist; active branch exact pair only | real same-tree contender blocked | Complete |
| Failure-stage truth | exact accepted-capture receipt + persistence state | old retained job/export failure and same-save generation reuse cannot alias; Retry no rerun | quota fault -> prior pair -> exact receipt Retry -> new pair | Complete |
| Accessible responsive UX | Save Hub/Settings/dialog/status | role/name/live region/focus/Space/Enter/Escape/44px/non-color | desktop + 375x667 geometry | Complete |
| Reload and successor | existing trust seams | delayed write/switch barriers remain green | owner reload; owner close; successor fresh acquire | Complete |
| Compatibility/scope | no schema/DB/dependency/gameplay change | focused integrity/session/routes/bundle matrix; full/determinism deferred to Luna | fresh PWA production/browser gates | Pre-closeout complete |

## 8. Progress log

1. 2026-07-11 — Verified item 6 landed on local main at `c77ecbc...`; created
   `codex/storage-pressure-7`; protected hashes matched and index was empty.
2. 2026-07-11 — Read root/app instructions, canonical governance, roadmap/ledger,
   Goals/Runs 15–18, live manifests, persistence/tree/shadow/Settings/Save Hub/
   recovery/worker source, tests, and the WHATWG Storage Standard.
3. 2026-07-11 — Three read-only maps reconciled source, tests, and adversarial
   risk. They confirmed no origin estimate, snapshot-only stale size, actual
   primary+shadow+leaderboard accounting, shared-latch gap, diagnostics read
   mutation, exact active maintenance, broad-prune trap, and browser seams.
4. 2026-07-11 — Chose narrow stale ticker/watcher pruning over save/shadow
   deletion. Adjudicated lossy archive against the history gate: source does not
   prove the discarded facts remain in equivalent canonical ledgers, so the
   archive UI action is disabled; confirmation alone would not cure the defect.
5. 2026-07-11 — Baselines passed as recorded in Source Truth. Created Goal 19,
   Source Truth, this plan, and the bounded item-7 ledger checkpoint. No production
   or test implementation was started.
6. 2026-07-11 — Implemented the first bounded storage-pressure checkpoint. `getLocalStorageEstimate()` uses one readonly Dexie transaction over `saves`, `saveIntegrityBackups`, and `leaderboard`, sizes actual JSON UTF-8 rows after capture, counts legacy no-shadow rows once, and retains unsafe/orphan bytes in the all-MBD total as partial evidence. `storagePressure.ts` has the pure optional origin adapter policy.
7. 2026-07-11 — Made diagnostics reads pure/current and made narrow prune zero-result return before state assignment. Removed player archive dispatch, added protected-history guidance and an active-save-bound controlled prune alertdialog, and routed prune through the existing Settings operation latch and exact-active persistence coordinator. Focused model/UI tests (11) and web production build passed; browser/retry/ownership proof remains open.
8. 2026-07-11 — Coordinator correction checkpoint: wired active persistence failure kind into origin-pressure classification, moved Save Hub storage/origin acquisition into its route-data refresh seam, made the dialog a sibling of the inert background with a two-control keyboard cycle, bound confirmation ID through the hook before worker invocation, split capture-versus-write failure copy from coordinator status, and guarded Settings/Setup telemetry reads against out-of-order completions. Focused Settings/Setup hooks and dialog tests passed; browser and full persistence proof remain open.
9. 2026-07-11 — Added `storage-pressure.spec.ts` to the serial production config. It imports a source-valid v34 fixture through the public Settings file input, creates an owner/blocked same-tree contender, shims 85% origin use, proves archive absence/cancel/mobile bounds, injects a real IndexedDB quota failure, observes the critical origin override and exhausted automatic writes, retries the retained snapshot without a second prune, verifies pair equality/change and visible 0/0 eligibility before and after reload, then proves owner and successor mutations/reloads. Fresh dedicated Chromium run passed 1/1 with zero retries. The deliberate stale-confirmation negative control failed as expected when the guard was temporarily bypassed (`pruneStaleData` called once), was restored, and the focused suite passed 21/21.
10. 2026-07-11 — Final terminal E2E receipts on final source: `playwright test e2e/multitab-guard.spec.ts --config=playwright.config.ts --project=chromium --workers=1 --retries=0 --reporter=line` passed 1/1 in 10.8s, explicit exit 0; `playwright test e2e/reload-smoke.spec.ts --config=playwright.config.ts --project=chromium --workers=1 --retries=0 --reporter=line` passed 1/1 in 4.2m, explicit exit 0. Both ran after the final fresh production build and with zero retries. Final focused five-file matrix passed 21/21; web and E2E TypeScript checks passed.
11. 2026-07-11 — Sol first-review Space negative control reproduced in production: with prune dialog open and Cancel focused, Space closed the dialog by activating Cancel while preserving the underlying sim risk. Fixed the app-level modal contract through a document modal marker consulted by `AppLayout`, plus capture-phase outside-pointer blocking and prevention of non-dialog key default activation. Fresh production storage-pressure proof passed 1/1 in 36.7s, exit 0, confirming Space leaves the dialog open and the durable pair unchanged.
12. 2026-07-11 — Began second review correction pass on storage truth. Sealed rows missing their required shadow and noncanonical `save-slot-N` roots now remain all-MBD evidence but cannot become trusted trees; a regression verifies the partial/unattributed lower-bound behavior. Save Hub now renders an explicit unavailable/partial tree state instead of silently omitting it. Targeted storage+dialog suite: 2 files / 8 tests passed; web typecheck passed.
13. 2026-07-11 — Exact-save diagnostics checkpoint: the hook now clears immediately during A→B transition, binds each completion/rejection to its requested active ID plus generation, and invalidates pending callbacks at unmount. Deferred A→B late-success and B-rejection tests pass; settings diagnostics hook: 8/8 and web typecheck green.
14. 2026-07-11 — Durability/telemetry checkpoint: maintenance no longer installs its mutation DTO as a temporary diagnostics truth. A successful durable write followed by telemetry failure keeps the prior valid diagnostics, reports durable success plus telemetry unavailable, and offers no replay semantics; worker rejection performs no persistence. Settings diagnostics hook now passes 10/10 with web typecheck green.
15. 2026-07-11 — Checkpoint C complete at the existing coordinator seam. `activeSavePersistence.test.ts` plus maintenance hook suite passed 52/52: export failure precedes any write and exposes no retry job; storage failures retain one exact captured generation for manual/automatic retry without another export; recovery is exact-save scoped; maintenance rejection does not persist; durable+telemetry failure retains durable truth and prior diagnostics. Web typecheck passed.
16. 2026-07-11 — Storage model/UI checkpoint advanced: all-MBD serialized bytes now identify whether they are a complete total or only a known lower bound; sealed missing-shadow and rogue-root rows are unsafe/unattributed, while canonical legacy no-shadow remains compatible. Added exact UTF-8/multiple leaderboard byte oracle and explicit Settings/Save Hub partial/unavailable plus textual <80/80–<90/>=90 policy copy. Focused storage/pressure/Settings/Save Hub suite passed 4 files / 15 tests; web typecheck and diff check passed.
17. 2026-07-11 — Checkpoint A COMPLETE. `getLocalStorageEstimate()` now accepts a tree only when it has the canonical root identity/lineage and the live exact primary/shadow relationship evidence; duplicate roots make slot-only leaderboard ownership partial rather than guessed. The 18-test storage matrix covers canonical root+branch+multiple leaderboards, rogue/slot conflicts, every shadow identity/root/slot/checksum/updated-generation mismatch, sealed missing shadow, legitimate checksumless legacy no-shadow, invalid branch lineage/slot, corrupt metadata/orphan shadows, an actual storable `BigInt` JSON-serialization failure, transaction failure, exact Unicode UTF-8 sums, and read-only operation. Serialization failure now has a nullable unsafe-byte field and a truthful known-lower-bound message; transaction failure exposes nullable all-MBD and unattributed bytes rather than zero. Settings visibly separates current snapshot, active protected tree primary/shadow/leaderboard, all-MBD raw records, and origin evidence; Save Hub exposes complete/partial/unavailable tree/accounting evidence and 80/90 textual policy boundaries. Current focused receipt: `pnpm --filter @mbd/web exec vitest run src/shared/lib/saveSystem.storagePressure.test.ts src/shared/lib/storagePressure.test.ts src/features/settings/components/SettingsDiagnosticsPanel.test.tsx src/features/setup/components/SetupSaveHubPanel.test.tsx --reporter=dot && pnpm --filter @mbd/web exec tsc --noEmit && git diff --check` — 4 files / 31 tests passed, exit 0 (Vitest 2.32s; typecheck/diff observed exit 0).
18. 2026-07-11 — Shared-latch correction COMPLETE. `SettingsPageContent` now feeds the real `useSettingsSaveData` operation owner into Diagnostics disabled state, so a save/load/import/export/delete/clear/branch operation visibly and functionally blocks prune through its full lifecycle. The diagnostics hook tests a held owner returning false before any worker/Comlink, capture/export, or persistence call; the save-data hook tests that its one exposed owner rejects a second claimant; route content tests the prune control is disabled and cannot dispatch. Current receipt: `pnpm --filter @mbd/web exec vitest run src/features/settings/hooks/useSettingsDiagnosticsData.test.tsx src/features/settings/hooks/useSettingsSaveData.test.tsx src/features/settings/components/SettingsPageContent.test.tsx src/features/settings/components/SettingsDiagnosticsPanel.test.tsx --reporter=dot && pnpm --filter @mbd/web exec tsc --noEmit && git diff --check` — 4 files / 33 tests passed, exit 0 (Vitest 2.01s; typecheck/diff observed exit 0; expected logger output covers deliberately rejected failure branches).
19. 2026-07-11 — Direct worker maintenance proof strengthened. The in-worker focused regression sets a deliberately stale persisted `snapshotSizeBytes`, takes an exact snapshot/RNG baseline, and proves `getPerformanceDiagnostics()` recomputes current bytes without changing persisted diagnostics, snapshot, or RNG. It proves exact stale-watcher eligibility (one expired plus one resolved), narrow prune removes only 1 ticker + 2 watchers, retains a concrete player narrative arc, and a second zero-result prune has snapshot/RNG identity. Receipt: `pnpm --filter @mbd/web exec vitest run src/workers/sim.worker.test.ts -t "reports runtime diagnostics while archive and prune maintenance mutate worker state only" --reporter=dot` — 1 passed / 123 skipped, exit 0, 1.88s; subsequent web typecheck and diff check exit 0.
20. 2026-07-11 — Browser proof strengthened and rerun from a fresh 3,021-module / 167-entry PWA build. The dedicated zero-retry production journey now corroborates the visibly separate snapshot/local-tree/all-MBD/origin metrics with one raw readonly IndexedDB evidence capture, tests reverse mobile focus wrap and 44px dialog controls, and makes owner/successor checksum generation changes explicit. Fresh `storage-pressure.spec.ts` passed 1/1 in 34.6s with `--workers=1 --retries=0 --reporter=line`; the initial instrumentation-only failure attached a storage test id to Runtime, was corrected with no product behavior change, then the final run passed. Separate final-source production journeys: `multitab-guard.spec.ts` passed 1/1 in 9.9s (zero retry); `reload-smoke.spec.ts` completed separately with Playwright `.last-run.json` `status: passed`, no failed tests, after approximately 4m25s (zero retry flag). No retries or flaky classification occurred.
21. 2026-07-11 — Final current-source focused matrix receipt: `pnpm --filter @mbd/web exec vitest run src/shared/lib/saveSystem.storagePressure.test.ts src/shared/lib/storagePressure.test.ts src/shared/lib/activeSavePersistence.test.ts src/features/settings/components/SettingsDiagnosticsPanel.test.tsx src/features/settings/components/SettingsPageContent.test.tsx src/features/settings/hooks/useSettingsDiagnosticsData.test.tsx src/features/settings/hooks/useSettingsSaveData.test.tsx src/features/setup/components/SetupSaveHubPanel.test.tsx src/workers/sim.worker.test.ts --reporter=json --outputFile=/tmp/mbd-goal19-focused-final.json` recorded 18 suites / 224 tests passed, 0 failed. `pnpm --filter @mbd/web run typecheck` (web plus E2E) and `git diff --check` passed. Item 7 remains IN PROGRESS pending Sol review and authorized closeout; the ledger was reconciled to the live uncommitted implementation artifact and Sol `FIX_AND_REVIEW` status.
22. 2026-07-11 — Final local audit: branch `codex/storage-pressure-7`, `HEAD` and local `main` both `c77ecbc0bbd74fb264ac74322c3d0389b25b77d5`; index empty; `git diff --check` passed. No package/lock dependency diff, no GameSnapshot/Dexie schema bump, no added bare `Math.random`, no broad sim-core prune import, no player archive dispatch, and no item-8 source diff. Protected hashes remained exactly `a1a6d903…fe59ac3` (skill), `1f181b5d…12cfc163` (root instructions), and `8a3c0cfd…33817eb1` (program). Remaining dirty protected files are unchanged and unstaged; all other dirty/untracked files are item-7 implementation/run artifacts.
23. 2026-07-11 — Final exact-confirmation correction: modal confirmation now binds factual stale-ticker plus stale-watcher counts through `SettingsDiagnosticsPanel` into `useSettingsDiagnosticsData`. The hook obtains current diagnostics, compares both counts, checks the active save ID again immediately before mutation Comlink, and fails closed with a factual reopen message for count or save drift. Added deferred save-switch and changed-eligibility no-worker/no-persist tests; repaired the SettingsPage persistence-status mock to use a stable external-store snapshot and updated route fixtures with mandatory `staleWatchers`. Targeted receipt: diagnostics hook + Settings route 20/20, web/E2E typecheck, and diff check passed. Fresh build/browser rerun is required next because this is a production behavior correction.
24. 2026-07-11 — Post-correction final receipts. Fresh production build/PWA: 3,021 modules, 167 precache entries. Dedicated `storage-pressure.spec.ts` final run completed `status: passed` (one context/two pages, `--workers=1 --retries=0`); `multitab-guard.spec.ts` final line receipt 1/1 in 13.5s; `reload-smoke.spec.ts` final separate `.last-run.json` reports `status: passed`, no failed tests, also with zero retry flag. Final focused JSON receipt at `/tmp/mbd-goal19-focused-fence-final.json`: 20 suites / 233 tests passed, 0 failed. Final `pnpm --filter @mbd/web run typecheck`, `git diff --check`, dependency/schema/random/broad-prune/archive/item-8 source scans, protected hashes, and empty-index check passed. The working tree is a stable uncommitted item-7 artifact awaiting Sol review; no closeout/commit/landing action was taken.
25. 2026-07-11 — Sol second review returned `FIX_AND_REVIEW`: Settings released
    its latch before all telemetry/final status, exact Retry left stale copy,
    threshold rounding crossed policy boundaries, malformed slots could form
    trees, native dialog activation was blocked, and Setup/diagnostics lifecycle
    coverage was incomplete. Terra's archived rollout artifact could not be
    resumed, so the coordinator announced the user-authorized manual relay-pattern
    fallback and became sole writer. The first correction set passed 8 files / 86
    tests and root typecheck; fresh storage-pressure Playwright passed 1/1.
26. 2026-07-11 — A read-only correction audit reproduced a P0 false-durability
    timeline: an older retained generation-1 job could be mistaken for a newly
    pruned snapshot after the new export failed, and same-save activation could
    reuse the same generation. Replaced generation inference with one opaque
    accepted-capture receipt whose exact object identity survives persistence-only
    Retry and is marked durable only by its own successful job. Added the older-job
    export-failure and same-save generation-reuse negative regressions. Also moved
    Settings ownership to a remount-safe external token coordinator, removed the
    partial-refresh cancellation race, refreshed on cross-remount owner release,
    and kept local/origin evidence visible when worker diagnostics are unavailable.
27. 2026-07-11 — Corrected expanded focused JSON receipt at
    `/tmp/mbd-goal19-focused-after-sol-fixes.json`: 49 suites / 368 tests passed,
    0 failed, covering persistence/session/worker fences, storage/integrity,
    Settings/Setup, app shell, lazy routes, and bundle budgets. Root typecheck
    passed 9/9 Turbo tasks; diff check, empty index, branch/base revisions, and all
    protected hashes passed.
28. 2026-07-11 — Final pre-review production receipts from a fresh 3,022-module /
    167-entry PWA build: dedicated storage-pressure Playwright passed 1/1 in
    41.5s; combined multi-tab plus complete reload-smoke passed 2/2 in 4.6m.
    All used Chromium, one worker, zero retries, and produced no flaky
    classification. Item 7 remains uncommitted and IN PROGRESS pending Sol's
    zero-P0–P2 verdict and Luna closeout.
29. 2026-07-11 — Replacement Sol thread
    `019f533e-f986-7652-8641-4c6e060c1e04` (requested xhigh; runtime escalated to
    ultra) returned `FIX_AND_REVIEW` with zero P0, two P1, and two P2 findings.
    Corrected the invisible-modal deadlock by deriving every modal fence from one
    exact-save/evidence predicate; corrected ticker expiry to canonical absolute
    day with same- and cross-season fixtures; cleared only the Setup refresh-
    failure sentinel after coherent recovery; and cleared only the Settings
    shared-owner warning when the owner settles. Correction receipt: 4 suites /
    162 tests passed, web+E2E typecheck passed, and `git diff --check` passed.
    The same Sol thread must re-review these artifacts before closeout.
30. 2026-07-11 — Persistent control for the completed replacement Sol thread
    failed because its archived rollout file was missing. A fresh visible
    `gpt-5.6-sol` xhigh read-only worktree thread
    `019f534c-8009-7ab1-8849-e9c59b7c49cc` re-reviewed the exact artifact. It
    resolved all four prior findings, ran focused 34/34, 26/26, and worker 1/1
    receipts, and independently ran a fresh 3,022-module / 167-precache build plus
    zero-retry storage-pressure Playwright 1/1 in 42.8s. Its verdict remained
    `FIX_AND_REVIEW` for one new P1: zero-result archive normalized persisted
    diagnostics before its eligibility guard. Moved normalization after the
    zero-result return and extended the worker regression with stale
    `totalSeasons`, exact snapshot identity, and exact RNG identity. The corrected
    targeted worker test passed 1/1 (123 skipped); web+E2E typecheck and diff check
    passed. Final Sol confirmation remains required.

## 9. Decision log

1. Measure logical UTF-8 JSON of actual raw rows; do not claim physical IndexedDB
   bytes and do not persist telemetry inside the sealed save.
2. Count actual primary, actual shadow, all slot leaderboard rows, and every
   unattributed row. Trust topology for attribution, not for total existence.
3. Show size/pressure in existing Save Hub and Settings; maintenance stays in
   active Settings because only the active worker snapshot can be mutated safely.
4. Keep snapshot, local MBD record, and origin estimate as three named truths.
5. Adopt 80/90 deterministic UI thresholds and let actual quota failure override.
6. Use the narrow web worker prune only. Do not import the broader sim-core helper.
7. Disable the existing lossy archive UI action. Preserve the worker method only
   as compatibility surface; no player or automatic path may call it. Lossless
   archival requires a separate governed goal.
8. One shared Settings latch closes the worker-mutation-to-persistence UI gap;
   existing worker/session/storage barriers remain authority.
9. Retry persistence only. A capture-stage failure cannot advertise a retained
   retry job it does not have.
10. Use a dedicated two-page production spec so storage pressure, quota recovery,
    ownership, hard reload, successor acquisition, and mobile evidence are one
    causal proof.
11. Treat persistence generation as ordering only. Bind maintenance recovery to
    the exact opaque receipt minted for the accepted post-prune capture; an older
    retry job or a reused generation can never satisfy it.
12. Keep one Settings operation owner outside the route instance. Only its opaque
    token can release the lane, and telemetry refreshes when a remounted observer
    sees that owner settle.
13. Treat a prune modal as valid only while its confirmed save remains active and
    the diagnostics evidence still exists. One predicate owns rendering and every
    global/local interaction fence; invalid evidence clears the confirmation.
14. Evaluate ticker expiry in the canonical absolute season/day domain. Do not
    reinterpret persisted absolute expiry as a within-season day during prune.
15. Clear only route-owned error/warning sentinels on recovery; unrelated status
    copy belongs to its originating operation and must survive telemetry refresh.
16. A retained worker mutation reporting a zero result must be a true snapshot and
    RNG no-op even when the corresponding player action is disabled.

## 10. Completion conditions

- M1–M5 and every acceptance row are complete with exact source/test/browser
  evidence; no player-reachable archive compaction exists.
- Focused commands include Settings panels/hooks/routes, Save Hub, save system
  ordinary/integrity/transaction tests, active persistence/session ownership,
  worker ownership/maintenance, touch targets, and any new pure modules.
- One exact-save-ownership or false-durable-success negative control fails for the
  intended reason, is restored, and the positive suite reruns green before final
  gates.
- `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm verify:determinism`, dedicated storage-pressure Playwright, and complete
  `pnpm e2e:reload-smoke` pass from final source with observed receipts.
- `git diff --check`, conflict-marker/randomness/schema/DB/dependency/item-8/broad-
  prune scans, staged-scope check, and protected SHA-256 checks pass.
- Sol adversarial review reports zero actionable P0–P2. Corrections return to the
  same Terra task. Only then may Luna write completion/changelog/ledger, run full
  closeout gates, stage only item-7 files, commit, and locally fast-forward main.
- No push, deploy, tag, release, or item-8 work occurs.

## 10. Luna closeout receipts

1. Reconstructed the exact 49-suite focused list from
   `/tmp/mbd-goal19-focused-after-sol-fixes.json` and reran current source to
   `/tmp/mbd-goal19-focused-final.json`: **49 suites / 372 tests passed, 0 failed**.
   It covers the ownership coordinator, save-tree/root/branch resolution,
   transition rollback/recovery, worker mutation session, exact-save
   capture/export, active-persistence fencing, boot, Setup/Save Hub, Settings,
   recovery, app-shell disable/modal fencing, route/lazy-shell, bundle budget,
   worker diagnostics/maintenance, and storage model/pressure lanes.
2. `pnpm typecheck`: **9/9** workspace tasks passed, including web and E2E
   TypeScript. `pnpm test`: contracts **24/24**, sim-core **1,646/1,646**,
   UI **1/1**, web **454 suites / 1,898 tests passed / 2 skipped**. The first
   full run exposed only the stale `settings-maintenance-archive` mobile
   contract after the archive action was intentionally disabled; removing that
   obsolete expectation was the sole closeout test edit, and the rerun passed.
3. `pnpm build`: **5/5** tasks passed; fresh production/PWA build transformed
   **3,022 modules** and generated **167 precache entries**. `pnpm
   verify:determinism`: **3/3** passed.
4. Fresh explicit Chromium production-preview runs, serially with
   `--workers=1 --retries=0 --reporter=line`: `storage-pressure.spec.ts`
   **1/1 in 42.5s**; `multitab-guard.spec.ts` **1/1 in 11.9s**;
   `reload-smoke.spec.ts` **1/1 in 4.5m**. No retries or flaky classification.
5. `git diff --check`, conflict-marker/schema/Dexie/dependency/bare-randomness/
   broad-prune/archive-dispatch/item-8 scans, protected hashes, and exact
   staged-scope checks passed. The adjacent relative-expiry monthly league-event
   ticker defect remains deferred outside item 7.
