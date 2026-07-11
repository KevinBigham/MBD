# TRUST-STORAGE-PRESSURE-1 — Source Truth

Recorded: 2026-07-11 CDT

## Worktree and toolchain

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch: `codex/storage-pressure-7`
- Starting commit and local `main`: `c77ecbc0bbd74fb264ac74322c3d0389b25b77d5`
  (verified item-6 landing)
- Pre-existing user-owned dirty files, excluded from this slice:
  `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and
  `docs/codex/PROGRAM.md`
- Required starting SHA-256 values:
  - `a1a6d903cf0da47f457578274da1e335e97eb947d1a6026da85706d88fe59ac3`
    — `.agents/skills/mbd-implement-slice/SKILL.md`
  - `1f181b5d16e1a8e64fe54ed113b9c9648a271d3b746d7ea907e9194712cfc163`
    — `AGENTS.md`
  - `8a3c0cfd3686aa735d049ba473bf8da95168bc56a9eb7c2629fbe28a33817eb1`
    — `docs/codex/PROGRAM.md`
- Manifest package manager: `pnpm@9.15.4`; observed host: Node `v24.16.0`,
  pnpm `11.7.0`.
- Root scripts: `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm verify:determinism`, and `pnpm e2e:reload-smoke`.
- Web scripts: Vitest, source+E2E TypeScript, Vite/PWA build, and serial
  Playwright with one worker and zero local retries.
- `CURRENT_GAME_SNAPSHOT_VERSION` is 34 at
  `packages/contracts/src/schemas/save.ts:519`.
- `apps/web/src/shared/lib/saveSystem.ts:157-200` defines Dexie v5 with
  `saves`, `saveIntegrityBackups`, and `leaderboard`.
- Index was empty at planning start.

## Baseline evidence

- Coordinator-observed focused web baseline:
  `SettingsDiagnosticsPanel`, `useSettingsDiagnosticsData`,
  `useSettingsSaveData`, `saveSystem.integrity`, and
  `activeSavePersistence`: 5 files / 107 tests passed.
- `packages/sim-core/tests/performance.test.ts`: 1 file / 4 tests passed.
- Independent read-only test mapping ran the broader relevant baseline: 14 files /
  190 tests passed, plus the selected worker maintenance regression 1/1.
- Item 6 landed with full typecheck/test/build/determinism and zero-retry
  production Playwright green. Those receipts are inherited baseline evidence,
  not substitutes for item 7 final gates.

## Roadmap and governance reconciliation

- Roadmap item 7 is “show save size, warn near quota, offer archive pruning.”
- Goal 16 deliberately deferred save-size/quota/pruning while establishing one
  exact shadow per save ID. Goal 17 established root-tree Web Locks and exact
  active-save mutation/persistence authority. Goal 18 preserved v34 and Dexie v5.
- `docs/codex/RELEASE_GATES.md:16-27` requires exact snapshot binding,
  ordered durability, failure injection, retry without rerun, hard reload,
  switch-race proof, and mobile/PWA checks for persistence changes.
- Its history gate at lines 49-56 forbids destructive pruning. The live archive
  action is genuinely lossy, and source inspection did not prove equivalent
  durable factual ledgers for every discarded field. Goal 19 therefore disables
  that player action. Confirmation alone is not a release-gate exception.

## Current storage envelope

- `SaveData` at `saveSystem.ts:33-51` is a web-local envelope containing save
  identity, tree topology, snapshot, timestamps, and optional integrity metadata.
- The central write at `saveSystem.ts:1023-1071` stores the same sealed record in
  `saves` and `saveIntegrityBackups` in one transaction; roots also update the
  slot leaderboard. Thus a healthy current save record has roughly two logical
  copies, but IndexedDB engine/index/structured-clone overhead is browser-defined.
- The v5 migration creates an empty shadow store and never backfills old rows.
  A legacy/checksumless primary can therefore exist without a shadow.
- Leaderboard IDs at `saveSystem.ts:671-727` include dynasty and scenario rows by
  `slotNumber`; all rows for a slot count toward that root tree's logical local
  footprint.
- Root IDs are `save-slot-N`. `listSaveTreeChildIds` at `saveSystem.ts:472-520`
  reconciles trusted root narrative references with primary/shadow parent indexes.
  `listSaveTree` at lines 1365-1381 returns roots with trusted branches.
- Corrupt, missing-primary, orphan, or conflicting rows can still consume bytes.
  A total must count them even when tree attribution is partial or unavailable.

## Three separate size truths

1. **Current worker snapshot JSON estimate.**
   `estimateSnapshotSizeBytes` at
   `apps/web/src/workers/sim.worker.diagnostics.ts:268-274` measures UTF-8
   `JSON.stringify(snapshot)`. `SettingsDiagnosticsPanel.tsx:114-120` currently
   labels it only “Storage.” It excludes the SaveData envelope, integrity
   metadata, shadow, branches, leaderboard, indexes, and other origin storage.
2. **Estimated serialized local MBD records.**
   No production API exists. The safe model is a single read-only Dexie snapshot
   of all three stores, followed by UTF-8 JSON sizing of the actual raw values.
   Exact save totals count actual primary and actual shadow separately. Trusted
   tree totals add root/branches and every leaderboard row for the root slot.
   All-MBD totals also include unattributed rows. Values are logical serialized
   estimates, not physical IndexedDB bytes.
3. **Approximate origin-wide usage/quota.**
   No production `navigator.storage.estimate()` use exists. The WHATWG Storage
   Living Standard (last updated 2026-03-15) defines usage as an
   implementation-defined rough estimate and quota as an implementation-defined
   conservative estimate: <https://storage.spec.whatwg.org/#usage-and-quota>.
   The origin shelf also includes Cache API, service-worker registrations,
   localStorage, and other local storage endpoints. It cannot be called MBD save
   bytes.

## Stale and mutating diagnostics defect

- `getPerformanceDiagnostics()` at
  `apps/web/src/workers/sim.worker.queries.ts:3170-3186` trusts any positive stored
  `snapshotSizeBytes`; only zero triggers a fresh exported-snapshot estimate.
- `exportSnapshotWithDiagnostics()` at
  `apps/web/src/workers/sim.worker.actions.ts:942-960` recalculates iteratively but
  is unused. Live `exportSnapshot()` at lines 2485-2487 calls
  `exportGameSnapshot()` directly.
- `buildPerformanceDiagnosticsView()` calls
  `normalizePerformanceDiagnostics()` at
  `sim.worker.diagnostics.ts:276-307`, so a read can mutate worker truth.
  `archiveOldSeasonsInState()` also normalizes before returning a possible zero
  count. Item 7 must make read diagnostics pure and zero-result maintenance a
  true no-op; it must not fix this by adding a persisted size field.

## Pressure policy

- No repository or web standard supplies a warning threshold. Goal 19 chooses a
  deterministic presentation policy: `<80%` normal, `>=80% && <90%` warning,
  `>=90%` critical.
- This is UI guidance only. It does not promise a write will fit.
- Unsupported API, rejection, missing/negative/non-finite usage, or missing/
  non-finite/non-positive quota is unavailable. `usage > quota` is critical
  evidence, not clamped away.
- A real active-save `failureKind === 'quota'` is stronger evidence than an
  optimistic estimate and forces the critical state until recovery truth changes.

## Existing maintenance semantics

- `SettingsDiagnosticsPanel.tsx:149-173` dispatches archive/prune immediately and
  has no confirmation.
- `useSettingsDiagnosticsData.ts:62-126` performs worker mutation, adopts returned
  in-memory diagnostics, then calls `persistActiveSave()`. It truthfully says
  “not durable” on a false result, but currently updates the smaller in-memory
  number before durability and always points to Retry even when capture failed
  before a retained job existed.
- Worker APIs at `sim.worker.actions.ts:2518-2535` call the narrow web helpers:
  - `archiveOldSeasonsInState` at `sim.worker.diagnostics.ts:310-327` converts
    seasons older than `current season - 10` from `SeasonArchiveEntry` to
    `ArchivedSeason`;
  - `pruneStaleWorkerData` at lines 330-337 removes expired ticker entries and
    resolved/expired consequence watchers only.
- The detailed schema at `packages/contracts/src/schemas/narrative.ts:1016-1078`
  includes games back, playoff series, awards, leader lists, transactions, draft,
  financials, user storylines, and timeline events. The compact schema at lines
  1088-1100 retains season, compact standings, user record/result, champion,
  MVP/Cy Young, top stat leaders, and dynasty score.
- `packages/sim-core/src/performance/index.ts:119-176` is a parallel broader prune
  implementation that also removes story arcs, development setbacks, scout
  conflicts, and dynasty cards. It is not the Settings worker path and is
  explicitly forbidden for this slice.
- `PerformanceDiagnosticsView` lacks exact stale-watcher eligibility. Goal 19 may
  add read-only DTO fields for the narrow prune confirmation; this is not a
  GameSnapshot or Dexie schema change. An eligible-archive count is unnecessary
  because the archive action is disabled.

## Ownership, ordering, and failure stages

- `useWorker.ts:47-67` classifies archive/prune as mutations. Goal 19 preserves
  worker compatibility but removes the UI dispatch path for archive.
  `invokeWorkerMethod` at lines 180-244 asserts exact active-save ownership and
  registers a worker mutation permit before Comlink.
- Root and branches share `mbd-save-tree-v1:<root>` authority through
  `saveSessionOwnership.ts:1,106-115`, while the worker mutation is bound to the
  exact active root or branch ID.
- `persistActiveSaveSnapshot()` at
  `activeSavePersistence.ts:1208-1303` asserts the exact active owner, captures
  one post-mutation snapshot, rechecks the capture epoch/owner, orders the desired
  generation, and retains captured write failures for persistence-only Retry.
- If export/capture itself fails after worker mutation, no retained retry snapshot
  exists. The UI must say the in-memory change was not durable; a reload restores
  the prior durable snapshot. It cannot advertise Retry unless actual persistence
  status says Retry is available.
- `useSettingsSaveData.ts:96-116` has an operation latch for save data, but
  diagnostics owns only `diagnosticsBusy`. `SettingsPageContent.tsx:117-156` does
  not cross-disable the panels. Maintenance can overlap load/delete/switch or
  another maintenance action at the UI layer. One shared Settings operation owner
  is required; lower ownership barriers remain defense in depth.

## Second-review source discoveries

- A persistence generation is ordering evidence, not snapshot identity.
  `markPreCaptureFailure()` deliberately preserves an older retained failed job
  when a later export fails, and same-save activation resets generations to zero.
  A maintenance coordinator therefore cannot infer that its mutation is the
  retryable snapshot from `{saveId, generation}`. The corrected boundary mints
  one opaque in-memory receipt only after a snapshot capture is accepted, carries
  that exact object through automatic/manual persistence-only Retry, and marks
  only that object durable after its job writes. Activation, deletion,
  tombstoning, and ownership loss clear the durable receipt. No receipt is saved
  in GameSnapshot or Dexie.
- The original Settings latch was owned by one route-hook instance. An accepted
  async prune can outlive route unmount, so a remounted Settings page could have
  opened a second lane. The corrected owner lives in a module-scoped external
  coordinator, returns an opaque symbol token, survives remount, and permits
  release only by the exact token. Unmount and StrictMode subscription cleanup do
  not release accepted work.
- Origin quota override is presentation truth over the last raw origin estimate;
  it does not require a second asynchronous storage read. Removing the
  failure-kind partial refresh prevents it from cancelling the only coherent
  worker/local/origin request during save changes or recovery.
- Local MBD rows and origin pressure remain valid independent evidence when the
  worker diagnostics query is unavailable. Settings must keep those cards visible
  while disabling worker-dependent snapshot and prune actions.
- Trusted root attribution accepts only integer slots in the live `SAVE_SLOTS`
  set. Values such as slot 0, slot 6, fractions, infinities, and strings remain
  counted all-MBD evidence but cannot form an authoritative save tree.

## UX and browser seams

- Save Hub already lists roots and branches at
  `features/setup/components/SetupSaveHubPanel.tsx:64-184` but has no size or
  pressure display.
- Settings Data/Install lists roots and active branches at
  `features/settings/components/SettingsSaveDataPanel.tsx:132-285`.
- Settings Diagnostics is the narrow existing place for current snapshot size,
  origin pressure, and active maintenance. Status at
  `SettingsPageContent.tsx:61-64` needs live-region semantics.
- Existing maintenance buttons already use `focus-ring`,
  `mobile-critical-control`, and named test markers. The archive control must
  become non-actionable protected-history guidance. A new prune `alertdialog` must add
  initial Cancel focus, Escape/cancel no-op, focus return, busy locking, factual
  copy/counts, and 375x667 bounds.
- Playwright already provides a deterministic IndexedDB quota fault in
  `e2e/helpers/dynasty.ts`, a hard-reload recovery journey in
  `reload-smoke.spec.ts`, and a real two-page Web Locks journey in
  `multitab-guard.spec.ts`. `playwright.config.ts` is serial, one worker, and zero
  local retries. A dedicated storage-pressure spec can extend `testMatch` without
  production backdoors.

## Third-review source discoveries

- A confirmation ID is not itself a valid modal. The active save ID and the
  diagnostics evidence used for its factual counts can change independently.
  Rendering, document modal marker, inert/`aria-hidden` background, focus, and
  event interception must all derive from one predicate that requires the same
  active save plus live diagnostics. When that predicate fails, the confirmation
  is invalidated and cannot reopen automatically when old evidence returns.
- `TickerEntry.expiresDay` is an absolute `(season * 1000) + day` value in the
  canonical ticker engine and persisted worker producers. Comparing it with the
  within-season `state.day` makes real entries immortal to maintenance. The prune
  predicate therefore uses the same absolute-day convention and is covered by
  same-season and prior-season expired entries. The pre-existing monthly league-
  event producer writes a relative expiry and immediately filters that entry
  against an absolute day; repairing that separate narrative publication defect
  is adjacent work and is not broadened into this storage slice.
- Refresh and shared-operation warnings are route-owned sentinels, not durable
  state. A current coherent Setup refresh clears only its own prior failure copy,
  while a Settings owner transition to idle clears only the exact shared-busy
  warning. Preview, operation, and successful-save statuses remain untouched.
- The retained archive worker compatibility method is still a mutation contract
  even though its lossy UI action is disabled. Normalizing persisted diagnostics
  before discovering that no season is eligible makes an `archivedCount: 0`
  result mutate the snapshot. Eligibility must be computed first; normalization
  and archive assignment occur only when the result count is positive.

## Risks and stop-condition audit

- **P1 measurement deception:** snapshot, logical records, and origin usage must
  remain separately named.
- **P1 integrity regression:** never delete or thin shadows as storage relief.
- **P1 race:** one Settings operation latch must span mutation, exact persistence,
  telemetry refresh, and status.
- **P1 false reclamation:** durable record sizes remain at their prior reading on
  failure; Retry never reruns mutation.
- **P1 history loss:** the UI must never call the lossy archive worker mutation.
  Source does not prove its discarded facts are redundant. Any reachable or
  automatic archive compaction stops the slice.
- **P2 topology:** untrusted attribution is partial/unknown, never silently added
  to the wrong dynasty or dropped from total.
- **P2 estimate honesty:** invalid/unsupported platform data is unavailable and a
  quota failure overrides optimistic estimates.
- **P2 accessibility:** warning cannot rely on color; confirmation/status need
  keyboard/mobile/live-region proof.

No schema, DB, dependency, deterministic simulation, or item-8 blocker is active.
The history-governance tension is resolved by disabling lossy archive compaction
and offering only narrow ephemeral pruning. Implementation divergence reactivates
a stop condition.

## Closeout reconciliation

Final current-source facts observed on 2026-07-11: GameSnapshot remains v34,
Dexie remains v5, and no package/dependency or schema files changed. The exact
49-suite focused receipt is `/tmp/mbd-goal19-focused-final.json` with 49/49
suites and 372/372 tests passed. Root typecheck, full test, fresh production
build/PWA, determinism, and the three explicit zero-retry Chromium production
journeys all passed. The existing mobile touch-target contract was updated to
remove the no-longer-player-actionable archive control; the narrow prune
control remains covered. The final source therefore has no player-reachable
archive dispatch, no broad sim-core prune, and no item-8 source.
