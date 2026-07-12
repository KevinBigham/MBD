# TRUST-SIM-ADVANCE-JOURNAL-1 — Source Truth

Recorded from the live checkout before item-8 production edits on 2026-07-10.

## Preflight

- Branch: `codex/sim-advance-journal-8`.
- Branch start, current `HEAD`, and local `main`:
  `45595430fcd532ba211c491d31a4947c6ef4a164`.
- Package contract: `pnpm@9.15.4`; observed shell runtime remains the repository
  host environment, with commands taken from current `package.json` files.
- Save contract: `GameSnapshot` v34; minimum supported snapshot v1.
- Local database before this slice: Dexie v5 with `saves`,
  `saveIntegrityBackups`, and `leaderboard`.
- Item-8 completion report: absent. No item-8 goal or run existed before this
  reconciliation.
- Prior browser receipts are item-7 receipts from this exact base revision. They
  cover storage pressure, multi-tab, and reload smoke but do not exercise a
  write-ahead simulation intent or worker interruption.

### Protected unrelated work

These user-owned files were dirty before the branch and must remain unstaged and
uncommitted:

| File | SHA-256 at item-8 start |
| --- | --- |
| `.agents/skills/mbd-implement-slice/SKILL.md` | `a1a6d903cf0da47f457578274da1e335e97eb947d1a6026da85706d88fe59ac3` |
| `AGENTS.md` | `1f181b5d16e1a8e64fe54ed113b9c9648a271d3b746d7ea907e9194712cfc163` |
| `docs/codex/PROGRAM.md` | `8a3c0cfd3686aa735d049ba473bf8da95168bc56a9eb7c2629fbe28a33817eb1` |

The index was empty before item-8 files were created.

## Canonical advancement seams

- `apps/web/src/workers/sim.worker.actions.ts`
  - `simDayInternal()` mutates injury counters, core season state/day, RNG-driven
    games, relationships, minors, CPU market activity, injuries, narrative,
    ticker, consequences, records, and scenario state sequentially.
  - `simWeekInternal()` and `simMonthInternal()` perform larger sequential
    batches around the core range.
  - `simToPlayoffs()` composes the same day/week/month kernels.
- `packages/sim-core/src/sim/seasonSimulator.ts` loops canonical `simulateDay()`
  for week/month. Replacing these commands with repeated public day calls would
  change side-effect cadence and RNG order.
- `packages/sim-core/src/math/prng.ts` advances the parent RNG on forks. A throw
  can therefore leave RNG call count changed even if the result DTO never
  returns.
- `apps/web/src/workers/snapshot.ts` already exports/imports the exact seeded RNG
  state as part of v34. This is the rollback source; no journal RNG is needed.

## Current UI and authority order

- `apps/web/src/app/layout/AppLayout.tsx` owns footer, global shortcut, and
  season-flow simulation. Its generic handler currently performs worker
  mutation, updates Zustand, persists, then refreshes worker views. It ignores a
  `{saved:false}` result.
- `apps/web/src/features/dashboard/hooks/useDashboardActionHandlers.ts` is a
  second executor. It mutates the worker, updates Zustand, fetches the Dashboard,
  then autosaves. Its local busy state is independent from the app shell.
- `apps/web/src/shared/hooks/useWorker.ts` checks exact save ownership before
  Comlink and registers a worker-mutation permit around each RPC. The module
  currently allows multiple permits, ends the permit before route persistence,
  emits flow notifications immediately on RPC success, and restarts only errors
  classified as fatal.
- `apps/web/src/shared/lib/workerMutationSession.ts` has a transition pause but
  no opaque exclusive session that can admit one journal-authorized sequence
  while rejecting every other mutation/export.
- The worker is canonical. Zustand is only a UI mirror and may not advance before
  the exact post snapshot is durable.

## Persistence and transaction seams

- `apps/web/src/shared/lib/activeSavePersistence.ts` binds an accepted export to
  an exact save/generation/opaque receipt, orders writes, retains the exact
  snapshot for persistence-only retry, and reports `Saved` only after
  `saveGameById` resolves.
- An active save switch already pauses worker mutations, quiesces captures and
  writes, and refuses to release the outgoing root while persistence is
  unresolved. Item 8 should extend this pattern rather than invent a second
  ownership model.
- `apps/web/src/shared/lib/saveSystem.ts` seals a `SaveData` record outside the
  transaction, then commits primary, exact integrity shadow, and root
  leaderboard atomically. The post-sim journal deletion must join this exact
  transaction and exact-CAS the baseline/token.
- Writes are serialized per exact save ID. Root/branch authority is resolved
  separately through `resolveSaveSessionTarget`; branches and their root share
  one Web Lock identity.
- `AppBootGate.tsx` acquires candidate root ownership and prepares the session
  transition before verified load/import. Journal recovery belongs after those
  authority barriers and before worker import.
