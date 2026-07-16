# ECON-OWNER-PAYROLL-PRESSURE-1 — Completion

## Outcome

Roadmap item 14 is complete and locally landed in the item-only commit
containing this report. Every organization now
uses one pure source-owned payroll policy: canonical total payroll owns the
advisory owner floor/soft-ceiling band, canonical MLB payroll plus dead money
owns the fixed `$230M` progressive tax line, and the exact offseason completion
transition persists one factual team/season receipt without changing owner
state, franchise authority, contracts, or RNG.

Finance, Dashboard, Owner Intel, Offseason, Free Agency, Owner Meeting, and the
Financial Playbook now use explicitly named total, budget, soft-ceiling, and
taxable-payroll values. Legal crossings remain legal. GameSnapshot remains v34,
Dexie remains v6, and roadmap item 15 was not started.

## Acceptance matrix

| ID | Implementation artifact | Focused proof | Browser/final gate | Remaining risk |
| --- | --- | --- | --- | --- |
| OPP-1 | `packages/sim-core/src/finance/ownerPayrollPressure.ts` pure classifier | 7 tests cover three archetypes, malformed inputs, exact boundaries, finite ordering, and deterministic equality | root typecheck 9/9; sim-core 1,681 tests | Natural new games intentionally have no penny-pincher owners; item 51 owns distribution. |
| OPP-2 | `calculateTeamPayroll` supplies distinct total and taxable payroll to policy, Owner Meeting, and Financial Playbook | policy tax controls; 14 Owner Meeting tests; 9 Financial Playbook tests; minors-only cross-chapter worker test | production finishes at `$275M` total, `$265M` taxable, `$8.8M` projected exposure | Revenue/cash remains item 15. |
| OPP-3 | derived advisory DTO; no transaction-admission mutation | pure DTO has no allow/reject field; offer preview and exact-save crossing tests | public `$45M` signing crosses owner/tax lines and persists | Existing lane-specific admission rules remain outside item 14. |
| OPP-4 | one worker policy feeds direct query, Owner Intel, Finance, team finance, Dashboard, Offseason, and offer preview; onboarding chapters share canonical payroll components | six-surface annual contradiction audit plus cross-chapter minor-salary regression | scoped browser assertions prove `$115M` floor and separate `$230M` ceiling/tax line | None identified. |
| OPP-5 | exact incomplete-to-complete reconciliation with stable team/season IDs | 32 receipts, duplicate normalization, partial artifact repair, repeat no-op, failed-transition gate, immutable owner/franchise/contracts/RNG | browser proves 32/32 receipts, one news item, one briefing, and singular reload state | Historical annual stories are not backfilled by design. |
| OPP-6 | established exact-save coordinator retains the post-completion snapshot | retained reconciliation snapshot and hostile rollback/retry/no-change tests | every public browser phase checksum changes before durable acceptance | Exact-save authority is inherited from the landed coordinator. |
| OPP-7 | derived policy and normalized read-only owner presentation; no schema field | v34 fixed point; compact-v33 and Season-10 imports; missing/partial owner fallback; no mutation or fabricated history | snapshot 19/19 and production v34 reload | Old saves receive current truth, never invented past stories. |
| OPP-8 | opt-in 4×4 study emits bounded payroll/tax/threshold ranges and every taxpayer fact | 16 annual rows; 512 live receipts; 512 controlled first-application receipts; zero invalid/duplicate/side-effect/contradiction results | hard gate 1/1 in 516.06s | This bounded 4×4 is not item 18's 30-season soak. |
| OPP-9 | production Playwright QO → FA → signing → completion → reload journey | semantic values, checksums, IndexedDB facts, keyboard and containment assertions | 1/1 in 14.2s, one worker, zero retry/flaky; 375×667 and 1280×900 evidence | Broader release-wide visual QA remains separate. |
| OPP-10 | item-only source/tests/docs; unchanged schema/dependencies/routes/bundle ceilings | focused tests, package/root typechecks, working and staged diff checks, exact staged-scope audit, bundle gate | full suite, PWA, determinism, item browser, reload-smoke, scoped commit, and local-main fast-forward green | Remote CI is unrun because push is not authorized. |

## Verification receipts

- Pure and onboarding policy: sim-core focused 3 files / 30 tests; sim-core
  typecheck passed.
- Worker/onboarding correction: 3 web files / 20 passed and 1 intentional skip;
  the isolated total-versus-taxable cross-chapter regression passed 1/1.
- Owner payroll/UI/exact-save focused surface: 19 files / 91 tests passed before
  source freeze; the later owner-payroll worker recheck passed 10/10.
- Calibration: seeds `7401-7404`, four completed offseasons each, 16 annual
  rows, 512/512 live receipts, 512/512 controlled first-application receipts,
  74 inspectable taxpayer facts, zero duplicates, zero invalid policies, zero
  owner/franchise/contract/RNG changes, zero six-surface contradictions, and
  exact 22/10/0 natural owner distribution. Hard gate: 1/1 in 516.06s.
