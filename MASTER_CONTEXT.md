# MASTER_CONTEXT.md — Complete Project State for Session Handoff

> Generated: 2026-04-09 | Main: `23ceca1` | 22 PRs + 3 direct merges | 1,294 sim-core tests | Schema v15 | LIVE

---

## Project Overview

**Mr. Baseball Dynasty (MBD)** is a browser-based baseball franchise dynasty simulator. You manage one of 32 fictional teams across decades of roster management, trades, drafts, player development, scouting, financial planning, and playoff races. Zero backend — all simulation runs client-side in a Web Worker. Deterministic seeded PRNG ensures identical outcomes from identical inputs.

**Live:** https://kevinbigham.github.io/MBD/
**Repo:** github.com/KevinBigham/MBD (private)
**Creator:** Kevin Bigham (director, reads code, doesn't write it)
**Aesthetic:** Bloomberg Terminal dark theme — data-dense, monospace numbers, no emoji, lucide-react icons only

---

## Architecture Map

```
mr-baseball-dynasty/                    # pnpm + Turbo monorepo
├── apps/web/                           # React 18 + Vite 6 frontend
│   ├── src/app/                        # Shell, routes (33), layout, providers
│   ├── src/features/                   # 27 feature modules (lazy-loaded)
│   │   ├── achievements/               # Awards, ceremony modal
│   │   ├── dashboard/                  # 10 cards, game advisor, broadcast
│   │   ├── draft/                      # Draft room
│   │   ├── finance/                    # Financial overview
│   │   ├── free-agency/                # FA market + market intel
│   │   ├── front-office/               # Owner intel
│   │   ├── gm-career/                  # GM career tracking
│   │   ├── history/                    # Dynasty timeline, season archive
│   │   ├── league/                     # Standings, leaders
│   │   ├── minors/                     # Farm system, prospect pipeline
│   │   ├── offseason/                  # Offseason phases
│   │   ├── onboarding/                 # 8-chapter wizard with AGM mentor [NEW]
│   │   ├── players/                    # Profiles, comparison, breakout intel
│   │   ├── playoffs/                   # Bracket, momentum panel
│   │   ├── press-room/                 # Press conferences
│   │   ├── pulse/                      # Monthly pulse report
│   │   ├── records/                    # Record watch
│   │   ├── rivalries/                  # Rivalry tracking
│   │   ├── roster/                     # Depth chart, lineup builder
│   │   ├── scenarios/                  # 10 challenge scenarios
│   │   ├── schedule/                   # Game schedule, box scores, enhanced PBP
│   │   ├── scouting/                   # Scouting staff, IFA, conflicts
│   │   ├── settings/                   # User preferences
│   │   ├── setup/                      # Save hub, new dynasty wizard
│   │   ├── staff/                      # Coaching staff, radar chart
│   │   ├── stats/                      # Stats encyclopedia
│   │   └── trade/                      # Trade room, deadline drama
│   ├── src/shared/                     # 7 hooks, 24 components, 9 lib files
│   └── src/workers/                    # 25 worker modules + 6 test files
├── packages/sim-core/                  # Pure TS simulation engine
│   └── src/                            # 116 source files across 20 directories
│       ├── math/                       # PRNG (pure-rand), Log5 probability
│       ├── player/                     # Generation, attributes, aging, coaching, mentorship
│       ├── sim/                        # PA resolution, Markov baserunning, game/season/playoff sim
│       ├── league/                     # Teams, standings, awards, relationships, achievements
│       ├── draft/                      # Draft class, AI picks, scouting, signing
│       ├── roster/                     # Roster ops, free agency, minor leagues, offseason
│       ├── trade/                      # Valuation, AI offers, negotiation, deadline drama
│       ├── finance/                    # Contracts, market intelligence, arbitration
│       ├── narrative/                  # News, PBP, press conferences, ticker, story arcs
│       ├── scouting/                   # Scout staff, IFA, scout learning, conflicts
│       ├── onboarding/                 # 8-chapter flow engine, AGM mentor, assessments
│       ├── moments/                    # Signature moments + earned nicknames [NEW]
│       ├── stats/                      # Advanced stats, milestones, projections
│       ├── career/                     # GM career, job market
│       ├── scenarios/                  # 10 scenarios with objectives
│       ├── sharing/                    # Dynasty cards, leaderboard scoring
│       ├── timeline/                   # Timeline comparison
│       ├── performance/                # Archive, prune, snapshot sizing
│       └── invariants/                 # Data consistency checker
├── packages/contracts/                 # Zod schemas, save v15
├── packages/ui/                        # 13 Radix-based components
├── packages/design-tokens/             # Bloomberg dark theme tokens
├── packages/sim-worker/                # Comlink bridge
└── packages/test-utils/                # Shared test fixtures
```

---

## Dependency Graph

```
@mbd/web
├── @mbd/contracts
├── @mbd/design-tokens
├── @mbd/sim-core → @mbd/contracts
├── @mbd/sim-worker → @mbd/contracts, @mbd/sim-core
└── @mbd/ui → @mbd/design-tokens
```

---

## Tech Stack

- TypeScript 5.7 strict, React 18, Vite 6, Tailwind CSS 3.4
- Zustand 5 (UI state), Dexie (IndexedDB), Zod (schema validation)
- Web Workers + Comlink, pure-rand xoroshiro128plus (deterministic PRNG)
- Recharts 3.8 (charts), Radix UI + lucide-react (components)
- Vitest + fast-check (testing), pnpm + Turborepo (monorepo)
- GitHub Actions → GitHub Pages (deploy)

---

## Systems Inventory

### Simulation Engine (sim-core) — 116 files, 1,294 tests

| System | Key Files | Status |
|--------|-----------|--------|
| **Plate Appearance** | `sim/plateAppearance.ts` — Log5 with attribute-to-rate conversion | ✅ Active |
| **Baserunning** | `sim/markov.ts` — Markov chain state machine | ✅ Active |
| **Game Sim** | `sim/gameSimulator.ts` — Full 9-inning with extras, bullpen, stats | ✅ Active |
| **Season Sim** | `sim/seasonSimulator.ts` — Day/week/month with schedule integration | ✅ Active, bug-fixed |
| **Playoff Sim** | `sim/playoffSimulator.ts` — Bracket with momentum system | ✅ Active, bug-fixed |
| **Player Generation** | `player/generation.ts` — ~5,400 players with OU aging curves | ✅ Active |
| **Development** | `player/development.ts` — Age-based progression/regression | ✅ Active |
| **Draft** | `draft/draftAI.ts` — 32-team AI with need-based evaluation | ✅ Active, bug-fixed |
| **Free Agency** | `roster/freeAgency.ts` — Multi-day market with AI bidding | ✅ Active, bug-fixed |
| **Trade** | `trade/tradeAI.ts` + `tradeNegotiation.ts` — AI offers + multi-round negotiation | ✅ Active |
| **GM Relationships** | `league/gmRelationships.ts` — Persistent scores, trade memory, grudges | ✅ Built, NOT WIRED |
| **Relationship Effects** | `league/relationshipEffects.ts` — FA/waiver/trade adjustments | ✅ Built, NOT WIRED |
| **League Events** | `narrative/leagueEvents.ts` — Monthly events with ripple effects | ✅ Built, NOT WIRED |
| **Signature Moments** | `moments/momentDetector.ts` — 12 types, FIFO 8/player, trait effects | ✅ Built, NOT WIRED |
| **Earned Nicknames** | `moments/nicknames.ts` — 20 triggers, priority-ordered | ✅ Built, NOT WIRED |
| **Onboarding Engine** | `onboarding/*.ts` — 16 modules, 8-chapter flow, AGM mentor | ✅ Built, UI SHIPPED |
| **Narrative** | `narrative/*.ts` — 13 modules for news, PBP, press, ticker, arcs | ✅ Active |
| **Scouting** | `scouting/*.ts` — Scout learning, IFA, conflicts | ✅ Active |

### Web App — 27 feature modules, 33 routes

| System | Status |
|--------|--------|
| **Dashboard** | ✅ Active — 10 cards, broadcast, game advisor |
| **Onboarding Wizard** | ✅ NEW — 17 files, split-screen 8-chapter flow |
| **Draft Room** | ✅ Active — AI picks, scouting, big board |
| **Trade Room** | ✅ Active — Proposals, deadline drama, asset inventory |
| **Free Agency** | ✅ Active — Market intel, bidding |
| **Roster Management** | ✅ Active — Depth chart, DnD lineup builder |
| **Minor Leagues** | ✅ Active — Pipeline, mentorship, prospect tracker |
| **Player Profiles** | ✅ Active — 10 tabs, breakout intel, scout consensus |
| **Press Room** | ✅ Active — Interactive conferences |
| **Playoff Bracket** | ✅ Active — Momentum panel |
| **History** | ✅ Active — Dynasty timeline, season archive |
| **All Other Routes** | ✅ Active |

### Persistence

| System | Status |
|--------|--------|
| **Save Schema** | v15 with migration chain (Zod validated) |
| **IndexedDB** | Dexie wrapper with slot-based saves |
| **Snapshot Export** | Worker-side snapshot → Dexie |
| **What-If Branches** | Up to 3 parallel timeline branches |

---

## Shipped Features (Current Build)

1. Full 162-game season sim with Log5 PA + Markov baserunning
2. 32 fictional teams, 6 divisions, market sizes, owner archetypes
3. ~5,400 generated players with attributes, personalities, OU aging
4. Draft system (300+ prospect classes, AI picks, signing)
5. Trade system with 5 AI GM personalities, deadline drama, multi-team trades
6. Free agency market with bidding, qualifying offers
7. Minor league system (6 levels, prospect bonds, development pipeline)
8. Coaching staff management (12 roles, chemistry system, mentorship)
9. Financial system (contracts, arbitration, extensions, luxury tax)
10. Scouting with fog-of-war, IFA pool, scout conflicts, Bayesian learning
11. Narrative engine (17 news categories, press conferences, story arcs, 55+ PBP templates)
12. Hall of Fame, records, 48+ achievements, 10 challenge scenarios
13. Player comparison, similarity, projections, breakout intelligence
14. Scout consensus panel, prospect breakout tracker, playoff momentum
15. Award ceremony modal, enhanced play-by-play
16. Bloomberg Terminal dark UI, command palette, keyboard shortcuts, PWA
17. Save/load with migration chain, what-if branches
18. **Onboarding Wizard** — 8-chapter split-screen with AGM mentor [NEW]

---

## In-Progress / Unshipped Work

| Feature | Location | Status | Next Step |
|---------|----------|--------|-----------|
| **Living League** | `league/gmRelationships.ts`, `trade/tradeNegotiation.ts`, `narrative/leagueEvents.ts` | sim-core done (161 tests) | Wire to save schema v16, build UI |
| **Signature Moments** | `moments/momentDetector.ts` | sim-core done (96 tests) | Wire to game loop post-game scan |
| **Earned Nicknames** | `moments/nicknames.ts` | sim-core done | Wire to end-of-season evaluation |
| **Onboarding Wizard** | `features/onboarding/` | UI shipped, needs testing | End-to-end smoke test |
| **Season Themes** | Muse Spark specs in REFERENCE/ | Design complete, no code | Codex sim-core sprint |
| **Narrative Debt** | Muse Spark specs | Design complete, no code | Codex sim-core sprint |
| **Broadcast Voice** | Muse Spark specs | Tone + 10 phrases defined | Template integration |
| **Franchise Lore** | Muse Spark specs | 3 profiles (KC, Portland, Austin) | More profiles + UI surface |

---

## Ideas Bank

From Muse Spark creative specs and session discussions:
- Persistent AGM beyond onboarding (pops up during trades, press, losing streaks)
- City modifiers and ballpark DNA (KC = fan loyalty +30%, Austin = power dev +12%)
- Press memory system (answers in year 1 create callback questions in year 3)
- Visual player aging (card desaturation past age 32, milestone badges)
- Seed sharing via URL (mbd://dynasty?seed=abc123&team=KC)
- Dynasty card PNG export with QR code
- WebRTC peer leagues (multiplayer via deterministic sync)
- Weekly challenge seeds (community competition)
- Team logo visual assets
- Mobile responsive on remaining pages
- Stadium and revenue management
- Online leagues (multiplayer dynasty mode)
- Historical rosters mode
- AI-generated commentary with TTS
- 25 easter eggs defined by Muse Spark (from The 42 HR Club to Terminal Command)
- 8 player narrative archetypes (Journeyman, Prodigy, Heel, Captain, Ghost, Comeback Kid, Mercenary, Hometown Hero)

---

## Design Decisions Log

| Decision | Rationale |
|----------|-----------|
| Web Worker for ALL sim logic | Never block main thread. 5,400 players + PA calculations would freeze UI. |
| Deterministic seeded PRNG (pure-rand xoroshiro128plus) | Same seed = same game. Enables replay, seed sharing, competitive challenges. |
| Zod schemas in shared contracts package | Single source of truth for types. Runtime validation for save integrity. |
| No emoji in game UI | Bloomberg Terminal aesthetic. Professional, data-dense feel. |
| Onboarding as pure sim-core modules | Assessment functions consumed by any UI surface — wizard, sidebar, dashboard. |
| Living League as additive modules | New modules provide adjustment functions. Existing engines unchanged. |
| Feature-sliced React architecture | Each feature owns routes, components, types. Prevents circular deps. |
| Multi-agent team model | ChatGPT architect, Codex builder, Claude reviewer/ops, Muse Spark designer. |
| Bug audit before feature stacking | 25 determinism bugs caught before building Season Themes on top. |

---

## Known Issues / Tech Debt

1. **Live deploy behind main** — Latest merges not yet deployed to GitHub Pages
2. **9 stale worktrees** — assistant-gm, dynasty-timeline-chapters, first-10-minutes, foundation-intelligence, living-league, phase15-broadcast, phase16-war-room, signature-moments-nicknames, sim-core-bug-audit
3. **24+ merged branches** — Local branches from completed features still exist
4. **Direct sim-core imports in web UI** — Some feature pages import from @mbd/sim-core directly instead of through worker (documented in audit, not yet fixed)
5. **MASTER_REFERENCE.md stale** — Test count says 815, actual is 1,294
6. **MBD_PROJECT_BIBLE.md** — Test count needs update
7. **.codex/MBD/plan.md** — Stale, references obsolete task codes
8. **.codex/MBD/open_questions.md** — Stale, all resolved
9. **.codex/MBD/decisions.md** — Stale, superseded
10. **Bundle budget tight** — Worker gzip at 113KB vs 120KB budget
11. **Onboarding wizard untested end-to-end** — Builds but needs smoke test
12. **Muse Spark creative output not yet saved to REFERENCE/** — Season themes, narrative debt, franchise lore, archetypes, easter eggs from latest session exist only in chat

---

## Cleanup Candidates — Needs Kevin's Review

### Stale Worktrees (safe to remove — all merged)
- `.worktrees/assistant-gm` — PR #18 merged
- `.worktrees/first-10-minutes` — PR #17 merged
- `.worktrees/foundation-intelligence` — PR #14 merged
- `.worktrees/living-league` — PR #19 merged
- `.worktrees/phase15-broadcast` — All 6 slices merged
- `.worktrees/phase16-war-room` — Merged in phase 16
- `.worktrees/dynasty-timeline-chapters` — Merged
- `.worktrees/signature-moments-nicknames` — Merged this session
- `.worktrees/sim-core-bug-audit` — Merged this session

### Stale Local Branches (all merged to main)
All `codex/phase*`, `feature/*`, `fix/*` branches that correspond to merged PRs.

### Stale .codex Files
- `.codex/MBD/plan.md` — Can be cleared and repurposed
- `.codex/MBD/open_questions.md` — All questions resolved
- `.codex/MBD/decisions.md` — Superseded by design decisions in MASTER_CONTEXT

---

## Next Priorities (Ranked)

1. **Save Muse Spark output** — Season themes, narrative debt, broadcast voice, franchise lore, archetypes, easter eggs → `REFERENCE/MUSE_SPARK_SESSION_2.md`
2. **Build Season Themes + Narrative Debt** (sim-core) — Muse Spark provided full specs
3. **Wire Signature Moments into game loop** — Post-game scan + save schema v16
4. **Wire Living League to UI** — GM relationship tiers, trade negotiation rounds
5. **Deploy latest to GitHub Pages** — 7+ commits not yet live
6. **Clean up worktrees and branches** — 9 worktrees, 24+ branches
7. **Smoke test Onboarding Wizard** — End-to-end in browser
8. **Update stale docs** — MBD_MASTER_REFERENCE.md, MBD_PROJECT_BIBLE.md test counts
