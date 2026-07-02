# MBD Minor League Content Brief

Purpose: source-backed handoff for creating original team, affiliate, prospect, and minor league roster content for Mr. Baseball Dynasty.

Use this with outside AI helpers. The current game has 32 fictional major-league franchises, 192 original affiliate identities, and a worker-owned authored roster content seam. The compact v1 worker pack preserves the reviewed 640 seed players, then deterministically materializes the remaining parent/farm slots into 5,408 stable authored rows for new games. Existing saves keep their persisted players.

## Source Of Truth

- Major-league franchises: `packages/sim-core/src/league/teams.ts`
- Player/rating model: `packages/sim-core/src/player/generation.ts`, `packages/sim-core/src/player/attributes.ts`, `packages/contracts/src/schemas/player.ts`
- Roster rules: `packages/sim-core/src/roster/rosterManager.ts`, `packages/sim-core/src/roster/minorLeagues.ts`
- Rule 5/protection logic: `packages/sim-core/src/roster/rule5.ts`
- Minors UI surfaces: `apps/web/src/features/minors`, `apps/web/src/features/players`
- Current shipped content seam: `apps/web/src/workers/content/minorLeagueContent.ts`, `apps/web/src/workers/content/minorLeagueContentPack.v1.json`

## Content Guardrails

- Use original fictional names only. Do not copy MLB players, real minor league rosters, real affiliate names, or protected team identities.
- Keep all randomness out of implementation. Content can be authored manually; any future generated import must use existing seeded RNG paths.
- If this content changes only new-game generation/data fixtures, it should not need a save schema change. If it changes persisted save shape, stop and add schema version, migration, fixture, and tests.
- Preserve current team IDs and abbreviations unless Kevin explicitly approves a league rebrand.
- Keep existing-save behavior additive. New authored player rows are for new-game generation only unless a future save migration explicitly says otherwise.

## Current Authored Content Status

- Affiliates: 192 original identities, keyed by existing `teamId:level`.
- Reviewed seed players: 640 rows from `MBD_Minor_League_Player_Content_Starter_Extended.csv`.
- Materialized v1 roster rows: 5,408 total, `32 x 169`.
- Stable content IDs: `auth-<team>-<level>-###`, for example `auth-nym-mlb-001`.
- Runtime wiring: `buildNewGameState()` passes the worker materialized map to `generateLeaguePlayers()` through `authoredPlayersByTeam`.
- Save behavior: existing saves import persisted players and do not receive replacement authored players.

## Current League Teams

