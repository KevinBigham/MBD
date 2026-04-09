# MASTER_CONTEXT.md — Complete Project State for Session Handoff

> Generated: 2026-04-09 | Main: `6280737` | 19 PRs merged | 1,548 tests | ~125K LOC | Schema v15 | LIVE

---

## Project Overview

**Mr. Baseball Dynasty (MBD)** is a browser-based baseball franchise dynasty simulator. You manage one of 32 fictional teams across decades of roster management, trades, drafts, player development, scouting, financial planning, and playoff races. Zero backend — all simulation runs client-side in a Web Worker. Deterministic seeded PRNG ensures identical outcomes from identical inputs.

**Live:** https://kevinbigham.github.io/MBD/
**Repo:** github.com/KevinBigham/MBD (private)
**Creator:** Kevin Bigham (director, reads code, doesn't write it)

---

## Architecture Map

```
mr-baseball-dynasty/                    # pnpm + Turbo monorepo
+-- apps/web/                          # React 18 + Vite 6 frontend
|   +-- src/app/                       # Shell, routes, layout (20 files)
|   +-- src/features/                  # 26 feature modules (105 files)
|   |   +-- achievements/              # Trophy room + award ceremony modal
|   |   +-- dashboard/                 # Intelligence grid (8 cards)
|   |   +-- draft/                     # Draft room with big board
|   |   +-- finance/                   # Payroll + luxury tax
|   |   +-- free-agency/               # FA market + intel panel
|   |   +-- front-office/              # Owner intel + chemistry
|   |   +-- gm-career/                 # Career timeline + job market
|   |   +-- history/                   # Dynasty timeline + season recaps
|   |   +-- league/                    # Standings + stat leaders
|   |   +-- minors/                    # Pipeline + breakout tracker
|   |   +-- offseason/                 # 12-phase offseason wizard
|   |   +-- players/                   # Profiles + comparison + projections + similarity
|   |   +-- playoffs/                  # Bracket + momentum panel
|   |   +-- press-room/               # Press conferences + news
|   |   +-- pulse/                     # Monthly reports
|   |   +-- records/                   # Record watch
|   |   +-- rivalries/                 # Rivalry management
|   |   +-- roster/                    # Lineup builder + depth chart (dnd-kit)
|   |   +-- scenarios/                 # 10 challenge modes
|   |   +-- schedule/                  # Game schedule + box scores + enhanced PBP
|   |   +-- scouting/                  # Scout reports + IFA + conflicts
|   |   +-- settings/                  # User preferences
|   |   +-- setup/                     # New game / save management
|   |   +-- staff/                     # Coaching hire/fire + radar charts
|   |   +-- stats/                     # Stats encyclopedia
|   |   +-- trade/                     # Trade proposals + deadline drama
|   +-- src/shared/                    # Hooks, components, charts (58 files)
|   +-- src/workers/                   # Web Worker modules (30 files)
|   +-- src/build/                     # Bundle config, PWA (7 files)
+-- packages/sim-core/                 # THE ENGINE (113 src, 89 test files, 1,172 tests)
|   +-- src/math/                      # PRNG (xoroshiro128plus), Log5 probability
|   +-- src/player/                    # 16 files: generation, attributes, development, coaching, injury, breakout, comparison, similarity, personality, mentorship
|   +-- src/league/                    # 14 files: teams, standings, awards, records, HOF, rivalries, GM RELATIONSHIPS, RELATIONSHIP EFFECTS
|   +-- src/sim/                       # 8 files: game/season/playoff sim, Markov FSM, PLAYOFF MOMENTUM
|   +-- src/trade/                     # 6 files: valuation, AI, multi-team, deadline drama, TRADE NEGOTIATION
|   +-- src/stats/                     # 4 files: WAR/wOBA/FIP, milestones, projections
|   +-- src/narrative/                 # 13 files: news, PBP, press conferences, story arcs, LEAGUE EVENTS
|   +-- src/finance/                   # 3 files: contracts, market intelligence
|   +-- src/scouting/                  # 5 files: engine, IFA, conflicts, SCOUT LEARNING
|   +-- src/draft/                     # 6 files: pool, AI, picks, scouting, signing
|   +-- src/roster/                    # 7 files: FA, minors, offseason, Rule 5
|   +-- src/onboarding/               # 16 files: FIRST 10 MINUTES engine + ASSISTANT GM character
|   +-- src/scenarios/                 # 4 files: 10 challenge modes
|   +-- src/sharing/                   # 3 files: dynasty cards, leaderboard
|   +-- src/career/                    # 1 file: GM career progression
|   +-- src/timeline/                  # 1 file: what-if branch comparison
|   +-- src/performance/              # 1 file: snapshot archival
|   +-- src/invariants/               # 1 file: runtime checker (18 checks)
+-- packages/contracts/                # Zod schemas (17 files, save schema v15)
+-- packages/ui/                       # Component library (13 components, Radix UI)
+-- packages/sim-worker/               # Web Worker bridge (6 files, Comlink)
+-- packages/design-tokens/            # Design system tokens (7 files)
```

---

## Systems Inventory

| System | Location | Status | Tests |
|--------|----------|--------|-------|
| Game Simulation (PA, game, season) | sim-core/sim/ | Active | 30+ |
| Player Generation & Attributes | sim-core/player/ | Active | 80+ |
| Trade System + Living League | sim-core/trade/ + league/ | Active | 60+ |
| Draft System | sim-core/draft/ | Active | 20+ |
| Financial System | sim-core/finance/ | Active | 30+ |
| Scouting + Scout Learning | sim-core/scouting/ | Active | 20+ |
| Narrative Engine | sim-core/narrative/ | Active | 40+ |
| Onboarding (First 10 Min) | sim-core/onboarding/ | Active, NOT WIRED TO UI | 232 |
| Living League | sim-core/league/ + trade/ + narrative/ | Active, NOT WIRED TO UI | 161 |
| Web Worker Bridge | apps/web/workers/ | Active | — |
| React UI (26 features) | apps/web/features/ | Active | 376 |
| Save/Load (IndexedDB) | apps/web/shared/lib/saveSystem | Active | — |
| PWA + Service Worker | apps/web/build/ | Active | 1 |

---

## Shipped Features (What Works Today)

1. Full 162-game season simulation with Log5 plate appearances and Markov baserunning
2. 32 fictional teams across 6 divisions with market sizes and owner archetypes
3. ~5,400 generated players with 20-80 attributes, 20 personality traits, OU aging curves
4. Complete draft system (300+ prospect classes, AI picks, signing)
5. Trade system with 5 AI GM personalities, deadline drama, multi-team trades
6. Free agency market with bidding, qualifying offers
7. Minor league system (6 levels, development pipeline, prospect bonds)
8. Coaching staff management (12 roles, hire/fire, chemistry)
9. Financial system (contracts, arbitration, extensions, luxury tax)
10. Scouting with fog-of-war, IFA pool, scout conflicts, Bayesian learning
11. Narrative engine (17 news categories, press conferences, story arcs, enhanced PBP)
12. Hall of Fame, records, 48+ achievements
13. GM career mode with job market
14. 10 challenge scenarios
15. What-if timeline branching
16. Dynasty cards for sharing
17. Interactive press conferences (12 topics, 4 responses)
18. Player comparison, similarity, season projections
19. Breakout intelligence, scout consensus, playoff momentum panels
20. Award ceremony modal
21. Bloomberg Terminal dark UI with Recharts visualizations
22. PWA with offline support, 5 save slots
23. Command palette (Cmd+K), keyboard shortcuts
24. Accessibility (skip-to-content, focus traps, WCAG AA contrast)

---

## In-Progress Work (Built but Not Wired to UI)

| Feature | Location | Next Step |
|---------|----------|-----------|
| **First 10 Minutes Onboarding** | sim-core/onboarding/ (16 files, 232 tests) | Build wizard UI (split-screen with AGM character) |
| **Assistant GM Character** | sim-core/onboarding/assistantGM.ts + chapterDialogue.ts + coachingTips.ts + choiceReactions.ts + scriptOrchestrator.ts | Wire to onboarding wizard UI |
| **Living League Relationships** | sim-core/league/gmRelationships.ts | Add to save schema, wire to trade UI |
| **Trade Negotiation State Machine** | sim-core/trade/tradeNegotiation.ts | Build negotiation UI with counter-offers |
| **Relationship Effects** | sim-core/league/relationshipEffects.ts | Wire into FA, waiver, draft, Rule 5 systems |
| **League-Wide Events** | sim-core/narrative/leagueEvents.ts | Wire to news feed and dashboard |

---

## Research & Ideas Bank

From Meta AI Muse Spark (saved in REFERENCE/MUSE_SPARK_DESIGN_SPECS.md):

1. **Signature Moments** — Permanent player event storage (walk-off HR, no-hitter, etc.) with trait modifications
2. **Earned Nicknames** — 20 stat/event-triggered nicknames ("The Flash", "Mr. October", etc.)
3. **Season Themes** — Hidden annual theme (Last Dance, Youth Movement, Revenge Tour) affecting all narratives
4. **Narrative Debt** — Unresolved storylines building pressure (traded fan favorite, blocked prospect)
5. **Press Memory** — Press answers in year 1 create callback questions in year 3
6. **City Modifiers & Ballpark DNA** — Team-specific hidden modifiers affecting gameplay
7. **Visual Aging** — Player card desaturation past age 32
8. **Persistent AGM** — Assistant GM pops up during trades, press conferences, losing streaks
9. **Seed Sharing** — Export game as shareable URL with deterministic seed
10. **WebRTC Peer Leagues** — Multiplayer without backend via deterministic sync
11. **The Living League** — AI GMs with relationship scores, trade memory, grudges (BUILT, not wired)

---

## Known Issues / Tech Debt

1. **Bundle budget tight**: worker gzip at 113KB vs 120KB budget (bumped from 110KB in PR #15)
2. **Pre-existing React DOM warning**: PlayerProfilePage test has cleanup error (not a test failure)
3. **7 worktrees accumulating**: living-league, assistant-gm, first-10-minutes, foundation-intelligence, dynasty-timeline-chapters, phase15-broadcast, phase16-war-room — should clean up completed ones
4. **MBD_MASTER_REFERENCE.md stale**: test count says 815, actual is 1,548
5. **.codex/MBD/plan.md outdated**: references obsolete task codes, should archive
6. **TUNING.md missing Living League**: needs relationship/negotiation tuning parameters once wired

---

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Web Worker for all sim | Never block main thread. UI stays responsive during 5,400-player sim |
| pure-rand (xoroshiro128plus) | Determinism is sacred. Same seed = same game. Enables replay, sharing, debugging |
| Zod schemas in contracts package | Single source of truth for types between sim-core and web |
| No emoji in UI | Professional Bloomberg Terminal aesthetic. lucide-react icons only |
| Lazy-load all pages | Initial bundle stays under 300KB budget |
| Comlink for worker bridge | Type-safe RPC without manual message passing |
| IndexedDB via Dexie | Client-side persistence without backend. 5 save slots |
| Feature-sliced architecture | Each feature owns its routes, components, and types |
| Onboarding as sim-core modules | Pure assessment functions consumed by ANY UI (wizard, sidebar, dashboard) |
| Living League as additive modules | Don't patch existing trade/FA engines. New modules provide adjustment functions |

---

## Next Priorities (Ranked)

1. **Onboarding Wizard UI** — The sim-core engine has 14 modules + 232 tests ready. Build the 8-chapter split-screen wizard with AGM character panel. This is the most important UX improvement.
2. **Living League UI Wiring** — Save schema migration, worker queries, trade negotiation UI with counter-offers, relationship tier icons in trade screen.
3. **Signature Moments + Nicknames** (Codex sprint) — Next sim-core sprint per Muse Spark's prioritization.
4. **Season Themes + Narrative Debt** (Codex sprint) — After moments/nicknames.
5. **Persistent AGM** — Extend Assistant GM beyond onboarding into main game.
6. **Deploy latest** — Current live build is from PR #12 era. 7 PRs of improvements not yet deployed.

---

## Verification Commands

```bash
export PATH="$HOME/.local/bin:$HOME/.local/node-lts/lib/node_modules/corepack/shims:$PATH"
cd mr-baseball-dynasty/packages/sim-core && npx vitest run     # 1,172 tests
cd ../../apps/web && npx vitest run                             # 376 tests
cd apps/web && npx tsc --noEmit                                 # type check
cd apps/web && npx vite build                                   # production build
grep -r 'Math.random' packages/sim-core/src/                    # determinism audit (expect empty)
export PATH="/opt/homebrew/bin:$PATH"                           # for gh CLI
```
