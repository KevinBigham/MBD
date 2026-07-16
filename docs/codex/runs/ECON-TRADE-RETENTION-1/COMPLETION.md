# ECON-TRADE-RETENTION-1 Completion

## Outcome

Roadmap item 17 is complete, gate-green, and approved by final read-only Sol
review with zero actionable P0–P2 findings. Two-team trades can now carry flat
annual retained salary across a player's remaining guaranteed seasons and one
current-season, player-linked payroll reimbursement. Gross player salary never
changes. One canonical derived payroll authority assigns payer dead money,
controller credit, taxable payroll, future commitments, owner-pressure inputs,
and effective-salary trade value.

Accepted financial terms are immutable trade-history facts in GameSnapshot v35.
The exact-save coordinator retains the accepted post-trade snapshot, publishes
presentation only after durability, and retries persistence without replaying
the trade. Finance, Trade History, incoming-offer detail, and Press Room show the
same terms after export/import and hard reload. Dexie remains v6. There is no
treasury, standalone cash asset, revenue/budget redesign, broad CPU term
generation, multi-team term authoring, dependency, route, or item-18 work.

## Acceptance matrix

| ID | Implementation artifact | Focused proof | Browser/study proof | Final gate | Remaining risk |
| --- | --- | --- | --- | --- | --- |
| TRC-1 | v35 trade asset terms, frozen v34 predecessor, explicit v34→v35 empty migration, v35 fixture | contracts trade 9/9; migration 25/25; worker schema matrix 19/19 | raw v35 export/import and IndexedDB primary/shadow equality | full gates green | A downgrade cannot preserve new terms |
| TRC-2 | one aggregate worker validator for directional ownership, contract reference, money shape, caps, duplicates, retainers, and prior support | validator 9/9 plus worker byte/RNG-exact rejection | $11 support on $20 gross rejected before mutation with durable checksums unchanged | focused/full green | Stale inbox cleanup remains an explicit non-trade flow mutation |
| TRC-3 | `tradeFinance.ts` derives controller credits, payer charges, return/retrade/expiry/option behavior | finance 27/27; property invariants 40/40; worker lifecycle cases | Finance shows $20 gross, $7 credit, $13 net after reload | balance/full green | Release is intentionally blocked while retained liability is active |
| TRC-4 | worker valuation prices exact acquiring salary once | pure trade/finance twins and user/CPU identity swap | four-seed study is same-seed exact and conserves $20 | determinism green | CPU does not originate terms in this bounded slice |
| TRC-5 | prevalidation plus one generic accepted-trade mutation and immutable history entry; deterministic day/ordinal/package-fingerprint history ID | canonical worker 198/198; exact coordinator 15/15; same-day two-trade regression 1/1 | player moves once; two same-day trades remain distinct through reload/rollover | full/browser green | Generic multi-team ID/persistence modernization remains outside this two-team term slice |
| TRC-6 | trade operations added to exact-save worker adapter and hook | exact trade hook 4/4; worker adapter 4/4; coordinator rollback/retry/fencing 15/15 | injected primary IndexedDB failure, public Retry, no gameplay replay, primary=shadow | item-17 Playwright 1/1 | None identified |
| TRC-7 | all supported versions migrate through canonical worker/JSON paths; v34 gains empty capability | migration 25/25; supported 34-version worker matrix 19/19; malformed imports retain destination | production journey imports/exports v35 through Settings | full green | Old saves honestly contain no fabricated terms |
| TRC-8 | stable fact-derived terms/order and no new RNG | determinism 3/3; four-seed exact study; inherited balance 9/9 | study: one history, zero pending, $5 retention + $2 cash, $13 net for each seed | full sim-core/web green | Item 18 owns the 30-season economy soak |
| TRC-9 | existing Trade/Finance/Press surfaces carry gross/retained/cash/net detail with labelled inputs | 57 web files / 189 focused tests | desktop and 375×667 screenshots; exact Finance/Press facts after reload | build/bundle/browser green | Presentation stays bounded to existing routes |
| TRC-10 | item-only source/tests/docs and additive schema migration | `git diff --check`; no random/wall-clock additions; two negative controls | production build/PWA and no-retry browser receipts | final Sol `MERGE_READY` 0/0/0; scoped local-only landing | Remote intentionally untouched |

