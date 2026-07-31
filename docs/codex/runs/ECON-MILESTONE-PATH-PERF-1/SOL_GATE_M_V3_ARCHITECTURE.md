# Sol Gate-M v3 Recovery Architecture

> **RETIRED HISTORICAL EVIDENCE.** Superseded by the 2026-07-27 verification
> stop-loss. Do not implement, patch, authorize, or execute this architecture.

Historical status: `ARCHITECTURE_READY — fresh Goal-31 proof lineage; no Goal 32`.

## Decision

The failed v2 candidate is quarantined by `GATE_M_V2_QUARANTINE.json`. It ran
no dynamic Gate-M command and created no source-freeze, authority, anchor,
success, or failure artifact. Its review proved that another v2 correction
would stack patches on an infeasible authority graph. Goal 31 therefore owns a
fresh v3/attempt-1 proof lineage. Production optimization, sim-core, save/schema
contracts, performance bands, and Item 19 remain unchanged.

## Source and namespace boundary

- Worktree: `/Users/kevin/Downloads/MBD-item18-gate-m-v3-20260722`
- Branch: `codex/econ-milestone-path-perf-1-gate-m-v3`
- Run namespace: `.swarm/runs/mbd-item18-gate-m-v3-20260722/`
- Attempt: exactly `1`; retries: exactly `0`
- Failure directory: `/tmp/mbd-item18-gate-m-v3-98c4de4/`, mode `0700`
- Terra may edit only process policy, runtime, test, and special Vitest config.

Goal 32 is required only if a fifth production/source module, a new production
algorithm, a changed performance contract, or wider Item-18 scope becomes
unavoidable. No current evidence requires any of those changes.

## Acyclic evidence graph

The only legal dependency direction is:

`v1 attempt8 + v2 quarantine + R -> P -> F -> M/S -> A -> V -> H -> RUN -> T`

- `R`: v3 recovery architecture.
- `P`: fresh preparation authority, independently verified and anchored.
- `F`: source freeze.
- `M` and `S`: independent zero-P0–P2 reviews of `F` and its exact bytes.
- `A`: execution authority binding `F`, `M`, `S`, preparation, budgets, and a
  normalized launch template. It contains no `A`, `V`, or `H` hash.
- `V`: independent reopening of `A` and all recursive dependencies.
- `H`: last-created anchor binding exact proofs of `A` and `V`.
- `RUN`: the only v3 dynamic attempt.
- `T`: independent terminal reopen accepting either one complete success set or
  one sealed failure, never a partial set.

No artifact may contain its own hash or any later artifact's hash. The actual
`A` and `H` hashes exist only in the launch environment and in post-launch
terminal evidence. Runtime opens each file by the supplied hash, proves `H`
binds reopened `A` and `V`, substitutes two sentinels into the live launch
tuple, and then compares that normalized tuple with `A`.

## Process policy

Schema: `mbd-item18-process-observation-v3`.

One pure nonthrowing decision parses one captured byte stream once and invokes
one ordered seven-reason matcher once for each parsed row. It preserves the
command-root partial PPID chain and its `ROOT`, `MISSING_PARENT`, or `CYCLE`
terminal. Malformed roots produce an empty authority cone and admit nobody.
Every relevant row retains PID, PPID, command, tokens, ordered matcher reasons,
PPID path, terminal, and relationship. Siblings, cousins, sibling descendants,
disconnected same-checkout commands, missing ancestry, and cycles fail closed.

The sole live wrapper performs one shell-disabled
`/bin/ps -axo pid=,ppid=,command=` capture and returns its exact bytes plus the
decision before any clean-result assertion.

## Launch authentication

Before source freeze, a contract-probe mode that cannot arm Gate M records the
exact Vitest runtime environment under `/usr/bin/env -i`. Probe and Gate-M modes
are mutually exclusive.

