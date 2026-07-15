# ECON-EXTENSION-AI-1 — Identity-Driven CPU Extensions

## Objective

Finish TRUE GOAT roadmap item 13 by making every CPU organization evaluate and
proactively retain its own core players during the canonical offseason
extension phase according to its persisted current-GM personality and permitted
live team state. Preserve real budgets, the shared player-side negotiation
rules, exact-save persistence, deterministic outcomes, and factual history. Do
not begin roadmap item 14 or complete roadmap item 49's permanent cross-domain
franchise identity.

## Live-source contract

- GameSnapshot remains v34 and Dexie remains v6. The persisted
  `gmPersonalities` map, player contracts/history, serialized offseason state,
  and news/archive surfaces are sufficient; no schema bump is expected.
- Persisted GM personality is the durable extension identity axis. The derived
  `TeamBuildingArchetype` is current competitive-window context, not permanent
  franchise DNA. Goal 23 does not claim unified draft/development/trade/market
  identity or complete roadmap item 49.
- The existing `extensions` phase-entry worker batch is the only automatic CPU
  writer. No monthly, query-time, UI-side, or rollover extension engine may be
  added.
- Sim-core owns pure candidate ranking, terms, player response, and contract
  results. The worker owns validated league application and factual receipts.
  Zustand remains a UI mirror.
- Identity may change whom a club prioritizes, desired term, and bounded team
  concessions. It may not change player demand, acceptance thresholds, player
  ratings, market value, actual budget, or gameplay outcomes.
- Automatic CPU extension processing remains inside the established exact-save
  Offseason Advance/Skip session. The separate manual multi-round user
  negotiation persistence redesign is outside this CPU-only slice.

## Required behavior

1. CPU automation runs only when entering `extensions`, at most once for a
   terminal team/player result, and never automates the user club.
2. A CPU organization may evaluate and mutate only an active MLB player
   canonically assigned to that organization. Team membership, roster level,
   tenure ownership, ratings, and development facts never change as side
   effects.
3. With identical players, live team facts, budget, and seed, different
   persisted GM personalities produce a bounded, testable priority, term, or
   concession difference. Same identity and inputs produce identical results.
4. Personality affects only the team decision. Player willingness, demand,
   valuation, acceptance thresholds, and response RNG remain shared and
   identity-neutral.
5. Exact `serviceTimeDays` owns service/control calculations. The legacy years
   map cannot overrule it. Hidden prospect potential/ceiling cannot influence
   extension identity or decisions.
6. Team-scoped deterministic RNG binds outcomes to algorithm version, season,
   team, and candidate facts. Changing only `userTeamId`, team iteration, player
   storage order, or unrelated RNG consumption cannot remap another CPU club's
   result or advance the parent RNG.
7. Affordability replaces the player's existing AAV rather than double-counting
   it. No identity relaxes the actual owner budget, creates money, or permits an
   over-budget terminal contract.
8. Accepted terms atomically update one canonical player contract, one matching
   extension-history fact, one phase result, and factual news/archive input.
   Rejection leaves the contract unchanged and retains one matching factual
   attempt/history result.
9. Imported current-season extension aggregates are validated before phase RNG
   or mutation. Duplicate, empty, orphaned, wrong-team, illegal-term, or
   accepted contract/history mismatch state fails closed. Historical rejected
   rows that predate CPU rejected-history recording remain honest and are not
   backfilled with invented facts.
10. Retry, reload, resume, repeated phase calls, and persisted terminal results
    cannot duplicate or reroll a player outcome. A pure no-candidate/no-budget
    evaluation creates no false transaction or persistence claim.
11. The public manual mutation revalidates live user-team ownership, player
    assignment, legal finite terms, terminal status, and runtime session
    identity before RNG or mutation. A stale or forged CPU-player callback is a
    byte- and RNG-identical rejection.
12. Offseason phase entry retains one exact worker session and persistence lease
    from baseline through exact post snapshot and durable receipt. Pre-acceptance
    failure restores the baseline; post-acceptance failure retries only the
    retained snapshot or fails closed without rerunning extension decisions.