## Changed systems

- Contracts and compatibility: trade financial terms, explicit v34/v35 save
  schemas, migration, current fixture, public exports, and the supported-version
  worker/JSON matrix.
- Canonical finance: player-linked payer/controller payroll derivation, gross/
  net contract presentation, retained/cash dead money, taxable payroll, and
  future commitments.
- Canonical worker: shared financial validation, effective-salary valuation,
  atomic two-team execution, history/news detail, release/non-tender fences,
  and all payroll consumers.
- Exact save: trade operation union, worker adapter, React executor, retained
  snapshot persistence, rollback, authority fencing, and presentation publish.
- UX: bounded Trade builder inputs/caps/package summary/incoming offer/history,
  Finance gross-credit-net evidence, and Press transaction wording.
- Evidence: item-17 Playwright, repaired inherited reload-smoke synchronization,
  desktop/mobile screenshots, deterministic study, goal/run documents.

No package manifest, lockfile, dependency, route, Dexie schema, standalone cash
authority, raw revenue/budget authority, multi-team authoring path, or roadmap
item 18 source changed.

## Verification receipts

### Focused

- Contracts: 2 files / 34 tests.
- Sim-core trade family: 7 files / 107 tests.
- Sim-core finance/property: 2 files / 67 tests.
- Trade/Finance/exact-save/setup/bundle web matrix: 57 files / 189 tests.
- Canonical worker plus inherited balance: 2 files / 207 tests.
- Current/old save worker matrix: 19/19.
- Item-15 market-revenue preservation: 11/11.
- Web typecheck, including Playwright TypeScript: passed.

### Root and production

- Root typecheck: 9/9 Turbo tasks.
- Full root tests: 8/8 Turbo tasks; web 472 files passed with four intentional
  study/audit file skips and 2,468 assertions passed with nine intentional
  assertion skips. The contracts, UI, and sim-core package tasks were green.
- Determinism: 3/3, including the seed-42 baseline hash.
- Production build/PWA: 5/5 tasks; 3,035 modules; 168 precache entries /
  4,125.45 KiB; core 454.92 KiB; Trade 121.88 KiB / 26.94 KiB gzip;
  Finance 16.35 KiB /
  4.64 KiB gzip.
- Item-17 Playwright: 1/1 in 22.1 seconds, one Chromium worker, retries 0.
- Existing high-emotion reload smoke: 2/2 in 5.1 minutes, one Chromium worker,
  retries 0 and no flaky classification.

One earlier full-suite attempt completed all 2,468 assertions but exited
nonzero on three unhandled async rejections from an unrelated MinorsPage mock
ordering. The isolated MinorsPage suite passed 3/3, and the single clean root
retry above passed 8/8 tasks. No unrelated test-infrastructure source was added
to this slice.

Two non-authoritative build attempts resolved the host's fallback pnpm 11 and
stopped during dependency-policy reconciliation. The worktree was normalized
offline with repository-pinned pnpm 9.15.4; the tool-added workspace placeholder
was removed, no lockfile changed, and the authoritative 5/5 build passed.

## Negative control

The controller salary-credit branch was temporarily disabled while the payer
charge remained. The conservation regression failed exactly as intended:
controller payroll stayed $20 with $0 credit instead of $13 with $7 credit.
The branch was restored with `apply_patch`, and the same assertion passed 1/1
before focused, full, build, determinism, and browser gates.

After Sol found the same-day immutable-history collision, the corrected user
trade ID allocator was temporarily replaced with the prior
`user-${timestamp()}` form. The new two-same-day-trades regression failed with
one history row instead of two and the colliding ID `user-S1D60`. Restoring the
day/ordinal/package-fingerprint allocator made the same regression pass 1/1;
the canonical worker then passed 198/198 and the full web suite 2,468/2,468.

## Browser evidence

