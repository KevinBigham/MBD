# MBD AI Organization Audit

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Verdict

Status: YELLOW trending RED for GOAT ambition. Grade: C+.

CPU teams can participate in the world: they draft, trade, sign, manage rosters, appear in standings/history, and generate league context. The gap is organizational identity and long-run agency. AI logic appears more heuristic than club-specific, and some front-office/development identity effects are user-team-only. That is enough for a playable league but not enough for a 30-to-100-year dynasty where CPU clubs create believable history without the player carrying the world.

## Capability Review

| CPU org capability | Evidence | Status | Audit call |
|---|---|---|---|
| Draft intelligently | `packages/sim-core/src/draft/draftAI.ts:155-201` scores BPA/need/signability. | YELLOW | Functional, not club-specific enough. |
| Develop prospects | Development systems exist; `applyMonthlyDevelopmentIdentity` skips non-user teams. | YELLOW | AI progression exists, but org identity parity is weak. |
| Promote/demote logically | Roster/minors/offseason systems exist. | YELLOW | Needs targeted AI roster trap/playtest review. |
| Trade fairly | `apps/web/src/workers/sim.worker.trade.ts` is extensive and route persistence exists. | YELLOW | Large module; keep fairness tests high priority. |
| Rebuild/contend | Team timeline/archetype concepts exist in setup/front-office. | YELLOW | Need CPU strategy profiles and multi-season memory. |
| Manage payroll | `sim.worker.budget.ts` has difficulty-adjusted budget/appeal helpers. | YELLOW | No hidden cheating found in inspected helpers; AI payroll depth still needs long-run tests. |
| Protect prospects | Draft/roster/trade systems have prospect values. | YELLOW | Explicit CPU prospect-protection identity not found. |
| Handle injuries | Injury systems exist. | YELLOW | AI injury replacement workflow not audited as strong. |
| Balance MLB roster vs farm | Roster systems and farm reports exist. | YELLOW | AI farm/mlb balance needs trap tests. |
| Avoid unrealistic roster traps | Broad tests pass. | YELLOW | Needs targeted long-run AI org soak. |

## Findings

| Severity | Finding | Evidence | Player impact | Technical impact | Next vertical slice |
|---|---|---|---|---|---|
| P1 | AI organizations lack durable identity across draft/development/trade/free agency. | `draftAI.ts:155-201`; `frontOfficeIdentity.ts:638-656`; broad worker/trade/budget modules. | CPU clubs feel interchangeable in long saves. | Strategy inputs are not centralized or persisted as org profiles. | Add deterministic AI org profiles and feed them into each decision lane. |
| P2 | User front-office development effects skip CPU teams. | `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts:638-656`. | Player org feels special while league competitors are flatter. | Development identity is applied only to `state.userTeamId`. | Add passive CPU development identity effects with no hidden cheating. |
| P2 | Draft AI does not receive scout quality, risk appetite, market, or philosophy. | `packages/sim-core/src/draft/draftAI.ts:155-201`. | Draft boards do not create memorable club personalities. | Pick scoring is not organization-aware. | Extend draft AI input with org profile and tests. |
| P2 | Multi-season identity memory is thin/unclear. | Front-office scoring reads current-season user trade posture in `frontOfficeIdentity.ts:421-456`. | Rebuild/contend narratives may reset too easily. | Long-run org state needs durable summary fields or derived ledgers. | Add yearly AI/user strategy ledger. |
| P2 | Trade AI module size is high risk. | `apps/web/src/workers/sim.worker.trade.ts` is 3,628 lines. | Fixing AI trades can create regressions. | Large cross-domain module slows safe iteration. | Split negotiation, valuation, needs, and active-talks tests. |

## GOAT Standard Gap

OOTP/Football Manager-style saves are memorable partly because rival organizations develop reputations: a club that hoards prospects, a club that overpays veterans, a club that drafts college arms, a club that rebuilds aggressively. MBD has the data and route surface to tell those stories, but the AI does not yet appear to own durable club identities that drive decisions across decades.

## Required AI Org Slices

1. Define deterministic AI org profile fields: risk, patience, scouting trust, development preference, payroll posture, trade aggression, prospect protection.
2. Apply profile to draft AI and test two clubs make different deterministic picks from the same board.
3. Apply profile to development/progression environment for CPU teams, with no hidden cheating.
4. Apply profile to free agency/payroll and trade valuations.
5. Add league history UI that explains why notable CPU clubs act differently.
