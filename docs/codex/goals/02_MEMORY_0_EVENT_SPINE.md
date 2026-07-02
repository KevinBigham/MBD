# MEMORY-0 — Canonical Factual Event Spine

## Objective

Establish one canonical, append-only factual event owner that future prospect, rivalry, award, and organization stories can use without competing ledgers or fabricated old-save history.

## Source-first checkpoint

Inspect all existing history, narrative, player-origin, prospect-bond, archive, news, record, award, and timeline schemas/read models. Determine whether an existing event collection can be extended. Do not assume `history.events[]` or `narrative.playerJourney` is correct until source proves the lowest-risk owner.

## Required design

- exactly one event owner;
- typed base fields and a small discriminated payload union for initial factual events;
- deterministic event ID and dedupe key from stable game facts, never wall clock or random UUID;
- actor/subject/team/season/date references using existing IDs;
- provenance/source version and honest coverage-start metadata;
- append/dedupe API shared by future emitters;
- factual events stored; salience, era labels, rivalry interpretation, and narrative language derived on read;
- old saves initialize empty and show coverage begins after upgrade; no backfilled invented events.

Implement only the smallest source-supported factual emitters needed to prove the seam, preferably acquisition/draft and MLB debut if those facts can be observed reliably. Do not build a full era/HOF system.

## Save work

If serialized shape changes, confirm the actual current version and implement an additive migration, fixtures including a deep/old save, import/export round-trip, hard reload, and compatibility report.

## Proof

- deterministic ID/dedupe property tests;
- duplicate emit is idempotent;
- old save migrates with zero fabricated events;
- factual emitter integration tests;
- reload and import/export;
- bounded growth scenario;
- existing history/archives remain unchanged;
- full gates and determinism.

## Scope cut line

No prospect commitment UI, no eras/rivalry names, no HOF/retired numbers, no destructive pruning, no new route, and no second event ledger.

## Done

One source-grounded event owner exists, initial facts can be emitted and rendered/diagnosed through an existing surface, old-save coverage is honest, migrations and reload are proven, and later goals can consume the API without another schema decision.
