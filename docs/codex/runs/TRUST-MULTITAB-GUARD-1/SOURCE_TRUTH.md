# TRUST-MULTITAB-GUARD-1 — Source Truth

Recorded: 2026-07-11 07:47 CDT

## Worktree and toolchain

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch: `codex/multitab-guard-5`
- Starting commit: `c006ab9586b0b14b6c97d8f487f7792f13344d44` (`Add verified save integrity recovery`)
- Pre-existing user-owned dirty files, excluded from this slice: `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`
- Package manifest pins `pnpm@9.15.4`; the observed shell runtime is Node `v24.16.0` and pnpm `11.7.0`.
- Root scripts from live `package.json`: `typecheck` = `turbo typecheck`; `test` = `turbo test`; `build` = `turbo build`; `verify:determinism` = the sim-core determinism Vitest; `e2e:reload-smoke` = the web Playwright gate.
- Web scripts: `typecheck` includes source and E2E TypeScript; `test` is `vitest run`; `build` is `vite build`; `e2e:reload-smoke` is the serial Playwright config.
- `CURRENT_GAME_SNAPSHOT_VERSION` is 34 at `packages/contracts/src/schemas/save.ts:515`.
- The local Dexie database is version 5 with `saves`, `saveIntegrityBackups`, and `leaderboard`; there is no persisted ownership/lease store.

## Baseline evidence

- `pnpm --filter @mbd/web exec vitest run src/app/boot/AppBootGate.test.tsx src/features/setup/hooks/useSetupActionHandlers.test.tsx src/features/settings/hooks/useSettingsSaveData.test.tsx src/shared/lib/activeSavePersistence.test.ts`: 4 files / 56 tests passed.
- `pnpm typecheck`: 9/9 tasks passed at the starting commit (Turbo cache hit).
- A real production-preview Chromium probe on `127.0.0.1` observed `{ available: true, firstHeld: true, secondHeld: false, takeover: true }`: the first page held one exclusive Web Lock, the second page's `ifAvailable` request was denied, and the second acquired after the first page closed.
- Item 4 landed on this exact starting commit with the full root test/build/determinism and permanent reload-smoke gates green. Those are inherited landing evidence, not substituted for this slice's final reruns.

## Roadmap reconciliation

- The live objective is audit roadmap item 5: “detect a second tab on the same slot; lock or go read-only instead of silently racing.”
- No item-5 goal existed; goal 17 was created for this branch.
- “Same slot” is incomplete for live source. Branches have `slotNumber: null` and mutate root narrative metadata, so authority must cover the complete root save tree.
- A blocking editor conflict is safer and narrower than navigable read-only gameplay. Mutation entry points are dispersed and `AppLayout` also owns global Space simulation shortcuts.
- Checksums do not solve this race. Two documents can each produce a valid sealed snapshot from the same prior generation; the later valid write can silently replace the newer game state.
- No source contradiction or schema stop condition exists. A browser-owned exclusive lock needs neither GameSnapshot v35 nor Dexie v6.

## Existing ownership and race

- `apps/web/src/shared/lib/activeSavePersistence.ts` owns generations, retry timers, load barriers, and an active recovery owner in module-local maps. It orders only calls in one JavaScript document.
- `apps/web/src/shared/lib/saveSystem.ts` separately owns `saveWriteTails`, also module-local. Hash preparation occurs before the IndexedDB transaction, so independent documents are not serialized by that queue.
- There is no production `navigator.locks`, `BroadcastChannel`, storage-event, sessionStorage active pointer, tab ID, heartbeat, `beforeunload`, or `pagehide` ownership implementation.
- `useGameStore` persists `activeSaveId` and `activeSaveSlot` to shared localStorage. A new/duplicated tab therefore targets the same last-opened save, while two different-slot tabs can overwrite the global reload pointer even though their in-memory stores remain separate.
- The only production visibility listener belongs to moment-card timing; background/hidden state is not an ownership signal and must remain unrelated.

## Live activation and mutation seams

- `AppBootGate.attemptResume`: persisted target -> local load barrier -> verified safe load -> worker `importSnapshot` -> active persistence activation -> Zustand initialization. It currently claims no cross-document authority.
- `useSetupActionHandlers`: root/branch continue, exact/root delete, and New Dynasty. New Dynasty currently invokes `newGame` before replacing the target root, so target ownership must precede worker mutation.
- `useSettingsSaveData`: active/inactive manual save, root load, canonical import, root delete, Clear All, branch create, and branch delete.
- `SaveRecoveryProvider` and the boot/setup/settings callbacks can delete or restore a damaged record and therefore need the same tree authority.
- Every worker proxy call reaches `invokeWorkerMethod`; the live `mutationMethods` set is the central mutation classification seam. The smaller `runMutation` wrapper is not exhaustive and cannot be the guard.
- `saveGameById`, `createBranchSave`, delete/repair/restore paths, and `clearAllSaves` are the central storage-defense seams.
- The existing active coordinator has barriers for load, tree replacement, restore, metadata, and delete, but no public cross-tab handoff. Releasing an outgoing lock must wait accepted capture/write/retry work and preserve the outgoing editor when a candidate switch fails.

