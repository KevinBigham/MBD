# Source Truth — ECON-MILESTONE-PATH-PERF-1

Status: `DIRECT ROUTE AUTHORIZED; PRE-TRANSFER CONTRACT CORRECTIONS ACTIVE; V1/V2/V3/R37–R40 RETIRED; CANDIDATE PRESERVED`.

## 2026-07-29 authorization and live revalidation

- Kevin explicitly authorized the exact tracked, disposable, non-landed
  12-path composition requested in `DIRECT_PROOF_AUTHORITY.md` and all bounded
  work needed to continue.
- The active current-main-derived branch is
  `codex/econ-milestone-path-perf-1-authorized` at documentation commit
  `da7107c43edcad1acc9a25fe95c9fc65fec14b9a`; merge-base with local `main` is
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`.
- A read-only source mapper verified that the exact four-file candidate patch
  and exact helper/autonomous-test delta both apply cleanly in check mode.
  Candidate imports and APIs have no relevant ancestry drift. Verdict:
  `MERGE_SAFE`, actionable P0/P1/P2 `0/0/0`.
- A read-only risk review found four proof-route P1s before source transfer:
  stale active scope wording, unavailable raw B1–B3 manifests, caller-asserted
  composition identity, and prose-only non-landing protection. The active
  documents now resolve them by freezing the 12-path scope, the committed
  Goal-30 source-truth baseline authority, generated live identity/hostile
  tests, and separate-branch ancestry/diff gates.
- Baseline authority is an immutable fact-by-fact composite:
  - Goal-30 `SOURCE_TRUTH.md` blob
    `3d162280c911b923889276a9031ffa9765d9137a`, SHA-256
    `25011a0f457774b4a2e6999137b24cfa2cfee84ffefb4412d6076158a5d37061`,
    owns B1–B3, row/state/RNG/call, and build V8 `48,951,209µs`;
  - late-reference CPU-test blob
    `a17c250c202233071c9e8a451d7c9402c752e3ca`, SHA-256
    `fa55622512058311b9a0d73e7033dcd01104d49b7c50b9a84789655ff4fa0350`,
    owns ceremony `24,549,831µs`, combined `73,501,040µs`, and
    `simToPlayoffs` `127,114,740µs`;
  - Goal-31 blocker blob
    `c1a5cb9cc8daf83163c06c0a2de7763fea3a860b`, SHA-256
    `b34e836a586fa31596518f8c0148faa459621f5743f0339e627f93fe1e958571`,
    owns semantic digest
    `f76ac9d30b5edaecc80f4213d5799431a3025cada9398afeb1a749e832dba98b`.
  No one blob owns all facts. The future reducer must rehash all three and
  reject fact drift; nothing may be fabricated or rerun as baseline.
- All 14 documented starting identities for the 12 unique composition paths
  rehashed exactly. The late reference
  `0ff41b71fd9c5f437f7d01284dc7afa6738e5fef`, tree
  `a55dda81d601e016498fe4c7c3c88a4379bde70e`, is not in the current
  repository object database. Its committed bytes resolve only in preserved
  repository `/Users/kevin/Downloads/MBD-item18-exact45-preparation-v10-20260718-proof`;
  imports must use `git -C` there and rehash the resulting files. Dirty
  unrelated preparation files in that checkout do not alter `git show
  <revision>:<path>`.
- The read-only proof mapper returned `READY_TO_COMPOSE` with four P1 proof-code
  gaps wholly inside the authorized 12 paths: no isolate-bound real-profile
  producer, unknown/cyclic CPU graphs fail open or hang, receipts lack causal
  run class/ordinal, and the final admission reducer does not yet exist. The
  active authority and plan now require these exact corrections before
  composition freeze or performance execution.
- Gate ownership is separated mechanically: the composition owns its focused
  matrix/typecheck/pre-artifact review and all performance receipts; the source
  branch owns final root gates, final landable-diff-plus-receipts review,
  staging, and local-main landing. Final review must prove the composition is
  not an ancestor and that helper/proof-only bytes are absent from the source
  tree.
- Final read-only recheck of the nine-document architecture diff returned
  `GO_TO_IMPLEMENTATION`, actionable P0/P1/P2 `0/0/0`. All four prior
  proof-route findings are closed. No test, simulation, capture, profile,
  forecast, diagnostic, or artifact command was executed by the reviewers.
- No candidate source transfer, test, capture, simulation, CPU profile,
  forecast, diagnostic, or final gate has run under this resumed authority.

## 2026-07-28 executable overlay preflight

- Local `main`, local `origin/main`, and remote `refs/heads/main` remain
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`; the main worktree is clean.
- The direct-proof docs branch began this closure update clean at
  `dbf71bb5a16f9e7a69f732fece91fac4fe4e6fa5`; its current dirty state is
  exactly this nine-file Goal-31/roadmap documentation update.
