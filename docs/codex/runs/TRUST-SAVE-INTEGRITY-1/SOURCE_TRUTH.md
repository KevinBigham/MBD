# TRUST-SAVE-INTEGRITY-1 Source Truth

## Roadmap contract

Authoritative item 4 is `Save integrity checksum on write, verified on load, with a guided self-repair path` at `MBD_REPO_AUDIT_AND_GOAT_ROADMAP_2026-07-10.md:186`. Items 1–3 are landed prerequisites. Item 5 multi-tab locking, item 6 every-version export CI, item 7 storage-pressure UX, and item 8 write-ahead intent recovery are separate goals.

## Live baseline

- Repository: `/Users/kevin/Downloads/MBD-main-main`.
- Branch: `codex/save-integrity-repair-4`.
- Starting commit: `0a6c64c12b464d3d47104baebc28c0d2a733f2dd` (`Add bounded autosave failure recovery`).
- Starting dirty state: only user-owned `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`; preserve and exclude them.
- Runtime/package manager: Node `v24.16.0`, `pnpm@9.15.4`, repository engine `>=20`.
- Root scripts: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:determinism`, `pnpm e2e:reload-smoke`.
- `CURRENT_GAME_SNAPSHOT_VERSION = 34` in `packages/contracts/src/schemas/save.ts`.
- IndexedDB is Dexie database `mbd-saves`, version 4, with `saves` and `leaderboard` stores. No integrity field, backup store, checksum utility, or production cryptographic dependency exists.
- Starting commit passed item 3's full root gates and production browser journey. A fresh item-4 baseline accidentally exercised the entire web suite because the package-script separator disabled file filtering: 441 files passed / 1 skipped and 1,608 tests passed / 2 skipped in 281.76s.
- Explicit focused mapper baselines passed 11 web files / 93 tests plus contracts migration 1 file / 22 tests.

## Evidence map

### Save envelope and writes

- `apps/web/src/shared/lib/saveSystem.ts:18-35` defines web-local `SaveData`; integrity can remain outside `GameSnapshot`.
- `saveSystem.ts:121-158` defines Dexie v1–v4. A separate shadow object store requires additive v5; it does not require snapshot v35.
- `saveSystem.ts:616-699` owns final snapshot shaping and all primary puts. The seal must be computed after root branch metadata is merged or explicitly cleared.
- `saveSystem.ts:653-675` already commits root plus leaderboard atomically. Shadow must join that transaction; branch writes need primary+shadow atomicity too.
- `saveSystem.ts:890-939` creates a branch and updates its parent inside one outer transaction. Both child and parent shadows must join it.
- `saveSystem.ts:942-999` owns root/branch delete, replacement cleanup, and Clear All. Every corresponding shadow must be removed atomically.
- `saveSystem.ts:1036-1061` legacy `repairSave()` reparses and directly overwrites a root row outside ordering/leaderboard transactions. It is production-unwired and is not a trustworthy integrity repair source.

### Verification bypasses

- `saveSystem.ts:747-807` is the fail-closed parse/version/migration seam but currently performs no integrity verification.
- App boot and Settings root load already call `loadSaveSafely()`.
- Setup root load is safe; branch continuation calls checksum-blind `inspectSaveById()` at `useSetupActionHandlers.ts:199-208`.
- Worker branch comparison calls checksum-blind `loadGameById()` at `sim.worker.queries.ts:3148-3163`.
- Active branch persistence re-reads existing identity/tree metadata through `loadGameById()` at `activeSavePersistence.ts:519-535`.
- Revised onboarding and Settings maintenance also call `loadGameById()` before snapshot/metadata writes. Stored snapshot/identity consumers need a verified-record seam.
- Listing/inspection APIs may identify slots without declaring them playable, but may not pass a damaged snapshot into worker/gameplay use.

### Recovery and browser proof

- `features/save-recovery/reducer.ts` has parse/zod/version/migration/storage reasons only.
- `SaveRecoveryProvider.tsx` owns raw export, delete, and Retry. It has no repair action/state/error.
- `SaveRecoveryDialog.tsx` is the existing global accessible modal. It has four actions and no mobile scroll boundary.
- `activeSavePersistence.ts:857-878` already provides an inactive save-tree replacement barrier suited to explicit repair.
- `apps/web/e2e/helpers/dynasty.ts` has real IndexedDB helpers and an item-3 write-fault shim.
- `apps/web/e2e/reload-smoke.spec.ts` is the permanent serial production-preview trust journey with downloads, hard reloads, desktop screenshots, and 375x667 proof.

## Reconciled design

1. A checksum is detection, not reconstruction. Recomputing it over a suspect row would merely accept damage and is forbidden.
2. Keep `GameSnapshot` v34. Add optional versioned integrity metadata to `SaveData` plus one Dexie v5 `saveIntegrityBackups` store containing an exact same-generation sealed `SaveData` copy per save ID.
3. Protect a fixed full-record projection, excluding only integrity. Recursively key-sort canonical JSON, preserve arrays, reject non-JSON values, UTF-8 encode, and SHA-256 with Web Crypto before entering any transaction.
4. Same-generation shadow avoids root/branch tree drift that an older-generation rollback could cause. It is independent enough for a primary-row corruption test but not a second-origin/cloud backup.
5. Primary, shadow, and root leaderboard commit atomically. No write reports success without both record copies.
6. A checksumless row with no shadow is old/unverified and remains loadable without mutation. A missing seal when a shadow exists is corruption. Its next explicit successful write establishes the pair.
7. Safe load verifies before trusting schema/version/snapshot. Explicit repair re-verifies the shadow outside the transaction, rechecks unchanged primary/shadow state inside the save-tree barrier/transaction, restores exact data/time, rebuilds leaderboard, then retries normal load.
8. Recovery copy says accidental local data changed and never claims authentication, prior-generation rollback, or successful repair before the transaction and reload path finish.
9. One shadow approximately doubles local save storage. The cap is exact; size/quota warnings and pruning remain item 7.

## Test ownership

- Pure integrity module: canonicalization, SHA-256 vector/order/field sensitivity, malformed/unavailable behavior.
- `saveSystem.test.ts`: safe-load classifications, checksumless compatibility, import/export shape, repair API contracts.
- `saveSystem.transaction.test.ts`: real IndexedDB v5 stores, primary/shadow/leaderboard atomicity, root/branch lifecycle, restore/TOCTOU/no-partial-write.
- contracts/worker fixtures: v17 through current and deep Season-10 v33 remain unchanged; representative checksumless storage coverage belongs here, not the item-6 every-version matrix.
- recovery reducer/provider/dialog: conditional repair, copy, busy/error/success, raw evidence, focus/mobile bounds.
- boot/setup/settings/active coordinator/worker queries: every snapshot-consuming bypass closes without changing mutation semantics.
- permanent browser: public save -> low-level primary seal flip -> hard reload refusal -> raw evidence download -> explicit verified restore -> normal load -> second hard reload -> original trust journey continues.

## Stop assessment

No stop condition is active. The live source supports an additive IndexedDB v5 shadow store, SHA-256 is available in Node >=20 and Chromium, and the existing safe-load/recovery/barrier/browser seams can be extended without snapshot v35 or gameplay replay. Performance/storage viability must be measured during implementation; failure there activates the documented stop condition.
