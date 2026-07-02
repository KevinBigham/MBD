# TRUST-A Completion

Status: complete. No goal stop condition remains. Review block (P1-1, P1-2, P2) resolved.

Completed: 2026-06-20 17:03 CDT
Review-block remediation completed: 2026-06-20 18:12 CDT

## Review-Block Resolution

A post-implementation review raised three blocking findings. All are resolved; scope stayed within `docs/codex/goals/01_TRUST_A.md`.

### P1-1 — Lost mutations on refresh failure

Draft signing, minors development-plan apply, and accepted multi-team trades persisted the post-mutation snapshot only **after** the UI route refresh, inside the same `try`. A refresh rejection therefore skipped persistence and the accepted mutation was lost on hard reload.

Fix: each handler now persists the accepted worker mutation **immediately, before any UI route refresh**, independent of refresh success. The display-only refresh in the minors and multi-team lanes is wrapped so a refresh rejection cannot crash the lane (those lanes had no surrounding `catch`) or suppress the truthful Saved/Save-failed state. On a real durable-write failure, the coordinator still surfaces `Save failed` + Retry.

- `apps/web/src/features/draft/hooks/useDraftActionHandlers.ts` — sign, scout, and big-board handlers persist before `loadDraft()`.
- `apps/web/src/features/minors/routes/MinorsPage.tsx` — `autosaveActiveGame()` before `fetchOverview()`, refresh guarded.
- `apps/web/src/features/trade/hooks/useTradeMultiTeamBuilder.ts` — `persistTradeSnapshot()` before `refreshAfterExecution()`, refresh guarded.

Regression tests (each asserts persistence ran before the rejecting refresh):
- `useDraftActionHandlers.test.tsx` → "persists an accepted signing before the room refresh, even when the refresh rejects".
- `MinorsPage.test.tsx` → "persists an applied plan before the overview refresh, even when the refresh rejects".
- `useTradeMultiTeamBuilder.test.tsx` → "persists an accepted framework before the refresh, even when the refresh rejects".

### P1-2 — Complete browser/reload proof for every touched high-emotion lane

See "Browser Proof — Review Block" below. Every touched high-emotion lane was proven action → Saved → hard reload with the effect persisting, plus a storage-failure/retry path.

### P2 — Storage-specific failure copy

The coordinator failure kind was a coarse `export | storage | unknown`. It is now `export | quota | indexeddb | storage | unknown`, classified from the error name/message, with durable-write failures defaulting to generic `storage`. TopBar renders distinct, `aria-live="assertive"` copy per kind with Retry, and exposes the raw `errorMessage` via `title` and the kind via `data-failure-kind`:

| failureKind | Player-facing copy |
|---|---|
| quota | Save failed — storage full |
| indexeddb | Save failed — browser database error |
| storage | Save failed — storage error |
| export | Save failed — could not read game |
| (none) | Save failed |

- `apps/web/src/shared/lib/activeSavePersistence.ts` — extended `ActiveSavePersistenceFailureKind` and `classifyPersistenceFailure`.
- `apps/web/src/app/layout/TopBar.tsx` — `describeSaveFailure()` + status rendering.

Regression tests:
- `activeSavePersistence.test.ts` → "classifies durable-write failures into distinct storage-family kinds" and "classifies a snapshot export failure before any durable write".
- `TopBar.test.tsx` → "maps each storage failure kind to distinct, accessible copy with retry".

## Summary

- Added a runtime-only main-thread active-save persistence coordinator around the existing worker `exportSnapshot()` and IndexedDB `saveGameById()` path.
- Added compact shell save status: `Saving...`, `Saved`, and `Save failed` with retry and `aria-live`.
- Routed source-confirmed TRUST-A lanes through the coordinator or active-save autosave helper: News, Trade, shell monthly/decision/ceremony/press, and existing draft/minors/roster autosave users.
- Added missing persistence after incoming trade accept/decline and accepted multi-team execution; rejected/no-op worker results do not create dirty/saving state.
- Preserved save schema v34. No snapshot `revision`, migration, service worker writer, new save engine, feature flag, route, CPU behavior, or event ledger change was added.

## Requirement Mapping

