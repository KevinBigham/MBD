# MBD Repo Audit & True GOAT-Level Roadmap
**Date:** 2026-07-10 · **Audited snapshot:** `MBD-main-main.zip` (GitHub download, no `.git`) · **Auditor:** Claude (Fable)
**Purpose:** Prepare any future AI agent to work on Mr. Baseball Dynasty successfully — fast context, honest state, clear priorities, and a cleanup plan.

---

## 0. TL;DR for a New AI Agent

- **What this is:** A browser-based, GM-only baseball franchise dynasty sim. Deterministic, local-first, zero backend. Shipped v1.0.0 to GitHub Pages.
- **The one rule:** **Source and tests are truth. Docs are context only.** Several docs in this repo are stale (see §7). Verify before believing.
- **Worker is canonical.** All game mutations happen in the web worker; Zustand is a UI mirror. Never mutate game state from React.
- **Determinism is sacred.** No bare `Math.random()`. All randomness flows through seeded PRNG (`pure-rand` xoroshiro128plus). A determinism snapshot gate runs in CI.
- **Save schema is v34** (`packages/contracts/src/schemas/save.ts`). Any schema change requires: version bump + migration + fixture update + old-save proof + explicit Season-10 fixture reasoning. No exceptions.
- **Current mission (2026-07-02, `MISSION.md`):** two dispatches — **ECON-CLOCK-1** (goal 11: contracts actually tick/expire) and **DAY-ONE-ROSTERS-1** (goal 12: legal Day-1 rosters). These fix the two biggest lies in the game world.
- **Before writing any code:** read `AGENTS.md`, `GOAL.md`, `MISSION.md`, `docs/codex/CANONICAL_DIRECTION.md`, and the relevant goal file in `docs/codex/goals/`. Then read the source it names.

---

## 1. What the Game Is

**Mr. Baseball Dynasty (MBD)** — single-player franchise sim. Build a front office, run one of 32 fictional clubs, and steer a deterministic league history across decades: roster building, player development, payroll pressure, scouting, trades, drafts, free agency, playoffs, records, rivalries, and franchise memory.

- **Live:** https://kevinbigham.github.io/MBD/
- **Identity:** Bloomberg-terminal aesthetic — data-dense, monospace numbers, dark theme, lucide icons, no emoji, no mascot UI.
- **Explicitly not:** MLB-licensed, fantasy/betting, loot boxes, pay-to-win, or a twitch game. GM-only for v1 — no pitch-by-pitch manager mode.
- **Signature design bet:** KC BBQ Fountains ships as the deliberately overpowered flagship — the league bully every dynasty must dethrone (Kevin decision, 2026-07-02).

### Tech stack
TypeScript 5.7 strict · React 18 · Vite 6 · Tailwind · Zustand (UI mirror) · Dexie/IndexedDB (saves) · Comlink web workers (sim engine) · pure-rand (seeded PRNG) · Zod contracts · Vitest + fast-check · pnpm workspaces + Turborepo · GitHub Actions → GitHub Pages · Installable PWA.

### Monorepo layout
```
apps/web/                 React app — 30 feature modules, 33+ routes, workers/
packages/sim-core/        Pure deterministic engine (~287 TS files, 21 domains)
packages/contracts/       Zod schemas, save v34 + full migration chain
packages/ui/              Radix-based components
packages/design-tokens/   Bloomberg dark theme tokens
docs/                     Governance: codex goals, ADRs, guides, specs
```

### Engine architecture (the heart)
- `packages/sim-core/src/math/log5.ts` + `sim/plateAppearance.ts` — Log5-style batter/pitcher PA resolution → typed outcomes (BB/K/1B/2B/3B/HR/outs/DP/SF/HBP).
- `sim/markov.ts` — 24-state Markov baserunner FSM (3-bit base mask × outs), pure function.
- `sim/gameSimulator.ts`, `seasonSimulator.ts`, `playoffSimulator.ts`, `calendar.ts` — the season loop.
- `calibration/` — evidence-based balance harness (`playtest:calibrate`, `TUNING.md` documents the levers).
- Worker seam: `apps/web/src/workers/sim.worker.*.ts` — actions, queries, trade, narrative, helpers. **These files are huge (100–180KB each)** — a known refactor target, not a style choice to imitate.

