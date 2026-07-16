# ECON-FA-DECISIONS-1 Completion

## Outcome

Roadmap item 16 is complete and merge-ready. New competitive free-agent
decisions now use one pure, deterministic player-side evaluator for user and CPU
offers. Contract value remains dominant; bounded age-shaped term, projected
current-roster opportunity, factual contender status, persisted loyalty, and
symmetric clubhouse appeal can decide a close offer. The exact accepted reason
is published only after durable save and remains factual and unique in Press
Room after hard reload.

The worker remains canonical, Zustand remains a UI mirror, GameSnapshot remains
v34, Dexie remains v6, and simulation decision evaluation consumes no RNG. This
slice adds no playing-time promise, historical motive backfill, dependency,
route, salary-retention asset, or 30-season claim. Roadmap item 17 was not
started.

## Acceptance matrix

| ID | Implementation artifact | Focused proof | Browser/study proof | Final gate | Remaining risk |
| --- | --- | --- | --- | --- | --- |
| FAD-1 | `freeAgencyDecision.ts` owns age weights, raw contributions, 12% ceiling, 90% floor, explanations, and 1–10 year validity | exact boundaries, raw-ranking tie, factor flips, invalid 0/11-year contracts, no RNG | literal contribution rows in all 16 study seasons | focused sim-core green; Sol P0–P3 zero | None inside the frozen model |
| FAD-2 | worker context derives opportunity, contender, tenure/origin loyalty, and chemistry/reputation only | role/standings/tenure/bond twins; missing-fact and hidden-truth controls | controlled production preview | focused worker green | Item 28 still owns enforceable future usage |
| FAD-3 | user and CPU competitive paths call the same evaluator and retain literal salary | byte-equal user/CPU evaluation; difficulty/identity twins; high-precision AAV persistence | one user and one CPU reason survive reload | root/full/browser green | Existing advisory user budget policy remains intentionally unchanged |
| FAD-4 | sorted team generation and fixed equivalent-AAV/AAV/years/team tie-break | offer/map permutation and seeded repeatability tests | exact per-seed 4x4 row/RNG replay digests | determinism 3/3 | No added RNG; item 18 owns longer horizon |
| FAD-5 | canonical market, roster slot, QO, CPU affordability, full signing tuple, and max-term fences precede mutation | rejection snapshot/RNG digests; malformed import; slot/QO/budget/tuple; 11-year exploit regression | under-floor IndexedDB integrity pair remains unchanged | final Sol correction review green | User hard cap was explicitly out of scope |
| FAD-6 | one authoritative reason-bearing signing item; exact-save retains one post snapshot and retries persistence only | news/briefing dedupe; retained-snapshot retry/fencing; stale/generic-copy controls | exact reason appears once after `Saved` and hard reload | Goal-16 1/1; reload-smoke 2/2 | None identified |
| FAD-7 | no schema/backfill; deeply equal imported market rows rebind to the canonical persisted player | v34 fixed point; migration 24/24; compact-v33 new decision/save/reload; corrupt-row fail-closed | production import/load uses real IndexedDB | full compatibility gates green | Old decisions intentionally have no fabricated motive |
| FAD-8 | study emits complete decision rows and independently reconciles role, payroll, and full signing tuples | microcases plus exact split replay | 4 seeds x 4 seasons, all frozen item-15 bands, zero violations | all four authoritative digests equal replay | Item 18 retains 30-season proof |
| FAD-9 | existing Free Agency offer and Press Room surfaces show bounded preview/result with semantic controls and live status | component, hook, route/lazy-shell, and bundle tests | desktop plus 375x667 keyboard/non-occlusion screenshots | production build and Chromium green | Presentation is intentionally bounded to existing routes |
| FAD-10 | item-only source/docs/tests; no schema, manifest, dependency, item-17, or item-18 drift | `git diff --check`; exact scope review; protected-main audit | zero-retry browser evidence | final Sol `MERGE_READY`; exact landing gate follows this report | Remote remains intentionally untouched |

## Changed systems and files

- Simulation authority: `packages/sim-core/src/roster/freeAgencyDecision.ts`,
  `freeAgency.ts`, roster/root exports, signing consequences/news, and focused
  sim-core tests.
- Worker authority: `sim.worker.freeAgencyDecision.ts`, action/query/helper/
  consequence seams, import canonicalization, worker tests, compact-v33 proof,
  and the four-by-four study.
- Exact durable presentation: free-agency offer hooks/components and the existing
  exact-save coordinator regression.
- Production proof: `apps/web/e2e/free-agency-decisions.spec.ts`, bounded
  Playwright registration, and three evidence screenshots under this run.
