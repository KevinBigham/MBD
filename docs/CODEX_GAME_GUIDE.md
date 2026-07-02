# Codex Guide to Mr. Baseball Dynasty

Generated from the current `/Users/tkevinbigham/Downloads/MBD-main` snapshot on 2026-06-10. Line counts touched by GOAT implementation slices are updated through the 2026-06-18 v34 archive slice.

This guide is for future Codex windows. It is an orientation map, not a replacement for reading the files you are about to edit. Treat current source files as authoritative whenever this guide, `MASTER_CONTEXT.md`, `STATUS.md`, or old audit docs disagree.

## First Read

- This folder started as an extracted snapshot without git metadata. On 2026-06-16, Codex initialized a local `main` branch and connected it to the private GitHub repository `KevinBigham/MBD-main` for project preservation; future fresh ZIP extracts may still lack `.git`.
- There is no `AGENTS.md` file on disk in this snapshot. Kevin provided AGENTS instructions in chat: deterministic sim paths, save-safe migrations, targeted tests, no unrelated refactors, and explicit file staging when git exists.
- `.gitignore` intentionally excludes dependency folders, build output, caches, environment files, generated `.logs/`, generated `.playwright-cli/`, and most generated playtest Markdown reports; do not force-add ignored generated artifacts unless Kevin explicitly asks for archive evidence.
- `node_modules` is present in this working snapshot after GOAT Phase 0. If it is missing in a future extract, install before running tests: `pnpm install --frozen-lockfile`, or `CI=true pnpm install --frozen-lockfile` if pnpm prompts.
- `docs/CODEX_IMPROVEMENT_PLAN.md` is the broad GOAT-tier improvement roadmap. Use it after orientation when deciding what to build next or how to sequence multi-area upgrades.
- `docs/CODEX_FEATURE_DOMAIN_GUIDE.md` is the feature-by-feature and engine-domain deep dive. Use it after this guide when you need purpose, routes, worker surface, tests, and watchpoints by product area.
- `docs/CODEX_SOURCE_ATLAS.md` is the exhaustive file atlas for the current source snapshot. Use it after this guide when you need every file in a feature/domain, line counts, and mechanically extracted exports.
- `docs/CODEX_WORKER_WIRING_MATRIX.md` is the static worker API wiring matrix. Use it when investigating whether a worker method is returned by `useWorker()` and where route/app/test call sites reference it.
- `docs/CODEX_RELEASE_CHECKLIST.md` is the repeatable demo/release readiness checklist: mandatory gates, save/bundle/determinism/playtest checks, manual smoke routes, acceptable warnings, and handoff requirements.
- `MASTER_CONTEXT.md` is useful as a historical map, but it is stale in places. It says save schema v17; current code is `CURRENT_GAME_SNAPSHOT_VERSION = 34` in `packages/contracts/src/schemas/save.ts`.
- `STATUS.md` and `GOAL.md` also describe prior goals, not the whole product. Use them for context, not as a substitute for source inspection.

## Commands

Root package scripts:

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
pnpm run verify:structure
pnpm run verify:cycles
pnpm run verify:determinism
pnpm run verify:quality
pnpm playtest
pnpm playtest:sample
pnpm playtest:calibrate
```

GitHub CI/Deploy smoke split:

- The workflows run `MBD_SKIP_SMOKE_GATE=1 pnpm verify` so the expensive multi-season `packages/sim-core/tests/smokeGate.integration.test.ts` does not run under the parallel Turbo/Vitest workspace test matrix.
- `turbo.json` includes `MBD_SKIP_SMOKE_GATE` in the `test` task environment so Turbo passes the skip switch through to the package Vitest process.
- They then run `pnpm --filter @mbd/sim-core exec vitest run tests/smokeGate.integration.test.ts --reporter=verbose` as an isolated step, preserving the smoke gate's year-boundary invariant, save/load, runtime-budget, and deterministic replay coverage without measuring it under workspace contention.

Script meanings from root `package.json`:

- `pnpm dev`: `turbo dev`; starts package dev tasks, including Vite for web.
- `pnpm typecheck`: `turbo typecheck`; runs TypeScript checks across packages.
- `pnpm lint`: `turbo lint`; defined at root, but check package support before relying on it.
- `pnpm test`: `turbo test`; runs package Vitest suites.
- `pnpm build`: `turbo build`; runs package builds.
- `pnpm verify`: `turbo typecheck && turbo test && turbo build`.
- `pnpm run verify:structure`: `knip --no-exit-code`; useful for unused export/type noise, but not a hard gate.
- `pnpm run verify:cycles`: `madge --circular ... || true`; detects import cycles without failing the whole run.
- `pnpm run verify:determinism`: runs `packages/sim-core/tests/determinism.snapshot.test.ts`.
- `pnpm run verify:quality`: structure, cycle, and determinism checks.
- `pnpm playtest`, `pnpm playtest:sample`, `pnpm playtest:calibrate`: sim-core narrative/calibration dump workflows. `playtest:calibrate` writes paired Markdown/JSON reports under `packages/sim-core/playtest-output/` and includes a worker/offseason sample controlled by `PLAYTEST_WORKER_SEED`, `PLAYTEST_WORKER_SEEDS`, and `PLAYTEST_WORKER_YEARS`. Set `PLAYTEST_ONBOARDING_BALANCE=1` to attach the shared Day One onboarding balance sample; `PLAYTEST_ONBOARDING_BALANCE_SEED`, `PLAYTEST_ONBOARDING_BALANCE_YEARS`, and `PLAYTEST_ONBOARDING_BALANCE_VARIANT_IDS` narrow that optional sample.

For a demo/release sweep, use `docs/CODEX_RELEASE_CHECKLIST.md` instead of relying on this command list alone. The checklist adds manual Save Hub/onboarding/sim/trade/draft/offseason/history/settings smoke steps and explicit acceptable-warning guidance.

Focused package gates:

```bash
pnpm --filter @mbd/sim-core typecheck
pnpm --filter @mbd/sim-core test
pnpm --filter @mbd/contracts typecheck
pnpm --filter @mbd/contracts test
pnpm --filter @mbd/web typecheck
pnpm --filter @mbd/web test
pnpm --filter @mbd/web build
```

For save-schema work, also run focused snapshot/save tests:

```bash
pnpm --filter @mbd/contracts test
pnpm --filter @mbd/web exec vitest run src/workers/snapshot.test.ts src/workers/snapshot.onboarding.test.ts src/shared/lib/saveSystem.test.ts
```

For sim determinism or probability work, run targeted sim-core tests plus:

```bash
pnpm run verify:determinism
```

## Monorepo Shape

The repo is a pnpm/Turbo TypeScript monorepo.

Package graph:

```text
@mbd/web
  -> @mbd/contracts
  -> @mbd/design-tokens
  -> @mbd/sim-core
  -> @mbd/ui

@mbd/sim-core
  -> @mbd/contracts

@mbd/ui
  -> @mbd/design-tokens
```

Current snapshot inventory:

- 1456 files listed by `rg --files` excluding ignored dependency/build/generated artifacts.
- 1284 TS/TSX source/test files under `apps/web/src` and `packages`.
- `rg --files apps/web/src packages -g '!**/tsconfig.tsbuildinfo'` returns 1319 files and about 275,757 lines in this snapshot.
- `docs/CODEX_SOURCE_ATLAS.md` lists 1319 files by group with line counts and exported symbols/notes.
- 575 test/spec files found across web, workers, contracts, and sim-core.
- Main app: `apps/web`.
- Pure engine: `packages/sim-core`.
- Zod contracts and save migrations: `packages/contracts`.
- Shared primitives: `packages/ui`.
- Tailwind/design values: `packages/design-tokens`.

Largest source/test areas by line count:

- `apps/web/src/workers`: about 41,027 lines across 42 files.
- `packages/sim-core/tests`: about 35,705 lines across 142 files.
- `apps/web/src/features/dashboard`: about 17,117 lines across 132 files.
- `apps/web/src/features/trade`: about 13,398 lines across 84 files.
- `packages/sim-core/src/narrative`: about 9,911 lines across 26 files.
- `apps/web/src/features/history`: about 12,415 lines across 94 files.
- `apps/web/src/shared`: about 9,784 lines across 71 files.
- `apps/web/src/features/roster`: about 7,223 lines across 46 files.
- `packages/sim-core/src/onboarding`: about 6,752 lines across 20 files.
- `apps/web/src/app`: about 5,641 lines across 25 files.
- `packages/contracts/src/schemas`: about 5,516 lines across 15 files.
- `packages/sim-core/src/player`: about 5,493 lines across 19 files.
- `packages/sim-core/src/moments`: about 5,308 lines across 8 files.
- `packages/contracts/tests`: about 4,799 lines across 19 files.
- `apps/web/src/features/offseason`: about 4,643 lines across 32 files.
- `packages/sim-core/src/league`: about 4,181 lines across 14 files.
- `apps/web/src/features/players`: about 6,933 lines across 46 files.
- `apps/web/src/features/onboarding`: about 4,630 lines across 33 files.

## Runtime Flow

Boot path:

```text
apps/web/src/main.tsx
  -> registerDeadChunkReload()
  -> registerMbdServiceWorker()
  -> initWebVitals()
  -> <App />

apps/web/src/app/App.tsx
  -> SaveRecoveryProvider
  -> SaveLoadErrorBoundary
  -> AppBootGate
  -> BrowserRouter basename from Vite BASE_URL
  -> AppRoutes
```

Route flow:

```text
AppRoutes
  -> "/" Save Hub outside AppLayout
  -> "/onboarding" revised onboarding outside AppLayout
  -> everything playable inside AppLayout
```

`AppBootGate` is the auto-resume guard. If `useGameStore` has an active save id and the worker is ready, it calls `loadSaveSafely()`, imports the migrated snapshot into the worker, and mirrors season/day/phase/team metadata into Zustand.

`AppLayout` is the playable shell. It owns sidebar/topbar/sim controls/command palette/ticker/monthly pulse/ceremony/press conference/assistant panel. Its `handleSim()` method calls a worker mutation, updates Zustand from the returned result, then autosaves by exporting the worker snapshot. It also passes already-loaded Monthly Pulse report/decision DTOs into the assistant so next-action guidance can stay contextual without adding assistant-owned worker calls.

Important state rule: the web worker is canonical game state. Zustand is UI/navigation/session mirror state. Do not make game logic depend on Zustand-only data.

### State Ownership

Canonical runtime state lives in the web worker. `FullGameState` is held behind the worker state singleton and manipulated by `sim.worker.actions.ts`, `sim.worker.helpers.ts`, and domain worker modules.

`useGameStore()` is a persisted Zustand mirror for UI/session metadata only:

- `season`, `day`, `phase`, `isInitialized`, `isSimulating`.
- `userTeamId`, `teamName`, `gmName`, `difficulty`.
- `activeSaveId`, `activeSaveSlot`.
- `playerCount`, `gamesPlayed`.

`GAME_STORE_STORAGE_KEY` is `mbd:game-store@v1`; persisted store version is 1. The partialized persisted data excludes worker-owned game objects. If Zustand and the worker disagree, fix the sync path rather than adding game logic to Zustand.

Autosave path:

```text
AppLayout.handleSim()
  -> worker sim mutation
  -> useGameStore.updateFromSim()
  -> useActiveSaveAutosave()
  -> worker.exportSnapshot()
  -> persistActiveSaveSnapshot()
  -> scheduleAutoSave() for root slots or saveGameById() for branches
```

Auto-resume path:

```text
AppBootGate
  -> loadSaveSafely(activeSaveId)
  -> worker.importSnapshot(migrated snapshot)
  -> useGameStore.initializeGame(imported metadata)
  -> render routes
