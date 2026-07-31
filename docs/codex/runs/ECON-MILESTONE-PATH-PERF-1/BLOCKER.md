# CURRENT BLOCK — FINAL FORECAST ADMISSION FAILED

> 2026-07-30 terminal result: the exact source-bound, no-retry Goal-31 matrix
> reached final admission once and failed the immutable aggregate forecast
> budget. Forecast-primary measured `1,739.71s`; the authorized season-15
> continuation measured `1,209.16s`. The frozen `+10ms` adjustment per process
> yields `2,948,890ms`, which is `908,890ms` (`44.553%`) above the
> `2,040,000ms` cap. Both processes were individually below the
> `2,400,000ms` ceiling and produced identical season-30 state, RNG,
> round-trip, snapshot, population, and season facts. This is a production
> performance-admission failure, not a verification-program failure.
>
> The one-shot admission command failed exactly at
> `enforceForecastCap`; no admission receipt was written and no retry is
> permitted. Root gates, final Sol merge review, completion, source landing,
> Goal-18 integration, the seed-7111 diagnostic, Item 19, and every remote or
> release action remain closed. Preserve the landable source freeze
> `4e016cc4fe3043e438cc0cbc3aeec798b6f47d6b`, proof composition
> `2f3329b0886396cd9d8550aa42ea2738d02c4126`, and external evidence root
> `/tmp/mbd-goal31-direct-proof-2f3329b-20260730`.

## Current immutable receipts

| Artifact | SHA-256 | Result |
| --- | --- | --- |
| `forecast-primary.json` | `3b57980e03d4bdccef971932a3fa836fa7e2ea1a2a64e499dee3642be8ed0cc6` | 30 seasons; exact frozen facts |
| `forecast-primary.time` | `364c968ed16470313176c4baa4f5330d06775c59868559ba5a2de4e4502e416c` | `real 1739.71` |
| `forecast-continuation.json` | `a23a74530c6e10016083400820704714f9168a0a42452ecda0b3a6d04d33ed84` | seasons 16–30; exact convergence |
| `forecast-continuation.time` | `3223b30b572978abec9a67e103df030334fe2de154f0a4a5739a8dc169578998` | `real 1209.16` |
| `admission-manifest.json` | `971deb816dd979e9e24d28b0fa7a1e19f578d5ccb5e6015deaf760c7800454fa` | exact warm-up/C1–C3/V8/forecast closure |
| `admission.time` | `035e6ef1193c90be0bafccbacfc9daa837abe72a2b9f7a4a5efc0cadec05207e` | one failed admission; `real 1.89` |

No `admission.json` exists. The source and composition worktrees were clean
after the failure. Resumption requires a materially new bounded performance
strategy; retrying this matrix, changing its timing evidence, weakening the
cap, or reviving custom recovery lineage is forbidden.

# RESOLVED SOURCE-CONTRACT BLOCK — EXACT DISPOSABLE COMPOSITION AUTHORIZED

> Resolution, 2026-07-29: Kevin explicitly authorized the exact tracked,
> disposable, non-landed 12-path composition in `DIRECT_PROOF_AUTHORITY.md` and
> all bounded work needed to continue. This block is closed. The four-file
> milestone/ceremony candidate remains the sole landable source; the helper and
> proof closure must remain on a separate, mechanically non-landable branch.
> Historical text below remains evidence and grants no R41, retry, Item-19, or
> remote/release authority.

> 2026-07-28 current block: the direct-proof oracle was authorized, but live
> source proved no existing authenticated tree combines the exact autonomous
> helper, season-15 capture, late-range/profile, real CPU-profile receipt, and
> final admission lanes. Goal 31 and Kevin's narrower authorization permit
> only the two milestone/ceremony production consumers in the landing. No
> candidate, capture, performance, diagnostic, or final-gate command ran.

> Resume requires a materially new oracle authorizing the exact tracked,
> non-landed 12-path composition in `DIRECT_PROOF_AUTHORITY.md`. Inside it,
> authenticated exact raw inputs may be restored or recaptured once. A landed
> autonomous-league prerequisite or explicit Goal-31 third-module amendment is
> broader. R41/custom recovery, contract weakening, retry, Item 19, and
> remote/release actions remain prohibited.

> 2026-07-27 resolution: Kevin authorized the exact direct-proof oracle in
> `VERIFICATION_STOP_LOSS.md` plus a fresh bounded current-main prerequisite.
> That resolved only the former correction-loop authority question. It did not
> resolve the newly discovered live-source dependency and it does not revive
> any Gate-M lineage.

> 2026-07-27 supersession: the correction-loop history below remains factual,
> but Gate-M v1/v2/v3 and R37–R40 are retired under the verification stop-loss.
> Do not patch or execute them. The production candidate is preserved and
> focused-green; the current blocker is the missing autonomous-league
> production prerequisite described above.

## Exact stop

Historical status: `BLOCKED`. The frozen Terra correction budget is exhausted. Production
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

Resume requires the explicit bounded performance-execution oracle quoted in
`VERIFICATION_STOP_LOSS.md`. It may authorize one wholly fresh serial
warm-up/C1–C3/V8/forecast sequence after current-main reconciliation and direct
repository gates. Historical C1/C2 evidence remains context only. The oracle
must not revive Gate M, create R41, weaken bands, reuse Goal-30's forecast, or
permit a source change without a new bounded gate.
