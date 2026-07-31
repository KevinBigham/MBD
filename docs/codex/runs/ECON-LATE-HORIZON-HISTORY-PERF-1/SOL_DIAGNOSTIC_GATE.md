# Sol Diagnostic Gate — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `FIX_AND_REVIEW — P0/P1/P2 0/2/0 — EXECUTION CLOSED`

## Replacement `-r2` artifact pending review

- Landable source freeze:
  `5a4eb60f8b1890803117a84a613d43af605f47dc`, tree
  `23aa4bf628f353775b445b1c4963b9c0d21d3057`.
- Baseline composition:
  `505cfdf7c3c11e0cb821bea0716641dbcb787555`, tree
  `0640b942317d7bfacebb33b2b5befa20e90cd746`.
- Successor composition:
  `7cfda1134cd6f7458f906018a23461ba6a7a97d1`, tree
  `36b8f2fdef9adb68b7516441ece0a3e9ad09a04e`.
- Manifest path:
  `/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r2/manifest.json`.
- Manifest raw SHA-256:
  `15e8d9e6c81aac8da253a3076dd7a9414f2e8a42beea3d02feea02992e7d5995`.
- Internal manifest digest:
  `57d0ba66a26dca3f5dcd03a8dfeddb8f06aefd36a74232456d4bec0f9fd8340b`.
- Check-only result: exit `0`; 15 tests passed, one unrelated Goal-31 gated
  adapter skipped; no paired child, input copy, observation, reducer, measured
  root, or timer ran. The artifact root still contains only the manifest.

The two composition diffs contain exactly the authorized twelve paths. The
eleven non-helper paths are byte-identical. Helper SHA-256 values:

- baseline:
  `79bd367a80603185a2f73c8138883e31ff8d5c731e676ec11390789bc96f7aa4`;
- successor:
  `768d95a446901d81f54c194e520bdc15e82a93b788ffdd10a5c7cb376524fd1b`.

Correction-loop-3 shared SHA-256 values:

- `econLongSoak.receipts.ts`:
  `3a2465dc26f6e6ae576f8cd831b6dc79f3fd4a9fb93ab57fd27259f4a1e7348e`;
- `econLongSoak.receipts.test.ts`:
  `8682f56d1d918ab2617e69c116fb5c0d2d7ba5daaededc8062610b884f64e56b`;
- `econLateHorizonPerf.integration.test.ts`:
  `e476405e8b41a7059f45c4a8342c70b625a1cef44ec6bf57f91724f496f7d0f5`.

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
- Correction-loop-3 affected matrix: 48 tests passed and two authorized gated
  skips in each composition, retries disabled.
- Correction-loop-3 ordinary seven-file matrix: 95 tests passed and six
  authorized gated skips in each composition, retries disabled.
- Final web typecheck: passed in each.
- Deliberately bypassing canonical-root symlink admission made the hostile
  root-link regression fail at the intended
  `goal32CanonicalDirectory(rootLink)` assertion; correct bytes were restored
  and the same test passed.
- `git diff --check` passed; both worktrees and indexes are clean.

## Preserved stopped evidence

- Original failed parity capture root: immutable, one failed baseline capture,
  no successor/reducer.
- Superseded green parity `-r1` root: immutable, five documented artifacts.
- Failed first manifest-seal root: immutable, manifest only; raw
  `c0f29a87128910ce76901764982854100aca3b71683bc5d7dd7bb5581fd88113`,
  internal
  `6e8810e18959afee1c8c32f296b7c0604dfb5d83932ac8b493bc66da725895ff`.
- Rejected `-r1` root: immutable, manifest only; raw
  `860d534833ec0e42b630bd29ec6b1bdf605893f6a15d7878750aa35dec941aec`,
  internal
  `9041c4cd0947ae592c4fd53cbb1e483bb7320f0af87cbb2ffabe580d302633a0`;
  check-only passed 14 tests with one unrelated gated skip before Sol rejected
  it.
