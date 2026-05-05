# Tutorial Assistant V1 Ratings Visibility Audit

Date: 2026-05-05

## Rating Model

- Engine values are internal 0-550 ratings.
- UI values generally expose display ratings around the familiar baseball 20-80 scale through `displayRating`.
- Contracts still store `overallRating`; UI DTOs frequently provide both `overallRating` and `displayRating`.

## Current Strengths

- Roster position-player and pitcher tables show OVR and letter grade.
- Players directory shows OVR and grade.
- Player profile header shows current OVR, grade bars, and deeper tabs.
- Free agency table and selected-player panel show OVR.
- Trade tables and selected-player rows show OVR.
- Draft and scouting surfaces show current/potential report values.
- Minors pipeline shows OVR for prospects.
- Setup preview shows selected club player OVR.

## Priority Gaps

| Priority | Surface | Gap | Recommendation |
| --- | --- | --- | --- |
| P1 | Global understanding | OVR appears often, but there is no consistent explanation of what it means | Add Assistant "Explain ratings" panel with OVR, grade, ceiling, floor, confidence, and when stats/fit beat OVR |
| P1 | Dashboard | Users make sim/strategy decisions without seeing rating context | Assistant should explain which roster/health/trade/farm cards imply OVR checks |
| P1 | Draft | Prospect current value vs ceiling/signability needs explicit framing | Assistant route guidance should explain OVR/current ability, ceiling/upside, confidence/risk |
| P1 | Trade | Users need value model, not just OVR column | Assistant should explain OVR + age + contract + control + position scarcity |
| P2 | Minors | Promotion decisions need level/age context | Assistant should explain readiness and why raw OVR is not the only promotion signal |
| P2 | Finance | Contract decisions need player-value tie-in | Assistant should explain that OVR helps estimate talent, but payroll efficiency and window matter |
| P2 | Staff/scouting | Staff grades and scout confidence are rating-like but not always connected to player outcomes | Assistant should explain teaching, impact, fit, confidence, and bias |

## Implementation Direction

- Do not add clutter to every table just to satisfy visibility; many OVR columns already exist.
- Add a reusable Assistant ratings explainer first.
- Add route-specific `ratingsFocus` copy to guidance data for decision pages.
- Add visible OVR/rating badges only where an audited decision surface truly lacks them.
- Keep mobile density tight: show one primary rating at decision point and deeper detail in Assistant.
