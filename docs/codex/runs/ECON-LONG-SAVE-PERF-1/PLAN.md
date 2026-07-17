# ECON-LONG-SAVE-PERF-1 Execution Plan

## Objective and player outcome

Long saves complete the exact Goal-18 economy proof within its existing
40-minute gate because the canonical simulation does less redundant work while
producing identical state, RNG, history, and receipts.

Goal: `docs/codex/goals/29_ECON_LONG_SAVE_PERF_1.md`.

## Live source truth

See `SOURCE_TRUTH.md`. The slice starts from `main@8e24909`; GameSnapshot is v35,
Dexie is v6, and the unfinished Goal-18 branch remains isolated. Baseline source
mapping, tests, and profiling evidence are pending and will be appended here
before production optimization.

## Scope and non-goals

Owned initially:

- Goal/run/status documentation;
- opt-in test-only timing/checkpoint helpers proven outside persisted state and
  public worker contracts;
- only the production hot paths frozen after measurement;
- focused exactness/performance tests and receipts.

Hard cut: no mechanics skipped/reordered/approximated; no RNG, state, schema,
history retention, automatic pruning, receipt, validation, calibration, UI,
route, dependency, public worker API, item-19, broad item-98, push, deploy, tag,
or release change.

## Behavioral invariants

1. Worker state remains canonical; profiling is observation only.
2. Same deterministic input produces identical complete state and RNG.
3. All 32 organizations, players, games, affiliates, phases, facts, and market
   outcomes execute in the same order.
4. GameSnapshot remains v35 and old-save facts remain unchanged.
5. Goal-18 rows, checkpoints, replay, validators, bands, and 40-minute gate are
   unchanged.
6. No automatic archive/prune action or history loss.
7. User/CPU semantics remain symmetric and difficulty-neutral.
8. Main-worktree user edits remain untouched and unstaged.

## Design decision

Use observation-first optimization:

1. add out-of-band timing with disabled no-op semantics;
2. compose that instrumentation with the Goal-18 WIP only on a temporary
   diagnostic branch;
3. capture one hash-bound season-15 v35 checkpoint and rank canonical stages;
4. freeze exact production paths and gates;
5. allow one Terra writer at most two semantics-neutral correction loops;
6. prove exactness, land the prerequisite independently, then integrate and run
   Goal 18 seed 7111 once.

Rejected: timeout increase; split receipt processes; pruning/history truncation;
shorter horizon; synthetic-only benchmark; optimizing plausible seams before
measurement; landing Goal-18 WIP with the prerequisite.

Migration: none. Rollback: revert the prerequisite commit; snapshots remain v35.

## Milestones

1. **Preflight/docs** — goal, source truth, plan, authorization/status; prove
   with scoped diff and `git diff --check`.
2. **Read-only architecture/profile freeze preparation** — source, tests, and
   risks mapped by three read-only reviewers; coordinator synthesizes exact
   instrumentation contract.
3. **Profiler/checkpoint instrumentation** — opt-in test-only observer plus unit
   exactness/fail-closed tests; focused Vitest and web typecheck.
4. **Baseline evidence** — temporary Goal-18 integration, one exact season-15
   artifact, ranked stage receipt, and frozen production file scope.
5. **Production optimization** — one writer, at most two correction loops, tests
   beside each measured change.
6. **Source freeze** — identical stage comparison, horizon-2 exact reference,
   focused matrix, typecheck, full tests, build/PWA, determinism.
7. **Final review/closeout** — zero P0–P2, completion report, changelog/status,
   exact staging, commit, local main fast-forward.
8. **Goal-18 resumption** — integrate onto Goal-18 branch and run exactly the
   seed-7111 diagnostic under the original external 40-minute gate.

## Acceptance matrix

| Requirement | Artifact | Proof | Status |
| --- | --- | --- | --- |
| Out-of-band stable stage profiler | pending source freeze | focused unit/worker exactness | Pending |
| No state/RNG/save/receipt impact | pending | exact exports and digests | Pending |
| Exact season-15 checkpoint | local artifact + hash receipt | capture/reload and hostile mismatch tests | Pending |
| Measured hot-path freeze | architecture gate | identical checkpoint stage report | Pending |
| Semantics-neutral optimization | pending measured files | focused before/after exactness | Pending |
| Horizon-2 exact preservation | Goal-18 integration receipt | byte-identical rows/digests, <90s | Pending |
| Repository gates | command receipts | typecheck/test/build/determinism | Pending |
| Final review | review artifact | zero actionable P0–P2 | Pending |
| Goal-18 seed 7111 <40m | full diagnostic receipt | exact validator pass | Pending |
| Independent landing | Git receipts | prerequisite commit on local main only | Pending |

## Progress log

1. 2026-07-16 — Kevin authorized Option A from the Goal-18 runtime oracle
   request. Goal-18 authorization artifacts were updated and committed on its
   isolated branch at `2ac8287`.
2. 2026-07-16 — Created `codex/econ-long-save-perf-1` from clean
   `main@8e24909`. Main's three unrelated dirty files remain isolated.
3. 2026-07-16 — Offline frozen dependency setup passed. Clean-main web
   typecheck passed; focused worker baseline passed 3 files / 12 tests with one
   env-gated skip in `172.51s`.
4. 2026-07-16 — Three read-only maps completed with no edits. Sol verdict is
   `MAP_READY_INSTRUMENTATION_ONLY`; production optimization remains blocked
   until checkpointed baseline profiling freezes measured files/functions.

## Decision log

1. Use Goal 29 for this prerequisite; Goal 28 remains the dependent soak.
2. Honor manifest `pnpm@9.15.4` with `corepack pnpm`; ambient pnpm is 11.9.0.
3. Do not assign numeric micro-bands before real profiling. The unchanged
   Goal-18 40-minute run is the final acceptance gate.
4. A temporary composition branch may collect the authorized checkpoint without
   landing or rewriting Goal-18 WIP.
5. Separate immutable checkpoint producer revision/tree from explicit per-run
   consumer revision/tree. Exact semantic/context digests, not revision equality,
   admit a consumer.
6. Use a dedicated internal observer rather than persisted/public performance
   diagnostics.

## Completion conditions

- Goal contract and living artifacts remain current.
- Profiler/checkpoint tests and exactness proof pass.
- Profile freezes real hot paths before production edits.
- At most two semantics-neutral correction loops.
- Focused tests and affected-package typecheck pass during implementation.
- After source freeze: root typecheck, full tests, production build/PWA, and
  `verify:determinism` pass.
- Final review has zero actionable P0–P2 findings.
- Prerequisite lands independently on local `main`; no unrelated file enters.
- Existing Goal-18 seed 7111 emits a valid exact receipt under 40 minutes.
- No remote push or deployment.
