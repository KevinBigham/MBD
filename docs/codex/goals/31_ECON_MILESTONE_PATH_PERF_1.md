# ECON-MILESTONE-PATH-PERF-1 — Exact Combined Milestone Production Path

Current status: `BLOCKED — correction-loop budget exhausted before matrix completion`.

## Objective

Unblock the item-18 forecast admission path without weakening it by making the
two independently measured late-season career-milestone consumers avoid
full-population display-name work while preserving every observable simulation
fact exactly.

This is a new bounded prerequisite after Goals 29 and 30. It supersedes neither
their history nor their evidence. It neither retries Goal 30's failed forecast
nor begins item 19.

## Authority and scope

- Base is clean `main@ace5068f0f49a1195c2937461fe8ad7f04d8d3d8`.
- GameSnapshot remains v35 and Dexie remains v6; no schema or migration is
  authorized.
- Only these production paths may change:
  `apps/web/src/workers/sim.worker.milestones.ts`,
  `apps/web/src/workers/sim.worker.ceremony.ts`, and their adjacent tests.
- Goal/run/status docs and a separately committed disposable proof runtime are
  allowed. Raw checkpoints, profiles, and timing receipts stay outside Git.
- No third production module, public API, UI, dependency, game mechanic, RNG,
  ordering, history, Goal-18 validator/band/receipt/checkpoint/horizon, timeout,
  pruning, main landing, remote operation, or item-19 work is authorized.

## Required behavior

For each consumer separately, build cumulative stats as it does today and:

1. Call `checkMilestones(cumulativeStats, [], season, day)` as the eligibility
   probe.
2. If it emits no player ID, return the consumer's existing empty result before
   reading any player ID.
3. Use qualifying IDs for membership only, filter `state.players` in original
   array order while retaining duplicates, then call `checkMilestones` again
   with that narrowed original-order array.
4. Preserve the clean-main mapping/queue behavior, including first-match and
   missing-player behavior, user-team filtering, event/prose/ID/property order,
   timestamps, and ceremony dedupe.

No cache, handoff, new state, skipped mechanic, reordered iteration, RNG draw,
or approximation is permitted.

## Proof and admission

Adjacent tests prove zero player-ID reads when ineligible; `<= 2N + 4` reads
for 128 rows with only the final qualifying ID; duplicate-first semantics;
missing-player suppression; exact multi-moment JSON; and exact ceremony
properties and user-team filtering. A full-width final-call mutant must fail in
each consumer and be restored before any receipt or commit.

After exact source/hash/provenance validation, run one new candidate warm-up,
three fresh standard candidates C1–C3 ordinally paired with sealed B1–B3, and
three fresh V8 candidates from identical season-29 bytes. Every exact semantic
digest must match. Standard and V8 bands, including the combined-root median
band, are frozen in the architecture gate. Run one new forecast-primary and
only its one continuation when primary permits it. The combined adjusted wall
must be `<= 2,040,000ms`; failure stops this goal without retry or reinterpretation.

## Done

Docs-first and source-freeze commits exist separately; the four allowed source/
test paths use the frozen algorithm; focused semantic/structural, candidate,
V8, bundle/build, and forecast receipts are green; the worktree is clean; and
the candidate is ready for the prescribed Sol review. Full repository gates and
landing are deliberately later-phase work.
