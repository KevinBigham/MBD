# Tutorial Assistant V1 Asset Plan

## V1 Asset Approach

Ship with a production-safe CSS/SVG-style avatar first, then replace with generated raster assets when available.

## V2 Shipped Asset Hook

`apps/web/src/features/assistant/components/AssistantAvatar.tsx` now provides a production-safe inline SVG avatar with five expression states:

- neutral
- excited
- warning
- success
- thinking / scouting

The component is intentionally small, in-repo, and free of external image paths. Future portrait assets should replace the SVG behind the same expression enum.

## Placeholder Requirements

- Small avatar for compact chip.
- Larger avatar in expanded panel.
- Neutral, warning, success, and excited states represented through border/accent/icon state.
- No broken image paths.
- No dependency on external asset hosting.
- Reduced-motion users see no pulse/entrance animation.

## Future Generated Assets

Desired files under the appropriate `apps/web/public/` assistant asset folder:

- `mack-mercer-hero.webp`
- `mack-mercer-avatar.webp`
- `mack-mercer-neutral.webp`
- `mack-mercer-excited.webp`
- `mack-mercer-warning.webp`
- `mack-mercer-success.webp`
- transparent PNG fallbacks if useful

Prompt direction:

Modern fictional baseball front-office assistant / bench coach, polished sports management sim tone, friendly but sharp, dark UI compatible, not goofy, no real person likeness, no team logos, no copyrighted marks.
