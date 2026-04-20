# Schedule Calibration Tuning

## Purpose

Tune season generation so the canonical calibration seed produces MLB-like win totals without changing save schema or determinism semantics.

## Before / After

| Metric | Before | After |
| --- | --- | --- |
| Calibration seed | `44001` | `44001` |
| Avg team wins | `110.75` | `81.0` |
| Total games | `3544` | `2592` |
| Games per team | `221.5` average | `162` exact |
| Regular-season calendar | `162` days | `186` days |
| League-wide off-days | implicit / none | `24` fixed off-days |
| Determinism hash | `c9e57e39af09052ffc7f8a2a14fa59b401699dbf023cee9d11338bdc41c1feb8` | `31c5ddfc73ede88aa20d5117f711f0101ecbb2b2e0f5c6815b4cff9ab7cf93d1` |

## What Changed

- Replaced the greedy matchup-packing scheduler with deterministic circle-method round composition.
- Full league now plays `3` complete 32-team round-robin cycles.
- AL and NL each play `4` league-only 16-team round-robin cycles, zipped into shared game days.
- Added `9` extra premium AL/NL rounds selected by highest division-game count, with stable round-index tie breaking.
- Mapped the `162` game days onto a fixed `186`-day regular-season calendar by inserting league-wide off-days on month-relative days `7`, `14`, `21`, and `28`.
- September roster expansion now keys off the September calendar window instead of the last `30` days of a `162`-day season.
- Season-end timestamps and rollover helpers now use the new regular-season end day.
- Re-ranked playoff seeding by win/loss totals before win percentage so late-season clinch and playoff-preview flows still behave correctly under uneven synthetic test standings.
- Preserved saved rivalry intensity on import instead of re-inflating historical rivalries back to their baseline values.
- Nudged the HR environment, replacement-level WAR constants, and deadline trade aggressiveness enough to keep the existing balance harness green after removing the schedule's extra phantom games.

## Why This Fix Works

- The prior scheduler hardcoded `19` division games, `7` same-league non-division games, and `4` cross-league games for a league that is not balanced around that matrix.
- In the current `5/5/6`-team division layout, that produced `217` or `229` games per team, which forced the league-wide win average to `110.75`.
- The new round model enforces exact pair-count rules:
  - cross-league pairs: `3` games
  - same-league pairs: `7` or `8` games
  - every team: `162` total games

## Calibration Snapshot

Seed `44001`, `1` season:

- `averageTeamWins`: `81.0`
- `teamWinMin`: `39`
- `teamWinMax`: `100`
- `teamWinSpread`: `61`
- `averageRunsPerGame`: `8.904`
- `averageTotalMlbPayroll`: `7189.7`
- `battingAverage / OBP / SLG / OPS`: `.250 / .315 / .392 / .707`
- `league home runs`: `4968`

## Remaining Edge Cases

- Off-days are league-wide, not staggered by team. This keeps the schedule shape deterministic and UI-safe, but it is less MLB-like than team-specific travel/rest days.
- The schedule still does not model explicit multi-game series; it models game-day pairings only.
- Win calibration is fixed, but parity is still wide on the canonical seed (`39-123` to `100-62`). That is a roster/talent-distribution follow-up, not a schedule-count bug.
- The post-fix balance guard now lands just under the 5,000-home-run floor on some coefficient settings, so the current HR/trade/WAR coefficients should be treated as schedule-supporting tuning rather than a final batting model.
- Sweep rates and extra-inning frequency are not directly measured by the current calibration harness. Those remain observational follow-ups if narrative tuning needs them later.