`A.command.normalizedLaunch` binds cwd, `/usr/local/bin/node`, argv, empty
execArgv, and the complete sorted environment. Only the execution-authority and
anchor environment values use literal `__A_SHA256__` and `__H_SHA256__`
sentinels. Runtime rejects missing, extra, changed, or reordered canonical
launch fields before process observation or materialization.

## Historical evidence

One descriptor-safe reader authenticates Goal-31 `ATTEMPT8_QUARANTINE.json`,
the immutable `/tmp/.../failure-8.json`, and v2 quarantine. It requires no
symlink, exact real path, `O_RDONLY|O_NOFOLLOW`, matching `lstat`/`fstat`
identity, exact mode/link count/size/hash/bytes, and exact failure bytes matching
the quarantine's embedded bytes. It also records ordered v1 and v2 canonical
success absence. The same exact object is recursively included in preparation,
source freeze, both reviews, authority, verification, prerequisite evidence,
and the terminal success or failure receipt.

## Terminal state machine

One private non-resettable ledger permits:

`EMPTY -> AUTHENTICATED -> MATERIALIZING -> {PRE_REJECT, COMPILER_ONLY, POST_REJECT, COMPILER_AND_POST_REJECT, MATERIALIZED -> VERIFIED_SUCCESS}`

The materializer performs PRE observation, one compiler invocation when PRE is
clean, POST observation even after compiler error, exact classification, and VM
evaluation only when compiler and POST both succeed. The one-shot reaches
`consumed-failure` before the single terminal settlement function seals any
failure. A second settlement or materialization call fails as consumed.

| Failure | Observations | Compiler | VM/graph/publication |
| --- | ---: | ---: | ---: |
| PRE reject | one rejected PRE | 0 | 0 |
| Compiler-only | clean PRE and POST | 1 failed | 0 |
| POST reject | clean PRE, rejected POST | 1 succeeded | 0 |
| Compound | clean PRE, rejected POST | 1 failed | 0 |

## Terminal artifacts

Failure:
`/tmp/mbd-item18-gate-m-v3-98c4de4/failure-1.json`, schema
`mbd-item18-gate-m-v3-attempt-1-terminal-failure-v1`.

It exact-binds classification/stage, all authority proofs, normalized and
actual launch, process-policy proof, ordered observations, legal compiler error,
settled counters, ordered success absence, and consumed/no-retry state. Every
counter is exact and stage-relative.

Success artifacts are five `item18-adapter-materialization-v3.attempt-1.*`
files under the v3 run namespace. Every terminal write is exclusive,
no-follow, fully written, fsynced, chmod `0444`, closed, and descriptor-safely
reopened for identity/hash/size verification. Failure checks all success paths
absent. Every success publication checks failure absent. Final success reopens
all five files and rechecks failure absence.

After process exit, an independent verifier writes exactly one
`item18-adapter-materialization-v3.attempt-1.terminal-verification.json` and
accepts only the complete success set or the complete sealed failure.

## Pre-execution proof and stop rules

Focused proof must cover the exact seven-reason matcher, authority topology,
partial malformed-root chain, inventory/replay mutations, all terminal states,
permanent one-shot consumption, exact failure schemas/counters, launch mutation
for every field, explicit rejection of self/mutual hash cycles, AST proof of one
parser/matcher/evaluator/live observer, deliberate sibling-negative red then
restored, the clean-environment probe, typecheck, diff check, four-file status,
and clean index.

After Terra source freeze, immutable coordinator creator and independent
verifier programs are themselves hashed by `F` and reviewed by `M`/`S`. Create
`P`, preparation verification and anchor, `F`, `M`, `S`, `A`, `V`, then `H`
last. Run one clean-environment command and one terminal reopen.

Stop before execution on any fifth source file, production change, source drift,
nonzero P0–P2, incomplete historical descriptor, backward dependency edge,
launch instability, non-last anchor, or preexisting terminal path. Any dynamic
red result or partial set permanently ends v3 attempt 1 with zero retry.
