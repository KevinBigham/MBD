# BLOCKED — ECON-MILESTONE-PATH-PERF-1

## Exact stop

Status: `BLOCKED`. The frozen Terra correction budget is exhausted. Production
source/tests are intentionally unstaged and uncommitted; source freeze is
forbidden because the required serial C1–C3, three V8 samples, and one forecast
sequence are incomplete. Do not run C3, V8, forecast, full gates, review, or
landing under this route.

## Identity and scope

- Main worktree: `/Users/kevin/.codex/worktrees/5616/MBD-main-main`;
  `codex/econ-milestone-path-perf-1`; docs-first commit
  `3f4bf7148ed35b1ab4e4fcc0701c15bc02dd7e1e`; base
  `ace5068f0f49a1195c2937461fe8ad7f04d8d3d8`.
- Candidate-only source changes are the four authorized paths:
  `sim.worker.milestones.ts`, `sim.worker.ceremony.ts`, and their new adjacent
  tests. Candidate SHA-256: milestones
  `bef65c1e23a3fc8096ae8745528cd577e00f93cbc1f4b3909c95d8c86b09bbd6`;
  ceremony `ee6fe50bdc5bb83107b01822840684d71197abc4bed79e7e6ae8f01eb82f0102`.
- Disposable proof runtime stayed clean at
  `/Users/kevin/Downloads/MBD-econ-milestone-path-perf-1-proof`,
  `9ae8722c23e1f4b428faff7caba954b0aa0a2802`, tree
  `7b4f5f177b7f40a9d5bc76f0c28d6fb4874ee8cc`.
- Protected main and failed Goal-30 worktrees were rechecked and untouched; the
  failed worktree still has only its pre-existing milestone source modification
  and untracked test.

## Focused proof that completed

- `corepack pnpm --filter @mbd/web exec vitest run
  src/workers/sim.worker.milestones.test.ts src/workers/sim.worker.ceremony.test.ts`:
  6/6 passed.
- `corepack pnpm --filter @mbd/web typecheck`: passed.
- `corepack pnpm --filter @mbd/web build`: passed, 3,035 modules and 168 PWA
  precache entries; worker-core 454.92kB raw.
- Full-width final-call mutant failed both structural tests at 8,385 player-ID
  reads versus `<=260`, then restored source passed.

## Admitted serial evidence so far

All use the retained season-29 bytes SHA-256
`a29f2e5df30284cdb5358ac3aa758b6d6c3bf9615e789214de1183ec67079360`.
Each has semantic digest
`f76ac9d30b5edaecc80f4213d5799431a3025cada9398afeb1a749e832dba98b`,
row-30 `250e5c643f9b55f6bb42d9069221a679c87fd5bf37103933883a9bc59e3332b8`,
state `dd0607067818556d34aa134afc48044faa69d13911253a3bd6413af5aadbb2aa`,
RNG `966cfa51d4fc2fecfc624e488f33603cc3deb62d7e477cf376e6e4888fdc9b24`,
and call signature `fd3337c5e794cba4c33cbbafdb20a37c500a956352888ee5cf9b80bcd489d0ee`.

| Run | Artifact SHA-256 | Receipt digest | Total / injury / ticker ms |
| --- | --- | --- | --- |
| warm-up | `b4c46f1a855934da610f830e9070e5781f88cf83e1342e81853c348d2400726c` | `afd14aa1550505ba8bec6b0cabfbd2ef0f8fbf30a6cbf5c75350b61927297466` | 63,624.990209 / 2,585.477749 / 15,865.416126 |
| C1 | `347d2bb66c00204bb2183169125f427e9305a0bae7b7a39976efdd741b9fb27a` | `cc4d33a96ed84eedd35f25678df4aff453f2ea593966aeaf6dd3df789c5cf951` | 56,951.796625 / 2,882.190587 / 14,586.948584 |
| C2 | `0dc31632712e3036d712c879b09b74940a1e2801db8bdcfd72ee80559c14714b` | `dbaa357129d4dcde9b51afbdf014bca29aa82c97489edc5b6021343ff7aca646` | 57,571.792084 / 2,486.157785 / 14,541.311291 |

Raw artifacts remain outside Git:
`/tmp/mbd-econ-milestone-path-perf-1-{warmup-serial,c1-serial,c2-admitted}.json`.
These are insufficient to calculate admission bands; sealed B1–B3 are not
rerun and C3/V8/forecast were never admitted.

## Corrections and rejected commands

1. **Loop 1/2 — overlap.** C1 PID 2651 was at 2:02 and warm-up PID 3055 at
   0:57 when discovered concurrently; child PIDs 2653, 2664, and 3057 were
   terminated. The outputs `c1.json` and `warmup.json` never existed, so there
   are no receipt/log/time hashes and no simulation receipt is admissible.
2. **Loop 2/2 — malformed C2 environment.** The profile command supplied
   `MBD_ECON_LATE_HORIZON_PERF_PARENT_PRODUCER_TREE=ecf12a…d4c8400358`.
   Adapter result (1.34s): `parent producer tree must be exactly 40 lowercase
   hexadecimal characters.` It wrote neither a progress marker nor
   `c2-serial.json`. The corrected fresh path was `c2-admitted.json` above.
3. **Forbidden third correction — C3.** The C3 command repeated exactly that
   malformed producer-tree value, and the same adapter validator rejected it
   before simulation in 1.34s. No `c3-serial.json`, V8 CPU profile, or forecast
   file exists. The required process form was `/usr/bin/time -p env
   MBD_ECON_LATE_HORIZON_PERF_MODE=profile …
   MBD_ECON_LATE_HORIZON_PERF_PARENT_PRODUCER_TREE=ecf12a…d4c8400358
   MBD_ECON_LATE_HORIZON_PERF_OUT=/tmp/mbd-econ-milestone-path-perf-1-c3-serial.json
   ./node_modules/.bin/vitest run src/workers/econLateHorizonPerf.integration.test.ts`.
   The provenance tuple otherwise matched the validated C2 invocation.

## Rollback and narrowest next authority

Rollback is to retain the docs-first and this docs-only blocker commits and
discard/revert only the unstaged four candidate source/test paths; no save,
schema, dependency, retained artifact, or protected worktree changed.

Resume requires a new Sol route that explicitly decides whether a fresh,
serialized C3/V8/forecast protocol is authorized after the exhausted correction
budget, fixes the exact command/evidence mechanism before launch, and names
whether the existing C1/C2 evidence is admissible. It must not weaken bands,
reuse Goal-30's forecast, or permit a source change without a new bounded gate.
