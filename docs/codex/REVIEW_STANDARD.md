# MBD Review Standard

Review the active goal against its plan, diff, tests, and runtime proof. Findings should include severity, evidence, player risk, and the smallest safe correction.

## Blocking review areas

1. **Source fidelity** — did the implementation fit the live repo, or force stale handoff assumptions?
2. **Scope** — did unrelated features/refactors enter the diff?
3. **Persistence** — exact snapshot, correct save ID, ordered writes, latest-state retry, truthful status, reload proof.
4. **Determinism** — seeded randomness, stable ordering/IDs, unchanged gates.
5. **Save compatibility** — current version, migrations, fixtures, old/deep-save and import/export.
6. **CPU fairness** — no hidden truth, ratings/outcome/budget bonus, or asymmetrical free mechanism.
7. **History honesty** — factual events only, no fabricated old-save past, derived judgments not stored as fact.
8. **Tests** — do tests prove behavior rather than mock away the risk? Are browser tests real IndexedDB reloads?
9. **UX/a11y/mobile** — clear status/copy, no fake controls, no occlusion, usable error recovery.
10. **Maintainability** — minimal boundary, no duplicate persistence or competing event owners, clear ownership.

## Severity

- **P0:** data loss/corruption, false saved state, deterministic break, hidden AI advantage, old-save destruction.
- **P1:** acceptance failure, race, missing migration/reload proof, wrong event ownership, major scope breach.
- **P2:** maintainability, weak test, unclear copy, nonblocking performance/accessibility issue.
- **P3:** polish or optional follow-up.

No goal is merge-ready with an unresolved P0 or P1.