| Goal requirement | Result |
|---|---|
| Source truth and plan before production edits | `SOURCE_TRUTH.md` and `PLAN.md` were written before production edits. |
| One exact post-mutation snapshot | `persistActiveSaveSnapshot()` exports once per accepted call and binds that snapshot to the captured save id/slot metadata. |
| Ordered durable writes/latest wins | Coordinator tracks runtime desired/durable generations and serializes per save id. Older callers resolve only after the latest generation is durable. |
| Retry without rerunning mutation | Failed captured snapshot is retained and retried directly. Test verifies no re-export. |
| Stale failed retry supersession | Later captures replace the failed retry candidate for the same save. |
| Save-id ownership/active-save switch | Root and branch metadata are preserved; delayed export test proves the originally captured save id is used. |
| Truthful shell status | Top bar subscribes to coordinator state; failed status includes retry and does not show `Saved` while latest desired generation is not durable. |
| No-op/rejected skip persistence | Shell `success:false` results and rejected trade results skip autosave. |
| Browser reload trust | Desktop News and mobile sim/press flows survived hard reload after `Saved`; IndexedDB failure did not show `Saved` until retry succeeded. |
| Old saves/import/export compatible | No schema change; contracts migration and full snapshot regression tests passed. |

## Files

Docs:
- `docs/codex/runs/TRUST-A/SOURCE_TRUTH.md`
- `docs/codex/runs/TRUST-A/PLAN.md`
- `docs/codex/runs/TRUST-A/COMPLETION.md`

Shared persistence:
- `apps/web/src/shared/lib/activeSavePersistence.ts`
- `apps/web/src/shared/lib/activeSavePersistence.test.ts`
- `apps/web/src/shared/hooks/useActiveSavePersistenceStatus.ts`

Shell/status:
- `apps/web/src/app/layout/TopBar.tsx`
- `apps/web/src/app/layout/TopBar.test.tsx`
- `apps/web/src/app/layout/AppLayout.tsx`
- `apps/web/src/app/layout/AppLayout.test.tsx`
- `apps/web/src/app/layout/AppLayoutShellAutosave.test.tsx`

News and trade:
- `apps/web/src/features/news/hooks/useNewsRouteData.ts`
- `apps/web/src/features/news/hooks/useNewsRouteData.test.tsx`
- `apps/web/src/features/news/routes/NewsPage.test.tsx`
- `apps/web/src/features/trade/hooks/useTradeSnapshotPersistence.ts`
- `apps/web/src/features/trade/hooks/useTradeSnapshotPersistence.test.tsx`
- `apps/web/src/features/trade/hooks/useTradeActionHandlers.ts`
- `apps/web/src/features/trade/hooks/useTradeActionHandlers.test.tsx`
- `apps/web/src/features/trade/hooks/useTradeMultiTeamBuilder.ts`
- `apps/web/src/features/trade/hooks/useTradeMultiTeamBuilder.test.tsx`
- `apps/web/src/features/trade/hooks/useTradePageController.ts`
- `apps/web/src/features/trade/routes/TradePage.test.tsx`

Press persistence guard:
- `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts`
- `apps/web/src/workers/sim.worker.frontOfficeIdentity.test.ts`
- `apps/web/src/workers/sim.worker.actions.ts`
- `apps/web/src/workers/sim.worker.queries.ts`

Compatibility expectation updates:
- `apps/web/src/features/dashboard/routes/DashboardPage.test.tsx`

Note: the working tree still contains pre-existing unrelated modified/untracked files from before TRUST-A. They were preserved and are not claimed as this slice's output.

## Verification