| ID | Team | Abbr | Division | Park factor | Park note |
| --- | --- | --- | --- | ---: | --- |
| nym | New York Tycoons | NYT | AL_EAST | 1.01 | Slight hitter lean |
| phi | Philadelphia Liberty Bells | PHI | AL_EAST | 1.02 | Hitter lean |
| bos | Boston Noreasters | BOS | AL_EAST | 1.04 | Hitter-friendly |
| bal | Baltimore Crab Cakes | BAL | AL_EAST | 0.99 | Neutral/pitcher lean |
| wsh | Washington Monuments | WSH | AL_EAST | 1.00 | Neutral |
| chi | Chicago Deep Dish | CHI | AL_CENTRAL | 1.03 | Hitter-friendly |
| det | Detroit Motor Kings | DET | AL_CENTRAL | 0.99 | Neutral/pitcher lean |
| cle | Cleveland Forge | CLE | AL_CENTRAL | 0.98 | Pitcher lean |
| col | Columbus Wayfinders | CLB | AL_CENTRAL | 1.00 | Neutral |
| pit | Pittsburgh Smokestack | PIT | AL_CENTRAL | 0.98 | Pitcher lean |
| kc | Kansas City BBQ Fountains | KCF | AL_WEST | 1.00 | Neutral |
| msp | Minneapolis Frost Giants | MSP | AL_WEST | 1.01 | Slight hitter lean |
| stl | St. Louis Archers | STL | AL_WEST | 0.99 | Neutral/pitcher lean |
| ind | Indianapolis Speedsters | IND | AL_WEST | 1.00 | Neutral |
| mil | Milwaukee Suds | MIL | AL_WEST | 1.00 | Neutral |
| nas | Nashville Honky Tonks | NAS | AL_WEST | 1.01 | Slight hitter lean |
| mia | Miami Palms | MIA | NL_EAST | 0.96 | Pitcher-friendly |
| atl | Atlanta Peach Kings | ATL | NL_EAST | 1.01 | Slight hitter lean |
| cha | Charlotte Weavers | CHA | NL_EAST | 1.00 | Neutral |
| orl | Orlando Sunbursts | ORL | NL_EAST | 1.00 | Neutral |
| ral | Raleigh Pines | RAL | NL_EAST | 0.99 | Neutral/pitcher lean |
| hou | Houston Starliners | HOU | NL_CENTRAL | 1.02 | Hitter lean |
| dal | Dallas Lone Stars | DAL | NL_CENTRAL | 1.03 | Hitter-friendly |
| sat | San Antonio Riverwalk | SAT | NL_CENTRAL | 1.00 | Neutral |
| den | Denver Altitude | DEN | NL_CENTRAL | 1.12 | Extreme hitter/altitude |
| aus | Austin Bat Colony | AUS | NL_CENTRAL | 1.01 | Slight hitter lean |
| lax | Los Angeles Sunset Strip | LAX | NL_WEST | 0.99 | Neutral/pitcher lean |
| sfb | San Francisco Sourdoughs | SFB | NL_WEST | 0.95 | Pitcher-friendly |
| phx | Phoenix Copperbirds | PHX | NL_WEST | 1.02 | Hitter lean |
| sea | Seattle Drizzle | SEA | NL_WEST | 0.97 | Pitcher-friendly |
| sdg | San Diego Surf Hounds | SDG | NL_WEST | 0.97 | Pitcher-friendly |
| por | Portland Sasquatch | POR | NL_WEST | 1.00 | Neutral |

## Affiliate Slots To Populate

Current code creates these levels for every organization:

| Level | Current roster level | Generated player count | Schedule length | Starts | Age target for promotion logic | Promotion target |
| --- | --- | ---: | ---: | --- | ---: | --- |
| Triple-A | AAA | 28 | 150 | Day 1 | 24 | MLB |
| Double-A | AA | 28 | 138 | Day 1 | 23 | AAA |
| High-A | A_PLUS | 25 | 132 | Day 1 | 22 | AA |
| Single-A | A | 25 | 132 | Day 1 | 21 | A_PLUS |
| Rookie | ROOKIE | 20 | 72 | Day 45 | 20 | A |
| International academy | INTERNATIONAL | 15 | None currently | N/A | 18-20 | Rookie/A future content |

The affiliate state key is effectively `teamId:level`, not a named affiliate. The next content pass should create original affiliate names for AAA, AA, A_PLUS, A, ROOKIE, and optionally an international academy brand for each team.

### Affiliate Naming Worksheet

