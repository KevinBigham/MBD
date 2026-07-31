# Changelog

## [Unreleased] - 2026-06-18

### KC BBQ Fountains Ships As The League Bully

- Design decision (Kevin, 2026-07-02): KC is the deliberately overpowered flagship franchise at full authored strength — the team every dynasty has to dethrone. Before this change the authored content pack overlaid all 28 KC MLB slots after `applyKCOverrides` ran, so Marcus Fontaine, Alejandro Fuentes, and the staff/infield boosts never appeared in real games and KC shipped 19th of 32 by mean MLB rating.
- `generateTeamRoster` now applies the KC overrides after the authored roster overlay, so the phenoms and boosts survive into shipped new games. Generation paths without the authored pack (calibration, tests) are byte-identical to before.
- Shipped-world evidence (full season, seed 44001, authored pack): KC finishes 112-50 with the best record and allows 477 runs against 532 for the next-best staff.
- Added worker-content regression tests pinning Fontaine/Fuentes at full authored strength in the shipped world, the staff/infield boosts above their pack baselines, and every other franchise exactly on its authored values.
- Existing saves keep their persisted players; save schema unchanged.

### KC Rating-Scale Fix And Run-Environment Recalibration

- Fixed `applyKCOverrides` writing display-scale (20-80) values into internal-scale (0-550) attributes and clamping boosts at 80, which crushed KC BBQ Fountains MLB pitchers to the league floor while their overall ratings still claimed phenom grades. Authored grades now convert through `toInternalRating()` and boosts clamp through `clampRating()`.
- The KC infield-defense boost no longer double-applies on top of the authored shortstop's exact defense grade, matching how the SP boost already excluded the authored phenom.
- Recalibrated `LEAGUE_AVG.hr` from `0.03175` to `0.0333`: with KC pitching no longer inflating league offense, the core calibration sample fell to 4,896 league home runs, just under the 5,000 floor; it now lands at 5,078 with every other target band still passing (8+ WAR held at 7 of max 8).
- Scope note: new games built with the full authored roster pack overlay all 169 KC slots after these overrides, so shipped rosters were already scale-correct; the fix matters for the calibration harness, tests, and any generation path without the authored pack. Existing saves keep their persisted players either way. Save schema unchanged.
- Refreshed the determinism snapshot baseline and the core calibration evidence in `TUNING.md` (intentional behavior change: KC ratings and league HR rate).

### Authored Roster Content

- Materialized the compact worker content pack into 5,408 stable authored roster rows: 169 players for each of 32 organizations across MLB, AAA, AA, A+, A, Rookie, and International.
- Preserved the 640 reviewed seed players and 192 affiliate identities, then filled missing slots through the versioned worker materializer with stable `auth-<team>-<level>-###` content IDs.
- New games now pass the full authored content map into league generation; existing saves still load persisted players and are not replaced. Save schema remains v34.
- Calibrated authored MLB bands and a one-point penny-pincher free-agent appeal penalty so season scoring, trades, extensions, FA activity, and onboarding consequence spread remain inside existing balance gates.
- Added focused sim-core, worker-content, and worker new-game tests for full-roster overlay, legal fields, deterministic content IDs, duplicate prevention, and reviewed seed preservation.

### Identity Originality

- Applied Kevin-approved original replacements for every reviewed blocker/high/medium/internal-duplicate franchise and affiliate identity while preserving team IDs and affiliate keys.
- Updated the compact minor-league worker content pack plus supplied CSV/workbook/guide/division-packet assets; counts remain 192 affiliates and 640 authored player rows with 192 unique affiliate short names.
- Save schema remains v34; this is display/source content only and does not replace existing-save players.

### Save And Determinism

- Reconciled Goal 32 after external cleanup removed its temporary-only proof
  checkouts and authenticated checkpoint files. All committed source and review
  history remains intact; lost dirty bytes are no longer described as
  preserved evidence. Kevin's standing authority now opens one persistent,
  frozen-lockfile, corrected one-file proof successor with independent static
  review before its sole import probe, plus an exact checkpoint restore or one
  canonical recapture before the still-unspent diagnostic. No gameplay, RNG,
  save, schema, receipt, seed, horizon, timeout, or acceptance cap changed.

