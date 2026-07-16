# ECON-OWNER-PAYROLL-PRESSURE-1 — Owner Payroll Pressure

## Objective

Finish TRUE GOAT roadmap item 14 by turning the existing owner, payroll, budget,
and luxury-tax primitives into one truthful player-facing policy: an advisory
payroll floor, an advisory owner soft ceiling, the league luxury-tax line, and
deterministic narrative consequences. Preserve canonical contract accounting,
exact-save persistence, current owner-firing authority, deterministic outcomes,
and old-save facts. Do not begin roadmap item 15 or absorb roadmap item 51.

## Live-source contract

- GameSnapshot remains v34 and Dexie remains v6. Policy is derived from the
  existing persisted `OwnerState` plus canonical contracts/dead money; no save
  field or migration is expected.
- `OwnerState.archetype` is the only owner identity consumed here. GM
  philosophy, transient team-building archetype, authored club flavor, and
  difficulty are not replacement owner identities.
- Canonical total payroll owns floor/soft-ceiling status. Canonical MLB payroll
  plus dead money owns luxury-tax status and assessment. Minor-league payroll
  is never taxed.
- The payroll floor and owner ceiling are advisory pressure. They must not
  reject a legal user transaction, alter player demand, or create a hidden CPU
  advantage. The league tax line is a projected assessment, not a cash debit.
- Existing contract lanes retain their current admission authority. This slice
  reconciles their displayed pressure truth but does not redesign user/CPU free
  agency, extensions, arbitration, qualifying offers, trades, or difficulty.
- Existing owner evaluation/firing remains the sole gameplay authority for
  satisfaction and termination. New payroll stories are factual and do not
  apply a second satisfaction, confidence, budget, or firing delta.
- The worker is canonical; Zustand remains a UI mirror. Queries may derive
  policy but never mutate it.

## Frozen policy

1. `softCeiling` is raw persisted `owner.payrollCap`, falling back to
   `owner.expectations.payrollTarget`, then `92%` of the source team budget.
   Item-14 lines are never difficulty-adjusted; the existing separate gameplay
   budget may still disclose its legacy difficulty adjustment.
2. `floor` is an archetype-specific share of that raw soft ceiling:
   `50%` for `win_now`, `40%` for `patient_builder`, and `30%` for
   `penny_pincher`. These are owner expectations, not forced spending targets.
3. Total payroll below the floor is `below_floor`; total payroll above the soft
   ceiling is `above_soft_ceiling`; the inclusive interval is `on_plan`.
4. `taxThreshold` remains the source-owned `$230M`. Luxury-tax payroll at or
   below the line is `clear`; payroll above it is `taxpayer` and uses the
   existing progressive calculation.
5. A status is derived from live canonical inputs. No pressure classification,
   threshold, or synthetic history is persisted.
6. Continuous status is a pure read. Once per season, after the exact offseason
   transition changes from incomplete to complete, the worker reconciles all 32
   teams from final post-offseason contracts. Stable season/team receipt IDs
   prevent advance, skip, retry, reload, and resume from duplicating work. The
   user receives one factual owner briefing/news story; CPU teams receive the
   same derived receipt without private-user presentation.
7. Story publication is descriptive only. The pre-existing owner evaluation
   and signing-consequence rules remain the only owner-state mutations.

## Required behavior

1. Every organization receives the same pure policy computation from its own
   persisted owner state, effective cap, and canonical payroll components.
2. All thresholds are finite, nonnegative, and ordered `floor < softCeiling`.
   Boundary values classify exactly and deterministically.
3. Floors and soft ceilings remain advisory. A legal user signing may cross
   either the soft ceiling or tax line and still succeed through the established
   exact-save coordinator.
4. The tax assessment uses MLB payroll plus dead money only. Adding only a
   minor-league salary cannot create or increase tax.
5. Finance, Dashboard, Front Office, Offseason, and relevant signing/narrative
   surfaces consume the same named values; `budgetRoom`, `softCeilingRoom`, and
   `taxRoom` are not conflated.
6. Owner archetype changes the floor expectation and narrative voice only. It
   does not change player demand, contract RNG, ratings, roster results, market
   value, revenue, or available money.
7. Payroll-pressure derivation and story construction consume no simulation RNG
   and use no wall clock or `Math.random()`.
8. Annual under-floor, on-plan, above-soft-ceiling, and taxpayer outcomes use
   distinct factual copy and exactly one team/season receipt. A transient
   mid-offseason roster never triggers floor pressure, and reconciliation cannot
   double-apply owner or firing pressure.
9. Accepted user contract mutations remain bound to their exact post-mutation
   snapshots. The later annual reconciliation is itself captured by the exact
   Offseason Advance/Skip snapshot; persistence retry reruns neither contracts
   nor reconciliation.
