# MBD Franchise and Affiliate Originality Review

Date: 2026-06-18
Updated: 2026-06-19

## Scope

- Reviewed 32 parent clubs from `packages/sim-core/src/league/teams.ts`.
- Reviewed 192 affiliate identities from `MBD_Minor_League_Deliverables/MBD_Minor_League_Affiliate_Names.csv`.
- Checked current active MLB/MiLB names through the official MLB Stats API:
  `https://statsapi.mlb.com/api/v1/teams?sportIds=1,11,12,13,14,16&activeStatus=Yes&hydrate=league,sport`
- Spot-checked obvious cross-sport and college conflicts against official public sites:
  [Charlotte Hornets](https://www.nba.com/hornets),
  [Miami Hurricanes](https://miamihurricanes.com/),
  [Ohio State Buckeyes](https://ohiostatebuckeyes.com/),
  [Oklahoma City Thunder](https://www.nba.com/thunder).

This review preserved the pre-approval audit trail. Team IDs remain stable for every approved rename.

## Release Decision

Kevin approved option 1 on 2026-06-19: rename every blocker, high, medium, and internal-duplicate identity with original baseball-safe names while preserving IDs. Current source/content applies the replacement table below; conflict rows remain as historical evidence from the review.

## Approved Replacement Names

| Scope | ID / level | Previous identity | Approved identity |
| --- | --- | --- | --- |
| Parent | `hou` | Houston Space Cowboys | Houston Starliners |
| Parent | `phx` | Phoenix Dust Devils | Phoenix Copperbirds |
| Parent | `cha` | Charlotte Hornets | Charlotte Weavers |
| Parent | `mia` | Miami Hurricanes | Miami Palms |
| Parent | `col` | Columbus Buckeyes | Columbus Wayfinders |
| Parent | `orl` | Orlando Thunder | Orlando Sunbursts |
| Affiliate | `hou:AAA` | Corpus Comets / `Comets` | Corpus Navigators / `Navigators` |
| Affiliate | `hou:A_PLUS` | The Woodlands Moonshots / `Moonshots` | The Woodlands Starbreakers / `Starbreakers` |
| Affiliate | `phi:ROOKIE` | Valley Forge Sparks / `Sparks` | Valley Forge Riveters / `Riveters` |
| Affiliate | `ral:ROOKIE` | Cary Saplings / `Saplings` | Cary Sprouts / `Sprouts` |
| Affiliate | `cha:INTERNATIONAL` | San Juan Hornet Academy / `Hornet Academy` | San Juan Loom Academy / `Loom Academy` |
| Affiliate | `col:INTERNATIONAL` | Puerto Plata Buckeye Academy / `Buckeye Academy` | Puerto Plata Wayfinder Academy / `Wayfinder Academy` |
| Affiliate | `orl:INTERNATIONAL` | Santo Domingo Thunder Academy / `Thunder Academy` | Santo Domingo Sunburst Academy / `Sunburst Academy` |

## Direct MLB/MiLB Conflicts

| Severity | Current identity | Conflict | Source | Recommendation |
| --- | --- | --- | --- | --- |
| Blocker | `hou` parent: Houston Space Cowboys | Sugar Land Space Cowboys | Active Triple-A, Pacific Coast League | Rename parent nickname; keep `hou` and Houston. |
| Blocker | `phx` parent: Phoenix Dust Devils | Tri-City Dust Devils | Active High-A, Northwest League | Rename parent nickname; keep `phx` and Phoenix. |
| Blocker | `hou` AAA: Corpus Comets / `Comets` | Oklahoma City Comets | Active Triple-A, Pacific Coast League | Rename the affiliate identity and short name; keep parent/team row. |

## High-Visibility Non-Baseball Conflicts

| Severity | Current identity | Conflict | Recommendation |
| --- | --- | --- | --- |
| High | `cha` parent: Charlotte Hornets | Active NBA Charlotte Hornets | Rename parent nickname before v1 unless Kevin explicitly accepts the conflict. |
| High | `mia` parent: Miami Hurricanes | University of Miami Hurricanes athletics brand | Rename parent nickname before v1 unless Kevin explicitly accepts the conflict. |
| High | `col` parent: Columbus Buckeyes | Ohio State Buckeyes athletics brand in Columbus market | Rename parent nickname before v1 unless Kevin explicitly accepts the conflict. |
| Medium | `orl` parent: Orlando Thunder | Active NBA Oklahoma City Thunder nickname | Rename recommended, but lower risk than exact city/name collisions. |

## Internal Duplicate Affiliate Short Names

Full affiliate names are unique. Three short names are duplicated and should be cleaned up before the full 5,408-player content expansion because short names appear in compact UI surfaces.

| Short name | Rows | Recommendation |
| --- | --- | --- |
| Moonshots | `hou` A_PLUS The Woodlands Moonshots; `den` AAA Colorado Springs Moonshots | Rename one short name and full identity if needed. |
| Saplings | `ral` ROOKIE Cary Saplings; `por` ROOKIE Forest Grove Saplings | Rename one short name and full identity if needed. |
| Sparks | `phi` ROOKIE Valley Forge Sparks; `orl` ROOKIE Kissimmee Sparks | Rename one short name and full identity if needed. |

## Shared Cities

Shared cities are not blockers by themselves because this content intentionally uses regional baseball geography. These are review-only unless Kevin wants every affiliate place name to be globally unique:

- Athens, Cartagena, Columbia, Erie, La Romana, Monterrey, Newark, Pasadena, Salem, San Jose, San Juan, San Pedro, Santo Domingo, Springfield, Tijuana, Vancouver, Waco, Wilmington.

## Clean Findings

- No duplicate full affiliate names.
- No direct meaningful MLB/MiLB full-name or nickname collisions outside the three blocker rows listed above.
- Existing IDs can survive every recommended rename because IDs are source-stable team IDs plus level, not display names.

## Approval Status

No further approval is needed for the flagged identities in this review. Any future originality audit that flags new blocker/high/medium conflicts should receive a separate approval before renaming.
