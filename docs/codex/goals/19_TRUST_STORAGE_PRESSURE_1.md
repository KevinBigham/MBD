# Goal 19 — TRUST-STORAGE-PRESSURE-1

## Player outcome

Players can see how large each protected dynasty tree is, understand when the
browser reports that the MBD origin is approaching its approximate quota, and
choose a clearly explained maintenance action without weakening save integrity,
cross-tab ownership, durable-save truth, or dynasty history by surprise.

## Authority and scope

This is roadmap item 7 in
`MBD_REPO_AUDIT_AND_GOAT_ROADMAP_2026-07-10.md`: “Storage-pressure
UX: show save size, warn near quota, offer archive pruning.” Live source defines
what those words can safely mean:

- the current Settings “Storage” number is only UTF-8 JSON bytes for the current
  worker snapshot and is not a durable IndexedDB or quota measurement;
- every current protected save ID normally has an exact full primary and shadow
  record, while checksumless v4-era records may legitimately have no shadow;
- roots and what-if branches share one root-tree ownership identity;
- Settings already exposes the worker mutations `Archive Older Seasons` and
  `Prune Stale Data` and then persists the exact active save;
- there is no archive save category, shadow-pruning mechanism, or safe source
  authority for deleting inactive save files as storage maintenance.

The slice therefore owns a read-only storage-pressure model, existing Save Hub
and Settings presentation, and the existing active-snapshot maintenance flow.
It does not own a new storage engine or archive product.

## Governance judgment for historical compaction

`Archive Older Seasons` is a lossy conversion: detailed season rows older than
the ten-season live window become compact factual summaries. It retains season,
standings wins/losses/rank, the user record and playoff result, champion,
MVP/Cy Young names, and the top leader in each tracked category. It removes
games-back detail, playoff-series detail, full award/leader lists, transactions,
draft class, financial history, storylines, and timeline events from that
snapshot.

Live source does not prove that every discarded transaction, draft, financial,
timeline, playoff-series, award, leader, and storyline fact remains durably
represented in another canonical factual ledger. Confirmation cannot satisfy the
history release gate's “no destructive pruning” rule. Goal 19 therefore disables
the `Archive Older Seasons` UI action and replaces its misleading “long-term
archive” promise with an honest protected-history explanation. The worker API is
left as compatibility surface but is not called by player UI in this slice.

The roadmap's storage-relief intent is met through the existing narrow
`Prune Stale Data` action, which removes only expired presentation ticker entries
and resolved/expired consequence watchers rather than factual season history.
Lossless season archival is a separately governed future goal; it cannot be
invented here through a schema/DB rewrite. Any player-reachable call to the lossy
archive mutation, automatic compaction, broader prune, or claim that those lost
facts are redundant fails this goal.

## Done state

1. One read-only web-local API captures `saves`, `saveIntegrityBackups`, and
   `leaderboard` raw rows in one Dexie read transaction, then computes UTF-8 JSON
   byte estimates without writing, normalizing, repairing, or changing recency.
2. The model reports:
   - actual primary and actual shadow bytes for each exact save ID;
   - each trusted root tree’s root/branch pairs plus every leaderboard row for
     that slot;
   - an all-MBD stored-record total that still counts corrupt, orphaned,
     unassigned, and otherwise unattributable rows;
   - explicit partial/unavailable evidence when serialization or trusted
     topology fails—never a deceptive zero or inferred duplicate.
   Copy calls these “estimated serialized local save records” and states that
   IndexedDB indexes, structured-clone/engine overhead, compression, and other
   origin data are not measured.
3. The current worker snapshot JSON estimate remains separately labeled as an
   in-memory logical snapshot estimate. A positive persisted
   `snapshotSizeBytes` value is not accepted as durable size or quota evidence,
   and diagnostics reads are pure. Any zero-result maintenance action is a true
   no-op.
4. `navigator.storage.estimate()` is wrapped as an optional read-only origin
   estimate. Usage/quota are always labeled approximate and origin-wide. Missing
   API, rejection, missing fields, negative/non-finite usage, or non-positive or
   non-finite quota yields an honest unavailable state without hiding MBD record
   sizes or prompting for persistent-storage permission.
