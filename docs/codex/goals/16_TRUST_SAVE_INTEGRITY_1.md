# TRUST-SAVE-INTEGRITY-1 — Save Integrity Checksums and Guided Verified Repair

## Objective

Complete roadmap item 4 by sealing every newly written local save record with a deterministic integrity checksum, verifying that seal before any snapshot is consumed, and guiding the player through an explicit restore from one independently verified same-generation shadow copy when the primary record is damaged.

This goal owns roadmap item 4 only. It detects and repairs accidental local-record corruption; it is not authentication, malicious-tamper protection, multi-tab conflict prevention, every-schema export CI, storage-pressure UX, a previous-generation rollback system, or a write-ahead gameplay journal.

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
- live save envelope, Dexie schema/transactions, root/branch write and delete seams, safe-load consumers, recovery dialog/provider, active-save barriers, old/deep-save fixtures, and permanent Chromium journey

## Source-first checkpoint

Before production edits:

1. Record branch, commit, dirty state, package/runtime, exact scripts, current `GameSnapshot` version, IndexedDB version/stores, and baseline results.
2. Inventory every primary `SaveData` write, snapshot-consuming read, root/branch transaction, deletion/replacement cascade, import/export path, and active-save coordinator metadata read.
3. Define a versioned protected projection that binds the snapshot to save identity, slot/tree ownership, branch metadata, visible recency, and legacy payload fields while excluding only the recursive integrity field.
4. Define canonical JSON and SHA-256 behavior, runtime-unavailable behavior, malformed/unsupported seals, and deterministic tests. Hashing must finish before opening a Dexie transaction.
5. Prove an honest repair source exists. A checksum alone cannot reconstruct original data, and recomputing a seal over a suspect row is not repair.
6. Define one bounded same-generation shadow per save ID, atomic primary/shadow/leaderboard semantics, root/branch tree cleanup, and exact repair time/identity behavior.
7. Define checksumless old-save compatibility without silently backfilling on load. Distinguish a genuinely legacy row from a newly protected row whose seal disappeared by checking for its shadow.
8. Map the existing Save Recovery dialog to raw evidence export, Retry, Delete, and a conditional explicit verified-restore action, including keyboard/mobile behavior and repair failure.
9. Define a real-browser low-level primary-row corruption, hard-reload refusal, raw export, explicit restore, normal retry/load, and second hard-reload proof without injecting gameplay state.
10. Confirm `GameSnapshot` v34 remains sufficient. If the only honest repair requires a gameplay-schema migration or unbounded history, stop.

## Required invariants