- Governance: Goal 26, this run's plan/source truth/completion, `GOAL.md`,
  `CHANGELOG.md`, and `docs/codex/GOAT_ROADMAP_STATUS.md`.

No package manifest, lockfile, schema, migration, route definition, dependency,
or item-17 source file changed.

## Verification receipts

### Focused and compatibility

- Feature freeze: sim-core 48/48; web 273/273; supported migration matrix 24/24;
  route/lazy-shell/bundle-budget 15/15.
- Final maximum-term correction: sim-core 41/41 and worker 194/194.
- Negative control: temporarily zeroing the nonfinancial weights failed 4 of 11
  evaluator assertions. Correct weights were restored before every green receipt.

### Full repository and production

- Root typecheck: 9/9 tasks.
- Full tests: sim-core 1,709/1,709; web 2,434 passed plus nine intentional skips;
  contracts 24/24; UI 1/1.
- Determinism: 3/3.
- Production build/PWA: 3,033 modules; 167 precache entries / 4,092.09 KiB;
  Free Agency route 20.34 KiB / 6.02 KiB gzip.
- Goal-16 Playwright: 1/1 in 11.2 seconds, one Chromium worker, retries 0.
- Existing reload-smoke: 2/2 in 4.7 minutes, one Chromium worker, retries 0.

One non-authoritative attempt resolved a bundled pnpm 11 and stopped during its
dependency-policy preflight before the determinism test ran. The authoritative
command used the repository-pinned Corepack pnpm 9.15.4 and passed 3/3; no
dependency or lockfile was changed.

## Four-by-four economy evidence

The study ran four seasons for each current-schema seed, emitted every literal
decision row, and replayed the exact rows and RNG state:

| Seed | Exact replay SHA-256 |
| ---: | --- |
| 7601 | `40a6ee157a603e052fe4c17734e9b758664d4dcfc6f329f3e1f08c363c2f384a` |
| 7602 | `dd7d374a7e90ddde1f8301591f5849f394a894fdeaeb2130d81ba0a89fb322bb` |
| 7603 | `7bd3443c2a5af4191336aca614ad073e13258dc10bfee93347a89a4c8d486e16` |
| 7604 | `cf38d1cac68b4c3088e9b772a721f65331785db9e55f54343302013657d437af` |

All 16 rows stayed within market size 450–1,089, signings 21–58, meaningful
signings 21–57, top AAV $20M–$45M, and payroll spread $25M–$350M. There were
zero missing or unsupported reasons, duplicate free-agency entries, invalid
roles, over-capacity outcomes, unaffordable CPU acceptances, canonical-market
violations, or full-tuple reconciliation errors.

The monolithic all-seed command produced identical evidence but exceeded the
host's bounded wall-clock session. Authoritative receipts therefore ran one seed
at a time and replayed each exact artifact. The final 10-year legality correction
does not change any generated CPU term—competitive generation is already capped
at 10 and market-exhausted contracts are one year—so the full 4x4 study was not
rerun after that bounded invalid-user-input fence. Focused, root, determinism,
build, and both production browser gates were rerun on the correction.

## Browser evidence

The production Goal-16 journey used a fresh build, one real browser context, and
real IndexedDB import/load. It:

1. inspected controlled career-stage, opportunity, contender, and loyalty facts;
2. used keyboard controls to select and submit an offer;
3. proved an under-floor rejection left primary and backup durable integrity
   pairs unchanged;
4. accepted a factor-backed literal offer and waited for truthful `Saved`;
5. found the exact user explanation and one CPU explanation in Press Room;
6. hard reloaded and verified the exact reason, team, and contract once; and
7. checked readable, non-occluding desktop and 375x667 presentation.

Evidence:

- `evidence/free-agency-decision-mobile-preview.png`
- `evidence/free-agency-decision-mobile.png`
- `evidence/free-agency-decision-press-room.png`

## Adversarial review and corrections

The read-only swarm reviews found and drove these bounded corrections:

1. preference copy could name a lower raw factor after display rounding;
2. imported detached market players could leave canonical identity incoherent;
3. CPU repricing could drift literal AAV, total value, or signing bonus;
4. the study trusted payroll and compared player IDs instead of independently
   deriving same-day payroll and reconciling the full signing tuple;
5. study output did not always retain literal authoritative rows;
6. a broad clubhouse-context change risked altering onboarding behavior;
7. per-candidate canonical rebinding created a hot-path performance cost; and
8. the final Sol review reproduced an 11-year direct offer that bypassed the
   live `MAX_CONTRACT_YEARS = 10` law.

Every P0–P2 finding was fixed and rechecked. The final correction artifact digest
`de49693e168691626525120e484f141f33461d4a6c33093e7077707924974f0d`
received `MERGE_READY` with P0/P1/P2/P3 all zero.

