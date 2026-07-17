# ECON-LONG-SAVE-PERF-1 Completion Report

Status: `BLOCKED — post-landing sufficiency gate missed`

Date: 2026-07-16

## Outcome

Goal 29 removed a proven source of redundant late-save work without changing
gameplay, RNG, state, history, saves, or Goal-18 evidence. The measured
season-16 total fell from 178,121.040–199,411.976ms to
72,764.402–79,800.696ms, while the targeted micro-arc stage fell from
110,382.877–128,976.246ms to 4,369.359–4,515.245ms. Every one of three serial
baseline/candidate pairs improved with non-overlapping ranges and exact semantic
digests.

The prerequisite's source, focused gates, repository gates, bundle, determinism,
corrected-tree horizon proof, and final adversarial review are green. The sole
post-landing Goal-18 seed-7111 run nevertheless hit the exact external 40-minute
alarm after 30 primary starts and 29 completions. Season 30 did not complete,
replay never began, and no JSON receipt was emitted. The locally landed code is
verified but insufficient; Goal 29 and roadmap item 18 are not complete.

## Implementation and owned files

- `apps/web/src/workers/sim.worker.longSaveProfiler.ts` — opt-in module-local
  closed-stage observer, absent from state, saves, public diagnostics, and
  Comlink (`c722342`).
- `apps/web/src/workers/sim.worker.actions.ts` — coarse stage boundaries and
  exact direct sim-day stage lifetime (`c722342`, `c8b941d`).
- `apps/web/src/workers/sim.worker.longSaveProfiler.test.ts` — disabled no-op,
  nesting/math, cleanup, same-error rethrow, concurrency, clock-failure, exact
  state/RNG/public-surface proof.
- `apps/web/src/workers/sim.worker.narrativeFarm.ts` — skip injury-news history
  lookup only when no injury exists or the injury remains active (`d80ff41`).
- `apps/web/src/workers/sim.worker.test.ts` — throwing negative controls for the
  two skipped classes and exact eligible resolved-injury ordering/duplicate proof.
- Goal 29 goal/run/status docs, this report, `GOAL.md`, and `CHANGELOG.md`.

No schema, Dexie, public worker API, UI, route, dependency, history-retention,
automatic-pruning, receipt, validator, band, timeout, or gameplay-policy change.

## Acceptance mapping

| # | Criterion | Implementation artifact | Focused / browser proof | Final gate | Remaining risk |
| ---: | --- | --- | --- | --- | --- |
| 1 | Opt-in stable phase profiler | `sim.worker.longSaveProfiler.ts`; stage boundaries in `sim.worker.actions.ts` | Profiler 8/8 with stable nesting/order/math and cleanup | web/e2e typecheck; full web suite | None identified |
| 2 | Disabled path byte/RNG identical | disabled fast path and exact worker test | Complete v35/action/RNG/diagnostics/public-key equality | semantic digest exact in all six paired receipts | None identified |
| 3 | One exact season-15 checkpoint | disposable adapter; local 97,073,683-byte artifact | capture/reload plus hostile validation matrix | SHA `260594ec24b4f0846835343f7c96bc835a6b2e68909dcc531759cbd44a63516f`; envelope `0cf2564bc2f9a3328c521cc404760a0784d684ff3c05cbb2c9c1f2f991d24d98` | Local artifact must remain available through Goal-18 proof; it is intentionally not Git data |
| 4 | Profile and Sol-freeze real hot path | identical checkpoint season-16 profiles; architecture gate | 12,097 players / 44,714 news / 198 injuries; target 61.5–64.2% | Sol `FREEZE_READY` | Wall-time values remain machine-specific, but pair gate is same-machine and serial |
| 5 | Optimize measured path only | `applyRegularSeasonPlayerMicroArcMoments` guard | throwing no-injury and active-injury negative controls | focused 3 tests; full web 2,478 + 9 skip | None identified |
| 6 | Preserve every observable result | eligible resolved-injury scan/order unchanged | exact row/state/RNG/contracts/payroll/population/FA digests | all three pairs exact | None identified |
| 7 | Preserve history/horizon/receipt/schema | no change to those surfaces | source diff and public/save exactness | v35/Dexie-v6; final Sol review | None identified |
| 8 | Identical before/after production-path comparison | fresh-process B1/C1/B2/C2/B3/C3 | every pair improves; ranges do not overlap | paired gate passed without retries/substitution | Final 30+15 runtime still decides sufficiency |
| 9 | Focused exactness plus horizon reference | worker tests; corrected composition `cbcef621` | horizon 4/4 in 47.20s; no UI changed, so no browser presentation gate applies | content digest `7c3462952de7828276c4d5fab7a9bbf6de653372992a0f9da599b49ce021f32f` exact | None identified for two seasons |
| 10 | Root gates and final review | frozen source `c8b941d` | checkout-local typechecks; contracts 37; sim-core 1,714; UI 1; web 2,478 + 9 skip; build/PWA; bundle; determinism | Sol `MERGE_READY`, P0/P1/P2 0/0/0 | Turbo wrapper receipt is environmental/non-authoritative; direct binaries passed |
| 11 | Independent local landing then one Goal-18 run | item-only docs commit after source commits; local-main fast-forward; Goal-18 integration `41b12d1` | exact staging/cached diff/Git receipts; sole run executed | Local landing complete; run stopped by SIGALRM | No retry is authorized |
| 12 | Sufficiency only on exact 30+15 <40m | unchanged Goal-18 harness/gate | 30 starts, 29 completions, zero replay, no receipt, exit 142 | Failed | Newly bounded split or explicit contract amendment required |

