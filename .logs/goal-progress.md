# Sprint 2 Goal Progress

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
