# ECON-LATE-HORIZON-PERF-1 Completion Report

Status: `BLOCKED — forecast admission failed; production uncommitted and unlanded`.

## Outcome

The narrow milestone lookup optimization is deterministic, semantics-exact,
bundle-safe, and materially faster at the measured season-30 seam. It passed
every focused, paired-stage, selected-cost, and final evidence-review gate.

Goal 30 is nevertheless incomplete. The sole canonical `forecast-primary`
attempt timed out at the unchanged 2,400,000ms test ceiling, wrote no receipt,
and recorded an adjusted wall of 2,766,160ms. Primary alone exceeded the entire
2,040,000ms readiness cap by 726,160ms, so continuation, full root gates, final
Goal 18, production landing, and item 19 were correctly not run.

Final Sol verdict: `BLOCK_CONFIRMED`, zero actionable P0–P2 evidence findings.

## Git and scope

- Goal worktree: `/Users/kevin/Downloads/MBD-econ-late-horizon-perf-1`.
- Goal branch base: `cd5e9191118aee76d22d66b7ffed32fed748cae8`.
- Goal-doc seed commit: `837f659f1c7adbc2b902da67f95f1aff7e51e300`.
- Disposable proof runtime: `226120ac8a732a786f5ca2c5c4101ee1d65918f5`,
  tree `769a4773f7b64883782330c533b12dc843bef13f`.
- Production candidate source SHA-256:
  `8272ce2e72f8cd34b90f7d858e07206533bcb9a02c077337425261903209ee01`.
- Adjacent production test SHA-256:
  `79e136ce0842c4e12525b64d7e190ab5874dcce64473be6bf5037ee5474dc39d`.
- The production source and test remain unstaged, uncommitted, and unlanded.
- GameSnapshot remains v35; Dexie remains v6; no schema, public API, dependency,
  UI, gameplay policy, RNG, history, Goal-18 contract, or item-19 change exists.
