# MBD Master Audit Report

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## 1. Executive Summary

Mr. Baseball Dynasty is a real, playable, unusually deep browser baseball dynasty sim. It has deterministic simulation, v34 save migration coverage, a broad route map, authored minor-league content for new games, serious onboarding, scouting, draft, finance, history, press, and rivalry systems.

The initial evidence pass found several disconnected high-value systems: draft-room autosave, app-shell narrative autosave, press autosave, dashboard readiness scale, guided-start pointer blocking, and onboarding finance overload. The current dirty working tree now contains code and tests that address those specific issues, and current-source typecheck/test/build/determinism gates pass. Treat those items as fixed in the working tree, not yet release-approved, because they still need browser reload/manual validation and ownership/commit review.

The remaining GOAT blockers are deeper dynasty substance: CPU organizations do not yet appear to have durable identities across decades, existing saves do not receive authored minor-league content, mentorship is read-only, development-plan controls need browser/ownership validation, and long-term history needs stronger prospect-to-legend continuity.

This audit did not implement product changes. The only allowed changes were audit/report Markdown artifacts.

## 2. Current Release Verdict

Status: YELLOW for broad local playability. RED for public "complete/GOAT" release until the dirty working-tree fixes are browser-validated, intentionally landed, and the remaining development/AI/minors/history gaps are addressed.

The project passes current major technical gates, including typecheck, full test, build, and determinism. It should not be called complete until browser reload/manual release checks confirm the save-trust fixes in real user flows and the remaining product-depth gaps are scheduled. A dynasty sim can tolerate some long-term greatness work after early release; it cannot tolerate unverified save trust.

## Audit Contract And Evidence Base

| Item | Evidence |
|---|---|
| Governing file | `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` read fully and used for required artifact set. |
| Project AGENTS | No on-disk `AGENTS.md` found in repo; Kevin's prompt-provided AGENTS instructions were applied. |
| Required docs | `README.md`, `DESIGN.md`, `STATUS.md`, `CHANGELOG.md`, `docs/CODEX_GAME_GUIDE.md`, `docs/CODEX_IMPROVEMENT_PLAN.md` inspected before source/runtime conclusions. |
| Existing planning/audit docs | Existing release, roadmap, source atlas, worker matrix, OOTP/UX goal, minor-league deliverables, and historical audit files were inspected as context only. |
| Source truth | Routes, workers, sim core, contracts, tests, schemas, saves, and runtime behavior were treated as truth. |

## Verification Ledger

| Check | Result | Notes |
|---|---|---|
| `npx pnpm@9.15.4 typecheck` | Pass | Turbo typechecked all five packages; 9 tasks successful from cache. |
| `npx pnpm@9.15.4 test` | Pass | Current dirty source: contracts 22, UI 1, sim-core 1,643, web 1,514 passed and 1 skipped. |
| `npx pnpm@9.15.4 build` | Pass | Current dirty source: Vite/PWA build passed; 157-entry precache at 3,835.50 KiB. |
| `npx pnpm@9.15.4 run verify:determinism` | Pass | Determinism snapshot tests passed. |
| `rg -n "Math\\.random\\(" apps packages --glob '*.{ts,tsx,js,jsx}'` | No matches | No bare `Math.random()` in scanned app/package TS/JS sources. |
| `npx pnpm@9.15.4 run verify:structure` | Informational findings | Knip reported 1 unused dependency and 225 unused exports. |
| `npx pnpm@9.15.4 run verify:cycles` | Informational findings | Madge processed 1,142 files, emitted 89 warnings, and found 19 circular dependencies. |
| Playwright route smoke | Pass with notes | All registered routes loaded after creating a new NYT save; console had 0 errors/warnings; `/games/0` lacked a main heading. |
| Focused dirty-tree web tests | Pass | 12 focused web files, 166 tests; verifies draft autosave, shell autosave, press autosave, readiness display, guided-start nudge pointer behavior, finance capping/spacing, and development-plan controls. |

## Current Working-Tree Reconciliation

After the required artifact set was created, the worktree contained source changes in draft, app-shell, dashboard, and onboarding files that were not made during this audit pass. Because source is truth, this report treats those dirty files as current workspace state.

The dirty-tree fixes appear to address the original high-trust findings for draft autosave, monthly/decision/ceremony autosave, press response autosave, readiness-as-percent display, guided-start nudge interception, and onboarding finance overload:

- Draft autosave is wired through `useActiveSaveAutosave` in `DraftPage.tsx`, `useDraftPageController.ts`, and `useDraftActionHandlers.ts`.
- App-shell autosave is wired through `persistShellMutation` in `AppLayout.tsx`.
- Press response autosave uses `handlePressConferenceResponse` in `AppLayout.tsx`.
- Readiness display now uses `normalizeProspectReadinessGrade` and labels farm-card values as `OVR`.
- Guided-start nudges now use a non-intercepting shell with pointer-active buttons.
- Onboarding finance priorities are capped with overflow details and `Name · POS` spacing.
- Focused tests and broad typecheck/test/build/determinism gates passed for current dirty source.

Release caveat: the current audit did not stage, commit, or rerun browser reload/manual PWA validation after those dirty source changes. Rows marked "fixed in working tree" remain release risks until browser validation and review.

## 3. Top 25 Blockers Or Highest-Leverage Issues

