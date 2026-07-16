# ECON-MARKET-REVENUE-1 — Completion Report

## Outcome

Roadmap item 15 is complete and `MERGE_READY`. Market tier, the factual final
162-game record, playoff qualification, and canonical owner archetype now
produce one deterministic modeled-revenue statement for every organization at
the exact Season Review Advance/Skip boundary. The worker atomically publishes
the next-season budget and five related allocations, exact-save persistence
binds the accepted snapshot, and Finance, Owner Intel, and Offseason show the
same durable facts.

GameSnapshot remains v34, Dexie remains v6, no dependency or route was added,
and item 16 was not started.

## Implementation artifacts

- Pure economics: `packages/sim-core/src/finance/marketRevenue.ts`, explicit
  team-market lookup in `finance/contracts.ts`, barrel exports, and formula/
  boundary tests.
- Annual authority: `apps/web/src/workers/sim.worker.marketRevenue.ts` plus the
  exact `season_review` rollover seam, full playoff-topology validation,
  idempotent hostile-state repair, coherent statement query, and archive
  derivation.
- Financial ownership: ordinary owner evaluation and narrative consequences no
  longer rewrite budgets; existing CPU extensions, free agency, achievements,
  job switching, archives, trade/policy, and allocation consumers read the
  reconciled raw fields.
- Presentation: one shared `MarketRevenueStatementPanel` on Finance, Owner
  Intel, and Offseason; raw and effective gameplay budgets are labeled
  separately and projected tax remains separate.
- Evidence: `marketRevenue.test.ts`, `marketRevenue.study.test.ts`, authentic
  rollover and exact-save coordinator coverage, component tests,
  `e2e/market-revenue.spec.ts`, and desktop/mobile screenshots under
  `evidence/`.

## Acceptance mapping

| ID | Implementation artifact | Focused proof | Browser/final gate | Remaining risk |
| --- | --- | --- | --- | --- |
| MRB-1 | pure statement plus explicit market lookup | exact tiers, cents, bounds, byte-equivalent replay, zero RNG | determinism 3/3 | none within modeled formula |
| MRB-2 | final standings and exact berth input | controlled record/playoff twins and monotonic tier cases | production journey verifies factual final record and completed bracket | no round-specific payout by scope |
| MRB-3 | worker precompute/atomic apply at outgoing `season_review` | 32 updates, Advance/Skip equivalence, no ordinary rewrite | 32 durable receipts after exact Advance | none found |
| MRB-4 | canonical reconciliation and normalized artifacts | stale/missing owner fields, duplicate/missing flags, half-story, retry/reload/resume | reload retains singular statement/story | none found |
| MRB-5 | canonical input whitelist and shared team path | user/difficulty/philosophy/satisfaction/payroll/tax negative controls | all 32 teams settle together | legacy effective-budget difficulty overlay remains clearly separate until item 55 |
| MRB-6 | existing exact-save offseason executor and session fence | baseline rollback, retained-post retry, stale-save callbacks, no false capture | each browser mutation waits for a changed durable timestamp and `Saved` | none found |
| MRB-7 | six persisted owner fields consumed by real systems | controlled CPU affordability, pools, policy, trade, archive, and four-surface agreement | Finance/Owner Intel/Offseason show identical facts | broader FA explainability remains item 16 |
| MRB-8 | no schema change; phase-bound compatibility and factual archives | current v34, compact v33/deep fixtures, missing/partial owner, raw archive budget | import/query never backfills; production reload fixed point | compact saves without league-wide postseason facts intentionally defer |
| MRB-9 | hard 4-seed x 4-season study | 512 statements/receipts, economy bands, slopes, 112 equal isolation digests | hard study 1/1 in 494.99s | 30-season behavior remains item 18 |
| MRB-10 | scoped UI/worker/sim-core patch and production journey | focused, broad worker, root, bundle, build/PWA, determinism | item journey 1/1; reload-smoke 2/2; no retries/flakes; `MERGE_READY` | repository-wide pre-existing cycle/unused-export debt remains items 92/93 |

## Verification receipts

- Pure/focused sim-core: 7 files / 95 tests passed.
- Focused web correction set: 5 files / 27 tests passed; final worker recheck:
  1 file / 11 tests passed.
