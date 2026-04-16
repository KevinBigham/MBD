# Reliability And Calibration Gates

## Purpose

MBD now has two different regression signals:

- Determinism gate: the same seed and inputs produce the same sim state.
- Calibration gate: season outputs stay plausibly baseball-shaped.

Neither gate is a gameplay feature. They protect future feature work from accidentally changing core simulation behavior.

## Determinism Policy

The determinism snapshot in `packages/sim-core/tests/determinism.snapshot.test.ts` hashes a fixed seeded sim run.

Update the hash only when a commit intentionally changes simulation behavior. The commit message or PR summary must say why the deterministic state changed and which gameplay model changed.

Do not update the snapshot for refactors, UI changes, worker plumbing, save/load changes, or dependency cleanup.

## Calibration Policy

The season calibration harness runs full regular seasons from a seed and summarizes league-level metrics:

- schedule completion and wins/losses
- average runs per game
- win distribution
- MLB payroll and salary aggregates
- basic league batting rates

Calibration thresholds start wide. They are regression guards, not final tuning targets.

If a metric fails because the current sim is outside the desired band, do not tune gameplay inside unrelated work. Encode the current baseline, document the gap, and create a follow-up tuning task.

Current follow-ups exposed by the first calibration slice:

- Schedule generation produces an average of `110.75` wins per team for seed `44001`, not the MLB-like `81` target.
- Average total MLB payroll sits in the `7000-7300` range for seed `44001`, above the initial `3800-6800` balance band.

## Quality Scripts

Run these from the repo root:

```bash
npx pnpm run verify:determinism
npx pnpm run verify:quality
```

`verify:quality` includes report-oriented checks:

- `verify:structure` runs `knip --no-exit-code`.
- `verify:cycles` runs `madge --circular` and reports accepted cycles without failing.
- `verify:determinism` remains a hard pass/fail check.

The structure and cycle checks are intentionally not part of root `verify` yet. They still report protected or accepted findings.

## Protected False Positives

Do not delete or rewrite these only because an audit tool reports them:

- save migration schemas and historical `GameSnapshotV*` types in `packages/contracts/src/schemas/save.ts`
- public barrel exports that exist for project API stability
- type-only cycles stripped by `verbatimModuleSyntax`
- worker chunk topology warnings already accepted during Day One certification

Treat audit output as a review queue until these known findings are either resolved or explicitly allow-listed.
