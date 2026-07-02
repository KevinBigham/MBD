# MBD UI/UX and OOTP Reference Overhaul Guide

Generated from the current `/Users/tkevinbigham/Downloads/MBD-main` working tree on 2026-06-17.

This is the follow-up guide for Kevin's request to make MBD easier to understand, easier to navigate, and much easier to use for trades, using current MBD source plus the local `OOTP Baseball 27.app` reference bundle. It is not a replacement for `docs/CODEX_GAME_GUIDE.md`, `docs/CODEX_IMPROVEMENT_PLAN.md`, `docs/CODEX_FEATURE_DOMAIN_GUIDE.md`, `docs/CODEX_SOURCE_ATLAS.md`, or `docs/CODEX_WORKER_WIRING_MATRIX.md`. Read those first when implementing.

## Executive Summary

The original GOAT implementation plan is effectively complete for engineering health, save safety, worker wiring, route decomposition, and deterministic simulation. The remaining UX problem is different: MBD now has a lot of good systems, but a new or casual user still has to discover them through a broad flat route list, scattered help surfaces, and a Trade Center that mixes inbox, market theatre, history, multi-team controls, and the actual two-team builder on one page.

The next GOAT slice should make MBD feel like a guided GM cockpit:

1. Every screen answers "what am I looking at?"
2. Every screen gives one obvious next action.
3. Trades have a simple lane that works before the user learns the advanced builder.
4. Navigation is grouped around baseball-GM mental tasks, not only source-module names.
5. Help, assistant, command palette, dashboard cards, and route CTAs come from one canonical guidance model.

Do not try to clone OOTP. Use OOTP as evidence for durable patterns: manager home, global find, indexed help, quickstarts, report hubs, visual status language, and task-oriented wizards. MBD can be clearer than OOTP by keeping trades first-class instead of burying them under generic transaction reports.

## Implementation Status - 2026-06-17

Source implementation for Phases 1-6 is complete on branch `codex/mbd-ui-ux-ootp-overhaul`:

- Phase 1 added the grouped navigation registry and wired Sidebar/mobile More plus CommandPalette search to task-based route groups.
- Phase 2 added the canonical route guidance registry for Assistant, TopBar contextual help, PageHelp, command aliases, `/news`, and dynamic `/players/:playerId` plus `/games/:gameIndex` routes.
- Phase 3 added `/trade?mode=quick|builder|offers|market|history`, Quick Trade checklist flow, command-palette quick/market routing, and `/trade?playerId=...` shop-player context while preserving the advanced builder.
- Phase 4 added shared trade explanation factors, Dashboard Trade Intel CTAs, and player-profile Shop Player shortcuts.
- Phase 5 added the Dashboard Reports Hub and Quickstarts index using existing routes/DTO surfaces only.
- Phase 6 added Settings guidance replay controls for assistant route completions, guided-start nudges, tutorial/help, and quickstart entry, plus an updated UX playtest checklist.

Save schema impact: none. The new replay state changes clear save-scoped `localStorage` guidance records only; they do not alter `GameSnapshot`, contracts, migrations, fixtures, workers, or seeded simulation paths.

Verification from the completed branch:

- Focused shell/help/trade/dashboard/player/settings/onboarding tests: PASS, 21 files / 76 tests.
- `npx --yes pnpm@9.15.4 --filter @mbd/web typecheck`: PASS.
- `npx --yes pnpm@9.15.4 typecheck`: PASS, Turbo `9 successful, 9 total`.
- `npx --yes pnpm@9.15.4 build`: PASS, Turbo `5 successful, 5 total`.
- `git diff --check`: PASS.
- `rg -n "Math\\.random\\(" apps packages --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/*.md'`: PASS, no matches.

## Current Source Evidence

### App Shell and Route Shape

- `apps/web/src/app/routes/index.tsx` mounts `/` Save Hub and `/onboarding` outside the playable shell, then mounts all playable routes inside `AppLayout`.
- Current playable routes include dashboard, roster, minors, players, compare, player profile, scouting, staff, draft, trade, standings, leaders, schedule, box scores, press room, news, playoffs, free agency, offseason, finance, GM career, history, achievements, rivalries, front office, pulse, scenarios, stats, records, and settings.
- `apps/web/src/app/layout/AppLayout.tsx` owns the playable shell, including top bar, sidebar, season flow, ticker, sim controls, command palette, monthly pulse, assistant, and modal flows.

This is a strong technical shell, but too much product navigation is exposed at once.

### Sidebar and Mobile Navigation

