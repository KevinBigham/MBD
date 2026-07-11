# TRUST-SAVE-INDICATOR-1 — Truthful Global Save Recency and Queue Depth

## Objective

Complete roadmap item 2 by adding a global app-shell indicator with the player-facing contract `Last saved 7:42:03 PM · 0 pending writes`. It must show the active save's most recent **durable** write time and exact outstanding persistence depth without weakening the existing `Saving…`, `Saved`, or `Save failed` trust contract.

This goal owns roadmap item 2 only. It does not implement autosave retry/export fallback, checksums, multi-tab locking, storage pressure, or a write-ahead journal.

## Read first

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `PLANS.md`
- `DESIGN.md`
- `docs/codex/CANONICAL_DIRECTION.md`
- `docs/codex/RELEASE_GATES.md`
- `docs/codex/REVIEW_STANDARD.md`
- `docs/codex/goals/01_TRUST_A.md`
- `docs/codex/runs/TRUST-A/COMPLETION.md`
- `docs/codex/goals/13_TRUST_PLAYWRIGHT_1.md`
- `docs/codex/runs/TRUST-PLAYWRIGHT-1/COMPLETION.md`
- live active-save coordinator, save-record metadata, active-slot switching, app-shell status, and browser-test source

## Source-first checkpoint

Before production edits:

1. Record branch, commit, dirty state, package manager, scripts, current save version, and baseline results.
2. Map the exact existing persistence state machine: desired generations/snapshots, ordered writes, failure retention, retry, active-save ownership, and status subscription.
3. Confirm what `SaveRecord.updatedAt` means, where it is assigned, and whether it is available on initial load and active-save switches without exporting or mutating gameplay state.
4. Define `pending writes` precisely from live coordinator semantics. It must not be a guessed boolean, caller count, timer, or number that can underflow during coalescing/retry.
5. Map desktop and mobile TopBar/AppLayout seams and existing tests. Prefer extending the current status surface rather than creating a competing save-state owner.
6. Decide how initial load, no active save, failed persistence, retry, save switching, and a burst of accepted mutations render. Record the contract in the plan.
7. Confirm the v34 schema is sufficient. A required snapshot migration is a stop condition for this slice.

## Required invariants

1. `Last saved` advances only after IndexedDB has durably accepted the latest displayed completion for the active save. Export success, mutation success, enqueue, and optimistic UI state may not advance it.
2. The displayed time belongs to the exact active save ID. Switching saves may never leak the previous slot's timestamp or pending depth into the new slot.
3. On initial/reload resume, the indicator hydrates from trustworthy persisted save-record metadata and shows zero pending writes once the active save is ready.
4. `pending writes` is exact for the coordinator's current active-save persistence work. It rises for accepted dirty snapshots, remains nonzero while the latest desired snapshot is in flight or failed/retryable, and returns to zero only when the latest desired state is durable or explicitly superseded by an active-save change.
5. Older completions may never move the time backward or clear pending state for a newer desired snapshot.
6. A rejected/no-op gameplay action creates neither a pending count nor a new saved time.
7. A failed durable write preserves the previous successful `Last saved` time, keeps outstanding work visible, and leaves the existing assertive failure/Retry UI intact. This slice does not add automatic retry or export fallback.
8. The shell remains compact, readable, and non-occluding on desktop and 375x667 mobile. Time plus queue text must not rely on color alone and must expose an accessible status description.
9. Formatting is deterministic under tests through an injected/explicit timestamp and locale contract. Wall-clock values remain UI/save metadata only and never enter simulation truth or deterministic event IDs.
10. Save schema remains v34. Existing old/deep saves, import/export, PWA, and TRUST-PLAYWRIGHT-1 behavior remain intact.

## Player-facing states

At minimum, source inspection must implement and test these semantics:

- loaded and clean: `Last saved <local time> · 0 pending writes`;
- one outstanding durable snapshot: prior durable time plus `1 pending write`;
- multiple outstanding coordinator generations, if live semantics permit them: correct pluralized depth;
- failed latest write: prior durable time plus nonzero pending depth, alongside existing `Save failed` and Retry;
- successful retry/latest completion: new durable time plus `0 pending writes`;
- no active/persisted save: an honest non-timestamp fallback or no indicator—never a fabricated `Last saved` value;
- active-save switch/reload: target save's persisted time and target queue state only.

## Architecture selection order

1. Extend the existing active-save persistence coordinator/status snapshot and subscription; do not add a second queue or polling timer.
2. Reuse persisted save-record `updatedAt` for hydration if live source proves it is the durable record timestamp. Do not add snapshot fields for display metadata.
3. Keep locale/time formatting in a pure UI helper with explicit inputs and focused tests.
4. Extend the existing TopBar/AppLayout status surface with a stable accessible contract; no new route or settings toggle.
5. Reuse and strengthen the permanent Playwright reload journey for browser proof. Do not inject worker or IndexedDB state to manufacture a timestamp or pending count.

## Proof

- focused coordinator tests for enqueue/in-flight/ordered completion/failure/retry/supersession/active-save switch and exact pending depth;
- focused shell tests for hydration, formatting, pluralization, failure preservation, accessibility, and compact desktop/mobile rendering contract;
- existing TRUST-A no-op/failure/order tests remain green;
- permanent Playwright journey proves a real accepted mutation reaches a durable local timestamp with `0 pending writes`, hard reloads, and resumes with a truthful persisted timestamp and zero queue depth;
- browser proof at desktop and 375x667 for visibility/non-occlusion of the shell indicator;
- full root `typecheck`, `test`, `build`, `verify:determinism`, and the permanent reload-smoke command pass;
- no new bare `Math.random()` or simulation-truth wall-clock usage;
- adversarial review finds no unresolved P0/P1.

## Scope cut line

No automatic retry, export fallback, quota/private-mode guidance, checksum/self-repair, multi-tab guard, storage-size UI, archive pruning, write-ahead intent journal, pending sim-day recovery, save schema migration, service-worker writer, gameplay tuning, worker decomposition, new route, or test-only mutation/storage backdoor. Record defects in those areas as adjacent roadmap work.

## Stop conditions

Stop with evidence if:

- truthful durable recency cannot be derived without changing the save schema;
- exact pending depth would require a competing persistence queue or rerunning gameplay mutations;
- active-save ownership cannot be proven with the current save-ID contracts;
- adding mobile-visible shell copy necessarily causes an out-of-scope shell redesign;
- live source contradicts the roadmap's promised state semantics.

## Done

Every active dynasty globally shows an honest last-durable-save time and exact pending-write depth. Ordered writes, failure/retry, active-save switching, reload hydration, no-op behavior, accessibility, desktop/mobile layout, v34 compatibility, permanent browser proof, full repository gates, adversarial review, and `docs/codex/runs/TRUST-SAVE-INDICATOR-1/COMPLETION.md` are complete.
