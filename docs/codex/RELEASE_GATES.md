# Release and Validation Gates

The live repository's package files are authoritative. At each goal start, record exact commands in the run plan.

Kevin's standing authorization in `STANDING_USER_AUTHORITY.md` permits remote,
deployment, and release work when the campaign reaches it. Authorization does
not make a candidate releasable: every applicable gate below must still pass.
Failed gates stop the affected candidate. They do not create a permission-only
wait when a fresh bounded correction or proof route can be frozen without
changing the product contract.

## Baseline

- cleanly identify pre-existing failures before edits;
- typecheck;
- targeted tests for touched modules;
- full test suite;
- production build;
- deterministic verification;
- no new bare randomness;
- no new cycle/dead-code findings attributable to the slice when those checks exist.

## Persistence and save changes

- exact post-mutation snapshot bound to the intended save slot;
- ordered durable writes;
- no false `Saved` state;
- failure injection and retry-without-rerun;
- burst mutation ordering;
- hard reload;
- active-save switch race;
- pre-existing save load;
- import/export round-trip when snapshot or save path is touched;
- mobile/PWA check when shell UI or local storage behavior changes.

## Schema changes

- confirm current version;
- additive migration from the actual previous version;
- fixture(s), including a deep/old save;
- parse and round-trip tests;
- no fabricated history;
- hard reload and import/export;
- rollback/compatibility statement.

## CPU decision changes

- same seed reproducibility;
- bounded preference effect;
- no true-talent or privileged-information leak;
- no outcome/ratings/budget bonus;
- fairness floors and exploit tests;
- constructed scenario proving identity changes a choice;
- multi-season soak before cross-domain expansion.

## History changes

- deterministic event IDs and dedupe;
- factual source/provenance;
- old-save coverage begins honestly;
- no destructive pruning;
- derived era/reputation results stable across reload;
- bounded save growth.

## Stop-ship conditions

- any high-emotion mutation is lost on reload;
- the UI can report saved before durability;
- old writes can overwrite newer state;
- an existing save fails or fabricated history appears;
- determinism regresses;
- CPU receives an uncosted advantage;
- required gates are red;
- the slice crossed its documented scope cut line.
