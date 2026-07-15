# ECON-EXTENSION-AI-1 — Completion

## Outcome

Roadmap item 13 is verified complete. Every CPU organization evaluates
its own active MLB core once on entry to the canonical extension phase using
persisted current-GM posture, permitted live team state, exact service days,
team-scoped seeded RNG, replacement payroll, and the shared player negotiation
rules. Accepted and rejected attempts form coherent contract/history/phase/news
facts, survive exact durable save and hard reload without replay, and malformed
or stale work fails closed. GameSnapshot remains v34, Dexie remains v6, and
roadmap items 14 and 49 were not started or claimed complete.

## Acceptance matrix

| ID | Implementation artifact | Focused proof | Browser/final proof | Remaining risk |
| --- | --- | --- | --- | --- |
| EXT-1 | `contracts.ts` canonical own-team/MLB candidate filter and worker phase-entry batch | candidate legality, young-core, user exclusion, and phase-routing tests | production enters `extensions` through public Advance | None identified. |
| EXT-2 | persisted `gmPersonalities` in transient `ExtensionTeamContext`; bounded priority/term/opening/counter policy | identical-facts `prospect_hugger` vs `win_now` test; all five identities in study | seeded `win_now` BOS signs its star | Current-GM posture is not permanent franchise DNA; item 49 remains partial. |
| EXT-3 | exact service-day context and observable-ability archetype input | contradictory legacy years, potential/ceiling-only, shared player-demand/threshold controls, and equal player target/walk-away draws across GM postures | full deterministic gates green | Existing scouting systems elsewhere are outside this slice. |
| EXT-4 | versioned season/team/candidate offer and negotiation RNG lanes plus factual-news scope | same input, shuffled storage, earlier no-op insertion/removal, user-team swap, unrelated RNG, and parent-state equality | hard reload retains exact facts; determinism 3/3 | Algorithm version intentionally makes future policy changes explicit. |
| EXT-5 | replacement-payroll admission and final accepted-contract budget recheck | near-budget replacement, multi-deal accounting, final-concession guard | four-seed study has zero overages | Long-horizon revenue pressure is item 14/15 work. |
| EXT-6 | coherent accepted/rejected player history plus worker phase/news commit | accepted/rejected once-only, contract unchanged on rejection, no roster/tenure side effects | IndexedDB binds exact contract/history/result/news | Older rejected rows without history remain honestly sparse. |
| EXT-7 | `validateCurrentExtensionAggregate` before and after phase work | missing/empty/duplicate/orphan/wrong-team/nonterminal-status/illegal-term/accepted-contract/history mismatch and replay tests | phase re-entry does not duplicate the durable fact | Corrupt saves fail closed instead of receiving invented repair. |
| EXT-8 | total runtime offer predicate plus public mutation/session signature bound to player/team/season/baseline contract | forged CPU player, reassignment, terminal replay, invalid enum/boolean/array/deferred shapes, illegal terms, and stale-session byte/RNG/pending-session no-ops | full worker suite green | Manual multi-round session durability remains a separate trust slice. |
| EXT-9 | existing exact-save coordinator plus extension-shaped retained snapshot | pre-acceptance rollback and post-acceptance retained-retry tests | public Advance waits for durable receipt before reload | Branch/save authority is inherited from the existing coordinator tests. |
| EXT-10 | existing v34 GM/history/offseason facts; no schema change | current snapshot fixed point, old/default-empty compatibility, snapshot 19/19 | v34 import, durable write, and hard reload pass | No old-save motive or rejected-history prose is fabricated. |
| EXT-11 | `cpuExtensionAI.test.ts` plus existing balance gate | four exact-replay league seeds, 123 attempts/122 accepts/1 reject, all five identities, zero overage/duplicate/history/RNG violations; balance 9/9 | full suites green | This bounded study is not item 18's 30-season soak. |
| EXT-12 | existing Offseason ledger, News, Player History, and archive projections | focused component/route/lazy-shell tests | production CPU extension 1/1; desktop and 375×667 controls/ledger readable, focused, contained | Broader release-wide visual QA remains separate. |
| EXT-13 | Goal/run/changelog/roadmap artifacts and item-only source/tests | `git diff --check`, focused suites, web/root typecheck, bundle gate | full tests/build/determinism and reload-smoke green | Remote CI is unrun because push is not authorized. |

## Verification receipts

- Focused correction freeze: contracts/front-office 33/33; main worker,
  snapshot, exact-save, study, boot/Setup/Save Hub/Settings/recovery/App shell,
  route/lazy-shell and bundle-budget 12 files / 269 tests; balance 9/9;
  sim-core and web/e2e typecheck passed.
- Four-seed study receipt:

