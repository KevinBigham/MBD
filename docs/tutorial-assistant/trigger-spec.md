# Tutorial Assistant V1 Trigger Spec

## Trigger Types

| Trigger | Behavior |
| --- | --- |
| Manual open | Always available from the global Assistant chip |
| Route change | Update current page guidance silently |
| First route visit | Show compact "new guidance available" state, not a blocking popup |
| Dismiss | Mark current route guidance seen for this save |
| Replay | Clear current route dismissal and open guidance |
| Mode switch | Persist newcomer/hardcore mode |
| Story callback | Show one save-aware line when relevant and not on cooldown |

## Initial Story Callback Sources

- Current phase and day from `useGameStore`.
- Active save id/slot from `useGameStore`.
- Ticker feed from `AppLayout`.
- Route context from `useLocation`.

## Cooldown Rules

- Do not repeat a story callback once dismissed for the same save.
- Prefer exact ticker ids when available.
- Fall back to route/phase callback ids.
- Do not generate random callback lines.

## Priority Order

1. Blocking/urgent next action from phase/route context.
2. Route-specific page guidance.
3. Ratings explanation when the page is decision-heavy.
4. Save story callback.
5. Deeper strategy.

## Non-Triggers

- Do not auto-open over Monthly Pulse, Moment Card, press conference, command palette, or save recovery dialogs.
- Do not auto-open repeatedly on every route change.
- Do not interrupt simulation.
