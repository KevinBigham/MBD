# TRUST-SIM-ADVANCE-JOURNAL-1 — Living Plan

## 1. Objective

Implement [Goal 20](../../goals/20_TRUST_SIM_ADVANCE_JOURNAL_1.md): every
player-facing regular-season day/week/month/to-playoffs command must have a
durable exact-save intent before the worker mutates and must either atomically
persist its exact result or roll back to the verified baseline.

## 2. Preflight and live truth

See [SOURCE_TRUTH.md](./SOURCE_TRUTH.md).

- Branch/base: `codex/sim-advance-journal-8` from
  `45595430fcd532ba211c491d31a4947c6ef4a164`; local `main` matched at branch
  creation.
- Protected unrelated dirty files/hashes are fixed in Source Truth and must
  remain unstaged.
- Snapshot remains v34. This slice explicitly authorizes an additive Dexie
  v5-to-v6 store migration and its full compatibility protocol.
- Completion report and item-8 browser proof did not exist at start.
- Latest defect: a worker command can partially mutate canonical state with no
  durable start marker; shell and Dashboard executors can overlap; UI/flow state
  can publish before persistence.
- Item-7 attached review reconciliation: 4 files / 162 tests passed on the branch
  base; those four findings are closed and are not item-8 scope.
- Item-8 pre-production baseline: 17 web trust/UI files, 225/225 tests; contract
  migration 24/24; canonical worker suite already observed on this exact base as
  124/124; root typecheck 9/9; determinism 3/3. All passed.

## 3. Invariants and cut line

- Worker is canonical; Zustand and route DTOs are mirrors published only after
  exact durable completion.
- Root and branches share one ownership tree; the journal remains exact-save.
- Intent is durable before worker invocation. Primary + shadow + leaderboard +
  exact intent deletion are one transaction.
- Retry persistence only. A new runtime rolls back; it never reruns gameplay.
- A partial worker realm is restarted before baseline import because module
  caches exist outside GameSnapshot.
- Exact baseline/token/root CAS protects against stale callbacks, replacement,
  deletion, and ownership loss.
- No false `Saved`, zero pending, recency, UI day, or flow notification.
- No bare `Math.random()`, UUID, wall-clock simulation identity, snapshot v35,
  gameplay/RNG outcome change, new dependency, item 9, push, deploy, tag, or
  release.
- Owned operations: day/week/month/to-playoffs only. Playoff/offseason/next-season
  advancement is recorded adjacent risk and remains unchanged.

## 4. State machine and crash decisions

```text
IDLE
  -> exact owner + exclusive worker session
  -> quiesce persistence and verify/export exact durable baseline
  -> durable PREPARED intent (baseline CAS)
  -> authorized worker command
  -> capture exact post snapshot
  -> ordered persistence-only job carrying exact intent token
  -> atomic post primary/shadow/leaderboard + intent delete
  -> publish worker flow + Zustand/routes
  -> COMMITTED
```

Failure before accepted post snapshot:

```text
intent + baseline durable
  -> restart worker realm
  -> active-authorized import of exact baseline
  -> verify worker snapshot/identity
  -> exact intent delete
  -> release session and report rollback
```

Accepted post snapshot with write failure remains in the existing retry lane and
holds the mutation/export session. Retry commits the exact job only. A reload
discards ephemeral post state and takes the boot rollback path.

Boot decision:

| Durable evidence | Decision |
| --- | --- |
| no intent | ordinary verified load |
| exact intent + unchanged verified baseline | consume exact intent as rollback, import baseline, notify honestly |
| no intent + post row | ordinary completed-command load |
| intent + missing/corrupt/changed/wrong-root baseline | preserve evidence and fail closed; never replay or guess |

## 5. Milestones

| Milestone | Deliverable | Required focused proof | Status |
| --- | --- | --- | --- |
| M0 | Goal 20, Source Truth, plan, ACTIVE ledger, baseline | preflight; exact operation/cut-line decision; protected hashes | Complete — 17 web files/225, contracts 24, worker 124, typecheck 9/9, determinism 3/3 |
| M1 | Dexie v6 journal and exact transaction protocol | v5 upgrade; exact/root uniqueness; baseline CAS; four-store rollback; storage accounting; delete/replace/clear | Complete — additive v6 store, bounded row, exact baseline CAS, four-store post-commit, lifecycle cleanup, topology/storage accounting, and focused fault proof |
| M2 | Exclusive worker/persistence executor | cross-surface exclusion; intent-before-Comlink; deferred flow; stale save/ownership/export rejection | Complete — one module-scoped coordinator, opaque worker session, exact-save/root authority, and ordinary-lane fencing |
| M3 | commit/retry/rollback and boot recovery | exact retained job; no rerun; worker restart/import/RNG equality; boot valid/malformed/mismatch paths | Complete — persistence-only retry, exact rollback/import/RNG proof, boot recovery admission, malformed/mismatch fail-closed, and held-delete finalizer |
| M4 | shell/Dashboard/status/UX integration | all named entry points; no pre-durable mirror; shortcuts/global controls fenced; truthful notices | Complete — shell, footer, keyboard, Dashboard, setup/settings/onboarding guards, durable mirror publication, status copy, and reload surface |
| M5 | compatibility and production browser proof | v34 matrix/old/deep saves; fresh two-page interruption/retry/hard reload; desktop + 375x667 | Complete — v34/old/deep/import coverage, focused baseline proof, fresh production Chromium two-page WAL journey, retry-without-rerun, reload, desktop/mobile evidence |
| M6 | negative control, full gates, adversarial review, closeout | observed red control restored green; zero P0–P2; exact staging; commit/local FF | Complete — negative control 4/4 red then 4/4 green, final root gates green, browser helper red-to-green, Sol MERGE_READY 0/0/0, docs/staging/landing pending in this closeout |

## 6. Relay route

Persistent campaign-coordinator rollout is unavailable, so the parent is an
explicit **manual relay-pattern fallback** Sol coordinator. Model-specific child
threads are still used for implementation, review, and closeout when controls
permit. One child may write at a time.

| Phase | Thread | Model | Effort | Deliverable | Gate |
| --- | --- | --- | --- | --- | --- |
| Reconcile/plan | parent + read-only source maps | `gpt-5.6-sol` role | xhigh | Goal/Source Truth/Plan/crash and acceptance map | every authority, worker, WAL, migration, persistence, recovery, and UX invariant is checkable |
| Implement/debug | `GOAT-8 \| Terra implementation` | `gpt-5.6-terra` | high; xhigh only with concrete evidence | patch, living plan, focused tests, negative control, browser artifact | focused matrix + typecheck pass |
| Adversarial review | parent or new read-only `GOAT-8 \| Sol architecture review` | `gpt-5.6-sol` | xhigh | line findings and `MERGE_READY`/`FIX_AND_REVIEW` | every P0–P2 fixed by the same Terra owner and rechecked |
| Closeout | `GOAT-8 \| Luna closeout` | `gpt-5.6-luna` | medium | full gates, completion/changelog/ledger, scoped commit, local FF | exact staged scope; all gates green; protected files unchanged |

Actual thread IDs and route adaptations are recorded when each phase starts and
must not be inferred from this planned table.

**Actual implementation route (2026-07-11):** Terra is the sole checkout
writer in thread `019f537c-cd7a-7d71-92f5-50edf41ac54c`
(`gpt-5.6-terra`, high). Sol remains read-only. M1 is in progress at the
source-reconciliation/test-mapping checkpoint; no production file has been
edited yet.

## 7. Terra implementation brief

**Role:** Sole item-8 checkout writer using `gpt-5.6-terra` at high effort and
the repo-local MBD implementation workflow. The same thread owns all review
corrections.

