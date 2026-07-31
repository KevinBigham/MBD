# Sol Recovery Architecture — Goal 31 Gate M v2

> **RETIRED HISTORICAL EVIDENCE.** Superseded by the 2026-07-27 verification
> stop-loss. Do not implement, patch, authorize, or execute this architecture.

Date: 2026-07-22

Historical verdict: `V2_BOUNDED_RECOVERY_READY_FOR_STATIC_IMPLEMENTATION`

## Authority and route

Kevin's explicit direction to use one bounded fix and bring Item 18 home
authorizes one new Goal-31 proof-recovery lineage. This is not a retry or
relabel of consumed v1 attempt 8, not a fourth correction loop, and not Goal 32.
Goal 32 becomes necessary only if evidence requires another production module,
a different milestone algorithm, a changed performance contract, or wider
Item-18 architecture.

The player story, two production consumers, production WIP bytes, performance
bands, `2,040,000ms` forecast cap, Item-18 `2,400,000ms` ceiling, save v35,
Dexie v6, deterministic semantics, and Item-19 prohibition remain unchanged.

## Immutable predecessor and quarantine

The v1 proof checkout is immutable quarantined evidence:

- checkout `/Users/kevin/Downloads/MBD-item18-exact45-preparation-v10-20260718-proof`;
- branch `codex/item18-exact45-preparation-v10`;
- HEAD `122ddd09e99886ffa5a8513cd524f2537eafcaf6`;
- tree `e2fe2a725257f9ddaba2abba254179c8f27d43c6`;
- exactly three tracked dirty paths and a clean index:
  `item18.preparation.runtime.ts`, `item18.preparation.test.ts`, and
  `vitest.item18-preparation.config.ts`;
- current SHA-256 values respectively `3456e020ba9e0894e863217b28f4b325fcbe3fae803a69133490f3aeaaf2f2d2`,
  `a50ffcd2dfac301fe4109cda2d82f9bdb44943fcd00893d88ba57cc83b0df2f7`,
  and `98f343c0a0627be9860946af75a616088f84164fadbc79901ecd180eb5d9b46d`;
- unchanged process-policy SHA-256
  `83f651534c33c7ec1fa3704e019e363bb8e56796ad794f68f7d0505db8277049`.

Attempt 8 is consumed by `ATTEMPT8_QUARANTINE.json` and the exact source file
`/tmp/mbd-item18-adapter-materialization-v1-122ddd0/failure-8.json`, SHA-256
`d0275e83fce113d99c1aa0c5ad8a5fbb4234e4421641a9f3477218610dde03b3`,
4,316 bytes, mode `0444`, link count one. It failed at PRE process isolation
after one materializer call, before compiler, VM, graph-positive, receipt,
simulation, Inspector, native profile, or exact-45 work. It recorded no retry
and created no canonical success artifact. Its missing process inventory is an
irrecoverable fact; no later observation may be represented as its cause.

All v1 attempts 1–8, attempt-7 archive/reviews, loop-1/2/3 architecture,
source-freeze, static reviews, authority, verifier, anchor, and failure-8 remain
historical descriptors only. None grants current admission after source bytes
change.

## New lineage and owned files

Create a new disposable proof worktree and branch from the exact v1 candidate
snapshot, named `codex/econ-milestone-path-perf-1-gate-m-v2`. Preserve the v1
checkout byte-for-byte. The new external namespace is
`mbd-item18-gate-m-v2/attempt-1`; it must not reuse a v1 path, an attempt-8
authority, or an attempt-8 anchor.

The sole disposable writer may change only:

- `apps/web/src/workers/item18.preparation.process-policy.ts`;
- `apps/web/src/workers/item18.preparation.runtime.ts`;
- `apps/web/src/workers/item18.preparation.test.ts`;
- `apps/web/vitest.item18-preparation.config.ts` when exact v2 bindings require it;
- v2 proof creators and immutable external evidence under the new run namespace.

No Goal-31 production WIP file, sim-core source, save/schema/API/UI/dependency,
Goal-18 harness contract, band, timeout, seed, or Item-19 file may change.

## Process-authority cone

The v1 rule accepted only relevant ancestors. That rule rejects a legitimate
Vite/esbuild service retained as a child of the one authorized Vitest command.
The actual isolation requirement is that no independent relevant command can
coexist with Gate M. V2 therefore uses an exact authority cone, not a pathname
or executable allowlist.

1. Authenticate the v2 execution authority and last-created anchor before any
   live process observation.
2. Bind the exact Node executable, argv, cwd, environment, source hashes,
   authority hash, anchor hash, and one-shot command. After this authentication,
   the current Node PID is the command-root PID.
3. Capture one `/bin/ps -axo pid=,ppid=,command=` byte stream with shell disabled.
4. Parse that byte stream once through a pure non-throwing decision function.
   A throwing compatibility wrapper may remain for synthetic callers, but the
   live Gate-M wrapper must consume the decision object before any rejection.
   One ordered matcher kernel retains the existing
   seven relevance operands and emits all matching reason IDs for every row.
5. Derive, from the same parsed rows, the current PID's ancestor chain and every
   row whose transitive PPID chain reaches the command-root PID.
6. Relevant rows are admitted only when their relationship is `SELF`,
   `AUTHORIZED_ANCESTOR`, or `AUTHORIZED_DESCENDANT`.
7. A relevant sibling, cousin, unrelated process, another same-checkout command,
   broken/missing ancestry, or ancestry cycle is rejected. The relationship is
   recorded as `INDEPENDENT`, `MISSING_PARENT`, or `CYCLE` as applicable.