- Preserved WIP remains `9ba8b35a2e908a484cb5fa21781f91d415777a3a`
  with an empty index and the same four exact candidate hashes.
- Goal-18 revision/tree remain
  `6ce96ebf6482cd0a3fa52a342d7b29e8977528ff` /
  `2700623cc9e3febd690e19b80ffc62e8d32b43aa`.
- Spotlight plus bounded searches of Downloads, Documents, Desktop, `.codex`,
  `/tmp`, and `/private/tmp` found no season-15 or season-29 raw checkpoint.

No single existing revision implements every required direct-proof lane. The
minimal starting identities are:

| Role | Starting revision/path | Blob | SHA-256 |
| --- | --- | --- | --- |
| only production overlay | `6ce96eb:sim.worker.helpers.ts` | `9d304b3a0a4af5f83603697e017df6545795d316` | `07115d9313f7747bc8d5fd7dfd09f99d3763b433284890cb094a31dbb20d750f` |
| autonomous proof | `6ce96eb:sim.worker.autonomousOffseason.test.ts` | `44a94b7ea7403e659e78f81d8de617eee670fa05` | `809da804fbb6e2dcfb245259370ff2eb93ba7a2a7ffdf9cee03c9490c505a4cb` |
| metrics | `6ce96eb:econLongSoak.metrics.ts` | `710d17634ae2725cd96a592c5f88fef046ff2a36` | `56af06b6ab031e7e703dca90442f473a00fcb5a7a9f45edeb439555fddabeec1` |
| metrics tests | `6ce96eb:econLongSoak.metrics.test.ts` | `60db4951669d19fc3dee2e390643ebffaba71b89` | `e23b2ded69cdc4e828e91c0cb43337c88b055c804dce1820eebe31b1a1928f1b` |
| receipts | `6ce96eb:econLongSoak.receipts.ts` | `67e30455c2a7553d4b338b3e8586af1208e6659d` | `173df6d6293760df6a6f43c88900cd334ef742e62e107bffc9655052953afd21` |
| receipt tests | `6ce96eb:econLongSoak.receipts.test.ts` | `315d586f08dec2426f5eb1b5abf821af558522b1` | `e7bf711c276b35e09091facc71dd1b8672490ee200c3ea67e81786c9213538df` |
| harness identity | `6ce96eb:econLongSoak.test.ts` | `5f569293aa352b4638196451b4168c77e47979b5` | `ca53548a5fa137579da0cf5851944d211f7b93b2422d5d34c00ceac576ececef` |
| canonical Goal-18 support baseline | `6ce96eb:econLongSoak.testSupport.ts` | `2125db333556c697563804740a5b2118e6554176` | `9e1a80d4b3f274f405a636c8f4fdfe6e03479f6570c6c80974c44b9f9ad7ff81` |
| season-15 capture support reference | `71c73f9:econLongSoak.testSupport.ts` | `816048827acf8215012020b198a0832ecb60105b` | `c0dee137f81405e2bf8ac8e4f451b95db19da73fbd6cb1632206a012530c74fd` |
| late-range support reference | `0ff41b7:econLongSoak.testSupport.ts` | `1495b707d2a28c74253e9d9c4511e82d70c51fdd` | `e8b387316ea1b7348c44610ce9ecc88166ad73b6e8579d65a952bc853c9de452` |
| season-15 adapter base | `71c73f9:econLongSavePerf.integration.test.ts` | `7871db3e7c208d6dbbfc2f0eaa4b578c7d45cd66` | `1fcc7ccee2a4f737a4a903cb24a3693566b6152a5cbcd655fb9dd3c5de78fb15` |
| late adapter base | `0ff41b7:econLateHorizonPerf.integration.test.ts` | `7891710c37bb7d7145a01849041db4c59fd12183` | `43951ecfef63b77a9c23a246732855a86dd4772542956438f9047d5c26f9a08e` |
| CPU helper | `0ff41b7:econMilestonePathCpuProfile.ts` | `f641792e0a925ea820fe57607834813625d934da` | `31e8c21cecb163282e101f2d212cfac72953034e33cea9f1d4b54254d9ac0326` |
| CPU test base | `0ff41b7:econMilestonePathCpuProfile.test.ts` | `a17c250c202233071c9e8a451d7c9402c752e3ca` | `fa55622512058311b9a0d73e7033dcd01104d49b7c50b9a84789655ff4fa0350` |

