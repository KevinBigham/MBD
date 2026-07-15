# ECON-ARBITRATION-1 — Completion

## Outcome

Roadmap item 11 is complete. MLB service days now own arbitration eligibility;
the automatic league process produces one persisted deterministic filing,
exchange, hearing, and award docket; and Offseason Advance/Skip cannot publish
or admit another mutation until the exact post-mutation snapshot for the exact
save is durable. User and CPU clubs share the same mechanics. GameSnapshot
remains v34, Dexie remains v6, and roadmap item 12 was not started.

## Acceptance matrix

| ID | Implementation artifact | Focused proof | Browser/final proof | Remaining risk |
|---|---|---|---|---|
| ARB-1 | `finance/contracts.ts`, `roster/offseason.ts`, worker service reconciliation | Exact 172-day boundaries, contradictory-map, career-minor, and year-six tests | sim-core 1,660/1,660; determinism 3/3 | Legacy years map remains serialized for compatibility but is derived, not authoritative. |
| ARB-2 | Active-MLB stable Super Two ranking in finance and worker docket preparation | FA, unassigned, inactive, minor-league exclusions; player-ID tie break | full sim/web green | The 22% cohort rule is frozen policy and may need a future product review, not a correctness fix. |
| ARB-3 | Salary projection and award mutation floor prior salary; one-year AAV equals total | Finance/worker/profile projection tests; causal salary-floor negative control | production durable award is at least `$4.2M`; contracts 24/24 | No interactive filing strategy is included. |
| ARB-4 | Typed `arbitrationDocket` in normalized offseason phase results | Filing/exchange/hearing/award import and re-entry tests | production reload at every beat, 1/1 | Older mid-offseason saves without a docket prepare current facts once and do not fabricate past beats. |
| ARB-5 | Persisted precomputed outcomes, season/player resolution receipts, retained RNG | Re-entry/retry/import and once-only artifact assertions | award remains one history row after hard reload; determinism 3/3 | None identified. |
| ARB-6 | One league-wide automatic mechanic independent of `userTeamId` | Named user/CPU swap preserves docket, results, and RNG | full suites green | Presentation is user-team scoped; mechanics are league-wide. |
| ARB-7 | Exact worker session, persistence lease, coordinator, hook, and app-shell fence | Exact persistence/session/worker 4 files / 120 tests: drain, stale capture, receipt isolation, frozen retry, root/branch, rollback, fail-close, reentrancy | arbitration 1/1 and reload-smoke 2/2, zero retries | Browser journey exercises a root slot; branch authority is pinned by focused tests. |
| ARB-8 | Adverse-club-win holdout preparation and same-offseason spring settlement | Worker, holdout moment/news, single service-loss tests | full sim/web green | The consequence is intentionally bounded; no active year-long absence is modeled. |
| ARB-9 | Missing-docket normalization inside v34; no schema/migration change | Current-v34 round trip, pre-history and mid-offseason fixtures | contracts migration 24/24; worker snapshot matrix green | No old-save public beats are fabricated. |
| ARB-10 | `OffseasonArbitrationPanel` on the existing lazy route; semantic stages and labels | Component, route, controller, PageShell, AppLayout, and bundle tests | 375×667 bounds/focus screenshot step and desktop award step pass | Manual cross-engine visual polish remains a release-wide gate, not an item-11 defect. |
| ARB-11 | `e2e/arbitration-drama.spec.ts` | Production fixture uses contradictory years-map data and exact durable DB/checksum assertions | fresh PWA preview 1/1 in 7.7s; zero retries/flakes | None identified. |
| ARB-12 | Goal/run/changelog/roadmap docs and bounded diff | `git diff --check`; no scoped `Math.random()`; all package typechecks | full tests/build/determinism/reload-smoke green | Remote CI has not run because push is unauthorized. |

## Verification receipts

- Focused arbitration sim: 5 files / 81 tests passed.
- Focused exact-save persistence/session/worker: 4 files / 120 tests passed.
- Typecheck: contracts, design-tokens, sim-core, UI, web, and web e2e all
  passed from package-local binaries.
- Full sim-core: 141/141 files and 1,660/1,660 tests passed in 139.34s;
  determinism 3/3 and multi-year smoke integration passed inside that run.
- Full web: 463 files passed + 1 intentional audit skip; 2,354 tests passed + 3
  skipped in 221.07s. Balance 9/9, current-schema rollover 2/2, snapshot matrix
  19/19, bundle budget 1/1, exact coordinator 7/7, persistence 86/86, and
  worker-session 15/15 all passed.
