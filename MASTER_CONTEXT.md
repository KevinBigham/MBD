# MASTER_CONTEXT.md — Complete Project State for Session Handoff

> Generated: 2026-04-10 | Main: `21f2a87` | Active branch: `feature/round2-onboarding-rebuild` (+4 commits) | 1,314 sim-core tests | 379/381 web tests | Schema v16 (branch) / v15 (main) | LIVE

---

## 1. Project Overview

**Mr. Baseball Dynasty (MBD)** is a browser-based baseball franchise dynasty simulator. You manage one of 32 fictional teams across decades of roster management, trades, drafts, player development, scouting, financial planning, and playoff races. Zero backend — all simulation runs client-side in a Web Worker. Deterministic seeded PRNG ensures identical outcomes from identical inputs.

- **Live:** https://kevinbigham.github.io/MBD/
- **Repo:** github.com/KevinBigham/MBD (private)
- **Creator:** Kevin Bigham (director; reads code, directs agents)
- **Aesthetic:** Bloomberg Terminal dark theme — data-dense, monospace numbers, no emoji, lucide-react icons only
- **Core loop:** Build staff -> evaluate roster -> play 162-game season -> playoffs -> offseason (draft/FA/trades) -> repeat across decades

---

## 2. Architecture Map

```
/Users/tkevinbigham/Projects/MBD/                  # Workspace root
├── mr-baseball-dynasty/                           # THE GAME (pnpm + Turbo monorepo)
│   ├── apps/web/                                  # React 18 + Vite 6 frontend
│   │   ├── src/app/                               # Shell, routes (33+), layout, providers
│   │   ├── src/features/                          # 27 feature modules (lazy-loaded)
│   │   ├── src/shared/                            # 7 hooks, 24 components, 9 lib files
│   │   ├── src/workers/                           # 25+ worker modules + onboarding tests
│   │   └── src/build/                             # bundleConfig, bundleBudget, PWA
│   ├── packages/sim-core/                         # Pure TS deterministic engine (116+ files)
│   ├── packages/contracts/                        # Zod schemas, save v16 migration chain
│   ├── packages/ui/                               # 13 Radix-based components
│   ├── packages/design-tokens/                    # Bloomberg dark theme tokens
│   ├── packages/sim-worker/                       # DEAD CODE (see Known Issues)
│   └── packages/test-utils/                       # Shared test fixtures
├── .codex/MBD/                                    # Durable cross-agent memory (8 files)
├── REFERENCE/                                     # Design docs + Muse Spark creative content
│   ├── MBD_MASTER_GAME_PLAN.md                    # Full rebuild blueprint
│   ├── MBD_REBUILD_GUIDE.md                       # Code-level rebuild guide
│   ├── MUSE_SPARK_DESIGN_SPECS.md                 # Session 1 engineering specs
│   ├── MUSE_SPARK_WORLD_BIBLE.md                  # R1 franchises, archetypes, voice
│   ├── MUSE_SPARK_ROUND2_WORLD_BIBLE.md           # R2 more franchises, narrative debt
│   ├── MUSE_SPARK_ONBOARDING_CHARACTERS.md        # 3 named AGMs full specs
│   ├── MUSE_SPARK_ONBOARDING_DIALOGUE.md          # Full AGM dialogue scripts
│   └── GAME_DESIGN/, STUDIO_KERNEL/               # Older design docs
├── ARCHIVE/                                       # Frozen historical snapshots (17 subdirs)
├── AGENTS.md                                      # Permanent multi-agent instructions
├── CLAUDE.md                                      # Claude-specific instructions
├── MBD_PROJECT_BIBLE.md                           # Technical reference (stale test counts)
└── MBD_MASTER_REFERENCE.md                        # File inventory (stale test counts)
```

---

## 3. Dependency Graph