The `0ff41b7` late-adapter base is intentionally preferred to later proof-WIP
blob `345b201f`: that later blob unconditionally reads an absent historical
`/tmp` artifact during its ordinary contract test. Its retained-path correction
cannot be reused as active current-main proof.

The canonical support baseline, capture reference, and late-range reference
must be composed, not chosen as alternatives. The season-15 adapter must drop
its obsolete profile mode and historical producer claims. The late adapter
must bind the actual Goal-31 source freeze, composition tree, and both
adjacent-test hashes. The CPU test must add a fail-closed real-profile
reader/writer, and the same bounded test scope must add one final admission
lane for ordinal C1–C3 pairing, three V8 samples, exact semantics, timing
sidecars, the frozen 60%/40% and V8 bands, and the `2,040,000ms` forecast cap.

Non-causal and prohibited: package files, lockfile, config, balance test,
profiler, actions, snapshot, trade-finance, sim-core, preparation files, and
every retired Gate-M/R37–R40 path. Current main already has the exact profiler
blob required by the late-range support.

Defect class: architecture-contract defect in disposable proof composition.
Production candidate affected: no. Commands executed: read-only Git/hash/search
inspection only; zero test, capture, simulation, profile, forecast, diagnostic,
or final-gate commands.

## 2026-07-27 authorized current-main preflight

- Fresh worktree:
  `/Users/kevin/.codex/worktrees/goal31-direct/MBD-main-main`.
- Branch:
  `codex/econ-milestone-path-perf-1-direct-proof`.
