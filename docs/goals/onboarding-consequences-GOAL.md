# GOAL: Wire Onboarding Choices Into Long-Term Game Consequences

## Mission

Implement the smallest complete version of the onboarding consequence system described in `docs/goals/onboarding-consequences-PLAN.md`.

Stop only when every item in **Done When** is satisfied or a **Pause Condition** is hit.

## Read First

Before editing, inspect:

- `docs/goals/onboarding-consequences-PLAN.md`
- `README.md`
- `DESIGN.md`
- `package.json`
- `packages/contracts/src/schemas/franchise.ts`
- `packages/contracts/src/schemas/narrative.ts`
- `packages/contracts/src/schemas/save.ts`
- `apps/web/src/workers/sim.worker.onboarding.ts`
- `apps/web/src/workers/sim.worker.setup.ts`
- `apps/web/src/workers/sim.worker.actions.ts`
- `apps/web/src/workers/sim.worker.consequences.ts`
- `apps/web/src/workers/sim.worker.narrative.ts`
- `apps/web/src/workers/sim.worker.queries.ts`
- `apps/web/src/workers/sim.worker.helpers.ts`
- `apps/web/src/features/front-office/routes/FrontOfficePage.tsx`
- `packages/sim-core/src/onboarding/agmCandidates.ts`
- `packages/sim-core/src/onboarding/flowEngine.ts`
- `packages/sim-core/src/onboarding/staffHiring.ts`
- `packages/sim-core/src/league/narrativeState.ts`
- `packages/sim-core/src/league/frontOffice.ts`
- `packages/sim-core/src/roster/freeAgency.ts`
- `packages/sim-core/src/roster/minorLeagues.ts`
- `packages/sim-core/src/player/developmentPipeline.ts`
- `packages/sim-core/src/player/developmentSetbacks.ts`
- `packages/sim-core/src/draft/draftScouting.ts`
- `packages/sim-core/src/scouting/international.ts`
- `packages/sim-core/src/narrative/pressConferences.ts`
- related existing tests
- existing root `GOAL.md`, `STATUS.md`, and `.logs/goal-progress.md` only for historical context; they are from earlier completed work and are not this mission's spec

## Product Contract

Every revised onboarding choice must have at least one real mechanical effect and one visible/player-understandable consequence surface.

The player should be able to answer:

- What did this choice change mechanically?
- Where can I see the effect?
- How can this choice help or hurt me later?

Prefer:

- existing state containers over new save schema;
- small deterministic modifiers over wild balance swings;
- monthly/action-based consequences over cosmetic one-time copy;
- focused tests over broad brittle tests;
- UI visibility in existing Front Office surfaces over a new standalone screen.

## Allowed Write Scope

Allowed:

- `apps/web/src/workers/`
- `apps/web/src/features/front-office/`
- `apps/web/src/features/scouting/` only if needed for visibility
- `apps/web/src/features/onboarding/` only if needed for persistence or display
- `packages/contracts/src/schemas/` only if a schema change is truly necessary
- `packages/sim-core/src/`
- tests colocated with or related to changed files
- `docs/goals/onboarding-consequences-PLAN.md` if implementation discoveries require spec clarification
- `.logs/goal-progress.md`
- `STATUS.md`

## Protected Scope

Do not modify unless required, justified, and logged:

- save schema version or migrations
- unrelated route/page rewrites
- app layout/navigation
- design-token system
- package manager or dependency files
- generated assets
- service worker/PWA setup
- production secrets/config

## Non-Negotiables

- Do not delete, skip, or weaken tests to make checks pass.
- Do not remove existing gameplay systems.
- Do not introduce a new framework, database, external service, or major dependency.
- Do not use `Math.random` for new sim/gameplay randomness; follow existing deterministic RNG patterns.
- Do not use licensed real-world baseball marks.
- Do not make broad balance changes outside onboarding consequence wiring.
- Do not keep polishing after the done criteria pass.

## Milestone Loop

For each milestone:

1. Inspect the relevant current code and behavior.
2. State the current checkpoint in the transcript.
3. Implement the smallest useful change.
4. Run the smallest relevant validation.
5. Fix failures before moving on.
6. Log progress in `.logs/goal-progress.md`.

Each log entry must include:

- timestamp;
- milestone;
- files changed;
- checks run;
- result;
- blocker or next step.

## Required Milestones

1. Persistence and baseline:
   - synchronize revised onboarding completion into `franchise.dayOne`;
   - apply deduped one-time baseline consequences from AGM/mandate/postures;
   - preserve save compatibility if possible.

2. Identity module and query:
   - add a focused front-office identity/consequence module;
   - add a worker query for the current front-office identity view;
   - surface identity/alignment on Front Office page.

3. Scouting director mechanics:
   - wire draft, international, and pro scouting focus into effective report confidence/accuracy;
   - add focused tests.

4. Owner, spending, trade, and monthly alignment:
   - feed real alignment into owner evaluation;
   - add monthly mandate/spending/trade posture consequences;
   - update owner/fan/front-office/team state and briefings/news where appropriate.

5. Development and prospect risk:
   - wire development posture and AGM identity into development, promotion recommendations, and prospect risk;
   - add focused tests.

6. Press tone:
   - apply press `fanSentimentDelta`;
   - compare responses against onboarding media tone;
   - add consistency/backlash consequences and tests.

7. End-to-end verification:
   - verify onboarding, Front Office identity display, and at least one monthly consequence path;
   - run full relevant checks.

## Validation Loop

Use the repo package manager:

```text
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH
```

Run targeted tests after each milestone where possible.

Before completion, attempt at minimum:

```text
pnpm typecheck
pnpm test
pnpm build
```

If browser verification is feasible, start the app:

```text
pnpm --filter @mbd/web dev --host 127.0.0.1 --port 5174
```

Then verify:

- onboarding can complete with the revised choices;
- Front Office page shows the identity/alignment information;
- at least one monthly sim advancement applies an onboarding-based consequence;
- no console-breaking errors appear in the checked flow.

If port 5174 is occupied, use the Vite-reported alternate port and document it.

## Evaluator-Visible Proof

Before declaring success, include proof in the transcript and in `STATUS.md`:

- exact commands run;
- pass/fail result;
- relevant output summary;
- browser/manual verification steps;
- screenshot paths if screenshots are captured;
- final changed-file inventory;
- known unrelated failures with evidence;
- whether save schema version changed.

This local folder may not be a git repo. If `git status` is unavailable, use a manual changed-file inventory.

## Autonomy Rules

When the plan is silent, make reasonable implementation decisions that:

- match existing repo patterns;
- keep the diff reviewable;
- preserve current save compatibility;
- keep modifiers modest and tunable;
- make consequences visible to the player;
- avoid new dependencies.

Log assumptions in `.logs/goal-progress.md` and keep going.

## Pause Conditions

Pause and write the blocker in `STATUS.md` only if:

- a required secret/API key/account is missing;
- a destructive migration, data deletion, or irreversible action appears necessary;
- the same validation fails after 3 serious repair attempts;
- save schema changes become unavoidable and the correct migration path is unclear;
- the mission expands into a second unrelated feature;
- baseline failures are too broken to distinguish from mission failures;
- product scope conflicts with the plan in a way that requires user choice.

## Done When

Stop only when all are true:

- All seven onboarding choice categories have real mechanical effects.
- At least one effect from each category is visible through UI, news, briefing, owner/fan/front-office state, scouting reports, or monthly pulse.
- Revised onboarding completion fully persists the chosen identity.
- Monthly or action-triggered consequences are deduped and do not spam.
- Front Office page exposes the current identity/alignment clearly.
- Focused tests cover the important new mechanics.
- `pnpm typecheck`, `pnpm test`, and `pnpm build` pass, or unrelated baseline failures are documented with evidence.
- Browser/manual verification confirms the main flow if feasible.
- `.logs/goal-progress.md` includes milestone logs.
- `STATUS.md` includes:
  - what shipped;
  - files changed;
  - commands/checks run;
  - results;
  - browser/screenshot evidence if applicable;
  - known limitations;
  - risks;
  - rollback notes if relevant;
  - exact suggested next `/goal`.

## Final Report

In the final response, report:

- concise summary of what shipped;
- files changed;
- tests/checks run and results;
- browser/manual evidence;
- known risks or limitations;
- exact next `/goal` prompt.