```
@mbd/web
├── @mbd/contracts
├── @mbd/design-tokens
├── @mbd/sim-core → @mbd/contracts
├── @mbd/sim-worker → @mbd/contracts, @mbd/sim-core  (DEAD — not imported by web)
└── @mbd/ui → @mbd/design-tokens
```

The real worker lives at `apps/web/src/workers/sim.worker.ts`, not in `@mbd/sim-worker`.

---

## 4. Tech Stack

- **Language:** TypeScript 5.7 strict mode
- **Frontend:** React 18, Vite 6, Tailwind CSS 3.4
- **State:** Zustand 5 (UI), Dexie (IndexedDB saves), Zod (schema validation)
- **Concurrency:** Web Workers + Comlink
- **Simulation:** pure-rand xoroshiro128plus (deterministic PRNG), Log5 + Markov
- **Visualization:** Recharts 3.8, @dnd-kit
- **Components:** Radix UI primitives, lucide-react icons
- **Testing:** Vitest + fast-check (property-based)
- **Monorepo:** pnpm workspaces + Turborepo
- **Deploy:** GitHub Actions -> GitHub Pages (static SPA)

---

## 5. Systems Inventory

### 5.1 sim-core (116+ files, 1,314 tests passing)

| System | Key Files | Status |
|--------|-----------|--------|
| **PRNG (seeded)** | `math/prng.ts` — GameRNG, fork(), nextInt | Active |
| **Log5 model** | `math/log5.ts` — attribute-to-rate matchup math | Active |
| **Plate Appearance** | `sim/plateAppearance.ts` — outcome resolution | Active |
| **Baserunning** | `sim/markov.ts` — base-state Markov chain | Active |
| **Game Sim** | `sim/gameSimulator.ts` — 9+ innings, bullpen, stats | Active |
| **Season Sim** | `sim/seasonSimulator.ts` — day/week/month | Active (audit-fixed) |
| **Playoff Sim** | `sim/playoffSimulator.ts` — bracket + momentum | Active (audit-fixed) |
| **Player Generation** | `player/generation.ts` — ~5,400 players with OU aging | Active |
| **Development** | `player/development.ts` + `developmentPipeline.ts` | Active |
| **Breakout Engine** | `player/breakoutEngine.ts` — probability + trajectory | Active |
| **Coaching Chemistry** | `player/coachingChemistry.ts` + `mentorship.ts` | Active |
| **Draft** | `draft/` (6 files) — class gen, AI picks, scouting | Active (audit-fixed) |
| **Free Agency** | `roster/freeAgency.ts` — multi-day bidding | Active (audit-fixed) |
| **Trade AI** | `trade/tradeAI.ts`, `valuation.ts`, `multiTeamTrade.ts` | Active |
| **Trade Negotiation** | `trade/tradeNegotiation.ts` — state machine | Built, NOT WIRED to UI |
| **GM Relationships** | `league/gmRelationships.ts` — scores, trade memory, decay | Built, NOT WIRED |
| **Relationship Effects** | `league/relationshipEffects.ts` | Built, NOT WIRED |
| **League Events** | `narrative/leagueEvents.ts` — 10 monthly event types | Built, NOT WIRED |
| **Signature Moments** | `moments/momentDetector.ts` — 12 types, FIFO 8/player | Built, NOT WIRED |
| **Earned Nicknames** | `moments/nicknames.ts` — 20 triggers | Built, NOT WIRED |
| **Onboarding (revised)** | `onboarding/` (16 files) — Day 1 flow, 3 AGMs, hiring | Active (branch only) |
| **Narrative** | `narrative/` (13 files) — news, PBP, press, ticker, arcs | Active (audit-fixed) |
| **Scouting** | `scouting/` (5 files) — IFA, scout learning, conflicts | Active (audit-fixed) |
| **Stats** | `stats/` (4 files) — advanced, milestones, projections | Active (audit-fixed) |
| **Finance** | `finance/` (3 files) — contracts, arb, market intel | Active (audit-fixed) |
| **Career** | `career/` — GM career mode, job market | Active |
| **Scenarios** | `scenarios/` (4 files) — 10 challenge scenarios | Active |
| **Achievements** | `league/achievements.ts` — 48+ achievements | Active |
| **Sharing** | `sharing/` — dynasty cards, leaderboard scoring | Active |
| **Timeline** | `timeline/` — branch comparison | Partial |
| **Performance** | `performance/` — archive/prune helpers | Partial |
| **Invariants** | `invariants/checker.ts` — runtime validation | Partial (debug only) |
| **Persistence** | `persistence/` — EMPTY DIRECTORY | Orphaned |

