# Assistant Visual System V2

## Shipped

- `AssistantAvatar` is an in-repo SVG/CSS component, not an external image.
- Expression states: neutral, excited, warning, success, thinking.
- Expression mapping:
  - warning: market/trade story signals
  - success: completed route guidance
  - excited: playoff/major moment guidance
  - thinking: scouting, draft, minors, player profile, player compare
  - neutral: default route help
- Motion:
  - subtle entrance animation
  - one-shot success/replay pulse
  - all animation uses `motion-safe` so reduced-motion users get static UI
- Accessibility:
  - avatar exposes `Mack Mercer expression: <state>`
  - the chip says Mack Mercer instead of generic Assistant

## Future Asset Replacement

The current SVG can be replaced by raster or richer vector files without changing Assistant state:

- neutral portrait
- excited portrait
- warning portrait
- success portrait
- thinking/scouting portrait

Keep the same expression enum and never ship external/broken asset URLs.
