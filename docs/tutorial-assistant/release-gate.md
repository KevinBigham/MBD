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
- [x] V2 scorecard exists.
- [x] V2 first-session flow exists.
- [x] Mack Mercer has expression-state avatar hooks.
- [x] Assistant feedback loop exists without backend dependency.
- [x] Story-so-far guidance is deterministic and save-safe.
- [x] Highest-impact OVR/rating decision surfaces have visible badges or one-tap rating explanation.
- [x] Closed-market Draft/Trade/Free Agency guidance is phase-aware.
- [x] V2 full validation gauntlet is complete.
- [x] V2 390x844 browser smoke is complete.

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
- V2 final `npx --yes pnpm@9.15.4 --filter @mbd/web typecheck`: passed.
- V2 final `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/features/assistant src/app/routes/index.test.tsx src/app/layout/AppLayout.test.tsx src/app/App.test.tsx src/shared/components/RatingBadge.test.tsx`: passed, 33 tests.
- V2 final `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/workers/sim.worker.test.ts`: passed, 103 tests.
- V2 final `npx --yes pnpm@9.15.4 --filter @mbd/web build`: passed.
- V2 final `npx --yes pnpm@9.15.4 --filter @mbd/contracts test`: passed, 18 tests.
- V2 final `npx --yes pnpm@9.15.4 run verify:determinism`: passed, 3 tests.
- V2 final `git diff --check`: passed.
- V2 Playwright mobile browser smoke at 390x844 passed after clearing the local test service worker/cache. Verified Setup, Dashboard, Roster, Player Profile, Draft, Trade, Scouting, Finance, Free Agency, Settings, the corrected mobile bottom tabs, dismissible update toast, and the Assistant feedback form.

## Remaining Release Risks

- Manual closed-tester playtest is still recommended before public launch handoff.
- Generated bitmap portraits are deferred; V2 ships a production-safe inline SVG/CSS avatar with expression hooks.
- Incoming AI-generated trade offer labels still use reduced worker-side asset text in some contexts. V2 improves locally built trade packages and visible decision tables first.
- Legacy guided-start, PageHelp, and Assistant can still coexist. Closed playtest should decide whether a V3 pacing pass should suppress older helper layers once Mack is open.

## Historical V1 Recovery Note

- The original `/Users/tkevinbigham/Documents/GitHub/MBD` checkout previously had a corrupt `.git` packfile and hung on basic git operations. V2 work moved to `/Users/tkevinbigham/Documents/GitHub/MBD-fresh`, which passed `git fsck --no-dangling` before edits.
- PR #72 is still open, so V2 is intentionally stacked on `origin/goal/tutorial-assistant-v1` rather than `main`.

## Launch-Readiness Notes

- V1 is shippable as a guidance layer: it is global, route-aware, persistent, dismissible, replayable, mobile-shaped, and save-safe.
- It deliberately keeps existing TourProvider, PageHelp, ContextualHelp, GameAdvisor, and guided-start nudges intact.
- No sim logic, save schema, RNG, or migration code was changed.
- V2 adds product polish in the healthy `MBD-fresh` branch: expression avatar, story so far, first-session cues, display-scale rating badges, mobile/accessibility hardening, and copyable playtest feedback.