- Base, local `main`, and `origin/main`:
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`.
- Docs-first reconciled HEAD before this update:
  `278618333d09f513c5295b9d3f8b694fca9df9c7`.
- Current production files remain the current-main baselines; the adjacent
  Goal-31 tests are absent. No production transfer or performance command has
  run in this fresh worktree.
- The historical season-15 and season-29 raw artifacts are absent from
  `/tmp`, `/private/tmp`, and the repository. No historical summary or
  `.swarm` descriptor may substitute for their bytes.
- Kevin's approved direct-proof oracle intended one truthful canonical
  recapture after the exact four-file source freeze. Fresh artifacts would have
  to bind their actual producer revision/tree and cannot reuse the historical
  raw hashes as if they were current files.
- R41 and every custom recovery-lineage mechanism remain permanently
  prohibited.

### Pre-execution source contradiction

- Current-main `apps/web/src/workers/sim.worker.helpers.ts` is Git blob
  `a4fff318` and SHA-256
  `49677b8d4b2b6fa3d3bdf29729d4827cb3b7f6f0c6462d8523a8cd3e0b18c13e`.
  It defines only one-argument `advanceOffseasonOnce` and
  `skipOffseasonPhaseWithAI`; it contains no `OffseasonAutomationMode` or
  `autonomous_league`.
- Goal-18 commit `9425d6948f89ccc567a0be83f4383fa542b7aa93`
  changes that production file to blob `9d304b3a` / SHA-256
  `07115d9313f7747bc8d5fd7dfd09f99d3763b433284890cb094a31dbb20d750f`
  and adds `sim.worker.autonomousOffseason.test.ts` blob `44a94b7e` /
  SHA-256
  `809da804fbb6e2dcfb245259370ff2eb93ba7a2a7ffdf9cee03c9490c505a4cb`.
  The commit changes the production helper by 269 lines and is not a test-only
  fixture.
- The canonical Goal-18 `econLongSoak.testSupport.ts` calls
  `skipOffseasonPhaseWithAI(state, 'autonomous_league')`. Goal 28 requires this
  mode to run all 32 organizations through the same existing offseason
  mechanisms while leaving ordinary interactive behavior unchanged.
- Current main is exactly the parent production blob of `9425d694` at this
  seam. Consequently the exact Goal-18 run cannot compile or execute from
  current main without the third production module.
- Replacing autonomous mode with the interactive one-argument call would
  exclude or pause for the selected user organization and would change
  gameplay outcomes, RNG consumption, state, and receipts. A repository-owned
  direct test cannot truthfully paper over that difference.
- Goal 31 explicitly owns only `sim.worker.milestones.ts`,
  `sim.worker.ceremony.ts`, and their adjacent tests; its stop condition names
  the need for a third production module. Kevin's latest authorization repeats
  “using only” those semantics-neutral milestone/ceremony changes.
- Defect class: architecture-contract defect / missing production
  prerequisite. Production candidate affected: no. Execution: zero candidate,
  capture, profile, forecast, diagnostic, or final-gate commands.

## 2026-07-22 live recovery preflight

- Live campaign main is clean at
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`; local `main` and
  `origin/main` resolve to that revision.
- Roadmap items 1–17 and 80 are complete. Item 18 remains the first incomplete
  legal item. Goal 11 and roadmap item 11 are already complete; Item 19 has not
  begun.
- Goal-31 WIP remains at
  `f6f73c7820d0d0e3fb00be9d9a7f6fe77b21c059`, tree
  `cf6f21258aae42522adf23887718643e5a6d2764`, with a clean index and the four
  protected production candidate files plus this run's living plan/docs only.
- Current protected production/test SHA-256 values remain exact: milestones
  `bef65c1e23a3fc8096ae8745528cd577e00f93cbc1f4b3909c95d8c86b09bbd6`,
  ceremony `ee6fe50bdc5bb83107b01822840684d71197abc4bed79e7e6ae8f01eb82f0102`,
  milestones test
  `6834b7b5915ddb135ed1d28467794922e37980b7ca7a9214263390053ec62123`,
  and ceremony test
  `00bfabd45662a837e7c01d4c3c2581287b39ab2f91719b1f4d25e85fbab66811`.
- A fresh current-revision focused run passed both adjacent files, 6/6, with
  retries disabled on 2026-07-22.
- The v1 Gate-M checkout is separate quarantined evidence at
  `/Users/kevin/Downloads/MBD-item18-exact45-preparation-v10-20260718-proof`,
  `codex/item18-exact45-preparation-v10@122ddd09e99886ffa5a8513cd524f2537eafcaf6`,
  tree `e2fe2a725257f9ddaba2abba254179c8f27d43c6`. Its index is clean, it has no
  untracked paths, and exactly runtime/test/config are dirty.
