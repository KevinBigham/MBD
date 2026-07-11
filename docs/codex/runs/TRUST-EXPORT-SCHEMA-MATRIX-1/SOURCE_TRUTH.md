# TRUST-EXPORT-SCHEMA-MATRIX-1 — Source Truth

## Run identity

- Goal: [`18_TRUST_EXPORT_SCHEMA_MATRIX_1.md`](../../goals/18_TRUST_EXPORT_SCHEMA_MATRIX_1.md)
- Roadmap: item 6 — export/import round-trip CI matrix across every supported schema version.
- Terra thread: `019f51f7-5277-7570-add0-fd4a2acb1778` (`gpt-5.6-terra`, initially high; escalated to xhigh for corrective review routes).
- Branch: `codex/export-schema-matrix-6`.
- Base/current start commit: `0880529da7d85c524a17686e7875e597b20e9dc6`.
- Package manager: pnpm (`pnpm-lock.yaml`).
- Pre-existing dirty, protected, and out of scope: `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`. They must remain byte-for-byte untouched and unstaged.

## Live version and compatibility contract

- Current GameSnapshot: v34 (`CURRENT_GAME_SNAPSHOT_VERSION` in `packages/contracts/src/schemas/save.ts`).
- IndexedDB database schema: v5 (`apps/web/src/shared/lib/saveSystem.ts`); the installed Dexie library is v4.4.2 (`pnpm --filter @mbd/web list dexie`). The roadmap shorthand "Dexie v5" refers to the database schema, not a package-version upgrade.
- Canonical support floor: v2 (`MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION` beside the current version in `packages/contracts/src/schemas/save.ts`, re-exported from `packages/contracts/src/index.ts`). Worker validation, safe save loading, and the matrix all consume this one value. It rejects `<2` as `version_too_old` and `>34` as `version_too_new` before migration.
- Contracts parser: `parseGameSnapshot` explicitly routes every v2 through v33 value to its migration and directly parses v34. Therefore the supported matrix is the contiguous inclusive range **v2–v34 (33 versions)**, not the v16–v34 fixture subset.
- Canonical worker runtime path: `importGameSnapshot` → `exportGameSnapshot` in `apps/web/src/workers/snapshot.ts`. Worker actions use these functions for `importSnapshot` and `exportSnapshot`.
- Canonical portable JSON path: `exportSnapshotToJson` (validates current snapshot with `GameSnapshotSchema`) → `importSnapshotFromJson` (uses `parseGameSnapshot`) in `apps/web/src/shared/lib/saveSystem.ts`.

## Existing evidence and gaps

| Version/group | Existing source evidence | Gap the slice closes |
| --- | --- | --- |
| v2–v15 | Explicit parser migrations, version-introducing Git blobs, and the matrix's 14 named raw-shape builders | No checked-in persisted fixture for each version; builders now reconstruct contract-era root/narrative/player/stat shapes rather than deleting fields from v34 |
| v16–v34 | Contract fixtures at `packages/contracts/tests/fixtures/save/v*/core.json`; v33 additionally has `season10.json` | Fixtures have migration coverage but not every-version worker → canonical JSON → re-import equality proof |
| v34 | Contract migration test and `saveSystem.test.ts` canonical JSON round trip | Needs to live in the same exhaustive matrix while retaining its independent current-round-trip proof |
| negative boundaries | `saveSystem.test.ts` covers newer, too-old, malformed/current Zod, and supported migration failure classifications | Retain separately; do not make success-matrix cases conceal rejection behavior |

## Final correction evidence

