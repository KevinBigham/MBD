# TRUST-AUTOSAVE-RECOVERY-1 Completion

Status: complete and review-ready. No goal stop condition remains. No unresolved P0 or P1 finding remains.

Completed: 2026-07-11 05:15 CDT

## Outcome

Roadmap item 3 now turns a retained active-dynasty local-save failure into one truthful global recovery loop:

`failed write -> retry after 1s -> retry after 3s -> Download backup -> manual Retry -> durable recovery`

Both automatic attempts persist the coordinator's exact retained canonical snapshot. They never replay gameplay and never export newer worker state. One outage episode owns one fixed two-attempt budget even when a newer accepted snapshot supersedes its payload, so continued play cannot create a retry storm.

After exhaustion, the global toast offers an explicit, repeatable `Download backup` action. The JSON is produced through the existing canonical v34 export contract, imports through the real parser with canonical equality, and uses a deterministic save/generation filename. Requesting the download is deliberately not local-save success: the prior durable time, nonzero pending depth, `Save failed` status, retained evidence, and manual `Retry` remain unchanged.

The first later durable success advances recency from the exact committed record, reaches zero pending writes when current, cancels obsolete timers/actions, and shows finite recovered copy. Save activation, load, delete, replacement, reset, manual Retry, and durable success invalidate stale callbacks. Export-before-capture failures have no retained snapshot, so they cannot fabricate a retry or backup.

The recovery toast is globally visible and keyboard operable, uses one stable identity per save, distinguishes quota/unavailable/IndexedDB/storage evidence, and clears its fallback action on recovery. Desktop and 375x667 layouts keep the toast, failure status, persistence summary, shell controls, route controls, and assistant surfaces non-overlapping.

Save schema remains v34. No migration, simulation rule, CPU policy, seeded-RNG stream, route, runtime dependency, or gameplay contract changed.

## Requirement Mapping

| Goal requirement | Result and evidence |
|---|---|
| Exact retained snapshot only | Recovery owns the existing failed coordinator job. Automatic/manual retry and fallback consume its snapshot/save identity/generation; hostile tests prove the worker exporter is not rerun. |
| Exactly two bounded automatic attempts | One 1,000ms timer and one 3,000ms timer are controlled under fake timers. Tests prove exhaustion, no later callback, and no attempt-budget reset when a newer snapshot arrives. The browser observes three blocked puts total: initial write plus two retries. |
| Persistence-only recovery | Retry calls the ordered persistence path only. The permanent journey proves one public development mutation remains singular while retries fail, backup is created, storage is restored, and the same consequence survives reload. |
| Latest state and ordering | Newer capture replaces the retained payload without resetting the episode. Epoch/generation checks make delayed export completion, stale timer callbacks, and obsolete saves inert. |
| Save lifecycle safety | Explicit active-owner activation plus load/switch, delete, replace, reset, and root-tree barriers invalidate old recovery authority. Tests cover delayed capture/export and exhausted-fallback races. |
| Truthful recency and depth | Schedule, retry, exhaustion, backup generation, and download do not change durable time or logical depth. Exact committed `updatedAt` and zero depth appear only after the current retained job is accepted. |
| Canonical export fallback | `createActiveSavePersistenceBackup()` parses the exact retained snapshot and delegates to canonical export. Unit tests import generation-2 output through the real parser and compare canonical equality; Chromium downloads and parses the actual `.json`. |
| Backup is not durability | Backup generation and browser click are side-effect-free with respect to coordinator durability. Unit and browser assertions preserve failure, prior timestamp, pending depth, and Retry after download. |
| Honest failure evidence | Initial quota/unavailable/IndexedDB/storage classification remains immutable through heterogeneous automatic or manual failures. Export-generation and browser-download errors add fallback-specific copy without erasing the local failure. |
| Global accessible presentation | One stable Sonner toast ID represents meaningful transitions. The fallback action is keyboard activated; retry/recovered updates explicitly clear stale shallow-merged actions; TopBar remains the assertive failure announcer. |
| Manual Retry interop | Manual Retry cancels scheduled work, performs persistence only, consumes rejection without an unhandled promise, falls back immediately when it fails, and retires all recovery work when it succeeds. |
| No-op/export-before-capture unchanged | With no retained failed job there is no recovery episode, timer, toast, or backup. Delayed rejected export liveness is tested without manufacturing a generation. |
| Desktop/mobile non-occlusion | Playwright asserts bounding boxes and trial interactions at 1280x720 and 375x667, then attaches recovery and final screenshots. All four final images were visually inspected. |
| Schema/determinism compatibility | `CURRENT_GAME_SNAPSHOT_VERSION` remains 34. Full tests, canonical import/export coverage, production/PWA build, deterministic verification, and hard reload pass; changed production source adds no unseeded randomness or simulation-truth clock/UUID. |

