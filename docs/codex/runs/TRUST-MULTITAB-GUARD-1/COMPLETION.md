# TRUST-MULTITAB-GUARD-1 — Completion

Status: ready to land on local `main` after scoped commit verification.

## Outcome and acceptance mapping

Item 5 is complete: one supported same-origin browser document owns a root save tree (root, branch, and sibling what-if saves); a contender stops before worker import/gameplay, shows a blocking `Dynasty already open` surface, and can freshly acquire and load after the owner closes.

- Web Locks authority and root-tree aliasing: `apps/web/src/shared/lib/saveSessionOwnership.ts`, `saveSystem.ts`, and their session/topology tests.
- Boot/setup/settings/recovery and destructive-operation integration: `AppBootGate.tsx`, setup/settings hooks, `SaveRecoveryProvider.tsx`, `activeSavePersistence.ts`, and `saveSystem.ts`.
- Pre-worker and central mutation defense: `useWorker.ts`, `workerMutationSession.ts`, persistence/storage assertions, and focused race tests.
- Blocking accessible conflict UX: `apps/web/src/features/save-session/` plus conflict and boot tests; desktop and 375x667 proof is in `apps/web/e2e/multitab-guard.spec.ts`.
- Owner background/retry/close/fresh-load/mutation/hard-reload proof: dedicated production-preview Chromium test passed 1/1 without retry.
- Save/determinism compatibility: GameSnapshot remains v34, Dexie remains v5, no save schema/store/dependency/simulation/RNG change; full tests, build/PWA, determinism, and reload-smoke passed.
- Mixed-version honesty: `CHANGELOG.md` says already-running pre-guard tabs must close/reload and are not protected.

## Changed-file inventory

Item-5-owned changes staged for this closeout are the implementation, tests, E2E proof/config, changelog, goal, plan, source truth, and this completion report:

- `CHANGELOG.md`
- `apps/web/playwright.config.ts`
- `apps/web/e2e/multitab-guard.spec.ts`
- `apps/web/src/app/{App.tsx,boot/AppBootGate.tsx,boot/AppBootGate.test.tsx,layout/AppLayout.tsx,layout/AppLayout.test.tsx,routes/index.tsx}`
- `apps/web/src/features/{pulse/hooks/usePulseRouteData.ts,pulse/hooks/usePulseRouteData.test.tsx,pulse/routes/PulsePage.tsx,save-recovery/SaveRecoveryProvider.tsx,save-recovery/__tests__/SaveRecoveryProvider.test.tsx,save-session/*,settings/**,setup/**}`
- `apps/web/src/shared/hooks/{useActiveSaveAutosave.ts,useGameStore.ts,useGameStore.test.ts,useWorker.ts,useWorker.saveSession.test.tsx}`
- `apps/web/src/shared/lib/{activeSavePersistence.ts,activeSavePersistence.test.ts,activeSavePersistence.session.test.ts,saveSystem.ts,saveSessionOwnership.ts,saveSessionOwnership.test.ts,saveSessionStorageDefense.test.ts,saveSessionTarget.test.ts,saveSessionTransitionRecovery.ts,saveSessionTransitionRecovery.test.ts,workerMutationSession.ts,workerMutationSession.test.ts}`
- `docs/codex/goals/17_TRUST_MULTITAB_GUARD_1.md`
- `docs/codex/runs/TRUST-MULTITAB-GUARD-1/{SOURCE_TRUTH.md,PLAN.md,COMPLETION.md}`

The only mechanical test-harness edit made during closeout was completion of missing exports in `apps/web/src/features/setup/routes/SetupPage.test.tsx`; it does not alter production behavior.

## Gate matrix

All commands were run and observed in the current worktree on 2026-07-11:

| Command | Result |
|---|---|
| Focused ownership/transition/boot/setup/settings/recovery/conflict/worker/persistence/Pulse Vitest matrix | 16 files, 137/137 passed |
| `pnpm typecheck` | 9/9 Turbo tasks passed |
| `pnpm test` | 5 packages passed; contracts 22/22, sim-core 140 files/1,646 tests, web 451 files/1,823 tests, UI 1/1; web 2 skipped tests were expected existing skips |
| `pnpm build` | 5/5 tasks passed; web 3,020 modules; PWA 166 precache entries |
| `pnpm verify:determinism` | 1 file, 3/3 passed |
| `pnpm --filter @mbd/web exec playwright test e2e/multitab-guard.spec.ts --config=playwright.config.ts` | Chromium 1/1 passed in 11.0s, no retry |
| `pnpm e2e:reload-smoke` | Chromium 2/2 passed in 5.0m; multitab plus four-mutation reload journey |
| `git diff --check` | passed |
| Forbidden/scope/conflict scans | no production `Math.random`, Web Locks `steal`, lease/TTL authority, schema/version bump, dependency, item-6 drift, or conflict markers; unrelated pre-existing words/clock uses were excluded and documented in the run log |

## Negative control and restoration

The required negative control was already performed and restored before closeout: `workerMutationSession.ts` was temporarily changed from `if (activePause)` to `if (false && activePause)`. The focused worker suite then failed exactly at `rejects new gameplay mutations until the exact transition pause ends` because the expected `not_owner` error was absent. The exact guard was restored with `apply_patch`; the same suite passed 2/2. Final source verification shows `if (activePause)` and no `false && activePause`; the protected source file has no residual diff.

## Sol findings and fixes

Sol’s final P0–P2 review was `MERGE_READY` with no remaining P0–P2. The corrected findings were:

- occupied Retry needed proof of an actual fresh native lock request: added the test-only duplicate-page request probe and asserted disabled/`aria-busy`/`Checking` then returned contended state;
- blocked Space needed a public no-mutation proof: browser proof presses Space and confirms no gameplay shell/control and unchanged integrity pair;
- post-import `not_owner` needed truthful mapping: added the `ownership_lost` conflict kind/copy and boot/component regression coverage.

Earlier adversarial findings were also closed: transition worker fencing, exact-save callback binding, branch/delete overlap, stale recovery takeover, failed-new-game worker cleanup, candidate/transient separation, operation blocking, recovery supersession, and kind-aware failure copy.

## Route table and Relay retrospective

| Role | Thread ID | Model | Effort | Status |
|---|---|---|---|---|
| Terra implementation | `019f51c9-0ee1-78d3-905b-a886682da9b9` | `gpt-5.6-terra` | high | `CORRECTIONS_READY` |
| Sol coordinator/review | `019f51c7-4ff9-7b13-8b14-d0120e47225c` | `gpt-5.6-sol` | xhigh | `MERGE_READY` |
| Luna closeout writer | `019f51e1-1211-7ef0-9bae-196c316e9588` | unchanged from delegated route | unchanged | closeout/landing |

Relay retrospective: Terra supplied the implementation and focused evidence; Sol’s adversarial pass found the last proof/copy gaps; Luna reconciled the live tree, repaired only the stale test mock exposed by the final matrix, ran the complete gates, wrote the artifacts, and will verify the single scoped landing. No new behavior, item 6, GOAT roadmap status, push, deploy, release, or tag was started.

## Compatibility, limitations, and residual risks

- No GameSnapshot or Dexie migration; v34 and Dexie v5 remain current. Locks/session UI are ephemeral and outside SaveData, integrity projection, export, simulation truth, and event IDs.
- Web Locks is same-origin and browser-owned. Insecure/unsupported/rejected API paths fail closed; cross-device, cross-origin, malicious same-origin callers, and callers using `steal` are outside the accidental-race promise.
- A pre-item-5 build already running cannot be fenced by code it does not contain. Users must close/reload older open tabs before relying on protection; this is stated in the changelog.
- There is no collaborative sync, read-only mode, forced takeover, lease expiry, persistent lock row, BroadcastChannel election, storage-pressure UX, write-ahead journal, or item-6 export matrix.

## Rollback

To roll back locally, revert the single item-5 commit after confirming the worktree is clean except for the three protected dirty files. Before rollback, close/reload all guarded MBD tabs; after rollback, the older build has no multi-tab fencing. Do not reset, clean, force-push, or overwrite the protected files.

## Landing verification target

Commit message: `Add exclusive multi-tab save guard`.

After commit, verify the commit contains only the inventory above, the three protected files are absent from the index and remain dirty, then run `git switch main` and `git merge --ff-only codex/multitab-guard-5`. Final `main` HEAD must equal the item-5 commit, with an empty index and the three protected files still dirty/unstaged.