**Outcome:** Implement Goal 20 only. Keep this plan living. Return an actual
working-tree patch with exact focused receipts and production browser evidence;
do not commit, land, or start item 9.

**Inputs:** this goal/run; branch/base; three read-only source maps; live source
and tests named in Source Truth; current v34/v5 contracts; item-5–7 trust
invariants; protected hashes.

**Constraints:** one writer; use `apply_patch`; preserve unrelated dirty work;
Dexie v6 operational journal only; no snapshot schema or integrity projection
change; exact save/root authority; one whole-command rollback unit; no gameplay
replay or week/month refactor; same-thread corrections; no commit/push/deploy.

**Acceptance:** complete M1–M5; prove intent durability before Comlink; prove
transactional post-save consumption; prove exact worker/RNG rollback and
fail-closed restore; prove persistence-only retry invocation count; include all
delete/replace/clear/storage-estimate/migration interactions; run a deliberately
failing negative control and restore; run focused/typecheck/build/browser gates;
inspect desktop/375x667; verify index/protected hashes.

**Return:** `IMPLEMENTATION_READY` or a precise stop-condition blocker; actual
changed paths/diff; requirement mapping; exact commands/counts; negative-control
red/green evidence; browser/build artifacts; remaining risks; no planned work
reported as completed work.

## 8. Required final gates

- journal/coordinator/transaction/boot/worker/UI focused suites
- ownership, active persistence, save recovery, Setup/Settings, shell/Dashboard,
  worker snapshot, bundle/lazy-shell regressions
- supported-version migration/round-trip matrix and v5-to-v6 real DB upgrade
- root `pnpm typecheck`
- root `pnpm test`
- root `pnpm build` including PWA
- root `pnpm verify:determinism`
- fresh production, one-worker, zero-retry item-8 Playwright
- existing multitab, storage-pressure, and reload-smoke Playwright
- scans for `Math.random`, schema drift, new dependencies, item-9 scope, exact
  index, and protected hashes

## 9. Stop conditions

Stop and re-plan with Sol if exact journal deletion cannot share the save commit
transaction; if an exact durable baseline cannot be proven before mutation; if
worker/RNG/module-cache rollback cannot be proven; if the v5 upgrade or old/deep
save compatibility fails; or if implementation requires snapshot v35, gameplay
policy change, a second writer, or item 9.

## 10. Progress log

1. 2026-07-11 — Sole writer route confirmed: Terra
   `019f537c-cd7a-7d71-92f5-50edf41ac54c` (`gpt-5.6-terra`, high); Sol is
   read-only. Started M1 source reconciliation with three read-only maps. No
   contradiction or stop condition found.
2. 2026-07-11 — Added the additive Dexie v6 `simAdvanceIntents` store and
   strict operational-row validation. `prepareSimAdvanceIntent` verifies an
   exact sealed primary/shadow pair and writes its bounded intent in one
   transaction; `commitSimAdvanceSnapshot` CASes that baseline and the exact
   token while writing primary/shadow/leaderboard and deleting the intent.
   Initial transaction suite: `pnpm --filter @mbd/web exec vitest run
   src/shared/lib/saveSystem.transaction.test.ts` — 1 file, 9/9 passed.
   Web TypeScript check after the checkpoint: passed.
3. 2026-07-11 — Sol early checkpoint incorporated: runtime validation rejects
   forged operation/checksum/identity/season-day-phase/token fields rather
   than relying on TypeScript declarations. The future coordinator must compare
   its pre-worker export canonically with this verified durable baseline before
   calling `prepareSimAdvanceIntent`; this is a pending M2 acceptance gate, not
   yet claimed as complete.
4. 2026-07-11 — Reconciled the real upgrade proof to v5→v6: primary,
   shadow, leaderboard, timestamps, current v34, and old v17 rows survive
   byte-identically while the journal store starts empty. `pnpm --filter
   @mbd/web exec vitest run src/shared/lib/saveSystem.integrity.test.ts` — 1
   file, 44/44 passed. Sol's session checkpoint also passed in `workerMutationSession.test.ts` — 1 file, 3/3.
5. 2026-07-11 — Combined M1/M2-boundary regression command passed: `pnpm
   --filter @mbd/web exec vitest run src/shared/lib/saveSystem.transaction.test.ts
   src/shared/lib/saveSystem.integrity.test.ts src/shared/lib/workerMutationSession.test.ts`
   — 3 files, 56/56 tests. `pnpm --filter @mbd/web exec tsc --noEmit`,
   `git diff --check`, and empty-index verification also passed. This is not
   final acceptance evidence: coordinator wiring, deferred publication,
   rollback/boot, retry, control-surface, and browser proof are still pending.
6. 2026-07-11 — Sol migration checkpoint incorporated. The original direct
   v4 checksumless/no-shadow → current opening proof is retained as its own
   regression beside the new real v5→v6 byte-preservation test. `pnpm --filter
   @mbd/web exec vitest run src/shared/lib/saveSystem.integrity.test.ts` — 1
   file, 45/45 passed; web typecheck, `git diff --check`, and protected hashes
   passed in the same checkpoint.
7. 2026-07-11 — Hardened active persistence observer notification;
   `activeSavePersistence.test.ts` 43/43 and web typecheck passed. A first
   coordinator prototype was deliberately withdrawn after Sol identified four
   unsafe crash-window gaps: it lacked opaque worker-adapter authority,
   retained exact-post retry, explicit fail-closed rollback handling, and
   isolated post-commit publication. The replacement must integrate the
   existing active-persistence retained job before any production call site is
   rerouted; no incomplete coordinator remains in the checkout.
8. 2026-07-11 — Parent Sol validation incorporated at the worker boundary:
   simulation sessions now reserve immediately, asynchronously drain accepted
   ordinary permits, and retain exact save/root identity. Focused worker-session
   proof is 4/4 and web typecheck passed. The opaque baseline-proof/persistence
   lease/coordinator work remains active and is not yet wired into production.
9. 2026-07-11 — Began parent-validated baseline hardening: journal rows now
   have strict phase/extra-key checks and a positive page-local attempt field;
   `assessSimAdvanceBaseline` creates an opaque canonical worker/durable proof
   consumed by `prepareSimAdvanceIntent`, which CASes the proof bytes in its
   transaction. Journal post commits parse a current GameSnapshot before any
   transaction. Focused transaction suite: 11/11 passed; web typecheck passed.
   Persistence lease, worker adapter, coordinator, boot, and UI work remain
   pending.
10. 2026-07-11 — Added direct branch-write in-transaction root-intent fence;
    branch creation/deletion now rejects unresolved tree evidence rather than
    rewriting parent metadata around it. Transaction proof expanded to 12/12;
    web typecheck and `git diff --check` passed. The comprehensive branch
   lifecycle/repair race and persistence lease matrix remain pending.
11. 2026-07-11 — Started the journal-aware active-persistence path: branded
    save/root lease, commit discriminator, intent-aware writer dispatch,
    independent receipt settlement, and exact lease capture APIs are present.
    A first durable receipt proof passed in `activeSavePersistence.test.ts`
    (44/44). Automatic/manual retry, explicit retirement, lifecycle barriers,
   and full collision/terminal-failure matrix remain pending before this
   milestone can be considered complete.
12. 2026-07-11 — Added durable receipt outcome storage plus ownership/delete/
    reset retirement paths and terminal non-storage journal failure handling.
    The persistence focused suite still passes 44/44 and web typecheck passes.
   Manual/automatic retained retry test is still being completed; it exposed a
   pending-settlement harness case and was not retained as evidence.
13. 2026-07-11 — Retained journal manual-retry regression restored and green.
    Red cause: lease acquisition did not claim the active persistence owner, so
    `retryActiveSavePersistence` returned false while an accepted receipt stayed
    pending. Green fix: lease acquisition now claims the owner before capture;
    first IndexedDB failure leaves the receipt pending with one pending write,
    manual retry dispatches the same intent object twice without re-export, and
    settles durable. Focused combined receipt: 3 files / 62 tests passed;
   web typecheck, diff check, empty index, and protected hashes passed.
