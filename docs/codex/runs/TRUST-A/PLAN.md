# TRUST-A Execution Plan

## Objective and player outcome

Existing high-emotion actions in `docs/codex/goals/01_TRUST_A.md` only report saved after the exact accepted post-mutation snapshot is durable, and those results survive a hard reload.

## Live source truth

- Root: `/Users/tkevinbigham/Downloads/MBD-main`
- Branch: `codex/mbd-ui-ux-ootp-overhaul`, ahead 1 / behind 25
- Dirty state: pre-existing user work is present and must be preserved.
- Package manager: `pnpm@9.15.4`
- Save version: v34; no schema change planned.
- Baseline: targeted web persistence/lane tests passed, 44 tests.
- Current gaps: no coordinator, no global save status, missing trade offer/multi-team persistence, duplicate News persistence, shell no-op autosaves, no active-save race test, no browser reload harness.

## Scope and non-goals

- Allowed production areas: shared web save persistence, app shell save-status UI, active-save autosave hook, News/Trade persistence hooks, and source-confirmed TRUST-A route handlers.
- Hard cut line: no save schema field, migration, new save engine, service-worker writer, server dependency, CRDT/vector clock, CPU identity, event ledger, prospect feature, new route, or broad worker decomposition.
- Deferred: fully automated browser harness if browser proof can be completed manually through available tooling.

## Behavioral invariants

- Accepted mutation -> one exact post-mutation full snapshot -> intended active save ID -> ordered durable write -> truthful status.
- Rejected/no-op mutation does not create dirty/saving state.
- Retry persists the latest captured failed snapshot and never reruns the gameplay mutation.
- Later captured full snapshots supersede earlier failed retry candidates for the same save.
- Active-save switches cannot write an older snapshot into the newly active slot.
- `Saved` means the latest desired generation for that save is durable.

## Design decision

Add a runtime-only main-thread coordinator around the existing worker snapshot export and Dexie write path. The coordinator will own desired/durable generation counters, latest captured snapshot, per-save ordered writes, retry state, and subscribed status. This fits live source because the current shared helper already has access to active save metadata and `exportSnapshot()`, while schema and worker internals do not need changes.

Rejected alternatives: persisted `revision` in `GameSnapshot`, mandatory feature flag, broad worker proxy persistence, new storage engine, or route-by-route duplicate status handling.

Migration/compatibility: no schema bump, no migration, no fixture shape change. Existing v34 and v33 Season 10 migration fixtures remain authoritative compatibility proof.

## Milestones

| # | Checkpoint | Files | Proof command/test | Status |
|---:|---|---|---|---|
| 1 | Source docs | `docs/codex/runs/TRUST-A/SOURCE_TRUTH.md`, `PLAN.md` | Docs written before production edits | Complete |
| 2 | Coordinator tests | shared persistence tests | `activeSavePersistence.test.ts` covers ordered writes, retry, failure, ownership, active-save switch | Complete |
| 3 | Coordinator implementation | shared persistence module/hook | Coordinator tests pass | Complete |
| 4 | Shell status UI | app shell/top bar tests and component | `TopBar.test.tsx` passes; browser failure retry was clickable after P1 fix | Complete |
| 5 | Lane routing | News, Trade, shell no-op handling | Targeted lane suite passes with 116 tests | Complete |
| 6 | Acceptance gates | targeted/full tests, build, determinism, browser proof | Commands/results recorded in `COMPLETION.md` | Complete |
| 7 | Review and completion | self-review + `COMPLETION.md` | P0/P1 findings fixed; no unresolved stop condition | Complete |

## Acceptance matrix

| Requirement | Implementation | Unit | Integration | Browser/soak | Status |
|---|---|---|---|---|---|
| Exact snapshot bound to intended save | Coordinator captures save id/slot metadata and one exported snapshot per accepted call | Coordinator root/branch/active-switch tests | News/Trade/AppLayout tests updated | News and press reload proof | Complete |
| Ordered writes/latest wins | Per-save ordered coordinator queue with desired/durable generations | Burst write and superseded promise tests | Active-save switch race test | Covered by browser retry/reload plus unit burst proof | Complete |
| Retry without rerun | Coordinator retry writes retained failed snapshot only | Retry-without-reexport test | Failure path keeps route mutation from rerunning | IndexedDB failure/retry proof on desktop and mobile | Complete |
| No-op/rejected no dirty state | Route success gating and coordinator no-active no-op | No active save/no-op tests | Shell/trade/draft/minors/news regressions | Rejected cases covered in Vitest | Complete |
| Truthful status | Coordinator subscription and shell UI with retry | Status tests | App shell tests | Save failed never became Saved while IndexedDB was blocked | Complete |
| Required lanes persist | Route handlers use coordinator or active-save autosave | Lane tests | Worker snapshot/regression tests | News and press high-emotion reload proof | Complete |
| Old saves/import/export compatible | No schema change | Existing migration/import tests | Existing snapshot tests | Contracts migration and full test gates | Complete |