## Exact performance and semantic evidence

| Pair | Baseline total / target ms | Candidate total / target ms |
| --- | ---: | ---: |
| 1 | 199,411.976 / 128,976.246 | 78,249.806 / 4,515.245 |
| 2 | 190,429.581 / 121,200.907 | 72,764.402 / 4,369.359 |
| 3 | 178,121.040 / 110,382.877 | 79,800.696 / 4,377.717 |

All receipts preserved:

- semantic digest `92a32b6d44099a6f797cf20d7918a450787b6e0367b97ee3f29b007b4c6b7f6f`;
- row-16 digest `028cfe00273a9f9edfe11b20c6eb7ccadc4ce3f302011d8a3cd3a5d09e23a845`;
- stage/call signature `d7fc71fee05e4124c0fb3f3d00d6b396cfb3a1e90e59c5bbdc88a7c89636ea60`;
- contracts `252d7d0c790fdbefb21882efa3e2e9a0af22bc46c00d02edb3af8b92bf0352dd`;
- free agency `3ca62d787e9c9137824cb17351c73e3cfe52f7fcaab560d94c90b0c47b9248f5`;
- payroll `7df605c2d8f6d25474783ca15fe5542752d088b4e2de54781a8d22b0eb6cad1e`;
- population `d39bce561aa52c5c54503cc9a5ec178f2cae4d84dd843eda3c6d291dd9fb0814`;
- RNG `8612a0c98050ac5e11f3a333b4439d717573596bcb3f8af6e48e84552feda52c`;
- state `fe7871f1700446dead37ae3c57ed33fe9ba7642a1729b05e0df6e7a251110618`.

The corrected-tree horizon-2 artifact SHA is
`418091a619244e18f41edb5f51a91e0f447c82135f373f0db57d866047407822`.
Raw checkpoint and timing payloads remain outside Git.

## Final gate receipt

- Direct package/web/e2e typechecks: passed.
- Contracts: 37 passed.
- Sim-core: 1,714 passed.
- UI: 1 passed.
- Web: 2,478 passed; 9 intentional skips.
- Production build/PWA: 3,035 modules; 168 precache entries.
- Bundle: core 454,918 raw / 147,456 gzip at the exact ceiling; story 393,205
  raw / 111,617 gzip.
- Determinism: 3/3.
- Corrected-tree Goal-18 horizon-2: 4/4, 47.20s, exact digest, under 90s.
- Final Sol: `MERGE_READY`, actionable P0/P1/P2 `0/0/0`.

## Post-landing sufficiency-gate receipt

- Goal-18 revision: `41b12d13639d0670afd2f24b1d2a76fb3fd74d64`.
- Environment: `MBD_ECON_LONG_SOAK=1`, mode
  `diagnostic_inherited_candidates`, seed 7111, source revision exact, direct
  `econLongSoak.test.ts`, external Perl alarm exactly 2,400 seconds.
- Exit: 142 from external SIGALRM.
- Progress: 30 primary start markers; 29 primary completion markers; zero replay
  markers. Season 30 started but did not complete.
- JSON path `/tmp/econ18-seed7111-full-41b12d1.json`: absent.
- Log `/tmp/econ18-seed7111-full-41b12d1.log`: 3,840 bytes; SHA-256
  `d51c9bc1d33dca8d007404330105fd39fec4bd3102f93e0cf6f8c3c4604b2148`;
  last modified `2026-07-16T23:26:51-0500`.
- No process remains. No retry, timeout change, seed 7112/7113, source edit, or
  item-19 work followed.

The root Turbo wrapper is not an authoritative failure: its bundled pnpm 11
attempted an unsafe install and shared a cross-worktree cache. All direct
repository-installed package/web/e2e typecheck binaries passed in the exact
checkout. No test result from a different source tree is represented as final.

## Review findings and disposition

