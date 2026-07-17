# Current Source Truth — ECON-LONG-SAVE-PERF-1

Status: source frozen at `c8b941de4e0370c4e0795b2aaf7b3ec7971ca5b3`
(tree `e359c94df9217a80e6131f803a5f6e83e73948d4`).

## Preflight and authority

- Worktree: `/Users/kevin/Downloads/MBD-econ-long-save-perf-1`; branch
  `codex/econ-long-save-perf-1`; base `main@8e24909c630a47cb71065c7bb1dd00619a5c8c38`.
- Goal-18 authorization branch: `codex/econ-long-soak-18@2ac8287d0050bf369ebcbf3d6a2ebc85818cf2c2`.
- Its corrected seed-7111 run reached primary season 17, emitted no receipt, and
  exceeded the fixed `2_400_000ms` gate (`2_496_670ms` observed).
- GameSnapshot is v35 and Dexie v6; neither changed.
- Protected main-worktree dirt is `.agents/skills/mbd-implement-slice/SKILL.md`,
  `AGENTS.md`, and `docs/codex/PROGRAM.md`; all remain outside this slice.

## Landable source

- `c72234204e07b33ae0e0e5b1256ae56778f12e3d` (tree
  `baff0aff02a82d3e7cd1e94f4dd7780d3b5bbb1d`) adds the opt-in module-local
  long-save profiler and exact disabled/enabled worker tests.
- `d80ff41024eaea304a9b679d2b99cc4509f194c3` changes
  `applyRegularSeasonPlayerMicroArcMoments`: players with no injury or an active
  injury now skip `latestInjuryStartDay`; all resolved-injury behavior, history
  scan order, moment construction, and duplicate suppression remain unchanged.
- `c8b941de4e0370c4e0795b2aaf7b3ec7971ca5b3` makes the sim-day operation own and
  finalize its profiler stage directly. It is an observation-boundary correction,
  not a gameplay change.
- No schema, Dexie, public Comlink, UI, route, dependency, receipt, validator,
  band, timeout, automatic prune, or history-retention change exists.

## Exact checkpoint and admission

- Local artifact: `/tmp/mbd-econ-long-save-perf-1-20260716-01add12/season15-checkpoint.json`;
  97,073,683 bytes; intentionally outside Git.
- Producer revision/tree:
  `01add123b668d736e2385c2a30338b628ee0513b` /
  `ecf12a7e0e12de10d7529c399dd4cbd9b8400358`.
- Seed 7111, mode `diagnostic_inherited_candidates`, season 15, schema v35.
- Raw SHA-256: `260594ec24b4f0846835343f7c96bc835a6b2e68909dcc531759cbd44a63516f`.
- Canonical envelope digest:
  `0cf2564bc2f9a3328c521cc404760a0784d684ff3c05cbb2c9c1f2f991d24d98`.
- Capture passed 15 seasons in 1,447.694s; Vitest observed 1,448.72s, within
  the fixed 40-minute external ceiling.
- The current hostile validator rejected byte, producer revision/tree, seed,
  schema, season, snapshot/state/RNG/row/context, malformed/truncated, and
  recomputed-envelope forgeries before singleton state installation; the full
  matrix passed in 80.603s.

## Measured baseline and hot-path freeze

- Identical season-16 input contained 12,097 players, 44,714 news items, and
  only 198 injuries. The old all-player news scan implied an upper bound of
  approximately 17.85 billion news visits across 33 calls.
- Baseline measured `regularSeason.total`:
  199,411.976ms / 190,429.581ms / 178,121.040ms.
- Baseline `regularSeason.signatureWeeklyMicroArc`:
  128,976.246ms / 121,200.907ms / 110,382.877ms, about 61.5–64.2% of the stage.
- Sol froze only `sim.worker.narrativeFarm.ts` and adjacent worker tests. It
  prohibited helper/index/order/RNG/news/history/secondary-stage changes.

## Paired candidate proof

Serial fresh-process order was B1/C1/B2/C2/B3/C3 with no retry or substitution.