- `apps/web/src/app/layout/Sidebar.tsx` defines one flat `baseMainNavItems` list with more than two dozen destinations.
- Trade is present, and mobile correctly promotes `/trade` into the primary tab loop, but desktop has no higher-level grouping like Home, Team, Players, Transactions, League, Story, System.
- Mobile hides non-primary destinations in a More drawer, but the drawer is still a grid of route labels rather than a task map.

The fix is not to remove routes. The fix is to group and label routes around user intent.

### Command Palette

- `apps/web/src/app/layout/CommandPalette.tsx` has navigation entries plus action entries.
- "Start Negotiation" and "Review Trade Market" both call `navigate('/trade')`.
- "Review Roster Needs", "Scout Draft Class", "Review Free Agent Market", and "Review Offseason Plan" are useful ideas, but they also mostly navigate to broad routes.

The command palette should become MBD's OOTP-style global find and GM command launcher: players, teams, reports, trade targets, help topics, and dynamic "what should I do now?" actions.

### Trade Center

- `apps/web/src/features/trade/components/TradePageContent.tsx` renders `TradePageHeader`, `TradeDeadlineDashboard`, then a two-column grid for activity plus builder.
- `TradeBuilderContextPanel.tsx` asks the user to select a target club from a dropdown or all-team button grid. Relationship memory is shown, which is good, but teams are not ranked by fit, need, surplus, budget, relationship, or deadline posture.
- `TradePackageEvaluationCard.tsx` disables submit until the market is open, a target club is selected, an outgoing asset is selected, and an incoming asset is selected. The disabled reason lives mainly in `title`, which is weak for mobile and for learning the workflow.
- The primary button label is "Start Negotiation" for a new package, even though user language and some worker surfaces still talk about proposing trades.
- `PlayerProfileActionsPanel.tsx` has a good shortcut pattern: user-team players link to `/trade?playerId=...`. This should become one of many guided entry points.

The Trade Center has depth, but the first-time path is still "pick a team, manually browse both asset lists, then infer why the button is disabled." Kevin's requested fix needs a Simple Trade lane above or beside the advanced builder.

### Assistant, Help, and Onboarding

- `apps/web/src/features/assistant/data/assistantGuidance.ts` has route-aware guidance, next-action building, ticker callbacks, newcomer/hardcore modes, and tests.
- `apps/web/src/app/layout/TopBar.tsx` only shows TopBar contextual help when `PAGE_HELP[location.pathname]` has an exact match.
- `apps/web/src/shared/lib/pageHelpDefinitions.ts` has helpful entries, but coverage is uneven relative to all playable routes. It also contains copy that can drift from route reality.
- `docs/tutorial-assistant/` contains a full prior tutorial-assistant packet: audit, coverage matrix, UX spec, playtest plan, release gate, triggers, and ratings visibility audit.

The infrastructure exists. The problem is fragmentation: Assistant, TopBar help, PageHelp, tutorial tour, dashboard cards, guided-start nudges, Monthly Pulse, and command palette are not one route/task guidance system.

## OOTP 27 Reference Evidence

The local reference app inspected was `OOTP Baseball 27.app` in the repo root.

`Contents/Info.plist` reports:

- Name: `OOTP Baseball 27`
- Version: `27.3.66`
- Build: `66`
- Bundle ID: `com.ootpdevelopments.ootp27macqlm`

Safe inspection only. Do not decompile or copy proprietary implementation. Useful evidence came from resource names, skins, archives, and file organization:

- Skins: `ootp classic` has 3876 files, `ootp dark` has 3827 files, and `ootp light` has 3847 files.
- Skin/resource names point to reusable primitives: manager home, global find, menu navigation, browser navigation, news/info bars, player popups, rating panels, depth boxes, scout selection, contract buttons, wizards, tutorials, hints, tables, and panels.
- `default_data` contains domain archives for quickstarts, tutorial files, report templates, in-game help, game text, schedules, stats, storylines, strategy profiles, worlds, logos, uniforms, ballparks, sounds, and saves.
- `in-game_help_system_files.zip` contains a small indexed help system: `help_index.txt` and preference dialog help files.
- `in-game_text_files.zip` contains text and tutorial XML files, including `english.xml`, `gui_translations.xml`, and `tutorial_data.xml`.
- `report_template_files.zip` has heavy report coverage: history 327, league 258, team 255, player 111, news 33, draft 28, transaction 19, email 12, free agent 11, waiver 3, salary 3, and direct trade filename hits 0.

