# TRUST-SAVE-INTEGRITY-1 Execution Plan

## Objective and player outcome

Every newly written dynasty is sealed and independently shadowed; if the primary local record later changes unexpectedly, MBD blocks the load and lets the player explicitly restore the exact verified copy before resuming. Active goal: [`docs/codex/goals/16_TRUST_SAVE_INTEGRITY_1.md`](../../goals/16_TRUST_SAVE_INTEGRITY_1.md).

## Live source truth

- Repository: `/Users/kevin/Downloads/MBD-main-main`.
- Branch/worktree: `codex/save-integrity-repair-4` in the primary worktree.
- Starting commit: `0a6c64c12b464d3d47104baebc28c0d2a733f2dd`.
- Starting dirty state: `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md` are user-owned and excluded.
- Package/runtime: `pnpm@9.15.4`, Node `>=20` (host `v24.16.0`).
- Root gates from live package files: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:determinism`, and `pnpm e2e:reload-smoke`.
- Save version: v34. IndexedDB is currently v4; this slice adds one local envelope store in v5 without changing `GameSnapshot`.
- Starting commit passed all item-3 full gates and browser proof. Fresh full-web baseline passed 441 files / 1 skipped and 1,608 tests / 2 skipped. Focused source-mapper baselines passed 11 web files / 93 tests plus 22 migration tests.
- `SOURCE_TRUTH.md` records central write/load seams, checksum-blind branch/worker/active-save paths, recovery ownership, real-browser harness, and the reason a same-generation independent shadow is required.

## Scope and non-goals

Allowed production areas:

- one pure save-integrity canonicalization/SHA-256 module and tests;
- `SaveData` integrity envelope, additive Dexie v5 shadow store, central root/branch write/load/repair/delete transactions, and focused tests;
- verified stored-record consumption in active persistence, onboarding, boot/setup/settings, and branch comparison;
- existing Save Recovery reducer/provider/dialog repair action and tests;
- permanent Playwright IndexedDB corruption/restore/mobile proof;
- slice goal/run docs.

Hard cut line: no authentication/signature/encryption, malicious-writer claim, multi-tab locking, cross-version export matrix, quota meter/warning, save-size UI, pruning, previous-generation history, journal, pending-day replay, cloud/service worker owner, snapshot v35, gameplay/CPU/RNG change, generic recovery rewrite, new route, or production test backdoor.

## Behavioral invariants

- SHA-256 protects a fixed canonical full-envelope projection; hashing occurs only after final shaping and before any Dexie transaction.
- Every successful current write has an identical sealed primary and one shadow. Root leaderboard state is derived from that exact snapshot in the same transaction.
- Existing sealed data is verified before influencing a write. Corruption can never be overwritten under a fresh checksum.
- Safe load verifies before version/migration/schema parsing or worker import.
- Old checksumless/no-shadow saves load unchanged and become protected only on a later explicit write.
- Missing/malformed/unsupported seal with an existing shadow is integrity failure, not legacy compatibility.
- Repair is explicit, persistence-only, exact-ID/time/tree preserving, reverified, race-checked, atomic, and followed by ordinary safe load. It never reruns gameplay.
- Restore/raw export/inspection do not fabricate `Saved` or advance recency. Item-2 queue/order and item-3 retry/fallback truth remain authoritative.
- Root/branch delete/replacement and Clear All cannot orphan a shadow or restore a removed save.
- Raw export is evidence; canonical snapshot export/import remains unchanged.
- One shadow per save is the absolute bound. v34, old/deep saves, deterministic simulation, and CPU fairness remain unchanged.

## Design decision

Add optional `SaveIntegrityMetadata` to the web-local `SaveData` envelope and an IndexedDB v5 `saveIntegrityBackups` store keyed by save ID and indexed for tree cleanup. A pure module canonicalizes an explicit version-1 projection and hashes it with Web Crypto SHA-256. Current writes seal the final record before the transaction, then put the exact same object into primary and shadow stores; root writes also update leaderboard.

Same-generation shadow was selected instead of previous-generation rollback. Branch create/delete changes parent narrative metadata and child rows atomically; restoring an older parent alone could orphan or resurrect branch identity. An exact shadow repairs independent primary-row damage without rolling simulation or tree structure backward.

`loadSaveSafely()` verifies a present seal first and queries/verifies the shadow only to report conditional repair availability. A new narrow restore API independently verifies the shadow, captures canonical primary/shadow state, then rechecks those values inside the ordered tree barrier/transaction before restoring. Root leaderboard is rebuilt from the restored record. The recovery provider exposes one explicit conditional action and then retries the caller's normal load/import path.

Checksumless rows with no shadow remain compatible and unmodified. If a shadow exists, absence of a valid primary seal is corruption. The additive DB migration creates only the empty shadow store; it does not backfill unverifiable history.

Rejected alternatives:

- recompute/reseal the suspect row: accepts corruption and is not repair;
- snapshot-only checksum: misses save identity, tree ownership, and false recency tampering;
- previous-generation backup: can make root/branch tree state inconsistent;
- shadow inside the primary row: not independently recoverable from row corruption;
- hash during an open Dexie transaction: Web Crypto can let the transaction auto-close;
- silent restore at boot: destroys evidence and player choice;
- snapshot v35: integrity belongs to the local persistence envelope and would impose unnecessary migration churn;
- unbounded backups: trespasses into storage-pressure/history work.

Compatibility: v34 remains unchanged; IndexedDB v5 adds one store and no data backfill. A safe code rollback retains the v5 store declaration and paired integrity writer as a compatibility tombstone even if the recovery UI is removed. An emergency return to a legacy writer must first clear every shadow in one v5-aware transaction; otherwise later legacy writes could leave stale shadows that a re-upgrade must correctly reject. Real fake-IndexedDB proof covers shadow clearing, a v4-declared legacy write, and successful re-upgrade of both overwritten checksumless and untouched sealed primaries.

## Milestones

| # | Checkpoint | Primary files | Proof | Status |
|---:|---|---|---|---|
| 1 | Goal/source reconciliation and baseline | goal, `SOURCE_TRUTH.md`, this plan | three read-only maps; full/focused baselines green; no stop condition | Complete |
| 2 | Canonical seal and atomic primary/shadow lifecycle | integrity module, `saveSystem*` | hash vectors; exact root/branch pairs; atomic rollback; delete/replace/clear | Complete |
| 3 | Verify-on-read and exact guided restore API | `saveSystem*`, active persistence/consumers | tamper/old/deep/TOCTOU/recency/branch isolation | Complete |
| 4 | Recovery UI and verified consumer closure | recovery + boot/setup/settings/worker tests | conditional accessible action; ordinary retry/load; mobile bounds | Complete |
| 5 | Permanent browser proof, full gates, review, completion | E2E, all slice files, `COMPLETION.md` | real tamper/export/restore/reload; full gates; no P0/P1 | Complete |

## Acceptance matrix

| Requirement | Implementation location | Unit/integration proof | Browser proof | Status |
|---|---|---|---|---|
| Canonical full-envelope SHA-256 | integrity module | vector/order/every-field/malformed/unavailable tests | stored valid seal inspected | Complete |
| Exact final shaped record | central writer | branch merge/clear checksum matches persisted object | public mutation remains verified | Complete |
| Atomic primary/shadow/leaderboard | Dexie v5 transactions | forced primary/shadow/leaderboard rollback | durable reload | Complete |
| Root/branch parent-child integrity | branch create/delete/update | all rows/seals atomic and isolated | original branch lanes stay green | Complete |
| Existing sealed write precondition | writer verified-read helper | corrupt primary cannot overwrite shadow | fault remains recoverable | Complete |
| Verify before parse/import | `loadSaveSafely`, consumers | mismatch/malformed/unsupported/missing precedence | worker import blocked on reload | Complete |
| Checksumless old/deep compatibility | safe load/write | current + v17 + Season-10 v33 unchanged, then sealed | production PWA loads current save | Complete |
| Explicit verified repair only | restore API + barrier | exact copy/time/tree; TOCTOU/missing/bad shadow inert | keyboard restore action | Complete |
| Root leaderboard repair | restore transaction | derived entry exact/rollback | summary remains truthful | Complete |
| Branch/playable load closure | setup/worker/active callers | branch mismatch never consumed | journey continues after repair | Complete |
| Honest recovery/raw evidence | reducer/provider/dialog | copy/action/error/busy/details/download | actual raw download parses | Complete |
| Lifecycle cleanup | delete/replace/clear | no orphan shadow/resurrection | existing delete/reload proof | Complete |
| Desktop/mobile non-occlusion | recovery dialog | scroll/focus contract | 1280x720 + 375x667 assertions/screenshots | Complete |
| Import/export compatibility | existing canonical functions | snapshot-only equality; saved import sealed | downloaded raw distinguished | Complete |
| Schema/determinism/CPU compatibility | no snapshot/sim change | full migration/worker/determinism gates | production PWA hard reload | Complete |

## Progress log

1. 2026-07-11 — Landed roadmap item 3 on `main` at `0a6c64c` and created `codex/save-integrity-repair-4` from that exact commit.
2. 2026-07-11 — Re-read the MBD slice skill, root/app instructions, execution-plan template, canonical direction, release gates, review standard, and authoritative roadmap item 4.
3. 2026-07-11 — Three read-only source, test, and risk passes agreed that checksum-only or resealing is dishonest; one same-generation independent shadow is the smallest verified repair source. They mapped central writes, safe-load bypasses, recovery seams, transaction/tree risks, and permanent browser proof.
4. 2026-07-11 — Fresh full web baseline passed 441 files / 1 skipped and 1,608 tests / 2 skipped in 281.76s. Focused mapper runs passed 11 web files / 93 tests and contracts migration 1 file / 22 tests.
5. 2026-07-11 — Wrote the item-4 goal, source truth, and living plan before production edits. Next: pure canonical seal plus Dexie v5 atomic primary/shadow lifecycle.
6. 2026-07-11 — Added strict canonical full-envelope SHA-256, optional web-local integrity metadata, Dexie v5 exact same-generation shadows, and atomic root/branch/leaderboard lifecycle writes without changing snapshot v34 or dependencies. Pure integrity coverage is 48/48 green.
7. 2026-07-11 — Closed safe-load/write bypasses and added explicit ordered restore. Hostile real-IndexedDB storage coverage is 44/44 green across v4→v5 migration and rollback/re-upgrade, current/old/deep checksumless saves and next-write protection, primary/shadow tamper, projected-field loss, missing primary, malformed/unsupported seals, write refusal, import protection, exact root/branch restore, leaderboard repair, forced rollback, TOCTOU, generation association, stable damaged-row discovery, trusted tree isolation, deletion/replacement, repair ordering, and verifier-unavailable cleanup.
8. 2026-07-11 — Midpoint adversarial review found and drove fixes for stale-parent overwrite, prior-generation shadow association, wrong-root index trust, missing-primary recovery, implicit shadow promotion, recovery deletion identity, no-crypto root cascade, and sibling coordinator tombstoning. Final focused integrity/core/recovery/consumer coverage passed 12 files / 213 tests. Source and E2E TypeScript are green.
9. 2026-07-11 — Recovery now offers an explicit conditional `Restore verified copy`, distinguishes restore failure from post-restore reload failure, retains raw evidence export, disables actions while busy, exposes integrity evidence in details, and preserves mobile scrolling/focus behavior. Boot, Setup root/branch, and Settings retry through their ordinary verified load/import paths.
10. 2026-07-11 — Final read-only review closed additional tree-coherence and proof gaps: corrupt-parent branch deletion now preserves the child until explicit parent recovery; exact root/shadow metadata discovers no-crypto parents; branch caps ignore damaged indexes; root/branch listings keep corrupt or missing primaries discoverable by stable topology; legacy repair is ordered from its first read; and failed Delete/Restore states retain honest accessible evidence.
11. 2026-07-11 — Production browser diagnostics proved real checksum tamper, raw evidence download, desktop/mobile bounds, exact pair restoration, and pre-failure route restoration. The first run exposed missing route return; a later run exposed a legitimately restored pending press overlay intercepting the next harness click. Both owning seams were corrected without moving the pre-dismissal exact checksum/time assertion. Final production Chromium passed 1/1 in 3.8 minutes, and all six attached images passed visual review.
12. 2026-07-11 — Final root gates passed: typecheck 9/9 tasks, tests 8/8 tasks (web 443 files passed / 1 skipped and 1,718 tests passed / 2 skipped), build 5/5 tasks, deterministic verification 3/3, and `git diff --check`. Persistence, compatibility/scope, and UX/browser reviews each returned `MERGE_READY` with no unresolved P0–P3.

Blockers: none. All completion conditions are satisfied.

## Decision log

- Use full-envelope protection, not snapshot-only, so identity/tree/timestamp tampering cannot become trusted metadata.
- Use Web Crypto SHA-256 with explicit unavailable failure; do not introduce a dependency or alternate digest.
- Use an additive Dexie v5 store because a shadow embedded in the damaged primary row is not independent repair evidence.
- Store the same generation, not the previous generation, to preserve branch-tree coherence and exact player state.
- Permit checksumless rows only when no shadow exists; do not silently backfill or mutate on load.
- Keep raw recovery JSON as evidence and canonical export/import snapshot-only.
- Treat the checksum as accidental-corruption detection, never security, multi-tab, or simulation-correctness proof.
- Do not deploy a pre-v5 writer unchanged as rollback. Retain paired writes, or clear all shadows transactionally before legacy writes are enabled; this intentionally gives up guided repair until re-protection.

## Completion conditions

Before this slice may stop:

- every milestone-specific focused suite passes;
- root and branch writes atomically persist valid exact primary/shadow pairs and all lifecycle operations remain tree-safe;
- representative checksumless current/old/deep saves remain loadable and unchanged until the next write;
- every snapshot-consuming gameplay/write path verifies and a corrupt primary cannot reach worker import or be resealed;
- explicit restore re-verifies, survives hostile races/failures, restores exact data/time/leaderboard, and retries ordinary load;
- permanent Playwright proves real primary corruption -> blocked hard reload -> raw evidence -> explicit verified restore -> exact resume -> clean hard reload at desktop and 375x667;
- root typecheck, full tests, build, determinism, and permanent reload-smoke pass;
- v34 and canonical import/export remain unchanged, with no new bare randomness or simulation-truth clock/UUID;
- final diff excludes the three user-owned files and generated artifacts;
- adversarial persistence/integrity, compatibility/determinism, and browser/UX review finds no unresolved P0/P1;
- `COMPLETION.md` maps requirements, files, commands, browser proof, DB envelope migration, compatibility, storage/performance risk, and rollback.
