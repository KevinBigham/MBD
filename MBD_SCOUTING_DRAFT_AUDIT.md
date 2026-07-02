# MBD Scouting And Draft Audit

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Verdict

Status: YELLOW. Grade: Scouting B, Draft B- in the current dirty tree.

Scouting creates more than pure rating reveal: pro, IFA, draft reports, confidence, accuracy, hires, and conflict surfaces exist. The draft has enough structure to feel important, and the current dirty tree wires autosave for draft start, pick, scout, big-board, signing, and sim-rest actions with focused tests plus broad current-source gates passing. Release trust still requires browser reload smoke and ownership review. AI draft logic is deterministic and functional, but it lacks team philosophy, scout quality, and org risk identity.

## Scouting Review

| Area | Evidence | Status | Audit call |
|---|---|---|---|
| Scouting reports | `useScoutingPageController.ts:109-194` handles pro reports, IFA reports, IFA signings, pool trades with autosave. | GREEN | Strong route-level persistence. |
| Fog of war/uncertainty | Scouting confidence/accuracy helpers and front-office identity tests exist. | YELLOW | Good foundation; validate long-run report error. |
| Draft scouting | Dirty-tree draft scouting autosave test passed. | YELLOW | Browser reload smoke pending. |
| International scouting | IFA route actions exist and autosave. | GREEN | Good current-player agency. |
| Player discovery | Scouting and player index routes expose player universe. | YELLOW | Discovery is present; emotional discovery loops can deepen. |
| Projection language | Onboarding/farm/scouting copy gives projections. | YELLOW | Some copy/formatting breaks immersion. |
| UI clarity | `/scouting` loaded; onboarding scouting chapter exists. | YELLOW | Draft/scouting persistence inconsistency creates mental-model risk. |

## Draft Review

| Area | Evidence | Status | Audit call |
|---|---|---|---|
| Draft class generation | Draft pool and 20-round draft systems exist. | GREEN | Functional. |
| Class depth | Draft room, scouting, signing, post-draft grades exist. | YELLOW | Needs long-run distribution/calibration audit. |
| Talent distribution | Sim-core draft logic and tests exist. | YELLOW | Needs generational/late-round frequency playtest evidence. |
| Generational prospect frequency | Not specifically verified in current audit. | YELLOW | Add deterministic class-distribution tests. |
| Late-round value | Draft supports rounds; late-round outcome depth needs playtest. | YELLOW | Add long-run value calibration. |
| Scouting interaction | Dirty-tree draft scouting autosaves in focused tests and broad gates pass. | YELLOW | Validate in browser reload smoke. |
| Draft AI | `draftAI.ts:155-201` scores BPA/need/signability. | YELLOW | No org identity or scout quality input. |
| Signing logic | Dirty-tree signing autosave test passed. | YELLOW | Validate in browser reload smoke. |
| Post-draft development | Draftees feed into player/development systems; dirty-tree Minors focus cards can apply plans. | YELLOW | Need clearer draft-to-minors CTA and broader control depth. |

## Draft Save-Trust Findings

| Severity | Finding | Evidence | Player impact | Technical impact | Next vertical slice |
|---|---|---|---|---|---|
| P1 | Draft autosave fix is present but needs browser reload validation. | Focused tests and broad current-source gates passed for start, pick, watch, scout, big-board, and signing autosave. | Draft decisions should now persist if dirty changes land. | Release truth depends on uncommitted source until accepted. | Run browser reload smoke and ownership review. |
| P2 | Draft room lacks explicit save-status UI. | Autosave is wired in dirty tree, but no saved/pending draft-room surface was identified. | Player cannot see whether the pick is durable. | Save state is not exposed at the highest-stakes route. | Add saved/pending indicator. |
| P2 | Draft AI lacks org identity. | `draftAI.ts:155-201`. | CPU clubs feel interchangeable. | Team philosophy/scout/risk inputs absent. | Add deterministic org tendencies. |
| P2 | Draft class distribution needs long-run calibration proof. | Current audit did not isolate generational/late-round rates. | Draft value may feel too predictable or flat. | No release gate for class distribution. | Add deterministic distribution tests. |
| P2 | Post-draft development CTAs are weak. | Draftees feed systems, but development controls remain thin. | Player loses the draft-to-farm handoff. | Draft and development loops are loosely joined. | Add plan/affiliate CTAs after draft. |
| P2 | Draft reload behavior needs browser smoke. | Focused unit tests passed; no post-change reload smoke. | Save trust still needs real-browser proof. | IndexedDB/reload path unverified after dirty changes. | Add reload smoke. |

## AI Draft Findings

| Severity | Finding | Evidence | Player impact | Technical impact | Next vertical slice |
|---|---|---|---|---|---|
| P2 | AI draft selection lacks organization identity. | `packages/sim-core/src/draft/draftAI.ts:155-201`. | CPU teams feel interchangeable over decades. | AI scoring accepts team id/roster/RNG but not philosophy, scout quality, risk appetite, or market. | Add deterministic org draft tendencies and tests. |
| P2 | AI scouting accuracy is not part of draft signature. | `draftAI.ts:155-201`. | Scout departments do not visibly shape CPU boards. | Draft scoring may use scouting grade without team-specific error model. | Feed scout profile/noise into CPU board ranking. |
| P2 | User sim draft can autopick if no preselected pick. | `draftAI.ts:221-226`. | Player may miss high-stakes control. | Fallback behavior needs explicit UI confirmation. | Add route guard/confirmation. |

## Required Next Slices

1. Full-gate and browser-reload validation for the current dirty draft autosave changes.
2. Save-trust UI in draft room showing saved/pending state.
3. Org-specific draft AI profiles with deterministic variance tests.
4. Draft class distribution tests for generational talent, late-round value, and bust/breakout rates.
5. Post-draft player-development CTAs from draftee card to plan/affiliate assignment.
