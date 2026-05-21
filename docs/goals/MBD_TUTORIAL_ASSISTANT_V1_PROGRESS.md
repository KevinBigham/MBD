# MBD Tutorial Assistant V1 Progress

Source contract: `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md`
Last updated: 2026-05-05
Branch: `goal/tutorial-assistant-v1`
Status: Implementation complete and committed on the goal branch; closed playtest still recommended before public launch

## Current Phase

Implementation complete as a shippable V1 guidance layer. Independent Claude Code review confirmed the source/test files and docs match the goal contract. The earlier repo-health blocker noted during the tutorial-assistant sprint was resolved by publishing the work into a clean goal-branch commit and merging it with the later build-round changes.

## Completed Work

- Created durable goal and progress docs.
- Completed Phase 0 repo audit in `docs/tutorial-assistant/phase0-preflight.md`.
- Completed Phase 1 FTUE, decision-point, route, and ratings audits.
- Completed Phase 2 character, UX, trigger, and asset specs.
- Implemented a reusable Assistant foundation:
  - route-aware guidance for every current major route
  - stable route normalization for aliases and dynamic routes
  - localStorage state keyed by active save id/slot
  - dismissed/completed route tracking
  - replay controls
  - Newcomer/Hardcore modes
  - deterministic story callbacks from phase/ticker context with cooldowns
- Implemented global Assistant UI:
  - visible on Setup and Onboarding through route-level mount
  - visible inside initialized app shell through `AppLayout`
  - compact chip plus expanded panel
  - "What now?" next action
  - Explain ratings
  - Deeper strategy
  - Got it / Replay
  - Escape-to-close behavior
  - mobile-shaped fixed drawer/chip above bottom controls
  - CSS/icon avatar placeholder with no external asset dependency
- Updated route coverage matrix, playtest plan, release gate, and completion audit.

## Live Checklist

- [x] Create `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md`
- [x] Create `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md`
- [x] Phase 0 repo audit
- [x] Create `docs/tutorial-assistant/phase0-preflight.md`
- [x] Phase 1 FTUE + decision-point audit
- [x] Create/update `docs/tutorial-assistant/coverage-matrix.md`
- [x] Create `docs/tutorial-assistant/ratings-visibility-audit.md`
- [x] Phase 2 Assistant character + UX spec
- [x] Phase 3 Assistant engine foundation
- [x] Phase 4 core page walkthroughs
- [x] Phase 5 OVR/ratings visibility expansion
- [x] Phase 6 Assistant visual assets placeholder/hooks
- [x] Phase 7 narrative memory lite
- [x] Phase 8 mobile, accessibility, performance hardening
- [x] Phase 9 closed playtest readiness
- [x] Create/update `docs/tutorial-assistant/release-gate.md`
- [x] Completion audit

## Test Results

