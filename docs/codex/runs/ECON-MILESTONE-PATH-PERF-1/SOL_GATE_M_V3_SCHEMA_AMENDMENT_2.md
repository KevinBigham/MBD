# Sol Gate-M v3 Architecture Amendment 2 — Exact Evidence Schemas

> **RETIRED HISTORICAL EVIDENCE.** Superseded by the 2026-07-27 verification
> stop-loss. Do not implement, patch, authorize, or execute this amendment.

Historical status: `ARCHITECTURE_SCHEMA_READY`.

## Source finding

The four-file v3 foundation now proves dual-launch capture, dependency identity,
reserved-pair probe inertness, and descriptor-safe non-reserved A→V→H opening
before process observation. It cannot yet replace the inherited v2 terminal lane
because R/R2 froze evidence order and invariants without exact JSON contracts.
Inventing those contracts inside implementation would be unauditable.

R3 supersedes only that underspecification. It consumes no implementation
correction loop and does not change production scope, Goal 31, performance
bands, Goal 32, or Item 19.

## Canonical contract

Every authoritative v3 JSON is exactly UTF-8 `JSON.stringify(value) + "\n"`,
with exact ordered keys, one LF, no BOM/whitespace, and byte-for-byte canonical
reserialization. Proof descriptors always order
`path, sha256, bytes, mode, schema`; source records omit only schema; absence
records order `path, kind, lstatCode`.

All reads use lstat, exact realpath, `O_RDONLY|O_NOFOLLOW`, matching
lstat/fstat identity during the read, link count one, bounded complete reads,
and exact mode/bytes/hash/schema/canonical JSON. All writes use exclusive
no-follow creation, complete writes, fsync, chmod 0444, second fsync, close, and
descriptor-safe reopen. No artifact contains its own hash or a later hash.

## Exact evidence graph

`R -> R2 -> R3 -> Q1/Q2 -> P -> PV -> PH -> F -> M/S -> A -> V -> H -> RUN -> T`

R3 freezes exact ordered schemas/result tokens for Q1/Q2, the shared v1/v2
historical object, P/PV/PH, F, zero-P0–P2 M/S reports, A/V/H, runtime
prerequisite evidence, terminal failure, raw graph, success receipt,
verification, and external terminal T. It also freezes every path, budget,
recursive descriptor order, creator/verifier order, and negative mutation.

The machine-readable authoritative ledger is:

`.swarm/runs/mbd-item18-gate-m-v3-20260722/sol.item18-gate-m-v3-attempt-1.recovery-architecture.r3.json`

Schema:
`mbd-item18-gate-m-v3-attempt-1-recovery-architecture-r3-v1`.

## Terminal totality

The single active v3 lane must replace inherited v2 prerequisite,
materialization, publication, receipt, replay, and verification schemas.

- PRE rejection: one rejected observation, zero compiler/VM/publication.
- Compiler-only: clean PRE and POST, one failed compiler, zero VM/publication.
- POST rejection: clean PRE, one successful compiler, rejected POST, zero
  VM/publication.
- Compound: clean PRE, one failed compiler, rejected POST, zero VM/publication.

For all failures the typed terminal candidate is retained, the one-shot reaches
`consumed-failure`, and only then the single settlement function writes and
reopens one exact sealed failure. A second settlement/materialization fails.
Unexpected authority/VM/publication failures are not relabeled; external T
rejects their incomplete attempt.

Success publication is exactly evaluated → canonical map → raw graph → receipt
→ verification. Failure must be absent before each creation. Any partial success
set permanently invalidates the attempt and cannot be converted to failure.
External T accepts exactly one complete failure branch or one complete success
branch and rejects both, neither, partial, mixed, stale, or wrong-exit states.

## Probe and source order

The recovered provisional identical-probe digest
`2abf30cc1fe34ac404a58bbab2836ea897b7a11ae9ef935362f003f1fa0a98b0`
is historical foundation evidence only. After Terra's final source edit, freeze
source operationally, write immutable creator/verifier programs, then regenerate
two fresh retained probe logs and canonical Q1/Q2 receipts. Q1/Q2 must bind the
same final four SourceRecords and contain byte-identical decoded probe payloads.

Only then create P, independently verify PV, create PH, create F, conduct M/S,
serialize admitted reviews, create A, independently create V, create H last,
confirm terminal absence, run one authentic command, and independently write T.

## Continuation gate

Terra may continue the current foundation only after immutable R3 exists. It
must replace every active v2 authentic-execution path with R3's exact v3
contracts, exercise all schema/descriptor/terminal/graph/replay/T mutations on
temporary paths, and return focused probes, typecheck, diff check, exact
four-file status, and terminal absence. No dynamic Gate M or evidence authority
is authorized during implementation.