1. Current dirty-tree save/readiness/onboarding fixes need browser reload/manual validation and ownership review.
2. Development-plan controls are present in dirty tree but need browser validation and ownership review.
3. AI draft selection lacks organization identity.
4. User front-office development identity is not symmetric for CPU organizations.
5. Mentorship is derived/read-only while presented like a system.
6. Existing saves do not receive authored minor-league content.
7. Setup farm grades appeared uniform despite authored minors.
8. Guided-start nudge and onboarding finance fixes are present in dirty tree, but need browser validation.
9. Onboarding finance materiality still needs design review after the dirty capping/formatting fix.
10. Visible autosave/last-saved status is still missing.
11. Draft AI does not include scout quality/risk appetite/team philosophy.
12. Direct non-worker web imports from `@mbd/sim-core` weaken the worker boundary.
13. Worker/action/query/trade modules are large enough to raise regression risk.
14. History archives are save-safe but old saves remain sparse.
15. Player story systems need prospect-origin-to-legend threading.
16. `/games/0` lacks a useful empty-state heading.
17. Catch-all routes silently redirect to dashboard.
18. Release tests pass with noisy stderr warnings.
19. Structure verification reports 225 unused exports.
20. Cycle verification reports 19 circular dependencies.
21. Current docs contain source-truth drift on save version and git state.
22. AI org strategy is not visibly applied across draft, development, trade, payroll, and free agency.
23. Roster-rule edge cases need a Rule 5/40-man/options/waivers proof pass.
24. Browser/PWA manual release gates still need full confirmation outside the Codex sandbox.
25. Audit/release artifacts need to remain discoverable from future status/docs.

## 4. RED/YELLOW/GREEN Scoreboard

| Area | Label | Grade | Verdict |
|---|---|---:|---|
| Save schema/migrations | YELLOW | A- | Schema is strong; key mutation persistence fixes are present in dirty tree and broad gates pass, but browser reload validation remains. |
| Determinism | GREEN | A- | No bare random found; determinism gate passed. |
| Minor leagues | YELLOW | B+ | Strong new-game authored world; old-save/control gaps remain. |
| Player development | YELLOW | B | Real pipeline and first dirty-tree plan-apply action; broader agency is still thin. |
| Scouting | YELLOW | B | Strong route autosave; draft scouting persistence gap. |
| Draft | YELLOW | B- | Feature-rich; autosave fix is present in dirty tree and focused tests pass, but broader gate remains. |
| AI organizations | YELLOW | C+ | Functional CPU world, weak durable org identity. |
| Dynasty history | YELLOW | B+ | Strong forward history; old saves sparse. |
| Immersion | YELLOW | A-/B | Strong voice and story, but copy/data bugs break trust. |
| Replayability | YELLOW | B | Seeds/modes/routes exist; org differentiation needs work. |
| Release readiness | RED | B+ technical gates, C+ trust | Current typecheck/test/build/determinism are green; public release still blocked by browser reload/manual validation and product-depth gaps. |

## 5. Feature Grade Table

| Feature | Grade | Status | Evidence | Missing piece |
|---|---:|---|---|---|
| Save Hub/save slots | A- | GREEN | Runtime Save Hub loaded; setup save writes v34. | Last-saved status. |
| Save schema/migration | A- | YELLOW | `packages/contracts/src/schemas/save.ts`, migration tests. | Autosave gaps in callers. |
| New dynasty setup | B | YELLOW | `SetupTeamPickerPanel.tsx`, runtime setup. | Farm grade variance. |
| Onboarding | B+ | YELLOW | Runtime full Day One flow; dirty-tree nudge/finance tests and broad gates passed. | Browser validation and ownership review. |
| Dashboard | B | YELLOW | Runtime dashboard, dashboard transforms, dirty-tree readiness tests. | Broader route/browser validation after readiness fix. |
| Roster | B+ | YELLOW | Roster route autosave paths. | Roster-rule edge proof. |
| Minors | B | YELLOW | `/minors`, authored content, farm report. | Direct controls. |
| Player development | B | YELLOW | Dirty-tree `applyDevelopmentFocusPlan` worker mutation, Minors page CTA, autosave, and focused tests. | Browser validation plus deeper playing-time/mentorship controls. |
| Scouting | B | YELLOW | `useScoutingPageController.ts`. | Draft-room persistence parity. |
| Draft | B- | YELLOW | `useDraftActionHandlers.ts` dirty-tree autosave wiring; focused and broad gates passed. | Browser reload smoke plus org AI identity. |
| Trade | B | YELLOW | `sim.worker.trade.ts`, persistence hook. | Module risk/fairness tests. |
| Finance/contracts | B | YELLOW | `sim.worker.budget.ts`, finance route, dirty-tree FinancialView capping/spacing test and broad gates. | Materiality filtering and browser validation. |
| Free agency | B+ | YELLOW | Free-agency autosave hooks. | AI strategy depth. |
| Offseason | B+ | YELLOW | Offseason autosave hooks. | Roster-rule edge coverage. |
| Staff/mentorship | C+ | YELLOW | Staff route, derived mentorship query. | Persisted mentorship. |
| Front-office identity | B | YELLOW | `sim.worker.frontOfficeIdentity.ts`. | CPU parity. |
| Press/news | B | YELLOW | Dirty-tree press response autosave wiring in `AppLayout.tsx`; broad gates passed. | Browser validation and consequence refresh polish. |
| Monthly pulse | B | YELLOW | Dirty-tree `persistShellMutation` wiring in `AppLayout.tsx`; broad gates passed. | Browser validation and controller extraction. |
| Schedule/games | B | YELLOW | Route smoke. | Empty-state heading. |
| Standings/leaders | A- | GREEN | Route smoke. | Alias cleanup. |
| History/career/records | B+ | YELLOW | History queries/routes. | Legacy archive copy/enrichment. |
| Rivalries | B | YELLOW | Runtime rivalry watch. | Origin context. |
| Scenarios | B- | YELLOW | Scenario route/query. | Payroll history snapshots. |
| Settings/import/export | A- | GREEN | Settings save hooks. | Global save health UI. |
| Worker boundary | C+ | YELLOW | 56 direct web imports from `@mbd/sim-core`. | DTO cleanup. |

