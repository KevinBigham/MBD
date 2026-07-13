# ECON-CLOCK-1 — Living Plan

## Objective

Implement exactly [Goal 11](../../goals/11_ECON_CLOCK_1.md), which is the shared
live-source slice for roadmap items 9 and 10: advance canonical contract years
once at offseason entry, route natural expiries through the existing free-agent
market, and resolve only source-supported team options deterministically and
symmetrically. Do not begin Goal 12 or any adjacent economy item.

## Preflight and live truth

See [SOURCE_TRUTH.md](./SOURCE_TRUTH.md).

- Base: `2c07cc3eea4cfca1faef344e51b91818782b2da3`; local `main` matched when
  `codex/econ-clock-options-9-10` was created.
- Save schema remains v34. No schema migration is planned.
- Three protected pre-existing dirty files are fixed by path/hash in Source
  Truth and must remain unstaged.
- Pre-edit baselines are green: 74 sim-core, 151 worker/rollover/balance, 13 UI,
  and 24 migration tests.
- The live defect is confirmed: `GeneratedPlayer.contract.years` never advances.

## Architecture gate result

Sol thread `019f552e-4389-7501-8f16-a1256dcd1824`
(`gpt-5.6-sol`, xhigh, read-only) returned `REPLAN`, P0/P1/P2 = 0/5/0. Kevin's
explicit 2026-07-12 oracle authorization resolved the three goal-language
contradictions exactly as Sol recommended. See
[SOL_ARCHITECTURE_GATE.md](./SOL_ARCHITECTURE_GATE.md). The same Sol thread
subsequently froze the numeric population-growth bands and returned
`BANDS_FROZEN` + `ARCHITECTURE_READY`, P0/P1/P2 = 0/0/0; implementation is now
authorized.

The source-compatible implementation architecture, conditional on that scope
decision, is:

1. Use one null-to-live `ensureOffseasonState()` helper as the sole persisted
   once-per-season marker and contract-clock seam. Remove/bypass no alternate
   creator: all must route through it. Precompute immutably; assign the marker
   last.
2. Add one pure sim-core clock/option function. Visit every non-retired player,
   decrement only positive years, leave zero-year players byte-identical, and
   consume zero RNG.
3. Because option semantics are ambiguous, implement automated team options
   only. Exercise at calculated value greater than or equal to the persisted
   annual salary; leave one year or expire to zero; consume only `teamOption`.
4. Retain assignment through arbitration, tender, extension, and QO phases;
   change QO eligibility to post-clock `years <= 0`; resolve QOs before capture;
   capture the market, then release exactly its entrants and rebuild affected
   roster states.
5. Create the market only when the existing free-agency phase is entered.
   Queries may not synthesize a future market; offers may not install one.
6. Use existing `storyFlags` and news storage for a one-time honest activation
   beat. Add no history and no schema field.
7. Preserve current user decision scope: automated option symmetry, existing
   tender/QO/extension behavior, existing roster warnings/actions, and existing
   final-rollover auto-fill.

Three goal-level acceptance changes are now authorized and binding:

- replace literal Goal 11 26/40 legality with no Goal-11 roster regression;
- split real compact-v33 compatibility from full-league economy soak;
- replace asymptotic retained-minor boundedness with no-double-clock plus
  observed per-season counts and player/byte slopes.

The amended goal and run documents implement those decisions. They may not be
reopened absent a genuinely new product consequence.

## Invariants and scope cut

- Worker is canonical; UI/store state is a mirror.
- One clock application per completed season; years never negative; retirees
  excluded; repeated offseason calls are idempotent.
- No player is simultaneously team-controlled and in free agency, signed twice,
  or assigned to two clubs.
- Identical user/CPU facts produce identical automated team-option outcomes.
- Option resolution is hash-stable and consumes zero RNG.
- Market construction is authoritative and query-pure.
- Same-seed before/after roster audits prove no Goal-11-caused structural
  regression; known Day-One 26/40 violations remain Goal 12's sole ownership.
- Exact no-double-clock invariants cover retry, reload, resume, user/CPU
  symmetry, option/FA single application, and persistence failure.
- The authentic compact-v33 compatibility rollover and current-schema
  full-league population/economy soak are separate mandatory receipts.
- Persistence status and reload behavior remain truthful through existing
  TRUST-A mutation/autosave lanes.
- The first-upgrade beat is honest and once-only; no fabricated past events.
- No bare `Math.random()`, new dependency, schema v35, new route/phase, Goal 12,
  adjacent economy behavior, push, deploy, tag, publish, or release.

