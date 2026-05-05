# MBD Tutorial Assistant V1 Goal Contract

## Repo Notes From Initial Inspection

- Repository root: `/Users/tkevinbigham/Documents/GitHub/MBD`.
- Working branch for this goal: `goal/tutorial-assistant-v1`.
- Public game URL documented in current repo files: `https://kevinbigham.github.io/MBD/`.
- Package manager and root gate: `pnpm@9.15.4`, with `pnpm run verify` expanding to Turbo typecheck, tests, and build.
- Primary app stack: React 18, Vite 6, Tailwind CSS, Zustand, Dexie saves, Comlink worker, Zod contracts, Vitest.
- Current app routes are defined in `apps/web/src/app/routes/index.tsx`.
- Existing guidance surfaces include `TourProvider`, `tourDefinition`, `PageHelp`, `ContextualHelp`, `GameAdvisor`, and guided-start nudges.
- Current save schema version is `CURRENT_GAME_SNAPSHOT_VERSION = 33` in `packages/contracts/src/schemas/save.ts`.
- No filesystem `AGENTS.md` was present at the repo root during contract creation; follow Kevin's supplied AGENTS.md instructions for this sprint.
- `MASTER_CONTEXT.md` exists but contains stale paths, schema version, and counts. Treat live repo inspection as authoritative.

## Mission

Drive Mr. Baseball Dynasty toward v1.0 public-release readiness by building a world-class in-game Assistant/Tutorial character that helps every player understand:

- what to do next
- why each screen matters
- how each core system works
- how to make better GM decisions
- where player OVR/ratings matter
- how their current save is turning into a story

This sprint should maximize retention, review scores, enjoyability, playability, and addictiveness while preserving realistic baseball-sim depth.

## Product Priorities

1. Retention
2. Review scores
3. Enjoyability / playability / addictiveness
4. Public-release confidence
5. Mobile-first usability

## Non-Negotiables

- Build as much as possible autonomously.
- Do not wait for user input unless truly blocked.
- Make best-judgment product decisions when details are ambiguous.
- Preserve deterministic simulation behavior.
- Do not break save compatibility.
- Do not remove existing features unless clearly dead, broken, or replaced.
- Mobile web is first-class.
- The Assistant must support both newcomers and hardcore sim players.
- OVR/ratings must appear in more decision-critical surfaces.
- Keep realism, but make the game easier to understand.
- Prefer polished, shippable improvements over speculative half-built systems.
- All new behavior should have tests where practical.
- Run relevant typecheck/lint/test/build commands before declaring completion.
- Do not mark the goal complete until the completion audit passes.

## Operating Rules For This Goal

Maintain these files throughout the sprint:

1. `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md`
   - live checklist
   - current phase
   - completed work
   - known issues
   - test results
   - next action

2. `docs/tutorial-assistant/coverage-matrix.md`
   - every route/page
   - whether it has Assistant guidance
   - whether OVR/ratings are visible when relevant
   - mobile status
   - notes

3. `docs/tutorial-assistant/release-gate.md`
   - final acceptance checklist
   - remaining blockers
   - launch-readiness notes

At the start of each new continuation:

- read this goal contract
- read the progress file
- inspect current git status
- identify the next highest-impact task
- continue without asking the user unless blocked

Before stopping:

- update the progress file
- document tests run
- document changed files
- document known issues
- state whether the goal is complete, blocked, or still in progress
- if still in progress and not blocked, continue rather than asking the user to type "continue"

## Phase 0 - Preflight Repo Audit

Deliver:

- Confirm repo structure, framework, package manager, routes, test commands, build commands.
- Locate existing onboarding/tutorial/help/assistant/narrative systems.
- Locate route definitions and major game screens.
- Locate player rating/OVR models and UI components.
- Locate persistence/save/version code.
- Locate mobile layout patterns.
- Run the safest available checks first.

Required outputs:

- `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md`
- `docs/tutorial-assistant/phase0-preflight.md`

Acceptance criteria:

- Current state is understood from actual repo, not stale memory.
- Commands needed for validation are documented.
- Any blockers are documented with specific evidence.

## Phase 1 - FTUE + Decision-Point Audit

Deliver:

- Map current onboarding/tutorial flow.
- Map the full core game loop.
- Identify every "I don't know what to do next" moment.
- Identify all pages where a player makes meaningful GM decisions.
- Identify every place OVR/ratings should appear but currently do not.
- Identify mobile pain points for tutorial/assistant UX.

Core pages/routes include, but are not limited to:

