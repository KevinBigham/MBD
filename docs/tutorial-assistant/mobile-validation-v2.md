# Mobile Validation V2

## Implemented Hardening

- Assistant chip moved above mobile nav, ticker, and sim controls using safe-area-aware offset.
- Assistant panel max height reduced on phone-size screens.
- Assistant footer actions are sticky inside the panel.
- Main content has larger mobile bottom padding.
- Sim controls reserve mobile bottom-nav space.
- Mobile nav now uses explicit routes instead of brittle numeric indices and includes Trade/League.
- More drawer safe-area padding is explicit.
- Primary orange buttons in touched surfaces use dark text for contrast.
- PWA update toast is dismissible and offset above mobile controls so it does not block bottom navigation.
- Focus moves to Close Assistant on open.
- Escape closes the Assistant panel.
- Expandable Assistant sections expose `aria-expanded` and `aria-controls`.
- Global Space sim shortcut no longer fires from focused buttons, links, or role buttons.

## Routes Covered By Audit

- Setup
- Onboarding
- Dashboard
- Roster
- Player Profile
- Scouting
- Draft
- Trade
- Free Agency
- Finance
- Settings

## Browser Smoke Status

Passed at 390x844 on the production preview after clearing the local test service worker/cache and reloading fresh assets.

Verified Setup, Dashboard, Roster, Player Profile, Draft, Trade, Scouting, Finance, Free Agency, Settings, corrected mobile bottom tabs, dismissible update toast, Assistant open/close focus, and the copyable feedback form.

## Known Remaining Risks

- Legacy guided-start nudge and Assistant can still coexist; closed playtest should confirm whether this feels noisy.
- Several deep decision tables still use dense desktop table markup on mobile, though key V2 rating surfaces now have compact badges.
