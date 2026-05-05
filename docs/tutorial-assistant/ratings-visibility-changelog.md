# Ratings Visibility Changelog V2

## Added / Improved

- Shared `RatingBadge` component for compact OVR/grade display.
- Player Profile header now uses the shared OVR badge.
- Roster DFA, promotion, waiver, and extension decision cards now surface OVR/grade where available.
- Finance contract table now includes sortable OVR/grade.
- Trade selected-package labels now include position, OVR, and grade.
- Trade asset rows use the shared badge in OVR cells.
- Scouting pro-search rows now show OVR/grade before ordering a report.
- Minors farm report and Pipeline View use display-scale OVR badges.
- Worker DTOs for minors/finance/action-card views now normalize display OVR at UI boundaries.

## Guardrails

- No save schema changes.
- No simulation logic changes.
- Internal 0-550 ratings remain internal; player-facing V2 surfaces use display-scale 20-80 where possible.

## Remaining Gaps

- Incoming AI trade offers still use reduced worker-side labels.
- Player Compare picker could use OVR in search/selection chips in a follow-up.
- Free Agency market intelligence cards can show OVR beside projected value in a follow-up.