| Parent team | AAA | AA | A+ | A | Rookie | International academy |
| --- | --- | --- | --- | --- | --- | --- |
| New York Tycoons | TBD | TBD | TBD | TBD | TBD | TBD |
| Philadelphia Liberty Bells | TBD | TBD | TBD | TBD | TBD | TBD |
| Boston Noreasters | TBD | TBD | TBD | TBD | TBD | TBD |
| Baltimore Crab Cakes | TBD | TBD | TBD | TBD | TBD | TBD |
| Washington Monuments | TBD | TBD | TBD | TBD | TBD | TBD |
| Chicago Deep Dish | TBD | TBD | TBD | TBD | TBD | TBD |
| Detroit Motor Kings | TBD | TBD | TBD | TBD | TBD | TBD |
| Cleveland Forge | TBD | TBD | TBD | TBD | TBD | TBD |
| Columbus Wayfinders | TBD | TBD | TBD | TBD | TBD | TBD |
| Pittsburgh Smokestack | TBD | TBD | TBD | TBD | TBD | TBD |
| Kansas City BBQ Fountains | TBD | TBD | TBD | TBD | TBD | TBD |
| Minneapolis Frost Giants | TBD | TBD | TBD | TBD | TBD | TBD |
| St. Louis Archers | TBD | TBD | TBD | TBD | TBD | TBD |
| Indianapolis Speedsters | TBD | TBD | TBD | TBD | TBD | TBD |
| Milwaukee Suds | TBD | TBD | TBD | TBD | TBD | TBD |
| Nashville Honky Tonks | TBD | TBD | TBD | TBD | TBD | TBD |
| Miami Palms | TBD | TBD | TBD | TBD | TBD | TBD |
| Atlanta Peach Kings | TBD | TBD | TBD | TBD | TBD | TBD |
| Charlotte Weavers | TBD | TBD | TBD | TBD | TBD | TBD |
| Orlando Sunbursts | TBD | TBD | TBD | TBD | TBD | TBD |
| Raleigh Pines | TBD | TBD | TBD | TBD | TBD | TBD |
| Houston Starliners | TBD | TBD | TBD | TBD | TBD | TBD |
| Dallas Lone Stars | TBD | TBD | TBD | TBD | TBD | TBD |
| San Antonio Riverwalk | TBD | TBD | TBD | TBD | TBD | TBD |
| Denver Altitude | TBD | TBD | TBD | TBD | TBD | TBD |
| Austin Bat Colony | TBD | TBD | TBD | TBD | TBD | TBD |
| Los Angeles Sunset Strip | TBD | TBD | TBD | TBD | TBD | TBD |
| San Francisco Sourdoughs | TBD | TBD | TBD | TBD | TBD | TBD |
| Phoenix Copperbirds | TBD | TBD | TBD | TBD | TBD | TBD |
| Seattle Drizzle | TBD | TBD | TBD | TBD | TBD | TBD |
| San Diego Surf Hounds | TBD | TBD | TBD | TBD | TBD | TBD |
| Portland Sasquatch | TBD | TBD | TBD | TBD | TBD | TBD |

## Roster Requirements And Current Generator Shape

Current generated per-team size:

- MLB-status players: 28 from the position template below.
- AAA: 28
- AA: 28
- A_PLUS: 25
- A: 25
- ROOKIE: 20
- INTERNATIONAL: 15
- Total: 169 players per organization, 5408 players for 32 teams.

Current MLB position template:

| Position | Count |
| --- | ---: |
| C | 2 |
| 1B | 2 |
| 2B | 2 |
| 3B | 2 |
| SS | 2 |
| LF | 2 |
| CF | 2 |
| RF | 2 |
| DH | 1 |
| SP | 5 |
| RP | 5 |
| CL | 1 |

Roster rules in code:

- Regular active roster limit: 26.
- September expanded active roster limit: 28.
- 40-man roster limit: 40.
- All MLB active players must also be on the 40-man.
- Recommended MLB coverage warnings:
  - At least 5 SP.
  - At least 3 RP/CL.
  - At least 8 total pitchers.
  - At least 13 position players when active roster is full.
  - At least one C, 1B, 2B, 3B, SS, LF, CF, RF.
  - Two catchers preferred; one catcher triggers a backup-catcher warning.
- Current `buildRosterState()` puts MLB, AAA, and AA players on the 40-man by default. If authored content changes this later, protect only realistic 40-man candidates.

Recommended minor league roster balance per active affiliate:

| Level | Target shape |
| --- | --- |
| AAA | MLB-ready depth, 2 C, 6-7 IF, 5-6 OF/DH, 5-6 SP, 7-8 RP/CL |
| AA | Top prospects plus real depth, 2 C, 6-7 IF, 5-6 OF/DH, 5-6 SP, 7-8 RP/CL |
| A_PLUS | Younger prospects, toolsy bets, 2 C, 6 IF, 5-6 OF/DH, 5 SP, 7 RP/CL |
| A | Raw players and recent draftees, similar to A_PLUS but more volatility |
| ROOKIE | 18-21 year-old low-current/high-variance players; fewer polished relievers |
| INTERNATIONAL | 17-20 year-old academy players; lower current ratings, higher variance |

