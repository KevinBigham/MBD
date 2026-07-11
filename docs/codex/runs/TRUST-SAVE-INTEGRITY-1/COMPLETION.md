# TRUST-SAVE-INTEGRITY-1 Completion

Status: complete and review-ready. No goal stop condition remains. No unresolved P0–P3 finding remains.

Completed: 2026-07-11 07:27 CDT

## Outcome

Roadmap item 4 now protects each current local dynasty write with one deterministic full-envelope SHA-256 seal and one exact same-generation shadow:

`final shaped record -> seal -> atomic primary + shadow + leaderboard -> verify before use`

If the primary changes independently, MBD stops before version migration, schema parsing, worker import, branch continuation, or write-metadata reuse. The existing Save Recovery dialog explains the integrity boundary, preserves raw evidence, and offers `Restore verified copy` only while the independently checked same-generation shadow is eligible. Clicking Restore re-verifies both rows, crosses the active save-tree barrier, race-checks exact storage state, atomically restores the original record/time/leaderboard, and then invokes the caller's ordinary safe-load/import/activation path. It never replays gameplay or advances recency.

Integrity lives in the web-local `SaveData` envelope and additive Dexie v5 `saveIntegrityBackups` store. `GameSnapshot` remains v34. Existing checksumless v34, v17, and deep Season-10 v33 saves remain byte-identical on read and become protected only on their next explicit successful write. Canonical snapshot export/import remains snapshot-only; saving an import establishes a fresh ID-bound local pair.

Root/branch creation, mutation, replacement, deletion, listing, legacy repair, autosave, manual save, and guided restore share the ordered persistence boundary. Damaged topology cannot hide a root/branch from recovery or consume the branch cap. A referenced child is never deleted while its parent cannot be verified/resealed, preventing ghost branch history. Root deletion can still clean an exact primary/shadow tree when SHA verification is unavailable, using byte-equivalent copies as deletion metadata only—never as playable or repairable data.

The recovery dialog is keyboard operable and mobile bounded. Busy work is politely announced; focus remains trapped when every action is disabled; explanation/details are associated; failed click-time revalidation removes the Restore claim; failed restore and successful-restore/failed-load states use distinct evidence. Successful boot recovery returns the player to the protected route that was open before the failure redirected to the Save Hub.

No simulation, CPU policy, dependency, route table, save schema, seeded RNG, or gameplay contract changed.

## Requirement Mapping

