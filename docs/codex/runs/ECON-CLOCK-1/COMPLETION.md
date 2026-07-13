# Goal 11 — Living Contract Clock

## Outcome

Goal 11 / ECON-CLOCK-1 is complete. Canonical contracts advance once at the
null-to-live offseason seam; deterministic team options are symmetric; natural
expiries enter the existing canonical free-agency market; and save-bound
presentation waits for durable persistence. No schema or RNG change was made,
and no Goal-12 roster-generation work was included.

## Acceptance matrix

| # | Accepted criterion | Implementation artifact | Focused proof | Final/browser proof | Remaining risk |
|---:|---|---|---|---|---|
| 1 | Exactly-once clock; no negative years; retirees excluded | `packages/sim-core/src/finance/contracts.ts`; offseason marker in `apps/web/src/workers/sim.worker.helpers.ts` | contracts/worker no-double-clock and retry/reload guards | strict soak 2/2; compact-v33 1/1 | Older open builds may require close/reload |
| 2 | No Goal-11-caused roster regression and canonical FA ownership | worker lifecycle, FA validation/release, soak metrics | worker/metrics hostile guards; causal seed replay | strict digest; ECON Playwright 1/1 | Day-One 26/40 legality remains Goal 12 |
| 3 | Symmetric automated team-option policy | `finance/contracts.ts`, Finance/Offseason presentation | named user/CPU symmetry and zero-RNG tests | ECON option/reload journey | Player options/opt-outs remain intentionally cut |
| 4 | Hash-stable deterministic decisions | pure value rule; no new RNG/schema fields | determinism 3/3; soak strict replay | identical digest `5477faee99676a965a51a9ea394a179097f8c41c1ad96c06f83d3fb43ffe0814` | Policy changes same-seed outcomes by design |
| 5 | Authoritative market lifecycle and QO ordering | `sim.worker.helpers.ts`, `sim.worker.queries.ts`, `sim.worker.actions.ts`, `freeAgency.ts` | canonical available/signed union and atomic invalid-market tests | market survives reload; ECON Playwright 1/1 | Existing market UX remains bounded to current routes |
| 6 | Honest old-save compatibility | worker migration/import/export rollover coverage | compact authentic v33 receipt 1/1 | reload-smoke 2/2 | Compact fixture is not a full-league soak |
| 7 | Truthful presentation after durable save | `useWorker.ts`, offseason handlers, Finance/News/ledger surfaces | final correction suites 39/39 plus 2/2 and 2/2 | ECON Playwright 1/1; reload-smoke desktop/mobile 2/2 | Save latency remains an adjacent operational concern |
| 8 | Finite population/size calibration evidence | `econClockSoak.*`, calibration harness, `TUNING.md` | strict soak 2/2; measurement 18/18; negative controls green | final root/build gates | Evidence is finite measured bands, not asymptotic proof |

## Verification receipts

- Focused correction receipts: 3 files/17 passed; final Finance correction 2
  files/9 passed; all Finance 6 files/16 passed.
- Root typecheck: 9/9 tasks.
- Root tests: 8/8 tasks; web 461 files passed/1 skipped, 2,334 passed/3
  skipped; 5m24.191s.
- Production build/PWA: 5/5, 3,026 modules, 166 precache entries, 8.019s.
- Determinism: 3/3.
- Current-schema measurement and strict replay: 2/2 each; identical digest
  `5477faee99676a965a51a9ea394a179097f8c41c1ad96c06f83d3fb43ffe0814`; first
  slope 597, second 561.2222, curvature -35.7778.
- Browser: authoritative ECON Playwright 1/1, zero retries, 16.7s; reload-smoke
  desktop plus 375x667 2/2, zero retries, 7.2m.
- `git diff --check`: green. One transient `ENOSPC` collection failure and one
  earlier unrelated save-transition mock-identity run were isolated and did not
  alter source; the final root run was green. A loaded full-suite run also hit
  the balance hook's 180-second budget and exposed one missing controller test
  fixture callback; the callback fixture was corrected, the balance file passed
  9/9 in isolation, and the final standard root run passed unchanged production
  source.

## Compatibility, rollback, and scope

GameSnapshot remains v34 and no migration is required. Persistence retries retain
the exact post-mutation snapshot; gameplay is not replayed. The first upgrade
wave uses honest activation/news framing and fabricates no history. Rollback is
the existing save-bound persistence/reload behavior. Goal 12 remains the sole
owner of Day-One legality, affiliate balance, and generation repair.

## Relay retrospective

1. **Uncertainty discovered too late:** final presentation semantics around
   advance/skip publication, one-year team-option wording, and when a declined
   option may claim free agency were found during the final Sol review.
2. **Earlier artifact/gate:** a source-freeze contract table plus a focused
   save-bound presentation/ledger matrix should have been required before the
   initial final review; the exact post-durable browser journey would have
   exposed the publication issue earlier.
3. **Owning relay role:** Terra was the sole implementation writer; Sol owned
   architecture and final adversarial review; Luna owned the mechanical
   closeout documents and scope audit. Luna's child sandbox could not write the
   Git index, so the parent coordinator performed exact staging, commit, and
   local-main fast-forward as an explicit tooling substitution.
4. **Phases that should remain sequential:** source reconciliation → one writer
   implementation/corrections → strict economy and compatibility gates → fresh
   production browser proof → final review → closeout and landing.
5. **Safe parallel read-only work:** source/test seam mapping, receipt
   inspection, protected-hash verification, and independent diff-risk review.
   Browser mutation, final staging, and branch landing must remain sequential.
6. **Recommended route for a similar persistence slice:** freeze the seam and
   acceptance matrix first; use one writer; add exact no-double-apply and
   persistence-failure tests beside the mutation; run compatibility and bounded
   soak separately; run one fresh production reload journey; then have the
   closeout owner stage only the verified goal paths and fast-forward local main.
7. **Prioritized improvements:** (1) require save-bound publication tests at
   source freeze; (2) freeze contract/ledger wording with the architecture
   table; (3) keep compatibility and full-league soak as separate named gates;
   (4) preserve a fixed two-loop correction budget; (5) keep `CURRENT.md`
   updated after every gate; (6) make the exact staged name list a mandatory
   pre-commit artifact.

## Deferred work

No Goal-12 roster repair, player-option semantics, new schema, revenue/budget
economy, arbitration redesign, or remote action is part of this slice.
