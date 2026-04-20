# Day One Front Office Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current revised onboarding hero path with a save-safe Day One session flow that supports `Full Day One` and `Quick Start`, persists Season 1 setup decisions, and hands the player into the live front office after a team-specific crisis.

**Architecture:** Keep the feature additive and deterministic. Add `franchise.dayOne` persistence in contracts/save migration, build Day One DTOs and defaulting in `sim-core`, expose a session-based worker API as the single onboarding contract, then rewire setup and onboarding UI around that session state. Opening Day roster choices persist as a narrow plan and are applied by the regular-season simulator for the user team.

**Tech Stack:** TypeScript, Zod, React 18, Zustand, Vitest, Web Worker/Comlink, `@mbd/sim-core`, `@mbd/contracts`

---

### Task 1: Save Schema And Deterministic Day One Core

**Files:**
- Modify: `packages/contracts/src/schemas/franchise.ts`
- Modify: `packages/contracts/src/schemas/save.ts`
- Modify: `packages/contracts/tests/save.migration.test.ts`
- Create: `packages/sim-core/src/onboarding/dayOne.ts`
- Modify: `packages/sim-core/src/index.ts`
- Modify: `packages/sim-core/tests/dayOne.test.ts`

- [ ] Write failing schema/core tests for `v17 -> v18`, Day One team cards, opening plan defaults, crisis selection, and projected impacts.
- [ ] Run targeted contracts/sim-core tests and confirm they fail for missing `v18` + missing Day One exports.
- [ ] Add Day One schemas/types/defaults and the `v17 -> v18` migration with additive backfill.
- [ ] Implement deterministic team-card, opening-plan, org-diagnosis, impact-strip, and crisis-selection helpers in `sim-core`.
- [ ] Re-export the new Day One helpers from the package surface.
- [ ] Re-run targeted contracts/sim-core tests until green.

### Task 2: Worker Session API And Quick Start

**Files:**
- Modify: `apps/web/src/workers/sim.worker.setup.ts`
- Modify: `apps/web/src/workers/sim.worker.onboarding.ts`
- Modify: `apps/web/src/workers/sim.worker.queries.ts`
- Modify: `apps/web/src/shared/hooks/useWorker.ts`
- Modify: `apps/web/src/workers/sim.worker.onboarding.test.ts`
- Modify: `apps/web/src/workers/snapshot.onboarding.test.ts`

- [ ] Run the worker Day One tests and confirm the missing session methods fail.
- [ ] Extend `newGame` options for `dayOneExperience` and seed the new franchise Day One state.
- [ ] Replace the old revised-onboarding draft flow with a session-based Day One state machine that supports owner intro, AGM selection, org review, decisions, crisis, recap, and finish.
- [ ] Implement `Quick Start` auto-resolution after AGM selection with deterministic defaults and recap payload.
- [ ] Wire the new methods through the query API and `useWorker` mutation/query surface.
- [ ] Re-run targeted worker tests until green.

### Task 3: Setup Front Door Refresh

**Files:**
- Modify: `apps/web/src/workers/sim.worker.setup.ts`
- Modify: `apps/web/src/features/setup/routes/SetupPage.tsx`
- Modify: `apps/web/src/features/setup/routes/SetupPage.test.tsx`

- [ ] Add failing UI tests for team-card rendering, archetype/franchise-hook fields, and `Full Day One` vs `Quick Start`.
- [ ] Expand setup preview DTOs with archetype framing, strengths, weaknesses, market/payroll/timeline read, and why-now copy.
- [ ] Replace the current dynasty team `<select>` with full-league selectable cards and a Day One experience toggle while keeping scenario behavior intact.
- [ ] Ensure dynasty creation routes to `/onboarding` for `Full Day One` and allows `Quick Start` to auto-resolve into the live game with a recap route state or stored worker session.
- [ ] Re-run Setup page tests until green.

### Task 4: Day One Route And AGM Runtime

**Files:**
- Modify: `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx`
- Create or modify supporting Day One components under `apps/web/src/features/onboarding/components/`

- [ ] Add failing UI tests for chapter gating, AGM runtime states, projected impact strip, and crisis handoff.
- [ ] Rewrite the onboarding route around the session API with owner-first flow, chapter intros, persistent desk-side AGM, guided decisions, recap, and crisis response.
- [ ] Keep the AGM runtime reusable: chapter scene mode + persistent desk mode using visual-state props instead of hardcoded text-only panels.
- [ ] Reuse roster UI patterns narrowly for Opening Day setup without exposing the entire roster screen.
- [ ] Re-run onboarding UI tests until green.

### Task 5: Apply Opening Day Plan To Live Sim And Verify End To End

**Files:**
- Modify: `packages/sim-core/src/roster/rosterManager.ts`
- Modify: `packages/sim-core/src/sim/seasonSimulator.ts`
- Modify: `apps/web/src/workers/sim.worker.actions.ts`
- Modify: `apps/web/src/workers/snapshot.test.ts`
- Modify: `.codex/MBD/status.md`
- Modify: `.codex/MBD/handoff.md`

- [ ] Add failing tests proving the user team’s persisted Opening Day plan influences the first live regular-season sim.
- [ ] Persist the opening plan into roster/franchise state and plumb it into `simulateDay`/`simulateWeek`/`simulateMonth` for the user team only.
- [ ] Keep fallback behavior stable for every non-user team and for saves without a custom plan.
- [ ] Run targeted snapshot/sim tests, then the full verification stack needed to support completion claims.
- [ ] Update durable memory with branch state, save schema version, verification status, risks, and next steps.
