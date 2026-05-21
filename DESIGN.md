# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-20
- Primary product surfaces: Save Hub, onboarding, app shell, dashboard, sim controls, roster, minors, draft, trade, free agency, scouting, staff, league, schedule, playoffs, offseason, finance, front office, press room, history, records, rivalries, scenarios, stats, pulse, GM career, achievements, settings.
- Evidence reviewed: README.md, GOAL.md, STATUS.md, MASTER_CONTEXT.md, apps/web/src/globals.css, apps/web/tailwind.config.ts, packages/design-tokens/src/tailwind-preset.ts, apps/web/src/app/layout/AppLayout.tsx, apps/web/src/app/layout/SimControls.tsx, apps/web/src/features/dashboard/routes/DashboardPage.tsx, apps/web/public/screenshots/*.

## Brand
- Personality: Data-dense baseball front office, Bloomberg-terminal discipline, fictional dynasty drama, grounded sports ops language.
- Trust signals: Deterministic simulation, local saves, visible records/standings/history, explicit recovery paths, regression-tested demo flows.
- Avoid: Licensed MLB marks, gambling/fantasy framing, loot-box language, casual mascot UI, generic SaaS hero styling, emoji-led content, ungrounded gradients.

## Product goals
- Goals: Help one player run a long baseball dynasty, make tradeoffs readable, preserve game state, surface league memory, and keep demo paths resilient.
- Non-goals: Real-time twitch play, online multiplayer, backend account systems, MLB authenticity, pay-to-win progression.
- Success signals: A player can start/resume a dynasty, advance time confidently, understand consequences, recover from save problems, and find next meaningful decisions without explanation panels.

## Personas and jobs
- Primary personas: Baseball sim player, dynasty storyteller, demo reviewer, returning local-save player.
- User jobs: Choose a franchise, evaluate the organization, advance days/weeks/months, react to owner/press/market pressure, preserve a save, inspect history.
- Key contexts of use: Desktop planning sessions, mobile check-ins, demo walkthroughs, repeat local browser sessions.

## Information architecture
- Primary navigation: Persistent sidebar plus command palette; app shell protects initialized game routes and Save Hub owns new/resume flows.
- Core routes/screens: Save Hub, onboarding, dashboard, roster/minors, draft/trade/free agency, league/schedule/playoffs, finance/front office, press/history/career/settings.
- Content hierarchy: Current dynasty state first, then decision pressure, then supporting tables/charts/narrative evidence.

## Design principles
- Principle 1: Preserve confidence. Mutating controls should make save/recovery state safer, not more mysterious.
- Principle 2: Dense but legible. Tables, metrics, and cards should support scanning without burying the next decision.
- Principle 3: Fictional but operational. Narrative flavor should clarify stakes while the UI still behaves like a serious front office tool.
- Tradeoffs: Prefer stable, tested UI patterns over splashy novelty; add motion/audio only when it marks state change or ceremony.

## Visual language
- Color: Dynasty dark surfaces with restrained accent colors for action, info, warning, and success states.
- Typography: Data numerals and compact labels use the data face; section and control labels use heading/brand faces from design tokens.
- Spacing/layout rhythm: Compact dashboard panels, fixed bottom simulation controls, mobile touch targets at least 44px.
- Shape/radius/elevation: Small-to-medium radii; elevation reserved for overlays, modals, and important surfaces.
- Motion: Respect reduced motion; use shimmer/pulse only for loading and ceremony emphasis.
- Imagery/iconography: Fictional team SVG logos, lucide-react icons, screenshots that show actual game surfaces.

## Components
- Existing components to reuse: PageShell, EmptyStatePanel, ResponsiveTable, TeamLogo, charts, AppLayout, Sidebar, TopBar, SimControls, overlays, @mbd/ui primitives.
- New/changed components: Prefer extending existing route-local components before adding a new component layer.
- Variants and states: Loading, disabled, busy, destructive, recovery, empty, and offline/slow states must be visible and testable.
- Token/component ownership: Tailwind preset in packages/design-tokens; shared primitives in packages/ui; route-specific composition in apps/web/src/features.

## Accessibility
- Target standard: WCAG-minded keyboard and screen-reader support for the core playable flow.
- Keyboard/focus behavior: Global shortcuts must ignore editable fields, focus rings must remain visible, and route controls need accessible labels.
- Contrast/readability: High-contrast mode hooks are present and must be preserved for dynasty text, muted text, and borders.
- Screen-reader semantics: Live regions should announce season/day/phase and async status changes without duplicating visible content.
- Reduced motion and sensory considerations: Reduced-motion preference and audio preferences must gate nonessential motion/audio.

## Responsive behavior
- Supported breakpoints/devices: Desktop-first front office surfaces with mobile-safe touch targets and stacked controls.
- Layout adaptations: Dense tables and route panels should stack or become horizontally manageable on mobile.
- Touch/hover differences: Do not rely on hover-only affordances for primary actions; touch controls remain at least 44px.

## Interaction states
- Loading: Use skeletons or compact status relays that name the game surface being restored.
- Empty: Explain the next action in game-world terms and provide a direct route or command.
- Error: Preserve failure evidence and route to Save Recovery when save/import state is corrupt.
- Success: Prefer state change, history/news/ticker evidence, or a concise toast over generic success copy.
- Disabled: Disabled sim controls must reflect real worker/simulation state and should never appear clickable during an unsafe mutation.
- Offline/slow network, if applicable: Local-first play should continue; PWA/service-worker states should avoid noisy dev-console failures.

## Content voice
- Tone: Sharp front-office briefing, concise baseball stakes, no hype for its own sake.
- Terminology: Use franchise, dynasty, front office, owner, press room, market, scouting, roster, playoff race.
- Microcopy rules: Lead with the baseball consequence; avoid visible tutorial prose where controls are self-evident.

## Implementation constraints
- Framework/styling system: React 18, Vite 6, Tailwind CSS, Zustand, Dexie, Comlink worker, Vitest, pnpm/Turbo.
- Design-token constraints: Use @mbd/design-tokens Tailwind preset and existing accent/dynasty classes before adding colors.
- Performance constraints: Simulation and save paths should respect recorded runtime budgets and avoid unbounded UI polling.
- Compatibility constraints: Do not change save schema without version/migration/fixture work; do not add dependencies for small UI control changes.
- Test/screenshot expectations: Add focused Vitest coverage for route/control behavior and use browser smoke for meaningful playable UI changes.

## Open questions
- [ ] Should the app expose a visible autosave timestamp in the app shell? Owner: product. Impact: could further increase player confidence after sim controls mutate state.
