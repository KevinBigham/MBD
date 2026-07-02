# MEMORY-ERAS-1 — Derived Eras and Rivalry Origins

## Objective

Turn the factual MEMORY-0 ledger into stable, evidence-cited eras and rivalry origins without storing hindsight judgments or inventing old-save history.

## Dependencies

MEMORY-0 must be merged and have sufficient factual coverage. Stop if the ledger cannot support honest derivation.

## Design

- Derive eras and rivalry origin/escalation on read from real events and existing rivalry state.
- Every label/summary must cite the events that triggered it.
- Use deterministic thresholds, stable grammar, anti-repetition, anti-hindsight, and minimum-evidence rules.
- Old saves with sparse coverage receive honest limited summaries, never fabricated origins.
- Reuse existing history/rivalry surfaces; no new route.

## Proof

- same save -> same eras/names every load;
- no label without minimum evidence;
- adding a later event does not rewrite already closed historical facts improperly;
- anti-repetition/absurd-name tests;
- old-save sparse coverage;
- browser rendering and full gates.

## Scope cut line

Derived read models and existing UI only. No stored era/HOF judgment, no retired numbers, no new event types solely to force a story, no schema bump unless live source proves unavoidable.

## Done

Players can see evidence-backed eras and rivalry origins that are deterministic, honest, and linked to factual history.
