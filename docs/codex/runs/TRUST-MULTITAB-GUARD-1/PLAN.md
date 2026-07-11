# TRUST-MULTITAB-GUARD-1 — Living Plan

## Objective and player outcome

Complete [goal 17](../../goals/17_TRUST_MULTITAB_GUARD_1.md): one browser document edits a root dynasty tree at a time, while a same-tree contender is blocked before gameplay and can safely retry the latest durable load after the owner closes.

## Live source truth

The complete source reconciliation is in [SOURCE_TRUTH.md](./SOURCE_TRUTH.md).

- Branch: `codex/multitab-guard-5`; start `c006ab9586b0b14b6c97d8f487f7792f13344d44`.
- Preserve and never stage the pre-existing edits to `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`.
- Manifest: `pnpm@9.15.4`; observed runtime: Node `v24.16.0`, pnpm `11.7.0`.
- Save truth: GameSnapshot v34, Dexie v5, stores `saves`, `saveIntegrityBackups`, and `leaderboard`.
- Baseline: focused boot/setup/settings/coordinator suite 56/56; root typecheck 9/9.
- Chromium primitive probe: Web Locks available; first page acquired; second same-resource page was denied; second acquired after first closed.
- Correction to roadmap wording: root and all what-if branches share one root-tree lock; a branch's `slotNumber` is null.

## Scope and non-goals

Allowed production areas:

- one small web-local save-session ownership coordinator/hook/provider;
- trusted save-tree root resolution and central write ownership assertions;
- active coordinator switch/quiescence integration;
- the central worker mutation proxy;
- boot/setup/settings/recovery activation and destructive-action integration;
- per-document active-target session hint in the existing game store;
- one blocking conflict component;
- focused Vitest and a dedicated two-page Playwright spec/config/helper changes.

Hard cut line: no `steal`, forced takeover, lease/heartbeat/TTL, persistent lock or Dexie v6, BroadcastChannel/localStorage arbitration, collaborative merge, navigable read-only dynasty, cross-device/cloud/service-worker authority, snapshot v35, write-ahead journal, export-version matrix, storage-pressure UI, gameplay/CPU/RNG change, broad worker cleanup, dependency, new route, or production E2E bypass.

Deferred adjacent work: mixed-version clients already open before deployment cannot be fenced; every-schema export CI is item 6; quota/save-size/pruning is item 7; interrupted-day journaling is item 8.

## Behavioral invariants

- Ownership is root-tree scoped, exclusive, same-origin, and held by the browser document.
- Authority exists before worker mutation and is rechecked at worker/storage boundaries.
- Pre-lock topology discovery never becomes gameplay; verified state is freshly re-read after acquisition.
- Candidate failure preserves the outgoing editor and releases only the candidate.
- Outgoing ownership is not released with capture/write/retry work unresolved.
- Root/branch/sibling conflict; distinct root slots remain independent.
- Background/hidden/BFCache state never expires ownership.
- No forced takeover, wall clock, actor ID, RNG, heartbeat, or persistent lease.
- Conflict creates no worker import, pending generation, save failure/recovery toast, checksum change, or shared-pointer clear.
- A per-document session hint is reload targeting only, never authority.
- v34/Dexie-v5/current-old-deep saves, item-2 recency, item-3 retry/fallback, item-4 integrity, determinism, and CPU fairness remain unchanged.

## Design decision

Use the platform Web Locks API as the only arbiter. A coordinator requests `mbd-save-tree-v1:<root-id>` exclusively with `ifAvailable`, holds the granted callback on a local deferred, and tracks candidate versus committed ownership. It supports same-root borrowing, distinct-root candidate commit/abort, transient destructive-operation locks, and deterministic all-five-slot acquisition for Clear All.

The application resolves trusted root topology, acquires, then reloads and verifies under ownership. `invokeWorkerMethod` blocks classified gameplay mutations without a committed/candidate authorization; central save write paths reject mutation without the matching local lock. New-game acquisition precedes `newGame`. Same-tab switching gains an explicit active-persistence transition that quiesces the outgoing exact save before its root lock can release.

The contender receives a blocking non-dismissible screen with `Check again`. Retry reacquires and repeats ordinary safe load/import. We reject BroadcastChannel/localStorage election, persisted TTL leases, and Web Locks `steal` because none can safely prove the previous worker stopped.