| Pair | Baseline total / target ms | Candidate total / target ms | Artifact SHA-256 baseline / candidate |
| --- | ---: | ---: | --- |
| 1 | 199,411.976 / 128,976.246 | 78,249.806 / 4,515.245 | `db5e0484715ea221ccfd8012d199ca2c231a662d99d63b4a58ab6a876dcc5eed` / `eaa588ca894b69cb52e2796b02e5d4add374d16ba2a35c718e5fce9e33a4e380` |
| 2 | 190,429.581 / 121,200.907 | 72,764.402 / 4,369.359 | `5ee0a4c18c50c4b7bef4741013868ce186505c86c50ecce0b5a125752e28836a` / `edd23e38d5e88e33cae36b67b297e5e1986196bfc77ab599a4c1a9ef5acba1e0` |
| 3 | 178,121.040 / 110,382.877 | 79,800.696 / 4,377.717 | `26be9401983691670a89bac6232faf875e761cd60898c470de81949a16a7dc07` / `f942bd67b24d0e11009aae3c689945943036b0df5368b3ffc3cab194fc682af4` |

Every pair improved; total and target ranges do not overlap. Every run has stage
signature `d7fc71fee05e4124c0fb3f3d00d6b396cfb3a1e90e59c5bbdc88a7c89636ea60`,
semantic digest `92a32b6d44099a6f797cf20d7918a450787b6e0367b97ee3f29b007b4c6b7f6f`,
and row-16 digest `028cfe00273a9f9edfe11b20c6eb7ccadc4ce3f302011d8a3cd3a5d09e23a845`.
The row subdigests are contracts `252d7d0c790fdbefb21882efa3e2e9a0af22bc46c00d02edb3af8b92bf0352dd`,
free agency `3ca62d787e9c9137824cb17351c73e3cfe52f7fcaab560d94c90b0c47b9248f5`,
payroll `7df605c2d8f6d25474783ca15fe5542752d088b4e2de54781a8d22b0eb6cad1e`,
population `d39bce561aa52c5c54503cc9a5ec178f2cae4d84dd843eda3c6d291dd9fb0814`,
RNG `8612a0c98050ac5e11f3a333b4439d717573596bcb3f8af6e48e84552feda52c`,
and state `fe7871f1700446dead37ae3c57ed33fe9ba7642a1729b05e0df6e7a251110618`.

## Corrected-tree and final gates

- Corrected composition `cbcef621b5c841b616fff6bdf7f2120a757fbcc8` reproduced the
  Goal-18 horizon-2 reference: 4/4 in 47.20s, under 90s, with exact content
  digest `7c3462952de7828276c4d5fab7a9bbf6de653372992a0f9da599b49ce021f32f`.
  Receipt SHA-256:
  `418091a619244e18f41edb5f51a91e0f447c82135f373f0db57d866047407822`.
- Checkout-local package/web/e2e typechecks all passed.
- Contracts: 37 passed. Sim-core: 1,714 passed. UI: 1 passed. Web:
  2,478 passed and 9 intentional skips.
- Production build/PWA: 3,035 modules and 168 precache entries.
- Bundle: core 454,918 raw / 147,456 gzip at the exact ceiling; story 393,205
  raw / 111,617 gzip. Determinism: 3/3.
- The Turbo wrapper's bundled pnpm 11 attempted an unsafe install and used a
  shared cross-worktree cache, so that wrapper receipt is environmental and
  non-authoritative. Direct repository-installed binaries supplied the green
  typecheck receipts.
- Final Sol `/root/perf_final_sol_review`: `MERGE_READY`, actionable
  P0/P1/P2 `0/0/0`. Models/effort were requested but never host-pinned.

## Post-landing sufficiency truth

- Goal-18 integration revision:
  `41b12d13639d0670afd2f24b1d2a76fb3fd74d64`, merged without rewriting its
  existing history.
- Command environment: `MBD_ECON_LONG_SOAK=1`, mode
  `diagnostic_inherited_candidates`, seed 7111, exact source revision above,
  direct `econLongSoak.test.ts`, and external Perl alarm exactly 2,400 seconds.
- Intended JSON: `/tmp/econ18-seed7111-full-41b12d1.json`; none was emitted.
  Log: `/tmp/econ18-seed7111-full-41b12d1.log`; SHA-256
  `d51c9bc1d33dca8d007404330105fd39fec4bd3102f93e0cf6f8c3c4604b2148`,
  3,840 bytes, last modified `2026-07-16T23:26:51-0500`.
- Terminal result: exit 142 from external SIGALRM. The log contains 30 primary
  start markers, exactly 29 primary completion markers, and zero replay markers.
  Season 30 started but did not complete. No process remains.

The result materially improves on the former season-17 stop, and all paired,
horizon, repository, and semantic gates remain green. It nevertheless fails
Goal 29's decisive sufficiency contract. Both authorized correction loops are
exhausted. Source remains frozen and locally landed; no retry, timeout change,
new seed, source edit, or item-19 work is authorized. Continuing requires a
newly bounded performance split or explicit contract amendment.
