# ECON-LONG-SAVE-PERF-1 Execution Plan

Status: `CONDITIONAL — prerequisite locally landed; sole post-landing Goal-18 full diagnostic pending`

## Objective and player outcome

Make the canonical long-save simulation perform less redundant work without
changing state, RNG, history, saves, or receipts, then let Goal 18's unchanged
seed-7111 30-season plus checkpoint-15 replay prove whether that improvement is
sufficient under the original `2_400_000ms` ceiling.

Goal: `docs/codex/goals/29_ECON_LONG_SAVE_PERF_1.md`.

## Frozen scope and invariants

- GameSnapshot remains v35 and Dexie remains v6.
- Worker state remains canonical; the profiler is module-local observation only.
- No simulation mechanic, call order, RNG draw, history fact, save shape,
  Goal-18 row, receipt, validator, calibration band, or timeout changes.
- No automatic pruning, UI/route/dependency/public-worker change, item 19,
  remote push, deploy, tag, publication, or release.
- The three protected main-worktree edits remain untouched and unstaged.

## Executed route

1. Started Goal 29 independently from clean `main@8e24909`.
2. Read-only source/test/Sol maps froze an instrumentation-only contract.
3. The sole writer added the opt-in observer and exactness tests in `c722342`.
4. A disposable Goal-18 composition captured one exact season-15 checkpoint.
5. Fresh-process baseline profiles identified the real dominant stage; Sol then
   froze the exact production file/function and paired-comparison gate.
6. The writer skipped injury-news history scans only for players proven unable
   to produce an injury-return moment (`d80ff41`) and added hostile/ordered tests.
7. One correction made the sim-day profiler own its stage directly so its
   lifetime remained exact (`c8b941d`).
8. Three serial baseline/candidate pairs, corrected-tree horizon-2 proof, focused
   and root gates, build/PWA, bundle budget, determinism, and final Sol review
   passed.
9. Luna reconciled docs and locally landed the prerequisite conditionally.
10. The parent now integrates the landed prerequisite into Goal 18 and runs the
    sole seed-7111 30+15 diagnostic. That run is not part of this receipt yet.

## Acceptance matrix

| Requirement | Artifact | Proof | Status |
| --- | --- | --- | --- |
| Out-of-band stable profiler | `sim.worker.longSaveProfiler.ts`, `sim.worker.actions.ts`; `c722342`, `c8b941d` | profiler 8/8; exact day-stage ownership; no public/persisted surface | Complete |
| No state/RNG/save/receipt impact | observer and worker exactness tests | exact v35/action/RNG/diagnostics/public-surface equality; all paired semantic digests identical | Complete |
| Exact season-15 checkpoint | local 97,073,683-byte artifact, not Git | raw SHA `260594ec24b4f0846835343f7c96bc835a6b2e68909dcc531759cbd44a63516f`; envelope `0cf2564bc2f9a3328c521cc404760a0784d684ff3c05cbb2c9c1f2f991d24d98`; hostile matrix passed | Complete |
| Measured hot-path freeze | `SOL_ARCHITECTURE_GATE.md` | 12,097 players, 44,714 news rows, 198 injuries; target dominated 110,382.877–128,976.246ms | Complete |
| Semantics-neutral optimization | `sim.worker.narrativeFarm.ts`, `sim.worker.test.ts`; `d80ff41` | guard-first negative controls; resolved-injury ordered receipt and duplicate suppression | Complete |
| Paired performance proof | six local profile receipts | total 178,121.040–199,411.976ms -> 72,764.402–79,800.696ms; target 110,382.877–128,976.246ms -> 4,369.359–4,515.245ms; every pair improved, ranges did not overlap | Complete |
| Horizon-2 exact preservation | corrected composition `cbcef621` | 4/4 in 47.20s under 90s; artifact SHA `418091a619244e18f41edb5f51a91e0f447c82135f373f0db57d866047407822`; content digest `7c3462952de7828276c4d5fab7a9bbf6de653372992a0f9da599b49ce021f32f` | Complete |
| Repository gates | final `c8b941d` command receipts | package/web/e2e typechecks; contracts 37; sim-core 1,714; UI 1; web 2,478 plus 9 intentional skips; build/PWA; bundle; determinism 3/3 | Complete |
| Final review | `/root/perf_final_sol_review` | `MERGE_READY`; actionable P0/P1/P2 = 0/0/0 | Complete |
| Independent local landing | Git closeout receipt | exact owned staging, cached diff check, one docs commit, local-main fast-forward only | Complete when this report's commit is on local `main` |
| Goal-18 seed 7111 <40m | dependent Goal-18 receipt | exact 30-season primary plus checkpoint-15 replay validator | Pending; sole remaining sufficiency condition |

## Progress and decisions

- The checkpoint producer is immutable revision `01add123b668d736e2385c2a30338b628ee0513b`
  / tree `ecf12a7e0e12de10d7529c399dd4cbd9b8400358`; consumers are admitted by
  exact schema/state/RNG/row/context digests, not false revision equality.
- Baseline consumer `71c73f969fb53793c025aa7573a64b90bc9eef26` and candidate
  `c510089fbe1699ac4c530161cb8e530e9a497ab5` used the same checkpoint and
  fresh-process stage signature
  `d7fc71fee05e4124c0fb3f3d00d6b396cfb3a1e90e59c5bbdc88a7c89636ea60`.
- All paired runs preserved semantic digest
  `92a32b6d44099a6f797cf20d7918a450787b6e0367b97ee3f29b007b4c6b7f6f`
  and row-16 digest
  `028cfe00273a9f9edfe11b20c6eb7ccadc4ce3f302011d8a3cd3a5d09e23a845`.
- The repository's Turbo wrapper is a non-authoritative environmental failure:
  bundled pnpm 11 attempted an unsafe install and shared cross-worktree cache.
  Direct checkout-local binaries for every package/web/e2e typecheck are the
  authoritative green receipt.
- The unchanged Goal-18 runtime gate remains the only sufficiency band; no
  performance threshold was invented for Goal 29.

## Remaining step and stop condition

Integrate the locally landed prerequisite into Goal 18 and run seed 7111 exactly
once under the original external 40-minute ceiling. If the exact 30+15 receipt
does not validate or misses that ceiling, Goal 29 remains insufficient and work
stops for bounded adjudication; item 19 does not begin.