Compatibility: no GameSnapshot or IndexedDB migration. The local session hint layers over the existing global last-opened pointer and is removable without save conversion. Rollback removes lock/session UI code and assertions; safe rollback must be coordinated with closing all already-open guarded tabs and cannot claim mixed-version protection.

## Milestones

### M0 — Goal and source reconciliation

Files: goal 17, `SOURCE_TRUTH.md`, this plan.

Proof: live source map, three read-only reviews, baseline focused suite/typecheck, actual two-page Web Locks probe.

Status: Complete.

### M1 — Ownership coordinator and tree target

Files: new session-ownership module/tests; narrow save-system resolver/tests; game-store session-target tests.

Behavior: exact lock naming; exclusive acquire; contention; unavailable/rejected API; candidate commit/abort; same-tree reentry; distinct roots; all-slot acquisition; trusted root/branch/shadow topology; per-tab reload target.

Proving command: focused coordinator, save resolver/integrity, and game-store tests plus web source typecheck.

Status: Complete — 28 focused tests passed across the coordinator, resolver, and game-store session hint; web source/E2E typecheck and `git diff --check` passed.

### M2 — Central mutation and persistence defense

Files: `useWorker.ts` tests; active persistence and save-system write boundaries/tests.

Behavior: classified mutations require ownership; `newGame` and import have explicit candidate authorization; delayed capture rechecks; retries/metadata/replacement/repair/branch/delete/Clear All reject foreign/no ownership; no false status.

Proving command: focused worker, active persistence, save transaction/integrity tests plus source typecheck.

Status: Complete — exact-save worker authorization, transition pause fencing, candidate-only new-game authorization, delayed export rechecks, and retry/storage defenses are covered by the final focused matrix and full web suite.

### M3 — Safe activation, switching, and conflict UX

Files: App provider/boot, setup/settings/recovery hooks, active coordinator transition, conflict component and tests.

Behavior: acquire -> fresh verified read -> import -> activate; blocked contender never clears the shared pointer or imports; failed candidate preserves outgoing editor; new game acquires before mutation; conflict focus/mobile/copy and Retry semantics.

Proving command: focused boot/setup/settings/recovery/conflict/coordinator tests plus web typecheck.

Status: Complete — candidate/transient separation, setup operation blocking, recovery supersession, worker discard, kind-aware ownership copy, and pre-import conflict UX are covered by focused tests and the permanent browser proof.

### M4 — Permanent two-page browser proof

Files: `e2e/multitab-guard.spec.ts`, Playwright config, minimum helper additions.

Behavior: public Page-A save; same-origin duplicate Page B blocked; exact pair unchanged; background owner durable mutation; explicit handoff after close; Page-B public mutation and hard reload; desktop/mobile screenshots.

Proving command: dedicated Playwright spec, then complete `pnpm e2e:reload-smoke`.

Status: Complete — the dedicated production-preview Chromium test passed with public setup, real `window.open`, exact integrity pairs, background owner mutation, three separately observed native-lock retry lifecycles, blocked Space no-op, close-and-retry takeover, successor mutation, desktop/375x667 keyboard/geometry proof, and hard reload. The final Sol-correction rerun passed 1/1 in 13.7 seconds without retry.

### M5 — Full gates, adversarial review, completion

Files: final diff and `COMPLETION.md`; plan updates.

Proof: targeted tests, root typecheck, full tests, build/PWA, determinism, complete Playwright, scans/diff check, desktop/mobile inspection, and three read-only adversarial reviews with no unresolved P0/P1.

Status: Pending.

## Acceptance matrix

