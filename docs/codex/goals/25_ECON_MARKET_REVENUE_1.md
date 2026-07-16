# ECON-MARKET-REVENUE-1 — Market Revenue and Next-Season Budgets

## Objective

Finish TRUE GOAT roadmap item 15 by replacing the timing-dependent budget
prototype with one deterministic annual market-revenue settlement. Market size,
the completed regular-season record, and a fixed playoff-berth bump must produce
an explicit modeled gross-revenue statement that feeds every organization's
next-season owner budget and existing allocation fields. Preserve exact-save
persistence, user/CPU symmetry, item-14 payroll/tax truth, old-save facts, and
bounded long-save economics. Do not begin roadmap item 16 or the item-18
30-season soak.

## Live-source contract

- GameSnapshot remains v34 and Dexie remains v6. Existing `OwnerState` budget
  fields, season archives, standings, playoff facts, story flags, news, and
  briefing receipts are sufficient; no new save field or migration is expected.
- The worker is canonical and Zustand remains a UI mirror. A query may derive a
  settled or neutral statement from persisted facts, but may never change it.
- This is modeled gross operating revenue. The source has no actual attendance
  counts, ticket prices, stadium capacity, cash, treasury, revenue sharing, paid
  tax, or structured revenue-history ledger. Player-facing language must not
  claim those systems exist.
- `TEAM_MARKETS` and `getTeamBudget()` own the fixed market baseline. A live
  league team with no explicit market mapping is invalid; reconciliation must
  not silently fall back to the small-market midpoint.
- Final 162-game standings own the record-driven modeled attendance effect. Any
  playoff berth receives the existing flat `3.5%` bump; round-specific payouts
  are not source-grounded and remain deferred.
- Persisted `OwnerState.archetype` owns the allocation posture. The user-only GM
  philosophy rewrite of `spendingWillingness`, owner satisfaction, fan
  sentiment, difficulty, payroll, projected tax, and prior budget are excluded
  from canonical revenue.
- The first exact Offseason Advance/Skip from an uninitialized `season_review`
  is the only annual settlement owner. Regular-season owner refreshes, press or
  series consequences, queries, import, and ordinary playoff autosave may not
  rewrite budget fields.

## Frozen formula

All money is in millions and rounded once to cents at each named output.

1. `marketBaseline` is exactly `$315M` large, `$240M` medium, or `$175M`
   small from the explicit team-market table.
2. `attendanceRate = clamp(((wins - losses) / 162) * 0.08, -0.08, 0.08)`.
3. `attendanceRevenue = marketBaseline * attendanceRate`.
4. `playoffRate = madePlayoffs ? 0.035 : 0` and
   `playoffRevenue = marketBaseline * playoffRate`.
5. `grossRevenue = marketBaseline + attendanceRevenue + playoffRevenue`.
6. The allocation factor is `1.12` for `win_now`, `1.00` for
   `patient_builder`, and `0.90` for `penny_pincher`.
7. `annualBudget = grossRevenue * allocationFactor`;
   `payrollCap = annualBudget * 0.92`;
   `draftBonusPool = max(4.5, annualBudget * 0.03)`;
   `ifaBonusPool = max(3.5, annualBudget * 0.0225)`; and
   `staffBudget = max(7.5, annualBudget * 0.0525)`.
8. `owner.expectations.payrollTarget` equals the same `payrollCap`. No second
   cap or hidden resource line is created.

## Required behavior

1. Every organization receives one pure statement from its explicit market,
   final 162-game record, playoff qualification, and canonical owner archetype.
   Same inputs produce byte-equivalent output and consume no RNG.
2. Market tiers/counts remain exactly `8 large / 14 medium / 10 small`, with
   baselines `$315M / $240M / $175M`. Once a postseason artifact exists,
   missing teams, incomplete records, duplicate standings, incomplete playoffs,
   or nonfinite owner inputs fail before any canonical mutation. An authentic
   compact old save with no league-wide postseason artifact defers revenue to
   its next factual completed season rather than fabricating facts or blocking
   its existing contract clock.
3. At equal market and owner identity, a `100-62` playoff team receives more
   gross revenue and budget than an `81-81` non-playoff team, which receives
   more than a `62-100` non-playoff team. At equal record/playoff/owner facts,
   large exceeds medium, which exceeds small.
4. The attendance effect is bounded `[-8%, +8%]`; the playoff rate is exactly
   `0%` or `3.5%`; the pre-cent-rounding gross/baseline ratio stays
   `[0.92, 1.115]`. Displayed gross revenue stays `$161.00M-$351.23M`,
   controlled annual budget stays `$144.90M-$393.38M`, and payroll cap stays
   `$133.31M-$361.91M`.
5. Settlement precomputes all 32 statements, owner replacements, normalized
   receipt flags, and user presentation before committing any mutation. The six
   financial fields move atomically and remain immediately coherent with the
   item-14 soft ceiling.
6. Exactly one stable `market_revenue_budget_reconciled_s<season>` receipt
   exists per team and season. Repeating Advance/Skip, retry, reload, resume, or
   query cannot recursively compound, duplicate stories, or consume RNG.
7. Receipt validation repairs hostile partial state to the pure canonical
   result: stale owner fields, missing/duplicate flags, or a missing half of the
   user news/briefing pair. Receipt presence alone may not suppress repair.
8. Settlement runs inside the established exact-save worker session and
   persistence lease. Pre-acceptance failure restores the baseline; accepted
   snapshot failure retries only that retained object or fails closed. A stale
   callback for another save may not settle, export, or persist.
