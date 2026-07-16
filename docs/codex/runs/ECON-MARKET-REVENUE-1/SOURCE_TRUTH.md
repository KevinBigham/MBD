# ECON-MARKET-REVENUE-1 — Source Truth

## Preflight

- Worktree: `/Users/kevin/Downloads/MBD-market-revenue-15`
- Branch: `codex/market-revenue-15`
- Base/HEAD/local `main`: `9441232c340e4838c60e424d64fbd20c7ed33e78`
- `origin/main`: `fd217dc57262cd104f4fc140cb6e6c571cfa9290`;
  push/deploy/tag/release are not authorized.
- Package manager: root declares `pnpm@9.15.4`; commands use the local pnpm-9
  shim. GameSnapshot is v34 and Dexie is v6.
- The isolated worktree began clean and no Goal 25 or completion report existed.
  The main checkout's user-owned `.agents/skills/mbd-implement-slice/SKILL.md`,
  `AGENTS.md`, and `docs/codex/PROGRAM.md` changes remain protected outside this
  worktree and commit.

## Baseline receipts

- Sim-core finance/front-office/narrative: 3 files / 46 tests passed.
- Web worker/Finance hook/card/page: 4 files / 190 tests passed.
- Sim-core typecheck and web/e2e typecheck passed.
- These commands ran on the exact item-15 base. They prove the fragments compile
  and run, not that roadmap item 15 is implemented.

## Existing source

- `TEAM_MARKETS` contains 8 large, 14 medium, and 10 small organizations.
  `getTeamBudget()` exposes fixed midpoints of `$315M`, `$240M`, and `$175M`.
- `OwnerState` already persists `annualBudget`, `payrollCap`,
  `expectations.payrollTarget`, `draftBonusPool`, `ifaBonusPool`, and
  `staffBudget`. Story flags, news, briefings, and season archives persist.
- The existing private `budgetOutputsFromOwner()` combines a static market
  midpoint, owner spending willingness, satisfaction, a bounded final-record
  proxy, and a `3.5%` playoff factor.
- Exact Offseason Advance/Skip already retains a baseline, runs one worker
  mutation, captures the exact post snapshot, retries only that object, rolls
  back pre-acceptance failure, and fails closed after acceptance.
- Season archives already retain final standings and playoff series. They do not
  contain revenue, attendance, cash, or tax-payment history.
- CPU extensions/free agency, IFA, trade posture, item-14 policy, and financial
  surfaces already consume the owner budget/cap/pool fields.

## Confirmed defects and contradictions

1. `refreshNarrativeState()` invokes `evaluateOwnerState()` for all 32 teams
   during ordinary season simulation, and that function rewrites every budget
   field. Budgets therefore drift during the season instead of settling once.
2. The final regular-season refresh runs before the playoff bracket exists, so
   CPU teams do not receive the apparent playoff factor.
3. User-only playoff/series consequences call `applyOwnerDecisionDelta()`, which
   rewrites the user budget from synthetic expectations. The current financial
   prototype is asymmetric.
4. Satisfaction, fan sentiment, difficulty, and GM philosophy are user-specific
   or recursively unstable. They cannot own raw league economics.
5. Using prior `annualBudget` as the next revenue base would recursively compound
   whenever ordinary owner refresh runs.
6. Playoff route actions use ordinary autosave. Settling at playoff finalization
   or `proceedToOffseason()` would lack the existing exact-save rollback and
   retained-snapshot guarantees.
7. No actual attendance, ticket, capacity, cash, treasury, revenue-sharing,
   settled-tax, or structured revenue-history authority exists. Claiming one
   would require a broader product contract and likely a schema migration.
8. `getTeamBudget()` silently falls back to small market for unknown IDs. A live
   annual reconciliation must fail closed instead of accepting that fallback.
9. `archiveFinancials()` stores the user-only difficulty-adjusted budget, not
   raw league economics. Other legacy copy fabricates `$80M/$100M` budgets or
   reads a static midpoint after a real owner budget exists.
10. `applyForJob()` recreates the owner and can erase accumulated financial
    state. This slice must preserve the selected organization's owner facts.
11. `OwnerState.spendingWillingness` is overwritten by the user-only onboarding
    GM philosophy. Canonical revenue therefore uses owner `archetype`, whose
    allocation factor is the source-consistent `1.12/1.00/0.90` mapping.
12. Item-14 projected tax is not a paid bill and cannot be subtracted from gross
    revenue or described as an expense.