## Positions, Ages, And Ratings

Legal positions:

`C`, `1B`, `2B`, `3B`, `SS`, `LF`, `CF`, `RF`, `DH`, `SP`, `RP`, `CL`

Current generated age ranges:

| Level | Age range |
| --- | --- |
| MLB | 24-38 |
| AAA | 23-32 |
| AA | 21-27 |
| A_PLUS | 20-25 |
| A | 19-23 |
| ROOKIE | 18-21 |
| INTERNATIONAL | 17-20 |

Internal ratings are 0-550. UI/scouting display ratings are 20-80.

| Display | Internal |
| ---: | ---: |
| 80 | 550 |
| 75 | 504 |
| 70 | 458 |
| 65 | 413 |
| 60 | 367 |
| 55 | 321 |
| 50 | 275 |
| 45 | 229 |
| 40 | 183 |
| 35 | 138 |
| 30 | 92 |
| 25 | 46 |
| 20 | 0 |

Recommended authored display-rating bands:

| Level | Current OVR target | Ceiling target | Notes |
| --- | --- | --- | --- |
| MLB star | 65-80 | 65-80 | Keep rare. Usually 1-3 per league tier, not per team. |
| MLB regular | 50-64 | 50-70 | Most starters. |
| MLB bench/depth | 42-52 | 45-60 | Optionable depth and role players. |
| AAA | 40-55 | 45-65 | Ready-now depth, late bloomers, Quad-A profiles. |
| AA | 35-50 | 45-70 | Best blend of real prospects and depth. |
| A_PLUS | 30-45 | 45-75 | Toolsy players start to separate here. |
| A | 25-40 | 40-70 | Younger, rawer, wider variance. |
| ROOKIE | 20-35 | 35-75 | Low current, high volatility. |
| INTERNATIONAL | 20-35 | 40-80 | Highest variance; keep true 75-80 ceilings rare. |

## Player Attribute Fields

Hitter attributes:

- `contact`
- `power`
- `eye`
- `speed`
- `defense`
- `durability`

Pitcher attributes:

- `stuff`
- `control`
- `stamina`
- `velocity`
- `movement`

Overall formula weights:

| Hitter attr | Weight |
| --- | ---: |
| contact | 25% |
| power | 20% |
| eye | 15% |
| speed | 15% |
| defense | 15% |
| durability | 10% |

| Pitcher attr | Weight |
| --- | ---: |
| stuff | 30% |
| control | 25% |
| stamina | 15% |
| velocity | 15% |
| movement | 15% |

Development fields worth asking other AIs to supply:

- `floor` display rating
- `ceiling` display rating
- `developmentProgram`: `tools`, `fundamentals`, `refinement`, `mlb_prep`, `power`, `contact`, `speed`, `defense`, `control`, `velocity`, `breaking`, `stamina`
- `developmentTrajectory`: `ahead_of_curve`, `on_track`, `below_expectations`, `bust_risk`
- Personality scores 0-100: `workEthic`, `mentalToughness`, `leadership`, `competitiveness`
- Optional personality traits or short notes for future flavor.

Rule 5 note:

- Players signed at age 18 or younger become Rule 5 eligible after 4 seasons.
- Players signed older than 18 become Rule 5 eligible after 3 seasons.
- In current code, Rule 5 candidates are non-MLB players not protected on the 40-man.

## Balance Guidelines For AI Helpers

Per team, ask for:

- 5 affiliate names plus optional international academy name.
- 10-15 named high-priority prospects.
- 10-15 interesting depth players.
- Optional full affiliate rosters if that AI can produce consistent tables.

Prospect distribution per organization:

- 1 elite prospect at most for most teams: current 35-50, ceiling 65-75.
- 3-5 meaningful top prospects: current 30-55, ceiling 55-70.
- 8-12 real depth prospects: current 30-50, ceiling 45-60.
- The rest can be organizational depth with clear roles, not just random filler.

