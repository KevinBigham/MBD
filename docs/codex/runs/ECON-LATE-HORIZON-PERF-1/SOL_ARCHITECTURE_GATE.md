# Sol Architecture Gate — ECON-LATE-HORIZON-PERF-1

Status: `BLOCKED — forecast-primary admission failed; production landing forbidden`.

## Oracle interpretation

Kevin's 2026-07-16 blanket continuation authorization is applied to the
narrowest source-grounded route that satisfies Goal 29's stop condition: one
new Goal 30. It does not reopen Goal 29's consumed loops or weaken Goal 18.

## Pre-implementation decision

The disposable adapter, authenticated season-29 checkpoint, three fresh
season-30 baselines, warm-up, and out-of-band V8 CPU sample are complete. Their
semantic, state, RNG, round-trip, and call-signature digests agree exactly.
Production editing is authorized only for the frozen seam below.

## Frozen adapter contract

- Continue the exact admitted season-15 artifact through canonical seasons
  16–29 in a disposable Goal-18 composition.
- Write one external season-29 artifact with `wx`; never commit raw data.
- Bind input/output source and tree, exact harness/profiler hashes, seed/mode/
  v35, ordered rows, state, RNG, row 29, continuation context, and envelope.
- Validate all bytes and context before `setState`.
- Stop before season 30 during capture.
- Run season 30 from fresh imports in fresh processes: one warm-up, three
  measured baselines, plus out-of-band V8 CPU attribution.
- Reuse Goal 29's profiler; no production profiler or public surface change.

## Exact late-profile adjudication

The conditional `checkMilestones` candidate is rejected: its nine-node
descendant union is 31,199.469ms, 24.065625% of the 129,643.295ms CPU-run
regular season. It does not meet the frozen 25% admission gate and receives no
rounding, rerun, attribution expansion, or waiver.

The admitted replacement is the single-module caller root
`apps/web/src/workers/sim.worker.milestones.ts::buildCareerMilestoneEvents`.
Its six non-overlapping regular-season roots total 48,951.209ms: 27,842.066ms
self, 20,965.059ms in its direct `checkMilestones` descendants, 76.000ms in
cumulative construction, and 68.084ms in other descendants. Its share is
37.758381%.

This caller-root attribution is accepted because the bounded implementation
directly removes both full-width lookup shapes inside that root: the full
player array supplied to `checkMilestones` for every career row and the second
player lookup used while mapping emitted moments. No
`queueCareerMilestoneMoments` time is included.

## Frozen production seam

Only `apps/web/src/workers/sim.worker.milestones.ts` and its new adjacent test
may change. Build cumulative stats exactly as today. Use canonical
`checkMilestones(cumulativeStats, [], season, day)` as a pure eligibility probe;
return before player access when no IDs qualify; filter `state.players` to
qualifying IDs in original order without collapsing duplicates; then run the
canonical check and event mapping over that narrowed array and the original
cumulative Map.

The existing public function signature, threshold policy, event order, prose,
first-match behavior, missing-player behavior, object property order, state,
RNG, saves, schemas, APIs, and history remain exact. `newsFeed.ts`,
`sim.worker.ceremony.ts`, and item 19 are out of scope.

The adjacent structural tests must prove zero player-ID reads for a no-milestone
population; at most `2N + 4` ID reads for 128 rows/players with one eligible
last player; preserved duplicate-first behavior; unchanged missing-player
suppression; and exact multi-milestone ordering/integration output. The
required negative control replaces the narrowed array in the final canonical
check with `state.players`; the bounded-read test must fail, after which the
correct implementation must be restored.

Exactly one Terra production writer is authorized. Production correction-loop
count is 0/2. Any multi-module need, third correction, semantic drift, bundle
growth, or band miss returns to Sol and stops.

## Exact candidate protocol freeze

The sealed baseline V8 sample is one fixed reference, not a one-sample median.
Its exact `buildCareerMilestoneEvents` caller-root union is `48,951,209µs`.
The minimum honest candidate matrix is one uncounted standard warm-up, three
fresh standard candidates C1–C3 paired ordinally with sealed B1–B3, and three
separate fresh V8 candidates. CPU-profiled processes may not double as standard
pair receipts, and no baseline process is rerun.

For every ordinal standard pair, candidate `regularSeason.total.inclusiveMs`
and candidate injury/news plus ticker/debut/consequences inclusive time must be
strictly less than the corresponding baseline. Using unrounded values:

- `1 - median(Ccombined) / median(Bcombined) >= 0.25`;
- `1 - median(Ctotal) / median(Btotal) >= 0.15`;
- `max(Ccombined) < min(Bcombined)`;
- `max(Ctotal) < min(Btotal)`.