- Root typecheck: 9/9 Turbo tasks. Changed sim-core/web tasks executed in this
  worktree; unchanged dependencies were content-addressed cache hits.
- Root full test: contracts 24/24; UI 1/1; sim-core 142 files / 1,681 tests;
  web 465 files / 2,407 tests, with 2 files / 4 tests intentionally skipped;
  Turbo 8/8.
- Production PWA: 3,030 modules; 167 precache entries / 4,067.22 KiB; no new
  route, dependency, or bundle ceiling.
- Determinism snapshot: 3/3.
- Item-specific production journey: 1/1 in 14.2s, one worker, retries zero.
- Existing production reload-smoke: 2/2 in 5.8 minutes, one worker, retries
  zero, no flaky classification.
- Working diff check: clean.

## Calibration facts

The final hard study emitted the following bounded aggregate from the actual 16
annual rows:

| Fact | Observed |
| --- | ---: |
| Total payroll range | `$94.00M-$401.88M` |
| Taxable payroll range | `$0.00M-$323.61M` |
| Tax threshold set | `$230.00M` only |
| Tax overage range | `$0.00M-$93.61M` |
| Projected tax range | `$0.00M-$37.21M` |
| Taxpayer facts emitted | `74` |
| Below floor / on plan / above soft / taxpayers | `0-1 / 14-29 / 3-18 / 2-6` |
| Owner / franchise / contract / RNG changes | `0 / 0 / 0 / 0` |
| Cross-surface contradictions | `0` |

Each taxpayer entry includes team ID, total payroll, taxable payroll, threshold,
overage, and projected tax in the test receipt. `CALIBRATION.md` records the
opening and annual bands without using a digest as a substitute for these
values.

## Browser proof

The final fresh-production Chromium run publicly imported v34, entered Free
Agency through the exact Qualifying Offers skip, and scoped the initial owner
floor (`$115M`), soft ceiling (`$230M`), taxable payroll (`$220M`), and tax line
(`$230M`) to their named panels. At 375×667 it set the offer to `$45M`, verified
the projected `$265M` payroll, `$35M` owner-ceiling overage, `$35M` tax-line
overage, and `$115M` floor, then proved every critical row and the keyboard-
focused Offer Contract button remained horizontally and vertically contained
above assistant/mobile-navigation chrome.

The signing persisted to IndexedDB, every remaining public phase was checksum-
waited through Spring Training, and the final snapshot held `$275M` total,
`$265M` taxable, `$8.8M` projected exposure, 32 singular receipts, one user
news item, and one briefing. Hard reload retained the exact contract, payroll,
tax, story, and receipt facts. At 1280×900 the Owner Plan and Projected Tax
panels were explicitly tested not to overlap assistant chrome. Evidence:

- `evidence/owner-payroll-offer-mobile.png`
- `evidence/owner-payroll-finish-desktop.png`

## Negative controls

The annual completion call was temporarily bypassed. The exact focused test
failed where all 32 receipt flags were required, then passed after restoration;
the bypass is absent from the final diff. Permanent hostile controls cover
minor-only taxation, total-versus-taxable onboarding disagreement, exact
`-0.01/equal/+0.01` boundaries, partial and duplicate receipts, difficulty
leakage, parent RNG consumption, exact-save retry, and query mutation.

## Findings discovered and fixed

1. Dashboard/team finance taxed total payroll while Finance used taxable
   payroll; one worker policy now owns the basis.
2. `capSpace`, budget room, owner room, and tax room were conflated; DTOs and
   labels are explicit.
3. No stable annual narrative seam existed; exact offseason completion now
   owns one factual receipt without a second owner/firing delta.
4. Front Office used dollar formatting for million-denominated values and
   mistyped spending willingness; runtime presentation now matches source.
5. Malformed direct ceilings could round floor and ceiling to equality; the
   defensive pure input remains strictly ordered.
6. Legacy missing/partial owners could hide or corrupt Owner Intel; a normalized
   read-only owner-plus-policy DTO preserves facts without mutating saves.
7. Existing receipt flags could suppress missing user presentation and retain
   duplicates; reconciliation now normalizes flags and repairs artifacts
   independently.
8. Dashboard clamped negative budget room and colored by spend percentage;
   signed truth and canonical owner band now drive display.
9. Exact tax-line equality said `$0 below`/`clear of`; it now says at the line
   with zero projected exposure.
10. Initial browser checks did not separately scope lines or prove mobile
    vertical/non-occlusion behavior; the final journey does and retains images.
11. The first study claimed owner/franchise/contract/RNG and surface agreement
    without measuring each value; every annual row now executes those audits.
12. Revised Owner Meeting reused MLB-only payroll for budget and tax, while the
    Financial Playbook used different truth; both now receive canonical total
    and taxable payroll separately, with projected-exposure copy.
