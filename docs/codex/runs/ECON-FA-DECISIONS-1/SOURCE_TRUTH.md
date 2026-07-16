# Current Source Truth — ECON-FA-DECISIONS-1

- Repository root: `/Users/kevin/Downloads/MBD-fa-decisions-16`
- Branch/worktree: `codex/fa-decisions-16`
- Commit: `7af6781d3672bb78c16702bb3321c4fcf0d89a07`
- Local `main`: `7af6781d3672bb78c16702bb3321c4fcf0d89a07`
- `origin/main`: `fd217dc57262cd104f4fc140cb6e6c571cfa9290`
- Dirty state before work: item-16 worktree clean. The separate main checkout has
  three protected, unstaged user files: `.agents/skills/mbd-implement-slice/SKILL.md`
  (`a1a6d903cf0da47f457578274da1e335e97eb947d1a6026da85706d88fe59ac3`),
  `AGENTS.md`
  (`1f181b5d16e1a8e64fe54ed113b9c9648a271d3b746d7ea907e9194712cfc163`),
  and `docs/codex/PROGRAM.md`
  (`8a3c0cfd3686aa735d049ba473bf8da95168bc56a9eb7c2629fbe28a33817eb1`).
  These are the live SHA-256 values recorded at closeout; earlier abbreviated
  handoff hashes used an unknown recipe and are not treated as evidence.
- Package manager/runtime: root declares `pnpm@9.15.4`; live package-local
  binaries were used. No dependency install or manifest change is required.
- Relevant package scripts: root `typecheck`, `test`, `build`, `verify:determinism`,
  `test:reload-smoke`, and bundle/PWA verification are read from live
  `package.json`; focused Vitest and package TypeScript binaries are present.
- Current save version: GameSnapshot v34; Dexie v6.
- Existing feature flags relevant to the slice: none. Free agency is an existing
  offseason phase and `/free-agency` plus Press Room are existing routes.
- Completion report before work: none. Goal 26 and the run did not exist.
- Prior browser evidence: item-15 browser receipts are from the item-15 revision
  and are not authoritative for item 16.
- Baseline command results on the exact base:
  - sim-core `freeAgency` + `marketIntelligence`: 2 files / 32 tests passed;
    sim-core typecheck passed;
  - focused web free-agency/exact-save/worker set: 12 files / 238 tests passed;
    web and e2e typecheck passed;
  - independent read-only mapping additionally observed sim-core 4 files / 42
    tests, FA UI 9 files / 32 tests, selected worker FA 14 tests, exact-save 14
    tests, selected snapshot 4 tests, and contracts migration 24 tests green;
  - worktree `git diff --check` clean.

## Real source seams

| Concern | Actual path/symbol | Current behavior | Test coverage |
|---|---|---|---|
| Pure market choice | `packages/sim-core/src/roster/freeAgency.ts` `offerAppealScore`, `simulateFADay`, `makeUserOffer` | CPU ranks AAV + tiny years + opaque appeal; user uses a separate 76–80% threshold | Basic market/chemistry/determinism tests; no shared factor model |
| Age | `calculateMarketValue`, `projectContractYears` | Age changes valuation and generated term, not the final preference weights | One average-term test; no decision-boundary proof |
| Projected role | `evaluateTeamNeeds`; offer UI/types | Team need shapes CPU bids; no role input, promise, or explanation authority exists | No authoritative role test |
| Contender facts | `seasonState.standings`, `playoffBracket` | Factual results exist; current player choice instead receives a scalar and CPU archetype can consume hidden potential | No factual contender-choice twin |
| Loyalty facts | player `teamTenures`; `playerOrigins`; `prospectBonds`; `getLoyaltyAdjustedAppeal` | Homegrown bond is folded into the scalar; accumulated tenure is ignored | Bond arithmetic only; no signing-source proof |
| Clubhouse appeal | `apps/web/src/workers/sim.worker.budget.ts` `getTeamFreeAgencyAppealScore` | Chemistry/reputation are mixed with user-only fan and GM-spending modifiers | No symmetry negative control |
| CPU integration | `sim.worker.helpers.ts` `simulateFreeAgencyDays`, `applyNewFreeAgencySignings` | Offer callbacks retain no decision artifact; AI news is generic | Worker market/placement/QO tests; no reason correspondence |
| User integration | `sim.worker.actions.ts` `makeContractOffer` | Difficulty-adjusted AAV is evaluated but the original AAV is persisted; special reason news is later deduped away | Exact signing/reload tests; no evaluated/persisted equality |
| Consequences/news | `narrative/consequences.ts`, `narrative/newsFeed.ts`, worker consequences | Generic signing news wins dedupe; morale asserts a nonexistent "clear role" | Generic signing tests only |
| Exact save | `useExactOffseasonMutationExecutor`, exact mutation coordinator | Strong retained-snapshot/durable-publish contract already exists | Generic retry/fencing coverage and real signing reload journey |
| Offer UX | `features/free-agency/**` | Shows player/terms/budget/QO; accepted copy omits worker reason | Mocked component/hook tests only |
| Press Room | `sim.worker.pressRoom.ts` and existing route | Correctly projects persisted news body; cannot recover a missing decision reason | Press projection tests, not FA explanation reload |
| Compatibility | `contracts/save.ts`, `snapshot.ts` | v34/v6; runtime market/offseason are unknown-compatible; no decision history | Supported-version and compact-v33 coverage |

## Handoff corrections

