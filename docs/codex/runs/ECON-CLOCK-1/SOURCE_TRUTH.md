# ECON-CLOCK-1 — Source Truth

Recorded from the live checkout before Goal 11 production edits on 2026-07-12.

## Preflight

- Branch: `codex/econ-clock-options-9-10`.
- Branch base, current `HEAD`, and local `main` at branch creation:
  `2c07cc3eea4cfca1faef344e51b91818782b2da3`.
- Package manager: `pnpm@9.15.4`; commands come from the current package files.
- Save contract: `GameSnapshot` v34; `freeAgencyMarket` already persists as
  `z.unknown().nullable()` and no Goal 11 schema change is justified.
- Goal 11 completion report and Goal 11 browser evidence: absent at start.
- Prior browser receipts are item-8 receipts from this exact base. They do not
  exercise contract expiry, options, offseason market creation, or Goal 11
  reload behavior and are not Goal 11 acceptance evidence.
- Current unresolved behavior: no live path decrements
  `GeneratedPlayer.contract.years`. The existing `advanceContracts()` only
  advances the separate `ContractDetail.yearsRemaining` representation and is
  dead relative to canonical worker players. Free agency therefore receives
  natural expiries only when another path has already written `years: 0`.

### Protected unrelated work

These pre-existing user-owned files must remain untouched, unstaged, and outside
the Goal 11 commit:

| File | SHA-256 at Goal 11 start |
| --- | --- |
| `.agents/skills/mbd-implement-slice/SKILL.md` | `a1a6d903cf0da47f457578274da1e335e97eb947d1a6026da85706d88fe59ac3` |
| `AGENTS.md` | `1f181b5d16e1a8e64fe54ed113b9c9648a271d3b746d7ea907e9194712cfc163` |
| `docs/codex/PROGRAM.md` | `8a3c0cfd3686aa735d049ba473bf8da95168bc56a9eb7c2629fbe28a33817eb1` |

The index was empty at branch creation.

## Observed pre-edit baseline

All commands ran on the branch base before production edits:

- sim-core contracts/finance/free-agency/offseason/calibration: 6 files,
  74/74 tests passed;
- canonical worker/offseason rollover/balance: 3 files, 151/151 passed;
- Finance, Free Agency, and Offseason route surfaces: 3 files, 13/13 passed;
- contract migration matrix: 1 file, 24/24 passed.

Two temporary tests were created only to call the repository's real
`estimateSnapshotSize()` and were deleted immediately after observation:

- seed-1234 current new game: v34, season 1, 5,408 players,
  `freeAgencyMarket: null`, 6,635,695 estimated bytes;
- migrated `packages/contracts/tests/fixtures/save/v33/season10.json`: v34,
  season 10, one deliberately compact fixture player, `freeAgencyMarket: null`,
  5,614 estimated bytes.

## Canonical offseason sequence and chosen clock seam

The live sequence is:

1. `proceedToOffseason()` in `sim.worker.actions.ts` changes the phase from a
   completed playoff state to `offseason` but does not create offseason state.
2. The first mutating offseason command calls `advanceOffseasonOnce()` or
   `skipOffseasonPhaseWithAI()` in `sim.worker.helpers.ts`.
3. Both call `ensureOffseasonState()`, which creates the persisted
   `season_review` state exactly once when `offseasonState` is null.
4. The phase machine then runs arbitration, tender/non-tender, extensions,
   qualifying offers, and free agency in that order. Entering free agency
   resolves outstanding qualifying offers and invokes market simulation.
5. Only after every phase completes does `startNextSeason()` call
   `finalizeOffseasonRollover()`, which develops players, determines
   retirements, removes retirees, increments the season, resets offseason and
   market state, and backfills active rosters.

The selected seam is the null-to-live transition inside
`ensureOffseasonState()`, but the first Sol architecture pass found that it is
not yet authoritative: the draft-pick path near `sim.worker.helpers.ts:2505`
also creates `offseasonState` directly. Goal 11 must route every null-to-live
creator through one helper. That helper must immutably precompute players,
option outcomes, factual news/story flags, and the marker, then commit through
non-throwing assignments with `offseasonState` assigned last. Repeated calls
observe non-null state and do not advance again.

End-of-offseason rollover is rejected as the clock seam because it would make
the just-completed offseason process pre-advance values and defer the expiry by
one full offseason. `proceedToOffseason()` alone is also insufficient for
legacy/imported `phase: offseason, offseasonState: null` snapshots and direct
worker harness paths; centralizing in `ensureOffseasonState()` covers them.

