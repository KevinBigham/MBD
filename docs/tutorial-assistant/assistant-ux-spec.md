# Tutorial Assistant V1 UX Spec

## Primary Surface

The Assistant is a global fixed control mounted in `AppLayout`.

- Desktop: compact bottom-right panel above sim controls.
- Mobile: bottom drawer/chip above the mobile nav and sim controls.
- Default state: compact chip labeled "Assistant" / "What now?"
- Expanded state: route-aware guidance with one next action, why the page matters, ratings focus, and deeper strategy.

## Core Actions

- What should I do now?
- Explain this page.
- Explain ratings.
- Show deeper strategy.
- Got it / dismiss.
- Replay current page guidance.
- Switch newcomer/hardcore mode.

## Persistence

- Store tutorial progress, dismissed route guidance, mode, and story callback cooldowns in localStorage.
- Key by active save id/slot when available.
- Use a global fallback key before a save is active.
- Do not change `GameSnapshot` for V1 unless the save schema is intentionally bumped.

## Mobile Rules

- Expanded panel maxes out below full-screen height and scrolls internally.
- Never cover bottom nav/sim controls without the user opening the drawer.
- All controls meet 44px touch target.
- No horizontal scrolling.
- Text is short and wraps.

## Accessibility Rules

- Expanded panel uses `role="dialog"` or a clearly labeled complementary region.
- Buttons have explicit labels.
- Escape closes expanded panel.
- Focus remains sane; no forced focus trap for the compact chip.
- Respect reduced motion.
- Story updates use polite aria-live, not assertive interruptions.

## Integration Rules

- Keep existing `TourProvider`, `PageHelp`, `ContextualHelp`, `GameAdvisor`, and guided-start nudges working.
- Assistant V1 becomes the unifying route-aware surface, not a destructive replacement.
- Reuse route definitions and localStorage patterns where possible.