14. 2026-07-11 — Added automatic retained retry and automatic-exhaustion →
    fallback-ready → manual-success receipt regressions, plus ordinary capture
    fencing before export while a lease is held. `activeSavePersistence.test.ts`
    is 48/48; web typecheck and diff check passed. Remaining lifecycle/terminal
    receipt cases and the authorized worker adapter are active work.
15. 2026-07-11 — Added common active-lease admission guards to persistence
    barriers and metadata operations; valid retained jobs cannot be replaced by
    transition/delete/replace/repair barriers. Journal evidence/CAS/lease/
    ownership failures are terminal fail-closed receipt retirements, never
    automatic retry. Focused combined receipt: 3 files / 67 tests passed;
   web typecheck, diff check, empty index, and protected hashes passed.
16. 2026-07-11 — Addressed audit lifecycle bypasses in production: load
    prep/release, activation, reconciliation, inactive replacement/repair, and
    active deletion now reject a live lease; baseline seal validates its lease;
    terminal journal failures use semantic storage-family classification and
    ownership errors retire as `ownership_lost`; poison clears retry state and
    remains capture-blocked. Existing persistence suite remains 50/50 and web
    typecheck passed; dedicated bypass/poison regressions remain to be added.
17. 2026-07-11 — Lifecycle tests now cover lease-backed baseline seal durable
    settlement and poison after retained failure (waiter retires fail-closed,
    timer/retry disabled, pending remains truthful, and finish rejects).
    Combined focused receipt: active persistence, session, transaction, worker
    session — 4 files / 72 tests passed. Web typecheck, diff check, empty
    index, and protected hashes passed. The exhaustive table-driven bypass and
   ownership-loss variants remain pending before the persistence milestone is
   complete.
18. 2026-07-11 — Added `preserves the exact retained journal job across every
    conflicting persistence lifecycle API`. It proves retained retry state is
    unchanged across reconciliation, load prep/release, activation, inactive
    replacement, deletion, metadata operation, and ordinary capture; callbacks
    never run and the same intent manually reaches durable settlement. Focused
    file: `activeSavePersistence.test.ts` 53/53; web typecheck passed.
19. 2026-07-11 — Hardened lease acquisition to require/reassert the exact
    activated persistence owner. Extended the comprehensive retained-job test
    through integrity restore and tree-delete barriers; both reject with no
    callback/storage work. Added unactivated/wrong-save lease contract proof.
    `activeSavePersistence.test.ts` 54/54 and `workerMutationSession.test.ts`
    5/5 passed; web typecheck passed.
20. 2026-07-11 — Comprehensive retained-job lifecycle regression now includes
    a prepared save-session transition targeting another save. Its outgoing
    persist callback never exports, status remains exact, and an ordinary
    worker permit succeeds afterward, proving the failed transition resumed its
    pause. `activeSavePersistence.test.ts` remains 54/54; web typecheck passed.
21. 2026-07-11 — Persistence lease/receipt milestone complete at its bounded
    layer: ownership-loss dispatch retires `ownership_lost` without retry;
    reset retires a pending receipt exactly once and cancels timers; semantic
    fail-closed rejects later retry. Combined focused receipt: 4 files / 76
    tests passed; web typecheck, diff check, empty index, and protected hashes
    passed. Next implementation seam is the authorized `useWorker.simAdvance`
    adapter.
22. 2026-07-11 — Added `assertSimAdvanceWorkerSessionCurrent`, a non-mutating
    exact object-identity/save/root assertion used before session permits. New
    focused coverage proves forged, wrong save/root, stale, and superseded
    sessions fail without allocating work. `workerMutationSession.test.ts`
    7/7, web typecheck, diff check, empty index, and protected hashes passed.
23. 2026-07-11 — Implemented production `useWorker().simAdvance`: bounded
    owned-operation switch, phase state machine, session permits, authorized
    snapshot/import wrappers, deferred flow publication/discard, and
    restart/import/export baseline restore. Existing worker hook/session tests
    passed 18/18 with web typecheck, diff check, empty index, and protected
    hashes. Dedicated adapter phase tests are still required.
24. 2026-07-11 — Adapter audit hardening: invalid runtime operations now reject
    before phase/permit/worker activity; flow listeners are individually
    isolated so a throwing subscriber cannot prevent later publication. Existing
    worker hook/session regression suite 18/18 and web typecheck passed.
25. 2026-07-11 — Added
    `apps/web/src/shared/hooks/useWorker.simAdvance.test.tsx` with a four-case
    explicit-operation happy-path matrix. It proves baseline/post export,
    no-argument exact sim dispatch, no other sim call, deferred false flow, and
    session completion for day/week/month/to-playoffs. New file 4/4 and web
    typecheck passed.
26. 2026-07-11 — Extended dedicated adapter coverage with invalid-operation
    recovery, strict phase ordering, and deferred-flow observer isolation.
    Dedicated `useWorker.simAdvance.test.tsx` now passes 7/7; web typecheck
    passed. Rejected-execution restoration and ordinary-lane overlap proofs
    remain for the next adapter batch.
27. 2026-07-11 — Added fresh-worker restore coverage: rejected gameplay is
    poisoned then restored via restart/import/verification export with no replay;
    failed fresh import terminates both realms and remains fail-closed. Dedicated
    adapter suite 9/9 and web typecheck passed.
28. 2026-07-11 — Adapter authority overlap closure: ordinary sim/export calls
    are fenced before and during a held adapter export permit; finishing the
    worker session while the remote promise is active rejects; wrong/stale/
    completed sessions fail before remote work. Dedicated adapter suite 11/11
    and web typecheck passed. Authorized worker-adapter milestone is complete;
    next seam is the module-scoped coordinator.
29. 2026-07-11 — Began module-scoped coordinator implementation and focused
    proof. It maps all four owned operations, awaits intent before execute,
    rejects duplicates, and proves branch exact-save authority plus rollback
    after post capture rejects before a receipt exists. Coordinator suite 6/6
    and web typecheck passed. Receipt-retirement/publication/fail-closed matrix
    remains before coordinator handoff.
30. 2026-07-11 — Coordinator correction: exact active-save (not root) authority
    is asserted for branches, root ownership is asserted separately, and post
    acceptance flips only after capture returns a receipt. Accepted receipt
    status now remains `running` unless persistence reports real retry/failure
    state; publication reasserts exact/root authority; fail-closed cleanup is
    isolated from poison/callback exceptions. Coordinator suite remains 6/6 and
    web typecheck passed. Full receipt-retirement/publication negative-control
    matrix remains pending.
31. 2026-07-11 — Coordinator Batch A green: accepted receipts stay `running`
    during ordinary saving, transition to `retry_wait` only on exact persistence
    failure, unsubscribe on durable settlement, then publish once. Throwing
    coordinator observers are isolated; branch exact/root authority and normal
    cleanup ordering are asserted. Coordinator suite 8/8 and web typecheck
    passed. Baseline seal remains intentionally absent because the proof API
    cannot yet derive it safely; receipt-retirement/publication negative-control
    batch remains next.
32. 2026-07-11 — Coordinator Batch B green: pre-receipt capture and post-export
    failures restore/verify/consume without publication; failed import, exact
    RNG mismatch, and consume failure preserve journal evidence and fail close
    without replay. Coordinator suite 12/12 and web typecheck passed.