- `saveSystem.ts` deletion, replacement, repair, and Clear All transactions do
  not know about a journal store yet.
- Item-7 storage estimates read only three stores. A v6 journal must be included
  in all-MBD bytes and attributed only through trusted exact-save/root topology.

## Exact unresolved behavior

The active blocker is not a missing UI label. No durable intent exists before a
regular-season command, and two independent surfaces can overlap. A nonfatal
throw after worker mutation can leave the singleton worker on partial state
while Zustand and IndexedDB still claim the old day. A successful worker result
can also become visible before its save is durable. A reload has no evidence to
distinguish “command never started” from “worker was interrupted.”

The source maps found an additional trust edge that the implementation must
close: an exception thrown by an active-persistence status listener currently
can escape `notifyListeners()` from inside the storage-success `try`, risking a
false failure classification after the storage transaction committed.

The attached earlier item-7 review is not an active blocker. Its four requested
fixes are present in `45595430…`; the coordinator reran the exact four files on
this branch base: 4 files, 162 tests, all passed.

## Required architecture decision

Use additive Dexie v6 `simAdvanceIntents: 'saveId,&rootSaveId'` and keep
GameSnapshot v34. One lightweight row points at the already verified durable
baseline; it does not duplicate the snapshot. The post-save transaction consumes
the exact intent atomically. On boot, a retained valid intent means rollback to
the unchanged baseline. Never replay gameplay.

The owned production operation set is exactly:

- `sim_day`
- `sim_week`
- `sim_month`
- `sim_to_playoffs`

Playoff bracket advancement, offseason, and next-season transitions are
explicit adjacent risks, not silently folded into a generic handler edit.

## Expected owned file systems

Exact paths may narrow after implementation, but the slice may own:

- Goal/run/ledger/changelog/status evidence for Goal 20.
- `saveSystem.ts` plus transaction/integrity/storage-pressure tests.
- `activeSavePersistence.ts` plus persistence/session tests.
- `workerMutationSession.ts`, `useWorker.ts`, and their tests.
- one new bounded simulation journal/coordinator module and tests.
- `AppBootGate`, App shell, Dashboard executor/controller/controls, and focused
  tests required to route all named entry points.
- Settings storage copy/tests if the new journal byte category is rendered.
- one dedicated Playwright spec/helper/config update and current bundle/lazy-shell
  tests if touched.

No item-9 economy source, snapshot schema, sim outcome policy, dependency, or
unrelated cleanup is owned.

## Existing focused evidence surfaces

Existing tests already cover:

- save DB transactions, integrity upgrade/repair, storage estimates, root/branch
  deletion, and clear-all;
- active persistence ordering/retry/session barriers and opaque receipts;
- Web Lock ownership and candidate/outgoing worker recovery;
- worker mutation pause behavior and `useWorker` ownership enforcement;
- AppBoot resume, App shell autosave/shortcuts, Dashboard actions/controllers and
  mobile-critical controls;
- worker snapshot import/export and canonical day/week/month/to-playoffs behavior;
- all supported snapshot migrations and v34 JSON round trip;
- production multi-tab, storage-pressure, and reload-smoke journeys.

There is no existing item-8 WAL, crash-window, or production interruption test.
The observed pre-production baseline passed:

- 17 directly affected web trust/UI suites, 225/225 tests;
- contract migration matrix, 24/24;
- canonical worker suite on this exact base, 124/124;
- root typecheck, 9/9 Turbo tasks;
- determinism snapshot, 3/3.

## Final implementation discoveries

- Import fixed-point behavior is not raw object identity: deterministic
  `gmCareer` and relationship defaults are materialized by the pure sim-core
  snapshot materializer. Canonical v34 comparisons therefore use the
  repository's semantic normalization boundary.
- Dexie returns distinct clones from the exact key and unique root-index
  reads. Journal inspection uses semantic intent equality, not reference
  equality.
- Intent deletion is the irreversible boundary. All fallible inspection,
  ownership, staging, activation, verification, and reservation work occurs
  before the total synchronous tail after the journal CAS/delete.
- Authorization is a synchronous one-shot classification/cleanup step; an
  awaited provider callback cannot piggyback a later authorization or consume a
  newer intent.
- Same-root cleanup uses the exact indexed ownership tree. Malformed/orphan
  journal bytes are counted for all-MBD storage totals without being trusted as
  topology.
- The final browser failure was a test-only helper race around a changing
  `Continue`/`Dismiss` overlay. Fresh DOM resolution and exactly-one-visible
  action proof fixed the helper without production changes.
- Authoritative production fault proof covers a held post, exact rollback, a
  persistence-only retry without replay, hard reload, same-tree two-page
  blocking, RNG preservation, and desktop/375x667 attachments. Save/commit
  latency warnings are adjacent performance evidence, not a trust defect.