## Changed Files

Persistence coordinator and canonical fallback:

- `apps/web/src/shared/lib/activeSavePersistence.ts`
- `apps/web/src/shared/lib/activeSavePersistence.test.ts`
- `apps/web/src/shared/lib/browserDownload.ts`
- `apps/web/src/shared/lib/browserDownload.test.ts`

Global shell and recovery presentation:

- `apps/web/src/app/layout/activeSaveRecoveryToast.ts`
- `apps/web/src/app/layout/activeSaveRecoveryToast.test.tsx`
- `apps/web/src/app/layout/TopBar.tsx`
- `apps/web/src/app/layout/TopBar.test.tsx`
- `apps/web/src/app/App.tsx`
- `apps/web/src/app/App.test.tsx`

Permanent browser proof:

- `apps/web/e2e/helpers/dynasty.ts`
- `apps/web/e2e/reload-smoke.spec.ts`

Goal and run evidence:

- `docs/codex/goals/15_TRUST_AUTOSAVE_RECOVERY_1.md`
- `docs/codex/runs/TRUST-AUTOSAVE-RECOVERY-1/SOURCE_TRUTH.md`
- `docs/codex/runs/TRUST-AUTOSAVE-RECOVERY-1/PLAN.md`
- `docs/codex/runs/TRUST-AUTOSAVE-RECOVERY-1/COMPLETION.md`

No package manifest or lockfile changed, and no production dependency was added.

## Verification

| Command/check | Observed result |
|---|---|
| Starting focused baseline | 5 files / 67 tests passed before production edits. |
| Final focused persistence/UI/storage regression | 12 files / 128 tests passed, including 34 coordinator, 8 toast, 8 TopBar, 4 App, 3 download-helper, save-system transaction, boot, settings, setup, and layout tests. |
| `pnpm typecheck` | 9/9 workspace tasks successful; the fresh web task included source and E2E TypeScript. |
| `pnpm test` | 8/8 workspace tasks successful. Web: 441 files passed / 1 skipped; 1,608 tests passed / 2 skipped in 4m28.062s. |
| `pnpm build` | 5/5 workspace tasks successful. Web transformed 3,013 modules; PWA generated 157 precache entries. |
| `pnpm verify:determinism` | 1 file, 3/3 tests passed. |
| `pnpm e2e:reload-smoke` | Fresh production build and 1/1 Chromium journey passed in 3.0 minutes. Build transformed 3,013 modules in 7.10s and PWA generated 157 entries. |
| Desktop recovery inspection | `autosave-recovery-desktop.png`, 1280x720: dark readable toast below the shell, inline failure/Retry, summary, News, command, settings, route content, assistant, and simulation controls remain visible and non-overlapping. |
| Mobile recovery inspection | `autosave-recovery-mobile.png`, 375x667: reserved full-width failure row remains clear; toast begins below it, close/action controls are usable, dark copy is readable, and bottom navigation/simulation controls remain available. |
| Final desktop/mobile inspection | `save-persistence-summary-desktop.png` and `save-persistence-summary-mobile.png`: zero-depth summary survives hard reload; no obsolete fallback action/toast remains; draft and shell controls remain usable. |
| Changed-source randomness scan | No added `Math.random()`, `crypto.randomUUID()`, or simulation-truth wall-clock use. |
| Save/version/dependency inspection | v34 unchanged; no schema, package, lockfile, gameplay, or CPU-policy diff. |
| `git diff --check` | Passed. |
| Generated-artifact check | Playwright report/results and production `dist` remain ignored/untracked. |

