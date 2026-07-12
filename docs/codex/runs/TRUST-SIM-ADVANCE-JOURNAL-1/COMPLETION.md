# Goal 20 — Exact Simulation Advance Journal

## Outcome

Goal 20 is complete on the frozen item-8 source. Regular-season `simDay`,
`simWeek`, `simMonth`, and `simToPlayoffs` commands now use one durable
write-ahead intent, exact-save authority, whole-command rollback, and
persistence-only retry. Gameplay is never replayed to repair a save. This
report is written before the intentional landing commit; the final SHA is
recorded in the roadmap/landing handoff after commit.

Usage class: **EXCEPTIONAL**. The slice expanded from a bounded journal seam
into a full worker/persistence/boot/UI trust boundary and required two bounded
correction loops. Future `NORMAL` work must be split before reaching this size.

## Changed systems

- Dexie v5→v6 additive `simAdvanceIntents` store; GameSnapshot remains v34.
- Exact baseline/shadow/root CAS, bounded intent ownership, indexed tree cleanup,
  storage accounting, delete/replace/import/clear coordination.
- Module-scoped simulation coordinator and opaque worker mutation session.
- Boot recovery admission, verified baseline import/RNG equality, fail-closed
  malformed/mismatch recovery, and total post-delete transition finalization.
- Shell/footer/keyboard/Dashboard regular-season routing and truthful status/UI
  publication only after durable persistence.
- Persistence retry retains the exact post snapshot and intent token without a
  second gameplay call.
- Focused tests, one negative control, a production two-page WAL journey, and
  the corrected fresh-DOM browser helper.

## Acceptance map

| # | Criterion | Implementation | Focused proof | Browser/final gate | Risk |
|---:|---|---|---|---|---|
| 1 | One executor for all four commands | shared coordinator/executor; shell and Dashboard delegate | coordinator, executor, AppLayout, Dashboard suites | Chromium journal journey; full suite | adjacent postseason/offseason lanes remain legacy |
| 2 | Authority and exclusion before any work | exact save/root claims and opaque worker session | ownership/session/worker tests | two real pages remain blocked | browser lock timing is observational |
| 3 | Additive v6 bounded journal | `simAdvanceIntents`, `saveId` key and `rootSaveId` index | transaction/storage/schema tests | build/PWA green | older open builds require reload |
| 4 | Durable verified baseline before worker | canonical v34 materializer, baseline CAS, awaited intent | baseline integration and transaction tests | write-ahead evidence | no full snapshot is journaled |
| 5 | Only authorized worker invocation | one-shot authorization and phase permits | adapter/session/coordinator tests | WAL journey proves no early visible advance | stale callbacks remain fail-closed |
| 6 | Atomic post commit and intent consumption | exact retained receipt plus primary/shadow/root/delete transaction | persistence/transaction/integrity tests | exact durable success and reload | storage latency is adjacent risk |
| 7 | Pre-post failure rollback | restart/import/export verification and exact intent cleanup | worker/boot recovery tests | interrupted rollback proof | unrecoverable evidence requires reload |
| 8 | Post-accepted retry without replay | retained persistence-only job and intent token | active persistence/coordinator tests | retry and gameplay-call count proof | reload discards ephemeral post state by policy |
| 9 | Boot decisions and fail-closed evidence | candidate inspection, semantic equality, recovery latch | AppBoot/boot admission tests | hard reload rollback proof | malformed evidence is intentionally not guessed |
| 10 | Monotonic persistence truth | durable receipt gates mirror, Saved, pending, and flow | AppLayout/status/settings/action suites | visible Saved/0 pending only after commit | UI observer exceptions are isolated |
| 11 | Root/branch shared tree | exact save identity with root-index uniqueness | ownership/tree transaction tests | two-page same-tree block | distinct roots remain independently eligible |
| 12 | Delete/replace/recovery/Clear All safety | indexed exact cleanup and lifecycle barriers | transaction/integrity/storage tests | storage/multitab coverage | orphan bytes are evidence, not topology |
| 13 | Storage accounting | valid attributed bytes plus malformed/orphan all-MBD bytes | storage-pressure/settings tests | storage-pressure 1/1 in final matrix | estimates remain approximate |
| 14 | v34 and old-save compatibility | additive v6 migration; no v35; import/export unchanged | contracts, snapshot, baseline tests | production reload proof | mixed-version warning applies |
| 15 | Required verification and review | focused matrix, negative control, root gates, browser, Sol review | 14 files/460 tests; 4/4 negative control green | root receipts; Chromium 5/5; MERGE_READY 0/0/0 | save/commit latency follow-up |

