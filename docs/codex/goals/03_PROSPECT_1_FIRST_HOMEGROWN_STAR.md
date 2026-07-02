# PROSPECT-1 — First Homegrown Star

## Objective

Complete one emotional vertical slice: draft/sign a prospect, hand the player into the real farm system, make one meaningful development commitment, observe legal promotion/MLB debut, and view the factual origin-to-debut story after reload.

## Dependencies

TRUST-A and MEMORY-0 must be merged. Stop if either contract is absent.

## Source-first decisions

- Confirm real draft signing and affiliate assignment behavior. UI copy must read actual assignment, never invent one.
- Confirm the existing persisted development-program field and its real effects.
- Confirm a shared legal promotion/readiness evaluator. Add `protect|balanced|challenge` only if it changes a real, tested decision path; otherwise omit the control.
- Reuse MEMORY-0 for all events. Do not add another player-journey ledger.

## Player experience

On existing routes only:

1. After signing, show a concise handoff/receipt with actual team/affiliate state and a direct next action.
2. On minors/player profile, offer one restrained development commitment using existing mechanics.
3. Emit factual commitment, level-transition, and MLB-debut events through MEMORY-0.
4. Render a simple accessible timeline on an existing player/history surface.
5. Preserve uncertainty; do not promise outcomes or expose formulas.

## Proof

- unit/integration for real affiliate state, commitment mutation, event emit/dedupe, promotion/debut fact detection;
- migration coverage only if truly required beyond MEMORY-0;
- hard reload after signing/handoff, commitment, promotion, and debut;
- no fabricated events for pre-feature saves;
- 10-25 season deterministic scenario proving the loop can complete without duplicate events or runaway save growth;
- mobile/a11y check;
- full gates and determinism.

## Scope cut line

No mentorship assignment, organization-role priority field, new development formula, CPU org profiles, eras, HOF, new route, or broad player-profile redesign. Cut visual richness before cutting persistence, real causality, or history continuity.

## Done

A source-confirmed prospect can travel from acquisition to MLB debut with one real player commitment, all state survives reload, and one coherent factual timeline tells the story.