## Every canonical `contract.years` writer

The pre-edit production scan covered `packages/contracts/src`,
`packages/sim-core/src`, and `apps/web/src/workers`.

| Writer class | Live path | Meaning |
| --- | --- | --- |
| Initial generated contracts | `packages/sim-core/src/player/generation.ts` | base minor contracts and seeded opening-day MLB contracts |
| International player conversion | `packages/sim-core/src/scouting/international.ts` | new minor contract construction |
| Accepted extension, pure core | `packages/sim-core/src/finance/contracts.ts` | replaces the canonical contract after accepted CPU extension |
| Accepted user extension | `apps/web/src/workers/sim.worker.helpers.ts` (`applyAcceptedExtensionToPlayer`) | replaces the canonical contract |
| Accepted qualifying offer | `packages/sim-core/src/roster/freeAgency.ts` (`resolveQualifyingOffer`) | one-year contract |
| AI free-agent signing | `apps/web/src/workers/sim.worker.helpers.ts` (`applyNewFreeAgencySignings`) | replaces the canonical contract |
| User free-agent signing | `apps/web/src/workers/sim.worker.actions.ts` (`makeContractOffer`) | replaces the canonical contract |
| Non-tender | `apps/web/src/workers/sim.worker.helpers.ts` (`applyTenderDecisionsOnce`) | releases assignment and writes `years: 0` |
| Arbitration floor | `apps/web/src/workers/sim.worker.helpers.ts` (`applyArbitrationResultsOnce`) | keeps an arbitration-controlled player at at least one year |
| Rule 5 floor | `apps/web/src/workers/sim.worker.helpers.ts` (`applyRule5SelectionToLeague`) | keeps a selected player at at least one year |

Other grep matches are types, DTO projection, free-agency market offer objects,
or test-only seeding. `apps/web/src/workers/sim.worker.integration.helpers.ts`
is a test harness writer. No unmapped production writer was found.

Goal 11 adds exactly one new writer class: the central offseason-entry contract
clock. All existing new-deal/floor writers remain downstream of it.

## Option semantics decision

The schema has only booleans for `playerOption` and `teamOption`; there is no
option year, option salary, decision season, or exercised marker. Opening-day
generation multiplies `annualSalary * years` for `totalValue`, independently
sets one option boolean, and leaves `optOutYears` empty. Free-agent and extension
paths can also set option booleans, but nothing proves whether the option year is
inside or outside `years`. Existing UI provides no user option-decision API.

Therefore player options and opt-outs are cut from Goal 11 behavior. Sol
approved only this bounded team-option interpretation: when decrementing a
one-year contract would reach zero, compare `calculatePlayerValue(player,
yearsOfService)` to the only persisted price, `annualSalary`. Equality or higher
exercises the one-year option and leaves `years: 1`; lower value declines to
zero. Either outcome consumes only `teamOption`; `playerOption`, `optOutYears`,
and `totalValue` remain unchanged. The rule is identical for user/CPU players
and consumes zero RNG.

## Natural expiry and retained minor leaguers

`shouldEnterFreeAgency()` admits every expired MLB player, but admits an expired
non-MLB player only at overall 340+, or age 29+ and overall 290+. Many generated
minor leaguers already begin at `years: 0`.

The source-compatible rule is:

- every non-retired player with positive years is visited once; a zero-year
  player remains byte- and ownership-identical;
- expired players remain assigned through arbitration, tenders, extensions,
  and qualifying offers;
- qualifying-offer eligibility moves from `years <= 1` to post-clock
  `years <= 0`, so an exercised team option cannot receive a QO;
- free-agency entry resolves QOs, captures the authoritative market while
  expired MLB players still satisfy the predicate, and only then releases the
  captured entrants and rebuilds affected roster states;
- an expired minor who meets the existing predicate enters the same market;
- a sub-threshold expired minor remains team-controlled at `years: 0`, is not
  duplicated or mutated by market construction, and remains subject to existing
  retirement, affiliate, Rule 5, and roster machinery.

Live draft and retirement rules make an asymptotic population bound impossible
to prove in a 6–10-season run: large draft cohorts are retained while players
younger than 32 do not retire. Kevin's 2026-07-12 oracle authorization replaces
that impossible clause with exact no-double-clock invariants and a finite,
multi-seed, multi-season study of total/minor/major/free-agent populations,
entrants, retirements/exits, expirations, half-window slopes, curvature, and
snapshot bytes. Explicit source-grounded bands are frozen in
`SOL_ARCHITECTURE_GATE.md`; farm pruning remains excluded.

