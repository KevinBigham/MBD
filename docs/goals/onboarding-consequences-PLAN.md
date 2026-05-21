# Onboarding Consequences Plan

## Product Objective

Turn the revised onboarding choices into real, inspectable, long-term game consequences.

The player choices must stop being mostly flavor and become durable strategic identity settings that affect owner pressure, scouting accuracy, player development, prospect risk, free agency appeal, trade reputation, fan sentiment, team chemistry, press outcomes, monthly briefings, and front-office UI feedback.

The choices covered by this mission are:

- Assistant GM: Marcus, Walt, Elena
- Season mandate: Championship, Playoff, Compete, Rebuild
- Development posture: Aggressive, Balanced, Patient
- Scouting director focus: Draft, International, Pro
- Spending posture: Big Spender, Balanced, Penny Pincher
- Trade posture: Buyer, Seller, Opportunistic
- Press tone: Confident, Humble, Measured

## Existing State To Reuse

Do not invent a separate save system for this feature unless proven necessary.

The existing source of truth is:

- `franchise.assistantGMId`
- `franchise.scoutingDirector`
- `franchise.gmPhilosophy`
- `franchise.dayOne`
- `ownerState`
- `playerMorale`
- `teamChemistry`
- `frontOfficeState`
- `gmRelationships`
- `fanSentiment`
- `consequenceWatchers`
- `storyFlags`
- `briefingQueue`
- `newsItems`

Known useful files and hooks:

- `packages/contracts/src/schemas/franchise.ts`
- `packages/contracts/src/schemas/narrative.ts`
- `packages/contracts/src/schemas/save.ts`
- `apps/web/src/workers/sim.worker.onboarding.ts`
- `apps/web/src/workers/sim.worker.setup.ts`
- `apps/web/src/workers/sim.worker.actions.ts`
- `apps/web/src/workers/sim.worker.consequences.ts`
- `apps/web/src/workers/sim.worker.narrative.ts`
- `apps/web/src/workers/sim.worker.queries.ts`
- `apps/web/src/workers/sim.worker.helpers.ts`
- `apps/web/src/features/front-office/routes/FrontOfficePage.tsx`
- `packages/sim-core/src/onboarding/agmCandidates.ts`
- `packages/sim-core/src/onboarding/flowEngine.ts`
- `packages/sim-core/src/onboarding/staffHiring.ts`
- `packages/sim-core/src/league/narrativeState.ts`
- `packages/sim-core/src/league/frontOffice.ts`
- `packages/sim-core/src/roster/freeAgency.ts`
- `packages/sim-core/src/roster/minorLeagues.ts`
- `packages/sim-core/src/player/developmentPipeline.ts`
- `packages/sim-core/src/player/developmentSetbacks.ts`
- `packages/sim-core/src/draft/draftScouting.ts`
- `packages/sim-core/src/scouting/international.ts`
- `packages/sim-core/src/narrative/pressConferences.ts`

## Technical Shape

Create one focused consequence layer instead of scattering raw choice checks everywhere.

Recommended worker module:

- `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts`

Recommended responsibilities:

- Build a typed front-office identity view for UI.
- Apply onboarding baseline consequences once after onboarding completion.
- Apply monthly alignment/consequence checks.
- Score mandate, spending, trade, development, and press alignment.
- Provide effective scouting accuracy modifiers by domain.
- Provide assistant-GM modifiers for trades, development, scouting, morale, and owner/fan reactions.

Recommended public helper names:

- `applyOnboardingIdentityBaseline(state)`
- `applyMonthlyFrontOfficeConsequences(state, monthContext)`
- `buildFrontOfficeIdentityView(state)`
- `scoreMandateAlignment(state)`
- `scoreSpendingAlignment(state)`
- `scoreTradeAlignment(state)`
- `scoreDevelopmentAlignment(state)`
- `scoreMediaAlignment(state)`
- `getEffectiveScoutingAccuracy(state, domain)`
- `getAssistantGmProfileModifiers(state)`

Prefer pure helpers under `packages/sim-core` only where they are broadly domain-level and easily testable. Keep state mutation inside worker modules.

## Required Consequence Contracts

### Assistant GM

Marcus:

- Upside: better trade valuation, pro-player evaluation clarity, contract/value discipline, owner confidence after high-surplus moves.
- Downside: morale/team-chemistry penalties when selling beloved or homegrown players, harsher player reaction to cold roster management.
- Suggested hooks: trade fairness, `applyTradeConsequences`, pro scout reports, front-office trade score.

Walt:

- Upside: better team chemistry, veteran trust, clubhouse morale stability, reduced backlash from loyalty moves.
- Downside: less aggressive prospect acceleration, lower owner confidence in rebuild selloffs or analytics/value-only trades.
- Suggested hooks: monthly chemistry, promotion recommendations, morale consequences, trade aftermath.

Elena:

- Upside: stronger prospect development, international scouting, prospect morale, patience with young players.
- Downside: owner/front-office/fan penalty when trading homegrown top prospects or blocking prospects with expensive veterans.
- Suggested hooks: development pipeline, IFA scouting, promotion risk watcher, trade consequences.

### Season Mandate

Championship:

- Raise owner win-now pressure, wins target, playoff expectations, and trade/FA urgency.
- Penalize standing still near the deadline, low payroll during contention, and falling short of deep postseason goals.

Playoff:

- Owner judges primarily by remaining in postseason contention and making sensible additions.
- Moderate hot-seat pressure if the club drifts below the playoff race.

Compete:

- Balanced expectation: owner wants progress, direction, and credible contention.
- Penalize directionless seasons more than honest rebuilds or honest win-now attempts.

Rebuild:

- Lower immediate playoff pressure.
- Reward prospect growth, draft/IFA investment, payroll flexibility, and future-value trades.
- Penalize panic buying, blocking prospects, and empty losing without farm progress.

### Development Posture

Aggressive:

- Earlier promotion recommendations.
- Slightly higher breakout/upside chance.
- Higher rushed-prospect setback and morale risk.

Balanced:

- Neutral default with lower volatility.

Patient:

- Lower setback risk and steadier floor growth.
- Potential frustration from MLB-ready prospects being blocked too long.
- Fan/owner impatience if the MLB club is losing and help is available.

### Scouting Director Focus

Draft:

- Improve draft scouting confidence/accuracy.
- Reduce variance in amateur reports.

International:

- Improve IFA scouting confidence/accuracy and discovery quality.
- Make international discoveries/briefings more likely.

Pro:

- Improve pro player reports, trade target evaluations, MLB/minor league current-skill confidence.
- Improve trade-screen/player-profile evaluation reliability.

### Spending Posture

Big Spender:

- Improve FA appeal and fan excitement when pursuing impact players.
- Increase owner/fan backlash when a win-now team sits on payroll room.
- Increase long-term owner risk if spending heavily without results.

Balanced:

- Reward staying near budget expectations and spending coherently with mandate.

Penny Pincher:

- Improve owner patience for payroll discipline.
- Reduce FA appeal and fan sentiment if the club refuses obvious needed spending.
- Reward efficient value signings.

### Trade Posture

Buyer:

- Reward adding MLB contributors while in contention.
- Penalize selling or deadline inactivity during win-now seasons.

Seller:

- Reward future-value trades, prospect acquisition, and payroll flexibility during poor seasons.
- Penalize short-term rentals or prospect selloffs while out of the race.

Opportunistic:

- Reward clearly positive-surplus trades in either direction.
- Penalize confused volume trading or repeated low-surplus moves.

### Press Tone

Confident:

- Improve fan hype and owner confidence after wins or strong alignment.
- Magnify backlash after losing streaks, missed promises, or overconfident quotes.

Humble:

- Stabilize morale and reduce pressure spikes.
- Lower fan hype upside.

Measured:

- Reduce volatility and smooth owner/fan reactions.
- Reward consistency.

Wire `fanSentimentDelta` from press conference responses; it currently should not be ignored.

## Implementation Milestones

### Milestone 1: Persistence and Baseline

- Ensure revised onboarding completion fully synchronizes `franchise.dayOne`, `assistantGMId`, `scoutingDirector`, and `gmPhilosophy`.
- Apply one-time baseline owner/front-office/fan/team identity consequences.
- Dedupe one-time effects using `storyFlags`.
- Avoid a save schema bump unless a new persistent field is truly required.

### Milestone 2: Front-Office Identity Module and UI Query

- Add the consequence/identity helper module.
- Add worker query for `getFrontOfficeIdentity`.
- Show identity, current mandate pressure, alignment score, and recent consequence on Front Office page.
- Keep UI dense and consistent with the existing front-office style.

### Milestone 3: Scouting Director Mechanics

- Wire effective accuracy/confidence modifiers into draft scouting, IFA scouting, and pro/player reports.
- Add focused tests proving each director focus changes the relevant domain and does not alter unrelated domains too much.

### Milestone 4: Owner, Spending, Trade, and Monthly Alignment

- Feed a real alignment score into owner evaluation instead of passing zero.
- Add monthly mandate/spending/trade posture checks.
- Emit briefings/news only when meaningful and deduped.
- Update front-office score, fan sentiment, owner confidence/satisfaction, and team chemistry where appropriate.

### Milestone 5: Development and Prospect Risk

- Wire development posture and AGM identity into monthly prospect development, promotion recommendations, and prospect risk watchers.
- Add tests for aggressive/patient/balanced behavior.

### Milestone 6: Press Tone

- Compare press responses against onboarding media tone.
- Apply fan sentiment deltas.
- Add consistency/broken-promise consequences and tests.

### Milestone 7: End-to-End Verification

- Complete onboarding in browser or with tests.
- Verify a season/month simulation triggers consequences.
- Verify Front Office page displays identity and alignment state.
- Run relevant test/typecheck/build validation.

## Save and Migration Guidance

Target no schema migration for the first complete version.

Use existing maps and snapshots wherever possible:

- `storyFlags` for dedupe/once-only flags.
- `consequenceWatchers` for delayed follow-up.
- `frontOfficeState`, `ownerState`, `fanSentiment`, and `teamChemistry` for game-state effects.

Only bump `CURRENT_GAME_SNAPSHOT_VERSION` if adding required persistent fields that cannot be represented safely with existing state.

## Testing Guidance

Add focused tests close to the changed behavior.

Useful test categories:

- onboarding completion persists revised choices and day-one state;
- identity scoring returns expected direction for each mandate/posture;
- scouting focus modifies the right report domain;
- monthly alignment changes owner/fan/front-office state;
- development posture changes promotion/risk/development outcomes;
- press tone applies fan sentiment and consistency effects;
- UI query returns a useful identity view.

Run at minimum:

```text
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm typecheck
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm test
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm build
```

For local UI verification:

```text
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm --filter @mbd/web dev --host 127.0.0.1 --port 5174
```

Then verify:

- `/MBD/onboarding`
- `/MBD/front-office`
- `/MBD/scouting`
- `/MBD/free-agency`
- `/MBD/trade`
- at least one monthly sim advancement after onboarding

## Out Of Scope

- Full narrative rewrite.
- New game mode.
- Major UI redesign.
- New external services.
- New large dependency.
- Licensed real-world baseball marks.
- Broad balance overhaul outside the onboarding consequence system.