- Their current hashes are runtime
  `3456e020ba9e0894e863217b28f4b325fcbe3fae803a69133490f3aeaaf2f2d2`,
  test `a50ffcd2dfac301fe4109cda2d82f9bdb44943fcd00893d88ba57cc83b0df2f7`,
  config `98f343c0a0627be9860946af75a616088f84164fadbc79901ecd180eb5d9b46d`,
  and unchanged process policy
  `83f651534c33c7ec1fa3704e019e363bb8e56796ad794f68f7d0505db8277049`.
- V1 attempt 8 ran once and failed before compiler execution with
  `ITEM18_PROCESS_UNEXPECTED_RELEVANT`. The exact immutable failure is archived
  by `ATTEMPT8_QUARANTINE.json`; it has zero retry, VM, simulation, profile,
  exact-45, or canonical success output.
- The v1 wrapper threw before returning its captured process inventory. The
  historical offending PID/command is therefore unknowable. Existing host
  evidence makes a retained Vitest/Vite esbuild child the leading hypothesis,
  not a fact about attempt 8.
- A non-authorizing current `/bin/ps` snapshot at
  `/tmp/mbd-item18-process-topology-now.txt` contained zero relevant rows; SHA-256
  `76fd9381a47ef57019322f14a79ba51427526905439d73f43072af5d48f41532`,
  121,754 bytes. It describes only that later instant and is not attempt-8
  evidence.
- Goal 31, rather than Goal 32, owns the proof-recovery lineage. V2 completed
  three bounded source loops and passed its focused 20/20/typecheck/diff gates,
  but final review found four P1 and two P2 findings, including an infeasible
  execution-authority hash cycle. V2 is preserved by
  `GATE_M_V2_QUARANTINE.json`; no v2 dynamic execution, source freeze,
  authority, anchor, or canonical terminal artifact was created.
- `SOL_GATE_M_V3_ARCHITECTURE.md` freezes the fresh v3/attempt-1 route. It is a
  new bounded strategy under the same production scope, not a fourth v2 patch.
  The evidence DAG is acyclic and the same private terminal settlement must
  cover PRE rejection, compiler-only failure, POST rejection, compound failure,
  and verified success.
- The first clean v3 probe established a second authoritative launch context:
  the outer Vitest config process starts an inner Tinypool worker whose argv is
  the Tinypool worker entry and whose execArgv is
  `["--conditions","node","--conditions","development"]`. The original R
  launch tuple is superseded by
  `SOL_GATE_M_V3_ARCHITECTURE_AMENDMENT_1.md`. R2 must bind config-injected
  outer capture, live inner capture, and exact dependency identities. No
  dynamic attempt was armed by this probe.
- The R2 foundation subsequently passed 25/25 focused tests, two identical
  reserved-pair probes with provisional payload SHA-256
  `2abf30cc1fe34ac404a58bbab2836ea897b7a11ae9ef935362f003f1fa0a98b0`,
  web typecheck, and an A→V→H pre-ps seam. That digest is not an authoritative
  Q receipt because its payload/log was transient; final Q1/Q2 must be freshly
  retained after the last source edit.
- R/R2 did not define exact constructible JSON contracts for the full evidence
  and terminal chain. `SOL_GATE_M_V3_SCHEMA_AMENDMENT_2.md` and immutable R3
  now freeze the exact ordered schemas, result tokens, recursive descriptor
  order, terminal totality, success publication, external T, and mutation
  matrix. This is an architecture amendment, not a source correction loop.

## Preflight

- Worktree: `/Users/kevin/.codex/worktrees/5616/MBD-main-main`.
- Branch: `codex/econ-milestone-path-perf-1` from clean
  `main@ace5068f0f49a1195c2937461fe8ad7f04d8d3d8`; `origin/main` resolves to
  the same revision.
- Initial status was clean and detached at that revision. The protected main
  worktree and Goal-30 failed worktree are not this worktree and are untouched.