9. Ordinary `evaluateOwnerState()` and `applyOwnerDecisionDelta()` preserve all
   six financial fields. Owner trust/firing narratives may change satisfaction
   or confidence, but not canonical annual economics.
10. User and CPU teams use identical revenue and allocation rules. Changing
    only `userTeamId`, difficulty, GM philosophy, satisfaction, fan sentiment,
    payroll, or projected tax leaves the canonical statement and raw budget
    unchanged.
11. Current-v34 and supported old/deep saves preserve facts. A save entering an
    uninitialized or still-`season_review` offseason with complete league and
    postseason facts settles that season on its first exact Advance/Skip. A
    compact save with no league-wide postseason artifact, or a save already past
    `season_review`, waits until the next completed season. Import/query never
    backfills or fabricates prior statements.
12. CPU extensions, CPU free agency, IFA allocation, staff/draft allocations,
    trade budget posture, item-14 policy, and user budget displays consume the
    reconciled fields. At least one controlled downstream CPU contract case
    differs only because the higher lawful revenue budget can fund it.
13. Finance plus the existing Owner Intel/Offseason context show one consistent
    vocabulary: market baseline, record-driven modeled attendance effect,
    playoff bump, modeled gross revenue, owner allocation, raw next-season
    budget, and effective gameplay budget where applicable. Projected tax stays
    separate and is never described as paid or deducted.
14. Historical financial archives retain the budget used for that completed
    season and never relabel it as revenue. New archives record raw owner budget,
    not the user-only difficulty overlay. No structured revenue history is
    invented.
15. The bounded study covers four deterministic seeds across four completed
    seasons and exactly 32 teams per season: 512 literal statements/receipts.
    It records all formula inputs/outputs, allocations, payroll, affected economy
    metrics, owner/franchise/contract/roster/RNG digests, first/second-half
    budget slopes, and any acceleration signal.
16. The study retains the current affected-economy guards: opening MLB payroll
    `$3.8B-$6.8B`, average MLB salary `$2.5M-$8.5M`, payroll spread
    `$25M-$350M`, average meaningful signings at least `1.5`, average top AAV
    `$20M-$45M`, and the item-14 pressure-incidence bands. The measured item-15
    hard envelopes are annual mean budget `$255M-$275M`, free-agent market
    `450-1089`, total signings `21-58`, meaningful signings `21-57`, top AAV
    `$20M-$45M`, and accepted extensions `8-80`. The salary band is an opening-
    generator gate, not a post-offseason annual claim.
    Settlement-caused nonfinancial owner,
    franchise, contract, payroll, roster, or parent-RNG changes must be zero.
17. A fresh-production browser journey completes a season, opens the exact
    offseason transition, verifies the final record/playoff inputs and 32-team
    durable settlement, observes the next-season budget and allocations, hard
    reloads, and verifies the same singular facts. Desktop and 375x667 conflict-
    free controls remain readable, keyboard reachable, contained, and
    non-occluding.
18. No unrelated gameplay, schema, dependency, route, bundle ceiling, owner
    distribution, difficulty, or later roadmap behavior changes.

## Acceptance matrix

| ID | Acceptance | Required proof |
| --- | --- | --- |
| MRB-1 | Pure explicit market statement | exact formula/boundary/tier tests; same-input digest; zero RNG |
| MRB-2 | Final-record and berth causality | controlled win/loss and playoff twins; exact cents and monotonic ordering |
| MRB-3 | One atomic annual authority | uninitialized `season_review` Advance/Skip; 32 precomputed updates; no midseason rewrite |
| MRB-4 | Idempotent hostile-state repair | duplicate/missing receipts, stale owner, half-story, retry/reload/resume tests |
| MRB-5 | Symmetric truthful inputs | user/difficulty/philosophy/satisfaction/payroll/tax swap negative controls |
| MRB-6 | Exact-save causal boundary | retained baseline/post snapshot, rollback, retry-only persistence, stale-save fencing |
| MRB-7 | Real budget consumers | CPU extension/FA affordability, IFA/pools, trade/policy, and surface agreement |
| MRB-8 | Honest compatibility/history | v34 fixed point, supported old/deep saves, phase-bound activation, raw archive budget |
| MRB-9 | Bounded calibration | four-seed/four-season 512-statement study plus affected-economy guards and slopes |
| MRB-10 | Production and repository safety | fresh desktop/mobile durable journey, reload-smoke, focused/root gates, scoped landing |

## Negative controls

At least one deliberate regression must fail and be restored before closeout.
The primary control bypasses settlement at exact offseason activation; the
32-receipt, next-budget, and downstream-contract assertions must fail. Retain
hostile controls that use prior budget as the base, inject difficulty or
satisfaction, ignore receipt repair, supply invalid standings/bracket/market
facts, fail persistence, replay a stale save callback, and change payroll/tax
while holding canonical inputs fixed.

## Scope cut line

No actual attendance counts, ticket pricing, capacity, stadium economics, cash,
treasury, revenue sharing, settled tax expense, round-tier playoff payouts,
multi-year persisted revenue ledger, owner-distribution redesign, difficulty
redesign, explainable free-agency item 16, salary retention item 17, 30-season
item 18 soak, schema bump, new route, dependency, push, deploy, tag,
publication, or release. Stop and seek a new oracle decision if completing the
player-facing requirement requires one of those absent economic authorities.

## Done

Market, completed record, and a playoff berth causally produce one symmetric,
bounded, exact-save next-season budget for all 32 organizations; every real
consumer and player-facing surface agrees; old saves and historical facts stay
honest; the 4x4 economy study and production reload proof pass; adversarial
review has zero P0-P2 findings; and only roadmap item 15 is committed and
fast-forwarded onto local `main`.