- Setup / Save Hub (`/`)
- Onboarding (`/onboarding`)
- Dashboard (`/dashboard`)
- Roster (`/roster`)
- Minors (`/minors`)
- Players (`/players`)
- Player Compare (`/players/compare`)
- Player Profile (`/players/:playerId`)
- Scouting (`/scouting`)
- Staff (`/staff`)
- Draft (`/draft`)
- Trade (`/trade`)
- Standings (`/standings`, `/league/standings`)
- Leaders (`/leaders`, `/league/leaders`)
- Schedule (`/schedule`)
- Box Score (`/games/:gameIndex`)
- Press Room (`/press-room`)
- Playoffs (`/playoffs`)
- Free Agency (`/free-agency`)
- Offseason (`/offseason`)
- Finance (`/finance`)
- GM Career (`/career`)
- History (`/history`)
- Achievements (`/achievements`)
- Rivalries (`/rivalries`)
- Front Office / Owner Intel (`/front-office`)
- Pulse (`/pulse`)
- Scenarios / Challenges (`/scenarios`)
- Stats Encyclopedia (`/stats`)
- Record Watch (`/records`)
- Settings (`/settings`)

Required outputs:

- `docs/tutorial-assistant/phase1-audit.md`
- `docs/tutorial-assistant/ratings-visibility-audit.md`
- updated `docs/tutorial-assistant/coverage-matrix.md`

Acceptance criteria:

- Every major route is accounted for.
- Every high-friction decision moment has a recommended Assistant intervention.
- Ratings/OVR visibility gaps are prioritized.

## Phase 2 - Assistant Character + UX Spec

Design the in-game Assistant as a coach/GM mentor, not a nagging pop-up.

Deliver:

- Assistant name, persona, visual direction, tone, and behavior rules.
- Newcomer mode and hardcore mode.
- Global "What should I do now?" action.
- Route-aware help.
- Contextual hints.
- Skippable/replayable walkthroughs.
- "Explain this rating" help.
- "Why this matters" microcopy.
- Non-intrusive mobile layout.
- Assistant memory-lite concept for save-specific callbacks.

Assistant personality requirements:

- Baseball-smart
- Clear
- Encouraging
- Practical
- Not childish
- Not annoying
- Helpful for both casual players and deep sim players
- Speaks like a trusted bench coach / assistant GM
- Explains the next best action without taking away player agency

Required outputs:

- `docs/tutorial-assistant/character-spec.md`
- `docs/tutorial-assistant/assistant-ux-spec.md`
- `docs/tutorial-assistant/trigger-spec.md`
- `docs/tutorial-assistant/asset-plan.md`

Acceptance criteria:

- The Assistant has a consistent voice.
- UX rules avoid intrusive tutorial spam.
- User can dismiss, replay, or ask for more help.
- Spec is concrete enough to implement.

## Phase 3 - Assistant Engine Foundation

Implement a reusable Assistant/Tutorial framework.

Required capabilities:

- route-aware guidance
- step/checkpoint engine
- completion tracking
- local/save-safe persistence for tutorial progress
- skip/replay controls
- "What should I do now?" global CTA
- progressive hints
- cooldowns to avoid repetition
- mobile-friendly panel/drawer/modal behavior
- accessibility-friendly controls and focus behavior
- typed data model for guidance content

Implementation guidance:

- Prefer a small, robust framework over a sprawling one.
- Keep guidance content data-driven where practical.
- Reuse existing state/persistence patterns.
- Avoid breaking deterministic simulation.
- Avoid blocking gameplay unnecessarily.
- Add tests for state transitions and completion tracking where practical.

Acceptance criteria:

- Assistant can appear globally.
- Assistant can explain current page.
- Assistant can guide at least the dashboard and one major decision page.
- User can dismiss and replay help.
- Tutorial progress persists safely.
- Tests/checks pass.

## Phase 4 - Core Page Walkthroughs

Add useful Assistant guidance to the most important player flows.

Priority order:

1. Setup / Onboarding
2. Dashboard
3. Roster
4. Player Profile
5. Players / Compare
6. Scouting
7. Draft
8. Trade
9. Free Agency
10. Finance
11. Minors
12. Schedule / Box Score
13. Standings / Leaders
14. Press Room / Pulse
15. Offseason
16. Playoffs
17. Career / History / Achievements / Records
18. Rivalries / Front Office / Scenarios
19. Settings

For each page, add:

- what this page is for
- when to use it
- what decision the user can make
- what stats/ratings matter
- one suggested next action
- optional deeper explanation

Acceptance criteria:

- A new player can understand the main game loop.
- A hardcore player can skip basic help and still access deeper strategy.
- Assistant copy is concise and useful.
- Coverage matrix is updated.

## Phase 5 - OVR/Ratings Visibility Expansion

Goal:

Make OVR and key ratings visible anywhere users make roster, player, scouting, draft, trade, free agency, lineup, minors, or comparison decisions.

Deliver:

