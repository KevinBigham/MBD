# TRUST-AUTOSAVE-RECOVERY-1 — Autosave Failure Recovery and Export Fallback

## Objective

Complete roadmap item 3 by turning an active-dynasty IndexedDB write failure into a global, actionable recovery loop: surface an accessible toast, retry persistence automatically with bounded policy, and provide an export fallback from the exact retained failed snapshot when durable local storage still cannot recover.

This goal owns roadmap item 3 only. It extends the existing truthful `Save failed` + manual Retry contract; it does not implement checksums/self-repair, multi-tab locking, storage-pressure metering/pruning, write-ahead journaling, a save-schema migration, or gameplay mutation replay.

## Read first

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `PLANS.md`
- `DESIGN.md`
- `docs/codex/CANONICAL_DIRECTION.md`
- `docs/codex/RELEASE_GATES.md`
- `docs/codex/REVIEW_STANDARD.md`
- `docs/codex/goals/01_TRUST_A.md`
- `docs/codex/runs/TRUST-A/COMPLETION.md`
- `docs/codex/goals/13_TRUST_PLAYWRIGHT_1.md`
- `docs/codex/runs/TRUST-PLAYWRIGHT-1/COMPLETION.md`
- `docs/codex/goals/14_TRUST_SAVE_INDICATOR_1.md`
- `docs/codex/runs/TRUST-SAVE-INDICATOR-1/COMPLETION.md`
- live active-save coordinator, retained retry snapshot, failure classifier, export/import helpers, toast/notification primitives, save switching/deletion boundaries, and permanent browser proof

## Source-first checkpoint

Before production edits:

1. Record branch, commit, dirty state, pinned package manager, scripts, current save version, and baseline results.
2. Map the exact post-item-2 failure state: retained snapshot/job, desired and durable generations, save ID, failure kinds, manual Retry, status subscription, activation, deletion, replacement, and metadata-operation barriers.
3. Inventory every existing toast/notification implementation and select one global app-shell owner. Do not create a second persistence state machine or a route-local failure owner.
4. Define the bounded automatic retry policy from live timer/test seams: which storage failures are eligible, attempt count, delay/backoff, cancellation, and how a newer desired snapshot is handled. The policy must be deterministic under fake timers and must never loop forever.
5. Prove the export fallback can serialize the exact retained canonical snapshot without calling the worker export again. Decide whether browser download can be initiated safely or must remain an explicit user gesture; record the exact player contract in the plan.
6. Define quota, unavailable/private-browsing, transaction, export-generation, download, save-switch, delete, replacement, unmount/reload, and recovery-success behavior.
7. Map desktop and 375x667 placement, focus/action semantics, screen-reader announcements, and permanent Playwright failure injection/download proof.
8. Confirm v34 is sufficient. A required snapshot migration or rerun of a gameplay mutation is a stop condition.

## Required invariants

1. Automatic retry retries persistence only, using the exact retained failed canonical snapshot, save ID, slot/name, and logical generation. It never invokes the gameplay action and never re-exports mutable worker state.
2. Retry is bounded and observable. No infinite loop, hidden polling, unbounded timer, or retry storm is permitted. Tests control every delay deterministically.
3. An older scheduled retry may never overwrite a newer desired snapshot, write into a newly selected save, recreate a deleted/replaced save tree, or clear a newer failure. Activation/epoch/tombstone ownership from item 2 remains authoritative.
4. `Last saved` remains the prior durable time and `pending writes` remains nonzero until the retained latest snapshot is durably accepted. Scheduling or starting an automatic retry may not claim `Saved`.
5. The first durable success—automatic or manual—updates recency from the exact committed record, reaches the correct queue depth, cancels obsolete recovery work, and dismisses or resolves the failure toast truthfully.
6. Exhausted/terminal storage recovery produces an export fallback from the retained failed snapshot. The exported payload must pass the existing import parser and preserve canonical equality for that snapshot.
7. If browser security requires a user gesture, the toast exposes a clear `Download backup` action after retries are exhausted; it must not claim a file was downloaded before a download actually begins. If source proves a safe automatic download, the plan must still preserve a manual repeat-download action.
8. Export fallback is a safety copy, not save success. Creating or downloading it does not advance `Last saved`, reduce pending depth, remove Retry, or mark the local snapshot durable.
9. Quota, IndexedDB unavailable/private-browsing, transaction/storage, export-generation, and download failures retain honest, distinct evidence and next actions. A failed fallback must not erase the original local-save failure.
10. The failure/recovery toast is globally visible, keyboard operable, screen-reader announced once per meaningful transition, non-color-dependent, and non-occluding on desktop and 375x667 mobile.
11. A rejected/no-op gameplay action creates no retry timer, toast, fallback, pending generation, or download.
12. Wall-clock/timer values remain UI scheduling/save metadata only. No unseeded value enters simulation truth or deterministic event IDs.
13. Save schema remains v34. Existing old/deep saves, import/export, PWA, item-1 reload smoke, item-2 exact indicator, and CPU fairness remain intact.