- Historical nested contracts were checked against the version-introducing Git blobs, not inferred from current Zod stripping: v2–v7 player contracts contain only `years`, `annualSalary`, `noTradeClause`, `playerOption`, and `teamOption`; `35d436f` (v8) introduced the optional economic contract fields. The matrix writes non-default v8+ values for every one of those fields and asserts their raw presence before import.
- The v7 draft compatibility seam is deliberately narrow. Current `DraftStateSchema` requires `qualifyingOffers` and `signingDecisions`; `GameSnapshotV7Schema` alone uses a five-key historical draft schema, and `migrateGameSnapshotV7` adds the two empty arrays. The contracts regression proves current and v8 missing-array inputs reject.
- `snapshot.test.ts` recursively asserts source-backed nested contract, trade, draft, franchise (including onboarding), minor-league, season-state, player, stat, narrative, and root key sets before the worker/parser can strip unknown data. It also compares seeded raw identity, ratings, PA, wins/losses where historically present, Rule 5, service/options, v8+ contract economics, narrative morale, and franchise identity with the migrated v34 values.
- The direct contracts regression projects the archived v16 fixture onto the exact v3 root and eight-lane `NarrativeSnapshotV4Schema` contract. It validates raw lane keys, migration retention for all eight lanes (including the persisted season-history fact), and empty later containers. This is intentionally a source-shape projection, not a claim that a newly fabricated v3 disk event was found.
- Sol recorded three corrected-source browser failures at reload-smoke line 435: Sonner 2.0.7 dismisses an action toast after its callback, deleting a same-id confirmation replacement unless the action prevents default. Both backup actions now prevent default before requesting/replacing the toast. The test lifecycle model performs the same post-callback dismissal rule, so deleting either prevention fails visibility assertions.
- Browser correction receipt: the first local Route-A rerun reached an older Day-31 conference because the Day-92 assertion was placed before the trade; the second reached the intended Day-92 accepted-trade dialog but exposed its exact deterministic text. The final bounded post-trade journey preserves the dialog, asserts `Season 1 · Day 92` and `That recent deal is being debated around the league.`, clicks public `Skip`, then continues the existing durability journey. Fresh zero-retry `pnpm e2e:reload-smoke` completed 2/2 Chromium in 4.5m; `.last-run.json` is `{"status":"passed","failedTests":[]}`.
- Late gameLog reconciliation: v2 through the `577643c` v15-introducing writer serialize `seasonState.gameLog` directly from sim-core. Its persisted `GameBoxScore` is the ten-key shape and its PA return object is exactly `outcome`, `batterId`, `pitcherId`; the contemporary five-key contracts schema was never wired into `save.ts`, which deliberately uses `z.array(z.unknown())`. `b7498f6` changed the still-v15 writer to the later 13-box/11-PA form before v16 arrived at `430c45c`. The v15 matrix row is explicitly the initial-v15 (`577643c`) writer era because this matrix labels version-introducing commits; v16+ fixture coverage is unchanged. This leaves the unfixtured late-v15 writer era as a documented residual boundary rather than mislabeling it as one universal v15 shape.
- The matrix now projects every v2–v15 game and every nested PA to the initial-v15 10/3 writer keys, asserts non-empty game and PA lanes and exact keys before parser import, and pins game teams/scores/date/playoff plus PA outcome/batter/pitcher facts after migration. Temporary v4 `winningPitcherId` injection failed at the new recursive raw game guard before parsing and was restored.
- Opaque-lane reconciliation: `scoutingStaffs` and `rosterStates` were also non-empty current values copied through `z.unknown` save seams. The source-backed v2 through initial-v15 Scout interface is stable at `id`, `name`, `quality`, `specialty`, `bias`, `salary`; the stable RosterState is `teamId`, `mlbRoster`, `fortyManRoster`, `transactions`. Every historical tuple/object is now projected and guarded. Day-one roster transactions are source-authentic `[]`, while MLB and 40-man player identities remain non-empty.
- Two independent v4 negative controls were observed and restored: adding `futureReliability` to Scout 0 failed `v4 trade root staff 0 scout 0 shape`; adding `futureOptions` to RosterState 0 failed `v4 trade root roster 0 shape`. In both failures, the received key set contained only the injected future field beyond the source-backed expected keys. Raw-to-v34 assertions preserve the staff team plus all six Scout facts, and roster team plus representative MLB/40-man IDs and empty transactions.
- Post-correction unknown-lane audit: no further non-empty current-only nested lane was found copied wholesale by the v2–v15 projections. `playoffBracket`, `offseasonState`, `draftClass`, and `freeAgencyMarket` are day-one null; Rule 5 roots are version-gated and empty/null at the test setup; gameLog, scoutingStaffs, and rosterStates are now recursively projected. No scope expansion was needed.
- The Sonner recovery-toast production change is an explicit authorized exception to Goal 18's otherwise migration-seam production scope: it was the narrowly proven permanent reload-smoke blocker. It only prevents Sonner's default action dismissal when replacing a same-id toast; it does not change save compatibility, persistence state, or product gameplay.