### 5.2 Web App (27 features, 33+ routes)

All 27 features are **shipped** and playable:

| Feature | Route(s) | Page component |
|---------|----------|----------------|
| Setup | `/` | SetupPage.tsx (787 LOC) |
| Onboarding | `/onboarding` (default), `/onboarding-legacy` | RevisedOnboardingPage.tsx (branch), OnboardingPage.tsx (legacy) |
| Dashboard | `/dashboard` | DashboardPage.tsx (895 LOC) |
| Roster | `/roster` | RosterPage.tsx (1079 LOC) — DnD depth chart + lineup builder |
| Players | `/players`, `/players/:id`, `/players/compare` | PlayersPage, PlayerProfilePage, PlayerComparisonPage |
| Minors | `/minors` | MinorsPage.tsx — pipeline, mentorship, breakout tracker |
| Draft | `/draft` | DraftPage.tsx (1205 LOC) |
| Trade | `/trade` | TradePage.tsx (1412 LOC) — with deadline drama |
| Free Agency | `/free-agency` | FreeAgencyPage.tsx — market intel |
| Scouting | `/scouting` | ScoutingPage.tsx (966 LOC) — conflicts tab |
| Staff | `/staff` | StaffPage.tsx — coaching radar |
| League | `/standings`, `/leaders` | StandingsPage, LeadersPage |
| Schedule | `/schedule`, `/games/:idx` | SchedulePage, BoxScorePage (enhanced PBP) |
| Playoffs | `/playoffs` | PlayoffsPage.tsx — momentum panel |
| Offseason | `/offseason` | OffseasonPage.tsx (1172 LOC) |
| Finance | `/finance` | FinancePage.tsx |
| Front Office | `/front-office` | FrontOfficePage.tsx — owner intel |
| Press Room | `/press-room` | PressRoomPage.tsx — press conference modal |
| History | `/history` | HistoryPage.tsx (1787 LOC) — dynasty timeline |
| Records | `/records` | RecordWatchPage.tsx |
| Rivalries | `/rivalries` | RivalriesPage.tsx |
| Scenarios | `/scenarios` | ScenarioCatalogPage.tsx |
| Stats | `/stats` | StatsEncyclopediaPage.tsx |
| Pulse | `/pulse` | PulsePage.tsx — monthly decision spotlight |
| GM Career | `/career` | GMCareerPage.tsx |
| Achievements | `/achievements` | AchievementsPage.tsx — award ceremony modal |
| Settings | `/settings` | SettingsPage.tsx (1068 LOC) |

**Shared infrastructure:**
- `app/layout/`: AppLayout, Sidebar, TopBar, CommandPalette, MonthlyPulseOverlay, MomentCardOverlay, TickerBar, SimControls, SeasonFlowCard
- `shared/hooks/`: useGameStore, useWorker, usePreferencesStore, useAudioPreferencesStore, useReducedMotion, useFocusTrap
- `shared/lib/`: saveSystem (Dexie), audio, logger, performance, pageHelpDefinitions, tourDefinition, webVitals
- `shared/components/`: PageShell, EmptyStatePanel, ResponsiveTable, TourProvider, charts/ (10+ chart components), TeamLogo, AnimatedNumber, Sparkline, ProgressFill

### 5.3 Workers (25+ files, all in `apps/web/src/workers/`)

