# ECON-FA-DECISIONS-1 — Explainable Free-Agent Decisions

## Objective

Finish TRUE GOAT roadmap item 16 with one deterministic player-side free-agent
decision authority shared by user and CPU offers. Contract value, age-shaped
security preferences, a roster-backed projected MLB opportunity, factual
contender status, persisted loyalty, and symmetric clubhouse reputation must
produce the winning offer and the exact explanation shown after durable save
and in the Press Room. Preserve exact-save authority, roster and budget laws,
old-save facts, seeded RNG, and the bounded item-15 economy. Do not begin salary
retention item 17 or the item-18 30-season soak.

## Live-source contract

- GameSnapshot remains v34 and Dexie remains v6. `freeAgencyMarket` and
  `offseasonState` remain compatible with their supported runtime shapes; no
  persisted contract promise, decision-history backfill, or migration is
  expected.
- The worker is canonical and Zustand remains a UI mirror. Queries may derive a
  preference preview from canonical facts but may never mutate the market,
  player, RNG, save, or news.
- A Goal-16 "role promise" means the club's honest, current-roster-backed
  **projected MLB opportunity at signing**. It is constrained by actual
  positional need and followed by the existing immediate MLB assignment. It is
  not an editable or guaranteed future playing-time promise. Roadmap item 28
  retains ownership of persistent playing-time promises and usage effects.
- Contender status uses only completed standings and playoff facts. Hidden
  potential, prospect ceiling, CPU strategy labels, user identity, and
  difficulty are not player-side contender evidence.
- Loyalty uses only persisted team-tenure history plus a homegrown origin/bond
  when both exist for that team. Missing old-save facts contribute zero and are
  never reconstructed.
- Clubhouse appeal is the same `70%` team chemistry plus `30%` front-office
  free-agency reputation for every club. User-only fan sentiment, GM spending
  philosophy, difficulty, and hidden identity are excluded.
- CPU bid construction may retain its existing budget, need, relationship,
  organization-posture, and seeded offer/timing RNG. The final player choice
  and user acceptance must use the same pure evaluator. Interactive user timing
  need not imitate the CPU's daily market clock. Existing user payroll guidance
  remains advisory; Goal 16 does not create a new hard user payroll cap.

## Frozen decision model

All factor inputs are clamped to `[0, 1]`. Money is in millions. Pure decision
evaluation consumes no RNG.

### Career-stage weights

Each row's nonfinancial ceiling is exactly `12%` of market value, so contract
money remains dominant while age changes what can close a bounded gap.

| Career stage | Age | Term security | Projected opportunity | Contender | Loyalty | Clubhouse |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| rising | `<= 28` | `3.5%` | `3.5%` | `1.5%` | `2.0%` | `1.5%` |
| prime | `29–31` | `2.5%` | `2.5%` | `3.0%` | `2.5%` | `1.5%` |
| veteran | `>= 32` | `1.5%` | `1.5%` | `5.5%` | `2.0%` | `1.5%` |

### Factual inputs

1. `termSecurity = clamp((years - 1) / 4, 0, 1)`. Years beyond five do not
   create additional preference credit.
2. Current positional need produces the non-editable projected opportunity:
   `featured` for need `>= 75` with factor `1.00`; `regular` for `50–74` with
   factor `0.65`; and `depth` below `50` with factor `0.25`.
3. Contender factor is `1.00` for the defending champion, `0.85` for another
   playoff club, `0.70` for a non-playoff club with at least 90 wins, `0.50`
   for another club at or above `.500`, and `0.25` for a losing club. Missing
   or incomplete factual standings produce `unknown` and factor `0`, not an
   invented neutral history.
4. `loyalty = min(1, min(5, longestPersistedTenureSeasons) * 0.12 +
   homegrownBond * 0.40)`. `homegrownBond` is the persisted bond fraction only
   when the persisted origin team matches the offer team; otherwise it is `0`.
5. `clubhouse = clamp(round(chemistry * 0.70 + reputationAppeal * 0.30),
   0, 100) / 100` for user and CPU clubs alike.