League-wide restraint:

- Do not give every team a 75+ ceiling player.
- Keep 80 ceiling nearly generational.
- Catchers, shortstops, center fielders, and starting pitchers can carry more scarcity value.
- Pitcher-friendly parks can justify deeper pitching identities; hitter-friendly parks can justify power/contact identities.
- Denver should have the most visible altitude/hitter effect.
- Kansas City already has special MLB cornerstone overrides in source; do not stack multiple extra 80-grade minor leaguers there unless Kevin wants KC to be intentionally overpowered.

## Contributor Packet Template

Give outside AIs this template for one team or one division.

```markdown
## Team Packet

Parent team:
Team ID:
Division:
Org identity:
Park/player-development identity:

### Affiliate Names

| Level | Affiliate city/name | Short name | Identity note |
| --- | --- | --- | --- |
| AAA |  |  |  |
| AA |  |  |  |
| A+ |  |  |  |
| A |  |  |  |
| Rookie |  |  |  |
| International academy |  |  |  |

### Top Prospects

| Rank | Name | Age | Pos | Level | Current 20-80 | Floor | Ceiling | Program | Trajectory | Short scouting note |
| ---: | --- | ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 |  |  |  |  |  |  |  |  |  |  |

### Depth / Role Players

| Name | Age | Pos | Level | Current 20-80 | Ceiling | Role |
| --- | ---: | --- | --- | ---: | ---: | --- |

### Org Notes

- Strengths:
- Weaknesses:
- Near-ready MLB help:
- Best long-view upside:
- Rule 5/protection decisions:
```

## CSV-Friendly Player Columns

If contributors prefer spreadsheet/CSV output, use these columns:

```text
teamId,parentTeam,affiliateLevel,affiliateName,firstName,lastName,age,position,currentDisplayOVR,floorDisplay,ceilingDisplay,contact,power,eye,speed,defense,durability,stuff,control,stamina,velocity,movement,workEthic,mentalToughness,leadership,competitiveness,developmentProgram,developmentTrajectory,role,scoutingNote
```

Rules for CSV:

- Use `affiliateLevel` values: `AAA`, `AA`, `A_PLUS`, `A`, `ROOKIE`, `INTERNATIONAL`.
- Fill hitter attributes for all players. For pitchers, hitter attributes can be low unless they are two-way concepts.
- Fill pitcher attributes only for `SP`, `RP`, `CL`.
- Use display-scale values in contributor work. Codex can convert to internal 0-550 later.
- Keep `teamId` exact from the official team table.

## Suggested Division Assignments For Other AIs

To keep the work parallel and reviewable, assign one division per helper:

- AI 1: AL_EAST, five teams.
- AI 2: AL_CENTRAL, five teams.
- AI 3: AL_WEST, six teams.
- AI 4: NL_EAST, five teams.
- AI 5: NL_CENTRAL, five teams.
- AI 6: NL_WEST, six teams.

Each helper should return only if Kevin asks for another contributor pass:

1. Affiliate names for every team in the assigned division.
2. Replacement or additional reviewed seed players that preserve the 169-player per-organization shape.
3. Balance notes explaining why no team is overloaded.
4. Any names or concepts that may need Kevin approval.

## Implementation Notes For A Future Codex Pass

Current implementation path:

1. Keep the structured compact fixture under `apps/web/src/workers/content`; authored data must not move back into `packages/sim-core`.
2. Validate team IDs, affiliate levels, legal positions, rating ranges, age ranges, and duplicate names.
3. Convert display 20-80 ratings to internal 0-550 ratings with `toInternalRating()`.
4. Overlay authored players into new-game generation only through `authoredPlayersByTeam`.
5. Keep existing saves unchanged.
6. Add tests for fixture validation, roster counts, stable content IDs, legal levels, no duplicate player identities, and no broken team IDs.

Do not add snapshot persistence for affiliate names or authored player metadata until the product decision is explicit. If affiliate names must appear in existing saves, that becomes save-schema work.