**Lifecycle:** `sim.worker.ts` -> `sim.worker.helpers.ts` -> `sim.worker.state.ts`

**Feature workers:** achievements, draft, farm, trade, actions, onboarding, setup, ceremony, pipeline, balance (test), legacy

**Narrative workers:** narrative, narrativeFarm, pressRoom, monthlyPulse, seasonNarrative, storyArcs, ticker

**Query workers:** queries (leaderboards, standings, etc.), stats, records, diagnostics, consequences

**Snapshots:** snapshot.ts, snapshot.onboarding.ts

### 5.4 Support Packages

- **@mbd/contracts** — 17 schema files, ~1,599 Zod schemas, 4,180 LOC. Largest: `save.ts` at 2,354 LOC with v2-v16 migration chain. Current: `CURRENT_GAME_SNAPSHOT_VERSION = 16`.
- **@mbd/ui** — 13 active components: Button, Card, Badge, Skeleton, Container, Stack, Tabs, StatLine, GradeBar, TrendArrow, Toast, index, lib/utils
- **@mbd/design-tokens** — 7 token files: colors (dynasty navy + orange accents), spacing, density, shadows, typography (JetBrains Mono + Space Grotesk + Bebas Neue), tailwind-preset
- **@mbd/sim-worker** — **DEAD CODE.** 49-line Comlink wrapper at `packages/sim-worker/src/worker.ts`. Zero references from `apps/web/src`. Still listed in package.json, still in tsconfig paths, but never imported. Safe to archive or remove.

---

## 6. Shipped Features

1. Full 162-game season sim (Log5 PA + Markov baserunning)
2. 32 fictional teams, 6 divisions, market sizes, owner archetypes
3. ~5,400 generated players with attributes, personalities, OU aging curves
4. Draft system (300+ prospect classes, AI picks with need-based evaluation, signing)
5. Trade system (5 AI GM personalities, deadline drama, multi-team trades)
6. Free agency market (multi-day bidding, qualifying offers)
7. Minor league system (6 levels, prospect bonds, development pipeline)
8. Coaching staff management (12 roles, chemistry, mentorship)
9. Financial system (contracts, arbitration, extensions, luxury tax)
10. Scouting with fog-of-war (amateur, international, pro)
11. Narrative engine (17 news categories, interactive press conferences, 55+ PBP templates, story arcs, ticker)
12. Hall of Fame, record books, 48+ achievements, 10 challenge scenarios
13. Player comparison, similarity, season projections, breakout intelligence
14. Scout consensus panel, prospect breakout tracker, playoff momentum
15. Award ceremony modal, enhanced play-by-play
16. Bloomberg Terminal dark UI, command palette, keyboard shortcuts, PWA, offline mode
17. Save/load with v2-v16 migration chain, what-if branches (up to 3 parallel)
18. Dynasty timeline chapters, season recap modal, timeline comparison
19. **Day 1 Onboarding (branch only, not merged to main):** 3 fixed AGMs (Marcus Chen / Walt Kowalski / Elena Vargas), 9-chapter flow, interactive staff hiring, scouting director hiring, AGM opinion pills on every candidate

---

## 7. In-Progress / Unshipped Work

