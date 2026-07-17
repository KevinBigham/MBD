# Sol Architecture Gate — ECON-LONG-SAVE-PERF-1

Date: 2026-07-16

Verdict: `MERGE_READY — prerequisite landing authorized; Goal-18 sufficiency remains conditional`

The instrumentation, measured hot-path freeze, semantics-neutral optimization,
paired proof, corrected-tree horizon proof, repository gates, and final review
are complete. Goal 29 is sufficient only if the sole post-landing Goal-18
seed-7111 30+15 run validates under the unchanged 40-minute ceiling.

## Read-only route

| Role | Thread | Artifact | Status |
| --- | --- | --- | --- |
| Source/hot-path mapper | `/root/perf_source_map` | Line-level canonical season map and ranked unmeasured hypotheses | Complete; no edits |
| Test/checkpoint mapper | `/root/perf_test_map` | Exact artifact envelope, hostile matrix, commands, composition plan | Complete; no edits |
| Adversarial architecture reviewer | `/root/swarm_econ18_calibration_adjudication` | Severity-ranked trust/determinism gate and sequencing | `MAP_READY`; no edits |
| Measured hot-path freezer | same Sol responsibility | Exact file/function freeze from checkpoint profiles | `FREEZE_READY`; no edits |
| Final adversarial reviewer | `/root/perf_final_sol_review` | Gate-green diff/evidence review | `MERGE_READY`; P0/P1/P2 `0/0/0`; no edits |

Models and effort were not host-pinned. Role names describe responsibility, not
verified model routing.

The route used ledger-assisted swarm coordination. One correction continued in
the same Terra implementation responsibility through a prompt-only scope update
because the ledger could not expand that existing thread without falsely
reporting a second writer. No actual model or effort pin was available.

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

## Instrumentation gate receipt

- Commit: `c72234204e07b33ae0e0e5b1256ae56778f12e3d`
- Tree: `baff0aff02a82d3e7cd1e94f4dd7780d3b5bbb1d`
- Scope: exactly `sim.worker.actions.ts`,
  `sim.worker.longSaveProfiler.ts`, and its test.
- Coordinator-observed profiler suite: 1 file / 8 tests passed in `31.07s`;
  the full exactness test took `29.842s`.
- Coordinator-observed web/e2e typecheck: passed.
- `git diff --cached --check`: passed before commit.
- The closed union includes all regular and 18 disposable-adapter stages.
- At this historical instrumentation checkpoint, production optimization was
  blocked pending checkpointed baseline evidence; the measured freeze below
  subsequently resolved that block.

## Measured hot-path and file freeze

The authorized season-15 checkpoint contained 12,097 players, 44,714 news
items, and 198 injuries. At season 16 the target stage called the injury-return
news lookup for all players on each of 33 invocations, an upper bound of about
17.85 billion news-item visits even though only players with a resolved injury
could produce the moment.

Baseline `regularSeason.total` was 199,411.976ms / 190,429.581ms /
178,121.040ms. `regularSeason.signatureWeeklyMicroArc` was 128,976.246ms /
121,200.907ms / 110,382.877ms, approximately 61.5–64.2% of the stage.

Sol froze production scope to:

- `apps/web/src/workers/sim.worker.narrativeFarm.ts`, specifically the
  precondition before `latestInjuryStartDay` in
  `applyRegularSeasonPlayerMicroArcMoments`;
- adjacent exact worker tests in `apps/web/src/workers/sim.worker.test.ts`.

The helper, scan order for eligible players, RNG, news/history, moment creation,
duplicate suppression, and all secondary stages remained frozen.

## Paired candidate gate

One warmup preceded three serial B/C pairs. Each process imported the same
checkpoint, exposed the same stage set/call counts, and preserved stage
signature `d7fc71fee05e4124c0fb3f3d00d6b396cfb3a1e90e59c5bbdc88a7c89636ea60`,
semantic digest `92a32b6d44099a6f797cf20d7918a450787b6e0367b97ee3f29b007b4c6b7f6f`,
and row-16 digest
`028cfe00273a9f9edfe11b20c6eb7ccadc4ce3f302011d8a3cd3a5d09e23a845`.

| Pair | Baseline total / target ms | Candidate total / target ms |
| --- | ---: | ---: |
| 1 | 199,411.976 / 128,976.246 | 78,249.806 / 4,515.245 |
| 2 | 190,429.581 / 121,200.907 | 72,764.402 / 4,369.359 |
| 3 | 178,121.040 / 110,382.877 | 79,800.696 / 4,377.717 |

Every pair improved and neither total nor target ranges overlap. This proves the
measured optimization, not final Goal-18 sufficiency.

## Correction and source-freeze gates

- `d80ff41024eaea304a9b679d2b99cc4509f194c3` adds the guard-first production
  optimization and hostile no-injury/active-injury tests plus exact ordered
  resolved-injury and duplicate-suppression proof.
- `c8b941de4e0370c4e0795b2aaf7b3ec7971ca5b3` makes the sim-day profile stage
  own its lifetime directly. No gameplay path or result changes.
- Corrected composition `cbcef621b5c841b616fff6bdf7f2120a757fbcc8`
  passed the frozen horizon-2 proof 4/4 in 47.20s under 90s; exact content digest
  `7c3462952de7828276c4d5fab7a9bbf6de653372992a0f9da599b49ce021f32f`.
- Final checkout-local typechecks passed. Contracts 37, sim-core 1,714, UI 1,
  and web 2,478 passed with 9 intentional skips. Build/PWA produced 3,035
  modules / 168 precache entries. Bundle core was 454,918 raw / 147,456 gzip at
  the exact ceiling; story was 393,205 / 111,617. Determinism passed 3/3.
- The Turbo wrapper's bundled-pnpm/shared-cache failure is environmental and
  non-authoritative; direct checkout-local typechecks are authoritative.

## Final adversarial review and landing gate

`/root/perf_final_sol_review` returned `MERGE_READY` with actionable
P0/P1/P2 `0/0/0`. It found no semantic drift, incomplete guard, observer leak,
bundle regression, unrelated edit, schema/public-contract change, or basis to
weaken Goal 18.

Sol authorizes exact local prerequisite landing. This gate does not declare the
prerequisite sufficient: the parent must integrate the landed source into Goal
18 and run seed 7111 exactly once under the original external 40-minute gate.
Failure to validate the full 30+15 receipt returns the slice to bounded
adjudication and keeps item 19 closed.
