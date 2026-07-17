# ECON-LONG-SAVE-PERF-1 — Exact Long-Save Runtime Prerequisite

Current status: `BLOCKED — post-landing sufficiency gate missed`.

## Objective

Unblock Goal 28 without weakening it. Measure the canonical worker path that
made the corrected seed-7111 economy diagnostic complete only 17 primary
seasons before its fixed 40-minute ceiling, optimize only proven hot paths, and
prove that the exact 30-season primary plus checkpoint-15 replay receipt can
complete within the unchanged `2_400_000ms` gate with no gameplay, RNG, save,
receipt, or calibration drift.

This is a bounded prerequisite for roadmap item 18. It is not wholesale
completion of roadmap item 98 and does not begin item 19.

## Oracle authority

Kevin authorized this exact route on 2026-07-16 after reviewing
`docs/codex/runs/ECON-LONG-SOAK-1/ORACLE_REQUEST.md` on the dependent Goal-28
branch. The authorization permits:

- out-of-band, test-only worker stage timing;
- one exact source/digest/RNG-bound current-schema season-15 profiling
  checkpoint;
- one read-only architecture/profile freeze;
- one implementation writer with at most two semantics-neutral correction
  loops;
- final root gates, one adversarial review, closeout, and local landing;
- then exactly one Goal-18 seed-7111 diagnostic under the original 40-minute
  ceiling.

It does not authorize a timeout increase, a different receipt architecture,
band widening, item 19, remote push, deployment, tag, release, or publication.

## Live-source contract

- Branch from clean local `main`; the unfinished Goal-18 harness branch remains
  unlanded until this prerequisite lands independently.
- GameSnapshot remains v35 and Dexie remains v6. No migration is expected or
  authorized.
- Worker state remains canonical. Timing data never enters worker state, a
  snapshot, annual row, receipt, deterministic digest, RNG, or public Comlink
  contract.
- The profile must measure the real worker path. Plausible seams—including MLB
  simulation, affiliate-day simulation, roster normalization, narrative/
  morale/chemistry/payroll, signature moments, records, offseason phases, and
  checkpoint export—are hypotheses until measured.
- The exact season-15 artifact is diagnostic input, not a game fixture. It must
  bind its immutable producer revision/tree, seed, save schema, complete
  serialized-state digest, RNG state/digest, and the Goal-18 checkpoint-15
  annual row. Each profile also binds an explicit consumer revision/tree;
  consumers may differ only when every semantic/context digest matches. Any
  mismatch fails closed before profiling.

## Required behavior

1. Add an opt-in, test-only profiler that attributes canonical worker runtime by
   stable phase name without persisting data or changing production behavior
   when disabled.
2. Prove disabled profiling is byte- and RNG-identical to the pre-slice path.
   Profiler calls may observe monotonic wall time only; no duration may influence
   simulation branching, ordering, IDs, state, or receipt content.
3. Capture exactly one current-schema season-15 profiling checkpoint from the
   authorized Goal-18 seed-7111 path. Record its source revision and hashes; do
   not commit raw player/save data when a local artifact and digest receipt are
   sufficient.
4. Profile the identical late-horizon checkpoint and publish a ranked stage
   report. Sol must freeze the actual hot paths, exact editable files, and
   correction gates before production optimization begins.
5. Optimize only measured hot paths. Allowed changes are semantics-neutral
   indexing, memoization within one operation, removal of provably redundant
   recomputation, or equivalent bounded algorithmic work that preserves call
   order and observable results.
6. Preserve every organization, player, affiliate, game, phase, market action,
   lifecycle outcome, narrative fact, record, history fact, and deterministic
   RNG draw. Do not skip, sample, suppress, reorder, or approximate mechanics to
   manufacture speed.
7. Do not introduce automatic archive/prune behavior, alter history retention,
   reduce the 30-season primary horizon or checkpoint-15 replay, change Goal-18
   rows/receipts/checkpoints/validators/bands, or change save schema.
8. Compare before/after on identical checkpoint, seed, source mode, machine, and
   command. Report each stage; do not claim improvement from a synthetic helper
   that does not execute the production path.
9. Reject every production change unless focused exactness tests and the Goal-18
   two-year reference reproduce rows plus state, RNG, contracts, payroll,
   population, free-agency, subdomain, and content digests exactly.
10. After source freeze, run root typecheck, full tests, production build/PWA,
    determinism verification, and final adversarial review with zero actionable
    P0–P2 findings.
11. Land this prerequisite locally on `main`, integrate it into the Goal-18
    branch without rewriting unrelated work, and run exactly seed 7111 under the
    original `2_400_000ms` external gate.
12. The prerequisite is sufficient only if that original Goal-18 diagnostic
    emits a valid exact 30-season/checkpoint-replay receipt within 40 minutes.
    If exactness drifts or the gate is missed after two correction loops, stop.

## Proof

- Profiler unit tests prove opt-in behavior, stable nesting/aggregation, disabled
  no-op behavior, and no profiler output in a v35 export.
- Checkpoint tests prove exact capture/reload and fail-closed rejection for
  source, seed, state, RNG, schema, or annual-row mismatch.
- Focused worker tests prove identical state and RNG with profiling disabled and
  enabled around the same deterministic operation.
- Identical before/after stage receipts identify the measured improvement and
  preserve the stage set.
- The Goal-18 horizon-2 reference stays within its 90-second external ceiling
  and reproduces every canonical row and digest byte-for-byte.
- Root typecheck, full tests, production build/PWA, and determinism verification
  pass after source freeze.
- Final Sol review reports `MERGE_READY` with zero actionable P0–P2 findings.
- The unchanged Goal-18 seed-7111 diagnostic produces and validates its full
  receipt within 40 minutes.

## Scope cut line

No gameplay tuning, schema/Dexie/UI/route/dependency/public-worker-contract
change, receipt redesign, calibration-band change, automatic pruning, roster
generation, aging, trade AI, difficulty change, broad item-98 budget framework,
item 19 work, remote push, deployment, tag, publication, or release.

## Done

The measured canonical long-save worker path is faster without any semantic or
deterministic drift; all focused and root gates pass; final review is clean; the
prerequisite lands independently; and the existing Goal-18 seed-7111 proof emits
its exact valid receipt within the unchanged 40-minute ceiling.

The landable Goal-29 source, exact checkpoint/profile evidence, corrected-tree
horizon proof, root gates, and final Sol review are complete. The status above
is blocked because the sole dependent run reached 30 primary starts but only 29
primary completions before the exact external 40-minute alarm. It emitted no
replay marker or JSON receipt. Both authorized correction loops are exhausted;
the Done contract is not achieved. Further work requires a newly bounded
performance split or explicit contract amendment, not a retry or timeout change.