## HIGH_RISK relay route

| Phase | Thread | Model | Effort | Deliverable | Gate |
| --- | --- | --- | --- | --- | --- |
| Source reconciliation and architecture | existing Goal 11 Sol coordinator | `gpt-5.6-sol` | xhigh | line-specific review of Source Truth/Plan and `ARCHITECTURE_READY` or `REPLAN` | seam, option cut, market authority, old-save behavior, soak bands, persistence, UX, and exact evidence budget are checkable |
| Implementation and bounded correction | one persistent Terra writer | `gpt-5.6-terra` | high; xhigh only on recorded evidence | patch, living docs, focused tests, calibration/soak, production browser artifacts | focused tests and typecheck green; maximum two review correction loops |
| Final adversarial review | same Sol coordinator, read-only | `gpt-5.6-sol` | xhigh | line-level P0–P2 findings and `MERGE_READY`/`FIX_AND_REVIEW` | every P0–P2 fixed by the same Terra writer and rechecked |
| Mechanical closeout and landing | one Luna closeout thread | `gpt-5.6-luna` | medium | frozen gates, Completion/Changelog/status, exact commit and local-main fast-forward | exact staged scope, all gates green, protected dirt unchanged |

Only Terra may write while implementation is active. Sol remains read-only.
Luna starts only after Sol's final verdict. A third correction loop is forbidden
unless Sol identifies an explicit P0/P1; otherwise split and report. Expected
usage class is `HEAVY` because the required worker soak and two durable browser
lanes cross simulation, offseason, persistence, and presentation systems.

## Milestones

| Milestone | Deliverable | Required proof | Status |
| --- | --- | --- | --- |
| M0 | source reconciliation, branch, authorized goal/run amendments, pre-edit baseline, numeric band freeze | exact writers/seams/option decision/market lifecycle/user boundary/size baseline plus same-Sol `BANDS_FROZEN` | Complete — `ARCHITECTURE_READY`, Sol 0/0/0 |
| M1 | pure canonical contract clock and team-option resolver | transitions, no-negative property, zero RNG, named user/CPU symmetry | Complete — 16/16 focused core tests green |
| M2 | worker once-only offseason integration and authoritative FA lifecycle | idempotence, release/QO/non-tender/no-duplicate, query purity, offer fail-closed, once-only honest news | Complete — focused worker coverage green |
| M3 | separate compatibility and bounded economy proof | authentic compact-v33 one-rollover/save/reload receipt; current-schema seeds 7111/7112/7113 over 6–10 rollovers; exact tables in `SOL_ARCHITECTURE_GATE.md` | Harness complete; 18-rollover execution reserved for parent gate |
| M4 | player-facing existing-surface changes and reload proof | Finance/FA/Offseason tests; production option and star-expiry hard reload; desktop/mobile if presentation changes | Existing surface audit/proof complete; browser proof reserved for parent gate |
| M5 | full gates, Sol final review, docs, commit, local-main fast-forward | all gates green, P0–P2 zero, exact stage, protected hashes, no push/deploy | Complete — final receipts green; closeout/landing below |

## Frozen evidence budget

Focused commands may be tightened to changed files but may not omit these
systems:

- `packages/sim-core/tests/contracts.test.ts`
- `packages/sim-core/tests/finance.test.ts`
- `packages/sim-core/tests/freeAgency.test.ts`
- `packages/sim-core/tests/offseason.test.ts`
- Goal 11 worker clock/soak/old-save tests plus existing
  `sim.worker.test.ts`, `sim.worker.rollover.integration.test.ts`, and
  `sim.worker.balance.test.ts`
- snapshot normalization/import and `packages/contracts/tests/save.migration.test.ts`
- calibration, calibration report/dump, and `pnpm playtest:calibrate`
- Finance, Free Agency, and Offseason route/component tests
- Goal 11 production Playwright, then current `reload-smoke.spec.ts`, one worker,
  zero retries, fresh production build