Each candidate V8 root union must be strictly below `48,951,209µs`. The exact
90% gate is `10 * median(CV8-1, CV8-2, CV8-3) <= 48,951,209`. Attribution must
use outermost non-overlapping `buildCareerMilestoneEvents` frames resolving to
`sim.worker.milestones.ts` and sum each sample delta once. Missing or ambiguous
attribution fails; it is never interpreted as zero.

Schema-1 baseline and schema-2 candidate provenance intentionally differ. The
unchanged semantic digest, row-30 digest, state/RNG/round-trip digests,
stage-call signature, and complete row-30 subdomain digests must agree exactly.
The coordinator must attest a clean committed candidate runtime revision/tree;
the schema-2 receipt separately binds that runtime and the immutable checkpoint
producer `7238f4d6844361356513158c514ee7c5e1edf63c` /
`a9a8a8e1d98ecd48e46991eade243e2d27ebafee`.

## Forecast evidence freeze

The disposable adapter must add two reviewed fail-closed modes before forecast
execution:

- `forecast-primary`: canonical seed-7111 primary seasons 1–30, deliberately
  stopped only after the exact season-30 complete marker, with no replay;
- `forecast-continuation`: authenticate the retained season-15 artifact and run
  the existing exact 15→29 and 29→30 continuation helpers in one process.

This is an exceptional third bounded adapter loop authorized by the reproduced
P1 identity/evidence gap and the explicit bounded split rule. It stays in the
same Terra adapter thread, changes no production or Goal-18 source, and consumes
no production correction loop. It must receive a focused Sol review before a
forecast process runs.

For each external `/usr/bin/time -p` sidecar, convert `real` conservatively as
reported seconds times 1,000 plus 10ms. Boundary durations come from exact
progress callbacks. Both wall-minus-boundary overhead residuals must be
nonnegative. The conservative forecast equals the adjusted primary wall plus
the adjusted continuation wall and must be `<=2,040,000ms`, leaving at least
`360,000ms` below the unchanged 2,400,000ms ceiling. If the adjusted primary
wall already exceeds 2,040,000ms, do not run continuation.

## Frozen gates

- Three paired season-30 baselines/candidates, serial and fresh-process.
- Every pair improves; baseline/candidate ranges do not overlap.
- Median V8 subtree rooted at `buildCareerMilestoneEvents` improves >=90%.
- Median injury/news + ticker/debut/consequences improves >=25%.
- Median regular-season total improves >=15%.
- Row 30, deterministic state, raw RNG, contracts, payroll, population, free
  agency, lifecycle, roster, player/team/history/news, checkpoint, and content
  digests are exact.
- Structural negative control fails when the repeated lookup/work returns.
- Production core raw/gzip and all other bundle ceilings remain unchanged.
- Forecast <=2,040,000ms before the sole final full run.
- Final Sol verdict requires zero actionable P0–P2.

## Adversarial questions

1. Is singleton state exactly the artifact state before any season-30 action?
2. Does resumed row 30 equal continuous row 30 byte-for-byte?
3. Does runtime normalization hide any non-runtime drift?
4. Does the narrowed original-order player array preserve duplicate first-match
   behavior and avoid cross-save state?
5. Did iteration or RNG order change despite equal aggregates?
6. Was work skipped, sampled, pruned, reordered, or moved outside timing?
7. Is the improvement present at season 30, not only season 16?
8. Does forecast include checkpoint/import/validation and 15% reserve?
9. Did disposable code enter production, snapshot, public API, or receipt?
10. Are protected main edits and item 19 untouched?

## Stop conditions

Stop on admission ambiguity, no single >=25% actionable path, semantic/RNG/
save drift, bundle failure, overlapping timing ranges, forecast miss, exhausted
two-loop budget, final-review finding, or final 40-minute failure. No retry,
timeout increase, band change, or item-19 continuation follows.

## Final gate outcome

Disposable runtime `226120ac8a732a786f5ca2c5c4101ee1d65918f5`
preserved every semantic/state/RNG/round-trip/row/call digest. All three ordinal
standard pairs improved, with median regular-season reduction
21.125237778356032% and combined-stage reduction 39.017077274751777%; ranges
did not overlap. Candidate V8 costs were 398,961µs, 353,496µs, and 287,628µs;
the 353,496µs median improved 99.27786053251514% against the exact 48,951,209µs
reference.

The sole forecast-primary process then timed out at the unchanged 2,400,000ms
test ceiling, emitted no JSON receipt, and recorded `real 2766.15`. The frozen
centisecond adjustment makes primary alone 2,766,160ms: 726,160ms above the
entire 2,040,000ms forecast cap and 366,160ms above the final ceiling.
Continuation was correctly not run. No boundary or combined forecast was
fabricated.

Final Sol verdict: `BLOCK_CONFIRMED`, zero actionable P0–P2 evidence findings.
Host descheduling makes intrinsic runtime uncertain but does not change the
authoritative external-wall/no-retry contract. The production source and test
remain uncommitted and unlanded; full root gates, final Goal 18, and item 19 did
not start.
