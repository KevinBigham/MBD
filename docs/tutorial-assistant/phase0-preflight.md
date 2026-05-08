# Tutorial Assistant V1 Phase 0 Preflight

Date: 2026-05-05
Branch: `goal/tutorial-assistant-v1`
Repo: `/Users/tkevinbigham/Documents/GitHub/MBD`

## Repo Structure

- Root monorepo: pnpm workspaces + Turbo.
- Web app: `apps/web` with React 18, Vite 6, Tailwind, Zustand, Dexie, Comlink, Vitest.
- Deterministic sim engine: `packages/sim-core`.
- Shared save/contracts: `packages/contracts`.
- Shared UI/tokens: `packages/ui`, `packages/design-tokens`.
- Current public URL in repo: `https://kevinbigham.github.io/MBD/`.

## Package Manager And Commands

- Root `package.json` declares `pnpm@9.15.4`.
- Global `pnpm` is not installed in this environment.
- Use `npx --yes pnpm@9.15.4 ...` for all pnpm commands.
- `node_modules` was missing at sprint start; `npx --yes pnpm@9.15.4 install` completed.

Primary commands:

- Root typecheck: `npx --yes pnpm@9.15.4 run typecheck`
- Root test: `npx --yes pnpm@9.15.4 run test`
- Root build: `npx --yes pnpm@9.15.4 run build`
- Root full gate: `npx --yes pnpm@9.15.4 run verify`
- Web focused gate: `npx --yes pnpm@9.15.4 --filter @mbd/web typecheck && npx --yes pnpm@9.15.4 --filter @mbd/web test && npx --yes pnpm@9.15.4 --filter @mbd/web build`
- Contracts save gate: `npx --yes pnpm@9.15.4 --filter @mbd/contracts test`
- Determinism gate: `npx --yes pnpm@9.15.4 run verify:determinism`

## Baseline Check Results

- `npx --yes pnpm@9.15.4 --version`: passed, `9.15.4`.
- `npx --yes pnpm@9.15.4 install`: passed; installed workspace dependencies from the existing lockfile.
- `npx --yes pnpm@9.15.4 run typecheck`: started and completed package typechecks through shared packages, then hung at `@mbd/web` with no output for several minutes. The command was stopped and recorded as an environment/runtime issue for the root gate. Use focused package gates during implementation and retry the root gate before completion.

## Route Inventory

Routes are defined in `apps/web/src/app/routes/index.tsx`.

| Route | Label | Component |
| --- | --- | --- |
| `/` | Save Hub | `SetupPage` |
| `/onboarding` | Onboarding | `RevisedOnboardingPage` |
| `/dashboard` | Dashboard | `DashboardPage` |
| `/roster` | Roster | `RosterPage` |
| `/minors` | Minors | `MinorsPage` |
| `/players` | Players | `PlayersPage` |
| `/players/compare` | Player Comparison | `PlayerComparisonPage` |
| `/players/:playerId` | Player Profile | `PlayerProfilePage` |
| `/scouting` | Scouting | `ScoutingPage` |
| `/staff` | Staff | `StaffPage` |
| `/draft` | Draft | `DraftPage` |
| `/trade` | Trade | `TradePage` |
| `/standings`, `/league/standings` | Standings | `StandingsPage` |
| `/leaders`, `/league/leaders` | Leaders | `LeadersPage` |
| `/schedule` | Schedule | `SchedulePage` |
| `/games/:gameIndex` | Box Score | `BoxScorePage` |
| `/press-room` | Press Room | `PressRoomPage` |
| `/playoffs` | Playoffs | `PlayoffsPage` |
| `/free-agency` | Free Agency | `FreeAgencyPage` |
| `/offseason` | Offseason | `OffseasonPage` |
| `/finance` | Finance | `FinancePage` |
| `/career` | GM Career | `GMCareerPage` |
| `/history` | History | `HistoryPage` |
| `/achievements` | Achievements | `AchievementsPage` |
| `/rivalries` | Rivalries | `RivalriesPage` |
| `/front-office` | Owner Intel | `FrontOfficePage` |
| `/pulse` | Pulse | `PulsePage` |
| `/scenarios` | Challenges | `ScenarioCatalogPage` |
| `/stats` | Stats Encyclopedia | `StatsEncyclopediaPage` |
| `/records` | Record Watch | `RecordWatchPage` |
| `/settings` | Settings | `SettingsPage` |

