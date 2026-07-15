# ECON-QUALIFYING-OFFERS-1 — Completion

## Outcome

Roadmap item 12 is complete. A club can issue one qualifying offer at one fixed
phase salary; the result resolves once under seeded canonical ordering; and an
outside signing cannot become authoritative unless one exact eligible signing-
club pick is forfeited with one linked former-club supplemental award. The
supplemental slot survives save/reload and is drafted exactly once. Manual
player actions use the existing exact-save session and durable receipt boundary.
GameSnapshot remains v34, Dexie remains v6, and item 13 was not started.

## Acceptance matrix

| ID | Implementation artifact | Focused proof | Browser/final proof | Remaining risk |
| --- | --- | --- | --- | --- |
| QO-1 | `sim-core/roster/freeAgency.ts`, normalized offseason QO salary, worker eligibility projection | Exact service-day boundary, contradictory years-map, fixed-salary, stable-ID tests | full sim/web green; production salary line survives reload | Existing policy remains MBD's three-year/per-season rule, not a claim of current MLB fidelity. |
| QO-2 | Authorized worker issue action plus internal team-scoped CPU issuance | forged CPU-player, duplicate, invalid-phase, and byte/RNG-identical no-op tests | QO issue persists once in production | Direct worker authorization is enforced; UI visibility is not treated as security. |
| QO-3 | Canonical team/player resolution and retained terminal records | explicit accept/reject, storage permutation, re-entry, and terminal RNG tests | rejected state and exact integrity pair survive hard reload | None identified. |
| QO-4 | Canonical FA market transition and strict lifecycle aggregate validator | accepted-never-enters, rejected-once, unsigned and former-team no-compensation tests | production rejected player reaches the market and outside signing becomes compensated | Historical saves without QO facts remain honestly empty. |
| QO-5 | `planDraftPickCompensation`, pure CPU reservations, atomic worker plan/commit, relational validator | user/CPU award-loss conservation, no-pick unchanged, protected/traded/multiple-signing, runner-up admission, malformed aggregate matrix | production DB proves one BOS award and one signing-team loss | Compensation memory is bounded to existing v34 facts/news; no new career-history schema was added. |
| QO-6 | Exact draft-phase gate and completed-session topology/acquisition validation | early-call zero-RNG, stale session, malformed completed picks, slot order and once-only consumption | supplemental slot appears after round one, is picked once, and remains picked after reload | Conflicting imported completed history fails closed and requires a valid save rather than invented repair. |
| QO-7 | Existing exact coordinator/session/lease generalized for issue, resolve, accepted signing, draft start, and pick | coordinator 9/9 plus worker/handler tests for drain, retained retry, stale callback, root/branch, rollback, fail-close, and no-change discard | every high-emotion production checkpoint waits for durable save before presentation/reload | Production journey uses a root slot; branch identity is pinned by focused exact-save tests. |
| QO-8 | Seeded ordering, stable fact IDs, user/CPU shared compensation law | user-team swap, same-seed digest, CPU symmetry, three-seed conservation | determinism 3/3 and full suites green | CPU offer choice may differ legitimately; conservation and RNG semantics cannot. |
| QO-9 | v34 normalized QO/offseason/draft facts; no schema change | v7/default-empty, current-v34 nonempty round trip, snapshot matrix 19/19, malformed import fail-close | contracts migration 24/24; production reloads retain checksums | Old saves are not backfilled with fictional QO outcomes. |
| QO-10 | Existing Offseason, Free Agency, and Draft components/routes | panel, hook, route, keyboard, labels, lazy-shell, and mobile control tests | desktop plus 375×667 focus/bounds/screenshots pass in QO journey | Cross-engine visual polish remains a release-wide manual gate. |
| QO-11 | `e2e/qualifying-offers.spec.ts` on the production preview | fixture and IndexedDB integrity helpers compile under e2e TypeScript | 1/1 in 13.0s, one worker, zero retries/flakes; issue→reload→resolve→reload→sign→award/loss→draft→scout/pick→reload | None identified. |
| QO-12 | Worker conservation scenarios across seeds 12851–12853 | outside signings = awards = losses = unique slots; no duplicate consumption | worker 180/180 and full web green | This is a bounded slice study, not roadmap item 18's 30-season economy soak. |
| QO-13 | Goal/run/changelog/roadmap docs, scoped source/tests, no dependency/schema edit | `git diff --check`, e2e typecheck, bundle gate, no scoped bare `Math.random()` | root typecheck/test/build/determinism and both production browser gates green | Remote CI is unrun because push is unauthorized. |