- No paired child, diagnostic, timer, profile, forecast, or proof ran against
  any failed, superseded, or rejected root.

## Literal command proposed for admission

This command is recorded but remains closed until the final Sol verdict in
this file is `APPROVED` with actionable P0/P1/P2 `0/0/0`:

```sh
PATH=/private/tmp/mbd-goal32-corepack-bin-12608:$PATH \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MODE=paired-diagnostic \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST=/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r2/manifest.json \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST_SHA256=15e8d9e6c81aac8da253a3076dd7a9414f2e8a42beea3d02feea02992e7d5995 \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_OUT=/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r2/rph-receipt.json \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econLateHorizonPerf.integration.test.ts --retry=0
```

## Historical rejected `-r1` Sol verdict

`FIX_AND_REVIEW`, actionable P0/P1/P2 `0/2/1`.

Findings:

1. `assertGoal32ReducerRaw` validates equations and a re-digested result string
   but does not recompute the threshold predicate, so a finite failing result
   can be forged to `PASS`.
2. Orchestration checks absolute/direct-child paths but does not canonicalize
   the artifact root or reopen observations as stable regular non-symlink
   files before admission.
3. Observation parsing permits self-consistent empty/selective checkpoint,
   factual, state, RNG, helper, observer, and result digests.

The smallest approved bounded split changes only:

- `apps/web/src/workers/econLongSoak.receipts.ts`;
- `apps/web/src/workers/econLongSoak.receipts.test.ts`;
- `apps/web/src/workers/econLateHorizonPerf.integration.test.ts`.

It must recompute the reducer result predicate; enforce exact digest
types/shapes and semantic closure; canonicalize the artifact root; reopen
manifest, inputs, and observations as stable regular non-symlink files; and
add hostile forged-PASS, selective-semantic, root-symlink, and substituted-file
regressions. The rejected `-r1` literal command never ran.

## Fresh `-r2` Sol verdict

`FIX_AND_REVIEW`, actionable P0/P1/P2 `0/2/0`.

1. **P1 — observation/root identity is not retained through admission.**
   `econLateHorizonPerf.integration.test.ts` performs one stable output read
   after each child but discards its bytes and identity. It later reopens each
   pathname without an expected hash or retained inode. Artifact-root identity
   is likewise pinned only within each individual read, not across
   orchestration or immediately before reducer creation. A same-path regular
   file or root replacement can therefore supply self-consistent arbitrary
   timings and alter `R/P/H`. The hostile suite proves symlink and known-hash
   rejection, but not same-path regular-file/root replacement.
2. **P1 — the mandatory post-green proof is non-executable.**
   `econLongSoak.receipts.ts` still requires Goal-31 source freeze
   `4e016cc…`, its ancestry, the exact legacy diff closure, helper SHA
   `07115d…`, and observer SHA `809da8…`. Live optimized successor
   `7cfda113…` instead has false `4e016cc…` ancestry, 39 paths in that diff,
   helper SHA `768d95…`, and observer SHA `075a26…`. Forecast/profile,
   season-15 direct proof, and final admission all invoke that incompatible
   derivation. A green diagnostic therefore cannot reach Phase 7.

Prior finding closure:

- reducer predicate recomputation: closed;
- empty/selective digest closure: closed;
- symlink and single-read TOCTOU handling: improved, but cross-read/root-life
  substitution remains open.

Identity review otherwise passed: exact composition heads/trees, exact
twelve-path diffs, eleven byte-identical proof files, intended helper variants,
clean worktrees, non-ancestry from local `main`, exact manifest raw/internal
hashes, exact parity/input hashes, and a manifest-only regular artifact root.

Exact next gate: the authorized first-principles five-file proof-only
correction, fresh compositions/manifest/check-only, then one new Sol review.
The paired diagnostic remains unspent. No write,
diagnostic, measured root, timer, forecast, proof, or admission ran during
review.