- Broad worker, persistence, and boot matrix: 11 files / 376 tests passed.
- Authentic annual rollover: 1 file / 2 tests passed.
- Affected typechecks: sim-core, web, and E2E passed. Root typecheck passed 9/9
  tasks.
- Hard study: 1/1 in 494.99 seconds; 4 seeds x 4 seasons x 32 teams = 512
  statements and 512 unique receipts. See `CALIBRATION.md`.
- Full root test: 8/8 tasks in 5m27.297s; contracts 24/24, UI 1/1,
  sim-core 143 files / 1,689 tests, and web 467 passed + 3 intentional skips /
  2,422 passed + 5 intentional skips.
- Production/PWA: 3,032 modules in 5.40 seconds; 167 precache entries,
  4,081.79 KiB; Finance chunk 15.43 KiB / 4.42 KiB gzip. Bundle-budget tests
  passed in the full suite.
- Determinism: 3/3 passed. No bare `Math.random()` was added.
- Structural diagnostics: the item-15 type-only cycle was removed. The final
  scan reports 20 base-owned cycles and the base-owned `MarketSize` unused
  barrel export; these remain outside item 15 under roadmap items 92/93.
- `git diff --check` passed before staging. The final cached check and exact
  landing verification are performed by closeout.

The final structural cleanup only replaced an imported full worker-state type
with a local narrow interface; it emits no JavaScript and changed no runtime
behavior. After that cleanup, the 11-test worker suite, web/E2E typechecks,
fresh production/PWA build, production browser journey, determinism, and diff
check were rerun on the final source. The already-green hard study, full root
suite, and reload-smoke exercise byte-equivalent runtime code.

## Browser proof

The zero-retry Chromium journey starts from an unfinished regular season in a
fresh production build. Production controls finish the season, generate the
real playoff field, play the real bracket, and prove 12 seeds, four completed
rounds, 11 series, a completed World Series, and zero premature revenue
receipts. Production Offseason controls then cross the exact Season Review
Advance boundary and verify all six user allocations plus 32 durable receipts.
It inspects desktop and 375x667 layouts, hard reloads, and verifies the same
singular statement and story. Final result: 1/1 in 12.6 seconds, one worker,
zero retries, no flaky classification.

The existing reload-smoke also passed 2/2 in 6.5 minutes with one worker, zero
retries, and no flaky classification. Visual receipts:

- `evidence/market-revenue-desktop.png`
- `evidence/market-revenue-mobile.png`

Both conflict-free surfaces are readable, contained, keyboard reachable, and
non-occluding.

## Negative control

Settlement was deliberately bypassed at the exact offseason activation seam.
The focused regression failed on the expected 32-receipt assertion (1 failed,
9 skipped), demonstrating that the acceptance test detects a missing annual
authority. Correct behavior was restored and the suite passed. Hostile tests
also reject prior-budget compounding, asymmetric inputs, malformed standings/
postseason facts, partial receipt trust, persistence failure, and stale-save
callbacks.

## Adversarial review

The first final review returned `FIX_AND_REVIEW` with three P1 and two P2
findings:

1. A nonempty seed list and champion could masquerade as a complete bracket.
   The validator now requires the exact standings-derived 12-team field, four
   canonical rounds, 11 completed series, canonical progression, and World
   Series/legacy-result agreement.
2. A full receipt set could expose a false settled statement while persisted
   owner fields were stale or missing. Queries now require all 32 owners and
   all six fields to equal the pure result, otherwise remain unset until exact
   transition repair.
3. The study inferred rather than measured some isolation/surface claims. It
   now emits seven before/after digest families, counts actual receipts, and
   requires all four non-null consumer surfaces.
4. Raw/effective labels and the SOURCE_TRUTH settlement seam were ambiguous.
   Copy and documentation now name both explicitly.
5. Unset copy implied only Advance; it now truthfully names exact Advance or
   Skip.

The second review found one browser P1: the fixture supplied a completed
postseason instead of making production controls create it. The journey now
starts in the regular season and drives the real postseason. Final read-only
review verdict: `MERGE_READY`, zero remaining P0-P2.

## Relay route actually used

The requested GPT-5.6 routing controls were not available, so this run used the
promised manual relay-pattern fallback and makes no model-routing claim.

