# DAY-ONE-ROSTERS-1 — Day 1 Roster Excellence

## Objective

Make every new league start Day 1 legal, balanced, and alive: exactly 26 on each MLB active roster, a curated 40-man of exactly the 40 players who belong there, every affiliate at every level fielding a real pitching staff and a real lineup, minor leaguers with genuine organizational roles instead of dead weight, veteran minor-league journeymen on 1-year AAA deals chasing one more shot, and a guaranteed floor of hidden diamond-in-the-rough prospects in every org — all deterministic from the seed, all through the existing generation and materialization machinery. This slice is org composition only: the right 40, the right 169, the right shapes. Requires TRUST-A merged; stop if absent.

Today (measured, seed 1234, through `buildNewGameState` — evidence in `output/roster-day1-audit/report.md`, regenerate with `cd apps/web && MBD_ROSTER_AUDIT=1 npx vitest run src/workers/rosterDayOneAudit.audit.test.ts`):

- **All 32 teams are roster-illegal at first pitch.** `POSITION_TEMPLATE` (`packages/sim-core/src/player/generation.ts:146`) generates 28 MLB players against `MLB_ROSTER_LIMIT = 26` (`packages/sim-core/src/roster/rosterManager.ts:22`), and `buildRosterState` (`rosterManager.ts:230-253`) derives the "40-man" as every MLB+AAA+AA player — 84 per team. The engine's own invariant checker reports **64 high-severity violations** (32 `roster_size_exceeded`, 32 `forty_man_exceeded`) on a brand-new save.
- **No affiliate can field a pitching staff.** Minor-league slots cycle `[...HITTER_POSITIONS, ...PITCHER_POSITIONS]` (`generation.ts:922-927`), yielding 21–24% pitchers everywhere: AAA/AA are 6P/22H with 2 SP; Rookie is 3P/17H with 1 SP. 160 of 160 affiliates fail a 40%-pitcher floor. The authored content pack materializer (`apps/web/src/workers/content/minorLeagueContent.ts`, `materializePlayerContent` at line 556) fills all 169 slots per team and inherits the same shape, so both the template and the materializer must change together.
- **Every MLB roster is synthetic.** The content pack (`minorLeagueContentPack.v1.json`) carries 640 hand-authored players — AAA 162, AA 147, A+ 105, A 97, ROOKIE 65, INTERNATIONAL 64 — and **zero MLB rows for any team**; every club's MLB roster is procedurally generated in a ~39–60 display band. GOAL.md's "authored rosters across MLB" claim is stale; treat it as aspiration, not source.
- **Every minor leaguer (4,512 players) is on a 0-year contract** (`generation.ts:458-473`). No minor-league journeyman archetype exists at init even though the deal machinery does (`MINOR_LEAGUE_DEAL_AAV = 0.75`, `MINOR_LEAGUE_DEAL_YEARS = 1`, `isMinorLeagueFA` in `packages/sim-core/src/roster/freeAgency.ts`).
- **The low minors are organizational filler**: 55% of Rookie (354/640) and INTERNATIONAL (264/480) players sit at display OVR ≤ 28 with no role, no upside, no reason to exist.
- **Diamonds in the rough exist but are unguaranteed and uneven**: per-org hidden-gem counts (display OVR ≤ 42, ceiling ≥ 58) range 12–25 with no floor, and only 37 league-wide at Rookie level.
- **19 MLB players have impossible service time** — random 0–8 years assigned with no age coherence (`apps/web/src/workers/sim.worker.setup.ts:276-279`), so a 24-year-old can have 8 years of service.

Standing constraints from the 2026-07-02 deep audit, binding on this goal:

