# ECON-OWNER-PAYROLL-PRESSURE-1 — Source Truth

## Preflight

- Worktree: `/Users/kevin/Downloads/MBD-owner-payroll-14`
- Branch: `codex/owner-payroll-pressure-14`
- Base/HEAD/local `main`: `5a333890067ba7110d49587f8d1bfebef34f6751`
- `origin/main`: `fd217dc57262cd104f4fc140cb6e6c571cfa9290`;
  push/deploy/tag/release are not authorized.
- Package manager: root declares `pnpm@9.15.4`; commands use the local pnpm-9
  shim. GameSnapshot is v34 and Dexie is v6.
- The slice worktree was clean and no completion report existed. The main
  checkout's user-owned changes to `.agents/skills/mbd-implement-slice/SKILL.md`,
  `AGENTS.md`, and `docs/codex/PROGRAM.md` remain protected outside this
  worktree and commit.

## Baseline receipts

- sim-core finance/front-office/narrative/free-agency/PBT: 6 files / 115 tests.
- web worker/snapshot/Finance/Front Office/Offseason/Dashboard: 10 files / 235
  tests.
- sim-core typecheck passed; web plus e2e typecheck passed.
- These receipts are from the exact item-14 base. They prove current fragments
  compile and run, not that policy surfaces agree or that payroll stories exist.

## Existing implementation

- `OwnerState` already persists archetype, expectations, satisfaction,
  `annualBudget`, and `payrollCap`; optional fallbacks already support old saves.
- `calculateTeamPayroll()` already separates total payroll from luxury-tax
  payroll. `calculateLuxuryTax()` already owns the fixed `$230M` progressive
  assessment.
- Owner evaluation already compares total payroll with the persisted cap and
  can change satisfaction/hot-seat/firing state. Signing and trade consequences
  add separate owner-decision deltas.
- User free-agent signing already runs through the exact-save coordinator and
  applies its contract, roster, QO, narrative, and history effects before the
  post-mutation snapshot is captured.
- Story flags, news, and briefing queues already persist and can provide stable
  once-only narrative without a new save field.
- Finance, Dashboard, Front Office, and Offseason already display pieces of the
  financial picture but do not share one policy DTO.

## Confirmed defects and contradictions

1. No owner payroll floor or explicit pressure classifier exists.
2. Tax basis disagrees: Finance uses MLB plus dead money, while Dashboard and
   `getTeamFinances()` tax total payroll. Finance UI hardcodes `$230M`.
3. `capSpace` means tax room on one surface and budget room on another.
4. Generic signing stories do not distinguish under-floor, above-soft-ceiling,
   or taxpayer consequences and do not provide stable band-entry identity.
5. Owner values on Front Office use a dollar-oriented formatter while live
   runtime owner budgets are millions; `spendingWillingness` is also mistyped as
   a number instead of `cheap | moderate | lavish`.
6. Difficulty changes effective user budget/cap while some owner expectations
   and displays use unadjusted values.
7. Contract admission is intentionally inconsistent across legacy lanes. User
   free-agent offers may cross owner lines; CPU extensions use a hard annual
   budget; CPU free agency and manual extensions use other checks. Item 14
   cannot honestly claim or safely introduce full behavioral symmetry.
8. New-game owner identity derives only from static market budget: the live
   distribution is 22 `win_now`, 10 `patient_builder`, and zero
   `penny_pincher`. Reassigning owners would alter broader firing, expectation,
   and budget behavior owned by item 51.
9. Owner Meeting and the Financial Playbook previously conflated total payroll
   with luxury-tax payroll, so a minors-only salary could make the two onboarding
   chapters disagree about budget room and tax exposure.

## Frozen architecture decisions

- Add one pure derived owner-payroll policy. The worker supplies the raw
  persisted cap with documented fallbacks
  and canonical payroll components; sim-core returns floor, soft ceiling, tax
  line, owner band, tax band, rooms/overages, and assessment.
- Keep raw `payrollCap` as the source-owned soft ceiling. Derive floors at
  50/40/30 percent for win-now/patient/penny-pincher owners. Difficulty never
  changes item-14 lines. They are expectations only.
- Tax only canonical MLB payroll plus dead money. Do not debit cash or alter
  budgets; item 15 owns revenue/cash architecture.
- Do not change transaction admission. Soft/tax crossing remains legal for the
  user and the current CPU/hard-budget lanes remain unchanged.
- Reconcile all 32 teams exactly once when the exact offseason transition moves
  from incomplete to complete. Dedupe by season/team receipt flags; publish one
  user owner briefing/news item and no private CPU presentation. Do not evaluate
  transient mid-offseason floor pressure. Stories never mutate owner state;
  existing owner evaluation/firing remains authoritative.
- Feed the same derived DTO to Finance, Dashboard, Front Office, and Offseason.
  Use explicit room names and keep the separate legacy difficulty-adjusted
  gameplay budget truthfully labeled.