| Phase | Task/thread | Runtime/model claim | Artifact | Status |
| --- | --- | --- | --- | --- |
| Reconstruct | `/root/revenue_risk_map` | current Codex runtime; read-only Sol-pattern, xhigh-equivalent analysis | ranked P0-P2 architecture/risk map and frozen formula/bands | complete |
| Evidence map | `/root/revenue_test_map` | current Codex runtime; read-only parallel mapping | exact source/test/browser evidence matrix | complete |
| Implementation | `/root` parent | current Codex runtime; sole Terra-pattern writer, high with bounded corrections | source patch, focused tests, study, browser artifacts | complete |
| Adversarial review | `/root/revenue_final_review` | current Codex runtime; read-only Sol-pattern, xhigh-equivalent review | line-level findings, two bounded rechecks, final verdict | `MERGE_READY` |
| Closeout | `/root` parent | manual Luna-pattern mechanical closeout | gate receipts, docs, exact staging, commit, local-main fast-forward | completed by landing command |

No writer raced the parent. No remote push, deploy, tag, publication, or
release occurred.

## Compatibility, rollback, and remaining risks

Rollback before landing is deletion/reversion of only the paths listed by this
slice. After landing, revert the single item-15 commit. Because the schema and
Dexie version are unchanged, rollback needs no migration or data repair; saves
retain ordinary owner fields and item-15 receipts are harmless unrecognized
story flags to the prior code.

Remaining bounded risks are explicit: revenue is modeled rather than an actual
cash/attendance ledger; compact saves without full postseason facts defer one
settlement; item 18 still owns the 30-season soak; item 55 still owns removal of
the separately labeled user difficulty resource overlay; and repository-wide
cycle/unused-export cleanup remains items 92/93. No reproducible item-15 P0-P2
remains.

## Relay retrospective

1. **Which uncertainty was discovered too late?** The first source-freeze
   artifacts did not model “completed postseason” strongly enough: a champion
   plus some seeds was treated as sufficient, and the first browser draft
   imported finished postseason facts instead of proving their production
   lifecycle.
2. **Which artifact or gate would have exposed it earlier?** A state-machine
   table covering regular-season cutoff, generated 12-team field, every bracket
   edge, World Series completion, exact Season Review transition, durable
   settlement, and reload would have exposed both gaps before implementation.
3. **Which relay role should have owned that question?** The Sol-pattern
   architecture role should have frozen the full topology and browser start/
   end states; the Terra-pattern writer should then have made those the first
   integration fixture.
4. **Which phases should have remained sequential?** Formula/state-machine
   freeze, worker authority, authentic rollover integration, hard study, final
   production browser proof, adversarial review, and landing must remain
   sequential because each consumes the prior phase's frozen artifact.
5. **Which read-only work could safely have run in parallel?** Consumer
   inventory, compatibility/schema audit, UI vocabulary review, test inventory,
   and calibration-receipt review were safe parallel maps while the parent was
   the only writer.
6. **What exact route is recommended for a similar slice?** Sol-pattern source
   reconciliation and explicit state-machine/topology gate; one Terra-pattern
   writer implementing pure model then atomic authority then consumers; one
   authentic one-season integration and deliberately failing negative control;
   source freeze; hard bounded study; fresh production browser plus root gates;
   one Sol-pattern adversarial review; bounded corrections in the same writer;
   Luna-pattern exact staging and local landing.
7. **Prioritized concrete improvements:**
   1. Freeze the complete annual state machine and playoff topology before the
      first production edit.
   2. Make the first rollover fixture generate its own standings and completed
      bracket through production authorities.
   3. Assert exact worker/save identity plus all persisted allocation fields at
      every statement query from the first test draft.
   4. Require literal non-null consumer-surface counts and before/after isolation
      digests in the one-season smoke before launching the long study.
   5. Run the structural cycle check when a new module boundary is introduced,
      not after the expensive gates.
   6. Bind browser waits to a changed durable-save timestamp, never only a
      static `Saved` label.
   7. Keep the hard study, full suite, production browser, final review, and
      landing sequential after runtime source freeze.

These are process recommendations only; this slice does not rewrite MBD's
workflow skills.