## Final focused receipts

| Command | Observed result |
| --- | --- |
| `pnpm --filter @mbd/web exec vitest run src/workers/snapshot.test.ts src/app/layout/activeSaveRecoveryToast.test.tsx` | 27/27 passed after restoring the nested-field negative control |
| `pnpm --filter @mbd/web exec vitest run src/workers/snapshot.test.ts src/shared/lib/saveSystem.test.ts src/shared/lib/saveSystem.integrity.test.ts src/shared/lib/saveSystem.transaction.test.ts src/shared/lib/activeSavePersistence.test.ts src/shared/lib/activeSavePersistence.session.test.ts src/app/layout/activeSaveRecoveryToast.test.tsx` | 151/151 passed |
| `pnpm --filter @mbd/contracts exec vitest run tests/save.migration.test.ts` | 24/24 passed, including direct v3 and strict current/v8 draft cases |
| `pnpm --filter @mbd/contracts typecheck` | passed |
| `pnpm --filter @mbd/web typecheck` | passed, including e2e TypeScript project |
| `pnpm --filter @mbd/web build` | passed: 3,020 modules; PWA 166 precache entries |
| `pnpm e2e:reload-smoke` | 2/2 Chromium passed, zero retries, 4.5m |
| post-gameLog correction: matrix + toast / focused save-recovery / contracts migration | 27/27, 151/151, and 24/24 passed respectively; contracts and web/e2e typechecks passed |
| post-opaque-lane correction: matrix + toast / focused save-recovery / contracts migration | 27/27, 151/151, and 24/24 passed respectively; contracts and web/e2e typechecks passed |

The negative controls were intentionally run before the first receipt in the table: the earlier v4 `tradeState.negotiations` injection and the late gameLog v4 `winningPitcherId` injection both failed their exact pre-parser guards. The gameLog receipt was `v4 trade root game 0 shape`, with received `winningPitcherId` in addition to the ten expected keys; both temporary patches were removed before the 27/27 rerun.

## Supported-version matrix contract

| Version | Matrix input | Pinned current normalization |
| --- | --- | --- |
| 2 | named historical-shape projection | legacy award/history fields, stats, and empty trade/Rule 5 defaults |
| 3 | named historical-shape projection | empty trade defaults |
| 4 | named historical-shape projection | empty Rule 5 defaults |
| 5 | named historical-shape projection | pre-monthly-pulse defaults |
| 6 | named historical-shape projection | player option/service-time defaults |
| 7 | named historical-shape projection | minor-league development defaults |
| 8 | named historical-shape projection | advanced-stat defaults |
| 9 | named historical-shape projection | empty monthly pulse |
| 10 | named historical-shape projection | franchise, ceremony, and achievement defaults |
| 11 | named historical-shape projection | record/watch and historical defaults |
| 12 | named historical-shape projection | job market/challenge defaults |
| 13 | named historical-shape projection | ticker and minor-history defaults |
| 14 | named historical-shape projection | archive/diagnostics normalization |
| 15 | named historical-shape projection | empty narrative/trade additions |
| 16 | `fixtures/save/v16/core.json` | empty narrative/trade additions |
| 17 | `fixtures/save/v17/core.json` | player arbitration defaults |
| 18 | `fixtures/save/v18/core.json` | player arbitration defaults |
| 19 | `fixtures/save/v19/core.json` | current v34 canonicalization |
| 20 | `fixtures/save/v20/core.json` | empty team moments |
| 21 | `fixtures/save/v21/core.json` | empty team moments |
| 22 | `fixtures/save/v22/core.json` | additive current enum acceptance |
| 23 | `fixtures/save/v23/core.json` | additive current enum acceptance |
| 24 | `fixtures/save/v24/core.json` | additive current enum acceptance |
| 25 | `fixtures/save/v25/core.json` | additive current enum acceptance |
| 26 | `fixtures/save/v26/core.json` | empty wave-4 persisted-state additions |
| 27 | `fixtures/save/v27/core.json` | additive current enum acceptance |
| 28 | `fixtures/save/v28/core.json` | null prior-season WAR carryover |
| 29 | `fixtures/save/v29/core.json` | additive current enum acceptance |
| 30 | `fixtures/save/v30/core.json` | additive current enum acceptance |
| 31 | `fixtures/save/v31/core.json` | additive current enum acceptance |
| 32 | `fixtures/save/v32/core.json` | additive current enum acceptance |
| 33 | `fixtures/save/v33/core.json` plus `season10.json` | empty archived games; Season 10 remains Season 10 |
| 34 | `fixtures/save/v34/core.json` | direct current-schema canonical JSON round trip |