| Goal requirement | Result and evidence |
|---|---|
| Fixed full-envelope projection | `saveIntegrity.ts` protects ID, slot, visible metadata, snapshot/version/presence, legacy fields, timestamps, root/parent identity, and branch metadata while excluding only integrity. Field-sensitivity and missing-field tests cover the contract. |
| Deterministic canonical SHA-256 | Recursive key sorting, ordered arrays, strict JSON values, UTF-8, SHA-256, and explicit version/algorithm/projection metadata are covered by 48 pure tests. Unavailable Web Crypto fails explicitly with no fallback dependency. |
| Seal after final shaping | The ordered writer merges/clears root branch metadata first, then seals the exact object passed to IndexedDB. Tests recompute and verify final root/branch records. |
| Atomic primary/shadow/leaderboard | Dexie v5 transactions include both record copies and the derived leaderboard. Forced shadow, leaderboard, branch-child shadow, and repair failures prove rollback of every row. |
| No write bypass | Root/manual/autosave/import/replacement, parent/child branch changes, legacy repair, and guided restore use the central ordered writer/transaction seams. Legacy repair is queued before its first read. |
| Verify existing primary before writes | `readVerifiedStoredSave()` gates write metadata. Corrupt and missing protected primaries cannot be overwritten/resealed; verified shadows remain evidence. |
| Verify before parse/import | `loadSaveSafely()` reports mismatch, malformed, unsupported, unavailable, and missing integrity before schema/version/migration parsing. Boot, Setup root/branch, Settings, active persistence, onboarding, and worker branch comparison consume verified records. |
| Checksumless compatibility | Real IndexedDB tests load current v34, v17, and Season-10 v33 rows without mutation/backfill, then explicitly write and verify exact primary/shadow pairs. |
| Stable recovery discoverability | Fixed root IDs plus trusted root/child/shadow topology keep corrupt `slotNumber`, `isRootSave`, `parentSaveId`, and missing-primary saves visible by exact ID while safe load still fails closed. |
| Explicit same-generation repair | Repair appears only for eligible integrity failures. Stored expected/recomputed checksums reject prior-generation shadows while permitting checksum-only, payload, and required-field-loss damage from the matching generation. |
| Restore race/failure safety | Shadow verification, exact canonical preconditions, ordered barriers, in-transaction recheck, TOCTOU mutation, missing/bad shadow, and forced write failures leave primary/shadow/leaderboard unchanged on failure. |
| Exact state/time/tree restoration | Root restore rebuilds the exact leaderboard/time; branch restore changes only the exact branch and leaves root pair/leaderboard byte-identical. No mutation is replayed. |
| Honest raw evidence | Raw recovery download serializes the observed primary, including its damaged checksum. It is distinct from canonical snapshot export and never changes `Saved`, pending depth, or `updatedAt`. |
| Tree lifecycle safety | Root replace/delete and Clear All remove bounded shadows atomically. Branch delete updates parent primary/shadow atomically or refuses while a referenced parent needs recovery; trusted cap counting ignores damaged indexes. |
| Active coordinator truth | Repair preserves untouched child coordinators, exact cleanup without parent mutation does not claim a new active-root generation, and barriers invalidate delayed captures before replace/delete/restore. |
| Accessible guided UI | Conditional action, busy/error states, raw export, Retry/Delete/details/close, aria associations/live status, focus trap, Escape behavior, and desktop/mobile scroll bounds are covered by reducer/provider/dialog tests and Chromium. |
| Bounded storage | Exactly one full shadow is stored per save ID. v5 migration creates an empty store and never backfills; storage metering/pruning stays item 7. |
| Compatibility/determinism/fairness | Snapshot v34, contracts, RNG streams, CPU decisions, ratings, budgets, scouting truth, manifests, and lockfile are unchanged. Full gates and deterministic verification are recorded below. |

## Changed Files

Integrity and persistence:

- `apps/web/src/shared/lib/saveIntegrity.ts`
- `apps/web/src/shared/lib/saveIntegrity.test.ts`
- `apps/web/src/shared/lib/saveSystem.ts`
- `apps/web/src/shared/lib/saveSystem.test.ts`
- `apps/web/src/shared/lib/saveSystem.integrity.test.ts`
- `apps/web/src/shared/lib/activeSavePersistence.ts`
- `apps/web/src/shared/lib/activeSavePersistence.test.ts`

Verified consumers and recovery UI:

- `apps/web/src/app/boot/AppBootGate.tsx`
- `apps/web/src/app/boot/AppBootGate.test.tsx`
- `apps/web/src/features/setup/hooks/useSetupActionHandlers.ts`
- `apps/web/src/features/setup/hooks/useSetupActionHandlers.test.tsx`
- `apps/web/src/features/setup/routes/SetupPage.test.tsx`
- `apps/web/src/features/settings/hooks/useSettingsSaveData.ts`
- `apps/web/src/features/settings/hooks/useSettingsSaveData.test.tsx`
- `apps/web/src/features/save-recovery/reducer.ts`
- `apps/web/src/features/save-recovery/__tests__/reducer.test.ts`
- `apps/web/src/features/save-recovery/SaveRecoveryProvider.tsx`
- `apps/web/src/features/save-recovery/__tests__/SaveRecoveryProvider.test.tsx`
- `apps/web/src/features/save-recovery/SaveRecoveryDialog.tsx`
- `apps/web/src/features/save-recovery/__tests__/SaveRecoveryDialog.test.tsx`
- `apps/web/src/shared/hooks/useFocusTrap.ts`