| Feature | Location | Status | Next Step |
|---------|----------|--------|-----------|
| **Day 1 Onboarding Rebuild** | `feature/round2-onboarding-rebuild` (4 commits) | Complete on branch, not merged | Smoke test in browser, merge to main, deploy |
| **Signature Moments wiring** | `moments/momentDetector.ts` | sim-core done (96 tests) + schema v16 ready | Wire `detectMoment()` into post-game scan in `sim.worker.actions.ts` |
| **Earned Nicknames wiring** | `moments/nicknames.ts` | sim-core done + schema v16 ready | Wire `evaluateNicknames()` into offseason processing |
| **Living League UI** | `league/gmRelationships.ts`, `trade/tradeNegotiation.ts`, `narrative/leagueEvents.ts` | sim-core done (161 tests) + schema v16 ready | Build relationship tier indicators, negotiation UI, event cards |
| **Narrative Debt system** | Muse Spark specs in REFERENCE/ | Design complete (10 debt types with resolutions), no code | New sim-core module `narrative/narrativeDebt.ts` |
| **Press Memory system** | Muse Spark specs | 8 patterns designed, no code | New sim-core module `narrative/pressMemory.ts` |
| **Persistent AGM commentary** | Muse Spark specs | 15 triggers designed, no code | New sim-core module `onboarding/persistentAGM.ts` |
| **Season Themes** | Muse Spark specs (10 themes with early/mid/late beats) | Design complete, no code | sim-core module |
| **Muse Spark R2 dialogue wiring** | `REFERENCE/MUSE_SPARK_ONBOARDING_DIALOGUE.md` | ~470 dialogue lines written | Wire into `scriptOrchestrator.ts` chapter dialogue |
| **City modifiers + Ballpark DNA** | Muse Spark R2 specs (12 franchises) | Data tables ready | sim-core data module |

---

## 8. Research & Ideas Bank

From Muse Spark sessions, onboarding specs, and design discussions:

**Narrative depth:**
- 8 player narrative archetypes (Journeyman, Prodigy, Heel, Captain, Ghost, Comeback Kid, Mercenary, Hometown Hero)
- Narrative debt system (unfinished business echoes forward across seasons)
- Press memory callbacks (year 1 quotes echo as year 3 questions)
- Dynasty arc templates (build/peak/decline/rebuild voice shifts)
- 10 season themes (Rebuild Arrives, Last Dance, Cursed Again, etc.)
- Broadcast booth voice with 10 signature phrases
- 3 franchise deep lore profiles already written (KC Fountains, Portland Sasquatch, Austin Bat Colony), 8 more in R2 (NY Tycoons, LA Sunset Strip, Detroit Motor Kings, Phoenix Dust Devils, Milwaukee Suds, Raleigh Pines, Las Vegas Aces, Boston Noreasters)

**Mechanical depth:**
- City modifiers (KC fan loyalty +30%, Austin power dev +12%, Portland analytics +25%)
- Ballpark DNA (park factors + unique quirks per venue)
- Persistent AGM beyond onboarding (pops up during trades, press, losing streaks, milestones)
- Visual player aging (card desaturation past 32, milestone badges)

**Sharing & social:**
- Seed sharing via URL (`mbd://dynasty?seed=abc123&team=KC`)
- Dynasty card PNG export with QR code
- WebRTC peer leagues (multiplayer without backend via deterministic sync)
- Weekly challenge seeds (community competition on same starting conditions)

**Easter eggs:** 25 defined by Muse Spark (.350 x3, 0-162 Void, Perfect 4/20, 27-pitch CG, 81-81, Marlowe draft, Konami Code, 42 HR career, etc.)

**Future mechanics:**
- Stadium and revenue management
- Historical rosters mode
- AI-generated commentary with TTS
- Mobile responsive on remaining pages
- Team logo visual assets (TeamLogo component ready, no assets)

---