Inference: OOTP's UX strength is not one screen. It is the ecosystem: manager home, global search, quickstarts, indexed help, reportable history, status icons, and task flows. Trades appear to be part of transaction/news/history/report channels rather than a dominant standalone template family. MBD should keep Trade first-class while adding the missing cockpit, search, report, and guidance patterns.

## Main UX Problems To Fix

### 1. Navigation Is Too Flat

MBD exposes many routes at once. That is fine for expert users, but new users need a mental model. Reframe navigation into:

- Home: Front Office, Pulse, News
- Team: Roster, Minors, Staff, Finance, Front Office
- Players: Players, Compare, Scouting, Draft
- Transactions: Trade, Free Agency, Offseason
- League: Standings, Leaders, Schedule, Playoffs, Stats, Records
- Story: Press Room, History, Rivalries, GM Career, Achievements
- System: Settings, Save Hub, Challenges

Keep direct route access, but make the first layer task-based.

### 2. Trade Has No Simple Lane

The advanced builder is powerful, but Kevin's exact pain is "make trades easily without having to click through a bunch of stuff." The first pass should add a guided Simple Trade lane:

1. Choose intent: improve MLB roster, sell veteran, shop player, find prospect, clear salary, add pitching, add bat.
2. Pick source: one of my players, one roster need, one target player, or one incoming offer.
3. Show ranked partner/team fits.
4. Suggest one balanced starter package from existing DTO values.
5. Explain likely AI reaction in plain English.
6. Let the user send, edit in advanced builder, or save as a target.

Keep the existing builder for advanced users.

### 3. Help Exists, But It Is Scattered

Build one canonical route/task guidance registry and feed these consumers from it:

- Assistant route guidance.
- TopBar help.
- PageHelp dialogs.
- Command palette aliases and actions.
- Dashboard "what now" cards.
- Tutorial tour labels.
- Settings reset/replay controls.

The registry should support route aliases and dynamic paths like `/players/:playerId` and `/games/:gameIndex`; TopBar should not require exact `PAGE_HELP[location.pathname]` matches.

### 4. The Dashboard Should Become A GM Office

The Dashboard is rich, but the next slice should make it the place a confused user can recover:

- "You have 3 things to do before simming."
- "You have one trade offer, one roster compliance issue, and one scouting action."
- "Your next best move is..."
- "Continue what I was doing" for last trade, player, draft, or offseason task.

This should be live and routeable, not just explanatory copy.

### 5. Reports and History Are Underused For Orientation

OOTP's report-heavy structure is a clue. MBD has strong history, records, news, pulse, and dashboard cards already. Add a Reports Hub or report-style subnav so users can answer:

- What happened last month?
- What trades did I make?
- Who improved?
- What is my budget risk?
- What should I do before the deadline?
- What changed after onboarding?

Start with links and composed existing DTOs, not new persistence.

## Recommended Implementation Roadmap

### Phase 0: Current-State Verification and UX Baseline

Goal: make sure the next worker starts from current truth and can prove UX progress.

Tasks:

- Read `AGENTS.md` if present; if absent, use Kevin's rules.
- Read the five Codex docs plus this guide.
- Run `git status --short --branch`.
- Confirm `node_modules` exists or install with `CI=true npx --yes pnpm@9.15.4 install --frozen-lockfile`.
- Run `npx --yes pnpm@9.15.4 typecheck`.
- Run targeted current tests for `CommandPalette`, `Sidebar`, `AssistantPanel`, `assistantGuidance`, `PageHelp`, and `TradePage`.
- Capture the current route/nav/help map from source.

Acceptance:

- Baseline commands are known.
- No save schema changes.
- No `Math.random(` matches under `apps` or `packages`.

### Phase 1: Navigation IA and GM Office Shell

Goal: make navigation understandable before changing deep workflows.

Tasks:

- Add a `navigationRegistry` or equivalent source of truth for route groups, labels, aliases, and intent tags.
- Refactor `Sidebar.tsx` and mobile More drawer to use grouped route sections.
- Update `CommandPalette.tsx` to use the same registry for navigation.
- Add intent aliases to command entries: "trade", "shop player", "fix roster", "draft", "budget", "what now", "reports".
- Keep the existing routes and URLs stable.

Likely files:

- `apps/web/src/app/layout/Sidebar.tsx`
- `apps/web/src/app/layout/CommandPalette.tsx`
- `apps/web/src/app/layout/Sidebar.test.tsx`
- `apps/web/src/app/layout/CommandPalette.test.tsx`
- New shared navigation registry under `apps/web/src/app/layout/` or `apps/web/src/shared/lib/`

Acceptance:

- New users can see high-level categories.
- Mobile still has primary tabs for Dashboard, Roster, Draft, Trade, League.
- Command palette search finds route labels, aliases, and common baseball tasks.

### Phase 2: Canonical Guidance Registry

Goal: one guidance model powers assistant, help, and command actions.

Tasks:

- Create a route/task guidance registry with page purpose, when to use, common blockers, next actions, related routes, aliases, and help text.
- Make `resolveAssistantRouteKey()` and TopBar help use the same route matcher.
- Generate or map `PAGE_HELP` from the registry.
- Add `/news`, dynamic player routes, dynamic game routes, and all playable routes to help coverage.
- Fix stale help copy, especially Free Agency vs IFA copy.
- Add tests proving every route in `AppRoutes` has guidance or an explicit exemption.

Likely files:

- `apps/web/src/features/assistant/data/assistantGuidance.ts`
- `apps/web/src/shared/lib/pageHelpDefinitions.ts`
- `apps/web/src/app/layout/TopBar.tsx`
- `apps/web/src/shared/components/ContextualHelp.tsx`
- `apps/web/src/features/assistant/data/assistantGuidance.test.ts`
- `apps/web/src/app/layout/TopBar.test.tsx`

Acceptance:

- Assistant, TopBar help, and PageHelp agree on route purpose and next action.
- `/news` no longer falls back to dashboard-style guidance.
- Dynamic routes have help via route matching.

### Phase 3: Simple Trade Lane

Goal: a user can make or start a reasonable trade without learning the full builder first.

Tasks:

- Add route modes for `/trade`, for example `?mode=quick`, `?mode=builder`, `?mode=offers`, `?mode=market`, `?mode=history`.
- Make command palette "Start Negotiation" navigate to `/trade?mode=quick`; make "Review Trade Market" navigate to `/trade?mode=market`.
- Add a Simple Trade panel above the advanced builder or as the default tab.
- Use existing DTOs first: user roster, target roster, trade asset inventories, trade deadline state, relationships, selected player from `playerId`, and package value helpers.
- Rank partner teams deterministically by need/surplus/relationship/deadline/budget signals already available in route/worker DTOs.
- Show a visible checklist: partner, my asset, target asset, fairness, send.
- Keep the existing advanced builder intact.

Likely files:

- `apps/web/src/features/trade/routes/TradePage.tsx`
- `apps/web/src/features/trade/hooks/useTradePageController.ts`
- `apps/web/src/features/trade/hooks/useTradeMarketContext.ts`
- `apps/web/src/features/trade/components/TradePageContent.tsx`
- `apps/web/src/features/trade/components/TradeBuilderContextPanel.tsx`
- `apps/web/src/features/trade/components/TradePackageEvaluationCard.tsx`
- `apps/web/src/features/trade/lib/tradeBuilderTransforms.ts`
- New `TradeQuickStartPanel.tsx` and tests if useful

Acceptance:

- `/trade?mode=quick` has a clear first action.
- `/trade?playerId=...` opens with "shop this player" context.
- The disabled submit state is visible as checklist copy, not only a title tooltip.
- User can jump from quick lane to advanced builder without losing current selections.
- Trade tests cover route modes and quick-lane behavior.

### Phase 4: Trade Explainability and CTA Wiring

Goal: users understand why a trade is accepted, rejected, countered, or risky.

Tasks:

- Standardize trade explanation factors in UI copy: value, age, contract, control, team need, roster legality, budget, GM personality, relationship, market phase.
- Surface existing `review` evidence consistently for start, advance, resolve, counter, and incoming offers.
- Make Dashboard Trade Intel clickable and add CTAs to active offers, deadline market, and quick trade.
- Add player/roster/scouting shortcuts: "Shop player", "Ask for this target", "Build around this need".

Likely files:

- `apps/web/src/features/dashboard/components/TradeIntelCard.tsx`
- `apps/web/src/features/dashboard/components/TradeIntelCardBody.tsx`
- `apps/web/src/features/trade/components/TradeResultBanner.tsx`
- `apps/web/src/features/trade/components/TradeNegotiationSummaryCard.tsx`
- `apps/web/src/features/trade/components/TradeOfferCard.tsx`
- `apps/web/src/features/players/components/PlayerProfileActionsPanel.tsx`
- Roster/scouting components only where direct links already fit cleanly

Acceptance:

- A rejected or countered trade tells the user what to change.
- Dashboard and player profile shortcuts land in the correct trade mode.
- Trade UI labels consistently choose either "Propose Trade" or "Start Negotiation" by context.

### Phase 5: Reports Hub and Quickstarts