- Add OVR/rating badges/cards/components where missing.
- Explain ratings in plain language with tooltips or Assistant help.
- Ensure mobile readability.
- Ensure consistent visual grammar.
- Avoid clutter: show the most relevant rating at the point of decision, with deeper detail one tap/click away.

Likely surfaces:

- roster lists
- player cards
- player profile header
- comparison tables
- trade candidate lists
- draft boards
- free agency lists
- minors/development pages
- scouting reports
- lineup/decision views if present
- transaction/offer screens if present

Acceptance criteria:

- Users do not have to hunt for OVR when making major decisions.
- Ratings are legible on mobile.
- Tooltips/help explain implications.
- Tests/checks pass.

## Phase 6 - Assistant Visual Assets

Create polished Assistant visual assets if the environment supports image generation. If direct image generation is unavailable, create a complete asset spec and implement production-safe placeholders/hooks.

Desired assets:

- hero portrait
- small avatar
- neutral expression
- excited expression
- warning expression
- success expression
- transparent-background variants where possible
- web-optimized formats
- mobile-safe sizes

Visual direction:

- modern baseball front-office assistant / bench coach
- friendly but sharp
- polished sports-sim tone
- not goofy
- not copyrighted
- not based on real people
- should feel at home in MBD's UI

Implementation:

- Store assets in the appropriate public/static asset path.
- Add fallback SVG or CSS avatar if generated assets are unavailable.
- Add light pseudo-animation:
  - subtle entrance
  - expression change
  - success pulse
  - reduced-motion fallback
- Respect prefers-reduced-motion.

Acceptance criteria:

- Assistant has a polished visual presence.
- No broken image paths.
- Reduced-motion users are respected.
- Mobile layout remains clean.

## Phase 7 - Narrative Memory Lite

Goal:

Make the Assistant react to the current save so MBD feels alive.

Deliver:

- Lightweight memory keys for tutorial/narrative callbacks.
- Cooldowns to avoid repetitive lines.
- Assistant callbacks for meaningful events:
  - draft pick
  - trade
  - big signing
  - losing streak
  - winning streak
  - playoff push
  - budget/payroll issue
  - prospect development
  - star player performance
- Season recap / "story so far" helper if feasible.
- Keep deterministic simulation safe.

Acceptance criteria:

- Assistant can reference relevant save events.
- Prompts do not repeat constantly.
- Narrative adds clarity and emotional payoff without blocking gameplay.

## Phase 8 - Mobile, Accessibility, Performance Hardening

Deliver:

- Test critical flows on small viewport.
- Make Assistant usable by touch.
- Ensure panels do not cover key decisions.
- Ensure keyboard/focus behavior is sane.
- Ensure contrast/readability.
- Respect reduced motion.
- Run performance/build checks where available.

Acceptance criteria:

- Mobile tutorial UX is first-class.
- No obvious overlay traps.
- No major layout regressions.
- Checks pass.

## Phase 9 - Closed Playtest Readiness

Deliver:

- Playtest checklist.
- First-session test script.
- Tutorial feedback capture plan.
- Release gate.
- Known issues list.
- Suggested "share/social" feature if low-risk, such as a season recap/share card, dynasty card, or copyable summary.

Required outputs:

- `docs/tutorial-assistant/playtest-plan.md`
- `docs/tutorial-assistant/release-gate.md`

Acceptance criteria:

- A closed tester can play the first session and always know what to do next.
- Feedback can be collected in a simple way.
- Remaining launch blockers are explicit.

## Definition Of Done For The Overall Goal

The goal is complete only when:

1. Assistant exists in-game and actively guides users through the core loop.
2. Users can always answer, "What should I do next?"
3. The most important pages have contextual Assistant guidance.
4. OVR/ratings are visible in major decision contexts.
5. Mobile tutorial UX is first-class.
6. Assistant guidance is dismissible, replayable, and not annoying.
7. Newcomers and hardcore sim players are both supported.
8. Save compatibility and deterministic sim behavior are preserved.
9. Relevant tests/typechecks/lint/build checks pass, or any failures are clearly documented as pre-existing or blocked.
10. Progress docs, coverage matrix, playtest plan, and release gate are updated.
11. A completion audit against the actual current repo state passes.

## Completion Audit

Before marking this goal complete, perform this audit:

- Read this goal contract again.
- Read the progress file.
- Inspect git diff.
- Inspect coverage matrix.
- Run relevant checks.
- Confirm Assistant works on the highest-priority routes.
- Confirm OVR/ratings improvements exist in decision-critical surfaces.
- Confirm mobile behavior has been checked.
- Confirm docs are updated.
- List remaining known issues honestly.
- Only then mark the goal complete.

## Reporting Format

At each meaningful stop, report:

1. Current phase
2. What was implemented
3. Files changed
4. Tests/checks run and results
5. Known issues/risks
6. Next highest-impact task
7. Whether the goal is complete, blocked, or still in progress
