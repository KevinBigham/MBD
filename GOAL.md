# GOAL.md — Sprint 2: Revised Onboarding becomes canonical

> Single-mission contract for Codex (or any one-shot coding agent).
> Format: Goal Packet v2.0 — Kevin's one-shot ritual.
> Sprint 1 cleanup is **already merged** to `main` ([#74](https://github.com/KevinBigham/MBD/pull/74)). This branch (`goal/sprint-2-revised-onboarding`) is rebased on top.

## Mission

Refactor `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx` so that the `/onboarding` route drives the **AGM-based revised onboarding flow** exposed by `useWorker()` — `getAGMCandidates`, `getRevisedOnboardingData`, `applyStaffHires`, `applyScoutingHire`, `completeRevisedOnboarding` — instead of the **Day-One** worker surface it currently uses (`getDayOneSession`, `advanceDayOneIntro`, `chooseDayOneAGM`, `advanceDayOneOrgReview`, `setDayOneSeasonGoal`, `setDayOneBudgetAllocation`, `setDayOneOpeningPlan`, `setDayOneDevelopmentPlan`, `resolveDayOneCrisis`, `finishDayOne`).

Once the revised flow drives the route, decide what to do with the Day-One worker surface and either remove it from `useWorker.ts` + `sim.worker.onboarding.ts` (preferred if redundant) or keep it documented as a separate path.

Stop only when every item in **Done When** is satisfied or a **Pause Condition** is hit.

## Background (why this exists)

A deep-dive audit found that the AGM-based **revised onboarding API surface** is fully wired in `sim.worker.onboarding.ts` and `useWorker.ts` but has zero UI consumers. The current `/onboarding` page imports `useWorker` and calls the Day-One methods instead. Both flows live in `packages/sim-core/src/onboarding/`. Kevin's product call: the AGM-based revised flow is canonical going forward.

## Baseline

- `main` HEAD: `1eb4271` (Sprint 1 cleanup merged via PR #74).
- This branch is rebased on top of that commit. No conflicts expected.
- Sprint 1 changes already on `main`: deleted the legacy procedural `OnboardingPage.tsx` + `useOnboardingState.ts`, removed `@mbd/test-utils`, removed the mailto feedback widget, added a v33 save fixture + round-trip test, surfaced `pnpm playtest` / `pnpm playtest:sample` / `pnpm playtest:calibrate` at root, migrated the bundleConfig journal into `apps/web/docs/BUDGETS.md`.
- Save schema: `CURRENT_GAME_SNAPSHOT_VERSION = 33`. Do not bump.
- Test counts after Sprint 1: 97 web / 137 sim-core / 1 contracts files, **2,248 tests passing**.

## Read first

Inspect these before editing. Do not skip.

**Repo orientation:**
- `README.md`
- `CHANGELOG.md`
- `MASTER_CONTEXT.md` (treat as a snapshot from 2026-04-10 — some facts are stale, but the architecture map and design decisions are still accurate)
- `package.json`, `turbo.json`, `pnpm-workspace.yaml`
- `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`

**Onboarding surface (apps/web):**
- `apps/web/src/app/routes/index.tsx` — confirms `/onboarding` mounts `RevisedOnboardingPage`
- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx` — the file you're refactoring
- `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.test.tsx` — existing test coverage to preserve/update
- `apps/web/src/features/onboarding/components/` — full directory: `AGMPanel.tsx`, `AGMRuntimePanel.tsx`, `AGMSelectionPanel.tsx`, `AssessmentPanel.tsx`, `ChapterProgress.tsx`, `ChoiceSelector.tsx`, `OnboardingComplete.tsx`, `TypewriterText.tsx`, `shared.tsx`, and `chapters/*` (OwnerMeetingView, RosterAssessmentView, FarmAssessmentView, StaffEvaluationView, FinancialView, ScoutingBriefingView, SeasonStrategyView, PressConferenceView, HireCoachesView, HireScoutsView)
- `apps/web/src/features/onboarding/nudges/` — guided-start cards used by Setup/Dashboard/Draft; DO NOT touch
- `apps/web/src/features/onboarding/__tests__/guidedStartNudges.test.tsx` — preserve

**Worker bridge:**
- `apps/web/src/workers/sim.worker.ts` — confirms `onboardingApi` map composition
- `apps/web/src/workers/sim.worker.onboarding.ts` — both Day-One and Revised methods live here
- `apps/web/src/shared/hooks/useWorker.ts` — the `useWorker` Comlink proxy + `mutationMethods` Set (lines ~34-104) + Day-One callbacks (lines ~876-918) + Revised callbacks (lines ~928-949)
- `apps/web/src/workers/snapshot.ts`, `snapshot.onboarding.ts` — snapshot serialization

**Sim-core onboarding (PROTECTED — read-only):**
- `packages/sim-core/src/onboarding/index.ts` — barrel; see what's exported
- `packages/sim-core/src/onboarding/dayOne.ts` — Day-One state machine
- `packages/sim-core/src/onboarding/agmCandidates.ts` — Marcus Chen / Walt Kowalski / Elena Vargas fixed AGMs
- `packages/sim-core/src/onboarding/flowEngine.ts` — revised flow state engine
- `packages/sim-core/src/onboarding/scriptOrchestrator.ts`
- `packages/sim-core/src/onboarding/staffHiring.ts` + `staffEvaluation.ts`
- `packages/sim-core/src/onboarding/scoutingBriefing.ts`
- `packages/sim-core/src/onboarding/chapterDialogue.ts`, `roundThreeDialogue.ts`, `choiceReactions.ts`
- `packages/sim-core/src/onboarding/rosterAssessment.ts`, `farmAssessment.ts`, `financialPlaybook.ts`, `seasonStrategy.ts`, `ownerMeeting.ts`, `pressConference.ts`, `assistantGM.ts`

**Save schema (PROTECTED — read-only):**
- `packages/contracts/src/schemas/save.ts` — verify `franchise.dayOne` shape; note any revised-onboarding fields if present
- `packages/contracts/src/schemas/franchise.ts`

**Tests:**
- `packages/sim-core/tests/agmCandidates.test.ts`
- `packages/sim-core/tests/assistantGMCharacter.test.ts`, `assistantGMOrchestrator.test.ts`, `assistantGMDialogue.test.ts`, `assistantGMChoiceReactions.test.ts`, `assistantGMTips.test.ts`
- Any other `onboarding`-named tests under `packages/sim-core/tests/`
- `apps/web/src/workers/sim.worker.onboarding.test.ts`
- `apps/web/src/workers/snapshot.onboarding.test.ts`

## Product contract

Build the smallest complete version that:

1. Renders the AGM selection screen with all 3 fixed candidates from sim-core's `AGM_CANDIDATES` (Marcus Chen, Walt Kowalski, Elena Vargas), each with their distinct voice/philosophy.
2. Drives the chapter sequence defined by sim-core's `REVISED_CHAPTER_ORDER` (read it from sim-core to know the exact order; do NOT hardcode).
3. Includes staff hiring (calls `applyStaffHires`) and scouting director hiring (calls `applyScoutingHire`).
4. Completes via `completeRevisedOnboarding`, writes the resulting snapshot to IndexedDB through the existing save path, and navigates the user to `/dashboard`.
5. Has loading, error, and success states. Empty state is "no save initialized yet" handled by the Save Hub.
6. Preserves all existing nudges that fire post-onboarding (don't touch `features/onboarding/nudges/`).

Prefer reusing existing components where they fit (`AGMSelectionPanel`, `AGMRuntimePanel`, `AssessmentPanel`, `ChapterProgress`, `ChoiceSelector`, `OnboardingComplete`, the `chapters/*` views, `HireCoachesView`, `HireScoutsView`). Add new components only when a clean fit is impossible.

The result must be usable, not a scaffold.

## Allowed write scope

Write only inside:
- `apps/web/src/features/onboarding/**` (except `nudges/**` which is protected)
- `apps/web/src/workers/sim.worker.onboarding.ts`
- `apps/web/src/workers/sim.worker.ts` (only the `onboardingApi` map composition, if Day-One removal happens)
- `apps/web/src/shared/hooks/useWorker.ts` (only the onboarding-related callbacks and `mutationMethods` Set entries — see the well-defined Day-One / Revised regions near lines 80-104 and 876-949)
- Test files matching the above paths
- `.logs/goal-progress.md` (create if absent)
- `STATUS.md` (create at repo root)
- `GOAL.md` (this file — only minor edits if absolutely necessary)

## Protected scope

Do not modify, even if it looks easier:
- `packages/sim-core/**` — sim-core is the source of truth for both onboarding flows. If a sim-core helper is needed but unexposed, expose it via the worker layer, do not change sim-core.
- `packages/contracts/**` — save schema is v33; no bump in this sprint.
- `apps/web/src/features/onboarding/nudges/**` — used by Setup, Dashboard, Draft; do not touch.
- `apps/web/src/features/<anything-other-than-onboarding>/**`
- `apps/web/src/workers/sim.worker.actions.ts`, `sim.worker.queries.ts`, `sim.worker.helpers.ts`, `sim.worker.state.ts` — onboarding worker file is the only worker file in scope.
- `apps/web/src/app/routes/index.tsx` — only edit if the route definition itself must change (it shouldn't; `/onboarding` stays at `/onboarding`).
- `apps/web/src/app/layout/**`, `apps/web/src/shared/components/**`, `apps/web/src/shared/lib/**` (except where explicitly listed above)
- `.github/**`, `package.json` (root), `turbo.json`, `pnpm-workspace.yaml`
- `apps/web/src/build/bundleConfig.ts`, `apps/web/docs/BUDGETS.md` — preserve the chunk-budget journal exactly

## Non-negotiables

- **Determinism is sacred.** No `Math.random()`, no `Date.now()` inside sim-relevant paths. Use sim-core's seeded PRNG via the worker. Date.now() in UI is fine; in worker logic it is not.
- **Save schema stays v33.** Additive migrations only, and only if absolutely required (which they should NOT be for this sprint — the revised flow already has worker support).
- **No new top-level dependencies.** Reuse what's in `apps/web/package.json` and the workspace packages.
- **No emoji in game UI.** Use lucide-react icons only.
- **Bloomberg Terminal aesthetic.** Match existing typography (Space Grotesk / JetBrains Mono / Bebas Neue), color tokens from `@mbd/design-tokens`, density.
- **Preserve all 3 fixed AGM characters.** Marcus Chen, Walt Kowalski, Elena Vargas — do not invent new AGMs, do not remove any.
- **Do not delete or weaken tests** to make checks pass. Update tests to match new behavior; add new ones for new flows.
- **The `/onboarding` route URL stays at `/onboarding`.** Don't rename.
- **No commits on `main`.** Work on `goal/sprint-2-revised-onboarding`.
- **No `git add -A`** — stage specific files only.

## Milestone loop

For each milestone: inspect → state checkpoint → smallest change → smallest validation → fix → log to `.logs/goal-progress.md`.

Each log entry: timestamp, milestone, files changed, checks run, result, blocker or next step.

Suggested milestones (you can re-slice, but cover all):

1. **Inventory** — Read every file in "Read first." Document in `.logs/goal-progress.md`:
   - The current Day-One worker methods and what each does.
   - The current Revised worker methods and what each does.
   - The sim-core revised flow's exported chapter order, step IDs, and the shape of the data each step produces.
   - The component map: which existing components (AGMRuntimePanel, AssessmentPanel, chapters/*) can be reused; which gaps need new components.
2. **Refactor RevisedOnboardingPage** — Replace Day-One worker calls with the Revised API. Implement the chapter sequence using sim-core's `REVISED_CHAPTER_ORDER`. Wire AGM selection → assessments → staff hiring → scouting hiring → completion. Reuse existing components; new components only when necessary.
3. **Update RevisedOnboardingPage.test.tsx** — Existing tests likely break. Update them to assert the new flow. Add tests for: AGM selection rendering 3 candidates, staff-hiring step calling `applyStaffHires`, scouting-hiring step calling `applyScoutingHire`, completion calling `completeRevisedOnboarding`, error state when worker fails.
4. **Day-One worker surface decision** — Confirm whether any code outside RevisedOnboardingPage uses the Day-One methods (grep for `getDayOneSession`, `advanceDayOneIntro`, etc. in apps/web/src). If zero callers remain after milestone 2:
   - Remove the Day-One methods from `apps/web/src/shared/hooks/useWorker.ts` (the callbacks + the `mutationMethods` Set entries).
   - Remove them from the `onboardingApi` map in `apps/web/src/workers/sim.worker.ts`.
   - Remove the wrapper functions from `apps/web/src/workers/sim.worker.onboarding.ts`.
   - **Leave `packages/sim-core/src/onboarding/dayOne.ts` untouched** — sim-core is protected.
   - If a caller remains, document why and keep Day-One.
5. **Verify gate** — Run `pnpm typecheck`, `pnpm test`, `pnpm build` after each milestone and at the end. Fix failures before expanding scope. Capture results in `.logs/goal-progress.md`.
6. **Browser smoke** — Start `pnpm --filter @mbd/web dev`, walk the full flow: Save Hub → pick slot → pick team → land on `/onboarding` → pick AGM → complete all steps → land on `/dashboard` with the new save's data visible. Capture a screenshot at the AGM selection screen and at the dashboard.
7. **STATUS.md** — Write the final report (see "Final report" section below).

## Validation loop

Commands (workspace root):

```
pnpm install                 # if node_modules is missing
pnpm typecheck               # 9 tasks should pass
pnpm test                    # 97 web / 137 sim-core / 1 contracts, ~2,247 tests
pnpm build                   # turbo build → vite build, 118-entry PWA precache
pnpm --filter @mbd/web dev   # browser smoke on http://localhost:5173/MBD/
```

Targeted (use these for tight loops while iterating):

```
pnpm --filter @mbd/web test src/features/onboarding
pnpm --filter @mbd/contracts test
pnpm --filter @mbd/sim-core test tests/agmCandidates.test.ts tests/assistantGM*.test.ts
```

Browser flow to verify by hand:

1. `pnpm --filter @mbd/web dev`
2. Open `http://localhost:5173/MBD/` (or `5174` if 5173 is taken)
3. Click "New Dynasty"
4. Pick Slot 1, pick a team (try Kansas City BBQ Fountains for the KC fan-loyalty flavor)
5. Confirm landing on `/onboarding`
6. Confirm 3 AGM candidates render with portraits/voices: Marcus Chen, Walt Kowalski, Elena Vargas
7. Pick one (try each in separate runs)
8. Walk every step the revised flow exposes (assessments, hires, etc.)
9. Confirm landing on `/dashboard` after completion
10. Confirm dashboard renders real worker-backed data (standings, schedule, etc.)
11. Reload the page; confirm save loads from IndexedDB and resumes on dashboard
12. Open DevTools → Application → IndexedDB → confirm a save record exists with `schemaVersion: 33`

## Evaluator-visible proof

Before declaring done, the transcript and `STATUS.md` must contain:

- Exact commands run, with their pass/fail result.
- Output summaries (test counts, build duration, bundle sizes).
- Browser steps walked, with screenshot paths committed under `apps/web/docs/screenshots/sprint-2/` (allowed write path — add it).
- A diff summary (`git diff --stat origin/main..HEAD`) showing changes stayed inside allowed scope.
- The Day-One removal decision with grep evidence.
- Known unrelated failures, if any, with reproduction.

The goal is not complete unless the proof is visible.

## Autonomy rules

When sim-core's revised flow exposes choices the UI doesn't fully use (e.g., a dialogue tone not shown to the user), it is fine to pass through reasonable defaults. Log the assumption.

When existing components don't fit cleanly, prefer composing smaller new components inside `apps/web/src/features/onboarding/components/` over forking large existing ones.

When unsure between two reasonable implementations, pick the one that:
- Matches existing repo patterns (other feature pages use `useEffect` + `useWorker()` + `useState` with worker-backed data).
- Has the smaller diff.
- Avoids new dependencies.
- Preserves the most existing tests.

Log assumptions in `.logs/goal-progress.md` and continue.

## Pause conditions

Pause and write the blocker into `STATUS.md` only when:

- The revised flow worker surface in `sim.worker.onboarding.ts` is incomplete (e.g., a step in `REVISED_CHAPTER_ORDER` has no exposed worker method) AND adding a worker wrapper would require new sim-core code.
- Existing tests in `RevisedOnboardingPage.test.tsx` make assertions that fundamentally cannot coexist with the new flow.
- The same validation (typecheck, test, or build) fails 3 times after serious repair attempts.
- A required save-schema field is missing AND adding it would require a v34 bump (out of scope).
- A protected file must be modified to make any further progress.
- The Day-One worker methods turn out to have a caller in a path you can't read (e.g., another feature surfaces them via a hidden import) and removal would regress that path.
- Sprint 1 PR #74's merge introduced something on `main` that materially changes the onboarding surface and the GOAL.md no longer matches reality.

When pausing, do not delete partial work. Document where the partial state lives and the exact blocker.

## Done when

All of the following are true:

- `/onboarding` route renders the revised flow with all 3 AGM candidates visible.
- The user can complete the flow from AGM pick → assessments → staff hiring → scouting hiring → completion.
- `applyStaffHires`, `applyScoutingHire`, and `completeRevisedOnboarding` are each called at the correct step.
- After completion, the user lands on `/dashboard` with a fresh save loaded.
- Reload preserves the save; the new save has `schemaVersion: 33`.
- Day-One worker surface decision is made and either:
  - (a) removed cleanly from `useWorker.ts` + `sim.worker.ts` `onboardingApi` map + `sim.worker.onboarding.ts` wrappers, with grep evidence showing zero remaining callers in `apps/web/src/`, OR
  - (b) preserved with a comment block explaining why and a STATUS.md entry citing the caller.
- `pnpm typecheck` clean (all 9 tasks).
- `pnpm test` clean (no test deleted or weakened; new tests added for new behavior).
- `pnpm build` clean (every chunk under its ceiling; bundleBudget.test.ts passes).
- Browser smoke walked end-to-end with at least one screenshot of the AGM selection step and one of the post-completion dashboard.
- `.logs/goal-progress.md` exists with a milestone log.
- `STATUS.md` exists with the final report (see next section).
- The branch is on `goal/sprint-2-revised-onboarding`, not main.

## Final report

`STATUS.md` must include, in order:

1. **What shipped** — one paragraph summary of the user-visible change.
2. **Files changed** — `git diff --stat origin/main..HEAD` output.
3. **Validations run** — exact commands and their results (typecheck, test, build).
4. **Browser evidence** — list of screenshots committed under `apps/web/docs/screenshots/sprint-2/` with one-line captions.
5. **Day-One decision** — kept or removed; with the grep evidence that justifies it.
6. **Known limitations** — anything you noticed but did not fix (out of scope).
7. **Risks** — what could break in production and what to watch.
8. **Rollback notes** — revert the merge commit; the save schema didn't bump, so revert is safe.
9. **Next /goal** — the exact paste-ready `/goal` prompt for the next sprint. (Sprint 3 candidates: News inbox UI; OR wire orphaned player-profile endpoints; OR press conference unification.)

## Branch + commit hygiene

- Branch: `goal/sprint-2-revised-onboarding` (already created).
- Stage specific files, never `git add -A`.
- Commit in logical slices (one slice per milestone is a reasonable cadence). Use conventional-commit prefixes that match repo history: `feat(onboarding):`, `refactor(onboarding):`, `test(onboarding):`, `chore(onboarding):`, `docs(onboarding):`.
- Co-author trailer on each commit:

  ```
  Co-Authored-By: Codex GPT-5 <noreply@openai.com>
  ```

  (Or whichever attribution Codex normally uses.)
- When done, push and open a PR titled `Sprint 2 — Revised onboarding becomes canonical`. Body should summarize against this GOAL.md and link to PR #74 if Sprint 1 cleanup is still open.

## Out of scope (do not attempt this sprint)

- Team logo SVG assets (Sprint 7).
- News inbox UI (Sprint 3).
- Wiring orphaned player-profile endpoints (Sprint 4).
- Press-conference unification (Sprint 5).
- Worker-mode `runInvariantChecks` integration (Sprint 6).
- Moving narrative generation off the main thread (Sprint 6).
- Adding any new sim-core code.
- Any save schema change.
- Any change outside `apps/web/src/features/onboarding/`, `apps/web/src/workers/sim.worker.onboarding.ts`, `apps/web/src/workers/sim.worker.ts` (onboardingApi only), and `apps/web/src/shared/hooks/useWorker.ts` (onboarding callbacks only).

---

*End of GOAL.md. The companion `/goal` slash command lives in the PR description for this branch and in the conversation with Kevin.*