13. Existing Offseason ledger, News/Press Room, Player History, and archive
    projections show only factual durable outcomes. No motive history is
    fabricated for older saves.
14. Bounded multi-seed evidence reports eligible, attempted, accepted, rejected,
    term/AAV, budget, duplicate, identity-divergence, and determinism results.
    The existing healthy league-wide accepted-extension band remains enforced;
    roadmap item 18 still owns the 30-season economy soak.
15. A fresh production browser journey enters the extension phase, observes a
    seeded CPU extension, waits for the exact durable save, hard reloads, and
    verifies the exact contract/history/result remains once-only. Relevant
    desktop and 375x667 surfaces remain readable and keyboard reachable.
16. Current-v34 and supported old-save migration/export/import paths preserve
    existing GM personalities and extension facts without fabricated history.
17. No unrelated gameplay, schema, dependency, route, bundle ceiling, or later
    roadmap item changes.

## Acceptance matrix

| ID | Acceptance | Required proof |
| --- | --- | --- |
| EXT-1 | Legal proactive phase ownership | pure + worker own-team/MLB/user-exclusion/phase-entry tests |
| EXT-2 | Durable identity changes bounded team choices | constructed persisted-personality priority/term/concession divergence |
| EXT-3 | Identity-neutral player rules and no hidden truth | shared demand/acceptance assertions; potential-only and legacy-service negative controls |
| EXT-4 | Stable scoped determinism | same-input, storage permutation, user-team swap, unrelated-RNG, and parent-RNG identity tests |
| EXT-5 | Real replacement-budget accounting | near-budget replacement, multi-deal accounting, and no-overspend/no-free-money tests |
| EXT-6 | Atomic factual result | accepted/rejected contract/history/phase/news tuple and no roster/tenure side effects |
| EXT-7 | Aggregate integrity and once-only replay | malformed import, duplicate, retry, reload, phase re-entry, and terminal no-op tests |
| EXT-8 | Public mutation authority | forged CPU player, reassignment, duplicate terminal, invalid terms, and stale session byte/RNG no-ops |
| EXT-9 | Exact-save causal boundary | established coordinator tests plus an actual extension-phase rollback/retained-retry proof |
| EXT-10 | Honest compatibility | current-v34 fixed point, supported migration matrix, empty-history preservation, no schema change |
| EXT-11 | Bounded economy evidence | multi-seed report plus existing accepted-extension balance band |
| EXT-12 | Production causal journey | fresh build: phase entry -> CPU deal -> durable receipt -> hard reload -> exact once-only fact |
| EXT-13 | Repository safety | focused/affected/root typecheck, full tests, PWA build, determinism, reload-smoke, bundle gate, scoped diff/commit |

## Negative controls

At least one deliberate regression must fail and be restored before closeout.
The preferred control neutralizes the persisted-GM personality adjustment; the
constructed personality-divergence test must fail. Retain hostile controls for
user-team swaps, hidden-potential changes, contradictory legacy service years,
forged CPU-player callbacks, and replacement-budget accounting.

## Scope cut line

No manual multi-round negotiation persistence redesign; no new permanent
identity field; no full roadmap-item-49 cross-domain identity; no named-GM
career ledger; no owner pressure/tax or revenue redesign; no explainable-FA,
trade, draft, development, salary-retention, in-season extension scheduler,
Day-One roster, or 30-season item-18 work; no new route, dependency, schema
bump, push, deploy, tag, publication, or release. Stop and re-plan if CPU
completion requires a new persisted identity entity or a second save engine.

## Done

Every CPU club makes a deterministic, identity-shaped, real-budget extension
decision at one canonical phase seam; exact service days and permitted facts
own the inputs; accepted/rejected outcomes form coherent durable history; stale
or malformed work cannot mutate; production reload proof and all repository
gates pass; adversarial review has zero P0-P2 findings; and only roadmap item 13
is committed and fast-forwarded onto local `main`.
