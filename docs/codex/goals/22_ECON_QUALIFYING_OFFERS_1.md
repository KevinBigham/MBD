# ECON-QUALIFYING-OFFERS-1 — Qualifying Offers And Pick Compensation

## Objective

Finish TRUE GOAT roadmap item 12 by turning the existing qualifying-offer and
supplemental-pick primitives into one deterministic, save-safe offseason loop:
an eligible club issues one offer, the player accepts or reaches the canonical
free-agent market, an outside signing atomically awards one former-club pick
and removes one eligible signing-club pick, and the resulting draft slot is
consumed exactly once. Do not begin roadmap item 13 or redesign extensions,
budgets, revenue, contracts, trades, or Day-One rosters.

## Live-source contract

- GameSnapshot remains v34 and Dexie remains v6. Existing draft state, news,
  the serialized offseason envelope, and persisted draft session are sufficient;
  no save-schema bump is expected.
- Preserve MBD's current source-grounded game policy: eligibility begins at
  three completed MLB service years, uses the existing market-value threshold,
  and permits at most one offer to a player per season. This slice does not
  claim six-year or one-offer-per-career MLB fidelity.
- `serviceTimeDays` is the eligibility authority. The legacy years map remains
  a derived compatibility mirror and cannot overrule exact service days.
- Freeze one league qualifying-offer salary when the QO phase is first entered.
  Every user/CPU eligibility view and issued offer that season uses that amount.
- Sim-core owns pure eligibility, resolution, award, forfeiture, and draft-slot
  order. The worker owns one atomic lifecycle commit. Zustand is a UI mirror.
- A cross-team signing of a rejected-QO player requires exactly one specific
  eligible signing-team pick forfeiture and one former-team compensation pick.
  If no eligible signing-team pick exists, the signing fails before any player,
  contract, market, roster, RNG, news, or draft mutation.
- Existing QO/free-agency/draft routes remain canonical. No new route,
  production dependency, or bundle-ceiling increase is authorized.

## Required behavior

1. Build eligibility from exact service days, active MLB assignment, expired
   contract, the fixed phase salary, and existing market-value policy. Equal
   facts use stable player-ID ordering.
2. The public user action may issue only for `userTeamId`. CPU issuance uses an
   internal team-scoped path with the same eligibility and amount rules.
3. Duplicate/ineligible/forged issue, empty resolve, invalid phase, and repeated
   terminal actions are byte-identical no-ops: no RNG draw, news, dirty state,
   persistence receipt, or false success.
4. Resolve offered records in stable team/player order, independent of click or
   stored-array order. Each player consumes at most one outcome draw and one
   news draw. Reload, retry, or re-entry cannot reroll a terminal record.
5. Acceptance creates exactly one one-year contract at the fixed QO amount,
   retains the player with the former club, and never enters that player into
   free agency. Rejection enters the canonical market exactly once.
6. An unsigned rejected player creates no pick movement. A former-club re-sign
   terminates the QO without compensation. An outside signing atomically commits
   exactly one linked former-team award and one linked signing-team loss.
7. Compensation is idempotent and auditable. The factual lifecycle receipt
   names player, former club, signing club, awarded pick, forfeited pick, tier,
   and season; duplicate, orphaned, mismatched, or partial state fails closed
   rather than inventing repair history.
8. Protected and previously traded/forfeited picks are respected. Multiple
   qualifying signings lose deterministic distinct eligible picks; no club gets
   free compensation and no pick is forfeited twice.
9. Draft creation and every draft mutation require the exact `draft` phase
   before any RNG fork or state change. Entitlements must be final before slot
   creation. An imported empty draft session may be rebuilt only from canonical
   durable state; a session with completed picks that conflicts with durable
   entitlement fails closed.
10. Supplemental picks appear in stable premium/standard order after round one
    and before round two, carry player/former/signing-team provenance, survive
    export/import and hard reload, and are consumed exactly once.
11. Manual issue, resolve, accepted user signing, draft start, and draft-pick
    actions execute through the existing exact-save worker session and
    persistence lease. Baseline capture, mutation, exact post capture, retained
    durable receipt, rollback/fail-close, root/branch authority, and durable-only
    presentation use the established coordinator; no parallel save lane.
