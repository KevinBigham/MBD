# Current Source Truth — ECON-LONG-SAVE-PERF-1

## Preflight

- Repository/worktree: `/Users/kevin/Downloads/MBD-econ-long-save-perf-1`
- Branch: `codex/econ-long-save-perf-1`
- Base/HEAD before slice docs: `8e24909c630a47cb71065c7bb1dd00619a5c8c38`
- Local `main` and `origin/main`: same revision at preflight.
- Slice worktree dirty state before work: clean; index empty.
- Main worktree preserved dirty paths: `.agents/skills/mbd-implement-slice/SKILL.md`,
  `AGENTS.md`, and `docs/codex/PROGRAM.md`; none are owned by this slice.
- Package manifest: `pnpm@9.15.4`, Node `>=20`; invoke through
  `corepack pnpm` because the ambient `pnpm` binary is `11.9.0`.
- Live root scripts: `typecheck`, `test`, `build`, `verify:determinism`,
  `playtest:calibrate`; web scripts: `typecheck`, `test`, `build`,
  `e2e:reload-smoke`.
- Current GameSnapshot: v35 (`CURRENT_GAME_SNAPSHOT_VERSION = 35`). Dexie: v6.
- Dependency setup: `corepack pnpm install --offline --frozen-lockfile` passed;
  705 packages reused from the local store, no download.
- Clean-main baseline: `corepack pnpm --filter @mbd/web typecheck` passed.
- Focused clean-main baseline: `sim.worker.balance.test.ts`,
  `sim.worker.rollover.integration.test.ts`, and `econClockSoak.test.ts` passed
  3 files / 12 tests with one env-gated skip in `172.51s`.

## Authorized dependency state

- Goal 18 lives on unlanded branch `codex/econ-long-soak-18` at authorization
  commit `2ac8287d0050bf369ebcbf3d6a2ebc85818cf2c2`.
- Its sole corrected seed-7111 run at implementation revision `4d938bb` reached
  primary season 17, never began season 18 or replay, emitted no receipt, and
  timed out at the unchanged `2_400_000ms` gate (`2_496_670ms` observed).
- Its corrected horizon-2 smoke preserved canonical rows and all recorded
  state/RNG/subdomain digests byte-for-byte under a 90-second external ceiling.
- Kevin authorized the recommended bounded prerequisite on 2026-07-16. Goal 18
  is dependency-blocked rather than oracle-blocked; items 19+ remain closed.

## Initial source map

- `apps/web/src/workers/sim.worker.actions.ts` owns `simToPlayoffs`,
  `simMonthInternal`, affiliate advancement, roster normalization, and the
  monthly orchestration path.
- `apps/web/src/workers/sim.worker.narrative.ts` owns monthly narrative, morale,
  chemistry, and payroll refresh work.
- `apps/web/src/workers/sim.worker.records.ts` owns record synchronization.
- `packages/sim-core/src/roster/minorLeagues.ts` owns affiliate-day simulation.
- `apps/web/src/workers/sim.worker.diagnostics.ts` exposes only coarse runtime
  facts and manual archive/prune actions; rollover does not automatically prune.
- `apps/web/src/shared/lib/performance.ts` provides a UI-side interactive
  sim-month budget, not canonical long-save stage attribution.
- Goal 18's `econLongSoak.testSupport.ts` executes the real worker path and owns
  the checkpoint/replay proof, but remains on its dependent WIP branch.

These seams are hypotheses until the authorized profile ranks them.

## Constraints and corrections

1. The prerequisite must start and land from clean `main`; unfinished Goal-18
   commits may not be smuggled into the independent landing.
2. Profiling/checkpoint integration may use a temporary branch composed from the
   Goal-18 WIP plus the prerequisite's instrumentation commit. The Goal-18 WIP
   branch itself stays clean until the prerequisite lands.
3. Automatic pruning is not a semantics-neutral optimization because current
   rollover does not invoke it. It is outside scope.
4. No performance threshold below the final 40-minute proof is frozen before a
   real baseline profile. Synthetic microbenchmarks cannot substitute for the
   canonical worker receipt.
5. Save schema, public worker API, receipt content, annual rows, RNG, and
   gameplay outcomes remain unchanged.
6. Checkpoint artifact identity uses immutable producer revision/tree. Baseline
   and candidate profiles record their own explicit consumer revision/tree;
   consumer equality is not required, but exact schema/state/RNG/row/context
   admission is. This corrects the initial ambiguous "source revision" wording.
7. Existing persisted `performanceDiagnostics` is not the profiler seam. The
   dedicated observer remains module-local and absent from public diagnostics.

## Read-only architecture result

- Source map: `/root/perf_source_map`, complete, no edits.
- Test/checkpoint map: `/root/perf_test_map`, complete, no edits.
- Adversarial Sol gate: `/root/swarm_econ18_calibration_adjudication`,
  `MAP_READY` for instrumentation only, no edits.
- Production optimization remains blocked until checkpointed season-16 baseline
  repetitions freeze actual hot paths and exact files.
- Full decision and instrumentation contract: `SOL_ARCHITECTURE_GATE.md`.

## Instrumentation checkpoint

- Immutable commit: `c72234204e07b33ae0e0e5b1256ae56778f12e3d`
- Git tree: `baff0aff02a82d3e7cd1e94f4dd7780d3b5bbb1d`
- Paths: `sim.worker.actions.ts`, `sim.worker.longSaveProfiler.ts`, and
  `sim.worker.longSaveProfiler.test.ts` only.
- Profiler suite: 8/8 passed in `31.07s`; exact v35/action/RNG/diagnostics/public-
  surface equality passed in `29.842s`.
- Web/e2e typecheck and diff check passed.
- The observer remains module-local and out of state, snapshots, public worker
  contracts, and persisted/public diagnostics.
