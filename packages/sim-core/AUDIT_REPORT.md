## math
### Files Reviewed: 3
### Bugs Found: 0
### Tests Added: 0

#### Clean
- `src/math/index.ts`
- `src/math/log5.ts`
- `src/math/prng.ts`

## player
### Files Reviewed: 16
### Bugs Found: 2 (P0: 1, P2: 1)
### Tests Added: 2

#### P0 — Determinism / Correctness
- `src/player/breakouts.ts:38` `detectProspectBreakouts()` sorted only by `delta`, so tied breakouts inherited caller input order and could reshuffle identical prospect-watch results. Proof added in `tests/narrativeState.test.ts`; fixed by adding a deterministic `playerId` tie-breaker.

#### P2 — Type Safety / Code Quality
- `src/player/coachingChemistry.ts:148` and `src/player/coachingChemistry.ts:152` normalized relationship keys with bare `.sort()` calls. Current IDs are ASCII, so behavior was stable in practice, but the code violated the audit rule that every sort must declare its comparator. Proof added in `tests/coachingChemistry.test.ts`; fixed with explicit `localeCompare` comparators.

#### Clean
- `src/player/attributes.ts`
- `src/player/breakoutEngine.ts`
- `src/player/coaching.ts`
- `src/player/comparison.ts`
- `src/player/development.ts`
- `src/player/developmentPipeline.ts`
- `src/player/developmentSetbacks.ts`
- `src/player/generation.ts`
- `src/player/index.ts`
- `src/player/injury.ts`
- `src/player/mentorship.ts`
- `src/player/personalityTraits.ts`
- `src/player/prospectBonds.ts`
- `src/player/similarity.ts`

## sim
### Files Reviewed: 8
### Bugs Found: 2 (P0: 1, P1: 1)
### Tests Added: 2

#### P0 — Determinism / Correctness
- `src/sim/playoffSimulator.ts:271` and `src/sim/playoffSimulator.ts:551` depleted-roster forfeits always advanced the higher seed and only by a 1-0 scoreline, even when the lower seed could still field a lineup. Proof added in `tests/playoffs.test.ts`; fixed by checking which team can field a lineup and awarding the full clinching win total.

#### P1 — Edge Case / Crash Risk
- `src/sim/seasonSimulator.ts:39` and `src/sim/seasonSimulator.ts:126` `simulateDay()` mutated the supplied `SeasonState` through shared standings and player stat objects, violating sim-core purity and contaminating callers that reused the prior state. Proof added in `tests/seasonSimulator.test.ts`; fixed by cloning standings and season stats before accumulation.

#### Clean
- `src/sim/calendar.ts`
- `src/sim/gameSimulator.ts`
- `src/sim/index.ts`
- `src/sim/markov.ts`
- `src/sim/plateAppearance.ts`
- `src/sim/playoffMomentum.ts`

## league
### Files Reviewed: 14
### Bugs Found: 3 (P0: 1, P1: 1, P2: 1)
### Tests Added: 3

#### P0 — Determinism / Correctness
- `src/league/standings.ts:46` and `src/league/standings.ts:147` division and league standings sorted only by win percentage, so tied teams inherited whatever insertion order reached the tracker. Proof added in `tests/standings.test.ts`; fixed by adding deterministic wins/losses/run-differential/team-id tie-breakers.

#### P1 — Edge Case / Crash Risk
- `src/league/standings.ts:39` and `src/league/standings.ts:184` `serialize()` and `deserialize()` reused `last10` tuple references, so saved tracker snapshots could be mutated by later updates or caller writes. Proof added in `tests/standings.test.ts`; fixed by deep-cloning `TeamRecord.last10`.

#### P2 — Type Safety / Code Quality
- `src/league/rivalries.ts:44` `rivalryId()` used a bare `.sort()` when normalizing the two-team key. Proof added in `tests/rivalries.test.ts`; fixed with an explicit comparator to satisfy the deterministic-sort rule.

#### Clean
- `src/league/achievements.ts`
- `src/league/awardNarratives.ts`
- `src/league/awards.ts`
- `src/league/frontOffice.ts`
- `src/league/gmRelationships.ts`
- `src/league/hallOfFame.ts`
- `src/league/index.ts`
- `src/league/narrativeState.ts`
- `src/league/records.ts`
- `src/league/relationshipEffects.ts`
- `src/league/schedule.ts`
- `src/league/teams.ts`

## draft
### Files Reviewed: 6
### Bugs Found: 3 (P0: 1, P1: 2)
### Tests Added: 3

#### P0 — Determinism / Correctness
- `src/draft/draftPool.ts:251` `rankProspects()` sorted tied scouting grades without a secondary key, so equal-grade prospects could reorder when the input array order changed. Proof added in `tests/draft.test.ts`; fixed with `consensusRank` and `player.id` tie-breakers.

