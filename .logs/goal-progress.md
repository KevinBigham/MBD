# Sprint 2 Goal Progress

## 2026-05-14 20:51 - Sprint 3.5 Milestone 1 Inventory

Workspace: `/Users/tkevinbigham/MBD-main`
Branch: `goal/sprint-3-5-hard-reload-survival`

Files inspected:

- Root orientation: `README.md`, `CHANGELOG.md`, `MASTER_CONTEXT.md`, prior `STATUS.md`, `GOAL.md`.
- Boot/store/routing: `apps/web/src/shared/hooks/useGameStore.ts`, `apps/web/src/app/App.tsx`, `apps/web/src/app/layout/AppLayout.tsx`, `apps/web/src/app/routes/index.tsx`.
- Save and worker path: `apps/web/src/shared/lib/saveSystem.ts`, `apps/web/src/shared/hooks/useWorker.ts`, `apps/web/src/workers/sim.worker.actions.ts`.
- Manual load reference: `apps/web/src/features/setup/routes/SetupPage.tsx`, `apps/web/src/features/setup/routes/SetupPage.test.tsx`.
- Save Recovery reference: `apps/web/src/features/save-recovery/SaveRecoveryProvider.tsx`, `SaveLoadErrorBoundary.tsx`, `SaveRecoveryDialog.tsx`, and save-recovery tests.

Current manual continue sequence:

- Save Hub root save path calls `loadSaveSafely(slot)`.
- On `{ ok: false }`, it calls `SaveRecoveryProvider.showFailure(...)` with delete/retry callbacks.
- On `{ ok: true }`, it calls `worker.importSnapshot(result.snapshot)`.
- On import success, it calls `useGameStore.initializeGame(...)` with worker-returned season/day/phase/player/team fields plus `activeSaveId: save.id` and `activeSaveSlot: save.slotNumber`, then navigates to `/dashboard`.
- Branch saves use `inspectSaveById(save.id)` then the same `worker.importSnapshot` and `initializeGame` shape.

Sprint 3.5 implementation map:

- Persist only the allowed useGameStore shell fields under `mbd:game-store@v1`.
- Add an app boot gate that blocks route rendering with a "Resuming save..." skeleton when an active save id is present but the store is not initialized.
- Auto-load with `loadSaveSafely(activeSaveId)`, `worker.importSnapshot(snapshot)`, then `initializeGame(...)` so `AppLayout` never redirects hard-reloaded in-game routes to `/`.
- Missing save ids clear the active save id and fall through to the Save Hub.
- Corrupt saves call Save Recovery through the existing provider path.

Files changed:

- `.logs/goal-progress.md`

Checks run:

- Inventory only. Next: add red tests for persistence and boot auto-resume.

## 2026-05-14 20:52 - Sprint 3.5 Milestone 2 Red Tests

Files changed:

- `apps/web/src/shared/hooks/useGameStore.test.ts`
- `apps/web/src/app/boot/AppBootGate.test.tsx`

Red test proof:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/shared/hooks/useGameStore.test.ts src/app/boot/AppBootGate.test.tsx` -> FAIL as expected.
- Failure 1: `useGameStore` did not expose `GAME_STORE_STORAGE_KEY` / versioned persisted state, so `persisted.version` was `undefined`.
- Failure 2: `apps/web/src/app/boot/AppBootGate.tsx` did not exist, proving the missing boot gate.

## 2026-05-14 20:54 - Sprint 3.5 Milestone 3 Persisted Store + Boot Gate

Files changed:

- `apps/web/src/shared/hooks/useGameStore.ts`
- `apps/web/src/shared/hooks/useGameStore.test.ts`
- `apps/web/src/app/boot/AppBootGate.tsx`
- `apps/web/src/app/boot/AppBootGate.test.tsx`
- `apps/web/src/app/App.tsx`
- `apps/web/src/app/App.test.tsx`

Implementation:

- Added Zustand `persist` middleware to `useGameStore` under `mbd:game-store@v1`.
- `partialize` persists only `activeSaveId`, `activeSaveSlot`, `userTeamId`, `season`, `day`, `phase`, `teamName`, `gmName`, and `difficulty`.
- Added `AppBootGate` around the router. When a persisted active save id exists and the app is not initialized, it blocks route rendering with `Resuming save...`, runs `loadSaveSafely(activeSaveId)`, imports the snapshot through `worker.importSnapshot`, and calls `initializeGame(...)` before `AppLayout` can redirect.
- Missing save ids clear `activeSaveId`/`activeSaveSlot` and fall through to Save Hub.
- Corrupt save load results go to `SaveRecoveryProvider.showFailure(...)`; worker/import exceptions synthesize a `storage_failed` recovery failure and clear stale active-save state.

Focused validation:

- First focused run after implementation failed only because the store test replaced `localStorage` after Zustand captured the original jsdom storage object.
- Fixed the test to use jsdom's actual `window.localStorage`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/shared/hooks/useGameStore.test.ts src/app/boot/AppBootGate.test.tsx src/app/App.test.tsx` -> PASS. 3 files / 8 tests.

## 2026-05-14 20:58 - Sprint 3.5 Milestone 4 Verification Gate

Validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS. Turbo reported `Tasks: 9 successful, 9 total` in `5.418s`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` -> PASS. Turbo reported `Tasks: 8 successful, 8 total` in `1m23.712s`; web passed 101 files / 629 tests, sim-core passed 137 files / 1610 tests, contracts passed 1 file / 20 tests, UI passed 1 file / 1 test. Existing non-fatal console noise remained: Recharts zero-size warnings, React `act(...)` warnings, service worker failure-test log, and the existing ScoutingPage mock-function log.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build` -> PASS. Turbo reported `Tasks: 5 successful, 5 total` in `4.134s`; Vite built in `3.28s`; PWA precached 120 entries.

## 2026-05-14 21:03 - Sprint 3.5 Milestone 5 Browser Smoke

Dev server:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev` -> PASS at `http://localhost:5173/MBD/`.

In-app Browser smoke:

- Continued existing Slot 1 from Save Hub to `/MBD/dashboard`.
- Hard reload `/MBD/dashboard` -> stayed on dashboard, not Save Hub.
- Hard reload `/MBD/news` -> stayed on News Inbox, not Save Hub.
- Hard reload `/MBD/roster` -> stayed on Roster, not Save Hub.
- Hard reload `/MBD/trade` -> stayed on Trade Center, not Save Hub.
- Hard reload `/MBD/draft` -> stayed on Draft Room, not Save Hub.
- Deleted the active Slot 1 save through Save Hub, then navigated to `/MBD/dashboard`; stale persisted id cleared and the app fell through to Save Hub.

Screenshots:

- `apps/web/docs/screenshots/sprint-3-5/01-dashboard-before-hard-reload.png`
- `apps/web/docs/screenshots/sprint-3-5/02-dashboard-after-hard-reload.png`
- `apps/web/docs/screenshots/sprint-3-5/03-news-before-hard-reload.png`
- `apps/web/docs/screenshots/sprint-3-5/04-news-after-hard-reload.png`
- `apps/web/docs/screenshots/sprint-3-5/05-roster-after-hard-reload.png`
- `apps/web/docs/screenshots/sprint-3-5/06-trade-after-hard-reload.png`
- `apps/web/docs/screenshots/sprint-3-5/07-draft-after-hard-reload.png`
- `apps/web/docs/screenshots/sprint-3-5/08-save-hub-after-delete-slot.png`
- `apps/web/docs/screenshots/sprint-3-5/09-missing-save-fallback-save-hub.png`
- `apps/web/docs/screenshots/sprint-3-5/10-corrupt-save-recovery-dialog.png`
- `apps/web/docs/screenshots/sprint-3-5/11-dashboard-mobile-375-after-hard-reload.png`

Additional Playwright evidence:

- Exact `localStorage` snapshot before and after dashboard hard reload stayed the same:
  `{"state":{"activeSaveId":"save-slot-1","activeSaveSlot":1,"userTeamId":"nym","season":1,"day":1,"phase":"preseason","teamName":"New York Tycoons","gmName":"Mobile Smoke","difficulty":"standard"},"version":1}`
- 375x667 dashboard hard reload metrics: `innerWidth=375`, `innerHeight=667`, `clientWidth=375`, `scrollWidth=375`, `hasSaveHub=false`, `hasDashboard=true`.
- Corrupt persisted save proof: injected a malformed `save-slot-corrupt` record and matching localStorage id; reload showed the recovery dialog actions and cleared persisted active save to:
  `{"state":{"activeSaveId":null,"activeSaveSlot":null,"userTeamId":"nym","season":1,"day":1,"phase":"preseason","teamName":"New York Tycoons","gmName":"Smoke Tester","difficulty":"standard"},"version":1}`

Workspace: `/Users/tkevinbigham/MBD-main`
Branch: `goal/sprint-2-revised-onboarding`
Date: 2026-05-14

## 2026-05-14 15:18 - Milestone 1 Inventory

Files inspected:

- Root orientation: `README.md`, `CHANGELOG.md`, `MASTER_CONTEXT.md`, `GOAL.md`, `package.json`, `turbo.json`, `pnpm-workspace.yaml`.
- Web config: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`.
- Route and UI: `apps/web/src/app/routes/index.tsx`, `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx`, `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.test.tsx`, `apps/web/src/features/onboarding/components/**`, `apps/web/src/features/onboarding/nudges/**`, `apps/web/src/features/onboarding/__tests__/guidedStartNudges.test.tsx`.
- Worker bridge: `apps/web/src/workers/sim.worker.ts`, `apps/web/src/workers/sim.worker.onboarding.ts`, `apps/web/src/shared/hooks/useWorker.ts`, `apps/web/src/workers/snapshot.ts`, `apps/web/src/workers/sim.worker.onboarding.test.ts`, `apps/web/src/workers/snapshot.onboarding.test.ts`.
- Note: `apps/web/src/workers/snapshot.onboarding.ts` is named in `GOAL.md`, but no such file exists in this checkout.
- Protected sim-core/contract read-only files: `packages/sim-core/src/onboarding/index.ts`, `dayOne.ts`, `agmCandidates.ts`, `flowEngine.ts`, `scriptOrchestrator.ts`, `staffHiring.ts`, `staffEvaluation.ts`, `scoutingBriefing.ts`, `chapterDialogue.ts`, `roundThreeDialogue.ts`, `choiceReactions.ts`, `rosterAssessment.ts`, `farmAssessment.ts`, `financialPlaybook.ts`, `seasonStrategy.ts`, `ownerMeeting.ts`, `pressConference.ts`, `assistantGM.ts`, `packages/contracts/src/schemas/save.ts`, `packages/contracts/src/schemas/franchise.ts`, and onboarding-named sim-core tests.

Repo state:

- `git status --short --branch`: on `goal/sprint-2-revised-onboarding`; pre-existing modified file is `.claude/launch.json`.
- `git log -1 --oneline`: `a068e41 docs(goal): add Sprint 2 mission contract — revised onboarding canonical`.
- User confirmed the `.claude/launch.json` dirty file locally; it remains untouched.

Current Day-One worker surface:

- `apps/web/src/workers/sim.worker.onboarding.ts` exports `getDayOneSession`, `advanceDayOneIntro`, `chooseDayOneAGM`, `advanceDayOneOrgReview`, `setDayOneSeasonGoal`, `setDayOneBudgetAllocation`, `setDayOneOpeningPlan`, `setDayOneDevelopmentPlan`, `resolveDayOneCrisis`, and `finishDayOne`.
- `apps/web/src/workers/sim.worker.ts` imports those methods and exposes them in `onboardingApi`.
- `apps/web/src/shared/hooks/useWorker.ts` marks the Day-One mutations in `mutationMethods`, wraps each Day-One method, and returns them from `useWorker()`.
- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx` currently calls the Day-One methods throughout the page.

Current Revised worker surface:

- `getAGMCandidates()` returns the three fixed `AGM_CANDIDATES`.
- `getRevisedOnboardingData(agmId)` builds `RevisedOnboardingData`, seeds the worker-side `revisedOnboardingDraft`, and returns `script`, `chapterData`, `staffSlate`, and `scoutingSlate`.
- `applyStaffHires(hires)` validates/stages coach hires against the generated staff slate.
- `applyScoutingHire(scoutingDirectorId)` validates/stages the scouting director against the generated scouting slate.
- `completeRevisedOnboarding(result)` applies final staff/scout hires, sets `franchise.assistantGMId`, `franchise.scoutingDirector`, `franchise.gmPhilosophy`, marks `franchise.onboarding.welcomeBriefingSeen`, and returns `flowStateChanged: true`.

Revised flow shape:

- `REVISED_CHAPTER_ORDER` from sim-core is: `agm_selection`, `owners_office`, `roster_review`, `hire_coaches`, `farm_system`, `hire_scouts`, `financial_plan`, `season_strategy`, `press_conference`.
- `createRevisedOnboardingState()` starts at chapter index `0` with no AGM, no staff hires, no scouting hire, empty philosophy, and `isComplete: false`.
- `selectAGMInFlow`, `advanceRevisedChapter`, `setPhilosophyChoiceInFlow`, `setStaffHiresInFlow`, `setScoutingHireInFlow`, and `getOnboardingResult` provide the existing sim-core state transitions/result builder.

Component map:

- Reusable: `AGMSelectionPanel`, `AGMRuntimePanel`, `ChapterProgress`, `HireCoachesView`, `HireScoutsView`, and chapter view components (`OwnerMeetingView`, `RosterAssessmentView`, `FarmAssessmentView`, `FinancialView`, `SeasonStrategyView`, `PressConferenceView`).
- `AssessmentPanel` currently handles legacy chapter ids only; it needs a small extension to map revised ids to the same chapter views.
- `OnboardingComplete` does not fit cleanly because revised scripts do not include the old highlights/quick-reference shape, so the route will render a small revised completion panel.

Implementation assumption:

- The goal packet is the approved design. No separate design-doc approval gate is added.
- The route will keep local revised flow state using sim-core flow helpers, use worker methods for data/mutations/snapshot export, then save through the existing IndexedDB save path.

Milestone 1 files changed:

- `.logs/goal-progress.md`

Checks to run for Milestone 1:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build`

## 2026-05-14 19:47 - Sprint 3 Implementation + Pause Gate

Milestones completed:

- Added lazy `/news` route under `AppLayout`.
- Built `NewsPage` with worker-backed `getNews(100)`, newest-first sort, priority tie-break, All/Unread toggle, category select, loading/empty/error states, read/unread visuals, category/priority/tag/timestamp/entity chips, and mobile-survivable layout.
- Added `markNewsRead(id)` wiring with optimistic local state, deterministic `mbd:news-read` browser event, and active-save persistence via `exportSnapshot()` + `saveGame/saveGameById` so the read flag is written to IndexedDB when an active save exists.
- Added Sidebar `News` entry with lucide `Inbox` and TopBar unread badge that decrements on the local read event without polling.
- Added tests for news rendering/sort, mark-read, active-save persistence, category filtering, route registration, Sidebar nav entry, and TopBar badge decrement.

Files changed:

- `apps/web/src/features/news/lib/newsEvents.ts`
- `apps/web/src/features/news/routes/NewsPage.tsx`
- `apps/web/src/features/news/routes/NewsPage.test.tsx`
- `apps/web/src/app/routes/index.tsx`
- `apps/web/src/app/routes/index.test.tsx`
- `apps/web/src/app/layout/Sidebar.tsx`
- `apps/web/src/app/layout/Sidebar.test.tsx`
- `apps/web/src/app/layout/TopBar.tsx`
- `apps/web/src/app/layout/TopBar.test.tsx`
- `apps/web/docs/screenshots/sprint-3/*.png`
- `.logs/goal-progress.md`

Targeted validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/features/news/routes/NewsPage.test.tsx src/app/layout/TopBar.test.tsx` -> PASS. 2 files / 5 tests.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS. Turbo reported `Tasks: 9 successful, 9 total` in `5.853s` after the persistence change.

Final validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS. Turbo reported `Tasks: 9 successful, 9 total` in `7.669s`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` -> PASS. Turbo reported `Tasks: 8 successful, 8 total` in `1m23.837s`; web passed 99 files / 624 tests, sim-core passed 137 files / 1610 tests, contracts passed 1 file / 20 tests, UI passed 1 file / 1 test. Existing non-fatal test noise remained: Recharts zero-size warnings, React `act(...)` warnings, service worker failure-test log, and existing ScoutingPage mock-function log.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build` -> PASS. Turbo reported `Tasks: 5 successful, 5 total` in `6.347s`; Vite built in `4.69s`; PWA precached 120 entries.

Browser evidence:

- Dev server command: `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev` -> PASS at `http://localhost:5173/MBD/`.
- Browser flow: loaded a simmed Day 31 save, clicked Sidebar `News`, verified `/MBD/news`, applied category filter, opened an unread item, verified TopBar count changed from `News 100` to `News 99`, verified IndexedDB save-slot-2 news changed from `total=580 unread=580` to `total=580 unread=579`, and verified 375x667 mobile had `horizontalOverflow=false`.
- Screenshots captured:
  - `apps/web/docs/screenshots/sprint-3/01-dashboard-after-month.png`
  - `apps/web/docs/screenshots/sprint-3/02-news-inbox-unread.png`
  - `apps/web/docs/screenshots/sprint-3/03-news-category-filter.png`
  - `apps/web/docs/screenshots/sprint-3/04-news-item-read.png`
  - `apps/web/docs/screenshots/sprint-3/05-news-mobile-375.png`
  - `apps/web/docs/screenshots/sprint-3/06-news-hard-reload-blocked.png`

Pause condition hit:

- Full browser hard reload at `/MBD/news` lands back on Save Hub (`http://localhost:5173/MBD`) instead of rendering `News Inbox`.
- Root cause: `AppLayout` redirects to `/` whenever `useGameStore().isInitialized` is false after a page reload. The active save id/slot are not persisted across reload by the current app-level routing/store bootstrap.
- Fixing this requires protected scope (`apps/web/src/app/App.tsx`, `apps/web/src/app/layout/AppLayout.tsx`, or `apps/web/src/shared/hooks/useGameStore.ts` / setup bootstrap), so the Sprint 3 Done When item `/MBD/news hard-reload survives` cannot be satisfied within this GOAL's allowed write scope.

Milestone 1 validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS. Turbo reported `Tasks: 9 successful, 9 total` in `29ms`; all tasks were cached.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` -> PASS. Turbo reported `Tasks: 8 successful, 8 total` in `1m21.584s`; web passed 97 files / 618 tests, sim-core passed 137 files / 1610 tests, contracts passed 1 file / 20 tests, UI passed 1 file / 1 test. Existing non-fatal console noise remained: Recharts sizing warnings, React `act(...)` warnings, service worker failure-test log, and ScoutingPage mock-function log.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build` -> PASS. Turbo reported `Tasks: 5 successful, 5 total` in `4.167s`; Vite built in `3.37s`; PWA precached 118 entries.

## 2026-05-14 19:21 - Milestone 2 Red Tests

Files changed:

- `apps/web/src/features/news/routes/NewsPage.test.tsx`
- `apps/web/src/app/layout/TopBar.test.tsx`
- `apps/web/src/app/layout/Sidebar.test.tsx`
- `apps/web/src/app/routes/index.test.tsx`

Red test proof:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/features/news/routes/NewsPage.test.tsx src/app/layout/TopBar.test.tsx src/app/layout/Sidebar.test.tsx src/app/routes/index.test.tsx` -> FAIL as expected. Failures proved missing feature work: `NewsPage` import unresolved, `/news` redirected to dashboard, Sidebar had no `News` entry, and TopBar had no unread badge.

## 2026-05-14 19:24 - Milestone 3 Route, List, Mark-Read, Sidebar, TopBar

Files changed:

- `apps/web/src/features/news/lib/newsEvents.ts`
- `apps/web/src/features/news/routes/NewsPage.tsx`
- `apps/web/src/features/news/routes/NewsPage.test.tsx`
- `apps/web/src/app/routes/index.tsx`
- `apps/web/src/app/routes/index.test.tsx`
- `apps/web/src/app/layout/Sidebar.tsx`
- `apps/web/src/app/layout/Sidebar.test.tsx`
- `apps/web/src/app/layout/TopBar.tsx`
- `apps/web/src/app/layout/TopBar.test.tsx`

Implementation:

- Added lazy `/news` route under `AppLayout` with `RouteErrorBoundary('News', ...)`.
- Added worker-backed inbox page that calls `getNews(100)`, sorts by timestamp descending and priority descending for same timestamps, renders headline/body/category/priority/tag/timestamp/related chips/read state, and supports All/Unread plus category filtering.
- Clicking an unread item expands it, flips local read state optimistically, calls `markNewsRead(id)`, and dispatches a local `mbd:news-read` event after the worker mutation resolves.
- Added Sidebar `News` entry with lucide `Inbox`, leaving Press Room on `Newspaper`.
- Added TopBar unread-count chip driven by `getNews(100)` and the local news-read event. It does not poll and does not subscribe to AppLayout's flow listener channel.

Focused validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/features/news/routes/NewsPage.test.tsx src/app/layout/TopBar.test.tsx src/app/layout/Sidebar.test.tsx src/app/routes/index.test.tsx` -> PASS, 4 files / 9 tests.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/app/layout/AppLayout.test.tsx src/app/layout/TopBar.test.tsx` -> PASS, 2 files / 11 tests after fixing the TopBar worker-mock guard.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/app/layout/TopBar.test.tsx` -> PASS, 1 file / 1 test after draining the async badge update in the test.

Full validation:

- First `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` run failed because `TopBar` subscribed to the same flow channel as `AppLayout` and existing AppLayout tests intentionally assert a single subscription. Root cause fixed by removing the TopBar flow subscription and guarding minimal worker mocks that do not include `getNews`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS. Turbo reported `Tasks: 9 successful, 9 total` in `5.299s`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` -> PASS after fix. Turbo reported `Tasks: 8 successful, 8 total` in `1m24.004s`; web passed 99 files / 623 tests, sim-core passed 137 files / 1610 tests, contracts passed 1 file / 20 tests, UI passed 1 file / 1 test. Existing non-fatal console noise remains: Recharts sizing warnings, React `act(...)` warnings from existing route tests, service worker failure-test log, and ScoutingPage mock-function log.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build` -> PASS. Turbo reported `Tasks: 5 successful, 5 total` in `4.118s`; Vite built in `3.26s`; PWA precached 119 entries.

Milestone 1 validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS. Turbo reported `Tasks: 9 successful, 9 total` in `9.623s`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` -> PASS. Turbo reported `Tasks: 8 successful, 8 total` in `2m3.817s`; web passed 97 files / 618 tests, sim-core passed 137 files / 1610 tests. Existing non-fatal console noise included Recharts sizing warnings, React `act(...)` warnings, service worker failure-test logs, and an existing ScoutingPage mock-function log.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build` -> PASS. Turbo reported `Tasks: 5 successful, 5 total` in `4.438s`; Vite built in `3.33s`; PWA precached 118 entries.

## 2026-05-14 18:30 - Milestone 2 Revised Route Test-First Refactor

Red test proof:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/features/onboarding/routes/RevisedOnboardingPage.test.tsx` -> FAIL before implementation, 4 failed tests. The page never called `getAGMCandidates`, rendered only `Loading front office...`, and could not find the revised `Hire Marcus` button.

Files changed:

- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.test.tsx`
- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx`
- `apps/web/src/features/onboarding/components/AssessmentPanel.tsx`
- `apps/web/src/features/onboarding/components/ChapterProgress.tsx`

Implementation:

- Replaced the `/onboarding` route's Day-One session flow with the revised AGM flow.
- The page now loads `getAGMCandidates`, hydrates selected AGM data through `getRevisedOnboardingData`, uses sim-core revised flow helpers locally, calls `applyStaffHires` and `applyScoutingHire` for hiring chapters, calls `completeRevisedOnboarding` before exporting the snapshot, then persists through the existing save path and navigates to `/dashboard`.
- `AssessmentPanel` now accepts revised chapter IDs for the same assessment views.
- `ChapterProgress` now accepts the revised chapter order labels.

Focused validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/features/onboarding/routes/RevisedOnboardingPage.test.tsx` -> PASS, 1 file / 4 tests.

Checks to run for Milestone 2:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build`

Milestone 2 validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> FAIL on first run. Root causes were local type errors only: `ChapterProgress` used invalid `readonly Array<...>` syntax and `persistCompletion` accepted `unknown` where the save APIs require `object`.
- Fix: changed `ChapterProgress` to `ReadonlyArray<...>` and added `requireSnapshotObject()` before saving the worker snapshot.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS after fix. Turbo reported `Tasks: 9 successful, 9 total` in `4.949s`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` -> PASS. Turbo reported `Tasks: 8 successful, 8 total` in `1m20.666s`; web passed 97 files / 618 tests and sim-core replayed 137 files / 1610 tests. Existing non-fatal console noise included Recharts sizing warnings, React `act(...)` warnings, service worker failure-test logs, and an existing ScoutingPage mock-function log.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build` -> PASS. Turbo reported `Tasks: 5 successful, 5 total` in `3.951s`; Vite built in `3.16s`; PWA precached 118 entries.

## 2026-05-14 18:36 - Milestone 3 Day-One Worker-Surface Decision

Decision:

- Remove the Day-One web worker surface. After the route refactor, exact Day-One method-name references were confined to worker exports, hook wrappers, and worker-surface tests. The active `/onboarding` route now uses the revised AGM surface.

Grep evidence before removal:

- `rg -n "getDayOneSession|advanceDayOneIntro|chooseDayOneAGM|advanceDayOneOrgReview|setDayOneSeasonGoal|setDayOneBudgetAllocation|setDayOneOpeningPlan|setDayOneDevelopmentPlan|resolveDayOneCrisis|finishDayOne" apps/web/src` returned references only in `apps/web/src/workers/sim.worker.onboarding.test.ts`, `apps/web/src/workers/sim.worker.ts`, `apps/web/src/shared/hooks/useWorker.ts`, and `apps/web/src/workers/sim.worker.onboarding.ts`.

Files changed:

- `apps/web/src/workers/sim.worker.onboarding.test.ts`
- `apps/web/src/workers/sim.worker.ts`
- `apps/web/src/shared/hooks/useWorker.ts`
- `apps/web/src/workers/sim.worker.onboarding.ts`

Implementation:

- Converted the worker onboarding test from Day-One worker methods to the revised AGM worker API.
- Removed Day-One methods from the Comlink onboarding API map in `sim.worker.ts`.
- Removed Day-One mutation names and hook wrappers from `useWorker.ts`.
- Removed exported Day-One wrapper functions from `sim.worker.onboarding.ts`.
- Left protected `packages/sim-core/src/onboarding/dayOne.ts` untouched.

Grep evidence after removal:

- `rg -n "getDayOneSession|advanceDayOneIntro|chooseDayOneAGM|advanceDayOneOrgReview|setDayOneSeasonGoal|setDayOneBudgetAllocation|setDayOneOpeningPlan|setDayOneDevelopmentPlan|resolveDayOneCrisis|finishDayOne" apps/web/src || true` -> no output.

Focused validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/workers/sim.worker.onboarding.test.ts` -> PASS, 1 file / 4 tests.

Checks to run for Milestone 3:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build`

Milestone 3 validation:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck` -> PASS. Turbo reported `Tasks: 9 successful, 9 total` in `4.998s`.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test` -> PASS. Turbo reported `Tasks: 8 successful, 8 total` in `1m21.005s`; web passed 97 files / 618 tests and sim-core replayed 137 files / 1610 tests. Existing non-fatal console noise included Recharts sizing warnings, React `act(...)` warnings, service worker failure-test logs, and an existing ScoutingPage mock-function log.
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build` -> PASS. Turbo reported `Tasks: 5 successful, 5 total` in `4.002s`; Vite built in `3.20s`; PWA precached 118 entries.

## 2026-05-14 18:40 - Milestone 4 Browser Smoke

Command:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev` -> PASS. Vite reported `Local: http://localhost:5173/MBD/`.

Screenshots captured under `apps/web/docs/screenshots/sprint-2/`:

- `01-save-hub-setup.png` — Save Hub with new dynasty setup opened.
- `02-agm-selection.png` — `/onboarding` AGM selection showing Marcus Chen, Walter Kowalski, and Elena Vargas.
- `03-owner-office.png` — owner-office revised chapter after selecting Marcus Chen.
- `04-staff-hiring.png` — staff hiring chapter.
- `05-scout-hiring.png` — scouting director hiring chapter.
- `06-completion.png` — revised onboarding completion state before dashboard entry.
- `07-dashboard-after-completion.png` — dashboard after clicking `Enter the Front Office`.
- `08-dashboard-after-reload.png` — hard reload at `/dashboard`; this exposed Vite's configured public-base error.
- `09-dashboard-after-savehub-reload-continue.png` — re-opened through Save Hub after reload and continued the persisted save to dashboard.

Browser flow walked:

- Save Hub -> Slot 1 -> Begin Season 1 -> `/onboarding` -> pick Marcus Chen -> owner assessment -> roster assessment -> staff hiring -> farm choice -> scouting director hiring -> financial choice -> strategy choice -> press tone -> completion -> dashboard.
- IndexedDB proof after completion: database `mbd-saves`, store `saves`, record `save-slot-1`, `schemaVersion: 33`, `snapshot.schemaVersion: 33`, `assistantGMId: marcus_chen`, `welcomeBriefingSeen: true`.

Blocker / pause condition:

- A hard reload at `/dashboard` fails in dev with: `The server is configured with a public base URL of /MBD/ - did you mean to visit /MBD/dashboard instead?`
- The save itself is persisted and reloadable through Save Hub, but the Done When item requiring dashboard hard reload cannot be satisfied without fixing the app-level public-base routing. The likely fix is in `apps/web/src/app/App.tsx` (`BrowserRouter` basename) or route/base handling, which is outside this GOAL's allowed write scope.
- This hits the pause condition: a protected file must be modified to make further progress.

---

# Sprint 3 Goal Progress

Workspace: `/Users/tkevinbigham/MBD-main`
Branch: `goal/sprint-3-news-inbox`
Date: 2026-05-14

## 2026-05-14 19:18 - Milestone 1 Inventory

Files inspected:

- Root orientation: `README.md`, `CHANGELOG.md`, `MASTER_CONTEXT.md`, `GOAL.md`, previous `STATUS.md`.
- Data contract, read-only: `packages/contracts/src/schemas/narrative.ts` lines 1-60.
- Worker surface, read-only: `apps/web/src/workers/sim.worker.queries.ts`, `apps/web/src/workers/sim.worker.actions.ts`, `apps/web/src/shared/hooks/useWorker.ts`.
- App shell: `apps/web/src/app/routes/index.tsx`, `apps/web/src/app/layout/Sidebar.tsx`, `apps/web/src/app/layout/TopBar.tsx`.
- Existing patterns: `PressRoomPage.tsx`, `HistoryPage.tsx`, `RecordWatchPage.tsx`, `RecentMomentsCard.tsx`, `PageShell.tsx`, `EmptyStatePanel.tsx`.
- Settings reference: `SettingsPage.tsx` line 945 uses `diagnostics.queues.newsItems`.
- News tests/reference: `packages/sim-core/tests/narrative.test.ts`, `packages/sim-core/src/narrative/newsFeed.ts`, and `apps/web/src/workers/sim.worker.test.ts` news cases.

Repo state:

- `git status --short --branch`: on `goal/sprint-3-news-inbox`; pre-existing modified file is `.claude/launch.json`.
- `git log -1 --oneline`: `4589299 docs(goal): add Sprint 3 mission contract — News inbox`.

Inventory findings:

- `NewsItem` shape: `{ id, headline, body, priority: 1|2|3|4|5, category, tag?, timestamp, relatedPlayerIds, relatedTeamIds, read }`.
- `NewsCategory` enum has 21 values: `injury`, `trade`, `signing`, `extension`, `qualifying_offer`, `coaching`, `draft`, `milestone`, `performance`, `standings`, `roster_move`, `development`, `rumor`, `rivalry`, `award`, `record`, `playoff`, `arbitration`, `holdout`, `press_conference`, `league_event`.
- `getNews(limit = 50)` currently returns `getUnreadNews(requireState().news).slice(0, limit)`, so it is an unread queue, not the full historical news array. Sim-core sorts unread items by priority ascending first, then timestamp descending. The `/news` page will re-sort the returned items by timestamp descending and tie-break by priority descending per `GOAL.md`.
- `markNewsRead(newsId)` sets `s.news = markAsRead(s.news, newsId)` and returns `void`. Because `useWorker` only notifies flow listeners when a mutation result includes `flowStateChanged`, this mutation will not automatically update layout state through `subscribeToFlowUpdates`.
- Implementation assumption: keep a local page copy of returned news and flip the opened item to `read: true` optimistically, then dispatch a deterministic in-app news-read event so `TopBar` can decrement without polling or protected worker edits.
- Reuse targets: `PageShell`, `EmptyStatePanel`, `Badge`, `Skeleton`, lucide `Inbox`, and the Press Room feed chip/timestamp patterns.

Files changed:

- `.logs/goal-progress.md`

Checks to run for Milestone 1:

- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test`
- `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build`

---

# Sprint 4 Goal Progress

Workspace: `/Users/tkevinbigham/MBD-main`
Branch: `goal/sprint-4-front-office`
Date: 2026-05-14

## Pause Before Milestone 1 - Worker Shape Mismatch

- Commit: none; stopped before implementation.
- typecheck: not run; no milestone code was completed.
- test: not run; no milestone code was completed.
- Files touched: `STATUS.md`, `.logs/goal-progress.md`.
- Scope decisions: Did not add worker methods, did not touch protected worker/sim/contracts/save files, and did not reinterpret contract-negotiation fields from trade package data.
- Surprises: `getOpenNegotiations()` and `getNegotiation(id)` return `TradeNegotiationView` trade-package shapes (`offeringAssets`, `requestingAssets`, `counterOffer`, `phase`, `dialogue`, `expiresAtDay`), not contract salary asks/offered terms. Also, `getInteractivePressConference()` already has an `AppLayout` consumer through `PressConferenceModal`, so the audit's zero-consumer claim is stale.

## Milestone 1 — Trade Negotiations Inbox scaffolding

- Commit: c3eb524 `feat(trade-negotiations): add /trade-negotiations Inbox route`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`
- Files touched: `apps/web/src/app/routes/index.tsx`, `apps/web/src/features/trade-negotiations/routes/TradeNegotiationsInboxPage.tsx`, `apps/web/src/features/trade-negotiations/routes/TradeNegotiationsInboxPage.test.tsx`
- Scope decisions: Built the Inbox as a read-only route against `TradeNegotiationView`, sorting open negotiations first and then by earliest `expiresAtDay`. Error handling uses the existing `logger` plus `sonner` toast and an inline retry state.
- Surprises: Focused red failed exactly because the page did not exist yet. Full test output includes existing Recharts/React act/service-worker/scouting warning noise and the new test's intentional mocked worker failure log.

## Milestone 2 — Trade Negotiation detail

- Commit: 3b1536d `feat(trade-negotiations): add /trade-negotiations/:id detail view`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/app/routes/index.tsx`, `apps/web/src/features/trade-negotiations/routes/TradeNegotiationDetailPage.tsx`, `apps/web/src/features/trade-negotiations/routes/TradeNegotiationDetailPage.test.tsx`
- Scope decisions: Kept the detail surface read-only and used `getPlayer` only to resolve existing `TradeAsset` player IDs into profile links. The only action CTA deep-links to `/trade?negotiationId=...` for the existing builder to handle.
- Surprises: `TradeCounterPackage` stores raw `TradeAsset[]`, not `TradeAssetView[]`, so the detail page formats draft picks and IFA pool space locally while resolving player names through the worker.

## Milestone 3 — Sidebar Trade Negotiations entry

- Commit: 2b99559 `feat(layout): add Trade Negotiations entry to Sidebar`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/app/layout/Sidebar.tsx`, `apps/web/src/app/layout/Sidebar.test.tsx`
- Scope decisions: Placed Trade Negotiations directly after Trades and used the lucide `Handshake` icon, avoiding the News `Inbox` icon.
- Surprises: None; the red check failed only on the missing sidebar label as intended.

## Milestone 4 — Trade page cross-linking + deep-link from Inbox

- Commit: 14043ed `feat(trade): cross-link player names + accept ?negotiationId deep link`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/features/trade/components/DeadlineDramaPanel.tsx`, `apps/web/src/features/trade/routes/TradePage.tsx`, `apps/web/src/features/trade/routes/TradePage.test.tsx`
- Scope decisions: Linked structured player assets in Trade rows, offer cards, active negotiation packages, package summaries, multi-team summaries, and the deadline bidding-war target using the Roster `/players/:id` pattern. Added `/trade?negotiationId=...` loading through existing `getNegotiation` and `applyNegotiationToBuilder`, with toast + param clearing for stale or closed negotiations.
- Surprises: Trade recap/ticker prose still contains narrative player names without a safe token map; no regex parsing was added.

## Milestone 5 — Draft page cross-linking

- Commit: 0ad438f `feat(draft): cross-link prospects to /players/:id`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/features/draft/routes/DraftPage.tsx`, `apps/web/src/features/draft/routes/DraftPage.test.tsx`
- Scope decisions: Used `/players/:playerId?tab=development` for draft prospects, matching the existing Minors prospect precedent. Linked available prospects, selected prospect card, draft ticker, board cells, post-draft best picks, and the user's draft class without parsing prose summaries.
- Surprises: Draft commentary and buzz entries have `playerId` fields but not display-safe player names in every entry, so the milestone kept links to places where a structured player ID and visible name were already paired.

## Milestone 6 — Scouting page cross-linking

- Commit: 0736d0c `feat(scouting): cross-link player names to /players/:id`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`; web suite `103 passed`, `639 passed`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/features/scouting/components/ScoutConflictsTab.tsx`, `apps/web/src/features/scouting/routes/ScoutingPage.tsx`, `apps/web/src/features/scouting/routes/ScoutingPage.test.tsx`
- Scope decisions: Linked only structured scouting player/prospect identifiers: pro search results, generated pro reports, recent reports, selected IFA reports, IFA board prospects, and scout-conflict headlines. Kept action/status prose such as signing result messages as text because those strings are composed state, not structured link records.
- Surprises: The route test mock was stale against older worker names, so the milestone updated it to the current `getScoutingStaff` / `getIFAPool` / `searchPlayers` surface before asserting the links.

## Milestone 7 — Stats / leaderboards cross-linking

- Commit: 5614f99 `feat(stats): cross-link leaderboard entries to /players/:id`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`; web suite `103 passed`, `639 passed`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/features/league/routes/LeadersPage.test.tsx`
- Scope decisions: Production leaderboard rows already used `/players/:id` links, so this milestone added explicit regression coverage for both WAR and FIP leaderboard states instead of changing working route code.
- Surprises: The only actual leaderboard surface lives under `apps/web/src/features/league/routes/LeadersPage.tsx`; `apps/web/src/features/stats/**` contains the stat encyclopedia and shared quality-scale test, not player leaderboard rows.

## Milestone 8 — News page player-reference chips

- Commit: c088244 `feat(news): cross-link player references in news items`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`; web suite `103 passed`, `640 passed`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/features/news/routes/NewsPage.tsx`, `apps/web/src/features/news/routes/NewsPage.test.tsx`
- Scope decisions: Used the existing `relatedPlayerIds` field from `NewsItem` and resolved display labels through existing `worker.getPlayer`; unresolved or failed lookups fall back to the raw player ID. Moved related chips outside the clickable news-card button so player links are valid interactive elements.
- Surprises: News already displayed related player IDs as plain text spans, so the milestone was a clean conversion to linked chips rather than a skip.

## Milestone 9 — Trade Value on Player Profile

- Commit: 0832a9b `feat(players): surface trade value on player profile`
- typecheck: PASS — `Tasks: 9 successful, 9 total`
- test: PASS — `Tasks: 8 successful, 8 total`; web suite `103 passed`, `641 passed`
- Files touched: `.logs/goal-progress.md`, `apps/web/src/features/players/routes/PlayerProfilePage.tsx`, `apps/web/src/features/players/routes/PlayerProfilePage.test.tsx`, `apps/web/src/shared/hooks/useWorker.ts`
- Scope decisions: Rendered a compact sidebar card rather than adding another tab. The hook now forwards the existing sim-worker `getPlayerTradeValue` query; no new worker query/action was added.
- Surprises: The sim worker already exposed `getPlayerTradeValue`, but `useWorker` did not forward it, so wiring the profile required a hook wrapper.