## Frozen architecture

- Add one pure sim-core market-revenue module with explicit market lookup and no
  fallback. It returns market/record/playoff inputs, component revenue, gross
  revenue, owner allocation, and all six coherent financial outputs.
- The pure statement uses final record and any playoff berth. It excludes prior
  budget, payroll, tax, satisfaction, fan sentiment, GM philosophy,
  spending-willingness overrides, difficulty, user identity, hidden ratings,
  wall clock, and RNG.
- `evaluateOwnerState()` and `applyOwnerDecisionDelta()` preserve the existing
  six financial fields. `createOwnerState()` may retain a neutral opening
  projection without a settled receipt or history.
- One worker reconciliation runs from `applyOffseasonTransition()` only when the
  outgoing serialized offseason phase is `season_review`. It validates and
  precomputes all 32 replacements plus presentation before assignment, then the
  existing exact Advance/Skip coordinator binds that one worker result to its
  post-mutation snapshot. Pre-acceptance persistence failure restores the exact
  baseline; post-acceptance failure retains and retries only the accepted
  snapshot. Advance and Skip therefore share one idempotent annual owner and the
  same rollback/fail-closed boundary.
- Stable per-team season flags are validated, normalized, and repaired together
  with owner outputs and the one user news/briefing pair. The receipt is an
  idempotency/audit fact, not permission to trust inconsistent owner values.
- A current or upgraded save already past `season_review` waits for the next
  completed season; import/query never mutate or backfill. An uninitialized or
  still-season-review save with complete league and postseason facts settles on
  the first exact Advance/Skip. Authentic compact v33 saves have no league-wide
  standings or bracket; they keep the existing contract clock and defer revenue
  until their next factual completed season rather than fabricating a statement.
- The latest completed archive continues to describe the budget used during
  that season. New archives store raw owner budget, never difficulty-adjusted
  budget, and are never relabeled as revenue.
- The player-facing statement is derived from final persisted facts and the
  exact owner outputs. It says modeled/record-driven attendance effect and
  projected tax, never attendance count, ticket revenue, cash, or paid tax.

## Frozen structural bands

- Tiers/counts: exactly `8/14/10`; baselines: exactly `$315M/$240M/$175M`.
- Attendance rate: `[-8%, +8%]`; playoff rate: exactly `0%` or `3.5%`.
- Pre-cent-rounding gross/baseline ratio: `[0.92, 1.115]`; displayed gross
  revenue: `$161.00M-$351.23M`.
- Allocation factor: exactly `0.90`, `1.00`, or `1.12`; annual budget:
  `$144.90M-$393.38M`; payroll cap: `$133.31M-$361.91M` and exactly `92%` of
  annual budget.
- The 4x4 study must produce exactly 512 literal statements and receipts, one
  per team/season, with zero nonfinancial owner/franchise/contract/payroll/
  roster changes caused by reconciliation and zero parent-RNG drift.
- Same-market/owner controlled cases must order
  `100-62 playoff > 81-81 miss > 62-100 miss`; repeating a case remains
  byte-equivalent and never uses prior budget as the base.
- Affected-economy bands retain the existing source-owned Goal 23/24 gates named
  in Goal 25. The measured hard envelopes are annual mean budget
  `$255M-$275M`, free-agent market `450-1089`, total signings `21-58`,
  meaningful signings `21-57`, top AAV `$20M-$45M`, and accepted extensions
  `8-80`. Per-seed budget CAGR is `[-1%, +1%]`, first/second-half mean-budget
  slope is `[-$3M, +$3M]`, and acceleration is `[-$4M, +$4M]`.

## Read-only architecture synthesis

Three read-only lanes mapped source, tests, and risk while the parent remained
the sole writer. They agreed that v34 is sufficient, ordinary narrative refresh
is the wrong budget owner, exact season-review activation is the safe settlement
seam, and cash/actual attendance would be a false claim. The test map requires
literal 4x4 receipts and a production exact-save reload journey. The final risk
gate classified ordinary playoff persistence, asymmetric inputs, recursive
budget bases, and partial receipts as P0/P1 architecture risks; the frozen design
removes them before production edits.

## Scope truth

Roadmap item 16 remains unstarted and owns the broader explainable free-agent
decision model. Item 18 retains the 30-season economy soak. Item 51 retains new
owner distribution and broader CPU owner behavior. Item 55 retains removal of
the existing hidden difficulty resource overlay. No item-15 design may claim or
silently absorb those later outcomes.