#### P1 — Edge Case / Crash Risk
- `src/draft/draftAI.ts:270` `simulateFullDraft()` rewrote `selectedProspect.player.teamId` in place, mutating the source `DraftClass` pool and leaking drafted team assignments back into caller-owned input. Proof added in `tests/draft.test.ts`; fixed by creating a drafted copy of the selected prospect/player payload.
- `src/draft/draftPool.ts:252` `rankProspects()` mutated caller-owned prospect records when assigning `positionRank`, `draftRound`, and `consensusRank`. Proof added in `tests/draft.test.ts`; fixed by ranking cloned prospect records and returning a fresh array.

#### Clean
- `src/draft/draftPicks.ts`
- `src/draft/draftScouting.ts`
- `src/draft/draftSigning.ts`
- `src/draft/index.ts`

## roster
### Files Reviewed: 7
### Bugs Found: 2 (P1: 1, P2: 1)
### Tests Added: 2

#### P1 — Edge Case / Crash Risk
- `src/roster/freeAgency.ts:693` `simulateFullFreeAgency()` mutated the caller-supplied `teamPayrolls` map when user offers were accepted on day 0, leaking side effects into the wider offseason state. Proof added in `tests/freeAgency.test.ts`; fixed by copying payrolls into a local working map before simulation.

#### P2 — Type Safety / Code Quality
- `src/roster/minorLeagues.ts:305`, `src/roster/minorLeagues.ts:339`, and `src/roster/minorLeagues.ts:430` normalized team ordering with bare `.sort()` calls in matchup generation and affiliate-state creation. Proof added in `tests/minorLeagues.test.ts`; fixed with explicit comparators and a regression that proves reversed `teamIds` inputs now produce identical affiliate state and day simulation results.

#### Clean
- `src/roster/index.ts`
- `src/roster/minorLeagueStats.ts`
- `src/roster/offseason.ts`
- `src/roster/rosterManager.ts`
- `src/roster/rule5.ts`

## trade
### Files Reviewed: 6
### Bugs Found: 1 (P0: 1)
### Tests Added: 1

#### P0 — Determinism / Correctness
- `src/trade/deadlineDrama.ts:211` and `src/trade/deadlineDrama.ts:232` inferred contender/seller pools from tied standings without a stable secondary key, so identical seeds produced different deadline timelines when standings arrived in a different array order. Proof added in `tests/deadlineDrama.test.ts`; fixed by sorting ties on `teamId` for both strength and weakness rankings.

#### Clean
- `src/trade/index.ts`
- `src/trade/multiTeamTrade.ts`
- `src/trade/tradeAI.ts`
- `src/trade/tradeNegotiation.ts`
- `src/trade/valuation.ts`

## finance
### Files Reviewed: 3
### Bugs Found: 1 (P0: 1)
### Tests Added: 1

#### P0 — Determinism / Correctness
- `src/finance/marketIntelligence.ts:169` and `src/finance/marketIntelligence.ts:287` comparable contracts, team-signal ordering, hottest-position selection, and top-free-agent lists all had tie cases that preserved caller input order. Proof added in `tests/marketIntelligence.test.ts`; fixed by adding stable string/season tie-breakers throughout the public summary pipeline.

#### Clean
- `src/finance/contracts.ts`
- `src/finance/index.ts`

## narrative
### Files Reviewed: 13
### Bugs Found: 5 (P0: 5)
### Tests Added: 7

#### P0 — Determinism / Correctness
- `src/narrative/newsFeed.ts:235`, `src/narrative/newsFeed.ts:1109`, `src/narrative/newsFeed.ts:1146`, `src/narrative/newsFeed.ts:1165`, and `src/narrative/newsFeed.ts:1213` standings stories, unread ordering, deduplication order, and season recap ranking all preserved caller input order for tied records, priorities, or timestamps. Proof added in `tests/narrative.test.ts`; fixed with shared stable comparators and deterministic post-dedup sorting.
- `src/narrative/playByPlay.ts:105`, `src/narrative/playByPlay.ts:331`, and `src/narrative/playByPlay.ts:347` equal-drama highlights and tied batter lines were ranked without a final stable key, so recaps could change when upstream PA arrays arrived in a different order. Proof added in `tests/playByPlay.test.ts`; fixed with explicit highlight and batter-line tie-breakers.
- `src/narrative/ticker.ts:298` `pruneTickerFeed()` sorted only by timestamp rank, so same-day ticker entries could retain different items depending on arrival order. Proof added in `tests/ticker.test.ts`; fixed with an `id` tie-breaker.
- `src/narrative/storyArcs.ts:246` and `src/narrative/storyArcs.ts:271` candidate arc ranking fell back to overall rating only, so equal-score/equal-rating arcs inherited input order. Proof added in `tests/storyArcs.test.ts`; fixed with a `playerId` tie-breaker.
- `src/narrative/draft.ts:366` `generateDraftBuzz()` chose the first `Map` entry when recent position-run counts tied, so equal runs could emit different draft-buzz text. Proof added in `tests/draftNarrative.test.ts`; fixed with a bucket-name tie-breaker.