The v2–v15 rows are backed by the version-introducing save-schema commits: v2 `3511994`/v3 `27e6f1b`, v4 `06da3e8`, v5 `62e5cb1`, v6 `47619e4`, v7 `617d43b`, v8 `35d436f`, v9 `03667c5`, v10 `206971d`, v11 `76ad018`, v12 `7112f1a`, v13 `b087238`, v14 `a9c7d79`, and v15 `577643c`. Reconciliation found and fixed one parser drift: v3 raw saves used the eight-lane historical narrative, so `GameSnapshotV3Schema` now uses the existing historical narrative schema rather than requiring later HOF/timeline lanes.

## Existing tests and commands

- `packages/contracts/tests/save.migration.test.ts`: fixture migrations v16–v34 (including v33 Season 10) and current v34 parse/JSON round trip.
- `apps/web/src/workers/snapshot.test.ts`: selected worker import/export migration coverage, including constructed older versions and contract fixtures v18–v33.
- `apps/web/src/shared/lib/saveSystem.test.ts`: canonical JSON export/import plus too-old/newer/malformed safe-load classification.
- Current package scripts: root `typecheck`, `test`, `build`, `verify`, `verify:determinism`, and `e2e:reload-smoke`; package scripts are recorded in `PLAN.md`.

## Baseline and source-reconciliation status

- Baseline source inspection completed before production/test edits. `pnpm --filter @mbd/contracts test -- save.migration.test.ts` passed 22/22 before the test change. A web baseline invocation was started but its terminal parent did not return a completion receipt, so it is deliberately not claimed as green; the post-change focused evidence is recorded in `PLAN.md`.
- Reconciliation is complete: the historic roadmap wording is consistent with live source after correcting its implicit fixture-range assumption. Worker support is v2–v34; fixtures begin at v16; v2–v15 have fourteen source-backed raw builders. The common floor is now exported from contracts rather than duplicated.

## Guardrails

- This is test/harness work unless the matrix exposes a real defect. No GameSnapshot or Dexie bump is expected or authorized.
- Preserve seeded determinism and stable equality. The export envelope's `exportedAt` is wall-clock metadata; equality compares canonical payloads with only that field removed.
- Old-save defaults are asserted explicitly; the v33 Season-10 fixture must keep `narrative.archivedGames` empty.
- The matrix makes no new high-emotion mutation or UI claim. Existing reload-smoke remains the production browser proof unless source governance requires a bounded Settings import journey.

## Closeout source truth

- Sol's definitive review route (`019f51c7-4ff9-7b13-8b14-d0120e47225c`, `gpt-5.6-sol`, xhigh) is `MERGE_READY` with zero P0–P2 findings. The final corrections covered authentic historical projections, v3 narrative parser drift, v7-only draft compatibility, Sonner same-id toast dismissal, deterministic Day-92 browser proof, initial-v15 game/PA writer shape, and stable non-empty scouting/roster opaque lanes.
- The only documented residual is P3 provenance depth: `b7498f6` changes the still-v15 writer from 10/3 game/PA keys to 13/11 before v16 (`430c45c`). The matrix row is truthfully tied to the version-introduction commit `577643c`; a second late-v15 row is optional and outside Goal 18 acceptance.
- Closeout receipts are in [COMPLETION.md](COMPLETION.md). They cover the final focused and full gates, browser retry/flaky classification, version/schema/dependency/randomness checks, exact staged scope, protected hashes, commit/fast-forward proof, and rollback.
