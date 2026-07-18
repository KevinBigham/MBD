# MBD Codex Program

Each row is a separate worktree/branch and a separate `/goal`. Do not collapse the table into one undifferentiated goal statement — work the rows in dependency order, one `/goal` per row, continuing to the next independent row in the same run once the current row lands cleanly. Respect the `Depends on` and `Parallel notes` columns; goals flagged as conflicting (e.g. 11 and 12 re-baseline the same calibration bands) must still not run concurrently.

| Order | Goal | Outcome | Depends on | Parallel notes |
|---:|---|---|---|---|
| 1 | `01_TRUST_A.md` | Exact snapshot persistence, truthful save state, reload proof | none | first and blocking |
| 2 | `02_MEMORY_0_EVENT_SPINE.md` | One factual event owner, deterministic IDs, honest coverage | TRUST-A | schema branch |
| 3 | `03_PROSPECT_1_FIRST_HOMEGROWN_STAR.md` | draft/sign -> commitment -> promotion/debut -> timeline | MEMORY-0 + TRUST-A | marquee vertical slice |
| 4 | `04_ORG_DRAFT_1.md` | fair, bounded CPU draft identity | TRUST-A | can be researched while 2/3 run; merge independently after trust |
| 5 | `05_TRUST_QUICK_WINS.md` | isolated clarity/trust fixes | TRUST-A | may run parallel in separate worktree |
| 6 | `06_ORG_DEV_1.md` | CPU development choices reflect identity without bonuses | ORG-DRAFT-1 | one domain only |
| 7 | `07_ORG_TRADE_1.md` | trade targets/valuations reflect identity within fairness floors | ORG-DRAFT-1 | separate from development |
| 8 | `08_ORG_MARKET_1.md` | FA/payroll choices reflect identity within real budgets | ORG-DRAFT-1 | separate from trade |
| 9 | `09_MEMORY_ERAS_1.md` | eras and rivalry origins derived from factual events | MEMORY-0 | no new stored truth |
| 10 | `10_OLDSAVE_MINORS_1.md` | opt-in enrichment preserving every existing player | TRUST-A + MEMORY-0 | highest data risk; last |
| 11 | `11_ECON_CLOCK_1.md` | contracts tick and expire; FA market fed by real turnover; symmetric option resolution | TRUST-A | must merge before `08_ORG_MARKET_1` and before `07_ORG_TRADE_1` freezes soak baselines — both tune against the market this goal makes real; owns the new FA-market-size/expiry/payroll calibration bands; changes same-seed outcomes by declared policy (determinism re-baseline) |
| 12 | `12_DAY_ONE_ROSTERS_1.md` | Day 1 legal 26/40-man rosters, balanced affiliates, journeyman AAA vets, guaranteed hidden gems, optimized org depth at new-game | TRUST-A | new-game generation only; must agree minors contract-years semantics with `11_ECON_CLOCK_1` and declare merge order — both move calibration bands and the determinism snapshot, so they must not re-baseline concurrently (second to merge re-runs calibration on top of the first); should merge before `10_OLDSAVE_MINORS_1` so old-save enrichment inherits balanced shapes; touches `generation.ts` templates + `minorLeagueContent.ts` materializer together; owns the permanent zero-violation generation gate |

## Merge gates

Before merging a goal:

1. Active goal acceptance matrix complete.
2. Targeted tests pass.
3. Full repository typecheck/test/build/determinism equivalents pass.
4. Browser/reload checks pass where applicable.
5. `$mbd-review-slice` or `/review` finds no unresolved blocking issue.
6. `COMPLETION.md` maps requirements to source and proof.

## Release checkpoints

### Checkpoint A — Trustworthy early release

TRUST-A complete, selected TRUST-QW items complete, full gates green, manual desktop/mobile/PWA reload pass.

### Checkpoint B — Product promise proven

MEMORY-0 and PROSPECT-1 complete. A player can follow one homegrown prospect through a persistent origin-to-debut story.

### Checkpoint C — Long-save differentiation

ORG-DRAFT-1 plus at least one of ORG-DEV/TRADE/MARKET, with multi-season deterministic soak evidence.

### Checkpoint D — Dynasty memory depth

MEMORY-ERAS-1 complete; old-save limitations remain honest.

## Worktree strategy

- One editing agent/worktree per goal.
- Read-only subagents may explore source, tests, and risks in parallel.
- Do not have multiple agents edit overlapping worker/schema files concurrently.
- Quick wins may run parallel only when they touch disjoint files and merge after rebasing on TRUST-A.
