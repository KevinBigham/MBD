# STATUS — Sprint 2 Revised Onboarding

Status: **COMPLETE**. All GOAL.md Done When items satisfied.

## What shipped

`/onboarding` now drives the AGM-based revised onboarding flow. The route loads the three fixed AGMs (Marcus Chen, Walter Kowalski, Elena Vargas) via `getAGMCandidates`, hydrates the selected AGM through `getRevisedOnboardingData`, walks `REVISED_CHAPTER_ORDER` end-to-end, applies staff hires through `applyStaffHires`, applies the scouting director through `applyScoutingHire`, finishes through `completeRevisedOnboarding`, exports the snapshot, and persists it via the existing IndexedDB save path before navigating to `/dashboard`. The orphaned Day-One web worker surface has been removed from `useWorker.ts`, `sim.worker.ts`, and `sim.worker.onboarding.ts` (sim-core's `dayOne.ts` left untouched per the protected-scope rule). The hard-reload blocker that paused the first run was fixed by setting `BrowserRouter basename` to match Vite's `/MBD/` base path.

## Files changed

`git diff --stat origin/main..HEAD`:

- `apps/web/src/app/App.tsx` — added `BrowserRouter basename` derived from `import.meta.env.BASE_URL` so nested routes survive a hard reload under the `/MBD/` public base.
- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx` — full route refactor from Day-One to revised AGM flow.
- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.test.tsx` — test rewrite to cover the AGM-based flow.
- `apps/web/src/features/onboarding/components/AssessmentPanel.tsx` — accepts revised chapter IDs in addition to the legacy ones.
- `apps/web/src/features/onboarding/components/ChapterProgress.tsx` — accepts the revised chapter order labels.
- `apps/web/src/shared/hooks/useWorker.ts` — removed Day-One method wrappers and mutation entries.
- `apps/web/src/workers/sim.worker.ts` — removed Day-One methods from the `onboardingApi` Comlink map.
- `apps/web/src/workers/sim.worker.onboarding.ts` — removed exported Day-One wrapper functions.
- `apps/web/src/workers/sim.worker.onboarding.test.ts` — rewrote against the revised AGM worker API.
- `.logs/goal-progress.md` — milestone log.
- `STATUS.md` — this file.
- `apps/web/docs/screenshots/sprint-2/*.png` — browser-smoke evidence.

Pre-existing dirty file left untouched on disk: `.claude/launch.json` (local-only dev-server path override, not committed).

## Validations run

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
```

Latest: PASS — `Tasks: 9 successful, 9 total` in 5.272s.

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
```

Latest: PASS — `Tasks: 8 successful, 8 total` in 1m21.943s. Web 97 files / 618 tests, sim-core 137 files / 1610 tests, contracts 1 file / 20 tests, UI 1 file / 1 test. Existing non-fatal console noise remains (Recharts sizing warnings, React `act(...)` warnings, the service-worker failure test log, the ScoutingPage mock-function log).

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
```

Latest: PASS — `Tasks: 5 successful, 5 total` in 3.989s. Vite built in 3.20s, PWA precached 118 entries.

Focused gates also green:

```text
pnpm --filter @mbd/web test src/features/onboarding/routes/RevisedOnboardingPage.test.tsx  # 4 tests
pnpm --filter @mbd/web test src/workers/sim.worker.onboarding.test.ts                       # 4 tests
pnpm --filter @mbd/web test src/app                                                          # 28 tests across App / layout / routes
```

## Browser evidence

Dev server: `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev` → Vite serves `http://localhost:5173/MBD/` (or 5174 if 5173 is taken).

Screenshots under `apps/web/docs/screenshots/sprint-2/`:

- `01-save-hub-setup.png` — Save Hub with new dynasty setup opened.
- `02-agm-selection.png` — AGM selection showing Marcus Chen, Walter Kowalski, Elena Vargas.
- `03-owner-office.png` — owner-office chapter after selecting Marcus Chen.
- `04-staff-hiring.png` — staff hiring chapter (uses `applyStaffHires`).
- `05-scout-hiring.png` — scouting director chapter (uses `applyScoutingHire`).
- `06-completion.png` — revised onboarding completion state.
- `07-dashboard-after-completion.png` — dashboard immediately after completing onboarding.
- `08-dashboard-after-reload.png` — captured pre-fix; documents the former Vite public-base error that the BrowserRouter basename change now resolves.
- `09-dashboard-after-savehub-reload-continue.png` — persisted save reopened via Save Hub.

IndexedDB evidence after completion (captured in milestone 4):

```text
database: mbd-saves
store: saves
id: save-slot-1
name: Morgan Porter • New York Tycoons
schemaVersion: 33
snapshot.schemaVersion: 33
assistantGMId: marcus_chen
welcomeBriefingSeen: true
```

Hard-reload verification at `/MBD/dashboard`:

- `fetch('/MBD/dashboard')` returns 200 `text/html` (Vite no longer rejects the URL).
- Browser navigation to `/MBD/dashboard` no longer surfaces Vite's `The server is configured with a public base URL of /MBD/ - did you mean to visit /MBD/dashboard instead?` error.
- With no save in IndexedDB the user is correctly redirected to Save Hub (`AppLayout` uninitialized-state guard). With a save present the dashboard renders.

## Day-One worker-surface decision

**Removed.** Grep evidence after removal:

```text
rg -n "getDayOneSession|advanceDayOneIntro|chooseDayOneAGM|advanceDayOneOrgReview|setDayOneSeasonGoal|setDayOneBudgetAllocation|setDayOneOpeningPlan|setDayOneDevelopmentPlan|resolveDayOneCrisis|finishDayOne" apps/web/src
```

Returns no output. The protected `packages/sim-core/src/onboarding/dayOne.ts` was not modified — only the worker wrappers and the `useWorker` callbacks that called into it.

## Known limitations

- Some revised sim-core chapter intro lines still show placeholder tokens such as `[OWNER_NAME]`, `[PAYROLL]`, `[WINDOW]`, and `[PROB]`. That content comes from protected sim-core generation and was not touched in this sprint. Worth a future polish slice.
- Pre-existing dev-mode console noise remains: the PWA service-worker fails to register against `vite dev` because `sw.js` is only generated in production builds. Same as before Sprint 2.

## Risks

- The route now owns local revised flow state. If sim-core later adds a new revised chapter ID, the route must handle it or render a safe fallback.
- The Day-One worker-surface removal is safe by grep today. Any future code that wants Day-One semantics will need to either restore those wrappers or reach into `packages/sim-core/src/onboarding/dayOne.ts` directly via the worker layer.

## Rollback notes

Revert the merge commit. The save schema stayed at v33, no migration was added, and protected sim-core/contracts files were not modified, so rollback does not require save repair.

## Next /goal

The Sprint 3 candidate the audit ranked highest was the **News inbox**: `getNews(limit?)` and `markNewsRead(newsId)` are exposed in `useWorker` and powered by `sim-core/narrative/newsFeed.ts`, but no UI surfaces them. SettingsPage shows the queue *count* only.

```text
/goal Build the News inbox surface in apps/web/src/features/news. Read README.md, CHANGELOG.md, GOAL.md (replace with the Sprint 3 GOAL.md), STATUS.md (this file), and the existing useWorker.ts getNews/markNewsRead methods first. Add a route /news that lists worker-backed news items with type filters, mark-read on view, and an unread badge in the TopBar. Reuse existing layout primitives. Work milestone by milestone, validate each milestone with pnpm typecheck + pnpm test + pnpm build, run pnpm --filter @mbd/web dev for a full browser smoke before finishing, and keep evaluator-visible proof in .logs/goal-progress.md plus the transcript. Stop only when every Done When item in the next GOAL.md is satisfied. Before stopping, write STATUS.md with what shipped, files changed, validations run, browser evidence (screenshots committed under apps/web/docs/screenshots/sprint-3/), known limitations, risks, rollback notes, and the exact next /goal.
```

(Claude Code will draft the Sprint 3 GOAL.md before that command runs.)