5. Pressure classification is deterministic UI policy, not a browser guarantee:
   below 80% is normal, 80% through below 90% is warning, and 90% or more is
   critical. A real active-persistence `quota` failure overrides an optimistic or
   unavailable estimate with critical “last save hit quota” truth. Boundary and
   `usage > quota` cases are tested.
6. Save Hub shows each root’s protected-tree estimate, including branch and
   primary/shadow context, and an origin-wide approximate pressure summary.
   Settings shows the same storage truths plus the separately named current
   snapshot estimate. No new route is added.
7. The lossy archive action is disabled and cannot dispatch its worker mutation.
   The UI explains that detailed season history is protected and that lossless
   archival is not available. The narrow prune confirmation is an accessible
   `alertdialog`. Cancel is initially
   focused; Cancel or Escape causes zero worker, export, persistence, size-refresh,
   or success-status activity and returns focus. Confirmation binds the exact
   active save ID and factual eligibility counts and discloses that only expired
   ticker entries and resolved/expired consequence watchers are removed.
8. One shared Settings operation latch disables save/load/import/export/delete/
   clear/branch/prune controls for the complete operation. A stale
   confirmation, save switch, ownership loss, duplicate click, or active
   operation fails closed before the Comlink mutation. Root/branch tree ownership
   remains shared, but maintenance changes only the exact active root or branch.
9. The durable order is worker mutation -> exact post-mutation snapshot capture
   -> existing active-save persistence -> persisted-size/origin refresh ->
   success. A captured write failure retains that exact snapshot for Retry and
   never reruns maintenance. An export/capture failure has no retry snapshot;
   copy says the worker change is not durable and reload restores prior durable
   truth. Neither failure claims bytes reclaimed or `Saved`.
10. Focused unit/integration tests, a restored negative control, typechecks, full
    tests, production build/PWA, determinism, and production Playwright pass.
    Browser proof covers an owner and real blocked same-tree contender, 85%
    approximate origin pressure, distinct tree/origin/snapshot values,
    archive-disabled proof, prune cancel/no-op, confirmed maintenance, quota
    failure/retry-without-rerun, matching
    primary/shadow durability, owner hard reload, owner close/successor acquire,
    and desktop plus 375x667 keyboard/mobile behavior.

## Scope cut

- No save/root/branch deletion as maintenance, no shadow deletion or thinning,
  no previous-generation history, and no export-before-delete archive invention.
- No broader `packages/sim-core/src/performance/pruneStaleData` behavior; it would
  delete story arcs, setbacks, scout conflicts, and dynasty cards beyond the
  live worker contract.
- No `navigator.storage.persist()` permission flow, browser-cache/service-worker
  clearing, cloud/sync/backend work, telemetry upload, or generic disk manager.
- No GameSnapshot v35, Dexie v6, save-envelope size field, dependency, gameplay,
  CPU, RNG, economy, history-system redesign, item-8 intent journal, new route,
  or generic Settings/Save Hub cleanup.
- No player-reachable or automatic archive compaction, no automatic prune, and no
  promise that a browser estimate or a
  maintenance action guarantees the next write will fit.

## Required evidence

- `docs/codex/runs/TRUST-STORAGE-PRESSURE-1/SOURCE_TRUTH.md`
- living `docs/codex/runs/TRUST-STORAGE-PRESSURE-1/PLAN.md`
- focused receipts for raw-row sizing, origin classification, pure diagnostics,
  shared Settings operation ownership, exact-save maintenance, failure stages,
  archive dispatch absence, Save Hub/Settings UI, and worker ownership
- an observed negative control that bypasses exact-save ownership or durable
  success, followed by exact restoration and green rerun
- production two-page/hard-reload and 375x667 proof
- adversarial review with zero actionable P0–P2 before closeout;
  `COMPLETION.md` is deferred to the mechanical closeout owner.