- Protected main-worktree dirt remains untouched and unstaged:
  `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and
  `docs/codex/PROGRAM.md`.

## Actual relay route

The user requested `$gpt-5-6-swarm`. The skill was not registered in the active
catalog, so this run used its local ledger-assisted manual swarm pattern. Model
and effort names below are requested route labels; actual host routing was not
pinned or independently provable.

| Phase | Thread | Requested route | Artifact | Status |
| --- | --- | --- | --- | --- |
| Source/test/risk reconstruction | `/root/late_source_map`, `/root/late_test_map`, `/root/late_risk_review` | Sol xhigh / Luna medium | Source map, test map, Goal-30 split | succeeded |
| Disposable adapter | `/root/late_terra_writer` | Terra high | Authenticated capture/profile adapter plus bounded provenance/forecast corrections | succeeded |
| Adapter review | `/root/late_adapter_review` | Sol xhigh | Three focused reviews; final `ADAPTER_READY` | succeeded |
| Season-29 capture/admission | `/root/season29_capture`, parent validator | Luna medium | Authenticated 188MB checkpoint and hostile matrix | succeeded |
| Baseline attribution | `/root/season30_baselines` | Luna medium | Warm-up, B1–B3, V8 reference | succeeded |
| Late-profile architecture | `/root/late_profile_replan` | Sol xhigh | `buildCareerMilestoneEvents` 37.758381% freeze | succeeded |
| Production implementation | `/root/late_production_writer` | Terra high | Two-file patch, negative control, focused/build/bundle gates | succeeded |
| Candidate protocol | `/root/late_candidate_protocol_review` | Sol xhigh | Exact standard/V8/forecast matrix and formulas | succeeded |
| Mechanical proof | `/root/late_proof_runner` | Luna medium | Passing standard/V8 receipts; failed forecast-primary | `STOP_REQUIRED` |
| Final blocker audit | `/root/late_final_blocker_audit` | Sol xhigh | Independent recomputation and `BLOCK_CONFIRMED` | succeeded |

Two runner nodes were canceled before dispatch: the first candidate node because
the adapter conflated checkpoint-producer and executing-runtime identity, and a
ledger-only final-review node whose dependency could not be satisfied by a
failed proof node. Neither launched a process or mutated source.

## Acceptance mapping

| # | Requirement | Implementation / artifact | Focused proof | Final result / risk |
| ---: | --- | --- | --- | --- |
| 1 | Authenticate retained season 15 | Hostile adapter admission | 4/4 input matrix; raw/envelope/state/RNG/row/context exact | passed |
| 2 | Run seasons 16–29 once and stop | `/tmp/mbd-econ-late-horizon-perf-1-20260716-season29.json` | 4/4; exact markers 16–29; no season 30 | passed |
| 3 | Bind season-29 provenance and state | Adapter schema 1 envelope | raw SHA `a29f2e…`; full state/RNG/row/context digests | passed |
| 4 | Reject hostile season-29 artifacts before state | Output hostile matrix | 4/4; forged source/tree/state/RNG/keys/bytes rejected | passed |
| 5 | Three late baselines plus V8 sample | Sealed baseline directory | B1–B3 exact; CPU profile `a6362d…` | passed |
| 6 | Freeze one dominant function | `SOL_ARCHITECTURE_GATE.md` | callee rejected 24.065625%; caller root admitted 37.758381% | passed |
| 7 | Narrow order-preserving algorithm only | `sim.worker.milestones.ts` candidate | original-order narrowed players; no cache/RNG/schema/API change | passed |
| 8 | One Terra production writer | `/root/late_production_writer` | exact two-file scope; zero production correction loops | passed |
| 9 | Exact semantic parity | Schema-1/2 paired receipts | row/state/RNG/round-trip/subdomain/call digests identical | passed |
| 10 | Deliberate negative control | Adjacent structural test | old path failed 8,385 reads versus `<=260`; restored green | passed |
| 11 | Warm-up plus three serial pairs | C1–C3 receipts | every pair improved; ranges non-overlapping | passed |
| 12 | Forecast `<=2,040,000ms` | `forecast.json` | primary timed out; adjusted wall 2,766,160ms; continuation skipped | **failed** |
| 13 | Focused and full repository gates | focused tests/typecheck/build/bundle | focused green; worker-core exact 454,918/147,456 | full gates not run after stop |
| 14 | Land Goal 30, merge to Goal 18, run once | none | prohibited after requirement 12 failed | not run |
| 15 | No retry after failed final evidence | provenance and ledger | one primary attempt; zero continuation/retry | passed stop behavior |

Browser proof is not applicable: the slice forbids UI, IndexedDB, persistence
ownership, route, and player-facing changes. Production PWA/build and unchanged
bundle proof passed before the performance stop; no browser claim is made.

## Focused and performance evidence

- Adjacent structural tests: 5/5.
- Worker milestone integration plus structural tests: 7 passed, 198 skipped.
- Sim-core narrative milestone reference: 5 passed, 17 skipped.
- Web TypeScript no-emit: passed.
- Production Vite/PWA build: passed, 3,035 modules.
- Bundle budget: passed; worker-core unchanged at 454,918 raw / 147,456 gzip.
- Required mutant: failed exactly at 8,385 player-ID reads versus `<=260`,
  then the restored source passed.
- Standard median total: 127,136.269375ms → 100,278.430167ms,
  improvement 21.125237778356032%.
- Standard median combined target: 88,044.107087ms → 53,691.869789ms,
  improvement 39.017077274751777%.
- Candidate V8 costs: 398,961µs, 353,496µs, 287,628µs; median improvement
  99.27786053251514% from the exact 48,951,209µs reference.
- Sole forecast-primary: exit 1, test timeout 2,400,000ms, external
  `real/user/sys 2766.15/1467.89/62.55`, no receipt.
- Full root tests, root typecheck, determinism, final production build, final
  Goal-18 run, and browser automation were not rerun after the mandatory stop.

## Sealed external evidence

- `comparison.json` SHA-256
  `d735b36a05688ebb1539ee03d93f356bbb373eadc5bbc1570450065134949d86`.
- `forecast.json` SHA-256
  `0789ba18dae53654df95913f4672bcfb8af39f6649bf6bb27f8895707473c617`.
- `provenance.json` SHA-256
  `c3607cde180590608e89b843f338c77102f7e8edb476c5e6c68e50c73d5b6588`.
- Forecast log SHA-256
  `d8b750d515868f3f8b47e64c49350bd29911185ccfd9187234d16e336e03723b`.
- Forecast time SHA-256
  `1514401775a2dbc299c84a762f980b92561ad211b36bbfdbe4cec0873a9a037e`.

Final Sol independently rehashed 23 provenance artifacts and nine CPU profiles,
recomputed every standard and selected-cost result, verified one primary/zero
continuation/zero retry, and found no actionable P0–P2 evidence issue.

## Remaining risks and rollback

- Heavy host descheduling is visible in wall versus user time. It makes
  intrinsic runtime uncertain but is contractually non-actionable because the
  external wall is authoritative and reruns are forbidden.
- The historical baseline did not record a V8 version; source-resolved profile
  attribution and the frozen fixed-reference calculation remain exact.
- The narrow optimization is a useful failed-slice artifact, not authorized
  production. Rollback is to discard the uncommitted source/test worktree diff;
  no save, migration, dependency, or deployed artifact requires reversal.
- Raw `/tmp` checkpoint/profile evidence should remain until the user decides
  whether to authorize a new bounded prerequisite or amend the wall contract.

## Relay retrospective

1. **Which uncertainty was discovered too late?** The adapter modeled the
   checkpoint producer and executing runtime as one Git identity, and the first
   protocol did not state how one baseline V8 sample supports a three-candidate
   median. The forecast modes were also absent until after local implementation.
2. **Which artifact or gate would have exposed it earlier?** A pre-production
   dry run that commits a no-op candidate runtime, validates the retained
   checkpoint under the new commit, and enumerates every final receipt field and
   formula would have exposed all three issues.
3. **Which relay role should have owned that question?** Sol architecture should
   own producer/consumer identity, exact sample-count math, and forecast receipt
   availability before Terra writes production code.
4. **Which phases should have remained sequential?** Adapter identity review,
   production freeze, production writing, committed disposable composition,
   standard candidates, V8 candidates, forecast primary, and continuation.
5. **Which read-only work could safely have run in parallel?** Source/test maps,
   baseline artifact hashing, call-graph inspection, bundle-budget inspection,
   and draft acceptance-matrix preparation before any writer started.
6. **Recommended route for a similar persistence/performance slice:** Sol first
   freezes a state/identity diagram and complete receipt schema; Luna proves a
   no-op committed end-to-end adapter dry run; Terra implements one source seam;
   Sol reviews; Luna runs serial standard/CPU/forecast gates; Sol audits the
   final artifact; Luna closes docs/Git only if every gate is green.
7. **Prioritized improvements:**
   1. Model checkpoint producer, executing runtime, and production candidate as
      three explicit identities before capture.
   2. Freeze sample counts and exact integer formulas beside every performance
      threshold before collecting baseline data.
   3. Run a committed no-op candidate through validation before expensive
      checkpoint capture or profiling.
   4. Implement and review final forecast receipt modes before production code.
   5. Record literal executed command lines and Node/V8 versions in every
      baseline provenance manifest.
   6. Separate CPU-selected-cost evidence from standard wall/stage pairs in the
      initial plan, not during candidate protocol review.
   7. Add an early full-horizon wall sentinel after the first bounded
      optimization so local seam success cannot be mistaken for sufficiency.

These are process recommendations only. No MBD workflow skill was rewritten.