| Old assumption | Live finding | Effect on plan |
|---|---|---|
| Goal 08's FA fit/reason work may already satisfy item 16 | It changes CPU bid posture but does not create a player-side decision authority | Add a bounded shared evaluator; do not reopen broad org identity |
| Existing clubhouse reason reaches Press Room | A later priority-2 generic signing item wins the dedupe key | Produce one authoritative enriched signing item |
| A "clear role" already exists | No offer, contract, lineup, or usage fact supports it | Remove the assertion; use current-roster projected opportunity only |
| Current scalar is symmetric | It includes user-only fan and GM spending modifiers | Restrict player choice to chemistry/reputation shared by all clubs |
| User signs the salary the player evaluated | Difficulty silently changes evaluation AAV but not persisted AAV | Evaluate the literal persisted offer |
| Same seed proves ordering | Team-map iteration assigns RNG draws and ties lack team-ID fallback | Sort generation inputs and final decisions explicitly |
| Market Intelligence can own explanation | It has separate projections and synthetic `needsPosition: true` facts | Keep it outside authority and out of this bounded slice |
| A persisted structured decision needs a save bump | Existing news body can durably preserve the factual explanation | Keep structured evaluation transient; add no schema field or backfill |

## Dependencies and blockers

- Items 9–15 are present on the base and supply contract clock, options,
  arbitration, qualifying offers, extension AI, payroll pressure, and settled
  budgets.
- Item 28 owns persistent playing-time promises; item 49 owns unified durable
  organization identity; item 55 owns broad difficulty redesign. Goal 16 may
  enforce symmetry at its decision boundary but may not claim those items.
- No live source contradiction remains after interpreting "role promise" as a
  factual projected MLB opportunity. Production work may proceed.

## Implemented source truth

- `packages/sim-core/src/roster/freeAgencyDecision.ts` is the pure competitive
  decision authority. It owns the age-stage weights, raw contribution ranking,
  90% floor, stable ordering, exact reason contract, and the canonical 1–10 year
  validity fence. It consumes no RNG.
- CPU and user competitive paths both call that evaluator. CPU offer generation
  is team-ID stable; accepted repricing updates AAV, total value, and signing
  bonus coherently. The forced market-exhausted lane remains explicitly separate
  and fixed at one year.
- `sim.worker.freeAgencyDecision.ts` derives projected MLB opportunity from the
  current roster, contender status from completed facts, loyalty from persisted
  tenure/origin bond, and clubhouse appeal from the same chemistry/reputation
  inputs for user and CPU clubs. Hidden potential, difficulty, user identity,
  fan sentiment, and GM spending philosophy do not enter the player decision.
- User acceptance remains behind canonical market, roster-slot, QO, and exact
  mutation checks. Rejected and invalid offers return unchanged, so exact-save
  capture and durable presentation do not begin. Accepted results publish only
  after the retained post-mutation snapshot is durable.
- Import-time market-player rebinding occurs only when the independently
  persisted player and market row are deeply value-equal. Divergent corrupt
  rows remain detached and fail the canonical-market gate instead of being
  silently normalized.
- One reason-bearing signing news item is the durable artifact for a new user or
  CPU decision. Existing old-save history is neither rewritten nor backfilled;
  compact v33 proves a new post-migration decision can save and reload.
- The existing Free Agency and Press Room routes gained bounded accessible
  presentation only. There is no new route, dependency, save field, save-version
  bump, playing-time promise, item-17 asset, or item-18 soak claim.

## Final evidence receipts

- Focused feature receipts before the final correction: sim-core 48/48, web
  273/273, supported migration matrix 24/24, and route/lazy-shell/bundle budget
  15/15.
- Final max-term correction receipts: sim-core 41/41 and worker 194/194.
- Root typecheck: 9/9 tasks. Full root tests: sim-core 1,709/1,709; web 2,434
  passed with nine intentional skips; contracts 24/24; UI 1/1.
- Determinism: 3/3. Production build: 3,033 modules; PWA precache 167 entries /
  4,092.09 KiB; Free Agency route 20.34 KiB / 6.02 KiB gzip.
- Production Chromium: Goal-16 journey 1/1 in 11.2 seconds; reload-smoke 2/2 in
  4.7 minutes. Both used one worker, zero retries, and no flaky result.
- Four-seed/four-season exact replay digests:
  - seed 7601: `40a6ee157a603e052fe4c17734e9b758664d4dcfc6f329f3e1f08c363c2f384a`;
  - seed 7602: `dd7d374a7e90ddde1f8301591f5849f394a894fdeaeb2130d81ba0a89fb322bb`;
  - seed 7603: `7bd3443c2a5af4191336aca614ad073e13258dc10bfee93347a89a4c8d486e16`;
  - seed 7604: `cf38d1cac68b4c3088e9b772a721f65331785db9e55f54343302013657d437af`.
  All 16 literal rows stayed inside market 450–1,089, signings 21–58,
  meaningful signings 21–57, top AAV $20M–$45M, and payroll spread $25M–$350M,
  with zero coverage, fact, legality, affordability, capacity, or tuple errors.
- The deliberate negative control zeroed nonfinancial weights and failed 4 of 11
  evaluator assertions. Correct behavior was restored before the green gates.
- Final swarm correction digest
  `de49693e168691626525120e484f141f33461d4a6c33093e7077707924974f0d`
  received `MERGE_READY`, P0/P1/P2/P3 all zero. The host could not pin or verify
  model/effort; `gpt-5.6-sol/xhigh` is the requested route label, not a verified
  runtime identity.