## Implementation discovery

The first broad worker run exposed that authentic compact-v33 compatibility and
several clock-only source fixtures intentionally contain no full-league
standings or playoff bracket. Treating total absence as corrupt would strand an
otherwise supported save and contradict the no-fabrication rule. Settlement now
distinguishes absence from contradiction: a null postseason artifact defers
revenue without a receipt or budget change, while any present bracket activates
strict 32-team/162-game/champion validation and fails before revenue mutation if
incomplete. The same run showed an MLB-placement test depended incidentally on
the old oversized opening budget; its fixture now sets explicit headroom so it
continues to test placement authority rather than a retired budget formula.
The one-seed inspectable study also corrected a proposed-but-not-source-owned
`1-20` annual meaningful-signing range: the existing balance suite gates the
study average at `>=1.5` and does not impose that upper bound. It likewise
confirmed `$2.5M-$8.5M` average MLB salary is an opening-generator band rather
than a post-offseason annual band. The full measurement then observed `26-53`
total and `26-52` meaningful annual signings, proving the proposed `1-40` total-
signing ceiling was also not a live source gate. The frozen `21-58` and `21-57`
envelopes are those extrema plus five; they detect item-15 drift without tuning
free agency to an invented constraint or absorbing roadmap item 16.

Source-freeze review also exposed two temporal-history requirements. The final
offseason archive enrichment must preserve the pre-settlement budget actually
used in the completed season, rather than overwrite it with the next-season
allocation. After rollover, Finance/Owner Intel must continue to explain the
active allocation by deriving the prior statement from the factual season
archive plus its complete 32-team receipt set. Neither correction adds a
persisted revenue ledger or fabricates old-save history.

The final adversarial review then exposed three source-freeze gaps. A nonempty
seed list plus champion was not a completed postseason, so settlement now
requires the exact final-standings-derived 12-team field, all four canonical
rounds and 11 completed series, and a World Series result consistent with both
the bracket path and legacy results. A full receipt set alone could not make a
statement canonical, so every query also requires all 32 persisted owner
allocations to match all six derived outputs; stale or missing fields remain
unset until the exact Season Review transition repairs them. Finally, the hard
study now emits explicit before/after owner, franchise, player, contract,
payroll, roster, and parent-RNG digests, counts actual receipt flags, and requires
all four consumer surfaces to be present before it can report zero
contradictions.

The definitive browser recheck exposed one further lifecycle gap: importing a
finished bracket proved settlement but not the production path that creates its
authority. The final journey now imports only a regular-season cutoff, uses the
real production controls to finish the season and all four playoff rounds,
asserts the exact 12 seeds and 11 completed series with zero premature
receipts, and only then crosses the exact Season Review Advance boundary.

## Final evidence truth

- Focused sim-core: 7 files / 95 tests; focused web correction set: 5 files /
  27 tests; broad worker/persistence/boot: 11 files / 376 tests; authentic
  rollover: 2/2. The final worker recheck is 11/11.
- Hard study: 4 seeds x 4 seasons x 32 teams, 512 statements and 512 unique
  receipts, 1/1 in 494.99 seconds. All hard envelopes and 112 settlement
  isolation digest pairs passed; exact results are in `CALIBRATION.md`.
- Root typecheck: 9/9 tasks. Full test: 8/8 tasks in 5m27.297s, including
  sim-core 1,689 and web 2,422 passed with five intentional web skips.
- Fresh production/PWA build: 3,032 modules, 167 precache entries, 4,081.79
  KiB. Determinism: 3/3. Bundle-budget tests passed.
- Production item journey: 1/1 in 12.6 seconds. Existing reload-smoke: 2/2 in
  6.5 minutes. Both used one Chromium worker, zero retries, and no flaky result.
- The deliberately bypassed settlement failed the intended 32-receipt
  regression, then restored behavior passed.
- Final read-only verdict: `MERGE_READY`, zero remaining P0-P2.

The final structural scan found that the new helper-to-market-revenue type
import formed one item-15 cycle. Replacing the broad `FullGameState` import with
a local narrow interface removed that cycle without emitted JavaScript. Web/E2E
typecheck, focused worker tests, production build/browser, determinism, and diff
check were rerun afterward. The scan's remaining 20 cycles and the
`MarketSize` barrel-export report reproduce base-owned debt and remain roadmap
items 92/93 rather than item-15 scope.