- Package manager: `pnpm@9.15.4`. Root scripts are recorded in `PLAN.md`.
- `CURRENT_GAME_SNAPSHOT_VERSION` is 35 in
  `packages/contracts/src/schemas/save.ts`; `saveSystem.ts` defines Dexie
  version 6. Neither is in scope.
- Sealed clean-main SHA-256 values match the Sol route: milestones
  `ac7a6fe97118096f81fb650e2ba50d15235a25a7524bc4807d498e6784f7e31b`,
  ceremony `b09aeb2f6566a20d1b4abba11d798fb5936a6dd93a4392d9bcaa49e746a44125`,
  and `newsFeed.ts` `a6f66ec5027a68ac624d9bdea9bdb5d4aaa4a800ff8a8b7af224270eeab4144c`.

## Live seams

- `buildCareerMilestoneEvents` builds the cumulative map, passes the complete
  player array to `checkMilestones`, then performs a second `state.players.find`
  per returned moment.
- `queueCareerMilestoneMoments` repeats that complete-array canonical call and
  a `state.players.find` per returned moment before user-team queueing.
- `checkMilestones` remains the canonical sim-core authority. It is forbidden
  to edit it or to duplicate its policy. Its player array is used only for
  resolved display names, so an empty-player eligibility probe is valid.
- Neither adjacent test file exists on clean main. This goal creates the two
  allowed tests rather than widening a shared integration test seam.

## Retained evidence identity

The Sol route authenticates season-15 raw SHA-256
`260594ec24b4f0846835343f7c96bc835a6b2e68909dcc531759cbd44a63516f` and
season-29 raw SHA-256
`a29f2e5df30284cdb5358ac3aa758b6d6c3bf9615e789214de1183ec67079360`.
Goal-30 comparison/forecast/provenance hashes are respectively
`d735b36a05688ebb1539ee03d93f356bbb373eadc5bbc1570450065134949d86`,
`0789ba18dae53654df95913f4672bcfb8af39f6649bf6bb27f8895707473c617`, and
`c3607cde180590608e89b843f338c77102f7e8edb476c5e6c68e50c73d5b6588`.

## Corrections and stop conditions

- Goal 28 has no standalone file under `docs/codex/goals`; Goal 29 defines it
  as the dependent item-18 soak. This is recorded rather than fabricated.
- The historical Goal-30 source/test files are absent here and must not be
  copied from its dirty worktree.
- Stop on provenance/source mismatch, semantic/RNG/save/history drift, need for
  a third production module, failed negative control, bundle growth, any band
  miss, forecast miss, or a third correction loop.

## 2026-07-27 live stop-loss truth

- Goal-31 worktree:
  `/Users/kevin/.codex/worktrees/5616/MBD-main-main`.
- Branch/HEAD:
  `codex/econ-milestone-path-perf-1@9ba8b35a2e908a484cb5fa21781f91d415777a3a`.
- Current campaign main and origin/main:
  `a9343763b35818fd1111ffec3bc3440a8294e6aa`.
- Merge-base:
  `ace5068f0f49a1195c2937461fe8ad7f04d8d3d8`.
- Index: empty.
- Non-document candidate state: exactly the two modified production consumers
  and two untracked adjacent tests named below. Goal-31 authority/reconciliation
  docs are isolated in the fresh current-main worktree and do not alter this
  preserved WIP.

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `apps/web/src/workers/sim.worker.milestones.ts` | 3,550 | `bef65c1e23a3fc8096ae8745528cd577e00f93cbc1f4b3909c95d8c86b09bbd6` |
| `apps/web/src/workers/sim.worker.ceremony.ts` | 15,748 | `ee6fe50bdc5bb83107b01822840684d71197abc4bed79e7e6ae8f01eb82f0102` |
| `apps/web/src/workers/sim.worker.milestones.test.ts` | 5,002 | `6834b7b5915ddb135ed1d28467794922e37980b7ca7a9214263390053ec62123` |
| `apps/web/src/workers/sim.worker.ceremony.test.ts` | 3,331 | `00bfabd45662a837e7c01d4c3c2581287b39ab2f91719b1f4d25e85fbab66811` |

