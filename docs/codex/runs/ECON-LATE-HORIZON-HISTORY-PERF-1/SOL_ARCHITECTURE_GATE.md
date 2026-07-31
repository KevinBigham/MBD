# Sol Architecture Gate — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `APPROVED — actionable P0/P1/P2 0/0/0 after the three mandatory
source-grounded clarifications below; production opens only after the
docs-first checkpoint commit`.

## Sol verdict and mandatory clarifications

Sol thread `/root/goal32_sol_architecture`, `gpt-5.6-sol` at `xhigh`, reviewed
the live source and approved this architecture with three corrections:

1. The automated-team payroll map is 31 non-user teams in interactive mode and
   all 32 teams in `autonomous_league`; the paired diagnostic measures 32.
2. `D15` uses post-season-15 data from `season15.json`; `D30` uses
   season-30-input data from `season29.json`, which is post-season-29 state.
   These are data-age labels, not completed-season execution labels.
3. The payroll diagnostic times the common outer `buildFreeAgencyPayrolls`
   operation. Timing only nested `calculateTeamPayroll` calls is forbidden
   because it would omit the successor batch-projection cost.

## Invariants

1. Worker state remains canonical; no UI/store or save identity changes.
2. The change is semantics-neutral: exact baseball, finance, narrative, RNG,
   ordering, snapshots, receipts, and durable history.
3. All indexes/projections are pure and operation-local.
4. No cache survives a signing, release, trade mutation, day/season boundary,
   worker call, import, or reload.
5. No schema, migration, dependency, public-contract, timestamp, or RNG change.
6. `calculateTeamPayroll` remains the authoritative single-team parity oracle.
7. Stable input-first behavior remains authoritative for full news comparator
   ties.
8. Duplicate players and duplicate history retain existing first/ordered
   semantics.
9. The stopped Goal-31 evidence and immutable caps remain authoritative.

## Frozen payroll boundary

Add these exact frozen APIs:

- `deriveLeagueTradePayrollAdjustments(teamIds, players, tradeHistory,
  currentSeason, targetSeasons)` in `tradeFinance.ts`, returning an ordered
  `ReadonlyMap<teamId, ReadonlyMap<targetSeason, TradePayrollAdjustment>>`;
- `calculateLeaguePayrolls(teamIds, players, context)` in `contracts.ts`;
- re-export both through `finance/index.ts` and `sim-core/index.ts`;
- `calculateStateLeaguePayrolls(state, teamIds)` in
  `sim.worker.tradeFinance.ts`.

The pure sim-core all-team projection receives:

- an explicit ordered team-ID list;
- the exact player array;
- current finance season;
- exact trade history;
- target seasons current through current + five.

The trade-adjustment result preserves caller-supplied team order in the outer
map and caller-supplied target-season order in every inner map.
`calculateLeaguePayrolls` returns an ordered
`ReadonlyMap<teamId, TeamPayroll>` in caller-supplied team order. Internal
trade-adjustment work may be shared across teams and target seasons only within
this one call.

The implementation must preserve:

- last-write-wins `playerById` behavior used by the current trade adjustment;
- first matching historical controller behavior;
- agreement/history/asset traversal order;
- per-addition and final two-decimal rounding;
- released credit accumulation and controller selection;
- payer charges, external credits, return-to-payer behavior, dead money, tax
  payroll, cap space, and all five future commitments.

The worker state wrapper accepts an explicit team-ID list. The landable helper
obtains 31 interactive CPU team IDs, builds the projection immediately before
the one-day `simulateFADay`, extracts `totalPayroll`, and discards the
projection before `applyNewFreeAgencySignings`. The disposable autonomous
helper supplies all 32 team IDs.

No other `calculateStateTeamPayroll` caller changes. No memoization or
identity-key approximation is permitted.

The existing internal `buildFreeAgencyPayrolls` declaration becomes a named
module export so the repository-owned disposable diagnostic can invoke and
time the exact common outer operation. This is an allowlisted declaration-only
exposure inside `sim.worker.helpers.ts`; it is not added to Comlink, a package
barrel, the application public API, or a save contract. It adds no counter,
cache, state, branch, or runtime behavior. The exact export is retained in the
landable helper, both disposable helpers, and the later byte-equal item-18
helper.

## Frozen news boundary

`deduplicateNews` retains its public signature. Each input row is decorated
once with:

- original `NewsItem` reference;
- parsed timestamp rank;
- sorted related-player key, retaining duplicate IDs;
- input index for explicit stable-tie reasoning.

Sort the decorations once using the existing priority ascending, timestamp
rank descending, and ID locale order, with original index as explicit
full-tie stability. Dedupe that already-sorted sequence into insertion-ordered
winners; a second sort is unnecessary because winners are a subsequence of the
already-sorted rows. Dedupe key remains exact category, original timestamp
text, and sorted player key. First sorted winner survives. Return original item
references, not copies.

## Frozen prospect boundary

At `recordProspectBondDebuts` entry, traverse `state.players` once and populate
an operation-local map only when the ID is absent. The existing bond map,
eligibility, stat lookup, milestone, loyalty, pushed debut IDs, final sorting,
and unchanged-object paths remain otherwise byte-structurally equivalent.

## Frozen micro-arc boundary

Before the outer player loop:

- traverse news once in current array order;
- retain only entries whose first related player exists, whose body contains
  `cal`, whose timestamp parses, and whose parsed season equals current season;
- append call-up day facts by player ID in encounter order;
- traverse trade history once in current order;
- for each current-season trade, visit offering assets then requesting assets,
  each in current asset order;
- retain every asset with a player ID, including duplicates, with exact trade
  day, acquiring team, and prior team.

The original outer player loop remains in `state.players` order. For each
player, consume indexed facts in encounter order. The existing plain-object
`bestTrades`, strict `>` score replacement, `for...in` emission order,
detectors, and append functions remain authoritative. This preserves duplicate
player behavior and idempotence.

## Exact tests and negative controls

Semantic parity fixtures are those listed in the goal and plan. Structural
guards must use balanced, named-function body extraction; whole-file regex or
token-count gates are rejected.

Each guard has one deliberate mutant:

1. payroll restores projection inside the team/year enumeration;
2. news moves timestamp/player-key work into the comparator;
3. prospect restores unresolved-bond `state.players.find`;
4. micro-arc restores full news/trade traversal inside the player loop.

The intended assertion must fail once, the mutant must be restored, and the
same test must pass before source freeze. No production counter or behavioral
test hook is permitted; the declaration-only module export above exists solely
to invoke the real operation and is not instrumentation.

## Helper topology

Three helper identities remain distinct:

1. landable Goal-32 helper: interactive behavior plus only the same-day payroll
   projection change;
2. baseline disposable helper: stopped Goal-31 behavior plus the historical
   autonomous mode, retaining unoptimized payroll;
3. successor disposable helper: landable Goal-32 helper plus that autonomous
   behavior, using the optimized projection for the selected team set in both
   modes.

The historical `6ce96ebf…` raw patch may not be applied because it overlaps
`buildFreeAgencyPayrolls` and `simulateFreeAgencyDays`. A generated function
projection classifies every helper delta as payroll-only, autonomous-only, or
reviewed overlap resolution. Interactive, autonomous, and cross-mode parity
fixtures must all pass.

The future item-18 helper must equal the reviewed successor disposable helper
blob before any item-18 diagnostic. That equality is recorded only; it does not
authorize item-18 execution here.

## Paired composition identity

Baseline parent is `4e016cc4…`; successor parent is the future Goal-32
source-freeze commit. The eleven proof/observer paths are byte-identical.

Before execution, one generated immutable manifest binds:

- base/source/composition revisions and trees;
- clean state and exact changed-path sets;
- SHA-256 for every production, test, helper, and proof path;
- exact four preserved Goal-31 blob hashes;
- historical helper revision/hash and overlapping function names;
- helper function projections and three parity-receipt hashes;
- authenticated input hashes:
  - `season15.json` / post-season-15 raw
    `043595c3bd9d557f520b438de48f11edd8d49e926d3d23e9c449c45441500d3e`,
    envelope
    `a4e66914ab270f761fa1b0c027c53c97f9971720f7f36d4680aa53e512c85bca`;
  - `season29.json` / season-30-input raw
    `3a0160764d0899706c4d940ab30f238673e8a7c8ab39a6a5adc589cf93b256d3`,
    envelope
    `4664509f1f94d567f7518c1521cb2756cf938eaac318905fde33061dcd3f47e0`;
- four exclusive diagnostic output paths;
- exact process order;
- mechanical proof that neither composition is an ancestor of proposed local
  main.

The reducer fails closed for stale roots, dirty state, missing/extra paths,
mismatched hashes, changed observer bytes, reused/reordered ordinals, altered
checkpoints, malformed observations, or inconsistent identities.

## Diagnostic and admission

The diagnostic executes exactly:

1. baseline against post-season-15 data;
2. successor against post-season-15 data;
3. baseline against season-30-input data;
4. successor against season-30-input data.

Each receives a fresh read-only copy of its authenticated input bytes; baseline
and successor for the same data age receive byte-identical inputs. Each process
imports a fresh clone and invokes exactly once, in order:

1. `buildFreeAgencyPayrolls(..., 'autonomous_league')`;
2. `deduplicateNews`;
3. `recordProspectBondDebuts`;
4. `applySeasonEndPlayerMicroArcMoments`.

Each writes to one exclusive output path. The first root includes all 32 teams,
and successor timing includes the batch projection itself. Nested callees are
not separately timed. Each root records exact call count `1` and summed raw
elapsed wall time.

Artifact key order is:

`schema, goal, variant, dataAge, checkpoint, sourceIdentity, helperSha256,
observerSha256, roots, factualDigests, stateDigest, rngDigest, semanticDigest,
receiptDigest`.

Reducer key order is:

`schema, goal, manifestDigest, baselinePost15Digest, successorPost15Digest,
baselineSeason30InputDigest, successorSeason30InputDigest, D15, D30, R, P, H,
cap, result, receiptDigest`.

The reducer rejects negative deltas and computes after raw-sum flooring:

```text
D15 = floor(baselinePost15Total - successorPost15Total)
D30 = floor(baselineSeason30InputTotal - successorSeason30InputTotal)
R = 22 * D15 + 16 * D30
P = 2,948,890 - R
H = 1,938,000
```

Only `R >= 1,010,890` and `P <= H` opens the final proof. Diagnostic failure is
terminal for this slice: no retry, fifth seam, or forecast.

A green diagnostic is not admission evidence. The unchanged final forecast and
admission remain authoritative, run once with retries disabled.

## Stop-loss and verdict rule

Defect classes are production, verification-program, architecture-contract,
evidence-recording, documentation/naming, or non-blocking improvement. Only a
defect capable of invalidating execution, causal evidence, source integrity, or
the verdict can reopen architecture.

Two consecutive failures from the same copied identity, receipt, path, or
projection family trigger redesign of the authoritative generator/reducer;
they may not create a recovery lineage. R41 remains prohibited.

Architecture passed with the recorded independent Sol verdict and zero
actionable P0–P2. Production editing remains closed until the docs-first commit
exists.