## 9. Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Web Worker for ALL sim logic | Never block main thread. 5,400 players + PA calculations would freeze UI. |
| Deterministic seeded PRNG (pure-rand xoroshiro128plus) | Same seed = same game. Enables replay, seed sharing, competitive challenges, time-travel debugging. |
| Zod schemas in shared contracts package | Single source of truth for types between sim-core and web. Runtime validation for save file integrity. |
| No emoji in game UI | Bloomberg Terminal aesthetic. Professional, data-dense feel. lucide-react icons exclusively. |
| Onboarding as pure sim-core modules (not UI code) | Assessment functions consumable by any UI surface — wizard, sidebar, dashboard cards. |
| Living League as additive modules (not patching existing engines) | New relationship/negotiation modules provide adjustment functions. Existing trade/FA engines remain unchanged. |
| Bug audit before feature stacking | 25 determinism bugs caught (sort tie-breakers, purity, legacy fallbacks) before building new layers on top. |
| Multi-agent team (ChatGPT architect, Codex builder, Claude reviewer, Muse Spark designer) | Specialized agents per stage. Kevin directs. |
| Feature-sliced React architecture | Each feature owns its routes, components, hooks, types. Prevents circular dependencies. |
| 3 FIXED AGM candidates (not procedural) | Better character investment. Each AGM is a real person with a voice, not a dice roll. |
| Staff hiring during onboarding (not just assessment) | Teaches the coaching system while making meaningful first decisions. "You just got hired, hire your staff" framing. |
| Additive save schema bumps (v15 -> v16 via default-value migration) | Old saves continue to load. New fields default to empty arrays / null. |
| Legacy onboarding kept alongside revised | `/onboarding` = new, `/onboarding-legacy` = old. Both work. Safe fallback. |

---

## 10. Known Issues / Tech Debt

### High priority
1. **Day 1 onboarding not merged or deployed** — `feature/round2-onboarding-rebuild` is 4 commits ahead of main, has not been smoke-tested end-to-end, not deployed to GitHub Pages.
2. **Live deploy behind main** — Main has 3+ commits (signature moments, onboarding UI, useWorker wiring) that never deployed. The feature branch adds 4 more on top.
3. **2 pre-existing narrative worker test failures** — `sim.worker.test.ts > sim worker narrative APIs`: `emits retirement consequences before offseason rollover removes players`, `publishes monthly history, scenario, and anniversary ticker hooks`. Pre-date all onboarding work.

### Medium priority
4. **@mbd/sim-worker is dead code** — Package exists, aliased in vite config, but nothing imports from it. Real worker lives at `apps/web/src/workers/sim.worker.ts`. Confirmed zero references from `apps/web/src`.
5. **Direct sim-core runtime imports in feature code** — ~13 files in `apps/web/src/features/` import runtime helpers (`getTeamById`, `TEAMS`, `estimateProjectedWarRange`, `toDisplayRating`, `CHAPTER_ORDER`, `calculateDynastyLeaderboardScore`) directly from `@mbd/sim-core` instead of going through the worker bridge. Low perf risk but normalizes the boundary violation.
6. **App code bypasses contracts package boundary** — `apps/web/src/shared/lib/saveSystem.ts` and `apps/web/src/workers/snapshot.ts` reach into `packages/contracts/src/schemas/save` directly instead of using the public barrel export.
7. **Circular chunk warning** — `game-engine-onboarding <-> game-engine-core` warning on build (cosmetic; build still succeeds).

### Low priority / Stale docs
8. **MBD_MASTER_REFERENCE.md** — Test count stale (says 815, actual 1,314)
9. **MBD_PROJECT_BIBLE.md** — Test count stale
10. **README.md** — Test count stale ("700+", actual 1,314 sim-core + 379 web)
11. **.codex/MBD/plan.md, open_questions.md, decisions.md** — Stale; superseded by this doc
12. **9 stale worktrees** (all merged or obsolete, see Cleanup Candidates below)
13. **24+ merged local branches** — From completed features

### Resolved since last MASTER_CONTEXT (2026-04-09)
- Muse Spark creative output HAS been saved to `REFERENCE/` (5 files total)
- sim-core bug audit merged (25 fixes, 27 regression tests)
- Onboarding wizard UI shipped
- Signature Moments + Nicknames engine code shipped to main

---

## 11. Cleanup Candidates — Needs Kevin's Review

### Stale worktrees (safe to remove — all merged or superseded)
Located at `mr-baseball-dynasty/.worktrees/`:
- `assistant-gm` — PR #18 merged
- `dynasty-timeline-chapters` — merged
- `first-10-minutes` — PR #17 merged
- `foundation-intelligence` — PR #14 merged
- `living-league` — PR #19 merged
- `phase15-broadcast` — all 6 slices merged
- `phase16-war-room` — phase 16 merged
- `signature-moments-nicknames` — merged to main
- `sim-core-bug-audit` — merged to main
- `round1-onboarding-engine-rebuild` — Codex's failed hallucinated worktree (has only 3 unstaged edits, never committed)
- `round2-implementation` — obsolete round 2 prototype

