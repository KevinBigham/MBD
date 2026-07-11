# TRUST-STORAGE-PRESSURE-1 Completion

Status: verified complete and landed on local `main`. No unresolved P0–P2
finding remains. Completed 2026-07-11 (America/Chicago).

## Outcome

Goal 19 now gives players honest storage-pressure evidence without weakening
save integrity or dynasty history. Save Hub and Settings separately label the
current logical snapshot estimate, estimated serialized local MBD records, and
approximate origin-wide usage/quota. Protected primary/shadow/root-tree
evidence remains visible when attribution is partial; lossy season archival is
not player-reachable; only exact-active stale ticker/consequence-watcher
pruning is offered. The maintenance lane binds one operation owner and one
accepted post-mutation snapshot receipt through mutation, durable persistence,
telemetry refresh, retry, reload, and successor ownership.

## Requirement mapping

| Goal 19 criterion | Implementation artifact | Focused proof | Browser/final gate |
|---|---|---|---|
| 1. Read-only raw-row capture and UTF-8 sizing | `saveSystem.ts`, `storagePressure.ts` | storage-pressure save-system tests | 49-suite matrix; full test |
| 2. Exact primary/shadow/tree/leaderboard and all-MBD accounting | `saveSystem.ts` report model | canonical, legacy, corrupt, orphan, Unicode, partial-topology tests | storage-pressure UI displays distinct tree/all-MBD evidence |
| 3. Pure snapshot diagnostics and true no-op maintenance | worker diagnostics/query seams | worker diagnostics regression and zero-result identity test | cancel/no-op and reload proof |
| 4. Optional origin estimate and honest classification | `storagePressure.ts` | unavailable/rejection/malformed/boundary/overrun/quota tests | 85% warning and quota-critical override |
| 5. Deterministic 80/90 policy and quota override | pressure classifier plus persistence failure kind | threshold and failure-stage tests | critical quota truth survives retry/reload |
| 6. Save Hub and Settings truthful presentation | Setup/Settings route data and panels | route/component tests | desktop and 375x667 storage evidence |
| 7. Archive disabled; narrow accessible prune dialog | diagnostics panel/hook and app modal fence | archive dispatch absence, cancel/Escape/Space, exact count/save revalidation tests | alertdialog focus/bounds, confirmed prune and persistence |
| 8. One shared Settings operation latch | settings operation coordinator and save/diagnostics hooks | duplicate, stale, remount, held-owner lifecycle tests | contender blocked and controls locked through durability |
| 9. Mutation → capture → persist → refresh → success | active persistence and maintenance hook | export/write/telemetry failure, opaque receipt, retry-without-rerun tests | quota fault, exact durable pair, retry, hard reload |
| 10. Full compatibility and browser proof | no schema/dependency/gameplay changes; dedicated E2E | focused matrix, full gates, determinism | storage-pressure 1/1, multitab 1/1, reload-smoke 1/1, zero retries |

## Changed files

Implementation and tests include the storage report/classifier, active-save
persistence fencing, Settings operation coordinator, Settings and Save Hub
surfaces, worker diagnostics, mobile contract correction, Playwright helper and
dedicated storage-pressure journey. Governance artifacts are:

- `docs/codex/goals/19_TRUST_STORAGE_PRESSURE_1.md`
- `docs/codex/runs/TRUST-STORAGE-PRESSURE-1/SOURCE_TRUTH.md`
- `docs/codex/runs/TRUST-STORAGE-PRESSURE-1/PLAN.md`
- this completion report
- `CHANGELOG.md`
- `docs/codex/GOAT_ROADMAP_STATUS.md`

No GameSnapshot/Dexie schema, package manifest, lockfile, dependency, sim-core
prune helper, CPU policy, RNG, or item-8 source changed. The pre-existing
protected files remain outside this slice.

## Verification

- Focused current-source matrix reconstructed from
  `/tmp/mbd-goal19-focused-after-sol-fixes.json` and written to
  `/tmp/mbd-goal19-focused-final.json`: **49 suites / 372 tests passed; 0
  failed**.
- `pnpm typecheck`: **9/9** workspace tasks passed, including web and E2E
  TypeScript.
- `pnpm test`: contracts **24/24**, sim-core **1,646/1,646**, UI **1/1**, web
  **454 suites / 1,898 tests passed / 2 skipped**; all 8 Turbo tasks passed.
- `pnpm build`: **5/5** tasks passed; fresh web build **3,022 modules** and
  **167 PWA precache entries**.
- `pnpm verify:determinism`: **3/3** passed.
- Explicit serial production Chromium, `--workers=1 --retries=0
  --reporter=line`: storage-pressure **1/1 in 42.5s**; multitab-guard **1/1
  in 11.9s**; reload-smoke **1/1 in 4.5m**. No retries and no flaky
  classification.
- `git diff --check` and scans for conflict markers, schema/Dexie/dependency
  changes, bare `Math.random`, broad prune, archive dispatch, and item-8 source
  all passed.

## Browser proof

