# Current — ECON-LATE-HORIZON-HISTORY-PERF-1

Phase: first-principles proof-authority stop-loss implementation authorized;
diagnostic execution closed

Writer: exactly one Terra/high writer pending dispatch.

Landable source freeze:
`5a4eb60f8b1890803117a84a613d43af605f47dc`, tree
`23aa4bf628f353775b445b1c4963b9c0d21d3057`.

Sol source-freeze verdict: `MERGE_READY`, actionable P0/P1/P2 `0/0/0`.

Focused receipts, retries disabled:

- sim-core finance/narrative: 2 files, 64 tests passed;
- web affected matrix: 6 files, 225 tests passed;
- direct sim-core and web typechecks passed;
- root typecheck passed 9/9;
- four structural mutants failed their intended guards and were restored;
- `git diff --check` passed and the source-freeze worktree/index are clean.

Changed paths: only the three disposable proof paths approved for correction
loop 3 changed in each composition:

- `apps/web/src/workers/econLongSoak.receipts.ts`;
- `apps/web/src/workers/econLongSoak.receipts.test.ts`;
- `apps/web/src/workers/econLateHorizonPerf.integration.test.ts`.

Last green command: the fresh `-r2` check-only command exited `0` with 15 tests
passed and one unrelated Goal-31 gated adapter skipped. It spawned no paired
child, created no input copy or output, called no measured root or timer, and
left the artifact root containing only its sealed manifest.

Current blocker: fresh independent Sol review returned `FIX_AND_REVIEW`,
actionable P0/P1/P2 `0/2/0`.

1. The orchestrator discards its first stable observation read and later
   reopens the pathname without binding the original bytes/inode. Artifact-root
   identity is not pinned across the whole orchestration. Same-path regular
   file or root replacement can therefore change admitted timings.
2. The only optimized successor cannot execute the authorized post-green proof:
   forecast/direct-proof/final-admission code still requires Goal-31
   `4e016cc…` ancestry, the legacy 12-path closure, helper SHA `07115d…`, and
   observer SHA `809da8…`. Live successor `7cfda113…` has no such ancestry,
   has a 39-path diff from that revision, helper SHA `768d95…`, and observer
   SHA `075a26…`.

The first defect repeats the same provenance family that correction loop 3
attempted to close. The stop-loss therefore prohibits another derivative
`-r3` correction. The sealed/check-only `-r2` root is immutable rejected
evidence.

Next action: the same Terra role implements the exact five-file checkpoint
byte-identically in both compositions, then runs only its frozen focused gates.
Do not run the paired diagnostic, final proof, retry, or Item 19 before the
fresh zero-finding Sol review.
