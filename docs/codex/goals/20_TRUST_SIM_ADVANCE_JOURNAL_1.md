# Goal 20 — TRUST-SIM-ADVANCE-JOURNAL-1

## Player outcome

An interrupted regular-season simulation command can never leave the visible
dynasty, singleton worker, and durable save on different halves of one day. A
successful command becomes visible only after its exact post-command snapshot is
durable. An interrupted command rolls back to the exact verified pre-command
save without replaying gameplay.

## Authority and scope

This is roadmap item 8 in
`MBD_REPO_AUDIT_AND_GOAT_ROADMAP_2026-07-10.md`: “Write-ahead intent journal so
an interrupted sim day resumes or rolls back cleanly — never a half-applied
day.” Live source establishes the bounded production family:

- `simDay`, `simWeek`, and `simMonth` are separate user commands that all run
  one or more canonical regular-season days;
- `simToPlayoffs` composes those same regular-season advancement kernels and
  must not bypass the guard;
- App shell/footer/keyboard controls and Dashboard quick actions currently use
  independent executors;
- worker commands mutate `FullGameState` and RNG incrementally, so an ordinary
  exception can leave the singleton realm partially changed;
- the current Dexie v5 primary, exact integrity shadow, and root leaderboard
  already commit together, but no durable evidence exists before simulation.

The slice owns those four regular-season advancement commands, their exact-save
persistence boundary, boot rollback, additive local database metadata, and the
existing control surfaces. Each user command is one rollback unit. It does not
refactor week/month/to-playoffs into repeated public day calls or change their
simulation policy.

## Done state

1. Every production App shell, footer, global-keyboard, season-flow, and
   Dashboard entry to `simDay`, `simWeek`, `simMonth`, or `simToPlayoffs` goes
   through one shared module-scoped executor. Duplicate or cross-surface calls
   cannot overlap.
2. The executor acquires exact active-save/root authority and one opaque
   exclusive worker-mutation session before any snapshot export, journal write,
   or simulation. It waits for already accepted worker/persistence work and
   blocks every ordinary gameplay mutation, snapshot export, save switch, and
   global simulation shortcut until the command commits or coherently rolls
   back.
3. Dexie advances additively from v5 to v6 with a dedicated
   `simAdvanceIntents` store keyed by exact `saveId` and uniquely indexed by
   `rootSaveId`. The row contains only bounded operational identity: journal
   version, exact save/root, operation, exact baseline integrity generation,
   baseline season/day/phase, and a deterministic stale-callback token. No full
   snapshot, TTL, heartbeat, polling, timestamp-based stealing, UUID, or
   simulation RNG value is invented.
4. Before the worker command starts, source proves that its exported snapshot is
   the exact verified durable primary/shadow baseline. A checksumless or
   normalized old save is first written as the same canonical v34 state. Intent
   creation exact-CASes the primary and shadow, reasserts root ownership, and is
   durably awaited. Failure before that commit invokes the worker zero times.
5. Only the exact journal authorization can invoke the selected worker command
   while the exclusive session is active. Worker flow notifications, Zustand,
   route refreshes, and success copy remain on the baseline until durable
   completion.
6. After a successful worker result, the exact post-command snapshot is captured
   once. The existing ordered persistence job retains the exact intent token
   across automatic/manual persistence-only retry. The post primary, exact
   shadow, root leaderboard update when applicable, and deletion of that exact
   intent commit in one Dexie transaction with baseline CAS. Gameplay is never
   rerun to repair a failed write.
7. If the worker or post-export path fails before a snapshot is accepted, the
   app restarts/discards the worker realm, imports the verified baseline under
   exact active-save authority, verifies coherence, and clears only the matching
   intent. If any restore, ownership, verification, or cleanup step fails, the
   app releases active authority, marks the UI uninitialized, and keeps all
   mutation/export lanes fail-closed.
8. If a post snapshot is accepted but its storage transaction fails, the exact
   in-memory job and intent remain retryable while all mutation/export lanes stay
   disabled. A successful automatic/manual retry commits that snapshot and
   consumes the journal without another simulation call. A hard reload instead
   discards ephemeral post state and rolls back from the verified baseline.
