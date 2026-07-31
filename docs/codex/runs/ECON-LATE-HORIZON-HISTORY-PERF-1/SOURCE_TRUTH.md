# Source Truth — ECON-LATE-HORIZON-HISTORY-PERF-1

Recorded: 2026-07-30 before any Goal-32 production edit or performance command.

## Git and worktrees

- Active branch: `codex/econ-late-horizon-history-perf-1`.
- Active HEAD/local main:
  `198759d88815d977f47672f7e1f5f0cb5ee4f0aa`.
- `origin/main`:
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`.
- Active worktree at initial recording:
  `/private/tmp/mbd-goal32-source-20260730`; it was later removed externally
  and replaced by the persistent worktree recorded at the end of this file.
- Active index/worktree before docs: clean.
- Original stopped Goal-31 worktree:
  `/Users/kevin/Downloads/MBD-main-main`, branch
  `codex/econ-milestone-path-perf-1-authorized`, HEAD
  `4e016cc4fe3043e438cc0cbc3aeec798b6f47d6b`, with its eight terminal
  documentation overlays preserved and unstaged.
- Original proof composition commit:
  `2f3329b0886396cd9d8550aa42ea2738d02c4126`, preserved as Git evidence; its
  `/private/tmp/mbd-goal31-composition-20260730` checkout was later removed
  externally.
- Original evidence root at initial recording:
  `/tmp/mbd-goal31-direct-proof-2f3329b-20260730`; it was later removed
  externally.

The local-main stop-record commit contains exactly the approved 17
documentation paths and excludes all four Goal-31 source/test candidate blobs.
No remote operation had occurred at initial recording. Local `main` was later
pushed under Kevin's standing GitHub authorization, as recorded in the final
reconciliation section.

## Package, schema, and save state

- Package manager: `pnpm@9.15.4`.
- Game snapshot: v35.
- Dexie schema: v6.
- Root commands are read from live `package.json`:
  `pnpm typecheck`, `pnpm test`, `pnpm build`,
  `pnpm verify:determinism`, and `pnpm e2e:reload-smoke`.
- No save-schema or migration work is authorized.

## Failed predecessor evidence

Goal 31 proved its milestone and ceremony source semantically exact and reduced
the measured season-30 V8 root by about 99.53%. The single final admission then
correctly failed:

- forecast-primary raw wall: `1,739,710ms`;
- permitted continuation raw wall: `1,209,160ms`;
- frozen adjustment: `+10ms` per process;
- adjusted aggregate: `2,948,890ms`;
- immutable cap: `2,040,000ms`;
- deficit: `908,890ms` (`44.553%`);
- both individual processes remained under `2,400,000ms`;
- final season-30 state, RNG, round-trip, snapshot, population, and season facts
  converged exactly;
- no admission receipt was written and no retry ran.

The predecessor is failed evidence, not a landing candidate.

## Exact preserved Goal-31 blobs

Imported later only after the docs-first architecture gate:

| Path | SHA-256 at `4e016cc4…` |
| --- | --- |
| `apps/web/src/workers/sim.worker.milestones.ts` | `bef65c1e23a3fc8096ae8745528cd577e00f93cbc1f4b3909c95d8c86b09bbd6` |
| `apps/web/src/workers/sim.worker.ceremony.ts` | `ee6fe50bdc5bb83107b01822840684d71197abc4bed79e7e6ae8f01eb82f0102` |
| `apps/web/src/workers/sim.worker.milestones.test.ts` | `6834b7b5915ddb135ed1d28467794922e37980b7ca7a9214263390053ec62123` |
| `apps/web/src/workers/sim.worker.ceremony.test.ts` | `00bfabd45662a837e7c01d4c3c2581287b39ab2f91719b1f4d25e85fbab66811` |

## Live source seams

### Payroll

`buildFreeAgencyPayrolls` in `sim.worker.helpers.ts` calls
`calculateStateTeamPayroll` once per 31 CPU team immediately before one
`simulateFADay`. `calculateTeamPayroll` performs one current-season and five
future-season `deriveTradePayrollAdjustment` calls, so the helper repeats the
whole trade-history projection 186 times per free-agency day.

Canonical signings occur only after `simulateFADay`, through
`applyNewFreeAgencySignings`. Therefore an exact operation-local projection is
valid only for the pre-signing map and must be discarded before that mutation.
The current helper's `freeAgentIds` and `teamPlayers` locals do not feed payroll
calculation and are not a filtering contract.

Base SHA-256 values before Goal-32 source edits:

- `packages/sim-core/src/finance/tradeFinance.ts`:
  `30d59f94376a0d347eac80921668f9291b2887dfe46c0292f50c76f241f7b98d`
- `packages/sim-core/src/finance/contracts.ts`:
  `0aac8ec1b66d1cc55e93f587633c7cfa8d8653bba9354dd6383f928966856e46`
- `apps/web/src/workers/sim.worker.tradeFinance.ts`:
  `6c17db1cf6c7c53816e8d6077f69067c2579091953024466c888edac888aee06`
- `apps/web/src/workers/sim.worker.helpers.ts`:
  `49677b8d4b2b6fa3d3bdf29729d4827cb3b7f6f0c6462d8523a8cd3e0b18c13e`

The historical autonomous helper at `6ce96ebf…` overlaps
`buildFreeAgencyPayrolls` and `simulateFreeAgencyDays`; its raw patch cannot be
applied. The disposable helper must be a reviewed semantic merge. The landable
Goal-32 helper remains interactive-only.

### News

`deduplicateNews` sorts the full feed with `compareNewsItems`, whose comparator
reparses both timestamps on every comparison, then builds a sorted player key
for each row, then sorts winners again. The API has many callers and must not
change.

Base `newsFeed.ts` SHA-256:
`a6f66ec5027a68ac624d9bdea9bdb5d4aaa4a800ff8a8b7af224270eeab4144c`.

### Prospect bonds

`recordProspectBondDebuts` traverses unresolved bonds and performs
`state.players.find` for each. It is called by all three regular simulation
lanes. Its operation-local index must be first-write-wins to preserve
`Array.find` duplicate-ID semantics.

Base `sim.worker.farm.ts` SHA-256:
`d01af0d469cbf27680b08c9618951256951958606f81cdf7ec9d3e81fcc8ab43`.

### Season-end micro-arcs

`applySeasonEndPlayerMicroArcMoments` loops every player over all news and all
trade history/assets. It runs once at season completion. News matches only
`relatedPlayerIds[0]`; trade candidates preserve history, offering/requesting,
asset, and outer-player order; equal scores retain the first candidate.

Base `sim.worker.narrativeFarm.ts` SHA-256:
`6941c1802f2b7455639fc8020d3b58ee5a4c44b67d9d463bbfda820ed7b0b9d7`.

## Profile-backed need

The sealed season-30 profiles attribute about:

- `19.6s` to repeated trade-payroll projection;
- `10.2s` to full-feed news deduplication;
- `10.7s` to prospect/player cross-product lookup;
- `5.1s` to season-end player/news/trade scans.

No single production seam can plausibly recover the `908,890ms` deficit. The
exact four-seam bundle is the smallest source-backed strategy with a plausible
path to the frozen diagnostic threshold. Receipt serialization remains
proof-only and outside this production scope.

## Authenticated diagnostic data ages

The sealed inputs are historical filenames, not execution labels:

- `season15.json` has raw SHA-256
  `043595c3bd9d557f520b438de48f11edd8d49e926d3d23e9c449c45441500d3e`
  and envelope digest
  `a4e66914ab270f761fa1b0c027c53c97f9971720f7f36d4680aa53e512c85bca`.
  It contains season-16 preseason state after season 15.
- `season29.json` has raw SHA-256
  `3a0160764d0899706c4d940ab30f238673e8a7c8ab39a6a5adc589cf93b256d3`
  and envelope digest
  `4664509f1f94d567f7518c1521cb2756cf938eaac318905fde33061dcd3f47e0`.
  It contains season-30 preseason state after season 29.

The diagnostic names these `post15` and `season30Input`. `D15` is the
observation against post-season-15 data; `D30` is the season-30-input
observation. Neither artifact may be relabeled as a completed-season execution.

## Focused test truth

Existing coverage:

- `packages/sim-core/tests/finance.test.ts` covers retained salary, retrades,
  return-to-payer, released-controller liability, credits, and future
  commitments.
- `packages/sim-core/tests/narrative.test.ts` covers dedupe winner and lexical
  ID order.
- `apps/web/src/workers/sim.worker.tradeFinance.test.ts` covers worker retained
  finance.
- `apps/web/src/workers/sim.worker.test.ts` covers exact micro-arc moments and
  idempotence.

The approved new farm and narrative-farm performance tests are necessary
because no direct isolated structural coverage exists for those two seams.

## Active risks

1. Payroll projection may silently change duplicate-player, release,
   controller, rounding, or future-commitment behavior.
2. A cached projection may survive a signing, day boundary, import, or trade
   mutation.
3. Decorated news sorting may change full-tie stability or object identity.
4. A normal `Map(players.map(...))` would change first-duplicate prospect
   behavior.
5. Reordered micro-arc facts may change equal-score winners or idempotence.
6. Static structural tests may be misleading unless they extract the exact
   named function body and are paired with exact semantic fixtures.
7. The diagnostic is only a prefilter; only final admission proves the
   40-minute contract.

## Final landable source freeze

The final landable source/test freeze is commit
`5a4eb60f8b1890803117a84a613d43af605f47dc`, tree
`23aa4bf628f353775b445b1c4963b9c0d21d3057`. Its production parent is
`c900ffc084812444d3553b1f08ad0e985345181b`; the final commit changes only
three allowlisted test files. Sol returned `MERGE_READY` with actionable
P0/P1/P2 `0/0/0`.

Exact source/test SHA-256 values:

| Path | SHA-256 |
| --- | --- |
| `apps/web/src/workers/sim.worker.ceremony.test.ts` | `00bfabd45662a837e7c01d4c3c2581287b39ab2f91719b1f4d25e85fbab66811` |
| `apps/web/src/workers/sim.worker.ceremony.ts` | `ee6fe50bdc5bb83107b01822840684d71197abc4bed79e7e6ae8f01eb82f0102` |
| `apps/web/src/workers/sim.worker.farm.performance.test.ts` | `47fc6e84ff1d74fafe1004a1331332a8c939c3ec1140ca6aa116039570eda17a` |
| `apps/web/src/workers/sim.worker.farm.ts` | `f91e6e6bfca57072e57848185ed18610dc35ccc08add74209a4a8d0440c12feb` |
| `apps/web/src/workers/sim.worker.helpers.ts` | `892bc0193b1c735cb36126b9af7ea901361c864d43e2a6586dc852dd8c87ca37` |
| `apps/web/src/workers/sim.worker.milestones.test.ts` | `6834b7b5915ddb135ed1d28467794922e37980b7ca7a9214263390053ec62123` |
| `apps/web/src/workers/sim.worker.milestones.ts` | `bef65c1e23a3fc8096ae8745528cd577e00f93cbc1f4b3909c95d8c86b09bbd6` |
| `apps/web/src/workers/sim.worker.narrativeFarm.performance.test.ts` | `4201dfaaf24a8596bb5552b1087cc3faf96868955f21be32fbcd2c36032f40df` |
| `apps/web/src/workers/sim.worker.narrativeFarm.ts` | `08c0eb03e40e111b82d4acff16ecfc87bdcb132b419e7b41d83b5f751b22e720` |
| `apps/web/src/workers/sim.worker.tradeFinance.test.ts` | `b4121e152af92a9b451d174efb59ef348c5c29170c2f5c77a12d2d3eae9a5ac2` |
| `apps/web/src/workers/sim.worker.tradeFinance.ts` | `82477b77188a1d362f82d56ebc8903f4624314ae888cb64a2e82c0e707947087` |
| `packages/sim-core/src/finance/contracts.ts` | `0e2ca8262560b983865cf61cd7c78922c134891c1f0b5fc68f75cb2a24088b45` |
| `packages/sim-core/src/finance/index.ts` | `4e1598908330a1eeacae2252ea33dceaa6542509cc5251d8395d3b2075273bd3` |
| `packages/sim-core/src/finance/tradeFinance.ts` | `a4e08f5af295ca03994bb034654816fa7ef35868a88a23dd83036e9b9e255c71` |
| `packages/sim-core/src/index.ts` | `077c335b88e034571eb28c69f51979933033aca010c8766fbbc2d148d6082a3d` |
| `packages/sim-core/src/narrative/newsFeed.ts` | `9c4a84e3eca72e1f05e0561c1b0bb934b47c865f9a0692e66b25cc8a6ba2ebb3` |
| `packages/sim-core/tests/finance.test.ts` | `377cda7f1169cb83bf5d3a0184f88c578c33a681ec994169c9b3ed1d0186c749` |
| `packages/sim-core/tests/narrative.test.ts` | `7705bbcb6126e84309fe983d2737539cf03fbb915a77cd1c9042ad7110dbd35c` |

Focused final receipts, all on the current source freeze with retries disabled:

- sim-core finance/narrative: 2 files, 64 tests passed;
- web affected matrix: 6 files, 225 tests passed;
- sim-core and web direct typechecks passed;
- root typecheck passed 9/9 using a Corepack shim outside the repository;
- `git diff --check` passed;
- all 11 production files are byte-identical to `c900ffc…`;
- all four preserved Goal-31 files retain their frozen hashes.

The repository-owned fallback `pnpm` wrapper attempted to add an `allowBuilds`
entry to `pnpm-workspace.yaml` and then failed on ignored `esbuild` scripts.
That attempted edit was restored byte-for-byte and was never staged or
committed. The successful root typecheck used an external `/tmp` Corepack
shim; repository dependency policy remains unchanged.

## Final pre-execution diagnostic truth

Correction loop 3 changed only the shared disposable proof files
`econLongSoak.receipts.ts`, `econLongSoak.receipts.test.ts`, and
`econLateHorizonPerf.integration.test.ts` in both compositions. It did not
change the landable source freeze.

- Baseline composition:
  `505cfdf7c3c11e0cb821bea0716641dbcb787555`, tree
  `0640b942317d7bfacebb33b2b5befa20e90cd746`.
- Successor composition:
  `7cfda1134cd6f7458f906018a23461ba6a7a97d1`, tree
  `36b8f2fdef9adb68b7516441ece0a3e9ad09a04e`.
- Fresh artifact root:
  `/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r2`.
- Its only current file is the regular direct-child `manifest.json`.
- Raw manifest SHA-256:
  `15e8d9e6c81aac8da253a3076dd7a9414f2e8a42beea3d02feea02992e7d5995`.
- Internal manifest digest:
  `57d0ba66a26dca3f5dcd03a8dfeddb8f06aefd36a74232456d4bec0f9fd8340b`.
- Exact check-only result: 15 tests passed, one unrelated Goal-31 gated
  adapter skipped, exit `0`, retries disabled.

No paired child, input copy, observation, reducer, measured root, diagnostic,
forecast, final proof, admission, or retry has run against this root.

Fresh Sol review rejected `-r2` before execution with actionable P0/P1/P2
`0/2/0`. The verified source truth is:

- a stable observation read is discarded before a later unbound pathname
  reopen, and the artifact-root inode is not pinned for the orchestration
  lifetime;
- the optimized successor's forecast/direct-proof/admission path is
  non-executable because it still enforces Goal-31 ancestry and legacy helper
  identities that the Goal-32 composition intentionally does not satisfy.

This is verification architecture failure, not evidence that the production
optimization or performance threshold failed. The one paired diagnostic
remains unconsumed.

## Rejected proof-authority checkpoint and causal replacement

The first five-file proof-authority checkpoint produced clean, focused-green
composition commits:

- baseline `afb8ab973259d20aaae2d738c16755d1ac24786b`, tree
  `eafa617d279709c1fbe4c0f135f8fa0a81b0a1a4`;
- successor `9eede0ce020a0876eca0b464331397c920cc5d5e`, tree
  `44a9e6cd050fab2d0ba850d587f94c2850d820ec`.

Both composition matrices passed 66 tests with seven expected gated skips,
and both affected web typechecks passed. The deliberately disabled retained
observation assertion made its named regression fail; restoring the assertion
made it pass. The manifest-only root
`/private/tmp/mbd-goal32-proof-authority-5a4eb60-20260731` has raw SHA-256
`d6a2165f3571382803859816316128e41ca4f6403c598caf411ee99cbac70bbd`
and internal digest
`c9fb34fa4b452c81bf1dfb0e53d96014e892c337dc6b782f827a4b58c838d42c`.
Manifest seal and check-only passed 15 tests with two expected skips;
three-consumer check-only passed 29 tests with four expected skips. All
execution lanes remained zero.

Independent Sol review returned `STOP_REQUIRED`, actionable P0/P1/P2
`0/4/0`, because the checkpoint still had four causal proof defects:

1. live Goal-32 News identity and the final admission's historical Goal-31
   News identity disagreed;
2. wrappers could expose output before final authority validation and did not
   rederive the asynchronous successor after the awaited work;
3. child output closed a pathname before the parent first retained it;
4. retained validation rehashed cached bytes instead of rereading current
   held-descriptor bytes, leaving reducer postwrite closure incomplete.

These are proof-architecture defects only. The source freeze remains reviewed
`0/0/0`; the paired diagnostic remains unspent. Sol approved the
first-principles causal replacement recorded in
`SOL_CAUSAL_ARCHITECTURE.md`: manifest-derived identity, current-byte
held-descriptor validation, authenticated stderr-frame child transport,
staged parent-owned publication, and a reducer that reopens and binds the
complete causal closure.

## Causal implementation stop and direct-proof source truth

The approved causal architecture did not become executable within its one
implementation pass and one correction. The final identical dirty diff has
SHA-256
`6b82fc2fdff37e5269097f15953b1659eb445c11c8c513a76203ceeb08744ce8`
and changes four proof-only paths in each rejected composition. Focused tests
and typechecks were green, but actual Goal-32 publishers still used direct
pathname writes, the held-FD publisher was not the sole live boundary, the
direct proof file remained unchanged, and required transport/publication
negative controls were absent. The candidate is permanently stopped before
measurement.

Live source inspection established a smaller authoritative boundary:

- `apps/web/src/workers/econLongSoak.test.ts` is the same repository-owned blob
  `5f569293aa352b4638196451b4168c77e47979b5` at Goal-18 commit `6ce96eb…`,
  Goal-31 proof commit `2f3329b…`, and both clean Goal-32 compositions;
- `runEconLongSoak` already owns the canonical primary 1–30 plus replay 16–30
  lifecycle and exact receipt validation;
- the four production seams and their semantic tests are already source-frozen
  and reviewed;
- the authenticated `season15.json` and `season29.json` inputs remain unchanged;
- native Git HEAD/tree/clean-state checks replace the failed copied identity
  graph;
- strict child stdout records replace manifest, pathname, reducer, and artifact
  custody.

Sol approved the one-file plan in `SOL_DIRECT_IN_PROCESS_GATE.md`. It preserves
the exact `R/P/H` equations, `1,938,000ms` diagnostic threshold,
`2,040,000ms` final adjusted cap, `10ms` adjustment, and `2,400,000ms` process
timeout. No custom semantic artifact root or new lineage is required.

## Direct import-probe terminal evidence

The direct proof candidate changed only
`apps/web/src/workers/econLongSoak.test.ts` in the clean successor proof
worktree. Its file SHA-256 is
`4c419d62bff7b66cd9a7115640e502e5c8407b7c624e487b9bf9d48082d58262`;
its binary diff SHA-256 is
`3846cf5d4effb18c130bfe05ba31c6c0eed73be45d7a370b5018f75536a09daa`.
The baseline remained Git-clean at `505cfdf7…`; the successor remained at
`7cfda113…` with only that file modified.

The ordinary focused test passed `4` with two gated skips, web typecheck
passed, and diff-check passed. The single authorized import probe then failed
before resolving either game module because the baseline root lacked
`node_modules` and Vite could not load its own configuration. No worker,
simulation, `hrtime` root, artifact, diagnostic, or admission ran.

Sol returned `ROUTE_STOPPED`. This is a verification-environment defect. The
direct candidate must remain uncommitted and evidence-only. The `R/P/H`
diagnostic remains genuinely unspent; Goal 32 cannot continue without an
oracle explicitly authorizing dependency preparation before one new probe.

## Quarantined direct-candidate static review

Fresh read-only Sol review returned `BLOCK`, actionable P0/P1/P2 `0/8/2`.
The exact stopped candidate could not pass even after dependencies exist:

- envelope authentication excludes the snapshot that the producer includes;
- the operator root/input environment is ignored;
- ordinary mode is not inert;
- authenticated pre-state/pre-RNG/round-trip facts are not admitted;
- no strict stdout collector or post-acceptance publication boundary exists;
- no `D15`, `D30`, `R`, `P`, `H`, or threshold is computed;
- semantic/identity hostile controls do not exercise actual admission;
- default Vite config loading can write cache/temp state during the nominally
  no-output import probe;
- module evidence hashes paths, and Git admission does not bind the exact
  reviewed candidate bytes or untracked state.

The candidate remains valuable design evidence: it has the correct four-root
order, composition-rooted Vite servers, timing placement, root-row shape
checks, and final factual/snapshot/state/RNG comparison. It must not be edited
or retried. `SOL_DIRECT_CANDIDATE_REVIEW.md` freezes the exact future boundary.

## 2026-07-31 live workspace and GitHub reconciliation

The prior `/private/tmp` Goal-32 source, composition, proof, and dirty-candidate
directories were removed externally between sessions. Live `git worktree`
metadata pointed to nonexistent directories and was pruned only after a dry
run confirmed those paths were stale. No live checkout, tracked file, branch,
commit, or user-owned work was deleted by the repository operation.

Recoverable facts:

- all committed Goal-32 source, test, architecture, and review commits survive;
- active persistent worktree:
  `/Users/kevin/Downloads/MBD-econ-late-horizon-history-perf-1-goal32`;
- active branch pre-sweep HEAD:
  `6b7fd49c1b8232358340779f69153d0885177f09`;
- local `main`: `198759d88815d977f47672f7e1f5f0cb5ee4f0aa`;
- pre-sync `origin/main`:
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`;
- frozen landable source and independent `0/0/0` review remain intact at
  `5a4eb60f8b1890803117a84a613d43af605f47dc`;
