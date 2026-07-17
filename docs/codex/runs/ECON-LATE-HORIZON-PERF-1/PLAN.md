# ECON-LATE-HORIZON-PERF-1 Execution Plan

Status: `BLOCKED — sole forecast-primary attempt exceeded the frozen admission ceiling`.

## Objective and player outcome

Make the trustworthy 30-season economy proof finish within its existing hard
ceiling by removing one newly measured late-save algorithmic cost without
changing a single game, contract, player, save, RNG draw, or receipt fact.

Active goal: `docs/codex/goals/30_ECON_LATE_HORIZON_PERF_1.md`.

## Live source truth

See `SOURCE_TRUTH.md`. This branch is cleanly based on local `main` at
`cd5e9191118aee76d22d66b7ffed32fed748cae8`; Goal 18 remains isolated and
unlanded. GameSnapshot is v35, Dexie is v6, and the core gzip budget has zero
headroom.

## Scope and non-goals

- Owned docs: Goal 30, this run directory, bounded campaign status,
  `CHANGELOG.md`, and later completion evidence.
- Disposable-only integration scope: Goal-18 test support and one test-only
  late-checkpoint/profile adapter in a dedicated composition worktree; complete
  and retained only for external proof.
- Permanent production scope:
  `apps/web/src/workers/sim.worker.milestones.ts` plus one adjacent test.
- Admitted production candidate: the `buildCareerMilestoneEvents` caller root,
  using canonical eligibility probing and an original-order narrowed player
  array; no edit to `checkMilestones` itself.
- Hard cut: no Goal-18 receipt/validator/band/horizon/checkpoint/replay/timeout
  change, no schema/API/UI/dependency/gameplay/RNG/history/pruning change, no
  item 19 or broad item 98, no push/deploy/tag/release/publication.

## Behavioral invariants

- Worker remains canonical; timing cannot influence or persist simulation.
- Same ordered inputs produce identical moments, prose, IDs, state, and RNG.
- Duplicate player IDs preserve the existing first-match lookup behavior;
  missing players remain suppressed exactly as before.
- Exact continuous and resumed season-30 facts agree.
- Raw artifacts stay outside Git and are admitted before singleton state.
- The unchanged 40-minute in-process run remains the only sufficiency proof.

## Design decision

Create Goal 30 rather than amend Goal 29. Goal 29's two-loop failure is durable
history; relabeling another patch as its correction would erase the evidence.

The disposable Goal-29 adapter derived one authenticated season-29 state from
the retained season-15 artifact. Five fresh season-30 processes then established
exact baseline semantics and V8 attribution. The original `checkMilestones`
candidate was rejected at 24.065625%. Sol admitted the single-module
`buildCareerMilestoneEvents` caller root at 37.758381%, because the bounded
algorithm removes both full-width lookups performed inside that root without a
cache, public-contract change, or second production module.

## Milestones

| # | Checkpoint | Owned files/artifact | Proving gate | Status |
| ---: | --- | --- | --- | --- |
| 1 | Reconcile source and freeze Goal-30 contract | goal/run/status docs | clean preflight; three read-only maps agree | completed |
| 2 | Build hostile disposable late-state adapter | isolated composition only | focused adapter tests; source/tree/context forgeries fail before state install | completed |
| 3 | Create one season-29 artifact | unique `/tmp` output | exact season15→29 rows/state/RNG; stop before season30 | completed |
| 4 | Profile exact season 30 | three baseline receipts + V8 sample | path >=25%; identical semantic/call signatures | completed |
| 5 | Sol production freeze | `SOL_ARCHITECTURE_GATE.md` | exact function/file/tests and bands named | completed |
| 6 | Terra implementation and negative control | one frozen module + adjacent test | focused exactness/typecheck/bundle; mutant fails then restored | completed |
| 7 | Paired late profiles and readiness forecast | external receipts only | 3 B/C pairs; 3 candidate V8 samples; bands; `forecast <= 2_040_000ms` | blocked: local bands passed; primary wall failed |
| 8 | Root gates and final Sol review | frozen branch | full gates green; zero P0–P2 | stopped before full gates; blocker audit 0 P0–P2 |
| 9 | Luna closeout and local landing | docs/changelog/status/Git | exact scope; local main FF; protected dirt untouched | docs-only blocker closeout; production forbidden |
| 10 | One unchanged Goal-18 run | Goal-18 WIP + unique `/tmp` receipt | exact valid 30+15 receipt < 2,400s, or blocker stop | not run after forecast stop |

## Acceptance matrix

