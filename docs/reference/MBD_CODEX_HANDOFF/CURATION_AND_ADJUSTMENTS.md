# Curation and Required Adjustments

The Claude Code handoff is strong as a **decision archive**, but several parts should not be handed to Codex as controlling implementation code.

## Keep as primary reference

1. `06_CANONICAL_PRODUCT_AND_ENGINEERING_DIRECTION.md` — the clearest product thesis and guardrails.
2. `04_COUNCIL_DECISION_LEDGER.csv` — the accept/reduce/reject record.
3. `08_TRACEABILITY_MATRIX.csv` — useful requirement-to-proof structure.
4. `09_RELEASE_AND_VALIDATION_GATES.md` — strong test philosophy; commands must still be re-read from the live repo.
5. `starter_pack/test_matrix.md`, `deterministic_scenarios.json`, `playwright_reload_spec.md`, and `REVIEW_CHECKLIST.md` — strong acceptance inputs.
6. `next_slice_packets/` — useful design briefs after dependency and scope corrections.

## Treat as reference-only or replace

### `01_CURRENT_SOURCE_TRUTH.md`

It records a valuable audit snapshot, but it contains absolute paths, a specific commit, and a v33/v34 discrepancy from another machine. It will become stale immediately. The new workflow makes Codex regenerate source truth for every goal using `SOURCE_TRUTH_TEMPLATE.md`.

### `11_MASTER_CODEX_ORCHESTRATION_PROMPT.md`

The rules are good, but repeating a large master prompt wastes context. The durable rules now live in layered `AGENTS.md` files; the repeated workflow lives in Skills; only slice-specific details live in goal files.

### `starter_pack/proposed_types.ts`, `proposed_contracts.ts`, and `proposed_worker_api.ts`

These are useful thought experiments, not starter code. Specific issues:

1. The documents alternately place the revision in worker state and on the main thread.
2. Adding `revision` to the serialized snapshot may require a schema declaration or migration; “no bump” cannot be assumed.
3. The reference retry calls `exportSnapshot()` again instead of retaining or superseding the exact failed snapshot, despite claiming retry must use the captured snapshot.
4. The debounced scheduler can clear an earlier timer while leaving the earlier returned promise unresolved.
5. A revision comparison alone does not prevent an older IndexedDB write from completing after a newer write unless writes are serialized or storage-guarded.
6. The proxy wrapper may be brittle around Comlink method binding and obscures which methods are truly mutating.

The replacement TRUST-A goal specifies **behavioral invariants** and lets Codex select the smallest source-compatible implementation.

### Mandatory feature flag

The original pack requires a flag whose OFF state intentionally preserves broken persistence. That adds a second code path and delays value. The corrected rule is:

- Reuse an existing lightweight flag only when it materially reduces rollout risk.
- Do not create a new flag framework.
- Do not merge a knowingly broken OFF path merely to satisfy a planning artifact.
- Git/worktree rollback plus tests is acceptable when the change is narrow.

## Roadmap corrections

### Event spine before prospect UI

The original roadmap puts `B-PROSPECT` before `H-MEMORY`, while B-PROSPECT needs a canonical event owner and H-MEMORY claims to become that owner. The corrected sequence adds `MEMORY-0` first, so the prospect slice writes into one established ledger instead of creating a second migration or temporary schema.

### Split CPU organization expansion

The original `O-DEVSYM` combines development, trades, free agency, and payroll. Those touch different large modules and have different fairness tests. It is split into three goals:

- `ORG-DEV-1`
- `ORG-TRADE-1`
- `ORG-MARKET-1`

### One-shot per slice, not one-shot per roadmap

A single goal for all ten slices would be an open-ended backlog with multiple schema changes and shared-file conflicts. Each goal is designed to be completed independently and reviewed before the dependent goal starts.

## TRUST-A architecture invariants adopted

The implementation must guarantee:

1. An accepted mutation is bound to one **exact post-mutation full snapshot** and the intended save slot.
2. Durable writes are serialized or otherwise guarded so an older write cannot land after a newer write.
3. The latest desired full snapshot supersedes stale failed retry candidates.
4. Retry persists state only; it never reruns the gameplay mutation.
5. `Saved` means the latest desired snapshot is durable, never merely exported or queued.
6. A rejected/no-op action creates no dirty state.
7. Active-save changes cannot send a snapshot to the wrong slot.
8. No schema field or persisted revision is added unless live source inspection proves it is necessary and fully migrated.

## Handoff housekeeping issue

Several files reference `normalized_sources/final_integration/README.md`, but that directory is not present in the supplied ZIP. Those references are omitted from this execution system.