| Command | Result |
|---|---|
| Baseline targeted web suite from `SOURCE_TRUTH.md` | 7 files, 44 tests passed; pre-existing React act warnings observed. |
| `npx pnpm@9.15.4 --filter @mbd/web test -- src/shared/lib/activeSavePersistence.test.ts` | 1 file, 7 tests passed after active-save switch test/type fix. |
| `npx pnpm@9.15.4 --filter @mbd/web test -- src/shared/lib/saveSystem.test.ts src/shared/lib/activeSavePersistence.test.ts src/workers/sim.worker.frontOfficeIdentity.test.ts src/features/draft/hooks/useDraftActionHandlers.test.tsx src/app/layout/AppLayoutShellAutosave.test.tsx src/app/layout/AppLayout.test.tsx src/app/layout/TopBar.test.tsx src/features/minors/routes/MinorsPage.test.tsx src/features/trade/hooks/useTradeSnapshotPersistence.test.tsx src/features/trade/hooks/useTradeActionHandlers.test.tsx src/features/trade/hooks/useTradeMultiTeamBuilder.test.tsx src/features/trade/hooks/useTradePageController.test.tsx src/features/trade/routes/TradePage.test.tsx src/features/news/hooks/useNewsRouteData.test.tsx src/features/news/routes/NewsPage.test.tsx src/features/dashboard/routes/DashboardPage.test.tsx` | 16 files, 116 tests passed. Existing act warning class observed. |
| `npx pnpm@9.15.4 --filter @mbd/contracts test -- tests/save.migration.test.ts` | 1 file, 22 tests passed. |
| `npx pnpm@9.15.4 --filter @mbd/sim-core test -- tests/smokeGate.integration.test.ts` | 1 file, 1 test passed. |
| `npx pnpm@9.15.4 run typecheck` | 9 tasks successful after fixing a test-only deferred resolver type. |
| `npx pnpm@9.15.4 run test` | 8 tasks successful; contracts 22, UI 1, sim-core 1643, web 1529 passed / 1 skipped. |
| `npx pnpm@9.15.4 run build` | 5 tasks successful. Turbo output warnings about missing output files are pre-existing configuration warnings. |
| `npx pnpm@9.15.4 run verify:determinism` | 1 file, 3 tests passed. |
| `rg -n "Math\\.random" apps packages --glob '!**/node_modules/**'` | Only documentation references in `packages/sim-core/AGENTS.md` and `apps/web/docs/lc6-launch-prep-audit.md`. |
| `git diff --check -- <TRUST-A files>` | No whitespace errors. |

Full test warnings remaining were pre-existing/non-blocking warning classes: React act warnings, chart dimension warnings, and the intentional service-worker registration failure log test.

## Browser Proof

Tooling: local Vite dev server at `http://localhost:5173/MBD/` with Chromium browser automation. Server was stopped after proof.

Desktop News success/failure/retry:
- Created a new Slot 1 dynasty through onboarding.
- Opened News with one unread item.
- Patched IndexedDB writes for the `saves` object store to fail and marked the story read.
- Observed `Save failed` with retry; `Saved` did not appear while writes were blocked.
- Restored IndexedDB writes, clicked Retry, observed `Saved`.
- Hard reload preserved the read state: unread queue remained at 0.

Mobile sim and press:
- Repeated at `390x844`.
- Sim Day advanced to Season 1, Day 2 with record `0-1`; `Saved` appeared; hard reload preserved Day 2 and record.
- With a press conference visible, blocked IndexedDB writes, delivered a response, observed `Save failed` and Retry above the modal.
- Restored writes, retried, observed `Saved`; hard reload preserved Fan Mood and the latest answer summary.
- After the press guard fix, the same answered press conference no longer reopened after reload.

## Browser Proof — Review Block (P1-2)

Tooling: local Vite dev server for **this** repo (`/Users/tkevinbigham/Downloads/MBD-main/apps/web`) on `http://localhost:5176/MBD/` via `.claude/launch.json` config `mbd-trustA`, driven with Chromium automation. A fresh Slot 1 dynasty (New York Tycoons, Quick Start) was created through onboarding. Durability was verified by reading the persisted `save-slot-1` snapshot directly from the `mbd-saves` IndexedDB `saves` store, and reload-survival by hard-reloading to the save hub, confirming `Continue`, and re-reading the snapshot. Server stopped after proof.

Every touched high-emotion lane proved action → truthful `Saved` → durable write (`updatedAt` advanced) → hard reload → effect remains:

| Lane | Action | Durable evidence | Reload result |
|---|---|---|---|
| Development-plan apply (P1-1) | Applied a development plan ("Rowan Zoric: mlb prep plan applied.") | Player `auth-nym-aaa-027` `developmentProgram: "mlb_prep"` in snapshot; `updatedAt` advanced; status `Saved`. | Program still `mlb_prep` after reload + Continue. |
| Draft signing (P1-1) | Reached Season 1 offseason draft, drafted + signed Parker Anderson with a 9.5 bonus offer. | `draftState.signingDecisions` entry `{playerId, offeredBonus: 9.5, signed: true, teamId: "nym"}`; unsigned picks 20→19; `updatedAt` advanced; status `Saved`. | Signing decision present after reload. |
| Multi-team trade execution (P1-1) | Built and executed a fairness-78 three-team cycle (NYT→PHI→BOS→NYT) in Season 2 regular season. | Players moved in snapshot: Upton nym→phi, Paredes phi→bos, Novak bos→nym; `updatedAt` advanced; status `Saved`. | All three players on new teams after reload. |
| Roster persistence | Demoted Griffin Korman (MLB→AAA) via the confirm dialog. | Korman `auth-nym-mlb-004` rosterStatus `AAA`; active-roster count 28→27; `updatedAt` advanced; status `Saved`. | Korman still `AAA` after reload. |
| Storage failure + retry + P2 copy | Patched `IDBObjectStore.put` for the `saves` store to throw `QuotaExceededError` during a development-plan apply. | TopBar showed `Save failed — storage full` (`data-failure-kind="quota"`, `aria-live="assertive"`, raw error in `title`); `Saved` never appeared while blocked. | Restored writes → Retry → `Saved` → durable write → reload preserved the applied plan. |

