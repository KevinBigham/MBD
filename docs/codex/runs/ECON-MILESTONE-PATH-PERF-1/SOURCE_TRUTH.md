# Source Truth — ECON-MILESTONE-PATH-PERF-1

Status: `DOCS_FIRST`.

## Preflight

- Worktree: `/Users/kevin/.codex/worktrees/5616/MBD-main-main`.
- Branch: `codex/econ-milestone-path-perf-1` from clean
  `main@ace5068f0f49a1195c2937461fe8ad7f04d8d3d8`; `origin/main` resolves to
  the same revision.
- Initial status was clean and detached at that revision. The protected main
  worktree and Goal-30 failed worktree are not this worktree and are untouched.
- Package manager: `pnpm@9.15.4`. Root scripts are recorded in `PLAN.md`.
- `CURRENT_GAME_SNAPSHOT_VERSION` is 35 in
  `packages/contracts/src/schemas/save.ts`; `saveSystem.ts` defines Dexie
  version 6. Neither is in scope.
- Sealed clean-main SHA-256 values match the Sol route: milestones
  `ac7a6fe97118096f81fb650e2ba50d15235a25a7524bc4807d498e6784f7e31b`,
  ceremony `b09aeb2f6566a20d1b4abba11d798fb5936a6dd93a4392d9bcaa49e746a44125`,
  and `newsFeed.ts` `a6f66ec5027a68ac624d9bdea9bdb5d4aaa4a800ff8a8b7af224270eeab4144c`.

## Live seams

- `buildCareerMilestoneEvents` builds the cumulative map, passes the complete
  player array to `checkMilestones`, then performs a second `state.players.find`
  per returned moment.
- `queueCareerMilestoneMoments` repeats that complete-array canonical call and
  a `state.players.find` per returned moment before user-team queueing.
- `checkMilestones` remains the canonical sim-core authority. It is forbidden
  to edit it or to duplicate its policy. Its player array is used only for
  resolved display names, so an empty-player eligibility probe is valid.
- Neither adjacent test file exists on clean main. This goal creates the two
  allowed tests rather than widening a shared integration test seam.

## Retained evidence identity

The Sol route authenticates season-15 raw SHA-256
`260594ec24b4f0846835343f7c96bc835a6b2e68909dcc531759cbd44a63516f` and
season-29 raw SHA-256
`a29f2e5df30284cdb5358ac3aa758b6d6c3bf9615e789214de1183ec67079360`.
Goal-30 comparison/forecast/provenance hashes are respectively
`d735b36a05688ebb1539ee03d93f356bbb373eadc5bbc1570450065134949d86`,
`0789ba18dae53654df95913f4672bcfb8af39f6649bf6bb27f8895707473c617`, and
`c3607cde180590608e89b843f338c77102f7e8edb476c5e6c68e50c73d5b6588`.

## Corrections and stop conditions

- Goal 28 has no standalone file under `docs/codex/goals`; Goal 29 defines it
  as the dependent item-18 soak. This is recorded rather than fabricated.
- The historical Goal-30 source/test files are absent here and must not be
  copied from its dirty worktree.
- Stop on provenance/source mismatch, semantic/RNG/save/history drift, need for
  a third production module, failed negative control, bundle growth, any band
  miss, forecast miss, or a third correction loop.