#### Clean
- `src/narrative/consequences.ts`
- `src/narrative/farmNarratives.ts`
- `src/narrative/index.ts`
- `src/narrative/leagueEvents.ts`
- `src/narrative/offseasonRecap.ts`
- `src/narrative/playByPlayEnhanced.ts`
- `src/narrative/pressConferences.ts`
- `src/narrative/tradeTheatre.ts`

## scouting
### Files Reviewed: 5
### Bugs Found: 1 (P2: 1)
### Tests Added: 1

#### P2 — Type Safety / Code Quality
- `src/scouting/scoutLearning.ts:186` normalized outlier scout IDs with a bare `.sort()`. Proof added in `tests/scoutLearning.test.ts`; fixed with an explicit comparator so consensus output obeys the same deterministic-sort rule as the rest of sim-core.

#### Clean
- `src/scouting/conflicts.ts`
- `src/scouting/index.ts`
- `src/scouting/international.ts`
- `src/scouting/scoutingEngine.ts`

## onboarding
### Files Reviewed: 16
### Bugs Found: 0
### Tests Added: 0

#### Clean
- `src/onboarding/assistantGM.ts`
- `src/onboarding/chapterDialogue.ts`
- `src/onboarding/choiceReactions.ts`
- `src/onboarding/coachingTips.ts`
- `src/onboarding/farmAssessment.ts`
- `src/onboarding/financialPlaybook.ts`
- `src/onboarding/flowEngine.ts`
- `src/onboarding/index.ts`
- `src/onboarding/ownerMeeting.ts`
- `src/onboarding/pressConference.ts`
- `src/onboarding/rosterAssessment.ts`
- `src/onboarding/scoutingBriefing.ts`
- `src/onboarding/scriptOrchestrator.ts`
- `src/onboarding/seasonStrategy.ts`
- `src/onboarding/shared.ts`
- `src/onboarding/staffEvaluation.ts`

## moments
### Files Reviewed: 0
### Bugs Found: 0
### Tests Added: 0

#### Clean
- None

#### Note
- `src/moments/` is not present in this `2b9c8e2` worktree, despite the audit plan assuming it existed. This remained a repo-state discrepancy in the audited branch.

## stats
### Files Reviewed: 4
### Bugs Found: 1 (P1: 1)
### Tests Added: 1

#### P1 — Edge Case / Crash Risk
- `src/stats/advanced.ts:295` `buildLeagueAdvancedContext()` used `roundTo(...) || DEFAULT_FIP_CONSTANT`, which replaced a legitimate computed `0` FIP constant with the default fallback and skewed advanced pitching output. Proof added in `tests/stats.test.ts`; fixed by preserving finite zero values and falling back only for non-finite results.

#### Clean
- `src/stats/index.ts`
- `src/stats/milestones.ts`
- `src/stats/projections.ts`

## career
### Files Reviewed: 1
### Bugs Found: 0
### Tests Added: 0

#### Clean
- `src/career/index.ts`

## scenarios
### Files Reviewed: 4
### Bugs Found: 1 (P1: 1)
### Tests Added: 1

#### P1 — Edge Case / Crash Risk
- `src/scenarios/scenarioLibrary.ts:32`, `src/scenarios/scenarioLibrary.ts:35`, and `src/scenarios/scenarioLibrary.ts:41` `readScenarioRecord()` only looked at `snapshot.userTeamId`, so imported/derived snapshots that relied on `snapshot.franchise.teamId` reported `0-0` progress for the active franchise. Proof added in `tests/scenarios.test.ts`; fixed by falling back to `snapshot.franchise.teamId`.

#### Clean
- `src/scenarios/index.ts`
- `src/scenarios/scenarioEngine.ts`
- `src/scenarios/scenarioObjectives.ts`

## sharing
### Files Reviewed: 3
### Bugs Found: 1 (P1: 1)
### Tests Added: 1

#### P1 — Edge Case / Crash Risk
- `src/sharing/dynastyCards.ts:24`, `src/sharing/dynastyCards.ts:38`, `src/sharing/dynastyCards.ts:108`, and `src/sharing/dynastyCards.ts:130` dynasty-card generation assumed `snapshot.userTeamId` was always populated, so legacy/imported snapshots could produce blank or incorrect team labels and records. Proof added in `tests/sharing.test.ts`; fixed with a shared `userTeamId(snapshot)` fallback to `snapshot.franchise.teamId`.