## Player-facing states

At minimum, source inspection must implement and test these semantics:

- first eligible local-write failure: existing assertive `Save failed` status plus a global recovery toast that names the local-storage problem and says an automatic retry is scheduled/in progress;
- automatic retry in progress: local save remains pending and no false `Saved` appears;
- automatic recovery succeeds: exact durable time advances, pending depth reaches zero, and the toast resolves with concise recovered copy;
- automatic retries exhausted: original failure and manual Retry remain, while the toast exposes an export-backup action from the retained snapshot;
- export backup initiated: player receives an importable `.json` safety copy, while the shell continues to show the unresolved local-save failure and nonzero depth;
- fallback generation/download fails: original failure remains visible and fallback-specific error/action is announced without losing the retained snapshot;
- manual Retry after fallback succeeds: local durability becomes current and obsolete retry/fallback timers are canceled; the previously downloaded file remains merely a backup;
- active-save switch, deletion, or explicit replacement: old recovery timers/actions are invalidated and cannot target the new/removed save;
- no active save or no retained failed snapshot: no recovery toast or fabricated backup action.

## Architecture selection order

1. Extend the existing active-save persistence coordinator and status subscription with a bounded recovery phase/attempt contract; do not add a competing queue.
2. Reuse the coordinator's retained failed job as the sole retry/export source. Add a narrow read/export API only if source inspection proves the UI cannot safely request the fallback otherwise.
3. Reuse the existing canonical `exportSnapshotToJson()` / `importSnapshotFromJson()` contract and browser-download helper if one exists.
4. Reuse an existing global toast/notification primitive and shell owner. Add only the minimum action/state needed for recovery.
5. Keep failure classification and player copy pure/testable. Treat export fallback as unresolved durability, not a success state.
6. Extend the permanent Playwright trust proof with a deterministic browser storage failure, bounded retry exhaustion, fallback download/import validation, restored storage, manual or automatic recovery, and hard reload. Do not inject gameplay or save state directly.

## Proof

- focused coordinator tests for eligible/ineligible failures, bounded attempts/backoff, retained-snapshot reuse, no worker re-export, newer-generation ordering, cancellation on success/switch/delete/replacement, and manual Retry interop;
- focused export tests proving fallback JSON parses through the real import path and is canonically equal to the retained failed snapshot;
- focused global-toast tests for quota/private/unavailable copy, retry progress, recovered state, fallback action, fallback error, accessibility, deduplication, and dismissal/action behavior;
- existing TRUST-A failure/manual-Retry and item-2 recency/depth/order/tree-retirement suites remain green;
- permanent Chromium proof causes a real public gameplay mutation while IndexedDB save writes are unavailable, observes the truthful failure toast/status, proves bounded automatic retry behavior, downloads and parses the fallback, restores storage, reaches durable success without replaying the mutation, hard reloads, and proves the visible consequence survived;
- desktop and 375x667 browser proof shows the toast and existing save summary/actions remain visible and non-occluding;
- full root `typecheck`, `test`, `build`, `verify:determinism`, and permanent reload-smoke pass;
- no new bare `Math.random()` or simulation-truth wall clock/UUID;
- adversarial persistence, determinism, browser, and UX review finds no unresolved P0/P1.

## Scope cut line

No checksum or self-repair, multi-tab coordination, storage-size/quota estimation UI, archive-pruning offer, write-ahead journal, pending-day replay/rollback, service-worker persistence owner, cloud/backend upload, save schema migration, gameplay tuning, CPU advantage, worker decomposition, generic toast-system rewrite, new route, or private gameplay/save-state test backdoor. Classification and copy needed to distinguish an unavailable/private browser database from quota/transaction failures are in scope; broad storage-pressure guidance belongs to roadmap item 7.

## Stop conditions

Stop with evidence if:

- the exact failed snapshot is not durably retained in memory through the recovery loop;
- safe automatic retry would require rerunning gameplay or exporting a newer worker snapshot;
- the export fallback cannot use the canonical import/export contract without a schema change;
- browser download cannot be truthfully initiated or offered within the existing global shell without a broad notification rewrite;
- save-switch/delete/replacement ownership cannot invalidate scheduled retries;
- permanent failure proof would require injecting gameplay or persisted save state directly;
- live source contradicts the roadmap's promised retry/fallback semantics.

## Done

An active dynasty's failed local autosave produces a truthful, accessible global recovery toast; performs bounded persistence-only automatic retry; offers or creates a canonical importable backup from the exact retained failed snapshot when local writes remain unavailable; preserves manual Retry and item-2 recency/depth truth; cannot race save switching/deletion/replacement; works at desktop and 375x667; remains v34/deterministic/save-compatible; passes permanent browser proof and all repository gates; and is documented in `docs/codex/runs/TRUST-AUTOSAVE-RECOVERY-1/COMPLETION.md`.
