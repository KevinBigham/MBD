# ECON-CLOCK-1 — Sol Pre-implementation Architecture Gate

## Oracle authorization and resolution — 2026-07-12

Kevin explicitly authorized amendment of Goal 11 and its run artifacts to
resolve all three scope contradictions found by this gate:

1. Goal 11 proves no Goal-11-caused roster regression; Goal 12 remains the sole
   owner of legal Day-One 26/40 rosters, affiliate balance, initial minor
   contracts, zero-violation generation, and the permanent roster CI gate.
2. Authentic compact-v33 compatibility and current-schema full-league economy
   soak are separate, mandatory receipts; neither substitutes for the other.
3. Exact no-double-clock invariants plus finite, multi-seed, multi-season
   population measurements replace any asymptotic population-bound proof.

The authorization supersedes only the conflicting Goal-11 acceptance language.
It does not expand Goal 11 into arbitration, qualifying-offer expansion,
revenue/budget redesign, extension AI, salary retention, trades, Goal 12, or a
later roadmap item. The original `REPLAN` findings remain valuable source
constraints, but these three oracle questions are resolved and may not be
reopened. Terra remains gated only on the numeric population bands being frozen
below by this same Sol thread.

## Relay receipt

- Thread: `019f552e-4389-7501-8f16-a1256dcd1824`
- Model: `gpt-5.6-sol`
- Effort: `xhigh`
- Role: read-only pre-implementation architect
- Initial verdict: `REPLAN`
- Initial findings: P0/P1/P2 = `0/5/0`
- Authorized continuation verdict: `BANDS_FROZEN` + `ARCHITECTURE_READY`
- Final architecture findings: P0/P1/P2 = `0/0/0`
- Writes: none

## Five P1 findings

1. `ensureOffseasonState()` is not the only null-to-live creator; the draft-pick
   path can create the marker and bypass the clock. In-place clocking before the
   marker is also not exception-atomic.
2. Releasing expiries at clock time destroys extension/QO former-team authority,
   while current `years <= 1` QO eligibility would admit exercised options.
3. Literal 26/40 legality is impossible in Goal 11: the measured new-game
   baseline is 32 teams at 28 MLB and 84 derived 40-man entries each, and the
   existing auto-fill does not normalize it. Repository governance independently
   assigns the permanent zero-violation generation gate to Goal 12 and records
   that later goal as pending after Goal 11, so folding it into this slice would
   both violate ownership and invert merge order.
4. The real v33 season-10 fixture is one player with no schedule or roster
   states; it cannot satisfy full-league two-offseason economic bands.
5. Current draft intake and age-gated retirements prevent a 6–10-season soak
   from proving an asymptotic bound on retained low-overall minors.

## Conditional approved ordering

| Stage | Contract |
| --- | --- |
| Null-to-live offseason entry | Immutably precompute clock, option outcomes, factual news/story flag, and state; commit with marker last through the sole creator. |
| Clock | Process non-retired players with positive years; zero-year players remain byte/ownership identical. |
| Team option | At one year, exercise iff calculated value is at least annual salary; exercise leaves one, decline leaves zero; consume only team option; zero RNG. |
| Arbitration/tender/extensions | Keep team assignment intact and run existing mechanisms. |
| QO | Require assigned MLB, existing service/value rules, and `years <= 0`; mutations revalidate live state. |
| FA entry | Resolve QOs, capture the canonical market while predicates still match, then release exactly captured entrants and rebuild affected rosters. |
| Signing | Operate only from persisted canonical market; reject null market without snapshot/RNG changes. |
| Rollover | Preserve existing development/retirement/reset/autofill behavior; do not claim Goal 12 roster legality. |

The runtime `GeneratedPlayer` roster-level union has no `FREE_AGENT` value even
though the broader contracts schema accepts one. Released entrants must use the
existing unassigned runtime status and market membership as free-agent truth;
Goal 11 may not add a new runtime/schema value.

## Conditional pure function

`packages/sim-core/src/finance/contracts.ts` may expose a pure immutable
`advanceContractForOffseason(player, yearsOfService)` returning the next player,
previous/next years, and one of:

- `unchanged_zero`
- `advanced`
- `expired`
- `team_option_exercised`
- `team_option_declined`

It must not mutate input, consume RNG, interpret player options/opt-outs, or
change historical `totalValue`.

## Authorized proof contract

- Pure clock transitions, equality boundary, symmetry, input immutability, zero
  RNG, zero-year byte equality, and player-option/opt-out non-interference.
- Proceed/auto/skip/direct/imported-null offseason entry, repeated ensure,
  alternate-creator closure, and precompute-throw rollback.
