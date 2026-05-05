# Narrative Continuity V2

## Shipped

The Assistant now renders a safe "Story so far" section based on app-shell context:

- phase
- season/day
- games played
- user team standing when available
- days until trade deadline when available
- prior season summary when available

The lines are deterministic pure functions in `assistantGuidance.ts`.

## Save Safety

- No `GameSnapshot` fields changed.
- No save schema version bump.
- No migration needed.
- No RNG or `Math.random`.
- Cooldowns remain in existing Assistant localStorage only.

## Behavior

- Preseason / empty saves: explains the clean opening checkpoint.
- Around .500: frames buy/sell/hold decisions.
- Winning teams: frames window protection.
- Struggling teams: frames payroll/prospect protection.
- Deadline window: adds a second line pointing to trade/payroll prep.

## Remaining Gap

Roster weakness and payroll-specific story lines are intentionally deferred until a deeper safe snapshot selector exists.