- `npx --yes pnpm@9.15.4 --version`: passed, `9.15.4`.
- `npx --yes pnpm@9.15.4 install`: passed.
- `npx --yes pnpm@9.15.4 run typecheck`: initially hung at `@mbd/web` under the default Node path before code changes; stopped and documented.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/features/assistant/lib/assistantState.test.ts src/features/assistant/data/assistantGuidance.test.ts`: red first, then passed.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/features/assistant/components/AssistantPanel.test.tsx`: red first, then passed.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/app/layout/AppLayout.test.tsx -t "renders sim-to-playoffs"`: red first, then passed after stale unrelated Vitest processes were cleared.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/app/routes/index.test.tsx`: red first, then passed.
- Focused combined Assistant/AppRoutes/AppLayout test command: passed, 12 tests passed and 9 skipped by the `-t` filter.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 --filter @mbd/web typecheck`: passed.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 --filter @mbd/web build`: passed.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 --filter @mbd/contracts test`: passed, 18 tests.
- `PATH=/Users/tkevinbigham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npx --yes pnpm@9.15.4 run verify:determinism`: passed, 3 tests.
- Playwright mobile browser check at 390x844 on a static preview of `apps/web/dist`: passed. Verified Setup Assistant chip/panel, ratings explanation, quick-start save creation, Dashboard Assistant chip/panel after skipping the existing legacy tutorial modal, and route-aware Dashboard guidance.

## Changed Files

- `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md`
- `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md`
- `docs/tutorial-assistant/phase0-preflight.md`
- `docs/tutorial-assistant/phase1-audit.md`
- `docs/tutorial-assistant/ratings-visibility-audit.md`
- `docs/tutorial-assistant/coverage-matrix.md`
- `docs/tutorial-assistant/character-spec.md`
- `docs/tutorial-assistant/assistant-ux-spec.md`
- `docs/tutorial-assistant/trigger-spec.md`
- `docs/tutorial-assistant/asset-plan.md`
- `docs/tutorial-assistant/playtest-plan.md`
- `docs/tutorial-assistant/release-gate.md`
- `docs/tutorial-assistant/completion-audit.md`
- `apps/web/src/features/assistant/lib/assistantState.ts`
- `apps/web/src/features/assistant/lib/assistantState.test.ts`
- `apps/web/src/features/assistant/data/assistantGuidance.ts`
- `apps/web/src/features/assistant/data/assistantGuidance.test.ts`
- `apps/web/src/features/assistant/components/AssistantPanel.tsx`
- `apps/web/src/features/assistant/components/AssistantPanel.test.tsx`
- `apps/web/src/app/layout/AppLayout.tsx`
- `apps/web/src/app/layout/AppLayout.test.tsx`
- `apps/web/src/app/routes/index.tsx`
- `apps/web/src/app/routes/index.test.tsx`

## Known Issues / Risks

- Manual mobile browser verification completed on Setup and Dashboard at 390x844; closed tester playtest is still recommended before public launch handoff.
- Generated Assistant portraits are deferred; V1 uses production-safe CSS/icon avatar hooks.
- The Assistant explains OVR/ratings through route guidance rather than adding new columns to already-dense tables.
- Default Node path hung on web typecheck/build; bundled Codex Node completed typecheck and build.
- Stale unrelated Vitest/tsc processes were found and cleared during verification.
- Final `git status`/`git diff` attempts hung in this desktop session after branch verification. Changed files were reviewed directly from the filesystem, and no save schema, sim engine, RNG, or contracts code was touched.

## Next Action

Claude Code review should focus on:

1. Whether the Assistant copy is too verbose on mobile.
2. Whether any route-specific next action should be made more dynamic through worker data.
3. Whether generated portrait assets should be added in a follow-up art slice.
4. Whether playtest feedback shows any remaining OVR/rating visibility gaps requiring visible badges in specific tables.

## Goal Status

Implementation complete for Tutorial Assistant V1 and committed on the goal branch. Closed tester playtest is still recommended before public launch handoff.

## Independent Review (2026-05-05, Claude Code)

Verified directly against the working tree:

- Code structure: 6 source files (`apps/web/src/features/assistant/{lib,data,components}/...` + tests) plus mounts in `apps/web/src/app/layout/AppLayout.tsx:498` and `apps/web/src/app/routes/index.tsx:126-133`.
- Route coverage: 31 keys in `REQUIRED_ASSISTANT_ROUTE_KEYS`, every key has a guidance entry; aliases (`/league/standings`, `/league/leaders`) and dynamic routes (`/players/:id`, `/games/:id`) are normalized in `resolveAssistantRouteKey`.
- TypeScript: `tsc --noEmit` over the web app exits 0 with no diagnostics.
- Module logic: direct Node smoke test confirms reducer, sanitizer, storage key shape, route resolution, all 31 guidance entries, phase-aware next-action override, and ticker/phase story-callback cooldown behavior.
- Build artifacts: `apps/web/dist/assets/index-*.js` already contains `"Mack Mercer"`, `"Got it"`, `"Hardcore mode"`, `"Replay"` from the prior Codex build.
- Save safety: `CURRENT_GAME_SNAPSHOT_VERSION` is still `33`, no `Math.random` calls in the Assistant code paths, persistence is `localStorage` keyed by save id/slot via `assistantStorageKey`.
- Accessibility: `role="dialog"`, `aria-label`, `aria-live="polite"`, `motion-safe:` animation on the avatar, `min-h-11` touch targets, Escape-to-close handler.
- Tailwind tokens: every `dynasty-*` and `accent-*` class used by the panel resolves to entries in `packages/design-tokens/src/colors.ts`.
- Existing systems: `TourProvider`, `PageHelp`, `ContextualHelp`, `GameAdvisor`, and onboarding flows are untouched. Mobile bottom nav at `Sidebar.tsx:201` and the Assistant chip both sit at `z-40`; the chip clears the nav by 32 px (`bottom-24` chip vs ~64 px nav height).

Could not be re-verified in this review session:

- Vitest hangs on this machine for both the Codex bundled Node 24.14.0 and Homebrew Node 25.x. Test code itself was read and is consistent with the smoke results above. The `pnpm test` results captured during the Codex sprint should be re-run on a clean shell once the repo is repaired.
- Web `pnpm build` hangs the same way on this machine; the prior Codex build artifact in `dist/` confirms it has succeeded at least once on this branch.
- Mobile browser QA at 390×844 was not re-run — Codex's Playwright static-preview check stands as the latest evidence and matches the chip placement / overlay analysis above.
