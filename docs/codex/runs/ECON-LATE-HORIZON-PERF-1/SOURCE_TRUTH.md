# Current Source Truth — ECON-LATE-HORIZON-PERF-1

## Preflight

- Worktree: `/Users/kevin/Downloads/MBD-econ-late-horizon-perf-1`
- Branch: `codex/econ-late-horizon-perf-1`
- Base/HEAD before docs: `cd5e9191118aee76d22d66b7ffed32fed748cae8`
- Base tree: `0508ae6c6a6d21555607b5d3f9a649227b0762d8`
- Starting dirty state: clean; index empty.
- Local `main`: `cd5e9191118aee76d22d66b7ffed32fed748cae8`.
- `origin/main`: `8e24909c630a47cb71065c7bb1dd00619a5c8c38`.
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

This is direct quadratic source work and the conditional candidate, but the
failed log has no late-stage timestamps. Production editing remains gated on
an authenticated season-29 checkpoint and season-30 stage/CPU attribution.

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
