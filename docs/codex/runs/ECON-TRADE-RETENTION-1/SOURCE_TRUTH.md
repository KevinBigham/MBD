# Current Source Truth — ECON-TRADE-RETENTION-1

## Preflight

- Repository/worktree: `/Users/kevin/Downloads/MBD-trade-retention-17`
- Branch: `codex/trade-retention-17`
- Base/HEAD/local `main`: `8e649ad14d495b847c0689b0e00b8fe030201d77`
- `origin/main`: `fd217dc57262cd104f4fc140cb6e6c571cfa9290`
- Item worktree began clean; index was empty.
- The separate main checkout has three protected unstaged user files that are
  outside this slice and must remain byte-identical/unstaged:
  `.agents/skills/mbd-implement-slice/SKILL.md`
  (`a1a6d903cf0da47f457578274da1e335e97eb947d1a6026da85706d88fe59ac3`),
  `AGENTS.md`
  (`1f181b5d16e1a8e64fe54ed113b9c9648a271d3b746d7ea907e9194712cfc163`),
  and `docs/codex/PROGRAM.md`
  (`8a3c0cfd3686aa735d049ba473bf8da95168bc56a9eb7c2629fbe28a33817eb1`).
- Root package manager: `pnpm@9.15.4`. Current GameSnapshot is v34 and
  persisted trade state is inside the snapshot. Dexie is v6.
- Goal/run/completion/browser proof before work: Goal 27 and this run did not
  exist; no item-17 completion report exists; item-16 browser receipts are not
  authoritative for this source revision.
- Baseline focused tests on the exact base are green after linking the clean
  worktree to the existing verified dependency installation:
  - contracts migration: 1 file / 24 tests;
  - sim-core trade/finance/property matrix: 3 files / 76 tests;
  - web Trade UI + snapshot + exact-save matrix: 46 files / 150 tests.
  An initial concurrent invocation found the fresh worktree had no dependency
  link and triggered colliding pnpm bootstrap attempts; no tests ran and no
  result from that mechanical failure is treated as evidence. The generated
  dependency directories were replaced with local ignored symlinks and the
  pnpm-created workspace placeholder was removed before the green run.

## Swarm route and source reconstruction

Run `item17-swarm-20260716` used three read-only PURE scouts from the same clean
base. Requested model/effort labels were Luna/medium for trade/test mapping and
Sol/xhigh for the finance architecture gate; this host cannot independently pin
or verify runtime model/effort. Parent is the sole checkout writer.

| Concern | Live authority | Source finding |
| --- | --- | --- |
| Trade assets | `packages/contracts/src/schemas/trade.ts` | only player, draft pick, and IFA assets; offers/history persist generic assets |
| Save | `packages/contracts/src/schemas/save.ts`; worker snapshot | v34 persists `tradeState`; durable financial terms require v35 migration proof |
| Contract | player schema | gross annual salary and years exist; no payer split or contract ID |
| Payroll | sim-core `calculateTeamPayroll` | current controller pays full gross; numeric dead money is transient and almost unused |
| Valuation | sim-core valuation; worker asset valuation | full gross salary is priced; retained net must replace that input exactly once |
| Mutation | worker `sim.worker.trade.ts` | generic worker is the narrow authority; some asset application occurs before later transfers can throw |
| Evaluation | worker generic branches + sim-core player negotiations | non-player assets currently split into simplified paths; one aggregate validator/evaluator is required |
| CPU | sim-core candidates wrapped by worker assets | candidate generation may remain player-only; CPU execution/accounting must be symmetric |
| Persistence | Trade hooks; exact-save coordinator | current trade UI mutates then ordinarily persists; exact-save path already exists but lacks trade operations |
| UI | Trade builder/columns/transforms/history | existing route can be extended; no new route or dependency is required |
| Reload | existing reload smoke | proves player movement only, not financial terms or persistence-fault retry |
| Cash | goals 24/25 and live state | there is no treasury/cash balance; annual budget and modeled revenue cannot be relabelled as cash |

## Architecture decision

Roadmap item 17 is source-grounded as two player-linked payer terms:

1. flat annual retained salary across remaining guaranteed seasons; and
2. one-season cash reimbursement attached to the same directional player
   asset.

Both create matching payer dead-payroll charge and controller credit. Neither
changes gross player salary. Accepted immutable history is the factual source;
active/future totals are derived. Standalone cash, treasury, revenue, and raw
budget mutation are excluded. This produces a complete causal loop without
fabricating a financial authority the game does not possess.

## Highest-risk seams

1. A player can move before a later pick/IFA operation throws. Aggregate effects
   must be prevalidated and the whole mutation must run under exact rollback.
2. Every payroll consumer must use the same retained-charge/controller-credit
   derivation; an unconverted caller creates hidden disagreement.
3. Release/non-tender can clear team assignment. Active retained contracts must
   be fenced so the unretained controller liability cannot vanish.
4. Player IDs outlive contracts. Frozen gross salary and contract-end facts must
   keep an old obligation from attaching to an extension/new deal.
5. Re-trade and return-to-payer accounting must conserve salary without double
   credit or double charge.
6. The current Trade hook's post-mutation ordinary save can replay or expose an
   undurable result. Item 17 must use the exact-save adapter.

## Dependencies and blockers

- Items 9–16 are present and supply contract clock, options, owner/payroll,
  revenue, exact-save, and explainable economy seams.
- Goal 25 explicitly does not create a treasury. Goal 24 keeps formal owner
  ceilings advisory. Goal 17 does not overwrite either contract.
- No source-grounded blocker remains under the bounded player-linked
  reimbursement definition. A future independent spendable-cash system would
  need a separate product/economy goal.

## Final source discoveries

- `tradeHistory` is immutable financial authority and must survive seasonal
  rollover; only pending negotiations/offers are ephemeral. Active finance in
  the contract-clock offseason resolves against `season + 1`, keeping frozen
  contract references coherent through rollover and expiry.
- Generic negotiations must persist and revalidate the full `TradeAsset[]`.
  Reducing counters to player IDs loses financial, draft-pick, and IFA terms.
  The frozen v34 predecessor remains a separate legacy schema while v35 owns
  full packages.
- Finance distinguishes total payer responsibility from external acquired-
  salary credit. A player returned to a payer can net internally, but that
  self-funded amount is not truthfully "support received" from another club.
- Direct user trade IDs require more than the simulation day. The final ID uses
  the day, a durable same-day ordinal, a stable sorted full-package fingerprint,
  and collision checking. Reverting to the old day-only ID reproducibly deletes
  one of two same-day immutable history facts.
- The general multi-team subsystem still uses a team/day-derived history ID and
  a legacy split mutation/persistence path. Item 17 does not author financial
  terms there; existing obligations follow `player.teamId`. This is adjacent
  future trade-system work, not a waived item-17 defect.
- The final frozen artifact was independently reviewed at combined SHA-256
  `e3aaf4fb43c2140a84c6a6107607f0fc63b481ef754ed6d97568a9537f8d9561`;
  Sol returned `MERGE_READY` with zero actionable P0–P2.