- Recorded Goal 31 `ECON-MILESTONE-PATH-PERF-1` as blocked without landing its
  four-file production candidate. The milestone/ceremony lookup reduction
  preserved exact season-30 semantic, state, RNG, round-trip, row, population,
  and call-signature facts; standard median combined time improved from
  88,044.107ms to 16,518.497ms, and real V8 combined roots fell from
  73,501,040us to 333,791–351,748us.
- The exact no-retry primary and season-15 continuation forecasts each stayed
  below 40 minutes and converged on identical final facts, but their frozen
  adjusted aggregate was 2,948,890ms—908,890ms above the 2,040,000ms
  admission cap. Final admission correctly failed once and wrote no receipt.
  Root gates, final merge review, landing, Goal-18 integration/diagnostic,
  Item 19, and remote/release actions did not run.

- Recorded Goal 30 `ECON-LATE-HORIZON-PERF-1` as blocked without landing its
  production candidate. The exact season-30 milestone lookup reduction preserved
  all row/state/RNG/round-trip/subdomain/call facts while improving median
  regular-season total 21.125%, combined target time 39.017%, and selected V8
  cost 99.278%; worker-core remained exactly 454,918 raw / 147,456 gzip.
- The sole canonical primary forecast then timed out at the unchanged
  2,400,000ms test ceiling and measured 2,766,160ms adjusted, already 726,160ms
  above the complete readiness cap. It emitted no receipt; continuation, full
  gates, production landing, final Goal 18, and item 19 were not run. Final Sol
  verdict: `BLOCK_CONFIRMED`, zero actionable P0–P2. GameSnapshot remains v35
  and Dexie remains v6.

- Conditionally landed Goal 29 `ECON-LONG-SAVE-PERF-1`, the bounded runtime
  prerequisite for roadmap item 18. An opt-in module-local observer identified
  regular-season player micro-arcs as the dominant late-save stage; players
  without a resolved injury now bypass an irrelevant full news-history scan
  while every eligible scan, moment, state transition, and RNG draw stays exact.
- Three fresh-process pairs reduced season-16 total runtime from
  178,121.040–199,411.976ms to 72,764.402–79,800.696ms and the targeted stage
  from 110,382.877–128,976.246ms to 4,369.359–4,515.245ms. Every pair improved
  with non-overlapping ranges and identical row/state/RNG/contracts/payroll/
  population/free-agency evidence.
- Final evidence: corrected-tree Goal-18 horizon-2 4/4 in 47.20s with exact
  content digest; package/web/e2e typechecks; contracts 37, sim-core 1,714, UI 1,
  web 2,478 plus nine intentional skips; 3,035-module / 168-entry PWA; bundle
  budget; determinism 3/3; Sol `MERGE_READY`, P0/P1/P2 0/0/0. GameSnapshot
  remains v35 and Dexie v6. The sole post-landing Goal-18 seed-7111 run reached
  30 primary starts but only 29 completions before the unchanged 40-minute alarm;
  replay never began and no receipt was emitted. The optimization remains landed
  and verified, but it is insufficient and neither Goal 29 nor item 18 is complete.

- Verified roadmap item 17, Goal 27 `ECON-TRADE-RETENTION-1`: legal two-team
  trades may now carry flat annual retained salary and one current-season,
  player-linked payroll reimbursement. Gross player salary never changes; one
  canonical finance authority conserves payer charges, controller credit/net,
  taxable payroll, future commitments, owner-pressure evidence, and effective-
  salary valuation through direct trades, re-trades, return-to-payer, rollover,
  expiry, and option boundaries.
- Accepted terms are immutable GameSnapshot-v35 trade-history facts. v34 and
  deep saves migrate with empty capability and no fabricated history; Dexie
  remains v6. Exact-save execution retries only the retained post-trade
  snapshot, never the gameplay mutation, and Finance/Trade/Press preserve the
  same terms after export/import and hard reload.
