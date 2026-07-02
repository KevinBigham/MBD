# Tutorial Assistant V1 Playtest Plan

Date: 2026-05-05

## First-Session Script

1. Open the public/local app at the Save Hub.
2. Start a new dynasty with Quick Start.
3. Confirm the Assistant chip is visible on Setup and Onboarding.
4. Open the Assistant on Setup and read the first-save guidance.
5. Complete onboarding and land on Dashboard.
6. Confirm the Dashboard answers what/why/next/where through Franchise Identity, sim controls, Reports Hub, Quickstarts, Trade Intel, and Game Advisor.
7. Open Reports Hub and confirm Trade Ledger, Tx Log, Season Recap, Draft Log, FA Market, Budget Report, Player Dev, History, Records, Pulse, and News all route to live surfaces.
8. Open Quickstarts and confirm Contender, Rebuild, Small Market, and Tutorial Day One point to the right workflow.
9. Open "What now?" and follow its suggested route.
10. Visit Roster, Players, Trade, Draft, Free Agency, Finance, Minors, Player Profile, News, and a game detail route.
11. On each page, confirm the Assistant, TopBar help, and PageHelp explain the same:
   - what the page is for
   - what decision the user can make
   - what OVR/ratings/stat context matters
   - one next action
12. Toggle Explain ratings and Deeper strategy.
13. Toggle Hardcore mode, then return to Newcomer mode.
14. Dismiss route help with Got it, navigate away/back, and use Replay.
15. Sim enough to see ticker/story context and confirm the Assistant can show/dismiss a story callback.

## UX Overhaul Checklist

Use this checklist for the UI/UX + OOTP-reference overhaul acceptance pass.

1. New game: start from Save Hub, create a dynasty, and confirm the first route explains the setup decision.
2. Onboarding: complete Day One, choose an assistant profile, and confirm guided-start nudges appear only after eligible saves.
3. Dashboard: confirm Reports Hub and Quickstarts are visible before dense intelligence panels, and all links open real routes.
4. Quick trade: use `/trade?mode=quick`, pick partner, my asset, target asset, read fairness, and start negotiation.
5. Shop player: open a user-team player profile, choose Shop Player, and confirm `/trade?playerId=...&mode=quick` preserves that context.
6. Roster compliance: visit Roster and confirm help points to the next legal roster action before simming.
7. Sim month: sim a month, review Pulse, News, Trade Intel, and History/Records for changed-state reports.
8. Settings replay: use Settings > Guidance Replay to replay Assistant help, guided-start nudges, tutorial/help, and dashboard quickstarts without clearing saves.
9. Save/return: save, reload the slot, and confirm dynasty state is unchanged while local guidance replay state behaves as reset.
10. Mobile: repeat Dashboard, Quick Trade, Roster, Reports Hub, and Settings Replay at 360x640 or 375x667.

## Mobile Script

Viewport target: 360x640 or 375x667.

1. Repeat Setup, Onboarding, Dashboard, Roster, Quick Trade, Reports Hub, Settings Replay, and Draft checks.
2. Confirm Assistant compact chip does not hide the bottom nav or sim controls.
3. Open the Assistant and confirm the panel scrolls internally.
4. Confirm all Assistant buttons are touch-sized and text wraps.
5. Confirm Escape closes the expanded panel on desktop/tablet.
6. Confirm reduced-motion users are not dependent on animation.

## Feedback Capture

Ask testers to answer:

- Did you always know the next thing to try?
- Which page was still confusing?
- Did OVR/ratings make more sense after using Explain ratings?
- Did the Assistant feel helpful or intrusive?
- Did Hardcore mode remove enough basics?
- Did anything cover controls on mobile?
- Which Assistant line felt too long, too vague, or too repetitive?

## Low-Risk Share/Social Suggestion

If a follow-up slice is available, add a copyable "Dynasty status card" from History or Dashboard:

- team, season, record, phase
- best player / top prospect
- current goal
- one story line from the Assistant

Keep it local-only and text-based first.