### Stale .codex/MBD/ files
- `plan.md` — can be cleared and repurposed
- `open_questions.md` — all questions resolved
- `decisions.md` — superseded by Section 9 of this doc

### Potentially archivable packages
- `@mbd/sim-worker` — DEAD. Nothing imports from it. Kevin confirm before removing.

### Empty/orphaned directories
- `packages/sim-core/src/persistence/` — empty directory, no code ever shipped

**No files were moved during this audit.** Kevin must confirm before any archival.

---

## 12. Next Priorities (Ranked)

1. **Smoke test Day 1 onboarding** — Fresh dynasty at `/onboarding` -> pick each of 3 AGMs -> walk all 9 chapters -> reach dashboard. Verify no console errors.
2. **Merge `feature/round2-onboarding-rebuild` to main** — 4 clean commits, 1,314/1,314 sim-core + 38/38 critical web tests passing.
3. **Deploy to GitHub Pages** — Multiple commits behind live site.
4. **Wire Signature Moments into game loop** — Post-game scan in `sim.worker.actions.ts`, store in `narrative.playerMoments` (schema v16 field already exists).
5. **Wire Earned Nicknames into offseason** — Call `evaluateNicknames()` in end-of-season processing.
6. **Wire Living League to UI** — GM relationship tier indicators on trade UI, negotiation round state machine, monthly league events on news feed.
7. **Round 3 onboarding polish** — Wire Muse Spark `MUSE_SPARK_ONBOARDING_DIALOGUE.md` (~470 lines) into `scriptOrchestrator.ts` for richer character voice across all chapters.
8. **Fix 2 pre-existing narrative worker test failures** — Separate investigation sprint.
9. **Clean up worktrees and merged branches** — 11 worktrees, 24+ branches.
10. **Build Narrative Debt engine** (new sim-core module) — 10 debt types from R2 specs.
11. **Build Press Memory system** (new sim-core module) — 8 patterns from R2 specs.
12. **Build Persistent AGM commentary** — 15 triggers from R2 specs.
13. **Update stale docs** — MBD_MASTER_REFERENCE, MBD_PROJECT_BIBLE, README test counts.

---

## 13. Verification Snapshot (2026-04-10)

### Branch: `feature/round2-onboarding-rebuild`
```
packages/sim-core: 95 files / 1,314 tests passing
apps/web:          tsc --noEmit clean
apps/web:          vitest 379/381 passing
                   (2 pre-existing narrative worker failures)
apps/web:          vite build clean
apps/web:          bundle budget met (game-engine-core 333KB raw)
Determinism audit: zero Math.random, zero as any, zero bare .sort()
```

### Test Distribution
- sim-core: 95 test files, 1,314 tests (all passing)
- web: 73 test files, ~381 tests (2 pre-existing failures)
- contracts: migration fixtures + tests
- ui, design-tokens: tested via web app

### Bundle Chunks (post-build)
- game-engine-vendor: 13 KB raw
- game-engine-onboarding: 78 KB raw (lazy)
- game-engine-contracts: 115 KB raw
- game-engine-core: 333 KB raw
- game-engine-story: 384 KB raw
- vendor-charts: 426 KB raw / 122 KB gzip
- Main bundle: 296 KB raw / 78 KB gzip

---

## 14. Kevin's Working Preferences

