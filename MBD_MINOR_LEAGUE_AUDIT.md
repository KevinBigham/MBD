# MBD Minor League Audit

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Verdict

Status: YELLOW. Grade: B+ for new dynasties, C+ for long-running existing saves.

The farm system is no longer just storage. New games receive a large authored organizational world, affiliate identities, depth charts, prospect reports, and development/farm surfaces. It is not yet a fully living player-development machine because key levers remain read-only or advisory, existing saves do not get the authored content, and readiness/promotion language still needs browser validation after the dirty-tree display fix.

## Evidence

| Requirement | Evidence | Result |
|---|---|---|
| Affiliate structure | `apps/web/src/workers/content/minorLeagueContent.ts:89-98` defines MLB/AAA/AA/A+/A/Rookie/International distribution; `MBD_Minor_League_Deliverables/` contains division packets. | GREEN |
| Roster sizes | Memory/source docs establish roster sizes 28/28/25/25/20/15 plus 26-man MLB and 40-man cap; authored content injects 169 players per org. | GREEN |
| Promotions/demotions | Roster/minors/offseason systems exist, but current audit found no direct player-facing development-plan mutation and promotion-control depth needs targeted edge tests. | YELLOW |
| Playing time | Dirty-tree development focus cards can apply a plan, but direct playing-time controls were not found. | YELLOW |
| Prospect bottlenecks | Farm report and onboarding identify readiness buckets, projected peaks, and top prospects. | YELLOW |
| Development opportunities | `DevelopmentFocusBoard`/pipeline advice surface opportunities. | YELLOW |
| Injury replacement | Injury systems exist in sim core and roster helpers, but this audit did not find a player-facing minor-league injury-replacement workflow comparable to MLB roster guidance. | YELLOW |
| Organizational depth | New-game authored content is strong; existing-save upgrade absent per `CHANGELOG.md:7-10` and setup-only injection in `sim.worker.setup.ts:256-264`. | YELLOW |
| Minor-league UI | `/minors` loaded in Playwright smoke; dashboard farm report and onboarding farm chapter are visible. | GREEN |
| Minor-league stats/history | Player/history systems exist, but old-save archive links are sparse after v34 migration. | YELLOW |
| Rule 5 / 40-man interaction | Offseason route exists and autosaves; roster-rule edge cases need a focused pass. | YELLOW |
| Waivers/options interaction | If present, not surfaced strongly enough in the minor-league player journey during this pass. | YELLOW |

## Critical Findings

| Severity | Finding | Evidence | Player impact | Technical impact | Next vertical slice |
|---|---|---|---|---|---|
| P1 | Readiness percent bug is fixed in dirty tree but needs browser validation. | `normalizeProspectReadinessGrade` now converts internal ratings to 20-80 display grades; focused tests and broad current-source gates passed. | Farm advice is clearer if dirty changes land. | DTO field is still named `readiness`, so naming cleanup remains. | Browser-check dashboard/minors. |
| P1 | Development focus plan action is present in dirty tree but needs browser validation. | `applyDevelopmentFocusPlan` updates existing `developmentProgram`; Minors page autosaves; focused tests passed. | Player can execute the first layer of prospect recommendations if dirty changes land. | Browser save/reload behavior still needs proof. | Browser-smoke and land/review current plan action. |
| P2 | Mentorship is derived, not assignable. | `sim.worker.queries.ts:3968-3975` says mentorship board is derived from current roster only. | Mentorship reads like a system but is not agency. | No persisted assignment model. | Persist assignments or relabel as analysis-only. |
| P2 | Existing saves do not receive authored roster content. | `CHANGELOG.md:7-10`; `sim.worker.setup.ts:256-264`. | Long-running saves miss the new organizational world. | Upgrade path intentionally absent. | Add optional old-save minors flavor/fill upgrade that preserves existing players. |
| P2 | Setup farm grades appeared uniform. | Runtime setup filter showed only `C+`; `sim.worker.setup.ts:157-179`, `400-428`; `SetupTeamPickerPanel.tsx:141-145`, `208-212`. | Team selection underplays farm-system differentiation. | Preview scoring may not reflect authored-minors depth. | Recalibrate farm-grade thresholds and add canonical-seed variance test. |

## Player Journey Review

| Stage | Clear | Confusing or trust-breaking | Exciting | Missing emotionally | Next good click |
|---|---|---|---|---|---|
| New Dynasty | Team picker and Day One farm chapter explain top prospects. | Farm grade uniformity weakens selection. | Authored prospects create immediate identity. | No guarantee old saves get same depth. | Pick org, then inspect top prospects in onboarding. |
| Opening Day | Dashboard farm report and `/minors` are visible. | Dirty-tree readiness fix needs browser validation; first-day lines can still say no recent summary. | Farm report identifies names and levels. | First-day lines can feel partly empty. | Open `/minors`, filter top prospects. |
| First Month | Development focus can generate advice after sim. | Advice lacks a direct action. | Reports can name breakouts/bottlenecks. | Player cannot feel like a farm director yet. | Promote, adjust plan, assign mentor once controls exist. |
| Trade Deadline | Prospects can become trade chips through roster/trade systems. | Need clearer protect/available/future-role controls. | Deadline stakes can emerge. | Prospect history is still thin early. | Compare prospect value before trading. |
| September Call-ups | Offseason/roster systems imply roster windows. | September-specific call-up flow needs clearer review. | Call-up moment should be emotional. | No obvious prospect-to-debut ceremony found. | Add call-up shortlist/ceremony. |
| Year 2 | New draft/minors feed should begin compounding. | Existing-save/authored divide persists. | First homegrown arcs emerge. | Development plan agency still thin. | Review each affiliate and plan changes. |
| Year 5 | Farm depth can produce stars/trade chips. | AI org development parity uncertain. | Dynasty identity starts forming. | AI clubs may feel less distinct. | Compare org pipelines league-wide. |
| Year 10+ | History and records can remember farm graduates. | Old saves have sparse archived games. | Prospect-to-legend arcs possible. | Missing retired-number/HOF depth if not fully surfaced. | Add prospect-origin timeline badges. |

## Must Fix Before Public Release

1. Browser-validate the dirty-tree readiness/autosave fixes.
2. Browser-validate the dirty onboarding nudge/finance-list fixes.
3. Browser-validate the dirty development-plan action, then add mentorship/playing-time controls.

## Long-Term Greatness Work

1. Save-backed development plans, playing-time expectations, and mentor assignments.
2. Optional existing-save authored minors upgrade.
3. League-wide farm rankings, org philosophies, and AI development differentiation.
4. Prospect origin/history badges from Rookie/International to MLB debut, award, trade, injury comeback, or bust.