## Every `freeAgencyMarket` writer

Canonical state writes are:

- setup initializes it to null;
- `ensureFreeAgencyMarket()` creates it lazily;
- `simulateFreeAgencyDays()` replaces it with each simulated day;
- `makeContractOffer()` currently creates a local market when null and installs
  it only after an accepted offer;
- `finalizeOffseasonRollover()` resets it to null;
- snapshot import restores the persisted value.

`getFreeAgents()` currently constructs a deterministic transient market when
canonical state is null. It does not write state, but it can present a market
that is not the market later persisted after intervening offseason mutations.

Goal 11 will make entry into the existing `free_agency` phase the only market
creation seam. The route query becomes read-only against canonical market state
and returns no premature market; user offers fail closed when no canonical
market exists. Entry must resolve QOs, capture entrants before release, release
only those entrants, rebuild affected rosters, and replace embedded market
player snapshots with their released canonical counterparts. Daily replacement,
snapshot import, and rollover reset remain valid lifecycle writes, not creation
seams. Imported non-null markets remain authoritative and must reconcile
idempotently; season/player mismatches fail closed.

## User decisions and roster legality

- `applyTenderDecisionsOnce()` explicitly skips the user team and there is no
  user tender/non-tender mutation API despite descriptive UI copy.
- The user has existing extension negotiation and qualifying-offer actions, but
  no option decision action or persisted decision model.
- Consequently all supported team options use the same automated rule for user
  and CPU clubs. A named identical-input symmetry test is mandatory.
- Existing user compliance is the Offseason command center's roster warnings
  plus the normal promotion/demotion/waiver/offer actions. The final rollover
  calls `autoFillMLBRoster()` for every team, including the user team. Goal 11
  adds no new enforcement surface.
- A direct seed-1234 new-game measurement found 32 teams, 28 MLB players per
  team, 84 entries per derived `fortyManRoster`, and all 32 teams over the
  nominal 40-player limit. This matches `buildRosterState()` including all MLB,
  AAA, and AA players while `autoFillMLBRoster()` only fills MLB shortages.
- Literal Day-One 26/40 legality is therefore impossible inside Goal 11's cut line and
  is already owned by Goal 12 / roadmap item 19. `docs/codex/PROGRAM.md` names
  Goal 12 as the owner of the permanent zero-violation generation gate, while
  `docs/codex/GOAT_ROADMAP_STATUS.md` records item 19 as pending because the
  live generator still produces 28 MLB players and an invalid derived 40-man
  shape; it also orders Goal 12 after Goal 11. Goal 11 can assert only that
  market entrants leave active/derived roster membership, ownership stays
  unique, and the slice creates no additional over-limit regression relative to
  the measured baseline. Kevin explicitly authorized that no-regression
  contract on 2026-07-12. Goal 12 retains sole ownership of legal 26/40 rosters,
  affiliate balance, initial minor contracts, zero-violation generation, and
  its permanent CI gate; Goal 11 must not implement even a partial repair.

## Persistence, determinism, and honest upgrade framing

- Players, option flags, offseason state, story flags, news, and
  `freeAgencyMarket` already round-trip in v34. No migration is needed.
- Existing persisted `storyFlags` can carry one stable
  `contract_clock_live`-style marker without schema change. The first actual
  clock activation may publish an honest upgrade beat; later offseasons must not
  repeat it. The beat must describe the clock becoming active and must not
  fabricate prior expiries or transactions.
- Option decisions consume zero RNG. Market behavior continues to use seeded
  `GameRNG`; no bare `Math.random()`, wall clock, UUID, or query-time RNG is
  permitted.
- Same-seed results will intentionally change after natural turnover. The
  determinism snapshot rebaseline must be explicit, reviewed, and justified.
- The named v33 season-10 fixture is intentionally compact: one player, no
  schedule games, and no roster states. It can prove migration, canonical
  worker import/export fixed point, and no fabricated history, but cannot prove
  full-league economic bands. Full-league economics require a deterministic
  current-schema 6–10-season soak. A dynamically downgraded full-league payload
  may prove additive v33 transport but is not authentic season-10 economic
  history and may not be described as such. The oracle authorization makes both
  receipts mandatory and separate: the authentic compact fixture proves
  migration/preservation plus one applicable Goal-11 rollover and save/reload;
  only a complete current-schema league proves economic bands.

## Evidence budget frozen before implementation

Focused proof must cover:

1. pure clock transitions, no-negative property, team-option value rule, zero
   RNG, and named user/CPU symmetry;
