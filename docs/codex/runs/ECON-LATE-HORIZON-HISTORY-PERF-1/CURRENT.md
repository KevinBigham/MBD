# Current — ECON-LATE-HORIZON-HISTORY-PERF-1

Phase: `APPROVED_CAUSAL_REPLACEMENT — implementation pending; diagnostic closed`

Landable source remains frozen at
`5a4eb60f8b1890803117a84a613d43af605f47dc`, tree
`23aa4bf628f353775b445b1c4963b9c0d21d3057`. Sol's landable-source review
remains `MERGE_READY`, actionable P0/P1/P2 `0/0/0`.

## Rejected proof-authority checkpoint

The first proof-authority stop-loss checkpoint was frozen and tested but fresh
Sol review returned `STOP_REQUIRED`, actionable P0/P1/P2 `0/4/0`.

- baseline composition: `afb8ab973259d20aaae2d738c16755d1ac24786b`,
  tree `eafa617d279709c1fbe4c0f135f8fa0a81b0a1a4`;
- successor composition: `9eede0ce020a0876eca0b464331397c920cc5d5e`,
  tree `44a9e6cd050fab2d0ba850d587f94c2850d820ec`;
- rejected manifest root:
  `/private/tmp/mbd-goal32-proof-authority-5a4eb60-20260731`;
- raw manifest SHA-256:
  `d6a2165f3571382803859816316128e41ca4f6403c598caf411ee99cbac70bbd`;
- internal digest:
  `c9fb34fa4b452c81bf1dfb0e53d96014e892c337dc6b782f827a4b58c838d42c`.

Both compositions were clean, retained the exact twelve-path closure, kept
their helper variants unchanged, and had eleven byte-identical non-helper
blobs. Focused tests passed `66` with seven intentional gated skips in each;
both web typechecks passed. The final-retention mutant turned the named
substitution test red and passed again after restoration. Manifest check-only
passed `15`; three-consumer readiness passed `29`; both left the root
manifest-only. No diagnostic, timer, forecast, direct proof, final admission,
or retry ran.

Sol found four P1 proof defects:

1. final admission copied the historical Goal-31 News hash instead of using
   the Goal-32 manifest source closure;
2. computation callbacks published before final authority/live-source
   validation and could leave output after failure;
3. child-owned output paths had a same-path replacement window before parent
   retention;
4. final retention hashed cached buffers rather than current held-FD bytes and
   did not close the reducer evidence set after publication.

These are verification architecture defects, not production, gameplay, RNG,
save, cap, or measured-performance failures.

## Current approved action

`SOL_CAUSAL_ARCHITECTURE.md` is `APPROVED_ARCHITECTURE`. One fresh
first-principles implementation pass may change only the same five proof files
in both disposable compositions. It replaces the fragile boundaries with:

- one manifest-derived News source binding;
- one exact framed child pipe as the causal observation channel;
- positional current-byte rehash through held descriptors;
- one stage/revalidate/publish/postvalidate authority wrapper;
- complete reducer closure validation.

New semantic root:
`/private/tmp/mbd-goal32-causal-proof-5a4eb60-20260731`.

Preserve every rejected root and commit unchanged. No diagnostic, final proof,
retry, R41, Item 19, remote, deployment, or release action may run before the
new focused gates, check-only gates, and one fresh Sol review return zero
actionable P0-P2.