- Contracts migration: 24/24. UI: 1/1.
- Production PWA: 3,029 modules, 166 precache entries (4,026.42 KiB), Offseason
  chunk 44.49 KiB / 10.24 KiB gzip; build passed in 5.01s.
- Production Chromium arbitration journey: 1/1 in 7.7s, one worker, zero
  retries, no flaky result. It reloads after filing, exchange, hearing, and
  award; inspects keyboard focus and 375×667 bounds; and proves matching
  primary/backup checksums and one durable history row.
- Existing production reload-smoke: 2/2 in 4.4m, one worker, zero retries, no
  flaky result. The slower wall clock reflects concurrent macOS storage-service
  pressure; the final functional receipt is green.
- `git diff --check`: green before closeout. Scoped source contains no bare
  `Math.random()`.

An earlier loaded gate attempt hit host wall-clock/RPC limits while macOS
StorageManagementService was consuming sustained CPU. No timeout or budget was
weakened. The final serial runs above replaced those receipts and passed without
source exceptions.

## Adversarial review

The final verdict is `MERGE_READY` with zero open P0–P2 findings. The complete
finding ledger is in `ADVERSARIAL_REVIEW.md`. The highest-risk corrections were:

1. an exact persistence lease that drains a previously accepted ordinary write
   so it cannot overwrite arbitration state;
2. reentrant-safe exact worker-session finish that retains the fence on callback
   failure;
3. branch-safe exact target projection that never aliases a branch to its root
   slot;
4. durable, distinct hearing and award checkpoints;
5. fail-closed accepted-write recovery and global app-shell mutation disable.

The deliberate salary-floor negative control failed when the floor was removed
from the finance rule and passed after restoration.

## Compatibility, scope, and rollback

- GameSnapshot v34 and Dexie v6 are unchanged; no migration or dependency was
  added.
- Missing docket data normalizes honestly. Existing arbitration history and
  factual player/contract data remain intact.
- Only automatic arbitration visibility and the exact offseason persistence
  seam changed. Item 12 qualifying offers/compensation, extensions, budgets,
  revenue, trades, and Goal-12 Day-One roster work remain untouched.
- Before landing, rollback is limited to this slice's owned paths. After
  landing, revert the one item-11 commit. There is no schema downgrade step.
- No push, deploy, tag, publish, or release was performed.

## Actual collaboration route

- The parent thread was the sole checkout writer and owned reconciliation,
  architecture, implementation, bounded corrections, final gate execution,
  final adversarial review, documentation, and landing.
- Three early child reviews were read-only source, test, and persistence-risk
  maps. They did not write or race the parent.
- No model-specific relay was claimed for this slice. Browser and Git operations
  remained sequential in the parent because they mutate shared runtime/index
  state.

## Relay retrospective

1. **Uncertainty discovered too late:** the dangerous state was not arbitration
   RNG; it was a previously accepted ordinary autosave completing after the
   exact arbitration write, plus reentrant finish and branch-slot aliasing.
2. **Earlier artifact/gate:** an admission-sequence table covering capture,
   accepted-write drain, worker reservation, exact receipt, atomic finish, and
   root/branch UI projection would have exposed all three before UI work.
3. **Owning role:** the architecture/review role should own cross-lane save
   admission and callback reentrancy; the implementation writer should own the
   executable state-machine tests.
4. **Sequential phases:** persistence state-machine freeze → one writer →
   focused hostile tests → source freeze → full gates → fresh production browser
   → final review → staging/landing.
5. **Safe parallel read-only work:** eligibility/source mapping, historical test
   inventory, schema compatibility inspection, and a line-level persistence risk
   map. Worker/browser mutation and Git closeout must stay sequential.
6. **Recommended route:** model exact worker/save/root identity first; add a
   deliberately pending ordinary write and reentrant callback as negative
   controls; implement with one writer; prove root and branch receipts; run the
   production beat-by-beat reload journey; then adversarially review the frozen
   artifact before exact staging.
7. **Prioritized improvements:** (1) require a cross-lane admission timeline for
   every persistence slice; (2) add exact worker/save/root identity assertions
   before route work; (3) make pending-old-write and reentrant-finish controls
   standard; (4) cover root and branch targets in the first coordinator test;
   (5) keep phase artifacts small enough to review before the next layer; (6)
   run the first production reload proof immediately after the exact-save seam,
   not after UI polish.

## Next legal work

Roadmap item 12—qualifying offers plus draft-pick compensation—is the next
eligible slice. It requires a fresh goal/source reconciliation on its own
branch/worktree. It was not begun here.
