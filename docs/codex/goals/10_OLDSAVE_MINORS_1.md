# OLDSAVE-MINORS-1 — Opt-In Non-Destructive Enrichment

## Objective

Offer eligible existing saves a clearly explained, opt-in enrichment that adds missing minor-league content without deleting, replacing, rewriting, or retroactively narrating any existing player.

## Dependencies

TRUST-A and MEMORY-0 must be merged. Confirm that a richer new-game minors source actually exists in the live repository. Stop if it does not.

## Safety design

- Explicit eligibility and preview before mutation.
- Require/create a manual export backup before applying when the product can support it.
- Preserve every existing player ID, attributes, contract, assignment, stats, and history.
- Add only nonconflicting content needed to fill defined gaps.
- Deterministic and idempotent for the same save/version.
- Store an honest upgrade marker and coverage date/version; do not claim parity with a new save.
- Declining changes nothing. Rollback means restoring the pre-upgrade export unless a proven lossless reversal exists; do not promise magical undo.

## Proof

- player-preservation invariant over representative old/deep saves;
- idempotency and duplicate prevention;
- deterministic result;
- decline/no-op;
- failure midway cannot leave a partial save (transactional write or restore);
- hard reload and import/export;
- no fabricated history;
- bounded roster/content counts;
- full gates and adversarial data-safety review.

## Scope cut line

No forced injection, roster replacement, retroactive stats/history, broad roster-rule redesign, or new authored-content system. If preservation cannot be proven, do not ship.

## Done

Opt-in enrichment is transactional, deterministic, honest, idempotent, reload-safe, and demonstrably preserves every pre-existing player and fact.
