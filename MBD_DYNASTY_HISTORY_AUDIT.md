# MBD Dynasty History Audit

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Verdict

Status: YELLOW. Grade: B+.

MBD already has unusually strong browser-sim history infrastructure: season archive schema, moment generation, rivalries, career hub, achievements, records, news, press, and timeline surfaces. The main gap is continuity and depth across old saves and prospect-origin stories. Forward-looking history is strong; old saves migrate safely but sparsely.

## History Coverage

| Area | Evidence | Status | Audit call |
|---|---|---|---|
| League history | `/history`, `/records`, `/stats`, `/leaders`, `/standings` loaded in smoke. | GREEN | Strong route coverage. |
| Team history | Career/history/dashboard surfaces include team moments and retrospectives. | YELLOW | Needs deeper franchise timeline polish. |
| Player history | `sim.worker.queries.ts:1422-1530` builds player/team/playoff/rivalry memory beats. | GREEN | Good foundation. |
| Records | `/records` loaded; record watch exists. | GREEN | Strong. |
| Awards | `/achievements` and ceremony overlays exist; dirty-tree ceremony dismiss autosave test passed. | YELLOW | Browser reload smoke pending. |
| Hall of Fame | Not verified as a deep surfaced system in this pass. | YELLOW | Needs dedicated route/source proof before GOAT claim. |
| Retired numbers | Not verified as present in this pass. | YELLOW | Add if absent or document scope. |
| Rivalries | `/rivalries` loaded; runtime rivalry watch visible. | YELLOW | Needs origin context and long-run explanation. |
| Franchise timelines | `/history` and `/career` support timelines. | YELLOW | Old saves lack archived game links. |
| Career arcs | Career retrospectives/history systems exist. | YELLOW | Need prospect-origin-to-legend threading. |
| Prospect-to-legend storytelling | Minors/player/history systems can support it. | YELLOW | Origin/debut/call-up/trade/injury comeback arcs need explicit UI. |

## Save Safety And Archive Truth

| Finding | Evidence | Impact | Recommendation |
|---|---|---|---|
| v34 history archive migration is safe. | `packages/contracts/src/schemas/save.ts:2808-2828` initializes `archivedGames: []`; `save.migration.test.ts:340-349` enforces empty archives for Season 10 v33. | Old saves are not corrupted by fabricated games. | Keep this conservative behavior. |
| Old saves are sparse by design. | Same migration evidence. | Players reaching Year 30 from old saves cannot open old box scores for pre-v34 games. | Add in-game copy: "Archived game links begin after this save was upgraded." |
| Archived-game matching depends on compact references. | `sim.worker.queries.ts:1436-1452`, `1475-1489`, `3165-3170`. | Some beats may fail to link if references do not match. | Add diagnostics for unlinked history beats. |

## Emotional Memory Review

| Time horizon | Current memory support | Gap |
|---|---|---|
| Year 2 | Day One, first draft, first season records, news/press can persist. | Need clearer "what changed since last year" framing. |
| Year 5 | Career hub/history/rivalries can tell an era story. | CPU clubs need stronger identity to create rival narratives. |
| Year 10 | Records, awards, and archived games can matter. | Old-save archive limitations and sparse first-day story widgets need copy. |
| Year 25 | League history must become the product. | Need HOF/retired-number/franchise-timeline proof and polish. |
| Year 50 | Records and era summaries must be searchable and emotionally legible. | Need AI org identity and summarized eras, not just data tables. |
| Year 100 | World history must be compressed into memorable dynastic eras. | Add era pages, franchise lineage, legendary prospects, and league memory summaries. |

## Findings

| Severity | Finding | Evidence | Player impact | Technical impact | Next vertical slice |
|---|---|---|---|---|---|
| P2 | Old saves cannot backfill archived game links. | v33 to v34 migration creates empty archives. | Correct but disappointing for long saves. | Legacy data lacks box-score payload. | Add safe copy and optional non-fabricating enrichment from existing records. |
| P2 | History archive matching needs diagnostics. | `sim.worker.queries.ts:1436-1452`, `1475-1489`. | Missing links can make history feel inconsistent. | Matching logic is hard to validate without debug output. | Add tests/diagnostics for unlinked beats. |
| P2 | Ceremony dismiss autosave fix is present in dirty tree but needs browser reload validation. | `persistShellMutation` now runs after ceremony dismiss; focused tests and broad current-source gates passed. | Celebrations should no longer repeat if dirty changes land. | Release truth depends on reload validation and review. | Run browser reload smoke. |
| P3 | First-day "0 active story arcs" undercuts rich onboarding. | Runtime dashboard. | Story feels reset after onboarding. | Day One identity not counted as active arc. | Seed first-day story arc from onboarding identity. |
| P3 | Rivalry origin context is thin. | Runtime rivalry watch intensity 78. | Rivalry can feel pre-baked. | Rivalry DTO lacks explanation surface. | Add rivalry-origin summaries. |

## Recommended History Slices

1. Add legacy archive copy and safe old-save enrichment where existing data supports it.
2. Persist ceremony dismiss and press/news history changes.
3. Add prospect-origin timeline badges.
4. Add rivalry-origin context and era summaries.
5. Prove or build HOF/retired-number franchise memory surfaces before GOAT release.
