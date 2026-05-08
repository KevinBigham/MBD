# Tutorial Assistant V1 Release Gate

Date: 2026-05-05

## Acceptance Checklist

- [x] Goal contract exists and was re-read during implementation.
- [x] Progress file exists and is updated.
- [x] Phase 0 preflight exists.
- [x] Phase 1 audit exists.
- [x] Ratings visibility audit exists.
- [x] Coverage matrix accounts for all current routes.
- [x] Character, UX, trigger, and asset specs exist.
- [x] Global Assistant appears on Setup and Onboarding.
- [x] Global Assistant appears inside the initialized app shell.
- [x] Assistant is route-aware across every current major route.
- [x] Assistant offers "What now?" next action guidance.
- [x] Assistant has Newcomer and Hardcore modes.
- [x] Assistant can explain ratings/OVR for decision-critical pages.
- [x] Assistant can show deeper strategy.
- [x] Assistant guidance is dismissible and replayable.
- [x] Assistant progress persists locally by save id/slot without changing `GameSnapshot`.
- [x] Assistant story callbacks use deterministic current-state/ticker context and cooldown keys.
- [x] Assistant ships with production-safe CSS/avatar placeholder, no external image paths.
- [x] Mobile layout uses fixed chip/drawer behavior above bottom controls.
- [x] Mobile browser check verified Setup and Dashboard Assistant behavior at 390x844.
- [x] Focus/Escape behavior exists for the expanded panel.
- [x] Save schema remains v33.

## Verification

- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/features/assistant/lib/assistantState.test.ts src/features/assistant/data/assistantGuidance.test.ts src/features/assistant/components/AssistantPanel.test.tsx`: passed.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/app/routes/index.test.tsx`: passed.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/app/layout/AppLayout.test.tsx -t "renders sim-to-playoffs"`: passed after stale Vitest processes were cleared.
- Focused combined Assistant/AppRoutes/AppLayout test command: passed, 12 tests passed and 9 skipped by the `-t` filter.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 --filter @mbd/web typecheck`: passed.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 --filter @mbd/web build`: passed.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 --filter @mbd/contracts test`: passed, 18 tests.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 run verify:determinism`: passed, 3 tests.
- Playwright mobile browser check at 390x844 on a static preview of `apps/web/dist`: passed. Verified Setup Assistant chip/panel, ratings explanation, quick-start save creation, Dashboard Assistant chip/panel after skipping the existing legacy tutorial modal, and route-aware Dashboard guidance.

## Remaining Blockers

- **P0 — Repo health.** `.git/objects/pack/pack-0e3dc6...pack` is corrupt: `file` reports it as empty and `git verify-pack` reports `early EOF, pack is bad`. All in-pack history (~5,901 objects) is unreadable from this clone. Symptoms: `git status`, `git diff`, `git fsck` hang; `git rev-parse main HEAD` returns the same SHA so the branch is currently identical to `main`. **Fix before any commit / merge / PR**: re-clone fresh from `git@github.com:KevinBigham/MBD.git`, then copy the working-tree files for the Assistant feature and docs over the fresh checkout. Do NOT run destructive git commands (`git gc`, `git repack`, `rm -rf .git/objects/pack/`) without first preserving the working tree.
- **P0 — Work is uncommitted.** Every file listed under "Changed Files" in `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md` is untracked relative to `main`. Once the repo is healthy, stage with explicit paths (`git add apps/web/src/features/assistant docs/goals/MBD_TUTORIAL_ASSISTANT_V1_*.md docs/tutorial-assistant apps/web/src/app/layout/AppLayout.tsx apps/web/src/app/layout/AppLayout.test.tsx apps/web/src/app/routes/index.tsx apps/web/src/app/routes/index.test.tsx`) — never `git add -A`.
- Manual closed-tester playtest is still recommended before public launch handoff.
- The Assistant uses a CSS/icon avatar placeholder; generated bitmap portraits are deferred.
- The Assistant explains OVR/ratings through guidance instead of adding new rating columns to already-dense tables. Future slices can add visual rating badges where playtest shows hunting/confusion.
- Root typecheck/build under the default Node path hung before using the bundled Codex Node runtime. Use the bundled Node command form above on this machine.
- During independent review on 2026-05-05, vitest and `vite build` hung when invoked from this shell with both bundled and Homebrew Node, while `tsc --noEmit` exited cleanly. The previously generated `apps/web/dist/` already contains the Assistant bundle, so the build is known to pass — but a clean re-run on a healthy repo is part of the merge gate.

## Launch-Readiness Notes

- V1 is shippable as a guidance layer: it is global, route-aware, persistent, dismissible, replayable, mobile-shaped, and save-safe.
- It deliberately keeps existing TourProvider, PageHelp, ContextualHelp, GameAdvisor, and guided-start nudges intact.
- No sim logic, save schema, RNG, or migration code was changed.