## Progress log

- Source pass: read AGENTS, PLANS, canonical direction, goal, handoff curation, live source, tests, and package scripts.
- Baseline: targeted web persistence/lane tests passed with 44 tests.
- Subagents: source mapper, test mapper, and risk reviewer completed read-only analysis.
- Coordinator: added runtime-only active-save persistence coordinator and tests for root/branch ownership, ordered writes, supersession, retry, failure classification, and active-save switch.
- Status UI: added compact shell `Saving...` / `Saved` / `Save failed` status with retry and `aria-live`.
- Lanes: routed active-save autosave, News, Trade, and shell handlers through the coordinator; added missing incoming trade and multi-team persistence; gated shell no-op autosaves.
- Press response: guarded answered same-day interactive press conferences using existing persisted story flags so a saved answer does not replay after reload.
- Review: fixed P1 retry occlusion by making failed save status fixed above shell modals; fixed P1 press replay after reload by suppressing already-answered prompts.
- Verification: targeted suite passed 16 files / 116 tests; root full test passed with web 1529 passed / 1 skipped, sim-core 1643, contracts 22, ui 1; typecheck, build, determinism, Math.random scan, and browser proof completed.

## Decision log

- Use `PLANS.md` at repo root; no `docs/codex/PLANS.md` exists.
- Treat proposed handoff starter code as reference-only.
- Keep generations runtime-only; no save schema change.
- Preserve dirty TRUST-adjacent files and build on them only where required.
- Root slot writes now use `saveGameById` with explicit root metadata instead of the legacy global `scheduleAutoSave` queue, because the coordinator needs per-save ordering and generation ownership.
- `lastSavedAt` is runtime shell-status metadata only; it is not written into `GameSnapshot`.
- Existing press story flags are sufficient to identify an answered same-day interactive press prompt without schema changes.

## Review-block remediation (2026-06-20)

A review of the first pass raised three blocking findings. All were resolved without expanding scope beyond `docs/codex/goals/01_TRUST_A.md`.

| # | Finding | Resolution | Files | Regression test |
|---:|---|---|---|---|
| P1-1 | Lost mutations on refresh failure: draft signing, minors development-plan apply, and accepted multi-team trades persisted the post-mutation snapshot **after** the UI route refresh, so a refresh rejection dropped the durable write. | Reordered each handler to persist the accepted worker mutation **immediately, before any UI refresh**. The display-only refresh in the minors and multi-team lanes is now isolated so a refresh rejection cannot crash the lane or hide the durable snapshot. | `useDraftActionHandlers.ts`, `MinorsPage.tsx`, `useTradeMultiTeamBuilder.ts` | "persists … before the … refresh, even when the refresh rejects" added to each lane's test |
| P1-2 | Incomplete browser proof: only News/mobile were proven across a hard reload. | Produced action → Saved → hard-reload proof for every touched high-emotion lane: development-plan apply, draft signing, multi-team trade execution, and roster persistence, plus a storage-failure/retry path. Recorded in `COMPLETION.md`. | n/a | n/a (live browser proof) |
| P2 | Storage-specific failure copy missing: TopBar showed a generic "Save failed" for every failure kind. | Extended the coordinator's failure classification to distinct `quota` / `indexeddb` / `storage` / `export` kinds and rendered distinct, `aria-live` copy with Retry in TopBar, plus the raw error via `title`. | `activeSavePersistence.ts`, `TopBar.tsx` | coordinator classification test + TopBar "maps each storage failure kind to distinct, accessible copy" test |

Scope discipline: no save schema change, migration, new route, new engine, or worker decomposition was added. The draft-lane reorder was also applied to the scout and big-board handlers because they share the same persist-after-refresh defect in the same file/lane.

## Completion conditions

- Targeted coordinator and lane tests pass: met.
- Existing migration/import/export and deterministic tests pass: met through contracts migration, worker snapshot/full test, and determinism gates.
- Root typecheck, test, build, and determinism gates are run and recorded: met.
- Browser reload success/failure/retry proof is recorded: met through desktop News and mobile press/sim proof.
- Adversarial self-review has no unresolved P0/P1: met.
