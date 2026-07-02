# MBD GOAT Gap Analysis

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Core Verdict

MBD is a real, playable, deep browser baseball dynasty game. It is not yet the definitive baseball dynasty simulator because its deepest systems are not all connected into durable player agency and league memory. The biggest GOAT gap is not raw feature count; it is trust and consequence over decades.

## Five-Year Competition Standard

| Comparison target | What the player expects | MBD current position | Gap |
|---|---|---|---|
| OOTP-style baseball depth | Farm systems, draft, scouting, roster rules, transactions, league history, stats, records. | Many systems exist; deterministic browser-first implementation is strong; dirty-tree save-trust fixes are focused-tested. | Roster-rule edge cases, AI org identity, player development controls, and full save-reload validation need work. |
| Baseball Mogul-style accessibility | Fast seasons, clear team building, readable economics, easy decisions. | Dashboard/onboarding guide players well; dirty-tree readiness, nudge, and finance fixes are focused-tested. | Remaining copy/data polish and browser validation hurt release confidence. |
| Football Manager-style attachment | Staff, youth development, scouting uncertainty, club identity, player stories. | Onboarding, press, identity, minors, and history are promising. | Player-controlled development, mentorship, scouting fog, and AI club personalities need deeper loops. |

## Ranked GOAT Gaps

| Rank | Gap | Evidence | Why it stops greatness | First slice |
|---:|---|---|---|---|
| 1 | Save trust fixes need browser reload validation and ownership review. | Dirty-tree draft/app-shell/press autosave tests and broad gates passed; browser reload smoke is pending. | A dynasty game cannot rely on unreviewed local fixes for draft picks or story consequences. | Browser reload smoke plus review. |
| 2 | Player development agency is only partly solved. | Dirty-tree focus cards can apply persisted plans, but playing time, mentorship, and profile-level controls remain thin. | Prospects must feel managed, not merely observed. | Browser-validate current plan controls, then add mentorship/playing-time depth. |
| 3 | AI organizations lack durable identity. | Draft AI signature and user-only development identity effects. | CPU teams must create history without the player. | AI org profile layer. |
| 4 | Scouting/draft do not yet create enough uncertainty-driven drama. | Dirty-tree draft autosave exists; draft AI still lacks scout quality/org identity. | Draft should be a franchise-defining event. | Scout/org-weighted AI. |
| 5 | Minor leagues are strong for new games but not fully alive. | Authored content exists; old-save upgrade and controls absent. | Farm must be a development machine. | Existing-save upgrade and affiliate controls. |
| 6 | Dynasty history is strong forward but sparse for old saves. | v34 archive migration empty by design. | Year 30 should remember Year 2. | Legacy copy/enrichment and era summaries. |
| 7 | UI data scale/copy issues break immersion. | Readiness and finance spacing are fixed in dirty tree; runtime still found `3 place`. | One wrong number can make real systems feel fake. | First-day trust polish slice. |
| 8 | Worker/UI boundary is too porous. | 56 non-worker web imports from `@mbd/sim-core`. | Sim changes can leak into UI and slow safe iteration. | DTO import cleanup by domain. |
| 9 | Structural debt is real. | 19 cycles, 225 unused exports, very large worker files. | Long-term feature velocity will slow. | Opportunistic cycle/module cleanup after blockers. |
| 10 | Release evidence is broad but not end-to-end save-reload focused. | Tests/build pass; missing high-value mutation reload smoke. | Public trust needs user-journey verification, not just unit gates. | Add browser smoke script. |

## The Winning Path

1. Make saves boringly trustworthy.
2. Make every prospect recommendation actionable.
3. Give CPU organizations persistent personalities.
4. Make scouting uncertain, expensive, and narratively meaningful.
5. Tie draft, minors, development, injuries, trades, and history into player arcs.
6. Keep the browser-first accessibility while adding OOTP-grade depth in vertical slices.

## Top 25 Highest-Leverage Actions

1. Run browser reload smoke for current dirty autosave/readiness fixes and land them cleanly.
2. Land/review the dirty draft, app-shell, press, and readiness changes intentionally.
3. Add visible last-saved/autosave state.
4. Browser-validate and land dirty-tree development-plan controls.
5. Persist mentorship assignments or relabel mentorship as analysis-only.
6. Recalibrate setup farm grades.
7. Browser-validate dirty onboarding nudge/finance fixes.
8. Continue onboarding finance materiality polish.
9. Build optional old-save authored-minors upgrade.
10. Add deterministic AI org profiles.
11. Feed org profiles into draft AI.
12. Feed org profiles into development, trade, payroll, and free agency.
13. Add draft class distribution and late-round value tests.
14. Add release browser smoke with save reloads.
15. Add prospect-origin timeline badges.
16. Add legacy history copy/enrichment.
17. Add rivalry-origin and era summaries.
18. Clean direct runtime `@mbd/sim-core` UI imports.
19. Split high-risk worker modules around active domains.
20. Burn down circular dependencies.
21. Clean unused exports/dependency findings.
22. Add roster-rule edge-case tests for Rule 5/40-man/options/waivers.
23. Add first-day copy/data polish tests.
24. Run desktop/mobile/PWA manual release checks outside this shell.
25. Regenerate current-truth docs after accepted fixes.
