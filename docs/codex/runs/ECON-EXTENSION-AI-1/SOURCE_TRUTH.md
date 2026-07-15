# ECON-EXTENSION-AI-1 — Source Truth

## Preflight

- Worktree: `/Users/kevin/Downloads/MBD-cpu-extensions-13`
- Branch: `codex/cpu-extension-ai-13`
- Base/HEAD/local `main`: `c589f0e49e1e9b99c0b6497616786e20a39ec217`
- `origin/main`: `fd217dc57262cd104f4fc140cb6e6c571cfa9290`;
  push/deploy/tag/release are not authorized.
- Package manager: root declares `pnpm@9.15.4`; `corepack pnpm` resolves that
  exact version. Node is v24.16.0.
- GameSnapshot: v34. Dexie operational schema: v6.
- Slice worktree was clean; completion report was absent. The main checkout's
  user-owned changes to `.agents/skills/mbd-implement-slice/SKILL.md`,
  `AGENTS.md`, and `docs/codex/PROGRAM.md` remain protected outside this
  worktree and commit.

## Baseline receipts

- sim-core contracts/front-office: 2 files / 28 tests passed.
- web worker: 1 file / 180 tests passed.
- web snapshot plus Roster/Profile extension hooks: 3 files / 30 tests passed.
- These green baselines prove the historical fragments compile and run. They do
  not prove persisted-GM divergence, user-team-independent RNG, exact budget
  replacement, imported aggregate integrity, or production reload durability.

## Existing implementation

- `processTeamExtensions()` already selects up to two owned MLB candidates,
  creates offers, runs the common negotiation engine, and applies accepted
  contracts/history.
- `processTeamExtensionsOnce()` already runs for non-user clubs on entry to the
  canonical `extensions` offseason phase and records phase results plus news.
- `gmPersonalities` is generated for every team, persisted in every supported
  save lineage, restored on load, and changed by current-GM reset events. It is
  not currently consumed by extensions.
- `TeamBuildingArchetype` is derived from current record, payroll, roster core,
  prospect signal, and front-office reputation; it currently shapes extension
  ranking but is live window state rather than durable organization identity.
- Automatic CPU execution is already called by Offseason Advance/Skip through
  the established exact-save coordinator. Manual Roster/Profile negotiation is
  a separate ordinary-autosave lane and its counter session is intentionally
  runtime-only.
- Existing player contract/history, offseason results, news, ledger, Press Room,
  Player History, and archive projections are sufficient. No save field or route
  is required.

## Confirmed defects

1. Persisted GM personality does not influence extension choices; equal live
   state produces equal behavior regardless of durable GM posture.
2. CPU team iteration uses sequential `s.rng.fork()`. Skipping a different user
   team remaps later CPU clubs' RNG and news draws.
3. Extension context trusts the legacy service-years map before canonical
   `serviceTimeDays`.
4. Shared team identity reads true prospect potential/ceiling, which is not an
   acceptable no-hidden-information input for this slice.
5. Affordability adds new AAV on top of payroll containing old AAV, then allows
   up to 106% of budget. It both double-counts replacement cost and fails the
   real-budget contract.
6. CPU rejected attempts appear in phase/news facts but not player
   `extensionHistory`, creating asymmetric factual memory.
7. Public `negotiateExtension` revalidates neither user-team ownership nor a
   terminal current-season outcome; stale or forged callbacks can mutate a CPU
   player or apply twice.
8. Imported extension phase rows are default-normalized but not relationally
   validated before one team ID is treated as a completed-team receipt.
9. Current tests change only derived archetype/live standings, use a two-seed
   aggregate count, and provide no extension-specific production browser proof.

## Frozen architecture decisions

- Add existing persisted `GMPersonality` to transient extension context. It is
  current-GM posture only; item 49 remains `PARTIAL`.
- GM posture may change candidate priority, desired term, and bounded team
  counter aggression. Keep player willingness/demand/acceptance and budget
  identity-neutral.
- Use exact service days and current observable ability for identity inputs;
  ignore contradictory legacy years and hidden potential/ceiling.
- Replace old AAV with new AAV under the exact real budget. Do not introduce
  owner floors, pressure, tax, or revenue behavior.
- Use versioned team-scoped stable RNG for CPU extension plans and factual news;
  do not consume the parent RNG or depend on user-team skip position.
- Apply accepted and rejected terminal facts through coherent contract/history/
  phase/news logic. Validate current aggregate uniqueness and accepted-term
  coherence before phase RNG/mutation without fabricating missing historical
  rejection history.
- Keep automatic CPU work inside the existing exact-save phase transition.
  Harden public mutation authority, but leave manual runtime counter-session
  persistence to a separate future slice.

## Review synthesis

Three read-only lanes mapped source, tests, and risk. All returned `GO` for a
bounded CPU-only slice using persisted current-GM personality; all rejected a
claim that the existing derived archetype alone was durable identity. Their
P1 findings—observer-dependent RNG, hidden potential, legacy service authority,
replacement-budget error, stale public mutation, aggregate validation, and
missing rejected history—are frozen into Goal 23 and the living plan.

## Scope truth

