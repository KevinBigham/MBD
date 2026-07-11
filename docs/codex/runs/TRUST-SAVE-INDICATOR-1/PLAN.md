# TRUST-SAVE-INDICATOR-1 Execution Plan

## Objective and player outcome

Every active dynasty will show the exact most recent durable local-save time and logical pending-write depth in the global shell, without allowing hydrated metadata to fake a newly completed `Saved` mutation. Active goal: [`docs/codex/goals/14_TRUST_SAVE_INDICATOR_1.md`](../../goals/14_TRUST_SAVE_INDICATOR_1.md).

## Live source truth

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch/worktree: `codex/trust-save-indicator-2` in the primary worktree.
- Starting commit: `0fdf9eb0289e45c52f95b7d66aaa3519f0a088b2`.
- Starting dirty state: only the slice-owned goal is untracked; concurrent edits to `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md` are user-owned and excluded.
- Package/runtime: `pnpm@9.15.4`, Node `>=20`.
- Root gates: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:determinism`, and `pnpm e2e:reload-smoke`.
- Save version: v34; no schema change is needed or allowed.
- Baseline: focused coordinator/TopBar/AppBootGate tests passed 18/18. The identical starting commit just passed full typecheck (9 tasks), tests (8 tasks), build (5 tasks), determinism (3), and two clean reload-smoke runs.
- `SOURCE_TRUTH.md` records the mapped state machine, direct writers, root save/leaderboard partial-commit hazard, responsive seam, and stale Playwright assumption.

## Scope and non-goals

Allowed production areas:

- active-save coordinator status/hydration/metadata reconciliation and focused tests;
- save-record write boundary needed to make returned `updatedAt` an unambiguous committed result;
- successful active-save load/create/manual/maintenance seams that already possess or can re-read `SaveData`;
- a pure recency/pluralization formatter and existing TopBar presentation/tests;
- permanent reload-smoke assertions plus 375x667 shell-layout proof;
- `DESIGN.md` resolution and slice run docs.

Hard cut line: no snapshot field/version/migration, gameplay/RNG/CPU change, automatic retry/export fallback, checksum, multi-tab lock, storage-pressure UI, journal, service-worker save ownership, polling loop, new route, settings toggle, broad save-system rewrite, or unrelated accessibility cleanup.

Deletion retirement, branch metadata writes, and occupied-slot replacement were pulled into scope after adversarial review proved they could make the active shell claim false or recreate a deleted record. A product-level close/deactivate flow for Clear All remains adjacent; this slice keeps the destructive control blocked while any dynasty is active.

## Behavioral invariants

- `lastSavedAt` comes from the exact committed `SaveData.updatedAt`, never a second coordinator clock read.
- Root save and derived leaderboard writes resolve or reject atomically so a rejected save call cannot conceal an already-committed save row.
- `pendingWrites = max(0, desiredGeneration - durableGeneration)` is cached in status and means logical captured generations not yet covered by durable state.
- Coalescing may skip physical puts but may never underflow or clear the logical depth before the newest full snapshot is durable.
- Every successful intermediate put advances durable recency while newer pending work keeps the transient state `Saving...`.
- Failed writes preserve the previous durable time and nonzero depth; Retry reuses the captured snapshot and reaches zero only on durable success.
- Hydration/refresh never resets generations, overwrites runtime saving/failure state, moves time backward, or copies one save ID's metadata to another.
- Non-snapshot branch metadata writes run in the main realm, join the active coordinator as one logical generation, wait accepted snapshot work, and may not supersede a failed gameplay snapshot or destroy Retry.
- Save deletion invalidates delayed captures, waits accepted writes, discards retry state only after deletion, stays tombstoned until explicit activation, and joins the per-save storage executor.
- Explicit root replacement deletes old child-branch rows in the same root/leaderboard transaction; ordinary autosaves preserve current branch metadata.
- Unknown/invalid/epoch metadata renders no fabricated time.
- The persistent summary and transient mutation state are separate DOM/accessibility contracts. Hydration must not make the Playwright freshness guard stale-pass.
- No-op/rejected actions leave time and depth unchanged.
- UI record timestamps are allowed wall-clock metadata; none enters simulation truth or event identity.
- Existing v34, old/deep saves, import/export, PWA, deterministic behavior, and CPU fairness remain unchanged.

## Design decision

Extend the current coordinator status with cached `pendingWrites`, exact activation/reconciliation boundaries, tracked metadata operations, and delete retirement. Reconciliation accepts the exact save record identity/name/timestamp, sanitizes invalid or epoch values, and only advances recency. Explicit load activation first invalidates delayed captures and settles accepted writes, then replaces retry/generation state with the exact imported record. Metadata operations pause new captures, settle existing captures/writes, contribute one logical generation, and refuse to run over unresolved gameplay persistence. Deletion tombstones the ID so a delayed export cannot recreate it.

`saveGameById()` makes current-schema root save plus leaderboard persistence one Dexie transaction and returns the committed record. Main-realm per-ID executors serialize root autosaves with parent branch read/merge/write work. Explicit root replacement removes child rows in that same transaction. `saveGame()` returns the record rather than discarding it. A fake-IndexedDB integration suite proves rollback, hostile branch/autosave interleavings, and replacement cleanup.

Successful activation/direct-write seams use the same coordinator or its exact activation boundary:

- AppBootGate resume;
- Save Hub continue/new game;
- revised onboarding completion;
- Settings load/manual save, branch mutation tracking, and guarded deletion;
- worker archive/prune mutation followed by coordinator persistence;
- Command Palette Quick Save routed through existing active-save autosave.

TopBar will use a pure `formatSavePersistenceSummary()` helper. At `lg` and above the summary sits inline; below `lg` it occupies a compact second shell row, allowing the exact copy to remain visible at 375px without overlaying route or sim controls. The primary status retains polite/assertive live behavior; the summary is visible text with an explicit accessible label but does not duplicate mutation announcements.

Playwright will keep requiring a newly produced transient `Saved`, also require summary depth zero, compare the durable summary across hard reload, and finish with 375x667 bounding-box/trial-interaction/screenshot proof.

Rejected alternatives:

- deriving time from `Date.now()` after a promise resolves: not the persisted record value;
- polling Dexie from TopBar: duplicate ownership and unbounded work;
- storing recency in `GameSnapshot` or Zustand: schema/local-state drift and unnecessary migration;
- reusing the transient `Saved` locator for hydrated summary: creates false-positive browser proof;
- a mutable pending counter or idle-scheduler boolean: incorrect under coalescing/retry;
- best-effort non-atomic leaderboard catch: would silently diverge a derived table instead of making the write outcome unambiguous.

Compatibility: additive runtime/UI state only; no save migration. Rollback removes the status fields/API, direct-writer reconciliation, formatter/summary, browser assertions, and atomic transaction boundary. Existing save rows remain v34 and readable.

## Milestones

| # | Checkpoint | Primary files | Proof | Status |
|---:|---|---|---|---|
| 1 | Goal/source reconciliation and baseline | goal, `SOURCE_TRUTH.md`, this plan | Docs precede production edits; 18 focused baseline tests green | Complete |
| 2 | Exact coordinator depth/time and atomic root write | `activeSavePersistence*`, `saveSystem*` | Hydration, exact returned timestamp, 3-generation coalescing, failure/retry/switch, transaction tests | Complete |
| 3 | Unify activation, direct writers, branch ownership, and deletion | AppBootGate, setup/onboarding/settings hooks, coordinator/save system, CommandPalette and tests | Fixed IDs/timestamps flow into one coordinator; main-only branch storage; retirement/replacement hostile tests | Complete |
| 4 | Responsive global summary | formatter/test, TopBar/test, `DESIGN.md` | Exact copy/pluralization/fallback/failure/a11y/responsive class tests | Complete |
| 5 | Permanent desktop/reload/mobile proof | E2E helper/spec | Fresh transient Saved + exact timestamp advance/reload; desktop + 375x667 non-occlusion evidence; no retry | Complete |
| 6 | Full gates, adversarial review, completion | all slice files, `COMPLETION.md` | Full commands green; no P0/P1; risks/rollback recorded | Complete |

## Acceptance matrix

| Requirement | Implementation location | Unit/integration proof | Browser proof | Status |
|---|---|---|---|---|
| Exact durable timestamp | save record + coordinator | returned `updatedAt` equality; intermediate completion | summary after real mutation | Complete |
| Exact logical pending depth | coordinator status | 1 and 3-generation/coalesced transitions | zero after each accepted mutation | Complete |
| Failure/retry truth | coordinator + TopBar | prior time/nonzero depth retained; retry no re-export | existing failure UI preserved | Complete |
| Ordered/latest wins | coordinator + atomic save boundary | stale completion/failure cannot regress time or clear depth | permanent journey remains green | Complete |
| Reload hydration | AppBootGate + coordinator | fixed `SaveData.updatedAt` fixture | identical summary after hard reload; transient Saved absent | Complete |
| Active-save switch isolation | setup/settings load + keyed maps | slot A pending vs slot B hydrated | same active slot after reload | Complete |
| Direct active writers current | setup/onboarding/settings/command/maintenance | each success uses coordinator/activation; branch and deletion hostile races | setup and mutation journey | Complete |
| No-op/rejected unchanged | existing shell lanes + coordinator snapshot | `AppLayoutShellAutosave` and coordinator tests | no stale mutation pass | Complete |
| Exact visible copy/a11y | formatter + TopBar | locale/timezone, singular/plural, fallback, failure | visible desktop/mobile summary | Complete |
| 375x667 non-occlusion | responsive TopBar | class/structure contract | bounds, trial controls, screenshot | Complete |
| Schema/determinism compatibility | no snapshot changes | full tests/typecheck/determinism | production PWA reload | Complete |

## Progress log

1. 2026-07-11 — Landed roadmap item 1 on main, created `codex/trust-save-indicator-2`, and authored the exact item-2 goal.
2. 2026-07-11 — Read governing docs, TRUST-A, TRUST-PLAYWRIGHT-1, live save/coordinator/shell/load source, and existing tests.
3. 2026-07-11 — Three read-only source/test/risk passes converged on returned record timestamps, logical generation gap, separate persistent/transient locators, direct-writer reconciliation, and the root save/leaderboard partial-commit hazard.
4. 2026-07-11 — Focused baseline passed 3 files / 18 tests; full starting-commit gates were already green from the immediately preceding landed slice.
5. 2026-07-11 — Wrote source truth and this living plan before production edits. No stop condition found.
6. 2026-07-11 — Added exact logical depth, committed-record timestamps, monotonic hydration/reconciliation, and atomic root-save/leaderboard writes; focused persistence tests passed.
7. 2026-07-11 — Reconciled boot/setup/onboarding/settings/maintenance writers and routed Command Palette Quick Save through the active coordinator; 11 focused files / 71 tests passed.
8. 2026-07-11 — Added the pure formatter and one responsive TopBar summary; web source and E2E TypeScript checks passed, with exact formatter/fallback/failure/a11y tests.
9. 2026-07-11 — Initial production Playwright journey passed in 2.6 minutes; adversarial review then found its timestamp-advance and desktop-locator proof too weak, so that result was superseded rather than accepted as final proof.
10. 2026-07-11 — First adversarial review blocked direct worker/onboarding/manual/maintenance writers, load activation, active deletion, and unproved transaction rollback. Moved gameplay persistence to one coordinator owner, added prepare/activate load boundaries, guarded active deletion, and added real fake-IndexedDB rollback proof.
11. 2026-07-11 — First full test attempt passed 436 files but exposed two stale mocks; both were corrected. Focused corrected matrix reached 145 green tests and worker maintenance coverage.
12. 2026-07-11 — Second adversarial review proved worker-owned branch writes used a separate module-local executor, inactive deletion could be resurrected by delayed exports, replacement leaked child branches, and guarded recovery could close without deletion. Removed worker branch mutations, added tracked main-realm metadata writes, deletion tombstones, transactional child cleanup, boolean recovery behavior, and hostile real-IDB/delayed-export tests.
13. 2026-07-11 — Pinned `corepack pnpm@9.15.4` validation passed web/E2E typecheck, 61 persistence/settings/setup/recovery tests, Settings/useWorker 10 tests, and the full 124-test worker regression file. Removed pnpm-v11-only `libc` lockfile churn.
14. 2026-07-11 — Browser retry analysis found an auto-dismiss race in the permanent helper. Replaced the locator wait with an advance-or-actionable state machine and fixed `ElementHandle`; browser re-review returned `MERGE_READY`.
15. 2026-07-11 — Final scope review found metadata success could supersede a prior failed gameplay snapshot. The tracker now refuses failed/nonzero-pending states without touching generations or Retry; the exact failure-to-metadata-to-Retry regression is green.
16. 2026-07-11 — Final persistence review required root-tree delete/replacement barriers to cover every child coordinator and fail closed when branch discovery fails. The coordinator now quiesces and tombstones the whole known tree; real IndexedDB tests prove delayed child captures cannot resurrect deleted or replaced rows.
17. 2026-07-11 — The first completed full-suite diagnostic exposed missing setup mocks and fake-IndexedDB isolation. Subsequent full runs exposed a cached Dexie dependency and then an over-broad jsdom backend. The final node-only per-file backend plus explicit no-storage unit-test guard passed the mixed storage/History regression matrix 39/39 and received `MERGE_READY` review.
18. 2026-07-11 — Final pinned root gates passed: typecheck 9/9 tasks, tests 8/8 tasks (web 439 files passed / 1 skipped; 1,584 tests passed / 2 skipped), build 5/5 tasks, and determinism 3/3 tests. `git diff --check` and changed-source randomness scans were clean; save version remains v34.
19. 2026-07-11 — Final production Playwright run passed 1/1 in 2.8 minutes with no retry. The exact summary remained `Last saved 7:42:03 PM · 0 pending writes` across hard reload, and inspected screenshots at 1280x720 and 375x667 showed one visible, non-occluding shell summary with working controls.
20. 2026-07-11 — Independent browser, persistence, scope/determinism, final-integrity, and test-harness reviews returned `MERGE_READY`; no unresolved P0/P1 remains. Completion report written.

Next: land the reviewed slice on `main`, preserve the three user-owned dirty files, then begin the next independent roadmap goal on a new branch.

Blockers: none.

## Decision log

- Treat pending depth as logical generations, not physical Dexie operations; document the distinction in UI code/tests.
- Hydration updates durable metadata while leaving transient state idle. This preserves the permanent gate's anti-stale `Saved` assertion.
- Use persisted record timestamp after every successful job, even when newer work remains pending.
- Reject epoch fallback metadata rather than presenting a fake 1970 time.
- Close root save/leaderboard partial commit atomically because the contradiction directly prevents truthful status.
- Reconcile source-confirmed direct active writers rather than claim coordinator-only recency is global.
- Keep branch storage out of the worker realm; serialize parent metadata with root autosaves and count the operation in the active coordinator.
- Block metadata work over any failed/pending gameplay generation so it cannot falsely manufacture `Saved · 0 pending writes` or destroy Retry.
- Tombstone deleted IDs until explicit activation, and delete replacement child rows transactionally, because both otherwise invalidate the visible trust claim.
- Keep active Clear All blocked; a user-facing close/deactivate workflow is adjacent roadmap work rather than an unsafe implicit deletion.
- Keep the exact long copy visible on mobile in a shell row; do not replace it with icon/color-only shorthand.

## Completion conditions

Before this slice may stop:

- all milestone-specific focused tests pass;
- permanent Playwright reload-smoke passes with exact summary/reload assertions;
- 375x667 Chromium proof shows the summary visible and non-occluding;
- root typecheck, full tests, build, and determinism pass;
- v34 and import/export/old-save coverage remain green;
- no new bare `Math.random()` or simulation-truth wall clock appears;
- final diff has no unrelated concurrent files or generated artifacts;
- adversarial persistence/determinism/test/UX review finds no unresolved P0/P1;
- `COMPLETION.md` maps requirements, files, commands, browser proof, compatibility, risks, and rollback.