## 6. Domain Verdicts

Minor league verdict: B+ for new games, C+ for existing saves. The farm is more than storage, but it needs direct development controls, old-save upgrade support, and corrected readiness labels.

Player development verdict: B in the current dirty tree. The pipeline is real and now has a first plan-apply action path, but attachment still requires broader player agency: playing-time choices, mentor assignments, promotion context, profile-level controls, and story outcomes.

Scouting/draft verdict: Scouting B, Draft B- in the current dirty tree. The draft can become a franchise-defining event; autosave is now wired and focused-tested locally, but AI identity and full-gate validation remain.

AI organization verdict: C+. CPU clubs can function, but they need persistent identities that affect draft, development, trades, free agency, payroll, and history.

Dynasty history verdict: B+. Future history is strong; legacy saves and prospect-to-legend arcs need clearer continuity.

## 7. GOAT Gap Analysis

The gap to OOTP/Baseball Mogul/Football Manager-style greatness is not a lack of screens. It is system connection.

MBD needs:

1. Boringly reliable save persistence for every high-emotion mutation, including browser reload validation of the current dirty-tree fixes.
2. Prospect development controls that make farm decisions feel authored by the player.
3. CPU organizations with durable philosophies and no hidden cheating.
4. Scouting uncertainty that changes choices instead of only revealing ratings.
5. Draft classes with calibrated class depth, late-round value, and memorable misses.
6. Long-term history that remembers prospect origins, injuries, trades, rivalries, awards, records, and eras.
7. UI copy/data scale polish so real systems never look fake.

## 8. Recommended Next 25 Codex Implementation Slices

1. Browser-validate the current dirty-tree autosave/readiness fixes and land them cleanly.
2. Add browser smoke with reload after draft, pulse, ceremony, press, and dashboard readiness paths.
3. Add global last-saved/pending-save status.
4. Browser-validate and land the dirty-tree development-plan controls.
5. Add mentor assignment controls or relabel current mentorship as analysis-only.
6. Recalibrate setup farm grades and add canonical-seed variance test.
7. Browser-validate the current dirty onboarding nudge/finance fixes.
8. Refine onboarding finance materiality after the capping/spacing fix.
9. Build optional old-save authored-minors upgrade that preserves existing players.
10. Add deterministic AI org profile fields.
11. Feed AI org profiles into draft AI and test deterministic pick divergence.
12. Feed AI org profiles into development outcomes for CPU teams without hidden cheating.
13. Feed AI org profiles into trade/free-agency/payroll decisions.
14. Add draft class distribution tests for generational talent and late-round value.
15. Add roster-rule edge tests for Rule 5, 40-man, options, and waivers.
16. Add legacy archived-game copy and safe old-save history enrichment.
17. Add prospect-origin timeline badges and MLB debut/call-up moments.
18. Add rivalry origin summaries and era pages.
19. Convert highest-risk runtime `@mbd/sim-core` UI imports to worker DTOs.
20. Split app-shell overlay controller responsibilities after persistence behavior is stable.
21. Break the highest-risk circular dependencies.
22. Burn down unused export clusters reported by Knip.
23. Quiet web-test stderr warnings.
24. Re-run desktop/mobile/PWA manual release gates outside the Codex sandbox.
25. Regenerate status/guide/source docs after current fixes are accepted.

## 9. Top 100 Ranked Findings