Roadmap item 49 remains incomplete. Goal 23 consumes one already-persisted
identity artifact in one domain and does not create permanent franchise DNA,
unify other CPU decisions, or alter GM career history. Manual extension
counter-session persistence is a separate trust issue and is explicitly not
claimed complete here.

## Implementation discoveries and frozen evidence

- Negotiation can legally counter above the opening AAV. Opening-offer budget
  admission was therefore insufficient: the accepted final contract must be
  checked again with replacement payroll. The first four-seed study exposed one
  `CLE` result at `$294.13M` against a `$294.04M` budget; the final commit guard
  now rejects that terminal overspend. The repeated study reports zero
  overages.
- CPU rejection is a factual terminal attempt. It now adds one matching player
  history fact while leaving the canonical contract unchanged; replay sees the
  terminal history and produces no second attempt.
- Stable extension/news RNG is derived from version, season, team, and player
  scope. Each candidate owns separate offer and negotiation streams, so storage
  order, unrelated parent consumption, an earlier unaffordable candidate, or a
  different `userTeamId` cannot shift a common candidate or the parent RNG.
- Current imported aggregates fail closed on missing/empty/duplicate player
  identity, illegal terms, wrong ownership/level, or accepted contract/history
  contradiction. Honest historical absence of rejected history is not
  fabricated.
- The existing exact-save coordinator already owns Offseason Advance/Skip from
  baseline through accepted worker snapshot and durable receipt. New focused
  tests bind an extension-shaped snapshot to its intended save and prove both
  pre-acceptance rollback and post-acceptance retained retry.
- The production fixture uses the supported v34 import path and existing
  Offseason and News routes. Contract/history/result/news facts survive hard
  reload exactly once. No schema, Dexie, route, dependency, or bundle ceiling
  changed.

## Source-freeze receipts

- Pure contracts/front-office: 33/33.
- Main focused bundle: 12 files / 269 tests; balance: 9/9; sim-core and web
  typecheck passed.
- Four-seed league study: 868 eligible per seed; 29/29/33/32 attempts;
  29/29/33/31 accepts; 0/0/0/1 rejects; all five persisted GM personalities
  represented; zero budget overages, duplicate results, history mismatches, or
  parent-RNG changes; exact replay digests.
- Root typecheck: 9/9 tasks. Full tests: sim-core 141 files / 1,670 tests; web
  464 files passed + 1 intentional skip, 2,393 tests passed + 3 intentional
  skips; contracts 24/24; UI 1/1.
- Fresh production build: 3,029 modules and 167 PWA entries (4,056.42 KiB);
  bundle budget green. Determinism: 3/3.
- Final authoritative production Chromium: CPU extension journey 1/1 and
  existing reload-smoke 2/2 in 4.8 minutes total, one worker, zero configured
  retries, no flaky classification.
- Deliberate negative control: neutralizing the persisted-GM priority adjustment
  failed the exact identity test (`gm-current-star` selected instead of
  `gm-young-core`); restoration passed 1/1.

## First final-review correction

The read-only Sol-pattern review returned `FIX_AND_REVIEW` with 0 P0, 4 P1,
and 1 P2. All findings were reproducible and were handled in one bounded loop:

1. Restored the shared hidden-potential-aware team archetype for promotion,
   roster, trade, and free-agency consumers; extensions alone derive their
   competitive window from observable current ability.
2. Replaced sequential candidate consumption inside a team RNG with stable
   candidate-scoped offer and negotiation lanes.
3. Added total runtime aggregate checks, including terminal-status validation,
   before `.trim()` or recorded-team suppression.
4. Replaced the partial offer check with a total runtime predicate covering
   object/array shape, clause enum, option booleans, and deferred entries.
5. Added storage permutation, unrelated RNG consumption, earlier-no-op
   insertion, invalid status, accepted contract mismatch, accepted history
   mismatch, and malformed offer-shape controls; corrected the roadmap status
   from prematurely verified to in progress until re-review and landing.

The first post-correction combined browser run exposed a pre-existing reload-
smoke handler race: an explicit Press Conference Skip click triggered a handler
for the same dialog. Moving the initial public dismissal before handler
installation removed the self-interception. The next run reached a second stale
test expectation—exact `Offseason` versus the rendered semantic heading
`Offseason - Season 1`. The test now asserts the actual heading. Both are
test-only gate hardening; no production behavior changed. The complete final
run passed 3/3 with one worker and no Playwright retry/flaky classification.

## Second final-review correction

The same read-only review thread's first recheck returned `FIX_AND_REVIEW` with
0 P0, 1 P1, and 0 P2. Candidate RNG was stable, but its seed still included
`gmPersonality` and `teamBuildingArchetype`. That allowed organization identity
to change player-side demand and walk-away draws even though the accepted
architecture permits identity to shape only the team's priority, term, opening,
and counter posture.

The second and final authorized correction removed both identity inputs from
the player-side candidate seed. The seed remains versioned and candidate-scoped
by season, team, player, age, current overall, exact service/control state,
morale, team record, replacement payroll, baseline contract, and RNG lane.
A direct pure regression now proves that analytical and conservative contexts
with the same term produce the same player target and first walk-away draw while
their team opening AAV still differs. The final 33/33 pure run, three hostile
worker controls, four-seed study, root typecheck/full test, determinism, fresh
production build, and 3/3 production browser run all passed on this corrected
source revision.