## Existing Tutorial / Help / Assistant Systems

- `apps/web/src/shared/components/TourProvider.tsx`: localStorage-backed guided tour for new games, mounted in `AppLayout`.
- `apps/web/src/shared/lib/tourDefinition.ts`: static tour steps for dashboard, sim controls, sidebar, roster, draft/trade, press room, and help system.
- `apps/web/src/shared/components/PageHelp.tsx` + `apps/web/src/shared/lib/pageHelpDefinitions.ts`: slide-in page help. Currently used directly on Roster, Draft, Trade, and Standings.
- `apps/web/src/shared/components/ContextualHelp.tsx`: top-bar contextual help keyed by pathname.
- `apps/web/src/features/dashboard/components/GameAdvisor.tsx`: dashboard-only "What should I do?" recommendation card.
- `apps/web/src/features/onboarding/nudges/*`: save-slot keyed localStorage guided-start nudges.
- `packages/sim-core/src/onboarding/assistantGM.ts`: deterministic onboarding assistant GM profile generation.
- `apps/web/src/workers/sim.worker.monthlyPulse.ts` and related files: monthly reports and decision spotlights that already carry some guidance.

## Ratings / OVR Systems

- Internal ratings are 0-550 in sim/contract data.
- Display ratings use the 20-80 style scale through helpers such as `toDisplayRating` and DTO fields named `displayRating`.
- Current save player shape stores `overallRating`.
- OVR is visible in many high-value surfaces: roster tables, players directory, player profile, free agency, trade tables, draft/scouting reports, minors pipeline, leaders, and setup preview.
- Gaps are mostly consistency/explanation gaps: users can see OVR but do not always know what it means, when to prioritize it, or why a lower OVR player may still be the right decision.

## Persistence / Save Safety

- Current save schema version: `CURRENT_GAME_SNAPSHOT_VERSION = 33` in `packages/contracts/src/schemas/save.ts`.
- Migration tests live in `packages/contracts/tests/save.migration.test.ts`.
- Existing guided-start nudge persistence uses localStorage keys under `mbd:nudges:<save-slot-id>` and explicitly avoids changing `GameSnapshot`.
- Tutorial Assistant V1 should prefer localStorage keyed by active save id/slot for tutorial progress and cooldowns. Any future `GameSnapshot` persistence requires a version bump, migration, and sample fixture update.

## Mobile Layout Patterns

- `apps/web/docs/lc3-mobile-audit.md` is the current detailed mobile audit.
- `AppLayout` uses desktop sidebar and mobile bottom nav / more drawer.
- Mobile controls target a 44px floor after LC-3.
- Assistant surfaces must avoid covering the fixed bottom sim controls and mobile tab bar.
- Use fixed bottom drawer/chip behavior on mobile, not large centered popups.
- Respect existing `useReducedMotion` and `prefers-reduced-motion` patterns.

## Blockers / Risks

- No repo-root `AGENTS.md` exists; Kevin's supplied AGENTS.md text is the active project-specific instruction source.
- `MASTER_CONTEXT.md` contains stale paths and counts; do not use it as authoritative.
- Root typecheck currently hangs in this desktop environment at web typecheck. Retry before completion; use focused gates to keep implementation moving.
- Existing guidance systems are fragmented. The Assistant should unify behavior around a single global entry point while reusing existing data and not deleting working features.