33. 2026-07-11 — Coordinator Batch C green: after a post receipt is accepted,
    retirement, receipt rejection, exact-save/root ownership loss, durable
    publication failure, deferred-flow failure, and fail-closed/poison callback
    exceptions all preserve the committed/journal truth and enter
    `reload_required`/`fail_closed` without restore, consume, replay, or lease
    release. Persistence-status subscriptions are removed on settlement.
    Coordinator suite 20/20 and web typecheck passed. Negative control and
    cross-suite gates remain deliberately deferred to the coordinator closeout
    batch.
34. 2026-07-11 — Coordinator close gate D complete. Deliberate production
    negative control changed the intent boundary to start
    `prepareSimAdvanceIntent` but execute before awaiting it. Command
    `pnpm --filter @mbd/web exec vitest run src/shared/lib/simAdvanceCoordinator.test.ts -t "awaits intent before executing"`
    failed 4/4 mapped cases: each received `["intent", "execute:sim*"]`
    while the held intent was unresolved. The exact
    `intent = await prepareSimAdvanceIntent(proof, options.operation)` line
    was restored; the same command then passed 4/4 (16 skipped), and the full
    coordinator suite passed 20/20. Restored-source focused gates passed:
    `useWorker.simAdvance.test.tsx` 11/11,
    `workerMutationSession.test.ts` 7/7,
    `activeSavePersistence.test.ts` 56/56, and
    `pnpm --filter @mbd/web exec tsc --noEmit`. `git diff --check` passed,
    the index was empty, and the three protected hashes matched exactly.
    The module-scoped coordinator milestone is complete. Remaining Goal-20
    work is safe baseline-seal derivation, UI routing/publication integration,
    boot rollback, and browser proof.
35. 2026-07-11 — Baseline S1A green: `assessSimAdvanceBaseline` now makes one
    coherent read-only primary/shadow/root observation and returns either an
    opaque ready proof (only exact sealed canonical v34 pair) or a bounded
    seal-required proof for checksumless/no-shadow, sealed-no-shadow, or
    verified noncanonical supported pairs. Worker equality includes RNG; bad
    topology, missing/corrupt/mismatched copies, unsealed pairs, unsupported
    state, and worker mismatch fail closed. Assessment has no durable writes or
    journal attempt for seal-required results. The interim coordinator accepts
    ready only and explicitly rejects seal-required evidence until S1B wires a
    durable seal. Receipts: `saveSystem.integrity.test.ts` 61/61,
    `saveSystem.transaction.test.ts` 12/12,
    `simAdvanceCoordinator.test.ts` 20/20, and
    `pnpm --filter @mbd/web exec tsc --noEmit` passed. Next: S1B seal commit
    and exact persistence receipt wiring; UI/boot/browser remain out of this
    batch.
36. 2026-07-11 — Sol S1A correction batch A2 green. Assessment proofs now deep
    clone/freeze baseline and worker evidence, freeze both proof and assessment,
    and assert frozen baseline canonical bytes before return. Exact topology now
    requires a supported parsed root slot, canonical root id/slot/flags/parent/
    branch metadata, and canonical branch id/null-slot/parent; `gameState`
    residue classifies v34 pairs as noncanonical. New integrity proofs cover
    immutable nested RNG/snapshot/topology/branch arrays; root/branch topology
    forgery; ready and all branch seal-required sources; a real branch
    prepare/read/consume journal path; unsupported versions; legacy residue;
    no attempt mint for seals; and byte/store nonmutation for every seal source
    (with all four RNG-only mismatch sources retained). Receipts:
    `saveSystem.integrity.test.ts` 79/79,
    `saveSystem.transaction.test.ts` 12/12,
    `simAdvanceCoordinator.test.ts` 20/20, and web typecheck passed. S1B seal
    commit/receipt wiring and all UI/boot/browser work remain explicitly next.
37. 2026-07-11 — Sol S1A correction A3 green. Exact topology now additionally
    requires `rootId === rootSaveId(parsedSupportedSlot)`, rejecting
    `save-slot-01` and every other noncanonical lock identity even when its
    numeric slot parses successfully. Focused sealed root and structurally
    valid branch leading-zero tests fail closed, while canonical root/branch
    and branch journal paths remain covered. Receipts:
    `saveSystem.integrity.test.ts` 81/81,
    `saveSystem.transaction.test.ts` 12/12,
    `simAdvanceCoordinator.test.ts` 20/20, and web typecheck passed. S1B seal
    commit/receipt wiring remains next; no UI/boot/browser work was started.
38. 2026-07-11 — Baseline S1B green: added direct
    `commitSimAdvanceBaselineSeal(proof, capturedSnapshot)`. It strictly
    compares current-v34 captured state (including RNG), asserts exact active
    save/root ownership before and inside its ordered writer, exact-CASes
    primary/shadow topology and absence/presence, blocks only same-root journal
    evidence, and atomically writes a fresh canonical v34 primary/shadow plus
    root-only leaderboard without touching intents. Source tests cover all
    root/branch old/checksumless/missing-shadow sources, reassessment-ready
    attempts, metadata preservation, stale/CAS/topology/intent/ownership/write
    fault rollback, and stale-proof rejection. An initial test run exposed a
    real created-at preservation bug (the builder `existing` record was passed
    outside its options); it was corrected before the green rerun. Receipts:
    `saveSystem.transaction.test.ts` 31/31,
    `saveSystem.integrity.test.ts` 81/81,
    `simAdvanceCoordinator.test.ts` 20/20,
    `activeSavePersistence.test.ts` 56/56, and web typecheck passed. S2 is
    next: persistence lease/job/receipt wiring and coordinator seal flow; no
    UI/boot/browser work was started here.
39. 2026-07-11 — Sol S1B correction A4 green. Every issued seal proof is now
    registered in a module-private `WeakSet`; the direct commit rejects any
    spread, forged, deserialized, or otherwise non-identical proof before
    reading its fields, while retaining the original proof across precommit and
    transaction failure. The seal transaction now reads both exact-save and
    root-index journal evidence, and reasserts exact active/root ownership
    after CAS before primary, between primary/shadow, after shadow before the
    root/no-leader continuation, and after the final write. Focused fake-IDB
    coverage proves all stores roll back at every boundary, malformed/wrong-root
    exact-save intent blocks, and the same issued proof retries after both
    captured-snapshot and leaderboard-write failures. Receipts:
    `saveSystem.transaction.test.ts` 44/44,
    `saveSystem.integrity.test.ts` 81/81,
    `simAdvanceCoordinator.test.ts` 20/20,
    `activeSavePersistence.test.ts` 56/56, and web typecheck passed. S2
    persistence proof/receipt wiring remains next; UI/boot/browser work remains
    unstarted.
40. 2026-07-11 — S2 persistence layer green. Leased baseline captures now carry
    the exact issued seal proof through a baseline-specific job discriminator
    directly to `commitSimAdvanceBaselineSeal`; one structured-cloned,
    recursively frozen snapshot is retained across automatic/manual retry with
    the same proof, receipt, generation, and lease identity. Typed
    `SimAdvanceEvidenceConflictError` makes deterministic proof/CAS/snapshot/
    topology/intent failures terminal even when their messages mention storage
    or transactions; genuine storage-family errors remain retryable. Added a
    sticky simulation fail-closed fence and a durable-preserving
    `closeCommittedSimAdvancePersistenceLeaseFailClosed` path: it retires only
    the lease while retaining exact saved status/receipt/recency/generations,
    blocks ordinary exports and lease reacquisition through load release, and
    permits reopening only at coherent activation. Receipts:
    `activeSavePersistence.test.ts` 68/68,
    `saveSystem.transaction.test.ts` 44/44,
    `saveSystem.integrity.test.ts` 81/81,
    `simAdvanceCoordinator.test.ts` 20/20, and web typecheck passed. S3 is
    next: coordinator seal/reassessment and committed-publication flow; UI,
    boot, and browser proof remain unstarted.