- clean committed baseline/successor proof identities remain addressable at
  `505cfdf7…` and `7cfda113…`;
- the original Goal-31 worktree remains present with exactly eight protected
  documentation changes, all unstaged and untouched.

Irrecoverable temporary facts:

- the stopped causal and direct candidates' uncommitted working bytes are not
  present on disk;
- the authenticated `season15.json` and `season29.json` files at the recorded
  `/tmp` evidence root are also absent;
- their recorded hashes and reviews remain historical evidence, but the run
  may no longer claim their dirty worktrees or private artifacts are preserved;
- no later implementation may reconstruct bytes from prose and identify them
  as the historical candidate.

This loss does not consume the still-zero `R/P/H` or final-admission lanes. It
does require the next proof route to use persistent roots outside
`/private/tmp`, create an independently reviewed candidate from the frozen
contract, and either locate exact checkpoint copies matching both recorded
raw/envelope hashes or perform the one previously authorized canonical
repository-owned recapture before diagnostic execution.

Kevin's reaffirmed standing authority supplies the requested bounded oracle:
fresh persistent roots, separate frozen-lockfile installs, read-only preflight,
one corrected proof-only test candidate, independent static `0/0/0`, and one
fresh import probe before the existing no-retry diagnostic/admission sequence.
GitHub synchronization of recoverable clean commits is authorized; unproven
Goal-32 production remains excluded from `main` and any deployment/release.