- **The contract clock is frozen.** `player.contract.years` never decrements (`advanceContracts` in `packages/sim-core/src/finance/contracts.ts` is tested dead code); `11_ECON_CLOCK_1.md` is the queued fix. Until goal 11 merges, "1-year AAA deal chasing another shot" is honest authored flavor — this goal must not build mechanics that assume expiry.
- **AI depth charts have no sim effect.** Only the user team's `DayOneOpeningPlan` feeds simulated games (`sim.worker.actions.ts:1651` → `seasonSimulator` openingDayPlans); AI teams start their highest-rated SP in all 162 games (`buildGameTeam`, `packages/sim-core/src/sim/seasonSimulator.ts:96-186`). AI rotation usage is its own queued slice ("Living Rotations") — out of scope here.
- **Roster changes affect new saves only.** Players are generated once at new-game time and persisted in the snapshot; old-save enrichment is goal 10 (`10_OLDSAVE_MINORS_1.md`, opt-in). Never fabricate old-save history.

## Read first

- `docs/codex/CANONICAL_DIRECTION.md`
- `docs/codex/PROGRAM.md` (worktree and merge-order rules; this goal's row)
- `AGENTS.md` and `PLANS.md`
- `docs/codex/goals/01_TRUST_A.md`–`03_PROSPECT_1_FIRST_HOMEGROWN_STAR.md` for house voice and gate discipline
- `output/roster-day1-audit/report.md` and the audit script `apps/web/src/workers/rosterDayOneAudit.audit.test.ts`
- live generation, materialization, roster, and invariant source named in the checkpoint
- `TUNING.md` and the calibration bands it mirrors

## Source-first checkpoint

Before production edits:

1. Map every consumer of the current 28-man MLB output and the 84-man derived "40-man": `buildRosterState` (`rosterManager.ts:230`), the invariant checker (`packages/sim-core/src/invariants/checker.ts`), Rule 5 protection (`packages/sim-core/src/roster/rule5.ts` — protection currently keys off the bogus 40-man), September expansion (`minorLeagues.ts:17`), trade AI, and any UI reading `rosterState.fortyManRoster`. Record which consumers break if the 40-man becomes a real curated 40 and which silently improve. Rule 5/options/waivers edge cases are flagged untested in the gap analysis — "exactly the right 40" needs invariant tests around those seams, not just better data.
2. Resolve the interaction with ECON-CLOCK-1 (`11_ECON_CLOCK_1.md`). Goal 11 makes `contract.years` tick and treats `years <= 0` as expiry-eligible; this goal replaces the 0-year minors contracts with real terms. Agree in the plan who owns what (initial values: this goal; tick/expiry semantics: goal 11) and declare merge order. Critically: even after goal 11, `shouldEnterFreeAgency` (`packages/sim-core/src/roster/freeAgency.ts:197-209`) only lets minor leaguers reach free agency at internal overall ≥ 340, or age ≥ 29 with ≥ 290 — journeymen authored outside those gates become expired-but-retained zombies. Author journeyman ages/ratings to clear the gate (age 29+ at internal ≥ 290 / display ~52+), and make initial contract values safe whether or not goal 11 has merged (no Day 1 expiry wave).
3. Confirm how the authored content pack flows: 640 hand-authored seed players (minors only — zero MLB rows, verified) slot into position-matched slots, then procedural fill completes all 169 slots per team (`materializePlayerContent`, `minorLeagueContent.ts:556`). The rebalance must preserve every hand-authored identity (names, ratings, scouting notes) while reshaping only slot templates and procedural fill. Treat any authored-player loss as plan-blocking.
4. Pin the KC BBQ Fountains override ordering **as merged**, from source — it differs between branches today: this branch applies `applyKCOverrides` before the pack overlay (`generateTeamRoster`, `generation.ts:931`), while branch `claude/cool-jang-824c88` moved it after the overlay (its `generation.ts:942`). Any new authored or materialized MLB content must respect the merged ordering; `minorLeagueContent.test.ts` pins the KC phenoms (Fontaine/Fuentes) and will catch violations. Do not resolve this by guessing — read the merged file.
5. Confirm where scout-perceived ratings diverge from true ratings (`packages/sim-core/src/scouting/scoutingEngine.ts` — scout `quality` drives accuracy; ceiling/floor projection spread at lines 215-230). Hidden gems must read as ordinary low-minors players through the scouting surface, not arrive pre-labeled; if the UI leaks true `ceiling` anywhere (prospect pages, comparison views), record where and gate the gem reveal on scouting.
6. Confirm the diamond-in-the-rough machinery needs **no new mechanics**: OU aging with per-attribute peak-age windows and personality multipliers (`packages/sim-core/src/player/development.ts`), `breakoutEngine.ts`, and `developmentPipeline.ts` already exist. A late bloomer is authored data — low current attributes + late peak profile + favorable work-ethic/toughness multipliers — flowing through existing engines. Any proposal for a new development mechanic is a plan-blocking scope error.
7. Enumerate what consumes minors position balance downstream: affiliate simulation (`simulateAffiliateDay`, `minorLeagues.ts:764`), promotion candidates (`getPromotionCandidates`, `minorLeagues.ts:701`), `autoFillMLBRoster` (`rosterManager.ts:717`), and development pipeline monthly flows. Verify a ~50%-pitcher minors doesn't break their assumptions (e.g., stat-line generation per position).
8. Confirm the calibration blast radius before writing code. League-wide talent shifts move measured bands — precedent: the KC scale fix alone dropped league HR below the 5,000 floor and forced a `LEAGUE_AVG.hr` retune with `TUNING.md` evidence and a declared determinism-snapshot re-baseline. Budget `pnpm --filter @mbd/sim-core run playtest:calibrate` for every talent change in this goal. Identify every snapshot/fixture that bakes in generated rosters (`packages/sim-core/tests/determinism.snapshot.test.ts`, `__snapshots__`, contracts fixtures) and declare the re-baseline in the plan.
9. Confirm this goal is new-game-only: no old-save migration, no mutation of existing saves (goal 10 owns old-save minors enrichment). Verify save-load of a pre-existing save is untouched by generation changes.

## Required invariants

1. A brand-new league (any seed) produces **zero** invariant-checker violations: every team exactly 26 on the active roster, exactly 40 on the 40-man, every MLB player on the 40-man.
2. The 40-man is chosen by a deterministic value rule — the 26 active players plus 14 minors selections ranked by a stated blend of current overall, ceiling, level proximity, and Rule 5 exposure, with position spread so the 14 aren't all bats. Same seed → same 40, the selection function is pure and unit-tested, and its interaction with Rule 5 protection, options, and waivers is covered by named edge tests (checkpoint item 1). The 40 are defensibly "the ones who should actually be on there."
3. Every affiliate at every level fields a legal baseball team: pitchers 45–55% of the roster, ≥5 SP at full-season levels (≥4 at Rookie), ≥2 C, all eight field positions covered. Target shapes: AAA/AA 28 = 14P/14H; A+/A 25 = 13P/12H; ROOKIE 20 = 10P/10H; INTERNATIONAL 15 = 7P/8H.
4. Every AAA roster carries 3–5 veteran minor-league journeymen on 1-year deals at the existing `MINOR_LEAGUE_DEAL_AAV`/`MINOR_LEAGUE_DEAL_YEARS` terms, authored to clear the `shouldEnterFreeAgency` gate (age 29–33 at internal overall ≥ 290) so they never become expired-but-retained zombies once goal 11 ticks the clock; AA carries 1–2. They are flagged so narrative/UI can tell the "one more shot" story as authored flavor today and real stakes after goal 11. All other minors contracts get real level- and age-appropriate years (no 0-year contracts anywhere), safe under goal 11's stated rules whether it has merged or not.
5. No dead weight: every generated minor leaguer has an organizational role derivable from his profile (prospect / org depth / veteran insurance), and full-season-level quality floors rise so no more than ~10% of A-ball and ~25% of Rookie/INTL players sit at display OVR ≤ 28 — tuned via `TALENT_MULTIPLIERS` (`generation.ts:817-825`) and floors, recorded in `TUNING.md` with before/after audit evidence.
6. Guaranteed diamonds in the rough: every org gets ≥3 hidden gems (display OVR ≤ 42, true ceiling ≥ 58, at least one at A/ROOKIE/INTL) with deterministic count and RNG-varied identity/position/flavor, expressed purely as authored data through the existing development machinery (checkpoint item 6): low current attributes, late peak-age profile, favorable personality multipliers. Gem ceilings hide behind the scouting accuracy surface confirmed in checkpoint item 5. League-wide per-org spread stays within a stated band (no more 12-vs-25 luck).
7. Initial org depth is optimized as composition, not behavior: a deterministic assignment pass orders each org's talent so the best 26 (by role) are on the MLB roster, the next tier at AAA, and so on down — no minors player strictly dominating an MLB player at the same position/role at init, within stated age/level development bands (a 19-year-old phenom correctly starts in A-ball, not the majors). No changes to how the sim *uses* rosters (AI rotation/lineup behavior stays as-is; "Living Rotations" owns that).
8. MLB service time is age-coherent: never exceeding `age - 20` years, preserving the existing distribution shape otherwise.
9. All generation remains seed-deterministic through `GameRNG` forks — never `Math.random()`, wall clock, or UUID. Same-seed outcomes change once, by declared policy (determinism re-baseline per checkpoint item 8), never silently — and never concurrently with goal 11's re-baseline (see merge order).
10. No schema change expected: roster shapes, contracts, and flags fit existing `GeneratedPlayer`/`ContractSchema` fields. If a gem/journeyman flag proves unavoidable as a new persisted field, it ships additive-only with migration, fixtures, round-trip, reload proof, and rollback.
11. KC BBQ Fountains identity survives intact under the checkpoint-confirmed override ordering: Fontaine/Fuentes and the staff boosts apply to the reshaped roster, and `minorLeagueContent.test.ts`'s pins stay green without weakening.

## Architecture selection order

Prefer the smallest live-source-compatible option:

1. Fix the templates in place: reshape `POSITION_TEMPLATE` to exactly 26 (13 pitchers: 5 SP / 1 CL / 7 RP; 13 hitters: 2 C, 6 IF, 4 OF, 1 DH) and replace the minors position cycle with per-level position templates matching invariant 3, in `generation.ts` where the current constants live.
2. Mirror the same shapes in the content-pack materializer (`minorLeagueContent.ts`) so authored seed players slot into the reshaped templates unchanged; regenerate the materialized output deterministically rather than hand-editing rows.
3. Curate the 40-man inside `buildRosterState` or a small pure `selectFortyMan(teamPlayers)` in `rosterManager.ts` called by it — one function, unit-tested, used by both new-game and any future re-derivation. Do not build a parallel roster ledger.
4. Seed journeymen, contract terms, roles, and gems inside `generateTeamRoster` after template fill, the same seam `applyKCOverrides` and `seedOpeningDayMlbContracts` already use (`generation.ts:930-944`), respecting the checkpoint-confirmed KC ordering. Reuse `freeAgency.ts` deal constants; do not invent new contract machinery (goal 11 owns the clock) and do not add development mechanics (checkpoint item 6).
5. Implement the depth-optimization pass as a pure org-sort at generation time (swap players between levels within age/role bands before roster states are built), not as a new persistent depth-chart entity and not as sim-behavior change; `buildGameTeam` and the affiliate sim then consume better-shaped rosters for free.
6. Promote the audit script into a permanent release gate (proper test asserting invariants 1–8 on a fresh league, not an env-gated dump). Extend `packages/sim-core/tests/dayOne.test.ts` / invariant tests rather than adding a new harness.
7. Do not add new routes, new engines, or a new content-pack format unless the checkpoint proves the existing materializer cannot host the reshaped templates.

## Player-facing state

Extend existing surfaces only:

- the Day One org review and roster pages show legal 26/40 rosters with no compliance warnings on a fresh save;
- minors roster views show every affiliate with a real rotation and lineup shape, veteran journeymen visibly on 1-year deals, and prospects with roles;
- scouting/prospect surfaces show gems as unremarkable until scouted (checkpoint item 5's confirmed fog), so discovery is earned;
- a Day 1 news/assistant beat can point at the org's shape honestly (e.g. the AAA vet competing for a call-up) through existing `newsFeed.ts` templates — honest about today's reality: the journeyman's deal is a story hook now and gains real expiry stakes only when goal 11 lands. No fabricated history, no promised mechanics that don't exist yet.

## Required lanes

All through existing TRUST-A autosave lanes:

- new game → immediate save → reload: rosters identical, all invariants still zero-violation;
- user promotes/demotes across levels on Day 1 without inherited illegal-state errors;
- Rule 5 protection audit opens against the curated 40-man;
- existing sim/roster/trade/news persistence regression.

## Proof

- unit: 26-man template shape; `selectFortyMan` determinism, exact-40, value-rule and position-spread properties; named Rule 5/options/waivers edge tests against the curated 40; per-level minors template shapes; journeyman gate-clearance property (every seeded journeyman satisfies `shouldEnterFreeAgency` preconditions at age/rating); gem seeding counts and bands; service-time coherence property test; depth-pass dominance invariant;
- integration: fresh leagues at ≥3 seeds → zero invariant violations, all invariant 1–8 assertions green for all 32 orgs; all 640 authored seed players present with identities intact; KC pins green under the confirmed ordering;
- the promoted audit gate runs in CI as a named test; the markdown dump stays available behind `MBD_ROSTER_AUDIT=1` for eyeballing;
- soak: 3+ simulated seasons from a reshaped league — affiliate stats, promotion recommendations, development pipeline, and auto-backfill all function within calibration bands; `pnpm --filter @mbd/sim-core run playtest:calibrate` run and recorded for **every** talent change, with `TUNING.md` evidence if bands move (the KC-scale precedent says they will);
- determinism-snapshot re-baseline recorded with rationale, sequenced against goal 11 per the declared merge order;
- browser hard reload lanes above;
- full typecheck/tests/build/smoke gates; results recorded in COMPLETION.md.

## Scope cut line

New-game generation only: no old-save migration or enrichment (goal 10 owns that); no contract tick/expiry semantics (goal 11 owns that); no AI rotation or lineup usage changes — AI teams still start their best SP every game until "Living Rotations" ships as its own slice; no in-season roster AI behavior changes (`autoFillMLBRoster`, trade/FA AI — goals 07/08); no new development mechanics (existing OU/breakout/pipeline engines only); no new persistent depth-chart schema or depth-chart UI editor; no minors box-score fidelity changes; no draft class changes; no new routes; no authored MLB content beyond what invariant 11 requires — authoring full MLB rosters is a separate content effort, not this slice. If the depth-optimization pass (invariant 7) proves too entangled with development bands to land cleanly, cut it to a follow-up goal and keep invariants 1–6 and 8 — legality and balance ship first. If gem hiding requires UI changes beyond gating one ceiling read, log the follow-up instead of expanding scope.

**Merge order:** declare in the plan relative to `11_ECON_CLOCK_1.md`. Both goals move calibration bands and re-baseline the determinism snapshot — they must not re-baseline concurrently; whichever merges second re-runs calibration and re-baselines on top of the first. Both touch minors contract semantics: this goal writes initial values that must be legal under goal 11's rules whether it has merged or not. Should merge before `10_OLDSAVE_MINORS_1.md` so old-save enrichment inherits balanced shapes.

## Done

A new league on any seed starts with 32 legal orgs: exact 26-man and curated 40-man rosters, every affiliate fielding a real staff and lineup, no dead-weight minor leaguers, AAA journeymen on honest 1-year deals that will gain real stakes when the contract clock lands, a guaranteed hidden-gem floor in every farm system expressed through existing development machinery, age-coherent service time, and optimized org depth — proven by a permanent zero-violation generation gate at multiple seeds, Rule 5/options/waivers edge tests, calibration-clean soak with TUNING.md evidence, a declared determinism re-baseline sequenced against goal 11, reload-proof lanes, and clean gates recorded in COMPLETION.md.
