# MBD Assistant Polish Release V2 Progress

Date: 2026-05-05
Branch: `goal/assistant-polish-release-v2`
Base: `origin/goal/tutorial-assistant-v1` because PR #72 is open.
Working repo: `/Users/tkevinbigham/Documents/GitHub/MBD-fresh`

## Current Phase

Phase 7 - verified and ready for git handoff.

## Preflight

- Supplied AGENTS.md instructions read.
- No filesystem `AGENTS.md` files present in the clean clone.
- Original `/Users/tkevinbigham/Documents/GitHub/MBD` checkout was not used because basic commands hung, matching the known corrupt packfile warning.
- `MBD-fresh` passed `git fsck --no-dangling`.
- PR #72 is open, not merged, so this branch was created from `origin/goal/tutorial-assistant-v1`.
- Package scripts confirmed: `@mbd/web` has `typecheck`, `test`, `build`; root has `verify:determinism`.

## Completed Work

- Added V2 baseline/final scorecard.
- Tightened first-session route cues and documented the golden path.
- Added Mack Mercer SVG/CSS avatar component with expression states: neutral, excited, warning, success, thinking.
- Added Assistant focus-on-open, expanded-section ARIA state, mode button state, success/replay pulse, and mobile drawer/footer hardening.
- Added deterministic "Story so far" lines from safe app-shell context without save schema or sim mutation.
- Added copy-to-clipboard closed-playtest feedback report.
- Added shared `RatingBadge` component and applied it to player profile, roster action cards, trade assets, finance contracts, scouting search, minors farm/pipeline surfaces.
- Converted worker-facing minors/finance display OVR values to display-scale values at UI DTO boundaries while preserving sim/save logic.
- Added setup wizard scroll/focus handoff and defaulted Scouting to Pro Reports.
- Made closed-market Assistant next actions phase-aware for Draft, Trade, and Free Agency.
- Hardened mobile bottom offsets for Assistant, SimControls, and main content.
- Moved the PWA update toast above mobile controls and made it dismissible so it does not block bottom navigation during playtest smoke.
- Fixed global Space shortcut suppression for focused buttons/links.

## Changed Files

- `apps/web/src/app/layout/AppLayout.tsx`
- `apps/web/src/app/App.tsx`
- `apps/web/src/app/App.test.tsx`
- `apps/web/src/app/layout/Sidebar.tsx`
- `apps/web/src/app/layout/SimControls.tsx`
- `apps/web/src/features/assistant/components/AssistantAvatar.tsx`
- `apps/web/src/features/assistant/components/AssistantPanel.tsx`
- `apps/web/src/features/assistant/components/AssistantPanel.test.tsx`
- `apps/web/src/features/assistant/data/assistantGuidance.ts`
- `apps/web/src/features/assistant/data/assistantGuidance.test.ts`
- `apps/web/src/features/assistant/lib/assistantFeedback.ts`
- `apps/web/src/features/assistant/lib/assistantFeedback.test.ts`
- `apps/web/src/features/finance/routes/FinancePage.tsx`
- `apps/web/src/features/minors/components/PipelineView.tsx`
- `apps/web/src/features/minors/routes/MinorsPage.tsx`
- `apps/web/src/features/players/components/ProfileHeader.tsx`
- `apps/web/src/features/roster/routes/RosterPage.tsx`
- `apps/web/src/features/scouting/routes/ScoutingPage.tsx`
- `apps/web/src/features/setup/routes/SetupPage.tsx`
- `apps/web/src/features/trade/routes/TradePage.tsx`
- `apps/web/src/shared/components/RatingBadge.tsx`
- `apps/web/src/shared/components/RatingBadge.test.tsx`
- `apps/web/src/workers/sim.worker.helpers.ts`
- `apps/web/src/workers/sim.worker.pipeline.ts`
- `apps/web/src/workers/sim.worker.queries.ts`
- `packages/design-tokens/src/tailwind-preset.ts`
- V2 docs under `docs/tutorial-assistant/`

## Tests / Checks Run

- `git fsck --no-dangling`: passed in `MBD-fresh`.
- `gh pr view 72 --json number,state,mergedAt,headRefName,baseRefName,url`: PR #72 open.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/features/assistant src/shared/components/RatingBadge.test.tsx`: passed, 17 tests.
- `npx --yes pnpm@9.15.4 --filter @mbd/web typecheck`: passed.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/features/assistant src/shared/components/RatingBadge.test.tsx src/workers/sim.worker.test.ts -t "prospect pipeline"`: passed focused worker pipeline guard.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/workers/sim.worker.test.ts`: passed, 103 tests.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/app/App.test.tsx`: passed, 4 tests.
- `npx --yes pnpm@9.15.4 --filter @mbd/web test -- src/features/assistant src/app/routes/index.test.tsx src/app/layout/AppLayout.test.tsx src/app/App.test.tsx src/shared/components/RatingBadge.test.tsx`: passed, 33 tests.
- `npx --yes pnpm@9.15.4 --filter @mbd/web build`: passed.
- `npx --yes pnpm@9.15.4 --filter @mbd/contracts test`: passed, 18 tests.
- `npx --yes pnpm@9.15.4 run verify:determinism`: passed, 3 tests.
- `git diff --check`: passed.
- Playwright CLI mobile smoke at 390x844 passed after clearing the test service worker/cache and reloading fresh preview assets. Verified Setup, Dashboard, Roster, Player Profile, Draft, Trade, Scouting, Finance, Free Agency, Settings, mobile bottom tabs, dismissible update toast, and the Assistant feedback form.

## Known Issues

- Closed playtest with humans is still required before public release.
- Incoming trade offers still depend on reduced worker-side labels; current V2 improves locally built package labels first.
- Broader first-session issues noted by audit, including Day One legal-roster handoff and older tutorial/nudge overlap, should get a dedicated V3 pass if playtest confusion remains.

## Next Highest-Impact Task

Closed-playtest the first 10 minutes with real testers and decide whether V3 should suppress older helper layers while Mack is open.

## Scorecard Status

Baseline: 72/100.
Current V2 score: 91/100 after final browser verification.

## Sprint Status

Implementation and verification complete. Branch is ready for review once pushed.
