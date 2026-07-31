# Sol Direct Candidate Review — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `BLOCK — STATIC P0/P1/P2 0/8/2 — NO EXECUTION AUTHORIZED`

Reviewed candidate:

- root `/private/tmp/mbd-goal32-direct-successor-7cfda113`;
- HEAD `7cfda1134cd6f7458f906018a23461ba6a7a97d1`;
- only changed path `apps/web/src/workers/econLongSoak.test.ts`;
- file SHA-256
  `4c419d62bff7b66cd9a7115640e502e5c8407b7c624e487b9bf9d48082d58262`;
- binary diff SHA-256
  `3846cf5d4effb18c130bfe05ba31c6c0eed73be45d7a370b5018f75536a09daa`.

This was a read-only review. No dependency install, test, import, probe,
simulation, timer, artifact, diagnostic, or admission ran.

## P1 findings

1. Checkpoint authentication removes both `envelopeDigest` and `snapshot`
   before recomputing the digest, while the producer excludes only
   `envelopeDigest`. Both authenticated checkpoints must therefore reject.
2. The candidate ignores the exact root and checkpoint environment variables;
   only `MBD_GOAL32_DIRECT_MODE` is parsed.
3. Ordinary mode is not inert: Vite loads unconditionally and the hostile test
   requires quarantined `/private/tmp` roots even when direct mode is absent.
4. Authenticated pre-snapshot, pre-state, pre-RNG, and import/export facts are
   not explicitly represented, validated, or compared across variants.
5. There is no strict parent collector. Records emit before parity, the key
   assertion is self-derived, Vitest output is unframed, and count/order/source
   identity are not independently admitted.
6. `rph` computes no totals, `D15`, `D30`, `R`, `P`, or `H` and enforces no
   threshold, so a slow regression could exit green.
7. The semantic and swapped-identity hostile controls do not exercise the
   actual collector with otherwise-valid hostile observations.
8. The import probe's default Vite config loader/optimizer can create
   `.vite-temp`/`.vite` state and timers, contradicting the no-output probe
   boundary.

## P2 findings

1. The probe graph-checks only snapshot and sim-core; its “module digests” hash
   pathname strings rather than normalized module identities/source bytes.
2. Runtime Git admission suppresses untracked paths and does not bind the exact
   reviewed candidate file/diff hashes.

## Confirmed correct foundations

- exact one-path candidate scope and recorded hashes;
- exact baseline/successor HEAD/tree constants and current production hashes;
- one ordered four-descriptor tuple;
- four real roots called synchronously once, in order, with digest work outside
  timing;
- root rows reject missing, reordered, extra, non-finite, and negative values;
- final factual/full-snapshot/state/RNG parity is compared for both data ages;
- distinct composition-rooted Vite servers close in `finally`;
- import-probe branch has no explicit gameplay-root or `hrtime` call;
- no explicit evidence-file write or new RNG source exists.

## Required future boundary

The stopped candidate cannot be retried or corrected under its exhausted
route. A new bounded oracle must authorize all of the following together:

1. fresh baseline and successor proof roots from the same frozen commits;
2. separate `pnpm install --frozen-lockfile` preparation in each root;
3. a read-only topology/identity preflight before any import;
4. one corrected `econLongSoak.test.ts` candidate closing all findings above;
5. static Sol review returning actionable P0/P1/P2 `0/0/0` before a probe;
6. exactly one fresh no-simulation/no-timer/no-output import probe;
7. only after a green probe, focused gates and the already frozen no-retry
   `R/P/H`/conditional-admission sequence.

No new manifest, artifact root, reducer, recovery lineage, R41, gameplay/RNG/
save/receipt/cap change, remote action, release, or Item-19 work is needed.