- root `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `pnpm verify:determinism`

The browser artifact must prove: a deterministic team-option outcome becomes
durable, survives hard reload, and remains consumed; a named user star reaches
zero, is released into the exact canonical market before any offer, the market
survives reload, and no retry/flaky classification occurs.

## Expected owned paths

- Goal/run/changelog/bounded roadmap status for Goal 11;
- `packages/sim-core/src/finance/contracts.ts` and focused finance tests;
- the smallest free-agency export/query adjustment required by the authority
  decision and focused tests;
- `apps/web/src/workers/sim.worker.helpers.ts`, actions/queries only where the
  mapped market lifecycle requires them, snapshot/worker/soak tests;
- existing Finance, Free Agency, Offseason surface components/tests only;
- calibration harness/report/dump, determinism snapshot, and `TUNING.md`;
- one bounded Goal 11 Playwright spec/helper if necessary.

Any need for a new schema field, phase, route, backfill algorithm, farm pruner,
arbitration/QO redesign, or change to auto-fill logic is a Sol re-plan/stop
condition rather than an inferred scope expansion.

## Progress log

1. 2026-07-12 — Item 8 landing independently reverified; Goal 11 branch created
   from local main with protected unrelated dirt unchanged.
2. 2026-07-12 — Read Goal 11 and live contract/offseason/market/persistence/UI
   seams; enumerated all writers; confirmed team-option-only cut and no user
   tender/option action; froze market authority, retained-minor, old-save,
   calibration, and browser evidence budgets.
3. 2026-07-12 — Pre-edit baseline passed: 74 sim-core, 151 worker, 13 UI, and
   24 migration tests. Current/deep snapshot sizes measured with temporary tests
   and the temporary files removed.
4. 2026-07-12 — Sol xhigh architecture gate returned `REPLAN` 0/5/0. Source
   corrected the QO/release ordering and exposed three literal goal
   contradictions: current roster architecture begins at 28/84, the compact
   v33 fixture is not a playable full league, and current draft/retirement rules
   cannot prove an asymptotic minor-population bound. Production remains
   untouched pending authority to revise/split those acceptance clauses.
5. 2026-07-12 — The identical scope blocker recurred for three consecutive
   persistent-goal turns without an authority change. The run is formally
   blocked before production; no Terra writer was created and no Goal 11 source
   was edited. Resume only after explicit authority to amend or split the three
   contradictory acceptance clauses.
6. 2026-07-12 — Kevin supplied the explicit oracle decision: Goal 11 now proves
   no Goal-11-caused roster regression while Goal 12 retains Day-One legality;
   compact-v33 compatibility and current full-league soak are separate; finite
   exact no-double-clock and measured population slopes replace asymptotic
   proof. The oracle block is resolved. Production remains untouched while the
   same Sol thread freezes source-grounded numeric population bands.
7. 2026-07-12 — The current-source baseline completed 3 seeds × 6 rollovers in
   810.43 seconds. The same Sol xhigh thread returned `BANDS_FROZEN` and
   `ARCHITECTURE_READY`, P0/P1/P2 0/0/0. M0 is complete; the next legal action is
   exactly one Terra implementation writer.
8. 2026-07-12 — Terra re-grepped the live production seams before editing. The
   source still matches the frozen design: the only production
   `createOffseasonState()` writers are `ensureOffseasonState()` and the
   draft-pick recorder; `getFreeAgents()` synthesizes a read-only transient
   market while `makeContractOffer()` synthesizes and can install one; QO
   eligibility remains `years <= 1`; and free-agency entry resolves QOs before
   `simulateFreeAgencyDays()` lazily creates its market. No new contradiction
   was found. M1 is now in progress.
9. 2026-07-12 — M1 implemented: `advanceContractForOffseason()` is pure and
   immutable, leaves zero-year players referentially/structurally unchanged,
   caps normal expiry at zero, and resolves only a one-year team option using
   `calculatePlayerValue >= annualSalary` with zero RNG. Player option,
   opt-out, and total-value facts remain untouched. Focused core tests: 16/16
   passed; sim-core typecheck passed.
10. 2026-07-12 — M2 checkpoint implemented: the sole null-to-live offseason
    creator precomputes clock/news/story data before commit and writes the
    marker last; the draft-pick alternate creator now routes through it. QOs
    require post-clock `years <= 0` and revalidate stale records. Free-agency
    entry resolves QOs, captures entrants, releases/rebuilds affected teams,
    replaces embedded entries with released canonical players, and creates no
    empty-team roster state. Query and offer paths are pure/fail-closed unless
    the persisted market is canonical; mismatched imported markets fail closed.
    Focused worker suite passed (143 tests) and web typecheck passed.
11. 2026-07-12 — The authentic compact v33 `season10.json` fixture now has a
    dedicated worker receipt: migration/import preserves its factual player,
    one applicable offseason clocks 1→0, the honest activation beat appears
    once, export/import reload retains the marker, and a resumed advance does
    not re-clock. The focused test passed; it is explicitly not a full-league
    economic claim.
12. 2026-07-12 — Coordinator checkpoint caught two source-freeze defects before
    review: the initially captured market entries needed explicit replacement
    with released canonical players, and news deduplication needed to move into
    precompute. Both were corrected. The hostile market assertion now requires
    referential as well as structural equality and a readable canonical market;
    the double-clock hostile assertion requires a second advance to leave years
    unchanged. Full focused worker suite exited green; core contracts 16/16,
    web and sim-core typechecks, and `git diff --check` are green. The
    population matrix, root gates, production build/determinism, and browser
    proof remain deliberately unrun in the parent gate phase.
13. 2026-07-12 — Added the permanent current-schema worker soak harness and
    ordinary pure metric tests. The gated real matrix uses exactly seeds
    7111/7112/7113 for six rollovers, measures every frozen population/flow,
    slope/curvature, market, entry/exit, ownership, clock, option, roster, and
    report-only metric, and fails on the frozen individual/mean bands or exact
    invariants. It is intentionally selected only by
    `MBD_ECON_CLOCK_SOAK=1 pnpm --filter @mbd/web exec vitest run src/workers/econClockSoak.test.ts --reporter=verbose`.
    Normal `econClockSoak.metrics.test.ts` passed 4/4, while the explicit-gate
    test reports skipped when the env flag is absent.
14. 2026-07-12 — Presentation audit found no additional route/component work
    necessary: Finance already labels expiring money, Free Agency already
    explains its natural expiring-player market, and the worker's existing
    News surface now carries the automated option outcome and honest one-time
    clock activation. Focused Finance/FA/Offseason component tests passed
    10/10; worker proof confirms option news is query-visible. The critical
    market-query bug is resolved in source: null or mismatched persisted market
    queries return empty and offers fail closed, while the only creator is FA
    phase entry.
15. 2026-07-12 — Source-freeze focused receipt: ordinary soak formulas and
    presentation tests ran as 14 passed plus the one clearly named env-gated
    matrix skipped; contracts 16/16; contract migration 24/24; focused worker
    lifecycle selections green; web and sim-core typechecks green; `git diff
    --check` green. No root suite/build/determinism/Playwright or gated matrix
    was run. Protected hashes stayed exact and the index stayed empty.
16. 2026-07-12 — Correction loop 1 closed the parent source-freeze audit.
    Canonical-market validation now rejects assigned/stale/duplicate/missing
    entries, user signing never writes `rosterStates[""]`, and invalid imported
    market state fails atomically at the QO→FA boundary. The permanent soak now
    independently reconstructs post-QO market eligibility, conserves canonical
    IDs through clock/QO/capture/release, attributes entrants/exits and ownership
    changes, partitions team options, replays the persisted QO boundary for
    exact same-seed/RNG equivalence, and compares invariant categories. Its
    ordinary metric test directly kills double-clock, unreleased-market,
    duplicate/misattributed option/entrant/assignment, and new-category mutants
    before green restoration. The real 3×6 matrix remains deliberately unrun.
17. 2026-07-12 — Added the narrow calibration receipt: `index.ts` now guards
    QO→FA market size at the frozen 1–899 range, while natural expiry and
    offseason assignment churn are reported without fabricated absolute bands;
    payroll spread remains in the existing finance guard. `TUNING.md` documents
    that disposition and the explicit parent soak command. Presentation added
    only truthful closed-market wording for expiring contracts and focused News
    proof for the persisted activation copy; no route or decision UI changed.
    Final focused commands: web worker/metrics/presentation suite 162/162;
    sim-core contracts+calibration 24/24; contracts migration 24/24; both
    affected typechecks; and `git diff --check` all passed. The gated matrix,
    root suite/build/determinism, and Playwright remain unrun by design.
18. 2026-07-12 — Correction loop 2 closed the final source-freeze audit.
    Invalid persisted markets now fail before every transition touching free
    agency, including resumed days and FA→Draft; focused QO→FA, within-FA, and
    FA→Draft tests assert exact snapshot/RNG no-ops. The gated soak resolves
    QOs once in its harness, snapshots that post-QO/pre-market state, derives
    eligibility with `createFreeAgencyMarket`, and measures the unique union of
    remaining and day-one-signed entries. It replays that exact snapshot and
    checks signed canonical ownership plus exactly one signing result. The
    calibration dump now reports the same unique union size. Ordinary metrics
    added red/green hostile proof for omitted day-one membership and duplicate
    union membership. Focused final receipt: web worker/metrics/presentation
    164/164; sim-core contracts+calibration 24/24; migration 24/24; web and
    sim-core typechecks; and `git diff --check` all green. No reserved gate ran.
19. 2026-07-12 — The authorized third-loop P1 bounded split corrected only
    Goal-11 FA admission capacity. Exact seed 7112 rollover-5 evidence showed
    `auth-chi-mlb-020` and `auth-nas-aa-010` entering SFB and producing final
    28 versus counterfactual 26. User and CPU signings now share canonical
    26-slot admission; baseline overages are not repaired. Focused core 19/19,
    worker/metrics 168/168, both affected typechecks, and the exact seed replay
    passed with neither admission and no weakened causal assertion.
20. 2026-07-12 — Parent measurement gate completed. The first serial attempt
    passed seeds 7111/7112 and exposed the provisional 899 market ceiling at
    seed 7113 rollover 3 (observed 924 after phase), not a production defect.
    Sol authorized a measurement-only upper-band bypass with negative controls.
    The exact 3×6 rerun passed in 894.07s, emitted digest
    `34f2d653f434c8235e18da9375f24d46145c72347d5f2ca94d2d30cbcc569c0e`,
    and showed zero Goal-11 roster overages or unexplained causal rows.
21. 2026-07-12 — Sol refroze the finite post-clock bands from the complete
    artifact, corrected the coordinator's outward rounding, approved absolute
    minor/MLB/unassigned bands plus slope acceleration gates, and aligned the
    diagnostic FA-market registry to 1–1089. Focused boundary/negative-control
    tests pass 20/20 with the matrix named and skipped; strict digest gate is
    the next action. No asymptotic, Goal-12, schema, or adjacent-economy scope
    was added.
22. 2026-07-12 — Final Sol `FIX_AND_REVIEW` correction: phase-gated null-to-
    live clock admission and draft ordering; complete available/signed
    canonical-market validation; accepted-but-not-durable FA-offer truth;
    explicit Finance/ledger/departure presentation; and a public E2E source
    extension for expiry → market → re-sign → reload. No expensive matrix,
    root suite/build, or Playwright run is authorized in this writer turn. The
    parent must rerun the strict digest because persisted departure news changes
    economy snapshots.
    Focused receipt: `pnpm --filter @mbd/sim-core exec vitest run
    tests/contracts.test.ts tests/freeAgency.test.ts --reporter=verbose` passed
    35/35 (the first attempt stopped before collection with transient temp-dir
    `ENOSPC`; no source/cache cleanup occurred; immediate rerun green).
    `pnpm --filter @mbd/web exec vitest run src/workers/sim.worker.test.ts
    src/workers/econClockSoak.metrics.test.ts
    src/features/free-agency/hooks/useFreeAgencyOfferActions.test.tsx
    src/features/finance/components/FinanceContractTablePanel.test.tsx
    src/features/offseason/components/OffseasonTransactionLedgerPanel.test.tsx
    src/features/news/components/NewsItemCard.test.tsx --reporter=verbose`
    passed 176/176. `pnpm --filter @mbd/web run typecheck`, `pnpm --filter
    @mbd/sim-core run typecheck`, and `git diff --check` passed. No parent-
    reserved matrix, root suite/build, or Playwright run occurred.
23. 2026-07-12 — Final bounded P1/P2 correction: advance/skip offseason
    transitions no longer auto-publish worker flow. Their route handler now
    publishes exactly once only after an exact `saved:true` receipt through a
    save-bound notifier that rejects stale A-after-B callbacks. Finance DTOs
    expose team-option truth and distinguish it from true one-year expiry;
    the derived option ledger says a declined option is pending retention or
    later free-agency entry, never an immediate release. Focused web receipt:
    flow/handler/Finance/signing/AppLayout suite 39/39, focused worker option
    proof 2/2, ledger component 2/2, and web typecheck passed. No matrix,
    root suite, build, determinism, or Playwright run occurred.
24. 2026-07-12 — Parent final gate receipts were reconciled: strict soak 2/2
    with identical digest `5477faee99676a965a51a9ea394a179097f8c41c1ad96c06f83d3fb43ffe0814`,
    compact-v33 compatibility 1/1, authoritative ECON Playwright 1/1 with zero
    retries, reload-smoke desktop/mobile 2/2 with zero retries, root typecheck
    9/9, root tests 8/8 tasks (web 461 files, 2,334 passed/3 skipped), build/PWA
    5/5 (3,026 modules; 166 precache entries), determinism 3/3, and
    `git diff --check` green. The final Sol verdict is `MERGE_READY` 0/0/0.
    M5 is complete; Luna owns documentation, exact staging, commit, and local
    main fast-forward only.
