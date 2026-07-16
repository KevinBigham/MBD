# ECON-TRADE-RETENTION-1 — Salary Retention and Cash Considerations

## Objective

Finish TRUE GOAT roadmap item 17 with deterministic, contract-safe salary
retention and player-linked cash considerations in two-team trades. A legal
term must change valuation, payroll responsibility, owner-pressure evidence,
trade history, and durable presentation through one canonical worker mutation.
Preserve exact-save authority, seeded determinism, user/CPU fairness, old-save
facts, and the item-15/16 economy. Do not begin the item-18 30-season soak.

## Live-source contract

- GameSnapshot advances from v34 to v35 because accepted and pending trade
  terms become durable simulation truth. Dexie stays v6 because no store or
  index changes.
- The worker is canonical and Zustand is a UI mirror. Trade execution, payroll
  derivation, valuation, validation, and persistence use one authority.
- A player contract keeps its gross annual salary. Retention and cash terms are
  payer allocations; they never rewrite what the player earns.
- "Cash consideration" means a one-season payroll reimbursement attached to a
  player moving in the same direction. It is not standalone spendable cash,
  revenue, a treasury balance, a hidden budget, or luxury-tax avoidance.
- Immutable accepted terms are stored once in trade history. Active retained
  charges, controller credits, current-season cash reimbursement, and future
  commitments are derived from that history rather than duplicated ledgers.
- Multi-team authoring, standalone cash, treasury design, broad trade-AI
  generation, and a general trade-system rewrite are outside this slice.
  Existing obligations still follow a player moved later by any legal path.

## Frozen financial model

All money is in millions and normalized to two decimals before validation.
Non-finite, negative, zero, or greater-than-two-decimal terms are invalid.

### Salary retention

1. Retention is authored only on an MLB player controlled by the sending team
   and under at least one remaining guaranteed contract year.
2. The term records annual amount, start season, guaranteed end season
   exclusive, gross annual salary, and original contract end season exclusive.
3. The annual amount is flat for the covered guaranteed seasons; there is no
   midseason proration or custom schedule.
4. Cumulative active retention across all prior and proposed retainers may not
   exceed `50%` of the recorded gross annual salary. The controlling club is
   always responsible for at least `50%`.
5. A team may carry at most three active retained contracts, and one contract
   may have at most two distinct retaining clubs. A club cannot retain the same
   contract twice.
6. The final unexercised player/team option year is excluded. A later exercise
   or extension is new, uncovered contract time. Retention ends at the frozen
   guaranteed end even if a later contract reuses the player ID.
7. On a re-trade, existing payer charges persist, the matching credit follows
   the current controller, and the new seller may use only unused headroom.
8. If the player returns to a retaining club, that club's charge and credit net
   internally while the factual agreement remains active.
9. A player with active retained obligations cannot be released or non-tendered
   through a path that would erase the controller's unretained liability. A
   rejected release is snapshot- and RNG-exact. Natural guaranteed expiry is
   legal and ends the obligation without resurrection.

### Player-linked cash consideration

1. A cash consideration is authored only on a player asset in the same
   directional package and records amount, season, player ID, gross salary, and
   original contract end season.
2. It is a one-season reimbursement: sender receives a current-season dead-
   payroll charge and controller receives the exact matching payroll credit.
3. Salary retention plus cash reimbursement may not reduce the controller's
   current-season responsibility below `50%` of gross salary. Cash has no
   future-year effect.
4. One player may carry at most one cash term in a trade. Both teams may not
   send offsetting cash terms, and no cash-only package is legal.
5. Cash never changes raw annual budget, modeled revenue, formal owner payroll
   cap, or player gross contract. It is visible in payroll/dead-money evidence,
   valuation, history, news, and the trade preview.

### Payroll and valuation

For each player-season:

`gross salary = controller net + active retained charges + active cash reimbursement`

The identity is exact after two-decimal normalization. Retaining/reimbursing
teams receive dead-payroll and luxury-tax charges; the controller receives
matching MLB/minor and luxury-tax credits. Future commitments include only
retention active in that future guaranteed season. Trade valuation prices the
controller's effective salary exactly once; it may not add a second arbitrary
cash-to-points bonus.

## Required behavior

1. User proposals, counters, incoming offers, and CPU evaluation share the same
   aggregate validator, payroll authority, and effective-salary valuation.
2. Invalid, stale-contract, duplicate, orphaned, wrong-side, over-limit,
   non-finite, or malformed financial terms reject before player/pick/IFA
   mutation and leave snapshot and RNG byte-identical. An independently stale
   inbox offer may still be removed through the existing explicit
   `flowStateChanged` lifecycle; that cleanup cannot move assets or apply
   financial terms.
3. Player, pick, IFA, retention, and cash aggregate effects are prevalidated
   before any accepted mutation. A later failure restores the exact baseline or
   fails closed.
4. An accepted two-team trade moves each asset once, records one immutable
   history entry, applies no duplicate payer term, and emits one truthful
   reason-bearing summary.