Goal: give users OOTP-like reference surfaces without adding risky persistence.

Tasks:

- Add a Reports Hub route or Dashboard section that links existing report-like surfaces: Trade Ledger, Transaction Log, Season Recap, Draft Log, Free Agency Market, Budget Report, Player Development, History, Records.
- Prefer existing DTOs and routes. If a new route is too much, start with a Dashboard/History report index.
- Add preset new-dynasty quickstart copy or scenarios using existing setup/scenarios infrastructure: contender, rebuild, small market, tutorial day one.

Likely files:

- `apps/web/src/features/dashboard`
- `apps/web/src/features/history`
- `apps/web/src/features/setup`
- `apps/web/src/features/scenarios`
- `apps/web/src/app/routes/index.tsx` only if adding a route

Acceptance:

- User can find "what happened" and "what do I review" from one place.
- No save schema change unless Kevin explicitly approves persisted report indices.

### Phase 6: Settings Reset and Playtest Script

Goal: let users replay help and prove the UX is actually easier.

Tasks:

- Add Settings controls to reset/replay assistant route completions, guided-start nudges, and tutorial tour independently.
- Use `docs/tutorial-assistant/playtest-plan.md` as a starting point.
- Add a manual UX playtest checklist: new game, onboarding, Dashboard, quick trade, roster compliance, sim month, return from save.

Likely files:

- `apps/web/src/features/settings`
- `apps/web/src/features/assistant/lib/assistantState.ts`
- `apps/web/src/features/onboarding/nudges/guidedStartNudgeStore.ts`
- `docs/tutorial-assistant/playtest-plan.md`
- `docs/CODEX_RELEASE_CHECKLIST.md` if the manual release route list changes

Acceptance:

- Guidance can be replayed without clearing the whole save.
- The playtest proves a new user can find and start a trade.

## Save and RNG Safety

Most of this roadmap should be UI/DTO-only. Avoid save schema changes in the first pass.

Safe:

- Route query params.
- Component state.
- Existing save-scoped localStorage for assistant/tutorial preferences.
- Derived DTOs from existing worker data.
- Deterministic stable sorting of existing DTO arrays.

Risky:

- Persisting trade plans, shopping lists, report indices, dismissed tasks, or tutorial progress into snapshots.
- Generating trade packages with random sampling.
- Adding new worker mutations for user-facing suggestions.

If a future slice truly needs snapshot persistence:

- Bump the save schema version.
- Add migration.
- Update fixtures/tests.
- Prove a Season 10 save still loads.
- Document the save-safety reasoning in the final response.

If any trade suggestion logic uses randomness, route it through the existing seeded RNG path. Do not add bare `Math.random()`.

## Suggested Test Matrix

Focused tests should land with each slice:

- `apps/web/src/app/layout/Sidebar.test.tsx`
- `apps/web/src/app/layout/CommandPalette.test.tsx`
- `apps/web/src/app/layout/TopBar.test.tsx`
- `apps/web/src/features/assistant/data/assistantGuidance.test.ts`
- `apps/web/src/features/assistant/components/AssistantPanel.test.tsx`
- `apps/web/src/shared/components/PageHelp.test.tsx`
- `apps/web/src/features/trade/routes/TradePage.test.tsx`
- `apps/web/src/features/trade/lib/tradeBuilderTransforms.test.ts`
- New quick-trade component/hook tests if new files are created

Baseline commands:

```bash
npx --yes pnpm@9.15.4 --filter @mbd/web exec vitest run src/app/layout/Sidebar.test.tsx src/app/layout/CommandPalette.test.tsx src/app/layout/TopBar.test.tsx src/features/assistant/data/assistantGuidance.test.ts src/features/assistant/components/AssistantPanel.test.tsx src/shared/components/PageHelp.test.tsx src/features/trade/routes/TradePage.test.tsx --reporter=verbose
npx --yes pnpm@9.15.4 --filter @mbd/web typecheck
npx --yes pnpm@9.15.4 typecheck
npx --yes pnpm@9.15.4 build
rg -n "Math\\.random\\(" apps packages --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/*.md'
```

If any worker/sim logic changes, also run:

```bash
npx --yes pnpm@9.15.4 run verify:determinism
MBD_SKIP_SMOKE_GATE=1 npx --yes pnpm@9.15.4 verify
```

## Ready-To-Paste Goal Prompt

Use the standalone version in `docs/goals/MBD_UI_UX_OOTP_OVERHAUL_GOAL.md` for the next Codex window. It is intentionally shorter than this guide so it can fit Codex's goal input limit.
