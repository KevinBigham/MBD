# TRUST-AUTOSAVE-RECOVERY-1 Execution Plan

## Objective and player outcome

When local IndexedDB rejects an active-dynasty save, the player gets one global recovery toast, two bounded persistence-only automatic attempts, and an explicit canonical backup download after exhaustion, without replaying gameplay or weakening truthful save status. Active goal: [`docs/codex/goals/15_TRUST_AUTOSAVE_RECOVERY_1.md`](../../goals/15_TRUST_AUTOSAVE_RECOVERY_1.md).

## Live source truth

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch/worktree: `codex/autosave-failure-recovery-3` in the primary worktree.
- Starting commit: `56293093fe51e4f1dbe373e139a412a32cfd9005`.
- Starting dirty state: only the slice-owned goal is untracked; `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md` are user-owned and excluded.
- Package/runtime: `pnpm@9.15.4`, Node `>=20` (host `v24.16.0`).
- Root gates from live package files: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:determinism`, and `pnpm e2e:reload-smoke`.
- Save version: v34; no schema change is needed or allowed.
- Focused starting baseline passed 5 files / 67 tests. The identical starting commit just passed all full root gates and one clean 2.8-minute reload-smoke run.
- `SOURCE_TRUTH.md` maps the retained failed job, timer invalidation seams, Sonner/TopBar owner, canonical export/import path, explicit-download requirement, browser fault proof, and stale roadmap assumptions.

## Scope and non-goals

Allowed production areas:

- active-save coordinator recovery episode/timer/status/fallback APIs and focused tests;
- one explicit unavailable/private-browser failure category and pure recovery copy;
- one narrow browser JSON download helper and tests;
- existing TopBar/global Sonner recovery presentation and Toaster placement/config tests;
- permanent reload-smoke storage fault/download/recovery/mobile proof;
- slice goal/run docs.

Hard cut line: no checksum/self-repair, multi-tab guard, quota estimation or storage-size UI, archive pruning, write-ahead journal, unresolved-failure reload recovery, service-worker/background writer, cloud upload, schema/migration, gameplay/CPU/RNG change, route, generic toast rewrite, or duplicated persistence owner.

## Behavioral invariants

- The exact `failedJob` remains the sole retry and fallback source. Neither path calls the worker exporter or gameplay action.
- One unresolved storage episode has at most two automatic attempts, after 1,000ms then 3,000ms. Fake timers own the proof; no interval/polling loop exists.
- Quota, unavailable/private/security, IndexedDB/transaction, and generic storage failures are eligible. Export-before-capture failures have no retained snapshot and receive neither auto retry nor fallback.
- A newer captured full snapshot supersedes the payload but retains the episode's consumed-attempt budget. It cannot create a retry storm.
- Timer identity includes the save state, job generation, and recovery epoch. Load/switch, barriers, delete, replacement, activation, reset, manual Retry, and success invalidate obsolete callbacks.
- Automatic/manual retry is persistence only. A retry failure is consumed by the recovery owner rather than becoming an unhandled UI promise.
- Scheduling/retrying/fallback creation never advances durable time, reduces pending depth, or displays `Saved`.
- First durable success uses the exact returned record time, reaches the correct depth, cancels every obsolete callback, and produces one finite recovered toast.
- Backup JSON passes the real import parser with canonical equality. Its deterministic filename uses save identity/generation, not random or simulation truth.
- `Download backup` is an explicit, repeatable user action. A successful click means a backup download was requested, not that local durability recovered.
- Download/generation failure retains the original failure evidence, failed job, pending depth, Retry, and repeatable fallback action.
- TopBar remains the assertive save-failure announcer; the stable Sonner toast announces distinct recovery progress/actions without duplicate stacking.
- A rejected/no-op action creates no episode/timer/toast/fallback.
- v34, old/deep saves, import/export, PWA, deterministic simulation, and CPU fairness remain unchanged.

## Design decision

Extend each existing `SaveCoordinatorState` with a recovery episode, one timeout handle, and recovery epoch. Expose a nested runtime recovery status (`scheduled`, `retrying`, `fallback_ready`, `recovered`) while leaving the base persistence states unchanged. A failure starts or updates one episode; automatic attempts consume a fixed budget; a newer snapshot replaces only the payload; durable success or explicit lifecycle retirement ends the episode.

Add a narrow synchronous coordinator fallback function that validates and serializes `failedJob.snapshot` through the canonical save export function only when fallback is ready. It returns payload/filename/identity without mutating durability. A small browser helper performs Blob/object-URL/link click under the toast action and always revokes the URL. It reports unsupported/throwing browser behavior so the toast can remain honest.

TopBar remains the active-save status/recovery owner and updates one stable Sonner toast ID per save. The existing global Toaster is repositioned/offset only as required to clear fixed desktop/mobile shell surfaces. Manual Retry remains in the assertive TopBar chip; its rejected promise is handled. Export fallback remains repeatable after a request.

The permanent serial Playwright journey injects only a low-level storage fault and reuses its real development mutation. It proves two timed retries, exhaustion, no later retry, canonical download containing the exact mutation, unchanged unresolved status after download, responsive toast geometry, restored manual durability, and reload survival before continuing the other three lanes.

Rejected alternatives:

- a route-local retry hook or second queue: duplicates ownership and loses switch/delete barriers;
- resetting attempts for every newer snapshot: permits an unbounded retry storm during one outage;
- auto-downloading from a timer: browser policy may reject it and the UI cannot truthfully claim success;
- fresh `worker.exportSnapshot()` for fallback: can capture a different state and violates retry-without-rerun ownership;
- corrupt-load raw recovery JSON: not the canonical import format;
- persisting recovery metadata in v34: unnecessary schema churn and would trespass into journaling;
- skipping retries for quota/private failures: contradicts the roadmap's named failure cases; the two-attempt cap bounds cost.

Compatibility: runtime/UI-only state and a canonical export consumer. Rollback removes the episode/timer/fallback API, toast effect, helper, and E2E fault assertions; existing v34 rows remain unchanged.

## Milestones

| # | Checkpoint | Primary files | Proof | Status |
|---:|---|---|---|---|
| 1 | Goal/source reconciliation and baseline | goal, `SOURCE_TRUTH.md`, this plan | Source docs precede production edits; 67 focused tests green | Complete |
| 2 | Bounded coordinator recovery and exact fallback | `activeSavePersistence*`, `saveSystem*` | fake-timer attempts/exhaustion; exact job/no re-export; all invalidation races; canonical round trip | Complete |
| 3 | Global toast and explicit download | TopBar/helper/App + tests | stable action toast, honest errors/recovered copy, manual Retry catch, mobile-safe Toaster | Complete |
| 4 | Permanent storage-failure/reload proof | E2E helper/spec | exact attempt cap, downloaded mutation, unresolved truth, desktop/mobile bounds, restored durability/reload | Complete |
| 5 | Full gates, adversarial review, completion | all slice files, `COMPLETION.md` | full commands green; no P0/P1; risks/rollback recorded | Complete |

## Acceptance matrix

| Requirement | Implementation location | Unit/integration proof | Browser proof | Status |
|---|---|---|---|---|
| Exact retained snapshot only | coordinator failed job/fallback | exporter called once; retry/download exact job | downloaded player/program | Complete |
| Bounded automatic retry | coordinator episode/timer | 1s + 3s attempts, then no more | low-level write count capped | Complete |
| Newer/latest ordering | coordinator generation/episode | newer payload, same budget, stale callback inert | latest visible consequence | Complete |
| Manual Retry interop | coordinator + TopBar | scheduled timer canceled; rejection handled; success exact | restore storage and click Retry | Complete |
| Switch/load cancellation | activation boundary | A timer inert after B activation | active toast cleanup | Complete |
| Delete/replace cancellation | tree barriers/tombstones | timers cannot recreate rows | existing real-IDB reload stays green | Complete |
| Exact durable recency/depth | existing status + recovery | failure/retry/fallback unchanged; success exact record | raw ISO/depth before/after | Complete |
| Canonical export fallback | coordinator + saveSystem | real import equality, v34, deterministic filename | actual `.json` download parses | Complete |
| Fallback is not durability | coordinator + toast | backup leaves failed job/time/depth/Retry | unchanged shell after download | Complete |
| Distinct failure evidence | classifier + pure copy | quota/unavailable/indexeddb/storage/export matrix | quota copy and action | Complete |
| Global accessible toast | TopBar + Sonner | stable ID, progress/action/recovered/error, cleanup | keyboard action and visible toast | Complete |
| 375x667 non-occlusion | Toaster config | placement contract | bounds/trial controls/screenshots | Complete |
| No-op/rejected unchanged | existing coordinator callers | no episode/timer/fallback | no stale acceptance | Complete |
| Schema/determinism compatibility | no snapshot change | full migrations/import/export/determinism | production PWA reload | Complete |

## Progress log

1. 2026-07-11 — Landed roadmap item 2 on `main` at `5629309`, created `codex/autosave-failure-recovery-3`, and authored the exact item-3 goal.
2. 2026-07-11 — Read governing instructions and TRUST-A/item-1/item-2 goals/completions; recorded live Git/package/save-version state.
3. 2026-07-11 — Three read-only coordinator, toast/export, and browser/race passes found no stop condition. They converged on coordinator-owned timers, a stable global Sonner action toast, explicit canonical download, and reuse of the development E2E lane.
4. 2026-07-11 — Focused baseline passed 5 files / 67 tests. Starting commit's full gates and clean browser run are green.
5. 2026-07-11 — Wrote source truth and this living plan before production edits. Next: bounded coordinator recovery/fallback tests and implementation.
6. 2026-07-11 — Added one coordinator-owned recovery episode per save, deterministic 1s/3s persistence-only retries, exact retained-snapshot fallback, lifecycle invalidation, manual override, and unavailable/private-browser classification. Coordinator/helper/UI focused suites pass 5 files / 49 tests; web and E2E TypeScript pass.
7. 2026-07-11 — Added one stable global Sonner recovery toast, explicit repeatable browser download, dark-theme contrast, responsive failure-status flow, and mobile offset that clears both the reserved header row and protruding close control.
8. 2026-07-11 — The first complete Chromium journey passed and exposed two final presentation defects during visual review: the mobile toast close control crowded the reserved failure row, and Sonner's shallow option merge could retain the fallback action after recovery. The Toaster offset/theme and explicit action clearing were corrected and covered by focused tests.
9. 2026-07-11 — Three adversarial review passes challenged persistence/race ownership, browser/UX behavior, and scope/determinism. Their liveness, active-owner, initiating-evidence, stale-action, E2E-ordering, and negative-path findings were fixed with hostile regression tests. Final review found no unresolved P0/P1.
10. 2026-07-11 — Final focused regression passed 12 files / 128 tests. Root typecheck (9/9), full tests (8/8; web 1,608 passed / 2 skipped), build (5/5; PWA 157 entries), and determinism (3/3) passed.
11. 2026-07-11 — Final authoritative Chromium journey passed 1/1 in 3.0m. It observed exactly three blocked save puts and no fourth, parsed the actual v34 canonical download for the exact player/program, preserved unresolved recency/depth after backup, restored storage through manual Retry, hard-reloaded the consequence, and completed the original trade/press/draft trust lanes. Desktop and 375x667 recovery/final screenshots were inspected with readable dark-theme copy and no shell/action occlusion.

Blockers: none.

## Decision log

- Keep `indexeddb` as the established transaction/database category; add `unavailable` for security/private/disabled storage.
- Run two automatic attempts for all retained storage-family failures because quota/private browsing are explicit roadmap examples; cap the sequence at 1s/3s.
- Preserve attempt budget across newer jobs in one outage episode.
- Require explicit download gesture and keep local failure/Retry visible afterward.
- Reuse canonical save export/import; do not reuse corrupt-load raw JSON or route-level fresh exports.
- Keep recovery runtime-only; reload only after local durability is restored.
- Use one stable toast per save and distinct recovery wording to avoid duplicate live-region announcements.

## Completion conditions

Before this slice may stop:

- every milestone-specific focused test passes;
- permanent Playwright proves failure -> bounded retries -> canonical backup -> unchanged unresolved truth -> restored durability -> hard reload;
- desktop and 375x667 screenshots show toast, summary, Retry, and controls visible/non-occluding;
- root typecheck, full tests, build, determinism, and permanent reload-smoke pass;
- v34, old/deep saves, canonical import/export, item-2 ordering/tree barriers, and PWA remain green;
- no new bare `Math.random()` or simulation-truth wall clock/UUID;
- final diff excludes the three user-owned files and generated artifacts;
- adversarial persistence/determinism/browser/UX review finds no unresolved P0/P1;
- `COMPLETION.md` maps requirements, files, commands, browser proof, compatibility, risks, and rollback.