| Requirement | Implementation seam | Unit/integration proof | Browser proof | Status |
|---|---|---|---|---|
| Exactly one same-tree editor | session coordinator + App boot gate | simultaneous acquire/denial; no import | Page B conflict before gameplay | Complete |
| Root/branch/sibling alias; distinct roots independent | trusted root resolver + lock name | root/branch/shadow/different-root cases | same-tree duplicate; independent-root coordinator proof | Complete |
| Candidate-safe boot/load/switch | ownership claim + active transition | order assertions; failure preserves old | owner remains usable; handoff fresh-loads | Complete |
| New game before worker mutation | setup handler + worker guard | denied target never calls `newGame` | public creation owns before second tab | Complete |
| Worker mutation defense | `invokeWorkerMethod` mutation set | no call without current/candidate ownership | public controls unreachable in contender | Complete |
| Storage/retry/destructive defense | save system + active coordinator assertions | delayed capture/retry/replace/repair/delete/branch/Clear All | exact pair unchanged from contender | Complete |
| Background is not release | browser-owned lock only | no visibility/pagehide release path | Page A mutates while B foregrounded | Complete |
| Owner close and explicit retry | lock release + boot retry | release/reacquire/fresh read | B acquires A's latest state, saves, reloads | Complete |
| Unsupported/rejected/unknown fail closed | typed ownership failures + screen | distinct states, no mutation/status | production Chromium supported path | Complete |
| Per-document reload target | game-store session hint | duplicate clone/same-tab/different-tab merge cases | duplicate still contends; new owner reloads target | Complete |
| Accessible desktop/mobile conflict | conflict component/focus utility | labels, focus, busy/error, Escape refusal, bounds | desktop + 375x667 geometry/screenshot | Complete |
| Save/determinism compatibility | no save/DB schema; full gates | current/v17/deep v33, imports, integrity suites | hard reload and PWA build | Complete |
| No mixed-version overclaim | copy/docs/completion | source/copy assertions | not applicable | Complete |

## Progress log

1. 2026-07-11 — Item 4 committed as `c006ab9` and fast-forwarded to `main`; created `codex/multitab-guard-5` without touching the three user-owned dirty files.
2. 2026-07-11 — Re-read the updated MBD implementation skill and governing docs, created goal 17, recorded v34/Dexie-v5/toolchain/source truth, and ran 56 focused baseline tests plus root typecheck.
3. 2026-07-11 — Three read-only source/test/risk passes found no stop condition and converged on root-tree Web Locks, blocking pre-import UX, fresh retry load, no TTL/steal, central mutation/storage defense, all-slot Clear All exclusion, and separate two-page Playwright proof.
4. 2026-07-11 — Actual project Chromium preview proved exclusive contention and automatic acquisition after owner-page close. Selected per-document session hint over changing the global last-opened fallback.
5. 2026-07-11 — Completed M1. Added the no-timer Web Locks coordinator, candidate/committed/transient/all-root lifecycle, trusted root/branch/shadow target resolution, and sessionStorage reload override. Focused tests passed 28/28; web source and E2E TypeScript passed.
6. 2026-07-11 — Completed M2. Added exact active/candidate worker authorization, central storage assertions, delayed-export and retry rechecks, and explicit active-save transition barriers. Lock-loss/sibling tests passed 64/64 with the core persistence suite.
7. 2026-07-11 — Completed M3. Integrated boot, setup, settings, recovery, new-game, branch, import, delete, repair, and Clear All paths; added the blocking provider/conflict surface; hardened rollback so claim release cannot be skipped by an already-completed transition. The broad focused suite passed 153/153, recovery contention 10/10, follow-up path tests 26/26, and web TypeScript passed.
8. 2026-07-11 — Completed M4. Production-build Chromium passed the permanent two-page proof in 10.3 seconds: exact pair unchanged in the contender, background owner pair changed, retry stayed blocked, close enabled fresh takeover, successor pair changed, and hard reload retained it. Keyboard, Escape, focus trap, and 375x667 geometry were exercised with an attached screenshot.
9. 2026-07-11 — First M2/M3 adversarial review returned `FIX_AND_REVIEW`: worker mutations could cross a persistence-only transition; stale callbacks were not exact-save bound; branch activation could overlap deletion; recovery conflict takeover retained stale recovery; post-`newGame` failures retained mutated worker state; and non-contention failures were mislabeled. Reopened M2/M3 and stopped the obsolete full gate. That gate had reached 1,777/1,780 web tests with one bundle-budget failure (main gzip 87,079 vs 82,944 bytes) before stopping.
10. 2026-07-11 — Added the central exact-save worker-mutation gate, candidate-only new-game scope, candidate/transient exclusion, commit/store-before-unpause ordering, setup operation mutex/global disables, failed-new-game worker restart, recovery supersession, kind-aware failure copy, and lazy conflict chunk. New/updated focused suites passed 89/89; web TypeScript passed.
11. 2026-07-11 — Reconciled the final Pulse acknowledgement/dismissal patch. Its worker mutation now persists through the active coordinator before route refresh; rejected mutations do neither, and a `{ saved: false }` persistence result deliberately retains the prior route data so the UI cannot imply durable completion. The focused Pulse hook suite passed 7/7.
12. 2026-07-11 — Re-ran the ownership/transition/boot/setup/settings/recovery/conflict matrix plus Pulse: 13 files / 122 tests passed. Expected logger output from intentional Settings failure-path tests was observed; no test failed.
13. 2026-07-11 — Negative control: temporarily changed `workerMutationSession.ts` from `if (activePause)` to `if (false && activePause)`. `pnpm --filter @mbd/web exec vitest run src/shared/lib/workerMutationSession.test.ts` failed exactly at `rejects new gameplay mutations until the exact transition pause ends` (expected a `not_owner` throw). Restored the exact condition with `apply_patch`; the same command then passed 2/2 and `git diff` showed no remaining change to that file.
14. 2026-07-11 — Web typecheck passed. The first dedicated two-page Chromium rerun failed only because headless `bringToFront()` did not change `document.visibilityState`; its owner lock remained in place. Replaced that non-portable assertion with Chromium CDP `Page.setWebLifecycleState` freeze/active while retaining the real contender retry and exact-pair assertions. The final production-preview `multitab-guard.spec.ts` passed 1/1 in 9.7 seconds, proving a frozen owner retains authority, close-and-retry fresh takeover, successor persistence, hard reload, and the 375x667 conflict surface.
15. 2026-07-11 — Sol correction pass: added an honest `ownership_lost` conflict state for post-import `not_owner` failures and asserted it through the existing boot regression and conflict-copy component matrix (2 files / 19 tests passed). Strengthened the permanent browser proof with a test-only duplicate-page Web Locks request probe that delays exactly one request while transparently delegating to the native API. Each occupied Retry now proves request-attempt -> disabled/`aria-busy`/`Checking` -> returned contended/enabled state; the blocked tab also presses Space and proves no gameplay shell/control becomes reachable and the exact primary/shadow pair is unchanged. Fresh web production build passed (3,020 modules; PWA precache 166 entries), final web typecheck passed, and corrected production-preview Chromium passed 1/1 in 13.7 seconds with no retry. `git diff --check` and forbidden-ownership/`Math.random` scans passed.
16. 2026-07-11 — Mechanical closeout correction: completed the existing `SetupPage.test.tsx` ownership/persistence mocks for newly added exports; no production behavior changed. Focused matrix passed 16 files / 137 tests. Root typecheck passed 9/9 Turbo tasks; full test passed 5 packages (contracts 22/22, sim-core 140 files / 1,646 tests, web 451 files / 1,823 tests, UI 1/1); production build passed 3,020 modules with PWA precache 166; determinism passed 3/3; dedicated multitab passed 1/1; reload-smoke passed 2/2 in 5.0 minutes. Diff, conflict-marker, schema/dependency/item-6, and authority scans passed. Negative-control receipt and restoration were re-verified from source.

