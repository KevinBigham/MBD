# GOAL.md — Sprint 3.5: Hard-reload state survival

> Single-mission contract for Codex (or any one-shot coding agent).
> Format: Goal Packet v2.0 — Kevin's one-shot ritual.
> Built on top of Sprint 3 ([PR #76](https://github.com/KevinBigham/MBD/pull/76)). Will rebase onto `main` once Sprint 3 merges.

## Mission

When a user hard-reloads any in-game route (`/dashboard`, `/roster`, `/trade`, `/draft`, `/news`, etc.), they are currently redirected to the Save Hub because `apps/web/src/app/layout/AppLayout.tsx:446` checks `useGameStore().isInitialized` and `useGameStore` is a plain Zustand store with no persistence. The user's read state, unread count, and current view are preserved in IndexedDB but **invisible behind the redirect**.

Fix it. Persist enough of `useGameStore` to `localStorage` (via Zustand `persist` middleware) so the active save id/slot survive a reload. On app boot, if the persisted save id resolves to a real IndexedDB record, auto-load it through the worker and call `initializeGame()` **before** `AppLayout`'s guard fires. While auto-loading, show a loading state. On error, clear the persisted state and fall through to Save Hub as today.

Stop only when every item in **Done When** is satisfied or a **Pause Condition** is hit.

## Background

Sprint 3's STATUS.md identified this as pre-existing app-wide behavior surfaced during news-inbox testing:

> `AppLayout` returns `<Navigate to="/" replace />` whenever `useGameStore().isInitialized` is false after a browser reload. `useGameStore` is a plain Zustand store with no persistence middleware, so `isInitialized` resets to `false` on every hard reload. This redirect fires on **every** in-game route — `/dashboard`, `/roster`, `/trade`, `/news` — not just news.

Sprint 2's `BrowserRouter basename` fix solved URL parsing (`/MBD/news` now resolves to the `/news` route). Sprint 3.5 solves the next layer up: **state hydration**, so the resolved route actually renders.

IndexedDB save state is already correct — the bug is purely in the boot sequence.

## Baseline

- This branch is built on top of Sprint 3 (`goal/sprint-3-news-inbox`, PR #76). When Sprint 3 merges to `main`, **rebase this branch onto the new main** before continuing: `git fetch origin && git rebase origin/main`.
- Save schema: `CURRENT_GAME_SNAPSHOT_VERSION = 33`. Do not bump.
- Test counts post-Sprint-3: web 99 files / 624 tests; sim-core 137/1610; contracts 1/20; UI 1/1.

## Read first

Inspect these before editing. Do not skip.

**Repo orientation:**
- `README.md`, `CHANGELOG.md`, `MASTER_CONTEXT.md`
- `GOAL.md` (this file)
- Sprint 3's `STATUS.md` — confirms the architectural diagnosis

**Core state + boot path:**
- `apps/web/src/shared/hooks/useGameStore.ts` — the Zustand store you'll add `persist` middleware to
- `apps/web/src/app/App.tsx` — the BrowserRouter shell where boot logic lands (Sprint 2 added the `basename`; build on top of that)
- `apps/web/src/app/layout/AppLayout.tsx` — confirms the `if (!isInitialized) return <Navigate to="/" replace />` redirect at line 446 and the worker-readiness gate above it
- `apps/web/src/app/routes/index.tsx` — confirms `/` is `SetupPage` and every in-game route is nested under `AppLayout`
- `apps/web/src/shared/lib/saveSystem.ts` — `loadSaveSafely`, `inspectSaveById`, `listSaves`, the Dexie schema. This is the I/O layer you'll call during boot.
- `apps/web/src/shared/hooks/useWorker.ts` — the worker bridge. You'll use `importSnapshot` (or whatever the canonical "load this save into the worker" method is — confirm from current code) to hydrate the worker before flipping `isInitialized`.
- `apps/web/src/features/setup/routes/SetupPage.tsx` — the Save Hub path that today calls `loadGameById` → worker hydrate → `initializeGame`. Read it to understand the **exact** sequence the auto-resume must mimic.

**Save recovery (DO NOT break):**
- `apps/web/src/features/save-recovery/SaveRecoveryProvider.tsx`
- `apps/web/src/features/save-recovery/SaveLoadErrorBoundary.tsx`
- `apps/web/src/features/save-recovery/SaveRecoveryDialog.tsx`
- `apps/web/src/features/save-recovery/__tests__/` (if present)

The recovery dialog already handles corrupt-save cases. Auto-resume must use the same path (`loadSaveSafely → SaveRecoveryProvider.showFailure on `{ ok: false }`) so corrupt saves don't crash the auto-load.

**Tests to study:**
- `apps/web/src/app/App.test.tsx`
- `apps/web/src/app/layout/AppLayout.test.tsx`
- `apps/web/src/features/setup/routes/SetupPage.test.tsx` — covers continue-existing-save; your auto-resume should produce the same end-state without a manual click
- `apps/web/src/shared/lib/saveSystem.test.ts`

## Product contract

Build the smallest complete fix that:

1. **Persists**: `useGameStore` exposes `activeSaveId`, `activeSaveSlot`, `userTeamId`, `season`, `day`, `phase`, `teamName`, `gmName`, `difficulty` to `localStorage` via Zustand's `persist` middleware. **Do not persist** `isInitialized`, `isSimulating`, `playerCount`, `gamesPlayed`, or any function-typed fields — those derive from the worker after hydration.
2. **Auto-resumes on boot**: When the React tree mounts, if `useGameStore.activeSaveId` is non-null AND a save with that id exists in IndexedDB, kick off an auto-load. The auto-load:
   - Calls `loadSaveSafely(activeSaveId)`.
   - On `{ ok: true }`, calls `worker.importSnapshot(save.snapshot)` (or the equivalent canonical method), then `useGameStore.initializeGame(...)` with the post-import worker state.
   - On `{ ok: false }`, hands off to `SaveRecoveryProvider.showFailure` (same path Save Hub uses).
   - On any worker/IndexedDB error, clears the persisted state and falls through to Save Hub. Toast the user briefly.
3. **Loading state**: While the auto-load is in flight, show a route-level "Resuming…" skeleton (NOT the Save Hub). When done, the user lands on the route they hard-reloaded into. If they hard-reloaded `/news`, they end up on `/news`. If they hard-reloaded `/dashboard`, they end up on `/dashboard`.
4. **First-time and post-clear behavior unchanged**: If `useGameStore.activeSaveId` is null (no prior save, or persisted state cleared), the app boots to Save Hub as today.
5. **SaveHub still wins manual loads**: When the user navigates to `/` and clicks a save, the existing flow runs and updates the persisted store. No regression to the manual continue path.

Prefer:
- working over broad — get one hard-reload route (e.g. `/news`) surviving end-to-end before declaring victory across all routes;
- composition over invention — reuse `loadSaveSafely`, `SaveRecoveryProvider`, existing worker methods;
- no new dependencies;
- the smallest diff that satisfies the contract.

## Allowed write scope

Write only inside:
- `apps/web/src/shared/hooks/useGameStore.ts` — add `persist` middleware, declare the persisted slice, write the persistence config
- `apps/web/src/app/App.tsx` — add the boot-time auto-resume hook + a route-level loading state. May extract a small `<AppBootGate>` wrapper component if the diff stays small
- `apps/web/src/app/layout/AppLayout.tsx` — minimal change only if necessary (e.g. to render `<Outlet />` once `isInitialized` flips). If you can avoid touching this file, prefer that.
- New files under `apps/web/src/app/boot/` (e.g. `useAutoResumeSave.ts`, `AppBootGate.tsx`) if needed
- Test files matching the above paths
- `.logs/goal-progress.md`
- `STATUS.md` (rewrite for Sprint 3.5)
- `GOAL.md` (this file — minor edits only)
- `apps/web/docs/screenshots/sprint-3-5/` — browser smoke evidence

## Protected scope

Do not modify:
- `packages/sim-core/**`
- `packages/contracts/**`
- `apps/web/src/workers/**` — worker methods stay as-is; you call them, you don't change them
- `apps/web/src/features/save-recovery/**` — the recovery dialog already does the right thing; auto-resume must integrate with it, not modify it
- `apps/web/src/features/setup/**` — Save Hub's manual continue path stays unchanged
- `apps/web/src/features/news/**` — Sprint 3 just shipped; preserve it
- `apps/web/src/features/onboarding/**` — Sprint 2 just shipped; preserve it
- `apps/web/src/shared/lib/saveSystem.ts` — read-only; persistence helpers already exist
- `apps/web/src/shared/lib/audio.ts`, `logger.ts`, `webVitals.ts`, etc.
- `.github/**`, `package.json` (root), `turbo.json`, `pnpm-workspace.yaml`
- `apps/web/src/build/bundleConfig.ts`, `apps/web/docs/BUDGETS.md`

## Non-negotiables

- **Schema v33.** No bump, no migration.
- **Determinism.** No `Math.random()`. No new RNG paths.
- **No new dependencies.** Zustand's `persist` middleware ships with the `zustand` package already in `apps/web/package.json` — use `import { persist, createJSONStorage } from 'zustand/middleware'`.
- **No emoji.** lucide-react icons only. Bloomberg Terminal aesthetic.
- **Do not delete or weaken tests** to make checks pass. New tests required for the auto-resume flow.
- **Save Recovery must still trigger** on corrupt saves during auto-resume.
- **Manual Save Hub flow must be unchanged.** Existing SetupPage.test.tsx assertions still pass.
- **localStorage namespace**: use a stable key (e.g. `mbd:game-store@v1`). If you ever need to invalidate the persisted shape, bump the suffix — do **not** silently change it.
- **Privacy**: persist only the minimal fields above. Do NOT persist the full snapshot, player data, or any large blob in localStorage — IndexedDB owns the heavy data.
- **No commits on `main`.** Work only on `goal/sprint-3-5-hard-reload-survival`.
- **No `git add -A`.**

## Milestone loop

For each milestone: inspect → state checkpoint → smallest change → smallest validation → fix → log to `.logs/goal-progress.md`.

Suggested milestones:

1. **Inventory.** Read every file in "Read first." Document the exact sequence Save Hub uses today to continue a save (which worker method hydrates the snapshot? what order does `initializeGame` get called in?). Map the auto-resume to the same sequence.
2. **Persist `useGameStore`.** Add `persist` middleware with `createJSONStorage(() => localStorage)`. `partialize` to only the persisted slice listed above. Bump the version key if needed. Confirm `useGameStore` still works in tests with a localStorage mock.
3. **Auto-resume hook.** New `useAutoResumeSave` (or in-file hook in `App.tsx`) that runs once at app mount: read `activeSaveId` from the store, if present call `loadSaveSafely`, then hydrate the worker, then call `initializeGame`. Handle the `SaveRecoveryProvider.showFailure` case. Handle generic errors by clearing `activeSaveId` from the store.
4. **Boot loading state.** While the auto-resume is in flight, render a small route-level "Resuming…" skeleton. Do NOT show the Save Hub. Do NOT show the dashboard half-loaded. When done, the route renders normally — react-router preserves the URL across the hydration because we never navigated.
5. **Tests.** Add:
   - `App.test.tsx` (or a new `useAutoResumeSave.test.ts`): with a persisted `activeSaveId` and a mock save in IndexedDB, the app hydrates and renders the in-game route, not Save Hub.
   - With a persisted `activeSaveId` but no IndexedDB record, the persisted state clears and the user lands on Save Hub.
   - With a corrupt save, the SaveRecoveryDialog appears.
   - Without a persisted `activeSaveId`, behavior is unchanged (Save Hub).
6. **Verify gate.** `pnpm typecheck`, `pnpm test`, `pnpm build`.
7. **Browser smoke.**
   - Start dev server.
   - Complete onboarding into Slot 1.
   - Land on dashboard.
   - Hard reload `/MBD/dashboard` → should land back on dashboard (not Save Hub).
   - Navigate to `/news`, hard reload `/MBD/news` → should land back on news.
   - Navigate to `/roster`, hard reload → roster.
   - Navigate to `/trade`, hard reload → trade.
   - Clear IndexedDB → hard reload `/MBD/dashboard` → should land on Save Hub (graceful recovery).
   - Capture screenshots for each scenario.
8. **STATUS.md.** Rewrite for Sprint 3.5.

Each `.logs/goal-progress.md` entry: timestamp, milestone, files changed, checks run, result, blocker or next step.

## Validation loop

Workspace root commands:

```
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev
```

Targeted:

```
pnpm --filter @mbd/web test src/app/App.test.tsx
pnpm --filter @mbd/web test src/app/layout/AppLayout.test.tsx
pnpm --filter @mbd/web test src/features/setup/routes/SetupPage.test.tsx
pnpm --filter @mbd/web test src/shared
```

Browser flow (full smoke):

1. `pnpm --filter @mbd/web dev`
2. Open `http://localhost:5173/MBD/`
3. Complete a new dynasty through onboarding → land on `/dashboard`
4. Hard-reload `/MBD/dashboard` → expect dashboard renders, not Save Hub
5. Navigate to `/news` → confirm the unread count and items match pre-reload state
6. Hard-reload `/MBD/news` → expect news renders, not Save Hub
7. Repeat for `/MBD/roster`, `/MBD/trade`, `/MBD/draft`
8. In DevTools, clear IndexedDB for `mbd-saves` → hard-reload → expect graceful fallback to Save Hub
9. In DevTools, set `localStorage` for `mbd:game-store@v1` to point at a non-existent save id → hard-reload → expect persisted state clears + Save Hub
10. At 375×667 viewport, hard-reload `/MBD/dashboard` → no layout shift larger than a brief skeleton

## Evaluator-visible proof

Before declaring done, the transcript and `STATUS.md` must contain:

- Exact commands run and pass/fail
- Output summaries (test counts, build duration, bundle sizes — bundle should be unchanged or tiny)
- Browser steps walked with screenshots under `apps/web/docs/screenshots/sprint-3-5/`
- A `git diff --stat origin/main..HEAD` showing changes stayed inside allowed scope
- localStorage snapshot before/after a reload (key + minimal value, no PII)
- Confirmation that SaveHub manual continue still works (existing SetupPage.test.tsx assertions still pass)

## Autonomy rules

When picking between:
- (a) a `useAutoResumeSave` hook called inside `App.tsx`
- (b) a wrapping `<AppBootGate>` component

Pick whichever has the smaller diff in tests too. Both are valid.

When designing the "Resuming…" loading state, match the existing Suspense fallback (`LoadingFallback` in `apps/web/src/app/routes/index.tsx` — the MBD pulse + "Loading route..." pattern). Don't invent new spinners.

When a persisted save id doesn't resolve in IndexedDB, **clear** `useGameStore` (call a new `clearActiveSave` action or `setActiveSave(null, null)`). Do NOT keep stale ids around.

When a worker error happens during hydration, route through `SaveRecoveryProvider.showFailure` with a synthetic `{ ok: false, reason: 'storage_failed', detail: ... }` so the user sees the same dialog they'd see from a manual load.

Log assumptions in `.logs/goal-progress.md` and continue.

## Pause conditions

Pause and write the blocker into `STATUS.md` only when:

- The auto-resume requires a sim-core change.
- The auto-resume requires a worker-side method that doesn't exist.
- A persistence-shape change requires bumping save schema (it shouldn't — localStorage is independent of `GameSnapshot`).
- The same validation fails 3 times after serious repair attempts.
- A protected file must be modified beyond `AppLayout.tsx`'s minimal touch (and even that touch should be avoided if possible).
- Save Hub's manual continue path breaks and you can't restore parity in 2 fix attempts.

## Done when

All of the following are true:

- `useGameStore` persists to `localStorage` via Zustand `persist` with a versioned key.
- On app boot, if a persisted `activeSaveId` resolves in IndexedDB, the app auto-loads it and renders the user's previous route — **NOT** Save Hub.
- A "Resuming…" loading state shows while auto-load is in flight.
- Corrupt saves trigger `SaveRecoveryDialog` (unchanged from today's manual-load behavior).
- Missing saves clear the persisted state and fall through to Save Hub.
- The Save Hub manual continue path is unchanged (existing tests pass).
- Hard reload at `/MBD/dashboard`, `/MBD/news`, `/MBD/roster`, `/MBD/trade` all render the route, not Save Hub.
- `pnpm typecheck` clean (all tasks).
- `pnpm test` clean (no test deleted or weakened; new tests added for the auto-resume flow).
- `pnpm build` clean (bundleBudget.test.ts passes; budget journal untouched).
- Browser smoke walked end-to-end with screenshots under `apps/web/docs/screenshots/sprint-3-5/`.
- `.logs/goal-progress.md` contains the milestone log.
- `STATUS.md` exists with the final report.
- Branch is on `goal/sprint-3-5-hard-reload-survival`.

## Final report

`STATUS.md` (rewrite from scratch) must include, in order:

1. **What shipped** — one paragraph summary.
2. **Files changed** — `git diff --stat origin/main..HEAD` output.
3. **Validations run** — exact commands and results.
4. **Browser evidence** — screenshots under `apps/web/docs/screenshots/sprint-3-5/` with captions; localStorage key/value before & after; a list of routes you hard-reloaded successfully.
5. **Save Recovery integration** — confirmation that corrupt saves still hit the dialog.
6. **Known limitations** — anything out of scope you noticed.
7. **Risks** — what could break in production and what to watch (e.g. quota, localStorage disabled in private mode).
8. **Rollback notes** — revert the merge commit; localStorage entries will be ignored on the old code path.
9. **Next /goal** — exact paste-ready prompt for **Sprint 4** (the audit's original next pick: wire orphaned player-profile + open-negotiations endpoints). Claude Code will draft that GOAL.md after Sprint 3.5 merges.

## Branch + commit hygiene

- Branch: `goal/sprint-3-5-hard-reload-survival` (built on top of `goal/sprint-3-news-inbox`). When Sprint 3 merges to `main`, rebase this branch.
- Stage specific files; never `git add -A`.
- Commit prefixes: `feat(app):` for the boot logic, `feat(store):` for `useGameStore` persistence, `test(app):` for tests, `docs(app):` for docs.
- Co-author trailer on each commit:

  ```
  Co-Authored-By: Codex GPT-5 <noreply@openai.com>
  ```

- When done, push and open PR titled `Sprint 3.5 — Hard-reload state survival`. Body summarizes against this GOAL.md and links Sprint 3 PR #76 for lineage.

## Out of scope (do not attempt this sprint)

- Granular player-profile endpoints (Sprint 4)
- Open-negotiations resume pane (Sprint 4)
- Press conference unification (Sprint 5)
- Invariant runtime checks in DEV (Sprint 6)
- Moving narrative generation off main thread (Sprint 6)
- Team logo SVGs (Sprint 7)
- Anything that touches `packages/sim-core/` or `packages/contracts/`
- Service worker changes
- Adding new dependencies

---

*End of GOAL.md. Companion `/goal` slash command lives in Sprint 3.5's PR description and in Kevin's conversation with Claude Code.*