- Final evidence: canonical worker 198/198; root typecheck 9/9; full tests 8/8
  tasks with 2,468 web assertions and nine intentional skips; determinism 3/3;
  3,035-module / 168-entry production PWA; bundle budget 1/1; item-17
  Playwright 1/1 and reload-smoke 2/2 with one worker and zero retries. Final
  Sol review: `MERGE_READY`, zero actionable P0–P2. No treasury, revenue/budget
  redesign, broad CPU term generation, multi-team term authoring, dependency,
  route, bundle-ceiling, or item-18 work was added.

- Verified roadmap item 16, Goal 26 `ECON-FA-DECISIONS-1`: one pure,
  deterministic player-side evaluator now owns competitive user and CPU
  free-agent choices. Literal contract value remains dominant while a bounded
  12% age-shaped ceiling permits truthful current-roster opportunity, completed
  contender facts, persisted loyalty, and symmetric clubhouse appeal to decide
  close offers. Valid terms are fenced to the live 1–10 year contract domain.
- Accepted decisions update the existing canonical player, roster, market,
  offseason, qualifying-offer, and contract tuple, then publish one exact
  reason-bearing signing item only after durable save. Rejected, invalid,
  unaffordable CPU, over-capacity, QO-blocked, and noncanonical offers leave the
  snapshot and RNG unchanged. Imported market rows rebind only when their
  persisted player facts are deeply equal; corrupt divergence remains fail-closed.
- Free Agency previews factual stage/opportunity/contender/loyalty inputs and
  Press Room retains the same user and CPU reason after hard reload. No schema,
  dependency, new route, historical motive backfill, enforceable playing-time
  promise, item-17 salary retention, or item-18 long soak was added.
- Final evidence: focused feature, worker, route/bundle, compatibility, and
  max-term regression gates; exact four-seed/four-season replay inside all
  item-15 economy bands with zero fact/legality/affordability/reconciliation
  violations; root typecheck 9/9; sim-core 1,709; web 2,434 passed plus nine
  intentional skips; contracts 24; UI 1; determinism 3/3; 3,033-module /
  167-entry PWA; production Goal-16 1/1 and reload-smoke 2/2, one worker and
  zero retries. Final adversarial verdict: `MERGE_READY`, zero P0–P3.

- Verified roadmap item 15, Goal 25 `ECON-MARKET-REVENUE-1`: explicit market
  tiers, the factual final 162-game record, a fixed playoff-berth bump, and the
  persisted owner archetype now produce one deterministic modeled gross-revenue
  statement and coherent next-season budget allocation for all 32 clubs.
- Settlement occurs only on the exact Season Review Advance/Skip transition,
  precomputes the whole league before mutation, repairs hostile partial state,
  and remains bound to the existing exact-save rollback/retry/fencing contract.
  Ordinary owner narrative no longer rewrites budgets midseason.
- Finance, Owner Intel, and Offseason share truthful raw/effective vocabulary;
  projected tax remains separate. GameSnapshot stays v34 and Dexie stays v6;
  no actual attendance, cash, revenue-sharing, or paid-tax system is claimed.
- Final evidence: focused pure/worker/consumer/compatibility gates; hard
  4-seed x 4-season study with 512 statements/receipts and zero settlement
  isolation drift; root typecheck 9/9; sim-core 1,689; web 2,422 with five
  intentional skips; 3,032-module / 167-entry PWA; determinism 3/3; production
  annual journey 1/1 and reload-smoke 2/2, both zero-retry. Final adversarial
  verdict: `MERGE_READY`, zero P0-P2. Item 16 was not started.

- Verified roadmap item 14, Goal 24 `ECON-OWNER-PAYROLL-PRESSURE-1`: every
  organization now derives one source-owned advisory payroll floor and soft
  ceiling from its persisted owner state, while canonical MLB payroll plus dead
  money owns the fixed `$230M` progressive tax line. Legal transactions remain
  legal; the feature does not debit cash, change budgets, or alter owner state.
- Exact offseason completion records one stable team/season pressure receipt
  for all 32 organizations and one factual user news/briefing presentation.
  Partial and duplicate imported artifacts repair idempotently; failed
  transitions, retries, reloads, and read-only queries cannot double-apply the
  consequence or drift owner, franchise, contract, or RNG state.