10. Current-v34 and supported old/deep saves derive policy from preserved facts.
    Missing optional owner values use existing fallbacks. No historical payroll
    story is backfilled merely because an old save was imported.
11. The bounded study covers four deterministic seeds across four completed
    offseasons plus controlled micro-scenarios. It records archetype/status
    counts, payroll/tax values, threshold crossings, receipts, owner/franchise
    immutability, contradictions, and RNG identity.
12. Source-grounded study gates remain: exactly 32 classified teams; natural
    owner generation remains the current `22 win_now / 10 patient_builder /
    0 penny_pincher`; the source-owned opening-day generation bands remain total
    MLB payroll `$3.8B-$6.8B`, average MLB salary `$2.5M-$8.5M`, and payroll
    spread `$25M-$350M`; annual values are recorded but not misclassified as
    opening-day generation gates. There must be zero invalid thresholds,
    duplicate receipts, cross-surface contradictions, owner/franchise changes,
    contract changes caused by reconciliation, or parent-RNG changes. Per
    season, below-floor teams remain `0-3`, on-plan teams `12-31`, above-soft
    teams `1-20`, and tax-exposed teams `0-8`; exactly 32 one-per-team receipts
    are produced. These gates are the measured 4x4 baseline plus a two-team
    envelope, not theoretical full-range allowances.
    Across the aggregate at least one below-floor and one on-plan team must
    occur. Controlled cases, not organic incidence, prove all three archetypes
    and every boundary; natural above-soft or tax incidence may be zero.
13. A fresh-production browser journey uses a legal public offseason mutation,
    inspects the continuously derived lines, completes the offseason through an
    exact Advance/Skip command, waits for durable reconciliation, verifies the
    factual policy/story, hard reloads, and verifies the contract, payroll, tax,
    and once-only story. Desktop and 375x667 controls remain readable, keyboard
    reachable, contained, and non-occluding.
14. Existing owner identities are preserved. The live zero-penny-pincher new-
    league distribution is reported honestly; changing owner distribution or
    broad CPU owner behavior remains roadmap item 51.
15. No unrelated gameplay, schema, dependency, route, bundle ceiling, or later
    roadmap item changes.

## Acceptance matrix

| ID | Acceptance | Required proof |
| --- | --- | --- |
| OPP-1 | Pure, ordered archetype policy | boundary table for three archetypes, finite values, deterministic digest |
| OPP-2 | Canonical payroll and tax basis | total-versus-tax-payroll tests; minors-only negative control; progressive tiers |
| OPP-3 | Advisory semantics | successful soft/tax crossing; unchanged contract-demand/RNG and rejection behavior |
| OPP-4 | One worker truth | Finance/Dashboard/Front Office/Offseason DTO and component agreement |
| OPP-5 | Factual once-only annual narrative | exact offseason-completion seam; 32 stable receipts; advance/skip/retry/reload dedupe; no owner-state delta |
| OPP-6 | Exact-save causal boundary | contract mutation receipt plus annual reconciliation retained by exact snapshots without replay |
| OPP-7 | Compatibility | v34 fixed point, supported old/deep migration, optional-field fallback, no fabricated history |
| OPP-8 | Bounded calibration | four-seed report and controlled crossings inside the frozen bands |
| OPP-9 | Production causal journey | fresh build: inspect -> sign -> durable receipt -> consequence -> hard reload -> singular fact |
| OPP-10 | Repository safety | focused/affected/root typecheck, full tests, PWA build, determinism, reload-smoke, bundle gate, scoped diff/commit |

## Negative controls

At least one deliberate regression must fail and be restored before closeout.
The primary control bypasses the annual reconciliation call; the expected user
briefing and 32 receipts must disappear and the regression must fail. Retain
hostile controls for total-payroll taxation, exact boundaries at `-0.01/equal/
+0.01`, removed receipt deduplication, difficulty leakage, and RNG consumption.

## Scope cut line

No cash/treasury debit, revenue or attendance model, market-size budget redesign,
new owner distribution, broad owner AI or career rewrite, CPU contract-strategy
redesign, contract-lane admission unification, explainable-FA expansion, salary
retention, difficulty overhaul, 30-season item-18 soak, schema bump, new route,
dependency, push, deploy, tag, publication, or release. Stop and re-plan if a
durable tax ledger, historical payroll state, or a second persistence engine is
required.

## Done

The player sees one coherent owner floor, soft ceiling, and tax line everywhere;
legal crossings remain legal but produce factual deterministic pressure stories;
contract outcomes and the annual reconciliation each survive exact-save retry
and hard reload without replay; bounded calibration and all repository gates
pass; adversarial review has zero P0-P2 findings; and only roadmap item 14 is
committed and fast-forwarded onto local `main`.
