# ORG-DEV-1 — CPU Development Symmetry

## Objective

Make CPU organizations express established identity through development choices using the same costed mechanisms and information available to the player, with no raw development bonus.

## Dependencies

ORG-DRAFT-1 profile contract must be stable enough to consume. Stop if profile compatibility is unresolved.

## Source-first checkpoint

Map progression math, coaching/development budgets, player development programs, CPU promotion/assignment logic, and any user-only identity effects. Separate choices from outcome rolls.

## Design

- Identity affects allocation, focus, patience, promotion posture, and resource choices only where those are real mechanisms.
- Do not multiply ratings growth or improve hidden probabilities for CPU clubs.
- Cost/budget effects must be symmetric and debited from real resources.
- Use existing scouting knowledge, not true potential.
- Record only factual decisions/events through MEMORY-0 when useful; do not store narrative reputation as truth.

## Proof

- no-bonus invariant;
- symmetric-cost tests;
- same-seed reproducibility;
- constructed profiles choose different development actions;
- player growth distribution remains within existing calibration bounds;
- multi-season soak for divergence without runaway imbalance;
- full gates.

## Scope cut line

Development and promotion/assignment decisions only. No trade, FA, payroll, broad worker split, mentorship system, or new UI route.

## Done

CPU clubs make meaningfully different, fair, costed development choices while outcome math remains symmetric and deterministic.
