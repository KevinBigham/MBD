# ECON-LATE-HORIZON-HISTORY-PERF-1 — Bounded Multi-Seam Successor

Current status: `ACTIVE — landable source frozen and source-reviewed;
replacement paired diagnostic sealed/check-only; fresh Sol diagnostic review
pending; no paired diagnostic or final proof has run`.

## Player-facing outcome

After this lands, a player can advance a decades-old dynasty through free
agency, news processing, prospect debuts, and season rollover substantially
faster while receiving exactly the same baseball decisions, financial facts,
stories, RNG state, save facts, and durable history.

The player makes no new decision in this prerequisite. Its durable consequence
is that the existing long-save economy journey can complete inside the
unchanged item-18 performance contract without weakening the simulation.

## Authority

Kevin authorized the Sol-approved proposal at
`/tmp/mbd-goal31-multiseam-successor-plan.md` exactly as written. That authority:

- locally landed the exact 17-path documentation-only Goal-31 stop record as
  `198759d88815d977f47672f7e1f5f0cb5ee4f0aa`;
- permits this new Goal-32 successor slice and only the named source, test, and
  disposable proof paths;
- permits paired non-landed baseline/successor diagnostic compositions;
- permits one no-retry paired `R/P/H` diagnostic on authenticated
  post-season-15 and season-30-input data;
- permits one no-retry final proof/admission only when that diagnostic is
  green.

The authorization does not weaken any cap, gameplay, RNG, save, schema,
receipt, seed, horizon, or retry contract. R41 and custom recovery-lineage
machinery remain permanently prohibited. Roadmap item 19, remote push,
deployment, release, publication, and tagging remain closed.

## Required base and preserved evidence

- Required base/local main:
  `198759d88815d977f47672f7e1f5f0cb5ee4f0aa`.
- Predecessor origin/main:
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`.
- Stopped Goal-31 source:
  `4e016cc4fe3043e438cc0cbc3aeec798b6f47d6b`.
- Stopped Goal-31 proof composition:
  `2f3329b0886396cd9d8550aa42ea2738d02c4126`.
- Stopped Goal-31 adjusted forecast:
  `2,948,890ms`, correctly rejected against the immutable `2,040,000ms`
  aggregate cap.

The original Goal-31 worktree, proof composition, and evidence root remain
untouched and evidence-only. The exact Goal-31 milestone/ceremony source and
adjacent-test blobs may be imported into this branch, but their failed forecast
may never be relabeled as a pass.

## Landable production scope

Only these production paths may change:

1. `packages/sim-core/src/finance/tradeFinance.ts`
2. `packages/sim-core/src/finance/contracts.ts`
3. `packages/sim-core/src/finance/index.ts`
4. `packages/sim-core/src/index.ts`
5. `apps/web/src/workers/sim.worker.tradeFinance.ts`
6. `apps/web/src/workers/sim.worker.helpers.ts`, limited to
   `buildFreeAgencyPayrolls`, its declaration-only named module export for the
   repository-owned proof, and its same-day caller
7. `packages/sim-core/src/narrative/newsFeed.ts`
8. `apps/web/src/workers/sim.worker.farm.ts`
9. `apps/web/src/workers/sim.worker.narrativeFarm.ts`
10. the byte-preserved Goal-31 milestone/ceremony source pair

Only the test paths named in the run plan may change. Goal/run/status/changelog
documentation is allowed. Any additional production, caller, test,
instrumentation, or proof path requires a bounded Sol addendum and new
authority before editing.

## Required behavior

### League payroll projection

Create one pure operation-local projection for the exact requested team IDs,
player-array contents, trade history, finance season, and current plus five
future seasons. Build it immediately before one `simulateFADay`; use it only
for that day's pre-signing team-payroll map; discard it before
`applyNewFreeAgencySignings`; rebuild it the next day.

`calculateTeamPayroll` remains the authoritative single-team parity oracle.
There is no process-global, worker-global, save-backed, persisted, or
cross-day cache.

### News deduplication

Decorate each input item once with its timestamp rank, related-player key, and
stable input position. Preserve the exact existing priority/timestamp/ID
ordering, first-winner rule, malformed-timestamp behavior, duplicate player
IDs, original `NewsItem` references, and stable input-first behavior when the
full comparator ties.

### Prospect-debut lookup

Build one operation-local player lookup with first-write-wins semantics, because
the existing `players.find` chooses the first duplicate ID. Preserve bond
iteration and sorting, debut order, milestone IDs, loyalty values, and
unchanged-object behavior.

### Season-end micro-arc indexes

Build operation-local, player-indexed current-season news and trade facts once.
Preserve outer player order, first related-player semantics for call-up news,
history/asset order, duplicate observations, strict score comparison,
plain-object team insertion order, copy, moment IDs, salience, dedupe, and
idempotence. No derived index enters the save.

## Acceptance

1. Payroll projection is deep-equal to the canonical single-team oracle for all
   32 teams, current season, and all five future commitment years, including
   retained salary, cash consideration, released contracts, return-to-payer,
   credits, dead money, tax payroll, and cap space.
2. User and CPU organizations use the same projection semantics.
3. News output is exact deep-equal for empty, unique, duplicate,
   equal-priority, malformed-timestamp, duplicate-player-ID, permuted
   distinct-ID, and full-comparator-tie fixtures.
4. Prospect-debut result and final bonds are exact deep-equal for missing,
   duplicate, already-debuted, MLB-without-stats, hitter, pitcher, and mixed
   fixtures.
5. Micro-arc output and final state are exact deep-equal for no-news, no-trade,
   duplicate-history, missing-player, tied-candidate, duplicate-player, and
   repeated-invocation fixtures.
6. Rejected and no-op paths remain snapshot- and RNG-inert.
7. All four structural negative controls fail their deliberate mutant and pass
   after restoration.
8. The exact Goal-18 state, RNG, round-trip, population, season, receipt, and
   checkpoint digests remain unchanged.
9. The one diagnostic uses the exact authenticated post-season-15 and
   season-30-input states and satisfies `R >= 1,010,890ms` and
   `P <= 1,938,000ms`; otherwise execution stops without retry.
10. Only after criterion 9, one final admission may run. Its adjusted primary
    plus permitted continuation must be `<= 2,040,000ms`, and each process
    must be `<= 2,400,000ms`.
11. Root typecheck, full tests, determinism, production build/PWA, and required
    reload/browser proof pass on the landable source revision.
12. Independent final Sol review returns zero actionable P0–P2 findings.

## Stop conditions

Stop without retry or reinterpretation if:

- exact semantics, source identity, composition identity, or negative controls
  fail;
- the diagnostic is not green;
- the final forecast/admission exceeds an unchanged cap;
- a fifth production seam or any unnamed path appears necessary;
- save/schema, gameplay, RNG, receipt, seed, horizon, or public-contract change
  appears necessary;
- two corrections fail from the same defect family.

## Done

The four exact seams and preserved Goal-31 source are locally landed from a
source-bound clean revision; focused, negative-control, diagnostic, final
admission, root, build, determinism, and browser gates are green; every
acceptance criterion is mapped in `COMPLETION.md`; local `main` contains the
verified commit; remote and release state remain unchanged; and item 18 may
resume from live landed source. Item 19 remains closed until item 18 itself
passes.