| Rank | Severity | Title | Evidence | Affected files | Player impact | Technical impact | Recommended fix | Complexity |
|---:|---|---|---|---|---|---|---|---|
| 1 | P1 | Draft autosave fix is present in dirty tree but needs browser reload validation. | Focused tests and broad current-source gates passed for draft start, pick, watch, scouting, big-board, and signing autosave. | `apps/web/src/features/draft/hooks/useDraftActionHandlers.ts`, `useDraftActionHandlers.test.tsx`, `DraftPage.tsx` | Draft decisions should now persist, but players still depend on unlanded local changes. | Release truth depends on dirty source until accepted and browser-verified. | Browser-smoke and land/review current draft autosave changes. | Medium |
| 2 | P1 | App-shell pulse autosave fix is present in dirty tree but needs browser reload validation. | `persistShellMutation` now runs after monthly report acknowledgement/action; broad gates passed. | `apps/web/src/app/layout/AppLayout.tsx`, `AppLayoutShellAutosave.test.tsx` | Pulse acknowledgements should now persist. | Reload behavior still needs real-browser proof. | Browser-smoke and keep shell autosave tests. | Medium |
| 3 | P1 | App-shell decision autosave fix is present in dirty tree but needs browser reload validation. | `persistShellMutation` now runs after decision dismiss/action; broad gates passed. | `apps/web/src/app/layout/AppLayout.tsx`, `AppLayoutShellAutosave.test.tsx` | Dismissed decisions should now persist. | Decision queue reload behavior still needs real-browser proof. | Browser reload smoke. | Medium |
| 4 | P1 | Ceremony dismiss autosave fix is present in dirty tree but needs browser reload validation. | `persistShellMutation` now runs after ceremony dismiss; broad gates passed. | `apps/web/src/app/layout/AppLayout.tsx`, `AppLayoutShellAutosave.test.tsx` | Award overlays should no longer repeat after save. | Ceremony acknowledgement reload behavior still needs proof. | Browser reload smoke. | Medium |
| 5 | P1 | Press response autosave fix is present in dirty tree but needs browser validation. | `handlePressConferenceResponse` now responds and persists; broad gates passed. | `apps/web/src/app/layout/AppLayout.tsx`, `AppLayoutShellAutosave.test.tsx` | Press consequences should now persist. | Morale/news/owner reload and feedback behavior need proof. | Browser-check save/reload and UI refresh behavior. | Medium |
| 6 | P1 | Readiness percent bug is fixed in dirty tree but needs browser validation. | `normalizeProspectReadinessGrade` converts internal ratings to 20-80 and broad gates passed. | `apps/web/src/features/dashboard/lib/prospectReadiness.ts`, `dashboardPageTransforms.ts`, `prospectReadiness.test.ts` | Prospect guidance no longer says `229% readiness` in focused tests. | Browser route display still needs visual proof. | Browser-check dashboard/minors. | Medium |
| 7 | P1 | Farm report raw readiness display is fixed in dirty tree but needs browser validation. | Farm report now renders normalized `OVR` grades and broad gates passed. | `apps/web/src/features/dashboard/components/FarmReportCardBody.tsx`, `FarmReportCardBody.test.tsx` | Farm rows are clearer. | Browser route display still needs visual proof. | Route smoke. | Low |
| 8 | P1 | Current dirty source changes are not yet release-owned. | `git status` shows many modified/untracked code files beyond audit docs. | Draft, app-shell, dashboard source/test files | Players benefit only if these changes are accepted and shipped. | Release state can be ambiguous. | Review, stage intentionally, or separate from audit branch. | Medium |
| 9 | P1 | Development-plan controls are present in dirty tree but need browser validation. | `applyDevelopmentFocusPlan` mutates existing `developmentProgram`, Minors page autosaves, and focused tests passed. | `apps/web/src/workers/sim.worker.actions.ts`, `apps/web/src/features/minors/routes/MinorsPage.tsx`, `DevelopmentFocusBoard.tsx` | Prospect advice is now actionable if dirty changes land. | Browser save/reload and UX behavior still need proof. | Browser-smoke and land/review current development-plan changes. | Medium |
| 10 | P1 | Guided-start nudge fix is present in dirty tree but needs browser validation. | `GuidedStartNudgeCard` now uses `pointer-events-none` shell; focused and broad gates passed. | `apps/web/src/features/onboarding/nudges/GuidedStartNudgeCard.tsx`, `guidedStartNudges.test.tsx` | First decision should no longer be blocked if dirty changes land. | Browser click path still needs validation. | Onboarding browser smoke. | Medium |
| 11 | P1 | Direct UI imports from sim-core weaken worker boundary. | Static scan found 56 non-worker non-test web imports. | `apps/web/src/**` importing `@mbd/sim-core` | Future sim changes can break UI. | Boundary/DTO contract is porous. | Convert runtime-value imports to worker DTOs/shared contracts. | High |
| 12 | P1 | Setup farm grades appeared uniform. | Runtime farm filter only `C+`; visible cards all `C+ farm`. | `apps/web/src/workers/sim.worker.setup.ts:157-179`, `apps/web/src/features/setup/components/SetupTeamPickerPanel.tsx:141-145` | Team selection lacks farm differentiation. | Preview scoring thresholds underuse authored-minors variance. | Recalibrate farm scoring and test variance. | Medium |
| 13 | P1 | AI draft picks lack organization identity. | AI scores BPA/need/signability only. | `packages/sim-core/src/draft/draftAI.ts:155-201` | CPU teams feel interchangeable. | No org profile input to pick scoring. | Add deterministic org tendencies. | High |
| 14 | P1 | AI development identity is not symmetric. | User-team filter skips non-user reports. | `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts:638-656` | CPU clubs lack personality. | Identity effects are user-team scoped. | Add CPU org development profiles. | High |
| 15 | P2 | App shell autosave tests are currently isolated in a new dirty-tree file. | Focused `AppLayoutShellAutosave.test.tsx` passed. | `apps/web/src/app/layout/AppLayoutShellAutosave.test.tsx` | Good coverage if accepted. | Coverage is untracked until staged/committed. | Review whether to merge into existing AppLayout tests or keep separate. | Low |
| 16 | P2 | Draft autosave tests are present in dirty tree but need browser coverage. | Focused draft tests and broad gates passed. | `apps/web/src/features/draft/hooks/useDraftActionHandlers.test.tsx` | Draft save trust is covered locally. | Browser reload path still lacks coverage. | Add route reload smoke. | Low |
| 17 | P2 | Readiness helper handles internal/display scales but needs domain naming review. | Helper converts `410` to `65`, clamps display inputs. | `apps/web/src/features/dashboard/lib/prospectReadiness.ts` | Copy is clearer. | Field remains named `readiness` while output is OVR. | Consider DTO rename in a later cleanup. | Medium |
| 18 | P2 | Onboarding finance capping fix is present in dirty tree but needs browser validation. | `FinancialView` now shows four primary rows plus details overflow; focused and broad gates passed. | `apps/web/src/features/onboarding/components/chapters/FinancialView.tsx`, `FinancialView.test.tsx` | The main choice should be less buried if dirty changes land. | Browser layout needs validation. | Browser-check onboarding finance. | Medium |
| 19 | P2 | Finance name/position spacing fix is present in dirty tree but needs browser validation. | Focused test verifies `Rowan Zoric · 2B` and not `Rowan Zoric2B`; broad gates passed. | `FinancialView.tsx`, `FinancialView.test.tsx` | Copy trust improves if dirty changes land. | Browser layout needs validation. | Browser-check onboarding finance. | Low |
| 20 | P2 | Current broad technical gates pass, but browser/PWA manual validation remains. | Current typecheck, full test, build, and determinism pass. | Dirty draft/app-shell/dashboard/onboarding source files | Current fixes are technically green but not public-release proven. | Browser/PWA/install/offline/reload behaviors are outside unit gate proof. | Run browser/PWA release smoke before shipping. | Medium |
| 21 | P2 | Browser reload smoke is missing for newly fixed mutations. | Focused unit/component tests passed; no browser reload pass after draft/pulse/press/readiness changes. | Draft route, AppLayout overlays, dashboard route | Player save trust still needs real-browser proof. | Unit coverage does not prove IndexedDB/reload behavior. | Add reload smoke for high-value mutations. | Medium |
| 22 | P2 | Global last-saved status is still missing. | `DESIGN.md:81` flags visible autosave timestamp as open. | Save Hub/app shell/save UI | Player cannot verify durability. | Save health is not surfaced globally. | Add last-saved/pending/error status. | Medium |
| 23 | P2 | Draft room still lacks explicit saved/pending UI. | Autosave now exists in dirty tree, but no draft-room save-status surface was identified. | `apps/web/src/features/draft/**` | Player cannot tell if a pick is already durable. | Persistence state is not visible at the highest-stakes route. | Add saved/pending indicator. | Medium |
| 24 | P2 | Existing-save authored-minors policy is not surfaced in game. | Changelog documents new-game-only authored content behavior. | `CHANGELOG.md:7-10`, save/load UI | Players may expect new minors in old saves. | Upgrade eligibility is not communicated. | Add in-game old-save status/copy. | Medium |
| 25 | P2 | Mentorship board is derived, not persisted. | Query comment says derived from current roster only. | `apps/web/src/workers/sim.worker.queries.ts:3968-3975` | Mentorship feels non-actionable. | No saved mentorship assignment model. | Persist assignments or relabel. | High |
| 26 | P2 | Existing saves miss authored roster content. | Changelog says new games use content, existing saves are not replaced. | `CHANGELOG.md:7-10`, `apps/web/src/workers/sim.worker.setup.ts:256-264` | Long saves do not get authored farms. | No safe upgrade path. | Optional old-save content upgrade. | High |
| 27 | P2 | Old saves cannot backfill archived game links. | v34 migration initializes empty archives. | `packages/contracts/src/schemas/save.ts:2808-2828`, `packages/contracts/tests/save.migration.test.ts:340-349` | Old histories remain sparse. | Legacy snapshots lack archived-game payload. | Add copy and safe enrichment where possible. | Medium |
| 28 | P2 | CODEX game guide has save-version drift. | Guide says v33 while source is v34. | `docs/CODEX_GAME_GUIDE.md:497`, `packages/contracts/src/schemas/save.ts:515` | Future agents can make wrong save assumptions. | Documentation truth is stale. | Regenerate current-truth docs. | Low |
| 29 | P2 | STATUS has git-state drift. | STATUS says folder is not a git repo; `git status` works. | `STATUS.md:4502` | Agent workflow confusion. | Release/status notes are stale. | Refresh status. | Low |
| 30 | P2 | Previous local preview status is stale. | STATUS says local preview blocked, but Vite smoke worked. | `STATUS.md:59-65`, runtime Vite smoke | Release evidence can be misread. | Status docs conflict with current runtime. | Update release evidence. | Low |
| 31 | P2 | Save Hub lacks visible autosave timestamp. | DESIGN flags open question. | `DESIGN.md:81`, app shell/save UI | Player cannot verify durability. | Save health is not surfaced globally. | Add last-saved/pending/error status. | Medium |
| 32 | P2 | Catch-all route silently redirects. | Unknown route redirected to dashboard. | `apps/web/src/app/routes/index.tsx:181-182` | Bad URLs lose context. | Route guard lacks user-facing recovery. | Add not-found/recovery state. | Low |
| 33 | P2 | Duplicate standings/leaders aliases increase surface. | Both root and `/league/*` routes exist. | `apps/web/src/app/routes/index.tsx:156-161` | IA complexity grows. | Route aliases require duplicate maintenance. | Canonicalize or document aliases. | Low |
| 34 | P2 | Fresh direct route redirects without explanation. | Direct `/MBD/minors` in fresh context returned Save Hub. | Route guard/save loading behavior | Deep links can feel broken. | Guard does not explain missing active save. | Add "load a save first" banner. | Medium |
| 35 | P2 | `sim.worker.helpers.ts` is too large. | 5,468 lines. | `apps/web/src/workers/sim.worker.helpers.ts` | Future changes feel risky. | Cross-domain helper coupling. | Extract only around active slices. | High |
| 36 | P2 | `sim.worker.queries.ts` is too large. | 5,024 lines. | `apps/web/src/workers/sim.worker.queries.ts` | Read-model bugs are hard to localize. | Many route DTOs share one file. | Split by domain opportunistically. | High |
| 37 | P2 | `sim.worker.actions.ts` is too large. | 3,130 lines. | `apps/web/src/workers/sim.worker.actions.ts` | Mutation changes are hard to review. | Action domains are coupled. | Split high-risk actions. | High |
| 38 | P2 | `sim.worker.trade.ts` is very large. | 3,628 lines. | `apps/web/src/workers/sim.worker.trade.ts` | Trade AI fixes are risky. | Valuation/negotiation/state share one file. | Split trade domains with tests. | High |
| 39 | P2 | Save schema file is very large. | 3,120 lines. | `packages/contracts/src/schemas/save.ts` | Save edits are difficult to audit. | Schema/migrations concentrated. | Modularize carefully after release blockers. | High |
| 40 | P2 | Worker test file is extremely large. | 7,543 lines. | `apps/web/src/workers/sim.worker.test.ts` | Test intent is hard to inspect. | Regression coverage is hard to maintain. | Split by domain. | High |
| 41 | P2 | Authored content chunk remains large. | Build output showed `game-engine-content-v1` 245.97 kB. | Build output, `minorLeagueContent.ts` | Bundle headroom pressure. | Content payload affects initial/cache size. | Track compression/splitting. | Medium |
| 42 | P2 | Setup farm preview may use weaker scoring than farm assessment. | Preview uses top-minor average while setup assessment is richer. | `sim.worker.setup.ts:157-179`, `400-428` | Team selection underplays farm identity. | Duplicate farm scoring models. | Reuse richer farm assessment. | Medium |
| 43 | P2 | Day One finance includes low-value noise. | Runtime list contained many minimum-salary players. | Onboarding finance data builders | Decision focus diluted. | Materiality filter missing. | Filter to important extension decisions. | Medium |
| 44 | P2 | Dashboard ordinal copy showed `3 place`. | Runtime dashboard header. | Dashboard copy/formatter | Immersion polish drops. | Ordinal formatting bug. | Use ordinal formatter. | Low |
| 45 | P2 | Press quote had awkward mandate language. | Runtime quote used `chase compete` style wording. | Onboarding press copy builders | Owner/press voice feels generated. | Mandate labels leak into prose. | Humanize mandate phrase mapping. | Low |
| 46 | P2 | Draft AI does not use team scout accuracy. | `aiSelectPick` signature lacks scout profile. | `packages/sim-core/src/draft/draftAI.ts:155-201` | CPU draft boards are too similar. | Scouting uncertainty is not team-specific. | Include scout profile/noise. | High |
| 47 | P2 | User sim draft can autopick unexpectedly. | Fallback pick path exists. | `packages/sim-core/src/draft/draftAI.ts:221-226` | Player may miss a high-stakes pick. | Route guard/confirmation is too implicit. | Add explicit confirmation/guard. | Medium |
| 48 | P2 | Draft room lacks save-trust UI. | Many mutations, no save signal. | `apps/web/src/features/draft/**` | Player cannot tell if pick is saved. | Persistence state not surfaced. | Add saved/pending indicator. | Medium |
| 49 | P2 | Scouting and draft persistence parity now needs browser verification. | Scouting route already autosaved; dirty draft changes add autosave for draft scouting and broad gates pass. | `useScoutingPageController.ts:109-194`, `useDraftActionHandlers.ts:104-135` | Same action type should now behave consistently. | Parity still needs route reload proof. | Verify browser reload behavior. | Medium |
| 50 | P2 | Development plan action is currently Minors-focus-first, not a full profile editor. | Dirty-tree apply action exists from `DevelopmentFocusBoard`; player profile remains primarily read-only. | Minors route and player profile/development files | Prospect advice has a first action path, but broader plan editing is still limited. | Mutation surface is narrow and category-driven. | Add a profile-level development-plan editor if playtest needs it. | Medium |
| 51 | P2 | Development focus CTA is narrow and category-driven. | Dirty-tree `Apply plan` button exists, but it maps focus category to a generated program. | `sim.worker.pipeline.ts:211-252`, `DevelopmentFocusBoard.tsx`, `sim.worker.actions.ts` | Advice is actionable, but the player has limited choice depth. | Recommendation output now has one mutation path, not a full tuning model. | Add richer plan choice/editor if playtest needs more agency. | Medium |
| 52 | P2 | Staff mentorship has no save-backed action. | Mentorship query is derived. | `apps/web/src/workers/sim.worker.queries.ts:3968-3975`, staff route | Clubhouse strategy lacks agency. | No persistence model. | Add assignment flow. | High |
| 53 | P2 | Front-office effects are not audit-trailed clearly. | Summary text exists. | `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts:957-962` | Player cannot see why outcomes changed. | Effect history is not ledgered enough. | Add visible effect ledger. | Medium |
| 54 | P2 | Monthly identity consequences depend on story flag. | Consequence gate uses story flag. | `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts:750-815` | Repeated/blocked effects are hard to understand. | Debugging identity state is hard. | Expose monthly ledger. | Medium |
| 55 | P2 | User trade posture is current-season scoped. | Scoring reads current-season user trades. | `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts:421-456` | Long-term identity may reset too easily. | Multi-season memory is thin. | Add strategy history ledger. | Medium |
| 56 | P2 | AI development parity is unclear to players. | User-team-only development identity adjustment. | `sim.worker.frontOfficeIdentity.ts` | League competitors feel flatter. | CPU org state is not surfaced. | Surface AI org profiles. | High |
| 57 | P2 | Existing-save content policy is not surfaced in game. | Changelog documents policy only. | `CHANGELOG.md:9`, save/load UI | Players may expect new minors in old saves. | Upgrade eligibility not communicated. | Add in-game old-save status/copy. | Medium |
| 58 | P2 | Archived games begin only after v34. | Migration empty archive. | `packages/contracts/src/schemas/save.ts:2808-2828` | Old timelines lack box links. | Legacy archive limits are invisible. | Add "from upgrade forward" copy. | Low |
| 59 | P2 | Navigation registry is broad. | Many nav groups/routes. | `apps/web/src/app/navigationRegistry.ts:55-150` | New players can feel overloaded. | IA complexity needs tests. | Keep decision desk/assistant prominent. | Medium |
| 60 | P2 | App shell has too many overlay responsibilities. | AppLayout owns sim, reports, decisions, ceremonies, press. | `apps/web/src/app/layout/AppLayout.tsx` | Save bugs cluster there. | Single component owns unrelated mutation policies. | Extract overlay controllers after persistence fix. | High |
| 61 | P2 | `useWorker` action list can be mistaken for save safety. | Mutation methods are exposed without persistence policy. | `apps/web/src/shared/hooks/useWorker.ts:34-96` | Agents may wire actions without save. | Flow notification and persistence are separate. | Document or centralize mutation save policy. | Medium |
| 62 | P2 | Worker flow listeners notify only some results. | Flow-aware listener gate. | `apps/web/src/shared/hooks/useWorker.ts:148-152` | Some UI may not refresh after mutation. | Return contracts vary. | Audit mutation return contracts. | Medium |
| 63 | P2 | Press response caller does not visibly close/refresh. | Caller fires worker action and logs error only. | `apps/web/src/app/layout/AppLayout.tsx:520-523` | Consequence feedback is unclear. | UI state after mutation is underspecified. | Refresh news/owner and close or replace modal. | Medium |
| 64 | P2 | History archive matching can silently miss links. | Matching by compact refs. | `apps/web/src/workers/sim.worker.queries.ts:1436-1452`, `1475-1489` | Timeline links can be absent. | Matching lacks diagnostics. | Add diagnostics/tests for unlinked beats. | Medium |
| 65 | P2 | Payroll history is empty for scenario objectives. | Query returns empty history. | `apps/web/src/workers/sim.worker.queries.ts:4022-4025` | Scenario history goals feel incomplete. | Payroll snapshots are not persisted there. | Store future payroll snapshots. | Medium |
| 66 | P2 | Narrative/story logic is spread across large modules. | File inventory. | History bugs are hard to reason about. | Cross-module story coupling. | Keep narrative modules domain-isolated. | High |
| 67 | P2 | `/games/0` lacks main heading. | Route smoke loaded blank heading. | `/games/:gameIndex` route/components | Game page can feel blank. | Empty/invalid game context not handled clearly. | Add heading/empty state. | Low |
| 68 | P2 | Circular dependency scan reports 19 cycles. | `verify:cycles` output. | Hidden import-order regressions possible. | Build graph has cycles. | Break cycles opportunistically. | High |
| 69 | P2 | Structure scan reports many unused exports. | Knip found 225 unused exports. | Dead APIs confuse future agents. | Larger maintenance surface. | Burn down highest-risk clusters. | High |
| 70 | P2 | One unused dependency remains. | Knip found 1 unused dependency. | Dependency surface is noisy. | Package metadata drift. | Remove after confirming unused. | Low |
| 71 | P3 | Root has untracked audit RTF. | `git status`. | Repo hygiene noise. | Accidental artifact risk. | Move/track/ignore intentionally. | Low |
| 72 | P3 | Root has untracked OOTP app bundle. | `git status`. | Huge accidental artifact risk. | Worktree can become unwieldy. | Move outside repo or ignore. | Low |
| 73 | P3 | Root has untracked `output/`. | `git status`. | Artifact clutter. | Generated files can mask real diffs. | Ignore or relocate outputs. | Low |
| 74 | P3 | Calibration JSON dirty at audit start. | `git status`. | Harder review separation. | Generated state appears in code diff. | Commit/revert intentionally outside audit. | Low |
| 75 | P3 | Historical sim-core audit may be stale. | `packages/sim-core/AUDIT_REPORT.md` inspected as historical. | Agents may trust outdated findings. | Old audit not clearly superseded. | Mark historical/stale. | Low |
| 76 | P3 | README install command is slightly ambiguous. | Contributor section vs package manager field. | `README.md:48-59`, `package.json:6` | Setup ambiguity. | Docs drift. | Standardize `npx pnpm@9.15.4`. | Low |
| 77 | P3 | Docs reference older source snapshots. | Guide header/source notes. | `docs/CODEX_GAME_GUIDE.md` | Agents may rely on stale truth. | Documentation needs regeneration cadence. | Regenerate after fixes. | Low |
| 78 | P3 | Changelog v1/v34 chronology can be misread. | v1 launched with v33; current unreleased v34. | `CHANGELOG.md:19-24`, `68-73` | Release readers may confuse current state. | Changelog needs clear unreleased summary. | Add current-source note. | Low |
| 79 | P3 | Browser smoke creates local save state. | Runtime audit side effect. | Playwright/dev profile | Later checks can inherit state. | Smoke setup not fully isolated. | Use isolated profile/clear script. | Medium |
| 80 | P3 | Route count is high for new players. | Route table has 30+ gameplay routes. | `apps/web/src/app/routes/index.tsx:143-180` | Discoverability load remains high. | Navigation depends on guidance systems. | Keep decision desk prominent. | Medium |
| 81 | P3 | Dashboard first screen is dense. | Runtime dashboard snapshot. | Dashboard components | Players may miss primary action. | Priority hierarchy needs tuning. | Emphasize top next action. | Medium |
| 82 | P3 | Farm report can show no recent line summary on first day. | Runtime dashboard. | Dashboard farm report | Prospects feel partly empty. | No initial scouting-note fallback. | Add authored/initial note fallback. | Medium |
| 83 | P3 | First-day story arcs can show zero. | Runtime dashboard. | Dashboard/story widgets | Onboarding story momentum feels reset. | Day One identity not counted. | Seed active arc from onboarding. | Medium |
| 84 | P3 | Onboarding save copy is not save status. | Runtime final step. | Onboarding/save UI | Save confidence incomplete. | Write result not globally visible. | Show saved timestamp/result. | Low |
| 85 | P3 | Quick Start still enters full AGM sequence. | Runtime flow. | Setup/onboarding labels | Label may surprise players. | Mode naming unclear. | Clarify quick start. | Low |
| 86 | P3 | Fresh-context route smoke can lose active save. | Playwright behavior. | Browser smoke setup | Audits can misread route guards. | Smoke harness state is fragile. | Use persistent context or scripted save load. | Medium |
| 87 | P3 | Route guards need clearer explanation. | Fresh `/MBD/minors` redirects to hub. | Route guard/save loader | Deep links feel broken. | Guard lacks explanatory state. | Add banner/copy. | Medium |
| 88 | P3 | Setup filters can show one-option filters. | Runtime farm filter; filter options from previews. | `SetupTeamPickerPanel.tsx:55-60`, `141-145` | Filter feels pointless. | Filter UI not adaptive. | Hide single-value filters. | Low |
| 89 | P3 | Farm filter with one option wastes setup space. | Runtime setup. | `SetupTeamPickerPanel.tsx` | Adds setup noise. | Same as filter variance issue. | Hide until multiple values. | Low |
| 90 | P3 | Direct sim-core type imports are lower-risk but numerous. | Import scan. | `apps/web/src/**` | Type churn can cascade. | Type contracts are not isolated. | Use shared contract types where needed. | Medium |
| 91 | P3 | Onboarding progress lacks obvious back/edit control in snapshots. | Runtime onboarding. | Onboarding components | Mistakes may require restart/continue. | Flow edit state is limited. | Add back/edit if feasible. | Medium |
| 92 | P3 | Press questions could target more roster weaknesses. | Runtime press step. | Onboarding/press question builders | Misses pressure-point storytelling. | Question generation not fully contextual. | Add weakness/mandate mix. | Medium |
| 93 | P3 | First-day rivalry starts high without origin explanation. | Runtime rivalry intensity 78. | Rivalry DTO/UI | Rivalry feels pre-baked. | Origin context not surfaced. | Add rivalry origin copy. | Medium |
| 94 | P3 | Scenario payroll history is intentionally omitted. | Empty history query. | `apps/web/src/workers/sim.worker.queries.ts:4022-4025` | Challenge recaps less complete. | No historical payroll snapshots. | Persist going forward. | Medium |
| 95 | P3 | Empty broadcast/game modules compete with first-day tasks. | Runtime dashboard "No game selected" style state. | Dashboard broadcast/game widgets | Empty modules distract. | Empty state prioritization weak. | Collapse until games exist. | Low |
| 96 | P3 | Season 1 history widgets are necessarily empty. | Runtime dashboard/history widgets. | Dashboard/history routes | Lower dashboard can feel sparse. | Empty history surfaces are too visible early. | Defer empty widgets. | Medium |
| 97 | P3 | Readiness terminology is overloaded. | Readiness scan and runtime outputs. | Dashboard, onboarding, front-office DTO/copy | Players confuse OVR/readiness/ETA. | Label taxonomy is inconsistent. | Standardize terms. | Medium |
| 98 | P3 | Worker fatal-error toasts are generic. | Generic toast recovery path. | `apps/web/src/shared/hooks/useWorker.ts:169-178` | Players may not know save safety. | Error classification lacks save-risk context. | Tailor mutation/save-risk errors. | Medium |
| 99 | P3 | Required audit artifacts were not previously present. | New required files had to be created from consolidated evidence. | Repo root audit docs | Future agents might miss audit contract/history. | Artifact discovery was incomplete. | Link artifact set from status/docs after approval. | Low |
| 100 | P3 | Governing audit goal lives outside repo. | File supplied at `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md`. | Audit workflow docs | Future reruns may not find the rubric. | Audit contract is not versioned with repo. | Copy/link into project docs if Kevin approves. | Low |
