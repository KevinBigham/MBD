# Simulation Core Rules

These instructions extend the repository root `AGENTS.md` for `packages/sim-core`.

- Preserve seeded determinism and stable tie-breaking. Never add `Math.random()`.
- New CPU organization behavior may change preferences and selection weights, not true ratings, outcomes, development rolls, budgets, or information access unless the user has the same costed mechanism.
- Keep preference effects bounded and explainable. Add property/invariant tests in addition to examples.
- Use existing scouting visibility rather than privileged true talent when making CPU decisions.
- Any algorithm version that must remain stable across existing saves needs an explicit compatibility strategy; do not silently change derived organization identities across releases.
- Do not mix player-facing copy or browser persistence into simulation core.