### Score, acceptance, and ordering

For each factor `i`, `contribution_i = marketValue * stageWeight_i * factor_i`.

`equivalentAav = round4(offerAav + sum(contribution_i))`

`minimumEquivalentAav = round4(marketValue * 0.90)`

A valid competitive offer is acceptable exactly when `equivalentAav >=
minimumEquivalentAav`. Contract years must be an integer from `1` through the
live `MAX_CONTRACT_YEARS` limit of `10`. A factor can never excuse an invalid
contract, unavailable player, absent roster slot, unaffordable CPU bid, blocked
qualifying-offer cost, or noncanonical market. The interactive user path retains
the pre-existing advisory owner-budget policy rather than gaining an item-16
hard cap.

CPU offers sort by equivalent AAV descending, actual AAV descending, years
descending, then team ID ascending. Offer generation iterates teams in stable
team-ID order so equivalent inputs and RNG state are independent of `Map`
insertion order. The evaluator never forks or advances RNG.

### Explanations

- Every evaluation returns the career stage, exact score/floor, factor
  contributions, stable reason codes, projected opportunity, contender facts,
  loyalty facts, and one factual summary.
- Competitive acceptance and Press Room copy name the actual AAV and the
  highest contributing truthful preference. Equal contributions use the fixed
  order: term, opportunity, contender, loyalty, clubhouse.
- Rejection reports the exact equivalent-AAV shortfall without claiming a
  motive that did not enter the score.
- A forced end-of-market minor deal uses the distinct `market_exhausted` reason
  and never invents role, contender, loyalty, or clubhouse preference.
- Historical signings retain their existing historical copy. Goal 16 explains
  only new decisions made after the feature is active.

## Required behavior

1. One pure evaluator owns competitive offer scoring for both user and CPU
   signings. Identical player, offer, and factual context produce byte-equivalent
   evaluation regardless of `userTeamId` or difficulty.
2. Age-boundary twins prove the frozen curve: rising players place more weight
   on term/opportunity than veterans, while veterans place more weight on
   contender status; the total nonfinancial ceiling stays exactly `12%`.
3. The projected opportunity is derived from current canonical MLB positional
   need and displayed as a projection. No user or CPU club may promise a richer
   role than its current roster facts support, and no copy claims future usage
   enforcement.
4. Contender evidence comes only from standings/playoff facts. Changing only
   hidden potential, ceiling, CPU strategy, difficulty, or user identity cannot
   change the player decision.
5. Loyalty comes only from persisted tenure and matching homegrown origin/bond.
   A non-origin club receives no homegrown credit; missing old-save tenure/bond
   facts contribute zero without fabrication.
6. Team chemistry and front-office reputation remain bounded, separately
   attributable, and symmetric. User-only fan or spending modifiers cannot
   affect the player decision.
7. Actual offered salary is both evaluated and persisted. Difficulty may not
   substitute an unseen salary for the terms the player signs.
8. CPU selection is stable across offer and map permutations, uses the exact
   tie-break order, and consumes no new decision RNG. Existing seeded offer and
   timing randomness remains seeded and reproducible.
9. Rejected or invalid offers leave player, market, roster, offseason result,
   qualifying-offer state, news, briefing, achievements, exact snapshot, and RNG
   unchanged.
10. Accepted user and CPU decisions update the same canonical player, contract,
    roster, market, offseason, and qualifying-offer seams already owned by the
    market. CPU affordability, active-roster capacity, and compensation law
    remain gates; user payroll guidance remains advisory exactly as before.
11. One accepted decision produces one reason-bearing signing news item. The
    existing generic signing/consequence paths may not shadow, contradict, or
    deduplicate away the authoritative explanation.
12. The accepted user result is published only after the exact post-mutation
    snapshot is durable. Persistence failure retries only the retained snapshot
    or fails closed; it never reruns the signing or publishes a false reason.
13. The offer panel shows career-stage priorities and the user's current
    projected opportunity, contender, and loyalty facts before submission.
    Accepted and rejected results remain keyboard reachable, screen-reader
    announced, mobile readable, and non-occluding.