## Verification receipts

- Focused final review receipts: worker 180/180; exact coordinator 9/9;
  offseason handlers 11/11; sim-core contract/draft/free-agency 66/66; direct
  web and e2e TypeScript passed.
- Root typecheck: 9/9 tasks passed with cache bypassed.
- Root full test command: contracts 24/24; UI 1/1; sim-core 141/141 files and
  1,665/1,665 tests; web 463 files passed + 1 intentional audit skip and 2,387
  tests passed + 3 intentional skips. Bundle budget and multi-year smoke passed
  inside the full run.
- Production PWA: 3,029 modules; 167 entries / 4,050.27 KiB precached;
  Offseason 42.53 KiB raw / 9.55 KiB gzip, Draft 42.52 / 9.26, Free Agency
  17.21 / 5.24. No bundle ceiling changed.
- Determinism snapshot: 3/3.
- Production Chromium QO journey: 1/1 in 13.0s, one worker, zero retries, no
  flaky result. It covers keyboard selection, 375×667 bounds, exact durable
  database facts, hard reloads, scouting mutation, supplemental pick, and
  exact-once consumption.
- Existing production reload-smoke: 2/2 in 4.7m, one worker, zero retries, no
  flaky result. Its postseason path now traverses every canonical offseason
  phase before exact draft admission.
- Deliberate negative control: temporarily bypassing the no-eligible-pick guard
  caused `rejects a compensated outside signing unchanged when no eligible
  signing-team pick exists` to fail by reaching commit with a null forfeiture.
  Restoring the guard made the same test pass. The bypass is absent from the
  final diff.
- `git diff --check` is green. No save-schema, Dexie, dependency, or scoped
  bare-`Math.random()` change exists.

The first root wrapper attempt invoked the desktop pnpm 11 fallback and stopped
before compilation on its ignored-`esbuild` policy. A temporary invalid
`allowBuilds` line was removed. The final authoritative commands used a
temporary Corepack shim for the repository-pinned pnpm 9.15.4 and passed.

## Adversarial review

The final verdict is `MERGE_READY` with zero actionable P0–P2 findings. The
review explicitly rechecked compatibility, CPU bidder order/reservations,
lifecycle integrity, exact no-change behavior, and Start/Skip/Advance fail-
closed semantics. Material findings discovered and fixed during the run were:

1. draft creation and mutation were reachable before compensation finalized;
2. manual QO/signing/draft actions lacked one exact mutation-to-snapshot owner;
3. a former club could receive an award without a signing-club pick loss;
4. user issuance could target CPU players and resolution depended on array order;
5. partial/imported lifecycle arrays were not one validated aggregate;
6. CPU bidder filtering could reserve/consume picks in the wrong order or let
   an ineligible bidder suppress a valid runner-up;
7. malformed transitions could return a normal view and trigger a false exact
   snapshot/presentation despite no coherent state change;
8. completed draft slots were not fully bound to player, signing, acquisition,
   and phase-receipt facts.

All were fixed and rechecked. The post-review closeout changed tests only: one
stale row-click assertion now targets the semantic player button, and browser
proof waits for scouting completion and traverses the strengthened phase gate.

## Compatibility, scope, and rollback

- GameSnapshot v34 and Dexie v6 are unchanged; no migration, dependency, route,
  or production bundle threshold was added.
- Missing old QO salary data derives only from persisted offered facts; old
  saves without QO facts remain empty. Inconsistent facts fail closed.