Current main has no changes to these four paths relative to the branch
merge-base, so no source conflict is presently known. A fresh reconciliation
is still mandatory before source freeze.

The separate checkpoint
`/Users/kevin/Downloads/MBD-item18-gate-m-v3-20260722@0ff41b71fd9c5f437f7d01284dc7afa6738e5fef`
proved the verification stop-loss with repository-owned tests. It is not a
Goal-31 source-freeze or landing commit and is not an ancestor of this branch.
Its retired R40 artifacts bind obsolete source hashes and contradictory SG/F
identities and therefore cannot execute against current source.

Current focused command:

`./node_modules/.bin/vitest run src/workers/sim.worker.milestones.test.ts src/workers/sim.worker.ceremony.test.ts --retry=0`

Result: 2 files passed, 6 tests passed, zero retries. No long simulation,
performance matrix, forecast, Gate M, publication, push, deployment, or Item
19 action occurred.

## 2026-07-30 terminal direct-proof truth

- Landable source freeze:
  `4e016cc4fe3043e438cc0cbc3aeec798b6f47d6b`, tree
  `1aae8f12e0101c120a5098326a10e3f33df8996a`.
- Disposable composition:
  `2f3329b0886396cd9d8550aa42ea2738d02c4126`, tree
  `51771ce9dfe6a2bfceae0122e2368cee8a8fb969`, generated identity
  `dfd54a111f351610316458cd449ee76b946a3cac5661fc0f67672759e028d6b8`.
- Pre-artifact independent Sol review: `MERGE_READY`, actionable P0/P1/P2
  `0/0/0`; composition clean and limited to the authorized 12 paths.
- Focused composition matrix: 9 files, 88 passed, 4 execution-only skips,
  zero retries. Affected web typecheck passed.
- Fresh season-15 and season-29 captures were independently hostile-validated
  and bound to raw/envelope digests. Every warm-up/C1–C3/V8 receipt preserved
  semantic digest
  `f76ac9d30b5edaecc80f4213d5799431a3025cada9398afeb1a749e832dba98b`,
  row-30 `250e5c643f9b55f6bb42d9069221a679c87fd5bf37103933883a9bc59e3332b8`,
  state `dd0607067818556d34aa134afc48044faa69d13911253a3bd6413af5aadbb2aa`,
  RNG `966cfa51d4fc2fecfc624e488f33603cc3deb62d7e477cf376e6e4888fdc9b24`,
  and call signature
  `fd3337c5e794cba4c33cbbafdb20a37c500a956352888ee5cf9b80bcd489d0ee`.
- Standard candidate median combined time was `16,518.497088ms` versus
  `88,044.107087ms` baseline; median total was `55,373.3385ms` versus
  `127,136.269375ms`. All pairs improved and ranges did not overlap.
- V8 milestone/ceremony combined roots were `346,582us`, `351,748us`, and
  `333,791us` versus `73,501,040us` baseline; every required V8 root and
  frozen 10x median band passed.
- Forecast-primary and continuation each stayed below the unchanged
  `2,400,000ms` process ceiling and converged exactly on final season-30
  facts. Their timing sidecars were `1,739.71s` and `1,209.16s`.
- One-shot final admission applied the required `+10ms` external adjustment
  to each process and rejected the `2,948,890ms` total against the immutable
  `2,040,000ms` cap. Excess: `908,890ms` (`44.553%`).
- No admission receipt was written. No command was retried. Root full gates,
  final merge review, completion, landing, Goal-18 integration, seed-7111
  diagnostic, Item 19, push, deployment, tag, publication, and release did
  not run.
- External evidence root:
  `/tmp/mbd-goal31-direct-proof-2f3329b-20260730`; admission-manifest SHA-256
  `971deb816dd979e9e24d28b0fa7a1e19f578d5ccb5e6015deaf760c7800454fa`.