41. 2026-07-11 — Sol FIX_BEFORE_S3 S2B persistence correction green. Issued
    persistence receipts now have module-private `WeakMap` provenance; only an
    exact live simulation receipt may install a waiter, and forged/spread,
    ordinary, or post-reset objects synchronously fail before touching receipt
    fields or waiter state. Each lease retains only its latest accepted
    simulation receipt, so a durable baseline cannot close after an accepted
    post, an old lease cannot close a new one, and prior ordinary/finished
    durability cannot block pre-receipt poison. Every simulation intent is
    structured-cloned and recursively frozen before export; the private copy,
    one frozen post snapshot, proof, receipt, generation, and lease identity
    remain identical across automatic/manual retry. A clone failure accepts no
    work and leaves the lease poisonable. `SaveIntegrityUnavailableError` now
    propagates from exact verified baseline reads and is classified as
    retryable `unavailable`; a real fake-IDB transaction proof shows all four
    stores and the retained intent stay byte-identical until the exact intent
    succeeds after verification returns. Added root/branch baseline→post
    latest-receipt close proofs, actual post-durable ownership-release close
    proof, old-lease/ordinary pre-receipt poison proofs, and strict receipt
    lifecycle regressions. Observed commands: `pnpm --filter @mbd/web exec
    vitest run src/shared/lib/activeSavePersistence.test.ts` 75/75;
    `activeSavePersistence.session.test.ts` 4/4;
    `saveSystem.transaction.test.ts` 45/45;
    `saveSystem.integrity.test.ts` 81/81; `simAdvanceCoordinator.test.ts`
    20/20; and `pnpm --filter @mbd/web exec tsc --noEmit` all passed. `git
    diff --check` passed, `git diff --cached --name-only` was empty, and the
    protected SHA-256 values matched exactly. S3 remains coordinator
    seal/reassessment and committed-publication integration; UI routing, boot
    rollback, and browser proof remain intentionally unstarted.
42. 2026-07-11 — Sol FIX_BEFORE_S3 S2C persistence correction green. Exact
    primary/shadow verification now applies terminal-first priority: any
    mismatch, malformed/unsupported, or unsealed member is a typed
    `SimAdvanceEvidenceConflictError` even if the other verification is
    unavailable; only an otherwise clean pair with an unavailable member
    raises retryable `SaveIntegrityUnavailableError`; valid checksum mismatch
    remains terminal. Real fake-IDB coverage proves mismatch/unavailable in
    both primary/shadow orders plus malformed/unavailable and
    unavailable/unsealed all leave primary, shadow, leaderboard, and intent
    byte-equivalent, while the all-unavailable exact-intent retry proof remains
    green. The ordinary-durability poison proof now activates once, retains the
    ordinary receipt/status through direct lease acquisition, and verifies
    zero pending durable generations/name/recency are preserved while fencing
    becomes fail-closed. Root and branch latest-receipt tests now hold a post
    dispatch unresolved, reject old baseline close with byte-equivalent pending
    status, then accept only the exact post close. Real root and branch
    ownership-release tests cover full baseline→post durability and exact
    status preservation through committed close. Observed commands:
    `activeSavePersistence.test.ts` 75/75;
    `activeSavePersistence.session.test.ts` 5/5;
    `saveSystem.transaction.test.ts` 49/49;
    `saveSystem.integrity.test.ts` 81/81;
    `simAdvanceCoordinator.test.ts` 20/20; and
    `pnpm --filter @mbd/web exec tsc --noEmit` all passed. `git diff --check`
    passed, the index was empty, and protected hashes matched exactly. S3
    coordinator seal/reassessment and committed-publication integration remains
    next; UI, boot, and browser proof remain intentionally unstarted.
43. 2026-07-11 — S3 coordinator integration green. The module-scoped
    coordinator now owns the full exact-save command state machine: exact
    active/root/worker-session reassertion after every material await; one
    worker baseline export; optional durable baseline seal using that retained
    object without re-export; fresh ready assessment/proof; durable intent
    before one mapped worker execute; one post export/capture; and receipt-only
    retry while both lanes remain held. It derives post metadata only from the
    fresh ready proof baseline name. Pre-receipt failure restores/verifies the
    immutable full/RNG baseline then consumes the exact intent and releases
    persistence before worker. Accepted-post retirement, persistence rejection,
    authority/publication/flow failure never rolls back or replays; they use
    exact nondurable poison or exact durable committed-close and retain the
    worker session fail-closed. New coordinator tests cover all four mappings,
    duplicate fencing, root/branch seal retry and reseal failures, pre/post
    crash windows, retry held post, root/branch pending receipt identity,
    rollback import/RNG/consume/authority failures, post retirement, active/
    root/worker publication authority loss, and throwing close/poison/failClosed
    observers. Observed commands: `simAdvanceCoordinator.test.ts` 31/31;
    `activeSavePersistence.test.ts` 75/75;
    `activeSavePersistence.session.test.ts` 5/5;
    `saveSystem.transaction.test.ts` 49/49;
    `saveSystem.integrity.test.ts` 81/81;
    `workerMutationSession.test.ts` 7/7;
    `useWorker.simAdvance.test.tsx` 11/11; and
    `pnpm --filter @mbd/web exec tsc --noEmit` all passed. S4 UI routing,
    S5 boot rollback, and S6 production browser/full gates remain intentionally
    unstarted.
44. 2026-07-11 — S3B correction batch green. Persistence now tracks an exact
    running journal receipt through fail-closed poison: poison during a held
    baseline/post transaction does not pre-settle a possibly committed write;
    later success remains truthful durable while the lane stays fenced, and
    later rejection settles one fail-closed receipt with no retry/timer/job
    resurrection. Lease admission now fences new captures, drains an already
    accepted ordinary write, and either mints only after its durable settlement
    or returns `SimAdvancePersistenceAdmissionBlockedError` while preserving
    the existing retained-recovery status. The coordinator treats all
    pre-lease resolution/authority/admission failures as clean `blocked` idle
    outcomes (releasing a just-acquired worker session), and receipt-status
    listeners are run-ID/status gated so a late callback from completed run A
    cannot overwrite running run B or a terminal state.

    Worker gameplay authorization now requires exact runtime provenance of the
    object returned by successful durable `prepareSimAdvanceIntent`, not a
    TypeScript brand or caller-supplied fields. The one-shot authorization is
    bound to the exact session/save/root/operation and the frozen prepared
    intent; `sim_day` cannot mint `simWeek`, forged/spread/reused tokens fail
    before Comlink. Runtime prepared-intent provenance is revoked only after
    the transaction actually removes/replaces/clears the owned intent: post
    commit, verified rollback, exact/root-tree deletion, coordinated root
    replacement, and Clear All. Aborted deletion and repair rejection preserve
    it, so a valid retained journal remains usable and evidence is never
    revoked early. Direct root, blocked ordinary-branch, recovery-supported
    orphan-branch, replacement, Clear All, abort, and repair lifecycle tests
    cover these paths.

    Coordinator tests now use branch-specific session/lease/intent/receipt
    identities, make seal/post receipt waits receipt-sensitive, and prove no
    prepare/post capture/execute before a held seal settles. The shared seal
    failure matrix no longer prequeues a phantom seal: reassessment rejection
    reaches the exact second assessment and intent failure reaches fresh ready
    evidence plus the exact prepare rejection. Added exact post-vs-prior-seal
    wait routing, suspended durable-publication authority loss, and post-flow
    authority reassertion proofs; neither path rolls back or replays.

    Observed command: `pnpm --filter @mbd/web exec vitest run
    src/shared/lib/activeSavePersistence.test.ts
    src/shared/lib/activeSavePersistence.session.test.ts
    src/shared/lib/saveSystem.transaction.test.ts
    src/shared/lib/saveSystem.integrity.test.ts
    src/shared/lib/simAdvanceCoordinator.test.ts
    src/shared/lib/workerMutationSession.test.ts
    src/shared/hooks/useWorker.simAdvance.test.tsx` passed 7 files / 279 tests
    (`activeSavePersistence` 80/80, ownership session 5/5, transactions
    57/57, integrity 81/81, coordinator 36/36, worker session 8/8, adapter
    12/12). `pnpm --filter @mbd/web exec tsc --noEmit` and `git diff --check`
    passed; `git diff --cached --name-only` was empty; protected SHA-256 values
    matched exactly. S4 UI routing, S5 boot rollback, and S6 browser/full gates
    remain intentionally unstarted.
