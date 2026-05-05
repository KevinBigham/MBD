# Tutorial Assistant V1 Coverage Matrix

Date: 2026-05-05

V2 update: Mack Mercer now has first-session cues, phase-aware closed-market next actions, story-so-far context, feedback capture, and shared OVR badge grammar on the highest-impact decision surfaces.

| Route | Page | Assistant Guidance | OVR/Ratings Visible When Relevant | Mobile Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | Setup / Save Hub | Implemented | Partial | Existing LC-3 pass | Assistant covers first-save guidance |
| `/onboarding` | Onboarding | Implemented | Partial | Existing LC-3 pass | Existing AGM and guided-start nudge systems |
| `/dashboard` | Dashboard | Implemented | Indirect | Existing LC-3 pass | Existing GameAdvisor, global Assistant mounted |
| `/roster` | Roster | Implemented + V2 cue | Yes + action-card badges | V2 hardened | PageHelp exists; OVR/grades in tables plus DFA/promotion/waiver/extension cards |
| `/minors` | Minors | Implemented + V2 cue | Yes + display-scale badges | V2 hardened | Assistant explains promotion and development |
| `/players` | Players | Implemented | Yes | Existing LC-3 pass | OVR and grade in directory |
| `/players/compare` | Player Compare | Implemented | Yes | Existing LC-3 pass | Assistant explains compare decisions |
| `/players/:playerId` | Player Profile | Implemented + V2 cue | Yes + shared header badge | V2 hardened | Header and tabs expose ratings |
| `/scouting` | Scouting | Implemented + V2 cue | Yes + pro-search badges | V2 hardened | Defaults to Pro Reports for first-session clarity |
| `/staff` | Staff | Implemented | Yes | Existing LC-3 pass | Coach grades are rating-like |
| `/draft` | Draft | Implemented + phase-aware V2 action | Yes | Existing LC-3 pass | Closed-market guidance redirects to Scouting |
| `/trade` | Trade | Implemented + phase-aware V2 action | Yes + package labels | V2 hardened | Local trade package labels now include OVR/grade |
| `/standings` | Standings alias | Implemented | N/A | Existing LC-3 pass | Alias route |
| `/league/standings` | Standings | Implemented | N/A | Existing LC-3 pass | PageHelp exists |
| `/leaders` | Leaders alias | Implemented | Yes | Existing LC-3 pass | Alias route |
| `/league/leaders` | Leaders | Implemented | Yes | Existing LC-3 pass | OVR visible in leaders table |
| `/schedule` | Schedule | Implemented | N/A | Existing LC-3 pass | Assistant explains sim and inspect rhythm |
| `/games/:gameIndex` | Box Score | Implemented | N/A | Existing LC-3 pass | Assistant explains result reading |
| `/press-room` | Press Room | Implemented | N/A | Existing LC-3 pass | Existing press narratives |
| `/playoffs` | Playoffs | Implemented | N/A | Existing LC-3 pass | Assistant explains postseason flow |
| `/free-agency` | Free Agency | Implemented + phase-aware V2 action | Yes | Existing LC-3 pass | Closed-market guidance redirects to Finance |
| `/offseason` | Offseason | Implemented | Yes | Existing LC-3 pass | OVR visible in candidates/Rule 5 surfaces |
| `/finance` | Finance | Implemented + V2 cue | Yes in contracts | V2 hardened | Contract table now includes sortable OVR/grade |
| `/career` | GM Career | Implemented | N/A | Existing LC-3 pass | Assistant explains career stakes |
| `/history` | History | Implemented | Historical | Existing LC-3 pass | Peak/current OVR in some history surfaces |
| `/achievements` | Achievements | Implemented | N/A | Existing LC-3 pass | Optional goal guidance |
| `/rivalries` | Rivalries | Implemented | N/A | Existing LC-3 pass | Assistant explains consequences |
| `/front-office` | Owner Intel | Implemented | Indirect | Existing LC-3 pass | Assistant explains patience and reputation |
| `/pulse` | Pulse | Implemented | Indirect | Existing LC-3 pass | Monthly decision spotlight exists |
| `/scenarios` | Challenges | Implemented | Varies | Existing LC-3 pass | Scenario-specific goals |
| `/stats` | Stats Encyclopedia | Implemented | Explanatory | Existing LC-3 pass | Best home for deeper rating/stat definitions |
| `/records` | Record Watch | Implemented | Historical | Existing LC-3 pass | Legacy guidance |
| `/settings` | Settings | Implemented + V2 cue | N/A | Existing LC-3 pass | Assistant explains replay/accessibility; feedback loop lives in Assistant |
