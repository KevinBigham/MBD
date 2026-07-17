# GOAL.md - Mr. Baseball Dynasty v1 Finish

> Current repo-level goal for the active MBD v1 branch.

## Mission

Ship Mr. Baseball Dynasty as a hardcore-first single-player GM sim for desktop
browser, responsive tablet/mobile, and installable PWA. Keep the web/PWA build
canonical for v1; native desktop/Steam wrappers are deferred behind the platform
ADR and must not block web release.

## Current Direction

- GM-only scope; no pitch-by-pitch manager mode for v1.
- Worker remains canonical; Zustand remains a UI mirror.
- AI difficulty may improve decision quality, search, and consistency, but must
  not use hidden boosts or cheating.
- Prioritize minors, scouting, development, draft, dynasty memory, fair AI,
  presentation, sim balance, and reliability gates.
- New games should use the authored world; existing saves get compatible
  affiliate flavor and migrations, never replacement players.

## Current Save State

- Current save schema is v35 in `packages/contracts/src/schemas/save.ts`.
- v34 -> v35 adds durable trade financial terms with empty capability for old
  saves; it fabricates no retention, reimbursement, or trade history.
- The explicit Season 10 v33 fixture must migrate through v34 to v35 without
  fabricating historic archived games or financial trade facts.
- Any future save change still requires a version bump, migration, fixture
  update, old-save proof, and Season 10 reasoning.

## Active Campaign State

- The authoritative campaign ledger is `docs/codex/GOAT_ROADMAP_STATUS.md`;
  branch names and revisions must be verified from live Git before every slice.
- Roadmap items 1–17 and 80 are verified complete in the ledger.
- Roadmap item 17, contract-safe salary retention and player-linked cash
  reimbursement in two-team trades, is complete under Goal 27 /
  `docs/codex/runs/ECON-TRADE-RETENTION-1/`.
- Roadmap item 18, the 30-season multi-seed economy soak, is active on its
  isolated Goal-28 branch. Its corrected seed-7111 proof reached only primary
  season 17 before the fixed 40-minute gate. Kevin authorized Goal 29 /
  `ECON-LONG-SAVE-PERF-1` as a bounded semantics-neutral prerequisite from clean
  `main`; item 19 remains closed until the prerequisite lands and Goal 18
  completes.

## Remaining Release Gates

- Keep targeted tests, full tests, typecheck, build, determinism, smoke gate,
  old-save/Season-10 migration matrix, and bundle budgets green.
- Finish/verify manual desktop and mobile playtests.
- Smoke Chrome, Firefox, and Safari/WebKit routes for critical console errors.
- Verify installable/offline/update/save-recovery PWA behavior outside the
  restricted Codex shell.
- Keep docs, changelog, and release checklist current.
- Produce a clean v1 tag/build only after CI, deploy, browser/PWA smoke, and
  manual playtest gates are green.

## Git Safety

Use one bounded `codex/` branch/worktree per slice. Preserve user-owned dirty
files, stage only verified slice paths, land by local fast-forward, and never
push, deploy, tag, publish, or release without explicit authorization.