45. 2026-07-11 — S3C authorization/authority correction green. Ready baseline
    proofs now have module-private exact-object lifecycle: only the frozen
    assessment object can reserve preparation; copies, deserialized values, or
    changed checksum/baseline/attempt fields fail before reading/writing. A
    reservation returns to available only when its own prepare transaction
    rejects; success permanently consumes the proof, so rollback requires a
    fresh assessment/attempt/token and stale intent1 cannot commit or consume
    fresh intent2. Runtime prepared-intent revocation now prioritizes the
    current token map, closing the otherwise possible stale-object/mapped-token
    authorization hole.

    A durable prepared intent now burns one exact worker-authorization claim at
    issuance, after save/root/operation validation. Wrong/forged issuance does
    not burn it; a second issuer in the same or a later worker session fails,
    and intent removal makes issued-but-unused authorization fail before any
    worker call. Worker-session finish, worker-permit finish, and transition
    pause resume now require the exact live object, not a copied symbol handle.
    The real fake-IDB transaction matrix covers proof copies, retry after
    transaction failure, concurrent preparation, post-rollback reassessment,
    stale intent1 commit/consume, one-authorization issuance, and unused-auth
    revocation; adapter coverage retains the one-Comlink-call proof.

    Coordinator hostile coverage now distinguishes accepted post durable versus
    retired outcomes under active/root/worker authority loss after the exact
    post subscription registers; uses exact committed-close versus poison with
    no rollback/replay; exercises subscribe/status/unsubscribe/durable-check
    exceptions; proves success/rollback finish failures and exact order/once
    behavior; and table-tests clean pre-lease resolution/authority/session/
    persistence-admission blocks. Persistence adds baseline as well as post
    running-poison late-rejection proof and admission that begins before a
    held ordinary write later retains recovery.

    Observed commands: `pnpm --filter @mbd/web exec vitest run
    src/shared/lib/activeSavePersistence.test.ts
    src/shared/lib/activeSavePersistence.session.test.ts
    src/shared/lib/saveSystem.transaction.test.ts
    src/shared/lib/saveSystem.integrity.test.ts
    src/shared/lib/simAdvanceCoordinator.test.ts
    src/shared/lib/workerMutationSession.test.ts
    src/shared/hooks/useWorker.simAdvance.test.tsx` passed 7 files / 306 tests
    (`activeSavePersistence` 82/82, ownership session 5/5, transactions
    61/61, integrity 81/81, coordinator 56/56, worker session 9/9, adapter
    12/12). `pnpm --filter @mbd/web exec tsc --noEmit` passed. S4 UI routing,
    S5 boot rollback, and S6 browser/full gates remain intentionally unstarted.
46. 2026-07-11 — S3D runtime-operation and atomic-release correction green.
    `prepareSimAdvanceIntent` now rejects a cast/unsupported operation before
    reserving or reading an issued ready proof; worker authorization claim also
    validates a required runtime journal operation before checking or burning
    provenance; and the worker-operation mapping has an explicit rejecting
    default. Real fake-IDB tests prove invalid prepare leaves all four durable
    stores and the exact proof usable, while direct claim/create tables cover
    wrong save/root, supported-wrong operation, and unsupported operation
    without consuming the later exact authorization.

    `finishSimAdvanceWorkerSession` now validates exact current session/no
    permits, reserves finish, and invokes an optional synchronous
    `beforeRelease` while the worker fence remains active. Callback failure
    clears only that reservation and retains the session; callback success
    verifies the reservation/session then releases with no later throwing
    operation. Coordinator success and rollback now call worker finish with
    `finishSimAdvancePersistenceLease` inside that callback, then clear local
    lease/session only after combined success. Assertions/mutation permits and
    test reset reject while finishing, preventing synchronous callback
    reentrancy from exporting or mutating a stale exact session.

    Real active-persistence/worker-session coverage owns and activates an
    exact save, creates durable baseline/post receipts, and proves combined
    callback release preserves byte-equal status while fresh worker mutation
    and lease become possible only afterward. Copy/active-permit validation
    failure never invokes the callback; a throwing callback keeps exact worker
    and lease live until poison, after which ordinary capture, fresh lease, and
    worker mutation are all blocked. A stale finish handle cannot affect a
    successor session/lease. Coordinator mocks now execute `beforeRelease` and
    use explicit event logs for persistence-inside-worker-release ordering.

    Observed command: `pnpm --filter @mbd/web exec vitest run
    src/shared/lib/activeSavePersistence.test.ts
    src/shared/lib/activeSavePersistence.session.test.ts
    src/shared/lib/saveSystem.transaction.test.ts
    src/shared/lib/saveSystem.integrity.test.ts
    src/shared/lib/simAdvanceCoordinator.test.ts
    src/shared/lib/workerMutationSession.test.ts
    src/shared/hooks/useWorker.simAdvance.test.tsx` passed 7 files / 316 tests
    (`activeSavePersistence` 82/82, ownership session 8/8, transactions
    67/67, integrity 81/81, coordinator 56/56, worker session 10/10, adapter
    12/12). S4 UI routing, S5 boot rollback, and S6 browser/full gates remain
    intentionally unstarted.