2. worker offseason-entry idempotence, release/market/QO/no-duplication paths,
   query purity, user-offer fail-closed behavior, and first-upgrade news once;
3. option/result and market snapshot round trips; the real compact v33
   season-10 fixture for supported migration, factual preservation, one
   applicable Goal-11 rollover, save/reload, and no fabrication; no full-league
   claim from that fixture;
4. deterministic current-schema 6–10 season worker soak across at least three
   seeds with expiry, roster churn, FA-market size, payroll spread, no
   Goal-11-caused roster regression, newly expired ineligible minors, duplicate
   ownership, total/minor/major/free-agent counts, entrants/exits, half-window
   slopes, curvature, snapshot bytes, and same-seed equality against the bands
   frozen by Sol;
5. permanent core/worker calibration bands and `TUNING.md` evidence;
6. Finance/Free Agency/Offseason presentation tests;
7. fresh production browser proof for a user option outcome and a user star
   entering free agency, each durably surviving hard reload;
8. root typecheck, full tests, production build/PWA, determinism verification,
   and current reload smoke.

No Goal 12 minor-contract work, arbitration redesign, qualifying-offer redesign,
revenue, attendance, tax, retained salary, trade identity, new route, or schema
work is owned by this slice.

## Sol architecture verdict

The actual pre-implementation relay is thread
`019f552e-4389-7501-8f16-a1256dcd1824`, `gpt-5.6-sol`, `xhigh`, read-only. It
first returned `REPLAN` with P0/P1/P2 = 0/5/0 and authorized no production editing.
Kevin's 2026-07-12 oracle decision resolved the three scope contradictions. The
same Sol thread then reviewed the 3-seed × 6-rollover current-source baseline
and returned `BANDS_FROZEN` plus `ARCHITECTURE_READY`, P0/P1/P2 = 0/0/0. The
exact bounded artifacts are [POPULATION_BASELINE.md](./POPULATION_BASELINE.md)
and [SOL_ARCHITECTURE_GATE.md](./SOL_ARCHITECTURE_GATE.md).

## Post-implementation source truth

The live Goal-11 clock materially changes population partitions: expiry release
moves assigned players into the unassigned market, so the old dead-clock linear
minor/MLB partition envelopes are not valid implementation gates. The complete
current-schema worker matrix passed 18 rollovers and froze absolute six-rollover
partition bands plus first-half/second-half/curvature gates. Total population
still uses the exact entrant/exit conservation equation and cumulative annual
net-growth envelope.

The full transition receipt SHA-256 is
`34f2d653f434c8235e18da9375f24d46145c72347d5f2ca94d2d30cbcc569c0e`.
It includes market cohort rows and exact roster checkpoints/causal rows; compact
console summaries do not replace its digest input. Observed market entry reached
961, invalidating the provisional 899 ceiling. Sol froze 1–1089 at entry and
0–1047 after phase, and approved matching diagnostic calibration evidence.

The measurement also found and then killed one real Goal-11-caused roster P1:
two FA admissions moved SFB from counterfactual 26 to final 28 at seed 7112
rollover 5. Shared user/CPU MLB-slot admission now prevents those exact rows.
Goal 12 still owns all baseline 26/40 repair; Goal 11 neither normalizes nor
claims legal Day-One rosters.

## Final Sol FIX_AND_REVIEW correction (2026-07-12)

- Null-to-live offseason creation is now admitted only while `phase ===
  'offseason'`. Worker advance/skip actions are exact `null` no-ops outside
  that phase; the draft fallback establishes the same receipt before any draft
  player, session, or roster mutation.
- A persisted FA market is canonical only when the complete available-plus-
  signed union is globally unique and structurally equal to the live canonical
  players. Available rows must be unassigned/null-contract rows; signed rows
  must name the canonical assigned team and match shared offer facts, including
  offer `playerId` and `teamId`. Imported JSON clones remain valid by value
  equality, not object identity.
- Option decisions remain persisted factual news and are projected into the
  existing offseason transaction ledger. Finance now plainly marks one-year
  rows as expiring after the season. At authoritative market capture, only a
  user-club player with `overallRating >= 400` and market value `>= 15` receives
  one deterministic, deduplicated expiry/departure beat.
- This correction adds persisted news, so digest
  `34f2d653f434c8235e18da9375f24d46145c72347d5f2ca94d2d30cbcc569c0e` is
  intentionally stale. Existing determinism snapshots did not cover this
  offseason path; the parent’s strict economy digest is the new Goal-11
  deterministic oracle and must be rerun after source freeze.
