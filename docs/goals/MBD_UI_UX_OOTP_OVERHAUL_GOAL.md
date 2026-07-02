/goal /goal Continue in /Users/tkevinbigham/Downloads/MBD-main.

Objective: make MBD much easier to navigate and easier to trade in, using current source plus the local OOTP Baseball 27.app reference. Implement the next safest high-impact UI/UX slice from docs/CODEX_UI_UX_OOTP_OVERHAUL_GUIDE.md.

Read first:
1. AGENTS.md if present; if absent, use Kevin rules: seeded RNG only, no save schema change without version/migration/fixture/tests, no unrelated refactors, focused tests, explicit git staging.
2. STATUS.md
3. docs/CODEX_GAME_GUIDE.md
4. docs/CODEX_UI_UX_OOTP_OVERHAUL_GUIDE.md
5. docs/CODEX_FEATURE_DOMAIN_GUIDE.md
6. docs/CODEX_SOURCE_ATLAS.md
7. docs/CODEX_WORKER_WIRING_MATRIX.md

Current UX diagnosis:
- Original GOAT plan is effectively complete, but MBD is still hard to learn.
- Navigation is too flat: many routes in Sidebar/CommandPalette without task groups.
- Trade Center is powerful but overloaded; "Start Negotiation" and "Review Trade Market" both just open /trade.
- Help/assistant/tour/PageHelp/dashboard guidance are separate systems.
- OOTP reference suggests manager home, global find, quickstarts, indexed help, report hubs, status language, and wizards. Do not decompile/copy OOTP code.

North star: guided GM cockpit. Every screen should answer what this is, why it matters, what to do next, and where to go.

Priority order:
1. Navigation IA + command palette registry: group routes as Home, Team, Players, Transactions, League, Story, System; preserve URLs; improve mobile More; add intent aliases like trade, shop player, fix roster, budget, reports, what now.
2. Canonical guidance registry: feed Assistant, TopBar help, PageHelp, command palette aliases, and route help from one route/task matcher; include /news and dynamic routes.
3. Simple Trade lane: /trade?mode=quick, /trade?mode=builder, /trade?mode=offers, /trade?mode=market; make command actions distinct; add visible trade checklist and use existing DTOs before new worker logic.
4. Trade explainability/CTA wiring: Dashboard Trade Intel clickable, player/roster/scouting trade shortcuts, plain reasons for accept/reject/counter.
5. Reports/quickstarts/settings replay if the above is already done.

Start by checking git status and dependencies. If node_modules missing, run CI=true npx --yes pnpm@9.15.4 install --frozen-lockfile. Run focused baseline tests before edits where feasible.

Keep first pass UI/DTO-only unless absolutely necessary. If save schema is needed, stop and ask Kevin. If trade suggestion randomness is needed, use seeded RNG only.

Expected files likely include apps/web/src/app/layout/Sidebar.tsx, CommandPalette.tsx, TopBar.tsx, assistantGuidance.ts, pageHelpDefinitions.ts, and trade route/components/hooks. Add focused tests for changed behavior.

Verification:
- focused web tests for touched Sidebar/CommandPalette/TopBar/assistant/PageHelp/trade files
- npx --yes pnpm@9.15.4 --filter @mbd/web typecheck
- npx --yes pnpm@9.15.4 typecheck
- npx --yes pnpm@9.15.4 build
- rg -n "Math\\.random\\(" apps packages --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/*.md'

Final response must use: Plan, Files, Patch, How to test, Handoff back to Claude Code. Include save/RNG safety, exact commands, pass/fail status, commit hash if committed, and GitHub Actions result if pushed.