## Verification receipts

- Focused final correction matrix: 14 files / 460 tests passed.
- Negative control: bypassed durable-intent await, mapped 4/4 cases red;
  restoration returned 4/4 green plus coordinator green.
- Root typecheck: 9/9 Turbo tasks passed.
- Full test: 8/8 tasks; web 459 files passed + 1 skipped, 2283 assertions
  passed + 2 skipped; exit 0 with no unhandled errors.
- Production build: 5/5 tasks, 3026 modules transformed; PWA generated 166
  precache entries, `dist/sw.js`, and Workbox output.
- Determinism: 3/3 passed.
- `git diff --check`: passed before closeout edits and will be re-run after
  documentation/staging.

## Browser proof

The initial Luna browser run failed at the helper's stale overlay locator while
the DOM moved from a report `Continue` action to enabled `Dismiss`/`Open
Dashboard`. The page showed truthful Saved/zero pending state, so the evidence
identified a test-only race, not a product defect. Terra corrected only the
helper/spec boundary: fresh DOM resolution on every poll, exactly one visible
action, ambiguity failure, none/disabled waiting, a second fresh resolution
before `Locator.click`, and propagated click errors. Storage-pressure copy was
updated to include journal bytes.

Authoritative final receipts on fresh production Chromium, project
`chromium`, one worker, zero retries, no flaky classification:

- `reload-smoke`: 2/2 in 4.6m.
- Combined `storage-pressure`, `reload-smoke`, `sim-advance-journal`, and
  `multitab-guard`: 5 tests across 4 specs, 6.5m; `.last-run.json` passed with
  empty `failedTests`.
- The item-8 journey used one context and two real pages and proved intent
  before worker mutation, same-tree blocking, interrupted rollback, exact
  durable success, retry without replay, deterministic RNG/reload state, and
  desktop plus 375x667 attachments.
- Browser diagnostics logged save writes around 1.15–1.24s and commits around
  1.23/1.92s against a 500ms observational budget. Sol classified this as a
  bounded adjacent performance risk; there was no timeout, replay, trust
  failure, or measured regression.

## Review findings and fixes

Sol's earlier P1s—async provider authorization piggyback and same-root orphan
journal cleanup/repair—were fixed and re-reviewed. The final helper review
found the stale-locator P1, lack of exactly-one-visible proof, detachable
ElementHandle risk, and swallowed click failures; Terra's final fresh-DOM
correction addressed all four. Final Sol verdict: `MERGE_READY`, P0=0/P1=0/P2=0.

## Compatibility, rollback, and mixed builds

The migration is additive v5→v6 and GameSnapshot remains v34. Supported old
and deep saves, canonical import/export, integrity shadow, root leaderboard,
and deterministic state remain covered. Rollback is operational: a valid
baseline plus intent discards the interrupted worker realm and imports the
verified baseline; a changed/missing/corrupt baseline fails closed and
preserves evidence. Already-open older builds must close or reload before
relying on v6 journal/write authority; mixed-version tabs lose that authority.

## Relay retrospective

1. **Late uncertainty:** the only late uncertainty was whether the first browser
   red result was a product overlay race or a stale helper locator. DOM and
   screenshot evidence showed the product was truthful while the helper waited
   on an obsolete `Continue` state.
