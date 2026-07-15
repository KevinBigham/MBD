# ECON-QUALIFYING-OFFERS-1 — Living Plan

## Objective and ownership

Implement [Goal 22](../../goals/22_ECON_QUALIFYING_OFFERS_1.md), the bounded
completion slice for TRUE GOAT roadmap item 12 only. The parent thread is the
single writer. Three read-only source/test/risk lanes are complete; their P0–P2
findings are incorporated below.

## Work class and evidence budget

- Class: HIGH_RISK / HEAVY because the slice crosses offseason RNG/state,
  worker authority, free-agent roster ownership, draft entitlement, and exact
  persistence.
- Focused loop: sim-core free-agency/draft/offseason tests; worker QO/FA/draft
  and snapshot tests; exact-save coordinator/session/hook tests; route/component
  tests; package-local affected typecheck.
- Source freeze: one full root typecheck/test/build/determinism pass, then one
  fresh production QO-compensation journey and existing reload-smoke.
- Correction budget: at most two implementation correction loops before a new
  bounded split is required for any remaining reproducible P0/P1.

## Checkpoints

### 1. Canonical QO decision state

- [x] Add a once-only fixed QO salary to typed normalized offseason results.
- [x] Use exact service days and stable ID ties for eligibility.
- [x] Separate authorized user issuance from internal CPU issuance.
- [x] Resolve offered records in canonical team/player order independent of
  issuance/storage order; make duplicate/empty/invalid actions true no-ops.
- [x] Prove explicit accepted and rejected cases, one-year accepted contract,
  canonical rejected FA entry, reload/re-entry identity, and terminal RNG.

Gate: QO-1/2/3/4 pure and worker-focused tests green.

### 2. Atomic compensation and draft entitlement

- [x] Add a pure deterministic compensation plan with linked awarded and
  forfeited pick provenance and fact-key idempotence.
- [x] Preflight outside signings before player/contract/market/roster mutation;
  reject unchanged when no eligible signing-team pick exists.
- [x] Apply equivalent user/CPU paths; preserve accepted, unsigned, and
  former-team re-signing no-compensation cases.
- [x] Require exact draft phase before RNG/state work and validate frozen slots
  against canonical entitlements before any pick.
- [x] Prove protected/traded/multiple-signing cases, actual worker slot order,
  reload, exact once-only consumption, and stale-session fail-close.

Gate: QO-5/6/8 worker, draft, compatibility, and deliberate award-without-loss
negative control green.

### 3. Exact-save causal sessions

- [x] Generalize the existing exact coordinator adapter for argument-bearing
  QO, accepted signing, draft-start, and draft-pick operations.
- [x] Return explicit changed/no-change results so rejected, duplicate, and
  empty operations release cleanly without persistence.
- [x] Keep one exact worker session and persistence lease from baseline through
  exact post snapshot and durable receipt; retry only the retained post object.
- [x] Prove rollback/fail-close, stale callback, root/branch identity, save
  switch, export failure, held receipt, and global mutation pause.

Gate: QO-7 exact coordinator/session/hook tests and affected web typecheck green.

### 4. Player-facing causal loop

- [x] Expand the existing QO panel with fixed salary, pending, and terminal
  states plus truthful no-op/blocked feedback.
- [x] Mark rejected-QO free agents and preview the exact pick cost before offer.
- [x] Name player, former club, signing club, award, loss, and tier in durable
  ledger/news/result copy; retain draft-slot provenance.
- [x] Keep existing lazy routes/chunks and meet desktop/375×667 keyboard,
  semantic, readability, and non-occlusion acceptance.

Gate: QO-10 component/route/lazy-shell/bundle tests green.

### 5. Freeze, verify, review, and land

- [x] Run bounded multi-seed conservation/determinism evidence and nonempty
  v34 plus honest historical compatibility fixtures.
- [x] Freeze source; run root typecheck, full tests, PWA build, determinism,
  bundle budget, and `git diff --check` once.
- [x] Run fresh production issue→resolve→outside-signing→compensation→draft
  hard-reload proof plus existing reload-smoke, one worker and zero retries.
- [x] Apply `mbd-review-slice` adversarially. Fix every P0–P2 and recheck once.
- [x] Complete requirement mapping, changelog, roadmap/status receipts,
  rollback, remaining risk, and retrospective.
- [x] Stage only item-12 paths, run cached diff checks, commit intentionally,
  and fast-forward local `main`. Do not push/deploy/tag or begin item 13.

Gate: QO-9/11/12/13 green, `MERGE_READY`, exact staged scope, protected main
checkout changes untouched and unstaged.

## Rollback

Before commit, revert only this slice's owned paths. After commit, revert the
single item-12 commit. GameSnapshot stays v34 and Dexie stays v6, so there is no
save migration rollback; missing new offseason receipt fields normalize
honestly and no historical compensation is fabricated.
