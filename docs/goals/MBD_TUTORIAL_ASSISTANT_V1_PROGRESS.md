# MBD Tutorial Assistant V1 Progress

Source contract: `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md`
Last updated: 2026-05-05
Branch: `goal/tutorial-assistant-v1`
Status: Still in progress - contract setup only

## Current Phase

Phase 0 - Preflight Repo Audit is next. This file was created as the required live scaffold; Phase 0 implementation and audit docs have not started yet.

## Completed Work

- Created the durable goal contract.
- Created this progress scaffold.
- Created the local `docs/tutorial-assistant/` folder for future phase outputs.
- Performed a light repo inspection only to adapt the contract:
  - root monorepo uses `pnpm@9.15.4` and Turbo
  - web app is React 18 + Vite 6 + Tailwind
  - app routes are in `apps/web/src/app/routes/index.tsx`
  - existing help/tutorial systems include `TourProvider`, `tourDefinition`, `PageHelp`, `ContextualHelp`, `GameAdvisor`, and guided-start nudges
  - current save schema is `CURRENT_GAME_SNAPSHOT_VERSION = 33`
  - public URL is documented as `https://kevinbigham.github.io/MBD/`

## Live Checklist

- [x] Create `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md`
- [x] Create `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md`
- [ ] Phase 0 repo audit
- [ ] Create `docs/tutorial-assistant/phase0-preflight.md`
- [ ] Phase 1 FTUE + decision-point audit
- [ ] Create/update `docs/tutorial-assistant/coverage-matrix.md`
- [ ] Create `docs/tutorial-assistant/ratings-visibility-audit.md`
- [ ] Phase 2 Assistant character + UX spec
- [ ] Phase 3 Assistant engine foundation
- [ ] Phase 4 core page walkthroughs
- [ ] Phase 5 OVR/ratings visibility expansion
- [ ] Phase 6 Assistant visual assets
- [ ] Phase 7 narrative memory lite
- [ ] Phase 8 mobile, accessibility, performance hardening
- [ ] Phase 9 closed playtest readiness
- [ ] Create/update `docs/tutorial-assistant/release-gate.md`
- [ ] Completion audit

## Known Issues / Risks

- No repo-root `AGENTS.md` file was present on disk during setup; Kevin's supplied AGENTS.md instructions are the active project rules.
- `MASTER_CONTEXT.md` is useful for background, but its schema version, path references, and counts are stale. Future work must verify against the current repo.
- Current existing tutorial/help systems are fragmented across page help, a global tour, dashboard advisor, and guided-start nudges. Phase 0/1 should decide what to reuse versus replace.
- Save compatibility must stay explicit. Any future save-state tutorial persistence requires a schema bump, migration, and fixture update unless it stays outside `GameSnapshot`.

## Test Results

- Not run. This stop is docs-only contract setup; no app or sim implementation was started.

## Changed Files

- `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md`
- `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md`

## Next Action

Start Phase 0:

1. Read the goal contract and this progress file.
2. Inspect `git status`.
3. Confirm current repo structure, scripts, route inventory, help/onboarding systems, OVR/rating surfaces, save/version code, and mobile layout patterns from live files.
4. Run the safest available checks first.
5. Create `docs/tutorial-assistant/phase0-preflight.md`.
6. Update this progress file with evidence, commands, blockers, and next task.

## Goal Status

Still in progress. Not blocked. Not complete.