- Finance, Dashboard, Owner Intel, Offseason, Free Agency, Owner Meeting, and
  Financial Playbook now distinguish total, budget, taxable, owner-line, and tax
  values. Legacy v33/Season-10 and missing/partial owner saves remain read-only
  compatible; GameSnapshot stays v34 and Dexie stays v6.
- Final evidence: focused owner surface 19 files / 91 tests; loop-2 sim-core
  30/30 and web 20 passed plus one intentional skip; 4-seed × 4-offseason study
  1/1 in 516.06 seconds with 512 receipts, 74 inspectable taxpayer facts, and
  zero six-surface or side-effect contradictions; root typecheck 9/9; contracts
  24/24; UI 1/1; sim-core 1,681; web 2,407 with four intentional skips;
  determinism 3/3; 3,030-module / 167-entry PWA; production owner journey 1/1
  and reload-smoke 2/2 with one worker, zero retries, and no flaky result. Final
  adversarial verdict: `MERGE_READY`, zero P0–P2. Item 15 was not started.

- Verified roadmap item 13, Goal 23 `ECON-EXTENSION-AI-1`:
  every CPU club now
  evaluates its own active MLB core once at the canonical offseason extension
  phase using persisted current-GM posture, permitted live team state, exact
  service days, and versioned team-scoped RNG. Personality changes only bounded
  team priority/term/concession posture; player demand and the real budget stay
  shared and identity-neutral.
- Extension affordability replaces the old AAV and rechecks the accepted final
  contract against the exact owner ceiling. Accepted and rejected attempts form
  coherent contract/history/phase/news facts; malformed imports and stale or
  forged public callbacks fail closed before RNG or mutation.
- Correction-freeze evidence: contracts/front-office 33/33, focused web 12
  files / 269 tests, balance 9/9, four exact-replay league seeds with zero budget/duplicate/history/
  parent-RNG violations, full root gates, 3,029-module / 167-entry PWA,
  determinism 3/3, production CPU extension 1/1, and reload-smoke 2/2. The
  authoritative final browser gate passed 3/3 in 4.8 minutes; browser
  gates used one worker, zero retries, and no flaky result. GameSnapshot remains
  v34, Dexie remains v6, item 49 remains partial, and final adversarial review
  returned `MERGE_READY` with zero P0–P2.

- Verified roadmap item 12, Goal 22 `ECON-QUALIFYING-OFFERS-1`: one fixed
  service-day-authoritative qualifying-offer salary now drives deterministic
  user/CPU issue and once-only resolution; rejected players enter the canonical
  market, while an outside signing atomically requires one former-club award
  and one specific eligible signing-club pick loss.
- QO issue/resolve, accepted user signings, draft start, and draft selection use
  the existing exact-save worker session and persistence lease. Rejected or
  malformed transitions produce no snapshot capture or false durable success,
  and imported lifecycle, draft-slot, player, signing, and acquisition facts
  fail closed when they do not form one coherent aggregate.
- Offseason, Free Agency, and Draft expose the fixed salary, pending/terminal
  states, exact pick cost, award/loss consequence, and supplemental-slot
  provenance with keyboard-safe desktop and 375×667 controls. GameSnapshot
  remains v34, Dexie remains v6, and no dependency or bundle ceiling changed.
- Final evidence: contracts 24/24, UI 1/1, sim-core 1,665/1,665, web
  2,387 passed + 3 intentional skips, root typecheck/build, determinism 3/3,
  3,029-module / 167-entry PWA, production QO journey 1/1, and reload-smoke
  2/2. Both browser gates used one worker, zero retries, and no flaky result.

- Verified roadmap item 11, Goal 21 `ECON-ARBITRATION-1`: exact MLB service
  days now own ordinary and Super Two eligibility, deterministic arbitration
  dockets persist distinct filing, exchange, hearing, and award beats, and every
  award is a consistent one-year contract at or above the prior salary.
- Offseason Advance/Skip now holds one exact worker session plus an exact-save
  persistence lease through durable publication. It drains accepted ordinary
  writes, blocks stale capture/callbacks, retries only the frozen post snapshot,
  preserves root/branch ownership identity, and fails closed after an accepted
  persistence failure.
