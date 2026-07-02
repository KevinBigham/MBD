# ORG-DRAFT-1 — Fair CPU Draft Identity

## Objective

Make CPU clubs choose differently in the draft for understandable organization reasons, without hidden information, outcome bonuses, or nondeterministic noise.

## Source-first checkpoint

Map current draft AI inputs, scouting visibility, roster-needs model, tie-breaking, league/team stable IDs, and any existing organization identity fields. Confirm what information the CPU currently sees.

## Design

- Use 4-6 bounded preference traits at most: risk/upside, scouting trust, age, pitching/hitting lean, BPA-vs-need, premium-position bias.
- Preferences adjust candidate weighting within a tested defensible band; they never alter true ratings, potential, development, RNG outcomes, budget, or scouting certainty.
- CPU may use only information available under the existing AI/scouting contract.
- Profile generation must be deterministic from stable save/team inputs.
- Freeze or version the generation algorithm. If profiles must remain stable across future releases and no persisted identity exists, document the compatibility strategy before cross-domain expansion.
- Produce truthful pick explanations from the factors actually used; no fake personality labels.

## Proof

- same save/seed/team -> same profile and pick;
- constructed board where two profiles choose different defensible players;
- bounded-weight property tests;
- no-bonus/no-true-talent-access invariant;
- flag/legacy parity if an existing feature flag is used;
- draft quality/fairness regression;
- determinism and full gates.

## Scope cut line

Draft lane only. No development, trade, free agency, payroll, profile persistence migration, new route, or outcome bonuses.

## Done

CPU draft choices are reproducibly differentiated, explainable from real preferences, fair under existing information, and regression-tested.