| Seed | Eligible | Attempted | Accepted | Rejected | Avg years | Avg AAV | Violations |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 7301 | 868 | 29 | 29 | 0 | 5.034 | 18.902 | none |
| 7302 | 868 | 29 | 29 | 0 | 4.931 | 20.019 | none |
| 7303 | 868 | 33 | 33 | 0 | 5.152 | 19.415 | none |
| 7304 | 868 | 32 | 31 | 1 | 4.906 | 18.680 | none |

  “None” means zero budget overages, duplicate results, history mismatches, and
  parent-RNG changes. Replay digests matched exactly, and all five GM
  personalities produced attempts.
- Root typecheck: 9/9 tasks. The initial wrapper stopped before compilation
  because the desktop fallback selected pnpm 11 and would not replace ignored
  modules non-interactively. A temporary `/tmp` Corepack pnpm-9 shim matched the
  repository's declared `pnpm@9.15.4`; the authoritative rerun passed without a
  repo or dependency change.
- Root full test: contracts 24/24; UI 1/1; sim-core 141 files / 1,670 tests; web
  464 files passed + 1 intentional skip and 2,393 tests passed + 3 intentional
  skips; Turbo 8/8. Expected stderr from failure-path/jsdom tests did not fail a
  suite.
- Production PWA: 3,029 modules; 167 entries / 4,056.42 KiB
  precached. Route/lazy-shell and bundle-budget gates passed without a ceiling
  increase.
- Determinism snapshot: 3/3.
- Final authoritative production Chromium: CPU extension 1/1 plus reload-smoke
  2/2 in 4.8m,
  one worker, zero retries, no flaky result. The journey imports v34, enters the
  phase through public controls, proves an exact durable contract/history/
  result/news tuple, hard reloads, advances inside the phase without replay,
  and opens the News surface.
- Mobile/desktop inspection: the 375×667 Advance control was keyboard-focused
  and inside the viewport; the factual ledger row remained contained and read
  `Eli Anchor signed an extension with Boston Noreasters for $20.27M/yr (6 years)`.
  The same row and page remained readable at 1280×720.
- Deliberate negative control: temporarily neutralizing
  `gmExtensionPriorityAdjustment` made the persisted-personality regression
  fail (`gm-current-star` replaced expected `gm-young-core`). The source was
  restored immediately and the same test passed 1/1. The bypass is absent from
  the final diff.

## Findings discovered and fixed

1. Sequential parent `rng.fork()` made unrelated CPU results depend on which
   team the user controlled. Versioned team-scoped RNG now leaves parent state
   and common CPU outcomes unchanged.
2. Extension identity read hidden potential/ceiling and a legacy service-years
   map. It now uses observable current ability and exact `serviceTimeDays`.
3. Payroll double-counted the old AAV and tolerated 106% of the real budget.
   Replacement accounting now enforces the exact ceiling.
4. The first bounded study found a second budget edge: a final negotiated
   concession could reach `$294.13M` against a `$294.04M` CLE budget after the
   opening-offer check. Accepted terms are now rechecked before commit.
5. CPU rejection lacked player-history memory; it now records one terminal
   factual attempt and replay produces no duplicate.
6. Public callbacks could target a CPU/reassigned player, reuse a stale session,
   submit illegal terms, or apply after a terminal result. All now reject before
   RNG or mutation with exact state equality.
7. Imported extension rows were not a validated aggregate. Missing, duplicate,
   wrong-owner/level, illegal-term, and accepted contract/history contradictions
   now fail closed before phase RNG or mutation.
8. Post-correction reload-smoke exposed two test-only stale assumptions: a
   Press Conference handler could intercept its own explicit Skip click, and an
   exact `Offseason` heading assertion no longer matched `Offseason - Season 1`.
   Initial dismissal now precedes handler installation and the route assertion
   uses the rendered semantic heading. The final complete browser run is 3/3.
9. The first correction's candidate seed still included GM personality and
   team-building archetype, so organization identity could shift player-side
   demand and walk-away draws. Both identity inputs were removed from the
   player-side seed; a direct regression proves equal player targets and first
   walk-away rolls across GM postures while team opening AAV still differs.

## Adversarial review

First verdict: **FIX_AND_REVIEW — 0 P0 / 4 P1 / 1 P2**. First correction
recheck: **FIX_AND_REVIEW — 0 P0 / 1 P1 / 0 P2**. Final verdict:
**MERGE_READY — 0 P0 / 0 P1 / 0 P2** from the same read-only review thread.

The reviewer found that the hidden-truth correction had altered a shared
archetype used outside extensions; candidate rounds still shared one team RNG;
nonterminal imported status could suppress a club; the offer guard was partial
over runtime shape; and the report claimed two hostile cases not yet present.
The first bounded correction loop restored shared semantics while adding an
extension-only observable archetype, split each candidate into stable offer and
negotiation streams, made aggregate/offer validation total, added every missing
hostile test, and changed roadmap status back to in progress. Focused tests and
affected-package typechecks passed. The first recheck then found one new P1:
identity was still present in the player-side RNG seed. The second and final
authorized correction removed it and added a direct player-target/walk-away
neutrality regression. Focused tests, the study, full root gates, and the final
production browser run are green. The reviewer independently reran the 26-test
contracts file, confirmed all six prior findings closed, and found no new
actionable P0–P2. GM/team posture cannot change player demand or response draws
when term and player/economic facts are fixed; canonical team ID remains only a
deterministic scope key, not a player-policy adjustment.

