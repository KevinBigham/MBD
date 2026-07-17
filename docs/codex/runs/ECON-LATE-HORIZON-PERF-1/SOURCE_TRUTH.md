# Current Source Truth — ECON-LATE-HORIZON-PERF-1

## Preflight

- Worktree: `/Users/kevin/Downloads/MBD-econ-late-horizon-perf-1`
- Branch: `codex/econ-late-horizon-perf-1`
- Base/HEAD before docs: `cd5e9191118aee76d22d66b7ffed32fed748cae8`
- Base tree: `0508ae6c6a6d21555607b5d3f9a649227b0762d8`
- Starting dirty state: clean; index empty.
- Local `main`: `cd5e9191118aee76d22d66b7ffed32fed748cae8`.
- `origin/main`: `cd5e9191118aee76d22d66b7ffed32fed748cae8` after the
  authorized 2026-07-16 fast-forward push. GitHub source is current; Actions
  dispatch is externally blocked with `HTTP 422: Actions has been disabled for
  this user`, so Pages still serves older revision
  `fd217dc57262cd104f4fc140cb6e6c571cfa9290`.
- Protected main-worktree edits, excluded from this branch and all staging:
  `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and
  `docs/codex/PROGRAM.md`.
- Package manager: `pnpm@9.15.4`; Node `>=20`.
- Root scripts: `typecheck`, `test`, `build`, `verify:determinism`,
  `playtest:calibrate`; web scripts: `typecheck`, `test`, `build`,
  `e2e:reload-smoke`.
- GameSnapshot v35; Dexie v6.

## Dependency state

- Goal 29 is locally landed but blocked after both correction loops. Its source,
  paired profiles, two-year reference, root gates, and final review were green.
- Goal 18 remains clean and unlanded at
  `6ce96ebf6482cd0a3fa52a342d7b29e8977528ff`.
- The sole post-Goal29 full run used source revision
  `41b12d13639d0670afd2f24b1d2a76fb3fd74d64`, exited 142 at exactly 2,400
  seconds, completed primary seasons 1–29, started season 30, never entered
  replay, and wrote no JSON receipt.
- Failed log:
  `/tmp/econ18-seed7111-full-41b12d1.log`, SHA-256
  `d51c9bc1d33dca8d007404330105fd39fec4bd3102f93e0cf6f8c3c4604b2148`.
- Retained season-15 artifact:
  `/tmp/mbd-econ-long-save-perf-1-20260716-01add12/season15-checkpoint.json`,
  raw SHA-256
  `260594ec24b4f0846835343f7c96bc835a6b2e68909dcc531759cbd44a63516f`,
  envelope
  `0cf2564bc2f9a3328c521cc404760a0784d684ff3c05cbb2c9c1f2f991d24d98`.

## Measured source map

Goal 29's post-optimization season-16 profiles report:

| Pair | Injury/news | Ticker/debut/consequences | Combined | Share of regular season |
| --- | ---: | ---: | ---: | ---: |
| 1 | 24.353s | 19.296s | 43.649s | 55.8% |
| 2 | 24.422s | 19.317s | 43.739s | 60.1% |
| 3 | 26.949s | 20.821s | 47.770s | 59.9% |

The authenticated season-15 snapshot contains 10,979 career-stat ledgers,
12,097 players, and 44,714 news rows.

`packages/sim-core/src/narrative/newsFeed.ts::checkMilestones` currently loops
every career-stat row and calls `players.find` each time. It is invoked through:

- `apps/web/src/workers/sim.worker.helpers.ts::processDayInjuriesAndNews`;
- `apps/web/src/workers/sim.worker.ceremony.ts::queueCareerMilestoneMoments`;
- `apps/web/src/workers/sim.worker.ticker.ts::buildMilestoneContexts`.

This is direct quadratic source work. Exact late-stage evidence has now rejected
the callee alone and admitted its bounded owning root as described below.

## Authenticated season-29 input

- Disposable adapter commit:
  `7238f4d6844361356513158c514ee7c5e1edf63c`; tree
  `a9a8a8e1d98ecd48e46991eade243e2d27ebafee`.
- Exact one-time season-16-to-29 capture: 4/4 passed in 1,932.59s; seasons
  16–29 each started and completed once; season 30 never started.
- Output: `/tmp/mbd-econ-late-horizon-perf-1-20260716-season29.json`,
  188,378,783 bytes, raw SHA-256
  `a29f2e5df30284cdb5358ac3aa758b6d6c3bf9615e789214de1183ec67079360`.
- Exact state/round-trip digest:
  `61b0054ed7fd800c5a56cb9cd094e237662f8a8cf14f8aa25d034480b53a64b1`;
  exact RNG/round-trip digest:
  `4896cdeac3610c1e9e4c70a2c0ae991a949ac748e08f8df4e2c75fd48163790a`.
- The hostile admission matrix passed 4/4 and rejected forged revision, tree,
  source hashes, state, RNG, round trip, rows, context, truncation, and raw
  bytes before singleton installation.

## Season-30 baseline and profile truth

All five fresh serial processes produced exact row-30 digest
`250e5c643f9b55f6bb42d9069221a679c87fd5bf37103933883a9bc59e3332b8`,
state digest
`dd0607067818556d34aa134afc48044faa69d13911253a3bd6413af5aadbb2aa`,
RNG digest
`966cfa51d4fc2fecfc624e488f33603cc3deb62d7e477cf376e6e4888fdc9b24`,
and call signature
`fd3337c5e794cba4c33cbbafdb20a37c500a956352888ee5cf9b80bcd489d0ee`.

| Baseline | Regular season | Injury/news | Ticker/debut/consequences | Combined share |
| --- | ---: | ---: | ---: | ---: |
| 1 | 126,695.152ms | 49,074.016ms | 37,433.387ms | 68.2800% |
| 2 | 127,136.269ms | 50,686.254ms | 37,357.853ms | 69.2518% |
| 3 | 141,608.948ms | 56,249.863ms | 43,806.822ms | 70.6570% |

The V8 test-isolate profile SHA-256 is
`a6362d93d4635919c65264278752547f503d10a8fbe6bcccdf1cb53331b0ec47`.
The `checkMilestones` descendant union is 31,199.469ms, 24.065625% of its
129,643.295ms regular season, so that candidate is rejected. The six
non-overlapping roots at
`sim.worker.milestones.ts::buildCareerMilestoneEvents` total 48,951.209ms,
37.758381%, and are all inside injury/news or ticker regular-season paths.

The sealed season-29 state contains 16,783 career ledgers, 11,429 players, 14
eligible milestone IDs, four eligible IDs with current players, ten missing
eligible IDs, and no duplicate career/player IDs. This supports the frozen
original-order narrowed-player reduction without changing missing or duplicate
semantics.

## Candidate proof protocol corrections

The original disposable adapter commit bound one `adapterRevision/tree` pair
both to the season-29 producer and the later profiling runtime. That made an
honestly committed candidate runtime impossible: a new commit would fail
checkpoint validation, while reporting the old commit against dirty candidate
bytes would be false. The candidate runner was canceled before dispatch and no
process or output was created.

The same Terra adapter writer corrected the proof seam at
`30587883c3bfff46149568e4cc87018973940cbf`, tree
`e4021543ef32243cc892978edd734f64b5d0dca0`, adapter SHA-256
`36217dd6ab4a8ad9b4e0503bb401cb51933d485ce6efcc732ff47cf4c5e26bbc`.
Disposable profile schema 2 now records current runtime revision/tree separately
from immutable checkpoint-producer revision/tree; the receipt digest covers all
four, while the semantic digest and stage-call signature formulas are unchanged.
The real 188MB checkpoint hostile matrix passed 5/5 with distinct identities in
167.74s, and Sol found zero actionable P0–P2.

Sol then froze one standard warm-up, three ordinal standard candidates, and
three separate V8 candidate samples. The single sealed baseline V8 sample is an
explicit fixed `48,951,209µs` reference, not a claimed median. CPU runs cannot
count as standard pairs. The same adapter writer added exact fail-closed primary
and checkpoint-continuation forecast modes at
`639ebec412159c605bd327457de21a7004b5e899`, tree
`f8a22a30add5ab8db5a0d7fbfbf7978d3f70d8a5`, adapter SHA-256
`a8721508ef4bb11b23146ea04486a0ae3db7d97c68b31425583e42346270e548`.
Focused tests passed 18 with two intentional skips, the real season-15 hostile
matrix passed 8/8 in 54.21s, and final adapter review found zero P0–P2.

## Candidate and forecast outcome

The exact production source was mechanically composed into tracked-clean
disposable runtime `226120ac8a732a786f5ca2c5c4101ee1d65918f5`, tree
`769a4773f7b64883782330c533b12dc843bef13f`. Its source SHA-256
`8272ce2e72f8cd34b90f7d858e07206533bcb9a02c077337425261903209ee01`
matches the uncommitted production patch.

| Pair | Baseline total | Candidate total | Baseline combined | Candidate combined |
| --- | ---: | ---: | ---: | ---: |
| B1→C1 | 126,695.152250ms | 99,217.033834ms | 86,507.402674ms | 53,691.869789ms |
| B2→C2 | 127,136.269375ms | 103,880.635417ms | 88,044.107087ms | 54,542.682377ms |
| B3→C3 | 141,608.948334ms | 100,278.430167ms | 100,056.685585ms | 52,758.124332ms |

Every ordinal pair improved and both ranges are non-overlapping. Median total
improved 21.125237778356032%; median combined target time improved
39.017077274751777%. All candidate semantic, row-30, state, RNG, round-trip,
subdomain, and call-signature digests equal the baseline facts exactly.

The selected-root extractor reproduced the sealed baseline at 48,951,209µs.
The three candidate costs were 398,961µs, 353,496µs, and 287,628µs, each with
six unambiguous outermost roots. Their 353,496µs median improves
99.27786053251514%, and `10 × median = 3,534,960 <= 48,951,209`.

The sole forecast-primary attempt then exited nonzero at the unchanged
2,400,000ms Vitest timeout. It wrote no JSON receipt. External timing was
`real 2766.15`, `user 1467.89`, `sys 62.55`; the frozen +10ms adjustment makes
primary alone 2,766,160ms, 726,160ms above the complete 2,040,000ms forecast
cap and 366,160ms above the final ceiling. Continuation was not executed, and
no boundary/residual/combined forecast was fabricated.

Sealed proof manifests:

- `/tmp/mbd-econ-late-horizon-perf-1-20260717-proof/comparison.json`, SHA-256
  `d735b36a05688ebb1539ee03d93f356bbb373eadc5bbc1570450065134949d86`;
- `/tmp/mbd-econ-late-horizon-perf-1-20260717-proof/forecast.json`, SHA-256
  `0789ba18dae53654df95913f4672bcfb8af39f6649bf6bb27f8895707473c617`;
- `/tmp/mbd-econ-late-horizon-perf-1-20260717-proof/provenance.json`, SHA-256
  `c3607cde180590608e89b843f338c77102f7e8edb476c5e6c68e50c73d5b6588`;
- forecast log SHA-256
  `d8b750d515868f3f8b47e64c49350bd29911185ccfd9187234d16e336e03723b`;
- forecast time SHA-256
  `1514401775a2dbc299c84a762f980b92561ad211b36bbfdbe4cec0873a9a037e`.

Final Sol independently rehashed 23 provenance artifacts and nine CPU profiles,
recomputed every standard/V8 result, and returned `BLOCK_CONFIRMED` with zero
actionable P0–P2. Host descheduling is visible in wall versus user time, but the
contract makes external wall authoritative and forbids retry. Production source
and test remain uncommitted/unlanded. Full root gates, final Goal 18, and item 19
did not start.

## Source corrections

1. Goal 29's season-16 target is not sufficient late-horizon evidence; the
   optimization inverted the bottleneck.
2. The failure occurred inside the season-30 primary operation, so the new
   profile input must be the exact state after row 29, not another season-15
   single-season sample.
3. Goal 18's permanent checkpoint set remains `[10, 15, 20, 30]`. The local
   season-29 artifact is diagnostic input only and must never enter its receipt.
4. A decomposed forecast can admit the final run but cannot replace the exact
   in-process 30+15 receipt.
5. UI, IndexedDB, save-session ownership, and player-facing behavior are outside
   this performance slice, so browser proof is not required. Build/PWA and
   exact v35 round-trip proof remain required.
6. The worker-core gzip bundle is exactly at its existing 147,456-byte ceiling.
   Any one-byte regression rejects the candidate; no threshold or chunk gaming.
7. The original callee target misses the frozen 25% gate and cannot be rounded
   or waived. The admitted single-module caller root is not permission to edit
   ceremony code, narrative policy, or another worker module.