47. 2026-07-11 — S4 UI routing/presentation checkpoint in progress (Terra
    thread `019f537c-cd7a-7d71-92f5-50edf41ac54c`). Coordinator presentation
    now distinguishes preparing, running, persisting, publishing,
    rolling_back, retry_wait with an exact resume stage, and sticky
    fail_closed. Publishing now occurs only after the exact post receipt is
    durable; a retired post remains fenced. Ordinary useWorker mutation and
    snapshot access reject before Comlink while coordinator work is active;
    ordinary reads defer until publishing/idle and retire on fail_closed or
    reset without invoking a stale worker. The shared
    `useSimAdvanceExecutor` gives shell/dashboard regular controls one
    module-scoped admission point, normalizes only same-tick duplicate
    coordinator rejection to `{kind:'blocked'}`, publishes the Zustand mirror
    only after durability, then awaits the initiating surface's strict
    refresh.

    AppLayout regular footer/keyboard commands now use exact `sim_day`,
    `sim_week`, `sim_month`, and `sim_to_playoffs` executor operations; legacy
    postseason/offseason routes remain direct but navigation is success-gated.
    Dashboard quick simulation now delegates to the same executor and has no
    local quick-sim autosave/mirror path. AppBootGate has an S4-only reload
    presentation/suppression surface (S5 journal inspection remains absent).
    Command palette and shared autosave have live coordinator admission
    guards; the shell uses imperative stale-callback guards and a soft
    inert/SPA-navigation fence. TopBar/SimControls use coordinator stage
    copy, suppress ordinary Saved/zero-pending messaging while non-idle, and
    retain exact persistence Retry during retry_wait.

    Actual checkpoint commands: `pnpm --filter @mbd/web exec vitest run
    src/shared/lib/simAdvanceCoordinator.test.ts
    src/shared/hooks/useWorker.test.tsx
    src/app/boot/AppBootGate.test.tsx
    src/app/layout/AppLayout.test.tsx
    src/app/layout/TopBar.test.tsx
    src/app/layout/SimControls.test.tsx
    src/app/layout/CommandPalette.test.tsx
    src/features/dashboard/hooks/useDashboardActionHandlers.test.tsx
    src/features/dashboard/hooks/useDashboardPageController.test.tsx
    src/features/dashboard/components/DashboardSimControlsPanel.test.tsx
    src/features/dashboard/components/DashboardPageContent.test.tsx` passed
    10 files / 105 tests; `pnpm --filter @mbd/web exec tsc --noEmit` passed.
    A nonexistent `useActiveSaveAutosave.test.tsx` was not counted as a gate.
    Remaining S4 work: direct setup/settings/onboarding/guided-backup handler
    guards, full shell/route regression matrix, and S4 adversarial review;
    S5 boot journal rollback and S6 browser/full gates remain out of scope.

    Follow-up S4 admission checkpoint: setup save delete/continue/new-dynasty,
    settings save/load/delete/import/export/clear/branch, and dashboard
    apply-job/briefing handlers now query the live coordinator before and
    after asynchronous mutation boundaries. `pnpm --filter @mbd/web exec
    vitest run src/features/dashboard/hooks/useDashboardActionHandlers.test.tsx
    src/features/setup/hooks/useSetupActionHandlers.test.tsx
    src/features/settings/hooks/useSettingsSaveData.test.tsx` passed 3 files /
    36 tests; expected logger diagnostics from hostile settings recovery cases
    were observed. Direct stale-handler regressions remain to be expanded.

    Subsequent hostile corrections: reload-only boot dialog now has labelled
    and described alertdialog semantics; executor has direct stale-save,
    ordering, duplicate-normalization, and fail-closed release tests; ordinary
    worker read reset retires rather than releases stale calls. Guided backup
    and press response now require a true result before dismiss/success UI,
    recheck live save identity, and fence busy presentation/keyboard Escape.
    `AppLayout`, executor, press, guided-nudge/dashboard-guided-start, boot,
    dashboard actions, settings, and setup focused suites were rerun during
    these corrections. Dashboard all-phase regular simulation routing is held
    pending a narrow architecture decision because playoffs/offseason quick
    actions must remain out of Goal 20 scope.

48. 2026-07-12 — S4 saved-true publication correction (Terra). Moved every
    corrected state-changing UI mirror/result lane behind the exact ordinary
    persistence receipt: AppLayout legacy postseason/offseason simulation,
    Dashboard job/legacy simulation mirrors, offseason data application,
    draft start/pick/watch state, playoff mirrors, player-profile and roster
    business-result presentation, roster-extension responses, and trade
    negotiation/result state now publish only after the accepted snapshot is
    reported `{ saved: true }`. Revised onboarding staff/scouting hires now
    capture the exact active save immediately after a successful worker
    mutation and before advancing onboarding flow state. Settings import now
    captures active-save authority and rechecks it (and coordinator admission)
    after `file.text()` and immediately before the transient ownership write.

    Added held-persistence proof for Dashboard legacy mirroring, exact held
    onboarding staff persistence, Settings A-to-B/null file-read import
    abandonment, and trade result suppression while its snapshot is held.
    AppLayout monthly/ceremony fixtures now carry an active save and explicitly
    model a successful persistence result so the production `{ saved: true }`
    guard remains exercised rather than being bypassed.

    Observed commands: the requested 17-file command (worker-session,
    coordinator, worker/adapter/executor, AppLayout, dashboard, offseason,
    roster, profile, scouting/staff, trade/free-agency, draft, playoffs) passed
    **17 files / 196 tests**. The focused saved-true/settings/onboarding batch
    passed **11 files / 123 tests**. `pnpm --filter @mbd/web exec vitest run
    src/workers/sim.worker.test.ts --reporter=dot` passed (full worker suite;
    output contained the expected 137-plus dot run), and `pnpm --filter
    @mbd/web exec tsc --noEmit` passed. `git diff --check` passed; the index
    remained empty; all three protected hashes matched. Remaining work is S4
    review/full regression completion, then intentionally out-of-scope S5 boot
    rollback and S6 browser/full gates.

49. 2026-07-12 — S4 final stale-refresh correction. For failed roster actions
    which legitimately changed flow state, player-profile and roster handlers
    now publish the durable business-failure copy immediately after
    `{ saved: true }`, before awaiting their display-only profile/roster
    refresh. This prevents a held refresh from publishing stale A error state
    after a save switch, null authority, or unmount; no failure message moves
    ahead of durable persistence. Added held-refresh regressions in both
    handler suites. `usePlayerProfileActions` + `useRosterActionHandlers`
    passed 2 files / 14 tests. The exact 17-file S4 regression command passed
    17 files / 198 tests; web typecheck, diff check, empty-index check, and
    protected hashes passed. S5/S6 remain intentionally out of scope.

50. 2026-07-12 — S5 boot journal recovery checkpoint. `inspectSimAdvanceIntentForCandidate`
    now coherently reads both the exact intent key and expected-root unique
    index: wrong/malformed exact-root evidence and another same-tree row fail
    closed rather than disappearing as `none`. Candidate snapshot export
    authorization is async-safe, exact-save-bound, and exact-claim-bound;
    it remains live only through its awaited callback and rejects null/wrong,
    copied, and stale claims.

    AppBootGate inspects after exact target claim/transition preparation and
    before ordinary candidate import. A rollback record restarts the worker,
    imports the verified durable baseline, exports it under the exact candidate
    authorization, validates full canonical v34 state including RNG, consumes
    the exact intent, commits ownership, activates persistence/Zustand, and
    only then shows the non-replay rollback notice. Journal inspection, import,
    RNG verification, or consume errors preserve evidence and render the
    reload-required surface without clearing the active save ID.

    Observed S5 command: `pnpm --filter @mbd/web exec vitest run
    src/app/boot/AppBootGate.test.tsx
    src/shared/lib/saveSystem.transaction.test.ts
    src/shared/lib/saveSystem.integrity.test.ts
    src/shared/lib/saveSessionOwnership.test.ts
    src/shared/lib/saveSessionTransitionRecovery.test.ts
    src/shared/hooks/useWorker.test.tsx
    src/features/setup/hooks/useSetupActionHandlers.test.tsx` passed **7 files /
    216 tests**. Web typecheck, diff check, empty-index check, and protected
    hashes passed. S6 browser/full-gate work remains intentionally unstarted.

51. 2026-07-12 — S5 adversarial correction plan after Sol
    `FIX_AND_REVIEW` (thread `019f552e-4389-7501-8f16-a1256dcd1824`;
    P0 0 / P1 3 / P2 0). Live Dexie probing proved that the exact-key and
    root-index reads return distinct objects, so the reference comparison in
    candidate inspection rejects every valid journal row. The current boot
    path also deletes the exact intent before fallible ownership/activation/
    Zustand/transition-completion steps, and its component-local reload
    surface does not revoke a restored outgoing save's global mutation/export
    authority.

    The sequential correction is a module-scoped boot-recovery admission
    latch plus a reserved transition finalizer. `recovering` blocks ordinary
    worker mutation/export, simulation admission, persistence capture/retry,
    and global shortcuts while still allowing only the exact candidate
    import/export authority. `fail_closed` is terminal until reload. For a
    valid rollback the worker baseline is restarted/imported/export-verified,
    candidate ownership is committed, persistence metadata and Zustand are
    staged behind the latch, and exact transition-success reservations are
    created before `consumeSimAdvanceIntentRollback` runs as the sole
    remaining fallible operation. The worker pause and persistence barriers
    remain held through that IndexedDB CAS/delete. After deletion succeeds,
    only synchronous total reservation commits, path restoration, and
    best-effort notice publication remain; path/toast failures may be logged
    but cannot reclassify the durable rollback.

    Any pre-delete inspection/recovery/commit/staging/initialization/
    reservation/delete failure must synchronously enter global fail-closed,
    make Zustand uninitialized best-effort, release whichever active authority
    exists, restart/discard the singleton worker without restoring outgoing A,
    terminally close the transition without ordinary abort semantics, abort a
    remaining candidate claim, preserve the exact intent, and render reload
    required. Candidate inspection must use semantic exact-intent equality,
    with real-Dexie root/branch happy paths and same-tree-other-save negative
    controls. Required held-delete proof must show that initialized UI remains
    hidden and all mutation/export/persistence/shortcut lanes stay blocked
    until deletion commits. Corrections return to the same Terra thread; S6
    remains unstarted until the exact correction matrix and Sol re-review are
    green.