14. Press Room displays the same persisted factual explanation after hard
    reload. CPU signings receive the same explanation contract as user signings.
15. Current-v34 and all supported old/deep saves preserve facts. Import/query
    does not create decision history. A new signing after migration evaluates
    current available facts and persists only its new explanation.
16. A four-seed/four-season current-schema study records every competitive and
    market-exhausted signing, inputs, contributions, reason codes, age stage,
    user/CPU counts, contracts, payroll, legality, and RNG digests. It requires
    100% reason coverage for competitive signings, exact `market_exhausted`
    classification for forced deals, and zero unsupported facts, duplicates,
    invalid roles, unaffordable CPU acceptances, over-capacity outcomes, or
    canonical-market violations. Every CPU acceptance records its exact
    same-day pre-signing payroll and spending limit.
17. The study retains the item-15 economy envelopes: market size `450–1089`,
    total signings `21–58`, meaningful signings `21–57`, top AAV `$20M–$45M`,
    and payroll spread `$25M–$350M`. No minimum organic category-incidence claim
    is invented before measurement. Item 18 retains the 30-season proof.
18. A fresh production browser journey inspects a controlled preference
    preview, proves an under-floor rejection has no durable mutation, accepts a
    factor-backed offer, observes truthful `Saved`, finds the exact reason in
    Press Room, hard reloads, and verifies the player/contract/reason exactly
    once. It also observes one CPU reason and inspects desktop and `375x667`
    presentation with zero retry/flaky classification.
19. No unrelated gameplay, schema, dependency, route, bundle ceiling, trade,
    roster-generation, organization-identity, difficulty, or later-roadmap
    behavior changes.

## Acceptance matrix

| ID | Acceptance | Required proof |
| --- | --- | --- |
| FAD-1 | Pure bounded age-shaped evaluator | exact factor/weight/score/floor tests; no RNG |
| FAD-2 | Factual opportunity/contender/loyalty | source-builder twins; missing-fact and hidden-truth controls |
| FAD-3 | Symmetric user/CPU authority | identical-context parity; actual salary equality; no difficulty/user modifiers |
| FAD-4 | Deterministic selection | offer/map permutations; fixed tie-break; seeded repeatability |
| FAD-5 | Atomic legal signing | rejection digest; budget/slot/QO gates; coherent accepted tuple |
| FAD-6 | Truthful durable explanation | one reason-bearing news/briefing path; exact-save retry/fencing; hard reload |
| FAD-7 | Honest compatibility | v34 fixed point; supported matrix; compact-v33 new-signing proof; no backfill |
| FAD-8 | Bounded economy | four-seed/four-season study, literal decision rows, retained item-15 bands |
| FAD-9 | Accessible production UX | pre-offer facts; desktop/mobile keyboard/focus/non-occlusion; Press Room |
| FAD-10 | Repository safety | focused/root gates, adversarial review, exact staged scope, local-only landing |

## Negative controls

At least one deliberate regression must fail and be restored before closeout.
The primary control zeros the role, contender, and loyalty weights; controlled
factor-winner and reason-correspondence tests must fail. Retain hostile controls
for removed team-ID tie-breaking, hidden-potential leakage, difficulty/user
identity leakage, generic reason replacement, evaluated/persisted salary drift,
rejected-state mutation, and missing durable explanation.

## Scope cut line

No enforceable playing-time/lineup promise, contract-schema field, save-version
bump, reconstructed historical motive, unified organization identity, difficulty
redesign, market-intelligence rewrite, salary retention/cash item 17, item-18
30-season soak, new route, dependency, push, deploy, tag, publication, or
release. Stop and seek a new oracle decision only if completion requires one of
those materially broader authorities.

## Done

Every new user or CPU free-agent decision uses one deterministic, symmetric,
fact-backed model; age, projected opportunity, contender status, and loyalty can
change a bounded choice; the exact accepted explanation survives durable save
and reload in Press Room; economy and legal gates pass; adversarial review has
zero P0–P2 findings; and only roadmap item 16 is committed and fast-forwarded
onto local `main`.