- **Role:** Director. Reads code, directs agents, doesn't write it himself.
- **Day job:** High school teacher (Personal Finance), Head Swim/Dive Coach. During school hours, maximize autonomy — can't babysit.
- **Energy matching:** When he's fired up, be fired up. When he's focused, be focused.
- **Communication:** Terse milestones, not play-by-play. Don't summarize what you just did.
- **Permission model:** Once direction is clear, assume and proceed. Don't ask for permission mid-task.
- **Language:** "Not needed" = cut completely. "AI decides" = full autonomy.
- **Code style:** Boring code over clever. Named constants, pure functions, explicit state transitions. No magic numbers. Tests expected for everything.
- **UI rules:** No emoji in game UI. lucide-react icons exclusively. Bloomberg Terminal aesthetic is non-negotiable.
- **Sim rules:** Determinism is sacred. No `Math.random()`. Seeded PRNG only.
- **Schema rules:** Never break save files. Additive migrations only. Single schema bump per phase.
- **Library rules:** No new libraries without justification.
- **Multi-agent workflow:** ChatGPT (architect), Codex (builder), Claude Code (reviewer/ops), Muse Spark (creative director), Kevin (director).
- **Project acronyms:** MBD = Mr. Baseball Dynasty (this), MFD = Mr. Football Dynasty, BSPC = Blue Springs Power Cats swim app, StatLens = wrestling stats, PG = party game, CEHP = Cactus Ed's Happiest Place platformer.

---

## 15. Session Trail (Last 30 Commits)

```
c2fe265 chore(onboarding): downstream fixes for v16 schema + onboarding chunk
6a8ed18 feat(onboarding): Day 1 UI — AGM selection + interactive staff hiring
a239117 feat(onboarding): wire Day 1 onboarding through the worker bridge
430c45c feat(onboarding): Day 1 engine — 3 fixed AGM characters + staff hiring
21f2a87 docs: update MASTER_CONTEXT.md — full forensic audit                 [<- main tip]
23ceca1 fix: wire onboarding methods into useWorker hook
fa2a3ec Merge feature/onboarding-wizard-ui: First 10 Minutes experience
1a7f859 Merge codex/signature-moments-nicknames: moments + nicknames engine
66ed611 feat: add Signature Moments + Earned Nicknames to sim-core
6fe6896 Merge codex/sim-core-bug-audit: 25 bug fixes, 27 regression tests
f51bf39 fix: sim-core full bug audit — 25 fixes, 27 regression tests
c7ab4b2 feat: add onboarding wizard UI — First 10 Minutes experience
2b9c8e2 docs: add MASTER_CONTEXT.md — complete project state for session handoff
6280737 Merge pull request #19 from KevinBigham/feature/codex-living-league
1f07b67 feat: add living league sim-core foundation
27a9f64 Merge pull request #18 from KevinBigham/feature/codex-assistant-gm
2ecdc92 feat: add assistant gm onboarding script layer
ce5174a Merge pull request #17 from KevinBigham/feature/codex-first-10-minutes
dcb9ad4 feat: onboarding engine — 8-chapter flow with roster/farm/staff/financial/scouting/strategy
18a3b51 Merge pull request #16 from KevinBigham/fix/codex-review-pr15
4cb48a8 fix: address Codex review on PR #15 — breakout history, momentum stale data
101db21 Merge pull request #15 from KevinBigham/feature/wire-foundation-intelligence
8946cfa feat: wire foundation intelligence — breakout, scout consensus, prospect watch, playoff momentum
3d2742b Merge pull request #14 from KevinBigham/feature/codex-foundation-intelligence
54bf84d chore: update codex memory for foundation intelligence sprint
df7383f Merge pull request #13 from KevinBigham/feature/wire-unwired-apis
486e522 feat: wire 5 unwired APIs — comparison, projections, similarity, enhanced PBP, award ceremony
9223425 Merge pull request #12 from KevinBigham/feature/codex-player-intelligence
9416d75 Merge pull request #10 from KevinBigham/feature/round2-integration-sprint
8b4c9e1 fix: address Codex review on PR #10 — route, money units, budget scale
```

---

*End of MASTER_CONTEXT.md — last updated 2026-04-10*
