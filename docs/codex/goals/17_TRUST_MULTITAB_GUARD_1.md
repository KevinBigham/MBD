# TRUST-MULTITAB-GUARD-1 — One Live Editor per Save Tree

## Objective

Complete roadmap item 5 by allowing exactly one live browser document to load, mutate, and persist a root dynasty and any of its what-if branches at a time. A second tab targeting the same save tree must stop before worker import or gameplay mutation, explain that the dynasty is already open, and retry the ordinary verified load only after the owning document closes.

This goal owns roadmap item 5 only. It prevents valid-but-stale same-origin tab writes; it is not collaborative sync, read-only gameplay, forced takeover, cross-device coordination, a persistent lease system, every-schema export CI, storage-pressure UX, or a write-ahead gameplay journal.

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
- `docs/codex/goals/15_TRUST_AUTOSAVE_RECOVERY_1.md`
- `docs/codex/runs/TRUST-AUTOSAVE-RECOVERY-1/COMPLETION.md`
- `docs/codex/goals/16_TRUST_SAVE_INTEGRITY_1.md`
- `docs/codex/runs/TRUST-SAVE-INTEGRITY-1/COMPLETION.md`
- the current [Web Locks specification](https://www.w3.org/TR/web-locks/)
- live boot/setup/settings activation paths, worker mutation proxy, active-save coordinator, save-tree writes/recovery, shared resume pointer, and Playwright helpers

## Source-first checkpoint

Before production edits:

1. Record branch, commit, dirty state, package/runtime, exact scripts, current `GameSnapshot` version, IndexedDB version/stores, and baseline results.
2. Inventory every route that loads or activates a root/branch, creates a new dynasty, imports/replaces/deletes a root, creates/deletes a branch, restores integrity, retries persistence, or clears all saves.
3. Prove the current ordered-write maps and active coordinator are document-local and demonstrate the valid-stale-write race that checksums cannot detect.
4. Define the lock resource from trusted topology. A root, its branches, and sibling branches must share `mbd-save-tree-v1:<root-save-id>`; different root slots must not block one another.
5. Define acquisition, candidate activation, failed-switch rollback, same-tree reentrancy, current-owner release, document termination, reload, background/BFCache behavior, and all-five-slot exclusion for Clear All.
6. Map mutation prevention before worker mutation as well as storage defense. A write-only check is too late because gameplay handlers mutate the worker before autosave.
7. Define unsupported/insecure Web Locks behavior, request rejection, contention, and explicit `Check again` semantics. No BroadcastChannel/localStorage advisory may become authority.
8. Map the shared `activeSaveId` localStorage behavior. A contender must not clear or rewrite the owner's global resume pointer merely to dismiss the conflict.
9. Define a separate two-page Chromium proof using the same origin/context, real IndexedDB, exact integrity pairs, background ownership, owner close, fresh takeover load, mutation, and hard reload.
10. Confirm v34 and Dexie v5 remain sufficient. If safety requires a gameplay-save migration, persistent lease store, `steal`, or mutation audit too broad for one slice, stop.

## Required invariants

1. Web Locks is the sole cross-document authority. Each active root save tree holds one long-lived exclusive lock named `mbd-save-tree-v1:<root-save-id>` until a safe same-tab switch releases it or the owning document terminates.
2. Root, branch, and sibling-branch loads and metadata mutations contend on the same root lock. Different root slots may be edited concurrently.
3. A contender never imports a snapshot into the worker, initializes gameplay, invokes a gameplay mutation, captures an autosave, retries persistence, repairs/deletes/replaces the tree, or claims `Saving`/`Saved`.
4. Boot or explicit load resolves root ownership from trusted save-tree topology, acquires a candidate lock, then freshly re-reads and verifies the target record under that lock before worker import. The pre-lock discovery record cannot become gameplay state.
5. A same-tab switch keeps the outgoing lock and coordinator authoritative while attempting a distinct candidate lock. Contention or load/import failure releases only the candidate and preserves the outgoing editor; success activates the exact freshly loaded target before releasing the old lock.
6. Creating a new dynasty acquires its target root lock before `newGame`, worker replacement, or storage replacement. Failure cannot leave a mutated unsaved worker or release an unrelated active tree.
7. Active snapshot writes, manual/automatic retries, root overwrite/import/delete, branch create/delete, integrity restore/recovery Delete, and Clear All have central ownership assertions at their mutation/storage boundaries. Clear All acquires all five root locks in stable slot order or performs no deletion.
8. No cooperative release occurs while a snapshot capture, accepted write, metadata transaction, or retained retry is unresolved. There is no UI release/takeover path in this slice; closing or reloading the owner lets the browser terminate its lock.
9. Hidden, backgrounded, frozen, or BFCache documents retain ownership. `visibilitychange`, `pagehide`, timer silence, and wall-clock age never release or expire a lock.
10. There is no `steal`, lease expiry, heartbeat, polling timer, random actor ID, persisted lock row, localStorage compare-and-swap, or BroadcastChannel election. `navigator.locks.query()` may not authorize behavior.
11. If Web Locks is absent, the context is insecure, or acquisition rejects, gameplay activation and tree mutation fail closed with distinct honest copy. Unsupported coordination is not mislabeled as corruption or a save-write failure.
12. A contention screen is blocking and non-dismissible, names the dynasty/slot when safely known, explains why this tab is locked, and offers `Check again`. It does not offer a fake close button, forced takeover, or navigable pseudo-read-only game.
13. `Check again` while the owner remains open stays blocked and leaves the exact primary/shadow pair unchanged. After owner termination it reacquires, reruns normal safe load/import/activation, and shows the latest durable owner state rather than a stale contender snapshot.
14. Conflict handling never clears or rewrites the shared persisted active-save pointer. Same-tab activation may update the ordinary pointer only after ownership and verified import succeed.
15. A per-document `sessionStorage` active-target hint overrides the shared localStorage last-opened fallback on reload, so two tabs editing different root slots keep their own targets. A duplicated tab may inherit that hint and must still contend; the hint is never lock authority.
16. Item-2 recency/depth, item-3 retry/fallback, and item-4 integrity semantics remain truthful. An ownership conflict creates no pending generation, retry episode, backup download, recovery toast, checksum rewrite, or false save failure.
17. Current, old, and deep saves remain byte-compatible. `CURRENT_GAME_SNAPSHOT_VERSION` stays 34; Dexie remains v5; locks and UI state are ephemeral and never enter `SaveData`, integrity projection, canonical export, simulation truth, or event IDs.
18. An already-running pre-item-5 build cannot be fenced by new code it does not contain. Player copy/release notes must require old tabs to reload/close and must not claim protection against those mixed-version writers.
19. No seeded RNG, simulation result, CPU choice, ratings, budget, scouting truth, or gameplay policy changes.

## Player-facing states

At minimum, implement and prove:

- first editor: verified load/import proceeds normally and the lock is invisible;
- same root in a second tab: a blocking `Dynasty already open` experience appears before gameplay, names the target when possible, and keeps public mutation controls unreachable;
- same root branch/sibling: conflicts exactly like the root because the whole tree shares ownership;
- different root slot: may open independently and does not affect the first editor or its save status;
- retry while occupied: enters a bounded busy state, remains locked, announces the result, and writes nothing;
- owner backgrounded: remains authoritative while the contender stays blocked;
- owner closed/reloaded: browser release permits explicit retry; the contender freshly loads the latest durable state, becomes the editor, mutates, saves, and hard-reloads successfully;
- unsupported/insecure/rejected API: distinct fail-closed guidance with no simulated takeover or save-recovery claim;
- switch/new-game/import/delete/repair/Clear All contention: operation is rejected before worker/storage mutation with actionable slot-specific copy;
- desktop and 375x667: title, explanation, status, and `Check again` remain reachable, focused, readable, and non-occluding.

## Architecture selection order

1. Add one small web-local session-ownership coordinator around `navigator.locks.request(..., { mode: 'exclusive', ifAvailable: true })`. Hold the granted callback open with an explicit local release promise; do not add a dependency.
2. Add the narrowest trusted save-tree-root resolver to the existing save system. Root ID convention and verified primary/shadow topology outrank unverified branch metadata.
3. Add a small sessionStorage active-target override to the existing game-store persistence contract; retain localStorage only as the last-opened fallback for a new tab.
4. Integrate candidate acquisition/commit/abort with boot, setup, settings, and recovery before worker import or destructive action. Reuse the existing active-save quiescence/barrier owner for safe same-tab transitions.
5. Add central active-session assertions to the worker mutation proxy and save/persistence boundaries so a stale closure or missed UI disable cannot mutate or write.
6. Reuse the existing shell visual language and focus utilities for one blocking conflict surface. Keep ownership conflict separate from save corruption and autosave-failure recovery.
7. Add a dedicated permanent serial Playwright file for two real pages. Do not add a production E2E bypass, snapshot injection hook, heartbeat wait, or fixed-clock lease.

## Proof

- coordinator tests: same-tree contention, root/branch aliasing, distinct roots, same-tab reentrancy, candidate commit/abort, old-owner preservation on failed switch, browser release, request rejection, unavailable API, StrictMode/idempotency, deterministic all-slot acquisition/release, and cleanup;
- topology tests: current root/branch, valid shadow after primary corruption/missing primary, trusted-parent discovery, unknown/orphan fail-closed, and no schema/write side effect;
- worker/persistence tests: no mutation or export without ownership; ownership checked again after delayed export and before write; automatic/manual retry, metadata operation, replacement, repair, branch mutation, delete, and Clear All cannot cross a foreign root claim; no false status or partial mutation;
- boot tests: acquire before fresh safe load/import, denied tab never imports/activates or clears the shared pointer, Retry re-enters ordinary load, and load/import failure releases only the candidate;
- setup/settings/recovery tests: new game before `newGame`, root/branch load, inactive overwrite/import/delete, branch create/delete, repair/Delete, distinct-slot success, exact conflict copy, and outgoing editor preservation;
- conflict component tests: labeled/assertive semantics, initial focus, keyboard operation, non-dismissible Escape/backdrop behavior, polite busy/result status, disabled duplicate action, error copy, and bounded 375x667 layout;
- permanent Chromium proof: public slot creation, exact primary/shadow capture, same-origin duplicate tab conflict before gameplay, keyboard/mobile proof, owner background mutation and durable pair change, contender still blocked, owner close, explicit acquisition, latest-state load, public contender mutation, exact pair change, and hard reload survival;
- full root typecheck, tests, production/PWA build, deterministic verification, and both permanent Playwright trust specs pass;
- source scan proves no lock state in snapshot/export/integrity material, no `steal`, no heartbeat/TTL, and no added unseeded simulation truth;
- adversarial persistence/race, compatibility/determinism/scope, and browser/UX review finds no unresolved P0/P1.

## Scope cut line

No forced takeover or Web Locks `steal`, heartbeat/TTL lease, persistent lock/fencing schema, BroadcastChannel/localStorage election, cross-origin/device sync, collaborative merge, navigable read-only dynasty, cloud/backend authority, service-worker mutation ownership, previous-generation rollback, every-schema export matrix, quota/save-size/archive UX, write-ahead intent journal, pending-day replay/rollback, snapshot v35 or Dexie v6, gameplay/CPU/RNG change, broad worker decomposition, generic recovery rewrite, or guarantee against already-running pre-guard builds.

## Stop conditions

Stop with evidence if:

- root/branch topology cannot map every playable or recoverable record to one stable root resource without trusting corrupt metadata;
- any gameplay mutation can occur before ownership or any accepted write/retry can finish after ownership is safely released;
- a same-tab switch must drop the old editor before the candidate is known safe;
- Clear All or a destructive recovery path cannot be fenced without a persistent lease/schema or broad save-engine rewrite;
- supported production/PWA Chromium cannot hold and automatically release the lock across real pages, reload, close, and backgrounding;
- unsupported coordination cannot fail closed without making ordinary save recovery destructive;
- browser proof would require a production mutation/snapshot bypass;
- v34, Dexie v5, or deterministic simulation truth must change.

## Done

Exactly one browser document can edit a root dynasty tree at a time; root and branches share one exclusive browser-owned lock; a contender is blocked before worker import/mutation and cannot write, retry, repair, delete, replace, or clear the tree; backgrounding does not surrender authority; closing the owner lets explicit Retry freshly load the latest durable state; distinct slots remain independent; unsupported coordination fails closed; active-save recency/retry/integrity behavior remains truthful; current/old/deep saves remain v34/Dexie-v5 compatible; two-page desktop/mobile hard-reload proof and all repository gates pass; and the slice is documented in `docs/codex/runs/TRUST-MULTITAB-GUARD-1/COMPLETION.md`.