Permanent browser proof:

- `apps/web/e2e/helpers/dynasty.ts`
- `apps/web/e2e/reload-smoke.spec.ts`

Goal and run evidence:

- `docs/codex/goals/16_TRUST_SAVE_INTEGRITY_1.md`
- `docs/codex/runs/TRUST-SAVE-INTEGRITY-1/SOURCE_TRUTH.md`
- `docs/codex/runs/TRUST-SAVE-INTEGRITY-1/PLAN.md`
- `docs/codex/runs/TRUST-SAVE-INTEGRITY-1/COMPLETION.md`

No package manifest, lockfile, contracts schema/migration, sim-core file, or production dependency changed.

## Verification

| Command/check | Observed result |
|---|---|
| Fresh full-web baseline | 441 files passed / 1 skipped; 1,608 tests passed / 2 skipped before production edits. |
| Focused integrity/persistence/recovery/consumer suite | 12 files / 213 tests passed; includes 44 real-IDB integrity tests, 48 pure integrity tests, 36 coordinator tests, transaction, recovery, boot, Setup, and Settings coverage. |
| Web source TypeScript | Passed. |
| E2E TypeScript | Passed. |
| `pnpm typecheck` | 9/9 workspace tasks successful; the fresh web task ran source and E2E TypeScript. |
| `pnpm test` | 8/8 workspace tasks successful in 3m5.133s. Web: 443 files passed / 1 skipped; 1,718 tests passed / 2 skipped in 184.40s. |
| `pnpm build` | 5/5 workspace tasks successful. Web transformed 3,014 modules in 4.66s; PWA generated 157 precache entries. |
| `pnpm verify:determinism` | 1 file / 3 tests passed in 1.70s. |
| `pnpm e2e:reload-smoke` | Fresh production build and 1/1 Chromium journey passed in 3.8 minutes. Build transformed 3,014 modules and generated 157 PWA precache entries. |
| Desktop integrity recovery inspection | 1280x720: full explanation and Export/Delete/Details/Retry/Restore/Close controls are readable, separated, focusable, and non-occluding. |
| Mobile integrity recovery inspection | 375x667: bounded panel preserves readable explanation and top actions; remaining actions are reachable through the asserted internal scroll boundary and trial interactions. |
| Autosave/final desktop-mobile inspection | Four retained item-3/final images remain readable and non-overlapping; desktop and mobile draft/shell controls remain usable after the second hard reload. |
| Changed-source randomness scan | No added `Math.random()`, UUID, or simulation-truth clock use. Existing branch-ID UUID/wall-clock code is unchanged. |
| Save/version/dependency inspection | `CURRENT_GAME_SNAPSHOT_VERSION` remains 34; no schema, manifest, dependency, lockfile, gameplay, or CPU-policy diff. |
| `git diff --check` | Passed. |
| Generated-artifact check | Six attached browser images were visually inspected; Playwright output and production `dist` remain ignored/untracked. |

Diagnostic browser iterations were not counted as passes. They exposed route loss after successful boot repair and late pending Press Conference overlays in the long serial harness. Product route restoration and overlay settlement were corrected at their owning seams before the final rerun.

The final full web run emitted only established chart-sizing, React `act`, and intentional service-worker failure-test warnings; no test failed.

## Browser Proof

The permanent serial production-preview journey continues to create gameplay only through public controls. For integrity it:

1. finishes a real development-plan mutation and its item-3 bounded save-recovery episode;
2. reads the real v5 primary/shadow checksum and exact durable time;
3. mutates only the primary checksum through a low-level IndexedDB transaction;
4. hard reloads and requires Save Recovery before worker import;
5. verifies honest accidental-corruption/same-generation/non-security copy and the conditional Restore action;
6. keyboard-activates raw evidence export, parses the real download, and confirms the damaged checksum, exact timestamp, player ID, and development consequence;
7. proves every action is reachable at 1280x720 and 375x667, with bounded panel geometry and attached screenshots;
8. keyboard-activates `Restore verified copy`;
9. requires the original protected route, durable summary, exact pre-dismissal primary/shadow pair, timestamp, and player consequence;
10. hard reloads again and requires the same exact state; and
11. continues the trade, press, and draft mutation/reload lanes.

The helper never injects gameplay or snapshot state. The only new mutation is the exact primary integrity checksum under test.

## Adversarial Review

Independent read-only persistence, compatibility/scope, and UX/browser reviews challenged the final source and focused proof. Fixed findings included:

- prior-generation shadow association and checksum-only/snapshot/field-loss matching;
- stale discovered-parent overwrite and implicit corrupt-parent promotion;
- raw wrong-root index trust, hidden damaged listings, and branch-cap poisoning;
- missing-primary overwrite/repair and unavailable-verifier tree cleanup;
- exact-delete ghost branches and no-crypto lost-parent deletion;
- restore TOCTOU, partial-write rollback, active sibling tombstoning, and legacy repair ordering;
- exact recovery deletion identity and truthful partial/no-mutation coordinator states;
- click-time invalid repair claims and failed-delete evidence;
- busy focus escape, missing live/description/details semantics, and stale repair details;
- post-repair route loss and late restored press-overlay harness races; and
- safe v5 rollback/re-upgrade behavior.

Final persistence review: `MERGE_READY`, no unresolved P0–P3. Final compatibility/determinism/scope review: `MERGE_READY`, no unresolved P0–P3. Final UX/browser review: `MERGE_READY`, no unresolved P0–P3.

## Compatibility, Risks, and Rollback

Compatibility:

- Snapshot schema remains v34. Dexie v5 adds only `saveIntegrityBackups`; a real v4→v5 upgrade preserves primary and leaderboard bytes/times and creates an empty shadow store.
- Old/deep saves remain unmodified until explicit write. Canonical export/import remains snapshot-only.
- Valid protected rows load normally. Listing may use verified shadow/topology metadata only to keep an exact ID discoverable; gameplay still passes through primary verification.
- Integrity detects independent accidental local corruption. It does not authenticate a malicious writer, recover whole-origin loss, resolve valid stale multi-tab writes, or prove simulation correctness.

Residual risks and adjacent work:

- One shadow approximately doubles local save-record storage. Quota metering, warnings, pruning, and archive policy remain roadmap item 7.
- A same-generation shadow is not history. Previous-generation rollback and write-ahead gameplay intent remain out of scope.
- Web Crypto unavailable state blocks gameplay verification/repair. Exact-copy metadata is used only to make deletion barriers safe.
- Multi-tab locking, every-version export CI, service-worker ownership, cloud backup, and keyed authentication remain their own roadmap items.

Rollback:

1. Preferred rollback keeps the Dexie v5 store declaration plus paired seal/shadow writer as a compatibility tombstone while removing the recovery UI/consumer entry points being rolled back.
2. Never deploy a pre-v5 checksumless writer unchanged while shadows remain. It could overwrite a primary and leave a stale shadow that a later re-upgrade must reject.
3. If an emergency legacy writer is required, first clear all `saveIntegrityBackups` rows in one v5-aware transaction, then enable legacy writes. This intentionally removes guided-repair redundancy.
4. Real fake-IndexedDB proof covers sealed pairs → transactional shadow clear → v4-declared legacy write → production reopen; the overwritten checksumless row and untouched sealed row both load without stale-shadow rejection.
5. Reverting browser assertions/UI does not require snapshot migration. Existing primary v34 rows remain readable under the safe contracts above.

Unrelated dirty files present throughout the run—`.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`—were preserved and are not claimed or included in this slice.

Roadmap item 5 (multi-tab coordination) remains the next independent slice.