### Scale (verified in this snapshot)
- ~1,517 files, ~20MB (no node_modules committed — clean).
- 5,408 authored players: 32 orgs × 169 across MLB/AAA/AA/A+/A/Rookie/International, plus 192 original affiliate identities. Authored content lives in a versioned worker content pack, not the core engine chunk.
- Test counts at last green gate: sim-core ~1,646 tests / 140 files; web ~1,546 tests / 438 files; plus contracts, UI, determinism snapshot, and an isolated smoke gate.
- Bundle discipline: PWA precache ~3.8MB, per-chunk budgets tracked (`apps/web/docs/BUDGETS.md`, `src/build/bundleBudget.test.ts`).

---

## 2. Project History (how we got here)

| Era | What happened |
|---|---|
| Early build → Apr 2026 | Full monorepo rebuild; "wire-everything sweep"; schema reached v17; `MASTER_CONTEXT.md` written (now stale). |
| Apr–May 2026 | UI/UX OOTP-style overhaul branch; tutorial-assistant program; mobile audits; feature modules mature to 30. |
| Jun 19–20, 2026 | **The Great Audit** — 10 audit documents produced (master report, GOAT gap, feature inventory, wiring, minors, scouting/draft, player dev, dynasty history, release, AI org). Verdict: real, deep, playable — YELLOW for release, RED for calling it "GOAT" until save-trust fixes were browser-validated and depth gaps scheduled. Same window: **Codex 5.5 Execution System** installed (layered `AGENTS.md`, skills, `docs/codex/` with goal files + governance). |
| Jun 2026 | Save-trust fixes landed (draft/app-shell/press autosave, readiness normalization, nudge/finance polish). Authored roster pack materialized. KC rating-scale fix + run-environment recalibration. v33→v34 archived-box-score migration. Release gate sweep: Chrome/Firefox/WebKit + PWA offline smoke all green. **v1.0.0 shipped** as first stable public milestone. **TRUST-A complete** — `activeSavePersistence.ts` autosave coordinator is now the persistence spine every new lane must use. |
| Jul 2, 2026 | Two same-day audits found "the two biggest lies" (see §4). `MISSION.md` written: ECON-CLOCK-1 + DAY-ONE-ROSTERS-1, parallel worktrees, serial merges, ECON-CLOCK lands first. |

### Governance system (how work gets done here)
Four-agent studio: **Kevin (Director/oracle owner) → Architect → Codex (Builder) → Claude (Reviewer/Auditor)**. Work flows as vertical slices via `/goal` dispatches:
- Goals live in `docs/codex/goals/` (01–12). Canonical order: TRUST-A → MEMORY-0 → PROSPECT-1 → ORG-DRAFT-1 → TRUST-QW → ORG-DEV-1 → ORG-TRADE-1 → ORG-MARKET-1 → MEMORY-ERAS-1 → OLDSAVE-MINORS-1, now joined by 11 (ECON-CLOCK-1) and 12 (DAY-ONE-ROSTERS-1).
- Every nontrivial slice maintains `docs/codex/runs/<SLICE_ID>/PLAN.md` + `SOURCE_TRUTH.md` + `COMPLETION.md` (see TRUST-A for the exemplar).
- `docs/codex/REVIEW_STANDARD.md` + `RELEASE_GATES.md` define done. `PLANS.md` defines the plan format. `.agents/skills/` holds implement/review skills.

---

## 3. Strengths (protect these)

1. **Determinism discipline** — seeded PRNG everywhere, snapshot gate in CI, zero bare `Math.random()` (grep-verified in prior audits). This is the game's superpower for debugging, calibration, and trust.
2. **Save migration rigor** — v34 with a full migration chain, explicit Season-10 fixture proof, "never fabricate old history" guardrail. Most indie sims never achieve this.
3. **Autosave spine (TRUST-A)** — one coordinator owns persistence; high-emotion actions (draft picks, press responses, trades) write durable snapshots.
4. **Test mass** — ~3,200+ tests including property-based (fast-check), integration smoke gate, calibration evidence harness, and route smoke.
5. **Authored world** — 5,408 stable players + 192 original affiliate identities, originality-reviewed, materialized through a versioned content seam so new games feel authored, and existing saves are never player-replaced.
6. **Governance that actually works** — goals/plans/review standards/release gates produce reviewable slices instead of drive-by commits. Rare and valuable.
7. **Feature breadth with a spine** — 30 feature modules covering the full GM year: onboarding → season → playoffs → offseason → history/records/rivalries/press.
8. **Platform discipline** — web/PWA canonical per ADR-0001; bundle budgets enforced; offline new-game creation verified.
9. **Balance-by-evidence culture** — `TUNING.md` + calibration JSON + multi-season playtest sampling instead of vibes.
10. **Honest self-knowledge** — the June audits graded features A→F and named fake levers out loud. That culture is why this project can reach GOAT.

