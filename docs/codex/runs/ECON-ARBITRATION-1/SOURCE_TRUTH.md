# ECON-ARBITRATION-1 — Source Truth

## Preflight

- Worktree: `/Users/kevin/Downloads/MBD-arbitration-11`
- Branch: `codex/arbitration-drama-11`
- Base/HEAD/local `main`: `fd217dc57262cd104f4fc140cb6e6c571cfa9290`
- Package manager: `pnpm@9.15.4` declared at the root. In the linked worktree,
  package-local Vitest binaries are authoritative because the desktop pnpm
  wrapper attempted a pnpm-11 install before running code.
- GameSnapshot: v34. Dexie operational schema: v6.
- Initial slice worktree: clean. The main checkout's pre-existing user-owned
  changes to `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and
  `docs/codex/PROGRAM.md` are protected and outside this worktree/commit.
- Completion report at preflight: absent.

## Baseline receipts

- sim-core arbitration/contracts/offseason/holdout: 5 files, 59/59 passed.
- web worker/snapshot/offseason route/hook/action/ledger/command-center: 8 files,
  203/203 passed.
- These tests prove the historical partial feature is green, not that roadmap
  item 11 is complete.

## Existing implementation

- `packages/sim-core/src/finance/contracts.ts` already generates cases,
  resolves hearings, evaluates holdouts, ranks Super Two, and selects eligible
  players.
- `apps/web/src/workers/sim.worker.helpers.ts` resolves the whole league only
  when arbitration exits into tender/non-tender. Case creation and hearing are
  one invisible pass; no persisted filing or exchange docket exists.
- v34 already persists arbitration history, holdout state, Super Two flags,
  service-time days/map, RNG state, and `offseasonState` through a permissive
  serialized envelope.
- The existing route has only generic Advance/Skip copy and no arbitration
  panel.

## Confirmed defects

1. `serviceTimeDays` accrues MLB days, while the years map increments later at
   rollover for every assigned player. Eligibility prefers the map, Super Two
   uses days, and arbitration occurs before the map increment.
2. Finance admits service years 3–6 while tender logic owns 3–5. A year-six
   player can receive a one-year floor instead of reaching free agency.
3. Super Two's cohort includes players who are not active assigned MLB players.
4. A generated award can be below prior salary; award mutation leaves optional
   `totalValue` stale.
5. Ledger winner copy is inverted when the player wins.
6. Holdout service is deducted immediately, while copy/state imply an active
   holdout until the next annual arbitration cycle.
7. Automatic prose can attribute invented first-person GM speech to the user.
8. Offseason worker mutation and autosave are separate sessions. After a write
   failure, local presentation is withheld but the worker remains mutated and
   another Advance can run instead of retrying the retained snapshot.

## Architecture decision

- Keep v34 and add typed docket data inside `OffseasonState.phaseResults` (or an
  adjacent typed offseason field) with normalization for missing legacy data.
- Make `serviceTimeDays` authoritative and synchronize the years mirror from it
  at the once-only offseason-entry seam. Never infer MLB service from org
  assignment.
- Precompute the deterministic docket and all stochastic outcomes once in
  stable order, persist them, reveal beats by phase day, and commit the stored
  result once at hearing/phase exit.
- Add a bounded exact-save offseason coordinator, separate from the roadmap-item
  8 regular-season WAL: hold one exclusive worker session from baseline export
  through mutation, exact post capture, persistence retry, and durable publish.

## Boundaries

Roadmap item 12 and later economy work remain untouched. No schema migration,
new route, new dependency, interactive filing policy, Day-One roster repair, or
regular-season journal change is authorized.

## Source discoveries after architecture freeze

Adversarial implementation review found three persistence boundaries that were
not visible in the historical arbitration code:

1. An ordinary autosave accepted before arbitration admission could still be in
   flight and overwrite the exact post-arbitration snapshot. The final design
   therefore acquires an exact-save persistence lease, drains an already
   accepted write, blocks new ordinary capture, and retains receipt provenance
   until the exact frozen post snapshot is durable.
2. A worker-session finish callback could re-enter finish before the session was
   reserved and release the worker fence. Finish now reserves the exact session
   before invoking the callback; callback failure keeps the worker fenced.
3. The exact coordinator previously accepted a caller-provided slot mirror,
   which could alias a branch save to its root slot. The mirror is now derived
   from the resolved target and is `null` for branch saves; persistence retains
   both exact save ID and root ownership identity.

These corrections do not change GameSnapshot or Dexie schema. They tighten the
existing exact-save and worker-authority contracts for the offseason lane.

## Final source truth

- MLB service days are canonical, one completed year is 172 days, and the legacy
  years map is synchronized from days at the once-only offseason seam.
- Ordinary arbitration covers service years 3–5. Super Two is the stable top
  22% of active, assigned MLB two-year players; inactive, minor-league,
  unassigned, and free-agent players are excluded.
- The persisted docket is prepared once in stable team/player order, including
  the retained award, winner, and bounded holdout facts. Filing, exchange,
  hearing, and award are distinct durable phase-day presentations.
- Offseason Advance/Skip owns one exact worker session and one exact persistence
  lease from baseline export through durable post-snapshot publication. Accepted
  persistence failure retries only the frozen post snapshot and fails closed.
- The route adds a bounded docket panel only. No route, dependency, save schema,
  interactive filing policy, or roadmap-item-12 behavior was added.