Reaching the draft and multi-team lanes required advancing game state through available in-app controls (Sim to Playoffs → playoffs → offseason draft for signing; Skip Phase through the offseason into Season 2's regular-season trade window for the multi-team modal, which is gated behind `tradeMarketOpen`). No game state was fabricated.

## Adversarial Review

P1 fixed: failed save retry could be visually present but blocked by shell modal overlay on mobile press flow. The failed status now uses a fixed high-z layer, and `TopBar.test.tsx` asserts the retry status layer.

P1 fixed: press response effects were persisted, but the same generated prompt could reappear after reload because the prompt was derived from current day context. Existing persisted press story flags now suppress same-day answered prompts, and duplicate responses return `success:false`.

P0 findings: none.

Unresolved P1 findings: none.

### Adversarial Review — Review Block (2026-06-20)

- Persistence/data safety: persist-before-refresh guarantees the accepted mutation's snapshot is captured/durable regardless of refresh outcome across all three P1-1 lanes. The display-only refresh guards (minors, multi-team, and the draft `loadDraft().catch`) swallow only the re-read failure, never the durable-write failure — a real write failure still flows through the coordinator to `Save failed` + Retry. Verified live by the quota-block lane. Rejected/no-op mutations still skip persistence (existing "does not persist rejected"/"does not autosave failed" tests remain green).
- Determinism/fairness: no RNG, `Date.now()` in sim paths, or unseeded randomness added; `verify:determinism` green; Math.random scan shows only documentation references.
- Test/UX quality: failure classification orders quota before indexeddb before generic storage; export failures classify as `export` with no Retry (nothing captured to retry), which is correct. The TopBar copy test exercises the rendering contract (distinct copy + Retry given `canRetry`) independent of the coordinator's per-kind retry policy.
- Scope: the scout and big-board draft handlers were reordered alongside signing because they share the identical persist-after-refresh defect in the same file/lane; no schema, migration, route, engine, or worker-decomposition change was introduced.

No P0/P1 findings remain after the review-block remediation.

## Compatibility And Rollback

Save schema impact: none. `CURRENT_GAME_SNAPSHOT_VERSION` remains 34; no migration or fixture shape change was required.

Rollback path:
- Revert the coordinator/status/lane files listed above.
- No save migration rollback is needed.
- Existing saves remain readable because this slice only changes runtime write coordination and route persistence calls.

## Review-Block Gate Run (2026-06-20 18:xx CDT)

| Command | Result |
|---|---|
| `pnpm@9.15.4 --filter @mbd/web test -- <5 review-block files>` | 5 files, 28 tests passed (was 22; +6 review-block regression tests). |
| `pnpm@9.15.4 --filter @mbd/web test` (full web package) | 437 files, 1535 passed / 1 skipped. |
| `pnpm@9.15.4 run typecheck` | exit 0. |
| `pnpm@9.15.4 run test` (full repo) | exit 0 (contracts 22, ui 1, sim-core suites, web suite). |
| `pnpm@9.15.4 run build` | exit 0. |
| `pnpm@9.15.4 run verify:determinism` | 3 tests passed. |
| `rg "Math\\.random" apps packages` (excl. node_modules) | Only documentation references in `packages/sim-core/AGENTS.md` and `apps/web/docs/lc6-launch-prep-audit.md`. |

## Residual Risks

- Browser proof was performed through live browser tooling rather than adding a permanent Playwright harness. This matches the plan assumption and did not hit the stop condition.
- The repository remains dirty with unrelated pre-existing work. This completion report only claims the TRUST-A files and behavior above.
- During the session a checkpoint commit (`MBD Phase 12: Checkpoint local TRUST and release work`) committed the pre-existing dirty tree together with the P1-1 minors/trade and P2 coordinator/TopBar changes and their tests. The draft-lane P1-1 change and these run docs remain uncommitted in the working tree. No commit or push was performed by this slice run; committing is left to the director.