## Root-tree identity

- Root IDs are stable `save-slot-<n>` records for the five `SAVE_SLOTS`.
- A healthy branch names the root through `parentSaveId`; root snapshot metadata also references branch IDs.
- Item-4 trusted primary/shadow topology selection and parent discovery are the correct basis when a primary is missing or corrupt.
- The new resolver may read only topology/display metadata before the lock. After acquisition, the exact target must be re-read through `loadSaveSafely()` and its root relationship revalidated before worker import.
- A playable/recoverable record whose root cannot be resolved from the ID convention, a verified record/shadow, or one unambiguous trusted parent fails closed.

## Chosen authority model

- One exclusive lock resource: `mbd-save-tree-v1:<root-save-id>`.
- Acquire with `navigator.locks.request(name, { mode: 'exclusive', ifAvailable: true }, callback)` and keep the callback pending on a local release promise.
- Web Locks is authority. No `steal`, `query()` authorization, BroadcastChannel election, localStorage compare-and-swap, lease row, heartbeat, TTL, or actor identifier.
- A candidate lock is held before fresh load/import or `newGame`. A distinct outgoing lock remains held until its local persistence work is quiescent and target activation succeeds.
- Contention or target failure releases only the candidate. Same-tree reentry borrows the already-held root lock. Clear All must acquire all five slot resources in stable order before touching storage.
- Browser absence, insecure context, request rejection, or unknown tree fails closed. Node-only repository tests may use an injected lock manager/service instance; production enforcement is enabled above `AppBootGate`.
- The owner never releases on visibility, timer age, or `pagehide`. Document termination/reload lets the user agent release it.

## Resume-pointer decision

- Keep localStorage as the last-opened fallback for a brand-new tab.
- Add a per-document sessionStorage active-target record used on reload. Activation updates both ordinary in-memory/global fallback state and the local session hint only after verified import and ownership succeed.
- A duplicated tab may inherit the hint and correctly contends for the same tree. A tab that opened another root retains that root through its own reload.
- The hint never grants authority and never enters a save, checksum, export, worker, or simulation event.

## UX decision

- Use a blocking `Dynasty already open` alert-dialog/screen before BrowserRouter gameplay renders.
- It is non-dismissible and exposes only `Check again`; there is no fake Close button, forced takeover, or pseudo-read-only route.
- Contention, unsupported API, unknown topology, and request failure have distinct honest copy. They are not save corruption, autosave failure, or a retry/fallback episode.
- Retry always reacquires and then reruns the normal verified load/import path. It never promotes a contender's in-memory worker.
- The conflict screen must be keyboard/focus safe and bounded at 375x667.

## Browser proof decision

- Add a dedicated serial `e2e/multitab-guard.spec.ts` instead of contaminating the fixed-clock item-1/item-4 journey.
- Create a save through public controls in Page A, open Page B through same-origin `window.open`, and compare exact primary/shadow pairs.
- Prove Page B blocks before gameplay; keyboard input and Retry cannot write; Page A remains owner while backgrounded and can make a public durable mutation; Page B remains blocked; Page A close permits explicit retry; Page B freshly observes A's state, mutates, saves, and survives hard reload.
- Capture desktop/mobile conflict and final handoff evidence. No production bypass, snapshot injection, fixed-clock lease, or heartbeat sleep.

## Risks and explicit limits

- Mixed-version rollout: a pre-item-5 page does not request the lock and cannot be fenced by new code. Completion/release notes must state that old tabs must close/reload.
- Web Locks is same-origin only; there is no cross-device or cross-origin protection.
- Malicious same-origin code and a caller using `steal` are outside the accidental-race promise.
- Full navigable read-only gameplay, collaborative merge, write-ahead intent recovery, storage-pressure UX, and every-schema export CI remain later items.
- No save schema, Dexie schema, gameplay, simulation, CPU, RNG, or dependency change is expected.

## Stop-condition audit

No stop condition is active. The live tree topology, central worker proxy, central save boundaries, current coordinator barriers, Web Locks support in the actual Chromium gate, and existing two-page-capable Playwright context provide bounded implementation and proof seams.