9. Boot inspects only the exact candidate save after its root lock is acquired
   and before worker import. No intent means ordinary verified resume. A valid
   intent plus its unchanged verified baseline is consumed as an automatic
   rollback and that baseline is imported. A malformed, wrong-root, missing,
   corrupt, or generation-mismatched row is never replayed or silently cleared;
   boot fails closed through explicit recovery evidence.
10. Persistence truth is monotonic: no pre-commit UI advance, flow refresh,
    `Saved`, zero pending writes, new `lastSavedAt`, or success toast. A committed
    storage transaction cannot be reclassified as failed by a throwing status
    subscriber. Ownership loss and stale callbacks cannot write or consume a
    newer intent.
11. Root and branch saves share one journal ownership tree while retaining exact
    save-row identity. One root tree has at most one unresolved intent; distinct
    roots may progress independently in separate tabs. Same-tree contenders
    remain blocked before journal inspection, worker import, or cleanup.
12. Root/branch deletion, root replacement/import/new-game replacement,
    integrity recovery, and Clear All either coordinate and remove the owned
    exact/tree intent in their existing atomic transaction or leave both save and
    intent unchanged. Delayed work cannot resurrect a deleted or replaced save.
13. Item-7 storage reporting counts valid journal bytes in the attributed tree
    and counts malformed/orphan journal bytes in the all-MBD total without
    trusting them as topology. Copy distinguishes the small operational journal
    from primary/shadow save bytes.
14. GameSnapshot remains v34. A real v5-to-v6 IndexedDB upgrade preserves
    primary, shadow, leaderboard, timestamps, supported old/deep saves, and v34
    export/import behavior byte-for-byte where the existing contract promises
    it. The v6 declaration remains a compatibility tombstone in rollback
    guidance; older already-open builds are documented honestly as requiring
    close/reload and lose write authority when the upgrade closes their DB.
15. Focused unit/integration tests, a deliberately failing then restored negative
    control, root typecheck, full tests, production build/PWA, determinism, and a
    fresh zero-retry production Playwright journey pass. Browser proof uses one
    context and two real pages, proves write-ahead ordering, same-tree blocking,
    interrupted rollback, exact durable success, retry without rerun, hard
    reload, desktop and 375x667 presentation, and no flaky classification.

## Recovery policy

The bounded policy is rollback, never gameplay replay:

- verified baseline + intent: discard ephemeral worker state, consume the exact
  intent, and load the baseline;
- committed post-save + no intent: load the completed command normally;
- intent + changed/missing/corrupt baseline: fail closed and preserve evidence.

During the same live runtime, an already captured exact post snapshot may use
the existing persistence-only retry lane. If the runtime ends first, the post
snapshot is deliberately not reconstructed or replayed; boot rolls back.

## Scope cut

- No journal for playoff-game/series/round advancement, offseason transitions,
  next-season rollover, draft/trade/press/development mutations, or generic
  transactions in this slice. Those remain adjacent risks recorded in the run.
- No per-inner-day checkpoint, gameplay replay, event sourcing, previous-save
  generation history, cloud/service-worker sync, background replay, or worker
  domain decomposition.
- No GameSnapshot v35, integrity projection change, simulation outcome/RNG
  change, dependency, route, economic clock, roadmap item 9, push, deploy, tag,
  or release.

## Required evidence

- `docs/codex/runs/TRUST-SIM-ADVANCE-JOURNAL-1/SOURCE_TRUTH.md`
- living `docs/codex/runs/TRUST-SIM-ADVANCE-JOURNAL-1/PLAN.md`
- exact WAL/crash-window, worker rollback, root/branch, persistence retry,
  deletion/replacement, v5-to-v6, old/deep-save, storage-accounting, boot, shell,
  Dashboard, shortcut, and bundle-budget focused receipts
- an observed negative control that bypasses the durable-intent await or atomic
  intent deletion, followed by exact restoration and a green rerun
- fresh production two-page interruption/retry/hard-reload proof and 375x667
  inspection
- adversarial review with zero actionable P0–P2 before closeout;
  `COMPLETION.md` is deferred to the closeout phase.