- The initial instrumentation boundary did not make sim-day stage ownership as
  explicit as the architecture required. `c8b941d` moved ownership directly
  into `simDayInternal` with `finally` cleanup; exactness and all gates passed.
- The optimization needed hostile proof that ineligible players never enter the
  news iterator and that eligible resolved-injury selection/order remained
  exact. Those controls and ordered receipt assertions landed in `d80ff41`.
- Instrumentation pushed the core bundle to its frozen exact ceiling. The build
  and bundle budget were rerun after the correction; they pass, but the zero-byte
  core headroom is recorded as a maintenance risk rather than waived.
- Final review found zero remaining actionable P0–P2 issues.

## Git, rollback, and retained risk

The source commits are `c722342`, `d80ff41`, and `c8b941d`; the exact closeout
commit and local-main revision are reported from Git after creation because a
commit cannot truthfully embed its own future hash. Staging excludes raw `/tmp`
artifacts, swarm ledgers, Goal-18 WIP, and all unrelated user files.

Rollback is a normal revert of the Goal-29 commits. There is no migration or
save rewrite to undo; v35 snapshots remain compatible. The blocker and retained
risks are:

1. Goal-18's sole full seed-7111 diagnostic did miss 40 minutes before season 30
   completion, so the 30+15 receipt does not exist and Goal 29 is insufficient.
2. The core bundle passes at the exact gzip ceiling, so future unrelated core
   growth has no budget headroom.
3. The 97MB checkpoint is intentionally local evidence and must be retained
   until the blocker is adjudicated.

Both authorized Goal-29 correction loops are exhausted. The precise next
authority required is a newly bounded performance split or explicit contract
amendment. A retry or timeout increase is not an accepted substitute.

## Actual swarm route

The run used ledger-assisted role routing, but model and effort requests were
not host-pinned. Therefore this report does not claim actual GPT-5.6 routing.
Read-only mapping and Sol review work remained separate from the sole production
writer; Luna was the exclusive documentation/staging/landing writer. One Terra
correction continued through prompt-only scope because the ledger could not
expand the same thread's write scope without falsely reporting a new writer.

| Role | Thread | Requested route | Artifact | Status |
| --- | --- | --- | --- | --- |
| Source/test maps | `/root/perf_source_map`, `/root/perf_test_map` | host-selected/unpinned | canonical seam, checkpoint, hostile-test maps | Complete; read-only |
| Architecture/hot-path Sol | `/root/swarm_econ18_calibration_adjudication` | Sol/xhigh requested, unpinned | instrumentation contract and measured file freeze | `MAP_READY`, then `FREEZE_READY`; read-only |
| Instrumentation/adapter Terra responsibility | `/root/perf_terra_writer` | Terra/high requested, unpinned | observer and disposable adapter corrections | Complete |
| Production Terra writer | `/root/perf_terra_optimizer` | Terra/high requested, unpinned | `d80ff41` plus tests | Complete |
| Final Sol | `/root/perf_final_sol_review` | Sol/xhigh requested, unpinned | final line-level verdict | `MERGE_READY`; 0/0/0 |
| Luna closeout | `/root/perf_luna_closeout` | Luna/medium requested, unpinned | docs, exact staging, commit, local-main fast-forward | Conditional local landing |

## Swarm retrospective

1. **Build and bundle immediately after instrumentation.** The observer reached
   the exact core gzip ceiling; a build/bundle gate directly after `c722342`
   would have exposed that constraint before optimization and final correction.
2. **Prove chunk ownership before freezing source scope.** Record which stage
   module lands in which production chunk and its raw/gzip delta as part of the
   architecture artifact, not only at final build.
3. **Keep the exact late-save checkpoint.** The season-15 v35 snapshot and
   producer/consumer identity contract converted a 24-minute setup into reusable,
   hostile-validated candidate comparisons without weakening semantics.
4. **Require a final-source horizon rerun.** Pair evidence alone cannot catch an
   integration-boundary correction. The explicit `cbcef621` horizon proof should
   remain mandatory after the last source edit.
5. **Assert source-tree identity at every receipt boundary.** Bind producer
   revision/tree, consumer revision/tree, stage signature, and semantic digests
   so evidence from nearby worktrees cannot be mistaken for current evidence.
6. **Keep read-only Sol work parallel and all writes sequential.** Source/test
   mapping can safely overlap; instrumentation, adapter corrections, production
   optimization, final review, docs, staging, and landing must retain single-
   writer joins.

Recommended route for a similar cross-system performance slice: parallel
read-only source/test maps -> one Sol observation contract -> one instrumenter ->
exact late-save checkpoint -> serial baseline -> Sol hot-path freeze -> one
production writer -> serial paired proof -> final-source horizon -> build/bundle
and root gates -> one final Sol review -> one Luna closeout -> dependent full
acceptance run exactly once.