Next: write `COMPLETION.md`, stage only item-5-owned files, commit, fast-forward local `main`, and verify the landing. Blockers: none.

## Decision log

1. Lock the entire root save tree, not exact branch IDs or nullable slots.
2. Use Web Locks as authority; no fallback election. Unsupported/insecure contexts fail closed.
3. Choose blocking editor conflict, not navigable read-only gameplay.
4. No forced takeover. The owner must close/reload; contender explicitly retries a fresh load.
5. Keep hidden/background/BFCache ownership; document termination is release.
6. Retain localStorage as global last-opened fallback and add sessionStorage as the per-document reload target.
7. Add both pre-worker and central storage defense; UI disabling is evidence, not authority.
8. Clear All acquires all five root resources in ascending slot order.
9. Keep the multitab browser test separate from the fixed-clock trust journey.
10. State mixed-version rollout honestly; old already-running code cannot be fenced retroactively.

## Completion conditions

- All acceptance rows Complete with exact source/test/browser evidence.
- No unresolved P0/P1 from persistence/race, compatibility/determinism/scope, and UX/browser review.
- `pnpm typecheck`, targeted tests, `pnpm test`, `pnpm build`, `pnpm verify:determinism`, and complete `pnpm e2e:reload-smoke` pass in this worktree.
- Changed-source scans find no `steal`, heartbeat/TTL, persisted lock state, schema bump, unseeded simulation truth, or new dependency.
- Desktop/mobile two-page proof is visually inspected and exact primary/shadow generations prove no contender write.
- v34 and Dexie v5 remain current; old/deep saves and import/integrity behavior remain safe.
- `COMPLETION.md` maps every goal requirement, changed file, command/result, limitation, and rollback.
