# ECON-TRADE-RETENTION-1 Execution Plan

## Objective and player outcome

Ship roadmap item 17 as one causal loop:

`visible player-linked terms -> symmetric validation/valuation -> atomic worker trade -> exact durable save -> conserved payroll + history/Finance/Press proof after reload`

## Live starting state

- Clean worktree `/Users/kevin/Downloads/MBD-trade-retention-17`, branch
  `codex/trade-retention-17`, base `8e649ad14d495b847c0689b0e00b8fe030201d77`.
- Local `main` matches the base. Remote `origin/main` remains behind and is not
  authorized for mutation in this slice.
- Root uses `pnpm@9.15.4`; GameSnapshot v34 and Dexie v6.
- Three protected dirty files live only in the main checkout and are excluded.
- Swarm reconnaissance is complete; parent is the sole writer. Requested route
  labels are recorded but unverified by the host.

## Scope

- Owned: v35 additive trade-term schema/migration; player-linked annual
  retention and one-season reimbursement; immutable history derivation;
  canonical payroll/valuation/validation; two-team execution; exact-save trade
  adapter; bounded existing Trade/Finance/Press presentation; tests/study;
  production browser/reload evidence; docs/review/local landing.
- Deferred: standalone cash/treasury, raw revenue/budget redesign, broad CPU
  term generation, multi-team authoring, broad trade AI/system rewrite,
  item-18 30-season soak, unrelated roster generation, new route/dependency,
  push/deploy/tag/release.

## Behavioral invariants

- Worker canonical; Zustand mirror. Exact save/session/worker authority is
  required for every touched trade mutation and snapshot export.
- Gross player contract is unchanged. Payer charge plus controller net equals
  gross exactly for each covered season.
- User and CPU share legality, valuation, accounting, and visible information.
- Rejected/no-op work is snapshot/RNG exact and creates no dirty/saving state.
- IDs and ordering are deterministic; no bare `Math.random`, UUID, or wall time.
- v34/deep saves receive empty capability, never fabricated financial history.
- Only item-17 paths may be staged; protected user files stay untouched.

## Milestones

| # | Checkpoint | Primary artifacts | Focused proof | Status |
| ---: | --- | --- | --- | --- |
| 1 | Reconstruct source, freeze contract/scope | Goal 27; `SOURCE_TRUTH.md`; this plan | clean preflight + doc consistency | completed |
| 2 | Add v35 terms and pure finance/valuation authority | contracts + sim-core + fixtures/tests | schema hostile cases; migration; payroll/valuation microcases | completed |
| 3 | Integrate canonical worker validation/mutation/accounting | bounded trade/finance worker seams | direct/retrade/return/expiry/release; CPU parity; rejection digests | completed |
| 4 | Route two-team mutations through exact save and extend UX | exact adapter + existing Trade/Finance/Press surfaces | rollback/retry/fence; hook/component/a11y tests | completed |
| 5 | Source freeze and expensive gates | study + production Playwright evidence | focused matrix; full/typecheck/build/PWA/determinism/reload | completed |
| 6 | Final Sol review and Luna-style closeout | completion/changelog/status/GOAL | zero P0–P2; exact stage; commit; local FF | completed |

## Acceptance tracking

| ID | Implementation | Focused tests | Browser/study | Status |
| --- | --- | --- | --- | --- |
| TRC-1 schema/migration | v35 + frozen v34 predecessor | contracts migration/hostile parse | import/export raw evidence | completed |
| TRC-2 legality | aggregate validator | stale/duplicate/wrong-side/limit digests | invalid UI attempt | completed |
| TRC-3 payroll | derived payer/controller authority | lifecycle + every production consumer | Finance reload | completed |
| TRC-4 valuation | effective controller salary | no-double-count + parity twins | deterministic study | completed |
| TRC-5 execution | prevalidated one-history mutation | player/pick/IFA/financial atomicity | accepted journey | completed |
| TRC-6 exact save | trade operation adapter | rollback/retry/authority-loss | injected storage fault | completed |
| TRC-7 compatibility | old/deep empty migration | supported matrix + compact v33 | export/import fixed point | completed |
| TRC-8 determinism/economy | stable IDs/order | same-seed + activity bands | bounded study receipt | completed |
| TRC-9 UX | existing Trade/Finance/Press | components/hooks/a11y | desktop + 375x667 | completed |
| TRC-10 safety | bounded diff/docs | root gates/review | exact landing | completed |

## Negative control

Two deliberate regressions were run and restored: (1) omitting the controller
payroll credit while retaining the payer charge failed the exact conservation
assertion; and (2) restoring the old simulation-day-only user trade ID caused
the same-day two-trade history test to collapse two immutable facts into one.
Both focused assertions passed after restoring the corrected implementation.

## Progress log

- 2026-07-16: Created the clean item-17 branch/worktree from landed item 16.
- 2026-07-16: Recorded branch/revisions, dirty scope, save/Dexie versions,
  existing tests, absence of Goal 27/completion/current-revision browser proof,
  and the ordinary post-mutation Trade persistence gap.
- 2026-07-16: Invoked `gpt-5-6-swarm`. Three read-only scouts mapped trade,
  test/browser, and finance risks. The host lacks model/effort pinning; requested
  Luna/medium and Sol/xhigh labels are receipts, not runtime claims.
- 2026-07-16: Sol architecture gate rejected a fabricated standalone treasury
  and froze player-linked annual retention plus one-season reimbursement,
  v35, conserved payroll, release fencing, exact-save integration, and scope
  cuts. No source-grounded blocker remains.
- 2026-07-16: Exact-base focused baseline passed contracts migration 24/24,
  sim-core trade/finance/property 76/76, and web Trade/snapshot/exact-save
  150/150. The first invocation only exposed a missing worktree dependency link
  and ran no tests; its tool-created workspace placeholder was removed before
  the observed green baseline.
- 2026-07-16: Implemented and verified v35 terms, canonical finance/valuation,
  aggregate worker validation, exact-save execution, bounded Trade/Finance/Press
  UX, migration/compatibility, and deterministic lifecycle/study coverage.
- 2026-07-16: Three bounded correction loops fixed rollover/history authority,
  full-package negotiation persistence, self-funded Finance credit reporting,
  and the reproducible same-day direct-trade history-ID collision.
- 2026-07-16: Frozen-source gates passed: root typecheck 9/9, full tests 8/8
  tasks with 2,468 web assertions, determinism 3/3, build/PWA 5/5, bundle
  budget 1/1, item-17 Playwright 1/1, and reload-smoke 2/2, all browser retries
  zero.
- 2026-07-16: `/root/item17_final_sol_review` independently matched the frozen
  artifact hashes and returned `MERGE_READY` with zero actionable P0–P2.

## Gate commands (live scripts remain authoritative)

- contracts schema/migration focused tests;
- sim-core trade/finance/property tests;
- web worker snapshot/trade/payroll/exact-save tests;
- Trade/Finance/Press component/hook tests;
- root typecheck and determinism;
- route/lazy-shell/bundle-budget tests;
- full root tests and production build/PWA;
- new production two-state item-17 journey and existing reload-smoke.

## Completion conditions and rollback

All TRC rows require current-revision evidence plus adversarial review with zero
P0–P2 findings. Commit only exact item-17 paths and fast-forward local `main`.
Do not push or deploy. Before commit, rollback is deletion/reversion of only this
slice's owned paths. After commit, rollback is revert of the one item-17 commit;
v35 downgrade cannot preserve new terms, so rollback must retain the last v35
save/export or intentionally discard item-17 financial terms rather than
misreading them as v34.