- QO former-team preservation, exercised-option exclusion, live mutation
  revalidation, and released-player rejection.
- Resolve-QO → capture → release market order, canonical player equality,
  roster rebuild, query/offer null-market purity, imported-market idempotence,
  and no empty-team roster key.
- Real compact v33 migration/import/export/no-fabrication proof, kept separate
  from deterministic full-league economic soak.
- At least three deterministic current-schema full-league seeds across 6–10
  seasons measuring expiries, options, market size, churn, payroll, newly
  ineligible expiries, total/minor/major/free-agent populations, annual
  entrants/exits, first-half and second-half slopes, curvature, snapshot bytes,
  unique ownership, and no Goal-11-caused roster regression.
- Deliberately failing double-clock and unreleased-market-entrant mutants,
  restored green before final gates.
- Existing Finance/FA/Offseason surfaces plus public-import production browser
  lanes for option outcome/reload and expiry→FA→sign/reload.

## Binding implementation conditions

The authorized goal/plan now explicitly:

1. assigns literal Day-One 26/40 legality to its existing Goal 12 owner and uses a
   no-Goal-11-regression invariant here;
2. separates authentic compact-v33 compatibility from full-league economy
   proof;
3. narrows the population assertion to exact no-double-clock plus measured
   finite counts/slopes against the frozen bands below, leaving pruning out of
   scope;
4. adopts QO-safe market-entry release ordering; and
5. makes one helper the sole atomic offseason-state creator.

No v35/schema field, roster/autofill rewrite, farm pruner, new route/phase,
option-decision UI, RNG policy, Goal 12 implementation, or adjacent economy work
is authorized.

## Persistence and retry contract

- The worker remains canonical. Clocked players, option consumption, the
  factual activation beat, and the non-null offseason marker are one coherent
  worker snapshot; the marker is committed last after immutable precomputation.
- Existing TRUST-A exact-snapshot persistence is the only durable lane. A failed
  write leaves that exact snapshot pending/retryable and may not report `Saved`;
  retry persists it without rerunning the gameplay mutation or the clock.
- Reload after a durable snapshot observes the marker and cannot decrement
  again for that league year. Reload before a failed snapshot becomes durable
  restores the prior coherent durable state; a later rollover deterministically
  recomputes the same outcomes rather than applying a second decrement to a
  partially durable state.
- Imported null-state offseasons enter through the same sole creator. Imported
  non-null offseason state is already processed for its league year and is not
  retro-clocked.

## Population-growth bands

Status: `BANDS_REFROZEN_POST_IMPLEMENTATION` on 2026-07-12 by Sol thread
`019f552e-4389-7501-8f16-a1256dcd1824`; architecture verdict
`ARCHITECTURE_READY`, P0/P1/P2 `0/0/0`.

The raw pre-clock artifact is [POPULATION_BASELINE.md](./POPULATION_BASELINE.md):
seeds 7111, 7112, and 7113, six real worker rollovers each, 1/1 measurement
test passed in 810.43 seconds, temporary test deleted. The post-implementation
current-schema matrix then passed all 18 rollovers in 894.07 seconds with full
receipt SHA-256
`34f2d653f434c8235e18da9375f24d46145c72347d5f2ca94d2d30cbcc569c0e`.
The latter artifact, not the dead-clock baseline, freezes the permanent bands.

### Measurement formulas

Use the same three seeds. Let `P0` be new-game population and `Pk` be preseason
Day 1 immediately after rollover `k`, for `k=1…6`. Let `T(k)`, `M(k)`, `L(k)`,
and `U(k)` be total, assigned-minor, assigned-MLB, and unassigned population.
Let `E(k)` be IDs newly present, `X(k)` be IDs removed, `N(k) = E(k) - X(k)`,
and `B(k)` be `estimateSnapshotSize(exportSnapshot())`.

For any metric `x`:

```text
firstSlope(x)  = (x(3) - x(0)) / 3
secondSlope(x) = (x(6) - x(3)) / 3
curvature(x)   = secondSlope(x) - firstSlope(x)
```

Every individual seed and the cross-seed mean must pass. If the final soak runs
8–10 rollovers, the first six remain the frozen gate window; later annual flows
must pass the annual bands and are additionally reported.

### Frozen population and flow bands

