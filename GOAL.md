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

- Current save schema is v34 in `packages/contracts/src/schemas/save.ts`.
- v33 -> v34 adds compact archived major-game box scores with
  `narrative.archivedGames: []` for existing saves.
- The explicit Season 10 v33 fixture must migrate to v34 without fabricating
  historic archived games.
- Any future save change still requires a version bump, migration, fixture
  update, old-save proof, and Season 10 reasoning.

## Verified Branch State

- Branch: `codex/mbd-ui-ux-ootp-overhaul`.
- Latest green remote checkpoint: `5d214ab` (`MBD Phase 12: Harden affiliate identity fallback`).
- GitHub Actions run `27846168866` passed workspace verify, isolated smoke gate,
  and determinism snapshot on `5d214ab`.
- The authored roster content pack materializes 5,408 stable players:
  32 organizations x 169 players across MLB, AAA, AA, A+, A, Rookie, and
  International, plus 192 affiliate identities.
- Authored content is kept in the versioned worker content seam rather than the
  game-engine core chunk.

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

## Local Sandbox Note

This checkout is a git repo, but Codex cannot write `.git/index.lock` in the
current sandbox. Stage/commit locally only from Kevin's terminal, or use a
single GitHub tree/commit/ref update when a small remote checkpoint is needed.
