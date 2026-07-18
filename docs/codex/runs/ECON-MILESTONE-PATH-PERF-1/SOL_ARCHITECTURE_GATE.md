# Sol Architecture Gate — ECON-MILESTONE-PATH-PERF-1

Status: `NEW_BOUNDED_SPLIT_READY`; faithfully transcribed from
`/tmp/mbd-econ-milestone-path-perf-1-sol-route-20260718.md` on 2026-07-18.

## Frozen boundary

This new item-18 prerequisite begins from clean
`main@ace5068f0f49a1195c2937461fe8ad7f04d8d3d8`. It owns only
`buildCareerMilestoneEvents` in `sim.worker.milestones.ts` and
`queueCareerMilestoneMoments` in `sim.worker.ceremony.ts`, plus their adjacent
tests. The retained Goal-30 dirty worktree must not be copied, staged, edited,
or landed. No third production module is allowed.

## Exact algorithm

For each consumer independently: (1) compute cumulative stats as current main;
(2) call `checkMilestones(cumulativeStats, [], season, day)`; (3) return its
existing empty result with zero player-ID reads if no player ID qualifies; (4)
use qualifying IDs only for membership, filtering `state.players` in original
array order and retaining duplicates; (5) make the final canonical
`checkMilestones` call with that narrowed array; and (6) preserve clean-main
mapping/queue semantics exactly. The probe only omits display-name resolution;
eligibility derives from cumulative stats. No cache, handoff, new state, policy
copy, reorder, RNG change, mechanic suppression, or approximation is legal.

## Exactness and negative controls

Tests must prove: zero reads when no row qualifies; `<= 2N + 4` reads for 128
players/rows with only the final one qualifying; duplicate original-order and
first-match behavior; exact missing-player suppression; multi-player/moment
JSON property/order identity; ceremony's exact user-team ID/title/subtitle/
description/timestamp/related-ID/dedupe behavior; and exact return/state/RNG
behavior on controlled fixtures. For each final canonical call, temporarily
restore full-width `state.players`; its structural test must fail, then the
candidate must be restored before receipts or commits.

## Sealed baseline and bands

Reuse validates source/provenance hashes first. Sealed clean-main V8 roots are
48,951,209us (build), 24,549,831us (ceremony), 73,501,040us non-overlapping
combined, and 127,114,740us `simToPlayoffs` (57.8225939808%). New candidates:
one warm-up; standard C1–C3 ordinally paired with sealed B1–B3; three separate
V8 samples from identical season-29 bytes. Every standard candidate must lower
its baseline `regularSeason.total` and `injuryNews + tickerDebutConsequences`;
ranges may not overlap; median combined-stage improvement is >=60%; median total
improvement >=40%. Every V8 root is below its corresponding sealed root, and:

`10 * median(build) <= 48,951,209`; `10 * median(ceremony) <= 24,549,831`; and
`10 * median(non-overlapping combined) <= 73,501,040`.

Attribution is source-resolved outermost-frame descendant union, sampling each
delta once, with `simToPlayoffs` as denominator. All season-30 row/state/RNG/
round-trip/contracts/payroll/population/free-agency/lifecycle/roster/player/team/
history/news/checkpoint/public-surface/stage-call/subdomain/content digests must
be identical for continuous and resumed paths.

## Forecast and stop rules

After candidate evidence only, run exactly one `forecast-primary`; only if it
passes, run exactly one authenticated continuation. Convert each `/usr/bin/time
-p` real duration to milliseconds then add 10ms/process; primary plus
continuation must be <=2,040,000ms. No Goal-30 forecast may be relabeled or
reused. Maximum two bounded production correction loops (current 0); stop and
return to Sol on a third loop, third module, algorithm/band/forecast change,
semantic drift, negative-control failure, source/provenance mismatch, bundle
growth, a band miss, or forecast miss. Do not run full repository gates before
source freeze.
