# Current — ECON-LATE-HORIZON-HISTORY-PERF-1

Phase: `BLOCKED_ORACLE — direct import probe exhausted before module resolution`

Landable production/source freeze:
`5a4eb60f8b1890803117a84a613d43af605f47dc`, tree
`23aa4bf628f353775b445b1c4963b9c0d21d3057`. Its independent source review
remains `MERGE_READY`, actionable P0/P1/P2 `0/0/0`.

## Preserved stopped causal candidate

The prior causal proof machinery remains permanently stopped and evidence-only
at the exact dirty worktrees, commits, paths, and diff SHA recorded in
`SOL_CAUSAL_ARCHITECTURE.md`. Its semantic root remains absent. No causal
measurement lane ran.

## Stopped direct candidate

Fresh roots:

- baseline `/private/tmp/mbd-goal32-direct-baseline-505cfdf`, detached at
  `505cfdf7c3c11e0cb821bea0716641dbcb787555`, tree
  `0640b942317d7bfacebb33b2b5befa20e90cd746`, Git-clean, no `node_modules`;
- successor `/private/tmp/mbd-goal32-direct-successor-7cfda113`, branch
  `codex/econ-late-horizon-direct-proof-1`, HEAD
  `7cfda1134cd6f7458f906018a23461ba6a7a97d1`, tree
  `36b8f2fdef9adb68b7516441ece0a3e9ad09a04e`.

The successor has one uncommitted proof-only change:

- `apps/web/src/workers/econLongSoak.test.ts`;
- file SHA-256
  `4c419d62bff7b66cd9a7115640e502e5c8407b7c624e487b9bf9d48082d58262`;
- binary diff SHA-256
  `3846cf5d4effb18c130bfe05ba31c6c0eed73be45d7a370b5018f75536a09daa`;
- `384` insertions and `1` deletion.

Pre-gates observed before the probe:

- ordinary focused test, direct mode absent: `4 passed | 2 skipped`;
- affected web typecheck: passed;
- `git diff --check`: passed;
- baseline remained Git-clean and successor changed only the one allowed file.

The sole literal `import_probe` failed while loading the baseline
`apps/web/vite.config.ts`:

```text
Cannot find package 'vite' imported from
/private/tmp/mbd-goal32-direct-baseline-505cfdf/apps/web/vite.config.ts.timestamp-…mjs
```

Neither worker nor `@mbd/sim-core` resolved. No Goal-32 simulation,
`process.hrtime` measurement, file artifact, diagnostic, or admission ran.

## Blocker

Sol classified the failure as `ROUTE_STOPPED`. Do not install baseline
dependencies for this exhausted route, rerun the probe, edit the candidate,
add a loader/file/composition, create an artifact root or lineage, execute
timing, or reinterpret the failure.

Goal 32 requires one bounded oracle explicitly authorizing dependency
preparation before one genuinely fresh probe. Every gameplay/RNG/save/receipt
contract and every performance cap remains unchanged. R41, retry of the
exhausted route, remote/release actions, and Item 19 remain closed.