12. A rejected/no-op worker result produces no durable write. A persistence
    failure after acceptance retries only the retained post snapshot and cannot
    rerun issue, resolution, signing, compensation, or draft selection.
13. Swapping only `userTeamId` cannot change league QO outcomes, compensation,
    pick order, or terminal RNG except for which otherwise identical action is
    manually initiated. User and CPU signing paths obey the same award/loss
    conservation law. No bare `Math.random()` is permitted.
14. The QO panel shows the fixed salary and eligible, issued, accepted, rejected,
    compensated, and expired states. The free-agent offer surface warns of the
    exact expected pick cost before submission. Durable consequence copy names
    both the award and loss; the draft board explains the supplemental slot.
15. Desktop and 375×667 mobile controls remain readable, keyboard reachable,
    non-occluding, and semantic without relying on color alone.
16. Current-v34 nonempty QO/compensation/draft sessions round-trip exactly;
    historical saves that predate QO data remain empty without fabricated
    history. Existing factual news/archive memory is extended, not backfilled.
17. No unrelated gameplay, schema, product behavior, or later roadmap item is
    changed.

## Acceptance matrix

| ID | Acceptance | Required proof |
| --- | --- | --- |
| QO-1 | Exact-day eligibility and one fixed phase salary | pure + worker tests; contradictory-years-map and changing-salary negative controls |
| QO-2 | Authorized, idempotent user/CPU issuance | forged CPU-player, duplicate, invalid-phase, stable-order, and byte-identical no-op tests |
| QO-3 | Stable once-only acceptance/rejection | fixed accepted/rejected cases; permuted storage; reload/re-entry/RNG identity |
| QO-4 | Canonical free-agency transition | accepted never enters; rejected enters once; unsigned/former-team paths create no compensation |
| QO-5 | Atomic award/loss conservation | worker user/CPU tests for one linked award + one linked eligible loss; no-pick fail-unchanged; multiple-signing provenance |
| QO-6 | Phase-safe exact draft entitlement | early-call zero-RNG tests; stale-session fail-close; actual worker draft-slot ordering/consumption |
| QO-7 | Exact-save causal boundary | coordinator/session/hook tests for argument-bearing operations, no-change results, rollback, retained retry, stale callback, root/branch, and global pause |
| QO-8 | Determinism and symmetry | same seed and user-team swap digests; stable IDs/order; user/CPU equivalent signing conservation |
| QO-9 | Honest compatibility | v7/default-empty proof; nonempty current-v34 fixed point; in-flight and inconsistent-session fixtures |
| QO-10 | Truthful accessible UX | worker-fed Offseason/Free Agency/Draft component and route tests; desktop/mobile inspection |
| QO-11 | Production causal journey | fresh build: issue → reload → resolve → reload → outside signing → award/loss → reload → draft slot → select → reload, zero retries/flakes |
| QO-12 | Bounded economy conservation | multi-seed invariant: outside compensated signings = awards = losses = unique supplemental slots, with no duplicate consumption |
| QO-13 | Repository safety | affected/root typecheck, focused/full tests, PWA build, determinism, reload-smoke, bundle gate, scoped diff/commit |

## Negative controls

At least one deliberate regression must be observed failing and restored before
closeout. The preferred control bypasses signing-team forfeiture while leaving
the former-team award enabled; the integrated conservation test must fail.
Also retain hostile early-draft and contradictory-service-day controls.

## Scope cut line

No one-QO-per-career history migration; no modern-MLB rule rewrite; no extension
AI, owner/payroll pressure, revenue, explainable FA redesign, salary retention,
trade expansion, Day-One roster generation, 30-season roadmap-item-18 soak, new
route, new dependency, or schema bump. Stop and re-plan if structured permanent
post-rollover pick-loss history requires a schema change, completed imported
draft picks can only be reconciled by invented history, or exact coordination
requires a second save engine.

## Done

The player-facing QO decision uses one fixed salary, outcomes are deterministic
and once-only, an outside signing cannot exist without one linked award and one
linked eligible pick loss, the exact resulting supplemental slot is durably
drafted once, every high-emotion action is fenced through exact-save authority,
production reload proof passes, adversarial review has zero P0–P2 findings, and
only roadmap item 12 is committed and landed on local `main`.
