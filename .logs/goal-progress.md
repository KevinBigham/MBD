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
