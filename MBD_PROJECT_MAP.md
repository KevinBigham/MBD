# MBD Project Map

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

Audit rules: source, tests, schemas, saves, routes, and runtime behavior are truth. Historical docs are context only. No implementation changes were made for this audit.

## Workspace Contract

- Root: `/Users/tkevinbigham/Downloads/MBD-main`
- Observed branch: `codex/mbd-ui-ux-ootp-overhaul`
- Governing audit file: `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md`
- Project AGENTS file: no on-disk `AGENTS.md` exists in this checkout; Kevin's prompt-provided AGENTS instructions were applied.
- Primary source docs read: `README.md`, `DESIGN.md`, `STATUS.md`, `CHANGELOG.md`, `docs/CODEX_GAME_GUIDE.md`, `docs/CODEX_IMPROVEMENT_PLAN.md`, plus existing audit/release/minor-league planning files found in `docs/`, `MBD_Minor_League_Deliverables/`, and package audit artifacts.

## Architecture Inventory

| System | Purpose | Inputs | Outputs | Dependencies | UI surfaces | Save dependencies | Test coverage | Risk |
|---|---|---|---|---|---|---|---|---|
| Web app shell | Owns routing, global overlays, active-save context, sim controls, press and pulse modals. | Worker queries, active save slot, route state, user actions. | Rendered app frame, route content, overlay decisions, active-save persistence calls. | `apps/web/src/app/layout/AppLayout.tsx`, `apps/web/src/app/routes/index.tsx`, `apps/web/src/shared/hooks/useActiveSaveAutosave.ts`. | All routes; app shell; pulse, ceremony, decision, press overlays. | Dirty-tree `persistShellMutation` now persists monthly report, decision, ceremony, and press response paths; focused shell autosave tests and broad current-source gates passed. | `AppLayoutShellAutosave.test.tsx`; route smoke was run through Playwright. | YELLOW |
| Save system and contracts | Defines save schema, migrations, fixtures, import/export, active saves. | Persisted snapshots, migrations, IndexedDB/local save API, current worker state. | v34 snapshots, migrated saves, save slots, manual import/export. | `packages/contracts/src/schemas/save.ts`, `apps/web/src/workers/snapshot.ts`, `apps/web/src/shared/lib/saveSystem.ts`. | Save Hub, Settings, autosave status surfaces, all mutation routes. | `CURRENT_GAME_SNAPSHOT_VERSION = 34`; v33 to v34 adds `narrative.archivedGames: []`. | `packages/contracts/tests/save.migration.test.ts`, snapshot tests, save system tests. | YELLOW |
| Worker facade | Owns simulation state, action/query RPCs, flow notifications, and DTO building. | UI commands, current worker state, seeded RNG, save snapshots. | Route DTOs, action results, simulation mutations, flow notifications. | `apps/web/src/workers/sim.worker.*`, `apps/web/src/shared/hooks/useWorker.ts`. | Every gameplay route. | Worker does not persist by itself; route/app callers must autosave. | Worker integration tests are broad but concentrated in very large files. | YELLOW |
| Simulation core | Baseball rules, players, schedules, drafting, trades, finances, ratings, and deterministic math. | Seeds, rosters, rules config, team/player state. | Game/season outcomes, player changes, AI choices, draft outcomes. | `packages/sim-core/src/**`, especially draft, roster, player, finance, trade modules. | Indirect through worker DTOs; some components import sim-core directly. | No save writes directly; serialized through worker snapshot. | 1,643 sim-core tests passed in full test run. | YELLOW |
| UI package | Shared presentational primitives and app-level UI helpers. | Component props, theme/state. | Reusable UI controls. | `packages/ui`, app components. | All routes. | None directly. | 1 UI package test passed. | GREEN |
| Contracts package | Zod schemas and snapshot migrations. | Raw persisted JSON, schema versions. | Validated/migrated snapshots. | `packages/contracts/src/schemas/save.ts`. | Save import/export and worker setup. | Direct schema truth. | Migration fixture coverage through v34. | GREEN |
| Setup/new dynasty | Creates a new league, team preview, organization identity, authored roster content, onboarding state. | Selected team, seed, difficulty, game mode, authored minors map. | New v34 active save and first-day state. | `apps/web/src/features/setup/**`, `apps/web/src/workers/sim.worker.setup.ts`, `apps/web/src/workers/content/minorLeagueContent.ts`. | `/`, `/onboarding`. | `useSetupActionHandlers.ts` writes v34 snapshot. | Setup save tests and runtime onboarding smoke. | YELLOW |
| Onboarding | Day One AGM chapters for owner, roster, staff, farm, scouting, finances, plan, press. | Setup state, team/player/owner data, generated prompts. | Saved onboarding progress and completed dynasty state. | `apps/web/src/features/onboarding/**`, worker setup/read models. | `/onboarding`. | Controller writes via `saveGame`/`saveGameById`. | Route/controller tests plus runtime path. | YELLOW |
| Dashboard | First-day and ongoing command center: reports, sim controls, farm, finance, rivalry, press, career widgets. | Dashboard DTOs, farm report DTOs, press/news/state. | Player-facing command center and decisions. | `apps/web/src/features/dashboard/**`, `sim.worker.queries.ts`. | `/dashboard`. | Route action handlers autosave many actions; dirty-tree readiness display tests passed. | Dashboard tests plus route smoke. | YELLOW |
| Roster and roster rules | MLB roster, lineup, compliance, extensions, depth, roster locks. | Player/team/contract state. | Roster decisions, lineup state, compliance warnings. | `apps/web/src/features/roster/**`, worker roster helpers. | `/roster`, player profile, onboarding roster chapter. | Roster actions call active autosave. | Roster route/hook tests. | YELLOW |
| Minor leagues | Farm affiliates, authored 5,408-player orgs, prospect boards, development reports. | Authored minor-league content, generated rosters, player ratings, assignments. | Farm UI, affiliate identities, development focus/readiness data. | `apps/web/src/features/minors/**`, `apps/web/src/workers/content/minorLeagueContent.ts`, `sim.worker.setup.ts`, `sim.worker.pipeline.ts`. | `/minors`, dashboard farm report, onboarding farm chapter. | New-game data persists in player snapshots; old-save upgrade absent. | Content/build tests and route-level coverage; player-control tests missing. | YELLOW |
| Player development | Progression, aging, development programs, focus advice, mentorship analysis, coaching identity effects. | Player age/ratings/potential, injuries, roles, org identity, staff/coaching data. | Rating changes, development ledger/report DTOs, recommendations. | `apps/web/src/workers/sim.worker.pipeline.ts`, `sim.worker.frontOfficeIdentity.ts`, player profile components. | `/minors`, `/players/:playerId`, `/staff`, dashboard. | Dirty-tree `applyDevelopmentFocusPlan` updates existing persisted `developmentProgram` and Minors page autosaves; browser validation pending. | Sim tests cover progression; focused development-plan tests passed. | YELLOW |
| Scouting | Pro scouting, draft reports, IFA scouting, confidence/accuracy, scouting hires. | Scout staff, budgets, player/draft/IFA pools, seeded accuracy. | Reports, visibility, scouting confidence, sign/trade decisions. | `apps/web/src/features/scouting/**`, `sim.worker.frontOfficeIdentity.*`, draft scouting worker actions. | `/scouting`, `/draft`, onboarding scouting chapter. | Scouting route autosaves; dirty-tree draft scouting autosave now passes focused tests. | Scouting controller tests; draft autosave focused tests passed. | YELLOW |
| Draft | Draft class generation, draft room, scouting, picks, signing, big board, AI picks, post-draft grades. | Draft pool, team rosters, scouting grades, RNG, signing info. | Picks, signed prospects, draft grades, prospect intake. | `apps/web/src/features/draft/**`, `packages/sim-core/src/draft/draftAI.ts`, worker draft actions. | `/draft`. | Dirty-tree draft start/pick/scout/toggle/sign/sim-rest autosave wiring passes focused tests and broad gates; browser reload smoke pending. | Draft logic tests plus focused autosave tests. | YELLOW |
| Trades | Trade center, active talks, valuations, negotiations, team needs, fairness. | Rosters, contracts, payroll, AI valuation, user proposals. | Trade proposals, accepted deals, active talks. | `apps/web/src/features/trade/**`, `apps/web/src/workers/sim.worker.trade.ts`. | `/trade`, dashboard prompts. | Trade snapshot persistence hook exists. | Trade tests exist; module size is high. | YELLOW |
| Finance and contracts | Payroll, budget, extensions, market pressure, owner goals. | Player contracts, team budget, difficulty, owner identity, market. | Budget DTOs, extension decisions, finance prompts. | `apps/web/src/features/finance/**`, `apps/web/src/workers/sim.worker.budget.ts`. | `/finance`, onboarding finance, roster extensions, dashboard. | Route paths persist; dirty-tree onboarding finance capping/spacing test passed. | Budget/helper tests; runtime onboarding evidence; focused FinancialView test. | YELLOW |
| Free agency/offseason | FA offers, arbitration, Rule 5, offseason phases, progression. | Player pool, contracts, roster rules, team needs, RNG. | Signings, phase advancement, roster changes. | `apps/web/src/features/free-agency/**`, `apps/web/src/features/offseason/**`, worker offseason actions. | `/free-agency`, `/offseason`. | Action handlers call autosave. | Route/hook tests exist. | YELLOW |
| Game and season simulation | Simulates games, days, seasons, playoffs, standings, stats, injuries. | Schedule, rosters, lineups, seeded RNG, fatigue/injury systems. | Game results, stats, standings, injuries, playoff outcomes. | `packages/sim-core/src/**`, worker day/season helpers. | `/schedule`, `/games/:gameIndex`, `/standings`, `/leaders`, `/playoffs`. | Sim controls persist active save. | Determinism verifier and smoke gate passed. | GREEN |
| Dynasty history | League/team/player history, records, awards, archives, rivalries, career retrospectives. | Season/player/team moments, archived games, awards, records, rivalry state. | Timeline beats, history pages, record watch, career hub, archived-game links. | `apps/web/src/workers/sim.worker.queries.ts`, history features, v34 archive schema. | `/history`, `/career`, `/records`, `/achievements`, `/rivalries`, dashboard. | v34 archive persists future archived games; old saves migrate with empty archive. | Migration tests and history tests; old-save narrative copy gap remains. | YELLOW |
| AI organizations | CPU draft, development, trades, free agency/offseason, payroll, team goals. | Rosters, budgets, needs, RNG, difficulty. | CPU decisions and league history. | `packages/sim-core/src/draft/draftAI.ts`, worker trade/offseason/budget/front-office identity modules. | Visible indirectly through league outcomes, draft board, standings, news/history. | Persisted through normal simulation snapshots. | Specific AI org identity parity tests missing. | RED |
| Narrative and immersion | Press, news, monthly pulse, rivalries, story arcs, onboarding/AGM voice. | Sim events, state triggers, owner/team/player context. | News feed, press prompts, reports, story surfaces. | `apps/web/src/app/layout/AppLayout.tsx`, `sim.worker.monthlyPulse.ts`, `sim.worker.actions.ts`, history queries. | App shell overlays, `/news`, `/press-room`, `/pulse`, dashboard. | Some app-shell narrative mutations bypass autosave. | Tests exist, but persistence assertions are incomplete. | RED |
| Scripts and gates | Typecheck, tests, build, determinism, structure, cycles, release smokes. | Source tree and package scripts. | Pass/fail signals and release risk data. | `package.json`, workspace package scripts, Turbo, Vitest, Vite, Madge, Knip. | Developer-facing. | None directly. | `typecheck`, `test`, `build`, `verify:determinism` passed; structure/cycles produced findings. | YELLOW |