13. The study initially hid per-team tax evidence behind a digest; final rows
    emit bounded ranges and every taxpayer tuple, including Owner Intel in the
    agreement audit.

## Adversarial review

The first final review returned `FIX_AND_REVIEW` with four P1 and four P2
findings. Correction loop 1 closed the eight findings above. The recheck then
returned two new P1s (Owner Meeting payroll conflation and opaque tax evidence)
plus stale-documentation P2. Correction loop 2 fixed both source/evidence
findings and refreshed this report, `CALIBRATION.md`, `PLAN.md`, and
`SOURCE_TRUTH.md` from the frozen gates. The final read-only review parsed the
literal study receipt, independently reran the corrected focused cases, passed
OPP-1 through OPP-10, and returned `MERGE_READY` with P0/P1/P2 `0/0/0`.

## Compatibility, scope, and rollback

- GameSnapshot v34, Dexie v6, dependencies, routes, and bundle ceilings are
  unchanged. No migration, tax ledger, cash debit, or historical backfill was
  added.
- Existing owner identities remain preserved. Natural generation is 22
  `win_now`, 10 `patient_builder`, zero `penny_pincher`; item 51 owns changes.
- No revenue/attendance model, owner distribution redesign, contract admission
  rewrite, difficulty overhaul, 30-season soak, salary retention, item 15,
  push, deploy, publication, tag, or release occurred.
- Before landing, rollback is limited to the owned item-14 paths. After landing,
  revert the single item-14 commit; no schema downgrade or save repair is needed.

## Actual collaboration route — manual relay-pattern fallback

Verified GPT-5.6 child-model metadata was unavailable, so no model-routing claim
is made. Requested role and effort names describe the manual pattern only.

| Phase | Thread/task ID | Actual model/effort evidence | Artifact | Status |
| --- | --- | --- | --- | --- |
| Reconstruct | `/root`, `/root/ownerpayroll_source_map`, `/root/ownerpayroll_test_map`, `/root/ownerpayroll_risk_review` | metadata unavailable; manual Sol-pattern, requested xhigh | source/test/risk maps, Goal 24, frozen policy/bands | Complete |
| Implementation | `/root` | metadata unavailable; manual Terra-pattern, requested high | pure/worker/UI/onboarding/exact-save patch, tests, 4×4 study, browser proof | Complete; sole writer; two correction loops |
| Adversarial review | `/root/ownerpayroll_risk_review`, children `/recheck_persistence`, `/recheck_ui_study`, `/loop2_persist_scope`, and `/loop2_ui_study` | metadata unavailable; manual Sol-pattern, requested xhigh | line-level findings, independent focused rechecks, OPP matrix | `MERGE_READY`, 0/0/0 |
| Mechanical closeout | `/root` | metadata unavailable; manual Luna-pattern, requested medium | refreshed docs, exact staging/commit/local-main fast-forward | Complete in the commit containing this report |

Only the parent writes the checkout. Delegated work is read-only.

## Relay retrospective

1. **Uncertainty discovered too late:** revised onboarding had a second payroll
   consumer—Owner Meeting—that reused one MLB-only number for both budget and
   tax, and the study reduced inspectable tax facts to a digest.
2. **Earlier exposing artifact/gate:** an up-front consumer matrix listing
   `totalPayroll`, `luxuryTaxPayroll`, and copy semantics for every surface,
   plus a required sample of the literal study JSON, would have exposed both.
3. **Owning role:** the Sol-pattern architecture role should own the complete
   consumer/authority matrix and evidence schema; Terra should implement only
   after those columns are frozen.
4. **Phases that must stay sequential:** payroll authority → pure boundaries →
   worker reconciliation → exact-save proof → inspectable calibration → browser
   proof → root gates → final review → staging/landing.
5. **Safe read-only parallel work:** source consumer search, test inventory,
   schema/old-save audit, tax-copy audit, UI/bundle inspection, and proposed
   study-receipt review can run together before the writer starts.
6. **Recommended route for a similar slice:** first freeze a field-by-field
   source/consumer matrix and annual state machine; require controlled negative
   controls; implement with one writer; run a small inspectable receipt sample;
   only then run the hard multi-seed study, production journey, root gates, one
   adversarial review, and exact landing.
7. **Prioritized improvements:** (1) enumerate every consumer before coding,
   including onboarding/tutorial surfaces; (2) distinguish total, taxable, and
   budget payroll in type names at every boundary; (3) review the literal study
   output schema before the expensive run; (4) assert exact worker/save/team/
   season identity at reconciliation; (5) add legacy normalized-presentation
   tests in the first checkpoint; (6) make browser proof scope every repeated
   numeric line by named panel; (7) keep review, documentation refresh, staging,
   and landing sequential under one-writer discipline.

Suggested workflow improvements are reported here only; no MBD skill or workflow
file was rewritten.

## Next legal work

Roadmap item 15—market-size revenue feeding budgets—is next only after item 14
lands in its own scoped commit. It was not begun here.