The storage-pressure journey used one real context and two real same-origin
pages. Page B was blocked while Page A owned the root tree. The journey showed
the exact storage metrics, 85% approximate origin warning, archive-disabled
copy, cancel/no-op behavior, confirmed narrow prune, real quota failure and
critical override, retry of the accepted snapshot without rerunning prune,
matching primary/shadow durability, owner hard-reload retention, owner close,
successor latest-durable acquisition, successor mutation and reload, and
desktop plus 375x667 keyboard/mobile bounds. The multitab and reload-smoke
journeys remained green against the same fresh production build.

## Adversarial review and dispositions

Sol's replacement review finished `MERGE_READY` with zero actionable P0–P2.
The reviewed findings and dispositions were:

- Shared Settings latch could release before telemetry/final status: corrected
  with the module-scoped exact-token coordinator spanning the full operation.
- Retry could alias stale captured generations: corrected with an opaque
  accepted-capture receipt and persistence-only retry.
- Rounded threshold display could cross 80/90 policy boundaries: corrected by
  classifying raw finite ratios before presentation rounding.
- Malformed/rogue slots could form trusted trees: corrected by strict canonical
  root/lineage/primary-shadow topology, retaining unsafe rows as partial
  all-MBD evidence.
- Native dialog activation and stale modal evidence could deadlock or bypass
  the fence: corrected with one exact-save/evidence predicate, app modal marker,
  capture-phase event blocking, and count/save revalidation.
- Diagnostics/Setup lifecycle and absolute ticker-expiry gaps: corrected in
  source/tests; the monthly league-event relative-expiry producer remains a
  documented adjacent risk and was not broadened into item 7.
- Zero-result archive maintenance normalized state before eligibility: moved
  normalization after the no-op guard and added exact snapshot/RNG identity
  regression coverage.

## Compatibility, remaining risks, and rollback

Save schema remains v34 and Dexie remains v5; no migration or dependency work
is required. Existing old/deep/import-export and deterministic behavior remain
covered by the repository gates. Rollback is a source revert of the item-7
implementation/docs commit; no save-data rollback is needed because no schema
or persisted snapshot shape changed. The relative-expiry monthly league-event
ticker publication defect is pre-existing adjacent work and remains deferred.

## Relay retrospective

1. **What uncertainty was discovered too late?** The first implementation
   treated persistence generation and a captured snapshot as interchangeable,
   and treated a confirmation ID or rounded pressure value as sufficient
   identity. The exact-save receipt, raw topology trust rules, modal predicate,
   and production-shaped absolute-day fixtures should have been explicit before
   implementation.
2. **What earlier artifact or gate would have caught it?** An early state
   machine/receipt-identity model, production-shaped storage fixtures, and a
   two-page negative-control browser gate would have caught false retry aliasing,
   malformed-tree attribution, modal activation, and cross-season expiry before
   the review relay.
3. **Which relay role owned the gap?** Terra owned the implementation boundary;
   Sol owned adversarial review and found the P0/P1/P2 issues; the coordinator
   became the authorized manual relay-pattern writer when the archived rollout
   control disappeared; Luna owned final source reconciliation, gates, docs,
   staging, commit, and local-main landing.
4. **Which phases were sequential?** Source truth/plan → implementation
   checkpoints → negative control and restoration → Sol review/corrections →
   final focused/full/browser gates → documentation → explicit item-only
   staging/commit → verified fast-forward to local `main`.
5. **What could safely have been parallel?** Read-only source mapping, test
   mapping, risk review, receipt inspection, and static scope scans could run in
   parallel. Production mutation tests, browser journeys, documentation writes,
   staging, and branch/main operations needed one ordered writer.
6. **What exact route is recommended for a similar persistence slice?** Start
   with a state-machine and receipt-identity artifact; add production-shaped
   absolute-day and old/deep-save fixtures; run a two-page owner/contender
   negative control before UI polish; implement one shared operation owner;
   obtain an early Sol review; then rerun focused matrix, root gates, fresh
   production build, serial zero-retry browser proof, and only then write,
   stage, commit, and fast-forward the ledger.
7. **Prioritized concrete improvements:**
   - P0: require receipt identity/state-machine modeling before persistence UI
     implementation.
   - P1: add production-shaped absolute-day, quota, topology, and deep-save
     fixtures to the first focused matrix.
   - P1: require early two-page owner/contender and negative-control browser
     proof, including modal predicate coherence and true-no-op checks.
   - P1: split relay artifacts into smaller implementation, correction, review,
     and gate receipts so stale counts and source identity are obvious.
   - P2: schedule Sol review immediately after the first end-to-end mutation
     lane, before broad UI/test expansion.
   - P2: make the final ledger derive from observed current-source receipts and
     require a post-landing protected-file/index audit.

## Protected state and landing

The three protected files were preserved byte-for-byte and remain dirty and
unstaged. No unrelated files, remote, push, deploy, tag, or release action is
part of this closeout. The item-7 commit and final `main` revision are recorded
by the landing history and the final response.
