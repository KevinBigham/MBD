# ECON-ARBITRATION-1 — Service-Time Arbitration Drama

## Objective

Finish TRUE GOAT roadmap item 11 by turning the existing automatic arbitration
calculation into one deterministic, save-safe offseason story: eligible players
file, the club and player exchange figures, and a hearing produces one durable
award. Fix the live service-time authority and persistence defects required to
make that loop true. Do not begin roadmap item 12 or redesign contracts,
qualifying offers, extensions, budgets, revenue, trades, or Day-One rosters.

## Live-source contract

- GameSnapshot remains v34. Existing player arbitration fields and the
  serialized `offseasonState` envelope are sufficient; no schema bump is
  expected.
- `serviceTimeDays` is the canonical MLB-service fact. The legacy years map is
  a synchronized derived mirror, never an independent eligibility authority.
- One service year is 172 credited days. Only actual MLB roster days accrue;
  organization assignment or minor-league time cannot create MLB service.
- Standard arbitration covers completed service years 3–5. A two-year player
  qualifies only through the deterministic active MLB Super Two cohort. Six
  completed years belongs to the free-agent seam and must never be floored back
  into arbitration control.
- Hearings remain automatic and mechanically identical for user and CPU clubs.
  This slice adds visibility, not an unowned interactive filing policy.
- The worker is canonical and Zustand is a UI mirror. Offseason presentation
  may publish only after the exact post-mutation snapshot is durable.

## Required behavior

1. At the canonical once-only offseason-entry seam, reconcile the just-completed
   season's MLB service and synchronize the years mirror before arbitration
   eligibility is constructed. Reload/re-entry cannot accrue twice.
2. Build a typed arbitration docket once in stable team/player order. Persist
   the exact case, award, winner, and bounded consequence facts so reload,
   retry, import, or resume cannot reroll or consume another RNG draw.
3. The seven-day phase visibly progresses through filing, figure exchange, and
   hearing/award beats. Older or mid-offseason saves without a docket normalize
   honestly; they may prepare the current decision once but must not fabricate
   past public beats.
4. Every award is at least the player's prior salary, has one contract year,
   and keeps `annualSalary` and `totalValue` consistent.
5. One hearing creates exactly one current-season history row, phase result,
   ticker entry, factual news item, and qualifying moment set. Ledger winner
   copy must match `teamWon`.
6. Super Two ranking excludes free agents, unassigned, inactive, and
   minor-league players. Equal service facts break ties by stable player ID.
7. A post-hearing holdout consequence may occur only from an adverse club-win
   outcome under the accepted low-morale rule. It is reported as a bounded
   same-offseason settlement delay and resolves by spring training/start of the
   next season; it may not claim an active year-long absence or apply its
   service penalty twice.
8. Automatic copy is neutral for the user club; it must not attribute invented
   first-person choices or quotes to the player.
9. Offseason Advance/Skip executes as one exact-save session: capture baseline,
   mutate once, capture the exact post snapshot, wait for its durable receipt,
   then publish. A pre-acceptance failure restores the exact baseline or fails
   closed. An accepted failed write retries only the retained post snapshot and
   leaves all mutation/export lanes fenced until coherent.
10. Swapping only `userTeamId` cannot change league cases, awards, or RNG state.
    Same seed/input produces byte-equivalent docket and results; no bare
    `Math.random()` is permitted.
11. The existing `/offseason` route shows a readable arbitration docket on
    desktop and 375×667 mobile. Status cannot rely on color alone; controls stay
    keyboard reachable and non-occluding.
12. No unrelated gameplay, save schema, product behavior, or roadmap item is
    changed.

## Acceptance matrix

| ID | Acceptance | Required proof |
| --- | --- | --- |
| ARB-1 | Exact MLB service authority and 2/3/5/6 boundaries | pure finance + worker tests; contradictory-map negative control |
| ARB-2 | Active-only deterministic Super Two cohort | pure tests with FA/unassigned/minors exclusions and stable ties |
| ARB-3 | Monotonic salary curve and consistent one-year award facts | finance + worker/profile projection tests |
| ARB-4 | Persisted file → exchange → hearing docket | worker tests with hard reload/import at every beat |
| ARB-5 | Once-only result and RNG identity | worker re-entry/retry/import tests plus deliberate fence-removal negative control |
| ARB-6 | Named user/CPU symmetry | same state with only `userTeamId` swapped |
| ARB-7 | Exact-save mutation/persistence boundary | coordinator/hook tests for held receipt, export rollback, failed-write retry, stale callback, and global mutation disable |
| ARB-8 | Same-offseason factual holdout closure | worker + moment/news tests |
| ARB-9 | Honest compatibility | current v34 round-trip; pre-arbitration-history fixture; missing-docket mid-offseason normalization |
| ARB-10 | Truthful accessible UX | component/route tests and desktop/mobile production browser inspection |
| ARB-11 | Production journey | fresh build: filing → reload → exchange → reload → hearing → durable award → reload, zero retries/flakes |
| ARB-12 | Repository safety | affected typecheck, root typecheck, full tests, production PWA build, determinism, reload-smoke, scoped diff/commit |

## Negative controls

At least one deliberate regression must be observed failing and restored before
closeout. Preferred controls are: bypass the resolved-player/docket receipt and
observe duplicate/rerolled results; bypass the exact-save session and observe a
second Advance admission; or remove the prior-salary floor and observe a pay-cut
case.

## Scope cut line

No interactive salary filings; no qualifying-offer or draft-compensation work;
no extension AI; no revenue, payroll-pressure, luxury-tax, salary-retention, or
trade expansion; no Day-One roster generation; no new route; no schema bump;
no regular-season WAL redesign. Stop and re-plan if any is required.

## Done

The service clock is coherent, the persisted docket tells an honest automatic
filing/exchange/hearing story, each award and consequence applies exactly once,
offseason mutation stays fenced until its exact save is durable, compatibility
and determinism remain intact, production reload proof passes, adversarial
review has zero P0–P2 findings, and only this slice is committed and landed on
local `main`.