- User and CPU clubs use identical automatic arbitration mechanics. Holdout copy
  and service effects are bounded to same-offseason spring closure; the new
  Offseason docket remains readable and keyboard-reachable on desktop and
  375×667 mobile.
- Final evidence: sim-core 141 files / 1,660 tests; web 463 files passed + 1
  skipped and 2,354 tests passed + 3 skipped; contracts migration 24/24; UI 1/1;
  3,029-module / 166-entry PWA; zero-retry production arbitration 1/1 and
  reload-smoke 2/2. GameSnapshot remains v34, Dexie remains v6, and roadmap item
  12 was not started.

- Verified roadmap items 9–10 through Goal 11 `ECON-CLOCK-1`: contracts now
  advance exactly once at the authoritative offseason seam, deterministic team
  options use the same zero-RNG rule for user and CPU clubs, and natural
  expirations enter the canonical free-agent market without duplicate or lost
  ownership.
- Exact-save persistence now keeps offseason advance/skip presentation behind a
  durable `saved:true` receipt and rejects stale callbacks after a save switch.
  Finance, Offseason, and News distinguish true expirations, pending team
  options, and pre-market declined options honestly.
- Compatibility and economy evidence remain separate: the compact v33 fixture
  proves migration/rollover/save-reload preservation, while the current-schema
  3-seed × 6-rollover soak and strict replay share digest
  `5477faee99676a965a51a9ea394a179097f8c41c1ad96c06f83d3fb43ffe0814`.
  GameSnapshot remains v34; no RNG/schema change or Goal-12 roster-generation
  repair is included.

- Verified roadmap item 8, Goal 20 `TRUST-SIM-ADVANCE-JOURNAL-1`: Dexie v6
  adds an exact-save/root write-ahead intent journal while GameSnapshot remains
  v34; regular-season simulation commands now commit exact post snapshots or
  roll back to the verified baseline without gameplay replay, and persistence
  retry never reruns the command.
- Final evidence: focused correction matrix 14 files / 460 tests; root
  typecheck 9/9; full suite 459 web files passed + 1 skipped and 2283
  assertions passed + 2 skipped; production build 3026 modules / PWA 166
  entries; determinism 3/3; fresh serial Chromium reload-smoke 2/2 and the
  four-spec matrix 5/5 with zero retries. The relay used Terra as sole writer,
  Sol final review, and Luna closeout with an explicitly labeled manual relay
  fallback for host browser commands.
- Compatibility warning: already-open older builds must close or reload before
  relying on the v6 journal/write authority; mixed-version tabs are not
  protected by the new write boundary.

- Verified roadmap item 7, Goal 19 `TRUST-STORAGE-PRESSURE-1`: Settings and Save Hub now distinguish current logical snapshot size, estimated serialized local MBD records, and approximate origin usage/quota; preserve exact primary/shadow/root-tree evidence; disable lossy archive compaction; and offer only exact-active narrow stale-data pruning with confirmation, shared operation ownership, durable-snapshot receipts, quota truth, retry without mutation replay, and hard-reload/successor proof.
- Final item-7 evidence: focused 49 suites / 372 tests, full repository gates, fresh 3,022-module / 167-entry PWA, determinism 3/3, and serial Chromium storage-pressure 1/1 (42.5s), multitab 1/1 (11.9s), and reload-smoke 1/1 (4.5m), all with one worker, zero retries, and no flaky classification. No schema or dependency change; save schema remains v34 and Dexie v5.
- Closeout route: Terra `019f529d-211d-7590-b834-3014f5a3a102` high→xhigh implementation, manual relay-pattern fallback writer, replacement Sol `019f534c-8009-7ab1-8849-e9c59b7c49cc` xhigh `MERGE_READY` with zero P0–P2, and Luna `gpt-5.6-luna` medium closeout. No push, deploy, tag, release, or item-8 work.

