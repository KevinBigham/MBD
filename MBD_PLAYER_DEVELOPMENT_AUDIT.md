# MBD Player Development Audit

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Verdict

Status: YELLOW. Grade: B in the current dirty tree.

MBD has real player development substance: generated and authored prospects, current/potential ratings, development reports, coaching/identity effects, aging/progression tests, and narrative hooks. The current dirty tree adds a first save-backed action path from development focus cards to `applyDevelopmentFocusPlan`, using the existing persisted `developmentProgram` field and Minors-page autosave. The remaining gap is breadth: playing time, mentorship, promotions, and profile-level plan editing are still not a full farm-director toolkit.

## Development Coverage

| Area | Evidence | Status | Audit call |
|---|---|---|---|
| Prospect generation | New-game setup uses authored content map plus generated state in `sim.worker.setup.ts:256-264`. | GREEN | Strong for new games. |
| Potential/current ratings | Runtime top prospects had current/potential/scouting data; dashboard/minors display ratings. | GREEN | Rich enough for attachment if labels are correct. |
| Development curves | `sim.worker.pipeline.ts` builds trajectory/focus advice; dirty-tree plan-apply mutation and focused tests passed. | YELLOW | First action path exists; broader controls remain thin. |
| Aging curves | Sim-core progression/regression tests passed in full suite. | GREEN | No blocker found. |
| Breakout/bust rates | Onboarding farm chapter surfaced breakout probabilities and projected peaks. | YELLOW | Good presentation; needs longitudinal validation/playtest. |
| Injury impact | Injuries exist in baseball system; injury comeback storytelling not yet strong in audited UI. | YELLOW | Add player-story hooks. |
| Scouting accuracy | Scouting identity/report confidence exists; draft AI does not receive team scout accuracy in `aiSelectPick` signature. | YELLOW | User scouting is stronger than AI scouting identity. |
| Archetypes | Setup/team/front-office identity and player archetypes appear in UI. | YELLOW | Need clearer org-specific development effects for AI. |
| Coaching/development environment | `sim.worker.frontOfficeIdentity.ts` applies user-team development identity effects. | YELLOW | It skips non-user teams in `applyMonthlyDevelopmentIdentity`. |
| Position-specific growth | Position/role data is present; no major source-backed issue found in this pass. | YELLOW | Needs targeted tests before GOAT claim. |
| Pitcher/hitter differences | Sim-core models pitchers/hitters; this pass did not isolate pitcher/hitter development balance. | YELLOW | Add calibration playtest for long-term curves. |

## Core Findings

| Severity | Finding | Evidence | Player impact | Technical impact | Next vertical slice |
|---|---|---|---|---|---|
| P1 | Development focus plan action is present in dirty tree but needs browser validation. | `applyDevelopmentFocusPlan` updates persisted `developmentProgram`; Minors page autosaves; focused tests passed. | Prospect management is less passive if dirty changes land. | Browser save/reload behavior and UX feedback still need proof. | Browser-smoke and land/review current plan action. |
| P1 | Readiness scale fix is present in dirty tree but needs browser validation. | `normalizeProspectReadinessGrade` converts internal ratings to 20-80 display grades; focused tests and broad current-source gates passed. | Players get clearer prospect guidance if dirty changes land. | DTO field naming still deserves cleanup because the source value remains called `readiness`. | Browser-check dashboard/minors. |
| P2 | Mentorship is only derived. | `sim.worker.queries.ts:3968-3975`. | Players cannot intentionally pair veterans and prospects. | No persisted mentorship model. | Save-backed mentorship assignments or explicit read-only labeling. |
| P2 | User development identity is not symmetric for CPU teams. | `sim.worker.frontOfficeIdentity.ts:638-656` skips reports not matching `state.userTeamId`. | AI clubs develop less personality over decades. | AI org strategy layer is missing or not wired into development. | Add deterministic AI org development profiles. |
| P2 | Existing saves miss authored development pipeline identities. | `CHANGELOG.md:7-10`, setup-only injection. | Long saves lack new prospect texture. | Save upgrade policy is conservative but player-visible. | Optional upgrade that preserves old players. |

## Emotional Attachment Review

| Arc | Current support | Gap |
|---|---|---|
| Rookie ball to superstar | Authored youth, ratings, farm reports, history systems can support it. | Need visible origin timeline and player-controlled development steps. |
| Bust | Development reports can imply risk. | Need clearer bust explanations, coach/scout disagreement, and postmortem history. |
| Trade chip | Trade center can value prospects. | Need protect/available/future-role markings and prospect history in trade UI. |
| Injury comeback | Injuries exist. | Comeback narrative is not a strong audited surface. |
| Franchise legend | Records/history/career routes exist. | Need prospect-origin badges and retired-number/HOF depth if absent. |

## Recommended Slices

1. Browser-validate the current dirty-tree readiness DTO/copy fix.
2. Browser-validate and land the dirty-tree development-plan controls.
3. Add mentorship assignment model or relabel current board.
4. Add AI org development profiles with deterministic tests.
5. Add origin-story timeline entries for draft/IFA/minor-league debut, MLB debut, first award, trade, injury comeback, and retirement.
