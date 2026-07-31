# Bundle Gate Correction — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `SOURCE_GATE_GREEN — MERGE_READY 0/0/0 — GITHUB CI GREEN`

Corrected draft PR CI run `30666011715` completed green at exact branch commit
`0f4c089795a8adc607eb25ef065a3a7b569d3abf`.

## Failure classification

Draft PR 85 ran CI at
`8b90b50c439943802f079510c2536adb36d5de77`. Its workspace gate failed only
`apps/web/src/build/bundleBudget.test.ts`:

- `game-engine-core`: `458,237` raw against `456,704`;
- `game-engine-core`: `148,181` gzip against `147,456`.

The same exact failure reproduced locally once with retries disabled. This was
a production bundle-architecture acceptance defect, not a test, CI,
determinism, save, receipt, gameplay, or proof-timing defect. The budget was
not raised.

## Bounded source addendum

Standing campaign authority and a source-backed Sol/xhigh review opened exactly
these two additional build paths:

1. `apps/web/src/build/bundleConfig.ts`;
2. `apps/web/src/build/bundleConfig.test.ts`.

The exact `tradeFinance.ts` module now resolves to
`game-engine-trade-finance` before the generic sim-core route. The module has
type-only imports, so the emitted runtime dependency remains core to leaf. No
simulation source, public API, gameplay, RNG, save/schema, receipt, proof
formula, cap, timeout, seed, or horizon changed.

Source-freeze commit:
`85310795ef3ef13118eb75386a0864d270ace37c`, tree
`8ce776cc7d84c8872de807510d1968a136bee773`.

The reviewed pre-commit diff SHA-256 was
`7947ec75731a7efb823922ec07924fbb71866af76af86ba8890667a71bb18509`.
Independent Sol/xhigh verdict: `MERGE_READY`, actionable P0/P1/P2 `0/0/0`.

## Gate receipts

- bundle routing: `9` passed, retries disabled;
- bundle budget: `1` passed, retries disabled;
- trade-finance worker: `14` passed, retries disabled;
- web typecheck: passed;
- root typecheck: `9/9` tasks passed with the repository-pinned Corepack
  `pnpm 9.15.4` shim;
- no-cache full tests: contracts `37`, sim-core `1,726` plus one intentional
  skip, UI `1`, web `2,492` plus nine intentional skips; all eight Turbo tasks
  passed in `6m07s`;
- determinism: `3/3` passed;
- fresh production PWA build: `3,035` modules and `169` precache entries, no
  circular-chunk warning;
- production Playwright: `14/14` passed in `7.4m`, retries disabled.

Emitted worker sizes:

- `game-engine-core`: `452,347` raw / `146,487` gzip;
- `game-engine-trade-finance`: `5,908` raw / `1,939` gzip.

The new chunk is present in `sw.js` precache and uses the ordinary worker
budget. The browser journey proved worker boot, exact-save mutations,
persistence, hard reload, same-tree exclusion, and the economy surfaces through
the public production build.

## Verification-environment note

The first root-typecheck attempt stopped before web typechecking because the
desktop fallback `pnpm 11.9.0`—not the repository-pinned manager—tried to alter
workspace build-policy state and rejected ignored `esbuild` scripts. The two
temporary workspace lines were restored immediately. The corrected command
used a `/tmp` Corepack shim resolving `pnpm 9.15.4` and passed. No package,
lockfile, workspace, or dependency-policy change remains.

## Artifact impact and next gate

`5a4eb60…` remains the independently reviewed functional simulation freeze but
is no longer the exact landable candidate. Revision/tree-bound successor,
build, PWA, browser, diagnostic, and admission artifacts must bind
`85310795…`. Baseline `505cfdf7…` remains historical baseline evidence. The
old successor composition `7cfda113…` is evidence-only; the persistent proof
route must create and review a fresh clean successor composition from
`85310795…` before its one import probe.

No `R/P/H` calculation, final admission, retry, Item-19 action, Goal-32 landing,
deployment, or release ran. The next external gate is CI on the corrected draft
branch; after it is green, resume the already-authorized persistent direct-proof
route.