- Verified roadmap item 6, Goal 18 `TRUST-EXPORT-SCHEMA-MATRIX-1`: every live-supported GameSnapshot version v2–v34 now has a deterministic worker import/export plus canonical JSON export/re-import proof, with explicit historical builders, normalization expectations, rejection boundaries, and the Season-10 v33 no-fabricated-history assertion.
- Final closeout route: Terra `019f51f7-5277-7570-add0-fd4a2acb1778` high→xhigh, Sol `019f51c7-4ff9-7b13-8b14-d0120e47225c` xhigh `MERGE_READY` with zero P0–P2, and Luna medium checkout closeout. Focused matrix/recovery 27/27, focused worker/save/recovery/toast 151/151, contracts migration 24/24, full gates, and fresh zero-retry reload-smoke 2/2 passed. The landed commit is available in repository history; no push, deploy, tag, release, or item 7 work was started.

- Current save schema: v34.
- Added a same-origin save-tree guard so a supported browser allows only one current MBD tab to load, mutate, or persist a root dynasty and its what-if branches at a time; blocked tabs can check again after the owner closes.
- Rollout note: an older MBD tab that was already running before this update cannot participate in the guard. Close or reload every older open MBD tab before relying on multi-tab protection; mixed-version tabs are not protected.
- Added compact archived major-game box scores for future postseason, championship, no-hitter/perfect-game, milestone, and rivalry games.
- Added v33 -> v34 migration with `narrative.archivedGames: []`; explicit Season 10 v33 fixture proves old saves load without fabricated historic game details.
- Box Score routes can now render either live numeric game indexes or stable archived-game ids from dynasty timeline memory beats.
- Bundle ceilings were not raised; archive/query worker logic is split into scoped chunks.
- Fixed MLB demotion waiver legality so a legal third option-year demotion, or a repeat demotion during an already-active option season, does not incorrectly create a waiver claim.
- Fixed AI roster overflow normalization so AI clubs consume option years and expose out-of-options players to waivers under the same ledger-backed rules as the user club.
- Fixed week/month sims so skipped regular-season days accrue MLB service time and advance affiliate games through the same day-level farm clock as `simDay()`, with affiliate games on a stable scoped RNG that does not perturb MLB balance.
- Batched week/month farm stat-history and service-time work, and indexed affiliate players during farm simulation, so the fuller affiliate clock stays inside the isolated smoke-gate runtime budget while keeping save-visible minor-league history current.

### AI Organization

- Added deterministic club draft-strategy profiles so CPU teams can weight scouting grade, need, signability, upside, player background, and position scarcity differently without hidden boosts or saved-state changes.
- Added draft and worker regression coverage proving organization tendencies can change CPU picks from the same board while preserving deterministic order and prospect data.

### Setup And Onboarding

- Recalibrated setup farm-system preview grades against the generated league so the team picker shows a usable spread after the authored full-roster pack.
- Setup filters now hide loaded no-op controls that only contain one real option, while still keeping active filters resettable.

### Farm Development

- Staff and front-office mentorship now show saved active mentor lanes ahead of deterministic recommendations, with active/recommended counts and labels on the staff board so the displayed farm-development lift matches the relationships that affect monthly checkpoints.

### Release Readiness

- Refreshed sample-dynasty and calibration playtest evidence against the full authored v1 roster/content state, and extended the sample-dynasty generator watchdog so the required 10-season evidence run completes instead of timing out.
- Re-ran production preview browser/PWA smoke: Chrome desktop/mobile, Firefox, and WebKit all load the setup flow without console errors, and Chrome can reload offline and create a new Quick Start dynasty from the cached PWA.

## [1.0.0] - 2026-04-28

First stable public milestone for Mr. Baseball Dynasty.

### Launch Candidates

- LC-1, save health: safe save-load recovery dialog and corrupt-save export/delete/retry path. PR #64, `e17edba`.
- LC-2, guided start: first-ten-minute nudges for new saves without schema churn. PR #66, `1b51d2e`.
- LC-3, mobile survival: touch targets, portrait layout, viewport audit. PR #68, `cd1f975`.
- LC-4, stale-cache survival: service-worker update path and dead-chunk reload recovery. PR #65, `454076f`.
- LC-5, bundle cleanup: eliminated circular worker chunks. PR #67, `dd45da4`.
- LC-6, launch prep: README, changelog, landing copy, feedback path, version/meta prep. PR pending from `codex/launch-candidate-landing-feedback-lc6`.