| Requirement | Artifact | Proof | Status |
| --- | --- | --- | --- |
| Exact season-29 identity | external checkpoint envelope | hostile admission matrix and v35 round trip | complete |
| Late path is measured | season-30 stage + CPU receipts | 3 exact baselines; admitted caller root 37.758381% | complete |
| No semantic/RNG drift | paired row/state/subdomain digests | 3 B/C pairs plus 3 V8 receipts exact | complete |
| Redundant lookup cannot return | adjacent structural negative control | old/bypass mutant failed 8,385 reads vs <=260 | complete |
| Real speedup | paired receipts | CPU 99.2779%, combined 39.0171%, total 21.1252%, nonoverlap | complete |
| Production safety | focused/full/typecheck/build/PWA/bundle/determinism | focused/typecheck/build/bundle green; full gates stopped | incomplete by stop |
| Sufficiency | reviewed forecast then unchanged Goal-18 command | primary timed out; adjusted wall 2,766,160ms | failed |

## Progress log

1. Live preflight confirmed local main, Goal-18 dependency, failed log, retained
   checkpoint, protected dirt, v35/Dexie6, and exact bundle ceiling.
2. Three read-only swarm lanes returned `FREEZE_READY`, `MAP_READY`, and
   `NEW_GOAL_READY`. Requested model/effort routing was not host-pinned.
3. At the pre-profile checkpoint, the conditional candidate was the repeated
   player-array scan in `checkMilestones`; production remained blocked until
   exact season-30 proof and was later re-planned as recorded below.
4. The disposable adapter passed 58 focused tests plus hostile source/tree/
   context/state/RNG/output validation; its exact two-file commit is
   `7238f4d6844361356513158c514ee7c5e1edf63c` and will never land.
5. The one-time season-16-to-29 capture passed 4/4 in 1,932.59s and wrote
   `/tmp/mbd-econ-late-horizon-perf-1-20260716-season29.json` with raw SHA-256
   `a29f2e5df30284cdb5358ac3aa758b6d6c3bf9615e789214de1183ec67079360`.
6. Three serial season-30 baselines, one warm-up, and one CPU process all
   produced identical row/state/RNG/round-trip/call-signature facts.
7. Sol rejected `checkMilestones` at 24.065625% and admitted only its single
   owning `buildCareerMilestoneEvents` root at 37.758381%, with all numeric
   gates unchanged.
8. Terra implemented the exact two-file production seam. The required mutant
   failed at 8,385 player-ID reads versus an allowed 260, the restored focused
   tests passed, and worker-core remained exactly 454,918 raw / 147,456 gzip.
9. The first disposable adapter conflated checkpoint-producer and executing
   runtime identities. No candidate ran. The same adapter writer committed a
   schema-2 provenance split at
   `30587883c3bfff46149568e4cc87018973940cbf`; real-artifact hostile validation
   passed, and Sol returned `ADAPTER_READY` with zero P0–P2.
10. Sol froze B1→C1/B2→C2/B3→C3 standard pairing, three separate candidate V8
    samples against the one sealed fixed reference, and the exact two-process
    forecast formula. No baseline rerun or CPU/standard receipt reuse is allowed.
11. The same Terra adapter writer added the bounded forecast-only modes at
    `639ebec412159c605bd327457de21a7004b5e899`; focused tests passed 18/18
    with two intentional skips, the real season-15 hostile matrix passed 8/8,
    and Sol returned `ADAPTER_READY` with zero P0–P2.
12. Disposable runtime `226120ac8a732a786f5ca2c5c4101ee1d65918f5`
    produced three exact standard candidates and three exact V8 candidates.
    Median total improved 21.125237778356032%, combined target time improved
    39.017077274751777%, and selected V8 cost improved 99.27786053251514%.
13. The sole forecast-primary attempt exited nonzero at the unchanged
    2,400,000ms test timeout and wrote no receipt. External real time was
    2,766.15s; the frozen +10ms adjustment yields 2,766,160ms, already 726,160ms
    above the complete forecast cap. Continuation, full gates, final Goal-18,
    landing, and item 19 were not run.
14. Final Sol blocker audit independently reproduced every standard/V8 value
    and returned `BLOCK_CONFIRMED`, zero actionable P0–P2. The production
    source/test remain uncommitted and unlanded.

## Decision log

1. Preserve Goal 29 as blocked history; create Goal 30.
2. Persist no season-29 data in source or Goal-18 receipts.
3. Use one serial writer and one disposable composition; no overlapping writer.
4. Require 15% forecast headroom because Goal 29's paired timings varied by
   roughly 9.7% and the final run includes in-process replay/GC conditions.
5. Browser proof is not applicable because UI and persistence ownership are
   forbidden scope; exact snapshot round-trip and production PWA build remain.
6. The external wall is authoritative even when host descheduling is visible.
   The one-attempt/no-retry contract forbids reclassification or rerun.
7. A passing narrow optimization does not authorize landing when the horizon
   admission gate fails.

## Completion conditions

These conditions are unmet. The frozen forecast miss is recorded as the blocker;
there is no retry, production commit, Goal-18 run, or item-19 continuation.
