# Sol Architecture Gate — ECON-LONG-SAVE-PERF-1

Date: 2026-07-16

Verdict: `MAP_READY_INSTRUMENTATION_ONLY`

Production optimization remains blocked until the checkpointed baseline profile
freezes measured hot paths and exact editable files.

## Read-only route

| Role | Thread | Artifact | Status |
| --- | --- | --- | --- |
| Source/hot-path mapper | `/root/perf_source_map` | Line-level canonical season map and ranked unmeasured hypotheses | Complete; no edits |
| Test/checkpoint mapper | `/root/perf_test_map` | Exact artifact envelope, hostile matrix, commands, composition plan | Complete; no edits |
| Adversarial architecture reviewer | `/root/swarm_econ18_calibration_adjudication` | Severity-ranked trust/determinism gate and sequencing | `MAP_READY`; no edits |

Models and effort were not host-pinned. Role names describe responsibility, not
verified model routing.

## Frozen facts

- Goal-18 `runOneSeason` executes regular season, playoffs, offseason entry,
  autonomous phases, rollover, and annual evidence in that order.
- Its checkpoint capture already proves v35 export/import state and RNG identity,
  but the season-15 snapshot and `runOneSeason` are private and no artifact is
  emitted before the full 30+15 run returns.
- Therefore one clean, committed, disposable integration-only adapter is
  necessary to extract the single authorized checkpoint and resume season 16.
  That adapter and raw artifact never land.
- Existing coarse `performanceDiagnostics` is persisted in GameSnapshot and is
  unsuitable. The new observer must be a dedicated internal module, must not
  extend `PerformanceDiagnosticsView`, and must never enter state, snapshots,
  rows, receipts, public actions/queries, or Comlink.
- The latest evidence is horizon 2 in `78.37s` and primary seasons 1–17 in
  `2_496.67s`; no stage shares exist yet.

## Instrumentation-only file freeze

The single writer may edit only:

- `apps/web/src/workers/sim.worker.longSaveProfiler.ts` (new);
- `apps/web/src/workers/sim.worker.longSaveProfiler.test.ts` (new);
- `apps/web/src/workers/sim.worker.actions.ts` (coarse stage boundaries only);
- this slice's goal/run documents when recording results.

No Goal-18 file changes belong in this commit. The temporary integration adapter
will be a separate disposable-branch commit after instrumentation is immutable.

## Frozen observer contract

Stable stage names cover:

- total regular season;
- MLB simulation;
- affiliate days;
- monthly development;
- trade market;
- injury/news;
- roster normalization;
- signature/weekly/micro-arc moments;
- narrative;
- ticker/debut/consequences;
- fan sentiment;
- record tracking;
- remaining monthly hooks/pulse/achievements/scenario;
- temporary-adapter-only playoffs, offseason phases, rollover, annual evidence,
  and checkpoint export/import/digest.

The module must:

1. expose activation only through direct internal test imports;
2. use a closed stage union with no player/team/season IDs;
3. return stable stage order with call count, inclusive/self milliseconds,
   minimum, and maximum;
4. call the operation directly without reading the clock or allocating timing
   records when disabled;
5. preserve return values and rethrow the identical operation error object;
6. reject concurrent/nested profiler-session activation before worker mutation,
   while allowing properly nested stage wrappers inside one session;
7. clean up session/stack state on success or failure;
8. prevent observer/clock failures from interrupting or branching simulation;
9. never let timings influence state, RNG, ordering, IDs, gameplay, saves, or
   evidence.

Instrument month, week, and day orchestration so tail days are represented. Use
coarse boundaries only—never each player, game, or affiliate day.

## Checkpoint trust contract

The raw JSON remains outside Git. The committed digest receipt will bind:

- immutable `producerRevision` and `producerTree`;
- exact Goal-18 and instrumentation revisions;
- seed 7111, diagnostic mode, checkpoint 15, and v35;
- raw-file SHA-256 and canonical envelope digest;
- complete serialized snapshot digest and Goal-18 deterministic-state digest;
- raw RNG state/call count and RNG digest;
- checkpoint-15 annual-row digest;
- prior remaining-free-agent-set digest;
- baseline roster-category digest.

Every profile invocation separately records explicit `consumerRevision` and
`consumerTree`. Unspecified consumers fail closed. Consumer identity is not
required to equal producer identity because the checkpoint exists to compare
candidate revisions from identical input. Admission instead requires exact
agreement on schema, seed, season, state, RNG, row, and continuation-context
digests before singleton state is installed.

Hostile tests must independently reject raw-byte, producer revision/tree, seed,
schema, season, snapshot, state, RNG field/digest, row/digest, round-trip,
baseline-category, phase/season identity, missing/extra-key, malformed/truncated,
and recomputed-outer-envelope forgeries.

## Unmeasured hypotheses

These are not editable production scope until baseline data confirms them:

1. Free agency: up to 60 days repeatedly rebuild league payroll/need/slot state,
   then iterates a growing free-agent class across sorted teams.
2. Affiliate simulation: every regular-season day rebuilds indices and repeatedly
   finds/copies/sorts affiliate state.
3. MLB lineup construction: game-team assembly repeatedly filters the full and
   growing player population.
4. Narrative/roster/payroll: monthly games × players plus teams × players/history
   recomputation.
5. Signature moments, accumulated news/history sorting, records, and evidence
   hashing may be material but remain lower-confidence.

Forbidden regardless of measurement: skipped/batched days or games, parallel
simulation, changed RNG forks/draw order, reordered loops/sorts/maps/sets,
cross-save/module-global caches, caching across mutation barriers, automatic
pruning, history loss, shorter horizon, receipt/validator/band/timeout changes,
schema/API/dependency changes, item 19, or synthetic-only acceptance.

## Required instrumentation gates

1. Fake-clock unit tests prove nesting, inclusive/self math, stable order, call
   counts, min/max, same-sentinel rethrow, failure cleanup, concurrent activation
   rejection, and disabled zero-clock behavior.
2. Identical imported state with profiler enabled/disabled produces exact action
   result, complete v35 snapshot, and RNG state.
3. Snapshot JSON, Goal-18 evidence, public action/query keys, and public
   diagnostics contain no profiler data.
4. Focused profiler/worker tests and web typecheck pass.
5. Temporary Goal-18 composition reproduces the known horizon-2 rows/digests
   under the unchanged 90-second ceiling.

## Baseline and later optimization freeze

After one authorized checkpoint capture:

- run each repetition in a fresh process and fresh cloned import;
- record identical checkpoint, command, machine, stage set/call counts, explicit
  consumer revision/tree, and no overlapping CPU-heavy task;
- use one warm-up plus three measured season-16 baseline executions;
- publish inclusive/self rankings and raw totals;
- freeze exact production functions/files only then.

After the writer's measured change: one warm-up and three sequential baseline /
candidate pairs. Candidate total and targeted stage must improve in every pair,
ranges must not overlap, stage sets/call counts must match, and exact row/state/
RNG/subdomain evidence must remain byte-identical. This is a noise gate, not a
replacement numeric acceptance band. The unchanged full Goal-18 run is the sole
sufficiency gate.

## Sequential gate

Instrumentation commit -> clean disposable composition -> checkpoint capture ->
baseline repetitions -> Sol hot-path/file freeze -> same single writer (maximum
two correction loops) -> paired profiles/exactness -> horizon-2/root gates ->
final Sol review -> local prerequisite landing -> Goal-18 integration -> exactly
one seed-7111 run under 40 minutes.