## Route Map

| Route | System | Runtime/static result |
|---|---|---|
| `/` | Save Hub/new dynasty | Runtime Save Hub loaded with slots and New Dynasty path. |
| `/onboarding` | Day One setup | Full path ran; dirty-tree nudge/finance focused tests passed; browser validation pending. |
| `/dashboard` | Command center | Runtime loaded; readiness math bug found. |
| `/roster` | Roster management | Smoke loaded; autosave paths exist. |
| `/minors` | Farm system | Smoke loaded; direct development controls missing. |
| `/players` | Player index | Smoke loaded. |
| `/players/compare` | Player comparison | Smoke loaded. |
| `/players/:playerId` | Player profile | Static route/action coverage; profile actions autosave. |
| `/scouting` | Scouting | Smoke loaded; route actions autosave. |
| `/staff` | Staff/mentorship | Smoke loaded; mentorship is derived/read-only. |
| `/draft` | Draft room | Smoke loaded; dirty-tree draft mutation autosave tests passed; browser reload smoke still pending. |
| `/trade` | Trade center | Smoke loaded; persistence hook exists. |
| `/standings`, `/league/standings` | Standings aliases | Smoke loaded. |
| `/leaders`, `/league/leaders` | Leaders aliases | Smoke loaded. |
| `/schedule` | Schedule | Smoke loaded. |
| `/games/:gameIndex` | Game detail | `/games/0` loaded but no main heading in smoke. |
| `/press-room` | Press | Smoke loaded; app-shell press response persistence gap. |
| `/news` | News | Smoke loaded; read-state persistence path exists. |
| `/playoffs` | Playoffs | Smoke loaded. |
| `/free-agency` | Free agency | Smoke loaded; action autosave exists. |
| `/offseason` | Offseason | Smoke loaded; action autosave exists. |
| `/finance` | Finance | Smoke loaded. |
| `/career` | GM career | Smoke loaded. |
| `/history` | Dynasty history | Smoke loaded. |
| `/achievements` | Trophy room | Smoke loaded; ceremony dismiss autosave gap via app shell. |
| `/rivalries` | Rivalry watch | Smoke loaded. |
| `/front-office` | Owner/front office | Smoke loaded. |
| `/pulse` | Monthly pulse | Smoke loaded; app-shell ack/action autosave gap. |
| `/scenarios` | Challenge mode | Smoke loaded. |
| `/stats` | Stats encyclopedia | Smoke loaded. |
| `/records` | Record watch | Smoke loaded. |
| `/settings` | Settings/save tools | Smoke loaded; manual save/import paths exist. |
| `*` | Catch-all | Runtime unknown route redirected to `/MBD/dashboard`. |

## Verification Ledger

| Command or check | Result | Audit meaning |
|---|---|---|
| `npx pnpm@9.15.4 typecheck` | Pass | Type graph is currently coherent. |
| `npx pnpm@9.15.4 test` | Pass | 576 test files ran through package scripts; web test stderr still has release-polish warnings. |
| `npx pnpm@9.15.4 build` | Pass | Vite/PWA build works; large chunks remain a release concern. |
| `npx pnpm@9.15.4 run verify:determinism` | Pass | Determinism snapshot tests passed. |
| `rg -n "Math\\.random\\(" apps packages --glob '*.{ts,tsx,js,jsx}'` | No matches | No bare `Math.random()` in scanned app/package TS/JS sources. |
| `npx pnpm@9.15.4 run verify:structure` | Informational findings | Knip reported 1 unused dependency and 225 unused exports. |
| `npx pnpm@9.15.4 run verify:cycles` | Informational findings | Madge found 19 circular dependencies. |
| Playwright route smoke | Pass with notes | All registered routes loaded; `/games/0` lacked a main heading and unknown route redirected to dashboard. |
