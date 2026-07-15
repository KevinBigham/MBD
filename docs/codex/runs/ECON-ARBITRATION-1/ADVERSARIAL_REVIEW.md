# ECON-ARBITRATION-1 — Adversarial Review

## Verdict

`MERGE_READY` — zero open P0, P1, or P2 findings. The review covered the final
source after the exact-save lease, branch-identity, worker-session reentrancy,
and app-shell fencing corrections. Documentation is not being used to waive a
reproducible defect.

## Review surface

- Goal, source truth, living plan, full diff, all changed source/tests, and the
  final production browser journey.
- Service authority and eligibility in
  `packages/sim-core/src/finance/contracts.ts` and
  `packages/sim-core/src/roster/offseason.ts`.
- Docket preparation/resolution, compatibility normalization, history, news,
  moments, holdouts, and worker DTOs in `apps/web/src/workers/`.
- Exact mutation authority in `workerMutationSession.ts`,
  `activeSavePersistence.ts`, `exactSaveMutationCoordinator.ts`, and
  `useExactOffseasonMutationExecutor.ts`.
- Offseason route/controller/panel, app-shell controls, lazy shell, bundle
  budget, current-v34 round trip, and production reload behavior.

## Findings fixed and rechecked

| Severity | Finding | Correction and recheck |
|---|---|---|
| P0 | An ordinary autosave accepted before arbitration admission could finish after the arbitration write and overwrite the exact post state. | Added the exact-save persistence lease: drain the accepted write, block new captures, retain exact receipt provenance, and retry only the frozen post snapshot. Active-persistence lease tests and the full web suite pass. |
| P0 | A reentrant exact worker-session finish callback could release the worker fence before durable closeout completed. | Reserve the session before the callback and retain the fence on callback failure. Reentrant and failure tests pass. |
| P1 | Ordinary save receipts could be routed to the regular-sim waiter instead of the exact offseason owner. | Split exclusive receipt/waiter state and assert receipt isolation. Persistence/session tests pass. |
| P1 | Hearing and award were initially collapsed into one phase day. | Kept day 6 as a durable hearing checkpoint and day 7 as the once-only award. Worker tests and production reload at both beats pass. |
| P1 | Accepted authority loss could return as an ordinary blocked result after the worker had already mutated. | Accepted failures now retain the captured post snapshot and fail closed with mutation/export lanes fenced until coherent recovery. Coordinator tests pass. |
| P1 | The main app-shell season control did not consume the worker/save-transition mutation fence. | AppLayout now disables the global lane while an exact transition is active; focused AppLayout tests and full web pass. |
| P1 | Fail-close cleanup released the exact worker session too early. | The session stays held after accepted persistence failure and releases atomically only with successful exact persistence closeout. Failure/retry tests pass. |
| P1 | Coordinator status briefly reported idle before asynchronous target resolution completed. | Admission publishes the transition/pause state before resolving the target; stale callback and double-click tests pass. |
| P1 | A caller-provided UI slot mirror could make a branch save appear to be its root slot. | Derive the slot mirror from the resolved exact target and use `null` for branch saves while retaining the root ownership ID. Root/branch tests pass. |
| P2 | Career-season projection could consult the stale service-years mirror. | Derive the projection from exact service days. Finance/worker tests pass. |
| P2 | Holdout copy and service timing implied a longer absence than the bounded effect. | Only adverse club wins may create the retained delay; copy and service loss resolve once at the same-offseason spring boundary. Worker, moment, and news tests pass. |
| P2 | Historical tests and controller mocks did not model the new exact executor/fence. | Updated the affected fixtures and added explicit disable/retry/rollback assertions. Focused and full web suites pass. |

## Hostile questions

- **Can the worker and UI claim different saves?** Exact target resolution owns
  save ID, root ID, and branch-safe slot projection. Publication occurs only
  inside atomic worker/persistence finish after the exact durable receipt.
- **Can an old callback mutate or publish after authority changes?** Worker
  session tokens, persistence lease tokens, save/root receipts, stale callback
  checks, and the global app-shell fence reject it.
- **Can an export from B be written to A or a branch to its root?** The exact
  receipt carries save and root provenance, and branch tests pin a null slot
  mirror plus the original save ID.
- **Can retry replay arbitration or reroll RNG?** No. The docket and outcomes
  are precomputed once, the gameplay mutation runs once, and persistence retry
  uses the retained frozen post object without another export or mutation.
- **Can re-entry duplicate history, news, ticker, moments, holdout, or award?**
  Season/player resolution receipts and persisted `resolved` docket entries
  make those emissions once-only; import/re-entry tests pass.
- **Can service eligibility drift between user and CPU clubs?** Eligibility uses
  exact days and active MLB status only; swapping `userTeamId` preserves docket,
  awards, and RNG state.
- **Can salary or contract facts contradict?** Award, annual salary, and total
  value are one-year facts floored at prior salary; the deliberate salary-floor
  negative control failed as expected and passed after restoration.
- **Can holdouts become fictional year-long absences?** No. They are retained as
  a bounded spring-reporting delay and close once in the same offseason.
- **Can the route regress lazy loading or bundle limits?** The route remains the
  existing lazy Offseason surface; bundle-budget tests and the 3,029-module PWA
  build pass without increasing a ceiling.
- **Are unrelated edits in the commit?** The branch diff contains only Goal-21
  source/tests/docs. The protected main-checkout edits are outside the worktree
  and remain unstaged.

## Negative control

The prior-salary floor was deliberately removed during the focused loop. The
regression produced a projected `$1.36M` award below a `$18.50M` prior salary and
failed the focused assertion. Correct behavior was restored; the same focused
test and final full suites pass. This proves the salary-floor guard is causal,
not a vacuous receipt.

## Scope verdict

GameSnapshot remains v34, Dexie remains v6, seeded RNG remains the only
simulation randomness, and no route, dependency, interactive filing policy,
qualifying-offer expansion, compensation-pick work, budget/revenue redesign,
trade expansion, or Day-One roster repair was introduced.
