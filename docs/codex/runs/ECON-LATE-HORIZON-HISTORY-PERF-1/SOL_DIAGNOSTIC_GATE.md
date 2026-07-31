# Sol Diagnostic Gate — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `PENDING FINAL SOL REVIEW — EXECUTION CLOSED`

## Exact artifact under review

- Landable source freeze:
  `5a4eb60f8b1890803117a84a613d43af605f47dc`, tree
  `23aa4bf628f353775b445b1c4963b9c0d21d3057`.
- Current contract record:
  `28d45f25a4b799cd21a1ef5db6024645b313b06c`, tree
  `b681f2d689a9e5889710d822ec480bdb43102769`.
- Baseline composition:
  `e51854080d4bae705483ae2d55a56c0cd5bd7127`, tree
  `f5c32903eb66436cc1fda40310a04753cb23d1ee`.
- Successor composition:
  `51a7c88063d69d95bb01bd227e48d8bd33c61c8d`, tree
  `44a93e038d2d46fd1b36f0db68fecf5e865f46d9`.
- Manifest path:
  `/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r1/manifest.json`.
- Manifest raw SHA-256:
  `860d534833ec0e42b630bd29ec6b1bdf605893f6a15d7878750aa35dec941aec`.
- Internal manifest digest:
  `9041c4cd0947ae592c4fd53cbb1e483bb7320f0af87cbb2ffabe580d302633a0`.
- Check-only result: exit `0`; 14 tests passed, one unrelated Goal-31 gated
  adapter skipped; no paired child, input copy, observation, reducer, measured
  root, or timer ran.

The two composition diffs contain exactly the authorized twelve paths. The
eleven non-helper paths are byte-identical. Helper SHA-256 values:

- baseline:
  `79bd367a80603185a2f73c8138883e31ff8d5c731e676ec11390789bc96f7aa4`;
- successor:
  `768d95a446901d81f54c194e520bdc15e82a93b788ffdd10a5c7cb376524fd1b`.

## Final parity receipts

The exact no-retry `-r2` sequence passed baseline capture, successor capture,
and reducer. Raw SHA-256 values:

- `capture-baseline.json`:
  `c1b4ef1da066579835c906212739e2cc5fc7abdd1bb9ce3e039ca773201eb3f3`;
- `capture-successor.json`:
  `3e1978dca9f7de9705b03a3a002fa71ae470214347b9f2c32f1dd300c6105ab9`;
- `interactive-before-after.json`:
  `e77a1836e83c2509d01c2fe3c46fa6109d7c2add5b7a8466ce5b4a224df24ffb`;
- `autonomous-before-after.json`:
  `a24b533e209821c33e68b9221f1328ef59b44f7be87f73fee8f76fb6546104cd`;
- `cross-mode-difference.json`:
  `d24a83d1c4e4fb6d8c20fd40628e28d87e4e8442ea3e84f5c6172c99d3e090b7`.

All three reducer receipts report `PASS`; the manifest independently reopens
and binds their raw hashes and internal content digests.

## Focused construction receipts

- Source freeze: sim-core 64 tests passed; web 225 tests passed; direct package
  typechecks passed; root typecheck 9/9 passed.
- Final composition ordinary matrix: 94 tests passed and six authorized gated
  skips in each composition, retries disabled.
- Final pure/hostile environment matrix: four tests passed in each.
- Final web typecheck: passed in each.
- Deliberate live-identity bypass mutant failed at the intended hostile
  assertion and correct bytes were restored.
- `git diff --check` passed; both worktrees and indexes are clean.

## Preserved stopped evidence

- Original failed parity capture root: immutable, one failed baseline capture,
  no successor/reducer.
- Superseded green parity `-r1` root: immutable, five documented artifacts.
- Failed first manifest-seal root: immutable, manifest only; raw
  `c0f29a87128910ce76901764982854100aca3b71683bc5d7dd7bb5581fd88113`,
  internal
  `6e8810e18959afee1c8c32f296b7c0604dfb5d83932ac8b493bc66da725895ff`.
- No check-only, child, diagnostic, timer, profile, forecast, or proof ran
  against any failed/superseded root.

## Literal command proposed for admission

This command is recorded but remains closed until the final Sol verdict in
this file is `APPROVED` with actionable P0/P1/P2 `0/0/0`:

```sh
PATH=/private/tmp/mbd-goal32-corepack-bin-12608:$PATH \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MODE=paired-diagnostic \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST=/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r1/manifest.json \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST_SHA256=860d534833ec0e42b630bd29ec6b1bdf605893f6a15d7878750aa35dec941aec \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_OUT=/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r1/rph-receipt.json \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econLateHorizonPerf.integration.test.ts --retry=0
```

## Sol verdict

Pending. The reviewer must inspect the exact source freeze, both composition
commits, helper projections, shared proof closure, negative controls, parity
receipts, raw manifest bytes, check-only result, process/root/digest schemas,
and reducer equations. Any actionable P0-P2 keeps execution closed.