## 2026-07-31 bundle-gate source correction

Draft PR 85 CI at `8b90b50…` failed the exact worker-core bundle budget:
`458,237 > 456,704` raw and `148,181 > 147,456` gzip. One retries-disabled
local reproduction returned the same bytes. Source and test inspection showed
the new operation-local trade-finance projection had entered the generic
sim-core chunk. The defect was build architecture, not simulation behavior or
test infrastructure.

`BUNDLE_GATE_CORRECTION.md` freezes the bounded two-file correction. Exact
landable source is now
`85310795ef3ef13118eb75386a0864d270ace37c`, tree
`8ce776cc7d84c8872de807510d1968a136bee773`. It routes only the type-leaf
`tradeFinance.ts` module to `game-engine-trade-finance`; no budget was raised
and no simulation source changed. Independent Sol review verified the exact
pre-commit diff SHA-256
`7947ec75731a7efb823922ec07924fbb71866af76af86ba8890667a71bb18509`
and returned `MERGE_READY`, P0/P1/P2 `0/0/0`.

Current source-bound gates are green: core `452,347` raw / `146,487` gzip,
trade-finance `5,908` raw / `1,939` gzip, 169-entry PWA with the new chunk
precache-bound, root typecheck `9/9`, no-cache full tests, determinism `3/3`,
and production Playwright `14/14` in `7.4m` with zero retries. The browser run
rewrote tracked evidence screenshots as part of existing journeys; those
generated working-tree changes were restored before source freeze, leaving the
two-file commit exact.

This source change invalidates revision/tree-bound successor, build, PWA,
browser, diagnostic, and admission artifacts. The old `7cfda113…` successor
composition remains evidence-only. The persistent direct-proof route must
generate a fresh clean successor composition rooted in `85310795…`, then
perform static `0/0/0` review before its sole import probe. Baseline evidence,
checkpoint contracts, formulas, caps, R41 prohibition, all unspent timing
lanes, and Item-19 closure remain unchanged.