### Narrative Depth Waves

- Wave 10: career capstone prose for awards, Hall of Fame, retirement, jersey legacy, farewell tours, and prospect/debut coverage. PR #63, `bc3b8e8`.
- Wave 9: weekly cadence moments: hot/cold streaks, closer weeks, bench clutch weeks, bullpen overwork. Schema v33. PR #62, `41eb26d`.
- Wave 8: player micro-arcs: injury returns, trade-deadline sparks, September call-ups. Schema v32. PR #61, `019a82d`.
- Wave 7: position-group narratives for rotations, bullpens, and lineups. Schema v31. PR #60, `46a24ae`.
- Wave 6: dynasty-marker moments: three-peats, era-ending collapses, perennial contenders. Schema v30. PR #59, `f8ae0b3`.
- Wave 5: player-arc signature moments: redemption, late-career peak, rookie breakout. Schema v29. PR #55, `6f14ee7`.
- Waves 3-4: expanded team identity, rivalry, milestone, nickname, and persisted-state fidelity work. Schemas v26-v27. PRs #46-#47.
- Waves 1-2: team identity and rivalry foundation, season identity moments, and dashboard surfacing. Schemas v23-v25. PRs #34, #42, #43.
- Waves 11-12 were deferred from v1 after the narrative freeze; v1.0.0 ships the stable Wave 10 narrative surface plus launch hardening.

### Dashboard And League Surface

- Career Retrospective, Season Story Reel, player arcs, Franchise Legacy, Chase Watch, Pennant Race, Award Race, and This Week in History shipped across PRs #37-#41, #54, #57, #58.
- Team identity moments moved from backend-only state into GM Career, dashboard, and filterable UI surfaces. PRs #32-#36.
- Mobile survival pass confirms 14 routes and 8 modal/sheet surfaces are touch-safe at 375x667, 360x640, and 414x896.

### Simulation And Systems

- Day One front-office hook shipped with AGM selection, org review, goals, budget, opening-day plan, development posture, crisis, and recap. PR #20 lineage, April 13 closeout.
- Living league systems shipped before v1: GM relationships, multi-round negotiation, multi-team trades, league events, relationship effects, scouting uncertainty, breakout/regression, playoff momentum.
- Trade deadline, arbitration, holdouts, finance calibration, schedule calibration, and reliability/calibration spines landed through PRs #23-#31.

### Save And Determinism

- Launch save schema: v33.
- v1.0.0 did not bump schema during the April launch-candidate cycle.
- Save migrations remained additive through the launch cycle, with fixtures for each schema bump.
- Randomness remains centralized through seeded PRNG paths; launch work did not touch sim RNG.

### Verification State

- Launch baseline: `origin/main` `cd1f9753a9fd530deaf0544720430186850b9918`.
- Last known bundle ceilings after LC-5: worker raw 443 KB, gzip 143 KB.
- Final LC-6 verification gate is tracked in `apps/web/docs/lc6-launch-prep-audit.md`.

## Pre-1.0 Development Road

### April 2026 Rebuild Phases

- Phases 1-10: rebuilt the browser sim foundation, core league model, roster/economy loops, deterministic save/load, and first playable management surfaces.
- Phases 11-14: expanded front-office systems, trade/finance/scouting depth, relationship effects, and worker-backed UI routing.
- Phase 15: broadcast layer: game recaps, play-by-play, trade deadline theatre, draft buzz, ticker/news/consequence integration.
- Phase 16: war-room polish: visualizations, lineup tools, Recharts/dnd-kit surfaces, production recovery polish, PWA icons, README, and deploy readiness.
- Phase 18: public-facing app surface and MLB-proof rebrand: achievements, rivalries, owner intel, pulse, scenarios, original 32-team league identity.

### Hardening Before Launch

- Infra hardening added multi-year smoke gates and playtest narrative dumps. PR #48, `1c6d79d`.
- Branch protection was enabled after a red-CI merge cascade, requiring `Typecheck -> Test -> Build`.
- Bundle budget comments became the canonical journal for intentional ceiling changes.
- Durable handoffs moved launch work into isolated worktrees with slice-level verification.