52. 2026-07-12 — S5 correction implementation. Closed the three Sol P1s.
    `inspectSimAdvanceIntentForCandidate()` now compares the exact-key and
    root-index rows with semantic `isExactIntent` equality rather than Dexie
    object identity; wrong-root exact rows remain integrity failures and a
    schema-rejected second same-root row cannot turn the exact row into
    `none`.

    Added `bootRecoveryAdmission.ts`: exact permit/reservation identity,
    candidate-only async authorization, isolated subscribers, terminal
    fail-closed state, and an epoch-bound ordinary-admission token. The token
    is captured before ordinary worker/persistence awaits and rechecked before
    Comlink/write continuation, so a stale outgoing A callback cannot resume
    after B recovery begins. Candidate import/export remains permitted only
    under the exact boot permit and exact candidate save ID. The latch starts
    before journal inspection; a verified no-intent inspection explicitly
    returns it to idle, while malformed inspection, baseline import/export
    verification, ownership, staging, reservation, or consume failure enters
    global fail-closed before transition barriers can reopen.

    Added reserved boot transition APIs in active persistence. Candidate
    metadata is staged behind the transition barrier; exact committed
    transition reservation keeps capture barriers and the worker pause held;
    `finishReservedActiveSaveSessionTransition()` awaits only the journal CAS
    delete, then has a synchronous/non-throwing activation/release tail. The
    AppBoot rollback sequence is now restart -> exact import -> canonical v34
    (including RNG) export verification -> ownership commit -> persistence and
    Zustand staging -> transition/latch reservation -> exact intent consume ->
    total release/notice. The reload surface remains rendered while the delete
    is held even after Zustand initialization. Journal failure globally fences
    ordinary export/mutation/persistence, releases ownership best-effort,
    discards the worker without reimporting outgoing A, terminally closes the
    transition, and preserves the intent.

    Added focused proof for semantic inspection corruption, latch identity and
    epoch lifecycle, no-intent latch release, held intent delete hidden UI,
    import/RNG/consume/malformed-inspection fail-close, stale ordinary
    persistence/mutation rejection, and reserved transition success/rejection
    fencing. Observed correction gate:
    `pnpm --filter @mbd/web exec vitest run` across AppBoot, boot admission,
    save transactions, active persistence/session, worker session, ownership,
    transition recovery, coordinator, worker, executor, AppLayout, and Setup
    passed **16 files / 353 tests** with no unhandled errors. The full
    `src/workers/sim.worker.test.ts` regression was rerun successfully.
    `pnpm --filter @mbd/web exec tsc --noEmit`, `git diff --check`, and the
    empty-index check passed; protected SKILL/AGENTS/PROGRAM SHA-256 values
    remained exact. Remaining scope is S6 browser/full-gate proof only.

53. 2026-07-12 — S5 final correction after Sol re-review. Moved the remaining
    fallible candidate persistence reset into
    `stageActiveSavePersistenceMetadataForTransition()`: staging now validates
    exact target/quiescence/no lease and applies B's durable status/owner reset
    while B capture remains blocked. The exact transition reservation now also
    reserves the exact worker-pause release before the intent CAS/delete.
    `finishReservedActiveSaveSessionTransition()` awaits only that delete;
    after it resolves, the total tail directly unblocks staged B, tombstones
    outgoing persistence, clears the transition, commits the prevalidated
    pause release, and isolates observer exceptions. Staging/reservation
    failure occurs before the delete callback, preserving journal evidence.

    Boot success finalization is total for the exact prevalidated reservation;
    stale/copied/double post-delete callbacks are harmless no-ops. AppBoot now
    clears its permit immediately after that total commit and treats route
    restoration and rollback notice failures as local logged presentation
    errors, never journal cleanup triggers. Direct coordinator admission now
    reaches `assertBootRecoveryOrdinaryAdmission()` through the worker-session
    gate before `preparing` or target resolution, returning an idle blocked
    outcome under both recovering and fail-closed boot states.

    Hostile tests cover preflight no-delete, held-delete staged B fencing,
    total/copy/double pause and boot finalizers, pause-observer exceptions,
    route/toast post-success throws, and direct boot-state coordinator blocks.
    Observed final correction matrix passed **16 files / 361 tests**;
    `SetupPage.test.tsx` passed **6/6**; full `sim.worker.test.ts` was rerun
    (the established **137/137** worker regression); web typecheck, diff check,
    empty-index check, and protected hashes passed. S6 only remains.

54. 2026-07-12 — S6 browser diagnosis and bounded correction. The initial
    Luna matrix failed only in `reload-smoke` while a report-to-decision overlay
    changed from `Continue` to enabled `Dismiss`/`Open Dashboard`; the helper
    retained the old locator and swallowed a zero-match state as `waiting`.
    The screenshot/DOM showed truthful `Saved` and zero pending writes, so this
    was a test-helper race, not a product defect. Terra, using the explicitly
    recorded parent manual relay-pattern fallback for host browser commands,
    changed only the helper/spec surface: every poll resolves fresh DOM state,
    requires exactly one visible actionable control, throws on ambiguity,
    waits on none/disabled, performs a second fresh resolution before click,
    and propagates click failures. Storage-pressure copy was corrected to the
    journal-inclusive text. Host helper/E2E typecheck and diff check passed.

55. 2026-07-12 — Authoritative S6 verification and review. Fresh production
    Chromium with project `chromium`, `--workers=1`, `--retries=0` passed
    `reload-smoke` **2/2 in 4.6m** and the complete four-spec matrix **5/5 in
    6.5m**, with `.last-run.json` status `passed`, empty `failedTests`, and no
    retry/flaky classification. The browser journey proved one-context,
    two-page same-tree blocking, write-ahead intent, rollback, persistence-only
    retry without replay, RNG/reload durability, and desktop plus 375x667
    attachments. Observed save/commit timings around 1.15–1.92s exceeded the
    observational 500ms performance budget but caused no timeout, failure,
    replay, or trust defect; retain as an adjacent performance risk.
    Sol `019f552e-4389-7501-8f16-a1256dcd1824` (`gpt-5.6-sol`, xhigh) reviewed
    the final helper/spec diff and evidence, found the stale-locator P1 fixed,
    and returned `MERGE_READY` with P0=0/P1=0/P2=0. Prior authorization
    piggyback and same-root orphan cleanup P1s were already fixed and
    re-reviewed.

56. 2026-07-12 — Luna closeout. Frozen source receipts remain authoritative:
    root typecheck 9/9; full test 8/8 tasks, 459 files passed + 1 skipped,
    2283 assertions passed + 2 skipped, exit 0/no unhandled errors; production
    build 5/5, 3026 modules, PWA 166 precache entries with `sw.js` and Workbox;
    determinism 3/3; focused final correction matrix 14 files/460 tests; and
    negative control 4/4 red then 4/4 green plus coordinator green. Closeout
    docs, exact item-8 staging, intentional commit, and local-main fast-forward
    are the remaining actions. No push, deploy, tag, publish, release, or item
    9 work is authorized.