## Actual swarm route

The parent was the only checkout writer. All children were PURE read-only. The
host supported child task creation/result collection but could not select or
verify models or thinking effort, so the labels below are requested routes, not
claims about runtime model identity.

| Task | Requested label | Artifact | Status |
| --- | --- | --- | --- |
| `/root/fa16_swarm_invariants` | Sol / xhigh | first architecture, persistence, fairness, and identity audit | `FIX_AND_REVIEW`; corrected |
| `/root/fa16_swarm_evidence` | Luna / medium | first acceptance/browser/study/scope audit | `FIX_AND_REVIEW`; corrected |
| `/root/fa16_final_invariants` | Sol / xhigh | correction review of raw ranking, identity, salary, and study seams | findings addressed |
| `/root/fa16_final_evidence` | Luna / medium | correction evidence review | findings addressed |
| `/root/fa16_final_evidence_recheck` | Luna / medium | FAD-1–10, browser, study, compatibility, and repository-safety audit | `MERGE_READY`; zero P0–P3 on pre-max-term digest |
| `/root/fa16_final_invariant_recheck` | Sol / xhigh | source-frozen final invariant audit | `FIX_AND_REVIEW`; one P1 11-year legality bypass |
| `/root/fa16_max_term_recheck` | Sol / xhigh | exact max-term correction audit | `MERGE_READY`; zero P0–P3 |

The original protocol-1.1 ledger was preserved when the skill upgraded to
protocol 1.2 and the newer final-review ledger was created. A same-task follow-up
was interrupted before review because protocol 1.2 correctly rejected reusing a
thread across a different artifact fingerprint; the check was relaunched once
under a new ledger node and completed read-only. No duplicate result was counted.

## Compatibility, rollback, and remaining risk

- Compatibility: no save schema or Dexie change. Current v34 is a fixed point;
  supported migrations remain green; compact v33 preserves facts and gains an
  explanation only for a genuinely new post-migration decision.
- Rollback before landing: discard only the files named by this item-16 diff.
  Rollback after landing: revert the single item-16 commit. No migration or data
  repair is required.
- Remaining bounded risks: item 28 must define/enforce future playing-time
  promises; item 18 must run the 30-season economy soak; historical signings
  remain honestly unexplained. These are explicit roadmap ownership boundaries,
  not defects in item 16.
- Remote state, deployment, tags, publication, and release remain untouched.

## Relay retrospective

This section is also the swarm retrospective for the user-requested replacement
of the earlier relay workflow.

1. **Uncertainty discovered too late:** canonical market rows were not guaranteed
   to share object identity after import, and the live 10-year maximum was not in
   the first evaluator validity matrix.
2. **Earlier exposing artifact/gate:** an explicit player/market/contract identity
   diagram plus a hostile contract-domain table containing both lower and upper
   boundaries would have exposed both before integration.
3. **Owning role:** Sol architecture should own the identity model and complete
   legality domain before Terra/parent implementation; Luna evidence should own
   independent payroll and literal-row receipt requirements before the soak.
4. **Phases that must remain sequential:** freeze decision math; implement shared
   authority; integrate exact mutation/persistence; run the 4x4 study; run final
   adversarial review; then write closeout/stage/land. Changing source underneath
   browser or study evidence invalidates those receipts.
5. **Safe parallel read-only work:** source seam mapping and test inventory;
   architecture/persistence review and evidence/scope review after source freeze;
   screenshot inspection and protected-main audit.
6. **Recommended route:** Sol freezes the full state/identity/legality table;
   one Terra or parent writer implements evaluator plus atomic seams with focused
   tests; Luna pre-audits the study row schema; run split deterministic study and
   production browser gates; one final Sol review; Luna exact-scope closeout;
   parent stages, commits, and fast-forwards local main.
7. **Prioritized improvements:** (1) model canonical player/market/contract
   identity before coding; (2) enumerate numeric boundary domains, including
   repository constants, in the goal matrix; (3) require full signing-tuple and
   independent-payroll reconciliation in the first study design; (4) make
   literal decision rows the default authoritative study artifact; (5) split
   multi-seed studies per seed from the outset; (6) run the raw-contribution
   preference negative control before UI integration; (7) schedule Sol's first
   review immediately after atomic worker integration, before the expensive soak.

## Landing

The item-only commit containing this report is fast-forwarded to local `main`
only after exact staged-scope inspection and `git diff --cached --check`. The
final revision is reported from live Git in the closeout response because a
commit cannot contain its own SHA. The three pre-existing main-checkout user
files remain unstaged and are verified by their live SHA-256 values in
`SOURCE_TRUTH.md`.
