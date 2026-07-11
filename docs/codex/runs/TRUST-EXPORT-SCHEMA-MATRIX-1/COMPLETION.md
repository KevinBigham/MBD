# TRUST-EXPORT-SCHEMA-MATRIX-1 — Completion

## Outcome

Roadmap item 6 is verified complete. The live compatibility boundary is v2–v34 (33 versions). Every row enters through the canonical worker import/export path, passes the canonical JSON envelope export/import path, asserts truthful current-v34 normalization, and compares deterministic canonical snapshots while ignoring only the envelope's wall-clock `exportedAt`.

## Goal 18 requirement mapping

| Criterion | Implementation artifact | Focused proof | Browser/final gate | Result |
| --- | --- | --- | --- | --- |
| Enumerate every supported version | `apps/web/src/workers/snapshot.test.ts`; contracts floor export | 33-row v2–v34 exact count and contiguous binding | Root typecheck/full test | PASS |
| Worker canonical migration/export | `apps/web/src/workers/snapshot.ts` and matrix | 33 worker import → v34 export cases | Full test | PASS |
| Canonical JSON round trip | `apps/web/src/shared/lib/saveSystem.ts` and matrix | JSON export/import/re-worker equality for every row | Full test | PASS |
| Honest v2–v15 inputs | named historical builders and recursive raw guards | historical root/nested keys, seeded fact oracles, exact pre-parser negative controls | Diff review | PASS |
| v16–v34 fixtures and v33 Season 10 | contract fixtures and migration tests | 19 fixture rows; `archivedGames: []` for Season 10 v33 | Full test | PASS |
| Current v34 and rejection boundaries | `saveSystem.test.ts` and migration tests | current round trip plus too-old/newer/malformed classifications | Full test | PASS |
| Defects only at required seams | `save.ts`, worker floor export, save loader, narrow toast/browser correction | v3 parser, v7 draft, and recovery regressions | Build/reload-smoke | PASS |
| Deterministic and save-safe scope | touched-source audit and no schema/DB/dependency change | no bare `Math.random`; no lockfile diff; restored controls | Determinism and diff checks | PASS |

## Changed files committed

The exact item-6 commit contains only these slice-owned paths:

- `apps/web/e2e/reload-smoke.spec.ts`
- `apps/web/src/app/layout/activeSaveRecoveryToast.test.tsx`
- `apps/web/src/app/layout/activeSaveRecoveryToast.ts`
- `apps/web/src/shared/lib/saveSystem.ts`
- `apps/web/src/workers/snapshot.test.ts`
- `apps/web/src/workers/snapshot.ts`
- `docs/codex/GOAT_ROADMAP_STATUS.md`
- `docs/codex/goals/18_TRUST_EXPORT_SCHEMA_MATRIX_1.md`
- `docs/codex/runs/TRUST-EXPORT-SCHEMA-MATRIX-1/COMPLETION.md`
- `docs/codex/runs/TRUST-EXPORT-SCHEMA-MATRIX-1/PLAN.md`
- `docs/codex/runs/TRUST-EXPORT-SCHEMA-MATRIX-1/SOURCE_TRUTH.md`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/schemas/save.ts`
- `packages/contracts/tests/save.migration.test.ts`
- `CHANGELOG.md`

## Gates and receipts

Focused suites:

- `pnpm --filter @mbd/web exec vitest run src/workers/snapshot.test.ts src/app/layout/activeSaveRecoveryToast.test.tsx` — 27/27 passed.
- `pnpm --filter @mbd/web exec vitest run src/workers/snapshot.test.ts src/shared/lib/saveSystem.test.ts src/shared/lib/saveSystem.integrity.test.ts src/shared/lib/saveSystem.transaction.test.ts src/shared/lib/activeSavePersistence.test.ts src/shared/lib/activeSavePersistence.session.test.ts src/app/layout/activeSaveRecoveryToast.test.tsx` — 151/151 passed.
- `pnpm --filter @mbd/contracts exec vitest run tests/save.migration.test.ts` — 24/24 passed.
- `pnpm --filter @mbd/contracts typecheck` — passed.
- `pnpm --filter @mbd/web typecheck` — passed, including e2e TypeScript.

Final repository gates, run from the final source:

- `pnpm typecheck` — passed.
- `pnpm test` — passed.
- `pnpm build` — passed; 3,020 modules and PWA 166 precache entries.
- `pnpm verify` — passed.
- `pnpm run verify:determinism` — passed.
- `pnpm run e2e:reload-smoke` — passed 2/2 Chromium.
- `git diff --check` — passed before staging; `git diff --cached --check` — passed after staging.
- Version/schema audit — GameSnapshot v34 and DB schema v5; no schema/DB bump.
- Dependency audit — no lockfile or dependency diff.
- Randomness audit — no bare `Math.random` in touched source.

## Browser report

The final production reload-smoke was a fresh zero-retry run: 2/2 Chromium journeys passed in about 4.5 minutes. `apps/web/test-results/reload-smoke/.last-run.json` reports `status: passed` and `failedTests: []`. Earlier failures were actionable corrections (Sonner same-id dismissal and the deterministic Day-92 assertion placement/copy), not flaky passes. The corrected recovery-toast lifecycle remains unit-tested; this item makes no new Settings import UX claim.

## Negative controls and review

The decisive controls were intentionally broken and restored: omitted v33 (33→32 matrix failure), injected v2 `monthlyPulse`, injected v4 `tradeState.negotiations`, injected v4 game `winningPitcherId`, injected Scout `futureReliability`, and injected RosterState `futureOptions`. Each failed at its exact recursive pre-parser guard and was removed before the green receipts. Sol's definitive verdict is `MERGE_READY`, zero P0–P2. The review history honestly included generic/contaminated early projections, row binding and duplicate-floor concerns, v3 narrative drift, v7-only draft compatibility, Sonner lifecycle behavior, gameLog writer-shape leakage, and opaque scouting/roster lanes; all were corrected and rechecked.

Residual risk is P3 provenance depth only: late-v15 commit `b7498f6` changes the still-v15 writer from 10/3 to 13/11 before v16. Goal 18 models the version-introduction writer `577643c` and documents the later same-version era; Sol considers a second row optional, not an acceptance requirement.

## Relay retrospective

### Uncertainty discovered too late

The historical writer authority for populated `gameLog` and PA results, plus the fact that `scoutingStaffs` and `rosterStates` were non-empty values flowing through permissive `z.unknown` lanes, was discovered late. The unused five-key PA helper schema initially obscured the actual 10/3 writer shape. Browser lifecycle behavior and the exact deterministic Day-92 copy also surfaced late.

### Earlier exposing artifact or gate

An early raw-state/serializer model for every populated lane, paired with recursive pre-parser guards, would have exposed the drift before the first broad matrix review. A direct raw→migrated oracle for game/PA/scout/roster facts and a lifecycle-accurate browser negative control would have shortened the correction loop.

### Owning relay role

The owning relay must reconcile source authority, preserve the living plan, require named artifacts and receipts, keep implementation/review/closeout boundaries explicit, and be the sole checkout writer for staging, commit, and local-main landing. It must report actual routes and observed results, not planned work.

### Phases that should have remained sequential

Source-history reconciliation → raw-shape/serializer modeling → implementation → adversarial Sol review → browser proof → final gates → checkout staging/commit/fast-forward should remain sequential. The browser proof must follow the final source because it depends on exact lifecycle and deterministic copy.

### Read-only work safe in parallel

Read-only source mapping, version-introducing Git archaeology, fixture inventory, package-script discovery, and independent test/review scans can run in parallel once the scope and protected files are recorded. No parallel writer should touch the same plan, status, production seam, or checkout.

### Exact recommended route for a similar cross-system persistence slice

1. Record branch/base/dirty state, protected hashes, package scripts, save version, DB schema, and baseline receipts.
2. Build a raw-state/serializer map from the actual historical writers; identify every populated permissive lane.
3. Create the goal, SOURCE_TRUTH, and PLAN with a version matrix and explicit scope cut line.
4. Add recursive pre-parser guards for every populated permissive lane and direct raw→migrated oracles before broad round-trip assertions.
5. Implement the smallest canonical-path test seam and run focused tests after each checkpoint.
6. Add lifecycle-accurate browser negative controls early when a production/browser claim is involved; rerun after the final correction.
7. Run earlier Sol review on smaller phase artifacts, fix findings, then run focused, full, build, determinism, and fresh browser gates.
8. Have one closeout writer explicitly stage the allowlist, inspect cached names/checksums, commit, fast-forward local main, and reverify protected dirty state.

### Prioritized future-run improvements

1. Require raw-state/serializer modeling before any matrix or migration implementation begins.
2. Require recursive pre-parser guards for every populated permissive lane, with no exemption for “stable” current shapes.
3. Require direct raw→migrated oracles for representative facts before normalized round-trip equality.
4. Add lifecycle-accurate browser negative controls at the first browser-capable checkpoint, not during closeout.
5. Split large relay phases into smaller artifacts: source map, raw-shape table, focused receipts, review corrections, and closeout ledger.
6. Schedule the first Sol review immediately after the smallest complete phase artifact, then repeat after corrections.

## Compatibility, rollback, and scope

No GameSnapshot or Dexie schema version changed; no dependency changed; no fabricated save history was added. Rollback is a normal revert of the item-6 commit, preserving the three protected pre-existing dirty files. No push, deploy, tag, release, or item 7 work was performed.