- Supply Owner Meeting and the Financial Playbook with canonical total payroll
  for budget/owner-plan facts and canonical MLB-plus-dead-money payroll for tax
  facts. Onboarding copy reports projected exposure, never a carried tax bill.
- Preserve existing owner identities and report the zero-penny-pincher natural
  baseline. Prove all three archetypes with controlled pure cases; item 51 owns
  new-game distribution and cross-domain owner strategy.

## Frozen calibration bands

- Exactly 32 organizations classify; natural archetypes remain 22/10/0.
- Every policy has finite nonnegative values and `floor < softCeiling`.
- Tax is zero at/below `$230M`, uses current progressive tiers above it, and is
  unchanged by minors-only payroll.
- Existing source-owned opening-day generation bands remain: total MLB payroll
  `$3.8B-$6.8B`, average MLB salary `$2.5M-$8.5M`, and payroll spread
  `$25M-$350M`. The 4x4 annual study records those metrics but does not pretend
  the opening-day generator guard is a post-offseason economy band.
- Four seeds across four completed offseasons must produce `0-3` below-floor,
  `12-31` on-plan, `1-20` above-soft, and `0-8` tax-exposed teams per season;
  exactly 32 receipts and exactly one receipt per team/season. These are the
  observed 4x4 ranges plus a two-team envelope. The aggregate must include at
  least one below-floor and one on-plan team.
- Duplicate pressure receipts, cross-surface value contradictions, unexplained
  transaction rejections, owner/franchise/contract changes caused by
  reconciliation, and parent-RNG drift must all be zero.
- The study must emit inspectable total/taxable ranges, the exact threshold,
  overage/tax ranges, and every taxpayer fact. Its agreement audit includes the
  normalized Owner Intel presentation; a digest alone is not evidence.
- Organic floor/tax incidence is report-only. Controlled cases must guarantee
  every archetype and each floor/soft/tax crossing so the proof is non-vacuous.

## Read-only review synthesis

Three read-only lanes mapped source, tests, and risk while the parent remained
the sole writer. They agreed that no schema change is needed and identified the
tax-basis disagreement, narrative idempotency, surface vocabulary, firing
double-count, and item-51 boundary as the highest risks. The final risk gate
also rejected difficulty-adjusted pressure lines and transaction-by-transaction
story hooks: raw owner authority plus one exact annual completion seam avoids
hidden difficulty drift and transient offseason penalties. One lane proposed
changing new-game owner distribution; doing so also changes budgets,
expectations, and firing outside payroll presentation. The narrow roadmap-safe
decision is to preserve identities and report the current 22/10/0 distribution.

## Scope truth

Roadmap item 15 remains unstarted and owns revenue/cash consequences. Item 18
still owns the 30-season economy soak. Item 51 remains partial and owns broad
CPU owner archetypes and new-game identity distribution. Item 55 owns difficulty
redesign. This slice derives and presents current effective lines without
claiming those later items.

## Implementation discovery

The first 4x4 study attempt correctly rejected `$11.34M` average MLB salary
after the first completed offseason because the draft gate had applied the
`$2.5M-$8.5M` band at the wrong lifecycle. Live `balanceTuning.test.ts` and the
calibration source define that as an opening-day generation guard. Goal 14 does
not alter contracts, so the corrected gate preserves all three numeric bands on
each seed's opening league, records annual values, and keeps annual pressure/
receipt/determinism bands mandatory without widening any source-owned limit.
The full measurement pass then observed annual ranges of `0-1` below-floor,
`14-29` on-plan, `3-18` above-soft, and `2-6` tax-exposed teams. The provisional
unmeasured `0-12` above-soft gate was therefore discarded before production
freeze. The permanent bands use the test-map-prescribed measured range plus two
teams: `0-3`, `12-31`, `1-20`, and `0-8` respectively.

The pre-review hard-band run passed those frozen bands in 551.45 seconds. After
the final Owner Meeting and inspectable-tax-evidence corrections, the
authoritative hard-band run passed 1/1 in 516.06 seconds, emitted every taxpayer
fact, and observed zero six-surface or side-effect contradictions. A final
pure-policy boundary check also showed that malformed direct inputs could
round a zero ceiling and floor to equality even though every live worker path
already resolves a valid source-owned fallback. The pure function now clamps
only malformed direct ceilings to the smallest cent-rounded line that retains
`floor < softCeiling`; valid live inputs and all measured rows are unchanged.
The required negative control then bypassed the completion reconciliation and
the focused transition test failed at the missing all-32 receipt assertion.
Restoring the single call made the same test green, proving the gate is causal.

The fresh-production journey exposed one final lifecycle fact: after the user
signing crossed the initial `$230M` owner/tax lines, later public draft/IFA and
owner-budget lifecycle work added `$10M` of legitimate non-tax payroll and
updated the persisted owner cap before annual reconciliation. The authoritative
final state was therefore `$275M` total payroll, `$265M` tax payroll, inside the
updated owner plan but `$35M` above the tax line with `$8.8M` projected
exposure. The browser proof checksum-waits every public phase and asserts this
final post-offseason fact, not a stale post-signing projection.