## Compatibility, scope, and rollback

- GameSnapshot v34 and Dexie v6 are unchanged; no migration, dependency, route,
  or bundle threshold was added.
- Existing GM personalities and extension facts use their supported save
  lineage. Older saves without rejection history remain empty rather than
  receiving fictional attempts or motives.
- Manual multi-round user-session persistence is a known separate trust issue.
  The public mutation was authority-hardened, but this CPU-only slice does not
  claim that broader redesign.
- Item 49 remains partial: this slice consumes current-GM posture in one domain
  and does not introduce permanent franchise DNA or cross-domain unification.
- Items 14–18, Day-One rosters, trades, revenue/tax, FA explanation, salary
  retention, in-season scheduling, and all later roadmap work remain untouched.
- Before landing, rollback is limited to the owned item-13 paths. After landing,
  revert the single item-13 commit; no schema downgrade is required.
- No push, deploy, publish, tag, release, or item-14 work occurred.

## Actual collaboration route — manual relay-pattern fallback

Persistent child-thread model routing was unavailable, so no underlying GPT-5.6
model claim is made. Requested role/effort labels describe the manual review
pattern, not verified model routing.

| Phase | Thread/task ID | Actual model/effort evidence | Artifact | Status |
| --- | --- | --- | --- | --- |
| Reconstruct | `/root`, `/root/extensions_source_map`, `/root/extensions_test_map`, `/root/extensions_risk_review` | model metadata unavailable; manual Sol-pattern, requested xhigh | live source map, test/negative-control map, P0-P2 risk map, frozen Goal 23/plan | Complete; bounded CPU-only architecture approved |
| Implementation | `/root` | model metadata unavailable; manual Terra-pattern, requested high | production/test patch, focused correction, four-seed study, browser proof | Complete; sole writer; all gates green |
| Adversarial review | `/root/extensions_final_review` | model metadata unavailable; manual Sol-pattern, requested xhigh | line-level goal/diff/test/compatibility/scope review and same-thread correction rechecks | Final `MERGE_READY` 0/0/0 after `FIX_AND_REVIEW` 0/4/1 and 0/1/0 |
| Mechanical closeout | `/root` | model metadata unavailable; manual Luna-pattern, requested medium | gate receipts, docs, exact staging/commit/local-main fast-forward | Complete |

Only the parent wrote the checkout. Read-only source/test/risk work completed
before source freeze and did not race browser, index, or landing operations.

## Relay retrospective

1. **Uncertainty discovered too late:** after candidate RNG was made stable, its
   seed still contained GM identity and therefore allowed the team's posture to
   change player-side target and walk-away draws. The final-budget concession
   gap was the earlier late discovery from the source-freeze study.
2. **Earlier artifact/gate:** an explicit team-versus-player influence matrix,
   with same-term cross-personality assertions for every player RNG draw, would
   have exposed the identity leak before implementation review. A terminal-
   contract invariant table and near-budget mutant would likewise have exposed
   the concession gap before the study.
3. **Owning role:** the Sol-pattern architecture role should own both the
   influence matrix and terminal economic invariants; the Terra-pattern writer
   should encode them as pure tests and study assertions before worker/UI
   integration.
4. **Sequential phases:** identity/authority model → pure policy and budget
   invariants → worker aggregate validation → exact-save proof → bounded study →
   source freeze → production browser → final review → staging/landing. Writer,
   browser mutation, review correction, and Git closeout must remain sequential.
5. **Safe parallel read-only work:** source/seam mapping, test inventory,
   old-save/schema audit, CPU fairness/RNG threat modeling, and existing UX/
   bundle inspection can run in parallel before the writer begins.
6. **Recommended route:** freeze a team/player/season identity table and a
   negotiation-to-durable-receipt state machine; add exact final-budget,
   user-team-swap, hidden-truth, malformed-aggregate, and retained-snapshot
   controls; use one writer; run focused tests/typecheck and the multi-seed study;
   execute a fresh production hard-reload journey; then one final adversarial
   review and exact mechanical landing.
7. **Prioritized improvements:** (1) freeze a team-versus-player influence
   matrix and test each RNG lane before worker integration; (2) require final
   accepted-state invariants, not opening-admission checks, in every economic
   goal; (3) run the multi-seed negative control immediately after the pure
   engine checkpoint; (4) assert exact worker/save/team/player/season identity
   at every async boundary; (5) model terminal and retry states before
   production edits; (6) keep phase artifacts small enough for review before
   the next layer and run an early production phase-entry/reload smoke; (7)
   preserve the one-writer/sequential source-freeze and landing discipline.

## Next legal work

Roadmap item 14—owner payroll pressure/tax consequences—is next in a new goal
slice. It was not begun here.