The final full web run emitted only established warning classes and no test failed. Diagnostic browser iterations were not counted as passes: they exposed paused-timer incompatibility with Sonner, mobile row crowding, later-journey fake-clock contamination, and stale shallow-merged toast actions. Each defect was corrected at its owning seam before the final clean run.

## Browser Proof

The permanent serial trust journey still creates gameplay only through visible public controls. For this slice it:

1. installs a low-level `IDBObjectStore.put` fault limited to the `mbd-saves` database and `saves` store, initially disabled;
2. enables the fault immediately before a real development-plan mutation and verifies the visible player consequence;
3. observes the initial quota failure and the two scheduled persistence-only retries, with exactly three blocked writes and no later fourth attempt;
4. requires the global fallback toast and keyboard-activates `Download backup`;
5. parses the actual browser download, requires deterministic `.json` naming, v34 kind/schema, the exact player ID, and the normalized selected development program;
6. proves backup download leaves the prior raw durable ISO, one pending write, failure evidence, and manual Retry unchanged while keeping repeat download available;
7. disables only the storage fault, fixes save metadata time to `2026-04-02T19:41:02.000Z`, and uses the visible Retry action;
8. requires exact committed time, zero pending writes, recovered copy, no stale Download action, four total puts / three blocked puts;
9. hard reloads and requires the exact development consequence and durable summary; and
10. completes the original trade, press, and draft mutation/reload lanes.

The helper never injects gameplay or persisted state. The only fault is the browser storage boundary being tested.

## Adversarial Review

Three independent read-only reviews challenged persistence/race ownership, browser/UX behavior, and scope/determinism. Findings fixed before final gates included:

- a scheduled retry could lose liveness when a newer capture's export rejected;
- a retained episode could stall when a successful export was invalidated by a released load/barrier;
- stale save-A snapshot/metadata calls could reclaim recovery ownership after save B was explicitly activated;
- heterogeneous later failures could overwrite the initiating quota/unavailable evidence;
- Sonner's shallow option merge could leave `Download backup` actionable after recovery;
- the first retry transition could occur before a sequential E2E assertion armed;
- failure-copy and export/download negative paths needed direct coverage; and
- an exhausted valid fallback needed explicit switch-activation invalidation proof.

All findings received focused hostile tests. Final persistence review returned `MERGE_READY`; final UX/browser review found no P0-P2 source defect; scope/determinism review found no schema, simulation, CPU-fairness, dependency, or cut-line violation.

P0 findings: none. Unresolved P1 findings: none.

## Compatibility, Risks, and Rollback

Compatibility:

- Save schema remains v34; there is no migration, fixture rewrite, or stored recovery metadata.
- Existing old/deep-save migrations, canonical import/export, storage transactions/tree barriers, production PWA, item-1 trust journey, item-2 exact summary, and hard reload remain green.
- Recovery timers and deterministic filenames are UI/save-orchestration metadata only. Simulation truth and deterministic event IDs are unchanged.
- CPU organizations, scouting truth, ratings, budgets, choices, and fairness are unchanged.

Residual risks and adjacent work:

- Recovery state is intentionally runtime-only. Reloading before local durability is restored cannot resurrect an in-memory failed snapshot; durable journaling is a later roadmap item and outside this goal.
- A browser download click proves that the browser accepted the download request, not that the operating system permanently retained the file. The repeatable action and unchanged local-failure state keep that boundary honest.
- The permanent journey uses real short retry timers to prove browser integration; fake-timer unit tests own exact scheduling and cancellation edge cases.
- Checksums/self-repair, multi-tab coordination, quota estimation, storage-size UI, archive pruning, write-ahead journaling, pending-day replay, service-worker ownership, and cloud upload remain separate roadmap goals.

Rollback:

1. Revert the coordinator recovery episode/status/timer and exact-backup API together, restoring the existing retained manual-Retry job.
2. Remove the global recovery toast hook, browser download helper, Toaster placement changes, and responsive failure-row adjustments.
3. Remove the IndexedDB fault helper and recovery/download assertions from the permanent journey while retaining its original four mutation/reload lanes.
4. No persisted data rollback or migration is required because snapshot shape and version never changed.

Unrelated dirty files present throughout the run—`.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`—were preserved and are not claimed or included in this slice.

Roadmap item 4 is the next independent slice.