1. The protected material is a fixed version-1 projection of the complete persisted save envelope: ID, slot, name, season/day/phase, snapshot version/presence/payload, legacy/deprecated payload, created/updated timestamps, root/parent ownership, and branch metadata. Only the integrity envelope itself is excluded.
2. Canonicalization recursively sorts object keys, preserves array order, UTF-8 encodes the result, and rejects unsupported or non-JSON values. The digest is SHA-256 with explicit algorithm/projection version metadata.
3. Integrity is calculated after final root branch-metadata merge/clear and all other record shaping. The checksum always describes the exact record passed to IndexedDB.
4. Every accepted current write atomically commits the exact sealed primary, one identical same-generation shadow, and the derived leaderboard row where applicable. Shadow failure rolls back the primary and leaderboard; no false `Saved` is allowed.
5. Root/branch creation, parent metadata updates, autosave, manual save, import/replacement, legacy writes, and guided repair cannot bypass integrity ownership or ordered writes.
6. A sealed existing primary is verified before its snapshot or metadata can influence a new write. A corrupt primary is never silently normalized, overwritten, promoted, or resealed; its verified shadow remains intact.
7. `loadSaveSafely()` verifies a present seal before schema/version/migration parsing. A mismatch, malformed seal, unsupported seal version/algorithm, or missing seal when a shadow exists yields a distinct integrity failure and never reaches worker import.
8. A checksumless record with no shadow remains a compatible unverified old save. Load does not mutate it or advance `updatedAt`; its next successful explicit write creates both seal and shadow. Representative current, v17, and deep Season-10 v33 records must remain safe.
9. Any path that consumes a stored snapshot for gameplay, worker import, branch continuation/comparison, or write metadata uses a verified record. Listing-only metadata may identify a damaged row but cannot make it playable.
10. Repair is never automatic. `Restore verified copy` appears only when the independent shadow verifies at read time. At click time it is reverified and storage state is rechecked behind the save-tree/write barrier before exact restoration.
11. Repair restores the shadow's exact save ID, tree metadata, snapshot, checksum, and original `updatedAt`; it rebuilds the root leaderboard atomically, does not replay gameplay, and then retries the ordinary safe-load/import/activation path.
12. If the primary or shadow changes between inspection and restore, the shadow is missing/corrupt, Web Crypto is unavailable, or the repair transaction fails, repair makes no partial change and the dialog keeps raw export, Retry, and Delete available with honest evidence.
13. Root delete/replacement removes root/child shadows in the same transaction as primary rows; branch delete removes its shadow while updating the parent's primary and shadow; Clear All removes all integrity rows.
14. Canonical snapshot export/import remains unchanged and snapshot-only. A raw recovery export is evidence, not a verified canonical backup; importing a canonical snapshot into a slot creates a fresh ID-bound seal and shadow.
15. Item-2 recency remains truthful through failure and repair. A restored older timestamp is shown exactly; neither integrity inspection nor raw export claims a durable write.
16. Integrity protects against independent accidental corruption only. UI/docs must not imply protection from a malicious writer that can recompute SHA-256, whole-origin loss, simulation bugs, valid stale multi-tab writes, or interrupted gameplay intent.
17. Exactly one full shadow exists per save ID. Storage metering/pruning is deferred to item 7; no unbounded backup history is permitted.
18. `CURRENT_GAME_SNAPSHOT_VERSION` remains 34. No seeded RNG, simulation truth, event ID, CPU decision, ratings, budget, scouting, or gameplay behavior changes.

## Player-facing states

At minimum, implement and prove:

- verified primary: load continues normally with no new modal or optimistic status;
- checksumless old save with no shadow: load remains compatible and unchanged, then its next durable write establishes protection;
- primary integrity mismatch with valid shadow: worker import is blocked and Save Recovery explains that local data changed after sealing, names the verified copy time, and offers `Restore verified copy`;
- explicit restore: controls enter a busy state, exact verified data is restored, ordinary safe load retries, and the player resumes the same dynasty without replaying a mutation;
- missing/corrupt/stale shadow or unavailable verifier: no restore action or false repair claim; raw export, details, Retry, and Delete remain;
- failed restore transaction: primary and shadow remain unchanged, the dialog stays open, and an accessible action error explains that nothing was replaced;
- root and what-if branch corruption: each is isolated to its exact save ID; the other rows remain readable and no tree metadata is fabricated;
- desktop and 375x667: title, explanation, raw export, restore, Retry, Delete, details, close, and status remain reachable, focusable, and non-occluding.

## Architecture selection order

1. Keep integrity in the web-local `SaveData` envelope and an additive Dexie v5 shadow store; do not add integrity to `GameSnapshot` v34.
2. Add one small pure canonicalization/SHA-256 module with no production dependency. Use Web Crypto and expose explicit unavailable evidence rather than falling back to a different algorithm.
3. Extend the central ordered `saveGameById()`/root-branch transaction boundary so every accepted write creates the exact primary/shadow pair.
4. Extend `loadSaveSafely()` and add the narrowest verified-record/restore APIs needed by existing consumers. Do not create a second save queue.
5. Reuse the active-save tree barrier for repair and the existing Save Recovery provider/dialog for guidance. Do not add a route or silently repair during boot.
6. Extend the permanent serial Playwright trust journey with a low-level IndexedDB primary-seal mutation, not a gameplay/save-state injection hook.