The production item-17 journey uses real Settings import/load, one browser
context, one page, and real IndexedDB. It:

1. imports a deterministic v35 regular-season save containing one invalid and
   one legal incoming financial offer;
2. rejects $9.01 retention on $18 gross before mutation and proves primary and
   shadow checksums are unchanged;
3. accepts a $20 player with $5 annual retention plus $2 current-season
   reimbursement under exact save authority;
4. injects one primary-write failure, withholds durable completion, and uses the
   public Retry control to persist the retained post snapshot only;
5. proves one player move, one history entry, exact financial terms, matching
   primary/shadow checksums, and zero pending writes/retries;
6. verifies Finance at $20 gross / $7 credit / $13 net and Press at the exact
   $5-per-year plus $2-current-season wording; and
7. hard reloads and verifies the same terms and durable state.

Visual evidence:

- `evidence/trade-retention-desktop.png`
- `evidence/trade-retention-mobile-375x667.png`

The 375×667 Press card shows both financial terms without horizontal clipping;
the desktop Finance table shows gross, net, and credit together. Controls are
labelled and keyboard reachable through the existing semantic form surface.

## Adversarial discoveries already corrected

1. higher-priority broadcast news could deduplicate away the exact financial
   terms; the accepted transaction news is now enriched before priority dedupe;
2. incoming-offer detail showed retention/cash but omitted frozen gross salary;
3. a re-trade's combined 50% cap counted prior retention but not prior same-season
   cash; the validator now uses the complete existing controller credit;
4. TradePage's older hook-only Zustand mock did not model the new exact-mutation
   boundary; UI tests now mock that boundary while dedicated hook/coordinator
   tests exercise the real contract;
5. the inherited reload smoke removed its press-conference handler before the
   complete player read and armed its fault before a delayed Day-31 dialog; the
   handler lifetime and explicit dialog synchronization are now deterministic;
6. current-schema expectations in reload smoke, market revenue, and the
   supported-version count were stale at v34/33 entries and now assert v35/34.
7. seasonal rollover cleared immutable trade history and contract-clock finance
   looked at the pre-rollover season; history now survives while only ephemeral
   trade state clears, and clocked offseason finance resolves the incoming
   season;
8. generic counters reduced complete packages to player IDs; v35 now persists,
   resumes, exports/imports, and revalidates the full `TradeAsset[]`, while v34
   stays a distinct legacy schema;
9. Finance counted a club's own retained payment as external salary support;
   self-funded charge/credit still nets but is excluded from support received;
10. direct user trades used a simulation-day-only ID, so two same-day financial
    trades could deduplicate one immutable fact; IDs now include a durable
    ordinal, stable full-package fingerprint, and collision check.

## Actual swarm route

The parent was the only checkout writer. All children were PURE read-only. The
host can create child tasks and collect results but cannot independently pin or
verify runtime model/effort, so labels are requested routes only.

| Task | Requested label | Artifact | Status |
| --- | --- | --- | --- |
| `/root/item17_trade_scan` | Luna / medium | source seam and integration-boundary map | complete; architecture inputs consumed |
| `/root/item17_test_scan` | Luna / medium | acceptance, exploit, browser, and gate matrix | complete; evidence plan consumed |
| `/root/item17_finance_scan` | Sol / xhigh | finance/treasury/lifecycle architecture gate | complete; player-linked reimbursement frozen |
| `/root/item17_final_sol_review` | Sol / xhigh | independently hashed line-level lifecycle/diff review | `MERGE_READY`; P0/P1/P2 = 0/0/0 |
| parent Luna-style closeout | Luna / medium pattern | docs, exact stage, commit, local fast-forward | complete; parent remained sole writer |

The final reviewer independently reproduced tracked diff SHA-256
`ab18547f9142aedce9af661ad2bdf588fc6d2cf5bd1a32971cb65381aa74ef40`,
untracked manifest SHA-256
`c7f07196470bd454a632b13dfd593ffa54491bbfaa8e72d57bcf6c5dcbbbcaf4`,
and combined artifact SHA-256
`e3aaf4fb43c2140a84c6a6107607f0fc63b481ef754ed6d97568a9537f8d9561`
at both review start and end. No child wrote to the checkout.