2. **Earlier artifact/gate:** an earlier fresh-DOM, exactly-one-visible helper
   oracle plus a small hostile transition test would have caught the race before
   the initial Luna matrix.
3. **Responsible role:** Terra was the sole implementation writer; Sol was the
   final narrow reviewer; Luna owned mechanical verification, docs, staging,
   commit, and local-main landing. Host browser commands used the explicitly
   labeled parent manual relay-pattern fallback because Terra's loopback bind
   was restricted.
4. **Sequential phases:** reconcile/source truth → Terra implementation and
   focused corrections → mechanical browser gates → Sol final review → Luna
   closeout/landing.
5. **Safe parallel read-only work:** source mapping, test mapping, risk review,
   and independent receipt inspection can run in parallel; production writers,
   browser state, and final staging must remain sequential.
6. **Recommended route:** classify the slice first; use one writer, one final
   Sol review only when warranted, freeze source, run bounded domain proof and
   one fresh production browser matrix, then Luna documents and lands.
7. **Prioritized improvements:** (1) require a fresh-DOM/action-cardinality
   helper contract before browser freeze; (2) reserve a fixed evidence budget
   and maximum two correction loops; (3) maintain `CURRENT.md` with phase,
   writer, changed paths, last green command, blocker, and next action; (4)
   keep one authoritative browser runner after source freeze; (5) record model,
   effort, substitution, and exact receipt in the plan as each phase closes;
   (6) split a NORMAL slice when it becomes HEAVY; (7) keep release actions
   separately gated.

The superseding throughput reset is now permanent: every future slice is
classified `VERIFY_ONLY`, `FINISH_PARTIAL`, `NEW_FEATURE`, or `HIGH_RISK`;
meaningful existing work defaults to `FINISH_PARTIAL`; `HIGH_RISK` is reserved
for persistence/schema/worker/determinism/rollover/world-generation seams;
maximums are one pre-implementation Sol gate, one final Sol gate, two
correction loops, one independent auditor by default, and two compactions
before split-or-land review. Item 8 is recorded as `EXCEPTIONAL`; future
`NORMAL` work is split before heavy expansion.

## Protected state, landing, and release boundary

The three protected user-owned files remain dirty, unstaged, and SHA-256 exact:

- `.agents/skills/mbd-implement-slice/SKILL.md`
- `AGENTS.md`
- `docs/codex/PROGRAM.md`

Only Goal20-owned files are eligible for staging. No dependency, lockfile,
item-9 source, GameSnapshot v35, push, deploy, tag, publish, or release is
included. Release state remains **READY — AWAITING EXPLICIT RELEASE
AUTHORIZATION**.

## Estimate versus complexity

The original estimate was a bounded journal transaction plus browser proof. The
actual complexity was exceptional because the invariant crossed Dexie
transactions, worker authorization, active-save transitions, boot recovery,
all high-emotion UI lanes, and a hostile two-page browser harness. The scope
was kept bounded by excluding postseason/offseason gameplay policy, snapshot
v35, replay, and generic transaction refactoring.

## Reusable harness and next candidates

The reusable harness is the seeded v34 baseline materializer, exact primary /
shadow / root-integrity reader, journal evidence reader, fault-injection hooks,
two-page Web Lock setup, retry-without-replay counter, and fresh-DOM overlay
oracle. It should be reused for future save-boundary slices.

Next dependency-aware candidates are:

1. Items 9+10 as one `HIGH_RISK` slice only if live Goal 11 confirms one
   contract/offseason owner, persistence boundary, migration policy, proof
   harness, and rollback plan; define the evidence budget before coding.
2. Item 19 only after the economy dependency is reconciled, with a bounded
   deterministic calibration and old-save proof.
3. Item 20 only after its live owner/persistence seam is identified; do not
   bundle adjacent economy or memory work merely by proximity.

The next legal campaign action is to verify the landed item-8 commit on local
`main`; item 9 remains untouched.