#### Clean
- `src/sharing/index.ts`
- `src/sharing/leaderboard.ts`

## timeline
### Files Reviewed: 1
### Bugs Found: 0
### Tests Added: 0

#### Clean
- `src/timeline/index.ts`

## performance
### Files Reviewed: 1
### Bugs Found: 1 (P1: 1)
### Tests Added: 1

#### P1 — Edge Case / Crash Risk
- `src/performance/index.ts:85` `archiveOldSeasons()` passed `snapshot.userTeamId` into season compression without a fallback, so legacy/imported snapshots could miss the active-franchise flag in archived history. Proof added in `tests/performance.test.ts`; fixed by falling back to `snapshot.franchise.teamId`.

## invariants
### Files Reviewed: 1
### Bugs Found: 0
### Tests Added: 0

#### Clean
- `src/invariants/checker.ts`

## export surface
### Files Reviewed: 1
### Bugs Found: 0
### Tests Added: 0

#### Clean
- `src/index.ts`

## worker integration
### Files Reviewed: 26 (targeted contract sweep)
### Bugs Found: 2 (P1: 1 fixed, P2: 1 documented)
### Tests Added: 1

#### P1 — Edge Case / Crash Risk
- `apps/web/src/shared/hooks/useWorker.ts:72`, `apps/web/src/shared/hooks/useWorker.ts:521`, and `apps/web/src/shared/hooks/useWorker.ts:782` `makeContractOffer()` existed on the worker API but was omitted from `mutationMethods` and the returned hook surface, so the UI could not route the contract-offer mutation through the normal invalidation path. Proof added in `apps/web/src/shared/hooks/useWorker.test.tsx`; fixed by wiring the callback and mutation registration.

#### P2 — Type Safety / Code Quality
- `apps/web/src/features/gm-career/routes/GMCareerPage.tsx:4` and other feature/shared files still import runtime helpers directly from `@mbd/sim-core` (`getTeamById`, `TEAMS`, `estimateProjectedWarRange`, `toDisplayRating`, `calculateDynastyLeaderboardScore`, etc.) instead of consuming worker-derived data. Documented only in this pass to avoid expanding the worker API during a bug-fix sprint.

#### Clean
- `apps/web/src/workers/sim.worker.state.ts`
- `apps/web/src/workers/sim.worker.monthlyPulse.ts`
- `apps/web/src/workers/sim.worker.draft.ts`
- `apps/web/src/workers/sim.worker.actions.ts`
- `apps/web/src/workers/sim.worker.records.ts`
- `apps/web/src/workers/sim.worker.storyArcs.ts`
- `apps/web/src/workers/sim.worker.narrative.ts`
- `apps/web/src/workers/sim.worker.ts`
- `apps/web/src/workers/sim.worker.stats.ts`
- `apps/web/src/workers/sim.worker.consequences.ts`
- `apps/web/src/workers/sim.worker.setup.ts`
- `apps/web/src/workers/sim.worker.legacy.ts`
- `apps/web/src/workers/sim.worker.achievements.ts`
- `apps/web/src/workers/sim.worker.ticker.ts`
- `apps/web/src/workers/sim.worker.helpers.ts`
- `apps/web/src/workers/sim.worker.trade.ts`
- `apps/web/src/workers/sim.worker.narrativeFarm.ts`
- `apps/web/src/workers/sim.worker.queries.ts`
- `apps/web/src/workers/sim.worker.pipeline.ts`
- `apps/web/src/workers/sim.worker.farm.ts`
- `apps/web/src/workers/sim.worker.diagnostics.ts`
- `apps/web/src/workers/sim.worker.ceremony.ts`
- `apps/web/src/workers/sim.worker.seasonNarrative.ts`
- `apps/web/src/workers/sim.worker.pressRoom.ts`
- `apps/web/src/workers/snapshot.ts`

## Summary Statistics
- Total sim-core files reviewed: 113
- Worker bridge files audited: 26
- Total files reviewed: 139
- Total bugs found: 26 (P0: 11, P1: 10, P2: 5)
- Fixed in this pass: 25
- Documented-only issues: 1
- Total tests added: 27
- Total tests passing after fixes: 1199 verified passing tests (1198 full sim-core suite + 1 targeted web regression)
- Modules with zero issues: `math`, `onboarding`, `career`, `timeline`, `invariants`, `export surface`
- Highest risk module: `sim`
  `simulateDay()` purity violations and incorrect playoff-forfeit resolution both changed actual season/postseason outcomes, making this the most direct source of gameplay corruption in the audited set.