The original swarm ledger remains at
`/Users/kevin/Downloads/MBD-main-main/.swarm/runs/item17-swarm-20260716`.
It was created with schema v1; the skill helper changed to v0.3/schema v2 during
the run and correctly refused to reinterpret or mutate the older ledger. The
parent preserved it byte-for-byte, validated every JSON receipt and all 22
journal records with `jq`, and recorded file SHA-256 values. The three scout
nodes are `SUCCEEDED`; the final PURE reviewer receipt is preserved in this
report and the child result rather than retroactively rewriting the v1 ledger.

## Compatibility, rollback, and remaining risk

- Compatibility: v34 and every supported old/deep save migrate to v35 with no
  financial terms fabricated. Current v35 accepted/pending terms round-trip.
  Dexie stays v6 because no store/index changes.
- Before landing, rollback is removal/reversion of only the item-17 paths.
  After landing, revert the single item-17 commit. A downgrade reader cannot
  preserve v35 terms, so retain the v35 export or intentionally discard the
  new financial facts rather than misreading them as v34.
- Bounded remaining ownership: item 18 owns the 30-season economy soak; a future
  treasury goal must define standalone spendable cash; broader CPU term
  origination and multi-team term authoring remain outside this slice.
- The pre-existing generic multi-team path still has team/day-derived history
  IDs and split mutation/persistence. Item 17 does not author financial terms
  there, active obligations follow the current controller, and release/non-
  tender remain fenced. Modernizing that general path is adjacent future work.
- Remote state, deployment, tags, publication, and release remain untouched.

## Relay retrospective

1. **Late uncertainty:** immutable history ownership across rollover and the
   uniqueness of two same-day user trade facts were discovered after the first
   implementation freeze; cumulative current-season re-trade support also
   initially omitted prior cash.
2. **Earlier exposing artifact:** an explicit player-contract/trade-history
   state machine with rollover, same-day ordinal, prior retention/cash,
   controller, next seller, and accepted-ID transitions would have exposed all
   three before UI integration. A two-accepted-trades-on-one-day negative
   control was the missing early gate.
3. **Owning role:** Sol architecture should own durable fact identity and the
   cumulative-support state machine; the implementation writer should own the
   early two-trade negative control; Luna evidence should own browser overlay
   timing and receipt exactness.
4. **Sequential phases:** freeze financial semantics; implement schema and pure
   accounting; integrate worker/exact save; run browser fault proof; run full
   gates; run final Sol review; then document/stage/land.
5. **Safe parallel read-only work:** trade seam/test inventory/finance authority
   scans; screenshot inspection and protected-main hash audit; post-freeze scope
   and determinism review.
6. **Recommended route:** Sol freezes the lifecycle/cap/authority table; one
   parent or Terra writer implements schema→accounting→worker→exact-save in that
   order; Luna pre-audits browser/study receipts; run focused then expensive
   gates once; final Sol source review; Luna-style exact closeout.
7. **Prioritized improvements:** (1) freeze a durable fact-ID/rollover state
   machine before schema work; (2) add a two-same-day-accepted-trades negative
   control before UI work; (3) enumerate cumulative support across re-trades;
   (4) assert exact worker/save/player/contract identity in every lifecycle
   microcase; (5) create the current-schema fixture immediately after schema
   freeze; (6) make delayed modal ownership explicit in reload helpers; (7)
   place an early Sol source review after focused worker freeze, before full
   gates, while retaining the final immutable-artifact Sol verdict.

## Landing

Final Sol returned `MERGE_READY` with zero P0–P2. This report is included in the
single intentional item-17 commit after the preserved-ledger receipt/hash audit,
exact staged-scope inspection, and `git diff --cached --check`; local `main` is
advanced by fast-forward only. The final revision is reported from live Git
after commit because a commit cannot contain its own SHA. The three protected
main-checkout files remain unstaged and are verified by the hashes in
`SOURCE_TRUTH.md`.