## Proof

- canonicalization/checksum tests: known SHA-256 vector, recursively reordered keys, array-order sensitivity, every protected envelope field, malformed/non-JSON rejection, unavailable runtime, and algorithm/version validation;
- real IndexedDB tests: root and branch primary/shadow equality, final shaped snapshot checksum, root/leaderboard/shadow rollback, atomic branch parent/child shadows, ordered writes, replacement/delete/tree cleanup, Clear All, and no partial repair;
- safe-load tests: matching seal, one-field snapshot and metadata tamper, checksum tamper, malformed/unsupported/missing-with-shadow seal, valid checksumless current/old/deep saves, independent bad shadow, and failure precedence;
- repair tests: exact verified restore/time/identity, root leaderboard rebuild, branch isolation, TOCTOU abort, corrupt/missing shadow, no mutation on failure, and normal safe-load success afterward;
- canonical import/export remains snapshot-only and saving an import establishes local integrity;
- active coordinator, onboarding, boot, setup root/branch, settings, and worker branch comparison consume verified records without weakening item-2/item-3 ordering/retry behavior;
- recovery reducer/provider/dialog tests cover integrity copy, conditional restore, busy/failed/success states, action errors, raw evidence, focus/keyboard semantics, and mobile scroll bounds;
- permanent Chromium proof creates state through public controls, mutates only the real stored primary seal, hard reloads into recovery before worker import, downloads raw evidence, explicitly restores the verified shadow, resumes the exact visible state, hard reloads cleanly, and continues the original trust lanes;
- full root typecheck, tests, production/PWA build, deterministic verification, and permanent reload-smoke pass;
- changed production source adds no unseeded randomness or simulation-truth wall clock/UUID;
- adversarial persistence, integrity, compatibility/determinism, and browser/UX review finds no unresolved P0/P1.

## Scope cut line

No keyed signature/authentication, malicious-tamper defense, encryption, server/cloud backup, previous-generation history, cross-device sync, multi-tab guard/lock, every-schema export matrix, quota estimation, save-size UI, archive pruning, write-ahead intent journal, pending-day replay/rollback, service-worker persistence ownership, snapshot v35 migration, gameplay/CPU/RNG change, generic recovery rewrite, new route, or private production test backdoor.

## Stop conditions

Stop with evidence if:

- an exact same-generation independent repair source cannot be committed atomically with the primary;
- hashing must await inside a live Dexie transaction or cannot run in the supported production/test runtimes;
- any snapshot-consuming gameplay path must remain checksum-blind;
- a corrupt primary can be silently overwritten/resealed by an existing write lane;
- old checksumless saves cannot be distinguished safely from protected rows whose seal disappeared;
- restore cannot reverify and recheck state without racing autosave, replacement, switch, or deletion;
- one bounded shadow breaches measured save-I/O or browser-storage viability and fixing it would require item-7 UX;
- honest repair requires a `GameSnapshot` schema bump or unbounded backup history;
- permanent browser proof would require injecting gameplay or persisted snapshot state through a production hook.

## Done

Every newly written root and branch save has a deterministic full-envelope SHA-256 seal and one atomic same-generation shadow; every gameplay/snapshot load verifies before use; old checksumless saves remain compatible; independent primary corruption blocks worker import and enters an accessible guided recovery flow; explicit restoration re-verifies and atomically restores the exact shadow/time before ordinary load; failures never reseal suspect data or claim success; tree deletion/replacement and ordered persistence remain safe; desktop/mobile hard-reload proof and all repository gates pass; v34/determinism/CPU fairness remain unchanged; and the slice is documented in `docs/codex/runs/TRUST-SAVE-INTEGRITY-1/COMPLETION.md`.