- Item 13 extension AI, budgets/revenue, explainable FA redesign, salary
  retention/trade expansion, Day-One rosters, and the 30-season soak remain out
  of scope and untouched.
- Before landing, rollback is limited to the owned item-12 paths. After landing,
  revert the single item-12 commit; no schema downgrade is required.
- No push, deploy, publish, tag, release, or item-13 work was performed.

## Actual collaboration route — manual relay-pattern fallback

Persistent child-thread model routing was not available, so no GPT-5.6 model or
effort claim is made. The role → artifact → gate structure was retained:

| Phase | Thread/task ID | Actual model/effort evidence | Artifact | Status |
| --- | --- | --- | --- | --- |
| Reconstruct | `/root`, `/root/qoffers_source_map`, `/root/qoffers_risk_review`, `/root/qoffers_test_map` | Model and effort metadata unavailable; manual Sol-pattern review | live source map, risk-ranked `NO-GO`, focused acceptance matrix, negative-control design | Complete; architecture frozen only after P0 questions were resolved |
| Implementation | `/root` | Model and effort metadata unavailable; manual Terra-pattern sole writer | item-12 production/test patch and two bounded correction loops | Complete; focused tests/typecheck green |
| Adversarial review | `/root/qoffers_final_review` | Model and effort metadata unavailable; manual Sol-pattern review | line-level compatibility, CPU order, lifecycle, no-change, and transition audit | `MERGE_READY`, zero P0–P2 |
| Mechanical closeout | `/root` | Model and effort metadata unavailable; manual Luna-pattern closeout | root/browser receipts, docs, exact staging/commit/local landing | Complete with landing recorded in Git history |

Only the parent wrote the checkout. Read-only review work did not race source,
browser, index, or landing operations.

## Relay retrospective

1. **Uncertainty discovered too late:** the aggregate was initially modeled as
   matching QO/award/loss arrays, but correctness also depends on canonical
   player assignment, the exact FA receipt and signed-market contract, plus the
   completed draft player's acquisition/signing facts. The no-change result
   also needed to own persistence capture explicitly.
2. **Earlier artifact/gate:** a lifecycle state-machine and relational-bijection
   table from offer through drafted slot, with exact worker/save identity at
   every edge, would have exposed both gaps before implementation.
3. **Owning role:** the Sol-pattern architecture/review role should own the
   aggregate/bijection and cross-lane persistence questions; the Terra-pattern
   writer should turn them into executable hostile imports and no-change tests.
4. **Sequential phases:** aggregate model → exact-save admission model → one
   writer → focused negative controls → source freeze → full gates → production
   browser → final review → Git closeout. Worker/browser mutation and staging
   must remain sequential.
5. **Safe parallel read-only work:** source seam mapping, schema compatibility,
   existing test inventory, UX/accessibility inspection, and CPU fairness risk
   analysis can run in parallel before the writer starts.
6. **Recommended route:** first freeze one QO-to-draft lifecycle diagram and
   exact save/worker identity table; add a two-bidder pure reservation control,
   award-without-loss mutant, malformed aggregate matrix, and completed-prefix
   player/acquisition check; use one writer; run focused tests and typecheck;
   execute the production two-surface reload proof; then final adversarial review
   and mechanical landing.
7. **Prioritized improvements:** (1) require relational aggregate/bijection
   modeling before code; (2) add exact worker/save identity assertions to the
   first test checkpoint; (3) run the no-eligible-pick mutant and two-bidder CPU
   negative control before UI work; (4) validate completed draft prefixes with
   player/acquisition/receipt facts, not slots alone; (5) standardize explicit
   `changed`/`no-change` persistence contracts; (6) run an early production
   phase-gate journey immediately after the exact coordinator seam; (7) keep
   phase artifacts small enough for Sol-pattern review before the next layer.

## Next legal work

Roadmap item 13—identity-driven CPU extensions—is the next eligible slice. It
requires fresh source/goal reconciliation on its own branch/worktree and was
not begun in this run.
