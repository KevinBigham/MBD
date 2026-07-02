# TRUST-A — Exact Save Persistence and Reload Trust

## Objective

Make every existing high-emotion mutation touched by this slice durable across a hard reload and expose truthful save progress/error state, using the current local IndexedDB architecture.

## Read first

- `docs/codex/CANONICAL_DIRECTION.md`
- original handoff: canonical direction, decision ledger, release gates, starter test matrix/scenarios/review checklist
- live save/persistence, worker API, draft, app-shell, press, development-plan, and existing E2E source

## Source-first checkpoint

Before production edits:

1. Record the real save version, active-save model, snapshot export path, IndexedDB write path, worker mutation surface, current autosave lanes, current tests, and any already-present June fixes.
2. Enumerate every high-emotion mutation that currently exists. Do not invent lanes from the audit.
3. Establish a green baseline or document pre-existing failures.
4. Write the live plan. Do not assume a persisted `revision` is necessary or migration-free.

## Required invariants

1. Each accepted mutation is bound to the intended `saveId` and one exact post-mutation full snapshot.
2. Durable writes are serialized or storage-guarded so an older write cannot complete after and overwrite a newer snapshot.
3. The coordinator tracks a runtime desired generation and durable generation. These generations should remain runtime/save-record metadata unless live source proves game-snapshot persistence is necessary.
4. A later captured full snapshot supersedes stale failed retry snapshots because it contains all prior accepted mutations.
5. Retry persists the latest captured snapshot only; it never reruns the gameplay mutation.
6. `Saved` means the latest desired generation for that save is durable. Exported, queued, or in-flight is not saved.
7. Rejected/no-op mutations do not create dirty/saving state.
8. Active-save switching cannot write a snapshot into the wrong slot.
9. Existing saves and import/export remain compatible.

## Architecture selection order

Prefer the smallest live-source-compatible option:

1. Reuse an existing central persisted-mutation executor/coordinator if one exists.
2. Otherwise add a main-thread coordinator around the existing snapshot export and IndexedDB persistence path.
3. Route the identified high-emotion action handlers through one explicit executor or a typed mutation registry.
4. Use a worker-proxy wrapper only if Comlink binding, error semantics, no-op detection, and mutation classification can be proven cleanly.
5. Add a serialized/persisted game revision only if the existing source already supports it or a fully covered migration is truly required. A runtime write generation is preferred.

Do not create a new save engine, service-worker writer, background sync, CRDT, vector clock, or server dependency.

## Player-facing state

Expose compact shell status using existing design primitives:

- `Saving…`
- `Saved` plus existing last-saved metadata when available
- `Save failed` with actionable retry and storage-specific copy when classified

Use text and `aria-live`; never occlude mobile content. Do not require a new feature-flag framework. Reuse an established lightweight flag only if it materially helps rollout and does not preserve an untested broken path.

## Required lanes

At minimum, source-confirm and cover:

- draft pick and draft signing;
- monthly report/decision/ceremony acknowledgment or dismissal;
- press response if it is a mutation;
- development-plan apply if it exists;
- existing sim/roster/trade/news persistence regression.

## Proof

- unit: coordinator state, exact snapshot retention/supersession, ordered writes, no-op, failure classification, retry-without-rerun, save-ID ownership;
- integration: every source-confirmed lane persists its post-mutation snapshot once;
- browser: action -> truthful Saved -> hard reload -> effect remains;
- browser failure: block/reject IndexedDB write -> never show Saved -> restore -> retry -> reload holds;
- burst: multiple mutations before write completion -> latest full state persists exactly once;
- active-save switch race;
- pre-existing save and import/export regression;
- full typecheck/test/build/determinism equivalents;
- no new unseeded randomness.

## Scope cut line

No prospect feature, event ledger, CPU identity, worker decomposition, new route, or unrelated cleanup. Consolidate duplicated persistence only when required for this contract and low risk.

## Done

All existing high-emotion lanes in scope survive real reload; save status is truthful under success and failure; ordering and save-slot ownership are proven; old saves remain compatible; all gates and adversarial review are clean.