| Metric | Minimum | Maximum | Application |
| --- | ---: | ---: | --- |
| Initial total | 5,408 | 5,408 | Exact for fixed seeds; generation is out of scope |
| Initial assigned minors | 4,512 | 4,512 | Exact |
| Initial assigned MLB | 896 | 896 | Exact; not a legality claim |
| Initial unassigned | 0 | 0 | Exact |
| Total after rollover `k` | `5,408 + 527k` | `5,408 + 639k` | `k=1…6`; cumulative net-growth envelope |
| Assigned minors after rollover | 4,199 | 5,675 | Absolute six-rollover band; clock-driven partition movement is nonlinear |
| Assigned MLB after rollover | 134 | 896 | Absolute six-rollover band; not a 26/40 legality claim |
| Unassigned after rollover | 58 | 3,831 | Absolute six-rollover band |
| Draft entrants/year | 640 | 640 | Exact: 20 rounds × 32 teams |
| IFA entrants/year | 0 | 16 | Baseline observed 1–11 |
| All entrants/year | 640 | 656 | Draft plus IFA only |
| Exits/year | 6 | 120 | Post-clock observed 25–101 plus frozen margin |
| Net growth/year | 527 | 639 | Post-clock observed 546–620 plus frozen margin |
| Canonical market at FA entry | 1 | 1,089 | Post-clock observed maximum 961 plus frozen margin |
| Remaining market after FA phase | 0 | 1,047 | Post-clock observed maximum 924 plus frozen margin |

The exact 640 draft entrants come from 20 rounds × 32 teams. Goal 11 does not
alter draft/IFA entry or age/rating/RNG retirement; clock, capture, and release
must conserve canonical population.

### Frozen slope and curvature bands

All values are per rollover.

| Metric | First-half slope | Second-half slope | Curvature |
| --- | ---: | ---: | ---: |
| Total | 578 to 615 | 545 to 578 | -55 to -16 |
| Assigned minors | 38 to 80 | 213 to 268 | 150 to 214 |
| Assigned MLB | -192 to -142 | -64 to -11 | 96 to 162 |
| Unassigned | 685 to 730 | 337 to 380 | -374 to -323 |
| Snapshot bytes | 5,923,127 to 6,191,304 | 5,144,121 to 5,456,289 | -925,784 to -595,601 |

Every seed and the cross-seed mean must stay inside these finite bands. The
partition curves reflect the newly live expiry/release clock; they do not claim
asymptotic boundedness. Acceleration outside the frozen curvature bands fails
even when the final absolute population remains inside its envelope.

### Exact invariants

These cannot be waived by a calibration range:

- player IDs are globally unique;
- `total = assignedMinor + assignedMLB + unassigned`;
- every new ID is attributable to exactly one draft selection or accepted IFA
  signing; draft entrants equal 640; `delta total = entrants - exits`;
- clock, QO, market capture, and release conserve canonical population;
- clock applies once per player/league year, years never go negative, and every
  pre-existing zero-year player stays byte- and ownership-identical;
- option decisions equal the exact eligible one-year/team-option input set;
  exercise plus decline exactly partitions decisions and no player is in both;
- clock/option RNG delta is zero;
- market IDs are unique and equal the exact post-QO eligible set;
- every entrant releases at most once; duplicate clock, option, FA entry,
  unexplained entrant, unexplained exit, and unexpected assignment-change
  counts are zero;
- no new roster-invariant category appears; and
- persistence retry writes the held exact snapshot without rerunning the clock.

### Calibration failures and report-only metrics

The soak fails when any individual seed or the mean leaves a population, flow,
slope, curvature, byte, or market band; total curvature exceeds +40; byte
curvature exceeds +1,000,000; market size is at least 900; or any unexplained
Goal-11-attributable population increase occurs.

The following remain mandatory report-only metrics because no honest tighter
absolute preimplementation band exists: natural MLB expiries; eligible and
ineligible minor expiries; option count/exercise rate; QO results; assignment
churn/vacancies; FA signings/unsigned carryover; per-team MLB/derived-40 counts;
payroll under its independent finance bands; and rollovers 7–10. Their exact
relational invariants still apply: expiry counts equal the pre-clock one-year
outcome sets, churn is fully attributable, and option outcomes partition the
eligible option set.

### Baseline comparison rule

Do not require assigned MLB/minor/unassigned byte equality because natural
expiry intentionally redistributes those partitions. For every same-seed
rollover, compare canonical IDs and entry/exit attribution; assert conservation
through clock/QO/capture/release; record assignment changes by ID; subtract the
exact accepted outcome sets (expiry, QO, FA signing, non-tender, Rule 5,
extension, and existing autofill); require the unexplained set to be empty; and
compare roster violations by category. A legitimate expiry vacancy is an
economy outcome. Duplicate assignment, a stale roster reference, a two-team
player, or a new invariant category is a Goal-11 regression.