---

## 4. Weaknesses & Known Defects (verify status in source before working)

### The Two Biggest Lies (current mission focus — `MISSION.md`, 2026-07-02)
1. **The economy is frozen.** No code path decrements `player.contract.years` — `advanceContracts` in `packages/sim-core/src/finance/contracts.ts` is tested dead code. Contracts never expire, FA runs on non-tender scraps, options are decorative, and season 12 plays exactly like season 2. → **Goal 11: ECON-CLOCK-1.**
2. **Day 1 is illegal.** Through the real New Game path: all 32 orgs generate a 28-man "26-man" and an 84-man "40-man" (64 high-severity violations from the engine's own invariant checker); affiliates are only 21–24% pitchers; all 4,512 minor leaguers sit on 0-year contracts. → **Goal 12: DAY-ONE-ROSTERS-1.** (Evidence regenerates with `MBD_ROSTER_AUDIT=1`.)

### GOAT-gap ranked findings (June 2026 audits — re-verify each; some have since moved)
3. Save-trust fixes needed browser reload validation (several landed in the June sweep — confirm in git history before re-doing).
4. **Player development agency is thin** — plans exist on the Minors focus board, but playing time, mentorship, and profile-level control are shallow. **Mentorship is read-only** (derived from roster, not persisted) — a fake lever.
5. **CPU organizations lack durable identity** — no persistent draft/dev/trade/FA personalities; CPU teams don't create history without you. (Goals 04/06/07/08 target this.)
6. Scouting/draft lack uncertainty-driven drama — draft AI scores BPA/need/signability but has no org identity, scout accuracy, or risk appetite.
7. Existing saves don't receive authored minors content (goal 10) — new games got the authored world; old dynasties didn't.
8. Dynasty history is strong forward, sparse backward — v34 archive starts empty for old saves by design; era summaries and legacy enrichment are missing (goal 09).
9. **Worker/UI boundary is porous** — ~56 non-worker web imports of `@mbd/sim-core` (should be DTO/contracts-only).
10. **Structural debt** — 19 circular dependencies (madge), 225 unused exports (knip), and mega worker files: `sim.worker.helpers.ts` 180KB, `sim.worker.queries.ts` 176KB, `sim.worker.trade.ts` 118KB, `sim.worker.actions.ts` 101KB, plus a 267KB worker test file and `contracts/save.ts` at 103KB.
11. **Prior physics-defect flags** (earlier audit rounds): baserunner-merge correctness in the Markov advance, walk-off/extra-innings termination paths, and whether the PA model is true odds-ratio Log5 vs a pseudo-Log5 approximation. Roadmap items 81–82 exist to verify-and-close these with regression tests; do not assume fixed or broken — check source.
12. **Doc drift** — see §7. `MASTER_CONTEXT.md` claims schema v17 (actual: v34). `STATUS.md` is an 805KB / 4,640-line append-only log that will torch any agent's context window if read whole.

---

## 5. Repo Hygiene Findings

### Clean already ✅
- No `node_modules/`, `dist/`, `.DS_Store`, empty files, or `.bak/.orig/.tmp` junk committed. `.gitignore` is sane (ignores `output/`, playtest MD except the sample, worktrees, logs).

### Verified-redundant files (0% chance needed — the delete list)
| Path | Size | Proof |
|---|---|---|
| `MBD_CODEX_5_5_EXECUTION_SYSTEM.zip` | 36KB | Its `repo_overlay/` is **already installed at root** (`AGENTS.md` diff-verified byte-identical; `docs/codex/` in-repo is **newer** — goals 11/12 exist only in the repo). Its top-level docs are duplicated at `docs/reference/MBD_CODEX_HANDOFF/` (README_FIRST diff-verified identical). **One caveat:** `copy_paste/*.txt` (5 tiny prompt files) exist *only inside the zip* and are referenced by `DISPATCH_BRIEF.md` — extract those 5 files to `docs/reference/MBD_CODEX_HANDOFF/copy_paste/` first, then the zip is 100% dead weight. A zip inside a git repo is redundant by definition. |
| `AUDIT_EXECUTION_RULES.md.rtf` | 1.2KB | TextEdit RTF artifact. Its content ("source/tests/runtime are truth; audit before implementing; never assume docs") is already codified in `AGENTS.md`, `docs/codex/REVIEW_STANDARD.md`, and the header of every June audit doc. Convert to `.md` in `docs/reference/` if you want belt-and-suspenders, then delete the `.rtf`. |
| `apps/web/docs/screenshots/sprint-2/` (9 PNGs) | ~0.9MB | QA evidence from a long-completed sprint. **Zero references** anywhere in the repo (grep-verified across all `.md/.ts/.tsx`). Git history preserves them forever anyway. |
| `apps/web/docs/screenshots/sprint-3/` (6 PNGs) | ~0.9MB | Same — orphaned, unreferenced. |
| `apps/web/docs/screenshots/sprint-3-5/` (11 PNGs) | ~1.0MB | Same — orphaned, unreferenced. |

**Total reclaimed: ~2.9MB and 27 files, zero information loss** (after the two one-minute preservation steps).
**Do NOT touch:** `apps/web/public/screenshots/` — those six JPGs are live, referenced by `README.md` and the launch-prep audit.

### Archive / restructure candidates (valuable history — Kevin's call, don't auto-delete)
| Path | Recommendation |
|---|---|
| `STATUS.md` (805KB, 4,640 lines) | **Rotate.** Keep the newest ~2 entries at top of `STATUS.md`; move the rest to `docs/archive/STATUS_2026H1.md`. This file is a context-window bomb for every agent that opens it. |
| `MASTER_CONTEXT.md` | **Stale (Apr 10; says schema v17).** Either refresh against current source or move to `docs/archive/` with a STALE banner. Superseded by `MBD_PROJECT_MAP.md` + `MBD_MASTER_AUDIT_REPORT.md`. |
| 9 root `MBD_*_AUDIT*.md` files + `MBD_PROJECT_MAP.md`, `MBD_FEATURE_INVENTORY.md`, `MBD_GOAT_GAP_ANALYSIS.md` | **Move to `docs/audits/2026-06/`.** Keep them — they're the best onboarding material in the repo — but root should hold ≤10 living documents. |
| `MBD_LEGENDARY_FINISH_GOAL_4K.txt` | Completed one-shot dispatch prompt. Move to `docs/archive/dispatches/`. |
| `MBD_Minor_League_Deliverables/` (880KB: xlsx/csv/docx + division packets) | **Keep** — Kevin-approved content source-of-truth, referenced by the originality review and minors audit. Consider moving to `docs/content-source/` for tidiness. |
| `docs/reference/MBD_CODEX_HANDOFF/` | Keep (tiny; `DISPATCH_BRIEF.md` designates it the research-only archive). Becomes home for the rescued `copy_paste/` prompts. |

### Recommended root after cleanup (living docs only)
`README.md · AGENTS.md · GOAL.md · MISSION.md · PLANS.md · STATUS.md (rotated) · CHANGELOG.md · DESIGN.md · TUNING.md` + config files. Everything else lives under `docs/`.

---

## 6. Working Agreements for Future AI Agents (the success checklist)

Before your first edit:
- [ ] Read `AGENTS.md` (root + `apps/web/AGENTS.md`), `GOAL.md`, `MISSION.md`, `docs/codex/CANONICAL_DIRECTION.md`.
- [ ] Read the specific goal file in `docs/codex/goals/` and any existing `docs/codex/runs/<SLICE>/` artifacts.
- [ ] Confirm current save schema version in `packages/contracts/src/schemas/save.ts` (v34 as of this audit) — never trust a doc's number.
- [ ] Run the gates locally: `pnpm verify` (typecheck+test+build), `pnpm run verify:determinism`, and the sim-core smoke gate.

While working — the non-negotiables (from `CANONICAL_DIRECTION.md`, verbatim spirit):
- [ ] Source and tests outrank council documents.
- [ ] Worker is canonical; Zustand is a UI mirror. No mutation without explicit persistence ownership; no "Saved" before durable write completion.
- [ ] Determinism stays seeded and testable; no bare `Math.random()`.
- [ ] No hidden CPU advantage — AI difficulty improves decisions, never cheats.
- [ ] No schema change without complete migration proof (bump + migration + fixtures + old-save + Season-10 reasoning).
- [ ] No fabricated old-save history — ever.
- [ ] Extend existing routes before adding routes; refactor only along the active slice boundary; no new dependency without a 2-sentence proof.
- [ ] KC BBQ Fountains stays the league bully at full authored strength; `applyKCOverrides` runs AFTER the content-pack overlay.
- [ ] Update `STATUS.md` and `CHANGELOG.md` with your slice; maintain the run's `PLAN.md`/`COMPLETION.md`.

Merge discipline (current, from `MISSION.md`):
- [ ] ECON-CLOCK-1 merges before DAY-ONE-ROSTERS-1; the second re-runs `playtest:calibrate` and re-baselines determinism ON TOP of the first. Never re-baseline concurrently.

---

## 7. Document Canon Map (what to trust)

| Status | Files |
|---|---|
| **CANONICAL — read first** | `AGENTS.md`, `GOAL.md`, `MISSION.md` (2026-07-02, newest strategic doc), `docs/codex/CANONICAL_DIRECTION.md`, `docs/codex/goals/*`, `packages/contracts/src/schemas/save.ts`, `TUNING.md` |
| **ACTIVE — living references** | `README.md`, `CHANGELOG.md`, `DESIGN.md`, `PLANS.md`, `docs/codex/{PROGRAM,REVIEW_STANDARD,RELEASE_GATES,DISPATCH_BRIEF}.md`, `apps/web/docs/BUDGETS.md` |
| **HIGH-VALUE HISTORY — trust with verification** | June 2026 audit set (`MBD_MASTER_AUDIT_REPORT.md`, `MBD_GOAT_GAP_ANALYSIS.md`, `MBD_FEATURE_INVENTORY.md`, `MBD_PROJECT_MAP.md`, domain audits), `docs/MBD_COMPLETE_AUDIT_2026-06-19.md`, TRUST-A run docs |
| **STALE — do not trust numbers** | `MASTER_CONTEXT.md` (schema v17 claim; actual v34), older test counts in any doc, `~/Downloads/...` absolute paths in older docs |
| **LOG — never read whole** | `STATUS.md` (805KB; read only the top entry) |

---

## 8. TRUE GOAT-LEVEL ROADMAP — 100 Improvements Before Release

Ordered in ten tiers. Tiers 1–3 are release-gating; 4–7 are the GOAT differentiators; 8–10 are polish and durability. Items marked ⭐ map to existing goal files.

### Tier 1 — Save Trust & Reliability (1–8)
1. CI-run Playwright reload-smoke journey: mutate (draft pick, trade, press response, plan apply) → hard reload → assert state survived.
2. Global "Last saved 7:42:03 PM · 0 pending writes" indicator in the app shell (open item in `DESIGN.md`).
3. Autosave failure surfacing: toast + auto-retry + export-fallback when IndexedDB writes fail (quota, private browsing).
4. Save integrity checksum on write, verified on load, with a guided self-repair path.
5. Multi-tab guard: detect a second tab on the same slot; lock or go read-only instead of silently racing.
6. Export/import round-trip test in CI across every supported schema version.
7. Storage-pressure UX: show save size, warn near quota, offer archive pruning.
8. Write-ahead intent journal so an interrupted sim day resumes or rolls back cleanly — never a half-applied day.

### Tier 2 — The Living Economy (9–18)
9. ⭐ Land **ECON-CLOCK-1** (goal 11): contracts tick annually, expire, and feed a real free-agent market.
10. Symmetric option-year resolution — club/player/vesting options resolved identically for user and CPU.
11. Arbitration: service-time-driven salary escalation with file/exchange/hearing drama beats.
12. Qualifying offers + draft-pick compensation loop.
13. Extension AI: CPU orgs proactively lock up their own stars according to org identity.
14. Owner-archetype payroll pressure: floors, soft ceilings, and a luxury-tax-like line with narrative consequences.
15. Market-size revenue model (attendance, playoff bumps) feeding budgets so winning compounds.
16. Explainable FA decision model: age curve, role promise, contender status, loyalty — reasons surfaced in press.
17. Salary retention and cash considerations in trades.
18. 30-season multi-seed economy soak in CI: FA class sizes, payroll spreads, and contract-length distributions must stay in bands.

### Tier 3 — Day One Legality & World Generation (19–26)
19. ⭐ Land **DAY-ONE-ROSTERS-1** (goal 12): legal 26-man and 40-man for all 32 orgs, zero invariant violations at new-game.
20. Affiliate position balance enforced by level templates (no 22%-pitcher farm clubs).
21. Minors contract legality: kill all 0-year deals; journeymen on 1-year MiLB deals that legally reach `shouldEnterFreeAgency`.
22. Permanent zero-violation generation gate — `MBD_ROSTER_AUDIT` becomes a CI test, not an env flag.
23. Seeded hidden gems: every org's farm ships with deterministic late-round/IFA upside so every save has hope.
24. Org depth-chart optimizer at generation — no franchise starts with three AAA catchers and zero at AA.
25. Rule-5 exposure sanity at generation — no obvious unprotected stars on Day 1.
26. New-game world summary: a league-wide talent map so Day 1 feels authored, not rolled.

### Tier 4 — Player Development & Minors (27–38)
27. Persist mentorship assignments with real (bounded) effects — or relabel the board analysis-only. **Kill the fake lever.**
28. Playing-time promises: assign role targets per prospect; development responds to usage.
29. Profile-level development-plan editing (today it lives only on the Minors focus board).
30. Save-backed development event stream: breakouts, plateaus, setbacks, position changes as narrative beats.
31. Injury depth: severity tiers, rehab assignments, re-injury risk, career-altering arcs.
32. Coaching staff quality actually modifies development curves — wire staff → dev pipeline.
33. Pitcher workload management: innings limits, fatigue, shutdown decisions with tradeoffs.
34. ⭐ Old-save authored-minors upgrade (goal 10): affiliate flavor + fill for existing dynasties, never replacement players.
35. Level-appropriate stat environments (Rookie ball ≠ AAA run environment).
36. Prospect readiness with visible reasoning ("His K% at AA says not yet").
37. Winter ball / offseason programs as player-directed development choices.
38. Farm-system rankings with year-over-year movement and press coverage.

### Tier 5 — Scouting & Draft (39–48)
39. Scouting fog: error bars scale with scout quality, look count, and level distance; reports converge with investment.
40. Scout personalities — tool hounds vs. stat guys vs. makeup guys produce genuinely different boards.
41. Regional/pipeline coverage budgeting: where you spend changes what you can see.
42. ⭐ Draft AI org identity (goal 04): risk appetite, demographic preferences, signability strategy per franchise.
43. Draft-day pick trades with AI valuation.
44. Signability chess: bonus pools, over-slot gambits, unsigned-pick compensation.
45. Draft-class quality variance by year, with pre-draft press narratives.
46. Make international FA a playable loop: signing periods, package deals, teenage risk profiles.
47. Mock drafts and a rumor mill that is sometimes wrong — accuracy tied to scouting quality.
48. Retroactive draft grades at +3/+5 years that auto-generate steal/bust stories into dynasty memory.

### Tier 6 — CPU Org Identity & Fair AI (49–58)
49. ⭐ Durable org-identity layer (goals 06/07/08): persistent draft/dev/trade/FA tendencies per franchise across decades.
50. Named CPU GMs with tenures, reputations, hirings, and firings.
51. CPU owner archetypes driving budget and patience.
52. Visible rebuild/contend state machine — CPU teams commit to multi-year strategies you can read and exploit.
53. Deadline buyers/sellers with public postures that mostly match behavior (and occasionally bluff).
54. CPU-CPU trade fairness soak: multi-seed evidence that value doesn't drift league-wide.
55. Difficulty via decision quality only — deeper search, better discipline — never hidden boosts (locked direction).
56. "Front Office DNA" page per franchise so players can scout their rivals' brains.
57. Rivalry-aware AI: rivals pay a bounded, explainable premium to block you.
58. Era meta-shifts: league strategy trends (velocity era, contact era) emerging from the identity population.

### Tier 7 — Dynasty Memory & History (59–68)
59. ⭐ Era engine (goal 09): derive named franchise/league eras from the event spine.
60. ⭐ Prospect-to-legend continuity (goal 03): draft-day story links forward automatically to retirement retrospective.
61. Hall of Fame: ballots, debates, induction ceremonies, career-evidence pages.
62. Retired numbers, franchise Mount Rushmore, and statues as earned memory artifacts.
63. Record chases tracked live with press countdown beats at −10, −3, −1.
64. Honest old-save memory enrichment: era summaries for pre-archive seasons — never fabricated details (hard guardrail).
65. Career retrospectives for every retired player, not just stars.
66. Head-to-head franchise history pages: playoff meetings, iconic archived games.
67. "This day in dynasty history" dashboard widget fed by the event spine.
68. Dynasty chronicle export: a shareable HTML/PDF of a save's full history.

### Tier 8 — Presentation & UX (69–80)
69. Box-score-to-story pipeline polish: archived games earn recap prose worthy of the moment.
70. Ballpark identity: park factors, venue names, quirks that matter to sim and story.
71. Original scalable logo/color system for 32 clubs + 192 affiliates without an asset bottleneck.
72. Award reveals as ceremony moments (MVP/Cy Young/ROY), not just list rows.
73. Playoff presentation: series hubs, momentum framing, clinch/elimination drama.
74. Optional terminal-appropriate audio cues for milestones (off by default).
75. Onboarding materiality pass: fewer, weightier Day One decisions (June audit finding).
76. Density modes (compact/comfortable) + column customization on data tables.
77. Bloomberg-style keyboard command palette for power users.
78. Mobile one-thumb sim loop polish: bottom controls, tables readable at 375px.
79. Accessibility pass: contrast, focus order, screen-reader labels on dense tables.
80. Finish the tutorial-assistant program (docs/tutorial-assistant/) — skippable, never pointer-blocking.

### Tier 9 — Sim Engine Fidelity & Balance (81–90)
81. Verify-and-close the prior physics flags with regression tests: baserunner-merge correctness in the Markov advance and walk-off/extra-innings termination paths.
82. True-Log5 review: document or upgrade the PA model to a defensible odds-ratio form; recalibrate with evidence.
83. Batted-ball layer: GB/FB/LD profiles interacting with defense and park, beyond outcome buckets.
84. Defense value model: range/arm/positioning visibly converting or allowing hits.
85. Baserunning decisions: steals, extra bases, aggressiveness from attributes + coaching.
86. Leverage- and fatigue-aware bullpen AI.
87. Platoon splits and handedness strategy in lineups and pen matchups.
88. Deterministic, seeded weather/park run-environment variance.
89. Aging-curve realism audit: 30-year multi-seed population studies vs. target bands.
90. Per-release statistical sanity audit: leaderboards vs. plausible BABIP/K%/HR-FB distributions.

### Tier 10 — Engineering Health & Release (91–100)
91. Split the mega-workers (`sim.worker.helpers/queries/trade/actions`, 100–180KB each) into domain modules, tests preserved.
92. Eliminate the 19 circular dependencies; add a no-new-cycles CI gate (madge).
93. Burn the 225 unused exports; promote knip into `verify` as a hard gate.
94. DTO boundary: remove the ~56 direct `@mbd/sim-core` imports from web — UI consumes contracts only.
95. `STATUS.md` rotation policy: cap the active log, archive by half-year, add an index (this audit's §5 plan).
96. Doc canon pass: banner every root/docs file CANONICAL/ACTIVE/ARCHIVE; fix or archive `MASTER_CONTEXT.md`'s v17 drift.
97. Execute the repo slim: safe-delete list + move June audits to `docs/audits/2026-06/` + content sources to `docs/content-source/`.
98. Long-save performance budgets: sim-day latency, memory, and save-size thresholds for 30-season dynasties, enforced in CI.
99. Privacy-safe, opt-in diagnostic export bundle so bug reports carry evidence.
100. v1.x release train: tag cadence, release notes generated from `CHANGELOG.md`, and revisit the desktop/Steam wrapper ADR only after web stability holds.

---

## Appendix A — Safe-Delete Execution Prompt (for Claude Cowork)

> The verified, zero-information-loss cleanup. Preservation steps run first; deletes are recoverable from git history regardless.

```
You are working in the MBD repo (Mr. Baseball Dynasty) at the repo root.
Perform ONLY the following repo hygiene operations. Do not touch any other
files. Do not refactor code. Make one commit at the end.

STEP 1 — PRESERVE (before any deletion):
1a. Extract ONLY the copy_paste folder from the nested zip into the
    reference archive:
    unzip -o MBD_CODEX_5_5_EXECUTION_SYSTEM.zip \
      "MBD_CODEX_5_5_EXECUTION_SYSTEM/copy_paste/*" -d /tmp/mbdzip
    mkdir -p docs/reference/MBD_CODEX_HANDOFF/copy_paste
    cp /tmp/mbdzip/MBD_CODEX_5_5_EXECUTION_SYSTEM/copy_paste/*.txt \
      docs/reference/MBD_CODEX_HANDOFF/copy_paste/
    Verify all 5 .txt files exist at the destination.
1b. Convert the RTF audit rules to markdown for the archive:
    textutil -convert txt AUDIT_EXECUTION_RULES.md.rtf -output /tmp/aer.txt
    (if textutil is unavailable, strip RTF manually)
    Save the plain text as docs/reference/AUDIT_EXECUTION_RULES.md
    Verify the file is readable markdown/plain text.

STEP 2 — DELETE (verified 0% needed; every byte either duplicated in-repo,
superseded by newer in-repo versions, or unreferenced QA evidence):
    git rm MBD_CODEX_5_5_EXECUTION_SYSTEM.zip
    git rm AUDIT_EXECUTION_RULES.md.rtf
    git rm -r apps/web/docs/screenshots/sprint-2
    git rm -r apps/web/docs/screenshots/sprint-3
    git rm -r "apps/web/docs/screenshots/sprint-3-5"

STEP 3 — VERIFY (all must pass before committing):
3a. grep -rn "sprint-2\|sprint-3" --include="*.md" --include="*.ts" \
      --include="*.tsx" . | grep -v node_modules
    Expected: no results referencing the deleted folders.
3b. grep -rn "EXECUTION_SYSTEM.zip\|AUDIT_EXECUTION_RULES.md.rtf" \
      --include="*.md" . | grep -v node_modules
    Expected: mentions may exist in historical audit docs (fine);
    no code or build config may reference them.
3c. ls docs/reference/MBD_CODEX_HANDOFF/copy_paste/ shows 5 .txt files.
3d. Do NOT delete anything under apps/web/public/screenshots/ — those
    six JPGs are live and referenced by README.md.
3e. Run: npx pnpm verify   (typecheck + test + build must stay green —
    these deletions touch zero source, so any failure means STOP and report.)

STEP 4 — COMMIT:
    git add docs/reference/
    git commit -m "chore: repo slim — remove redundant zip, rtf artifact, and orphaned sprint QA screenshots (contents preserved in docs/reference; ~2.9MB reclaimed)"

STOP CONDITIONS: If any verification in Step 3 fails, or any deleted path
is referenced by code/build config, stop and report instead of committing.
```

## Appendix B — Suggested Follow-Up Restructure (Kevin approves before running)
Not deletions — moves. Run as a second, separate commit if approved:
- `git mv` the June audit set → `docs/audits/2026-06/`
- Rotate `STATUS.md` → keep top 2 entries; rest to `docs/archive/STATUS_2026H1.md`
- `MASTER_CONTEXT.md` → `docs/archive/` with a STALE banner (or refresh it)
- `MBD_LEGENDARY_FINISH_GOAL_4K.txt` → `docs/archive/dispatches/`
- `MBD_Minor_League_Deliverables/` → `docs/content-source/minor-league/`

---

*End of audit. Source and tests are truth. Go make season 12 different from season 2. LFG.*