```

`AppLayout` subscribes to `useWorker().subscribeToFlowUpdates()` and refreshes season flow, ceremony, monthly pulse, ticker, and optional press conference data after flow-aware worker mutations.

## Web Runtime and Build

`apps/web/src/main.tsx` does four things before rendering:

1. Registers dead lazy-chunk reload handling through `build/deadChunkReload.ts`.
2. Registers the MBD service worker through `build/registerServiceWorker.ts`.
3. Initializes lightweight web vitals through `shared/lib/webVitals.ts`.
4. Mounts `<App />` inside `React.StrictMode`.

`App.tsx` wraps the app with:

- `SaveRecoveryProvider`.
- `SaveLoadErrorBoundary`.
- `AppBootGate`.
- `BrowserRouter`.
- Sonner `Toaster`.

Production routing assumes Vite `base: '/MBD/'`. `BrowserRouter` derives its basename from `import.meta.env.BASE_URL`, so changing deploy base requires checking both `apps/web/vite.config.ts` and `App.tsx`.

Build/runtime support files:

- `apps/web/vite.config.ts`: React plugin, `/MBD/` base, PWA plugin, package aliases, app manual chunks, worker manual chunks.
- `apps/web/vitest.config.ts`: jsdom tests, `src/**/*.test.{ts,tsx}`, 30s timeout, single-thread worker settings.
- `apps/web/tailwind.config.ts`: content scan for app and `packages/ui`, design-token Tailwind preset.
- `apps/web/src/build/bundleConfig.ts`: manual chunks and bundle budgets. Main thread budget is 304 KiB raw / 81 KiB gzip; default worker budget is 446 KiB raw / 143 KiB gzip; `game-engine-story` has a scoped 499 KiB raw / 150 KiB gzip budget; `game-engine-core` has a scoped 144 KiB gzip budget; chart chunk has a separate budget.
- `apps/web/src/build/pwaConfig.ts`: Vite PWA manifest, `/MBD/` start/scope, Workbox fallback `/MBD/index.html`.
- `apps/web/src/build/registerServiceWorker.ts`: production-only registration for `/MBD/sw.js`, scope `/MBD/`, hourly update polling, toast on controller change.
- `apps/web/src/build/deadChunkReload.ts`: detects stale lazy chunk failures and reloads after service worker update.

When adding large deterministic story payloads or new worker modules, check `resolveWorkerManualChunk()` before assuming bundle-budget failures are purely size problems. The worker bundle is intentionally split into shell/core/story/onboarding/day-one/capstone chunks to keep the simulation engine deployable.

## Routes and Features

Routes are declared in `apps/web/src/app/routes/index.tsx` and lazy-load feature pages.

Playable route pages:

- Save/setup: `features/setup/routes/SetupPage.tsx` plus `features/setup/hooks/useSetupPageController.ts`, `features/setup/hooks/useSetupRouteData.ts`, and `features/setup/hooks/useSetupWizardControls.ts`.
- Onboarding: `features/onboarding/routes/RevisedOnboardingPage.tsx` plus `features/onboarding/hooks/useRevisedOnboardingPageController.tsx`.
- Dashboard: `features/dashboard/routes/DashboardPage.tsx` plus `features/dashboard/components/DashboardPageContent.tsx`, `features/dashboard/components/DashboardLazyIntelligenceGrid.tsx`, `features/dashboard/hooks/useDashboardPageController.ts`, `features/dashboard/hooks/useDashboardRouteData.ts`, `features/dashboard/hooks/useDashboardGuidedStart.ts`, and `features/dashboard/hooks/useDashboardActionHandlers.ts`.
- Roster: `features/roster/routes/RosterPage.tsx` plus `features/roster/hooks/useRosterPageController.ts`.
- Minors: `features/minors/routes/MinorsPage.tsx` plus `features/minors/hooks/useMinorsRouteData.ts` and minors panels under `features/minors/components`.
- Players: `features/players/routes/PlayersPage.tsx`, `PlayerProfilePage.tsx`, `PlayerComparisonPage.tsx`, plus `features/players/hooks/usePlayersRouteData.ts`, `features/players/components/PlayersPageContent.tsx`, `PlayerProfilePageContent.tsx`, and comparison/profile panels under `features/players/components`.
- Scouting: `features/scouting/routes/ScoutingPage.tsx` plus `features/scouting/hooks/useScoutingPageController.ts`, `features/scouting/hooks/useScoutConflictsData.ts`, `features/scouting/components/ScoutingPageContent.tsx`, `features/scouting/components/InternationalProspectReportPanel.tsx`, and scouting panels under `features/scouting/components`.
- Staff: `features/staff/routes/StaffPage.tsx` plus `features/staff/components/StaffPageContent.tsx` and staff panels/hooks under `features/staff/components` and `features/staff/hooks`.
- Draft: `features/draft/routes/DraftPage.tsx` plus `features/draft/hooks/useDraftPageController.ts`, `features/draft/hooks/useDraftRouteData.ts`, `features/draft/hooks/useDraftActionHandlers.ts`, and draft panels under `features/draft/components`.
- Trade: `features/trade/routes/TradePage.tsx`.
- League: `features/league/routes/StandingsPage.tsx`, `LeadersPage.tsx`, plus `features/league/hooks/useStandingsRouteData.ts` and `features/league/hooks/useLeagueLeadersRouteData.ts`.
- Schedule: `features/schedule/routes/SchedulePage.tsx` plus `features/schedule/hooks/useScheduleRouteData.ts`, `features/schedule/hooks/useBoxScoreRouteData.ts`, `features/schedule/hooks/useEnhancedPlayByPlayData.ts`, `features/schedule/components/ScheduleContentPanel.tsx`, and `BoxScorePage.tsx`.
- News and press: `features/news/routes/NewsPage.tsx`, `features/news/hooks/useNewsRouteData.ts`, plus news cards/panels under `features/news/components`; `features/press-room/routes/PressRoomPage.tsx` plus `features/press-room/components/PressRoomPageContent.tsx`, `PressRoomSummaryCards.tsx`, `PressRoomTransactionLog.tsx`, and press-room panels under `features/press-room/components`.
- Playoffs/offseason/free agency: `features/playoffs/routes/PlayoffsPage.tsx`, `features/playoffs/components/PlayoffsContentPanel.tsx`, `features/offseason/routes/OffseasonPage.tsx`, `features/offseason/hooks/useOffseasonPageController.ts`, `features/offseason/hooks/useOffseasonRouteData.ts`, `features/free-agency/routes/FreeAgencyPage.tsx`, `features/free-agency/components/FreeAgencyPageContent.tsx`, `features/free-agency/hooks/useFreeAgencyRouteData.ts`, `features/free-agency/hooks/useFreeAgencyOfferActions.ts`, `features/free-agency/hooks/useFreeAgencyMarketIntelData.ts`, plus free-agency panels under `features/free-agency/components`.
- Finance/front office/career: `features/finance/routes/FinancePage.tsx` plus `features/finance/hooks/useFinanceRouteData.ts` and finance panels under `features/finance/components`, `features/front-office/routes/FrontOfficePage.tsx` plus `features/front-office/hooks/useFrontOfficeRouteData.ts` and front-office panels under `features/front-office/components`, `features/gm-career/routes/GMCareerPage.tsx` plus `features/gm-career/components/GMCareerContentPanel.tsx`, `features/gm-career/components/TeamIdentityCard.tsx`, and `features/gm-career/hooks/useGMCareerRouteData.ts`.
- Long-memory surfaces: `features/history/routes/HistoryPage.tsx`, `features/records/routes/RecordWatchPage.tsx` plus `features/records/hooks/useRecordWatchRouteData.ts` and `features/records/components/RecordWatchContentPanel.tsx`, `features/rivalries/routes/RivalriesPage.tsx` plus `features/rivalries/hooks/useRivalriesRouteData.ts` and `features/rivalries/components/RivalriesContentPanel.tsx`, and `features/achievements/routes/AchievementsPage.tsx` plus `features/achievements/hooks/useAchievementsRouteData.ts`.
- Extras: `features/pulse/routes/PulsePage.tsx` plus `features/pulse/components/PulseContentPanel.tsx` and `features/pulse/hooks/usePulseRouteData.ts`, `features/scenarios/routes/ScenarioCatalogPage.tsx` plus `features/scenarios/components/ScenarioCatalogContentPanel.tsx` and `features/scenarios/hooks/useScenarioCatalogRouteData.ts`, `features/stats/routes/StatsEncyclopediaPage.tsx` plus `features/stats/components/StatsEncyclopediaContent.tsx`, `features/stats/components/StatsDefinitionLibraryPanel.tsx`, `features/stats/data/statDefinitions.ts`, and `features/stats/hooks/useStatsEncyclopediaRouteData.ts`, `features/settings/routes/SettingsPage.tsx`.

Route URL map from `AppRoutes`:

- `/`: Save Hub, outside `AppLayout`.
- `/onboarding`: revised onboarding, outside `AppLayout`.
- `/dashboard`: dashboard.
- `/roster`: roster.
- `/minors`: minor leagues.
- `/players`: player search/list.
- `/players/compare`: player comparison.
- `/players/:playerId`: player profile.
- `/scouting`: scouting and IFA.
- `/staff`: coaching staff.
- `/draft`: draft room.
- `/trade`: trade center.
- `/standings` and `/league/standings`: standings.
- `/leaders` and `/league/leaders`: league leaders.
- `/league`: redirects to `/league/standings`.
- `/schedule`: schedule.
- `/games/:gameIndex`: box score. The URL segment is named `gameIndex` for legacy routing, but the route now accepts either a live numeric game index or a stable archived-game id.
- `/press-room`: press room.
- `/news`: news feed.
- `/playoffs`: playoffs.
- `/free-agency`: free agency.
- `/offseason`: offseason.
- `/finance`: finance.
- `/career`: GM career.
- `/history`: history/dynasty timeline.
- `/achievements`: achievements.
- `/rivalries`: rivalries.
- `/front-office`: owner/front-office intel, relationship standing, and clubhouse mentorship scan.
- `/pulse`: monthly pulse.
- `/scenarios`: challenge/scenario catalog.
- `/stats`: stats encyclopedia.
- `/records`: record watch.
- `/settings`: settings/save maintenance.
- Any unknown playable route redirects to `/dashboard`.

`AssistantPanel` is mounted by `AppLayout` during normal play and also by `PreGameAssistantMount` on `/` and `/onboarding`. In normal play it combines route guidance with the current Monthly Pulse pending report and decision queue to suggest non-blocking operator actions such as roster compliance, owner-pressure reviews, playoff-race checks, playoff matchup reviews, trade decisions, promotion reviews, scouting reports, FA budget checks, contract/offseason work, or draft scouting. It owns route/store/local assistant state while `AssistantDetailDialog` owns the expanded focus-trapped dialog with `aria-modal`, Escape close, Tab/Shift+Tab containment, contextual action rendering, mode/replay/complete callbacks, and launcher focus restoration through the parent.

Most pages follow this pattern:

1. Use `useWorker()` to query DTOs or mutate worker state.
2. Use `useGameStore()` for active season/day/team/session metadata.
3. Render with route-local components plus shared `PageShell`, `ResponsiveTable`, `TeamLogo`, chart components, or `@mbd/ui` primitives.
4. For mutations, call worker APIs and then refresh route-local query state. Shell-level sim mutations additionally autosave.

Feature file counts under `apps/web/src/features`:

- Heavy features: dashboard 132 files, trade 76, history 68, roster 44, players 40, offseason 32, onboarding 31, draft 30, scouting 24, staff 24, settings 22, setup 20, minors 20.
- Medium features: free-agency 18, finance 13, league 12, front-office 12, press-room 11, stats 11, save-recovery 10, news 9, schedule 9, gm-career 8, assistant 8, pulse 6, records 6.
- Small features: achievements 8, playoffs 7, scenarios 6, and the four-file rivalry route module.

## Worker API

The real game engine boundary is `apps/web/src/workers/sim.worker.ts`. It exposes a Comlink API by merging:

- `ping()` from the worker entry.
- `actionApi` from `sim.worker.actions.ts`.
- `queryApi` from `sim.worker.queries.ts`.
- onboarding helpers from `sim.worker.onboarding.ts`.

`useWorker()` creates a singleton module worker and exposes a typed proxy. It also:

- Tracks worker readiness and restart/error state.
- Retries non-mutating calls after fatal worker errors.
- Does not retry mutating calls as mutations may have partially applied.
- Maintains a `mutationMethods` set. If a mutation returns `flowStateChanged`, shell subscribers refresh season flow, ticker, pulse, and ceremony state.

For exhaustive API wiring, see `docs/CODEX_WORKER_WIRING_MATRIX.md`. It lists every worker callable, source category, hook coverage, and static feature/app/shared/worker references.

Worker source groups:

- `sim.worker.actions.ts`: new game, sim day/week/month, playoffs, offseason, draft, trades, roster moves, free agency, staff, Rule 5, IFA, save import/export.
- `sim.worker.queries.ts`: all read-model DTOs for pages, dashboard cards, leaders, history, player profiles including derived draft/development decision briefs, finances, records, award races, projections, etc.
- `sim.worker.pipeline.ts`: prospect pipeline DTOs including derived, non-persisted minors development focus priorities.
- `sim.worker.helpers.ts`: `FullGameState`, state singleton helpers, DTO conversion, roster/draft/offseason support including derived draft prospect decision inputs, extension negotiation review evidence, offseason command-center and market-day summary DTOs, active-phase mutation guards, normalization, and many cross-cutting adapters.
- `sim.worker.setup.ts`: `buildNewGameState()` and setup previews.
- `snapshot.ts`: serializes/deserializes `FullGameState` to/from `GameSnapshot`.
- Domain worker modules: achievements, budget, ceremony, consequences, diagnostics, draft, farm, frontOfficeIdentity, legacy, milestones, monthlyPulse, narrative, narrativeFarm, onboarding, pipeline, pressRoom, records, seasonNarrative, stats, storyArcs, ticker, trade.

High-risk files by size and centrality:

- `apps/web/src/workers/sim.worker.test.ts`.
- `apps/web/src/workers/sim.worker.helpers.ts`.
- `apps/web/src/workers/sim.worker.queries.ts`.
- `apps/web/src/workers/sim.worker.actions.ts`.
- `apps/web/src/workers/sim.worker.trade.ts`.
- `packages/contracts/src/schemas/save.ts`.
- `apps/web/src/shared/lib/saveSystem.ts`.

### Worker API Surface

Static extraction from `sim.worker.actions.ts` found 62 mutation/action methods:

- `newGame`, `simDay`, `simWeek`, `simMonth`, `acknowledgeMonthlyReport`, `dismissDecisionSpotlight`, `dismissWelcomeBriefing`, `dismissCeremonyMoment`, `respondToPressConference`, `applyForJob`, `simToPlayoffs`, `simPlayoffGame`.
- `simPlayoffSeries`, `simPlayoffRound`, `simRemainingPlayoffs`, `proceedToOffseason`, `startNextSeason`, `getRosterPlan`, `updateRosterPlan`, `exportSnapshot`, `importSnapshot`, `createWhatIfBranch`, `deleteWhatIfBranch`, `archiveOldSeasons`, `pruneStaleData`.
- `startDraft`, `makeDraftPick`, `scoutDraftPlayer`.
- `toggleDraftBigBoard`, `signDraftPick`, `simulateRemainingDraft`, `proposeTrade`, `startNegotiation`, `advanceNegotiation`, `resolveNegotiation`, `proposeMultiTeam`, `executeMultiTeamTrade`, `respondToTradeOffer`, `promotePlayerAction`, `demotePlayerAction`.
- `dfaPlayerAction`, `promotePlayer`, `demotePlayer`, `designateForAssignment`, `claimOffWaivers`, `makeContractOffer`, `negotiateExtension`, `issueQualifyingOffer`, `resolveQualifyingOffers`, `hireCoach`, `fireCoach`, `advanceOffseason`.
- `skipOffseasonPhase`, `scoutIFAPlayer`, `signIFAPlayer`, `tradeIFAPoolSpace`, `toggleRule5Protection`, `lockRule5Protection`, `makeRule5Pick`, `passRule5Pick`, `resolveRule5OfferBack`, `markNewsRead`.

Static extraction from `sim.worker.queries.ts` found 134 query/read-model methods:

- `getSetupPreview`, `getState`, `getStandings`, `getTeamRoster`, `getFullRoster`, `getPlayer`, `getPlayerMoments`, `getTeamMoments`, `getRecentLeagueMoments`, `getRecentTeamMoments`, `getThisWeekInHistory`, `getPlayerArcsOfSeason`.
- `getNicknamesForPlayer`, `getRelationships`, `getRelationshipWith`, `getPlayerStoryArcs`, `getPlayerProfileView`, `getAdvancedStats`, `getPromotionCandidates`, `getRosterComplianceIssues`, `getAffiliateOverview`, `getProspectPipeline`, `getAffiliateBoxScore`, `getLeagueLeaders`.
- `getPlayoffBracket`, `getHallOfFame`, `getFranchiseTimeline`, `getDynastyScore`, `getBranches`, `compareWithBranch`, `getAchievements`, `getPerformanceDiagnostics`, `getDashboardSummary`, `getGamePlayByPlay`, `getRecentGameRecaps`, `getMonthlyPulse`, `getCurrentLeagueEvents`, `getLeagueEventHistory`.
- `getCeremonyState`, `getSeasonFlowState`, `getUserTeamId`, `searchPlayers`, `getInjuries`, `scoutPlayerReport`, `getScoutingStaff`, `getCoachingStaff`, `getCoachFreeAgents`, `getCoachMarket`, `getDevelopmentReport`, `getDevelopmentReports`.
- `getCoachingImpact`, `getStaffBudget`, `getDevelopmentPipeline`, `getExtensionCandidates`, `getExtensionOffer`, `getQualifyingOfferEligible`, `getQualifyingOfferSalary`, `getIFAPool`, `getDraftClass`, `getDraftCommentary`, `getDraftProspectReaction`, `getDraftPostDraftGrades`.
- `getPlayerTradeValue`, `getTradeOffers`, `getTradeHistory`, `getTradeDeadlineState`, `getTradeDialogue`, `getTradeAssetInventory`, `getNegotiation`, `getOpenNegotiations`, `evaluateMultiTeamFairness`, `generateConditionalClause`, `getRosterState`, `getFreeAgents`.
- `getOffseasonState`, `getSpringTrainingView`, `getSeasonRecap`, `getOffseasonHeadline`, `getNews`, `getBriefing`, `getPressRoomFeed`, `getInteractivePressConference`, `getTeamChemistry`, `getOwnerState`, `getFrontOfficeState`, `getFrontOfficeIdentity`.
- `getGMCareer`, `getCareerRetrospective`, `getSeasonStoryReel`, `getJobMarket`, `getScoutConflicts`, `getScoutConflict`, `getDynastyCards`, `getDynastyLeaderboard`, `getScenarioCatalog`, `getScenarioProgress`, `getPersonalityProfile`, `getAwardRaces`.
- `getAwardRaceBoards`, `getAwardRaceDetail`, `getRivalries`, `getAwardHistory`, `getSeasonHistory`, `getHistoryOverview`, `getSeasonHistoryView`, `getSeasonArchive`, `compareSeasons`, `getRecordBook`, `getRecordWatchList`, `resolveHistoryDisplayNames`.
- `getTeamFinances`, `getTickerFeed`, `getScheduleView`, `getAllTimeLeaders`, `getFinanceOverview`, `getCoachingChemistry`, `getMentorships`, `getScenarioObjectivesView`, `getTradeDeadlineDrama`, `getMilestoneAlerts`.
- `getMilestoneTrackerAlerts`, `getChaseWatch`, `getPennantRaces`, `getPennantRaceDetail`, `getPlayerComparison`, `getSeasonProjections`, `getPlayerSimilarity`, `getEnhancedGamePlayByPlay`, `getAwardCeremony`, `getBreakoutIntelligence`, `getProspectBreakoutWatch`, `getScoutConsensus`, `getPlayoffMomentum`, `getFreeAgencyMarketIntelligence`.

Onboarding exports add seven methods: `getOnboardingData`, `completeOnboarding`, `getAGMCandidates`, `getRevisedOnboardingData`, `applyStaffHires`, `applyScoutingHire`, and `completeRevisedOnboarding`.

The total worker API in `sim.worker.ts` is 204 callable methods: `ping` plus 62 actions, 134 queries, and 7 onboarding methods.

### Worker Hook Coverage Notes

`useWorker()` returns 198 object keys in this snapshot: 196 callable functions plus `workerStatus` and `isReady`. Of those functions, 194 are direct worker API calls; `restartWorker` and `subscribeToFlowUpdates` are hook-local helpers.

Worker methods not returned by `useWorker()`:

- Low-level roster aliases hidden behind public hook wrappers: `promotePlayerAction`, `demotePlayerAction`, `dfaPlayerAction`.
- Raw/helper/future read APIs: `getUserTeamId`, `getInjuries`, `getPlayerTradeValue`, `getRosterState`, `getSeasonHistoryView`, `getTeamFinances`, `getDevelopmentPipeline`.

Important current wiring detail: `FreeAgencyPage.tsx` passes typed `getFreeAgents` and `getFinanceOverview` hook methods into `useFreeAgencyRouteData`, and `HistoryPage.tsx` now calls typed `getHistoryOverview`. `getTeamFinances` remains worker-side/test-internal; current free agency UI uses `getFinanceOverview`.

Player profile detail APIs like `getPlayerMoments`, `getNicknamesForPlayer`, `getPlayerStoryArcs`, `getMilestoneAlerts`, `getDevelopmentReports`, and `getScoutConflict` are often available directly but mostly consumed through the aggregate `getPlayerProfileView()` surface. The profile aggregate now derives non-persisted `developmentReports.draftOutcome` for History and `developmentReports.developmentDecision` for Development, including role-aware mentorship data so proteges display their mentor and veterans display their protege. Do not delete direct APIs based only on route-level grep results.

The stale `getEnhancedPressConference` / `respondToEnhancedPressConference` worker pair was retired in Phase 5.1; `AppLayout` owns the live press-conference UX through `getInteractivePressConference` / `respondToPressConference`. `PressConferenceModal` owns the app-shell press-conference dialog semantics, shared focus trap, Escape dismissal, header close control, and launcher focus restoration while receiving those existing callbacks.
`getMentorships` is now a typed hook method consumed by `StaffPage` for the clubhouse mentorship board and by `useFrontOfficeRouteData` for the Clubhouse Web summary, including mentor/protegee lanes, clubhouse leaders, conflict watch, and development lift.
Static app search still finds `getDevelopmentPipeline` without a route consumer; it is kept worker-side for future player-development surfaces and is not currently returned by `useWorker()`.

### Worker Module Risk Map

Treat worker modules as the bridge between React UX and pure sim-core logic:

- `sim.worker.ts`: Comlink boundary and API merge. Add new public methods here only by adding to actions, queries, or onboarding exports; keep this file thin.
- `sim.worker.actions.ts`: mutable gameplay commands. Any state mutation, autosave-triggering flow result, or phase transition belongs here or in a helper called from here. Tests should cover changed mutations.
- `sim.worker.queries.ts`: read models for routes. Prefer adding page DTOs here rather than importing sim-core internals into components. Query methods should not mutate persistent game state; current profile decision briefs are derived DTOs only.
- `sim.worker.helpers.ts`: `FullGameState`, state singleton access, DTO conversion, roster/draft/offseason adapters including scoped deterministic draft scouting reveal, and many cross-domain utilities. High risk because small changes can affect many pages.
- `snapshot.ts`: import/export between runtime Maps/classes and serializable `GameSnapshot`. Any persisted field or migration-sensitive default touches this path.
- `sim.worker.setup.ts`: new game and setup preview creation. Seed handling and generated world defaults live here.
- `sim.worker.trade.ts`: trade offers, valuations, negotiation, multi-team trades, deadline theatre, derived deadline market intelligence, war-room checkpoints, negotiation posture copy, and action-result review evidence. It is large enough to inspect locally before each change.
- `sim.worker.draft.ts`, `sim.worker.farm.ts`, `sim.worker.pipeline.ts`, `sim.worker.records.ts`, `sim.worker.stats.ts`: route-facing derived views around core draft/farm/prospect/record/stat domains. `sim.worker.pipeline.ts` owns the route-wired `developmentFocus` board for minors decisions.
- `sim.worker.narrative.ts`, `sim.worker.narrativeFarm.ts`, `sim.worker.seasonNarrative.ts`, `sim.worker.storyArcs.ts`, `sim.worker.ticker.ts`, `sim.worker.pressRoom.ts`, `sim.worker.monthlyPulse.ts`, `sim.worker.ceremony.ts`, `sim.worker.milestones.ts`: narrative, overlays, alerts, and long-memory presentation layers. Deterministic ordering still matters because user-facing story state is part of the dynasty experience.
- `sim.worker.frontOfficeIdentity.ts`, `sim.worker.budget.ts`, `sim.worker.consequences.ts`, `sim.worker.achievements.ts`: player/owner/fan/org consequences and score surfaces. Balance and persistence risks are higher than normal UI work.
- `sim.worker.diagnostics.ts`: performance/maintenance views and branch archival helpers. This is where settings-page maintenance actions connect to worker state.
- `sim.worker.onboarding.ts`: revised onboarding, AGM/staff/scouting choices, Day One setup consequences.
- `sim.worker.legacy.ts`: compatibility/defaulting helpers for older or partially populated state. Read this before deleting fallback logic.
- `sim.worker.state.ts`: tiny wrappers around the shared worker state singleton. Keep it boring.

Worker tests are concentrated in `sim.worker.test.ts`, focused module tests like `sim.worker.queries.test.ts`, `sim.worker.achievements.test.ts`, onboarding tests, integration tests, and `snapshot.test.ts`. If a route calls a worker method only through a cast, strongly consider adding a hook or route test when making it first-class.

### Feature-to-Worker Wiring

Direct `worker.method` references in `apps/web/src/features` currently group as follows. Names like `helpers`, `trade`, `stats`, and `narrative` are type/property references captured by the static grep; inspect the file before treating those as callable worker APIs.

- `achievements`: `getAchievements`, `getAwardCeremony`. `useAchievementsRouteData` owns route-side achievement loading, worker-readiness gating, filter state, award-ceremony loading/state, worker-to-panel view cast, and season/day/phase refresh while `AchievementsPage` keeps worker/store acquisition, `PageShell`, lazy modal slot construction, and route composition.
- `dashboard`: `applyForJob`, `dismissWelcomeBriefing`, `exportSnapshot`, `getDashboardSummary`, `getGMCareer`, `getGamePlayByPlay`, `getJobMarket`, `getOffseasonHeadline`, `getPlayerArcsOfSeason`, `getProspectPipeline`, `getRecentGameRecaps`, `getRecentLeagueMoments`, `getRecentTeamMoments`, `getRosterComplianceIssues`, `getScheduleView`, `getSeasonRecap`, `getTeamMoments`, `getThisWeekInHistory`, `getTradeDeadlineState`, `simDay`, `simMonth`, `simWeek`.
- `draft`: `getDraftClass`, `getDraftCommentary`, `getDraftProspectReaction`, `getDraftPostDraftGrades`, `startDraft`, `makeDraftPick`, `scoutDraftPlayer`, `toggleDraftBigBoard`, `signDraftPick`, `simulateRemainingDraft`. `useDraftRouteData` owns route-side draft-room loading, selected-prospect fallback, visible-pick/watch reveal state, war-room DTO loading, post-draft-grade loading, and draft-pick announcement audio; `useDraftActionHandlers` owns route-side draft action loading/error state, bonus offers, signing state, watch-result reveal boundaries, scout/big-board reload delegation, and existing mutation callback sequencing while `DraftPageContent` composes the availability state, draft-room panel grid, route error banner, and route-provided nudge card. `DraftPage` keeps worker method acquisition, nudge state, autosave, and orchestration.
- `finance`: `getFinanceOverview`.
- `free-agency`: `getFreeAgents`, `getFinanceOverview`, `makeContractOffer`.
- `front-office`: `getFrontOfficeIdentity`, `getFrontOfficeState`, `getOwnerState`, `getRelationships`, `getTeamChemistry`, `getMentorships`. `FrontOfficeIdentityCard` owns pure assistant GM, scouting director, philosophy, alignment, and consequence rendering while using the shared dense shell; `FrontOfficeOwnerCards` owns pure owner profile, expectations, budget, pressure, and money-label rendering while its owner/budget cards use shared dense shells; `FrontOfficeHealthCards` owns pure reputation score/delta and clubhouse chemistry tier/trend/reason rendering while its reputation/chemistry cards use shared dense shells; `FrontOfficeLeagueStandingCard` owns pure League Standing relationship sorting, tier labels, team/event rows, and empty-memory fallback rendering while using the shared dense shell; `FrontOfficeClubhouseWebCard` owns pure mentor-lane, room-captain, and conflict-watch rendering from the existing mentorship DTO while using the shared dense shell; `useFrontOfficeRouteData` owns front-office worker loading, DTO storage, safe empty payloads, and season/day/phase refresh; `FrontOfficePage` keeps worker/store acquisition, hook wiring, `PageShell`, and route composition.
- `gm-career`: `getGMCareer`, `getJobMarket`, `getTeamMoments`. `useGMCareerRouteData` owns route-side career, job-market, and current-team moment loading with worker readiness gating and season/day/phase refetch behavior. `GMCareerContentPanel` owns pure GM profile, career record, timeline, job-market, team identity section, team-label helpers, and win-percentage rendering while using shared dense shells for its compact panels, `TeamIdentityCard` owns pure team-moment filters/cards while using the shared dense shell, and `GMCareerPage` keeps worker method acquisition, store GM-name readout, loading state, hook wiring, and route composition.
- `history`: `compareSeasons`, `compareWithBranch`, `getAchievements`, `getAllTimeLeaders`, `getAwardHistory`, `getAwardRaces`, `getBranches`, `getDynastyCards`, `getDynastyLeaderboard`, `getDynastyScore`, `getFranchiseTimeline`, `getHallOfFame`, `getHistoryOverview`, `getRecordBook`, `getRecordWatchList`, `getRivalries`, `getSeasonArchive`, `getSeasonHistory`, `resolveHistoryDisplayNames`.
- `league`: `getLeagueLeaders`, `getStandings`. `LeagueLeadersContentPanel` owns pure category controls, mobile-critical category button markers, hitter/pitcher support columns, leaderboard table rows, player links, team logo display, stat formatting, and empty-state rendering; `StandingsContentPanel` owns pure standings header/help placement, division sorting/cards, desktop/mobile rows, user-team highlighting, games-back/run-differential/streak formatting, and empty-division rendering. `useLeagueLeadersRouteData` and `useStandingsRouteData` own route-side worker loading, readiness gating, empty fallbacks, leader category state, and season/day/phase refresh while `LeadersPage` and `StandingsPage` keep worker/store acquisition plus route composition.
- `minors`: `getAffiliateBoxScore`, `getAffiliateOverview`, `getProspectBreakoutWatch`, `getProspectPipeline`.
- `news`: `exportSnapshot`, `getNews`, `markNewsRead`.
- `offseason`: `advanceOffseason`, `getExtensionCandidates`, `getOffseasonHeadline`, `getOffseasonState`, `getQualifyingOfferEligible`, `getQualifyingOfferSalary`, `getSeasonRecap`, `getSpringTrainingView`, `issueQualifyingOffer`, `lockRule5Protection`, `makeRule5Pick`, `passRule5Pick`, `resolveQualifyingOffers`, `resolveRule5OfferBack`, `skipOffseasonPhase`, `toggleRule5Protection`.
- `onboarding`: `applyScoutingHire`, `applyStaffHires`, `completeRevisedOnboarding`, `exportSnapshot`, `getAGMCandidates`, `getRevisedOnboardingData`.
- `players`: `demotePlayer`, `designateForAssignment`, `getBreakoutIntelligence`, `getExtensionOffer`, `getLeagueLeaders`, `getPlayerComparison`, `getPlayerProfileView`, `getPlayerSimilarity`, `getScoutConsensus`, `getSeasonProjections`, `negotiateExtension`, `promotePlayer`, `searchPlayers`.
- `playoffs`: `getDynastyScore`, `getPlayoffBracket`, `getPlayoffMomentum`, `getSeasonFlowState`, `simPlayoffGame`, `simPlayoffRound`, `simPlayoffSeries`, `simRemainingPlayoffs`. `PlayoffsContentPanel` owns pure bracket/dynasty/current-series rendering plus mobile-critical postseason sim controls, `usePlayoffsPageController` owns route-side playoff/dynasty/season-flow loading, season/day/phase refetch, busy action state, store update, and post-mutation refresh sequencing, while `PlayoffsPage` keeps worker/store acquisition, lazy momentum slot construction, and route composition.
- `press-room`: `getPressRoomFeed`.
- `pulse`: `acknowledgeMonthlyReport`, `dismissDecisionSpotlight`, `getCurrentLeagueEvents`, `getMonthlyPulse`. `usePulseRouteData` owns route-side monthly pulse and league-event loading, worker readiness gating, season/day/phase refetch behavior, acknowledge/dismiss refresh sequencing, content derivation, and urgency sorting. `PulseContentPanel` owns pure monthly report cards, decision spotlight cards, empty-state rendering, deterministic league-event narrative rendering through `createGameRNG(createLeagueEventSeed(event))`, links, and acknowledge/dismiss callback delegation while `PulsePage` keeps worker method acquisition, route hook wiring, header copy, and route composition.
- `records`: `getRecordBook`, `getRecordWatchList`. `useRecordWatchRouteData` owns route-side record-book and active-record-watch loading, worker readiness gating, and season/day/phase refetch behavior. `RecordWatchContentPanel` owns pure header, stats-reference link, view-mode tabs, record-watch cards, empty states, record-book grouping/table rows, pace formatting, category badges/labels, and player links while `RecordWatchPage` keeps worker acquisition, game-store season/day/phase reads, view-mode state, PageShell loading, hook wiring, and route composition.
- `rivalries`: `getRivalries`.
- `roster`: `claimOffWaivers`, `demotePlayer`, `designateForAssignment`, `getAffiliateOverview`, `getExtensionCandidates`, `getExtensionOffer`, `getFullRoster`, `getPromotionCandidates`, `getRosterComplianceIssues`, `getRosterPlan`, `getTeamChemistry`, `negotiateExtension`, `promotePlayer`, `updateRosterPlan`. `RosterStatusPanel` owns pure rendering for the roster header, action feedback, and clubhouse chemistry summary; `RosterTabs` owns pure MLB/minors/contracts/lineup tab labels, active value, lineup icon, and tab-change delegation; `RosterCompliancePanel` owns pure rendering for compliance pressure, issue chips, and DFA recommendations while using shared `DensePanel` for the compliance shell; `RosterMlbControlPanel` owns pure rendering for MLB control-room compliance composition and active hitter/pitcher tables while using shared `DensePanel` for those table shells; `rosterMlbColumns` owns pure MLB hitter/pitcher column construction, player profile links, grade/service/option/stat cells, WAR formatting, and mobile-critical demote-button delegation; `RosterMinorLeaguesPanel` owns pure rendering for promotion recommendations, affiliate snapshots, waiver claims, recent affiliate results, and waiver mobile-critical controls while using shared `DensePanel` for compact minors intelligence shells; `RosterMinorLevelTable` owns the per-level minor table shell, player profile links, grade/options cells, empty state, International intake-only copy, and mobile-critical promote-button delegation; `RosterContractsPanel` owns pure rendering for the contracts tab extension command center plus candidate file cards while using shared `DensePanel` for those contracts shells; `RosterLineupPanel` owns pure rendering for batting-order, rotation, and positional-depth planning cards while using shared `DensePanel` for its lineup planning shells and delegating reorder callbacks; `RosterActionConfirmationModal` owns pure rendering for pending promote/demote/DFA confirmation copy and cancel/confirm buttons; `RosterExtensionNegotiationModal` owns pure rendering for extension negotiation current-deal/proposed-offer fields, guardrails, latest response, review evidence, and close/walk-away/submit buttons; `rosterPlanTransforms` owns pure route-side batting-order, bullpen, roster-plan-to-depth-plan, and display depth-chart transformations; `useRosterRouteData` owns route-side full-roster, chemistry, promotion, compliance, affiliate, extension-candidate, roster-plan, and refresh loading state; `useRosterLineupControls` owns route-side hitter/pitcher split, save-scoped local depth-plan storage, roster-plan persistence callbacks, autosave sequencing, lineup/rotation ordering, depth-chart construction, and lineup panel prop construction; `useRosterActionHandlers` owns route-side pending promote/demote/DFA confirmations, waiver claims, busy state, rejection feedback, refresh, and autosave sequencing for existing roster worker actions; `useRosterExtensionNegotiation` owns route-side extension offer loading, form state, submission payload construction, negotiation response state, accepted-offer refresh, and autosave sequencing; `useRosterPageController` owns active-tab state, existing hook composition, typed `updateRosterPlan` handoff, roster table column construction, and final `RosterPageContent` prop construction; `ExtensionCommandCenter` owns pure rendering for extension urgency/leverage triage from existing candidate DTOs; `ExtensionOfferGuardrails` owns pure rendering for effective-AAV, target, walk-away, offer-structure, control-runway, payroll-lift, and target-gap guidance inside the negotiation modal; `negotiateExtension` responses include derived, non-persisted review evidence from existing negotiation rounds for offer gap, team/player AAV, risk level, and walk-away roll; `RosterPage` now owns worker/store/autosave acquisition and final rendering.
- `scenarios`: `getScenarioCatalog`, `getScenarioObjectivesView`, `getScenarioProgress`.
- `schedule`: `getEnhancedGamePlayByPlay`, `getGamePlayByPlay`, `getScheduleView`. `ScheduleContentPanel` owns pure schedule header, record derivation, season/day summary, opponent rows, W/L badges, current-day row ref attachment, empty-state rendering, completed-game click delegation, and mobile-critical completed-game row semantics with Enter/Space keyboard activation while `useScheduleRouteData` owns route-side schedule loading, worker readiness gating, safe empty payloads, and season/day/phase refresh. `SchedulePage` keeps worker/store acquisition, current-day scrolling, navigation, hook wiring, and route composition. `BoxScoreContentPanel` owns pure loaded-game score header, linescore, recap, enhanced-play-by-play slot placement, grouped classic play-by-play, scoring-text heuristic, ordinal labels, and empty-state rendering while `useBoxScoreRouteData` owns route-side `getGamePlayByPlay` loading, worker/game readiness gating, null payload fallback, and URL game-ref refetch behavior for numeric live indexes or archived ids. `useEnhancedPlayByPlayData` owns lazy enhanced-play-by-play `getEnhancedGamePlayByPlay` loading, worker/game readiness gating, null payload fallback, and numeric game-index refetch behavior while `EnhancedPlayByPlay` keeps highlight filtering, show-all state, excitement badges/icons, situation labels, and rendering. `BoxScorePage` keeps URL parsing, hook wiring, missing-game rendering, walk-off audio, lazy enhanced-play-by-play slot wiring for live numeric games only, and route composition.
- `scouting`: `getIFAPool`, `getOwnerState`, `getScoutConflicts`, `getScoutingStaff`, `getTeamChemistry`, `scoutIFAPlayer`, `scoutPlayerReport`, `searchPlayers`, `signIFAPlayer`, `tradeIFAPoolSpace`.
- `settings`: `archiveOldSeasons`, `createWhatIfBranch`, `deleteWhatIfBranch`, `exportSnapshot`, `getBranches`, `getPerformanceDiagnostics`, `importSnapshot`, `pruneStaleData`.
- `setup`: `exportSnapshot`, `getScenarioCatalog`, `getSetupPreview`, `importSnapshot`, `newGame`. `SetupPageContent` owns pure launch header, return/new-dynasty actions, status banner, save-hub placement, wizard/preview layout, and callback delegation; `useSetupPageController` owns setup hook composition, wizard focus, save/import/export/new-game handler wiring, team-option constants, and `SetupPageContent` prop construction while `SetupPage` keeps worker/recovery/store/navigation acquisition and final route composition.
- `staff`: `fireCoach`, `getCoachMarket`, `getCoachingChemistry`, `getCoachingImpact`, `getCoachingStaff`, `getMentorships`, `getStaffBudget`, `hireCoach`.
- `stats`: `getPerformanceDiagnostics`. `useStatsEncyclopediaRouteData` owns optional league-context diagnostics loading, worker readiness gating, and season/day/phase refetch behavior; `statDefinitions.ts` owns the static stat reference data; `StatsEncyclopediaContent` owns pure route header, league-context panel, leaderboard link, and stat-library composition; `StatsDefinitionLibraryPanel` owns pure stat filters, category counts, stat cards, formulas, and quality-scale badges while `StatsEncyclopediaPage` keeps worker method acquisition, game-store reads, filter state, hook wiring, `PageShell`, and route composition.
- `trade`: `getTradeOffers`, `getTradeHistory`, `getTradeDeadlineState`, `getTradeDeadlineDrama`, `getTradeDialogue`, `getTradeAssetInventory`, `getNegotiation`, `getOpenNegotiations`, `evaluateMultiTeamFairness`, `generateConditionalClause`, `startNegotiation`, `advanceNegotiation`, `resolveNegotiation`, `proposeMultiTeam`, `executeMultiTeamTrade`, `proposeTrade`, `respondToTradeOffer`. `getTradeDeadlineState()` includes derived, non-persisted market intelligence and war-room rows rendered by `DeadlineTheatreCard`, plus deadline analysis rendered by `DeadlineRecapCard`; both deadline panels use shared `DensePanel` for their compact shells. `TradePageContent` composes the route header, deadline dashboard, route-provided deadline-drama slot, activity column, and builder stack from route-owned props, `tradePageContentProps` builds that pure prop graph while preserving route-owned callbacks, and `tradeRouteContentProps` maps grouped route hook state into that graph while keeping callback ownership in the route layer; `TradePageHeader` renders the route title, subtitle, and help affordance; `TradeLoadingSkeleton` renders the route loading placeholder passed into `PageShell`; `TradeDeadlineDashboard` composes the market-status banner, deadline theatre, route-provided deadline-drama slot, and recap card from route-owned copy/state; `DeadlineDramaPanelBody` owns pure trade-deadline loading, phase-aware empty copy, countdown, buyer/seller overview, today-event/timeline list placement, active bidding-war placement, and full-timeline expansion delegation while `DeadlineEventRow` owns deadline-event label, day, urgency indicator, urgency score, and description rendering, `DeadlineBiddingWarCard` owns active bidding-war round sorting, settled winner styling, and offer-round rendering, and `DeadlineDramaPanel` keeps `getTradeDeadlineDrama` loading, game-phase acquisition, and timeline-expanded state; `TradeActivityColumn` owns hot-offers, active-talks, league-ticker, and trade-history panel placement from existing route-owned state while using shared `DensePanel` for its compact shells; `TradeOfferCard` owns hot-offer team, fairness, urgency, dialogue, asset-summary, and action rendering; `TradeNegotiationSummaryCard` owns active-talk round, phase, asset-summary, and resume rendering; `TradeHistoryLedgerPanel` renders season ledger copy, completed-trade rows, asset-count badges, fairness copy, and empty history state from route-owned history DTOs while using shared `DensePanel`; `TradeMarketStatusPanel` renders the market-open/closed route banner from route-derived copy; `TradeBuilderStack` composes the right-side builder panel, route-owned result banner, and optional multi-team modal from route-provided props; `TradeBuilderPanel` composes the builder context, active negotiation controls, asset grid, and package evaluation from route-owned props/callbacks; `TradeBuilderContextPanel` renders builder title, target-club selection, relationship memory, and GM dialogue from route-owned state/callbacks; `MultiTeamTradeModal` renders the multi-team modal shell, lane list, framework summary, conditional controls, result stack, and modal actions from hook-owned state/callbacks passed through the route, and it owns modal focus capture/trapping, Escape close, and focus restoration for the 3+ team trade workflow; `MultiTeamFrameworkSummaryPanel` renders the multi-team modal framework summary from hook-owned lanes/rosters/moved-player labels; `MultiTeamControlColumn` renders conditional-clause selection/list state and Room Read fairness/net-value display from hook-owned state/callbacks; `MultiTeamLaneCard` renders each multi-team team lane from hook-owned lane state and callbacks; `MultiTeamResultStack` renders multi-team messages, proposal responses, execution results, and cascade rows from hook-owned state; `TradeNegotiationPanel` renders the active negotiation posture/dialogue/package decision panel from route-owned state and callbacks; `TradePackageEvaluationCard` renders package summary, value/fairness, and submit/clear controls from route-owned state and callbacks; `TradeAssetSelectionGrid` composes the two asset-column panels from hook-owned filtered roster assets, selected-player/pick state, IFA state, existing inventories, and callbacks; `TradeAssetColumnPanel` renders roster row tables, asset-filter buttons, draft-pick buttons, IFA pool controls, selected-state styling, and disabled market guards; `useTradeActionHandlers` owns route-side trade submission validation, start/advance/resolve/counter/offer-response action handlers, proposing state, result mapping, and existing refresh/autosave callback sequencing; `useTradeAssetBuilder` owns selected player/pick/IFA package state, asset filters, selected-asset DTO derivation, filtered roster rows, and stale result clearing for package edits; `useTradeBuilderCoordinator` owns preselected-player insertion plus builder reset/clear, negotiation apply/resume, and trade-partner callback bridging; `useTradeMarketContext` owns other-team filtering, effective market phase, market-open copy, relationship map, and selected relationship lookup; `useTradePackageSummary` owns player lookup across both rosters, package summary-row labels, and package value totals; `useTradeDialogue` owns GM dialogue worker loading, market/readiness clearing, proposal/counter mode selection, and stale-response guarding; `useTradeMultiTeamBuilder` owns multi-team modal open/lane/condition/fairness/proposal/execution state, proposal derivation, feedback invalidation, conditional-clause/propose/execute handlers, and execution refresh delegation; `useTradeMultiTeamRosters` owns the modal-side multi-team roster cache and missing-team load effect; `useTradeSnapshotPersistence` owns active-save gating, root-slot autosave scheduling, branch/root metadata preservation, fallback save names, and autosave error logging; `useTradeResultAudio` owns the accepted-result `trade_completed` audio effect; `useTradeRouteData` owns route-side user/target roster and asset-inventory loading, trade history/deadline/season-flow loading, relationship loading, and open-negotiation loading/clearing; `useTradeNegotiationState` owns active negotiation/result state and URL deep-link state; `useTradePageController` owns selected target team state, worker/game handoff into trade hooks, multi-team execution refresh orchestration, negotiation auto-resume effect, result audio hook placement, PageShell loading derivation, and `TradePageContent` prop construction. `tradeBuilderTransforms` owns selected-asset construction, package summary rows, multi-team moved-player condition targets, multi-team lane mutation transforms, multi-team open-state construction, trade submission validation, worker decision-to-result banner mapping, and full builder selection mapping from worker assets/asset views; `TradeResultBanner` renders accepted/counter/declined trade outcome and review evidence from route-owned state; `TradeNegotiationView` includes derived GM posture and counteroffer copy; package-backed negotiation action results include derived review evidence. `TradePage.tsx` is 23 lines and owns only `useWorker()`, `useGameStore()`, the `DeadlineDramaPanel` slot, `PageShell`, `TradeLoadingSkeleton`, and final content rendering; inspect the controller before changing trade UX.

### Largest Source Files

These are the files most likely to exceed one-session context if you try to reason about them casually:

- `apps/web/src/workers/sim.worker.test.ts` at about 7,192 lines.
- `apps/web/src/workers/sim.worker.helpers.ts` at about 5,450 lines.
- `apps/web/src/workers/sim.worker.queries.ts` at about 4,876 lines.
- `apps/web/src/workers/sim.worker.trade.ts` at about 3,628 lines.
- `packages/contracts/src/schemas/save.ts` at about 3,083 lines.
- `apps/web/src/workers/sim.worker.actions.ts` at about 3,074 lines.
- `apps/web/src/workers/sim.worker.queries.test.ts` at about 2,257 lines.
- `packages/sim-core/src/index.ts` at about 1,464 lines.
- `packages/sim-core/src/moments/seasonIdentityMoments.ts` at about 1,452 lines.
- `apps/web/src/workers/sim.worker.narrative.ts` at about 1,407 lines.
- `apps/web/src/app/layout/AppLayout.test.tsx` at about 1,373 lines.
- `packages/sim-core/tests/momentDetector.test.ts` at about 1,354 lines.
- `packages/sim-core/src/narrative/newsFeed.ts` at about 1,329 lines.
- `packages/sim-core/src/narrative/pressConferences.ts` at about 1,279 lines.
- `DashboardPage.tsx` is now about 51 lines after controller extraction, `RevisedOnboardingPage.tsx` is about 79 lines after controller extraction, `HistoryPage.tsx` is about 66 lines after presentation-hook extraction, `StatsEncyclopediaPage.tsx` is about 36 lines after content/data extraction, `SetupPage.tsx` and `DraftPage.tsx` are now about 27 lines after controller extraction, `ScoutingPage.tsx` is about 25 lines after controller extraction, `TradePage.tsx` is about 23 lines after controller extraction, and `OffseasonPage.tsx` is about 22 lines after controller extraction.

## Save System

There are two persistence layers:

1. Browser storage metadata in `apps/web/src/shared/lib/saveSystem.ts`.
2. Game snapshot schema in `packages/contracts/src/schemas/save.ts`.

`saveSystem.ts` uses Dexie/IndexedDB database `mbd-saves` with:

- `saves` table.
- `leaderboard` table.
- Five root save slots.
- Up to three what-if branches per root save.
- Legacy metadata handling and repair helpers.
- `loadSaveSafely()` for parse/migration/version failures.
- `scheduleAutoSave()` queueing around `saveGame()`.

Snapshot state:

- Current version is 33.
- `GameSnapshotSchema` is the canonical current schema.
- `parseGameSnapshot()` migrates older snapshots up to current.
- `exportGameSnapshot()` in worker `snapshot.ts` converts Maps and runtime state into serializable arrays/objects.
- `importGameSnapshot()` rebuilds Maps, standings tracker, RNG, offseason/draft/roster state, defaults, and derived missing state.

Save-safety rules:

- Any new persisted field needs schema version bump, parser/migration update, fixture/test update, and backwards compatibility note.
- Ask: would this break a Season 10 save? If yes, redesign.
- Prefer additive migrations and defaulted fields.
- Do not store runtime-only objects like Maps directly in contracts. Convert through snapshot helpers.

Known save-path caution:

- `saveSystem.loadSaveSafely()` calls `parseGameSnapshot()` before worker import, so normal save loads can migrate old saves.
- Direct worker `importSnapshot()` goes through `snapshot.ts` `validateSnapshot()`, which delegates to the contracts parser/migration path for supported legacy snapshot versions including v18-v32. Keep direct import, save-system load, and migration fixtures aligned before changing import/export behavior or external JSON import.

## Determinism

All gameplay randomness must flow through `GameRNG` in `packages/sim-core/src/math/prng.ts`.

`GameRNG` wraps `pure-rand` xoroshiro128plus, tracks seed and call count, supports `fork()`, and serializes/replays state. Source search found no `Math.random()` use in `apps/web/src` or `packages` in this snapshot.

Wall-clock/non-seeded APIs found in this snapshot are not in sim outcome paths:

- `Date.now()` is used for worker ping, diagnostics fallback timing, setup default seed/default GM name, UI animation timing, and performance utilities.
- `new Date()` is used for save/import/export metadata and rendering stored timestamps.
- `crypto.randomUUID()` is used for branch save IDs in `saveSystem.ts`, with a `Date.now()` fallback for IDs only.

The setup screen's default seed is generated from `Date.now()`, but that selected seed is then passed into `GameRNG` as explicit game setup input. If future work adds any gameplay-facing wall-clock use after setup, treat it as a determinism risk.

Determinism pitfalls:

- Every sort that can affect output should have full stable tie-breakers.
- Do not rely on Map insertion order unless it is deliberately built from deterministic source order.
- Prefer cloning caller-owned arrays/maps before ranking or mutating.
- Use `rng.fork()` for independent subsystems, as seen in new-game setup and schedule generation.
- Narrative and UI-facing order must be deterministic too, not just sim outcomes.

## New Game Setup

`buildNewGameState()` in `sim.worker.setup.ts` builds the starting world:

- Creates root `GameRNG` from selected seed.
- Generates all players for all 32 fictional teams.
- Initializes player development profiles and initial team tenure.
- Generates the 162-game schedule.
- Creates season state, service time, scouting staffs, GM personalities, coaching staffs, roster states, owner/front-office state, rivalries, record book, GM career, empty narrative stores, trade state, achievements, ceremony state, and diagnostics.
- Initializes Day One onboarding state unless scenario/career mode bypasses it.

Setup preview uses the same seeded world builder, then extracts projected wins, top players, farm grade, strengths/weaknesses, division rivals, and identity copy.

## Simulation Core

`packages/sim-core` is intended to be pure TypeScript engine logic. The worker mutates `FullGameState` while sim-core generally returns values.

Core sim:

- `math/prng.ts`: deterministic RNG.
- `math/log5.ts`: batter/pitcher probability blending.
- `sim/plateAppearance.ts`: converts attributes to PA outcome probabilities and rolls outcome.
- `sim/markov.ts`: 24-state base/out transition function.
- `sim/gameSimulator.ts`: 9+ inning game loop, lineup cycling, bullpen fatigue, stats, winner/loser/save.
- `sim/seasonSimulator.ts`: schedule day/week/month execution, standings, stat accumulation, monthly splits.
- `sim/playoffSimulator.ts`: playoff seeding/bracket/series advancement.
- `sim/calendar.ts`: regular-season day/month/deadline calendar.
- `sim/playoffMomentum.ts`: postseason momentum modifiers and narrative hooks.

League/data:

- `league/teams.ts`: 32 fictional franchises and divisions.
- `league/schedule.ts`: deterministic 162-game schedule generator.
- `league/standings.ts`: standings tracker and serialization.
- `league/awards.ts`, `hallOfFame.ts`, `records.ts`, `rivalries.ts`, `gmRelationships.ts`, `relationshipEffects.ts`, `frontOffice.ts`, `achievements.ts`, `narrativeState.ts`.

Players:

- `player/generation.ts`: player creation, roster distribution, opening contracts.
- `player/attributes.ts`: internal/display ratings and grade conversion.
- `player/development.ts`, `developmentPipeline.ts`, `developmentSetbacks.ts`, `breakoutEngine.ts`, `breakouts.ts`: growth/regression/prospect arcs.
- `player/coaching.ts`, `coachingChemistry.ts`, `mentorship.ts`, `personalityTraits.ts`, `prospectBonds.ts`, `teamTenures.ts`, `injury.ts`.
- `player/comparison.ts`, `similarity.ts`, `attributeDescriptors.ts`: player analysis surfaces.

Roster/economics:

- `roster/rosterManager.ts`: roster states, movement, and AI MLB roster autofill. Autofill can receive runtime-only team-building identity context while preserving roster-manager limits; when the 40-man is full, it skips blocked non-40-man candidates and keeps searching for legal already-40-man fill options. AI callers can also opt into service-time protection so zero-service high-upside prospects are not used for routine depth fill when veteran depth can fill the MLB spot. Worker AI overflow normalization keeps active Rule 5 players protected and applies the same option/waiver preflight used by user demotions.
- `roster/freeAgency.ts`: FA market and AI bidding. AI bids can receive a runtime-only team-building identity to tune aggression.
- `roster/offseason.ts`: offseason phase flow.
- `roster/minorLeagues.ts`, `minorLeagueStats.ts`: farm state and affiliate day sim.
- `roster/rule5.ts`: Rule 5 handling.
- `finance/contracts.ts`: service time, arbitration, contracts, extensions, payroll, luxury tax. Extension candidate scoring can receive runtime-only team-building identity context.
- `finance/marketIntelligence.ts`: market reports and signing predictions.

Player acquisition:

- `draft/draftPool.ts`, `draftAI.ts`, `draftPicks.ts`, `draftScouting.ts`, `draftSigning.ts`.
- `scouting/scoutingEngine.ts`, `international.ts`, `scoutLearning.ts`, `conflicts.ts`.
- `trade/tradeAI.ts`, `valuation.ts`, `tradeNegotiation.ts`, `multiTeamTrade.ts`, `deadlineDrama.ts`. Trade generation accepts runtime team-building identity context for deadline buyer/seller posture.

Narrative/long memory:

- `narrative/newsFeed.ts`, `ticker.ts`, `playByPlay.ts`, `playByPlayEnhanced.ts`, `pressConferences.ts`, `tradeDeadlinePressConferences.ts`.
- `narrative/leagueEvents.ts`, `eventBriefings.ts`, `storyArcs.ts`, `consequences.ts`, `farmNarratives.ts`, `draft.ts`, `tradeTheatre.ts`.
- `narrative/*Prose.ts` files for awards, dynasty markers, HOF, player arcs, micro-arcs, position groups, retirements, weekly moments, holdouts, arbitration.
- `moments/momentDetector.ts`, `signatureMoments.ts`, `weeklyMoments.ts`, `seasonIdentityMoments.ts`, `nicknames.ts`, `arbitrationMoments.ts`, `tradeMoments.ts`.
- `sharing/dynastyCards.ts`, `sharing/leaderboard.ts`.
- `timeline/index.ts`, `performance/index.ts`, `invariants/checker.ts`, `calibration/index.ts`, `career/index.ts`, `scenarios/*`.

### Sim-Core File Inventory

Static directory counts under `packages/sim-core/src`:

- `math`: 3 files for PRNG and Log5.
- `sim`: 8 files for calendar, PA, Markov baserunning, game/season/playoff simulation, and playoff momentum.
- `league`: 14 files for teams, schedule, standings, awards, records, rivalries, relationships, front office, achievements, and league narrative state.
- `player`: 19 files for generation, attributes, development, breakouts, coaching, injuries, mentorship, personality, similarity/comparison, and team tenure.
- `roster`: 7 files for roster management, free agency, minors, offseason, Rule 5, and minor-league stats.
- `finance`: 3 files for contracts, payroll/arbitration/extensions/holdouts, and market intelligence.
- `draft`: 6 files for pool generation, picks, AI selection, scouting, signing, and exports.
- `trade`: 6 files for AI, valuation, negotiation, multi-team trades, and deadline drama.
- `scouting`: 5 files for reports, international scouting, learning, and conflicts.
- `narrative`: 26 files for news, prose, press, PBP, events, arcs, consequences, draft/trade theatre, and weekly/offseason/retirement coverage.
- `moments`: 8 files for signature moments, weekly/season identity moments, nicknames, arbitration, and trade moments.
- `onboarding`: 20 files for AGM candidates, revised flow, chapter data, Day One, assessments, reactions, dialogue, hiring, and scripts.
- `stats`: 5 files for advanced stats, milestones, projections, shutouts, and team aggregates.
- `scenarios`: 4 files for scenario library, objectives, and overrides.
- `sharing`: 3 files for dynasty cards and leaderboard scoring.
- Single-file domains: `career`, `calibration`, `performance`, `timeline`, `invariants`, plus root `index.ts`.

## Contracts

`packages/contracts/src/index.ts` re-exports Zod schemas and types.

Important schema files:

- `schemas/save.ts`: current `GameSnapshotSchema`, historical snapshot schemas, migration chain, `parseGameSnapshot()`.
- `schemas/player.ts`, `team.ts`, `game.ts`, `league.ts`, `roster.ts`, `finance.ts`, `draft.ts`, `trade.ts`, `minors.ts`, `staff.ts`.
- `schemas/narrative.ts`: news, moments, relationships, league events, morale, chemistry, owner state, ticker, arcs, records, history, career, achievements, ceremony, franchise state, etc.
- `schemas/franchise.ts`: franchise/play mode/onboarding/day-one state.
- `schemas/monthlyPulse.ts`, `schemas/worker.ts`.
- `dto/dashboard.ts`: dashboard DTO contracts.

Contracts are the save and worker boundary. If a page only needs display data, prefer worker DTOs over importing sim-core internals into React components.

## UI and Design

Design direction is in `DESIGN.md`: Bloomberg-terminal dark, data-dense, fictional baseball ops, no MLB marks, local-save confidence, no generic SaaS styling.

Shared UI:

- `packages/design-tokens/src`: color, density, shadows, spacing, typography, Tailwind preset.
- `packages/ui/src`: Button, Card, Badge, Skeleton, Container, Stack, Tabs, StatLine, GradeBar, TrendArrow, utils.
- `apps/web/src/globals.css` and `apps/web/tailwind.config.ts`: app-specific Tailwind/globals.
- `apps/web/src/shared/components`: PageShell, DensePanel, EmptyStatePanel, ResponsiveTable, TeamLogo, charts, TourProvider, PageHelp, KeyboardShortcutsPanel, AnimatedNumber, ProgressFill.
- `apps/web/src/shared/hooks`: `useWorker`, `useGameStore`, preferences/audio/reduced-motion/focus/autosave; `useFocusTrap` filters visible focus targets through computed style so JSDOM and browser modal tests exercise the same Tab loop.
- `apps/web/src/shared/lib`: save system, active save persistence, audio, logger, labels, performance, page help, tour definition, web vitals.

Frontend conventions:

- Use lucide-react icons for controls.

- Phase 4.1 dense layout work adds `DensePanel` as a compact bordered header/body shell for route panels. Current consumers are `DraftTicker`, `DraftBoard`, `DraftProspectsPanel`, `DeadlineTheatreCard`, `DeadlineRecapCard`, `TradeActivityColumn`, `TradeHistoryLedgerPanel`, `OffseasonMarketDayBriefingPanel`, `OffseasonExtensionCandidatesPanel`, `OffseasonQualifyingOffersPanel`, `OffseasonSpringTrainingPanel`, `StaffCurrentStaffPanel`, `StaffImpactPanel`, `StaffMarketPanel`, `StaffChemistryPanel`, `StaffBudgetPanel`, `StaffOnboardingImpactPanel`, `StaffMentorshipPanel`, `FinanceSummaryCardsPanel`, `FinanceFutureCommitmentsPanel`, `FinanceDecisionDeskPanel`, `FinanceContractTablePanel`, `FreeAgencyMarketBoardPanel`, `FreeAgencyContractOfferPanel`, `MarketIntelPanel`, `OpeningDayChecklistPanel`, `TopPerformersPanel`, `ActiveStorylinesPanel`, `RivalryHistoryStack`, `RecentBroadcastRecapsPanel`, `PlayByPlayPanel`, `FrontOfficeClubhouseWebCard`, `FrontOfficeIdentityCard`, `FrontOfficeLeagueStandingCard`, `FrontOfficeOwnerProfileCard`, `FrontOfficeBudgetCard`, `FrontOfficeReputationCard`, `FrontOfficeChemistryCard`, `GMCareerContentPanel`, `TeamIdentityCard`, `DynastyScorePanel`, `TrophyRoomPanel`, `LocalLeaderboardPanel`, `DynastyCardsPanel`, `AwardRaceWatchPanel`, `RivalryWatchPanel`, `AwardLedgerPanel`, `HallOfFamePanel`, `AllTimeLeadersPanel`, `RecordsPanel`, `SeasonBrowserPanel`, `TimelinePanel`, `ScoutingDepartmentPanel`, `ScoutingFrontOfficeContextPanel`, `PlayerProfileActionsPanel`, `PlayerProfileContractSnapshotPanel`, `PlayerProfileTabsPanel`, `RosterCompliancePanel`, `RosterLineupPanel`, `RosterMlbControlPanel`, `RosterMinorLeaguesPanel`, `RosterMinorLevelTable`, `ExtensionCommandCenter`, `RosterContractsPanel`, `StatsTab`, `MomentsTab`, `StoryArcsTab`, and `PersonalityTab`; the slices are UI-only and do not change worker calls, save fields, or RNG behavior.
- Use existing dynasty/accent Tailwind classes before adding colors.
- Respect high-contrast and reduced-motion hooks.
- Pages are dense operational tools; avoid marketing-page patterns.
- Mobile touch targets and route-critical mobile workflow controls are tested in `shared/touch/mobileTouchTargets.test.ts`; use `mobile-critical-control` for key route buttons/selects that must stay finger-safe on phones. The shared contract covers Dashboard, Trade, Roster, Staff, Draft, Players, League, Finance, Free Agency, Offseason, History, Playoffs, Schedule, Scouting, Settings, and Setup controls. Dashboard Sim Day/Week/Month controls also expose their global Space/Shift+Space/Ctrl-or-Cmd+Space bindings through `aria-keyshortcuts`.
- The command palette includes action-oriented shortcuts into roster, trade, draft, free agency, offseason, history, and keyboard-help workflows; the PageHelp route help panel, `AssistantDetailDialog`, keyboard shortcuts panel, dashboard award-race, dashboard pennant-race, dashboard season-story-reel, achievements award-ceremony, history season-recap, roster action-confirmation, and roster extension-negotiation modals have focus containment and launcher focus restoration coverage.

## Tests

Test distribution in this snapshot:

- `packages/sim-core/tests`: 139 `.test.ts` files plus three generator/support files.
- `apps/web/src/features`: 329 test files.
- `apps/web/src/shared`: 30 files.
- `apps/web/src/workers`: 12 files.
- `apps/web/src/app`: 10 files.
- `apps/web/src/build`: 5 files.
- `packages/contracts/tests`: 1 file.
- `packages/ui/src`: 1 file.
- `packages/ui/src/index.test.ts`: 1 file.

Test strategy:

- New sim math/probability/progression/economics logic should get targeted sim-core tests.
- Worker wiring should get worker tests near `apps/web/src/workers`.
- Route behavior should get route/component Vitest tests.
- Save changes need contracts migration tests plus worker snapshot and web save-system tests.
- UI-only changes still need focused tests if they affect routing, save recovery, sim controls, accessibility, or user-visible flows.

Existing quality notes:

- Phase 5.2 dynasty timeline memory derives non-persisted playoff, trade, draft, award, stat-leader, retirement, rivalry, breakout, injury, identity, and story beats from existing archive/history/player-moment/team-moment/mentor-relationship/rivalry data. User-team World Series runner-up seasons now use existing season-history champion/runner-up/record fields to render `World Series Run` memory beats when compact archives lack playoff-series rows, saved `userSeason.storylines` / archive user-summary storylines and saved `seasonHistory.summary` text now feed `Season Memory` beats when key moments are sparse, and compact `keyAcquisitions` / `keyDepartures` become `Key Addition` / `Key Departure` beats when transaction archive rows are missing. Compact roster-move notes with trade, deadline, deal, acquisition, swap, or flip language are classified as `trade` memory beats while generic promotion/departure notes remain story beats. Team identity moment types such as dominant rotations, lineups of an era, bullpen workload/collapse, closer runs, bench sparks, streak swings, and mentorship lanes now classify as `identity` beats with a distinct timeline badge tone instead of generic story beats. Draft, award, retirement, player-moment, mentorship, and archived stat-leader beats carry fallback player labels where existing saved summaries/current player state provide stable names, so old profile links stay readable when the live display-name resolver misses; legacy award entries with missing summaries keep the existing player-id award copy instead of inventing a fallback name. `getFranchiseTimeline()` also projects already-saved user-team `teamMoments` into non-persisted team-backed memory beats so rivalry, rotation, lineup, deadline, contender, and collapse markers render resolved team chips, saved `mentorRelationships` into non-persisted mentorship-lane beats with mentor/protege profile links, and saved `rivalries.eventHistory` into non-persisted multi-team rivalry beats so playoff, trade, defection, race, historical, and series-result rivalry chapters resolve both clubs. Current-season player-moment beats can link to `/games/:gameIndex` when the live game log contains matching player participation, current-season team-moment beats can link to `/games/:gameIndex` when that team has a matching live game log entry for the moment season/day, and current-season playoff memory beats can link to `/games/:gameIndex` when the existing live playoff game log has a user-team playoff box score for that season. v34 adds persisted compact `narrative.archivedGames` for future qualifying major games, so old-season timeline beats can link by stable `archivedGameId` without inventing details for pre-v34 saves.

- Phase 6.2 Settings route decomposition now also extracts `SettingsPageContent` for pure Settings header, status banner, preferences panel placement, Data/Install section composition, Diagnostics section composition, About section composition, session copy, and callback delegation while `SettingsPage` keeps worker method acquisition, save recovery, preference/save/diagnostic/install hook wiring, section-open state, and route orchestration.

- Phase 6.2 Schedule route decomposition now splits `ScheduleContentPanel` from `SchedulePage` for pure schedule header, record derivation, season/day summary, opponent rows, W/L badges, current-day row ref attachment, empty-state rendering, completed-game click delegation, and Phase 4.2 mobile-critical completed-game row semantics with keyboard activation. It also extracts `useScheduleRouteData` for route-side schedule loading, worker readiness gating, safe empty payloads, and season/day/phase refresh while `SchedulePage` keeps worker/store acquisition, current-day scrolling, navigation, hook wiring, and route composition. The same phase now extracts `useBoxScoreRouteData` for route-side box-score play-by-play loading, readiness gating, null payload fallback, and game-ref refetch behavior for numeric live indexes or archived ids while `BoxScorePage` keeps URL parsing, hook wiring, missing-game rendering, walk-off audio, live-only lazy enhanced-play-by-play slot wiring, and route composition, plus `useEnhancedPlayByPlayData` for lazy enhanced-play-by-play loading while `EnhancedPlayByPlay` keeps highlight filtering, show-all state, and rendering.

- Phase 6.2 Setup route decomposition now also extracts `SetupPageContent` for pure launch header, return/new-dynasty controls, status banner, save-hub placement, wizard/preview layout, and callback delegation; `SetupDynastyWizardPanel` for pure new-dynasty wizard controls, scenario list, difficulty/mode/day-one/GM controls, worker readiness copy, and callback delegation; `useSetupRouteData` for route-side save-tree refresh, selected-slot state, preview-map loading, scenario catalog/default selection, active-preview derivation, and setup status; `useSetupWizardControls` for route-local wizard open/seed/team/difficulty/mode/day-one/GM/filter state and reset behavior; `useSetupActionHandlers` for safe save continue, branch inspection, delete, worker snapshot import/export, new-game creation, local save persistence, store initialization, recovery callbacks, and navigation behavior; plus `useSetupPageController` for hook composition, wizard focus, team options, handler wiring, and final content props while `SetupPage` keeps worker/recovery/store/navigation acquisition and final route composition. Phase 4.2 later marked the Setup launch, Save Hub, team-picker, and dynasty-wizard controls as route-critical mobile controls with shared touch/focus utilities.
- Phase 6.2 Onboarding route decomposition now extracts `RevisedOnboardingChrome` for pure revised onboarding shell, header, progress, loading, empty-save, and error banner rendering/delegation, `RevisedOnboardingChapterPanel` for pure chapter body/completion rendering, `OnboardingChoiceGrid` for reusable Day One option-button grids, `RevisedOnboardingFlowContent` for pure active-flow shell/header/progress/error/chapter/AGM-panel composition, plus `useRevisedOnboardingPageController` for AGM loading, selected-flow state, worker mutation callbacks, final snapshot persistence, guided-start nudges, navigation callback ownership, and screen-state derivation while `RevisedOnboardingPage` keeps worker/game/navigate acquisition and route screen composition.
- Phase 6.2 Dashboard route decomposition now also extracts `DashboardPageContent`, `DashboardLoadingStates`, `DashboardLazyIntelligenceGrid`, `GameRecapCardBody`, `StandingsCardBody`, `GameAdvisorBody`, `RecentMomentsCardBody`, `ThisWeekInHistoryCardBody`, `FranchiseLegacyCardBody`, `PlayerArcOfSeasonCardBody`, `TradeIntelCardBody`, `RosterHealthCardBody`, `FarmReportCardBody`, `FinancialCardBody`, `PressDigestCardBody`, `AwardRaceCardBody`, `PennantRaceCardBody`, `ChaseWatchCardBody`, `MilestoneTrackerCardBody`, `CareerRetrospectiveCardBody`, `CareerRetrospectiveAwardsShelf`, `CareerRetrospectiveSeasonArc`, `CareerRetrospectiveStoryStack`, `CareerRetrospectiveTopRivalry`, `CareerRetrospectiveTenureTitles`, `AwardRaceModalBody`, `PennantRaceModalBody`, `SeasonStoryReelBody`, `SeasonStoryReelSections`, `dashboardPageTransforms`, `useDashboardRouteData`, `useDashboardGuidedStart`, `useDashboardActionHandlers`, and `useDashboardPageController` for pure route content composition, route skeleton/lazy-card fallback rendering, lazy intelligence-card slot construction, game-recap matchup/score/innings/highlight rendering, standings table row/games-back/streak rendering, advisor recommendation rendering/expand-collapse behavior, signature-moment loading/empty/player/team row rendering, history-week loading/empty/player/team row/year-label/date-context rendering, franchise-legacy loading/empty/count/latest-moment rendering, player-arc loading/empty/player row/link/badge/date-context rendering, trade-intel deadline/offer/summary/wire rendering, roster-health injury/fatigue summary and warning-row rendering, farm-report prospect pulse/farm-move rendering, financial payroll-pressure/budget-room/tax rendering, press-digest header/unread/tag/feed/empty-state rendering, award-race-card loading/empty/league-column/ranking rendering, pennant-race-card loading/empty/division/wildcard row rendering, chase-watch loading/empty/career/pace row rendering, milestone-watch loading/empty/alert/progress/overflow rendering, career-retrospective loading/unavailable/early-career states and title/season-arc/award/story/rivalry placement, career-retrospective award shelf rendering, career season-arc win-percentage rendering, career retrospective signature-beat/legend-arc/player-arc story rendering, career top-rivalry summary rendering, career tenure/title summary rendering, award-race modal loading/error/empty/prior-winner/board rendering, pennant-race modal loading/error/empty/quiet/division/wildcard rendering, story-reel loading/error/missing/quiet state rendering, story-reel rich section rendering, decision-desk, schedule, guided-start nudge trigger/skip derivation, checklist, sim-label derivation, dashboard summary/career/job-market/offseason narrative/schedule/recap loading, selected-game detail loading, refresh callback exposure, save-slot nudge state, first-series auto-skip behavior, guided-start backup export, quick-sim action sequencing, job-application worker/autosave flow, first-day briefing dismiss, busy-state ownership, hook composition, PageShell loading derivation, and final `DashboardPageContent` prop construction while `GameRecapCard` keeps the broadcast recap button shell/click handling, `StandingsCard` keeps its route-provided standings props and card shell, `GameAdvisor` keeps dashboard/compliance/trade/pipeline worker loading plus recommendation derivation, `RecentMomentsCard` keeps recent league/team moment worker loading plus team-name resolution and merge/sort/cap derivation, `ThisWeekInHistoryCard` keeps this-week-in-history worker loading plus team-name resolution and sort/cap derivation, `FranchiseLegacyCard` keeps `getTeamMoments` worker loading, season/user-team refresh, and timeline link/header rendering, `PlayerArcOfSeasonCard` keeps `getPlayerArcsOfSeason` loading, season/day refresh, target-season header badge, team-name resolution, and visible-entry cap derivation, `TradeIntelCard` keeps its route-provided trade summary/offer/deadline props and card shell, `RosterHealthCard` keeps its route-provided injury/fatigue props and card shell, `FarmReportCard` keeps its route-provided farm-intel props and card shell, `FinancialCard` keeps its route-provided payroll/budget/tax props and card shell, `PressDigestCard` keeps its route-provided feed/unread props and card shell, `AwardRaceCard` keeps `getAwardRaceBoards` loading plus modal state, `PennantRaceCard` keeps `getPennantRaces` loading plus header count and modal state, `ChaseWatchCard` keeps `getChaseWatch` loading and urgency sorting, `MilestoneTrackerCard` keeps `getMilestoneTrackerAlerts` loading plus urgency sorting and header count, `CareerRetrospectiveCard` keeps `getCareerRetrospective` loading, the header/link shell, selected-season modal state, and lazy `SeasonStoryReelModal`, `AwardRaceModal` keeps `getAwardRaceDetail` loading plus dialog/focus behavior, `PennantRaceModal` keeps `getPennantRaceDetail` loading plus dialog/focus behavior, `SeasonStoryReelModal` owns the dashboard season story-reel dialog shell, shared focus containment/restoration, Escape dismissal, ArrowLeft/ArrowRight season navigation, and worker DTO loading, and `DashboardPage` keeps worker/store/autosave acquisition and final shell composition. `OpeningDayChecklistPanel`, `TopPerformersPanel`, `ActiveStorylinesPanel`, `RivalryHistoryStack`, `RecentBroadcastRecapsPanel`, and `PlayByPlayPanel` use the shared dense shell for their compact dashboard checklist, performer, storyline, rivalry/history, broadcast recap, and broadcast booth surfaces.
- Phase 6.2 Trade route decomposition now also extracts `TradePageContent`, `tradePageContentProps`, `tradeRouteContentProps`, `DeadlineEventRow`, `DeadlineBiddingWarCard`, `TradeOfferCard`, `TradeNegotiationSummaryCard`, `TradeAssetColumnPanel`, `useTradeActionHandlers`, `useTradeAssetBuilder`, `useTradeBuilderCoordinator`, `useTradeMarketContext`, `useTradePackageSummary`, `useTradeDialogue`, `useTradeMultiTeamBuilder`, `useTradeMultiTeamRosters`, `useTradeSnapshotPersistence`, `useTradeResultAudio`, `useTradeRouteData`, `useTradeNegotiationState`, and `useTradePageController` for pure route header, deadline dashboard, route-provided deadline-drama slot, activity-column, builder-stack layout, content-prop graph composition, grouped route-to-content prop mapping, deadline-event label/day/urgency/description rendering, active bidding-war round sorting, settled winner styling, offer-round rendering, hot-offer team/fairness/urgency/dialogue/asset/action rendering, active-talk round/phase/asset-summary/resume rendering, trade-history ledger rendering, asset-count badge rendering, empty-history state rendering, trade submission validation, start/advance/resolve/counter/offer-response action handling, proposing state, package/asset selection state, asset-filter state, asset-column roster row/filter button/draft-pick/IFA rendering, filtered roster rows, selected-asset DTO derivation, stale-result clearing on package edits, preselected-player insertion, builder reset/clear callback bridging, negotiation apply/resume callback bridging, market phase/open/copy derivation, relationship map construction, player lookup, package summary-row labels, package value totals, GM dialogue worker loading/clearing/stale-response guarding, multi-team modal state/action orchestration, modal-side multi-team roster cache/loading, trade autosave snapshot persistence behavior, accepted-result audio effect ownership, route-side roster/inventory/activity/deadline/relationship/open-negotiation loading/refetch state, active negotiation/result state, negotiation deep-link reset/resume behavior, selected target-team state, worker/game hook handoff, multi-team execution refresh orchestration, PageShell loading derivation, and final route content prop construction while `TradePage` keeps only worker acquisition, game-store acquisition, the deadline-drama slot, shell skeleton, and final route composition.
- Phase 6.2 History route decomposition now also extracts `HistoryPageContent`, `HistoryRecordsTabPanel`, `HistoryAwardsTabPanel`, `DynastyTimelineSeasonRow`, `DynastyTimelineMemoryBeatRow`, `TimelineComparisonDeltaMetric`, `TimelineComparisonRosterFlow`, `SeasonRecapAwardsSlide`, `SeasonRecapLeadersSlide`, `SeasonRecapNarrativeSlide`, `SeasonRecapRecordSlide`, `SeasonRecapTitleSlide`, `SeasonRecapTransactionsSlide`, `SeasonRecapModalBody`, `SeasonRecapSlideNavigation`, `historyPageTransforms`, `useHistoryRouteData`, and `useHistoryPagePresentation` for pure tabbed history content composition, records-tab award-watch/rivalry-watch/record panel composition, awards-tab Hall of Fame/trophy-room/award-ledger composition, dynasty timeline season-row labels/record/story/score/recap controls/memory-row composition, timeline memory-beat label/link/chip/box-score rendering, what-if delta metric formatting/tone/icon rendering, what-if roster-divergence chips and empty-state rendering, year-in-review award/player hardware rendering, year-in-review team-leader category/value/name rendering, year-in-review narrative/storyline/fan-sentiment rendering, year-in-review record/payroll/division/postseason slide rendering, year-in-review season-title/championship-badge rendering, year-in-review transaction move rendering, year-in-review slide visibility/body composition, year-in-review slide indicators/progress/footer controls, history ID collection, season sorting, archive type guards, money/award labels, standings grouping, year-in-review recap data construction, route-side history/records/legacy/branch data loading, archive fallback loading, display-name resolution, leaderboard merge, initial season/comparison/achievement selection, branch comparison, season comparison, loading state, top-level tab state, visible-tab filtering, selected season-browser tab state, selected team derivation, timeline expansion, recap modal state, and final content-prop construction while `DynastyScorePanel`, `TrophyRoomPanel`, `LocalLeaderboardPanel`, `DynastyCardsPanel`, and `TimelinePanel` use shared `DensePanel` for their compact shells, `HistoryRecordsTabPanel` owns records-tab award-watch, rivalry-watch, and record-book/watch panel composition, `HistoryAwardsTabPanel` owns awards-tab Hall of Fame, Trophy Room, and Award Ledger panel composition, `TimelineComparisonPanel` keeps what-if header, metric selection, chart, and roster-flow composition, `DynastyTimelineChapterCard` keeps chapter summary and expanded season-row list composition, `SeasonRecapModalBody` keeps slide definitions, optional slide visibility, and extracted-slide composition, `SeasonRecapSlideNavigation` owns indicator buttons, progress copy, and Back/Next/Close controls, `SeasonRecapModal` owns the year-in-review dialog shell, focus containment/restoration, `aria-modal`, Escape/Arrow navigation, current slide state, and audio effects, and `HistoryPage` keeps worker method acquisition, game-store acquisition, clipboard side-effect callback, shell loading, and final route composition.
- Phase 6.2 Players route decomposition now extracts `PlayersPageContent`, `usePlayersRouteData`, `PlayerProfileActionsPanel`, `PlayerProfileContractSnapshotPanel`, `PlayerProfileTabsPanel`, `PlayerProfilePageContent`, `PlayerComparisonResultsPanel`, `PlayerComparisonSearchPicker`, `usePlayerProfileActions`, `usePlayerProfileView`, and `usePlayerComparisonRouteData` for pure players-list rendering, default HR leader loading, worker/game readiness gating, players-list query state, debounced player search, displayed-player derivation, pure quick-action rendering, contract/roster/service-time rendering, tab rail/lazy-tab rendering, profile back-link/header/not-found/layout composition, player-comparison summary/edge/attribute/stat/ranked-grade rendering, debounced comparison search-picker UI, route-owned extension/roster action orchestration, profile worker loading/fetch/refetch state, and player-comparison loading/refetch state while the three compact Player Profile shells plus `StatsTab`, `MomentsTab`, `StoryArcsTab`, and `PersonalityTab` use shared `DensePanel`, `PlayersPage` keeps worker/store acquisition, navigation, hook wiring, and route composition, `PlayerProfilePage` keeps URL params, active-tab URL state, worker/store/autosave acquisition, action gating, hook wiring, PageShell loading, and route orchestration behavior, and `PlayerComparisonPage` keeps URL search params, worker method acquisition, and route composition. Phase 4.2 also marks the Players list search input plus comparison search input, comparison result rows, and selected-player Change button as mobile-critical controls using the shared mobile-control/focus contract.
- Phase 6.2 Stats route decomposition now extracts `useStatsEncyclopediaRouteData`, `statDefinitions.ts`, `StatsEncyclopediaContent`, and `StatsDefinitionLibraryPanel` for optional league-context diagnostics loading, worker readiness gating, season/day/phase refetch behavior, static stat reference data, route header, leaderboard link, league-context panel rendering, stat filters, category counts, stat cards, formula copy, and quality-scale badges while `StatsEncyclopediaPage` keeps worker method acquisition, game-store reads, filter state, hook wiring, `PageShell`, and route composition.
- Phase 6.2 League route decomposition now extracts `useLeagueLeadersRouteData` for route-side league-leader loading, active category state, worker readiness gating, category reloads, and season/day/phase refetch behavior, plus `useStandingsRouteData` for route-side standings loading, worker readiness gating, empty-payload fallback, and season/day/phase refetch behavior while `LeadersPage` and `StandingsPage` keep worker/store acquisition and final route composition.
- Phase 6.2 Finance route decomposition now also extracts `useFinanceRouteData` for route-side finance overview loading, worker readiness gating, season/day/phase refetch behavior, contract filter state, sort state, high-salary floor derivation, filter counts, and visible-contract sorting while `FinancePage` keeps worker/store acquisition, header badge rendering, panel composition, and route orchestration. `FinanceSummaryCardsPanel`, `FinanceFutureCommitmentsPanel`, `FinanceDecisionDeskPanel`, and `FinanceContractTablePanel` use the shared dense shell for their compact finance surfaces. Phase 4.2 also marks Finance contract filter buttons as mobile-critical controls with the shared mobile-control/focus contract.
- Phase 6.2 Free Agency route decomposition extracts `FreeAgencyMarketBoardPanel`, `FreeAgencyContractOfferPanel`, `FreeAgencyPageContent`, `useFreeAgencyRouteData`, `useFreeAgencyOfferActions`, `MarketIntelPlayerReportCard`, and `useFreeAgencyMarketIntelData` for market controls, free-agent table rows, selected-player offer terms, budget-impact/result rendering, route content composition, route-side free-agent/finance loading, filtered market derivation, selected-player state, offer form state, autosave sequencing, refresh callback exposure, market-intel player links, demand/confidence badges, projected-value copy, signing-prediction rows, comparable-contract expansion, shared money formatting, and market-intel worker loading/null payload/refetch state while `FreeAgencyPage` keeps worker method acquisition, hook wiring, market-intel lazy slot construction, and route orchestration. `FreeAgencyMarketBoardPanel`, `FreeAgencyContractOfferPanel`, and `MarketIntelPanel` use the shared dense shell for their compact market table, contract-offer, and market-intelligence surfaces, while `MarketIntelPanel` keeps summary/loading/empty/report-list composition.
- Phase 6.2 Pulse route decomposition now extracts `usePulseRouteData` for monthly pulse and league-event loading, worker readiness gating, season/day/phase refetch behavior, acknowledge/dismiss refresh sequencing, content derivation, and urgency sorting, plus `PulseContentPanel` for pure monthly report cards, decision spotlight cards, empty-state rendering, deterministic league-event narrative rendering, links, and acknowledge/dismiss callback delegation while `PulsePage` keeps worker method acquisition, route hook wiring, header copy, and route composition.
- Phase 6.2 GM Career route decomposition now extracts `useGMCareerRouteData` for career, job-market, and current-team moment loading, worker readiness gating, and season/day/phase refetch behavior, plus `GMCareerContentPanel` for pure GM profile, career record, timeline, job-market, team identity section, team-label helpers, and win-percentage rendering while its compact panels use the shared dense shell and `GMCareerPage` keeps worker method acquisition, store GM-name readout, loading state, hook wiring, and route composition.
- Phase 6.2 Records route decomposition now extracts `useRecordWatchRouteData` for record-book and active-record-watch loading, worker readiness gating, and season/day/phase refetch behavior, plus `RecordWatchContentPanel` for pure header, stats-reference link, view-mode tabs, record-watch cards, empty states, record-book grouping/table rows, pace formatting, category badges/labels, and player links while `RecordWatchPage` keeps worker acquisition, game-store season/day/phase reads, view-mode state, PageShell loading, hook wiring, and route composition.
- Phase 6.2 Achievements route decomposition now extracts `AchievementsContentPanel` for pure trophy-room header, ceremony button, category filter/counts, achievement cards, progress bars, sorting, and empty-state rendering/delegation while `AwardCeremonyModal` owns the ceremony dialog shell, slide keyboard navigation, focus containment, Escape close, and focus restoration. `useAchievementsRouteData` owns route-side `getAchievements` loading, worker readiness gating, filter state, `getAwardCeremony` loading/state, worker-to-panel view casting, and season/day/phase refresh while `AchievementsPage` keeps worker/store acquisition, `PageShell`, lazy modal slot construction, and route composition.
- Phase 6.2 Rivalries route decomposition now extracts `RivalriesContentPanel` for pure rivalry watch rendering and `useRivalriesRouteData` for route-side `getRivalries` loading, worker readiness gating, empty-payload fallback, and season/day/phase refresh while `RivalriesPage` keeps worker/store acquisition, `PageShell`, and route composition.
- Phase 6.2 Scenarios route decomposition now extracts `ScenarioCatalogContentPanel` for pure challenge header, active progress, objective, strategy-tip, difficulty, and catalog-card rendering plus `useScenarioCatalogRouteData` for worker-readiness gating, scenario catalog/progress/objective loading, worker DTO normalization into the panel view model, and season/day/phase refresh. `ScenarioCatalogPage` keeps worker/store acquisition, `PageShell`, and final route composition.
- Phase 6.2 Playoffs route decomposition now extracts `PlayoffsContentPanel` for pure header, dynasty score, route-provided momentum slot placement, round preview cards, current/champion/empty bracket states, mobile-critical sim controls, game log, and completed-series rendering, plus `usePlayoffsPageController` for route-side playoff/dynasty/season-flow loading, season/day/phase refetch behavior, busy action state, store update sequencing, and post-mutation refresh behavior while `PlayoffsPage` keeps worker/store acquisition, lazy `MomentumPanel` slot construction, and route composition.
- Phase 6.2 Press Room route decomposition now extracts `PressRoomPageContent`, `PressRoomSummaryCards`, `PressRoomTransactionLog`, `PressRoomFilterControls`, `PressRoomSourceBoard`, and `usePressRoomRouteData` for pure page header, summary cards, transaction-count/tag/category/timestamp labels, Source Board placement, Transaction Log, briefing footer, Mark All Read/filter controls, Read Later pins, grouped source sections, unread badges, story cards, empty-state rendering/delegation, route-side feed loading, read/pin persistence, visit-baseline updates, section grouping/open-state, transaction feed composition, selected filter state, and unread/pin derivation while `PressRoomPage` keeps worker method, game-store, and preference acquisition plus route-data hook wiring. Phase 4.2 also audits `PressConferenceModal` for dialog semantics, shared focus trapping, Escape close, header close, and launcher focus restoration while preserving the existing app-shell worker callbacks.
- Phase 6.2 Assistant panel decomposition now extracts `AssistantDetailDialog` for pure expanded assistant dialog rendering, story callback tone, route guidance copy, contextual action link, ratings/strategy toggles, complete/replay/mode controls, shared focus trapping, `aria-modal`, Escape close, and callback delegation while `AssistantPanel` keeps route resolution, game-store reads, local assistant state, Monthly Pulse DTO input, launcher rendering, and launcher focus restoration.
- Phase 6.2 News route decomposition now extracts `NewsItemCard` for pure story-card category/priority/tag/read/timestamp/team/player labels, collapsed excerpt, expanded body, saving state, and open callback delegation, `NewsInboxPanel` for pure inbox header, count cards, filter controls, retry/error/empty/list states, item-card composition, and route-owned callback delegation, plus `useNewsRouteData` for worker news loading, deterministic timestamp/priority/id sorting, filter state, expanded/marking state, optimistic read mutation/rollback, `exportSnapshot`/active-save persistence, and news-read event dispatch while `NewsPage` keeps worker/store acquisition, hook wiring, `PageShell`, and route composition.
- Phase 6.2 Minors route decomposition now extracts `DevelopmentFocusBoard`, `PipelineTriageColumn`, `FarmReportPanel`, `AffiliateResultsPanel`, `AffiliateStandingsPanel`, `WaiverTrafficPanel`, `PipelineHealthPanel`, and `useMinorsRouteData` for pure player-development focus summary, priority cards, level labels, actions, reasons, evidence, prospect triage cards, farm-report cards, breakout candidates, recent affiliate result selection, selected box-score rendering, affiliate standings, waiver traffic, pipeline-health counters, route-side affiliate overview/prospect pipeline loading, default selected box-score selection, selected box-score loading, and pipeline triage derivation while `MinorsPage` keeps worker/store acquisition and route composition behavior.
- Phase 6.2 Front Office route decomposition now also extracts `FrontOfficeLeagueStandingCard`, `FrontOfficeIdentityCard`, `FrontOfficeOwnerCards`, `FrontOfficeHealthCards`, and `useFrontOfficeRouteData` for pure relationship standings, identity, owner profile, expectations, budget, pressure, money-label, reputation score/delta, clubhouse chemistry tier/trend/reason rendering, route-side owner/reputation/chemistry/identity/relationship/mentorship loading, safe empty payloads, and season/day/phase refresh while those compact front-office cards use the shared dense shell and `FrontOfficePage` keeps worker/store acquisition, hook wiring, `PageShell`, and route composition. Phase 5.3 extends the same route with `FrontOfficeClubhouseWebCard`, a pure shared-dense-shell Clubhouse Web summary backed by the existing `getMentorships` DTO.
- Phase 6.2 Scouting route decomposition now also extracts `ScoutingPageContent` for pure Scouting route header, scouting-view tab placement, front-office context placement, department placement, active-view branch composition, and pro/IFA/conflicts callback delegation; `ScoutingDepartmentPanel` for pure scouting staff card and empty-state rendering while using shared `DensePanel`; `ScoutingFrontOfficeContextPanel` for pure owner-outlook and clubhouse-read context rendering while using shared `DensePanel`; `ScoutingViewTabs` for pure scouting-view tab rendering/callback delegation plus mobile-critical tab controls; `IFABoardPanel` for pure IFA board loading, row, signed-status, scout-action, mobile-critical scout action, and empty-board rendering/delegation; `InternationalScoutingPanel` for international bonus-pool cards, mobile-critical IFA pool-transfer controls, action-message, unavailable state, and IFA board composition; `InternationalProspectReportPanel` for selected-prospect grades, WAR projection context, scout-debate evidence, no-report copy, and mobile-critical IFA bonus/signing controls; `ProScoutingPanel` for mobile-critical pro-search/player-report controls, loading state, active-report child wiring, and recent-report ledger rendering; `ProScoutReportPanel` for active pro report grades, reliability, WAR projection context, and notes; `useScoutConflictsData` for scout-conflict loading, worker readiness gating, null-payload fallback, and season/day/phase refetch behavior; `ScoutConflictCard` for scout-conflict card headers, source labels, divided/resolved badges, opinion columns, confidence bars, grade range markers, and resolution summaries; and `useScoutingPageController` for existing worker data loading, active-view state, pro search/report actions, IFA selected-report/mutation actions, bonus/trade form state, refresh, autosave sequencing, trade-target derivation, and final content-prop construction while `ScoutingPage` keeps worker/store/autosave acquisition and final route composition and `ScoutConflictsTab` keeps worker hook wiring, loading/empty state, filter buttons/counts, and conflict-card list composition.
- Phase 6.2 Roster route decomposition now also extracts `RosterPageContent`, `RosterTabs`, `RosterMinorLevelTable`, `rosterMlbColumns`, `useRosterRouteData`, `useRosterLineupControls`, `useRosterActionHandlers`, `useRosterExtensionNegotiation`, and `useRosterPageController` for pure active-tab content composition, status/tab placement, tab-specific panel placement, modal placement, callback delegation, MLB/minors/contracts/lineup tab rendering, lineup icon, tab-change delegation, minor-level table rendering, player profile links, grade/options cells, International intake-only copy, mobile-critical promote-button delegation, MLB hitter/pitcher table column construction, grade/service/option/stat rendering, WAR display, demote-button delegation, route-side roster/chemistry/promotion/compliance/affiliate/extension-candidate/roster-plan loading, hitter/pitcher split, save-scoped local depth-plan storage, roster-plan persistence through existing `updateRosterPlan`, lineup/rotation ordering, depth-chart construction, lineup panel prop construction, refresh callback exposure, promote/demote/DFA/waiver action state plus refresh/autosave sequencing, extension offer loading/form state, negotiation response state, accepted-offer refresh, extension autosave sequencing, active-tab state, typed `updateRosterPlan` handoff, existing roster hook composition, and final content-prop construction while `RosterPage` keeps worker/store/autosave acquisition and final rendering.
- Phase 6.2 Draft route decomposition now also extracts `DraftPageContent` for pure availability-vs-room composition, route error banner placement, draft-room panel grid placement, child-panel prop delegation, and route-provided nudge-card placement; `DraftAvailabilityPanel` for pure non-offseason unavailable-state rendering, draft-available start-state rendering, PageHelp placement, start-button loading/error copy, and start-draft delegation; `DraftRoomHeaderPanel` for pure draft-room title, status chip, on-clock badge, progress label, and watch-draft button rendering/delegation; `useDraftRouteData` for route-side draft-room loading, selected-prospect fallback, visible-pick/watch reveal state, war-room DTO loading, post-draft-grade loading, and draft-pick announcement audio; `useDraftActionHandlers` for route-side draft action loading/errors, bonus-offer/signing state, successful draft-result application, watch-mode reveal boundaries, scout/big-board reload delegation, and existing mutation callback sequencing; and `useDraftPageController` for existing route-data/action hook composition, status/progress copy, room/availability content-prop construction, draft effect handoff, and route-provided nudge placement while `DraftPage` keeps worker/store/nudge acquisition and final route composition.
- Phase 6.2 Staff route decomposition now also extracts `StaffCurrentStaffPanel` for pure current-staff overview cards, coach ratings, compensation, and Fire action delegation, `StaffImpactPanel` for pure staff-impact cards, role labels, specialty badges, and rounded teach/dev/fit stat lines, `StaffMarketPanel` for pure market-tab current-staff action cards, coach-market candidate cards, vacancy specialty badge styling, salary/fit/bonus rows, and hire/fire callback delegation, `StaffChemistryPanel` for pure harmony score, radar data mapping, issue cards, strongest-bond, and weakest-link rendering, `StaffBudgetPanel` for pure payroll/budget/remaining rendering, `StaffOnboardingImpactPanel` for pure top-staff onboarding impact and player-fit readout rendering, and `StaffMentorshipPanel` for pure clubhouse mentor/protegee lanes, leaders, conflict watch, development-lift copy, and top-three ordering while all compact Staff panel shells use shared `DensePanel` and `StaffPage` keeps active tab state, offseason manageability, market vacancy derivation, worker method acquisition, hire/fire action hook wiring, and route orchestration behavior. Phase 4.2 also marks Staff overview/market tabs plus Fire/Hire coach actions as mobile-critical controls with the shared mobile-control/focus contract.
- Phase 6.2 Offseason route decomposition now also extracts `OffseasonPageContent` for pure route header, phase tracker/current phase placement, offseason narrative, command-center/market-day/result-grid placement, phase-specific extension/QO/Rule 5/spring-training panels, transaction ledger placement, and callback delegation; `OffseasonRule5BoardPanel` for pure Rule 5 board, draft-order, eligible-pool, completed-selection, pass, and draft rendering/delegation; plus `useOffseasonPageController` for existing route-data/action hook composition, stable offseason audio-effect callback ownership, phase config/step construction, transaction-group toggling, autosave callback handoff, and final content props while `OffseasonPage` keeps worker method, store, and active-save autosave acquisition plus final content/unavailable rendering.

- Phase 4.1 added the first shared dense-panel primitive: `DensePanel` now owns the compact bordered header/body shell used by `DraftTicker`, `DraftBoard`, `DraftProspectsPanel`, `DeadlineTheatreCard`, `DeadlineRecapCard`, `TradeActivityColumn`, `TradeHistoryLedgerPanel`, `OffseasonMarketDayBriefingPanel`, `OffseasonExtensionCandidatesPanel`, `OffseasonQualifyingOffersPanel`, `OffseasonSpringTrainingPanel`, `StaffCurrentStaffPanel`, `StaffImpactPanel`, `StaffMarketPanel`, `StaffChemistryPanel`, `StaffBudgetPanel`, `StaffOnboardingImpactPanel`, `StaffMentorshipPanel`, `FinanceSummaryCardsPanel`, `FinanceFutureCommitmentsPanel`, `FinanceDecisionDeskPanel`, `FinanceContractTablePanel`, `FreeAgencyMarketBoardPanel`, `FreeAgencyContractOfferPanel`, `MarketIntelPanel`, `OpeningDayChecklistPanel`, `TopPerformersPanel`, `ActiveStorylinesPanel`, `RivalryHistoryStack`, `RecentBroadcastRecapsPanel`, `PlayByPlayPanel`, `FrontOfficeClubhouseWebCard`, `FrontOfficeIdentityCard`, `FrontOfficeLeagueStandingCard`, `FrontOfficeOwnerProfileCard`, `FrontOfficeBudgetCard`, `FrontOfficeReputationCard`, `FrontOfficeChemistryCard`, `GMCareerContentPanel`, `TeamIdentityCard`, `DynastyScorePanel`, `TrophyRoomPanel`, `LocalLeaderboardPanel`, `DynastyCardsPanel`, `AwardRaceWatchPanel`, `RivalryWatchPanel`, `AwardLedgerPanel`, `HallOfFamePanel`, `AllTimeLeadersPanel`, `RecordsPanel`, `SeasonBrowserPanel`, `TimelinePanel`, `ScoutingDepartmentPanel`, `ScoutingFrontOfficeContextPanel`, `PlayerProfileActionsPanel`, `PlayerProfileContractSnapshotPanel`, `PlayerProfileTabsPanel`, `RosterCompliancePanel`, `RosterLineupPanel`, `RosterMlbControlPanel`, `RosterMinorLeaguesPanel`, `RosterMinorLevelTable`, `ExtensionCommandCenter`, `RosterContractsPanel`, `StatsTab`, `MomentsTab`, `StoryArcsTab`, and `PersonalityTab`, while those components retain their existing route/domain rendering and callbacks.

- GOAT Phase 0 rebaseline restored dependency links, verified `pnpm typecheck` and `pnpm build`, and fixed the prior bundle-budget failure with scoped story/core worker ceilings. Later GOAT slices added derived, non-persisted depth across team-building identity, draft decision inputs, player development focus, offseason command-center/market-day DTOs, trade market intelligence/review evidence, dynasty timeline memory, clubhouse leader/conflict watch, worker query diagnostics, and release checklist discipline. Phase 5.2/5.3 now uses a 499 KiB raw / 150 KiB gzip story budget after the pinned pnpm/vitest bundle gate emitted `game-engine-story-CflBT-L_.js` at 510,399 raw / 153,166 gzip while carrying non-persisted timeline link DTOs, multi-team rivalry event timeline DTOs, mentor-relationship timeline DTOs with profile links, and role-aware player-profile mentorship DTOs; route decomposition has extracted local panels/hooks across Achievements, Scouting, Settings, Setup, Onboarding, Dashboard, Finance, Front Office, Staff, Players, Stats, League, Pulse, GM Career, Roster, Trade, History, Draft, Offseason, Playoffs, and Scenarios. Achievements now includes `AchievementsContentPanel` for pure trophy-room/filter/card rendering plus `useAchievementsRouteData` for route-side achievement/ceremony loading and filter state while `AchievementsPage` keeps worker/store acquisition, shell, and lazy ceremony modal composition, Finance now includes `FinanceContractTablePanel` for pure contract table/filter/sort-control rendering plus `useFinanceRouteData` for route-side finance loading, contract filter/sort state, filter counts, and visible-contract derivation while `FinancePage` keeps worker/store acquisition and panel composition, League now includes `useLeagueLeadersRouteData` and `useStandingsRouteData` for route-side leader/standings loading while the League route pages keep worker/store acquisition and composition, Offseason now includes `OffseasonUnavailablePanel`, `OffseasonPageContent`, and `useOffseasonPageController` for pure non-offseason unavailable-state rendering, route content composition, route hook/action composition, phase config, transaction-group toggling, stable audio-effect callback ownership, and final content props while `OffseasonPage` keeps worker/store/autosave acquisition and final rendering, Playoffs now includes `PlayoffsContentPanel` for pure bracket/dynasty/current-series rendering plus `usePlayoffsPageController` for route-side playoff loading and mutation sequencing while `PlayoffsPage` keeps worker/store acquisition, the lazy momentum slot, and final route composition, and Scenarios now includes `ScenarioCatalogContentPanel` for pure challenge catalog/progress/objective rendering plus `useScenarioCatalogRouteData` for route-side scenario loading and worker DTO normalization while `ScenarioCatalogPage` keeps worker/store acquisition and shell composition. The current Trade extraction set includes `useTradePageController`, `useTradeActionHandlers`, `useTradeAssetBuilder`, `useTradeBuilderCoordinator`, `useTradeMarketContext`, `useTradePackageSummary`, `useTradeDialogue`, `useTradeMultiTeamBuilder`, `useTradeMultiTeamRosters`, `useTradeSnapshotPersistence`, `useTradeResultAudio`, `useTradeRouteData`, `useTradeNegotiationState`, `TradePageContent`, `tradePageContentProps`, `tradeRouteContentProps`, and the pure Trade panel stack, while `TradePage` keeps only worker/store acquisition, the deadline-drama slot, shell skeleton, and final route composition. Re-run current commands before relying on those results.
- Phase 3.5 worker coverage now round-trips every offseason phase through snapshot export/import, confirms derived offseason DTOs are not persisted, and guards manual qualifying-offer, coach-change, and IFA pool-space actions against off-phase mutation.
- Latest Phase 6.2 Trade slices also extract `useTradeActionHandlers` for trade submission validation, start/advance/resolve/counter/offer-response action handling, proposing state, result mapping, and refresh/autosave callback sequencing, `useTradeAssetBuilder` for package/asset selection state, asset-filter state, filtered roster rows, selected-asset DTO derivation, and stale-result clearing on package edits, `TradeAssetColumnPanel` for pure asset-column roster rows, filter buttons, draft-pick buttons, IFA pool controls, selected-state styling, and closed-market guards, `useTradeBuilderCoordinator` for preselected-player insertion plus builder reset/clear, negotiation apply/resume, and trade-partner callback bridging, `useTradeMarketContext` for other-team filtering, market phase/open/copy derivation, relationship map construction, and selected relationship lookup, `useTradePackageSummary` for player lookup, package summary-row labels, and package value totals, `useTradeNegotiationState` for active negotiation/result state, counter-offer state, linked-negotiation resume, and negotiation deep-link reset behavior, `tradeRouteContentProps` for grouped route-to-content prop mapping, and `useTradePageController` for selected target-team state, worker/game hook orchestration, multi-team execution refresh, negotiation auto-resume, PageShell loading derivation, and final content props while `TradePage` keeps worker/store acquisition, the deadline-drama slot, shell skeleton, and final route composition.
- `packages/sim-core/tests/calibration.test.ts` includes a quick deterministic two-season guard for balance drift.
- `packages/sim-core/tests/calibrationReport.test.ts` covers deterministic calibration report shape, core/worker target-band status including worker prospect trajectory/setback bands, multi-seed worker rendering, onboarding balance summary rendering, and Markdown/JSON output.
- `pnpm --filter @mbd/sim-core run playtest:calibrate` generates `packages/sim-core/playtest-output/calibration.md` and `packages/sim-core/playtest-output/calibration.json`; current default output covers schedule, run environment, finance, WAR bands, and two-seed worker/offseason target bands for injuries, trades, FA signings, extensions, prospect progress, ahead-of-curve reports, bust-risk reports, active development setbacks, and playoff variance. `PLAYTEST_ONBOARDING_BALANCE=1 PLAYTEST_ONBOARDING_BALANCE_YEARS=2 PLAYTEST_OUT=playtest-output/calibration-onboarding-balance.md PLAYTEST_JSON_OUT=playtest-output/calibration-onboarding-balance.json pnpm --filter @mbd/sim-core run playtest:calibrate` captures the slower full five-variant two-season onboarding report separately; the current owner-pressure tuning keeps its final owner-trust range at `45`, inside the `6-45` tuning band. `sim.worker.onboardingBalance.test.ts` owns the default deterministic Day One variant guard.
- `MBD_ONBOARDING_BALANCE_SAMPLE_SEASONS=2 pnpm --filter @mbd/web exec vitest run src/workers/sim.worker.onboardingBalance.test.ts --reporter=verbose` now runs a two-season key attribution matrix by default: `balanced_reference`, `marcus_win_now`, and `elena_rebuild`. Add `MBD_ONBOARDING_BALANCE_FULL_MATRIX=1` only when the slower all-variant extended matrix is needed.
- `verify:structure` is allowed to report broad unused export/type noise according to prior notes.

## What Is Wired

Wired major flows:

- Save Hub start/resume/delete/import/export/repair paths.
- Revised onboarding and Day One consequences.
- Dashboard, ticker, monthly pulse, ceremony, press conferences.
- Day/week/month sim and sim-to-playoffs.
- Regular season, playoffs, offseason, next-season rollover.
- Roster moves, depth/lineup planning, minors, promotions/demotions/DFA/waivers.
- Draft room, scouting, derived decision inputs, route-side current-pick/Board Compare/ticker/board/post-draft grade/summary panels, route-side draft-room/war-room data hook, deterministic scouting reveal, stable AI tiebreaks, signing, commentary, grades.
- Player profiles with derived draft outcome and development decision briefs.
- Trade center, open negotiations, multi-team framework, deadline activity.
- Free agency, contracts, extensions, qualifying offers, arbitration/holdout coverage.
- Staff/coaching, scouting staff, front office identity, owner/fan consequences.
- News, press room, history, career retrospective, dynasty cards, records, rivalries, achievements, scenarios, stats encyclopedia.

Potentially stale comments/docs:

- `sim.worker.queries.ts` now describes current route APIs and profile aggregate DTOs instead of old unwired-module language. Verify current UI consumers before relying on older notes.
- `packages/sim-core/AUDIT_REPORT.md` is historical and says `src/moments/` was absent in an older worktree. The current snapshot has `packages/sim-core/src/moments`.
- `MASTER_CONTEXT.md` describes an older branch and schema version.

## High-Risk Work Areas

Save state:

- `packages/contracts/src/schemas/save.ts`.
- `apps/web/src/workers/snapshot.ts`.
- `apps/web/src/shared/lib/saveSystem.ts`.
- `apps/web/src/app/boot/AppBootGate.tsx`.
- Any new persisted worker state.

Determinism:

- Any code that ranks, shuffles, generates, samples, or emits narrative order.
- Any sort lacking a tie-breaker.
- Any use of wall-clock time in gameplay state. UI/save metadata timestamps are acceptable; sim outcomes are not.

Worker state:

- `FullGameState` in `sim.worker.helpers.ts`.
- Any mutation in `sim.worker.actions.ts`.
- Any route that assumes a query returns fresh state after mutation. Refresh explicitly.

Performance:

- Month simulation, snapshot export/import, and large query DTOs.
- Runtime-only worker query profiling is opt-in via `VITE_MBD_PROFILE_WORKER_QUERIES=1`; tests may set `globalThis.__MBD_PROFILE_WORKER_QUERIES__ = true`. The current profiler samples `getDashboardSummary`, `getHistoryOverview`, `getTradeDeadlineState`, `getFullRoster`, `getPlayerProfileView`, and `exportSnapshot`, then exposes non-persisted `getPerformanceDiagnostics().queryTimings` rows for Settings diagnostics.
- Bundle budget tests under `apps/web/src/build`.
- Large feature pages like Trade, History, Roster, Dashboard, Draft, Setup, Offseason, Scouting, Settings.

Gameplay balance:

- `TUNING.md` names core levers for contracts, FA, trade volume, WAR shape, run environment, and extension pressure.
- Use deterministic sample/playtest dumps before changing balance.
- Treat calibration target-band failures as tuning evidence, not automatic permission to loosen bands. The current seed `44001` calibration report now passes every measured core band after the Phase 2.3 run-environment tune: league home runs are `5006` against the `5000-7000` per-season target, league ERA is `4.442`, average runs per game are `8.920`, and average MLB payroll spread is `$103.14M`. The full all-variant two-season onboarding capture now keeps final owner-trust range at `45` after the owner-pressure tuning slice.

## How To Approach Future Changes

1. Prove the real workspace first. If `.git` is absent, say so and avoid branch/commit claims.
2. Read this guide, `docs/CODEX_IMPROVEMENT_PLAN.md`, `docs/CODEX_FEATURE_DOMAIN_GUIDE.md`, `docs/CODEX_SOURCE_ATLAS.md`, `docs/CODEX_WORKER_WIRING_MATRIX.md`, `README.md`, `DESIGN.md`, `TUNING.md`, current `STATUS.md`, and the specific feature files.
3. Identify whether the change is UI-only, worker wiring, sim-core logic, contracts/save state, or balance.
4. For sim-core logic, write tests in `packages/sim-core/tests` first when feasible.
5. For worker/API wiring, add tests in `apps/web/src/workers` and route tests if UI behavior changes.
6. For save changes, bump schema, write migrations, update snapshot tests, and prove old saves migrate.
7. Preserve deterministic RNG, stable ordering, local-first save safety, and fictional-only baseball branding.
8. Keep edits surgical. This codebase has many broad files; do not refactor them unless the task requires it.

## Quick Source Map

Use these files to answer "how does X work?" quickly:

- App boot: `apps/web/src/main.tsx`, `apps/web/src/app/App.tsx`, `apps/web/src/app/boot/AppBootGate.tsx`.
- Route table: `apps/web/src/app/routes/index.tsx`.
- Shell/sim controls: `apps/web/src/app/layout/AppLayout.tsx`, `SimControls.tsx`, `seasonFlow.ts`.
- Worker hook: `apps/web/src/shared/hooks/useWorker.ts`.
- Game mirror store: `apps/web/src/shared/hooks/useGameStore.ts`.
- Autosave: `apps/web/src/shared/hooks/useActiveSaveAutosave.ts`, `apps/web/src/shared/lib/activeSavePersistence.ts`.
- IndexedDB saves: `apps/web/src/shared/lib/saveSystem.ts`.
- Worker entry: `apps/web/src/workers/sim.worker.ts`.
- Worker actions/queries/state: `sim.worker.actions.ts`, `sim.worker.queries.ts`, `sim.worker.helpers.ts`, `snapshot.ts`.
- New game: `apps/web/src/workers/sim.worker.setup.ts`.
- Contracts/save schema: `packages/contracts/src/schemas/save.ts`.
- RNG: `packages/sim-core/src/math/prng.ts`.
- Game sim: `packages/sim-core/src/sim/gameSimulator.ts`, `plateAppearance.ts`, `markov.ts`, `seasonSimulator.ts`, `playoffSimulator.ts`.
- Teams/schedule/standings: `packages/sim-core/src/league/teams.ts`, `schedule.ts`, `standings.ts`.
- Player generation/development: `packages/sim-core/src/player/generation.ts`, `development.ts`, `developmentPipeline.ts`, `breakoutEngine.ts`.
- Draft/trade/free agency: `packages/sim-core/src/draft`, `packages/sim-core/src/trade`, `packages/sim-core/src/roster/freeAgency.ts`.
- Narratives/moments: `packages/sim-core/src/narrative`, `packages/sim-core/src/moments`, plus worker narrative modules.
- Design tokens/UI: `packages/design-tokens/src`, `packages/ui/src`, `apps/web/src/shared/components`.