8. No executable, PID, command substring, esbuild instance, or same-checkout
   process receives a special exception. A Vite/esbuild child passes only
   because its PPID chain reaches the authenticated command root. An identical
   sibling command fails.

This preserves the old acceptance of the authenticated launcher chain, admits
only children owned by the authorized command, and continues to reject every
independent relevant workload that could race or contaminate evidence.

## Lossless observation and failure state machine

The live wrapper must return the exact captured bytes and a discriminated
decision; relevance rejection may not throw before that record exists. The
record includes:

- schema, lineage `v2`, attempt `1`, and `PRE` or `POST` position;
- process-policy source SHA-256 and exact error code;
- base64 inventory bytes, SHA-256, byte length, and row count;
- current PID, command-root PID, ordered ancestor PIDs, relevant PIDs, admitted
  PIDs, and rejected PIDs;
- every relevant row's PID, PPID, full command, executable token, argument
  tokens, all matcher reason IDs, PPID path, and derived relationship;
- result `CLEAN_OBSERVATION` or `REJECTED_OBSERVATION`;
- claim `AUTHORITY_CONE_FIXED_POINT_OBSERVATION_ONLY`.

The runtime records this object before asserting `CLEAN_OBSERVATION`.

- PRE rejection consumes the one-shot at attempts/calls `1/1`, with compiler,
  VM, graph-positive, and publication counts zero.
- A clean PRE followed by POST rejection records exactly one compiler run and
  zero VM, graph-positive, or publication work, then consumes the one-shot.
- If the compiler and POST observation both fail, one deterministic compound
  failure preserves both errors; POST may not mask the compiler failure.
- A second materialization call after any failure is rejected as consumed.
- Success still requires exactly two clean observations in `PRE`, `POST` order,
  one materialization, one compiler, one VM evaluation, one positive graph
  probe, one receipt, one verifier, zero retry, and zero simulation/profile/
  exact-45 work at Gate M.

On failure, the same process publishes
`/tmp/mbd-item18-adapter-materialization-v2-122ddd0/failure-1.process-isolation.json`
as the canonical v2 failure artifact from
the already captured observation—never from a second `ps` snapshot—using
`O_CREAT|O_EXCL|O_NOFOLLOW`, complete descriptor writes, `fsync`, chmod `0444`,
close, hard reopen, descriptor identity, and SHA-256 verification. Duplicate
publication fails. Success and failure paths are mutually exclusive.

## Hostile test matrix

Focused tests must prove:

1. parser encoding, row, PID, missing-parent, and cycle failures;
2. all seven relevance operands and ordered multi-reason matching;
3. self, relevant authorized ancestor, and relevant authorized descendant pass;
4. an identical sibling, cousin, unrelated same-checkout process, and relevant
   descendant of a sibling fail;
5. near-miss commands remain irrelevant;
6. one-byte inventory tamper, missing/extra/reordered fields, changed position,
   PID, PPID path, relationship, reason, policy hash, or result fail replay;
7. PRE rejection counters and permanent one-shot consumption;
8. POST rejection after exactly one compiler and before VM/publication;
9. compiler plus POST compound failure preserves both facts deterministically;
10. failure publication exclusivity, mode, reopen, hash, and success-path absence;
11. success regression produces exactly two clean observations and the existing
    one-shot/graph/receipt/verifier counts;
12. static anti-bypass proves one live `/bin/ps`, one parser, one relevance
    matcher/evaluator, no injected live observer, no reset, no allowlist, and no
    swallowed rejected decision.

The deliberate negative control changes one sibling relationship to an
authorized descendant in the pure matrix; the sibling-rejection assertion must
fail, then the exact correct bytes must be restored.

## Sequential evidence gate

No dynamic Gate-M command is authorized until all steps below are complete:

1. archive and rehash failure-8; prove v1 canonical success paths absent;
2. implement the four-file maximum v2 correction on the disposable branch;
3. run focused policy/state-machine tests, negative control, and web typecheck;
4. create a fresh preparation bundle/authority for the changed process-policy
   and dependent source hashes;
5. create a v2 source freeze binding every source byte, v1 quarantine,
   preparation authority, canonical absence, and fresh failure-path absence;
6. independent mechanical static review: zero actionable P0–P2;
7. independent Sol static review: zero actionable P0–P2;
8. create execution authority binding the exact one-shot command and budgets;
9. independently verify that authority and create its anchor last;
10. run exactly one `v2/attempt-1` Gate-M command with `--retry=0`;
11. hard reopen and verify either the complete success set or the sealed failure
    set. A failure ends this route without retry.

Gate N, the fresh C1–C3/V8/forecast matrix, root gates, production source
freeze, Goal-31 landing, and Item 18 acceptance remain closed until v2 Gate M
earns a verified success receipt. Historical C1/C2 timings remain context only;
final performance admission requires one internally complete fresh matrix.

## Stop conditions

Stop before execution on a fifth disposable source file, production WIP change,
missing failure-8 binding, source/provenance drift, nonzero static P0–P2, an
unverified authority, or a non-last anchor. Stop after the one command on any
rejected observation, partial artifact, counter mismatch, compiler/VM/graph/
receipt mismatch, retry, semantic drift, or ambiguous process termination.

Do not weaken a band, add a process allowlist, reuse v1 authority, run another
attempt, begin Gate N, create Goal 32, or begin Item 19 under this architecture.
