# TRUST-EXPORT-SCHEMA-MATRIX-1 — Living Plan

## 1. Objective and player outcome

Implement [Goal 18](../../goals/18_TRUST_EXPORT_SCHEMA_MATRIX_1.md): every save version that the running application promises to accept (v2–v34 at source reconciliation) gets one deterministic, canonical worker-and-JSON export/import proof in CI.

## 2. Live source truth

See [SOURCE_TRUTH.md](SOURCE_TRUTH.md). This is `/Users/kevin/Downloads/MBD-main-main` on `codex/export-schema-matrix-6`, start commit `0880529da7d85c524a17686e7875e597b20e9dc6`, with only the three protected user-owned dirty files listed there.

Current package scripts:

- root: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify`, `pnpm run verify:determinism`, `pnpm run e2e:reload-smoke`;
- contracts: `pnpm --filter @mbd/contracts test` / `typecheck`;
- web: `pnpm --filter @mbd/web test` / `typecheck` / `e2e:reload-smoke`.

Current schemas: GameSnapshot v34; Dexie database schema v5; canonical contracts-exported migration floor v2; parser-supported versions v2–v34 inclusive.

## 3. Scope and non-goals

Allowed: one focused test/harness at the current worker/save-system boundary, minimal fixture helper(s) only for v2–v15 coverage, and the required goal/run/ledger documentation.

Hard cut line: do not change gameplay, UI, persistence coordinator, save schema, Dexie schema, migration policy, dependency graph, or adjacent roadmap items. A real failure may justify the smallest directly necessary migration/import/export fix with regression proof; schema or DB version changes stop the slice for a report.

## 4. Behavioral invariants

- Test the actual worker canonical import/export and the actual portable JSON envelope; no shadow serializer/migrator.
- Every supported version goes to an honest normalized v34 snapshot then retains deterministic current truth across JSON re-import.
- Do not invent old facts. Pin default values produced by migrations and v33 Season-10's empty `archivedGames`.
- Newer, too-old, and malformed inputs remain explicit failures.
- No `Math.random`, clock data, UUIDs, or ordering instability enters game truth. Only `exportedAt` is excluded from export-envelope equality.
- Existing reload-smoke proves the current production mutation/persistence journey. This matrix adds no browser-facing mutation; browser scope is rechecked before handoff.

## 5. Design decision

Add one table-driven matrix at the worker test seam, where `importGameSnapshot` and `exportGameSnapshot` are the canonical runtime route. For each v2–v34 case, pass an authentic fixture when one exists or a named historical-shape builder when it does not; then export the normalized worker snapshot with `exportSnapshotToJson`, re-import it with `importSnapshotFromJson`, rehydrate through the worker, and compare deterministic current snapshots. Keep `saveSystem.test.ts`'s independent failure-boundary and v34 proof.

Rejected: limiting proof to v16–v34 (contradicts the app loader/parser); bulk-generating historical fixture files (would add opaque, unreviewed data); a test-only serializer/migrator (would fail to prove production paths); and schema bump (out of scope).

## 6. Milestones

1. **Reconcile and baseline** — complete. Historical Git/schema evidence confirmed 14 (not 15) v2–v15 cases and exposed the v3 narrative parser drift.
2. **Authoritative matrix** — complete. Fourteen named raw builders assert exact historical root/narrative/player/stat shapes before worker import; v16–v34 remain fixtures.
3. **Boundary and authenticity pass** — complete. The exported contracts floor drives worker, safe-loader, and matrix bounds; v34/rejection/Season-10 tests remain explicit.
4. **Adversarial proof** — complete. Recursive v2–v15 raw guards now distinguish five-field v2–v7 contracts from the v8–v15 economics shape, distinguish v7 draft from v8+ draft arrays, guard franchise/minor-league nested shapes, and compare seeded raw facts after migration.
5. **Self-review/handoff** — complete. Sol's definitive read-only verdict is `MERGE_READY` with zero P0–P2 findings; Luna closeout is recorded below.

## 7. Acceptance matrix

| Requirement | Location | Proof | Status |
| --- | --- | --- | --- |
| Enumerate supported v2–v34 | `apps/web/src/workers/snapshot.test.ts` matrix | exact 33 case count and v2–v34 equality | complete |
| Worker migration to current truth | worker snapshot matrix | every case imports/hydrates and exports current v34 | complete |
| Canonical JSON export/import | same matrix + save-system path | payload equality minus `exportedAt`; worker rehydration equality | complete |
| Explicit historical defaults/normalization | matrix expectations | version-group assertions plus Season 10 v33 | complete |
| Current v34 and rejection boundaries | `saveSystem.test.ts` | focused current round trip plus too-old/newer/malformed classifications | complete (existing tests rerun) |
| Negative control | `snapshot.test.ts` recursive trade guard + progress log | temporary v4 `tradeState.negotiations` failed before parser, then restored and 27/27 reran green | complete |
| Browser determination | `activeSaveRecoveryToast` + bounded reload smoke | lifecycle-aware unit proof plus clean zero-retry Chromium 2/2 | complete |

## 8. Progress log

1. 2026-07-11 — reconciled source, branch/base/dirty state, scripts, GameSnapshot v34, Dexie database schema v5/library v4.4.2, parser support v2–v34, canonical routes, fixture gap v2–v15, and exact Terra thread ID. Created goal/run artifacts before test edits.
2. 2026-07-11 — added the matrix to `snapshot.test.ts`: 14 named historical-shape projections plus 19 persisted contract fixtures; every case runs worker import → v34 worker export → canonical JSON export/import → worker re-import/equality. Added a separate deep v33 Season-10 truth case. Focused worker result: 19/19 passed.
3. 2026-07-11 — negative control: temporarily omitted v33 from the matrix. The worker suite failed exactly at `expected ... length 33 but got 32`; restored the one line and reran green (19/19).
4. 2026-07-11 — focused evidence: contracts migration suite 22/22 passed; combined web `saveSystem` + `snapshot` suites 47/47 passed; contracts and web typechecks passed. `git diff --check` passed and touched-source `Math.random` scan was empty.
5. 2026-07-11 — browser determination: item 6 is CI compatibility work and introduces no UI/mutation behavior, so a new Settings import journey would be scope expansion. Preserved and ran the existing production `pnpm e2e:reload-smoke`: Chromium durable reload/multitab journeys 2/2 passed in 4.6m. Next: adversarial self-review and handoff; no completion, staging, or commit.
6. 2026-07-11 — adversarial self-review against `REVIEW_STANDARD.md`: verified the live v2 floor/v34 ceiling and 33-entry meta-assertion; confirmed v2–v15 are labeled projections rather than fabricated save history and v16–v34 reuse fixtures; confirmed both worker and canonical JSON paths are exercised and only `exportedAt` is ignored; rechecked Season-10 v33 empty archives; confirmed no schema/DB/production code/dependency change and no touched-file randomness. P2 found and fixed: replaced broad explicit `any` in the test projection with narrow `MatrixRecord` casts. No unresolved P0–P2. Final matrix 19/19 and web typecheck passed after that correction. `git diff --check` passed; the three protected pre-existing dirty files remain unstaged and unedited by this slice.
7. 2026-07-11 — Sol correction pass: replaced generic v34 deletion logic with a 14-row source-backed raw case table; each row binds integer raw `schemaVersion` to its matrix row and asserts root/narrative/player/stat keys before Zod. Added `MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION` to contracts and consumed it in worker, safe-loader, and matrix. Historical v3 input exposed parser drift; corrected `GameSnapshotV3Schema` to the existing eight-lane historical narrative shape. Negative control injected v2 `monthlyPulse` and failed at the pre-Zod raw-shape guard; restored. Corrected web suites 47/47, contracts 22/22, and both typechecks passed.
8. 2026-07-11 — Sol's corrected-source browser evidence recorded three reload-smoke failures at `e2e/reload-smoke.spec.ts:435`: Sonner 2.0.7 default action dismissal removed a same-id replacement confirmation toast after the backup action. The narrow production correction calls `preventDefault()` in both the initial and repeat backup callbacks. The upgraded 8-test toast suite models that post-callback default dismissal, invokes initial and `Download again`, observes two canonical backup downloads and a still-visible pending confirmation, and verifies the failed coordinator state is unchanged.
9. 2026-07-11 — tightened the v2–v15 matrix from a top-level projection to historical recursive contracts: v2–v7 use only five contract keys; v8–v15 use the v8 economics fields from `35d436f`; v7 draft uses five keys while v8–v15 explicitly include `qualifyingOffers` and `signingDecisions`; v11/v12/v13–v15 franchise and v7/v8–v13/v14–v15 minor-league shapes are exact-key guarded. Seeded non-default Rule 5, service/options, PA/wins/losses, contract economics, narrative, ratings, and franchise identity are compared from raw input to v34 migration. Added the contracts-level v3 eight-lane regression and v8/current strict-draft regression.
10. 2026-07-11 — nested negative control: temporarily injected v16-only `tradeState.negotiations` into v4; `snapshot.test.ts` failed at the raw pre-parser assertion `v4 trade root trade shape` with received `negotiations,pendingOffers,tradeHistory` versus expected `pendingOffers,tradeHistory`. Removed the injection exactly; restored matrix + toast run passed 27/27.
11. 2026-07-11 — final focused gates: web worker/save/recovery/toast suite 151/151; contracts migration 24/24; contracts typecheck and web plus e2e typechecks passed; independent web build passed (3,020 modules, PWA 166 precache entries). The first Route-A browser rerun failed at the misplaced Day-92 assertion while the active Day-31 prospect conference was visible; moving the bounded preserve/assert/Skip to the actual post-accepted-trade reload then exposed the real deterministic identifying copy. The second rerun failed only because it asserted the generic press prompt rather than `That recent deal is being debated around the league.`. Final zero-retry `pnpm e2e:reload-smoke` passed both Chromium journeys in 4.5m and `apps/web/test-results/reload-smoke/.last-run.json` reports `status: passed`, no failed tests.
12. 2026-07-11 — final recursive self-review added exact nested franchise-onboarding and season-state key guards. The post-strengthening matrix + toast rerun passed 27/27; direct contracts migration passed 24/24; web (including e2e) and contracts typechecks passed again.
13. 2026-07-11 — Terra escalated high→xhigh for the final Sol correction route. Sol's writer-level reconciliation found that `seasonState.gameLog` had still copied current simulated games wholesale into v2–v15 builders. `577643c` shows the version-introducing writer serializes gameLog directly and sim-core writes ten GameBoxScore keys plus three PA keys; `save.ts`'s unused five-key contracts PA schema does not define persisted shape. `b7498f6` later changes the still-v15 writer to 13/11 before v16 (`430c45c`), so the matrix explicitly models initial-v15 and documents the later v15 era as residual coverage.
14. 2026-07-11 — added recursive initial-v15 game/PA projection, non-empty exact-key guards for every game and PA, and raw-to-v34 game/PA fact oracles. Negative control temporarily injected `winningPitcherId` into v4 game 0; matrix failed pre-parser at `v4 trade root game 0 shape` with that extra received key, then was restored. Corrected receipts: matrix + toast 27/27, focused worker/save/recovery/toast 151/151, contracts migration 24/24, contracts typecheck and web/e2e typechecks passed. No browser/build rerun: this route only changes a test projection and run docs; the prior current-production 2/2 reload-smoke/build receipts remain applicable preservation evidence, not a newly claimed browser run.
15. 2026-07-11 — final Sol P2: fenced stable but permissive non-empty `scoutingStaffs` and `rosterStates` lanes. Version-introducing source through initial v15 has stable six-key Scouts and four-key RosterStates. The builders now project every tuple/object; guards require non-empty staff/roster collections, every Scout/roster exact key set, tuple/state team agreement, non-empty MLB and 40-man string IDs, and empty source-authentic day-one transactions. Oracles retain representative Scout and roster facts. Independent v4 negative controls failed at `staff 0 scout 0 shape` for injected `futureReliability` and `roster 0 shape` for injected `futureOptions`; both restored. Receipts: 27/27, 151/151, 24/24, contracts typecheck, and web/e2e typechecks green. No browser/build rerun: test/docs-only correction; prior production receipts retained as preservation evidence.

## 9. Decision log

1. Live loader and parser, not the v16 fixture directory, define supported versions. v2–v34 are included.
2. One worker-boundary test may import the existing save-system JSON helpers because they are the production portable envelope. It must not duplicate either implementation.
3. `exportedAt` is the only intentionally non-deterministic export-envelope field; snapshot equality remains exact.
4. Browser reload proof is preserved, not claimed anew, unless governance says that pure CI compatibility work must exercise Settings import.
5. Live Settings import does use the canonical JSON parser and durable `saveGame`, but it does not worker-import in that handler. The new test covers the worker canonicality and JSON parser paths directly; the existing production reload gate covers durable browser reload behavior. A combined Settings import → save → hard-reload test is a distinct UI claim and is deliberately deferred.
6. The v2–v15 inputs are not disguised on-disk history: they are named test projections that remove historically absent contract fields and activate each migration's defaults. v16–v34 reuse persisted fixture files. The separate deep Season-10 fixture proves the no-fabricated-archives rule.
7. Raw projections now construct allowed historical fields by version rather than cloning a v34 payload and deleting selected fields. Root/narrative/player/stat key assertions run before the contracts parser, so a future-only field cannot be silently stripped by Zod and mistaken for compatibility.
8. The minimum supported version is contracts-owned because it is parser-adjacent and has no web/runtime dependency. Importing it into worker and save-loader preserves the existing numeric v2 floor while preventing range drift.
9. The v7-only draft schema is compatibility-only: current and v8+ schemas remain strict. `migrateGameSnapshotV7` is the single place that initializes its historically absent `qualifyingOffers` and `signingDecisions` arrays.
10. The production recovery-toast fix is limited to Sonner action event lifecycle. It does not alter persistence retries, failed coordinator state, or the portable save format.
11. The bounded browser change uses only a visible dialog, exact deterministic Day-92 accepted-trade copy, and the public `Skip` action. It neither suppresses nor auto-dismisses product press conferences; the later confident-response/save/reload/Press Room/no-reopen proof remains unchanged.
12. The initial-v15 gameLog row follows the actual persistence writer, not an unused contracts helper schema: 10 GameBoxScore keys and 3 PA keys. `b7498f6` creates a later same-version 13/11 writer era; v16+ fixtures remain unchanged, so that brief late-v15 interval is an explicit residual coverage boundary.
13. The Sonner recovery-toast production correction is a governance-approved permanent reload-gate blocker exception to this goal's normal migration-seam production cut line. Its narrow event-lifecycle fix is retained because removing it reintroduces the proven durable-reload gate defect.
14. Stable Scout and RosterState interfaces are still fenced despite matching current source: `save.ts` accepts their inner values through unknown seams, so explicit historical projections prevent a future field from silently rewriting every v2–v15 raw input.

## 10. Closeout receipts

- Definitive Sol verdict: `MERGE_READY`, zero P0–P2. Earlier generic/contaminated projections, v3 narrative drift, v7 draft compatibility, Sonner same-id dismissal, deterministic Day-92 browser placement/copy, gameLog writer-shape leakage, and permissive scoutingStaffs/rosterStates lanes were corrected and re-reviewed. Residual P3: a later same-v15 writer changed game/PA shape from 10/3 to 13/11 (`b7498f6`); the matrix intentionally models the version-introduction writer (`577643c`) and documents the later era without adding a second row.
- Terra route: `019f51f7-5277-7570-add0-fd4a2acb1778`, `gpt-5.6-terra`, high escalated to xhigh for correction work; Sol route: `019f51c7-4ff9-7b13-8b14-d0120e47225c`, `gpt-5.6-sol`, xhigh; closeout route: `gpt-5.6-luna`, medium, sole checkout writer.
- Focused receipts: matrix + recovery toast 27/27; focused worker/save/recovery/toast 151/151; contracts migration 24/24; contracts typecheck passed; web and e2e typechecks passed.
- Full closeout receipts: root typecheck, full test, production build/PWA, determinism verification, and fresh zero-retry production reload-smoke were run from the final source and recorded in `COMPLETION.md`.
- Browser status: Chromium reload-smoke passed 2/2 with zero retries; `.last-run.json` reports `status: passed` and no failed tests. Earlier failures were diagnosed and corrected, not classified as flaky success.
- Integrity checks: GameSnapshot v34, DB schema v5, no lockfile/dependency diff, no bare `Math.random` in touched source, negative-control names restored, `git diff --check` and cached diff checks passed. Protected files retained their required hashes and remained dirty/unstaged.

## 11. Completion conditions

- Focused matrix, contracts migration, worker snapshot, and save-system suites pass with observed counts.
- Relevant contracts/web typechecks pass; source scan finds no new bare `Math.random`; diff review confirms protected files untouched and no scope drift.
- Negative control has an observed intended failure and restored green receipt.
- Browser requirement has an evidence-backed decision and any required bounded proof passes.
- `REVIEW_STANDARD.md` adversarial pass has no unresolved P0–P2.
- This plan and SOURCE_TRUTH contain exact evidence; `COMPLETION.md` records the final requirement mapping, gates, route, risks, and rollback. Item 6 is closed after explicit staging, intentional commit, and local-main fast-forward; no push, deploy, tag, release, or item 7 work is included.