5. Gross salary, all payer charges, controller net, luxury-tax payroll, future
   commitments, Finance, Dashboard/owner pressure, Offseason, trade-market
   pressure, and CPU affordability agree through one retention-aware payroll
   calculation.
6. Direct trade, re-trade, return-to-payer, expiry, option boundary, blocked
   release/non-tender, and later multi-team movement preserve the frozen
   liability rules.
7. Identical user and CPU state produces identical legality, valuation, and
   accounting. Difficulty, hidden potential, user identity, or free CPU funds
   cannot change a financial term's effect.
8. CPU need not originate retention/cash in this slice, but it must evaluate,
   accept/reject, execute, and account for the same legal terms without outcome
   bonuses or privileged truth.
9. Accepted trade mutation runs under exact save-session/worker authority. The
   exact retained post snapshot becomes durable before presentation refresh.
   Retry persists only that snapshot and never reruns the trade.
10. Authority loss after acceptance fails closed. Pre-acceptance failure
    restores the exact baseline. Financial-term rejection and no-change
    results do not create saving, dirty, history, payroll, or pending-write
    state; the pre-existing stale-inbox cleanup remains an explicit non-trade
    flow mutation.
11. Builder, counter, resume, incoming offer, history, Finance, and Press
    presentation preserve exact terms after save/export/import and hard reload.
12. The trade preview shows gross annual salary, annual retention, one-season
    cash reimbursement, acquiring-team current/future responsibility, caps,
    and clear rejection reasons before submission.
13. Desktop and `375x667` UX is readable, keyboard reachable, screen-reader
    labelled, non-color-only, non-occluding, and horizontally unclipped.
14. v34 and every supported old/deep save migrate to v35 with no fabricated
    retention/cash terms or history. Current v35 terms round-trip exactly;
    malformed imports fail without replacing the destination save.
15. Deterministic IDs derive from trade/player/term facts and stable ordinals.
    No `Math.random`, wall clock, UUID, insertion-order, or hidden-state input
    enters simulation truth.
16. A bounded deterministic study covers user/CPU parity, payer limits,
    re-trades, valuation, payroll conservation, and preserved trade-volume and
    item-15 economy bands without claiming the item-18 30-season soak.
17. A fresh production browser journey rejects an invalid term unchanged,
    executes a legal retained/cash trade once, survives a persistence fault via
    snapshot-only retry, verifies exact IndexedDB primary/shadow truth, opens
    matching Finance/Press evidence, hard reloads, and finds the same facts.
18. No standalone treasury, revenue redesign, broad trade AI, multi-team term
    authoring, roster-generation repair, schema beyond v35, dependency, route,
    bundle-ceiling, item-18, or later-roadmap behavior changes.

## Acceptance matrix

| ID | Acceptance | Required proof |
| --- | --- | --- |
| TRC-1 | Exact durable term contract | schema boundary tests; v34→v35 migration; current round-trip |
| TRC-2 | Aggregate legality and exploit resistance | invalid/stale/duplicate/wrong-side/limit rejection digests |
| TRC-3 | Conserved payroll authority | direct/retrade/return/expiry/option/release microcases; production consumers |
| TRC-4 | Effective-salary valuation | pure valuation twins; no double count; user/CPU parity |
| TRC-5 | Atomic trade execution | prevalidation; one history entry; rollback/fail-closed tests |
| TRC-6 | Exact-save trust | retained post; persistence-only retry; authority fencing; truthful Saved |
| TRC-7 | Honest compatibility | supported matrix; compact-v33; import/export; malformed import protection |
| TRC-8 | Determinism and bounded economy | same-seed study; stable IDs/order; preserved activity/economy bands |
| TRC-9 | Accessible durable UX | builder/counter/resume/history/Finance/Press tests; desktop/mobile reload proof |
| TRC-10 | Repository safety | focused/root/build/PWA/determinism/bundle gates; adversarial review; scoped landing |

## Negative control

Deliberately remove the controller payroll credit while leaving the payer
charge. The conservation and Finance assertions must fail. Restore the correct
implementation before final gates. A passing suite under that mutation is an
acceptance failure.

## Scope cut line

No independent spendable cash asset, treasury/bank account, funding model,
overdraft rule, revenue mutation, broad owner-budget rewrite, arbitrary cash
valuation, CPU term-generation mandate, multi-team term authoring, general
trade rewrite, release-liability system beyond the narrow active-retention
fence, item-18 soak, new route/dependency, push, deploy, tag, publication, or
release. Stop only if source proves that player-linked reimbursement cannot
complete the roadmap wording without one of those materially broader systems.

## Done

Legal two-team salary retention and player-linked cash terms use one symmetric
validator, one conserved payroll/valuation authority, one exact durable trade,
and one truthful reloadable presentation; v34 and deep saves remain honest;
all gates and adversarial review are green; only item 17 is committed and
fast-forwarded onto local `main`.
